
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

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input);

  const date = isDateOnly
    ? new Date(`${input}T00:00:00.000Z`)
    : new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date provided for ${fieldName}.`);
  }

  if (
    isDateOnly &&
    date.toISOString().slice(0, 10) !== input
  ) {
    throw new Error(`Invalid date provided for ${fieldName}.`);
  }

  return date;
}

function endOfDateExclusive(value, fieldName) {
  const date = parseDate(value, fieldName);

  if (!date) return null;

  // Date-only filters use an exclusive next-day boundary.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

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

function normalizeSelectedIds(input) {
  if (!Array.isArray(input)) {
    throw new Error("selectedIds must be an array of break time IDs.");
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
    throw new Error("One or more break time IDs are invalid.");
  }

  return [...new Set(input.map((id) => String(id).trim()))];
}

function normalizeStatus(value) {
  const status = String(value ?? "all")
    .trim()
    .toLowerCase();

  if (["all", ""].includes(status)) return "all";
  if (["active", "true", "1"].includes(status)) return "active";
  if (["inactive", "false", "0"].includes(status)) return "inactive";

  return null;
}

// POST /api/hr/BreakTime/email-report

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidEmails = recipientEmails.filter(
      (email) => !emailRegex.test(email)
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

    if (
      !filters ||
      typeof filters !== "object" ||
      Array.isArray(filters)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Filters must be an object.",
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
    const query = String(filters.query ?? "").trim();
    const status = normalizeStatus(filters.status);

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be all, active, or inactive.",
        },
        { status: 400 }
      );
    }

    let createdFrom;
    let createdTo;
    let updatedFrom;
    let updatedTo;

    try {
      createdFrom = parseDate(filters.createdFrom, "createdFrom");
      createdTo = endOfDateExclusive(filters.createdTo, "createdTo");

      updatedFrom = parseDate(filters.updatedFrom, "updatedFrom");
      updatedTo = endOfDateExclusive(filters.updatedTo, "updatedTo");
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

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
      where.name = {
        contains: query,
        mode: "insensitive",
      };
    }

    if (status === "active") {
      where.status = true;
    } else if (status === "inactive") {
      where.status = false;
    }

    // If IDs are provided, report only those selected break times.
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

    // 5. Fetch break times
    const breakTimes = await prisma.breakTime.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        fromTime: true,
        toTime: true,
        durationMinutes: true,
        breakType: true,
        isFlexible: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (breakTimes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No break times match the selected IDs and filters.",
        },
        { status: 404 }
      );
    }

    // 6. Generate Excel attachment if requested
    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const rows = breakTimes.map((breakTime) => ({
        ID: breakTime.id,
        "Break Name": breakTime.name ?? "",
        "From Time": breakTime.fromTime ?? "",
        "To Time": breakTime.toTime ?? "",
        "Duration (Minutes)": breakTime.durationMinutes ?? "",
        "Break Type": breakTime.breakType ?? "",
        "Flexible": breakTime.isFlexible ? "Yes" : "No",
        "Status": breakTime.status ? "Active" : "Inactive",
        "Created At": formatDate(breakTime.createdAt),
        "Updated At": formatDate(breakTime.updatedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 14 },
        { wch: 28 },
        { wch: 16 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Break Times"
      );

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      fileName = `hr-break-times-${new Date()
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

    const emailMessage =
      plainMessage || "Please find the Break Time report for your review.";

    const emailText = [
      emailMessage,
      "",
      `Total break times: ${breakTimes.length}`,
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
        <h2 style="margin-bottom:16px">Break Time Report</h2>

        <p>${safeMessage}</p>

        <p>
          <strong>Total break times:</strong>
          ${breakTimes.length}
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

    // 8. Send email using your existing helper
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
        ? "Break Time report added to the email queue."
        : "Break Time report sent successfully.",
      status: result.status,
      queued: result.queued,
      sent: result.sent,
      queueId: result.queueId,
      recipients: recipientEmails,
      breakTimeCount: breakTimes.length,
      attachmentIncluded: attachments.length > 0,
      fileName,
      filters: {
        query,
        status,
        createdFrom: filters.createdFrom || "",
        createdTo: filters.createdTo || "",
        updatedFrom: filters.updatedFrom || "",
        updatedTo: filters.updatedTo || "",
      },
    });
  } catch (error) {
    console.error("[BREAKTIME_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to generate or send the Break Time report.",
      },
      { status: 500 }
    );
  }
}
