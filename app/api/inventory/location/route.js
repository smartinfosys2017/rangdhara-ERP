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
              lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
            }
            : {}),
        }
        : undefined,
  };
};

const getLocationWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const createdBy = searchParams.get("createdBy") || "";
  const updatedBy = searchParams.get("updatedBy") || "";

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
              locationName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              locationCode: {
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

      ...(createdRange.range ? { createdAt: createdRange.range } : {}),

      ...(updatedRange.range ? { updatedAt: updatedRange.range } : {}),

      ...(createdBy ? { createby: createdBy } : {}),
      ...(updatedBy ? { updateby: updatedBy } : {}),
    },
  };
};

const logLocation = async ({ request, event, location, user }) => {
  if (!location || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(location.id),
    entityType: "inventory.location",
    description: `Location ${event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted"
      }: ${location.locationName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET LOCATION LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("location");

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
      "locationName",
      "locationCode",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";

    const filterResult = getLocationWhere(searchParams);

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

    const [total, locations] = await Promise.all([
      prisma.location.count({ where }),

      prisma.location.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Collect creator and updater IDs.
    const userIds = [
      ...new Set(
        locations
          .flatMap((item) => [item.createby, item.updateby])
          .filter(Boolean)
          .map(String),
      ),
    ];

    // Fetch corresponding user names.
    const users = userIds.length
      ? await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          name: true,
        },
      })
      : [];

    const userMap = new Map(
      users.map((user) => [String(user.id), user.name || "-"]),
    );

    // Attach creator and updater names.
    const data = locations.map((item) => ({
      ...item,
      createdByName: userMap.get(String(item.createby)) || "-",
      updatedByName: userMap.get(String(item.updateby)) || "-",
    }));

    return NextResponse.json({
      success: true,
      message: "Locations fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("LOCATION LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch locations.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE LOCATION
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("location");

    if (accessError) return accessError;

    const body = await request.json();

    const locationName = body.locationName?.trim();
    const locationCode = body.locationCode?.trim();

    if (!locationName) {
      return NextResponse.json(
        {
          success: false,
          message: "Location name is required.",
        },
        { status: 400 },
      );
    }

    if (!locationCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Location code is required.",
        },
        { status: 400 },
      );
    }

    if (locationName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Location name cannot exceed 255 characters.",
        },
        { status: 400 },
      );
    }

    if (locationCode.length > 25) {
      return NextResponse.json(
        {
          success: false,
          message: "Location code cannot exceed 25 characters.",
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

    // Check duplicate location name (case-insensitive).
    const existingLocationName = await prisma.location.findFirst({
      where: {
        locationName: {
          equals: locationName,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (existingLocationName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Location name already exists.",
        },
        { status: 409 },
      );
    }

    const location = await prisma.location.create({
      data: {
        locationName,
        locationCode,
        status: body.status ?? true,
        lastSyncAt: new Date(),
        createby: String(user.id),
        updateby: String(user.id),
      },
    });

    await logLocation({
      request,
      event: "create",
      location,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Location created successfully.",
      data: location,
    });
  } catch (error) {
    console.error("LOCATION CREATE ERROR", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "This Location code already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create location.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE LOCATION
// ======================================================


export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("location");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Location ID is required.",
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

    const locationId = String(body.id);

    const existing = await prisma.location.findFirst({
      where: {
        id: locationId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Location not found.",
        },
        { status: 404 },
      );
    }

    const updateData = {
      lastSyncAt: new Date(),
      updateby: String(user.id),
    };

    // Validate Location Name
    if (body.locationName !== undefined) {
      const locationName = String(body.locationName ?? "").trim();

      if (!locationName) {
        return NextResponse.json(
          {
            success: false,
            message: "Location name is required.",
          },
          { status: 400 },
        );
      }

      if (locationName.length > 255) {
        return NextResponse.json(
          {
            success: false,
            message: "Location name cannot exceed 255 characters.",
          },
          { status: 400 },
        );
      }

      // Check duplicate name (case-insensitive)
      const duplicateName = await prisma.location.findFirst({
        where: {
          locationName: {
            equals: locationName,
            mode: "insensitive",
          },
          id: {
            not: locationId,
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          {
            success: false,
            message: "This Location name already exists.",
          },
          { status: 409 },
        );
      }

      updateData.locationName = locationName;
    }

    // Validate Location Code
    if (body.locationCode !== undefined) {
      const locationCode = String(body.locationCode ?? "").trim();

      if (!locationCode) {
        return NextResponse.json(
          {
            success: false,
            message: "Location code is required.",
          },
          { status: 400 },
        );
      }

      if (locationCode.length > 25) {
        return NextResponse.json(
          {
            success: false,
            message: "Location code cannot exceed 25 characters.",
          },
          { status: 400 },
        );
      }

      // Check duplicate code (case-insensitive)
      const duplicateLocation = await prisma.location.findFirst({
        where: {
          locationCode: {
            equals: locationCode,
            mode: "insensitive",
          },
          id: {
            not: locationId,
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (duplicateLocation) {
        return NextResponse.json(
          {
            success: false,
            message: "This Location code already exists.",
          },
          { status: 409 },
        );
      }

      updateData.locationCode = locationCode;
    }

    // Validate Status
    if (body.status !== undefined) {
      if (typeof body.status !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            message: "A valid status (true or false) is required.",
          },
          { status: 400 },
        );
      }

      updateData.status = body.status;
    }

    // Update Location
    const updated = await prisma.location.update({
      where: {
        id: locationId,
      },
      data: updateData,
    });

    await logLocation({
      request,
      event: "update",
      location: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Location updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("LOCATION UPDATE ERROR", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "This Location name or code already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update location.",
      },
      { status: 500 },
    );
  }
}


// ======================================================
// PATCH LOCATION STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("location");

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
          message: "At least one Location ID is required.",
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

    const existingLocations = await prisma.location.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        locationName: true,
      },
    });

    if (!existingLocations.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active locations were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.location.updateMany({
      where: {
        id: {
          in: existingLocations.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        status: body.status,
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingLocations) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "inventory.location",
        description: `Location marked ${body.status ? "active" : "inactive"
          }: ${item.locationName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Location(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("LOCATION STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update location status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE LOCATION(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("location");

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
          message: "At least one Location ID is required.",
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

    const existingLocations = await prisma.location.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        locationName: true,
      },
    });

    if (!existingLocations.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active locations were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.location.updateMany({
      where: {
        id: {
          in: existingLocations.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingLocations) {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "inventory.location",
        description: `Location deleted: ${item.locationName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Location deleted successfully."
          : `${deleteResult.count} location(s) deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("LOCATION DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete location(s).",
      },
      { status: 500 },
    );
  }
}