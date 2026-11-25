// app/api/inventory/issue-receipt/route.js

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

const ISSUE_RECEIPT_SORT_FIELDS = [
  "id",
  "ItemGroupid",
  "ItemMasterid",
  "ItemTypeid",
  "TransactionTypeid",
  "IssueDate",
  "PreviousBalance",
  "Qty",
  "Price",
  "Balance",
  "Issue_by",
  "GetPassNo",
  "DateOfRecive",
  "ReciptChallanNo",
  "RecivedBy",
  "ReceiptDate",
  "RequisitionSupplyNo",
  "RequisitionSupplyDate",
  "PurchaseNo",
  "PurchaseDate",
  "DestinationType",
  "DestinationId",
  "Particuler",
  "Comment",
  "createdAt",
  "updatedAt",
];

const getStaffName = (user) => {
  if (!user) return "-";

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.name || user.username || user.email || "-";
};

const getUserName = (user) => {
  if (!user) return "-";

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.name || user.UserName || user.email || "-";
};

const parseIssueReceiptDay = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const buildIssueReceiptDateRange = (from, to) => {
  const start = parseIssueReceiptDay(from);
  const end = parseIssueReceiptDay(to);

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

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (value) => {
  if (value === undefined || value === null || value === "") return "-";

  const number = Number(value);

  return Number.isNaN(number) ? String(value) : number.toFixed(2);
};

const getValue = (value) => {
  if (value === undefined || value === null || value === "") return "-";

  return String(value);
};

const getInventoryItemInfo = async (db, itemMasterId, itemTypeId) => {
  const itemMaster = itemMasterId
    ? await db.itemMaster.findFirst({
      where: { id: String(itemMasterId) },
    })
    : null;

  const itemName =
    itemMaster?.ItemName ||
    itemMaster?.itemName ||
    itemMaster?.name ||
    "-";

  let productType = "-";

  if (itemTypeId && db.ptoductType) {
    const itemType = await db.ptoductType.findFirst({
      where: { id: String(itemTypeId) },
    });

    productType =
      itemType?.ProductType ||
      itemType?.ItemType ||
      itemType?.ItemTypeName ||
      itemType?.TypeName ||
      itemType?.typeName ||
      itemType?.name ||
      "-";
  }

  return { itemName, productType };
};

const getTransactionTypeName = (transaction) => {
  if (!transaction) return "-";

  return (
    transaction.name ||
    transaction.Name ||
    transaction.TransactionType ||
    transaction.TransactionTypeName ||
    transaction.TypeName ||
    "-"
  );
};

const getIpAddress = (request) =>
  request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim() || null;

// =====================================================
// GET: SINGLE RECORD AND LIST
// =====================================================


export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Quantity and price filters
    const quantityMin = searchParams.get("quantityMin");
    const quantityMax = searchParams.get("quantityMax");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");

    // Created By / Updated By filters
    const createdBy = searchParams.get("createdBy");
    const updatedBy = searchParams.get("updatedBy");

    // Dropdown filters
    const issueByIds = searchParams.getAll("issueById");
    const receivedByIds = searchParams.getAll("receivedById");
    const transactionTypeIds = searchParams.getAll("transactionTypeId");
    const groupIds = searchParams.getAll("groupId");
    const itemTypeIds = searchParams.getAll("itemTypeId");
    const itemIds = searchParams.getAll("itemId");

    // -------------------------------------------------
    // SINGLE RECORD
    // -------------------------------------------------

    if (id) {
      const issueReceipt = await prisma.issueReceipt.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!issueReceipt) {
        return NextResponse.json(
          {
            success: false,
            message: "Stock Movement not found",
          },
          { status: 404 },
        );
      }

      const [
        itemGroup,
        itemMaster,
        itemType,
        transactionType,
        issueBy,
        receivedBy,
        createdByUser,
        updatedByUser,
      ] = await Promise.all([
        prisma.itemGroup.findFirst({
          where: { id: issueReceipt.ItemGroupid },
        }),

        prisma.itemMaster.findFirst({
          where: { id: issueReceipt.ItemMasterid },
        }),

        prisma.ptoductType.findFirst({
          where: { id: issueReceipt.ItemTypeid },
        }),

        prisma.transactionType.findFirst({
          where: { id: issueReceipt.TransactionTypeid },
        }),

        prisma.StaffUser.findFirst({
          where: { id: issueReceipt.Issue_by },
        }),

        issueReceipt.RecivedBy
          ? prisma.StaffUser.findFirst({
            where: { id: String(issueReceipt.RecivedBy) },
          })
          : Promise.resolve(null),

        issueReceipt.createby
          ? prisma.user.findFirst({
            where: { id: String(issueReceipt.createby) },
            select: { id: true, name: true },
          })
          : Promise.resolve(null),

        issueReceipt.updateby
          ? prisma.user.findFirst({
            where: { id: String(issueReceipt.updateby) },
            select: { id: true, name: true },
          })
          : Promise.resolve(null),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          ...issueReceipt,

          ItemGroupName: itemGroup?.groupName || itemGroup?.name || "-",

          ItemMasterName:
            itemMaster?.ItemName ||
            itemMaster?.itemName ||
            itemMaster?.name ||
            "-",

          ItemTypeName: itemType?.name || itemType?.ProductType || "-",

          TransactionTypeName:
            transactionType?.name ||
            transactionType?.TransactionType ||
            "-",

          IssueByName: getStaffName(issueBy),
          ReceivedByName: getStaffName(receivedBy),

          CreatedByName: createdByUser?.name || "-",
          UpdatedByName: updatedByUser?.name || "-",
        },
      });
    }

    // -------------------------------------------------
    // LIST PARAMETERS
    // -------------------------------------------------

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10",
      10,
    );

    const limit = Math.min(
      10000,
      Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10),
    );

    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const sortField = ISSUE_RECEIPT_SORT_FIELDS.includes(sort)
      ? sort
      : "createdAt";

    const query = (searchParams.get("query") || "").trim();

    const issueRange = buildIssueReceiptDateRange(
      searchParams.get("issueFrom"),
      searchParams.get("issueTo"),
    );

    const createdRange = buildIssueReceiptDateRange(
      searchParams.get("createdFrom"),
      searchParams.get("createdTo"),
    );

    const updatedRange = buildIssueReceiptDateRange(
      searchParams.get("updatedFrom"),
      searchParams.get("updatedTo"),
    );

    const rangeError =
      issueRange.error || createdRange.error || updatedRange.error;

    if (rangeError) {
      return NextResponse.json(
        { success: false, message: rangeError },
        { status: 400 },
      );
    }

    // -------------------------------------------------
    // RELATED DATA
    // -------------------------------------------------

    const [
      itemGroups,
      itemMasters,
      itemTypes,
      transactionTypes,
      staffUsers,
      users,
    ] = await Promise.all([
      prisma.itemGroup.findMany(),
      prisma.itemMaster.findMany(),
      prisma.ptoductType.findMany(),
      prisma.transactionType.findMany(),
      prisma.StaffUser.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    // -------------------------------------------------
    // LOOKUP MAPS
    // -------------------------------------------------

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
      staffUsers.map((user) => [
        String(user.id),
        getStaffName(user),
      ]),
    );

    const userMap = new Map(
      users.map((user) => [
        String(user.id),
        user.name || "-",
      ]),
    );

    // -------------------------------------------------
    // WHERE CONDITIONS
    // -------------------------------------------------

    const where = {
      deletedAt: null,
    };

    // Quantity filters
    if (quantityMin !== null && quantityMin.trim() !== "") {
      const min = Number(quantityMin);

      if (!Number.isFinite(min)) {
        return NextResponse.json(
          { success: false, message: "Invalid minimum quantity" },
          { status: 400 },
        );
      }

      where.Qty = {
        ...where.Qty,
        gte: min,
      };
    }

    if (quantityMax !== null && quantityMax.trim() !== "") {
      const max = Number(quantityMax);

      if (!Number.isFinite(max)) {
        return NextResponse.json(
          { success: false, message: "Invalid maximum quantity" },
          { status: 400 },
        );
      }

      where.Qty = {
        ...where.Qty,
        lte: max,
      };
    }

    // Price filters
    if (priceMin !== null && priceMin.trim() !== "") {
      const min = Number(priceMin);

      if (!Number.isFinite(min)) {
        return NextResponse.json(
          { success: false, message: "Invalid minimum price" },
          { status: 400 },
        );
      }

      where.Price = {
        ...where.Price,
        gte: min,
      };
    }

    if (priceMax !== null && priceMax.trim() !== "") {
      const max = Number(priceMax);

      if (!Number.isFinite(max)) {
        return NextResponse.json(
          { success: false, message: "Invalid maximum price" },
          { status: 400 },
        );
      }

      where.Price = {
        ...where.Price,
        lte: max,
      };
    }

    // Dropdown filters
    if (issueByIds.length) {
      where.Issue_by = { in: issueByIds };
    }

    if (receivedByIds.length) {
      where.RecivedBy = { in: receivedByIds };
    }

    if (transactionTypeIds.length) {
      where.TransactionTypeid = { in: transactionTypeIds };
    }

    if (groupIds.length) {
      where.ItemGroupid = { in: groupIds };
    }

    if (itemTypeIds.length) {
      where.ItemTypeid = { in: itemTypeIds };
    }

    if (itemIds.length) {
      where.ItemMasterid = { in: itemIds };
    }

    // Created By / Updated By filters
    if (createdBy && createdBy.trim() !== "") {
      where.createby = createdBy.trim();
    }

    if (updatedBy && updatedBy.trim() !== "") {
      where.updateby = updatedBy.trim();
    }

    // Search
    if (query) {
      const needle = query.toLowerCase();

      const idsMatching = (map) =>
        [...map.entries()]
          .filter(([, name]) =>
            String(name).toLowerCase().includes(needle),
          )
          .map(([key]) => key);

      const orConditions = [
        {
          ReciptChallanNo: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          GetPassNo: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          Particuler: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          Comment: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];

      const matchingGroupIds = idsMatching(itemGroupMap);
      const matchingMasterIds = idsMatching(itemMasterMap);
      const matchingTypeIds = idsMatching(itemTypeMap);
      const matchingTransactionIds = idsMatching(transactionTypeMap);
      const matchingStaffIds = idsMatching(staffMap);

      if (matchingGroupIds.length) {
        orConditions.push({
          ItemGroupid: { in: matchingGroupIds },
        });
      }

      if (matchingMasterIds.length) {
        orConditions.push({
          ItemMasterid: { in: matchingMasterIds },
        });
      }

      if (matchingTypeIds.length) {
        orConditions.push({
          ItemTypeid: { in: matchingTypeIds },
        });
      }

      if (matchingTransactionIds.length) {
        orConditions.push({
          TransactionTypeid: { in: matchingTransactionIds },
        });
      }

      if (matchingStaffIds.length) {
        orConditions.push({
          Issue_by: { in: matchingStaffIds },
        });

        orConditions.push({
          RecivedBy: { in: matchingStaffIds },
        });
      }

      where.OR = orConditions;
    }

    // Date filters
    if (issueRange.range) {
      where.IssueDate = issueRange.range;
    }

    if (createdRange.range) {
      where.createdAt = createdRange.range;
    }

    if (updatedRange.range) {
      where.updatedAt = updatedRange.range;
    }

    // -------------------------------------------------
    // FETCH RECORDS
    // -------------------------------------------------

    const [total, issueReceipts] = await Promise.all([
      prisma.issueReceipt.count({
        where,
      }),

      prisma.issueReceipt.findMany({
        where,
        orderBy: [
          { [sortField]: dir },
          { id: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // -------------------------------------------------
    // FORMAT RECORDS
    // -------------------------------------------------

    const formattedIssueReceipts = issueReceipts.map((issueReceipt) => ({
      ...issueReceipt,

      ItemGroupName:
        itemGroupMap.get(String(issueReceipt.ItemGroupid)) || "-",

      ItemMasterName:
        itemMasterMap.get(String(issueReceipt.ItemMasterid)) || "-",

      ItemTypeName:
        itemTypeMap.get(String(issueReceipt.ItemTypeid)) || "-",

      TransactionTypeName:
        transactionTypeMap.get(String(issueReceipt.TransactionTypeid)) || "-",

      IssueByName:
        staffMap.get(String(issueReceipt.Issue_by)) || "-",

      ReceivedByName:
        staffMap.get(String(issueReceipt.RecivedBy)) || "-",

      CreatedByName:
        userMap.get(String(issueReceipt.createby)) || "-",

      UpdatedByName:
        userMap.get(String(issueReceipt.updateby)) || "-",
    }));

    return NextResponse.json({
      success: true,
      data: formattedIssueReceipts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Stock Movement ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed loading Stock Movements",
      },
      { status: 500 },
    );
  }
}
const parseOptionalDate = (value, fieldName) => {
  if (!value || !String(value).trim()) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return date;
};

const parseOptionalString = (value) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  return String(value).trim();
};

const parseNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error("Invalid numeric value.");
  }

  return number;
};
// =====================================================
// POST: CREATE ISSUE / RECEIPT
// =====================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");
    if (accessError) return accessError;

    const body = await request.json();

    // =====================================================
    // 1. MOVEMENT TYPE
    // =====================================================

    const movementType = String(body.MovementType || "")
      .trim()
      .toUpperCase();

    if (!["INWARD", "INTERNAL_TRANSFER"].includes(movementType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid MovementType. Use INWARD or INTERNAL_TRANSFER.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // 2. REQUIRED FIELDS
    // =====================================================

    const requiredFields = [
      "ItemGroupid",
      "ItemMasterid",
      "ItemTypeid",
      "TransactionTypeid",
      "IssueDate",
      "Qty",
      "Issue_by",
    ];

    for (const field of requiredFields) {
      if (
        body[field] === undefined ||
        body[field] === null ||
        String(body[field]).trim() === ""
      ) {
        return NextResponse.json(
          { success: false, message: `${field} is required.` },
          { status: 400 },
        );
      }
    }

    // =====================================================
    // 3. DATE VALIDATION
    // =====================================================

    let issueDate;
    let receiptDate;
    let requisitionSupplyDate;
    let purchaseDate;
    let dateOfReceive;

    try {
      issueDate = parseOptionalDate(body.IssueDate, "Issue Date");
      receiptDate = parseOptionalDate(body.ReceiptDate, "Receipt Date");

      requisitionSupplyDate = parseOptionalDate(
        body.RequisitionSupplyDate,
        "Requisition Supply Date",
      );

      purchaseDate = parseOptionalDate(
        body.PurchaseDate,
        "Purchase Date",
      );

      dateOfReceive = parseOptionalDate(
        body.DateOfRecive,
        "Date Of Receive",
      );
    } catch (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }

    // =====================================================
    // 4. QUANTITY AND PRICE
    // =====================================================

    let qty;
    let price;

    try {
      qty = parseNumber(body.Qty);

      price =
        body.Price === "" ||
          body.Price === null ||
          body.Price === undefined
          ? null
          : parseNumber(body.Price);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }

    if (!Number.isSafeInteger(qty) || qty <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be a positive whole number.",
        },
        { status: 400 },
      );
    }

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid price.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // 5. SOURCE AND DESTINATION
    // =====================================================

    const normalizeLocationType = (value) => {
      const type = String(value || "").trim().toUpperCase();

      if (type === "LOCATION") return "LOCATION";

      if (type === "MACHINE" || type === "MACHINERY") {
        return "MACHINE";
      }

      return null;
    };

    let fromType = null;
    let fromId = null;
    let toType = null;
    let toId = null;

    if (movementType === "INWARD") {
      // Vendor is a logical source only.
      fromType = "VENDOR";
      fromId = null;

      toType = normalizeLocationType(
        body.ToType ||
        body.DestinationType
      );

      toId = parseOptionalString(
        body.ToId ||
        body.DestinationId
      );

      if (!toType || !toId) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a valid destination location or machine.",
          },
          { status: 400 },
        );
      }
    }

    if (movementType === "INTERNAL_TRANSFER") {
      // Accept both frontend and backend field names.
      fromType = normalizeLocationType(
        body.FromType ||
        body.IssueFromType
      );

      fromId = parseOptionalString(
        body.FromId ||
        body.IssueFromId
      );

      toType = normalizeLocationType(
        body.ToType ||
        body.ReceiveToType
      );

      toId = parseOptionalString(
        body.ToId ||
        body.ReceiveToId
      );

      if (!fromType || !fromId) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a valid source location or machine.",
          },
          { status: 400 },
        );
      }

      if (!toType || !toId) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a valid destination location or machine.",
          },
          { status: 400 },
        );
      }

      if (fromType === toType && fromId === toId) {
        return NextResponse.json(
          {
            success: false,
            message: "Source and destination cannot be the same.",
          },
          { status: 400 },
        );
      }
    }

    // =====================================================
    // 6. AUTHENTICATION
    // =====================================================

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const userId = String(user.id);

    // =====================================================
    // 7. ITEM INFORMATION
    // =====================================================

    const itemMasterId = String(body.ItemMasterid);
    const itemTypeId = String(body.ItemTypeid);
    const itemGroupId = String(body.ItemGroupid);

    const { itemName, productType } = await getInventoryItemInfo(
      prisma,
      itemMasterId,
      itemTypeId,
    );

    // =====================================================
    // 8. DATABASE TRANSACTION
    // =====================================================

    const result = await prisma.$transaction(
      async (tx) => {
        // -----------------------------------------------
        // STOCK BALANCE HELPER
        // -----------------------------------------------

        const stockWhere = (locationType, locationId) => ({
          ItemMasterid_ItemTypeid_LocationType_LocationId: {
            ItemMasterid: itemMasterId,
            ItemTypeid: itemTypeId,
            LocationType: locationType,
            LocationId: locationId,
          },
        });

        const getStock = async (locationType, locationId) => {
          return tx.inventoryStockBalance.findUnique({
            where: stockWhere(locationType, locationId),
          });
        };

        // -----------------------------------------------
        // BALANCE VARIABLES
        // -----------------------------------------------

        let sourcePreviousBalance = 0;
        let sourceNewBalance = 0;

        let destinationPreviousBalance = 0;
        let destinationNewBalance = 0;

        // -----------------------------------------------
        // 8A. INTERNAL TRANSFER: DEDUCT SOURCE STOCK
        // -----------------------------------------------

        if (movementType === "INTERNAL_TRANSFER") {
          const sourceStock = await getStock(fromType, fromId);

          sourcePreviousBalance = sourceStock?.Quantity || 0;

          if (sourcePreviousBalance < qty) {
            throw Object.assign(
              new Error(
                `Insufficient source stock. Available: ${sourcePreviousBalance}, Required: ${qty}.`,
              ),
              { status: 400 },
            );
          }

          // Conditional update prevents negative stock.
          const sourceUpdate = await tx.inventoryStockBalance.updateMany({
            where: {
              ItemMasterid: itemMasterId,
              ItemTypeid: itemTypeId,
              LocationType: fromType,
              LocationId: fromId,
              Quantity: {
                gte: qty,
              },
            },
            data: {
              Quantity: {
                decrement: qty,
              },
            },
          });

          if (sourceUpdate.count !== 1) {
            throw Object.assign(
              new Error(
                "Source stock changed or is insufficient. Please refresh and try again.",
              ),
              { status: 400 },
            );
          }

          const updatedSourceStock = await getStock(fromType, fromId);

          sourceNewBalance = updatedSourceStock.Quantity;
        }

        // -----------------------------------------------
        // 8B. GET DESTINATION PREVIOUS BALANCE
        // -----------------------------------------------

        const destinationStock = await getStock(toType, toId);

        destinationPreviousBalance =
          destinationStock?.Quantity || 0;

        destinationNewBalance =
          destinationPreviousBalance + qty;

        // -----------------------------------------------
        // 8C. ADD DESTINATION STOCK
        // -----------------------------------------------

        await tx.inventoryStockBalance.upsert({
          where: stockWhere(toType, toId),

          create: {
            ItemMasterid: itemMasterId,
            ItemTypeid: itemTypeId,
            LocationType: toType,
            LocationId: toId,
            Quantity: qty,
          },

          update: {
            Quantity: {
              increment: qty,
            },
          },
        });

        // -----------------------------------------------
        // 8D. CREATE ISSUE RECEIPT
        // -----------------------------------------------

        const newIssueReceipt = await tx.issueReceipt.create({
          data: {
            ItemGroupid: itemGroupId,
            ItemMasterid: itemMasterId,

            ItemBrandid: parseOptionalString(
              body.BrandManufacturerid || body.ItemBrandid,
            ),

            ItemTypeid: itemTypeId,
            TransactionTypeid: String(body.TransactionTypeid),

            IssueDate: issueDate,

            Qty: qty,

            // Inward: destination balance.
            // Transfer: source balance.
            PreviousBalance:
              movementType === "INWARD"
                ? destinationPreviousBalance
                : sourcePreviousBalance,

            Balance:
              movementType === "INWARD"
                ? destinationNewBalance
                : sourceNewBalance,

            Price: price,
            Particuler: parseOptionalString(body.Particuler),

            Issue_by: String(body.Issue_by),
            RecivedBy: parseOptionalString(body.RecivedBy),

            GetPassNo: parseOptionalString(
              body.GetPassNo || body.GatePassNo,
            ),

            DateOfRecive: dateOfReceive,

            ReciptChallanNo: parseOptionalString(
              body.ReciptChallanNo,
            ),

            ReceiptDate: receiptDate,

            RequisitionSupplyNo: parseOptionalString(
              body.RequisitionSupplyNo,
            ),

            RequisitionSupplyDate: requisitionSupplyDate,

            PurchaseNo: parseOptionalString(body.PurchaseNo),
            PurchaseDate: purchaseDate,

            // Existing destination fields.
            DestinationType:
              toType === "MACHINE"
                ? "machinery"
                : "location",

            DestinationId: toId,

            // New movement fields.
            FromType: fromType,
            FromId: fromId,

            ToType: toType,
            ToId: toId,
            customFields: body.customFields ?? {},
            Comment: parseOptionalString(body.Comment),
            createby: userId,
          },
        });

        // -----------------------------------------------
        // 8E. DESTINATION LEDGER: QTY IN
        // -----------------------------------------------

        await tx.inventoryStockLedger.create({
          data: {
            IssueReceiptId: newIssueReceipt.id,

            ItemGroupid: itemGroupId,
            ItemMasterid: itemMasterId,
            ItemTypeid: itemTypeId,

            LocationType: toType,
            LocationId: toId,

            QtyIn: qty,
            QtyOut: 0,

            PreviousBalance: destinationPreviousBalance,
            Balance: destinationNewBalance,

            Price: price,
            TransactionDate: issueDate,

            Comment: parseOptionalString(body.Comment),
            createby: userId,
          },
        });

        // -----------------------------------------------
        // 8F. SOURCE LEDGER: QTY OUT
        // Only for internal transfers.
        // -----------------------------------------------

        if (movementType === "INTERNAL_TRANSFER") {
          await tx.inventoryStockLedger.create({
            data: {
              IssueReceiptId: newIssueReceipt.id,

              ItemGroupid: itemGroupId,
              ItemMasterid: itemMasterId,
              ItemTypeid: itemTypeId,

              LocationType: fromType,
              LocationId: fromId,

              QtyIn: 0,
              QtyOut: qty,

              PreviousBalance: sourcePreviousBalance,
              Balance: sourceNewBalance,

              Price: price,
              TransactionDate: issueDate,

              Comment: parseOptionalString(body.Comment),
              createby: userId,
            },
          });
        }

        // -----------------------------------------------
        // 8G. STAFF AND TRANSACTION DETAILS
        // -----------------------------------------------

        const [
          productTypeRecord,
          transactionTypeRecord,
          newIssueBy,
          newReceivedBy,
        ] = await Promise.all([
          tx.ptoductType.findFirst({
            where: { id: itemTypeId },
          }),

          tx.transactionType.findFirst({
            where: {
              id: String(body.TransactionTypeid),
            },
          }),

          tx.StaffUser.findFirst({
            where: {
              id: String(body.Issue_by),
            },
          }),

          body.RecivedBy
            ? tx.StaffUser.findFirst({
              where: {
                id: String(body.RecivedBy),
              },
            })
            : Promise.resolve(null),
        ]);

        const productTypeName =
          productTypeRecord?.ProductType ||
          productTypeRecord?.name ||
          body.ProductType ||
          body.ProductTypeName ||
          body.ItemTypeName ||
          "-";

        const transactionTypeName =
          getTransactionTypeName(transactionTypeRecord) ||
          body.TransactionTypeName ||
          "-";

        // -----------------------------------------------
        // 8H. CHANGE LOG
        // -----------------------------------------------

        const details = [
          `Movement Type : ${movementType}`,
          `Item Name : ${getValue(itemName)}`,
          `Item Type : ${getValue(productTypeName)}`,
          `Transaction Type : ${getValue(transactionTypeName)}`,

          `Source Type : ${getValue(fromType)}`,
          `Source ID : ${getValue(fromId)}`,

          `Destination Type : ${getValue(toType)}`,
          `Destination ID : ${getValue(toId)}`,

          `Source Previous Balance : ${sourcePreviousBalance}`,
          `Source New Balance : ${sourceNewBalance}`,

          `Destination Previous Balance : ${destinationPreviousBalance}`,
          `Destination New Balance : ${destinationNewBalance}`,

          `Quantity : ${qty}`,
          `Issue Date : ${formatDate(issueDate)}`,
          `Price : ${formatPrice(price)}`,
          `Particular : ${getValue(body.Particuler)}`,

          `Issued By : ${getStaffName(newIssueBy)}`,

          `Gate Pass No : ${getValue(
            body.GetPassNo || body.GatePassNo,
          )}`,

          `Date Of Receive : ${formatDate(dateOfReceive)}`,
          `Receipt Challan No : ${getValue(body.ReciptChallanNo)}`,
          `Receipt Date : ${formatDate(receiptDate)}`,

          `Received By : ${newReceivedBy
            ? getStaffName(newReceivedBy)
            : "-"
          }`,

          `Requisition Supply No : ${getValue(
            body.RequisitionSupplyNo,
          )}`,

          `Requisition Supply Date : ${formatDate(
            requisitionSupplyDate,
          )}`,

          `Purchase No : ${getValue(body.PurchaseNo)}`,
          `Purchase Date : ${formatDate(purchaseDate)}`,

          `Comment : ${getValue(body.Comment)}`,
        ].join(" | ");

        await tx.inventoryChangeLog.create({
          data: {
            IssueReceiptId: newIssueReceipt.id,
            UserId: userId,
            UserName: getUserName(user),
            Action: "Add",

            ItemMasterid: itemMasterId,
            ItemName: itemName,

            ItemTypeid: itemTypeId,
            ItemType: productType,

            Details: details,
          },
        });

        return {
          ...newIssueReceipt,

          MovementType: movementType,

          StockSummary: {
            Source: {
              LocationType: fromType,
              LocationId: fromId,
              PreviousBalance: sourcePreviousBalance,
              Balance: sourceNewBalance,
              QtyOut:
                movementType === "INTERNAL_TRANSFER" ? qty : 0,
            },

            Destination: {
              LocationType: toType,
              LocationId: toId,
              PreviousBalance: destinationPreviousBalance,
              Balance: destinationNewBalance,
              QtyIn: qty,
            },
          },
        };
      },
      {
        isolationLevel: "Serializable",
      },
    );

    // =====================================================
    // 9. SYSTEM LOG
    // =====================================================

    await systemLog({
      event: "create",
      userId,
      entityId: String(result.id),
      entityType: "inventory.issue-receipt",

      description:
        movementType === "INWARD"
          ? `Inward stock created. Receipt ID: ${result.id}`
          : `Internal stock transfer created. Receipt ID: ${result.id}`,

      ipAddress: getIpAddress(request),
    });

    // =====================================================
    // 10. SUCCESS RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        message:
          movementType === "INWARD"
            ? "Inward stock created successfully."
            : "Internal stock transfer completed successfully.",

        data: result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE Stock Movement ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed creating Stock Movement",
      },
      {
        status: error.status || 500,
      },
    );
  }
}

// =====================================================
// PUT: UPDATE ISSUE / RECEIPT
// =====================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock Movement ID is required",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const existingReceipt = await prisma.issueReceipt.findFirst({
      where: {
        id: String(id),
        deletedAt: null,
      },
    });

    if (!existingReceipt) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock Movement not found",
        },
        { status: 404 },
      );
    }

    // =====================================================
    // VALIDATION HELPERS
    // =====================================================

    const throwValidationError = (message, status = 400) => {
      const error = new Error(message);
      error.status = status;
      throw error;
    };

    const parseOptionalDate = (value, fieldName) => {
      if (!value) return null;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        throwValidationError(`Invalid ${fieldName}`);
      }

      return date;
    };

    const normalizeStockType = (value) => {
      const type = String(value || "")
        .trim()
        .toUpperCase();

      if (["MACHINE", "MACHINERY"].includes(type)) {
        return "MACHINE";
      }

      if (["LOCATION", "VENDOR"].includes(type)) {
        return type;
      }

      return "";
    };

    const getLegacyDestinationType = (type) => {
      if (type === "MACHINE") return "machinery";
      if (type === "LOCATION") return "location";

      return null;
    };

    const movementType = String(
      body.MovementType ||
      (body.FromType || body.IssueFromType
        ? "INTERNAL_TRANSFER"
        : "INWARD"),
    )
      .trim()
      .toUpperCase();

    if (!["INWARD", "INTERNAL_TRANSFER"].includes(movementType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Movement Type",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // REQUIRED FIELD VALIDATION
    // =====================================================

    if (
      !body.ItemGroupid ||
      !body.ItemMasterid ||
      !body.ItemTypeid ||
      !body.TransactionTypeid ||
      !body.IssueDate ||
      !body.Issue_by
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Item Group, Item, Item Condition, Transaction Type, Issue Date and Issue By are required",
        },
        { status: 400 },
      );
    }

    const qty = Number(body.Qty);

    if (
      body.Qty === "" ||
      body.Qty === null ||
      body.Qty === undefined ||
      !Number.isSafeInteger(qty) ||
      qty <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be a valid whole number greater than 0",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // DATE VALIDATION
    // =====================================================

    const issueDate = parseOptionalDate(body.IssueDate, "Issue Date");

    if (!issueDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Issue Date is required",
        },
        { status: 400 },
      );
    }

    const receiptDate = parseOptionalDate(
      body.ReceiptDate,
      "Receipt Date",
    );

    const requisitionSupplyDate = parseOptionalDate(
      body.RequisitionSupplyDate,
      "Requisition Supply Date",
    );

    const purchaseDate = parseOptionalDate(
      body.PurchaseDate,
      "Purchase Order Date",
    );

    const dateOfReceive = parseOptionalDate(
      body.DateOfRecive,
      "Date Of Receive",
    );

    // =====================================================
    // NUMERIC VALIDATION
    // =====================================================

    const price =
      body.Price !== undefined &&
        body.Price !== null &&
        body.Price !== ""
        ? Number(body.Price)
        : null;

    if (
      price !== null &&
      (!Number.isFinite(price) || price < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Rate must be a valid non-negative number",
        },
        { status: 400 },
      );
    }

    if (
      body.Comment &&
      String(body.Comment).length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment cannot exceed 1000 characters",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // SOURCE / DESTINATION VALIDATION
    // =====================================================

    let fromType = "VENDOR";
    let fromId = null;

    let toType = "";
    let toId = "";

    if (movementType === "INWARD") {
      toType = normalizeStockType(
        body.ToType || body.DestinationType,
      );

      toId = String(
        body.ToId || body.DestinationId || "",
      ).trim();

      if (!["LOCATION", "MACHINE"].includes(toType) || !toId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid inward destination (Location or Machine)",
          },
          { status: 400 },
        );
      }
    }

    if (movementType === "INTERNAL_TRANSFER") {
      fromType = normalizeStockType(
        body.FromType || body.IssueFromType,
      );

      fromId = String(
        body.FromId || body.IssueFromId || "",
      ).trim();

      toType = normalizeStockType(
        body.ToType || body.ReceiveToType,
      );

      toId = String(
        body.ToId || body.ReceiveToId || "",
      ).trim();

      if (
        !["LOCATION", "MACHINE"].includes(fromType) ||
        !fromId
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select a valid source location or machine",
          },
          { status: 400 },
        );
      }

      if (
        !["LOCATION", "MACHINE"].includes(toType) ||
        !toId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please select a valid destination location or machine",
          },
          { status: 400 },
        );
      }

      if (fromType === toType && fromId === toId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Source and destination cannot be the same",
          },
          { status: 400 },
        );
      }
    }

    // =====================================================
    // AUTHENTICATED USER
    // =====================================================

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const userId = String(user.id);

    // =====================================================
    // TRANSACTION TYPES
    // =====================================================

    const transactionType = await prisma.transactionType.findFirst({
      where: {
        id: String(body.TransactionTypeid),
        deletedAt: null,
      },
    });

    if (!transactionType) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Transaction Type",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // OLD MOVEMENT DETAILS
    // =====================================================

    const oldItemMasterId = String(
      existingReceipt.ItemMasterid,
    );

    const oldItemTypeId = String(
      existingReceipt.ItemTypeid,
    );

    const oldQty = Number(existingReceipt.Qty || 0);

    const oldFromType = normalizeStockType(
      existingReceipt.FromType,
    );

    const oldMovementType =
      oldFromType && oldFromType !== "VENDOR"
        ? "INTERNAL_TRANSFER"
        : "INWARD";

    const oldToType = normalizeStockType(
      existingReceipt.ToType ||
      existingReceipt.DestinationType,
    );

    const oldToId = String(
      existingReceipt.ToId ||
      existingReceipt.DestinationId ||
      "",
    ).trim();

    const oldFromId = String(
      existingReceipt.FromId || "",
    ).trim();

    if (
      !oldQty ||
      !oldToType ||
      !oldToId ||
      (oldMovementType === "INTERNAL_TRANSFER" &&
        (!oldFromType || !oldFromId))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The existing stock movement has incomplete source or destination information. Please correct the original record before editing it.",
        },
        { status: 400 },
      );
    }

    // =====================================================
    // NEW STOCK DETAILS
    // =====================================================

    const newItemMasterId = String(body.ItemMasterid);
    const newItemTypeId = String(body.ItemTypeid);

    const newFromType =
      movementType === "INWARD" ? "VENDOR" : fromType;

    const newFromId =
      movementType === "INWARD" ? null : fromId;

    // =====================================================
    // TRANSACTION
    // =====================================================

    const updatedReceipt = await prisma.$transaction(
      async (tx) => {
        // -------------------------------------------------
        // STOCK HELPERS
        // -------------------------------------------------

        const getStockBalance = async ({
          ItemMasterid,
          ItemTypeid,
          LocationType,
          LocationId,
        }) => {
          const stock = await tx.inventoryStockBalance.findUnique({
            where: {
              ItemMasterid_ItemTypeid_LocationType_LocationId: {
                ItemMasterid,
                ItemTypeid,
                LocationType,
                LocationId,
              },
            },
            select: {
              Quantity: true,
            },
          });

          return Number(stock?.Quantity || 0);
        };

        const adjustStock = async (
          {
            ItemMasterid,
            ItemTypeid,
            LocationType,
            LocationId,
          },
          quantityChange,
        ) => {
          if (!quantityChange) return;

          const uniqueWhere = {
            ItemMasterid_ItemTypeid_LocationType_LocationId: {
              ItemMasterid,
              ItemTypeid,
              LocationType,
              LocationId,
            },
          };

          if (quantityChange > 0) {
            await tx.inventoryStockBalance.upsert({
              where: uniqueWhere,
              create: {
                ItemMasterid,
                ItemTypeid,
                LocationType,
                LocationId,
                Quantity: quantityChange,
              },
              update: {
                Quantity: {
                  increment: quantityChange,
                },
              },
            });

            return;
          }

          const decreaseBy = Math.abs(quantityChange);

          const result = await tx.inventoryStockBalance.updateMany({
            where: {
              ItemMasterid,
              ItemTypeid,
              LocationType,
              LocationId,
              Quantity: {
                gte: decreaseBy,
              },
            },
            data: {
              Quantity: {
                decrement: decreaseBy,
              },
            },
          });

          if (result.count !== 1) {
            throwValidationError(
              `Insufficient stock at ${LocationType}. Available stock is not enough to reverse or apply this movement.`,
            );
          }
        };

        // -------------------------------------------------
        // STOCK KEYS
        // -------------------------------------------------

        const oldDestinationKey = {
          ItemMasterid: oldItemMasterId,
          ItemTypeid: oldItemTypeId,
          LocationType: oldToType,
          LocationId: oldToId,
        };

        const oldSourceKey =
          oldMovementType === "INTERNAL_TRANSFER"
            ? {
              ItemMasterid: oldItemMasterId,
              ItemTypeid: oldItemTypeId,
              LocationType: oldFromType,
              LocationId: oldFromId,
            }
            : null;

        const newDestinationKey = {
          ItemMasterid: newItemMasterId,
          ItemTypeid: newItemTypeId,
          LocationType: toType,
          LocationId: toId,
        };

        const newSourceKey =
          movementType === "INTERNAL_TRANSFER"
            ? {
              ItemMasterid: newItemMasterId,
              ItemTypeid: newItemTypeId,
              LocationType: fromType,
              LocationId: fromId,
            }
            : null;

        // -------------------------------------------------
        // STEP 1: RESTORE OLD STOCK MOVEMENT
        // -------------------------------------------------

        if (oldMovementType === "INWARD") {
          // Remove the old inward quantity.
          await adjustStock(
            oldDestinationKey,
            -oldQty,
          );
        } else {
          // Restore the original transfer source quantity.
          await adjustStock(
            oldSourceKey,
            oldQty,
          );

          // Remove the original transfer destination quantity.
          await adjustStock(
            oldDestinationKey,
            -oldQty,
          );
        }

        // -------------------------------------------------
        // STEP 2: GET NEW PREVIOUS BALANCES
        // -------------------------------------------------

        let destinationPreviousBalance = 0;
        let sourcePreviousBalance = 0;

        if (movementType === "INWARD") {
          destinationPreviousBalance = await getStockBalance(
            newDestinationKey,
          );
        } else {
          sourcePreviousBalance = await getStockBalance(
            newSourceKey,
          );

          destinationPreviousBalance = await getStockBalance(
            newDestinationKey,
          );

          if (sourcePreviousBalance < qty) {
            throwValidationError(
              `Insufficient stock at source. Available quantity: ${sourcePreviousBalance}, requested quantity: ${qty}`,
            );
          }
        }

        // -------------------------------------------------
        // STEP 3: APPLY NEW STOCK MOVEMENT
        // -------------------------------------------------

        let receiptPreviousBalance = 0;
        let receiptBalance = 0;

        if (movementType === "INWARD") {
          receiptPreviousBalance = destinationPreviousBalance;
          receiptBalance = destinationPreviousBalance + qty;

          await adjustStock(
            newDestinationKey,
            qty,
          );
        } else {
          receiptPreviousBalance = sourcePreviousBalance;
          receiptBalance = sourcePreviousBalance - qty;

          await adjustStock(
            newSourceKey,
            -qty,
          );

          await adjustStock(
            newDestinationKey,
            qty,
          );
        }

        // -------------------------------------------------
        // STEP 4: UPDATE ISSUE RECEIPT
        // -------------------------------------------------

        const updatedData = {
          ItemGroupid: String(body.ItemGroupid),
          ItemMasterid: newItemMasterId,
          ItemBrandid: body.ItemBrandid
            ? String(body.ItemBrandid)
            : null,
          ItemTypeid: newItemTypeId,
          TransactionTypeid: String(body.TransactionTypeid),

          IssueDate: issueDate,
          Qty: qty,

          PreviousBalance: receiptPreviousBalance,
          Balance: receiptBalance,
          Price: price,

          Issue_by: String(body.Issue_by),

          RecivedBy: body.RecivedBy
            ? String(body.RecivedBy)
            : null,

          GetPassNo: body.GetPassNo
            ? String(body.GetPassNo)
            : null,

          DateOfRecive: dateOfReceive,

          ReciptChallanNo: body.ReciptChallanNo
            ? String(body.ReciptChallanNo)
            : null,

          ReceiptDate: receiptDate,

          RequisitionSupplyNo: body.RequisitionSupplyNo
            ? String(body.RequisitionSupplyNo)
            : null,

          RequisitionSupplyDate: requisitionSupplyDate,

          PurchaseNo: body.PurchaseNo
            ? String(body.PurchaseNo)
            : null,

          PurchaseDate: purchaseDate,

          Particuler: body.Particuler
            ? String(body.Particuler)
            : null,

          Comment: body.Comment
            ? String(body.Comment)
            : null,

          FromType: newFromType,
          FromId: newFromId,

          ToType: toType,
          ToId: toId,
          customFields: body.customFields ?? {},
          DestinationType: getLegacyDestinationType(toType),
          DestinationId: toId,

          updateby: userId,
          lastSyncAt: new Date(),
        };

        await tx.issueReceipt.update({
          where: {
            id: String(id),
          },
          data: updatedData,
        });

        // -------------------------------------------------
        // STEP 5: DELETE OLD LEDGER ROWS
        // -------------------------------------------------

        await tx.inventoryStockLedger.deleteMany({
          where: {
            IssueReceiptId: String(id),
          },
        });

        // -------------------------------------------------
        // STEP 6: CREATE NEW LEDGER ROWS
        // -------------------------------------------------

        if (movementType === "INWARD") {
          await tx.inventoryStockLedger.create({
            data: {
              IssueReceiptId: String(id),

              ItemGroupid: String(body.ItemGroupid),
              ItemMasterid: newItemMasterId,
              ItemTypeid: newItemTypeId,

              LocationType: toType,
              LocationId: toId,

              QtyIn: qty,
              QtyOut: 0,

              PreviousBalance: destinationPreviousBalance,
              Balance: destinationPreviousBalance + qty,

              Price: price,
              TransactionDate: issueDate,
              Comment: body.Comment
                ? String(body.Comment)
                : null,

              createby: existingReceipt.createby || userId,
            },
          });
        } else {
          // Source ledger: QtyOut
          await tx.inventoryStockLedger.create({
            data: {
              IssueReceiptId: String(id),

              ItemGroupid: String(body.ItemGroupid),
              ItemMasterid: newItemMasterId,
              ItemTypeid: newItemTypeId,

              LocationType: fromType,
              LocationId: fromId,

              QtyIn: 0,
              QtyOut: qty,

              PreviousBalance: sourcePreviousBalance,
              Balance: sourcePreviousBalance - qty,

              Price: price,
              TransactionDate: issueDate,
              Comment: body.Comment
                ? String(body.Comment)
                : null,

              createby: existingReceipt.createby || userId,
            },
          });

          // Destination ledger: QtyIn
          await tx.inventoryStockLedger.create({
            data: {
              IssueReceiptId: String(id),

              ItemGroupid: String(body.ItemGroupid),
              ItemMasterid: newItemMasterId,
              ItemTypeid: newItemTypeId,

              LocationType: toType,
              LocationId: toId,

              QtyIn: qty,
              QtyOut: 0,

              PreviousBalance: destinationPreviousBalance,
              Balance: destinationPreviousBalance + qty,

              Price: price,
              TransactionDate: issueDate,
              Comment: body.Comment
                ? String(body.Comment)
                : null,

              createby: existingReceipt.createby || userId,
            },
          });
        }

        // -------------------------------------------------
        // STEP 7: RECALCULATE AFFECTED LEDGER STREAMS
        // -------------------------------------------------

        const affectedStockKeys = new Map();

        const addAffectedStockKey = (key) => {
          if (!key) return;

          const keyString = [
            key.ItemMasterid,
            key.ItemTypeid,
            key.LocationType,
            key.LocationId,
          ].join("|");

          affectedStockKeys.set(keyString, key);
        };

        addAffectedStockKey(oldDestinationKey);
        addAffectedStockKey(oldSourceKey);
        addAffectedStockKey(newDestinationKey);
        addAffectedStockKey(newSourceKey);

        for (const stockKey of affectedStockKeys.values()) {
          const ledgerRows = await tx.inventoryStockLedger.findMany({
            where: {
              ItemMasterid: stockKey.ItemMasterid,
              ItemTypeid: stockKey.ItemTypeid,
              LocationType: stockKey.LocationType,
              LocationId: stockKey.LocationId,
            },
            orderBy: [
              { TransactionDate: "asc" },
              { createdAt: "asc" },
              { id: "asc" },
            ],
          });

          if (!ledgerRows.length) continue;

          // InventoryStockBalance is the authoritative current balance.
          const finalStockBalance = await getStockBalance(stockKey);

          // Calculate the opening balance from the current stock
          // and all ledger movements.
          const totalMovement = ledgerRows.reduce(
            (total, row) =>
              total +
              Number(row.QtyIn || 0) -
              Number(row.QtyOut || 0),
            0,
          );

          let runningBalance = finalStockBalance - totalMovement;

          for (const ledger of ledgerRows) {
            const rowPreviousBalance = runningBalance;

            const rowBalance =
              rowPreviousBalance +
              Number(ledger.QtyIn || 0) -
              Number(ledger.QtyOut || 0);

            if (
              Number(ledger.PreviousBalance) !== rowPreviousBalance ||
              Number(ledger.Balance) !== rowBalance
            ) {
              await tx.inventoryStockLedger.update({
                where: {
                  id: ledger.id,
                },
                data: {
                  PreviousBalance: rowPreviousBalance,
                  Balance: rowBalance,
                },
              });
            }

            runningBalance = rowBalance;
          }
        }

        // -------------------------------------------------
        // STEP 8: CHANGE LOG DATA
        // -------------------------------------------------

        const [
          oldItemMaster,
          newItemMaster,
          oldTransactionType,
          newTransactionType,
          oldItemType,
          newItemType,
          oldIssueBy,
          newIssueBy,
          oldReceivedBy,
          newReceivedBy,
        ] = await Promise.all([
          tx.itemMaster.findFirst({
            where: {
              id: oldItemMasterId,
            },
          }),

          tx.itemMaster.findFirst({
            where: {
              id: newItemMasterId,
            },
          }),

          tx.transactionType.findFirst({
            where: {
              id: String(existingReceipt.TransactionTypeid),
            },
          }),

          tx.transactionType.findFirst({
            where: {
              id: String(body.TransactionTypeid),
            },
          }),

          tx.ptoductType.findFirst({
            where: {
              id: oldItemTypeId,
            },
          }),

          tx.ptoductType.findFirst({
            where: {
              id: newItemTypeId,
            },
          }),

          tx.StaffUser.findFirst({
            where: {
              id: String(existingReceipt.Issue_by),
            },
          }),

          tx.StaffUser.findFirst({
            where: {
              id: String(body.Issue_by),
            },
          }),

          existingReceipt.RecivedBy
            ? tx.StaffUser.findFirst({
              where: {
                id: String(existingReceipt.RecivedBy),
              },
            })
            : null,

          body.RecivedBy
            ? tx.StaffUser.findFirst({
              where: {
                id: String(body.RecivedBy),
              },
            })
            : null,
        ]);

        const oldItemName =
          oldItemMaster?.ItemName ||
          oldItemMaster?.itemName ||
          "-";

        const newItemName =
          newItemMaster?.ItemName ||
          newItemMaster?.itemName ||
          "-";

        const oldTransactionName =
          getTransactionTypeName(oldTransactionType);

        const newTransactionName =
          getTransactionTypeName(newTransactionType);

        const oldItemTypeName =
          oldItemType?.ProductType ||
          oldItemType?.name ||
          "-";

        const newItemTypeName =
          newItemType?.ProductType ||
          newItemType?.name ||
          "-";

        const getUserDisplayName = (record) =>
          record?.name ||
          [record?.firstName, record?.lastName]
            .filter(Boolean)
            .join(" ") ||
          record?.username ||
          record?.email ||
          "-";

        const oldIssueByName = getUserDisplayName(oldIssueBy);
        const newIssueByName = getUserDisplayName(newIssueBy);

        const oldReceivedByName =
          getUserDisplayName(oldReceivedBy);

        const newReceivedByName =
          getUserDisplayName(newReceivedBy);

        // -------------------------------------------------
        // STEP 9: BUILD CHANGE DETAILS
        // -------------------------------------------------

        const changes = [];

        const addChange = (label, oldValue, newValue) => {
          const oldText = String(oldValue ?? "-");
          const newText = String(newValue ?? "-");

          if (oldText !== newText) {
            changes.push(
              `${label} : From - ${getValue(oldValue)} To - ${getValue(newValue)}`,
            );
          }
        };

        addChange(
          "Movement Type",
          oldMovementType,
          movementType,
        );

        addChange(
          "Item Name",
          oldItemName,
          newItemName,
        );

        addChange(
          "Item Type",
          oldItemTypeName,
          newItemTypeName,
        );

        addChange(
          "Item Group",
          existingReceipt.ItemGroupid,
          body.ItemGroupid,
        );

        addChange(
          "Item Brand",
          existingReceipt.ItemBrandid,
          body.ItemBrandid,
        );

        addChange(
          "Transaction Type",
          oldTransactionName,
          newTransactionName,
        );

        addChange(
          "Quantity",
          existingReceipt.Qty,
          qty,
        );

        addChange(
          "Previous Balance",
          existingReceipt.PreviousBalance,
          receiptPreviousBalance,
        );

        addChange(
          "Balance",
          existingReceipt.Balance,
          receiptBalance,
        );

        addChange(
          "Rate",
          formatPrice(existingReceipt.Price),
          formatPrice(price),
        );

        addChange(
          "Issue Date",
          formatDate(existingReceipt.IssueDate),
          formatDate(issueDate),
        );

        addChange(
          "Issued By",
          oldIssueByName,
          newIssueByName,
        );

        addChange(
          "Received By",
          oldReceivedByName,
          newReceivedByName,
        );

        addChange(
          "Source Type",
          existingReceipt.FromType,
          newFromType,
        );

        addChange(
          "Source ID",
          existingReceipt.FromId,
          newFromId,
        );

        addChange(
          "Destination Type",
          oldToType,
          toType,
        );

        addChange(
          "Destination ID",
          oldToId,
          toId,
        );

        addChange(
          "Receipt Challan No",
          existingReceipt.ReciptChallanNo,
          body.ReciptChallanNo,
        );

        addChange(
          "Receipt Date",
          formatDate(existingReceipt.ReceiptDate),
          formatDate(receiptDate),
        );

        addChange(
          "Requisition Supply Number",
          existingReceipt.RequisitionSupplyNo,
          body.RequisitionSupplyNo,
        );

        addChange(
          "Requisition Supply Date",
          formatDate(existingReceipt.RequisitionSupplyDate),
          formatDate(requisitionSupplyDate),
        );

        addChange(
          "Purchase Order Number",
          existingReceipt.PurchaseNo,
          body.PurchaseNo,
        );

        addChange(
          "Purchase Order Date",
          formatDate(existingReceipt.PurchaseDate),
          formatDate(purchaseDate),
        );

        addChange(
          "Gate Pass No",
          existingReceipt.GetPassNo,
          body.GetPassNo,
        );

        addChange(
          "Date Of Receive",
          formatDate(existingReceipt.DateOfRecive),
          formatDate(dateOfReceive),
        );

        addChange(
          "Particular",
          existingReceipt.Particuler,
          body.Particuler,
        );

        addChange(
          "Comment",
          existingReceipt.Comment,
          body.Comment,
        );

        // -------------------------------------------------
        // STEP 10: SAVE CHANGE LOG
        // -------------------------------------------------

        if (changes.length > 0) {
          await tx.inventoryChangeLog.create({
            data: {
              IssueReceiptId: String(id),
              UserId: userId,
              UserName: getUserName(user),
              Action: "Edit",
              ItemMasterid: newItemMasterId,
              ItemName: newItemName,
              ItemTypeid: newItemTypeId,
              ItemType: newItemTypeName,
              Details: changes.join(" "),
              updateby: userId,
            },
          });
        }

        // -------------------------------------------------
        // RETURN UPDATED RECORD
        // -------------------------------------------------

        return tx.issueReceipt.findFirst({
          where: {
            id: String(id),
            deletedAt: null,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    // =====================================================
    // SYSTEM LOG
    // =====================================================

    await systemLog({
      event: "update",
      userId,
      entityId: String(updatedReceipt.id),
      entityType: "inventory.issue-receipt",
      description: `Stock Movement updated. Receipt ID: ${updatedReceipt.id}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({
      success: true,
      message: "Stock Movement updated successfully",
      data: updatedReceipt,
    });
  } catch (error) {
    console.error("UPDATE Stock Movement ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed updating Stock Movement",
      },
      {
        status: error.status || 500,
      },
    );
  }
}
// =====================================================
// DELETE: SOFT DELETE ISSUE / RECEIPT
// =====================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const ids = [
      ...new Set(
        [
          ...(Array.isArray(body?.ids) ? body.ids : []),
          ...(body?.id ? [body.id] : []),
          ...(searchParams.get("id") ? [searchParams.get("id")] : []),
        ]
          .filter((value) => value !== null && value !== undefined)
          .map((value) => String(value).trim())
          .filter(Boolean),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock Movement ID is required",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    const deletedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check whether active Stock Movement records exist
      const existingReceipts = await tx.issueReceipt.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!existingReceipts.length) {
        return null;
      }

      const receiptIds = existingReceipts.map((receipt) => receipt.id);

      // 2. Check whether associated Stock Ledger records exist
      const existingLedgerRecords =
        await tx.inventoryStockLedger.findMany({
          where: {
            IssueReceiptId: { in: receiptIds },
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

      let ledgerCount = 0;

      // Soft delete ledger records only if records exist
      if (existingLedgerRecords.length > 0) {
        const ledgerResult = await tx.inventoryStockLedger.updateMany({
          where: {
            id: {
              in: existingLedgerRecords.map((record) => record.id),
            },
            deletedAt: null,
          },
          data: {
            deletedAt,
          },
        });

        ledgerCount = ledgerResult.count;
      }

      // 3. Check whether associated Inventory Change Log records exist
      const existingChangeLogs =
        await tx.inventoryChangeLog.findMany({
          where: {
            IssueReceiptId: { in: receiptIds },
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

      let changeLogCount = 0;

      // Soft delete change logs only if records exist
      if (existingChangeLogs.length > 0) {
        const changeLogResult = await tx.inventoryChangeLog.updateMany({
          where: {
            id: {
              in: existingChangeLogs.map((record) => record.id),
            },
            deletedAt: null,
          },
          data: {
            deletedAt,
          },
        });

        changeLogCount = changeLogResult.count;
      }

      // 4. Soft delete main Stock Movement records
      const receiptResult = await tx.issueReceipt.updateMany({
        where: {
          id: { in: receiptIds },
          deletedAt: null,
        },
        data: {
          deletedAt,
          updateby: user?.id ? String(user.id) : null,
        },
      });

      return {
        existingReceipts,
        receiptCount: receiptResult.count,
        ledgerCount,
        changeLogCount,
      };
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock Movement not found",
        },
        { status: 404 },
      );
    }

    // 5. Create system logs after successful transaction
    for (const receipt of result.existingReceipts) {
      await systemLog({
        event: "delete",
        userId: user?.id ? String(user.id) : null,
        entityId: String(receipt.id),
        entityType: "inventory.issue-receipt",
        description: `Stock Movement deleted. Receipt ID: ${receipt.id}`,
        ipAddress: getIpAddress(request),
      });
    }

    const count = result.receiptCount;

    return NextResponse.json({
      success: true,
      message:
        count === 1
          ? "Stock Movement deleted successfully"
          : `${count} Stock Movements deleted successfully`,
      count,
      deletedRecords: {
        issueReceipts: count,
        stockLedger: result.ledgerCount,
        inventoryChangeLogs: result.changeLogCount,
      },
    });
  } catch (error) {
    console.error("DELETE Stock Movement ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed deleting Stock Movement",
      },
      { status: 500 },
    );
  }
}