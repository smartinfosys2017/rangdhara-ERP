import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

const ENTITY_TYPE = "holiday";

const ALLOWED_SORT_FIELDS = [
  "id",
  "name",
  "fromDate",
  "toDate",
  "description",
  "status",
  "createdAt",
  "updatedAt",
];

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

const parseDate = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const input = value.trim();

  const date = /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? new Date(`${input}T00:00:00.000Z`)
    : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(input) &&
    date.toISOString().slice(0, 10) !== input
  ) {
    return null;
  }

  return date;
};

const parseStatus = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  return null;
};

const getDateRange = (from, to) => {
  const start = from ? parseDate(from) : null;
  const end = to ? parseDate(to) : null;

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

const getHolidayWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const createdRange = getDateRange(
    searchParams.get("createdFrom"),
    searchParams.get("createdTo")
  );

  const updatedRange = getDateRange(
    searchParams.get("updatedFrom"),
    searchParams.get("updatedTo")
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
            ],
          }
        : {}),

      ...(status === "active" || status === "true"
        ? { status: true }
        : status === "inactive" || status === "false"
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

const validateHoliday = (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";

  const fromDate = parseDate(body.fromDate);
  const toDate = parseDate(body.toDate);

  if (!name || !body.fromDate || !body.toDate) {
    return {
      error: "Holiday name, from date, and to date are required.",
    };
  }

  if (name.length > 255) {
    return {
      error: "Holiday name cannot exceed 255 characters.",
    };
  }

  if (!fromDate || !toDate) {
    return {
      error: "Please provide valid holiday dates.",
    };
  }

  if (toDate < fromDate) {
    return {
      error: "To date cannot be earlier than from date.",
    };
  }

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  if (description.length > 1000) {
    return {
      error: "Description cannot exceed 1000 characters.",
    };
  }

  const status = parseStatus(body.status, true);

  if (status === null) {
    return {
      error: "Invalid status. Use true or false.",
    };
  }

  return {
    data: {
      name,
      fromDate,
      toDate,
      description: description || null,
      status,
    },
  };
};

const logHoliday = async ({
  request,
  event,
  holiday,
  user,
}) => {
  if (!holiday) return;

  await systemLog({
    event,
    userId: user?.id ? String(user.id) : null,
    entityId: String(holiday.id),
    entityType: ENTITY_TYPE,
    description: `Holiday ${
      event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
    }: ${holiday.name}`,
    ipAddress: getClientIp(request),
  });
};

const getHolidayIds = (body) => [
  ...new Set(
    (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
      .filter(
        (id) => id !== null && id !== undefined && String(id).trim() !== ""
      )
      .map((id) => String(id).trim())
  ),
];

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("holiday");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

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
      Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10)
    );

    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const sortField = ALLOWED_SORT_FIELDS.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getHolidayWhere(searchParams);

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

    const [total, data] = await Promise.all([
      prisma.holiday.count({ where }),

      prisma.holiday.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Holidays fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("HOLIDAY LIST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch holidays.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("holiday");

    if (accessError) return accessError;

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = validateHoliday(body);

    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const holidayData = validation.data;

    const duplicate = await prisma.holiday.findFirst({
      where: {
        name: {
          equals: holidayData.name,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "This holiday name already exists. Please enter a unique name.",
        },
        { status: 409 }
      );
    }

    const holiday = await prisma.holiday.create({
      data: {
        ...holidayData,
        lastSyncAt: new Date(),
      },
    });

    await logHoliday({
      request,
      event: "create",
      holiday,
      user,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Holiday created successfully.",
        data: holiday,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("HOLIDAY CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create holiday.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("holiday");

    if (accessError) return accessError;

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Holiday ID is required.",
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
        { status: 401 }
      );
    }

    const existing = await prisma.holiday.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Holiday not found.",
        },
        { status: 404 }
      );
    }

    const validation = validateHoliday(body);

    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const holidayData = validation.data;

    const duplicate = await prisma.holiday.findFirst({
      where: {
        id: { not: id },
        name: {
          equals: holidayData.name,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "This holiday name already exists. Please enter a unique name.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.holiday.update({
      where: { id },
      data: {
        ...holidayData,
        lastSyncAt: new Date(),
      },
    });

    await logHoliday({
      request,
      event: "update",
      holiday: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Holiday updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("HOLIDAY UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update holiday.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("holiday");

    if (accessError) return accessError;

    const body = await request.json();

    if (typeof body.status !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "A valid status (true or false) is required.",
        },
        { status: 400 }
      );
    }

    const ids = getHolidayIds(body);

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one holiday ID is required.",
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
        { status: 401 }
      );
    }

    const existingHolidays = await prisma.holiday.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingHolidays.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active holidays were found.",
        },
        { status: 404 }
      );
    }

    const updateResult = await prisma.holiday.updateMany({
      where: {
        id: { in: existingHolidays.map((holiday) => holiday.id) },
        deletedAt: null,
      },
      data: {
        status: body.status,
        lastSyncAt: new Date(),
      },
    });

    for (const holiday of existingHolidays) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(holiday.id),
        entityType: ENTITY_TYPE,
        description: `Holiday marked ${
          body.status ? "active" : "inactive"
        }: ${holiday.name}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Holiday(s) marked ${
        body.status ? "active" : "inactive"
      }.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("HOLIDAY STATUS UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update holiday status.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("holiday");

    if (accessError) return accessError;

    const body = await request.json();
    const ids = getHolidayIds(body);

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one holiday ID is required.",
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
        { status: 401 }
      );
    }

    const existingHolidays = await prisma.holiday.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingHolidays.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active holidays were found to delete.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const deleteResult = await prisma.holiday.updateMany({
      where: {
        id: { in: existingHolidays.map((holiday) => holiday.id) },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        lastSyncAt: now,
      },
    });

    for (const holiday of existingHolidays) {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(holiday.id),
        entityType: ENTITY_TYPE,
        description: `Holiday deleted: ${holiday.name}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Holiday deleted successfully."
          : `${deleteResult.count} holiday(s) deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("HOLIDAY DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete holiday(s).",
      },
      { status: 500 }
    );
  }
}