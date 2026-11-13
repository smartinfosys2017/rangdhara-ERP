import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { checkMenuAccess } from "@/lib/module-access";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

const MENU_KEY = "item-master";

// ======================================================
// HELPERS
// ======================================================

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

// Dates arrive as YYYY-MM-DD. Parsing them as UTC midnight matches the
// filtering used by /api/inventory/item-master, so the report matches the table.
function parseDate(value, fieldName) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

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
  const list = Array.isArray(input) ? input : String(input ?? "").split(",");

  return [
    ...new Set(list.map((email) => String(email).trim()).filter(Boolean)),
  ];
}

const badRequest = (message, extra = {}) =>
  NextResponse.json({ success: false, message, ...extra }, { status: 400 });

// ======================================================
// SEND ITEM MASTER EMAIL REPORT
// ======================================================

export async function POST(request) {
  try {
    // 1. Access and authentication
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in again." },
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

    // Support both recipients and to.
    const recipientEmails = normalizeRecipients(recipients ?? to);

    if (recipientEmails.length === 0) {
      return badRequest("Please provide at least one recipient email address.");
    }

    const invalidEmails = recipientEmails.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );

    if (invalidEmails.length > 0) {
      return badRequest(
        "One or more recipient email addresses are invalid.",
        { invalidEmails },
      );
    }

    if (!String(subject ?? "").trim()) {
      return badRequest("Email subject is required.");
    }

    if (
      !Array.isArray(selectedIds) ||
      selectedIds.some(
        (id) =>
          id === null ||
          id === undefined ||
          !["string", "number"].includes(typeof id),
      )
    ) {
      return badRequest("selectedIds must be an array of item IDs.");
    }

    if (typeof attachExcel !== "boolean") {
      return badRequest("attachExcel must be true or false.");
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
      return badRequest("The creation date range is invalid.");
    }

    if (updatedFrom && updatedTo && updatedFrom >= updatedTo) {
      return badRequest("The update date range is invalid.");
    }

    if (!["all", "active", "inactive"].includes(status)) {
      return badRequest("Status must be all, active, or inactive.");
    }

    // 4. Build Prisma filters (same rules as the list API).
    const where = {
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { ItemName: { contains: query, mode: "insensitive" } },
        { Description: { contains: query, mode: "insensitive" } },
      ];
    }

    if (status === "active") {
      where.status = true;
    } else if (status === "inactive") {
      where.status = false;
    }

    // Selected rows take priority over the filters in the UI, but the filters
    // still apply here, as in the item groups report.
    if (selectedIds.length > 0) {
      where.id = { in: selectedIds.map(String) };
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

    // 5. Fetch items.
    const items = await prisma.itemMaster.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ItemName: true,
        Description: true,
        rather: true,
        status: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No items match the selected IDs and filters.",
        },
        { status: 404 },
      );
    }

    // 6. Generate Excel attachment when requested.
    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const rows = items.map((item) => ({
        ID: item.id,
        "Item Name": item.ItemName ?? "",
        Description: item.Description ?? "",
        Rate: item.rather ?? "",
        Status: item.status ? "Active" : "Inactive",
        "Default Item": item.isDefault ? "Yes" : "No",
        "Created At": formatDate(item.createdAt),
        "Updated At": formatDate(item.updatedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 38 },
        { wch: 30 },
        { wch: 45 },
        { wch: 12 },
        { wch: 16 },
        { wch: 18 },
        { wch: 24 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Item Master");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      fileName = `inventory-item-master-${new Date()
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
    const defaultMessage = "Please find the Item Master report for your review.";

    const emailText = [
      plainMessage || defaultMessage,
      "",
      `Total items: ${items.length}`,
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
        <h2 style="margin-bottom:16px">Item Master Report</h2>

        <p>${safeMessage}</p>

        <p>
          <strong>Total items:</strong>
          ${items.length}
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
      itemCount: items.length,
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
    console.error("[ITEM_MASTER_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to generate or send the item master report.",
      },
      { status: 500 },
    );
  }
}