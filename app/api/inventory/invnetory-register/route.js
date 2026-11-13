import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
const prisma = new PrismaClient();
const getValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
};
const formatPrice = (value) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return number.toFixed(2);
};
const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// =====================================================
// GET
// =====================================================
// GET /api/inventory/invnetory-register
// GET /api/inventory/invnetory-register?id=UUID
// =====================================================

// =====================================================
// Replace your existing `export async function GET(request) { ... }` in
// app/api/inventory/invnetory-register/route.js with the code below.
//
// Imports stay the same: NextResponse, prisma, checkMenuAccess.
// Everything else in the file (POST, DELETE, ...) is not touched.
// =====================================================

const REGISTER_SORT_FIELDS = [
  "id",
  "GroupName",
  "ItemName",
  "UnitMeasure",
  "Balance",
  "RestockLevel",
  "AddedDate",
  "LastUpdateDate",
  "AddedBy",
  "LastUpdatedBy",
];

const REGISTER_NUMBER_FIELDS = ["Balance", "RestockLevel"];
const REGISTER_DATE_FIELDS = ["AddedDate", "LastUpdateDate"];

// Number or null (handles Prisma Decimal and numeric strings).
const toRegisterNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

// Dates arrive as YYYY-MM-DD and are treated as UTC days.
const parseRegisterDay = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const buildRegisterDateRange = (from, to) => {
  const start = parseRegisterDay(from);
  const end = parseRegisterDay(to);

  if ((from && !start) || (to && !end)) {
    return { error: "Invalid date filter." };
  }

  if (start && end && start > end) {
    return { error: "The From date cannot be after the To date." };
  }

  return {
    range:
      start || end
        ? {
          ...(start ? { gte: start } : {}),
          ...(end
            ? { lt: new Date(end.getTime() + 24 * 60 * 60 * 1000) }
            : {}),
        }
        : undefined,
  };
};

// Repeated params: groupId=1&groupId=2
const getRegisterParamList = (searchParams, name) => [
  ...new Set(
    searchParams
      .getAll(name)
      .map((value) => String(value).trim())
      .filter(Boolean),
  ),
];

const isInRegisterRange = (value, range) => {
  if (!range) return true;
  if (!value) return false;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return false;
  if (range.gte && time < range.gte.getTime()) return false;
  if (range.lt && time >= range.lt.getTime()) return false;

  return true;
};

export async function GET(request) {
  try {
    // =================================================
    // CHECK MENU ACCESS
    // =================================================

    const accessError = await checkMenuAccess("inventory_register");

    if (accessError) {
      return accessError;
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // =================================================
    // GET SINGLE ITEM MASTER
    // =================================================

    if (id) {
      // -------------------------------------------------
      // 1. GET ONE ITEM MASTER
      // -------------------------------------------------

      const itemMaster = await prisma.itemMaster.findFirst({
        where: {
          id,
          deletedAt: null,
          status: true,
        },
      });

      if (!itemMaster) {
        return NextResponse.json(
          {
            success: false,
            message: "Item not found",
          },
          {
            status: 404,
          },
        );
      }

      // -------------------------------------------------
      // 2. GET LATEST Issue/Receipt
      // -------------------------------------------------

      const latestIssueReceipt = await prisma.issueReceipt.findFirst({
        where: {
          ItemMasterid: itemMaster.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // -------------------------------------------------
      // 3. GET RELATED DATA
      // -------------------------------------------------

      const [itemGroup, unit, addedBy, lastUpdatedBy] = await Promise.all([
        // Item Group
        itemMaster.ItemGroupid
          ? prisma.itemGroup.findFirst({
            where: {
              id: itemMaster.ItemGroupid,
              deletedAt: null,
            },
          })
          : null,

        // Unit
        itemMaster.Unitid
          ? prisma.unit.findFirst({
            where: {
              id: itemMaster.Unitid,
              deletedAt: null,
            },
          })
          : null,

        // Added By
        latestIssueReceipt?.Issue_by
          ? prisma.StaffUser.findFirst({
            where: {
              id: latestIssueReceipt.Issue_by,
            },
          })
          : null,

        // Last Updated By
        latestIssueReceipt?.RecivedBy
          ? prisma.StaffUser.findFirst({
            where: {
              id: latestIssueReceipt.RecivedBy,
            },
          })
          : null,
      ]);

      // -------------------------------------------------
      // 4. STAFF NAME HELPER
      // -------------------------------------------------

      const getStaffName = (user) => {
        if (!user) {
          return "-";
        }

        const fullName = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        return fullName || user.name || user.username || user.email || "-";
      };

      // -------------------------------------------------
      // 5. SINGLE INVENTORY RESPONSE
      // -------------------------------------------------

      const data = {
        id: itemMaster.id,

        ItemMaster: itemMaster,

        GroupName: itemGroup?.groupName || itemGroup?.name || "-",

        ItemName: itemMaster.ItemName || "-",

        UnitMeasure: unit?.unitName || unit?.name || unit?.abbreviation || "-",

        Balance: latestIssueReceipt?.Balance ?? 0,

        RestockLevel: toRegisterNumber(itemMaster.RelocateLevel) ?? 0,

        AddedDate: itemMaster.createdAt || null,

        // Fixed: this used `item.updatedAt`, but `item` is not defined here.
        LastUpdateDate:
          latestIssueReceipt?.updatedAt ?? itemMaster.updatedAt ?? null,

        AddedBy: getStaffName(addedBy),

        LastUpdatedBy: getStaffName(lastUpdatedBy),

        latestIssueReceipt: latestIssueReceipt || null,
      };

      return NextResponse.json({
        success: true,
        data,
      });
    }

    // =================================================
    // LIST PARAMETERS
    // =================================================

    const page = Math.max(
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "10", 10) || 10, 1),
      10000,
    );

    const sort = searchParams.get("sort") || "AddedDate";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
    const sortField = REGISTER_SORT_FIELDS.includes(sort) ? sort : "AddedDate";

    const query = (searchParams.get("query") || "").trim().toLowerCase();

    const restockLevel = searchParams.get("restockLevel") || "";

    if (restockLevel && !["lte", "gt"].includes(restockLevel)) {
      return NextResponse.json(
        {
          success: false,
          message: "restockLevel must be lte or gt.",
        },
        {
          status: 400,
        },
      );
    }

    const groupIds = getRegisterParamList(searchParams, "groupId");
    const itemIds = getRegisterParamList(searchParams, "itemId");
    const itemTypeIds = getRegisterParamList(searchParams, "itemTypeId");

    const addedRange = buildRegisterDateRange(
      searchParams.get("addedFrom"),
      searchParams.get("addedTo"),
    );

    const updatedRange = buildRegisterDateRange(
      searchParams.get("updatedFrom"),
      searchParams.get("updatedTo"),
    );

    const rangeError = addedRange.error || updatedRange.error;

    if (rangeError) {
      return NextResponse.json(
        {
          success: false,
          message: rangeError,
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // GET ITEM MASTERS
    // Group, item and added date filters are applied in the database.
    // =================================================

    const itemMasters = await prisma.itemMaster.findMany({
      where: {
        deletedAt: null,

        ...(groupIds.length ? { ItemGroupid: { in: groupIds } } : {}),

        ...(itemIds.length ? { id: { in: itemIds } } : {}),

        ...(addedRange.range ? { createdAt: addedRange.range } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // =================================================
    // GET RELATED DATA
    // =================================================

    const [itemGroups, units, issueReceipts, staffUsers] = await Promise.all([
      // Item Groups
      prisma.itemGroup.findMany({
        where: {
          deletedAt: null,
        },
      }),

      // Units
      prisma.unit.findMany({
        where: {
          deletedAt: null,
        },
      }),

      // Issue/Receipt
      prisma.issueReceipt.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Staff
      prisma.StaffUser.findMany(),
    ]);

    // =================================================
    // LOOKUP MAPS
    // =================================================

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
      staffUsers.map((user) => {
        const fullName = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        return [
          String(user.id),
          fullName || user.name || user.username || user.email || "-",
        ];
      }),
    );

    // =================================================
    // LATEST Issue/Receipt MAP + ITEM TYPES PER ITEM
    //
    // issueReceipts are ordered newest -> oldest, so the first receipt
    // found for each ItemMasterid is the latest one.
    // =================================================

    const latestReceiptMap = new Map();
    const itemTypesByItem = new Map();

    for (const receipt of issueReceipts) {
      if (!receipt.ItemMasterid) {
        continue;
      }

      const itemMasterId = String(receipt.ItemMasterid);

      if (!latestReceiptMap.has(itemMasterId)) {
        latestReceiptMap.set(itemMasterId, receipt);
      }

      if (receipt.ItemTypeid) {
        if (!itemTypesByItem.has(itemMasterId)) {
          itemTypesByItem.set(itemMasterId, new Set());
        }

        itemTypesByItem.get(itemMasterId).add(String(receipt.ItemTypeid));
      }
    }

    // =================================================
    // FORMAT INVENTORY REGISTER
    // =================================================

    let register = itemMasters
      .map((item) => {
        const latestReceipt = latestReceiptMap.get(String(item.id));

        return {
          id: item.id,

          GroupName: itemGroupMap.get(String(item.ItemGroupid)) || "-",

          ItemName: item.ItemName || "-",

          UnitMeasure: unitMap.get(String(item.Unitid)) || "-",

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
      // Exclude records where the latest receipt balance is zero.
      .filter((item) => item.Balance !== 0);

    // =================================================
    // FILTERS APPLIED TO THE CALCULATED VALUES
    // =================================================

    // Item type: an item matches if any of its receipts uses a selected type.
    if (itemTypeIds.length) {
      register = register.filter((row) => {
        const types = itemTypesByItem.get(String(row.id));

        return !!types && itemTypeIds.some((typeId) => types.has(typeId));
      });
    }

    // Restock level: balance <= level, or balance > level.
    if (restockLevel) {
      register = register.filter((row) => {
        const balance = toRegisterNumber(row.Balance) ?? 0;
        const level = toRegisterNumber(row.RestockLevel) ?? 0;

        return restockLevel === "lte" ? balance <= level : balance > level;
      });
    }

    // Last update date
    if (updatedRange.range) {
      register = register.filter((row) =>
        isInRegisterRange(row.LastUpdateDate, updatedRange.range),
      );
    }

    // Search: group, item, unit, added by, last updated by
    if (query) {
      register = register.filter((row) =>
        [
          row.GroupName,
          row.ItemName,
          row.UnitMeasure,
          row.AddedBy,
          row.LastUpdatedBy,
        ].some((value) => String(value ?? "").toLowerCase().includes(query)),
      );
    }

    // =================================================
    // SORT
    // =================================================

    const getSortValue = (row) => {
      if (REGISTER_NUMBER_FIELDS.includes(sortField)) {
        return toRegisterNumber(row[sortField]) ?? Number.NEGATIVE_INFINITY;
      }

      if (REGISTER_DATE_FIELDS.includes(sortField)) {
        return row[sortField] ? new Date(row[sortField]).getTime() || 0 : 0;
      }

      return String(row[sortField] ?? "").toLowerCase();
    };

    register.sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      let result;

      if (typeof aValue === "number") {
        result = aValue === bValue ? 0 : aValue < bValue ? -1 : 1;
      } else {
        result = aValue.localeCompare(bValue);
      }

      // Stable order for equal values, so pages never repeat or skip rows.
      if (result === 0) {
        result = String(a.id).localeCompare(String(b.id));
      }

      return dir === "asc" ? result : -result;
    });

    // =================================================
    // PAGINATE
    // =================================================

    const total = register.length;
    const pageRows = register.slice((page - 1) * limit, page * limit);

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,
      data: pageRows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET INVENTORY REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed loading Inventory Register",
      },
      {
        status: 500,
      },
    );
  }
}

// =====================================================
// POST
// =====================================================
// POST /api/inventory/inventory-register
// =====================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("inventory_register");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    // =================================================
    // VALIDATION
    // =================================================

    if (!body.ItemGroupid) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Group is required",
        },
        { status: 400 },
      );
    }

    if (!body.ItemMasterid) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Master is required",
        },
        { status: 400 },
      );
    }

    if (!body.ItemTypeid) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Type is required",
        },
        { status: 400 },
      );
    }

    if (!body.TransactionTypeid) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction Type is required",
        },
        { status: 400 },
      );
    }

    if (!body.IssueDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Issue Date is required",
        },
        { status: 400 },
      );
    }

    const qty = Number(body.Qty);

    if (!body.Qty || Number.isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be greater than 0",
        },
        { status: 400 },
      );
    }

    if (!body.Issue_by) {
      return NextResponse.json(
        {
          success: false,
          message: "Issue By is required",
        },
        { status: 400 },
      );
    }

    if (!body.RecivedBy) {
      return NextResponse.json(
        {
          success: false,
          message: "Received By is required",
        },
        { status: 400 },
      );
    }

    // =================================================
    // NUMERIC VALUES
    // =================================================

    const previousBalance =
      body.PreviousBalance !== undefined &&
        body.PreviousBalance !== null &&
        body.PreviousBalance !== ""
        ? Number(body.PreviousBalance)
        : 0;

    const price =
      body.Price !== undefined && body.Price !== null && body.Price !== ""
        ? Number(body.Price)
        : null;

    const balance =
      body.Balance !== undefined && body.Balance !== null && body.Balance !== ""
        ? Number(body.Balance)
        : 0;

    // =================================================
    // CREATE
    // =================================================

    const result = await prisma.$transaction(async (tx) => {
      const issueReceipt = await tx.issueReceipt.create({
        data: {
          ItemGroupid: String(body.ItemGroupid),

          ItemMasterid: String(body.ItemMasterid),

          ItemTypeid: String(body.ItemTypeid),

          TransactionTypeid: String(body.TransactionTypeid),

          IssueDate: new Date(body.IssueDate),

          Qty: qty,

          PreviousBalance: previousBalance,

          Price: price,

          Particuler: body.Particuler ? String(body.Particuler) : null,

          Balance: balance,

          Issue_by: String(body.Issue_by),

          GetPassNo: body.GetPassNo ? String(body.GetPassNo) : null,

          DateOfRecive: body.DateOfRecive ? new Date(body.DateOfRecive) : null,

          ReciptChallanNo: body.ReciptChallanNo
            ? String(body.ReciptChallanNo)
            : null,

          RecivedBy: String(body.RecivedBy),

          Comment: body.Comment ? String(body.Comment) : null,
        },
      });

      // =================================================
      // CREATE ADD LOG
      // =================================================

      const getValue = (value) =>
        value !== undefined && value !== null && String(value).trim() !== ''
          ? String(value)
          : '-';

      const getUserDisplayName = (user) =>
        user?.name ||
        user?.username ||
        user?.email ||
        '-';

      // Resolve related records using the IDs submitted by the form.

      const [
        productTypeRecord,
        transactionTypeRecord,
        newIssueBy,
        newReceivedBy,
      ] = await Promise.all([
        body.ItemTypeid
          ? prisma.ptoductType.findUnique({
            where: { id: String(body.ItemTypeid) },
            select: { ProductType: true },
          })
          : Promise.resolve(null),

        body.TransactionTypeid
          ? prisma.transactionType.findUnique({
            where: { id: String(body.TransactionTypeid) },
            select: {
              TransactionType: true,
              EffectOnTransaction: true,
            },
          })
          : Promise.resolve(null),

        body.Issue_by
          ? tx.StaffUser.findFirst({
            where: { id: String(body.Issue_by) },
          })
          : Promise.resolve(null),

        body.RecivedBy
          ? tx.StaffUser.findFirst({
            where: { id: String(body.RecivedBy) },
          })
          : Promise.resolve(null),
      ]);

      const productTypeName =
        productTypeRecord?.ProductType ||
        body.ProductType ||
        body.ProductTypeName ||
        body.ItemTypeName ||
        '-';

      const transactionTypeName =
        transactionTypeRecord?.TransactionType ||
        body.TransactionTypeName ||
        body.TransactionType ||
        '-';

      const ReceivedByName = newReceivedBy
        ? getStaffName(newReceivedBy)
        : '-';

      const IssueByName = newIssueBy
        ? getStaffName(newIssueBy)
        : '-';


      const details = [
        `ItemName : ${getValue(itemName)}`,
        `Item Type : ${getValue(productTypeName)}`,
        `Transaction Type : ${getValue(transactionTypeName)}`,
        `Previous Balance : ${previousBalance}`,
        `Quantity : ${qty}`,
        `Balance : ${balance}`,
        `Date : ${formatDate(body.IssueDate)}`,
        `Price : ${formatPrice(body.Price)}`, 
        `Particular : ${getValue(body.Particuler)}`,
        `Issued By : ${IssueByName}`,
        `GatePassNo : ${getValue(body.GetPassNo)}`,
        `Date Of Receive : ${formatDate(body.DateOfRecive)}`,
        `Receipt Challan No : ${getValue(body.ReciptChallanNo)}`,
        `Received By : ${ReceivedByName}`,
        `Comment : ${getValue(body.Comment)}`,
      ].join(' ');

      await tx.inventoryChangeLog.create({
        data: {
          IssueReceiptId: issueReceipt.id,

          UserId: body.UserId ? String(body.UserId) : null,

          UserName: body.UserName ? String(body.UserName) : null,

          Action: "Add",

          ItemMasterid: String(body.ItemMasterid),

          ItemName: itemName,

          ItemTypeid: String(body.ItemTypeid),

          ItemType: productType,

          Details: details,
        },
      });

      return issueReceipt;
    });
    // SYSTEM LOG: CREATE Issue/Receipt
    await systemLog({
      event: "create",
      userId: body.UserId ? String(body.UserId) : null,
      entityId: String(result.id),
      entityType: "inventory.issue-receipt",
      description: `Issue/Receipt created. Receipt ID: ${result.id}`,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Issue/Receipt created successfully",
        data: issueReceipt,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("CREATE Issue/Receipt ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed creating Issue/Receipt",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request) {
  try {
    // // 1. CHECK MENU ACCESS
    // const accessError = await checkMenuAccess("inventory_register");

    // if (accessError) {
    //   return accessError;
    // }

    // // 2. CHECK AUTHENTICATION
    // const user = await getAuthenticatedUser();

    // if (!user) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       message: "Unauthorized. Please sign in again.",
    //     },
    //     { status: 401 },
    //   );
    // }

    // 3. READ REQUEST BODY
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide an array of item IDs.",
        },
        { status: 400 },
      );
    }

    const itemIds = [
      ...new Set(
        ids
          .filter(
            (id) =>
              typeof id === "string" &&
              id.trim().length > 0,
          )
          .map((id) => id.trim()),
      ),
    ];

    if (itemIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid item IDs provided.",
        },
        { status: 400 },
      );
    }

    // 4. GET EXISTING ITEMS
    const items = await prisma.itemMaster.findMany({
      where: {
        id: { in: itemIds },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No active inventory items found.",
        },
        { status: 404 },
      );
    }

    const existingIds = items.map((item) => item.id);
    const deletedAt = new Date();

    // 5. SOFT-DELETE ALL RELATED RECORDS
    const result = await prisma.$transaction(async (tx) => {
      // Update Issue/Receipt entries.
      const issueReceiptResult =
        await tx.issueReceipt.updateMany({
          where: {
            ItemMasterid: { in: existingIds },
            deletedAt: null,
          },
          data: {
            deletedAt,
            updatedAt: deletedAt,
          },
        });

      // Update Inventory Change Log entries.
      const changeLogResult =
        await tx.inventoryChangeLog.updateMany({
          where: {
            ItemMasterid: { in: existingIds },
            deletedAt: null,
          },
          data: {
            deletedAt,
            updatedAt: deletedAt,
          },
        });

      // Update the Inventory Register / Item Master entries.
      // const itemResult = await tx.itemMaster.updateMany({
      //   where: {
      //     id: { in: existingIds },
      //     deletedAt: null,
      //   },
      //   data: {
      //     deletedAt,
      //     updatedAt: deletedAt,
      //   },
      // });

      return {
        deletedIssueReceipts: issueReceiptResult.count,
        deletedChangeLogs: changeLogResult.count,
      };
    });

    // 6. RETURN RESPONSE
    return NextResponse.json({
      success: true,
      message: "Inventory items deleted successfully.",
      deletedAt,
      ...result,
    });
  } catch (error) {
    console.error("DELETE INVENTORY REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete inventory register items.",
      },
      { status: 500 },
    );
  }
}
