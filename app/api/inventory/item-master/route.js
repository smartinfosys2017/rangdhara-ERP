
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

const matchesName = (value, search) => {
  if (!search) return true;
  if (!value) return false;

  return String(value)
    .toLowerCase()
    .includes(String(search).trim().toLowerCase());
};

// ======================================================
// BUILD ITEM MASTER WHERE CONDITIONS
// ======================================================

const getItemMasterWhere = (searchParams, options = {}) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const applicableForRestockLevel =
    searchParams.get("applicableForRestockLevel") || "all";

  const createdFrom = searchParams.get("createdFrom") || "";
  const createdTo = searchParams.get("createdTo") || "";
  const updatedFrom = searchParams.get("updatedFrom") || "";
  const updatedTo = searchParams.get("updatedTo") || "";

  const andConditions = [];

  // Global search
  if (query) {
    const searchConditions = [
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
    ];

    if (options.searchUnitIds?.length) {
      searchConditions.push({
        Unitid: {
          in: options.searchUnitIds,
        },
      });
    }

    if (options.searchGroupIds?.length) {
      searchConditions.push({
        ItemGroupid: {
          in: options.searchGroupIds,
        },
      });
    }

    andConditions.push({
      OR: searchConditions,
    });
  }

  // Unit filter
  if (options.unitIds) {
    andConditions.push({
      Unitid: {
        in: options.unitIds,
      },
    });
  }

  // Item group filter
  if (options.groupNameIds) {
    andConditions.push({
      ItemGroupid: {
        in: options.groupNameIds,
      },
    });
  }

  // Created by filter - Prisma field: createby
  if (options.createdBy) {
    andConditions.push({
      createby: String(options.createdBy),
    });
  }

  // Updated by filter - Prisma field: updateby
  if (options.updatedBy) {
    andConditions.push({
      updateby: String(options.updatedBy),
    });
  }

  // Status filter
  let statusCondition = {};

  if (status === "active") {
    statusCondition = { status: true };
  } else if (status === "inactive") {
    statusCondition = { status: false };
  }

  // Applicable for restock level
  if (applicableForRestockLevel === "true") {
    andConditions.push({
      ApplicableForRelocateLevel: true,
    });
  } else if (applicableForRestockLevel === "false") {
    andConditions.push({
      ApplicableForRelocateLevel: false,
    });
  }

  // Created date range
  const createdDateResult = getDateRange(createdFrom, createdTo);

  if (createdDateResult.error) {
    return { error: createdDateResult.error };
  }

  if (createdDateResult.range) {
    andConditions.push({
      createdAt: createdDateResult.range,
    });
  }

  // Updated date range
  const updatedDateResult = getDateRange(updatedFrom, updatedTo);

  if (updatedDateResult.error) {
    return { error: updatedDateResult.error };
  }

  if (updatedDateResult.range) {
    andConditions.push({
      updatedAt: updatedDateResult.range,
    });
  }

  return {
    where: {
      deletedAt: null,
      ...statusCondition,
      ...(andConditions.length ? { AND: andConditions } : {}),
    },
  };
};

// ======================================================
// BUILD WRITABLE ITEM DATA
// ======================================================

const buildItemData = (body) => {
  const data = {};

  if (body.ItemGroupid !== undefined) {
    data.ItemGroupid = body.ItemGroupid;
  }

  if (body.Description !== undefined) {
    data.Description = String(body.Description ?? "").trim() || null;
  }

  if (body.openingBalance !== undefined) {
    data.openingBalance = body.openingBalance || null;
  }

  if (body.Unitid !== undefined) {
    data.Unitid = body.Unitid;
  }

  if (body.rather !== undefined) {
    data.rather = Number(body.rather || 0);
  }

  if (body.Tax1 !== undefined) {
    data.Tax1 = body.Tax1 || "";
  }

  if (body.Tax2 !== undefined) {
    data.Tax2 = body.Tax2 || "";
  }

  if (body.ApplicableForRelocateLevel !== undefined) {
    data.ApplicableForRelocateLevel = Boolean(
      body.ApplicableForRelocateLevel,
    );
  }

  if (body.RelocateLevel !== undefined) {
    data.RelocateLevel = body.RelocateLevel || null;
  }

  if (body.status !== undefined) {
    data.status = Boolean(body.status);
  }

  if (body.isDefault !== undefined) {
    data.isDefault = Boolean(body.isDefault);
  }

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
    {
      success: false,
      message: "Unauthorized. Please log in again.",
    },
    { status: 401 },
  );

// ======================================================
// SYSTEM LOG
// ======================================================

const logItemMaster = async ({
  request,
  event,
  itemMaster,
  user,
  text,
}) => {
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

    // Pagination
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

    // Sorting
    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const sortField = ALLOWED_SORT_FIELDS.includes(sort)
      ? sort
      : "createdAt";

    // Filter parameters
    const query = searchParams.get("query")?.trim() || "";
    const unitName = searchParams.get("unitName")?.trim() || "";
    const groupName = searchParams.get("groupName")?.trim() || "";

    const createdBy = searchParams.get("createdBy")?.trim() || "";
    const updatedBy = searchParams.get("updatedBy")?.trim() || "";

    const restockLevelMin = searchParams.get("restockLevelMin");
    const restockLevelMax = searchParams.get("restockLevelMax");

    const closingBalanceFrom = searchParams.get("closingBalanceFrom");
    const closingBalanceTo = searchParams.get("closingBalanceTo");

    // Validate numeric filters
    const numericFilters = [
      { name: "Restock Level Minimum", value: restockLevelMin },
      { name: "Restock Level Maximum", value: restockLevelMax },
      { name: "Closing Balance From", value: closingBalanceFrom },
      { name: "Closing Balance To", value: closingBalanceTo },
    ];

    for (const filter of numericFilters) {
      if (
        filter.value !== null &&
        filter.value !== "" &&
        !Number.isFinite(Number(filter.value))
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `${filter.name} must be a valid number.`,
          },
          { status: 400 },
        );
      }
    }

    if (
      restockLevelMin !== null &&
      restockLevelMin !== "" &&
      restockLevelMax !== null &&
      restockLevelMax !== "" &&
      Number(restockLevelMin) > Number(restockLevelMax)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Restock Level minimum cannot be greater than maximum.",
        },
        { status: 400 },
      );
    }

    if (
      closingBalanceFrom !== null &&
      closingBalanceFrom !== "" &&
      closingBalanceTo !== null &&
      closingBalanceTo !== "" &&
      Number(closingBalanceFrom) > Number(closingBalanceTo)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Closing Balance from cannot be greater than to.",
        },
        { status: 400 },
      );
    }

    // Fetch lookup records
    const [units, itemGroups] = await Promise.all([
      prisma.unit.findMany({
        where: { deletedAt: null },
      }),

      prisma.itemGroup.findMany({
        where: { deletedAt: null },
      }),
    ]);

    // Global search: unit name
    const searchUnitIds = query
      ? units
          .filter((unit) =>
            matchesName(
              unit.unitName || unit.name || unit.abbreviation,
              query,
            ),
          )
          .map((unit) => unit.id)
      : [];

    // Global search: group name
    const searchGroupIds = query
      ? itemGroups
          .filter((group) =>
            matchesName(group.groupName || group.name, query),
          )
          .map((group) => group.id)
      : [];

    // Unit name filter
    const unitIds = unitName
      ? units
          .filter((unit) =>
            matchesName(
              unit.unitName || unit.name || unit.abbreviation,
              unitName,
            ),
          )
          .map((unit) => unit.id)
      : undefined;

    // Group name filter
    const groupNameIds = groupName
      ? itemGroups
          .filter((group) =>
            matchesName(group.groupName || group.name, groupName),
          )
          .map((group) => group.id)
      : undefined;

    // Created by / Updated by - same user IDs as Unit API
    const createdById = createdBy || undefined;
    const updatedById = updatedBy || undefined;

    // Return empty when a lookup filter has no matching record
    if (
      (unitName && unitIds.length === 0) ||
      (groupName && groupNameIds.length === 0)
    ) {
      return NextResponse.json({
        success: true,
        message: "Item Master fetched successfully.",
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }

    // Build base WHERE conditions
    const filterResult = getItemMasterWhere(searchParams, {
      unitIds,
      groupNameIds,
      createdBy: createdById,
      updatedBy: updatedById,
      searchUnitIds,
      searchGroupIds,
    });

    if (filterResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: filterResult.error,
        },
        { status: 400 },
      );
    }

    let where = filterResult.where;

    // ======================================================
    // NUMERIC RESTOCK LEVEL FILTER
    // RelocateLevel is stored as String, so compare as Number
    // ======================================================

    if (restockLevelMin !== null && restockLevelMin !== "" ||
        restockLevelMax !== null && restockLevelMax !== "") {
      const min =
        restockLevelMin !== null && restockLevelMin !== ""
          ? Number(restockLevelMin)
          : null;

      const max =
        restockLevelMax !== null && restockLevelMax !== ""
          ? Number(restockLevelMax)
          : null;

      const allItems = await prisma.itemMaster.findMany({
        where: {
          deletedAt: null,
          ApplicableForRelocateLevel: true,
          RelocateLevel: { not: null },
        },
        select: {
          id: true,
          RelocateLevel: true,
        },
      });

      const matchingIds = allItems
        .filter((item) => {
          const level = Number(item.RelocateLevel);

          if (!Number.isFinite(level)) return false;
          if (min !== null && level < min) return false;
          if (max !== null && level > max) return false;

          return true;
        })
        .map((item) => item.id);

      where = {
        ...where,
        AND: [
          ...(where.AND || []),
          {
            id: {
              in: matchingIds,
            },
          },
        ],
      };
    }

    // Fetch items
    const [total, items] = await Promise.all([
      prisma.itemMaster.count({ where }),

      prisma.itemMaster.findMany({
        where,
        orderBy: {
          [sortField]: dir,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Unit map
    const unitMap = new Map(
      units.map((unit) => [
        String(unit.id),
        unit.unitName || unit.name || unit.abbreviation || "-",
      ]),
    );

    // Item group map
    const groupMap = new Map(
      itemGroups.map((group) => [
        String(group.id),
        group.groupName || group.name || "-",
      ]),
    );

    // Collect unique creator and updater IDs
    const userIds = [
      ...new Set(
        items
          .flatMap((item) => [item.createby, item.updateby])
          .filter(Boolean)
          .map((id) => String(id).trim()),
      ),
    ];

    // Fetch users - same as Unit API
    const users = userIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

    // User ID-to-name map
    const userMap = new Map(
      users.map((user) => [
        String(user.id).trim(),
        user.name || "-",
      ]),
    );

    // Add display names
    const data = items.map((item) => ({
      ...item,

      UnitName: unitMap.get(String(item.Unitid)) || "-",

      GroupName: groupMap.get(String(item.ItemGroupid)) || "-",

      CreatedByName:
        userMap.get(String(item.createby || "").trim()) || "-",

      UpdatedByName:
        userMap.get(String(item.updateby || "").trim()) || "-",
    }));

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
    console.error("ITEM MASTER GET ERROR:", error);

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
        {
          success: false,
          message: "Item Name is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const item = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.itemMaster.updateMany({
          where: {
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.itemMaster.create({
        data: {
          ...buildItemData(body),
          ItemName,
          status: body.status ?? true,
          isDefault: body.isDefault ?? false,

          // Same as Unit API
          createby: String(user.id),
          updateby: String(user.id),

          lastSyncAt: new Date(),
        },
      });
    });

    await logItemMaster({
      request,
      event: "create",
      itemMaster: item,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item Master created successfully.",
      data: item,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM MASTER CREATE ERROR:", error);

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
        {
          success: false,
          message: "Item Master ID required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const existing = await prisma.itemMaster.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Master not found.",
        },
        { status: 404 },
      );
    }

    const updateData = {
      ...buildItemData(body),
      updateby: String(user.id),
      lastSyncAt: new Date(),
    };

    if (body.ItemName !== undefined) {
      const ItemName = body.ItemName?.trim();

      if (!ItemName) {
        return NextResponse.json(
          {
            success: false,
            message: "Item Name is required.",
          },
          { status: 400 },
        );
      }

      updateData.ItemName = ItemName;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.itemMaster.updateMany({
          where: {
            id: { not: body.id },
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.itemMaster.update({
        where: {
          id: body.id,
        },
        data: updateData,
      });
    });

    await logItemMaster({
      request,
      event: "update",
      itemMaster: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item Master updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM MASTER UPDATE ERROR:", error);

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
// Supports { id, status } and { ids: [], status }
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
        {
          success: false,
          message: "At least one item ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const existingItems = await prisma.itemMaster.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        ItemName: true,
      },
    });

    if (!existingItems.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active items were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.itemMaster.updateMany({
      where: {
        id: {
          in: existingItems.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        status: body.status,
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
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
    console.error("ITEM MASTER STATUS UPDATE ERROR:", error);

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
// Supports { id } and { ids: [] }
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();
    const ids = normalizeIds(body);

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one item ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    if (!user) return unauthorized();

    const existingItems = await prisma.itemMaster.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        ItemName: true,
      },
    });

    if (!existingItems.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active items were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.itemMaster.updateMany({
      where: {
        id: {
          in: existingItems.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingItems) {
      await logItemMaster({
        request,
        event: "delete",
        itemMaster: item,
        user,
      });
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
    console.error("ITEM MASTER DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete Item Master.",
      },
      { status: 500 },
    );
  }
}