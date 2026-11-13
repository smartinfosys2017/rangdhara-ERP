
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// ======================================================
// HELPERS
// ======================================================

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

    const updateData = {
      unitName,
      abbreviation,
      updateby: String(user.id),
      lastSyncAt: new Date(),
    };

    if (typeof body.status === "boolean") {
      updateData.status = body.status;
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

// ======================================================
// DELETE UNIT (SOFT DELETE)
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("unit");

    if (accessError) return accessError;

    const body = await request.json();

    const unitId = String(body?.id || "").trim();

    if (!unitId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit ID is required.",
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

    const existingUnit = await prisma.unit.findUnique({
      where: {
        id: unitId,
      },
    });

    if (!existingUnit) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit not found. Please check the Unit ID.",
        },
        { status: 404 }
      );
    }

    if (existingUnit.deletedAt !== null) {
      return NextResponse.json(
        {
          success: false,
          message: "This unit has already been deleted.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const deletedUnit = await prisma.unit.update({
      where: {
        id: unitId,
      },
      data: {
        deletedAt: now,
        updateby: String(user.id),
        lastSyncAt: now,
      },
    });

    // SYSTEM LOG
    await systemLog({
      event: "delete",
      userId: String(user.id),
      entityId: String(deletedUnit.id),
      entityType: "inventory.unit",
      description: `Unit deleted: ${deletedUnit.unitName}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({
      success: true,
      message: "Unit deleted successfully.",
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
