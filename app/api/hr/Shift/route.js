import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

const ENTITY_TYPE = "shift";
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function errorResponse(message, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

function validTime(value) {
  return typeof value === "string" && TIME_REGEX.test(value);
}

function parseStatus(value, defaultValue) {
  if (value === undefined) return defaultValue;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function validateShift(body, isUpdate = false) {
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (isUpdate && !body.id) {
    return { error: "Shift ID is required." };
  }

  if (!name || name.length > 255) {
    return {
      error: "Name is required and must not exceed 255 characters.",
    };
  }

  if (!validTime(body.inTime) || !validTime(body.outTime)) {
    return {
      error: "In time and out time must use HH:mm format.",
    };
  }

  const numericFields = {
    graceTime: body.graceTime ?? 0,
    earlyInMinutes: body.earlyInMinutes ?? 0,
    lateOutMinutes: body.lateOutMinutes ?? 0,
    halfDayMinutes: body.halfDayMinutes ?? 240,
    fullDayMinutes: body.fullDayMinutes ?? 480,
  };

  const parsed = {};

  for (const [field, value] of Object.entries(numericFields)) {
    const number = value === "" ? NaN : Number(value);

    if (!Number.isInteger(number) || number < 0 || number > 1440) {
      return {
        error: `${field} must be a whole number between 0 and 1440 minutes.`,
      };
    }

    parsed[field] = number;
  }

  if (parsed.fullDayMinutes === 0) {
    return {
      error: "Full-day minutes must be greater than zero.",
    };
  }

  if (parsed.halfDayMinutes > parsed.fullDayMinutes) {
    return {
      error: "Half-day minutes cannot exceed full-day minutes.",
    };
  }

  const description = body.description ?? "";

  if (typeof description !== "string" || description.length > 1000) {
    return {
      error: "Description must not exceed 1000 characters.",
    };
  }

  const crossesMidnight = body.crossesMidnight ?? false;

  if (
    typeof crossesMidnight !== "boolean" &&
    !["true", "false"].includes(crossesMidnight)
  ) {
    return {
      error: "Crosses-midnight must be true or false.",
    };
  }

  const status = parseStatus(body.status, true);

  if (status === null) {
    return { error: "Status must be true or false." };
  }

  return {
    data: {
      name,
      inTime: body.inTime,
      outTime: body.outTime,
      ...parsed,
      description: description.trim() || null,
      crossesMidnight:
        crossesMidnight === true || crossesMidnight === "true",
      status,
    },
  };
}

async function getAccessAndUser() {
  const accessError = await checkMenuAccess("shift");

  if (accessError) {
    return { error: accessError };
  }

  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 }
      ),
    };
  }

  return { user };
}

// GET /api/hr/Shift
// GET /api/hr/Shift
export async function GET(request) {
  try {
    const access = await getAccessAndUser();

    if (access.error) return access.error;

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      Number(searchParams.get("page")) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10)
    );

    const query = (searchParams.get("query") || "").trim();
    const status = (searchParams.get("status") || "all")
      .trim()
      .toLowerCase();

    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const updatedFrom = searchParams.get("updatedFrom");
    const updatedTo = searchParams.get("updatedTo");

    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const allowedSort = [
      "name",
      "inTime",
      "outTime",
      "graceTime",
      "earlyInMinutes",
      "lateOutMinutes",
      "halfDayMinutes",
      "fullDayMinutes",
      "crossesMidnight",
      "status",
      "createdAt",
      "updatedAt",
    ];

    if (!["all", "active", "inactive"].includes(status)) {
      return errorResponse(
        "Status must be all, active, or inactive.",
        400
      );
    }

    const orderBy = allowedSort.includes(sort) ? sort : "createdAt";

    // Parse date filters. Date-only end values include the full day.
    function parseFilterDate(value, fieldName, isEnd = false) {
      if (!value || !value.trim()) return null;

      const input = value.trim();

      const date = /^\d{4}-\d{2}-\d{2}$/.test(input)
        ? new Date(`${input}T00:00:00.000Z`)
        : new Date(input);

      if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date for ${fieldName}.`);
      }

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(input) &&
        date.toISOString().slice(0, 10) !== input
      ) {
        throw new Error(`Invalid date for ${fieldName}.`);
      }

      if (isEnd && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        date.setUTCDate(date.getUTCDate() + 1);
      }

      return date;
    }

    let createdFromDate;
    let createdToDate;
    let updatedFromDate;
    let updatedToDate;

    try {
      createdFromDate = parseFilterDate(
        createdFrom,
        "createdFrom"
      );

      createdToDate = parseFilterDate(
        createdTo,
        "createdTo",
        true
      );

      updatedFromDate = parseFilterDate(
        updatedFrom,
        "updatedFrom"
      );

      updatedToDate = parseFilterDate(
        updatedTo,
        "updatedTo",
        true
      );
    } catch (error) {
      return errorResponse(error.message, 400);
    }

    if (
      createdFromDate &&
      createdToDate &&
      createdFromDate >= createdToDate
    ) {
      return errorResponse(
        "Creation date range is invalid.",
        400
      );
    }

    if (
      updatedFromDate &&
      updatedToDate &&
      updatedFromDate >= updatedToDate
    ) {
      return errorResponse(
        "Update date range is invalid.",
        400
      );
    }

    // Build Prisma filters
    const where = {
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        {
          name: {
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
      ];
    }

    // IMPORTANT: false is a valid status value.
    if (status === "active") {
      where.status = true;
    } else if (status === "inactive") {
      where.status = false;
    }

    if (createdFromDate || createdToDate) {
      where.createdAt = {
        ...(createdFromDate
          ? { gte: createdFromDate }
          : {}),
        ...(createdToDate
          ? { lt: createdToDate }
          : {}),
      };
    }

    if (updatedFromDate || updatedToDate) {
      where.updatedAt = {
        ...(updatedFromDate
          ? { gte: updatedFromDate }
          : {}),
        ...(updatedToDate
          ? { lt: updatedToDate }
          : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [orderBy]: dir,
        },
      }),

      prisma.shift.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        query,
        status,
        createdFrom: createdFrom || "",
        createdTo: createdTo || "",
        updatedFrom: updatedFrom || "",
        updatedTo: updatedTo || "",
      },
    });
  } catch (error) {
    console.error("GET /api/hr/Shift:", error);

    return errorResponse(
      "Failed to fetch shifts.",
      500
    );
  }
}

// POST /api/hr/Shift
export async function POST(request) {
  try {
    const access = await getAccessAndUser();

    if (access.error) return access.error;

    const body = await request.json();
    const result = validateShift(body);

    if (result.error) {
      return errorResponse(result.error);
    }

    const data = await prisma.shift.create({
      data: result.data,
    });

    await systemLog({
      event: "create",
      userId: String(access.user.id),
      entityId: String(data.id),
      entityType: ENTITY_TYPE,
      description: `Shift created: ${data.name}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Shift created successfully.",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/hr/Shift:", error);
    return errorResponse("Failed to create shift.", 500);
  }
}

// PUT /api/hr/Shift
export async function PUT(request) {
  try {
    const access = await getAccessAndUser();

    if (access.error) return access.error;

    const body = await request.json();
    const result = validateShift(body, true);

    if (result.error) {
      return errorResponse(result.error);
    }

    const existing = await prisma.shift.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return errorResponse("Shift not found.", 404);
    }

    const data = await prisma.shift.update({
      where: { id: body.id },
      data: result.data,
    });

    await systemLog({
      event: "update",
      userId: String(access.user.id),
      entityId: String(data.id),
      entityType: ENTITY_TYPE,
      description: `Shift updated: ${data.name}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Shift updated successfully.",
      data,
    });
  } catch (error) {
    console.error("PUT /api/hr/Shift:", error);
    return errorResponse("Failed to update shift.", 500);
  }
}

// DELETE /api/hr/Shift
export async function DELETE(request) {
  try {
    const access = await getAccessAndUser();

    if (access.error) return access.error;

    const body = await request.json();

    if (!body.id) {
      return errorResponse("Shift ID is required.");
    }

    const existing = await prisma.shift.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return errorResponse("Shift not found.", 404);
    }

    const deleted = await prisma.shift.update({
      where: { id: body.id },
      data: {
        deletedAt: new Date(),
        status: false,
      },
    });

    await systemLog({
      event: "delete",
      userId: String(access.user.id),
      entityId: String(deleted.id),
      entityType: ENTITY_TYPE,
      description: `Shift deleted: ${deleted.name}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Shift deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/hr/Shift:", error);
    return errorResponse("Failed to delete shift.", 500);
  }
}