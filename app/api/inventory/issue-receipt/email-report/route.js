import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { checkMenuAccess } from "@/lib/module-access";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

const MENU_KEY = "inventory-issue-receipt";

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

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN");
}

// Dates arrive as YYYY-MM-DD and are treated as UTC days, the same as the
// list API, so the emailed report matches the table.
function buildDateRange(from, to, fieldName) {
  const start = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const end = to ? new Date(`${to}T00:00:00.000Z`) : null;

  if (
    (start && Number.isNaN(start.getTime())) ||
    (end && Number.isNaN(end.getTime()))
  ) {
    throw new Error(`Invalid date provided for ${fieldName}.`);
  }

  if (start && end && start > end) {
    throw new Error(`The ${fieldName} date range is invalid.`);
  }

  if (!start && !end) return undefined;

  return {
    ...(start ? { gte: start } : {}),
    ...(end ? { lt: new Date(end.getTime() + 24 * 60 * 60 * 1000) } : {}),
  };
}

function normalizeRecipients(input) {
  const list = Array.isArray(input) ? input : String(input ?? "").split(",");

  return [
    ...new Set(list.map((email) => String(email).trim()).filter(Boolean)),
  ];
}

function getStaffName(user) {
  if (!user) return "-";

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.name || user.username || user.email || "-";
}

const badRequest = (message, extra = {}) =>
  NextResponse.json({ success: false, message, ...extra }, { status: 400 });

// One definition for the Excel columns.
const REPORT_COLUMNS = [
  { label: "ID", width: 38, get: (r) => r.id },
  { label: "Challan No", width: 20, get: (r) => r.ReciptChallanNo },
  { label: "Item Group", width: 22, get: (r) => r.ItemGroupName },
  { label: "Item Master", width: 28, get: (r) => r.ItemMasterName },
  { label: "Item Type", width: 18, get: (r) => r.ItemTypeName },
  { label: "Transaction Type", width: 20, get: (r) => r.TransactionTypeName },
  { label: "Issue Date", width: 14, get: (r) => formatDate(r.IssueDate) },
  { label: "Previous Balance", width: 16, get: (r) => r.PreviousBalance },
  { label: "Qty", width: 10, get: (r) => r.Qty },
  { label: "Price", width: 12, get: (r) => r.Price },
  { label: "Balance", width: 12, get: (r) => r.Balance },
  { label: "Issue By", width: 18, get: (r) => r.IssueByName },
  { label: "Gate Pass No", width: 16, get: (r) => r.GetPassNo },
  { label: "Date Of Receive", width: 16, get: (r) => formatDate(r.DateOfRecive) },
  { label: "Received By", width: 18, get: (r) => r.ReceivedByName },
  { label: "Particulars", width: 30, get: (r) => r.Particuler },
  { label: "Comment", width: 30, get: (r) => r.Comment },
  { label: "Created Date", width: 14, get: (r) => formatDate(r.createdAt) },
  { label: "Updated Date", width: 14, get: (r) => formatDate(r.updatedAt) },
];

// ======================================================
// SEND Issue/Receipt EMAIL REPORT
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

    const recipientEmails = normalizeRecipients(recipients ?? to);

    if (recipientEmails.length === 0) {
      return badRequest("Please provide at least one recipient email address.");
    }

    const invalidEmails = recipientEmails.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );

    if (invalidEmails.length > 0) {
      return badRequest("One or more recipient email addresses are invalid.", {
        invalidEmails,
      });
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
      return badRequest("selectedIds must be an array of Issue/Receipt IDs.");
    }

    if (typeof attachExcel !== "boolean") {
      return badRequest("attachExcel must be true or false.");
    }

    // 3. Related data (ID -> name)
    const [itemGroups, itemMasters, itemTypes, transactionTypes, staffUsers] =
      await Promise.all([
        prisma.itemGroup.findMany(),
        prisma.itemMaster.findMany(),
        prisma.ptoductType.findMany(),
        prisma.transactionType.findMany(),
        prisma.StaffUser.findMany(),
      ]);

    const itemGroupMap = new Map(
      itemGroups.map((item) => [
        String(item.id),
        item.groupName || item.name || "-",
      ]),
    );

    const itemMasterMap = new Map(
      itemMasters.map((item) => [
        String(item.id),
        item.ItemName || item.itemName || item.name || "-",
      ]),
    );

    const itemTypeMap = new Map(
      itemTypes.map((item) => [
        String(item.id),
        item.name ||
          item.ProductType ||
          item.ptoductType ||
          item.ItemTypeName ||
          item.productTypeName ||
          item.ProductTypeName ||
          "-",
      ]),
    );

    const transactionTypeMap = new Map(
      transactionTypes.map((item) => [
        String(item.id),
        item.name ||
          item.TransactionType ||
          item.transactionType ||
          item.TransactionTypeName ||
          item.typeName ||
          item.TypeName ||
          "-",
      ]),
    );

    const staffMap = new Map(
      staffUsers.map((person) => [String(person.id), getStaffName(person)]),
    );

    // 4. Build Prisma filters (same rules as the list API).
    const query = String(filters?.query ?? "").trim();

    const issueRange = buildDateRange(
      filters?.issueFrom,
      filters?.issueTo,
      "issue date",
    );
    const createdRange = buildDateRange(
      filters?.createdFrom,
      filters?.createdTo,
      "creation date",
    );
    const updatedRange = buildDateRange(
      filters?.updatedFrom,
      filters?.updatedTo,
      "update date",
    );

    const where = { deletedAt: null };

    if (query) {
      const needle = query.toLowerCase();

      const idsMatching = (map) =>
        [...map.entries()]
          .filter(([, name]) => String(name).toLowerCase().includes(needle))
          .map(([key]) => key);

      const orConditions = [
        { ReciptChallanNo: { contains: query, mode: "insensitive" } },
        { GetPassNo: { contains: query, mode: "insensitive" } },
        { Particuler: { contains: query, mode: "insensitive" } },
        { Comment: { contains: query, mode: "insensitive" } },
      ];

      const groupIds = idsMatching(itemGroupMap);
      const masterIds = idsMatching(itemMasterMap);
      const typeIds = idsMatching(itemTypeMap);
      const transactionIds = idsMatching(transactionTypeMap);
      const staffIds = idsMatching(staffMap);

      if (groupIds.length) orConditions.push({ ItemGroupid: { in: groupIds } });
      if (masterIds.length) {
        orConditions.push({ ItemMasterid: { in: masterIds } });
      }
      if (typeIds.length) orConditions.push({ ItemTypeid: { in: typeIds } });
      if (transactionIds.length) {
        orConditions.push({ TransactionTypeid: { in: transactionIds } });
      }
      if (staffIds.length) {
        orConditions.push({ Issue_by: { in: staffIds } });
        orConditions.push({ RecivedBy: { in: staffIds } });
      }

      where.OR = orConditions;
    }

    if (selectedIds.length > 0) {
      where.id = { in: selectedIds.map(String) };
    }

    if (issueRange) where.IssueDate = issueRange;
    if (createdRange) where.createdAt = createdRange;
    if (updatedRange) where.updatedAt = updatedRange;

    // 5. Fetch Issue/Receipts and add names.
    const issueReceipts = await prisma.issueReceipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (issueReceipts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No Issue/Receipts match the selected IDs and filters.",
        },
        { status: 404 },
      );
    }

    const items = issueReceipts.map((receipt) => ({
      ...receipt,
      ItemGroupName: itemGroupMap.get(String(receipt.ItemGroupid)) || "-",
      ItemMasterName: itemMasterMap.get(String(receipt.ItemMasterid)) || "-",
      ItemTypeName: itemTypeMap.get(String(receipt.ItemTypeid)) || "-",
      TransactionTypeName:
        transactionTypeMap.get(String(receipt.TransactionTypeid)) || "-",
      IssueByName: staffMap.get(String(receipt.Issue_by)) || "-",
      ReceivedByName: staffMap.get(String(receipt.RecivedBy)) || "-",
    }));

    // 6. Generate Excel attachment when requested.
    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const rows = items.map((item) =>
        Object.fromEntries(
          REPORT_COLUMNS.map((col) => [col.label, col.get(item) ?? ""]),
        ),
      );

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = REPORT_COLUMNS.map((col) => ({ wch: col.width }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Issue/Receipts");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      fileName = `inventory-issue-receipts-${new Date()
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
    const defaultMessage =
      "Please find the Issue/Receipt report for your review.";

    const emailText = [
      plainMessage || defaultMessage,
      "",
      `Total Issue/Receipts: ${items.length}`,
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
        <h2 style="margin-bottom:16px">Issue/Receipt Report</h2>

        <p>${safeMessage}</p>

        <p>
          <strong>Total Issue/Receipts:</strong>
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
      issueReceiptCount: items.length,
      attachmentIncluded: attachments.length > 0,
      fileName,
    });
  } catch (error) {
    console.error("[ISSUE_RECEIPT_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to generate or send the Issue/Receipt report.",
      },
      { status: 500 },
    );
  }
}