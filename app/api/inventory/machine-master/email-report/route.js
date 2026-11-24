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

function parseGroupNames(value) {
    if (!value) return "";

    try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parsed.join(", ");
        }

        return String(parsed);
    } catch {
        return String(value);
    }
}

// Format all item details into a comma-separated string.
function formatItemDetails(itemDetails = []) {
    if (!Array.isArray(itemDetails) || itemDetails.length === 0) {
        return "";
    }

    return itemDetails
        .map((item) => {
            const group = item.SelectedGroupName ?? "";
            const itemName = item.Selecteditem ?? "";
            const unit = item.itemUnit ?? "";
            const quantity = item.itemQty ?? "";
            const description = item.itemdescription ?? "";

            return [
                group,
                itemName,
                unit,
                quantity,
                description,
            ]
                .filter(
                    (value) =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
                .join(" - ");
        })
        .filter(Boolean)
        .join(", ");
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
                    typeof id !== "string"
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "selectedIds must be an array of machine IDs.",
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

        // 4. Build Prisma filters
        const where = {
            deletedAt: null,
        };

        if (query) {
            where.OR = [
                {
                    machineNumber: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    machineName: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    machineCode: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    GroupName: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    OperateId: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
            ];
        }

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

        // 5. Fetch machines and non-deleted item details
        const machines = await prisma.machineMaster.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                itemDetails: {
                    where: {
                        deletedAt: null,
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        if (machines.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No machines match the selected IDs and filters.",
                },
                { status: 404 }
            );
        }

        // 6. Generate Excel attachment
        let attachments = [];
        let fileName = null;

        if (attachExcel) {
            // Main Machine Master sheet
            const rows = machines.map((machine) => ({
                ID: machine.id,
                "Machine Number": machine.machineNumber ?? "",
                "Machine Code": machine.machineCode ?? "",
                "Machine Name": machine.machineName ?? "",
                "Item Groups": parseGroupNames(machine.GroupName),
                "Operator ID": machine.OperateId ?? "",
                Specification:  formatItemDetails(machine.itemDetails),
                Comment: machine.comment ?? "",
                Status: machine.status ? "Active" : "Inactive",
                "Total Items": machine.itemDetails?.length ?? 0,
                "Created Date": formatDate(machine.createdAt),
                "Updated Date": formatDate(machine.updatedAt),
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);

            worksheet["!cols"] = [
                { wch: 38 },
                { wch: 22 },
                { wch: 22 },
                { wch: 30 },
                { wch: 35 },
                { wch: 25 },
                { wch: 60 },
                { wch: 35 },
                { wch: 15 },
                { wch: 15 },
                { wch: 24 },
                { wch: 24 },
            ];

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Machine Master"
            );

            // Separate sheet for machine item details
            const itemRows = machines.flatMap((machine) =>
                (machine.itemDetails ?? []).map((item) => ({
                    "Machine Number": machine.machineNumber ?? "",
                    "Machine Name": machine.machineName ?? "",
                    "Selected Group": item.SelectedGroupName ?? "",
                    "Selected Item": item.Selecteditem ?? "",
                    "Item Unit": item.itemUnit ?? "",
                    "Item Quantity": item.itemQty ?? "",
                    "Item Description": item.itemdescription ?? "",
                }))
            );

            if (itemRows.length > 0) {
                const itemWorksheet =
                    XLSX.utils.json_to_sheet(itemRows);

                itemWorksheet["!cols"] = [
                    { wch: 22 },
                    { wch: 30 },
                    { wch: 28 },
                    { wch: 30 },
                    { wch: 20 },
                    { wch: 18 },
                    { wch: 40 },
                ];

                XLSX.utils.book_append_sheet(
                    workbook,
                    itemWorksheet,
                    "Machine Items"
                );
            }

            const excelBuffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });

            fileName = `inventory-machine-master-${new Date()
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

        // 7. Build email content
        const plainMessage = String(message || "").trim();

        const emailText = [
            plainMessage ||
            "Please find the Machine Master report for your review.",
            "",
            `Total machines: ${machines.length}`,
            attachExcel
                ? `Attachment: ${fileName}`
                : "No Excel attachment included.",
            "",
            "Regards,",
            "Inventory Management Team",
        ].join("\n");

        const safeMessage = escapeHtml(
            plainMessage ||
            "Please find the Machine Master report for your review."
        ).replace(/\r\n|\r|\n/g, "<br>");

        const emailHtml = `
            <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
                <h2 style="margin-bottom:16px">Machine Master Report</h2>

                <p>${safeMessage}</p>

                <p>
                    <strong>Total machines:</strong>
                    ${machines.length}
                </p>

                <p>
                    ${attachExcel
                ? "The Excel report is attached to this email."
                : "No Excel attachment was requested."
            }
                </p>

                <p>Regards,<br>Inventory Management Team</p>
            </div>
        `;

        // 8. Send email
        const result = await sendEmail({
            to: recipientEmails.join(", "),
            subject: String(subject).trim(),
            text: emailText,
            html: emailHtml,
            attachments,
        });

        // 9. Return result
        return NextResponse.json({
            success: true,
            message: result.queued
                ? "Machine Master report added to the queue."
                : "Machine Master report sent successfully.",
            status: result.status,
            queued: result.queued,
            sent: result.sent,
            queueId: result.queueId,
            recipients: recipientEmails,
            machineCount: machines.length,
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
        console.error("[MACHINE_MASTER_EMAIL_REPORT]", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error.message ||
                    "Failed to generate or send the Machine Master report.",
            },
            { status: 500 }
        );
    }
}