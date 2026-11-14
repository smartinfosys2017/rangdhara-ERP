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

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN");
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
  const list = Array.isArray(input) ? input : String(input ?? "").split(",");

  return [
    ...new Set(list.map((email) => String(email).trim()).filter(Boolean)),
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
        { status: 401 },
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
        { status: 400 },
      );
    }

    const invalidEmails = recipientEmails.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );

    if (invalidEmails.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more recipient email addresses are invalid.",
          invalidEmails,
        },
        { status: 400 },
      );
    }

    if (!String(subject ?? "").trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email subject is required.",
        },
        { status: 400 },
      );
    }

    if (
      !Array.isArray(selectedIds) ||
      selectedIds.some(
        (id) => id === null || id === undefined || typeof id !== "string",
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "selectedIds must be an array of location IDs.",
        },
        { status: 400 },
      );
    }

    if (typeof attachExcel !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "attachExcel must be true or false.",
        },
        { status: 400 },
      );
    }

    // 3. Read filters
    const query = String(filters?.query ?? "").trim();

    const status = String(filters?.status ?? "all")
      .trim()
      .toLowerCase();

    const createdFrom = parseDate(filters?.createdFrom, "createdFrom");

    const createdTo = endOfDateExclusive(filters?.createdTo, "createdTo");

    const updatedFrom = parseDate(filters?.updatedFrom, "updatedFrom");

    const updatedTo = endOfDateExclusive(filters?.updatedTo, "updatedTo");

    if (createdFrom && createdTo && createdFrom >= createdTo) {
      return NextResponse.json(
        {
          success: false,
          message: "The creation date range is invalid.",
        },
        { status: 400 },
      );
    }

    if (updatedFrom && updatedTo && updatedFrom >= updatedTo) {
      return NextResponse.json(
        {
          success: false,
          message: "The update date range is invalid.",
        },
        { status: 400 },
      );
    }

    if (!["all", "active", "inactive"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be all, active, or inactive.",
        },
        { status: 400 },
      );
    }

    // 4. Build Prisma filters
    const where = {
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        {
          locationName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          locationCode: {
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

    // 5. Fetch locations
    const locations = await prisma.Location.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        locationName: true,
        locationCode: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (locations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No locations match the selected IDs and filters.",
        },
        { status: 404 },
      );
    }

    // 6. Generate Excel attachment
    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const rows = locations.map((location) => ({
        ID: location.id,
        "Location Name": location.locationName ?? "",
        "Location Code": location.locationCode ?? "",
        Status: location.status ? "Active" : "Inactive",
        "Created At": formatDate(location.createdAt),
        "Updated At": formatDate(location.updatedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 38 },
        { wch: 30 },
        { wch: 22 },
        { wch: 16 },
        { wch: 24 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Locations");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      fileName = `inventory-locations-${new Date()
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

    const defaultMessage = "Please find the Location report for your review.";

    const emailText = [
      plainMessage || defaultMessage,
      "",
      `Total locations: ${locations.length}`,
      attachExcel ? `Attachment: ${fileName}` : "No Excel attachment included.",
      "",
      "Regards,",
      "Inventory Management Team",
    ].join("\n");

    const safeMessage = escapeHtml(plainMessage || defaultMessage).replace(
      /\r\n|\r|\n/g,
      "<br>",
    );

    const emailHtml = `
            <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
                <h2 style="margin-bottom:16px">Location Report</h2>

                <p>${safeMessage}</p>

                <p>
                    <strong>Total locations:</strong>
                    ${locations.length}
                </p>

                <p>
                    ${
                      attachExcel
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
        ? "Location report email added to the queue."
        : "Location report email sent successfully.",
      status: result.status,
      queued: result.queued,
      sent: result.sent,
      queueId: result.queueId,
      recipients: recipientEmails,
      locationCount: locations.length,
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
    console.error("[LOCATION_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to generate or send the location report.",
      },
      { status: 500 },
    );
  }
}