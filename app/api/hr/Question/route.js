
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
                  lt: new Date(
                    end.getTime() + 24 * 60 * 60 * 1000,
                  ),
                }
              : {}),
          }
        : undefined,
  };
};

// ======================================================
// VALIDATE QUESTIONNAIRE TYPE
// ======================================================

const validateQuestionnaireType = async (questionnaireTypeId) => {
  if (!questionnaireTypeId) {
    return { error: "Questionnaire Type is required." };
  }

  const questionnaireType = await prisma.QuestionnaireType.findFirst({
    where: {
      id: questionnaireTypeId,
      deletedAt: null,
      status: true,
    },
    select: {
      id: true,
      typeName: true,
    },
  });

  if (!questionnaireType) {
    return {
      error: "Selected Questionnaire Type was not found or is inactive.",
    };
  }

  return { questionnaireType };
};

// ======================================================
// GET QUESTION FILTERS
// ======================================================

const getQuestionWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";
  const questionnaireTypeId =
    searchParams.get("questionnaireTypeId") || "";

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

  if (!["all", "active", "inactive"].includes(status)) {
    return {
      error: "Status must be all, active, or inactive.",
    };
  }

  return {
    where: {
      deletedAt: null,

      ...(query
        ? {
            OR: [
              {
                questionName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                question: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                questionnaireType: {
                  is: {
                    typeName: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),

      ...(questionnaireTypeId
        ? { questionnaireTypeId }
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

// ======================================================
// SYSTEM LOG
// ======================================================

const logQuestion = async ({
  request,
  event,
  question,
  user,
}) => {
  if (!question || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(question.id),
    entityType: "hr.question",
    description: `Question ${
      event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
    }: ${question.questionName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET QUESTION LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("question");

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
      "questionName",
      "questionnaireTypeId",
      "question",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getQuestionWhere(searchParams);

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
      prisma.question.count({ where }),

      prisma.question.findMany({
        where,
        include: {
          questionnaireType: {
            select: {
              id: true,
              typeName: true,
            },
          },
        },
        orderBy: {
          [sortField]: dir,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Questions fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("QUESTION LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Questions.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE QUESTION
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("question");

    if (accessError) return accessError;

    const body = await request.json();

    const questionName = body.questionName?.trim();
    const questionnaireTypeId = body.questionnaireTypeId;

    if (!questionName) {
      return NextResponse.json(
        {
          success: false,
          message: "Question Name is required.",
        },
        { status: 400 },
      );
    }

    if (questionName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Question Name cannot exceed 255 characters.",
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

    if (
      body.question !== undefined &&
      body.question !== null &&
      typeof body.question !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Question must be a valid text value.",
        },
        { status: 400 },
      );
    }

    const typeResult = await validateQuestionnaireType(
      questionnaireTypeId,
    );

    if (typeResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: typeResult.error,
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

    const questionRecord = await prisma.question.create({
      data: {
        questionName,
        questionnaireTypeId,
        question: body.question?.trim() || null,
        status: body.status ?? true,
        lastSyncAt: new Date(),
      },
      include: {
        questionnaireType: {
          select: {
            id: true,
            typeName: true,
          },
        },
      },
    });

    await logQuestion({
      request,
      event: "create",
      question: questionRecord,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Question created successfully.",
      data: questionRecord,
    });
  } catch (error) {
    console.error("QUESTION CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create Question.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE QUESTION
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("question");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Question ID is required.",
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

    const existing = await prisma.question.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Question not found.",
        },
        { status: 404 },
      );
    }

    const updateData = {
      lastSyncAt: new Date(),
    };

    if (body.questionName !== undefined) {
      const questionName = body.questionName?.trim();

      if (!questionName) {
        return NextResponse.json(
          {
            success: false,
            message: "Question Name is required.",
          },
          { status: 400 },
        );
      }

      if (questionName.length > 255) {
        return NextResponse.json(
          {
            success: false,
            message: "Question Name cannot exceed 255 characters.",
          },
          { status: 400 },
        );
      }

      updateData.questionName = questionName;
    }

    if (body.questionnaireTypeId !== undefined) {
      const typeResult = await validateQuestionnaireType(
        body.questionnaireTypeId,
      );

      if (typeResult.error) {
        return NextResponse.json(
          {
            success: false,
            message: typeResult.error,
          },
          { status: 400 },
        );
      }

      updateData.questionnaireTypeId = body.questionnaireTypeId;
    }

    if (body.question !== undefined) {
      if (
        body.question !== null &&
        typeof body.question !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Question must be a valid text value.",
          },
          { status: 400 },
        );
      }

      updateData.question = body.question?.trim() || null;
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

    const updated = await prisma.question.update({
      where: {
        id: body.id,
      },
      data: updateData,
      include: {
        questionnaireType: {
          select: {
            id: true,
            typeName: true,
          },
        },
      },
    });

    await logQuestion({
      request,
      event: "update",
      question: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Question updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("QUESTION UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Question.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH QUESTION STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("question");

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
              String(id).trim() !== "",
          )
          .map(String),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Question ID is required.",
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

    const existingQuestions = await prisma.question.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        questionName: true,
      },
    });

    if (!existingQuestions.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Questions were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.question.updateMany({
      where: {
        id: {
          in: existingQuestions.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        status: body.status,
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingQuestions) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "hr.question",
        description: `Question marked ${
          body.status ? "active" : "inactive"
        }: ${item.questionName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Question(s) marked ${
        body.status ? "active" : "inactive"
      }.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("QUESTION STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Question status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE QUESTION(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("question");

    if (accessError) return accessError;

    const body = await request.json();

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
              String(id).trim() !== "",
          )
          .map(String),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Question ID is required.",
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

    const existingQuestions = await prisma.question.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        questionName: true,
      },
    });

    if (!existingQuestions.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Questions were found to delete.",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    const deleteResult = await prisma.question.updateMany({
      where: {
        id: {
          in: existingQuestions.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        lastSyncAt: now,
      },
    });

    for (const item of existingQuestions) {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "hr.question",
        description: `Question deleted: ${item.questionName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Question deleted successfully."
          : `${deleteResult.count} Questions deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("QUESTION DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete Question.",
      },
      { status: 500 },
    );
  }
}