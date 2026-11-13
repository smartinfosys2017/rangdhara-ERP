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

const getEmployeeCandidateWhere = (searchParams) => {
  const query =
    searchParams.get("search")?.trim() ||
    searchParams.get("query")?.trim() ||
    "";

  const mode = searchParams.get("mode") || "all";

  const allowedModes = ["Active", "Inactive", "Hold"];

  if (mode !== "all" && !allowedModes.includes(mode)) {
    return {
      error: "Invalid mode filter. Allowed values: Active, Inactive, Hold.",
    };
  }

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

      ...(mode !== "all" ? { mode } : {}),

      ...(query
        ? {
          OR: [
            {
              StatusName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              CategoryName: {
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
            {
              mode: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        }
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

const logEmployeeCandidate = async ({
  request,
  event,
  EmployeeCandidate,
  user,
}) => {
  if (!EmployeeCandidate || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(EmployeeCandidate.id),
    entityType: "hr.EmployeeCandidate",
    description: `Employee/Candidate Status ${event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted"
      }: ${EmployeeCandidate.StatusName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET Employee/Candidate Status LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    // Pagination
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

    // Sorting
    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const allowedSortFields = [
      "id",
      "StatusName",
      "CategoryName",
      "description",
      "mode",
      "isDefault",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    // Search: supports query or search
    const query =
      searchParams.get("query")?.trim() ||
      searchParams.get("search")?.trim() ||
      "";

    // Status parameter now represents mode
    const status = searchParams.get("status") || "all";

    const normalizedStatus =
      status.toLowerCase() === "all"
        ? "all"
        : status.charAt(0).toUpperCase() +
          status.slice(1).toLowerCase();

    const allowedModes = ["Active", "Inactive", "Hold"];

    if (
      normalizedStatus !== "all" &&
      !allowedModes.includes(normalizedStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status. Allowed values: Active, Inactive, Hold.",
        },
        { status: 400 }
      );
    }

    // Date filters
    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");

    const updatedFrom = searchParams.get("updatedFrom");
    const updatedTo = searchParams.get("updatedTo");

    const parseDate = (value, endOfDay = false) => {
      if (!value) return undefined;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      // Reject invalid calendar dates too
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        return null;
      }

      if (endOfDay) {
        date.setUTCDate(date.getUTCDate() + 1);
      }

      return date;
    };

    const createdFromDate = parseDate(createdFrom);
    const createdToDate = parseDate(createdTo, true);

    const updatedFromDate = parseDate(updatedFrom);
    const updatedToDate = parseDate(updatedTo, true);

    if (
      createdFromDate === null ||
      createdToDate === null ||
      updatedFromDate === null ||
      updatedToDate === null
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date filter. Use YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    if (
      (createdFromDate &&
        createdToDate &&
        createdFromDate >= createdToDate) ||
      (updatedFromDate &&
        updatedToDate &&
        updatedFromDate >= updatedToDate)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date range.",
        },
        { status: 400 }
      );
    }

    // Build Prisma WHERE condition
    const where = {
      deletedAt: null,

      // Active / Inactive / Hold
      ...(normalizedStatus !== "all"
        ? { mode: normalizedStatus }
        : {}),

      // Search
      ...(query
        ? {
            OR: [
              {
                StatusName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                CategoryName: {
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
              {
                mode: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),

      // Created date
      ...((createdFromDate || createdToDate) && {
        createdAt: {
          ...(createdFromDate && { gte: createdFromDate }),
          ...(createdToDate && { lt: createdToDate }),
        },
      }),

      // Updated date
      ...((updatedFromDate || updatedToDate) && {
        updatedAt: {
          ...(updatedFromDate && { gte: updatedFromDate }),
          ...(updatedToDate && { lt: updatedToDate }),
        },
      }),
    };

    // Fetch records
    const [total, data] = await Promise.all([
      prisma.EmployeeCandidateStatus.count({ where }),

      prisma.EmployeeCandidateStatus.findMany({
        where,
        orderBy: {
          [sortField]: dir,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Employee/Candidate Status fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Employee/Candidate Status LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to fetch Employee/Candidate Status.",
      },
      { status: 500 }
    );
  }
}



// ======================================================
// CREATE Employee/Candidate Status 
// ======================================================
export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

    if (accessError) return accessError;

    const body = await request.json();

    const StatusName = body.StatusName?.trim();
    const CategoryId = body.CategoryId || null;
    const description = body.description?.trim() || null;
    const mode = body.mode || "Active";
    const isDefault = body.isDefault ?? false;

    // =======================================================
    // VALIDATION
    // =======================================================

    if (!StatusName) {
      return NextResponse.json(
        {
          success: false,
          message: "Status Name is required.",
        },
        { status: 400 }
      );
    }

    if (StatusName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Status Name cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    if (!["Active", "Inactive", "Hold"].includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid mode.",
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

    // =======================================================
    // GET CATEGORY NAME
    // =======================================================

    let CategoryName = "";

    if (CategoryId) {
      const category = await prisma.ContactCategory.findUnique({
        where: {
          id: CategoryId,
        },
      });

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected category was not found.",
          },
          { status: 404 }
        );
      }

      CategoryName = category.CategoryName;
    }

    // =======================================================
    // CHECK DUPLICATE STATUS NAME
    // =======================================================

    const existingGroup = await prisma.EmployeeCandidateStatus.findFirst({
      where: {
        StatusName: {
          equals: StatusName,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message: "This Status Name already exists.",
        },
        { status: 409 }
      );
    }

    // =======================================================
    // CREATE STATUS
    // =======================================================

    const EmployeeCandidate = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.EmployeeCandidateStatus.updateMany({
          where: {
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.EmployeeCandidateStatus.create({
        data: {
          StatusName,
          CategoryName,
          description,
          mode,
          isDefault,
          lastSyncAt: new Date(),
        },
      });
    });

    // =======================================================
    // ACTIVITY LOG
    // =======================================================

    await logEmployeeCandidate({
      request,
      event: "create",
      StatusName,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Employee/Candidate Status created successfully.",
      data: EmployeeCandidate,
    });

  } catch (error) {
    console.error("EMPLOYEE CANDIDATE STATUS CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to create Employee/Candidate Status.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// UPDATE Employee/Candidate Status
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee/Candidate Status ID required.",
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

    // ======================================================
    // CHECK EXISTING RECORD
    // ======================================================

    const existing = await prisma.EmployeeCandidateStatus.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee/Candidate Status not found.",
        },
        { status: 404 }
      );
    }

    // ======================================================
    // VALIDATE STATUS NAME
    // ======================================================

    let StatusName = existing.StatusName;

    if (body.StatusName !== undefined) {
      StatusName = body.StatusName?.trim();

      if (!StatusName) {
        return NextResponse.json(
          {
            success: false,
            message: "Status Name is required.",
          },
          { status: 400 }
        );
      }

      if (StatusName.length > 255) {
        return NextResponse.json(
          {
            success: false,
            message: "Status Name cannot exceed 255 characters.",
          },
          { status: 400 }
        );
      }
    }

    // ======================================================
    // VALIDATE MODE
    // ======================================================

    if (
      body.mode !== undefined &&
      !["Active", "Inactive", "Hold"].includes(body.mode)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid mode. Allowed values are Active, Inactive, and Hold.",
        },
        { status: 400 }
      );
    }

    // ======================================================
    // CHECK DUPLICATE STATUS NAME
    // ======================================================

    const duplicateEmployeeCandidate =
      await prisma.EmployeeCandidateStatus.findFirst({
        where: {
          StatusName: {
            equals: StatusName,
            mode: "insensitive",
          },
          id: {
            not: body.id,
          },
          deletedAt: null,
        },
      });

    if (duplicateEmployeeCandidate) {
      return NextResponse.json(
        {
          success: false,
          message: "This Status Name already exists. Please enter a unique Status Name.",
        },
        { status: 409 }
      );
    }

    // ======================================================
    // GET CATEGORY NAME
    // ======================================================

    let CategoryName = existing.CategoryName;

    if (body.CategoryId !== undefined) {
      if (body.CategoryId === null || body.CategoryId === "") {
        CategoryName = "";
      } else {
        const category = await prisma.ContactCategory.findUnique({
          where: {
            id: body.CategoryId,
          },
        });

        if (!category) {
          return NextResponse.json(
            {
              success: false,
              message: "Selected category was not found.",
            },
            { status: 404 }
          );
        }

        CategoryName = category.CategoryName;
      }
    }

    // ======================================================
    // UPDATE RECORD
    // ======================================================

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.EmployeeCandidateStatus.updateMany({
          where: {
            id: { not: body.id },
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const updateData = {
        lastSyncAt: new Date(),
      };

      if (body.StatusName !== undefined) {
        updateData.StatusName = StatusName;
      }

      if (body.CategoryId !== undefined) {
        updateData.CategoryName = CategoryName;
      }

      if (body.description !== undefined) {
        updateData.description =
          body.description?.trim() || null;
      }

      if (body.mode !== undefined) {
        updateData.mode = body.mode;
      }

      if (body.isDefault !== undefined) {
        updateData.isDefault = body.isDefault;
      }

      return tx.EmployeeCandidateStatus.update({
        where: {
          id: body.id,
        },
        data: updateData,
      });
    });

    // ======================================================
    // ACTIVITY LOG
    // ======================================================

    await logEmployeeCandidate({
      request,
      event: "update",
      EmployeeCandidate: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Employee/Candidate Status updated successfully.",
      data: updated,
      sync: true,
    });

  } catch (error) {
    console.error(
      "Employee/Candidate Status UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to update Employee/Candidate Status.",
      },
      { status: 500 }
    );
  }
}
// ======================================================
// PATCH Employee/Candidate Status MODE
// Supports { id, mode } and { ids: [], mode }
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

    if (accessError) return accessError;

    const body = await request.json();

    // ======================================================
    // VALIDATE MODE
    // ======================================================

    const allowedModes = ["Active", "Inactive", "Hold"];

    if (!allowedModes.includes(body.mode)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid mode is required: Active, Inactive, or Hold.",
        },
        { status: 400 }
      );
    }

    // ======================================================
    // GET IDS
    // ======================================================

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
              String(id).trim() !== ""
          )
          .map(String)
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Employee/Candidate Status ID is required.",
        },
        { status: 400 }
      );
    }

    // ======================================================
    // AUTHENTICATION
    // ======================================================

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

    // ======================================================
    // FIND EXISTING RECORDS
    // ======================================================

    const existingGroups =
      await prisma.EmployeeCandidateStatus.findMany({
        where: {
          id: {
            in: ids,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          StatusName: true,
          mode: true,
        },
      });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Employee/Candidate Status records were found.",
        },
        { status: 404 }
      );
    }

    // ======================================================
    // UPDATE MODE
    // ======================================================

    const updateResult =
      await prisma.EmployeeCandidateStatus.updateMany({
        where: {
          id: {
            in: existingGroups.map((item) => item.id),
          },
          deletedAt: null,
        },
        data: {
          mode: body.mode,
          lastSyncAt: new Date(),
        },
      });

    // ======================================================
    // SYSTEM LOG
    // ======================================================

    for (const item of existingGroups) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "hr.EmployeeCandidate",
        description: `Employee/Candidate Status marked ${body.mode}: ${item.StatusName}`,
        ipAddress: getClientIp(request),
      });
    }

    // ======================================================
    // RESPONSE
    // ======================================================

    return NextResponse.json({
      success: true,
      message: `Employee/Candidate Status(s) marked ${body.mode} successfully.`,
      count: updateResult.count,
      sync: true,
    });

  } catch (error) {
    console.error(
      "Employee/Candidate Status MODE UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to update Employee/Candidate Status mode.",
      },
      { status: 500 }
    );
  }
}
// ======================================================
// DELETE Employee/Candidate Status(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

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
          message: "At least one Employee/Candidate Status ID is required.",
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

    const existingGroups = await prisma.EmployeeCandidateStatus.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        StatusName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Employee/Candidate Status were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.EmployeeCandidateStatus.updateMany({
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
        entityType: "hr.EmployeeCandidate",
        description: `Employee/Candidate Status deleted: ${item.StatusName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Employee/Candidate Status deleted successfully."
          : `${deleteResult.count} Employee/Candidate Status deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Employee/Candidate Status DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete Employee/Candidate Status.",
      },
      { status: 500 },
    );
  }
}