import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// ======================================================
// CONFIG
// ======================================================

const MENU_KEY = "item-rate";
const ENTITY_TYPE = "inventory.item-rate";

const ALLOWED_SORT_FIELDS = [
  "id",
  "ItemGroupid",
  "ItemMasterid",
  "BrandManufacturerid",
  "ItemConditionid",
  "ApplicableFromDate",
  "ApplicableToDate",
  "Rate",
  "Unitid",
  "Comments",
  "createdAt",
  "updatedAt",
];

// ======================================================
// HELPERS
// ======================================================
const getDateOnly = (value) => {
  if (!value) return null;

  let year;
  let month;
  let day;

  if (value instanceof Date) {
    year = value.getUTCFullYear();
    month = value.getUTCMonth() + 1;
    day = value.getUTCDate();
  } else {
    const dateString = String(value).trim();

    // YYYY-MM-DD or ISO date
    let match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (match) {
      [, year, month, day] = match;
    } else {
      // DD/MM/YYYY
      match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

      if (!match) return null;

      [, day, month, year] = match;
    }

    year = Number(year);
    month = Number(month);
    day = Number(day);
  }

  const timestamp = Date.UTC(year, month - 1, day);
  const check = new Date(timestamp);

  // Reject invalid calendar dates
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
};
const getClientIp = (request) =>
  request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim() || null;

const unauthorized = () =>
  NextResponse.json(
    {
      success: false,
      message: "Unauthorized. Please log in again.",
    },
    { status: 401 }
  );

const normalizeString = (value) =>
  String(value ?? "").trim();

const normalizeIds = (body) => {
  const rawIds = Array.isArray(body?.ids)
    ? body.ids
    : body?.id
      ? [body.id]
      : [];

  return [
    ...new Set(
      rawIds
        .filter(
          (id) =>
            id !== null &&
            id !== undefined &&
            String(id).trim() !== ""
        )
        .map((id) => String(id).trim())
    ),
  ];
};

const validDate = (value, fieldName = "Date") => {
  if (value === null || value === undefined || value === "") {
    return { value: null };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      error: `${fieldName} must be a valid date.`,
    };
  }

  return { value: date };
};

const getDateRange = (from, to) => {
  const start = validDate(from, "From date");
  const end = validDate(to, "To date");

  if (start.error || end.error) {
    return {
      error: start.error || end.error,
    };
  }

  if (
    start.value &&
    end.value &&
    start.value > end.value
  ) {
    return {
      error: "The From date cannot be after the To date.",
    };
  }

  return {
    range:
      start.value || end.value
        ? {
          ...(start.value
            ? { gte: start.value }
            : {}),
          ...(end.value
            ? {
              lt: new Date(
                end.value.getTime() +
                24 * 60 * 60 * 1000
              ),
            }
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

const getItemRateName = (item) =>
  item?.ItemMasterName ||
  item?.ItemMaster?.ItemName ||
  "Item Rate";

// ======================================================
// SYSTEM LOG
// ======================================================

const logItemRate = async ({
  request,
  event,
  itemRate,
  user,
}) => {
  if (!itemRate || !user?.id) return;

  const action =
    event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted";

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(itemRate.id),
    entityType: ENTITY_TYPE,
    description: `Item Rate ${action}: ${getItemRateName(itemRate)}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// VALIDATE ITEM RATE DATA
// ======================================================

const buildItemRateData = (body) => {
  const data = {};

  if (body.ItemGroupid !== undefined) {
    data.ItemGroupid = normalizeString(body.ItemGroupid);
  }

  if (body.ItemMasterid !== undefined) {
    data.ItemMasterid = normalizeString(body.ItemMasterid);
  }

  if (body.BrandManufacturerid !== undefined) {
    data.BrandManufacturerid = normalizeString(
      body.BrandManufacturerid
    );
  }

  if (body.ItemConditionid !== undefined) {
    data.ItemConditionid = normalizeString(
      body.ItemConditionid
    );
  }

  if (body.ApplicableFromDate !== undefined) {
    const result = validDate(
      body.ApplicableFromDate,
      "Applicable From Date"
    );

    if (result.error) {
      return { error: result.error };
    }

    data.ApplicableFromDate = result.value;
  }

  if (body.ApplicableToDate !== undefined) {
    const result = validDate(
      body.ApplicableToDate,
      "Applicable To Date"
    );

    if (result.error) {
      return { error: result.error };
    }

    data.ApplicableToDate = result.value;
  }

  if (body.Rate !== undefined) {
    const rate = Number(body.Rate);

    if (
      body.Rate === "" ||
      body.Rate === null ||
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      return {
        error: "Rate must be a valid non-negative number.",
      };
    }

    data.Rate = rate;
  }

  if (body.Unitid !== undefined) {
    data.Unitid = normalizeString(body.Unitid);
  }

  if (body.Comments !== undefined) {
    data.Comments =
      normalizeString(body.Comments) || null;
  }

  if (body.customFields !== undefined) {
    if (
      body.customFields !== null &&
      (typeof body.customFields !== "object" ||
        Array.isArray(body.customFields))
    ) {
      return {
        error: "Custom Fields must be a valid JSON object.",
      };
    }

    data.customFields = body.customFields;
  }

  return { data };
};

// ======================================================
// VALIDATE REQUIRED FIELDS
// ======================================================

const validateRequiredFields = (data) => {
  const requiredFields = [
    {
      key: "ItemGroupid",
      label: "Item Group",
    },
    {
      key: "ItemMasterid",
      label: "Item",
    },
    {
      key: "BrandManufacturerid",
      label: "Brand / Manufacturer",
    },
    {
      key: "ItemConditionid",
      label: "Item Condition",
    },
    {
      key: "ApplicableFromDate",
      label: "Applicable From Date",
    },
    {
      key: "Rate",
      label: "Rate",
    },
    {
      key: "Unitid",
      label: "Unit",
    },
  ];

  for (const field of requiredFields) {
    if (
      data[field.key] === undefined ||
      data[field.key] === null ||
      data[field.key] === ""
    ) {
      return `${field.label} is required.`;
    }
  }

  if (
    data.ApplicableFromDate &&
    data.ApplicableToDate &&
    data.ApplicableFromDate > data.ApplicableToDate
  ) {
    return "Applicable From Date cannot be after Applicable To Date.";
  }

  return null;
};

// ======================================================
// VALIDATE RELATED RECORDS
// ======================================================

const validateRelatedRecords = async (data) => {
  const checks = [
    {
      model: prisma.itemGroup,
      id: data.ItemGroupid,
      label: "Item Group",
    },
    {
      model: prisma.itemMaster,
      id: data.ItemMasterid,
      label: "Item",
    },
    {
      model: prisma.brandManufacturer,
      id: data.BrandManufacturerid,
      label: "Brand / Manufacturer",
    },
    {
      model: prisma.unit,
      id: data.Unitid,
      label: "Unit",
    },
  ];

  for (const check of checks) {
    if (!check.id) continue;

    const record = await check.model.findFirst({
      where: {
        id: check.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!record) {
      return `${check.label} is invalid or does not exist.`;
    }
  }

  return null;
};

// ======================================================
// BUILD GET FILTERS
// ======================================================

const getItemRateWhere = (searchParams, options = {}) => {
  const query =
    searchParams.get("query")?.trim() || "";

  const createdFrom =
    searchParams.get("createdFrom") || "";

  const createdTo =
    searchParams.get("createdTo") || "";

  const updatedFrom =
    searchParams.get("updatedFrom") || "";

  const updatedTo =
    searchParams.get("updatedTo") || "";

  const applicableFrom =
    searchParams.get("applicableFrom") || "";

  const applicableTo =
    searchParams.get("applicableTo") || "";

  const andConditions = [];

  // Global search
  if (query) {
    const searchConditions = [
      {
        Comments: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];

    if (options.searchGroupIds?.length) {
      searchConditions.push({
        ItemGroupid: {
          in: options.searchGroupIds,
        },
      });
    }

    if (options.searchItemIds?.length) {
      searchConditions.push({
        ItemMasterid: {
          in: options.searchItemIds,
        },
      });
    }

    if (options.searchBrandIds?.length) {
      searchConditions.push({
        BrandManufacturerid: {
          in: options.searchBrandIds,
        },
      });
    }

    if (options.searchUnitIds?.length) {
      searchConditions.push({
        Unitid: {
          in: options.searchUnitIds,
        },
      });
    }

    if (options.searchConditionIds?.length) {
      searchConditions.push({
        ItemConditionid: {
          in: options.searchConditionIds,
        },
      });
    }

    andConditions.push({
      OR: searchConditions,
    });
  }

  // Group filter
  if (options.groupIds?.length) {
    andConditions.push({
      ItemGroupid: {
        in: options.groupIds,
      },
    });
  }

  // Created by filter
  if (options.createdBy) {
    andConditions.push({
      createby: options.createdBy,
    });
  }

  // Updated by filter
  if (options.updatedBy) {
    andConditions.push({
      updateby: options.updatedBy,
    });
  }

  // Created date range
  const createdDate = getDateRange(
    createdFrom,
    createdTo
  );

  if (createdDate.error) {
    return { error: createdDate.error };
  }

  if (createdDate.range) {
    andConditions.push({
      createdAt: createdDate.range,
    });
  }

  // Updated date range
  const updatedDate = getDateRange(
    updatedFrom,
    updatedTo
  );

  if (updatedDate.error) {
    return { error: updatedDate.error };
  }

  if (updatedDate.range) {
    andConditions.push({
      updatedAt: updatedDate.range,
    });
  }

  // Applicable From date range
  const applicableDate = getDateRange(
    applicableFrom,
    applicableTo
  );

  if (applicableDate.error) {
    return { error: applicableDate.error };
  }

  if (applicableDate.range) {
    andConditions.push({
      ApplicableFromDate: applicableDate.range,
    });
  }

  return {
    where: {
      deletedAt: null,
      ...(andConditions.length
        ? { AND: andConditions }
        : {}),
    },
  };
};


/* ======================================================
   GET RELATED DISPLAY DATA
====================================================== */

const addRelatedDisplayData = async (items) => {
  if (!items.length) return [];

  const groupIds = [
    ...new Set(items.map((item) => item.ItemGroupid).filter(Boolean)),
  ];

  const itemIds = [
    ...new Set(items.map((item) => item.ItemMasterid).filter(Boolean)),
  ];

  const brandIds = [
    ...new Set(items.map((item) => item.BrandManufacturerid).filter(Boolean)),
  ];

  const userIds = [
    ...new Set(
      items
        .flatMap((item) => [item.createby, item.updateby])
        .filter(Boolean)
        .map(String)
    ),
  ];

  // Fetch Item Master with Item Condition and Unit IDs
  const [groups, itemMasters, brands, users] = await Promise.all([
    groupIds.length
      ? prisma.itemGroup.findMany({
        where: { id: { in: groupIds } },
        select: {
          id: true,
          groupName: true,
        },
      })
      : [],

    itemIds.length
      ? prisma.itemMaster.findMany({
        where: { id: { in: itemIds } },
        select: {
          id: true,
          ItemName: true,
          ItemConditionid: true,
          Unitid: true,
        },
      })
      : [],

    brandIds.length
      ? prisma.brandManufacturer.findMany({
        where: {
          id: { in: brandIds },
          deletedAt: null,
        },
        select: {
          id: true,
          brandName: true,
          manufacturerName: true,
        },
      })
      : [],

    userIds.length
      ? prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
        },
      })
      : [],
  ]);

  // Get Condition and Unit IDs from Item Master
  const conditionIds = [
    ...new Set(
      itemMasters.map((item) => item.ItemConditionid).filter(Boolean)
    ),
  ];

  const unitIds = [
    ...new Set(
      itemMasters.map((item) => item.Unitid).filter(Boolean)
    ),
  ];

  // Fetch Condition and Unit names
  const [conditions, units] = await Promise.all([
    conditionIds.length
      ? prisma.ptoductType.findMany({
        where: {
          id: { in: conditionIds },
          deletedAt: null,
        },
        select: {
          id: true,
          ProductType: true,
        },
      })
      : [],

    unitIds.length
      ? prisma.unit.findMany({
        where: {
          id: { in: unitIds },
          deletedAt: null,
        },
        select: {
          id: true,
          unitName: true,
          abbreviation: true,
        },
      })
      : [],
  ]);

  // Maps
  const groupMap = new Map(
    groups.map((item) => [
      String(item.id),
      item.groupName || "-",
    ])
  );

  const itemMasterMap = new Map(
    itemMasters.map((item) => [
      String(item.id),
      item,
    ])
  );

  const brandMap = new Map(
    brands.map((item) => {
      const brandName = item.brandName || "";
      const manufacturerName = item.manufacturerName || "";

      const displayName =
        brandName &&
          manufacturerName &&
          brandName.toLowerCase() !== manufacturerName.toLowerCase()
          ? `${brandName} - ${manufacturerName}`
          : brandName || manufacturerName || "-";

      return [String(item.id), displayName];
    })
  );

  const conditionMap = new Map(
    conditions.map((item) => [
      String(item.id),
      item.ProductType || "-",
    ])
  );

  const unitMap = new Map(
    units.map((item) => [
      String(item.id),
      `${item.unitName || "-"}${item.abbreviation ? ` (${item.abbreviation})` : ""
      }`,
    ])
  );

  const userMap = new Map(
    users.map((user) => [
      String(user.id),
      user.name || "-",
    ])
  );

  return items.map((item) => {
    const master = itemMasterMap.get(String(item.ItemMasterid || ""));

    return {
      ...item,

      GroupName:
        groupMap.get(String(item.ItemGroupid || "")) || "-",

      ItemMasterName:
        master?.ItemName || "-",

      BrandManufacturerName:
        brandMap.get(String(item.BrandManufacturerid || "")) || "-",

      // Condition comes from Item Master
      ItemConditionName: master
        ? conditionMap.get(String(master.ItemConditionid || "")) || "-"
        : "-",

      // Unit comes from Item Master
      UnitName: master
        ? unitMap.get(String(master.Unitid || "")) || "-"
        : "-",

      createdByName:
        userMap.get(String(item.createby || "")) || "-",

      updatedByName:
        userMap.get(String(item.updateby || "")) || "-",
    };
  });
};

/* ======================================================
   GET ITEM RATE LIST
====================================================== */

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10",
      10
    );

    const limit = Math.min(
      10000,
      Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10)
    );

    // Sorting
    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const sortField = ALLOWED_SORT_FIELDS.includes(sort)
      ? sort
      : "createdAt";

    // Search and filters
    const query = searchParams.get("query")?.trim() || "";

    const groupIds = [
      ...new Set(
        (searchParams.get("groupIds") || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ];

    const createdBy = searchParams.get("createdBy")?.trim() || "";
    const updatedBy = searchParams.get("updatedBy")?.trim() || "";

    // Global search lookup
    const [groups, itemMasters, brands, units, conditions] =
      await Promise.all([
        query
          ? prisma.itemGroup.findMany({
            where: {
              deletedAt: null,
              groupName: {
                contains: query,
                mode: "insensitive",
              },
            },
            select: { id: true },
          })
          : [],

        query
          ? prisma.itemMaster.findMany({
            where: {
              deletedAt: null,
              ItemName: {
                contains: query,
                mode: "insensitive",
              },
            },
            select: { id: true },
          })
          : [],

        query
          ? prisma.brandManufacturer.findMany({
            where: {
              deletedAt: null,
              OR: [
                {
                  brandName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  manufacturerName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: { id: true },
          })
          : [],

        query
          ? prisma.unit.findMany({
            where: {
              deletedAt: null,
              OR: [
                {
                  unitName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
                {
                  abbreviation: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              ],
            },
            select: { id: true },
          })
          : [],

        query
          ? prisma.ptoductType.findMany({
            where: {
              deletedAt: null,
              ProductType: {
                contains: query,
                mode: "insensitive",
              },
            },
            select: { id: true },
          })
          : [],
      ]);

    const searchGroupIds = groups.map((item) => item.id);
    const searchItemIds = itemMasters.map((item) => item.id);
    const searchBrandIds = brands.map((item) => item.id);
    const searchUnitIds = units.map((item) => item.id);
    const searchConditionIds = conditions.map((item) => item.id);

    // Build filters
    const filterResult = getItemRateWhere(searchParams, {
      groupIds,
      createdBy,
      updatedBy,
      searchGroupIds,
      searchItemIds,
      searchBrandIds,
      searchUnitIds,
      searchConditionIds,
    });

    if (filterResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: filterResult.error,
        },
        { status: 400 }
      );
    }

    const where = filterResult.where;

    // Fetch Item Rates
    const [total, itemRates] = await Promise.all([
      prisma.itemRates.count({ where }),

      prisma.itemRates.findMany({
        where,
        orderBy: {
          [sortField]: dir,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Add related display names
    const data = await addRelatedDisplayData(itemRates);

    return NextResponse.json({
      success: true,
      message: "Item Rates fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("ITEM RATE GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Item Rates.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// CREATE ITEM RATE
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);

    if (accessError) return accessError;

    const user = await getAuthenticatedUser();

    if (!user) return unauthorized();

    const body = await request.json();

    const buildResult = buildItemRateData(body);

    if (buildResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: buildResult.error,
        },
        { status: 400 }
      );
    }

    const data = buildResult.data;

    const requiredError = validateRequiredFields(data);

    if (requiredError) {
      return NextResponse.json(
        {
          success: false,
          message: requiredError,
        },
        { status: 400 }
      );
    }

    const relationError =
      await validateRelatedRecords(data);

    if (relationError) {
      return NextResponse.json(
        {
          success: false,
          message: relationError,
        },
        { status: 400 }
      );
    }
    // ======================================================
    // VALIDATE OVERLAPPING ITEM RATE DATE
    // ======================================================

    const fromDate = new Date(
      `${String(data.ApplicableFromDate).slice(0, 10)}T00:00:00.000Z`
    );

    const toDate = data.ApplicableToDate
      ? new Date(
        `${String(data.ApplicableToDate).slice(0, 10)}T00:00:00.000Z`
      )
      : null;

    // Validate date range
    if (toDate && toDate < fromDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Applicable To Date must be after Applicable From Date.",
        },
        { status: 400 }
      );
    }

    // Find existing rates for the same Item, Brand, Condition and Unit
    const fromTimestamp = getDateOnly(data.ApplicableFromDate);

    const toTimestamp = data.ApplicableToDate
      ? getDateOnly(data.ApplicableToDate)
      : null;

    // Validate date values
    if (
      fromTimestamp === null ||
      (data.ApplicableToDate && toTimestamp === null)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Applicable From Date or Applicable To Date.",
        },
        { status: 400 }
      );
    }

    // Validate date range
    if (toTimestamp !== null && toTimestamp < fromTimestamp) {
      return NextResponse.json(
        {
          success: false,
          message: "Applicable To Date must be after Applicable From Date.",
        },
        { status: 400 }
      );
    }

    // ======================================================
    // FIND EXISTING RATES
    // ======================================================

    const existingRates = await prisma.itemRates.findMany({
      where: {
        ItemMasterid: data.ItemMasterid,
        BrandManufacturerid: data.BrandManufacturerid,
        ItemConditionid: data.ItemConditionid,
        Unitid: data.Unitid,
        deletedAt: null,
      },
      select: {
        id: true,
        ApplicableFromDate: true,
        ApplicableToDate: true,
      },
    });

    // ======================================================
    // CHECK COMPLETE DATE RANGE OVERLAP
    // ======================================================

    // Find the latest previous rate that overlaps the new start date.
    // This rate will automatically be closed inside the transaction.
    const previousRateToClose = existingRates
      .filter((rate) => {
        const existingFrom = getDateOnly(rate.ApplicableFromDate);
        const existingTo = rate.ApplicableToDate
          ? getDateOnly(rate.ApplicableToDate)
          : null;

        return (
          existingFrom !== null &&
          existingFrom < fromTimestamp &&
          (existingTo === null || existingTo >= fromTimestamp)
        );
      })
      .sort(
        (a, b) =>
          getDateOnly(b.ApplicableFromDate) -
          getDateOnly(a.ApplicableFromDate)
      )[0];

    // Check overlap with all other rates.
    // The previous overlapping rate is excluded because it will be closed.
    const conflictingRate = existingRates.find((rate) => {
      if (previousRateToClose?.id === rate.id) {
        return false;
      }

      const existingFrom = getDateOnly(rate.ApplicableFromDate);

      const existingTo = rate.ApplicableToDate
        ? getDateOnly(rate.ApplicableToDate)
        : null;

      if (existingFrom === null) return false;

      const newEnd = toTimestamp ?? Infinity;
      const existingEnd = existingTo ?? Infinity;

      return (
        fromTimestamp <= existingEnd &&
        newEnd >= existingFrom
      );
    });

    if (conflictingRate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This date range overlaps with an existing Item Rate. Please select another date range.",
        },
        { status: 400 }
      );
    }
    // Create Item Rate
    const itemRate = await prisma.$transaction(async (tx) => {
      const fromDate = new Date(
        `${data.ApplicableFromDate.toISOString
          ? data.ApplicableFromDate.toISOString().slice(0, 10)
          : String(data.ApplicableFromDate).slice(0, 10)}T00:00:00.000Z`,
      );

      const previousDay = new Date(fromDate);
      previousDay.setUTCDate(previousDay.getUTCDate() - 1);

      const matchingRates = await tx.itemRates.findMany({
        where: {
          ItemMasterid: data.ItemMasterid,
          BrandManufacturerid: data.BrandManufacturerid,
          ItemConditionid: data.ItemConditionid,
          Unitid: data.Unitid,
          deletedAt: null,
        },
        orderBy: {
          ApplicableFromDate: "asc",
        },
      });

      // Find the closest previous rate.
      const previousRate = matchingRates
        .filter((rate) => {
          const existingFrom = getDateOnly(rate.ApplicableFromDate);
          const existingTo = rate.ApplicableToDate
            ? getDateOnly(rate.ApplicableToDate)
            : null;

          return (
            existingFrom !== null &&
            existingFrom < getDateOnly(fromDate) &&
            (existingTo === null ||
              existingTo >= getDateOnly(fromDate))
          );
        })
        .sort(
          (a, b) =>
            getDateOnly(b.ApplicableFromDate) -
            getDateOnly(a.ApplicableFromDate)
        )[0];

      // Find the closest future rate.
      const nextRate = matchingRates
        .filter(
          (rate) =>
            new Date(rate.ApplicableFromDate).getTime() >
            fromDate.getTime(),
        )
        .sort(
          (a, b) =>
            new Date(a.ApplicableFromDate).getTime() -
            new Date(b.ApplicableFromDate).getTime(),
        )[0];

      // Automatically close the previous rate.
      if (previousRate) {
        await tx.itemRates.update({
          where: {
            id: previousRate.id,
          },
          data: {
            ApplicableToDate: previousDay,
            updateby: String(user.id),
            lastSyncAt: new Date(),
          },
        });
      }

      // If a future rate already exists, close this new rate
      // one day before that future rate begins.
      let applicableToDate = data.ApplicableToDate;

      if (nextRate) {
        const nextDay = new Date(nextRate.ApplicableFromDate);
        nextDay.setUTCDate(nextDay.getUTCDate() - 1);

        if (
          !applicableToDate ||
          new Date(applicableToDate).getTime() > nextDay.getTime()
        ) {
          applicableToDate = nextDay;
        }
      }

      // Create the new rate.
      return tx.itemRates.create({
        data: {
          ...data,
          ApplicableToDate: applicableToDate,
          createby: String(user.id),
          updateby: String(user.id),
          lastSyncAt: new Date(),
        },
      });
    });

    // Add display information for response
    const [formattedItemRate] =
      await addRelatedDisplayData([itemRate]);

    // System log
    await logItemRate({
      request,
      event: "create",
      itemRate: formattedItemRate,
      user,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Item Rate created successfully.",
        data: formattedItemRate,
        sync: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ITEM RATE CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to create Item Rate.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// UPDATE ITEM RATE
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);

    if (accessError) return accessError;

    const user = await getAuthenticatedUser();

    if (!user) return unauthorized();

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Rate ID is required.",
        },
        { status: 400 }
      );
    }

    const existingItemRate =
      await prisma.itemRates.findFirst({
        where: {
          id: String(body.id),
          deletedAt: null,
        },
      });

    if (!existingItemRate) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Rate not found.",
        },
        { status: 404 }
      );
    }

    const buildResult = buildItemRateData(body);

    if (buildResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: buildResult.error,
        },
        { status: 400 }
      );
    }

    const updateData = buildResult.data;

    // Merge existing and incoming fields for validation
    const finalData = {
      ItemGroupid:
        updateData.ItemGroupid ??
        existingItemRate.ItemGroupid,

      ItemMasterid:
        updateData.ItemMasterid ??
        existingItemRate.ItemMasterid,

      BrandManufacturerid:
        updateData.BrandManufacturerid ??
        existingItemRate.BrandManufacturerid,

      ItemConditionid:
        updateData.ItemConditionid ??
        existingItemRate.ItemConditionid,

      ApplicableFromDate:
        updateData.ApplicableFromDate ??
        existingItemRate.ApplicableFromDate,

      ApplicableToDate:
        updateData.ApplicableToDate !== undefined
          ? updateData.ApplicableToDate
          : existingItemRate.ApplicableToDate,

      Rate:
        updateData.Rate ??
        existingItemRate.Rate,

      Unitid:
        updateData.Unitid ??
        existingItemRate.Unitid,
    };

    const requiredError =
      validateRequiredFields(finalData);

    if (requiredError) {
      return NextResponse.json(
        {
          success: false,
          message: requiredError,
        },
        { status: 400 }
      );
    }

    const relationError =
      await validateRelatedRecords(finalData);

    if (relationError) {
      return NextResponse.json(
        {
          success: false,
          message: relationError,
        },
        { status: 400 }
      );
    }
    // Validate Applicable From and To dates
    // ======================================================
    // VALIDATE ITEM RATE DATE RANGE
    // ======================================================

    const fromTimestamp = getDateOnly(finalData.ApplicableFromDate);

    const toTimestamp = finalData.ApplicableToDate
      ? getDateOnly(finalData.ApplicableToDate)
      : null;

    // Validate dates
    if (
      fromTimestamp === null ||
      (finalData.ApplicableToDate && toTimestamp === null)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Applicable From Date or Applicable To Date.",
        },
        { status: 400 }
      );
    }

    // Validate date range
    if (toTimestamp !== null && toTimestamp < fromTimestamp) {
      return NextResponse.json(
        {
          success: false,
          message: "Applicable To Date must be after Applicable From Date.",
        },
        { status: 400 }
      );
    }

    // ======================================================
    // FIND EXISTING RATES
    // ======================================================

    const existingRates = await prisma.itemRates.findMany({
      where: {
        id: {
          not: existingItemRate.id,
        },
        ItemMasterid: finalData.ItemMasterid,
        BrandManufacturerid: finalData.BrandManufacturerid,
        ItemConditionid: finalData.ItemConditionid,
        Unitid: finalData.Unitid,
        deletedAt: null,
      },
      select: {
        id: true,
        ApplicableFromDate: true,
        ApplicableToDate: true,
      },
    });

    // ======================================================
    // CHECK DATE RANGE OVERLAP
    // ======================================================

    const previousRateToClose = existingRates
      .filter((rate) => {
        const existingFrom = getDateOnly(rate.ApplicableFromDate);

        const existingTo = rate.ApplicableToDate
          ? getDateOnly(rate.ApplicableToDate)
          : null;

        return (
          existingFrom !== null &&
          existingFrom < fromTimestamp &&
          (existingTo === null || existingTo >= fromTimestamp)
        );
      })
      .sort(
        (a, b) =>
          getDateOnly(b.ApplicableFromDate) -
          getDateOnly(a.ApplicableFromDate)
      )[0];

    const conflictingRate = existingRates.find((rate) => {
      if (previousRateToClose?.id === rate.id) {
        return false;
      }

      const existingFrom = getDateOnly(rate.ApplicableFromDate);

      const existingTo = rate.ApplicableToDate
        ? getDateOnly(rate.ApplicableToDate)
        : null;

      if (existingFrom === null) return false;

      const newEnd = toTimestamp ?? Infinity;
      const existingEnd = existingTo ?? Infinity;

      return (
        fromTimestamp <= existingEnd &&
        newEnd >= existingFrom
      );
    });

    if (conflictingRate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This date range overlaps with an existing Item Rate. Please select another date range.",
        },
        { status: 400 }
      );
    }
    const updatedItemRate = await prisma.$transaction(async (tx) => {
      // Close the previous rate if the new start date overlaps it.
      if (previousRateToClose) {
        const previousDay = new Date(fromTimestamp);

        previousDay.setUTCDate(previousDay.getUTCDate() - 1);

        await tx.itemRates.update({
          where: {
            id: previousRateToClose.id,
          },
          data: {
            ApplicableToDate: previousDay,
            updateby: String(user.id),
            lastSyncAt: new Date(),
          },
        });
      }

      // Find the next future rate.
      const nextRate = await tx.itemRates.findFirst({
        where: {
          id: {
            not: existingItemRate.id,
          },
          ItemMasterid: finalData.ItemMasterid,
          BrandManufacturerid: finalData.BrandManufacturerid,
          ItemConditionid: finalData.ItemConditionid,
          Unitid: finalData.Unitid,
          deletedAt: null,
          ApplicableFromDate: {
            gt: new Date(fromTimestamp),
          },
        },
        orderBy: {
          ApplicableFromDate: "asc",
        },
      });

      let applicableToDate = finalData.ApplicableToDate;

      // Close the updated rate one day before the next rate.
      if (nextRate) {
        const nextDay = new Date(nextRate.ApplicableFromDate);

        nextDay.setUTCDate(nextDay.getUTCDate() - 1);

        if (
          !applicableToDate ||
          getDateOnly(applicableToDate) > getDateOnly(nextDay)
        ) {
          applicableToDate = nextDay;
        }
      }

      return tx.itemRates.update({
        where: {
          id: existingItemRate.id,
        },
        data: {
          ...updateData,
          ApplicableToDate: applicableToDate,
          updateby: String(user.id),
          lastSyncAt: new Date(),
        },
      });
    });

    const [formattedItemRate] =
      await addRelatedDisplayData([updatedItemRate]);

    // System log
    await logItemRate({
      request,
      event: "update",
      itemRate: formattedItemRate,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item Rate updated successfully.",
      data: formattedItemRate,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM RATE UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to update Item Rate.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// PATCH
// ItemRates has no status field.
// ======================================================

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      message:
        "PATCH status updates are not supported for Item Rates.",
    },
    { status: 405 }
  );
}

// ======================================================
// DELETE ITEM RATE - SOFT DELETE
// Supports { id } and { ids: [] }
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);

    if (accessError) return accessError;

    const user = await getAuthenticatedUser();

    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);

    const body = await request.json().catch(() => ({}));

    const rawIds = Array.isArray(body.ids)
      ? body.ids
      : body.id
        ? [body.id]
        : searchParams.get("ids")
          ? searchParams.get("ids").split(",")
          : searchParams.get("id")
            ? [searchParams.get("id")]
            : [];

    const ids = normalizeIds({ ids: rawIds });

    if (ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide at least one valid Item Rate ID.",
        },
        { status: 400 }
      );
    }

    const existingItemRates =
      await prisma.itemRates.findMany({
        where: {
          id: {
            in: ids,
          },
          deletedAt: null,
        },
      });

    if (existingItemRates.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active Item Rates found to delete.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const existingIds = existingItemRates.map(
      (item) => item.id
    );

    // Soft delete transaction
    await prisma.$transaction(async (tx) => {
      await tx.itemRates.updateMany({
        where: {
          id: {
            in: existingIds,
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

    const deletedItemRates = existingItemRates.map(
      (item) => ({
        ...item,
        deletedAt: now,
        updateby: String(user.id),
        lastSyncAt: now,
      })
    );

    const formattedDeletedRates =
      await addRelatedDisplayData(deletedItemRates);

    // System logs
    await Promise.all(
      formattedDeletedRates.map((itemRate) =>
        logItemRate({
          request,
          event: "delete",
          itemRate,
          user,
        })
      )
    );

    return NextResponse.json({
      success: true,
      message:
        deletedItemRates.length === 1
          ? "Item Rate deleted successfully."
          : `${deletedItemRates.length} Item Rates deleted successfully.`,
      data: formattedDeletedRates,
      count: deletedItemRates.length,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM RATE DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to delete Item Rates.",
      },
      { status: 500 }
    );
  }
}