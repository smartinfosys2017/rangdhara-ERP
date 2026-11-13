
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { checkMenuAccess } from "@/lib/module-access";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

const MENU_KEY = "inventory_register";

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

function toRegisterNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
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
  if (!value) {
    return { date: null, error: null };
  }

  const input = String(value).trim();

  // Accept YYYY-MM-DD date strings.
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

function isInDateRange(value, range) {
  if (!range) return true;
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  if (range.gte && date < range.gte) return false;
  if (range.lt && date >= range.lt) return false;

  return true;
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
  NextResponse.json(
    { success: false, message, ...extra },
    { status: 400 },
  );

// ======================================================
// SEND INVENTORY REGISTER EMAIL REPORT
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
    } = body;

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

    if (!Array.isArray(selectedIds)) {
      return badRequest("selectedIds must be an array of item IDs.");
    }

    if (
      selectedIds.some(
        (id) =>
          id === null ||
          id === undefined ||
          !["string", "number"].includes(typeof id),
      )
    ) {
      return badRequest("selectedIds contains an invalid item ID.");
    }

    if (typeof attachExcel !== "boolean") {
      return badRequest("attachExcel must be true or false.");
    }

    // 3. READ FILTERS

    const query = String(filters?.query ?? "")
      .trim()
      .toLowerCase();

    const restockLevel = String(filters?.restockLevel ?? "").trim();

    if (restockLevel && !["lte", "gt"].includes(restockLevel)) {
      return badRequest("restockLevel must be lte or gt.");
    }

    const groupIds = normalizeList(filters?.groupId);
    const filterItemIds = normalizeList(filters?.itemId);
    const itemTypeIds = normalizeList(filters?.itemTypeId);

    // Selected rows take priority over the item IDs in the filter.
    const itemIds = selectedIds.length
      ? normalizeList(selectedIds)
      : filterItemIds;

    const addedRange = buildDateRange(
      filters?.addedFrom,
      filters?.addedTo,
      "added",
    );

    const updatedRange = buildDateRange(
      filters?.updatedFrom,
      filters?.updatedTo,
      "updated",
    );

    const rangeError = addedRange.error || updatedRange.error;

    if (rangeError) {
      return badRequest(rangeError);
    }

    // 4. BUILD ITEM MASTER DATABASE FILTERS

    const itemWhere = {
      deletedAt: null,

      ...(groupIds.length
        ? { ItemGroupid: { in: groupIds } }
        : {}),

      ...(itemIds.length
        ? { id: { in: itemIds } }
        : {}),

      ...(addedRange.range
        ? { createdAt: addedRange.range }
        : {}),
    };

    // 5. FETCH ITEM MASTERS

    const itemMasters = await prisma.itemMaster.findMany({
      where: itemWhere,
      orderBy: { createdAt: "desc" },
    });

    if (itemMasters.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No inventory items match the selected filters.",
        },
        { status: 404 },
      );
    }

    // 6. FETCH RELATED DATA

    const [
      itemGroups,
      units,
      issueReceipts,
      staffUsers,
    ] = await Promise.all([
      prisma.itemGroup.findMany({
        where: { deletedAt: null },
      }),

      prisma.unit.findMany({
        where: { deletedAt: null },
      }),

      prisma.issueReceipt.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.StaffUser.findMany(),
    ]);

    // 7. CREATE LOOKUP MAPS

    const itemGroupMap = new Map(
      itemGroups.map((item) => [
        String(item.id),
        item.groupName || item.name || "-",
      ]),
    );

    const unitMap = new Map(
      units.map((unit) => [
        String(unit.id),
        unit.unitName || unit.name || unit.abbreviation || "-",
      ]),
    );

    const staffMap = new Map(
      staffUsers.map((staff) => [
        String(staff.id),
        getStaffName(staff),
      ]),
    );

    // 8. FIND LATEST RECEIPT AND ITEM TYPES
    //
    // Receipts are ordered newest to oldest.
    // The first receipt encountered for each item is its latest receipt.

    const latestReceiptMap = new Map();
    const itemTypesByItem = new Map();

    for (const receipt of issueReceipts) {
      if (!receipt.ItemMasterid) continue;

      const itemMasterId = String(receipt.ItemMasterid);

      if (!latestReceiptMap.has(itemMasterId)) {
        latestReceiptMap.set(itemMasterId, receipt);
      }

      if (receipt.ItemTypeid) {
        if (!itemTypesByItem.has(itemMasterId)) {
          itemTypesByItem.set(itemMasterId, new Set());
        }

        itemTypesByItem
          .get(itemMasterId)
          .add(String(receipt.ItemTypeid));
      }
    }

    // 9. FORMAT INVENTORY REGISTER

    let register = itemMasters
      .map((item) => {
        const latestReceipt = latestReceiptMap.get(String(item.id));

        return {
          id: item.id,

          GroupName:
            itemGroupMap.get(String(item.ItemGroupid)) || "-",

          ItemName: item.ItemName || "-",

          UnitMeasure:
            unitMap.get(String(item.Unitid)) || "-",

          Balance: toRegisterNumber(latestReceipt?.Balance) ?? 0,

          RestockLevel: toRegisterNumber(item.RelocateLevel) ?? 0,

          AddedDate: item.createdAt || null,

          LastUpdateDate:
            latestReceipt?.updatedAt ?? item.updatedAt ?? null,

          AddedBy: latestReceipt?.Issue_by
            ? staffMap.get(String(latestReceipt.Issue_by)) || "-"
            : "-",

          LastUpdatedBy: latestReceipt?.RecivedBy
            ? staffMap.get(String(latestReceipt.RecivedBy)) || "-"
            : "-",

          latestIssueReceipt: latestReceipt || null,
        };
      })
      // Exclude items whose latest receipt balance is zero.
      .filter((item) => item.Balance !== 0);

    // 10. APPLY ITEM TYPE FILTER

    if (itemTypeIds.length > 0) {
      register = register.filter((row) => {
        const types = itemTypesByItem.get(String(row.id));

        return (
          !!types &&
          itemTypeIds.some((typeId) => types.has(typeId))
        );
      });
    }

    // 11. APPLY RESTOCK LEVEL FILTER

    if (restockLevel) {
      register = register.filter((row) => {
        const balance = toRegisterNumber(row.Balance) ?? 0;
        const level = toRegisterNumber(row.RestockLevel) ?? 0;

        return restockLevel === "lte"
          ? balance <= level
          : balance > level;
      });
    }

    // 12. APPLY LAST UPDATED DATE FILTER

    if (updatedRange.range) {
      register = register.filter((row) =>
        isInDateRange(row.LastUpdateDate, updatedRange.range),
      );
    }

    // 13. APPLY SEARCH FILTER

    if (query) {
      register = register.filter((row) =>
        [
          row.GroupName,
          row.ItemName,
          row.UnitMeasure,
          row.AddedBy,
          row.LastUpdatedBy,
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(query),
        ),
      );
    }

    if (register.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No inventory items match the selected filters.",
        },
        { status: 404 },
      );
    }

    // 14. GENERATE EXCEL ATTACHMENT

    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const rows = register.map((item) => ({
        ID: item.id,
        "Group Name": item.GroupName,
        "Item Name": item.ItemName,
        "Unit Measure": item.UnitMeasure,
        Balance: item.Balance,
        "Restock Level": item.RestockLevel,
        "Added Date": formatDate(item.AddedDate),
        "Last Updated": formatDate(item.LastUpdateDate),
        "Added By": item.AddedBy,
        "Last Updated By": item.LastUpdatedBy,
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 26 },
        { wch: 28 },
        { wch: 32 },
        { wch: 20 },
        { wch: 14 },
        { wch: 16 },
        { wch: 24 },
        { wch: 24 },
        { wch: 25 },
        { wch: 25 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Inventory Register",
      );

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      fileName = `inventory-register-${new Date()
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

    // 15. BUILD EMAIL CONTENT

    const plainMessage = String(message ?? "").trim();

    const defaultMessage =
      "Please find the Inventory Register report for your review.";

    const emailText = [
      plainMessage || defaultMessage,
      "",
      `Total inventory items: ${register.length}`,
      attachExcel
        ? `Attachment: ${fileName}`
        : "No Excel attachment included.",
      "",
      "Regards,",
      "Inventory Management Team",
    ].join("\n");

    const safeMessage = escapeHtml(
      plainMessage || defaultMessage,
    ).replace(/\r\n|\r|\n/g, "<br>");

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;color:#333;line-height:1.7">
        <h2 style="margin-bottom:16px">Inventory Register Report</h2>

        <p>${safeMessage}</p>

        <p>
          <strong>Total inventory items:</strong>
          ${register.length}
        </p>

        <p>
          ${
            attachExcel
              ? "The Excel Inventory Register report is attached to this email."
              : "No Excel attachment was requested."
          }
        </p>

        <p>Regards,<br>Inventory Management Team</p>
      </div>
    `;

    // 16. SEND EMAIL

    const result = await sendEmail({
      to: recipientEmails.join(", "),
      subject: String(subject).trim(),
      text: emailText,
      html: emailHtml,
      attachments,
    });

    // 17. RETURN RESPONSE

    return NextResponse.json({
      success: true,

      message: result.queued
        ? "Inventory Register email report added to the queue."
        : "Inventory Register email report sent successfully.",

      status: result.status,
      queued: result.queued,
      sent: result.sent,
      queueId: result.queueId,

      recipients: recipientEmails,
      itemCount: register.length,
      attachmentIncluded: attachments.length > 0,
      fileName,

      filters: {
        query,
        groupId: groupIds,
        itemId: itemIds,
        itemTypeId: itemTypeIds,
        restockLevel,
        addedFrom: filters?.addedFrom || "",
        addedTo: filters?.addedTo || "",
        updatedFrom: filters?.updatedFrom || "",
        updatedTo: filters?.updatedTo || "",
        selectedIds,
      },
    });
  } catch (error) {
    console.error("[INVENTORY_REGISTER_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to generate or send the Inventory Register report.",
      },
      { status: 500 },
    );
  }
}
