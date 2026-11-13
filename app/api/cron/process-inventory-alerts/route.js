import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOURLY_EMAIL_LIMIT = 50;

function htmlEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[char];
    });
}

function getBalance(value) {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
}

async function processRestockAlerts() {
    const [items, receipts, staff] = await Promise.all([
        prisma.itemMaster.findMany({
            where: {
                deletedAt: null,
                status: true,
                ApplicableForRelocateLevel: true,
            },
            select: {
                id: true,
                ItemName: true,
                RelocateLevel: true,
            },
        }),

        prisma.issueReceipt.findMany({
            where: {
                deletedAt: null,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                ItemMasterid: true,
                Balance: true,
            },
        }),

        prisma.StaffUser.findMany({
            where: {
                isActive: true,
                isTrashed: false,
                isNotStaff: false,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        }),
    ]);

    // First receipt for each item is the latest because results are newest first.
    const latestBalanceByItem = new Map();

    for (const receipt of receipts) {
        if (
            receipt.ItemMasterid &&
            !latestBalanceByItem.has(String(receipt.ItemMasterid))
        ) {
            latestBalanceByItem.set(
                String(receipt.ItemMasterid),
                getBalance(receipt.Balance),
            );
        }
    }

    let checked = 0;
    let alertsCreated = 0;
    let alertsReset = 0;

    for (const item of items) {
        checked++;

        const itemId = String(item.id);
        const balance = latestBalanceByItem.get(itemId) ?? 0;
        const restockLevel = getBalance(item.RelocateLevel);
        const isBelowRestock = balance <= restockLevel;

        const existingState = await prisma.restockAlertState.findUnique({
            where: {
                itemMasterId: itemId,
            },
        });

        // When stock returns above the threshold, allow a future alert.
        if (!isBelowRestock) {
            if (existingState?.isBelowRestock) {
                await prisma.restockAlertState.update({
                    where: {
                        itemMasterId: itemId,
                    },
                    data: {
                        isBelowRestock: false,
                    },
                });

                alertsReset++;
            }

            continue;
        }

        // Do not repeat alerts while the item remains below its threshold.
        if (existingState?.isBelowRestock) {
            continue;
        }

        const itemName = item.ItemName || "Unnamed inventory item";
        const subject = `Restock Alert: ${itemName}`;
        const message =
            `${itemName} is at or below its restock level. ` +
            `Current balance: ${balance}. Restock level: ${restockLevel}.`;

        const safeItemName = htmlEscape(itemName);
        const safeMessage = htmlEscape(message);

        const recipients = staff.filter((person) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                String(person.email || "").trim(),
            ),
        );

        // Keep the state change, notifications, and queued emails together.
        // If database writes fail, the transaction rolls back.
        await prisma.$transaction(async (tx) => {
            await tx.restockAlertState.upsert({
                where: {
                    itemMasterId: itemId,
                },
                create: {
                    itemMasterId: itemId,
                    isBelowRestock: true,
                    lastTriggeredAt: new Date(),
                },
                update: {
                    isBelowRestock: true,
                    lastTriggeredAt: new Date(),
                },
            });

            if (recipients.length > 0) {
                await tx.notification.createMany({
                    data: recipients.map((person) => ({
                        userId: person.id,
                        module: "inventory",
                        action: "restock_level",
                        title: subject,
                        message,
                        entityId: itemId,
                        entityType: "ItemMaster",
                        entityName: itemName,
                        isRead: false,
                        syncStatus: "pending",
                    })),
                });

                await tx.emailQueue.createMany({
                    data: recipients.map((person) => ({
                        to: String(person.email).trim(),
                        subject,
                        body: `
              <h2>${safeItemName}</h2>
              <p>${safeMessage}</p>
              <p>Please review inventory and arrange replenishment if required.</p>
            `,
                        status: "pending",
                        hasAttachment: false,
                    })),
                });
            }
        });

        alertsCreated++;
    }

    return {
        checked,
        alertsCreated,
        alertsReset,
        recipients: staff.length,
    };
}

async function processEmailQueue() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const sentInLastHour = await prisma.emailQueue.count({
        where: {
            status: "sent",
            sentAt: {
                gte: oneHourAgo,
            },
        },
    });

    const allowance = Math.max(
        0,
        HOURLY_EMAIL_LIMIT - sentInLastHour,
    );

    if (allowance === 0) {
        return {
            sent: 0,
            failed: 0,
            remaining: 0,
            sentInLastHour,
            limit: HOURLY_EMAIL_LIMIT,
        };
    }

    const queue = await prisma.emailQueue.findMany({
        where: {
            status: "pending",
        },
        orderBy: {
            createdAt: "asc",
        },
        take: allowance,
    });

    let sent = 0;
    let failed = 0;

    for (const email of queue) {
        // Claim each queue item before sending to prevent duplicate claims
        // from ordinary overlapping requests.
        const claimed = await prisma.emailQueue.updateMany({
            where: {
                id: email.id,
                status: "pending",
            },
            data: {
                status: "sending",
            },
        });

        if (claimed.count !== 1) {
            continue;
        }

        try {
            await sendEmail({
                to: email.to,
                subject: email.subject,
                text: String(email.body || "").replace(/<[^>]*>/g, ""),
                html: email.body || "",
                queueId: email.id,
                createQueue: false,
            });

            await prisma.emailQueue.update({
                where: {
                    id: email.id,
                },
                data: {
                    status: "sent",
                    sentAt: new Date(),
                },
            });

            sent++;
        } catch (error) {
            console.error(
                `CRON EMAIL FAILED (${email.id}):`,
                error,
            );

            await prisma.emailQueue.update({
                where: {
                    id: email.id,
                },
                data: {
                    status: "failed",
                },
            });

            failed++;
        }
    }

    return {
        sent,
        failed,
        remaining: Math.max(
            0,
            HOURLY_EMAIL_LIMIT - sentInLastHour - sent,
        ),
        sentInLastHour,
        limit: HOURLY_EMAIL_LIMIT,
    };
}
async function getSetting(key, defaultValue = "") {
  const result = await prisma.$queryRawUnsafe(
    `
        SELECT "value"
        FROM public."Setting"
        WHERE "group" = 'email'
          AND "key" = $1
        LIMIT 1
        `,
    key,
  );

  if (!result || result.length === 0) {
    return defaultValue;
  }

  return result[0].value ?? defaultValue;
}
const REQUIRE_CRON_SECRET = true; // true = check secret, false = skip check

async function runWorker(request) {
    if (REQUIRE_CRON_SECRET) {
        const secret = process.env.CRON_SECRET;

        if (!secret) {
            console.error("CRON_SECRET is not configured.");

            return NextResponse.json(
                {
                    success: false,
                    message: "Cron authentication is not configured.",
                },
                { status: 500 }
            );
        }

        if (
            request.headers.get("authorization") !== `Bearer ${secret}`
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized.",
                },
                { status: 401 }
            );
        }
    }

    try {
        const restock = await processRestockAlerts();
        const enableEmailQueue = Number(await getSetting("enable_email_queue", "0"));
        let emailQueue;

        if (enableEmailQueue === 1) {
            emailQueue = {
                sent: 0,
                failed: 0,
                skipped: true,
                message: "Email queue is enabled. Sending skipped.",
            };
        } else {
            emailQueue = await processEmailQueue();
        }

        return NextResponse.json({
            success: true,
            message: "Inventory alerts and email queue processed.",
            restock,
            emailQueue,
            processedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("INVENTORY ALERT CRON ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to process inventory alerts or email queue.",
            },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    return runWorker(request);
}

export async function POST(request) {
    return runWorker(request);
}