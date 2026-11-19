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
            message: "Issue/Receipt not found",
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

        prisma.StaffUser.findFirst({
          where: { id: issueReceipt.RecivedBy },
        }),

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
    console.error("GET Issue/Receipt ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed loading Issue/Receipts",
      },
      { status: 500 },
    );
  }
}

// =====================================================
// POST: CREATE ISSUE / RECEIPT
// =====================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.ItemGroupid) {
      return NextResponse.json(
        { success: false, message: "Item Group is required" },
        { status: 400 },
      );
    }

    if (!body.ItemMasterid) {
      return NextResponse.json(
        { success: false, message: "Item is required" },
        { status: 400 },
      );
    }

    if (!body.ItemTypeid) {
      return NextResponse.json(
        { success: false, message: "Item Type is required" },
        { status: 400 },
      );
    }

    if (!body.TransactionTypeid) {
      return NextResponse.json(
        { success: false, message: "Transaction Type is required" },
        { status: 400 },
      );
    }

    if (!body.IssueDate) {
      return NextResponse.json(
        { success: false, message: "Issue Date is required" },
        { status: 400 },
      );
    }

    const qty = Number(body.Qty);

    if (!body.Qty || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, message: "Quantity must be greater than 0" },
        { status: 400 },
      );
    }

    if (!body.Issue_by) {
      return NextResponse.json(
        { success: false, message: "Issue By is required" },
        { status: 400 },
      );
    }

    if (!body.RecivedBy) {
      return NextResponse.json(
        { success: false, message: "Received By is required" },
        { status: 400 },
      );
    }

    const issueDate = new Date(body.IssueDate);

    if (Number.isNaN(issueDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid Issue Date" },
        { status: 400 },
      );
    }

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

    const balance =
      body.Balance !== undefined &&
        body.Balance !== null &&
        body.Balance !== ""
        ? Number(body.Balance)
        : 0;

    if (
      !Number.isFinite(previousBalance) ||
      (price !== null && !Number.isFinite(price)) ||
      !Number.isFinite(balance)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid numeric value" },
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
      const issueReceipt = await tx.issueReceipt.create({
        data: {
          ItemGroupid: String(body.ItemGroupid),
          ItemMasterid: String(body.ItemMasterid),
          ItemTypeid: String(body.ItemTypeid),
          TransactionTypeid: String(body.TransactionTypeid),
          IssueDate: issueDate,
          Qty: qty,
          PreviousBalance: previousBalance,
          Price: price,
          Particuler: body.Particuler
            ? String(body.Particuler)
            : null,
          Balance: balance,
          Issue_by: String(body.Issue_by),
          GetPassNo: body.GetPassNo
            ? String(body.GetPassNo)
            : body.GatePassNo
              ? String(body.GatePassNo)
              : null,
          DateOfRecive: body.DateOfRecive
            ? new Date(body.DateOfRecive)
            : null,
          ReciptChallanNo: body.ReciptChallanNo
            ? String(body.ReciptChallanNo)
            : null,
          RecivedBy: String(body.RecivedBy),
          Comment: body.Comment ? String(body.Comment) : null,

          // Created By
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

        tx.StaffUser.findFirst({
          where: { id: String(body.RecivedBy) },
        }),
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
        `Date : ${formatDate(body.IssueDate)}`,
        `Price : ${formatPrice(price)}`,
        `Particular : ${getValue(body.Particuler)}`,
        `Issued By : ${getStaffName(newIssueBy)}`,
        `GatePassNo : ${getValue(body.GetPassNo || body.GatePassNo)}`,
        `Date Of Receive : ${formatDate(body.DateOfRecive)}`,
        `Receipt Challan No : ${getValue(body.ReciptChallanNo)}`,
        `Received By : ${getStaffName(newReceivedBy)}`,
        `Comment : ${getValue(body.Comment)}`,
      ].join(" ");

      await tx.inventoryChangeLog.create({
        data: {
          IssueReceiptId: issueReceipt.id,
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

      return issueReceipt;
    });

    await systemLog({
      event: "create",
      userId,
      entityId: String(result.id),
      entityType: "inventory.issue-receipt",
      description: `Issue/Receipt created. Receipt ID: ${result.id}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Issue/Receipt created successfully",
        data: result,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE Issue/Receipt ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed creating Issue/Receipt",
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
        { success: false, message: "Issue/Receipt ID is required" },
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
        { success: false, message: "Issue/Receipt not found" },
        { status: 404 },
      );
    }

    if (
      !body.ItemGroupid ||
      !body.ItemMasterid ||
      !body.ItemTypeid ||
      !body.TransactionTypeid ||
      !body.IssueDate ||
      !body.Issue_by ||
      !body.RecivedBy
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Item Group, Item, Item Type, Transaction Type, Issue Date, Issue By and Received By are required",
        },
        { status: 400 },
      );
    }

    const qty = Number(body.Qty);

    if (!body.Qty || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json(
        { success: false, message: "Quantity must be greater than 0" },
        { status: 400 },
      );
    }

    const issueDate = new Date(body.IssueDate);

    if (Number.isNaN(issueDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid Issue Date" },
        { status: 400 },
      );
    }

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
      (price !== null && !Number.isFinite(price))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid numeric value" },
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

    const transactionTypes = await prisma.transactionType.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        EffectOnTransaction: true,
      },
    });

    const getTransactionEffect = (transactionTypeId) => {
      const transactionType = transactionTypes.find(
        (item) => String(item.id) === String(transactionTypeId),
      );

      return String(transactionType?.EffectOnTransaction ?? "")
        .trim()
        .toLowerCase();
    };

    const calculateBalance = (previous, quantity, transactionTypeId) => {
      const pb = Number(previous ?? 0);
      const qtyValue = Number(quantity ?? 0);
      const effect = getTransactionEffect(transactionTypeId);

      if (effect === "addition" || effect === "add") {
        return pb + qtyValue;
      }

      if (
        effect === "deduction" ||
        effect === "deductions" ||
        effect === "deduct" ||
        effect === "subtract"
      ) {
        return pb - qtyValue;
      }

      return pb;
    };

    const currentEffect = getTransactionEffect(body.TransactionTypeid);

    if (!currentEffect) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Transaction Type or transaction effect is not configured",
        },
        { status: 400 },
      );
    }

    const currentBalance = calculateBalance(
      previousBalance,
      qty,
      body.TransactionTypeid,
    );

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      // Update current record. Preserve createby.
      await tx.issueReceipt.update({
        where: { id: String(id) },
        data: {
          ItemGroupid: String(body.ItemGroupid),
          ItemMasterid: String(body.ItemMasterid),
          ItemTypeid: String(body.ItemTypeid),
          TransactionTypeid: String(body.TransactionTypeid),
          IssueDate: issueDate,
          Qty: qty,
          PreviousBalance: previousBalance,
          Price: price,
          Particuler: body.Particuler
            ? String(body.Particuler)
            : null,
          Balance: currentBalance,
          Issue_by: String(body.Issue_by),
          GetPassNo: body.GetPassNo
            ? String(body.GetPassNo)
            : body.GatePassNo
              ? String(body.GatePassNo)
              : null,
          DateOfRecive: body.DateOfRecive
            ? new Date(body.DateOfRecive)
            : null,
          ReciptChallanNo: body.ReciptChallanNo
            ? String(body.ReciptChallanNo)
            : null,
          RecivedBy: String(body.RecivedBy),
          Comment: body.Comment ? String(body.Comment) : null,

          // Updated By
          updateby: userId,
        },
      });

      // Get all active records for the selected item.
      const receipts = await tx.issueReceipt.findMany({
        where: {
          ItemMasterid: String(body.ItemMasterid),
          deletedAt: null,
        },
        orderBy: [
          { IssueDate: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
      });

      const editedIndex = receipts.findIndex(
        (receipt) => String(receipt.id) === String(id),
      );

      if (editedIndex === -1) {
        throw new Error("Updated Issue/Receipt could not be found");
      }

      let runningBalance = Number(receipts[0].PreviousBalance ?? 0);

      // Recalculate balances for this item's transactions.
      for (let index = 0; index < receipts.length; index++) {
        const receipt = receipts[index];
        const isEdited = String(receipt.id) === String(id);

        const rowQty = isEdited ? qty : Number(receipt.Qty ?? 0);

        const rowTransactionTypeId = isEdited
          ? String(body.TransactionTypeid)
          : receipt.TransactionTypeid;

        const rowPreviousBalance =
          index === 0
            ? isEdited
              ? previousBalance
              : Number(receipt.PreviousBalance ?? 0)
            : runningBalance;

        const rowBalance = calculateBalance(
          rowPreviousBalance,
          rowQty,
          rowTransactionTypeId,
        );

        const needsUpdate =
          Number(receipt.PreviousBalance ?? 0) !== rowPreviousBalance ||
          Number(receipt.Balance ?? 0) !== rowBalance ||
          (isEdited &&
            (Number(receipt.Qty ?? 0) !== rowQty ||
              String(receipt.TransactionTypeid) !==
              String(body.TransactionTypeid)));

        if (needsUpdate) {
          await tx.issueReceipt.update({
            where: { id: receipt.id },
            data: {
              PreviousBalance: rowPreviousBalance,
              Balance: rowBalance,
              ...(isEdited
                ? {
                  Qty: rowQty,
                  TransactionTypeid: String(body.TransactionTypeid),
                  updateby: userId,
                }
                : {}),
            },
          });
        }

        runningBalance = rowBalance;
      }

      // Get old and new related records for change log.
      const [
        oldItemMaster,
        newItemMaster,
        oldTransactionType,
        newTransactionType,
        oldIssueBy,
        newIssueBy,
        oldReceivedBy,
        newReceivedBy,
        oldItemType,
        newItemType,
      ] = await Promise.all([
        tx.itemMaster.findFirst({
          where: { id: String(existingReceipt.ItemMasterid) },
        }),
        tx.itemMaster.findFirst({
          where: { id: String(body.ItemMasterid) },
        }),
        tx.transactionType.findFirst({
          where: { id: String(existingReceipt.TransactionTypeid) },
        }),
        tx.transactionType.findFirst({
          where: { id: String(body.TransactionTypeid) },
        }),
        tx.StaffUser.findFirst({
          where: { id: String(existingReceipt.Issue_by) },
        }),
        tx.StaffUser.findFirst({
          where: { id: String(body.Issue_by) },
        }),
        tx.StaffUser.findFirst({
          where: { id: String(existingReceipt.RecivedBy) },
        }),
        tx.StaffUser.findFirst({
          where: { id: String(body.RecivedBy) },
        }),
        tx.ptoductType.findFirst({
          where: { id: String(existingReceipt.ItemTypeid) },
        }),
        tx.ptoductType.findFirst({
          where: { id: String(body.ItemTypeid) },
        }),
      ]);

      const oldItemName =
        oldItemMaster?.ItemName || oldItemMaster?.itemName || "-";

      const newItemName =
        newItemMaster?.ItemName || newItemMaster?.itemName || "-";

      const oldTransactionName = getTransactionTypeName(oldTransactionType);
      const newTransactionName = getTransactionTypeName(newTransactionType);

      const oldItemTypeName =
        oldItemType?.ProductType || oldItemType?.name || "-";

      const newItemTypeName =
        newItemType?.ProductType || newItemType?.name || "-";

      const oldIssueByName = getStaffName(oldIssueBy);
      const newIssueByName = getStaffName(newIssueBy);

      const oldReceivedByName = getStaffName(oldReceivedBy);
      const newReceivedByName = getStaffName(newReceivedBy);

      const changes = [];

      const addChange = (label, oldValue, newValue) => {
        if (String(oldValue ?? "-") !== String(newValue ?? "-")) {
          changes.push(
            `${label} : From - ${getValue(oldValue)} To - ${getValue(newValue)}`,
          );
        }
      };

      addChange("Item Name", oldItemName, newItemName);
      addChange(
        "Item Type",
        oldItemTypeName,
        newItemTypeName,
      );
      addChange(
        "Transaction Type",
        oldTransactionName,
        newTransactionName,
      );
      addChange(
        "Previous Balance",
        existingReceipt.PreviousBalance,
        previousBalance,
      );
      addChange("Quantity", existingReceipt.Qty, qty);
      addChange("Balance", existingReceipt.Balance, currentBalance);
      addChange(
        "Date",
        formatDate(existingReceipt.IssueDate),
        formatDate(issueDate),
      );
      addChange("Price", formatPrice(existingReceipt.Price), formatPrice(price));
      addChange(
        "Particular",
        existingReceipt.Particuler,
        body.Particuler,
      );
      addChange("Issued By", oldIssueByName, newIssueByName);
      addChange("Received By", oldReceivedByName, newReceivedByName);
      addChange(
        "Gate Pass No",
        existingReceipt.GetPassNo,
        body.GetPassNo || body.GatePassNo,
      );
      addChange(
        "Date Of Receive",
        formatDate(existingReceipt.DateOfRecive),
        formatDate(body.DateOfRecive),
      );
      addChange(
        "Receipt Challan No",
        existingReceipt.ReciptChallanNo,
        body.ReciptChallanNo,
      );
      addChange("Comment", existingReceipt.Comment, body.Comment);

      if (changes.length > 0) {
        await tx.inventoryChangeLog.create({
          data: {
            IssueReceiptId: String(id),
            UserId: userId,
            UserName: getUserName(user),
            Action: "Edit",
            ItemMasterid: String(body.ItemMasterid),
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

    await systemLog({
      event: "update",
      userId,
      entityId: String(updatedReceipt.id),
      entityType: "inventory.issue-receipt",
      description: `Issue/Receipt updated. Receipt ID: ${updatedReceipt.id}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({
      success: true,
      message: "Issue/Receipt updated successfully",
      data: updatedReceipt,
    });
  } catch (error) {
    console.error("UPDATE Issue/Receipt ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed updating Issue/Receipt",
      },
      { status: 500 },
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
        { success: false, message: "Issue/Receipt ID is required" },
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
        { success: false, message: "Issue/Receipt not found" },
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
        description: `Issue/Receipt deleted. Receipt ID: ${receipt.id}`,
        ipAddress: getIpAddress(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Issue/Receipt deleted successfully"
          : `${deleteResult.count} Issue/Receipts deleted successfully`,
      count: deleteResult.count,
    });
  } catch (error) {
    console.error("DELETE Issue/Receipt ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed deleting Issue/Receipt",
      },
      { status: 500 },
    );
  }
}