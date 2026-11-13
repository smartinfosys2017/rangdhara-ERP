
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const BREAK_TYPES = ["paid", "unpaid"];

function errorResponse(message, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function validTime(value) {
  return typeof value === "string" && TIME_REGEX.test(value);
}

function parseStatus(value, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  return null;
}

function getDuration(fromTime, toTime) {
  const [fromHour, fromMinute] = fromTime.split(":").map(Number);
  const [toHour, toMinute] = toTime.split(":").map(Number);

  const start = fromHour * 60 + fromMinute;
  let end = toHour * 60 + toMinute;

  // Support breaks that cross midnight.
  if (end <= start) {
    end += 24 * 60;
  }

  return end - start;
}

function validateBreak(body, isUpdate = false) {
  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  if (isUpdate && !body.id) {
    return { error: "Break time ID is required." };
  }

  if (!name || name.length > 255) {
    return {
      error: "Name is required and must not exceed 255 characters.",
    };
  }

  if (!validTime(body.fromTime) || !validTime(body.toTime)) {
    return {
      error: "From time and to time must use HH:mm format.",
    };
  }

  const calculatedDuration = getDuration(
    body.fromTime,
    body.toTime
  );

  const durationMinutes =
    body.durationMinutes === undefined ||
      body.durationMinutes === ""
      ? calculatedDuration
      : Number(body.durationMinutes);

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes <= 0 ||
    durationMinutes > 1440
  ) {
    return {
      error:
        "Duration must be a whole number between 1 and 1440 minutes.",
    };
  }

  const breakType = body.breakType ?? "paid";

  if (
    typeof breakType !== "string" ||
    !BREAK_TYPES.includes(breakType.toLowerCase())
  ) {
    return {
      error: "Break type must be paid or unpaid.",
    };
  }

  const isFlexible = body.isFlexible ?? false;

  if (
    typeof isFlexible !== "boolean" &&
    !["true", "false"].includes(isFlexible)
  ) {
    return {
      error: "Flexible setting must be true or false.",
    };
  }

  const status = parseStatus(body.status, true);

  if (status === null) {
    return {
      error: "Status must be true or false.",
    };
  }

  return {
    data: {
      name,
      fromTime: body.fromTime,
      toTime: body.toTime,
      durationMinutes,
      breakType: breakType.toLowerCase(),
      isFlexible:
        isFlexible === true || isFlexible === "true",
      status,
    },
  };
}

/**
 * Parse a date query parameter.
 * Date-only end values include the entire selected day.
 */
function parseFilterDate(value, endOfDay = false) {
  if (!value) return null;

  // Avoid accepting malformed date-only values that JavaScript
  // might otherwise normalize.
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    }

    return date;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * GET /api/hr/BreakTime
 *
 * Supported query parameters:
 * page, limit, query, sort, dir, status,
 * createdFrom, createdTo, updatedFrom, updatedTo
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination
    const requestedPage = Number(searchParams.get("page")) || 1;
    const requestedLimit = Number(searchParams.get("limit")) || 10;

    const page = Math.max(1, Math.floor(requestedPage));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(requestedLimit))
    );

    // Search
    const query = (searchParams.get("query") || "").trim();

    // Sorting
    const sort = searchParams.get("sort") || "createdAt";
    const dir =
      searchParams.get("dir") === "asc" ? "asc" : "desc";

    const allowedSort = [
      "name",
      "fromTime",
      "toTime",
      "durationMinutes",
      "breakType",
      "isFlexible",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const orderBy = allowedSort.includes(sort)
      ? sort
      : "createdAt";

    // Filter parameters
    const statusFilter = searchParams.get("status");
    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const updatedFrom = searchParams.get("updatedFrom");
    const updatedTo = searchParams.get("updatedTo");

    // Base query: exclude soft-deleted records.
    const where = {
      deletedAt: null,
    };

    // Search by break name.
    if (query) {
      where.name = {
        contains: query,
        mode: "insensitive",
      };
    }

    // Status filter.
    // Supported values: active, inactive, true, false, 1, 0.
    if (
      statusFilter !== null &&
      statusFilter !== "" &&
      statusFilter.toLowerCase() !== "all"
    ) {
      const normalizedStatus = statusFilter.toLowerCase();

      if (["active", "true", "1"].includes(normalizedStatus)) {
        where.status = true;
      } else if (
        ["inactive", "false", "0"].includes(normalizedStatus)
      ) {
        where.status = false;
      } else {
        return errorResponse(
          "Invalid status filter. Use all, active, or inactive."
        );
      }
    }

    // Created date range.
    const createdAt = {};

    const createdFromDate = parseFilterDate(createdFrom);
    const createdToDate = parseFilterDate(createdTo, true);

    if (createdFrom && !createdFromDate) {
      return errorResponse("Invalid createdFrom date.");
    }

    if (createdTo && !createdToDate) {
      return errorResponse("Invalid createdTo date.");
    }

    if (createdFromDate) {
      createdAt.gte = createdFromDate;
    }

    if (createdToDate) {
      createdAt.lte = createdToDate;
    }

    if (Object.keys(createdAt).length > 0) {
      where.createdAt = createdAt;
    }

    // Updated date range.
    const updatedAt = {};

    const updatedFromDate = parseFilterDate(updatedFrom);
    const updatedToDate = parseFilterDate(updatedTo, true);

    if (updatedFrom && !updatedFromDate) {
      return errorResponse("Invalid updatedFrom date.");
    }

    if (updatedTo && !updatedToDate) {
      return errorResponse("Invalid updatedTo date.");
    }

    if (updatedFromDate) {
      updatedAt.gte = updatedFromDate;
    }

    if (updatedToDate) {
      updatedAt.lte = updatedToDate;
    }

    if (Object.keys(updatedAt).length > 0) {
      where.updatedAt = updatedAt;
    }

    // Validate date range order.
    if (
      createdFromDate &&
      createdToDate &&
      createdFromDate > createdToDate
    ) {
      return errorResponse(
        "Created-from date cannot be after created-to date."
      );
    }

    if (
      updatedFromDate &&
      updatedToDate &&
      updatedFromDate > updatedToDate
    ) {
      return errorResponse(
        "Updated-from date cannot be after updated-to date."
      );
    }

    // Fetch records and count using the same filters.
    const [data, total] = await Promise.all([
      prisma.breakTime.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [orderBy]: dir,
        },
      }),

      prisma.breakTime.count({
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
    });
  } catch (error) {
    console.error("GET /api/hr/BreakTime:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch break times.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hr/BreakTime
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const result = validateBreak(body);

    if (result.error) {
      return errorResponse(result.error);
    }

    const data = await prisma.breakTime.create({
      data: result.data,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Break time created successfully.",
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/hr/BreakTime:", error);

    return errorResponse(
      "Failed to create break time.",
      500
    );
  }
}

/**
 * PUT /api/hr/BreakTime
 * Expects the record ID in the JSON body.
 */
export async function PUT(request) {
  try {
    const body = await request.json();

    const result = validateBreak(body, true);

    if (result.error) {
      return errorResponse(result.error);
    }

    const existing = await prisma.breakTime.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return errorResponse("Break time not found.", 404);
    }

    const data = await prisma.breakTime.update({
      where: {
        id: body.id,
      },
      data: result.data,
    });

    return NextResponse.json({
      success: true,
      message: "Break time updated successfully.",
      data,
    });
  } catch (error) {
    console.error("PUT /api/hr/BreakTime:", error);

    return errorResponse(
      "Failed to update break time.",
      500
    );
  }
}

/**
 * DELETE /api/hr/BreakTime
 * Expects the record ID in the JSON body.
 */
export async function DELETE(request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return errorResponse("Break time ID is required.");
    }

    const existing = await prisma.breakTime.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return errorResponse("Break time not found.", 404);
    }

    await prisma.breakTime.update({
      where: {
        id: body.id,
      },
      data: {
        deletedAt: new Date(),
        status: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Break time deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/hr/BreakTime:", error);

    return errorResponse(
      "Failed to delete break time.",
      500
    );
  }
}
