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

const getContactCategoryWhere = (searchParams) => {
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

const logContactCategory = async ({
  request,
  event,
  ContactCategory,
  user,
}) => {
  if (!ContactCategory || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(ContactCategory.id),
    entityType: "hr.ContactCategory",
    description: `Contact Category ${event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
      }: ${ContactCategory.CategoryName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET Contact Category LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

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
      "CategoryName",
      "description",
      "status",
      "isDefault",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getContactCategoryWhere(searchParams);

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
      prisma.ContactCategory.count({ where }),

      prisma.ContactCategory.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Contact Category fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Contact Category LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Contact Category.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE Contact Category
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

    if (accessError) return accessError;

    const body = await request.json();
    const CategoryName = body.CategoryName?.trim();

    if (!CategoryName) {
      return NextResponse.json(
        {
          success: false,
          message: "CategoryName Name is required.",
        },
        { status: 400 },
      );
    }
    // Contact Category Name length validation
    if (CategoryName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "CategoryName name cannot exceed 255 characters.",
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
    // Check duplicate Contact Category name (case-insensitive)
    const existingGroup = await prisma.ContactCategory.findFirst({
      where: {
        CategoryName: {
          equals: CategoryName,
          mode: "insensitive",
        },
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message: "This CategoryName name already exists. Please enter a unique CategoryName name.",
        },
        { status: 409 }
      );
    }
    const ContactCategory = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.ContactCategory.updateMany({
          where: {
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      return tx.ContactCategory.create({
        data: {
          CategoryName,
          description: body.description?.trim() || null,
          status: body.status ?? true,
          isDefault: body.isDefault ?? false,
          lastSyncAt: new Date(),
        },
      });
    });

    await logContactCategory({
      request,
      event: "create",
      CategoryName,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "CategoryName created successfully.",
      data: CategoryName,
    });
  } catch (error) {
    console.error("Category Name CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Contact Category.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE Contact Category
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
          message: "Contact Category ID required.",
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

    const existing = await prisma.ContactCategory.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact Category not found.",
        },
        { status: 404 },
      );
    }
    // Check duplicate name, excluding the current Contact Category
    const duplicateContactCategory = await prisma.ContactCategory.findFirst({
      where: {
        CategoryName: {
          equals: body.CategoryName,
          mode: "insensitive",
        },
        NOT: {
          id: body.id
        },
      },
    });

    if (duplicateContactCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Contact Category name already exists. Please enter a unique Contact Category name.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.ContactCategory.updateMany({
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

      if (body.CategoryName !== undefined) {
        const CategoryName = body.CategoryName?.trim();

        if (!CategoryName) {
          throw new Error("Contact Category name is required.");
        }

        updateData.CategoryName = CategoryName;
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

      return tx.ContactCategory.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    await logContactCategory({
      request,
      event: "update",
      ContactCategory: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Contact Category updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("Contact Category UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Contact Category.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH Contact Category STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("contact-category");

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
          message: "At least one Contact Category ID is required.",
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

    const existingGroups = await prisma.ContactCategory.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        CategoryName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Category were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.ContactCategory.updateMany({
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
        entityType: "hr.ContactCategory",
        description: `Contact Category marked ${body.status ? "active" : "inactive"
          }: ${item.CategoryName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Contact Category(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Contact Category STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Category status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE Contact Category(S) - SOFT DELETE
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
          message: "At least one Contact Category ID is required.",
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

    const existingGroups = await prisma.ContactCategory.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        CategoryName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Contact Category were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.ContactCategory.updateMany({
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
        entityType: "hr.ContactCategory",
        description: `Contact Category deleted: ${item.CategoryName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Contact Category deleted successfully."
          : `${deleteResult.count} Contact Category deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("Contact Category DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete Contact Category.",
      },
      { status: 500 },
    );
  }
}