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

const getSecurityWhere = (searchParams) => {
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
              securityName: {
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

const logSecurity = async ({
  request,
  event,
  Security,
  user,
}) => {
  if (!Security || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(Security.id),
    entityType: "hr.security",
    description: `Security ${event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
      }: ${Security.securityName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET Security LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("security");

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
      "securityName",
      "description",
      "status",
      "isDefault",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getSecurityWhere(searchParams);

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
      prisma.Security.count({ where }),

      prisma.Security.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Security fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Security LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Security.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE Security
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("security");

    if (accessError) return accessError;

    const body = await request.json();
    const securityName = body.securityName?.trim();

    if (!securityName) {
      return NextResponse.json(
        {
          success: false,
          message: "Security Name is required.",
        },
        { status: 400 },
      );
    }
    // Security Name length validation
    if (securityName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Security name cannot exceed 255 characters.",
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
    // Check duplicate Security name (case-insensitive)
    const existingGroup = await prisma.Security.findFirst({
      where: {
        securityName: {
          equals: securityName,
          mode: "insensitive",
        },
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message: "This Security name already exists. Please enter a unique Security name.",
        },
        { status: 409 }
      );
    }
    const Security = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.Security.updateMany({
          where: {
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      return tx.Security.create({
        data: {
          securityName,
          description: body.description?.trim() || null,
          status: body.status ?? true,
          isDefault: body.isDefault ?? false,
          lastSyncAt: new Date(),
        },
      });
    });

    await logSecurity({
      request,
      event: "create",
      Security,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Security created successfully.",
      data: Security,
    });
  } catch (error) {
    console.error("Security CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Security.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE Security
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("security");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Security ID required.",
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

    const existing = await prisma.Security.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Security not found.",
        },
        { status: 404 },
      );
    }
    // Check duplicate name, excluding the current Security
    const duplicateSecurity = await prisma.Security.findFirst({
      where: {
        securityName: {
          equals: body.securityName,
          mode: "insensitive",
        },
        NOT: {
          id: body.id
        },
      },
    });

    if (duplicateSecurity) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Security name already exists. Please enter a unique Security name.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.Security.updateMany({
          where: {
            id: { not: body.id },
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      const updateData = {
        lastSyncAt: new Date(),
      };

      if (body.securityName !== undefined) {
        const securityName = body.securityName?.trim();

        if (!securityName) {
          throw new Error("Security name is required.");
        }

        updateData.securityName = securityName;
      }

      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }

      if (body.status !== undefined) {
        updateData.status = body.status;
      }

      if (body.isDefault !== undefined) {
        updateData.isDefault = body.isDefault;
      }

      return tx.Security.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    await logSecurity({
      request,
      event: "update",
      Security: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Security updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("Security UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Security.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH Security STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("security");

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
          message: "At least one Security ID is required.",
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

    const existingGroups = await prisma.Security.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        securityName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Security were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.Security.updateMany({
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
        entityType: "hr.security",
        description: `Security marked ${body.status ? "active" : "inactive"
          }: ${item.securityName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Security(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Security STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Security status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE Security(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("security");

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
          message: "At least one security ID is required.",
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

    const existingGroups = await prisma.Security.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        securityName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active security were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.Security.updateMany({
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
        entityType: "hr.security",
        description: `security deleted: ${item.securityName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Security deleted successfully."
          : `${deleteResult.count} Security deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Security DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete security.",
      },
      { status: 500 },
    );
  }
}