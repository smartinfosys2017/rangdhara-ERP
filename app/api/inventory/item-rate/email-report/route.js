
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";
import { checkMenuAccess } from "@/lib/module-access";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

const MENU_KEY = "item-rate";

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

function formatDateOnly(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-IN");
}

// Dates arrive as YYYY-MM-DD and are parsed as UTC midnight.
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

function getUnitName(unit) {
  if (!unit) return "";

  const name = unit.unitName ?? unit.name ?? "";
  const abbreviation = unit.abbreviation ?? "";

  return abbreviation
    ? `${name} (${abbreviation})`
    : name;
}

const badRequest = (message, extra = {}) =>
  NextResponse.json(
    { success: false, message, ...extra },
    { status: 400 },
  );

// ======================================================
// SEND ITEM RATE EMAIL REPORT
// ======================================================

export async function POST(request) {
  try {
    // 1. Access and authentication
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

    const recipientEmails = normalizeRecipients(
      recipients ?? to,
    );

    if (recipientEmails.length === 0) {
      return badRequest(
        "Please provide at least one recipient email address.",
      );
    }

    const invalidEmails = recipientEmails.filter(
      (email) =>
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
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
      return badRequest(
        "selectedIds must be an array of item rate IDs.",
      );
    }

    if (typeof attachExcel !== "boolean") {
      return badRequest("attachExcel must be true or false.");
    }

    // 3. Read filters
    const query = String(filters?.query ?? "").trim();

    const createdFrom = parseDate(
      filters?.createdFrom,
      "createdFrom",
    );

    const createdTo = endOfDateExclusive(
      filters?.createdTo,
      "createdTo",
    );

    const updatedFrom = parseDate(
      filters?.updatedFrom,
      "updatedFrom",
    );

    const updatedTo = endOfDateExclusive(
      filters?.updatedTo,
      "updatedTo",
    );

    const applicableFromDateFrom = parseDate(
      filters?.applicableFromDateFrom,
      "applicableFromDateFrom",
    );

    const applicableFromDateTo = endOfDateExclusive(
      filters?.applicableFromDateTo,
      "applicableFromDateTo",
    );

    const applicableToDateFrom = parseDate(
      filters?.applicableToDateFrom,
      "applicableToDateFrom",
    );

    const applicableToDateTo = endOfDateExclusive(
      filters?.applicableToDateTo,
      "applicableToDateTo",
    );

    if (createdFrom && createdTo && createdFrom >= createdTo) {
      return badRequest("The creation date range is invalid.");
    }

    if (updatedFrom && updatedTo && updatedFrom >= updatedTo) {
      return badRequest("The update date range is invalid.");
    }

    if (
      applicableFromDateFrom &&
      applicableFromDateTo &&
      applicableFromDateFrom >= applicableFromDateTo
    ) {
      return badRequest(
        "The applicable from date range is invalid.",
      );
    }

    if (
      applicableToDateFrom &&
      applicableToDateTo &&
      applicableToDateFrom >= applicableToDateTo
    ) {
      return badRequest(
        "The applicable to date range is invalid.",
      );
    }

    // 4. Build Prisma filters
    const where = {
      deletedAt: null,
    };

    if (query) {
      const matchingItems = await prisma.itemMaster.findMany({
        where: {
          deletedAt: null,
          ItemName: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

      const matchingGroups = await prisma.itemGroup.findMany({
        where: {
          deletedAt: null,
          groupName: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

      const matchingBrands =
        await prisma.brandManufacturer.findMany({
          where: {
            deletedAt: null,
            OR: [
              {
                BrandName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          },
          select: {
            id: true,
          },
        });

      where.OR = [
        {
          ItemGroupid: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          ItemMasterid: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          BrandManufacturerid: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          ItemConditionid: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          Unitid: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          Comments: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          ...(matchingItems.length > 0
            ? {
                ItemMasterid: {
                  in: matchingItems.map((item) => item.id),
                },
              }
            : {}),
        },
        {
          ...(matchingGroups.length > 0
            ? {
                ItemGroupid: {
                  in: matchingGroups.map((group) => group.id),
                },
              }
            : {}),
        },
        {
          ...(matchingBrands.length > 0
            ? {
                BrandManufacturerid: {
                  in: matchingBrands.map((brand) => brand.id),
                },
              }
            : {}),
        },
        ...(Number.isFinite(Number(query))
          ? [
              {
                Rate: Number(query),
              },
            ]
          : []),
      ];
    }

    // Selected rows take priority over UI filters.
    if (selectedIds.length > 0) {
      where.id = {
        in: selectedIds.map(String),
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

    if (applicableFromDateFrom || applicableFromDateTo) {
      where.ApplicableFromDate = {
        ...(applicableFromDateFrom
          ? { gte: applicableFromDateFrom }
          : {}),
        ...(applicableFromDateTo
          ? { lt: applicableFromDateTo }
          : {}),
      };
    }

    if (applicableToDateFrom || applicableToDateTo) {
      where.ApplicableToDate = {
        ...(applicableToDateFrom
          ? { gte: applicableToDateFrom }
          : {}),
        ...(applicableToDateTo
          ? { lt: applicableToDateTo }
          : {}),
      };
    }

    // 5. Fetch Item Rates
    const itemRates = await prisma.itemRates.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        ItemGroupid: true,
        ItemMasterid: true,
        BrandManufacturerid: true,
        ItemConditionid: true,
        ApplicableFromDate: true,
        ApplicableToDate: true,
        Rate: true,
        Unitid: true,
        Comments: true,
        createby: true,
        updateby: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (itemRates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No item rates match the selected IDs and filters.",
        },
        { status: 404 },
      );
    }

    // 6. Fetch display names
    const [
      groups,
      items,
      brands,
      units,
      users,
    ] = await Promise.all([
      prisma.itemGroup.findMany({
        where: {
          id: {
            in: [...new Set(itemRates.map((row) => row.ItemGroupid))],
          },
        },
        select: {
          id: true,
          groupName: true,
        },
      }),

      prisma.itemMaster.findMany({
        where: {
          id: {
            in: [...new Set(itemRates.map((row) => row.ItemMasterid))],
          },
        },
        select: {
          id: true,
          ItemName: true,
        },
      }),

      prisma.brandManufacturer.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                itemRates.map((row) => row.BrandManufacturerid),
              ),
            ],
          },
        },
        select: {
          id: true,
          BrandName: true,
          name: true,
        },
      }),

      prisma.unit.findMany({
        where: {
          id: {
            in: [...new Set(itemRates.map((row) => row.Unitid))],
          },
        },
        select: {
          id: true,
          unitName: true,
          abbreviation: true,
        },
      }),

      prisma.user.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                itemRates
                  .flatMap((row) => [row.createby, row.updateby])
                  .filter(Boolean),
              ),
            ],
          },
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    const groupMap = new Map(
      groups.map((group) => [
        group.id,
        group.groupName ?? "",
      ]),
    );

    const itemMap = new Map(
      items.map((item) => [
        item.id,
        item.ItemName ?? "",
      ]),
    );

    const brandMap = new Map(
      brands.map((brand) => [
        brand.id,
        brand.BrandName ?? brand.name ?? "",
      ]),
    );

    const unitMap = new Map(
      units.map((unit) => [
        unit.id,
        getUnitName(unit),
      ]),
    );

    const userMap = new Map(
      users.map((user) => [
        user.id,
        user.name ?? "",
      ]),
    );

    const reportRows = itemRates.map((row) => ({
      ...row,
      GroupName: groupMap.get(row.ItemGroupid) || "",
      ItemName: itemMap.get(row.ItemMasterid) || "",
      BrandManufacturerName:
        brandMap.get(row.BrandManufacturerid) || "",
      ItemConditionName: row.ItemConditionid || "",
      UnitName: unitMap.get(row.Unitid) || "",
      CreatedByName: userMap.get(row.createby) || "",
      UpdatedByName: userMap.get(row.updateby) || "",
    }));

    // 7. Generate Excel attachment
    let attachments = [];
    let fileName = null;

    if (attachExcel) {
      const rows = reportRows.map((row) => ({
        ID: row.id,
        "Item Group": row.GroupName,
        "Item Name": row.ItemName,
        "Brand / Manufacturer": row.BrandManufacturerName,
        "Item Condition": row.ItemConditionName,
        "Applicable From": formatDateOnly(
          row.ApplicableFromDate,
        ),
        "Applicable To": formatDateOnly(
          row.ApplicableToDate,
        ),
        Rate: row.Rate ?? "",
        Unit: row.UnitName,
        Comments: row.Comments ?? "",
        "Created By": row.CreatedByName,
        "Updated By": row.UpdatedByName,
        "Created Date": formatDate(row.createdAt),
        "Updated Date": formatDate(row.updatedAt),
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 38 },
        { wch: 25 },
        { wch: 30 },
        { wch: 30 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 22 },
        { wch: 40 },
        { wch: 22 },
        { wch: 22 },
        { wch: 24 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Item Rates",
      );

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      fileName = `inventory-item-rates-${new Date()
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

    // 8. Build email content
    const plainMessage = String(message || "").trim();

    const defaultMessage =
      "Please find the Item Rate report for your review.";

    const emailText = [
      plainMessage || defaultMessage,
      "",
      `Total item rates: ${reportRows.length}`,
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
        <h2 style="margin-bottom:16px">Item Rate Report</h2>

        <p>${safeMessage}</p>

        <p>
          <strong>Total item rates:</strong>
          ${reportRows.length}
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

    // 9. Send email
    const result = await sendEmail({
      to: recipientEmails.join(", "),
      subject: String(subject).trim(),
      text: emailText,
      html: emailHtml,
      attachments,
    });

    // 10. Return result
    return NextResponse.json({
      success: true,
      message: result.queued
        ? "Item Rate email report added to the queue."
        : "Item Rate email report sent successfully.",
      status: result.status,
      queued: result.queued,
      sent: result.sent,
      queueId: result.queueId,
      recipients: recipientEmails,
      itemRateCount: reportRows.length,
      attachmentIncluded: attachments.length > 0,
      fileName,
      filters: {
        query,
        createdFrom: filters?.createdFrom || "",
        createdTo: filters?.createdTo || "",
        updatedFrom: filters?.updatedFrom || "",
        updatedTo: filters?.updatedTo || "",
        applicableFromDateFrom:
          filters?.applicableFromDateFrom || "",
        applicableFromDateTo:
          filters?.applicableFromDateTo || "",
        applicableToDateFrom:
          filters?.applicableToDateFrom || "",
        applicableToDateTo:
          filters?.applicableToDateTo || "",
      },
    });
  } catch (error) {
    console.error("[ITEM_RATE_EMAIL_REPORT]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to generate or send the Item Rate report.",
      },
      { status: 500 },
    );
  }
}
