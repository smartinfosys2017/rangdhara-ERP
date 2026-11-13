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

const getChecklistWhere = (searchParams) => {
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
              itemName: {
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

const logChecklist = async ({
  request,
  event,
  Checklist,
  user,
}) => {
  if (!Checklist || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(Checklist.id),
    entityType: "hr.checklist",
    description: `Checklist ${event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted"
      }: ${Checklist.itemName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET Checklist LIST
// ======================================================
export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("checklist");

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

    const allowedSortFields = [
      "id",
      "itemName",
      "description",
      "status",
      "makeGlobal",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getChecklistWhere(searchParams);

    if (filterResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: filterResult.error,
        },
        { status: 400 },
      );
    }

    const where = {
      ...filterResult.where,
      deletedAt: null,
    };

    const [total, data] = await Promise.all([
      prisma.checklistItem.count({ where }),

      prisma.checklistItem.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Normalize response fields for consistent frontend handling.
    const formattedData = data.map((item) => ({
      ...item,
      itemName: item.itemName ?? "",
      description: item.description ?? "",
      status: item.status ?? true,
      makeGlobal: item.makeGlobal ?? false,
    }));

    return NextResponse.json({
      success: true,
      message: "Checklist fetched successfully.",
      data: formattedData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Checklist LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Checklist.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE Checklist
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("checklist");

    if (accessError) return accessError;

    const body = await request.json();
    const itemName = body.itemName?.trim();

    if (!itemName) {
      return NextResponse.json(
        {
          success: false,
          message: "Checklist Name is required.",
        },
        { status: 400 },
      );
    }
    // Checklist Name length validation
    if (itemName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Checklist name cannot exceed 255 characters.",
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
    // Check duplicate Checklist name (case-insensitive)
    const existingGroup = await prisma.checklistItem.findFirst({
      where: {
        itemName: {
          equals: itemName,
          mode: "insensitive",
        },
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message: "This Checklist name already exists. Please enter a unique Checklist name.",
        },
        { status: 409 }
      );
    }
    const Checklist = await prisma.$transaction(async (tx) => {
      if (body.makeGlobal === true) {
        await tx.checklistItem.updateMany({
          where: {
            makeGlobal: true,
            deletedAt: null,
          },
          data: { makeGlobal: false },
        });
      }

      return tx.checklistItem.create({
        data: {
          itemName,
          description: body.description?.trim() || null,
          status: body.status ?? true,
          makeGlobal: body.makeGlobal ?? false,
          lastSyncAt: new Date(),
        },
      });
    });

    await logChecklist({
      request,
      event: "create",
      Checklist,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Checklist created successfully.",
      data: Checklist,
    });
  } catch (error) {
    console.error("Checklist CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Checklist.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE Checklist
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("checklist");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Checklist ID required.",
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

    const existing = await prisma.checklistItem.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Checklist not found.",
        },
        { status: 404 },
      );
    }
    // Check duplicate name, excluding the current Checklist
    const duplicateChecklist = await prisma.checklistItem.findFirst({
      where: {
        itemName: {
          equals: body.itemName,
          mode: "insensitive",
        },
        NOT: {
          id: body.id
        },
      },
    });

    if (duplicateChecklist) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Checklist name already exists. Please enter a unique Checklist name.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.makeGlobal === true) {
        await tx.checklistItem.updateMany({
          where: {
            id: { not: body.id },
            makeGlobal: true,
            deletedAt: null,
          },
          data: { makeGlobal: false },
        });
      }

      const updateData = {
        lastSyncAt: new Date(),
      };

      if (body.itemName !== undefined) {
        const itemName = body.itemName?.trim();

        if (!itemName) {
          throw new Error("Checklist name is required.");
        }

        updateData.itemName = itemName;
      }

      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }

      if (body.status !== undefined) {
        updateData.status = body.status;
      }

      if (body.makeGlobal !== undefined) {
        updateData.makeGlobal = body.makeGlobal;
      }

      return tx.checklistItem.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    await logChecklist({
      request,
      event: "update",
      Checklist: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Checklist updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("Checklist UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Checklist.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH Checklist STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("checklist");

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
          message: "At least one Checklist ID is required.",
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

    const existingGroups = await prisma.checklistItem.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        itemName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Checklist were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.checklistItem.updateMany({
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
        entityType: "hr.checklist",
        description: `Checklist marked ${body.status ? "active" : "inactive"
          }: ${item.itemName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Checklist(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Checklist STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Checklist status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE Checklist(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("checklist");

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
          message: "At least one checklist ID is required.",
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

    const existingGroups = await prisma.checklistItem.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        itemName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active checklist were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.checklistItem.updateMany({
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
        entityType: "hr.checklist",
        description: `checklist deleted: ${item.itemName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Checklist deleted successfully."
          : `${deleteResult.count} Checklist deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Checklist DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete checklist.",
      },
      { status: 500 },
    );
  }
}