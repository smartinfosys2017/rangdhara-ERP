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

const getQuestionnaireCategoryWhere = (searchParams) => {
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
              categoryName: {
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

const logQuestionnaireCategory = async ({
  request,
  event,
  QuestionnaireCategory,
  user,
}) => {
  if (!QuestionnaireCategory || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(QuestionnaireCategory.id),
    entityType: "hr.questionnairecategory",
    description: `QuestionnaireCategory ${event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
      }: ${QuestionnaireCategory.categoryName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET QuestionnaireCategory LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-category");

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
      "categoryName",
      "description",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getQuestionnaireCategoryWhere(searchParams);

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
      prisma.QuestionnaireCategory.count({ where }),

      prisma.QuestionnaireCategory.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "QuestionnaireCategory fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("QuestionnaireCategory LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch QuestionnaireCategory.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE QuestionnaireCategory
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-category");

    if (accessError) return accessError;

    const body = await request.json();
    const categoryName = body.categoryName?.trim();

    if (!categoryName) {
      return NextResponse.json(
        {
          success: false,
          message: "QuestionnaireCategory Name is required.",
        },
        { status: 400 },
      );
    }
    // QuestionnaireCategory Name length validation
    if (categoryName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "QuestionnaireCategory name cannot exceed 255 characters.",
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
    // Check duplicate QuestionnaireCategory name (case-insensitive)
    const existingGroup = await prisma.QuestionnaireCategory.findFirst({
      where: {
        categoryName: {
          equals: categoryName,
          mode: "insensitive",
        },
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message: "This QuestionnaireCategory name already exists. Please enter a unique QuestionnaireCategory name.",
        },
        { status: 409 }
      );
    }
    const QuestionnaireCategory = await prisma.$transaction(async (tx) => {
      
      return tx.QuestionnaireCategory.create({
        data: {
          categoryName,
          description: body.description?.trim() || null,
          status: body.status ?? true,
          lastSyncAt: new Date(),
        },
      });
    });

    await logQuestionnaireCategory({
      request,
      event: "create",
      QuestionnaireCategory,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "QuestionnaireCategory created successfully.",
      data: QuestionnaireCategory,
    });
  } catch (error) {
    console.error("QuestionnaireCategory CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create QuestionnaireCategory.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE QuestionnaireCategory
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-category");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "QuestionnaireCategory ID required.",
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

    const existing = await prisma.QuestionnaireCategory.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "QuestionnaireCategory not found.",
        },
        { status: 404 },
      );
    }
    // Check duplicate name, excluding the current QuestionnaireCategory
    const duplicateQuestionnaireCategory = await prisma.QuestionnaireCategory.findFirst({
      where: {
        categoryName: {
          equals: body.categoryName,
          mode: "insensitive",
        },
        NOT: {
          id: body.id
        },
      },
    });

    if (duplicateQuestionnaireCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This QuestionnaireCategory name already exists. Please enter a unique QuestionnaireCategory name.",
        },
        { status: 409 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      
      const updateData = {
        lastSyncAt: new Date(),
      };

      if (body.categoryName !== undefined) {
        const categoryName = body.categoryName?.trim();

        if (!categoryName) {
          throw new Error("QuestionnaireCategory name is required.");
        }

        updateData.categoryName = categoryName;
      }

      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }

      if (body.status !== undefined) {
        updateData.status = body.status;
      }

      return tx.QuestionnaireCategory.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    await logQuestionnaireCategory({
      request,
      event: "update",
      QuestionnaireCategory: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "QuestionnaireCategory updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("QuestionnaireCategory UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update QuestionnaireCategory.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH QuestionnaireCategory STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-category");

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
          message: "At least one QuestionnaireCategory ID is required.",
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

    const existingGroups = await prisma.QuestionnaireCategory.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        categoryName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active QuestionnaireCategory were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.QuestionnaireCategory.updateMany({
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
        entityType: "hr.questionnairecategory",
        description: `QuestionnaireCategory marked ${body.status ? "active" : "inactive"
          }: ${item.categoryName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `QuestionnaireCategory(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("QuestionnaireCategory STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update QuestionnaireCategory status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE QuestionnaireCategory(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-category");

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
          message: "At least one questionnaire category ID is required.",
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

    const existingGroups = await prisma.QuestionnaireCategory.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        categoryName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active questionnaire category were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.QuestionnaireCategory.updateMany({
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
        entityType: "hr.questionnairecategory",
        description: `questionnaire category deleted: ${item.categoryName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "QuestionnaireCategory deleted successfully."
          : `${deleteResult.count} questionnaire category deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("questionnaire category DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete questionnaire category.",
      },
      { status: 500 },
    );
  }
}