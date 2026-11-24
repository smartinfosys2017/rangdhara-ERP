
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

// =======================================================
// HELPERS
// =======================================================

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
            list
                .map((email) => String(email).trim())
                .filter(Boolean)
        ),
    ];
}

// =======================================================
// POST - EMAIL BRAND / MANUFACTURER REPORT
// =======================================================

export async function POST(request) {
    try {
        // 1. AUTHENTICATION

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

        // 2. REQUEST BODY

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
        const recipientEmails = normalizeRecipients(
            recipients ?? to
        );

        if (recipientEmails.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Please provide at least one recipient email address.",
                },
                { status: 400 }
            );
        }

        // Validate email addresses.
        const invalidEmails = recipientEmails.filter(
            (email) =>
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

        // Validate selected IDs.
        if (
            !Array.isArray(selectedIds) ||
            selectedIds.some(
                (id) =>
                    typeof id !== "string" ||
                    !id.trim()
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "selectedIds must be an array of valid brand/manufacturer IDs.",
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

        // 3. READ FILTERS

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

        // 4. BUILD PRISMA FILTERS

        const where = {
            deletedAt: null,
        };

        // Search brand, manufacturer and description.
        if (query) {
            where.OR = [
                {
                    brandName: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    manufacturerName: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    websiteURL: {
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

        // Status filter.
        if (status === "active") {
            where.status = true;
        } else if (status === "inactive") {
            where.status = false;
        }

        // Selected records.
        if (selectedIds.length > 0) {
            where.id = {
                in: selectedIds,
            };
        }

        // Created date filter.
        if (createdFrom || createdTo) {
            where.createdAt = {};

            if (createdFrom) {
                where.createdAt.gte = createdFrom;
            }

            if (createdTo) {
                where.createdAt.lt = createdTo;
            }
        }

        // Updated date filter.
        if (updatedFrom || updatedTo) {
            where.updatedAt = {};

            if (updatedFrom) {
                where.updatedAt.gte = updatedFrom;
            }

            if (updatedTo) {
                where.updatedAt.lt = updatedTo;
            }
        }

        // 5. FETCH BRAND / MANUFACTURER RECORDS

        const brandManufacturers =
            await prisma.brandManufacturer.findMany({
                where,
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    brandName: true,
                    manufacturerName: true,
                    websiteURL: true,
                    description: true,
                    status: true,
                    createby: true,
                    updateby: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

        if (brandManufacturers.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No brand/manufacturer records match the selected IDs and filters.",
                },
                { status: 404 }
            );
        }

        // 6. GENERATE EXCEL ATTACHMENT

        let attachments = [];
        let fileName = null;

        if (attachExcel) {
            const rows = brandManufacturers.map((item) => ({
                ID: item.id,
                "Brand Name": item.brandName ?? "",
                "Manufacturer Name": item.manufacturerName ?? "",
                "Website URL": item.websiteURL ?? "",
                Description: item.description ?? "",
                Status: item.status ? "Active" : "Inactive",
                "Created By": item.createby ?? "",
                "Updated By": item.updateby ?? "",
                "Created Date": formatDate(item.createdAt),
                "Updated Date": formatDate(item.updatedAt),
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);

            worksheet["!cols"] = [
                { wch: 38 },
                { wch: 28 },
                { wch: 30 },
                { wch: 35 },
                { wch: 45 },
                { wch: 16 },
                { wch: 25 },
                { wch: 25 },
                { wch: 24 },
                { wch: 24 },
            ];

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Brand Manufacturers"
            );

            const excelBuffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });

            fileName = `inventory-brand-manufacturers-${new Date()
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

        // 7. BUILD EMAIL CONTENT

        const plainMessage = String(message || "").trim();

        const defaultMessage =
            "Please find the Brand/Manufacturer report for your review.";

        const emailText = [
            plainMessage || defaultMessage,
            "",
            `Total brand/manufacturer records: ${brandManufacturers.length}`,
            attachExcel
                ? `Attachment: ${fileName}`
                : "No Excel attachment included.",
            "",
            "Regards,",
            "Inventory Management Team",
        ].join("\n");

        const safeMessage = escapeHtml(
            plainMessage || defaultMessage
        ).replace(/\r\n|\r|\n/g, "<br>");

        const emailHtml = `
            <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
                <h2 style="margin-bottom:16px">
                    Brand/Manufacturer Report
                </h2>

                <p>${safeMessage}</p>

                <p>
                    <strong>Total brand/manufacturer records:</strong>
                    ${brandManufacturers.length}
                </p>

                <p>
                    ${
                        attachExcel
                            ? "The Excel report is attached to this email."
                            : "No Excel attachment was requested."
                    }
                </p>

                <p>
                    Regards,<br>
                    Inventory Management Team
                </p>
            </div>
        `;

        // 8. SEND EMAIL

        const result = await sendEmail({
            to: recipientEmails.join(", "),
            subject: String(subject).trim(),
            text: emailText,
            html: emailHtml,
            attachments,
        });

        // 9. RESPONSE

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
            brandManufacturerCount: brandManufacturers.length,
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
        console.error(
            "[BRAND_MANUFACTURER_EMAIL_REPORT]",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error.message ||
                    "Failed to generate or send the brand/manufacturer report.",
            },
            { status: 500 }
        );
    }
}
