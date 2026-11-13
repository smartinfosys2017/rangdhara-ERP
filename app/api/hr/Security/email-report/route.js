
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString("en-IN");
}

function parseDate(value, fieldName) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date provided for ${fieldName}.`);
    }

    return date;
}

function endOfDateExclusive(value, fieldName) {
    const date = parseDate(value, fieldName);

    if (!date) return null;

    date.setDate(date.getDate() + 1);

    return date;
}

function normalizeRecipients(input) {
    const list = Array.isArray(input)
        ? input
        : String(input ?? "").split(",");

    return [
        ...new Set(
            list.map((email) => String(email).trim()).filter(Boolean)
        ),
    ];
}

export async function POST(request) {
    try {
        // 1. Authentication
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Unauthorized. Please sign in again.",
                },
                { status: 401 }
            );
        }

        // 2. Request body
        const body = await request.json();

        const {
            recipients,
            to,
            subject,
            message = "",
            attachExcel = true,
            selectedIds = [],
            filters = {},
        } = body;

        // Support both recipients and to.
        const recipientEmails = normalizeRecipients(recipients ?? to);

        if (recipientEmails.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Please provide at least one recipient email address.",
                },
                { status: 400 }
            );
        }

        const invalidEmails = recipientEmails.filter(
            (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        );

        if (invalidEmails.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "One or more recipient email addresses are invalid.",
                    invalidEmails,
                },
                { status: 400 }
            );
        }

        if (!String(subject ?? "").trim()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email subject is required.",
                },
                { status: 400 }
            );
        }

        if (
            !Array.isArray(selectedIds) ||
            selectedIds.some(
                (id) =>
                    id === null ||
                    id === undefined ||
                    !["string", "number"].includes(typeof id)
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "selectedIds must be an array of security IDs.",
                },
                { status: 400 }
            );
        }

        if (typeof attachExcel !== "boolean") {
            return NextResponse.json(
                {
                    success: false,
                    message: "attachExcel must be true or false.",
                },
                { status: 400 }
            );
        }

        // 3. Read filters
        const query = String(filters?.query ?? "").trim();
        const status = String(filters?.status ?? "all")
            .trim()
            .toLowerCase();

        const createdFrom = parseDate(
            filters?.createdFrom,
            "createdFrom"
        );

        const createdTo = endOfDateExclusive(
            filters?.createdTo,
            "createdTo"
        );

        const updatedFrom = parseDate(
            filters?.updatedFrom,
            "updatedFrom"
        );

        const updatedTo = endOfDateExclusive(
            filters?.updatedTo,
            "updatedTo"
        );

        if (createdFrom && createdTo && createdFrom >= createdTo) {
            return NextResponse.json(
                {
                    success: false,
                    message: "The creation date range is invalid.",
                },
                { status: 400 }
            );
        }

        if (updatedFrom && updatedTo && updatedFrom >= updatedTo) {
            return NextResponse.json(
                {
                    success: false,
                    message: "The update date range is invalid.",
                },
                { status: 400 }
            );
        }

        if (!["all", "active", "inactive"].includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Status must be all, active, or inactive.",
                },
                { status: 400 }
            );
        }

        // 4. Build Prisma filters.
        // This assumes deletedAt exists and null means not deleted.
        const where = {
            deletedAt: null,
        };

        if (query) {
            where.OR = [
                {
                    securityName: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    description: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
            ];
        }

        // Assumes status is a Boolean field.
        if (status === "active") {
            where.status = true;
        } else if (status === "inactive") {
            where.status = false;
        }

        if (selectedIds.length > 0) {
            where.id = {
                in: selectedIds,
            };
        }

        if (createdFrom || createdTo) {
            where.createdAt = {};

            if (createdFrom) {
                where.createdAt.gte = createdFrom;
            }

            if (createdTo) {
                where.createdAt.lt = createdTo;
            }
        }

        if (updatedFrom || updatedTo) {
            where.updatedAt = {};

            if (updatedFrom) {
                where.updatedAt.gte = updatedFrom;
            }

            if (updatedTo) {
                where.updatedAt.lt = updatedTo;
            }
        }

        // 5. Fetch security.
        const security = await prisma.Security.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                securityName: true,
                description: true,
                status: true,
                isDefault: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (security.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No security match the selected IDs and filters.",
                },
                { status: 404 }
            );
        }

        // 6. Generate Excel attachment when requested.
        let attachments = [];
        let fileName = null;

        if (attachExcel) {
            const rows = security.map((item) => ({
                ID: item.id,
                "Security Name": item.securityName ?? "",
                Description: item.description ?? "",
                Status: item.status ? "Active" : "Inactive",
                "Default Group": item.isDefault ? "Yes" : "No",
                "Created At": formatDate(item.createdAt),
                "Updated At": formatDate(item.updatedAt),
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);

            worksheet["!cols"] = [
                { wch: 38 },
                { wch: 28 },
                { wch: 45 },
                { wch: 16 },
                { wch: 18 },
                { wch: 24 },
                { wch: 24 },
            ];

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "security"
            );

            const excelBuffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });

            fileName = `hr-security-${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`;

            attachments = [
                {
                    filename: fileName,
                    content: excelBuffer,
                    contentType:
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                },
            ];
        }

        // 7. Build email content.
        const plainMessage = String(message || "").trim();

        const emailText = [
            plainMessage ||
            "Please find the security report for your review.",
            "",
            `Total security: ${security.length}`,
            attachExcel ? `Attachment: ${fileName}` : "No Excel attachment included.",
            "",
            "Regards,",
            "Hr Management Team",
        ].join("\n");

        const safeMessage = escapeHtml(
            plainMessage ||
            "Please find the security report for your review."
        ).replace(/\r\n|\r|\n/g, "<br>");

        const emailHtml = `
      <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
        <h2 style="margin-bottom:16px">security Report</h2>

        <p>${safeMessage}</p>

        <p>
          <strong>Total security:</strong>
          ${security.length}
        </p>

        <p>
          ${attachExcel
                ? "The Excel report is attached to this email."
                : "No Excel attachment was requested."
            }
        </p>

        <p>Regards,<br>Hr Management Team</p>
      </div>
    `;

        // 8. Send using your existing SMTP/queue helper.
        const result = await sendEmail({
            to: recipientEmails.join(", "),
            subject: String(subject).trim(),
            text: emailText,
            html: emailHtml,
            attachments,
        });

        // 9. Return result.
        return NextResponse.json({
            success: true,
            message: result.queued
                ? "Email report added to the queue."
                : "Email report sent successfully.",
            status: result.status,
            queued: result.queued,
            sent: result.sent,
            queueId: result.queueId,
            recipients: recipientEmails,
            securityCount: security.length,
            attachmentIncluded: attachments.length > 0,
            fileName,
            filters: {
                query,
                status,
                createdFrom: filters?.createdFrom || "",
                createdTo: filters?.createdTo || "",
                updatedFrom: filters?.updatedFrom || "",
                updatedTo: filters?.updatedTo || "",
            },
        });
    } catch (error) {
        console.error("[Security_EMAIL_REPORT]", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error.message ||
                    "Failed to generate or send the security report.",
            },
            { status: 500 }
        );
    }
}
