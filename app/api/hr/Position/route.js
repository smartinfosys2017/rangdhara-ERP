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
            ? {
              lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
            }
            : {}),
        }
        : undefined,
  };
};

const getPositionWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

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

  return {
    where: {
      deletedAt: null,

      ...(query
        ? {
          OR: [
            {
              positionName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              description: {
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

      ...(createdRange.range
        ? { createdAt: createdRange.range }
        : {}),

      ...(updatedRange.range
        ? { updatedAt: updatedRange.range }
        : {}),
    },
  };
};

const logPosition = async ({
  request,
  event,
  Position,
  user,
}) => {
  if (!Position || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(Position.id),
    entityType: "hr.position",
    description: `Position ${event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
      }: ${Position.positionName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET Position LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("position");

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

    // Whitelist valid Prisma sort fields.
    const allowedSortFields = [
      "id",
      "positionName",
      "description",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getPositionWhere(searchParams);

    if (filterResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: filterResult.error,
        },
        { status: 400 },
      );
    }

    const where = filterResult.where;

    const [total, data] = await Promise.all([
      prisma.Position.count({ where }),

      prisma.Position.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Position fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Position LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Position.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE Position
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("position");

    if (accessError) return accessError;

    const body = await request.json();
    const positionName = body.positionName?.trim();

    if (!positionName) {
      return NextResponse.json(
        {
          success: false,
          message: "Position Name is required.",
        },
        { status: 400 },
      );
    }
    // Position Name length validation
    if (positionName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Position name cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }
    // Check duplicate Position name (case-insensitive)
    const existingGroup = await prisma.Position.findFirst({
      where: {
        positionName: {
          equals: positionName,
          mode: "insensitive",
        },
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message: "This Position name already exists. Please enter a unique Position name.",
        },
        { status: 409 }
      );
    }
    const Position = await prisma.$transaction(async (tx) => {
      
      return tx.Position.create({
        data: {
          positionName,
          description: body.description?.trim() || null,
          status: body.status ?? true,
          lastSyncAt: new Date(),
        },
      });
    });

    await logPosition({
      request,
      event: "create",
      Position,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Position created successfully.",
      data: Position,
    });
  } catch (error) {
    console.error("Position CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Position.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE Position
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("position");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Position ID required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const existing = await prisma.Position.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Position not found.",
        },
        { status: 404 },
      );
    }
    // Check duplicate name, excluding the current Position
    const duplicatePosition = await prisma.Position.findFirst({
      where: {
        positionName: {
          equals: body.positionName,
          mode: "insensitive",
        },
        NOT: {
          id: body.id
        },
      },
    });

    if (duplicatePosition) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Position name already exists. Please enter a unique Position name.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      
      const updateData = {
        lastSyncAt: new Date(),
      };

      if (body.positionName !== undefined) {
        const positionName = body.positionName?.trim();

        if (!positionName) {
          throw new Error("Position name is required.");
        }

        updateData.positionName = positionName;
      }

      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }

      if (body.status !== undefined) {
        updateData.status = body.status;
      }

      return tx.Position.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    await logPosition({
      request,
      event: "update",
      Position: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Position updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("Position UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Position.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH Position STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("position");

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
          .filter((id) => id !== null && id !== undefined && String(id))
          .map(String),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Position ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const existingGroups = await prisma.Position.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        positionName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Position were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.Position.updateMany({
      where: {
        id: { in: existingGroups.map((item) => item.id) },
        deletedAt: null,
      },
      data: {
        status: body.status,
        lastSyncAt: new Date(),
      },
    });

    // Record each changed item in the system log.
    for (const item of existingGroups) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "hr.position",
        description: `Position marked ${body.status ? "active" : "inactive"
          }: ${item.positionName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Position(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Position STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Position status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE Position(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("position");

    if (accessError) return accessError;

    const body = await request.json();

    const ids = [
      ...new Set(
        (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
          .filter((id) => id !== null && id !== undefined && String(id))
          .map(String),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one position ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const existingGroups = await prisma.Position.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        positionName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active position were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.Position.updateMany({
      where: {
        id: { in: existingGroups.map((item) => item.id) },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingGroups) {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "hr.position",
        description: `position deleted: ${item.positionName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Position deleted successfully."
          : `${deleteResult.count} Position deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Position DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete position.",
      },
      { status: 500 },
    );
  }
}