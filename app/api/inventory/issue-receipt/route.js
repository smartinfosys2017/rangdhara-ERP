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

    let qty;
    let previousBalance;
    let balance;
    let price;

    try {
      qty = parseNumber(body.Qty);
      previousBalance = parseNumber(body.PreviousBalance);
      balance = parseNumber(body.Balance);

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

    if (qty <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be greater than zero.",
        },
        { status: 400 },
      );
    }

    const destinationType = parseOptionalString(body.DestinationType);
    const destinationId = parseOptionalString(body.DestinationId);

    if (
      destinationType &&
      !["location", "machinery"].includes(destinationType.toLowerCase())
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid destination type." },
        { status: 400 },
      );
    }

    if (destinationType && !destinationId) {
      return NextResponse.json(
        { success: false, message: "Please select a destination." },
        { status: 400 },
      );
    }

    if (!destinationType && destinationId) {
      return NextResponse.json(
        { success: false, message: "Destination type is required." },
        { status: 400 },
      );
    }

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

    const { itemName, productType } = await getInventoryItemInfo(
      prisma,
      body.ItemMasterid,
      body.ItemTypeid,
    );

    const result = await prisma.$transaction(async (tx) => {
      const newIssueReceipt = await tx.issueReceipt.create({
        data: {
          ItemGroupid: String(body.ItemGroupid),
          ItemMasterid: String(body.ItemMasterid),
          ItemTypeid: String(body.ItemTypeid),
          TransactionTypeid: String(body.TransactionTypeid),

          IssueDate: issueDate,
          Qty: qty,
          PreviousBalance: previousBalance,
          Balance: balance,
          Price: price,
          Particuler: parseOptionalString(body.Particuler),

          Issue_by: String(body.Issue_by),
          RecivedBy: parseOptionalString(body.RecivedBy),

          GetPassNo: parseOptionalString(
            body.GetPassNo || body.GatePassNo,
          ),
          DateOfRecive: dateOfReceive,

          ReciptChallanNo: parseOptionalString(body.ReciptChallanNo),
          ReceiptDate: receiptDate,

          RequisitionSupplyNo: parseOptionalString(
            body.RequisitionSupplyNo,
          ),
          RequisitionSupplyDate: requisitionSupplyDate,

          PurchaseNo: parseOptionalString(body.PurchaseNo),
          PurchaseDate: purchaseDate,

          DestinationType: destinationType
            ? destinationType.toLowerCase()
            : null,
          DestinationId: destinationId,

          Comment: parseOptionalString(body.Comment),
          createby: userId,
        },
      });

      const [
        productTypeRecord,
        transactionTypeRecord,
        newIssueBy,
        newReceivedBy,
      ] = await Promise.all([
        tx.ptoductType.findFirst({
          where: { id: String(body.ItemTypeid) },
        }),

        tx.transactionType.findFirst({
          where: { id: String(body.TransactionTypeid) },
        }),

        tx.StaffUser.findFirst({
          where: { id: String(body.Issue_by) },
        }),

        body.RecivedBy
          ? tx.StaffUser.findFirst({
            where: { id: String(body.RecivedBy) },
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

      const details = [
        `ItemName : ${getValue(itemName)}`,
        `Item Type : ${getValue(productTypeName)}`,
        `Transaction Type : ${getValue(transactionTypeName)}`,
        `Previous Balance : ${previousBalance}`,
        `Quantity : ${qty}`,
        `Balance : ${balance}`,
        `Issue Date : ${formatDate(issueDate)}`,
        `Price : ${formatPrice(price)}`,
        `Particular : ${getValue(body.Particuler)}`,
        `Issued By : ${getStaffName(newIssueBy)}`,
        `Gate Pass No : ${getValue(body.GetPassNo || body.GatePassNo)}`,
        `Date Of Receive : ${formatDate(dateOfReceive)}`,
        `Receipt Challan No : ${getValue(body.ReciptChallanNo)}`,
        `Receipt Date : ${formatDate(receiptDate)}`,
        `Received By : ${newReceivedBy ? getStaffName(newReceivedBy) : "-"}`,
        `Requisition Supply No : ${getValue(body.RequisitionSupplyNo)}`,
        `Requisition Supply Date : ${formatDate(requisitionSupplyDate)}`,
        `Purchase No : ${getValue(body.PurchaseNo)}`,
        `Purchase Date : ${formatDate(purchaseDate)}`,
        `Destination Type : ${getValue(destinationType)}`,
        `Destination ID : ${getValue(destinationId)}`,
        `Comment : ${getValue(body.Comment)}`,
      ].join(" ");

      await tx.inventoryChangeLog.create({
        data: {
          IssueReceiptId: newIssueReceipt.id,
          UserId: userId,
          UserName: getUserName(user),
          Action: "Add",
          ItemMasterid: String(body.ItemMasterid),
          ItemName: itemName,
          ItemTypeid: String(body.ItemTypeid),
          ItemType: productType,
          Details: details,
        },
      });

      return newIssueReceipt;
    });

    await systemLog({
      event: "create",
      userId,
      entityId: String(result.id),
      entityType: "inventory.issue-receipt",
      description: `Stock Movement created. Receipt ID: ${result.id}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stock Movement created successfully",
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
      { status: 500 },
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
        { success: false, message: "Stock Movement ID is required" },
        { status: 400 }
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
        { success: false, message: "Stock Movement not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // --------------------------------------------------

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
        { status: 400 }
      );
    }

    const qty = Number(body.Qty);

    if (
      body.Qty === "" ||
      body.Qty === null ||
      body.Qty === undefined ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isInteger(qty)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be a valid whole number greater than 0",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // DATE VALIDATION
    // --------------------------------------------------

    const parseOptionalDate = (value, fieldName) => {
      if (!value) return null;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName}`);
      }

      return date;
    };

    const issueDate = parseOptionalDate(body.IssueDate, "Issue Date");

    if (!issueDate) {
      return NextResponse.json(
        { success: false, message: "Issue Date is required" },
        { status: 400 }
      );
    }

    const receiptDate = parseOptionalDate(
      body.ReceiptDate,
      "Receipt Date"
    );

    const requisitionSupplyDate = parseOptionalDate(
      body.RequisitionSupplyDate,
      "Requisition Supply Date"
    );

    const purchaseDate = parseOptionalDate(
      body.PurchaseDate,
      "Purchase Order Date"
    );

    const dateOfReceive = parseOptionalDate(
      body.DateOfRecive,
      "Date Of Receive"
    );

    // --------------------------------------------------
    // NUMERIC VALIDATION
    // --------------------------------------------------

    const previousBalance =
      body.PreviousBalance !== undefined &&
        body.PreviousBalance !== null &&
        body.PreviousBalance !== ""
        ? Number(body.PreviousBalance)
        : 0;

    const price =
      body.Price !== undefined &&
        body.Price !== null &&
        body.Price !== ""
        ? Number(body.Price)
        : null;

    if (
      !Number.isFinite(previousBalance) ||
      (price !== null && (!Number.isFinite(price) || price < 0))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Previous Balance or Rate",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // DESTINATION VALIDATION
    // --------------------------------------------------

    if (
      !body.DestinationType ||
      !["location", "machinery"].includes(
        String(body.DestinationType).toLowerCase()
      ) ||
      !body.DestinationId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select Location or Machinery and its destination",
        },
        { status: 400 }
      );
    }

    if (body.Comment && String(body.Comment).length > 1000) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment cannot exceed 1000 characters",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // AUTHENTICATED USER
    // --------------------------------------------------

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const userId = String(user.id);

    // --------------------------------------------------
    // TRANSACTION TYPES
    // --------------------------------------------------

    const transactionTypes = await prisma.transactionType.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        EffectOnTransaction: true,
      },
    });

    const getTransactionEffect = (transactionTypeId) => {
      const transaction = transactionTypes.find(
        (item) => String(item.id) === String(transactionTypeId)
      );

      return String(transaction?.EffectOnTransaction ?? "")
        .trim()
        .toLowerCase();
    };

    const calculateBalance = (
      previous,
      quantity,
      transactionTypeId
    ) => {
      const pb = Number(previous ?? 0);
      const quantityValue = Number(quantity ?? 0);
      const effect = getTransactionEffect(transactionTypeId);

      if (["addition", "add", "additions"].includes(effect)) {
        return pb + quantityValue;
      }

      if (
        [
          "deduction",
          "deductions",
          "deduct",
          "subtract",
          "subtraction",
        ].includes(effect)
      ) {
        return pb - quantityValue;
      }

      return pb;
    };

    const currentEffect = getTransactionEffect(
      body.TransactionTypeid
    );

    if (!currentEffect) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Transaction Type or transaction effect is not configured",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      const oldItemMasterId = String(existingReceipt.ItemMasterid);
      const newItemMasterId = String(body.ItemMasterid);

      // --------------------------------------------------
      // UPDATE ISSUE / RECEIPT
      // --------------------------------------------------

      await tx.issueReceipt.update({
        where: {
          id: String(id),
        },
        data: {
          ItemGroupid: String(body.ItemGroupid),
          ItemMasterid: newItemMasterId,
          ItemTypeid: String(body.ItemTypeid),
          TransactionTypeid: String(body.TransactionTypeid),

          IssueDate: issueDate,
          Qty: qty,

          PreviousBalance: previousBalance,
          Price: price,

          Balance: calculateBalance(
            previousBalance,
            qty,
            body.TransactionTypeid
          ),

          Issue_by: String(body.Issue_by),

          // Received By is optional
          RecivedBy: body.RecivedBy
            ? String(body.RecivedBy)
            : null,

          // Receipt details
          ReciptChallanNo: body.ReciptChallanNo
            ? String(body.ReciptChallanNo)
            : null,

          ReceiptDate: receiptDate,

          // Requisition details
          RequisitionSupplyNo: body.RequisitionSupplyNo
            ? String(body.RequisitionSupplyNo)
            : null,

          RequisitionSupplyDate: requisitionSupplyDate,

          // Purchase order details
          PurchaseNo: body.PurchaseNo
            ? String(body.PurchaseNo)
            : null,

          PurchaseDate: purchaseDate,

          // Existing optional fields
          GetPassNo: body.GetPassNo
            ? String(body.GetPassNo)
            : null,

          DateOfRecive: dateOfReceive,

          Particuler: body.Particuler
            ? String(body.Particuler)
            : null,

          Comment: body.Comment
            ? String(body.Comment)
            : null,

          // Destination
          DestinationType: String(body.DestinationType).toLowerCase(),
          DestinationId: String(body.DestinationId),

          // Updated By
          updateby: userId,
        },
      });

      // --------------------------------------------------
      // RECALCULATE ITEM BALANCES
      // Handles both old and new items if item is changed.
      // --------------------------------------------------

      const affectedItemIds = [
        ...new Set([oldItemMasterId, newItemMasterId]),
      ];

      for (const itemMasterId of affectedItemIds) {
        const receipts = await tx.issueReceipt.findMany({
          where: {
            ItemMasterid: itemMasterId,
            deletedAt: null,
          },
          orderBy: [
            { IssueDate: "asc" },
            { createdAt: "asc" },
            { id: "asc" },
          ],
        });

        if (!receipts.length) continue;

        let runningBalance = Number(
          receipts[0].PreviousBalance ?? 0
        );

        for (let index = 0; index < receipts.length; index++) {
          const receipt = receipts[index];
          const isEdited = String(receipt.id) === String(id);

          const rowQty = Number(receipt.Qty ?? 0);

          const rowTransactionTypeId = receipt.TransactionTypeid;

          // First record keeps its opening previous balance.
          // All later records use the previous transaction balance.
          const rowPreviousBalance =
            index === 0
              ? Number(receipt.PreviousBalance ?? 0)
              : runningBalance;

          const rowBalance = calculateBalance(
            rowPreviousBalance,
            rowQty,
            rowTransactionTypeId
          );

          const needsUpdate =
            Number(receipt.PreviousBalance ?? 0) !==
            rowPreviousBalance ||
            Number(receipt.Balance ?? 0) !== rowBalance;

          if (needsUpdate) {
            await tx.issueReceipt.update({
              where: {
                id: receipt.id,
              },
              data: {
                PreviousBalance: rowPreviousBalance,
                Balance: rowBalance,
                ...(isEdited ? { updateby: userId } : {}),
              },
            });
          }

          runningBalance = rowBalance;
        }
      }

      // --------------------------------------------------
      // CHANGE LOG DATA
      // --------------------------------------------------

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
          where: { id: oldItemMasterId },
        }),

        tx.itemMaster.findFirst({
          where: { id: newItemMasterId },
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
            id: String(existingReceipt.ItemTypeid),
          },
        }),

        tx.ptoductType.findFirst({
          where: {
            id: String(body.ItemTypeid),
          },
        }),

        tx.user.findFirst({
          where: {
            id: String(existingReceipt.Issue_by),
          },
        }),

        tx.user.findFirst({
          where: {
            id: String(body.Issue_by),
          },
        }),

        existingReceipt.RecivedBy
          ? tx.user.findFirst({
            where: {
              id: String(existingReceipt.RecivedBy),
            },
          })
          : null,

        body.RecivedBy
          ? tx.user.findFirst({
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

      const oldReceivedByName = getUserDisplayName(oldReceivedBy);
      const newReceivedByName = getUserDisplayName(newReceivedBy);

      const changes = [];

      const addChange = (label, oldValue, newValue) => {
        const oldText = String(oldValue ?? "-");
        const newText = String(newValue ?? "-");

        if (oldText !== newText) {
          changes.push(
            `${label} : From - ${getValue(oldValue)} To - ${getValue(newValue)}`
          );
        }
      };

      // Basic details
      addChange("Item Name", oldItemName, newItemName);
      addChange("Item Type", oldItemTypeName, newItemTypeName);

      addChange(
        "Item Group",
        existingReceipt.ItemGroupid,
        body.ItemGroupid
      );

      addChange(
        "Transaction Type",
        oldTransactionName,
        newTransactionName
      );

      // Stock details
      addChange(
        "Previous Balance",
        existingReceipt.PreviousBalance,
        previousBalance
      );

      addChange("Quantity", existingReceipt.Qty, qty);

      addChange(
        "Balance",
        existingReceipt.Balance,
        calculateBalance(
          previousBalance,
          qty,
          body.TransactionTypeid
        )
      );

      addChange(
        "Rate",
        formatPrice(existingReceipt.Price),
        formatPrice(price)
      );

      // Date details
      addChange(
        "Issue Date",
        formatDate(existingReceipt.IssueDate),
        formatDate(issueDate)
      );

      addChange(
        "Receipt Date",
        formatDate(existingReceipt.ReceiptDate),
        formatDate(receiptDate)
      );

      addChange(
        "Requisition Supply Date",
        formatDate(existingReceipt.RequisitionSupplyDate),
        formatDate(requisitionSupplyDate)
      );

      addChange(
        "Purchase Order Date",
        formatDate(existingReceipt.PurchaseDate),
        formatDate(purchaseDate)
      );

      addChange(
        "Date Of Receive",
        formatDate(existingReceipt.DateOfRecive),
        formatDate(dateOfReceive)
      );

      // User details
      addChange("Issued By", oldIssueByName, newIssueByName);

      addChange(
        "Received By",
        oldReceivedByName,
        newReceivedByName
      );

      // Document details
      addChange(
        "Receipt Challan No",
        existingReceipt.ReciptChallanNo,
        body.ReciptChallanNo
      );

      addChange(
        "Requisition Supply Number",
        existingReceipt.RequisitionSupplyNo,
        body.RequisitionSupplyNo
      );

      addChange(
        "Purchase Order Number",
        existingReceipt.PurchaseNo,
        body.PurchaseNo
      );

      addChange(
        "Gate Pass No",
        existingReceipt.GetPassNo,
        body.GetPassNo
      );

      // Destination details
      addChange(
        "Destination Type",
        existingReceipt.DestinationType,
        body.DestinationType
      );

      addChange(
        "Destination ID",
        existingReceipt.DestinationId,
        body.DestinationId
      );

      // Other details
      addChange(
        "Particular",
        existingReceipt.Particuler,
        body.Particuler
      );

      addChange(
        "Comment",
        existingReceipt.Comment,
        body.Comment
      );

      // --------------------------------------------------
      // SAVE CHANGE LOG
      // --------------------------------------------------

      if (changes.length > 0) {
        await tx.inventoryChangeLog.create({
          data: {
            IssueReceiptId: String(id),
            UserId: userId,
            UserName: getUserName(user),
            Action: "Edit",
            ItemMasterid: newItemMasterId,
            ItemName: newItemName,
            ItemTypeid: String(body.ItemTypeid),
            ItemType: newItemTypeName,
            Details: changes.join(" "),
          },
        });
      }

      return tx.issueReceipt.findFirst({
        where: {
          id: String(id),
          deletedAt: null,
        },
      });
    });

    // --------------------------------------------------
    // SYSTEM LOG
    // --------------------------------------------------

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
        message: error.message || "Failed updating Stock Movement",
      },
      { status: 500 }
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
        { success: false, message: "Stock Movement ID is required" },
        { status: 400 },
      );
    }

    const existingReceipts = await prisma.issueReceipt.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingReceipts.length) {
      return NextResponse.json(
        { success: false, message: "Stock Movement not found" },
        { status: 404 },
      );
    }

    const user = await getAuthenticatedUser();

    const deleteResult = await prisma.issueReceipt.updateMany({
      where: {
        id: {
          in: existingReceipts.map((receipt) => receipt.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    for (const receipt of existingReceipts) {
      await systemLog({
        event: "delete",
        userId: user?.id ? String(user.id) : null,
        entityId: String(receipt.id),
        entityType: "inventory.issue-receipt",
        description: `Stock Movement deleted. Receipt ID: ${receipt.id}`,
        ipAddress: getIpAddress(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Stock Movement deleted successfully"
          : `${deleteResult.count} Stock Movements deleted successfully`,
      count: deleteResult.count,
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