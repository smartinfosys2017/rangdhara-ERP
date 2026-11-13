import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

// HELPERS

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

  if (typeof value !== "string") {
    throw new Error(`Invalid date provided for ${fieldName}.`);
  }

  const input = value.trim();

  if (!input) return null;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? new Date(`${input}T00:00:00.000Z`)
    : new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date provided for ${fieldName}.`);
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(input) &&
    date.toISOString().slice(0, 10) !== input
  ) {
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

function normalizeSelectedIds(input) {
  if (!Array.isArray(input)) {
    throw new Error("selectedIds must be an array of shift IDs.");
  }

  if (
    input.some(
      (id) =>
        id === null ||
        id === undefined ||
        !["string", "number"].includes(typeof id) ||
        !String(id).trim()
    )
  ) {
    throw new Error("One or more shift IDs are invalid.");
  }

  return [...new Set(input.map((id) => String(id).trim()))];
}

// POST /api/hr/Shift/email-report

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

    if (typeof attachExcel !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "attachExcel must be true or false.",
        },
        { status: 400 }
      );
    }

    let normalizedIds;

    try {
      normalizedIds = normalizeSelectedIds(selectedIds);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    // 3. Read filters
    const query = String(filters?.query ?? "").trim();

    const status = String(filters?.status ?? "all")
      .trim()
      .toLowerCase();

    if (!["all", "active", "inactive"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be all, active, or inactive.",
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
          name: {
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

    if (status === "active") {
      where.status = true;
    } else if (status === "inactive") {
      where.status = false;
    }

    // Include only selected shifts when IDs are provided.
    if (normalizedIds.length > 0) {
      where.id = {
        in: normalizedIds,
      };
    }

    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lt: createdTo } : {}),
      };
    }

    if (updatedFrom || updatedTo) {
      where.updatedAt = {
        ...(updatedFrom ? { gte: updatedFrom } : {}),
        ...(updatedTo ? { lt: updatedTo } : {}),
      };
    }

    // 5. Fetch shifts
    const shifts = await prisma.shift.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (shifts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No shifts match the selected IDs and filters.",
        },
        { status: 404 }
      );
    }

    // 6. Generate Excel attachment when requested
    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const rows = shifts.map((shift) => ({
        ID: shift.id,
        "Shift Name": shift.name ?? "",
        Description: shift.description ?? "",
        Status: shift.status ? "Active" : "Inactive",
        "Created At": formatDate(shift.createdAt),
        "Updated At": formatDate(shift.updatedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 38 },
        { wch: 28 },
        { wch: 45 },
        { wch: 16 },
        { wch: 24 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Shifts"
      );

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      fileName = `hr-shifts-${new Date()
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
    const plainMessage = String(message ?? "").trim();

    const defaultMessage =
      "Please find the Shift report for your review.";

    const emailMessage = plainMessage || defaultMessage;

    const emailText = [
      emailMessage,
      "",
      `Total shifts: ${shifts.length}`,
      attachExcel
        ? `Attachment: ${fileName}`
        : "No Excel attachment included.",
      "",
      "Regards,",
      "HR Management Team",
    ].join("\n");

    const safeMessage = escapeHtml(emailMessage).replace(
      /\r\n|\r|\n/g,
      "<br>"
    );

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
        <h2 style="margin-bottom:16px">Shift Report</h2>

        <p>${safeMessage}</p>

        <p>
          <strong>Total shifts:</strong>
          ${shifts.length}
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

    // 9. Return result
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
      shiftCount: shifts.length,
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
    console.error("[SHIFT_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to generate or send the shift report.",
      },
      { status: 500 }
    );
  }
}