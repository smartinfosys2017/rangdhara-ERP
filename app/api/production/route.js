
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

const isValidId = (value) =>
  typeof value === "string" && value.trim().length > 0;

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

// ======================================================
// PRODUCTION DATE RANGE
// ======================================================

const getProductionDayRange = (value) => {
  const date = parseDate(value);

  if (!date) return null;

  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

// ======================================================
// DUPLICATE PRODUCTION VALIDATION
// Same item cannot have multiple production records
// on the same date.
// ======================================================

const DUPLICATE_PRODUCTION_MESSAGE =
  "This item is already added for this date. Please select another date or item.";

const findDuplicateProduction = async ({
  productionDate,
  itemId,
  excludeId = null,
}) => {
  if (!productionDate || !itemId) {
    return null;
  }

  const range = getProductionDayRange(productionDate);

  if (!range) {
    return null;
  }

  return prisma.production.findFirst({
    where: {
      itemId: String(itemId),
      deletedAt: null,

      productionDate: {
        gte: range.start,
        lt: range.end,
      },

      ...(excludeId
        ? {
            id: {
              not: String(excludeId),
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });
};

// ======================================================
// DATE VALIDATION
// ======================================================

const validDate = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getDateRange = (from, to) => {
  const start = validDate(from);
  const end = validDate(to);

  if ((from && !start) || (to && !end)) {
    return { error: "Invalid date filter." };
  }

  if (start && end && start > end) {
    return {
      error: "The From date cannot be after the To date.",
    };
  }

  return {
    range:
      start || end
        ? {
            ...(start ? { gte: start } : {}),
            ...(end
              ? {
                  lt: new Date(
                    end.getTime() + 24 * 60 * 60 * 1000
                  ),
                }
              : {}),
          }
        : undefined,
  };
};

// ======================================================
// PRODUCTION FILTERS
// ======================================================

const getProductionWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const createdBy = searchParams.get("createdBy") || "";
  const updatedBy = searchParams.get("updatedBy") || "";

  const productionRange = getDateRange(
    searchParams.get("productionFrom"),
    searchParams.get("productionTo")
  );

  const createdRange = getDateRange(
    searchParams.get("createdFrom"),
    searchParams.get("createdTo")
  );

  const updatedRange = getDateRange(
    searchParams.get("updatedFrom"),
    searchParams.get("updatedTo")
  );

  if (
    productionRange.error ||
    createdRange.error ||
    updatedRange.error
  ) {
    return {
      error:
        productionRange.error ||
        createdRange.error ||
        updatedRange.error,
    };
  }

  const shiftId = searchParams.get("shiftId") || "";
  const machineId = searchParams.get("machineId") || "";
  const itemId = searchParams.get("itemId") || "";

  return {
    where: {
      deletedAt: null,

      ...(query
        ? {
            OR: [
              {
                remarks: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                item: {
                  is: {
                    ItemName: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                item: {
                  is: {
                    SKU: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                machine: {
                  is: {
                    machineName: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                shift: {
                  is: {
                    name: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
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

      ...(shiftId ? { shiftId } : {}),
      ...(machineId ? { machineId } : {}),
      ...(itemId ? { itemId } : {}),

      ...(productionRange.range
        ? { productionDate: productionRange.range }
        : {}),

      ...(createdRange.range
        ? { createdAt: createdRange.range }
        : {}),

      ...(updatedRange.range
        ? { updatedAt: updatedRange.range }
        : {}),

      ...(createdBy ? { createby: createdBy } : {}),
      ...(updatedBy ? { updateby: updatedBy } : {}),
    },
  };
};

// ======================================================
// VALIDATIONS
// ======================================================

const validateCustomFields = (customFields) =>
  customFields !== null &&
  typeof customFields === "object" &&
  !Array.isArray(customFields);

const validateQuantity = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0;

// ======================================================
// PRISMA SELECT
// Production.unitId does not exist.
// ======================================================

const productionSelect = {
  id: true,
  productionDate: true,
  shiftId: true,
  machineId: true,
  itemId: true,
  productionQuantity: true,
  remarks: true,
  customFields: true,
  status: true,
  createby: true,
  updateby: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  lastSyncAt: true,

  shift: {
    select: {
      id: true,
      name: true,
      inTime: true,
      outTime: true,
    },
  },

  machine: {
    select: {
      id: true,
      machineName: true,
      machineCode: true,
      machineNumber: true,
    },
  },

  item: {
    select: {
      id: true,
      ItemName: true,
      SKU: true,
      Unitid: true,
    },
  },
};

// ======================================================
// ATTACH UNIT DETAILS TO ITEM
// Unit comes from ItemMaster.Unitid.
// ======================================================

const attachItemUnit = async (productions) => {
  const isArray = Array.isArray(productions);

  const records = isArray
    ? productions
    : productions
      ? [productions]
      : [];

  if (!records.length) {
    return isArray ? [] : null;
  }

  const unitIds = [
    ...new Set(
      records
        .map((production) => production.item?.Unitid)
        .filter(Boolean)
        .map(String)
    ),
  ];

  const units = unitIds.length
    ? await prisma.unit.findMany({
        where: {
          id: {
            in: unitIds,
          },
        },
        select: {
          id: true,
          unitName: true,
          abbreviation: true,
        },
      })
    : [];

  const unitMap = new Map(
    units.map((unit) => [String(unit.id), unit])
  );

  const result = records.map((production) => {
    if (!production.item) {
      return production;
    }

    return {
      ...production,
      item: {
        ...production.item,
        unit:
          unitMap.get(String(production.item.Unitid)) || null,
      },
    };
  });

  return isArray ? result : result[0];
};

// ======================================================
// SYSTEM LOG
// ======================================================

const logProduction = async ({
  request,
  event,
  production,
  user,
}) => {
  if (!production || !user?.id) return;

  try {
    await systemLog({
      event,
      userId: String(user.id),
      entityId: String(production.id),
      entityType: "inventory.production",
      description: `Production ${
        event === "create"
          ? "created"
          : event === "update"
            ? "updated"
            : "deleted"
      }: ${production.item?.ItemName || production.id}`,
      ipAddress: getClientIp(request),
    });
  } catch (error) {
    console.error(
      "PRODUCTION LOG ERROR (ignored):",
      error.message
    );
  }
};

// ======================================================
// REFERENCE VALIDATION
// ======================================================

const findActive = async (model, id) => {
  try {
    return await model.findFirst({
      where: {
        id,
        status: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    console.warn("REFERENCE CHECK FALLBACK:", error.message);

    return model.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });
  }
};

const validateReferences = async (
  { shiftId, machineId, itemId },
  only = null
) => {
  const shouldCheck = (field) => !only || only.includes(field);

  if (
    shiftId &&
    shouldCheck("shiftId") &&
    !(await findActive(prisma.shift, shiftId))
  ) {
    return "Selected shift was not found or is inactive.";
  }

  if (
    machineId &&
    shouldCheck("machineId") &&
    !(await findActive(prisma.machineMaster, machineId))
  ) {
    return "Selected machine was not found or is inactive.";
  }

  if (
    itemId &&
    shouldCheck("itemId") &&
    !(await findActive(prisma.itemMaster, itemId))
  ) {
    return "Selected item was not found or is inactive.";
  }

  return null;
};

// ======================================================
// GET PRODUCTION LIST / SINGLE PRODUCTION
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("production");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type");

    // ======================================================
    // CHECK DUPLICATE PRODUCTION
    // GET /api/production?type=check-duplicate
    // ======================================================

    if (type === "check-duplicate") {
      const productionDate = searchParams.get("productionDate");
      const itemId = searchParams.get("itemId");
      const excludeId = searchParams.get("excludeId");

      if (!productionDate || !itemId) {
        return fail("Production date and item are required.");
      }

      if (!parseDate(productionDate)) {
        return fail("A valid production date is required.");
      }

      const duplicate = await findDuplicateProduction({
        productionDate,
        itemId,
        excludeId,
      });

      return NextResponse.json({
        success: true,
        isDuplicate: Boolean(duplicate),
        message: duplicate
          ? DUPLICATE_PRODUCTION_MESSAGE
          : "No duplicate production found.",
      });
    }

    // ======================================================
    // PRODUCTION DROPDOWN DATA
    // GET /api/production?type=dropdowns
    // ======================================================

    if (type === "dropdowns") {
      const [items, machines, units] = await Promise.all([
        prisma.itemMaster.findMany({
          where: {
            deletedAt: null,
            status: true,
          },
          select: {
            id: true,
            ItemName: true,
            SKU: true,
            Unitid: true,
          },
          orderBy: {
            ItemName: "asc",
          },
        }),

        prisma.machineMaster.findMany({
          where: {
            deletedAt: null,
            status: true,
          },
          select: {
            id: true,
            machineName: true,
            machineCode: true,
            machineNumber: true,
          },
          orderBy: {
            machineName: "asc",
          },
        }),

        prisma.unit.findMany({
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
            unitName: true,
            abbreviation: true,
          },
          orderBy: {
            unitName: "asc",
          },
        }),
      ]);

      const unitMap = new Map(
        units.map((unit) => [String(unit.id), unit])
      );

      const itemsWithUnits = items.map((item) => ({
        ...item,
        unit: unitMap.get(String(item.Unitid)) || null,
      }));

      return NextResponse.json({
        success: true,
        message: "Production dropdowns fetched successfully.",
        data: {
          items: itemsWithUnits,
          machines,
          units,
        },
      });
    }

    const id = searchParams.get("id");

    // ======================================================
    // SINGLE PRODUCTION
    // ======================================================

    if (id) {
      let production = await prisma.production.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: productionSelect,
      });

      if (!production) {
        return fail("Production not found.", 404);
      }

      production = await attachItemUnit(production);

      const userIds = [
        ...new Set(
          [production.createby, production.updateby].filter(Boolean)
        ),
      ];

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

      const userMap = new Map(
        users.map((user) => [
          String(user.id),
          user.name || "-",
        ])
      );

      return NextResponse.json({
        success: true,
        message: "Production fetched successfully.",
        data: {
          ...production,
          createdByName:
            userMap.get(String(production.createby)) || "-",
          updatedByName:
            userMap.get(String(production.updateby)) || "-",
        },
      });
    }

    // ======================================================
    // PAGINATION
    // ======================================================

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
      Math.max(
        1,
        Number.isFinite(requestedLimit) ? requestedLimit : 10
      )
    );

    // ======================================================
    // SORTING
    // ======================================================

    const sort = searchParams.get("sort") || "createdAt";
    const dir =
      searchParams.get("dir") === "asc" ? "asc" : "desc";

    const allowedSortFields = [
      "id",
      "productionDate",
      "shiftName",
      "machineName",
      "itemName",
      "productionQuantity",
      "remarks",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getProductionWhere(searchParams);

    if (filterResult.error) {
      return fail(filterResult.error, 400);
    }

    const where = filterResult.where;

    const [total, productions] = await Promise.all([
      prisma.production.count({ where }),

      prisma.production.findMany({
        where,
        select: productionSelect,
        orderBy: {
          [sortField]: dir,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const productionsWithUnits = await attachItemUnit(productions);

    // ======================================================
    // FETCH USERS
    // ======================================================

    const userIds = [
      ...new Set(
        productionsWithUnits
          .flatMap((item) => [item.createby, item.updateby])
          .filter(Boolean)
          .map(String)
      ),
    ];

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

    const userMap = new Map(
      users.map((user) => [
        String(user.id),
        user.name || "-",
      ])
    );

    const data = productionsWithUnits.map((item) => ({
      ...item,
      createdByName: userMap.get(String(item.createby)) || "-",
      updatedByName: userMap.get(String(item.updateby)) || "-",
    }));

    return NextResponse.json({
      success: true,
      message: "Productions fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("PRODUCTION LIST ERROR", error);

    return fail(
      error.message || "Failed to fetch productions.",
      500
    );
  }
}

// ======================================================
// CREATE PRODUCTION
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("production");

    if (accessError) return accessError;

    const body = await request.json();

    const productionQuantity = body.productionQuantity ?? 0;

    if (!validateQuantity(productionQuantity)) {
      return fail("A valid production quantity is required.");
    }

    if (
      body.status !== undefined &&
      typeof body.status !== "boolean"
    ) {
      return fail("A valid status (true or false) is required.");
    }

    const shiftId = body.shiftId
      ? String(body.shiftId).trim()
      : null;

    const machineId = body.machineId
      ? String(body.machineId).trim()
      : null;

    const itemId = body.itemId
      ? String(body.itemId).trim()
      : null;

    // ITEM IS REQUIRED
    if (!itemId) {
      return fail("Please select an item.");
    }

    for (const [label, value] of [
      ["Shift", shiftId],
      ["Machine", machineId],
      ["Item", itemId],
    ]) {
      if (value && !isValidId(value)) {
        return fail(`Invalid ${label} ID.`);
      }
    }

    // ======================================================
    // REFERENCE VALIDATION
    // ======================================================

    const referenceError = await validateReferences({
      shiftId,
      machineId,
      itemId,
    });

    if (referenceError) {
      return fail(referenceError);
    }

    // ======================================================
    // CUSTOM FIELDS VALIDATION
    // ======================================================

    let customFields = {};

    if (body.customFields !== undefined) {
      if (!validateCustomFields(body.customFields)) {
        return fail("customFields must be a valid object.");
      }

      customFields = body.customFields;
    }

    // ======================================================
    // PRODUCTION DATE VALIDATION
    // ======================================================

    let productionDate = new Date();

    if (body.productionDate !== undefined) {
      productionDate = parseDate(body.productionDate);

      if (!productionDate) {
        return fail("A valid production date is required.");
      }
    }

    // ======================================================
    // DUPLICATE ITEM + DATE VALIDATION
    // ======================================================

    const duplicate = await findDuplicateProduction({
      productionDate,
      itemId,
    });

    if (duplicate) {
      return fail(DUPLICATE_PRODUCTION_MESSAGE, 409);
    }

    // ======================================================
    // AUTHENTICATED USER
    // ======================================================

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return fail("Unauthorized. Please log in again.", 401);
    }

    // ======================================================
    // CREATE PRODUCTION
    // ======================================================

    const production = await prisma.production.create({
      data: {
        productionDate,
        shiftId,
        machineId,
        itemId,
        productionQuantity,

        remarks: body.remarks
          ? String(body.remarks).trim() || null
          : null,

        customFields,
        status: body.status ?? true,

        createby: String(user.id),
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
      select: productionSelect,
    });

    const productionWithUnit = await attachItemUnit(production);

    await logProduction({
      request,
      event: "create",
      production: productionWithUnit,
      user,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Production created successfully.",
        data: productionWithUnit,
        sync: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("PRODUCTION CREATE ERROR", error);

    return fail(
      error.message || "Failed to create production.",
      500
    );
  }
}

// ======================================================
// UPDATE PRODUCTION
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("production");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return fail("Production ID is required.");
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return fail("Unauthorized. Please log in again.", 401);
    }

    const productionId = String(body.id);

    // ======================================================
    // FIND EXISTING PRODUCTION
    // ======================================================

    const existing = await prisma.production.findFirst({
      where: {
        id: productionId,
        deletedAt: null,
      },
      select: {
        id: true,
        productionDate: true,
        shiftId: true,
        machineId: true,
        itemId: true,
      },
    });

    if (!existing) {
      return fail("Production not found.", 404);
    }

    const updateData = {
      updateby: String(user.id),
      lastSyncAt: new Date(),
    };

    // ======================================================
    // PRODUCTION DATE VALIDATION
    // ======================================================

    if (body.productionDate !== undefined) {
      const productionDate = parseDate(body.productionDate);

      if (!productionDate) {
        return fail("A valid production date is required.");
      }

      updateData.productionDate = productionDate;
    }

    // ======================================================
    // QUANTITY VALIDATION
    // ======================================================

    if (body.productionQuantity !== undefined) {
      if (!validateQuantity(body.productionQuantity)) {
        return fail("A valid production quantity is required.");
      }

      updateData.productionQuantity = body.productionQuantity;
    }

    // ======================================================
    // REMARKS
    // ======================================================

    if (body.remarks !== undefined) {
      updateData.remarks = body.remarks
        ? String(body.remarks).trim() || null
        : null;
    }

    // ======================================================
    // STATUS
    // ======================================================

    if (body.status !== undefined) {
      if (typeof body.status !== "boolean") {
        return fail("A valid status (true or false) is required.");
      }

      updateData.status = body.status;
    }

    // ======================================================
    // REFERENCE VALIDATION
    // ======================================================

    const referenceFields = [
      ["shiftId", "Shift"],
      ["machineId", "Machine"],
      ["itemId", "Item"],
    ];

    const changedReferences = [];

    for (const [field, label] of referenceFields) {
      if (body[field] !== undefined) {
        const value =
          body[field] === null || body[field] === ""
            ? null
            : String(body[field]).trim();

        if (value !== null && !isValidId(value)) {
          return fail(`Invalid ${label} ID.`);
        }

        updateData[field] = value;

        if (
          String(existing[field] ?? "") !==
          String(value ?? "")
        ) {
          changedReferences.push(field);
        }
      }
    }

    // ======================================================
    // FINAL REFERENCES
    // ======================================================

    const finalReferences = {
      shiftId:
        updateData.shiftId !== undefined
          ? updateData.shiftId
          : existing.shiftId,

      machineId:
        updateData.machineId !== undefined
          ? updateData.machineId
          : existing.machineId,

      itemId:
        updateData.itemId !== undefined
          ? updateData.itemId
          : existing.itemId,
    };

    // ITEM IS REQUIRED
    if (!finalReferences.itemId) {
      return fail("Please select an item.");
    }

    const referenceError = await validateReferences(
      finalReferences,
      changedReferences
    );

    if (referenceError) {
      return fail(referenceError);
    }

    // ======================================================
    // CUSTOM FIELDS VALIDATION
    // ======================================================

    if (body.customFields !== undefined) {
      if (!validateCustomFields(body.customFields)) {
        return fail("customFields must be a valid object.");
      }

      updateData.customFields = body.customFields;
    }

    // ======================================================
    // DUPLICATE ITEM + DATE VALIDATION
    // Exclude current production ID during editing.
    // ======================================================

    const finalProductionDate =
      updateData.productionDate ?? existing.productionDate;

    const duplicate = await findDuplicateProduction({
      productionDate: finalProductionDate,
      itemId: finalReferences.itemId,
      excludeId: productionId,
    });

    if (duplicate) {
      return fail(DUPLICATE_PRODUCTION_MESSAGE, 409);
    }

    // ======================================================
    // UPDATE PRODUCTION
    // ======================================================

    const updated = await prisma.production.update({
      where: {
        id: productionId,
      },
      data: updateData,
      select: productionSelect,
    });

    const updatedWithUnit = await attachItemUnit(updated);

    await logProduction({
      request,
      event: "update",
      production: updatedWithUnit,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Production updated successfully.",
      data: updatedWithUnit,
      sync: true,
    });
  } catch (error) {
    console.error("PRODUCTION UPDATE ERROR", error);

    return fail(
      error.message || "Failed to update production.",
      500
    );
  }
}

// ======================================================
// PATCH PRODUCTION STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("production");

    if (accessError) return accessError;

    const body = await request.json();

    if (typeof body.status !== "boolean") {
      return fail("A valid status (true or false) is required.");
    }

    const ids = [
      ...new Set(
        (Array.isArray(body.ids)
          ? body.ids
          : body.id
            ? [body.id]
            : []
        )
          .filter(
            (id) =>
              id !== null &&
              id !== undefined &&
              String(id).trim()
          )
          .map(String)
      ),
    ];

    if (!ids.length) {
      return fail("At least one Production ID is required.");
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return fail("Unauthorized. Please log in again.", 401);
    }

    const existingProductions =
      await prisma.production.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        select: {
          id: true,
          item: {
            select: {
              ItemName: true,
            },
          },
        },
      });

    if (!existingProductions.length) {
      return fail("No active productions were found.", 404);
    }

    const updateResult = await prisma.production.updateMany({
      where: {
        id: {
          in: existingProductions.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        status: body.status,
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
    });

    await Promise.all(
      existingProductions.map((item) =>
        systemLog({
          event: "update",
          userId: String(user.id),
          entityId: String(item.id),
          entityType: "inventory.production",
          description: `Production marked ${
            body.status ? "active" : "inactive"
          }: ${item.item?.ItemName || item.id}`,
          ipAddress: getClientIp(request),
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Production(s) marked ${
        body.status ? "active" : "inactive"
      }.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("PRODUCTION STATUS UPDATE ERROR", error);

    return fail(
      error.message || "Failed to update production status.",
      500
    );
  }
}

// ======================================================
// DELETE PRODUCTION(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("production");

    if (accessError) return accessError;

    const body = await request.json();

    const ids = [
      ...new Set(
        (Array.isArray(body.ids)
          ? body.ids
          : body.id
            ? [body.id]
            : []
        )
          .filter(
            (id) =>
              id !== null &&
              id !== undefined &&
              String(id).trim()
          )
          .map(String)
      ),
    ];

    if (!ids.length) {
      return fail("At least one Production ID is required.");
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return fail("Unauthorized. Please log in again.", 401);
    }

    const existingProductions =
      await prisma.production.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        select: {
          id: true,
          item: {
            select: {
              ItemName: true,
            },
          },
        },
      });

    if (!existingProductions.length) {
      return fail(
        "No active productions were found to delete.",
        404
      );
    }

    const now = new Date();

    const deleteResult = await prisma.production.updateMany({
      where: {
        id: {
          in: existingProductions.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        updateby: String(user.id),
        lastSyncAt: now,
      },
    });

    await Promise.all(
      existingProductions.map((item) =>
        systemLog({
          event: "delete",
          userId: String(user.id),
          entityId: String(item.id),
          entityType: "inventory.production",
          description: `Production deleted: ${
            item.item?.ItemName || item.id
          }`,
          ipAddress: getClientIp(request),
        })
      )
    );

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Production deleted successfully."
          : `${deleteResult.count} production(s) deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("PRODUCTION DELETE ERROR", error);

    return fail(
      error.message || "Failed to delete production(s).",
      500
    );
  }
}
