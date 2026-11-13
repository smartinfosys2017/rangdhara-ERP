import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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

// Dates arrive as YYYY-MM-DD and are treated as UTC days.
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

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

    if (accessError) {
      return accessError;
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    // =================================================
    // ADDITIONAL FILTER PARAMETERS
    // =================================================

    const quantityMin = searchParams.get("quantityMin");
    const quantityMax = searchParams.get("quantityMax");

    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");

    const issueByIds = searchParams.getAll("issueById");
    const receivedByIds = searchParams.getAll("receivedById");

    const transactionTypeIds = searchParams.getAll("transactionTypeId");
    const groupIds = searchParams.getAll("groupId");
    const itemTypeIds = searchParams.getAll("itemTypeId");
    const itemIds = searchParams.getAll("itemId");
    // =================================================
    // GET SINGLE Issue/Receipt
    // =================================================

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
          {
            status: 404,
          },
        );
      }

      const [
        itemGroup,
        itemMaster,
        itemType,
        transactionType,
        issueBy,
        receivedBy,
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
      ]);

      const data = {
        ...issueReceipt,

        ItemGroupName: itemGroup?.groupName || itemGroup?.name || "-",

        ItemMasterName:
          itemMaster?.ItemName ||
          itemMaster?.itemName ||
          itemMaster?.name ||
          "-",

        ItemTypeName: itemType?.name || itemType?.ProductType || "-",

        TransactionTypeName:
          transactionType?.name || transactionType?.TransactionType || "-",

        IssueByName: getStaffName(issueBy),

        ReceivedByName: getStaffName(receivedBy),
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
    // GET RELATED DATA
    // =================================================

    const [itemGroups, itemMasters, itemTypes, transactionTypes, staffUsers] =
      await Promise.all([
        prisma.itemGroup.findMany(),

        prisma.itemMaster.findMany(),

        prisma.ptoductType.findMany(),

        prisma.transactionType.findMany(),

        prisma.StaffUser.findMany(),
      ]);

    // =================================================
    // CREATE LOOKUP MAPS (ID -> NAME)
    // =================================================

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
      staffUsers.map((user) => [String(user.id), getStaffName(user)]),
    );

    // =================================================
    // BUILD WHERE
    // =================================================

    const where = {
      deletedAt: null,
    };
    // =================================================
    // QUANTITY FILTER
    // =================================================

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

    // =================================================
    // PRICE FILTER
    // =================================================

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

    // =================================================
    // DROPDOWN FILTERS
    // =================================================

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
    if (query) {
      const needle = query.toLowerCase();

      // IDs whose display name contains the search text.
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

    if (issueRange.range) where.IssueDate = issueRange.range;
    if (createdRange.range) where.createdAt = createdRange.range;
    if (updatedRange.range) where.updatedAt = updatedRange.range;

    // =================================================
    // QUERY
    // =================================================

    const [total, issueReceipts] = await Promise.all([
      prisma.issueReceipt.count({ where }),

      prisma.issueReceipt.findMany({
        where,
        orderBy: [{ [sortField]: dir }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // =================================================
    // ADD NAMES TO Issue/ReceiptS
    // =================================================

    const formattedIssueReceipts = issueReceipts.map((issueReceipt) => ({
      ...issueReceipt,

      ItemGroupName: itemGroupMap.get(String(issueReceipt.ItemGroupid)) || "-",

      ItemMasterName:
        itemMasterMap.get(String(issueReceipt.ItemMasterid)) || "-",

      ItemTypeName: itemTypeMap.get(String(issueReceipt.ItemTypeid)) || "-",

      TransactionTypeName:
        transactionTypeMap.get(String(issueReceipt.TransactionTypeid)) || "-",

      IssueByName: staffMap.get(String(issueReceipt.Issue_by)) || "-",

      ReceivedByName: staffMap.get(String(issueReceipt.RecivedBy)) || "-",
    }));

    // =================================================
    // RESPONSE
    // =================================================

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
      {
        status: 500,
      },
    );
  }
}
// =====================================================
// INVENTORY CHANGE LOG HELPERS
// =====================================================

const getInventoryItemInfo = async (
  db,
  itemMasterId,
  itemTypeId,
) => {
  const itemMaster = itemMasterId
    ? await db.itemMaster.findFirst({
      where: {
        id: String(itemMasterId),
      },
    })
    : null;

  const itemName =
    itemMaster?.ItemName ||
    itemMaster?.itemName ||
    itemMaster?.name ||
    "-";

  let productType = "-";

  // Only use this if your Prisma schema actually has ItemType model.
  if (itemTypeId && db.itemType) {
    const itemType = await db.itemType.findFirst({
      where: {
        id: String(itemTypeId),
      },
    });

    productType =
      itemType?.ItemType ||
      itemType?.ItemTypeName ||
      itemType?.TypeName ||
      itemType?.typeName ||
      itemType?.name ||
      itemType?.Name ||
      "-";
  }

  return {
    itemName,
    productType,
  };
};

// =====================================================
// STAFF NAME
// =====================================================

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

// =====================================================
// LOG VALUE
// =====================================================

const getLogValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
};

// =====================================================
// LOG DATE
// =====================================================

const formatLogDate = (value) => {
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
const getValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  return String(value);
};

const getUserId = (user) => {
  if (!user) return null;

  return (
    user.id ||
    user.userId ||
    user.userid ||
    user.user_id ||
    null
  );
};

const getUserName = (user) => {
  if (!user) return "-";

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.name ||
    user.UserName ||
    user.email ||
    "-"
  );
};
export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

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
    // GET ITEM INFORMATION
    // =================================================

    const { itemName, productType } = await getInventoryItemInfo(
      prisma,
      body.ItemMasterid,
      body.ItemTypeid,
    );
    // =================================================
    // CREATE RECEIPT + CHANGE LOG
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

          GetPassNo: body.GatePassNo ? String(body.GatePassNo) : null,

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
    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json(
      {
        success: true,
        message: "Issue/Receipt created successfully",
        data: result,
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

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

    if (accessError) {
      return accessError;
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Issue/Receipt ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const body = await request.json();

    // =================================================
    // CHECK EXISTING RECORD
    // =================================================

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
          message: "Issue/Receipt not found",
        },
        {
          status: 404,
        },
      );
    }

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

    // =================================================
    // GET TRANSACTION TYPES
    // =================================================

    const transactionTypes = await prisma.transactionType.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        EffectOnTransaction: true,
      },
    });

    // =================================================
    // GET TRANSACTION EFFECT
    // =================================================

    const getTransactionEffect = (transactionTypeId) => {
      const transactionType = transactionTypes.find(
        (item) => String(item.id) === String(transactionTypeId),
      );

      if (!transactionType) {
        return "";
      }

      return String(transactionType.EffectOnTransaction ?? "")
        .trim()
        .toLowerCase();
    };

    // =================================================
    // CALCULATE BALANCE
    // =================================================

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

    // =================================================
    // VALIDATE CURRENT TRANSACTION TYPE
    // =================================================

    const currentEffect = getTransactionEffect(body.TransactionTypeid);

    if (!currentEffect) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Transaction Type or transaction effect is not configured",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // CALCULATE CURRENT BALANCE
    // =================================================

    const currentBalance = calculateBalance(
      previousBalance,
      qty,
      body.TransactionTypeid,
    );
    // =================================================
    // UPDATE + RECALCULATE + CHANGE LOG
    // =================================================

    const updatedReceipt = await prisma.$transaction(async (tx) => {
      // ---------------------------------------------
      // UPDATE CURRENT RECEIPT
      // ---------------------------------------------

      await tx.issueReceipt.update({
        where: {
          id: String(id),
        },

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

          Balance: currentBalance,

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

      // ---------------------------------------------
      // GET ALL ACTIVE RECEIPTS
      // ---------------------------------------------

      const receipts = await tx.issueReceipt.findMany({
        where: {
          ItemMasterid: String(body.ItemMasterid),

          deletedAt: null,
        },

        orderBy: [
          {
            IssueDate: "asc",
          },
          {
            createdAt: "asc",
          },
          {
            id: "asc",
          },
        ],
      });

      // ---------------------------------------------
      // FIND EDITED ROW
      // ---------------------------------------------

      const editedIndex = receipts.findIndex(
        (receipt) => String(receipt.id) === String(id),
      );

      if (editedIndex === -1) {
        throw new Error("Updated Issue/Receipt could not be found");
      }

      // ---------------------------------------------
      // STARTING BALANCE
      // ---------------------------------------------

      let runningBalance = Number(receipts[0].PreviousBalance ?? 0);

      // ---------------------------------------------
      // RECALCULATE ALL RECEIPTS
      // ---------------------------------------------

      for (let index = 0; index < receipts.length; index++) {
        const receipt = receipts[index];

        let rowQty = Number(receipt.Qty ?? 0);

        let rowTransactionTypeId = receipt.TransactionTypeid;

        // -------------------------------------------
        // EDITED ROW USES NEW VALUES
        // -------------------------------------------

        if (String(receipt.id) === String(id)) {
          rowQty = qty;

          rowTransactionTypeId = String(body.TransactionTypeid);
        }

        // -------------------------------------------
        // PREVIOUS BALANCE
        // -------------------------------------------

        let rowPreviousBalance;

        if (index === 0) {
          rowPreviousBalance =
            String(receipt.id) === String(id)
              ? previousBalance
              : Number(receipt.PreviousBalance ?? 0);
        } else {
          rowPreviousBalance = runningBalance;
        }

        // -------------------------------------------
        // CALCULATE BALANCE
        // -------------------------------------------

        const rowBalance = calculateBalance(
          rowPreviousBalance,
          rowQty,
          rowTransactionTypeId,
        );

        // -------------------------------------------
        // CHECK WHETHER UPDATE IS REQUIRED
        // -------------------------------------------

        const oldPreviousBalance = Number(receipt.PreviousBalance ?? 0);

        const oldBalance = Number(receipt.Balance ?? 0);

        const needsUpdate =
          oldPreviousBalance !== rowPreviousBalance ||
          oldBalance !== rowBalance ||
          (String(receipt.id) === String(id) &&
            Number(receipt.Qty ?? 0) !== rowQty) ||
          (String(receipt.id) === String(id) &&
            String(receipt.TransactionTypeid) !==
            String(body.TransactionTypeid));

        if (needsUpdate) {
          await tx.issueReceipt.update({
            where: {
              id: receipt.id,
            },

            data: {
              PreviousBalance: rowPreviousBalance,

              Balance: rowBalance,

              ...(String(receipt.id) === String(id)
                ? {
                  Qty: rowQty,

                  TransactionTypeid: String(body.TransactionTypeid),
                }
                : {}),
            },
          });
        }

        // -------------------------------------------
        // NEXT ROW
        // -------------------------------------------

        runningBalance = rowBalance;
      }

      // =================================================
      // GET OLD ITEM INFORMATION
      // =================================================

      const oldItemMaster = await tx.itemMaster.findFirst({
        where: {
          id: String(existingReceipt.ItemMasterid),
        },
      });

      const newItemMaster = await tx.itemMaster.findFirst({
        where: {
          id: String(body.ItemMasterid),
        },
      });

      // =================================================
      // GET ITEM TYPES
      // =================================================

      const oldProductType = String(existingReceipt.ItemTypeid || "-");
      const newProductType = String(body.ItemTypeid || "-");

      // =================================================
      // GET TRANSACTION TYPE NAMES
      // =================================================

      const oldTransactionType = await tx.transactionType.findFirst({
        where: {
          id: String(existingReceipt.TransactionTypeid),
        },
      });

      const newTransactionType = await tx.transactionType.findFirst({
        where: {
          id: String(body.TransactionTypeid),
        },
      });

      const getTransactionTypeName = (transaction) => {
        if (!transaction) {
          return "-";
        }

        return (
          transaction.name ||
          transaction.Name ||
          transaction.TransactionType ||
          transaction.TransactionTypeName ||
          transaction.TypeName ||
          "-"
        );
      };

      const oldTransactionName = getTransactionTypeName(oldTransactionType);

      const newTransactionName = getTransactionTypeName(newTransactionType);

      // =================================================
      // GET USER / STAFF NAMES
      // =================================================

      const oldIssueBy = await tx.StaffUser.findFirst({
        where: {
          id: String(existingReceipt.Issue_by),
        },
      });

      const newIssueBy = await tx.StaffUser.findFirst({
        where: {
          id: String(body.Issue_by),
        },
      });

      const oldReceivedBy = await tx.StaffUser.findFirst({
        where: {
          id: String(existingReceipt.RecivedBy),
        },
      });

      const newReceivedBy = await tx.StaffUser.findFirst({
        where: {
          id: String(body.RecivedBy),
        },
      });

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

      const oldIssueByName = getStaffName(oldIssueBy);

      const newIssueByName = getStaffName(newIssueBy);

      const oldReceivedByName = getStaffName(oldReceivedBy);

      const newReceivedByName = getStaffName(newReceivedBy);

      // =================================================
      // FORMAT DATE
      // =================================================

      const formatLogDate = (value) => {
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

      // =================================================
      // FORMAT VALUE
      // =================================================

      const logValue = (value) => {
        if (value === undefined || value === null || value === "") {
          return "-";
        }

        return String(value);
      };

      // =================================================
      // COLLECT CHANGES
      // =================================================

      const changes = [];

      // Item Name
      const oldItemName = oldItemMaster?.ItemName || "-";

      const newItemName = newItemMaster?.ItemName || "-";

      if (oldItemName !== newItemName) {
        changes.push(`ItemName : From - ${oldItemName} To - ${newItemName}`);
      }

      // Item Type
      if (String(existingReceipt.ItemTypeid) !== String(body.ItemTypeid)) {
        changes.push(
          `Item Type : From - ${oldProductType} To - ${newProductType}`,
        );
      }

      // Transaction Type
      if (
        String(existingReceipt.TransactionTypeid) !==
        String(body.TransactionTypeid)
      ) {
        changes.push(
          `Transaction Type : From - ${oldTransactionName} To - ${newTransactionName}`,
        );
      }

      // Previous Balance
      if (
        Number(existingReceipt.PreviousBalance ?? 0) !== Number(previousBalance)
      ) {
        changes.push(
          `Previous Balance : From - ${existingReceipt.PreviousBalance ?? 0} To - ${previousBalance}`,
        );
      }

      // Quantity
      if (Number(existingReceipt.Qty ?? 0) !== Number(qty)) {
        changes.push(
          `Quantity : From - ${existingReceipt.Qty ?? 0} To - ${qty}`,
        );
      }

      // Balance
      if (Number(existingReceipt.Balance ?? 0) !== Number(currentBalance)) {
        changes.push(
          `Balance : From - ${existingReceipt.Balance ?? 0} To - ${currentBalance}`,
        );
      }

      // Date
      const oldDate = formatLogDate(existingReceipt.IssueDate);

      const newDate = formatLogDate(body.IssueDate);

      if (oldDate !== newDate) {
        changes.push(`Date : From - ${oldDate} To - ${newDate}`);
      }

      // Price
      const oldPrice =
        existingReceipt.Price !== null && existingReceipt.Price !== undefined
          ? String(existingReceipt.Price)
          : "-";

      const newPrice = price !== null ? String(price) : "-";

      if (oldPrice !== newPrice) {
        changes.push(`Price : From - ${oldPrice} To - ${newPrice}`);
      }

      // Particular
      const oldParticular = existingReceipt.Particuler || "-";

      const newParticular = body.Particuler || "-";

      if (oldParticular !== newParticular) {
        changes.push(
          `Particular : From - ${oldParticular} To - ${newParticular}`,
        );
      }

      // Issued By
      if (String(existingReceipt.Issue_by) !== String(body.Issue_by)) {
        changes.push(
          `Issued By : From - ${oldIssueByName} To - ${newIssueByName}`,
        );
      }

      // // Issued To RecivedBy
      if (String(existingReceipt.RecivedBy) !== String(body.RecivedBy)) {
        changes.push(
          `RecivedBy : From - ${oldReceivedByName} To - ${newReceivedByName}`,
        );
      }

      // Gate Pass
      const oldGatePass = existingReceipt.GetPassNo || "-";

      const newGatePass = body.GetPassNo || "-";

      if (oldGatePass !== newGatePass) {
        changes.push(`GatePassNo : From - ${oldGatePass} To - ${newGatePass}`);
      }

      // Date Of Receive
      const oldReceiveDate = formatLogDate(existingReceipt.DateOfRecive);

      const newReceiveDate = formatLogDate(body.DateOfRecive);

      if (oldReceiveDate !== newReceiveDate) {
        changes.push(
          `Date Of Receive : From - ${oldReceiveDate} To - ${newReceiveDate}`,
        );
      }

      // Receipt Challan
      const oldChallan = existingReceipt.ReciptChallanNo || "-";

      const newChallan = body.ReciptChallanNo || "-";

      if (oldChallan !== newChallan) {
        changes.push(
          `Receipt Challan No : From - ${oldChallan} To - ${newChallan}`,
        );
      }

      // Comment
      const oldComment = existingReceipt.Comment || "-";

      const newComment = body.Comment || "-";

      if (oldComment !== newComment) {
        changes.push(`Comment : From - ${oldComment} To - ${newComment}`);
      }

      // =================================================
      // CREATE INVENTORY CHANGE LOG
      // =================================================

      if (changes.length > 0) {
        await tx.inventoryChangeLog.create({
          data: {
            IssueReceiptId: String(id),

            UserId: body.UserId ? String(body.UserId) : null,

            UserName: body.UserName ? String(body.UserName) : null,

            Action: "Edit",

            ItemMasterid: String(body.ItemMasterid),

            ItemName: newItemName,

            ItemTypeid: String(body.ItemTypeid),

            ItemType: newProductType,

            Details: changes.join(" "),
          },
        });
      }

      // ---------------------------------------------
      // RETURN UPDATED RECORD
      // ---------------------------------------------

      return await tx.issueReceipt.findFirst({
        where: {
          id: String(id),
          deletedAt: null,
        },
      });
    });

    // SYSTEM LOG: UPDATE Issue/Receipt
    await systemLog({
      event: "update",
      userId: body.UserId ? String(body.UserId) : null,
      entityId: String(updatedReceipt.id),
      entityType: "inventory.issue-receipt",
      description: `Issue/Receipt updated. Receipt ID: ${updatedReceipt.id}`,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // =================================================
    // RESPONSE
    // =================================================

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
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("inventory-issue-receipt");

    if (accessError) {
      return accessError;
    }

    const { searchParams } = new URL(request.url);

    // The body is optional: single delete still uses ?id=
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
          message: "Issue/Receipt ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // CHECK EXISTING RECORDS
    // =================================================

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
        {
          success: false,
          message: "Issue/Receipt not found",
        },
        {
          status: 404,
        },
      );
    }

    // =================================================
    // SOFT DELETE
    // =================================================

    const deleteResult = await prisma.issueReceipt.updateMany({
      where: {
        id: { in: existingReceipts.map((receipt) => receipt.id) },
        deletedAt: null,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    const user = await getAuthenticatedUser();

    // SYSTEM LOG: DELETE Issue/Receipt(S)
    for (const receipt of existingReceipts) {
      await systemLog({
        event: "delete",
        userId: user?.id ? String(user.id) : null,
        entityId: String(receipt.id),
        entityType: "inventory.issue-receipt",
        description: `Issue/Receipt deleted. Receipt ID: ${receipt.id}`,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
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
      {
        status: 500,
      },
    );
  }
}