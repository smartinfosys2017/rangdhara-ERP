import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
// =========================================================
// GET - List Currency / Get Single Currency
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("currencies");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE CURRENCY
    // -------------------------------------------------------

    if (id) {
      const currencyId =
        Number(id);

      if (
        !Number.isInteger(currencyId) ||
        currencyId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid Currency ID.",
          },
          { status: 400 }
        );
      }

      const currency =
        await prisma.currency.findUnique({
          where: {
            id: currencyId,
          },
        });

      if (!currency) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Currency not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: currency,
      });
    }

    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    const page = Math.max(
      Number(
        searchParams.get("page")
      ) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number(
          searchParams.get("limit")
        ) || 10,
        1
      ),
      100
    );

    const skip =
      (page - 1) * limit;

    // -------------------------------------------------------
    // SEARCH
    // -------------------------------------------------------

    const query =
      searchParams
        .get("query")
        ?.trim() || "";

    const where = query
      ? {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            symbol: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      }
      : {};

    // -------------------------------------------------------
    // SORTING
    // -------------------------------------------------------

    const allowedSortFields = [
      "id",
      "name",
      "symbol",
      "decimal_separator",
      "thousand_separator",
      "placement",
      "createdAt",
      "updatedAt",
    ];

    const requestedSort =
      searchParams.get("sort") ||
      "id";

    const sortField =
      allowedSortFields.includes(
        requestedSort
      )
        ? requestedSort
        : "id";

    const sortDirection =
      searchParams.get("dir") ===
        "asc"
        ? "asc"
        : "desc";

    // -------------------------------------------------------
    // GET DATA + TOTAL
    // -------------------------------------------------------

    const [currency, total] =
      await Promise.all([
        prisma.currency.findMany({
          where,

          orderBy: {
            [sortField]:
              sortDirection,
          },

          skip,
          take: limit,
        }),

        prisma.currency.count({
          where,
        }),
      ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: currency,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET Currency ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch currency.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST - Create Currency
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("currencies");

    if (accessError) {
      return accessError;
    }
    const body =
      await request.json();

    // -------------------------------------------------------
    // GET VALUES
    // -------------------------------------------------------

    const name =
      typeof body?.name ===
        "string"
        ? body.name.trim().toUpperCase()
        : "";

    const symbol =
      typeof body?.symbol ===
        "string"
        ? body.symbol.trim()
        : "";

    const decimal_separator =
      typeof body?.decimal_separator ===
        "string"
        ? body.decimal_separator
        : ",";

    const thousand_separator =
      typeof body?.thousand_separator ===
        "string"
        ? body.thousand_separator
        : ",";

    const placement =
      typeof body?.placement ===
        "string"
        ? body.placement.trim()
        : "before";

    // -------------------------------------------------------
    // VALIDATION - NAME
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency code is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - ISO CODE
    // -------------------------------------------------------

    if (
      !/^[A-Z]{3}$/.test(name)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency code must be a valid 3-letter ISO code.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - SYMBOL
    // -------------------------------------------------------

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency symbol is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - DECIMAL SEPARATOR
    // -------------------------------------------------------

    if (
      ![",", "."].includes(
        decimal_separator
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid decimal separator.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - THOUSAND SEPARATOR
    // -------------------------------------------------------

    if (
      ![
        ",",
        ".",
        "'",
        "",
        " ",
      ].includes(
        thousand_separator
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid thousand separator.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - PLACEMENT
    // -------------------------------------------------------

    if (
      !["before", "after"].includes(
        placement
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency placement must be before or after.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingCurrency =
      await prisma.currency.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingCurrency) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A currency with this code already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const currency =
      await prisma.currency.create({
        data: {
          name,

          symbol,

          decimal_separator,

          thousand_separator,

          placement,
        },
      });

    const user = await getAuthenticatedUser();
    // SYSTEM LOG: CREATE CURRENCY
    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(currency.id),
      entityType: "finance.currency",
      description: `Currency created: ${currency.name}`,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message:
          "Currency created successfully.",
        data: currency,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE Currency ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create currency.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PUT - Update Currency
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("currencies");

    if (accessError) {
      return accessError;
    }
    const body =
      await request.json();

    const currencyId =
      Number(body?.id);

    // -------------------------------------------------------
    // GET VALUES
    // -------------------------------------------------------

    const name =
      typeof body?.name ===
        "string"
        ? body.name.trim().toUpperCase()
        : "";

    const symbol =
      typeof body?.symbol ===
        "string"
        ? body.symbol.trim()
        : "";

    const decimal_separator =
      typeof body?.decimal_separator ===
        "string"
        ? body.decimal_separator
        : ",";

    const thousand_separator =
      typeof body?.thousand_separator ===
        "string"
        ? body.thousand_separator
        : ",";

    const placement =
      typeof body?.placement ===
        "string"
        ? body.placement.trim()
        : "before";

    // -------------------------------------------------------
    // VALIDATION - ID
    // -------------------------------------------------------

    if (
      !Number.isInteger(
        currencyId
      ) ||
      currencyId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Currency ID.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - NAME
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency code is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - ISO CODE
    // -------------------------------------------------------

    if (
      !/^[A-Z]{3}$/.test(name)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency code must be a valid 3-letter ISO code.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - SYMBOL
    // -------------------------------------------------------

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency symbol is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - DECIMAL SEPARATOR
    // -------------------------------------------------------

    if (
      ![",", "."].includes(
        decimal_separator
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid decimal separator.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - THOUSAND SEPARATOR
    // -------------------------------------------------------

    if (
      ![
        ",",
        ".",
        "'",
        "",
        " ",
      ].includes(
        thousand_separator
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid thousand separator.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // VALIDATION - PLACEMENT
    // -------------------------------------------------------

    if (
      !["before", "after"].includes(
        placement
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency placement must be before or after.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK CURRENCY
    // -------------------------------------------------------

    const existingCurrency =
      await prisma.currency.findUnique({
        where: {
          id: currencyId,
        },
      });

    if (!existingCurrency) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE CODE
    // -------------------------------------------------------

    const duplicateCurrency =
      await prisma.currency.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },

          NOT: {
            id: currencyId,
          },
        },
      });

    if (duplicateCurrency) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A currency with this code already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const currency =
      await prisma.currency.update({
        where: {
          id: currencyId,
        },

        data: {
          name,

          symbol,

          decimal_separator,

          thousand_separator,

          placement,
        },
      });

      const user = await getAuthenticatedUser();
      // SYSTEM LOG: UPDATE CURRENCY
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(currency.id),
        entityType: "finance.currency",
        description: `Currency updated: ${currency.name}`,
        ipAddress:  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Currency updated successfully.",

      data: currency,
    });
  } catch (error) {
    console.error(
      "UPDATE Currency ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update currency.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE - Delete Currency
// =========================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("currencies");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency ID is required.",
        },
        { status: 400 }
      );
    }

    const currencyId =
      Number(id);

    if (
      !Number.isInteger(
        currencyId
      ) ||
      currencyId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid Currency ID.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK CURRENCY
    // -------------------------------------------------------

    const existingCurrency =
      await prisma.currency.findUnique({
        where: {
          id: currencyId,
        },
      });

    if (!existingCurrency) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Currency not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // DELETE
    // -------------------------------------------------------

    const deletedCurrency =
      await prisma.currency.delete({
        where: {
          id: currencyId,
        },
      });
      const user = await getAuthenticatedUser();
      // SYSTEM LOG: DELETE CURRENCY
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(deletedCurrency.id),
        entityType: "finance.currency",
        description: `Currency deleted: ${deletedCurrency.name}`,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      message:
        "Currency deleted successfully.",

      data: deletedCurrency,
    });
  } catch (error) {
    console.error(
      "DELETE Currency ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete currency.",
      },
      { status: 500 }
    );
  }
}