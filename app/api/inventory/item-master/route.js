import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// ======================================================
// CONFIG
// ======================================================

const MENU_KEY = "item-master";
const ENTITY_TYPE = "inventory.item-master";

// Whitelist of valid Prisma sort fields.
const ALLOWED_SORT_FIELDS = [
  "id",
  "ItemName",
  "Description",
  "rather",
  "status",
  "isDefault",
  "createdAt",
  "updatedAt",
];

// ======================================================
// HELPERS
// ======================================================

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

const validDate = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRange = (from, to) => {
  const start = validDate(from);
  const end = validDate(to);

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


const getItemMasterWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const applicableForRestockLevel =
    searchParams.get("applicableForRestockLevel") || "all";

  // Read selected group IDs directly from the URL.
  const groupIdsArray = [
    ...new Set(
      (searchParams.get("groupIds") || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  const createdRange = getDateRange(
    searchParams.get("createdFrom"),
    searchParams.get("createdTo"),
  );

  const updatedRange = getDateRange(
    searchParams.get("updatedFrom"),
    searchParams.get("updatedTo"),
  );

  if (createdRange.error || updatedRange.error) {
    return {
      error: createdRange.error || updatedRange.error,
    };
  }

  const where = {
    deletedAt: null,

    // Filter using ItemGroup IDs.
    ...(groupIdsArray.length > 0
      ? {
        ItemGroupid: {
          in: groupIdsArray,
        },
      }
      : {}),

    ...(query
      ? {
        OR: [
          {
            ItemName: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            Description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      }
      : {}),

    ...(status === "active"
      ? { status: true }
      : status === "inactive"
        ? { status: false }
        : {}),

    ...(applicableForRestockLevel === "true"
      ? { ApplicableForRelocateLevel: true }
      : applicableForRestockLevel === "false"
        ? { ApplicableForRelocateLevel: false }
        : {}),

    ...(createdRange.range
      ? { createdAt: createdRange.range }
      : {}),

    ...(updatedRange.range
      ? { updatedAt: updatedRange.range }
      : {}),
  };

  return { where };
};



// Builds the writable fields from the request body.
// Only fields present in the body are included, so the same helper works for
// create, full edit, and copy (the copy sends every field of the source item).
// Anything not listed here (id, createdAt, deletedAt, relations) is ignored.
const buildItemData = (body) => {
  const data = {};

  if (body.ItemGroupid !== undefined) data.ItemGroupid = body.ItemGroupid;

  if (body.Description !== undefined) {
    data.Description = String(body.Description ?? "").trim() || null;
  }

  if (body.openingBalance !== undefined) {
    data.openingBalance = body.openingBalance || null;
  }

  if (body.Unitid !== undefined) data.Unitid = body.Unitid;

  if (body.rather !== undefined) data.rather = Number(body.rather || 0);

  if (body.Tax1 !== undefined) data.Tax1 = body.Tax1 || "";
  if (body.Tax2 !== undefined) data.Tax2 = body.Tax2 || "";

  if (body.ApplicableForRelocateLevel !== undefined) {
    data.ApplicableForRelocateLevel = Boolean(body.ApplicableForRelocateLevel);
  }

  if (body.RelocateLevel !== undefined) {
    data.RelocateLevel = body.RelocateLevel || null;
  }

  if (body.status !== undefined) data.status = Boolean(body.status);
  if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);

  return data;
};

const normalizeIds = (body) => [
  ...new Set(
    (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
      .filter((id) => id !== null && id !== undefined && String(id))
      .map(String),
  ),
];

const unauthorized = () =>
  NextResponse.json(
    { success: false, message: "Unauthorized. Please log in again." },
    { status: 401 },
  );

const logItemMaster = async ({ request, event, itemMaster, user, text }) => {
  if (!itemMaster || !user?.id) return;

  const action =
    text ||
    (event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted");

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(itemMaster.id),
    entityType: ENTITY_TYPE,
    description: `Item Master ${action}: ${itemMaster.ItemName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET ITEM MASTER LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

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
    const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : "createdAt";

    const filterResult = getItemMasterWhere(searchParams);

    if (filterResult.error) {
      return NextResponse.json(
        { success: false, message: filterResult.error },
        { status: 400 },
      );
    }

    const where = filterResult.where;

    const [total, data] = await Promise.all([
      prisma.itemMaster.count({ where }),
      prisma.itemMaster.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Item Master fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("ITEM MASTER GET ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Item Master.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE ITEM MASTER (ALSO USED BY COPY)
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();
    const ItemName = body.ItemName?.trim();

    if (!ItemName) {
      return NextResponse.json(
        { success: false, message: "Item Name is required." },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const item = await prisma.$transaction(async (tx) => {
      // Only one default item.
      if (body.isDefault === true) {
        await tx.itemMaster.updateMany({
          where: { isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      return tx.itemMaster.create({
        data: {
          ...buildItemData(body),
          ItemName,
          status: body.status ?? true,
          isDefault: body.isDefault ?? false,
          lastSyncAt: new Date(),
        },
      });
    });

    await logItemMaster({ request, event: "create", itemMaster: item, user });

    return NextResponse.json({
      success: true,
      message: "Item Master created successfully.",
      data: item,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM MASTER CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Item Master.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE ITEM MASTER
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, message: "Item Master ID required." },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const existing = await prisma.itemMaster.findFirst({
      where: { id: body.id, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Item Master not found." },
        { status: 404 },
      );
    }

    const updateData = { ...buildItemData(body), lastSyncAt: new Date() };

    if (body.ItemName !== undefined) {
      const ItemName = body.ItemName?.trim();

      if (!ItemName) {
        return NextResponse.json(
          { success: false, message: "Item Name is required." },
          { status: 400 },
        );
      }

      updateData.ItemName = ItemName;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.itemMaster.updateMany({
          where: { id: { not: body.id }, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      return tx.itemMaster.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    await logItemMaster({ request, event: "update", itemMaster: updated, user });

    return NextResponse.json({
      success: true,
      message: "Item Master updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM MASTER UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Item Master.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH ITEM MASTER STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    if (typeof body.status !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "A valid status (true or false) is required.",
        },
        { status: 400 },
      );
    }

    const ids = normalizeIds(body);

    if (!ids.length) {
      return NextResponse.json(
        { success: false, message: "At least one item ID is required." },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const existingItems = await prisma.itemMaster.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, ItemName: true },
    });

    if (!existingItems.length) {
      return NextResponse.json(
        { success: false, message: "No active items were found." },
        { status: 404 },
      );
    }

    const updateResult = await prisma.itemMaster.updateMany({
      where: {
        id: { in: existingItems.map((item) => item.id) },
        deletedAt: null,
      },
      data: { status: body.status, lastSyncAt: new Date() },
    });

    for (const item of existingItems) {
      await logItemMaster({
        request,
        event: "update",
        itemMaster: item,
        user,
        text: `marked ${body.status ? "active" : "inactive"}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Item(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM MASTER STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update item status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE ITEM MASTER(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();
    const ids = normalizeIds(body);

    if (!ids.length) {
      return NextResponse.json(
        { success: false, message: "At least one item ID is required." },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const existingItems = await prisma.itemMaster.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, ItemName: true },
    });

    if (!existingItems.length) {
      return NextResponse.json(
        { success: false, message: "No active items were found to delete." },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.itemMaster.updateMany({
      where: {
        id: { in: existingItems.map((item) => item.id) },
        deletedAt: null,
      },
      data: { deletedAt: new Date(), lastSyncAt: new Date() },
    });

    for (const item of existingItems) {
      await logItemMaster({ request, event: "delete", itemMaster: item, user });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Item Master deleted successfully."
          : `${deleteResult.count} item(s) deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM MASTER DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete Item Master.",
      },
      { status: 500 },
    );
  }
}