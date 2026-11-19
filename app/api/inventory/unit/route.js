
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// ======================================================
// HELPERS
// ======================================================

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

const allowedSortFields = [
  "id",
  "unitName",
  "abbreviation",
  "status",
  "createdAt",
  "updatedAt",
];

const getIpAddress = (request) => {
  return (
    request.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
};

const getDateRange = (from, to) => {
  if (!from && !to) return undefined;

  const range = {};

  if (from) {
    const date = new Date(`${from}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid start date.");
    }

    range.gte = date;
  }

  if (to) {
    const date = new Date(`${to}T23:59:59.999Z`);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid end date.");
    }

    range.lte = date;
  }

  if (range.gte && range.lte && range.gte > range.lte) {
    throw new Error("Start date cannot be greater than end date.");
  }

  return range;
};

// ======================================================
// GET UNIT LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("unit");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10
      )
    );

    const query = searchParams.get("query")?.trim() || "";

    const requestedSort = searchParams.get("sort") || "createdAt";

    const sort = allowedSortFields.includes(requestedSort)
      ? requestedSort
      : "createdAt";

    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const status = searchParams.get("status") || "all";

    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");

    const updatedFrom = searchParams.get("updatedFrom");
    const updatedTo = searchParams.get("updatedTo");

    const createdBy = searchParams.get("createdBy")?.trim() || "";
    const updatedBy = searchParams.get("updatedBy")?.trim() || "";

    const createdAt = getDateRange(createdFrom, createdTo);
    const updatedAt = getDateRange(updatedFrom, updatedTo);

    // Build filters
    const where = {
      deletedAt: null,

      ...(query && {
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
      }),

      ...(status === "active" && { status: true }),

      ...(status === "inactive" && { status: false }),

      ...(createdAt && { createdAt }),

      ...(updatedAt && { updatedAt }),

      ...(createdBy && { createby: createdBy }),

      ...(updatedBy && { updateby: updatedBy }),
    };

    // Fetch units and total count
    const [total, data] = await prisma.$transaction([
      prisma.unit.count({ where }),

      prisma.unit.findMany({
        where,
        orderBy: {
          [sort]: dir,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Collect unique creator and updater IDs
    const userIds = [
      ...new Set(
        data
          .flatMap((unit) => [unit.createby, unit.updateby])
          .filter(Boolean)
          .map((id) => String(id).trim())
      ),
    ];

    // Fetch user names
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

    // Create user ID-to-name mapping
    const userMap = new Map(
      users.map((user) => [
        String(user.id).trim(),
        user.name || "-",
      ])
    );

    // Add creator and updater names
    const formattedData = data.map((unit) => ({
      ...unit,

      createdByName:
        userMap.get(String(unit.createby || "").trim()) || "-",

      updatedByName:
        userMap.get(String(unit.updateby || "").trim()) || "-",
    }));

    return NextResponse.json({
      success: true,
      message: "Units fetched successfully.",
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("UNIT LIST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch units.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// CREATE UNIT
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("unit");

    if (accessError) return accessError;

    const body = await request.json();

    const unitName =
      typeof body.unitName === "string"
        ? body.unitName.trim()
        : "";

    const abbreviation =
      typeof body.abbreviation === "string"
        ? body.abbreviation.trim()
        : "";

    if (!unitName || !abbreviation) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit name and abbreviation are required.",
        },
        { status: 400 }
      );
    }

    if (unitName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit name cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    if (abbreviation.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Abbreviation cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }
    // Validate customFields. 
    let submittedCustomFields = {};

    if (body.customFields !== undefined) {
      if (
        body.customFields === null ||
        typeof body.customFields !== "object" ||
        Array.isArray(body.customFields)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "customFields must be a valid object.",
          },
          { status: 400 },
        );
      }

      submittedCustomFields = body.customFields;
    }
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Authenticated user not found.",
        },
        { status: 401 }
      );
    }

    // Check duplicate unit name
    const existingUnitName = await prisma.unit.findFirst({
      where: {
        unitName: {
          equals: unitName,
          mode: "insensitive",
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existingUnitName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This unit name already exists. Please enter a unique unit name.",
          field: "unitName",
        },
        { status: 409 }
      );
    }

    // Check duplicate abbreviation
    const existingAbbreviation = await prisma.unit.findFirst({
      where: {
        abbreviation: {
          equals: abbreviation,
          mode: "insensitive",
        },
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existingAbbreviation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This abbreviation already exists. Please enter a unique abbreviation.",
          field: "abbreviation",
        },
        { status: 409 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        unitName,
        abbreviation,
        status:
          typeof body.status === "boolean"
            ? body.status
            : true,
        createby: String(user.id),
        updateby: String(user.id),
        customFields: submittedCustomFields,
        lastSyncAt: new Date(),
      },
    });

    // SYSTEM LOG
    await systemLog({
      event: "create",
      userId: String(user.id),
      entityId: String(unit.id),
      entityType: "inventory.unit",
      description: `Unit created: ${unit.unitName}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Unit created successfully.",
        data: unit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("UNIT CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create unit.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// UPDATE UNIT
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("unit");

    if (accessError) return accessError;

    const body = await request.json();

    const id = String(body.id || "").trim();

    const unitName =
      typeof body.unitName === "string"
        ? body.unitName.trim()
        : "";

    const abbreviation =
      typeof body.abbreviation === "string"
        ? body.abbreviation.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit ID is required.",
        },
        { status: 400 }
      );
    }

    if (!unitName || !abbreviation) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit name and abbreviation are required.",
        },
        { status: 400 }
      );
    }

    if (unitName.length > 255 || abbreviation.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit name and abbreviation cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Authenticated user not found.",
        },
        { status: 401 }
      );
    }

    // Check current unit
    const existingRecord = await prisma.unit.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit not found.",
        },
        { status: 404 }
      );
    }

    // Check duplicate unit name
    const duplicateUnitName = await prisma.unit.findFirst({
      where: {
        unitName: {
          equals: unitName,
          mode: "insensitive",
        },
        deletedAt: null,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateUnitName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This unit name already exists. Please enter a unique unit name.",
          field: "unitName",
        },
        { status: 409 }
      );
    }

    // Check duplicate abbreviation
    const duplicateAbbreviation = await prisma.unit.findFirst({
      where: {
        abbreviation: {
          equals: abbreviation,
          mode: "insensitive",
        },
        deletedAt: null,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateAbbreviation) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This abbreviation already exists. Please enter a unique abbreviation.",
          field: "abbreviation",
        },
        { status: 409 }
      );
    }
    // Validate customFields.
    if (
      body.customFields !== undefined &&
      (
        body.customFields === null ||
        typeof body.customFields !== "object" ||
        Array.isArray(body.customFields)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "customFields must be a valid object.",
        },
        { status: 400 },
      );
    }
    const updatedCustomFields =
      body.customFields !== undefined
        ? body.customFields
        : existing.customFields ?? {};
    const updateData = {
      unitName,
      abbreviation,
      updateby: String(user.id),
      lastSyncAt: new Date(),
    };

    if (typeof body.status === "boolean") {
      updateData.status = body.status;
    }
    if (body.customFields !== undefined) {
      updateData.customFields = updatedCustomFields;
    }

    const updated = await prisma.unit.update({
      where: {
        id,
      },
      data: updateData,
    });

    // SYSTEM LOG
    await systemLog({
      event: "update",
      userId: String(user.id),
      entityId: String(updated.id),
      entityType: "inventory.unit",
      description: `Unit updated: ${updated.unitName}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({
      success: true,
      message: "Unit updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("UNIT UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update unit.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("unit");

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

    const ids = [
      ...new Set(
        (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
          .filter(
            (id) =>
              id !== null &&
              id !== undefined &&
              String(id).trim() !== "",
          )
          .map(String),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Unit ID is required.",
        },
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

    // Find existing units
    const existingUnits = await prisma.unit.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        unitName: true,
      },
    });

    if (!existingUnits.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active units were found.",
        },
        { status: 404 },
      );
    }

    // Update unit status
    const updateResult = await prisma.unit.updateMany({
      where: {
        id: {
          in: existingUnits.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        status: body.status,
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
    });

    // System logs
    for (const item of existingUnits) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "inventory.unit",
        description: `Unit marked ${body.status ? "active" : "inactive"
          }: ${item.unitName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Unit(s) marked ${body.status ? "active" : "inactive"
        }.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("UNIT STATUS UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update unit status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE UNIT (SOFT DELETE)
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("unit");

    if (accessError) return accessError;

    const body = await request.json();

    // Support both single and bulk delete.
    const unitIds = [
      ...new Set(
        [
          ...(Array.isArray(body?.ids) ? body.ids : []),
          ...(body?.id ? [body.id] : []),
        ]
          .map((id) => String(id).trim())
          .filter(Boolean)
      ),
    ];

    if (unitIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Unit ID is required.",
        },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Authenticated user not found.",
        },
        { status: 401 }
      );
    }

    // Find all requested units.
    const existingUnits = await prisma.unit.findMany({
      where: {
        id: {
          in: unitIds,
        },
      },
      select: {
        id: true,
        unitName: true,
        deletedAt: true,
      },
    });

    const existingIds = new Set(existingUnits.map((unit) => unit.id));

    const notFoundIds = unitIds.filter((id) => !existingIds.has(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more units were not found.",
          notFoundIds,
        },
        { status: 404 }
      );
    }

    const alreadyDeletedUnits = existingUnits.filter(
      (unit) => unit.deletedAt !== null
    );

    if (alreadyDeletedUnits.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more units have already been deleted.",
          alreadyDeletedIds: alreadyDeletedUnits.map((unit) => unit.id),
        },
        { status: 409 }
      );
    }

    const now = new Date();

    // Delete all units together.
    const deletedCount = await prisma.$transaction(async (tx) => {
      const result = await tx.unit.updateMany({
        where: {
          id: {
            in: unitIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          updateby: String(user.id),
          lastSyncAt: now,
        },
      });

      if (result.count !== unitIds.length) {
        throw new Error(
          "Some units could not be deleted. Please refresh and try again."
        );
      }

      return result.count;
    });

    // SYSTEM LOG: Create a log for each deleted unit.
    await Promise.all(
      existingUnits.map((unit) =>
        systemLog({
          event: "delete",
          userId: String(user.id),
          entityId: String(unit.id),
          entityType: "inventory.unit",
          description: `Unit deleted: ${unit.unitName}`,
          ipAddress: getIpAddress(request),
        })
      )
    );

    return NextResponse.json({
      success: true,
      message:
        deletedCount === 1
          ? "Unit deleted successfully."
          : `${deletedCount} units deleted successfully.`,
      deletedCount,
      deletedIds: unitIds,
      sync: true,
    });
  } catch (error) {
    console.error("UNIT DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete unit.",
      },
      { status: 500 }
    );
  }
}