
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { checkMenuAccess } from "@/lib/module-access";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { GET as getChangeLogs } from "../route";

export const runtime = "nodejs";

const MENU_KEY = "inventory_change_log";
const REPORT_TITLE = "Inventory Change Log Report";
const PAGE_SIZE = 200;

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

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-IN");
}

function normalizeRecipients(input) {
  const list = Array.isArray(input)
    ? input
    : String(input ?? "").split(",");

  return [
    ...new Set(
      list
        .map((email) => String(email).trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeList(value) {
  const values = Array.isArray(value)
    ? value
    : value === null || value === undefined
      ? []
      : [value];

  return [
    ...new Set(
      values
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function parseDate(value, fieldName) {
  if (!value) return { date: null, error: null };

  const input = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return {
      date: null,
      error: `Invalid date provided for ${fieldName}.`,
    };
  }

  const date = new Date(`${input}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input
  ) {
    return {
      date: null,
      error: `Invalid date provided for ${fieldName}.`,
    };
  }

  return { date, error: null };
}

function buildDateRange(fromValue, toValue, prefix) {
  const fromResult = parseDate(fromValue, `${prefix}From`);
  const toResult = parseDate(toValue, `${prefix}To`);

  if (fromResult.error || toResult.error) {
    return {
      range: null,
      error: fromResult.error || toResult.error,
    };
  }

  const from = fromResult.date;
  const to = toResult.date;

  if (from && to && from > to) {
    return {
      range: null,
      error: `${prefix} date range is invalid.`,
    };
  }

  const endExclusive = to
    ? new Date(to.getTime() + 24 * 60 * 60 * 1000)
    : null;

  return {
    range:
      from || endExclusive
        ? {
            ...(from ? { gte: from } : {}),
            ...(endExclusive ? { lt: endExclusive } : {}),
          }
        : null,
    error: null,
  };
}

function badRequest(message, extra = {}) {
  return NextResponse.json(
    { success: false, message, ...extra },
    { status: 400 },
  );
}

function getRows(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.items)) {
    return result.data.items;
  }
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.results)) return result.results;
  return [];
}

function getRecordDate(record) {
  return (
    record.createdAt ??
    record.CreatedAt ??
    record.changeDate ??
    record.ChangeDate ??
    record.date ??
    null
  );
}

function buildExcelBuffer(records) {
  const rows = records.map((record) => ({
    ID: record.id ?? "",
    Date: formatDate(getRecordDate(record)),
    "User Name": record.UserName ?? record.userName ?? "-",
    Action: record.Action ?? record.action ?? "-",
    "Item Name": record.ItemName ?? record.itemName ?? "-",
    "Item Type": record.ItemType ?? record.itemType ?? "-",
    Details: record.Details ?? record.details ?? "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 24 },
    { wch: 28 },
    { wch: 20 },
    { wch: 32 },
    { wch: 25 },
    { wch: 60 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Change Log",
  );

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
}

// ======================================================
// FETCH ALL FILTERED CHANGE-LOG RECORDS
// Uses the existing change-log GET handler so the Prisma
// model and its actual database fields do not need guessing.
// ======================================================

async function fetchChangeLogs(request, filters) {
  const allRecords = [];
  let page = 1;

  const query = String(
    filters?.search ?? filters?.query ?? "",
  ).trim();

  const dateFrom = filters?.dateFrom ?? "";
  const dateTo = filters?.dateTo ?? "";

  const itemIds = normalizeList(
    filters?.itemIds ?? filters?.itemId,
  );

  const groupIds = normalizeList(
    filters?.groupIds ?? filters?.groupId,
  );

  const itemTypeIds = normalizeList(
    filters?.itemTypeIds ?? filters?.itemTypeId,
  );

  // Prevent an accidental infinite loop if an API response is malformed.
  const MAX_PAGES = 10000;

  while (page <= MAX_PAGES) {
    const url = new URL(
      "/api/inventory/inventroy-change-log",
      request.url,
    );

    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_SIZE));

    if (query) url.searchParams.set("search", query);
    if (dateFrom) url.searchParams.set("dateFrom", String(dateFrom));
    if (dateTo) url.searchParams.set("dateTo", String(dateTo));

    itemIds.forEach((id) => url.searchParams.append("itemId", id));
    groupIds.forEach((id) => url.searchParams.append("groupId", id));
    itemTypeIds.forEach((id) =>
      url.searchParams.append("itemTypeId", id),
    );

    const internalRequest = new Request(url, {
      method: "GET",
      headers: request.headers,
    });

    const response = await getChangeLogs(internalRequest);

    if (!response.ok) {
      const errorResult = await response.json().catch(() => ({}));

      const error = new Error(
        errorResult.message ||
          errorResult.error ||
          "Unable to retrieve change-log records.",
      );

      error.status = response.status;
      throw error;
    }

    const result = await response.json();

    if (result?.success === false) {
      throw new Error(
        result.message || "Unable to retrieve change-log records.",
      );
    }

    const records = getRows(result);

    if (records.length === 0) break;

    allRecords.push(...records);

    const pagination = result.pagination ?? {};
    const totalPages = Number(pagination.totalPages ?? 0);
    const total = Number(pagination.total ?? 0);

    if (totalPages > 0 && page >= totalPages) break;

    if (totalPages === 0 && total > 0 && allRecords.length >= total) {
      break;
    }

    if (records.length < PAGE_SIZE) break;

    page += 1;
  }

  if (page > MAX_PAGES) {
    throw new Error(
      "The change-log report exceeded the maximum number of pages.",
    );
  }

  // Apply date checks to the returned records as a safety net.
  const fromResult = buildDateRange(dateFrom, "", "date");
  const toResult = buildDateRange("", dateTo, "date");

  if (fromResult.error || toResult.error) {
    throw new Error(fromResult.error || toResult.error);
  }

  const from = fromResult.range?.gte;
  const to = toResult.range?.lt;

  let records = allRecords.filter((record) => {
    const value = getRecordDate(record);

    if (!from && !to) return true;
    if (!value) return false;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return false;
    if (from && date < from) return false;
    if (to && date >= to) return false;

    return true;
  });

  return records;
}

// ======================================================
// SEND INVENTORY CHANGE-LOG EMAIL REPORT
// ======================================================

export async function POST(request) {
  try {
    // 1. CHECK MENU ACCESS AND AUTHENTICATION

    const accessError = await checkMenuAccess(MENU_KEY);

    if (accessError) return accessError;

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

    // 2. READ REQUEST BODY

    const body = await request.json();

    const {
      recipients,
      to,
      subject,
      message = "",
      attachExcel = true,
      selectedIds = [],
      filters = {},
    } = body ?? {};

    const recipientEmails = normalizeRecipients(recipients ?? to);

    if (recipientEmails.length === 0) {
      return badRequest(
        "Please provide at least one recipient email address.",
      );
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

    if (typeof message !== "string") {
      return badRequest("Email message must be text.");
    }

    if (!Array.isArray(selectedIds)) {
      return badRequest(
        "selectedIds must be an array of change-log IDs.",
      );
    }

    if (
      selectedIds.some(
        (id) =>
          id === null ||
          id === undefined ||
          !["string", "number"].includes(typeof id),
      )
    ) {
      return badRequest("selectedIds contains an invalid ID.");
    }

    if (typeof attachExcel !== "boolean") {
      return badRequest("attachExcel must be true or false.");
    }

    // 3. READ AND VALIDATE FILTERS

    const addedRange = buildDateRange(
      filters?.dateFrom,
      filters?.dateTo,
      "date",
    );

    if (addedRange.error) {
      return badRequest(addedRange.error);
    }

    const itemIds = normalizeList(
      filters?.itemIds ?? filters?.itemId,
    );

    const groupIds = normalizeList(
      filters?.groupIds ?? filters?.groupId,
    );

    const itemTypeIds = normalizeList(
      filters?.itemTypeIds ?? filters?.itemTypeId,
    );

    // 4. FETCH FILTERED CHANGE-LOG DATA

    let changeLogs = await fetchChangeLogs(request, filters);

    // Selected change-log rows take priority over filters' item IDs.
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds.map(String));

      changeLogs = changeLogs.filter((record) =>
        selectedSet.has(String(record.id)),
      );
    }

    if (changeLogs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No inventory change-log records match the selected filters.",
        },
        { status: 404 },
      );
    }

    // 5. GENERATE EXCEL ATTACHMENT

    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const excelBuffer = buildExcelBuffer(changeLogs);

      fileName = `inventory-change-log-${new Date()
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

    // 6. BUILD EMAIL CONTENT

    const plainMessage =
      message.trim() ||
      "Please find the Inventory Change Log report for your review.";

    const emailText = [
      plainMessage,
      "",
      `Total change-log records: ${changeLogs.length}`,
      attachExcel
        ? `Attachment: ${fileName}`
        : "No Excel attachment included.",
      "",
      "Regards,",
      "Inventory Management Team",
    ].join("\n");

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
        <h2 style="margin-bottom:16px">${REPORT_TITLE}</h2>

        <p>${escapeHtml(plainMessage).replace(/\r\n|\r|\n/g, "<br>")}</p>

        <p>
          <strong>Total change-log records:</strong>
          ${changeLogs.length}
        </p>

        <p>
          ${
            attachExcel
              ? "The Excel Inventory Change Log report is attached to this email."
              : "No Excel attachment was requested."
          }
        </p>

        <p>Regards,<br>Inventory Management Team</p>
      </div>
    `;

    // 7. SEND EMAIL USING THE EXISTING PROJECT EMAIL UTILITY

    const result = await sendEmail({
      to: recipientEmails.join(", "),
      subject: String(subject).trim(),
      text: emailText,
      html: emailHtml,
      attachments,
    });

    // 8. RETURN RESPONSE

    return NextResponse.json({
      success: true,
      message: result?.queued
        ? "Inventory Change Log email report added to the queue."
        : "Inventory Change Log email report sent successfully.",
      status: result?.status,
      queued: result?.queued,
      sent: result?.sent,
      queueId: result?.queueId,
      recipients: recipientEmails,
      recordCount: changeLogs.length,
      attachmentIncluded: attachments.length > 0,
      fileName,
      filters: {
        search: filters?.search ?? filters?.query ?? "",
        itemIds,
        groupIds,
        itemTypeIds,
        dateFrom: filters?.dateFrom ?? "",
        dateTo: filters?.dateTo ?? "",
        selectedIds,
      },
    });
  } catch (error) {
    console.error("[INVENTORY_CHANGE_LOG_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to generate or send the Inventory Change Log report.",
      },
      { status: error?.status || 500 },
    );
  }
}
