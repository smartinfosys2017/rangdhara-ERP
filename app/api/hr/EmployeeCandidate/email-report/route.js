
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    })[char]);
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

    const dateString = String(value).trim();

    // Handle date-picker values in yyyy-MM-dd format.
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const date = new Date(`${dateString}T00:00:00.000Z`);

        if (
            Number.isNaN(date.getTime()) ||
            date.toISOString().slice(0, 10) !== dateString
        ) {
            throw new Error(`Invalid date provided for ${fieldName}.`);
        }

        return date;
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date provided for ${fieldName}.`);
    }

    return date;
}

function endOfDateExclusive(value, fieldName) {
    const date = parseDate(value, fieldName);

    if (!date) return null;

    date.setUTCDate(date.getUTCDate() + 1);

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

        // Validate email addresses
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

        // IDs are UUID strings in the EmployeeCandidateStatus model.
        if (
            !Array.isArray(selectedIds) ||
            selectedIds.some(
                (id) => typeof id !== "string" || !id.trim()
            )
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "selectedIds must be an array of valid Employee/Candidate Status IDs.",
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

        const allowedModes = ["all", "active", "inactive", "hold"];

        if (!allowedModes.includes(status)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Status must be all, active, inactive, or hold.",
                },
                { status: 400 }
            );
        }

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

        // 4. Build Prisma filters
        const where = {
            deletedAt: null,
        };

        if (query) {
            where.OR = [
                {
                    StatusName: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
                {
                    CategoryName: {
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
                {
                    mode: {
                        contains: query,
                        mode: "insensitive",
                    },
                },
            ];
        }

        // Filter by mode (Active / Inactive / Hold)
        if (status !== "all") {
            const normalizedMode =
                status.charAt(0).toUpperCase() + status.slice(1);

            where.mode = normalizedMode;
        }

        // Filter selected records
        if (selectedIds.length > 0) {
            where.id = {
                in: selectedIds,
            };
        }

        // Created date filter
        if (createdFrom || createdTo) {
            where.createdAt = {};

            if (createdFrom) {
                where.createdAt.gte = createdFrom;
            }

            if (createdTo) {
                where.createdAt.lt = createdTo;
            }
        }

        // Updated date filter
        if (updatedFrom || updatedTo) {
            where.updatedAt = {};

            if (updatedFrom) {
                where.updatedAt.gte = updatedFrom;
            }

            if (updatedTo) {
                where.updatedAt.lt = updatedTo;
            }
        }

        // 5. Fetch Employee/Candidate Status records
        // Prisma model: EmployeeCandidateStatus 
        const EmployeeCandidate = await prisma.employeeCandidateStatus.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                StatusName: true,
                CategoryName: true,
                description: true,
                mode: true,
                isDefault: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (EmployeeCandidate.length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "No Employee/Candidate Status records match the selected IDs and filters.",
                },
                { status: 404 }
            );
        }

        // 6. Generate Excel attachment
        let attachments = [];
        let fileName = null;

        if (attachExcel) {
            const rows = EmployeeCandidate.map((item) => ({
                ID: item.id,
                "Status Name": item.StatusName ?? "",
                "Category Name": item.CategoryName ?? "",
                Description: item.description ?? "",
                Mode: item.mode ?? "",
                "Default Group": item.isDefault ? "Yes" : "No",
                "Created At": formatDate(item.createdAt),
                "Updated At": formatDate(item.updatedAt),
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);

            worksheet["!cols"] = [
                { wch: 38 },
                { wch: 28 },
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
                "EmployeeCandidate"
            );

            const excelBuffer = XLSX.write(workbook, {
                type: "buffer",
                bookType: "xlsx",
            });

            fileName = `employee-candidate-status-${new Date()
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

        const defaultMessage =
            "Please find the Employee/Candidate Status report for your review.";

        const emailText = [
            plainMessage || defaultMessage,
            "",
            `Total Employee/Candidate Status: ${EmployeeCandidate.length}`,
            attachExcel
                ? `Attachment: ${fileName}`
                : "No Excel attachment included.",
            "",
            "Regards,",
            "HR Management Team",
        ].join("\n");

        const safeMessage = escapeHtml(
            plainMessage || defaultMessage
        ).replace(/\r\n|\r|\n/g, "<br>");

        const emailHtml = `
            <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
                <h2 style="margin-bottom:16px">
                    Employee/Candidate Status Report
                </h2>

                <p>${safeMessage}</p>

                <p>
                    <strong>Total Employee/Candidate Status:</strong>
                    ${EmployeeCandidate.length}
                </p>

                <p>
                    ${
                        attachExcel
                            ? "The Excel report is attached to this email."
                            : "No Excel attachment was requested."
                    }
                </p>

                <p>Regards,<br>HR Management Team</p>
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

        // 9. Return response
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
            EmployeeCandidateCount: EmployeeCandidate.length,
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
        console.error("[EMPLOYEE_CANDIDATE_STATUS_EMAIL_REPORT]", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error.message ||
                    "Failed to generate or send the Employee/Candidate Status report.",
            },
            { status: 500 }
        );
    }
}