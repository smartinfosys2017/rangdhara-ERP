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
  "SKU",
  "Barcode",
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
// SKU AND BARCODE VALIDATION
// ======================================================

const validateSkuBarcode = (body) => {
  const SKU = String(body.SKU ?? "").trim();
  const Barcode = String(body.Barcode ?? "").trim();

  if (SKU.length > 100) {
    return "SKU must not exceed 100 characters.";
  }

  if (Barcode.length > 100) {
    return "Barcode must not exceed 100 characters.";
  }

  return null;
};

// ======================================================
// BUILD ITEM WHERE CONDITIONS
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
        SKU: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        Barcode: {
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

  // Created by filter
  if (options.createdBy) {
    andConditions.push({
      createby: String(options.createdBy),
    });
  }

  // Updated by filter
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

  if (body.ItemName !== undefined) {
    data.ItemName = String(body.ItemName ?? "").trim();
  }

  // SKU
  if (body.SKU !== undefined) {
    data.SKU = String(body.SKU ?? "").trim() || null;
  }

  // Barcode
  if (body.Barcode !== undefined) {
    data.Barcode = String(body.Barcode ?? "").trim() || null;
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
    data.ApplicableForRelocateLevel = Boolean(body.ApplicableForRelocateLevel);
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
    description: `Item ${action}: ${itemMaster.ItemName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET ITEM LIST
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

    const sortField = ALLOWED_SORT_FIELDS.includes(sort) ? sort : "createdAt";

    // Filters
    const query = searchParams.get("query")?.trim() || "";
    const unitName = searchParams.get("unitName")?.trim() || "";
    const groupName = searchParams.get("groupName")?.trim() || "";
    // Item Group IDs (used to filter Item Master dropdown)
    const itemGroupIds = [
      ...new Set(
        (searchParams.get("itemGroupIds") || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
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
    const [units, itemGroups, locations, machines, itemConditions] =
      await Promise.all([
        prisma.unit.findMany({
          where: { deletedAt: null },
        }),
        prisma.itemGroup.findMany({
          where: { deletedAt: null },
        }),
        prisma.location.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            locationName: true,
          },
        }),
        prisma.machineMaster.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            machineName: true,
          },
        }),
        prisma.PtoductType.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            ProductType: true,
          },
        }),
      ]);

    // Global search: unit name
    const searchUnitIds = query
      ? units
        .filter((unit) =>
          matchesName(unit.unitName || unit.name || unit.abbreviation, query),
        )
        .map((unit) => unit.id)
      : [];

    // Global search: group name
    const searchGroupIds = query
      ? itemGroups
        .filter((group) => matchesName(group.groupName || group.name, query))
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
    // Warehouse map
    const locationMap = new Map(
      locations.map((location) => [
        String(location.id),
        location.locationName || "-",
      ]),
    );

    // Machine map
    const machineMap = new Map(
      machines.map((machine) => [
        String(machine.id),
        machine.machineName || "-",
      ]),
    );

    // Item Condition map
    const itemConditionMap = new Map(
      itemConditions.map((condition) => [
        String(condition.id),
        condition.ProductType || "-",
      ]),
    );
    const createdById = createdBy || undefined;
    const updatedById = updatedBy || undefined;

    // Return empty when lookup filter has no matching record
    if (
      (unitName && unitIds.length === 0) ||
      (groupName && groupNameIds.length === 0)
    ) {
      return NextResponse.json({
        success: true,
        message: "Item fetched successfully.",
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
    // Filter items by selected Item Group IDs
    if (itemGroupIds.length > 0) {
      const existingAnd = where.AND
        ? Array.isArray(where.AND)
          ? where.AND
          : [where.AND]
        : [];

      where = {
        ...where,
        AND: [
          ...existingAnd,
          {
            ItemGroupid: {
              in: itemGroupIds,
            },
          },
        ],
      };
    }
    // Numeric restock level filter
    if (
      (restockLevelMin !== null && restockLevelMin !== "") ||
      (restockLevelMax !== null && restockLevelMax !== "")
    ) {
      const min =
        restockLevelMin !== null && restockLevelMin !== ""
          ? Number(restockLevelMin)
          : null;

      const max =
        restockLevelMax !== null && restockLevelMax !== ""
          ? Number(restockLevelMax)
          : null;

      // Fetch item-level and brand-level restock configurations
      const allItems = await prisma.itemMaster.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          RestockLevelType: true,
          ApplicableForRelocateLevel: true,
          RelocateLevel: true,
          brands: {
            select: {
              RestockLevel: true,
            },
          },
        },
      });

      const matchingIds = allItems
        .filter((item) => {
          let levels = [];

          if (item.RestockLevelType === "BRAND") {
            levels = item.brands
              .map((brand) => Number(brand.RestockLevel))
              .filter((level) => Number.isFinite(level));
          } else if (
            item.ApplicableForRelocateLevel &&
            item.RelocateLevel !== null
          ) {
            const level = Number(item.RelocateLevel);

            if (Number.isFinite(level)) {
              levels = [level];
            }
          }

          return levels.some((level) => {
            if (min !== null && level < min) return false;
            if (max !== null && level > max) return false;
            return true;
          });
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
        include: {
          brands: {
            include: {
              brand: true,
            },
          },
        },
      }),
    ]);

    // Unit map
    const unitMap = new Map(
      units.map((unit) => [
        String(unit.id),
        `${unit.unitName || unit.name || "-"}${unit.abbreviation ? ` (${unit.abbreviation})` : ""
        }`,
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

    // Fetch users
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
      users.map((user) => [String(user.id).trim(), user.name || "-"]),
    );

    // Add display names
    const data = items.map((item) => ({
      ...item,

      UnitName: unitMap.get(String(item.Unitid)) || "-",
      GroupName: groupMap.get(String(item.ItemGroupid)) || "-",

      WarehouseName:
        locationMap.get(String(item.Locationid)) || "-",

      MachineName:
        machineMap.get(String(item.Machineid)) || "-",

      ItemConditionName:
        itemConditionMap.get(String(item.ItemConditionid)) || "-",

      createdByName: userMap.get(String(item.createby || "").trim()) || "-",
      updatedByName: userMap.get(String(item.updateby || "").trim()) || "-",
    }));

    return NextResponse.json({
      success: true,
      message: "Item fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("ITEM GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Item.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE ITEM (ALSO USED BY COPY)
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    // Validate SKU and Barcode
    const skuBarcodeError = validateSkuBarcode(body);

    if (skuBarcodeError) {
      return NextResponse.json(
        {
          success: false,
          message: skuBarcodeError,
        },
        { status: 400 },
      );
    }

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

    // Authenticated user
    const user = await getAuthenticatedUser();

    if (!user) return unauthorized();

    // Opening Balance validation
    const openingBalance = Number(body.openingBalance || 0);

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Opening Balance must be a valid non-negative number.",
        },
        { status: 400 },
      );
    }

    if (openingBalance > 0 && !body.Locationid && !body.Machineid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select either Location or Machine when Opening Balance is greater than 0.",
        },
        { status: 400 },
      );
    }

    const Locationid = body.Locationid || null;
    const Machineid = body.Machineid || null;
    const ItemConditionid = body.ItemConditionid || null;

    // Restock configuration
    const RestockLevelType = String(
      body.RestockLevelType || "ITEM",
    ).toUpperCase();

    if (!["ITEM", "BRAND"].includes(RestockLevelType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Restock Level Type.",
        },
        { status: 400 },
      );
    }

    // Selected brand IDs
    const BrandManufacturerids = Array.isArray(body.BrandManufacturerids)
      ? body.BrandManufacturerids.map(String)
      : [];

    const brandIds = [...new Set(BrandManufacturerids)];

    if (brandIds.length !== BrandManufacturerids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Duplicate brands are not allowed.",
        },
        { status: 400 },
      );
    }

    // Individual brand restock levels
    const BrandRestockLevels =
      body.BrandRestockLevels &&
        typeof body.BrandRestockLevels === "object" &&
        !Array.isArray(body.BrandRestockLevels)
        ? body.BrandRestockLevels
        : {};

    // BRAND restock validation
    if (RestockLevelType === "BRAND") {
      if (brandIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select at least one brand.",
          },
          { status: 400 },
        );
      }

      for (const brandId of brandIds) {
        const restockLevel = BrandRestockLevels[brandId];

        if (
          restockLevel === undefined ||
          restockLevel === null ||
          String(restockLevel).trim() === "" ||
          !Number.isFinite(Number(restockLevel)) ||
          Number(restockLevel) < 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Please enter a valid restock level for every selected brand.",
            },
            { status: 400 },
          );
        }
      }
    }

    // Validate selected brands
    if (brandIds.length > 0) {
      const existingBrands = await prisma.brandManufacturer.findMany({
        where: {
          id: {
            in: brandIds,
          },
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      const existingBrandIds = new Set(
        existingBrands.map((brand) => String(brand.id)),
      );

      const invalidBrand = brandIds.find(
        (brandId) => !existingBrandIds.has(brandId),
      );

      if (invalidBrand) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more selected brands are invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Validate selected Location
    if (Locationid) {
      const location = await prisma.location.findFirst({
        where: {
          id: Locationid,
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!location) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected Location is invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Validate selected Machine
    if (Machineid) {
      const machine = await prisma.machineMaster.findFirst({
        where: {
          id: Machineid,
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!machine) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected Machine is invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Validate selected Item Condition
    if (ItemConditionid) {
      const itemCondition = await prisma.PtoductType.findFirst({
        where: {
          id: ItemConditionid,
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!itemCondition) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected Item Condition is invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Check duplicate Item Name + Item Condition
    const duplicateItem = await prisma.itemMaster.findFirst({
      where: {
        ItemName: {
          equals: ItemName,
          mode: "insensitive",
        },
        ItemConditionid,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (duplicateItem) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Item Name already exists with the selected Item Condition.",
        },
        { status: 409 },
      );
    }

    // Remove frontend-only fields
    const {
      BrandManufacturerids: ignoredBrandIds,
      BrandRestockLevels: ignoredBrandRestockLevels,
      ...itemBody
    } = body;

    // Prepare ItemMaster data
    const itemData = buildItemData({
      ...itemBody,

      ApplicableForRelocateLevel:
        RestockLevelType === "ITEM"
          ? Boolean(body.ApplicableForRelocateLevel)
          : false,

      RelocateLevel:
        RestockLevelType === "ITEM" ? body.RelocateLevel || null : null,
    });

    // Create item with brand records
    const item = await prisma.$transaction(async (tx) => {
      // Remove previous default item
      if (body.isDefault === true) {
        await tx.itemMaster.updateMany({
          where: {
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
            updateby: String(user.id),
            lastSyncAt: new Date(),
          },
        });
      }

      return tx.itemMaster.create({
        data: {
          ...itemData,

          ItemName,
          Locationid,
          Machineid,
          ItemConditionid,

          RestockLevelType,

          ApplicableForRelocateLevel:
            RestockLevelType === "ITEM"
              ? Boolean(body.ApplicableForRelocateLevel)
              : false,

          RelocateLevel:
            RestockLevelType === "ITEM" ? body.RelocateLevel || null : null,

          // Create selected brands and their restock levels
          brands: {
            create: brandIds.map((brandId) => ({
              ItemBrandid: brandId,

              RestockLevel:
                RestockLevelType === "BRAND"
                  ? String(BrandRestockLevels[brandId]).trim()
                  : null,
            })),
          },

          status: body.status ?? true,
          isDefault: body.isDefault ?? false,
          customFields: body.customFields ?? {},
          createby: String(user.id),
          updateby: String(user.id),
          lastSyncAt: new Date(),
        },

        include: {
          brands: {
            include: {
              brand: true,
            },
          },
        },
      });
    });

    // System log
    await logItemMaster({
      request,
      event: "create",
      itemMaster: item,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item created successfully.",
      data: item,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Item.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE ITEM
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
          message: "Item ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) return unauthorized();

    // Find existing item
    const existingItem = await prisma.itemMaster.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
      include: {
        brands: true,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          message: "Item not found.",
        },
        { status: 404 },
      );
    }

    // Validate SKU and Barcode
    const skuBarcodeError = validateSkuBarcode(body);

    if (skuBarcodeError) {
      return NextResponse.json(
        {
          success: false,
          message: skuBarcodeError,
        },
        { status: 400 },
      );
    }

    // Resolve values
    const ItemName =
      body.ItemName !== undefined
        ? body.ItemName.trim()
        : existingItem.ItemName;

    if (!ItemName) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Name is required.",
        },
        { status: 400 },
      );
    }

    const ItemConditionid =
      body.ItemConditionid !== undefined
        ? body.ItemConditionid || null
        : existingItem.ItemConditionid;

    const Locationid =
      body.Locationid !== undefined
        ? body.Locationid || null
        : existingItem.Locationid;

    const Machineid =
      body.Machineid !== undefined
        ? body.Machineid || null
        : existingItem.Machineid;

    const openingBalance =
      body.openingBalance !== undefined
        ? Number(body.openingBalance || 0)
        : Number(existingItem.openingBalance || 0);

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Opening Balance must be a valid non-negative number.",
        },
        { status: 400 },
      );
    }

    if (openingBalance > 0 && !Locationid && !Machineid) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select either Location or Machine when Opening Balance is greater than 0.",
        },
        { status: 400 },
      );
    }

    // Restock configuration
    const RestockLevelType = String(
      body.RestockLevelType !== undefined
        ? body.RestockLevelType
        : existingItem.RestockLevelType || "ITEM",
    ).toUpperCase();

    if (!["ITEM", "BRAND"].includes(RestockLevelType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Restock Level Type.",
        },
        { status: 400 },
      );
    }

    // Resolve selected brand IDs
    const BrandManufacturerids =
      body.BrandManufacturerids !== undefined
        ? Array.isArray(body.BrandManufacturerids)
          ? body.BrandManufacturerids.map(String)
          : []
        : existingItem.brands.map((brand) => String(brand.ItemBrandid));

    const brandIds = [...new Set(BrandManufacturerids)];

    if (brandIds.length !== BrandManufacturerids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Duplicate brands are not allowed.",
        },
        { status: 400 },
      );
    }

    // Resolve brand restock levels
    const BrandRestockLevels =
      body.BrandRestockLevels &&
        typeof body.BrandRestockLevels === "object" &&
        !Array.isArray(body.BrandRestockLevels)
        ? body.BrandRestockLevels
        : {};

    const existingBrandLevels = Object.fromEntries(
      existingItem.brands.map((brand) => [
        String(brand.ItemBrandid),
        brand.RestockLevel,
      ]),
    );

    const finalBrandLevels = {
      ...existingBrandLevels,
      ...BrandRestockLevels,
    };

    // Validate BRAND restock configuration
    if (RestockLevelType === "BRAND") {
      if (brandIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select at least one brand.",
          },
          { status: 400 },
        );
      }

      for (const brandId of brandIds) {
        const restockLevel = finalBrandLevels[brandId];

        if (
          restockLevel === undefined ||
          restockLevel === null ||
          String(restockLevel).trim() === "" ||
          !Number.isFinite(Number(restockLevel)) ||
          Number(restockLevel) < 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Please enter a valid restock level for every selected brand.",
            },
            { status: 400 },
          );
        }
      }
    }

    // Validate brands
    if (brandIds.length > 0) {
      const existingBrands = await prisma.brandManufacturer.findMany({
        where: {
          id: {
            in: brandIds,
          },
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      const validBrandIds = new Set(
        existingBrands.map((brand) => String(brand.id)),
      );

      const invalidBrand = brandIds.find((id) => !validBrandIds.has(id));

      if (invalidBrand) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more selected brands are invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Validate Location
    if (Locationid) {
      const location = await prisma.location.findFirst({
        where: {
          id: Locationid,
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!location) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected Location is invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Validate Machine
    if (Machineid) {
      const machine = await prisma.machineMaster.findFirst({
        where: {
          id: Machineid,
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!machine) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected Machine is invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Validate Item Condition
    if (ItemConditionid) {
      const itemCondition = await prisma.PtoductType.findFirst({
        where: {
          id: ItemConditionid,
          status: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!itemCondition) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected Item Condition is invalid or inactive.",
          },
          { status: 400 },
        );
      }
    }

    // Duplicate Item Name + Item Condition
    const duplicateItem = await prisma.itemMaster.findFirst({
      where: {
        id: {
          not: existingItem.id,
        },
        ItemName: {
          equals: ItemName,
          mode: "insensitive",
        },
        ItemConditionid,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (duplicateItem) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Item Name already exists with the selected Item Condition.",
        },
        { status: 409 },
      );
    }

    // Remove frontend-only fields
    const {
      id,
      BrandManufacturerids: ignoredBrandIds,
      BrandRestockLevels: ignoredBrandRestockLevels,
      RestockLevelType: ignoredRestockType,
      ...itemBody
    } = body;

    // Build update data
    const itemData = buildItemData({
      ...itemBody,
      ItemName,
      openingBalance: String(openingBalance),

      ApplicableForRelocateLevel:
        RestockLevelType === "ITEM"
          ? body.ApplicableForRelocateLevel !== undefined
            ? Boolean(body.ApplicableForRelocateLevel)
            : existingItem.ApplicableForRelocateLevel
          : false,

      RelocateLevel:
        RestockLevelType === "ITEM"
          ? body.RelocateLevel !== undefined
            ? body.RelocateLevel || null
            : existingItem.RelocateLevel
          : null,
    });

    // Update transaction
    const updatedItem = await prisma.$transaction(async (tx) => {
      // Remove previous default item
      if (body.isDefault === true) {
        await tx.itemMaster.updateMany({
          where: {
            id: {
              not: existingItem.id,
            },
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
            updateby: String(user.id),
            lastSyncAt: new Date(),
          },
        });
      }

      // Update item
      await tx.itemMaster.update({
        where: {
          id: existingItem.id,
        },
        data: {
          ...itemData,
          Locationid,
          Machineid,
          ItemConditionid,
          RestockLevelType,
          updateby: String(user.id),
          customFields: body.customFields ?? {},
          lastSyncAt: new Date(),
        },
      });

      // Synchronize brand assignments when brand fields are supplied
      const shouldUpdateBrands =
        body.BrandManufacturerids !== undefined ||
        body.BrandRestockLevels !== undefined ||
        body.RestockLevelType !== undefined;

      if (shouldUpdateBrands) {
        await tx.itemMasterBrand.deleteMany({
          where: {
            ItemMasterid: existingItem.id,
          },
        });

        if (brandIds.length > 0) {
          await tx.itemMasterBrand.createMany({
            data: brandIds.map((brandId) => ({
              ItemMasterid: existingItem.id,
              ItemBrandid: brandId,

              RestockLevel:
                RestockLevelType === "BRAND"
                  ? String(finalBrandLevels[brandId]).trim()
                  : null,
            })),
          });
        }
      }

      // Return updated item
      return tx.itemMaster.findUnique({
        where: {
          id: existingItem.id,
        },
        include: {
          brands: {
            include: {
              brand: true,
            },
          },
        },
      });
    });

    // System log
    await logItemMaster({
      request,
      event: "update",
      itemMaster: updatedItem,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item updated successfully.",
      data: updatedItem,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Item.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH ITEM STATUS
// Supports { id, status } and { ids: [], status }
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    const user = await getAuthenticatedUser();

    if (!user) return unauthorized();

    // Accept either a single ID or multiple IDs
    const ids = Array.isArray(body.ids)
      ? normalizeIds(body.ids)
      : body.id
        ? normalizeIds([body.id])
        : [];

    if (ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide at least one valid Item ID.",
        },
        { status: 400 },
      );
    }

    // Validate status
    if (typeof body.status !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be true or false.",
        },
        { status: 400 },
      );
    }

    // Find existing items
    const existingItems = await prisma.itemMaster.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
    });

    if (existingItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Item records found.",
        },
        { status: 404 },
      );
    }

    const existingIds = existingItems.map((item) => item.id);

    // Update status
    await prisma.itemMaster.updateMany({
      where: {
        id: {
          in: existingIds,
        },
        deletedAt: null,
      },
      data: {
        status: body.status,
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
    });

    // Fetch updated records
    const updatedItems = await prisma.itemMaster.findMany({
      where: {
        id: {
          in: existingIds,
        },
      },
      include: {
        brands: {
          include: {
            brand: true,
          },
        },
      },
    });

    // System logs
    await Promise.all(
      updatedItems.map((item) =>
        logItemMaster({
          request,
          event: "update",
          itemMaster: item,
          user,
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      message: `Item status ${body.status ? "activated" : "deactivated"
        } successfully.`,
      data: updatedItems,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM STATUS UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Item status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE ITEM - SOFT DELETE
// Supports { id } and { ids: [] }
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    const body = await request.json().catch(() => ({}));

    // Accept IDs from request body or query parameters
    const rawIds = Array.isArray(body.ids)
      ? body.ids
      : body.id
        ? [body.id]
        : searchParams.get("ids")
          ? searchParams.get("ids").split(",")
          : searchParams.get("id")
            ? [searchParams.get("id")]
            : [];

    const ids = normalizeIds(rawIds);

    if (ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide at least one valid Item ID.",
        },
        { status: 400 },
      );
    }

    // Authenticated user
    const user = await getAuthenticatedUser();

    if (!user) return unauthorized();

    // Find active items
    const existingItems = await prisma.itemMaster.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      include: {
        brands: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (existingItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Item records found to delete.",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    // Soft delete transaction
    await prisma.$transaction(async (tx) => {
      await tx.itemMaster.updateMany({
        where: {
          id: {
            in: existingItems.map((item) => item.id),
          },
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          updateby: String(user.id),
          lastSyncAt: now,
        },
      });
    });

    // Fetch deleted items
    const deletedItems = existingItems.map((item) => ({
      ...item,
      deletedAt: now,
      updateby: String(user.id),
      lastSyncAt: now,
    }));

    // System logs
    await Promise.all(
      deletedItems.map((item) =>
        logItemMaster({
          request,
          event: "delete",
          itemMaster: item,
          user,
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      message:
        deletedItems.length === 1
          ? "Item deleted successfully."
          : `${deletedItems.length} items deleted successfully.`,
      data: deletedItems,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete Item.",
      },
      { status: 500 },
    );
  }
}