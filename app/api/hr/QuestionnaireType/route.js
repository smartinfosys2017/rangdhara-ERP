
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
              ? { lt: new Date(end.getTime() + 24 * 60 * 60 * 1000) }
              : {}),
          }
        : undefined,
  };
};

const validateCategory = async (categoryId) => {
  if (!categoryId) {
    return { error: "Questionnaire Category is required." };
  }

  const category = await prisma.QuestionnaireCategory.findFirst({
    where: {
      id: categoryId,
      deletedAt: null,
      status: true,
    },
    select: {
      id: true,
      categoryName: true,
    },
  });

  if (!category) {
    return {
      error: "Selected Questionnaire Category was not found or is inactive.",
    };
  }

  return { category };
};

const getQuestionnaireTypeWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";
  const categoryId = searchParams.get("questionnaireCategoryId") || "";

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
                typeName: {
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
                questionnaireCategory: {
                  categoryName: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),

      ...(categoryId ? { questionnaireCategoryId: categoryId } : {}),

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

const logQuestionnaireType = async ({
  request,
  event,
  questionnaireType,
  user,
}) => {
  if (!questionnaireType || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(questionnaireType.id),
    entityType: "hr.questionnairetype",
    description: `Questionnaire Type ${
      event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
    }: ${questionnaireType.typeName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET QUESTIONNAIRE TYPE LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-type");

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
      "typeName",
      "description",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getQuestionnaireTypeWhere(searchParams);

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
      prisma.QuestionnaireType.count({ where }),

      prisma.QuestionnaireType.findMany({
        where,
        include: {
          questionnaireCategory: {
            select: {
              id: true,
              categoryName: true,
            },
          },
        },
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Questionnaire Types fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("QUESTIONNAIRE TYPE LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Questionnaire Types.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE QUESTIONNAIRE TYPE
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-type");

    if (accessError) return accessError;

    const body = await request.json();

    const typeName = body.typeName?.trim();
    const questionnaireCategoryId = body.questionnaireCategoryId;

    if (!typeName) {
      return NextResponse.json(
        {
          success: false,
          message: "Questionnaire Type Name is required.",
        },
        { status: 400 },
      );
    }

    if (typeName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Questionnaire Type Name cannot exceed 255 characters.",
        },
        { status: 400 },
      );
    }

    if (
      body.status !== undefined &&
      typeof body.status !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid status (true or false) is required.",
        },
        { status: 400 },
      );
    }

    const categoryResult = await validateCategory(questionnaireCategoryId);

    if (categoryResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: categoryResult.error,
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

    const existingType = await prisma.QuestionnaireType.findFirst({
      where: {
        typeName: {
          equals: typeName,
          mode: "insensitive",
        },
        questionnaireCategoryId,
        deletedAt: null,
      },
    });

    if (existingType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Questionnaire Type already exists in the selected category.",
        },
        { status: 409 },
      );
    }

    const questionnaireType = await prisma.QuestionnaireType.create({
      data: {
        typeName,
        questionnaireCategoryId,
        description: body.description?.trim() || null,
        status: body.status ?? true,
        lastSyncAt: new Date(),
      },
    });

    await logQuestionnaireType({
      request,
      event: "create",
      questionnaireType,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Questionnaire Type created successfully.",
      data: questionnaireType,
    });
  } catch (error) {
    console.error("QUESTIONNAIRE TYPE CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Questionnaire Type.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE QUESTIONNAIRE TYPE
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-type");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Questionnaire Type ID is required.",
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

    const existing = await prisma.QuestionnaireType.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Questionnaire Type not found.",
        },
        { status: 404 },
      );
    }

    const updateData = {
      lastSyncAt: new Date(),
    };

    if (body.typeName !== undefined) {
      const typeName = body.typeName?.trim();

      if (!typeName) {
        return NextResponse.json(
          {
            success: false,
            message: "Questionnaire Type Name is required.",
          },
          { status: 400 },
        );
      }

      if (typeName.length > 255) {
        return NextResponse.json(
          {
            success: false,
            message: "Questionnaire Type Name cannot exceed 255 characters.",
          },
          { status: 400 },
        );
      }

      updateData.typeName = typeName;
    }

    if (body.questionnaireCategoryId !== undefined) {
      const categoryResult = await validateCategory(
        body.questionnaireCategoryId,
      );

      if (categoryResult.error) {
        return NextResponse.json(
          {
            success: false,
            message: categoryResult.error,
          },
          { status: 400 },
        );
      }

      updateData.questionnaireCategoryId = body.questionnaireCategoryId;
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

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

    const finalTypeName = updateData.typeName ?? existing.typeName;
    const finalCategoryId =
      updateData.questionnaireCategoryId ??
      existing.questionnaireCategoryId;

    const duplicateType = await prisma.QuestionnaireType.findFirst({
      where: {
        typeName: {
          equals: finalTypeName,
          mode: "insensitive",
        },
        questionnaireCategoryId: finalCategoryId,
        deletedAt: null,
        NOT: {
          id: body.id,
        },
      },
    });

    if (duplicateType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Questionnaire Type already exists in the selected category.",
        },
        { status: 409 },
      );
    }

    const updated = await prisma.QuestionnaireType.update({
      where: { id: body.id },
      data: updateData,
    });

    await logQuestionnaireType({
      request,
      event: "update",
      questionnaireType: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Questionnaire Type updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("QUESTIONNAIRE TYPE UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Questionnaire Type.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH QUESTIONNAIRE TYPE STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-type");

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
          message: "At least one Questionnaire Type ID is required.",
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

    const existingTypes = await prisma.QuestionnaireType.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        typeName: true,
      },
    });

    if (!existingTypes.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Questionnaire Types were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.QuestionnaireType.updateMany({
      where: {
        id: { in: existingTypes.map((item) => item.id) },
        deletedAt: null,
      },
      data: {
        status: body.status,
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingTypes) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "hr.questionnairetype",
        description: `Questionnaire Type marked ${
          body.status ? "active" : "inactive"
        }: ${item.typeName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Questionnaire Type(s) marked ${
        body.status ? "active" : "inactive"
      }.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("QUESTIONNAIRE TYPE STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to update Questionnaire Type status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE QUESTIONNAIRE TYPE(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("questionnaire-type");

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
          message: "At least one Questionnaire Type ID is required.",
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

    const existingTypes = await prisma.QuestionnaireType.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        typeName: true,
      },
    });

    if (!existingTypes.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Questionnaire Types were found to delete.",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    const deleteResult = await prisma.QuestionnaireType.updateMany({
      where: {
        id: { in: existingTypes.map((item) => item.id) },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        lastSyncAt: now,
      },
    });

    for (const item of existingTypes) {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "hr.questionnairetype",
        description: `Questionnaire Type deleted: ${item.typeName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Questionnaire Type deleted successfully."
          : `${deleteResult.count} Questionnaire Types deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("QUESTIONNAIRE TYPE DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.message || "Failed to delete Questionnaire Type.",
      },
      { status: 500 },
    );
  }
}