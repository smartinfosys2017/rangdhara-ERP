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

// ======================================================
// GET RELATED DISPLAY DATA
// ======================================================

const addRelatedDisplayData = async (items) => {
  if (!items.length) return [];

  const groupIds = [
    ...new Set(items.map((item) => item.ItemGroupid).filter(Boolean)),
  ];

  const itemIds = [
    ...new Set(items.map((item) => item.ItemMasterid).filter(Boolean)),
  ];

  const brandIds = [
    ...new Set(
      items
        .map((item) => item.BrandManufacturerid)
        .filter(Boolean)
    ),
  ];

  const unitIds = [
    ...new Set(items.map((item) => item.Unitid).filter(Boolean)),
  ];

  const conditionIds = [
    ...new Set(
      items.map((item) => item.ItemConditionid).filter(Boolean)
    ),
  ];

  const userIds = [
    ...new Set(
      items
        .flatMap((item) => [item.createby, item.updateby])
        .filter(Boolean)
        .map(String)
    ),
  ];

  const [
    groups,
    itemMasters,
    brands,
    units,
    users,
  ] = await Promise.all([
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
        },
      })
      : [],

    brandIds.length
      ? prisma.brandManufacturer.findMany({
        where: {
          id: {
            in: brandIds,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          brandName: true,
          manufacturerName: true,
        },
      })
      : [],

    unitIds.length
      ? prisma.unit.findMany({
        where: { id: { in: unitIds } },
        select: {
          id: true,
          unitName: true,
          abbreviation: true,
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

  const groupMap = new Map(
    groups.map((item) => [
      String(item.id),
      item.groupName || "-",
    ])
  );

  const itemMap = new Map(
    itemMasters.map((item) => [
      String(item.id),
      item.ItemName || "-",
    ])
  );

  const brandMap = new Map(
    brands.map((item) => [
      String(item.id),
      item.BrandManufacturerName || "-",
    ])
  );

  const unitMap = new Map(
    units.map((item) => [
      String(item.id),
      {
        unitName: item.unitName || "-",
        abbreviation: item.abbreviation || "",
      },
    ])
  );

  const userMap = new Map(
    users.map((user) => [
      String(user.id),
      user.name || "-",
    ])
  );

  // ItemCondition relation model name was not supplied.
  // Its ID is returned as-is until its actual model/delegate is confirmed.

  return items.map((item) => {
    const unit = unitMap.get(String(item.Unitid));

    return {
      ...item,

      GroupName:
        groupMap.get(String(item.ItemGroupid)) || "-",

      ItemMasterName:
        itemMap.get(String(item.ItemMasterid)) || "-",

      BrandManufacturerName:
        brandMap.get(String(item.BrandManufacturerid)) || "-",

      ItemConditionName: String(
        item.ItemConditionid || "-"
      ),

      UnitName: unit
        ? `${unit.unitName}${unit.abbreviation
          ? ` (${unit.abbreviation})`
          : ""
        }`
        : "-",

      createdByName:
        userMap.get(String(item.createby || "")) || "-",

      updatedByName:
        userMap.get(String(item.updateby || "")) || "-",
    };
  });
};

// ======================================================
// GET ITEM RATE LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(
      1,
      Number.parseInt(
        searchParams.get("page") || "1",
        10
      ) || 1
    );

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10",
      10
    );

    const limit = Math.min(
      10000,
      Math.max(
        1,
        Number.isFinite(requestedLimit)
          ? requestedLimit
          : 10
      )
    );

    // Sorting
    const sort = searchParams.get("sort") || "createdAt";

    const dir =
      searchParams.get("dir") === "asc"
        ? "asc"
        : "desc";

    const sortField = ALLOWED_SORT_FIELDS.includes(sort)
      ? sort
      : "createdAt";

    // Search and filters
    const query =
      searchParams.get("query")?.trim() || "";

    const groupIds = [
      ...new Set(
        (searchParams.get("groupIds") || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      ),
    ];

    const createdBy =
      searchParams.get("createdBy")?.trim() || "";

    const updatedBy =
      searchParams.get("updatedBy")?.trim() || "";

    // Lookup records for global search
    const [
      groups,
      itemMasters,
      brands,
      units,
    ] = await Promise.all([
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
    ]);

    const searchGroupIds = groups.map((item) => item.id);
    const searchItemIds = itemMasters.map((item) => item.id);
    const searchBrandIds = brands.map((item) => item.id);
    const searchUnitIds = units.map((item) => item.id);

    const filterResult = getItemRateWhere(
      searchParams,
      {
        groupIds,
        createdBy,
        updatedBy,
        searchGroupIds,
        searchItemIds,
        searchBrandIds,
        searchUnitIds,
      }
    );

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
        message:
          error.message || "Failed to fetch Item Rates.",
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
        .filter(
          (rate) =>
            new Date(rate.ApplicableFromDate).getTime() <
            fromDate.getTime(),
        )
        .sort(
          (a, b) =>
            new Date(b.ApplicableFromDate).getTime() -
            new Date(a.ApplicableFromDate).getTime(),
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

    const updatedItemRate =
      await prisma.itemRates.update({
        where: {
          id: existingItemRate.id,
        },
        data: {
          ...updateData,
          updateby: String(user.id),
          lastSyncAt: new Date(),
        },
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