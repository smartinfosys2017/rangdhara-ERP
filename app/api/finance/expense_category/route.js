import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// =========================================================
// GET - List Expense Categories / Get Single Category
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("expense-category");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE EXPENSE CATEGORY
    // -------------------------------------------------------

    if (id) {
      const expenseCategoryId = Number(id);

      if (
        !Number.isInteger(expenseCategoryId) ||
        expenseCategoryId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Expense Category ID.",
          },
          { status: 400 }
        );
      }

      const expenseCategory =
        await prisma.expenseCategory.findUnique({
          where: {
            id: expenseCategoryId,
          },
        });

      if (!expenseCategory) {
        return NextResponse.json(
          {
            success: false,
            message: "Expense Category not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: expenseCategory,
      });
    }

    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    const page = Math.max(
      Number(searchParams.get("page")) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit")) || 10,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    // -------------------------------------------------------
    // SEARCH
    // -------------------------------------------------------

    const query = searchParams.get("query")?.trim() || "";

    const where = {};

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

    // -------------------------------------------------------
    // SORTING
    // -------------------------------------------------------

    const allowedSortFields = [
      "id",
      "name",
      "createdAt",
      "updatedAt",
    ];

    const requestedSort =
      searchParams.get("sort") || "id";

    const sortField =
      allowedSortFields.includes(requestedSort)
        ? requestedSort
        : "id";

    const sortDirection =
      searchParams.get("dir") === "asc"
        ? "asc"
        : "desc";

    // -------------------------------------------------------
    // GET DATA + TOTAL
    // -------------------------------------------------------

    const [expenseCategories, total] =
      await Promise.all([
        prisma.expenseCategory.findMany({
          where,

          orderBy: {
            [sortField]: sortDirection,
          },

          skip,
          take: limit,
        }),

        prisma.expenseCategory.count({
          where,
        }),
      ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: expenseCategories,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    });
  } catch (error) {
    console.error(
      "GET Expense Category ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch expense categories.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST - Create Expense Category
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("expense-category");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    // -------------------------------------------------------
    // BASIC DATA
    // -------------------------------------------------------

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Expense Category name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingExpenseCategory =
      await prisma.expenseCategory.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingExpenseCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An Expense Category with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const expenseCategory =
      await prisma.expenseCategory.create({
        data: {
          name,

          description:
            description || null,
        },
      });
    const user = await getAuthenticatedUser();
    // SYSTEM LOG: CREATE EXPENSE CATEGORY
    await systemLog({
      event: "create",
      userId: String(user.id),
      entityId: String(expenseCategory.id),
      entityType: "finance.expense-category",
      description: `Expense Category created: ${expenseCategory.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Expense Category created successfully.",

        data: expenseCategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE Expense Category ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create expense category.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PUT - Update Expense Category
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("expense-category");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const expenseCategoryId =
      Number(body?.id);

    // -------------------------------------------------------
    // BASIC DATA
    // -------------------------------------------------------

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATE ID
    // -------------------------------------------------------

    if (
      !Number.isInteger(expenseCategoryId) ||
      expenseCategoryId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Expense Category ID.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Expense Category name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK EXPENSE CATEGORY
    // -------------------------------------------------------

    const existingExpenseCategory =
      await prisma.expenseCategory.findUnique({
        where: {
          id: expenseCategoryId,
        },
      });

    if (!existingExpenseCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Expense Category not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicateExpenseCategory =
      await prisma.expenseCategory.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },

          NOT: {
            id: expenseCategoryId,
          },
        },
      });

    if (duplicateExpenseCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An Expense Category with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const expenseCategory =
      await prisma.expenseCategory.update({
        where: {
          id: expenseCategoryId,
        },

        data: {
          name,

          description:
            description || null,
        },
      });
    const user = await getAuthenticatedUser();
    // SYSTEM LOG: UPDATE EXPENSE CATEGORY
    await systemLog({
      event: "update",
      userId: String(user.id),
      entityId: String(expenseCategory.id),
      entityType: "finance.expense-category",
      description: `Expense Category updated: ${expenseCategory.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Expense Category updated successfully.",

      data: expenseCategory,
    });
  } catch (error) {
    console.error(
      "UPDATE Expense Category ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update expense category.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE - Delete Expense Category
// =========================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("expense-category");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    // -------------------------------------------------------
    // VALIDATE ID
    // -------------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Expense Category ID is required.",
        },
        { status: 400 }
      );
    }

    const expenseCategoryId =
      Number(id);

    if (
      !Number.isInteger(expenseCategoryId) ||
      expenseCategoryId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Expense Category ID.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK EXPENSE CATEGORY
    // -------------------------------------------------------

    const existingExpenseCategory =
      await prisma.expenseCategory.findUnique({
        where: {
          id: expenseCategoryId,
        },
      });

    if (!existingExpenseCategory) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Expense Category not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // DELETE
    // -------------------------------------------------------

    const deletedExpenseCategory =
      await prisma.expenseCategory.delete({
        where: {
          id: expenseCategoryId,
        },
      });
    const user = await getAuthenticatedUser();
    // SYSTEM LOG: DELETE EXPENSE CATEGORY
    await systemLog({
      event: "delete",
      userId: String(user.id),
      entityId: String(deletedExpenseCategory.id),
      entityType: "finance.expense-category",
      description: `Expense Category deleted: ${deletedExpenseCategory.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Expense Category deleted successfully.",

      data: deletedExpenseCategory,
    });
  } catch (error) {
    console.error(
      "DELETE Expense Category ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete expense category.",
      },
      { status: 500 }
    );
  }
}