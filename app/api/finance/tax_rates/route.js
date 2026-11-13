import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// =========================================================
// GET - List Taxes / Get Single Tax
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("tax-rates");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE TAX
    // -------------------------------------------------------

    if (id) {
      const taxId = Number(id);

      if (!Number.isInteger(taxId) || taxId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Tax ID.",
          },
          { status: 400 },
        );
      }

      const tax = await prisma.tax.findUnique({
        where: {
          id: taxId,
        },
      });

      if (!tax) {
        return NextResponse.json(
          {
            success: false,
            message: "Tax not found.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: tax,
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
      "taxrate",
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

    const [taxes, total] = await Promise.all([
      prisma.tax.findMany({
        where,

        orderBy: {
          [sortField]: sortDirection,
        },

        skip,
        take: limit,
      }),

      prisma.tax.count({
        where,
      }),
    ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: taxes,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Tax ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch taxes.",
      },
      { status: 500 },
    );
  }
}

// =========================================================
// POST - Create Tax
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("tax-rates");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    // -------------------------------------------------------
    // TAX RATE
    // -------------------------------------------------------

    const taxrate =
      body?.taxrate === null ||
      body?.taxrate === undefined ||
      body?.taxrate === ""
        ? null
        : Number(body.taxrate);

    // -------------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax name is required.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // VALIDATE TAX RATE
    // -------------------------------------------------------

    if (
      taxrate !== null &&
      (!Number.isFinite(taxrate) || taxrate < 0 || taxrate > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax rate must be between 0 and 100.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE TAX
    // -------------------------------------------------------

    const existingTax = await prisma.tax.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingTax) {
      return NextResponse.json(
        {
          success: false,
          message: "A Tax with this name already exists.",
        },
        { status: 409 },
      );
    }

    // -------------------------------------------------------
    // CREATE TAX
    // -------------------------------------------------------

    const tax = await prisma.tax.create({
      data: {
        name,
        taxrate,
      },
    });
    const user = await getAuthenticatedUser();
    await systemLog({
      event: "create",
      userId: String(user.id),
      entityId: String(tax.id),
      entityType: "finance.tax",
      description: `Tax created: ${tax.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Tax created successfully.",
        data: tax,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE Tax ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create Tax.",
      },
      { status: 500 },
    );
  }
}

// =========================================================
// PUT - Update Tax
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("tax-rates");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const taxId = Number(body?.id);

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    // -------------------------------------------------------
    // TAX RATE
    // -------------------------------------------------------

    const taxrate =
      body?.taxrate === null ||
      body?.taxrate === undefined ||
      body?.taxrate === ""
        ? null
        : Number(body.taxrate);

    // -------------------------------------------------------
    // VALIDATE TAX ID
    // -------------------------------------------------------

    if (!Number.isInteger(taxId) || taxId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Tax ID.",
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
          message: "Tax name is required.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // VALIDATE TAX RATE
    // -------------------------------------------------------

    if (
      taxrate !== null &&
      (!Number.isFinite(taxrate) || taxrate < 0 || taxrate > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax rate must be between 0 and 100.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // CHECK TAX
    // -------------------------------------------------------

    const existingTax = await prisma.tax.findUnique({
      where: {
        id: taxId,
      },
    });

    if (!existingTax) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax not found.",
        },
        { status: 404 },
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicateTax = await prisma.tax.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },

        NOT: {
          id: taxId,
        },
      },
    });

    if (duplicateTax) {
      return NextResponse.json(
        {
          success: false,
          message: "A Tax with this name already exists.",
        },
        { status: 409 },
      );
    }

    // -------------------------------------------------------
    // UPDATE TAX
    // -------------------------------------------------------

    const tax = await prisma.tax.update({
      where: {
        id: taxId,
      },

      data: {
        name,
        taxrate,
      },
    });
    const user = await getAuthenticatedUser();
    await systemLog({
      event: "update",
      userId: String(user.id),
      entityId: String(tax.id),
      entityType: "finance.tax",
      description: `Tax updated: ${tax.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,
      message: "Tax updated successfully.",
      data: tax,
    });
  } catch (error) {
    console.error("UPDATE Tax ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update Tax.",
      },
      { status: 500 },
    );
  }
}

// =========================================================
// DELETE - Delete Tax
// =========================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("tax-rates");

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
          message: "Tax ID is required.",
        },
        { status: 400 },
      );
    }

    const taxId = Number(id);

    if (!Number.isInteger(taxId) || taxId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Tax ID.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // CHECK TAX
    // -------------------------------------------------------

    const existingTax = await prisma.tax.findUnique({
      where: {
        id: taxId,
      },
    });

    if (!existingTax) {
      return NextResponse.json(
        {
          success: false,
          message: "Tax not found.",
        },
        { status: 404 },
      );
    }

    // -------------------------------------------------------
    // DELETE TAX
    // -------------------------------------------------------

    const deletedTax = await prisma.tax.delete({
      where: {
        id: taxId,
      },
    });
    const user = await getAuthenticatedUser();
    await systemLog({
      event: "delete",
      userId: String(user.id),
      entityId: String(deletedTax.id),
      entityType: "finance.tax",
      description: `Tax deleted: ${deletedTax.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,
      message: "Tax deleted successfully.",
      data: deletedTax,
    });
  } catch (error) {
    console.error("DELETE Tax ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete Tax.",
      },
      { status: 500 },
    );
  }
}