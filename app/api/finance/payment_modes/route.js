import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
// =========================================================
// GET - List Payment Methods / Get Single Payment Method
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("payment-modes");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE PAYMENT METHOD
    // -------------------------------------------------------

    if (id) {
      const paymentMethodId = Number(id);

      if (!Number.isInteger(paymentMethodId) || paymentMethodId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Payment Method ID.",
          },
          { status: 400 },
        );
      }

      const paymentMethod = await prisma.paymentMethod.findUnique({
        where: {
          id: paymentMethodId,
        },
      });

      if (!paymentMethod) {
        return NextResponse.json(
          {
            success: false,
            message: "Payment Method not found.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: paymentMethod,
      });
    }

    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;

    // -------------------------------------------------------
    // SEARCH
    // -------------------------------------------------------

    const query = searchParams.get("query")?.trim() || "";

    const where = query
      ? {
          name: {
            contains: query,
            mode: "insensitive",
          },
        }
      : {};

    // -------------------------------------------------------
    // SORTING
    // -------------------------------------------------------

    const allowedSortFields = [
      "id",
      "name",
      "active",
      "show_on_pdf",
      "selected_by_default",
      "invoices_only",
      "expenses_only",
      "createdAt",
      "updatedAt",
    ];

    const requestedSort = searchParams.get("sort") || "id";

    const sortField = allowedSortFields.includes(requestedSort)
      ? requestedSort
      : "id";

    const sortDirection = searchParams.get("dir") === "asc" ? "asc" : "desc";

    // -------------------------------------------------------
    // GET DATA + TOTAL
    // -------------------------------------------------------

    const [paymentMethods, total] = await Promise.all([
      prisma.paymentMethod.findMany({
        where,

        orderBy: {
          [sortField]: sortDirection,
        },

        skip,
        take: limit,
      }),

      prisma.paymentMethod.count({
        where,
      }),
    ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: paymentMethods,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Payment Method ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch payment methods.",
      },
      { status: 500 },
    );
  }
}

// =========================================================
// POST - Create Payment Method
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("payment-modes");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    // -------------------------------------------------------
    // BASIC DATA
    // -------------------------------------------------------

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    // -------------------------------------------------------
    // BOOLEAN DATA
    // -------------------------------------------------------

    const active = body?.active !== undefined ? Boolean(body.active) : true;

    const showOnPdf =
      body?.show_on_pdf !== undefined ? Boolean(body.show_on_pdf) : false;

    const selectedByDefault =
      body?.selected_by_default !== undefined
        ? Boolean(body.selected_by_default)
        : false;

    const invoicesOnly =
      body?.invoices_only !== undefined ? Boolean(body.invoices_only) : false;

    const expensesOnly =
      body?.expenses_only !== undefined ? Boolean(body.expenses_only) : false;

    // -------------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment Method name is required.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingPaymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message: "A Payment Method with this name already exists.",
        },
        { status: 409 },
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        name,

        description: description || null,

        active,

        show_on_pdf: showOnPdf,

        selected_by_default: selectedByDefault,

        invoices_only: invoicesOnly,

        expenses_only: expensesOnly,
      },
    });
    const user = await getAuthenticatedUser();
    // SYSTEM LOG: CREATE PAYMENT METHOD
    await systemLog({
      event: "create",
      userId: String(user.id),
      entityId: String(paymentMethod.id),
      entityType: "finance.payment-method",
      description: `Payment Method created: ${paymentMethod.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message: "Payment Method created successfully.",

        data: paymentMethod,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE Payment Method ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create payment method.",
      },
      { status: 500 },
    );
  }
}

// =========================================================
// PUT - Update Payment Method
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("payment-modes");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const paymentMethodId = Number(body?.id);

    // -------------------------------------------------------
    // BASIC DATA
    // -------------------------------------------------------

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    // -------------------------------------------------------
    // BOOLEAN DATA
    // -------------------------------------------------------

    const active = body?.active !== undefined ? Boolean(body.active) : true;

    const showOnPdf =
      body?.show_on_pdf !== undefined ? Boolean(body.show_on_pdf) : false;

    const selectedByDefault =
      body?.selected_by_default !== undefined
        ? Boolean(body.selected_by_default)
        : false;

    const invoicesOnly =
      body?.invoices_only !== undefined ? Boolean(body.invoices_only) : false;

    const expensesOnly =
      body?.expenses_only !== undefined ? Boolean(body.expenses_only) : false;

    // -------------------------------------------------------
    // VALIDATE ID
    // -------------------------------------------------------

    if (!Number.isInteger(paymentMethodId) || paymentMethodId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Payment Method ID.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment Method name is required.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // CHECK PAYMENT METHOD
    // -------------------------------------------------------

    const existingPaymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id: paymentMethodId,
      },
    });

    if (!existingPaymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment Method not found.",
        },
        { status: 404 },
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicatePaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },

        NOT: {
          id: paymentMethodId,
        },
      },
    });

    if (duplicatePaymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message: "A Payment Method with this name already exists.",
        },
        { status: 409 },
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const paymentMethod = await prisma.paymentMethod.update({
      where: {
        id: paymentMethodId,
      },

      data: {
        name,

        description: description || null,

        active,

        show_on_pdf: showOnPdf,

        selected_by_default: selectedByDefault,

        invoices_only: invoicesOnly,

        expenses_only: expensesOnly,
      },
    });
    const user = await getAuthenticatedUser();
    // SYSTEM LOG: UPDATE PAYMENT METHOD
    await systemLog({
      event: "update",
      userId: String(user.id),
      entityId: String(paymentMethod.id),
      entityType: "finance.payment-method",
      description: `Payment Method updated: ${paymentMethod.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      message: "Payment Method updated successfully.",

      data: paymentMethod,
    });
  } catch (error) {
    console.error("UPDATE Payment Method ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update payment method.",
      },
      { status: 500 },
    );
  }
}

// =========================================================
// DELETE - Delete Payment Method
// =========================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("payment-modes");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // VALIDATE ID
    // -------------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment Method ID is required.",
        },
        { status: 400 },
      );
    }

    const paymentMethodId = Number(id);

    if (!Number.isInteger(paymentMethodId) || paymentMethodId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Payment Method ID.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // CHECK PAYMENT METHOD
    // -------------------------------------------------------

    const existingPaymentMethod = await prisma.paymentMethod.findUnique({
      where: {
        id: paymentMethodId,
      },
    });

    if (!existingPaymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment Method not found.",
        },
        { status: 404 },
      );
    }

    // -------------------------------------------------------
    // DELETE
    // -------------------------------------------------------

    const deletedPaymentMethod = await prisma.paymentMethod.delete({
      where: {
        id: paymentMethodId,
      },
    });
    const user = await getAuthenticatedUser();
    // SYSTEM LOG: DELETE PAYMENT METHOD
    await systemLog({
      event: "delete",
      userId: String(user.id),
      entityId: String(deletedPaymentMethod.id),
      entityType: "finance.payment-method",
      description: `Payment Method deleted: ${deletedPaymentMethod.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      message: "Payment Method deleted successfully.",

      data: deletedPaymentMethod,
    });
  } catch (error) {
    console.error("DELETE Payment Method ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete payment method.",
      },
      { status: 500 },
    );
  }
}