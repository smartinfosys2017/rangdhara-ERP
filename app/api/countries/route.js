import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";
function generateReferenceCode() {
  return `COUNTRY-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}
// =======================================================
// GET - LIST COUNTRIES
// =======================================================
export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("country");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE COUNTRY
    // -------------------------------------------------------

    if (id) {
      const countryId = Number(id);

      if (
        !Number.isInteger(countryId) ||
        countryId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Country ID.",
          },
          { status: 400 }
        );
      }

      const country = await prisma.country.findFirst({
        where: {
          id: countryId,
          deletedAt: null,
        },
      });

      if (!country) {
        return NextResponse.json(
          {
            success: false,
            message: "Country not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: country,
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

    const query =
      searchParams.get("query")?.trim() || "";

    const where = {
      deletedAt: null,
      isActive: true,

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
              iso2: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              iso3: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              phoneCode: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              currencyCode: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              currencyName: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        }
        : {}),
    };

    // -------------------------------------------------------
    // SORTING
    // -------------------------------------------------------

    const allowedSortFields = [
      "id",
      "name",
      "iso2",
      "iso3",
      "phoneCode",
      "currencyCode",
      "currencyName",
      "isActive",
      "createdAt",
      "updatedAt",
      "lastSyncAt",
    ];

    const requestedSort =
      searchParams.get("sort") || "name";

    const sortField =
      allowedSortFields.includes(requestedSort)
        ? requestedSort
        : "name";

    const sortDirection =
      searchParams.get("dir") === "asc"
        ? "asc"
        : "desc";

    // -------------------------------------------------------
    // GET DATA + TOTAL
    // -------------------------------------------------------

    const [countries, total] =
      await Promise.all([
        prisma.country.findMany({
          where,

          orderBy: {
            [sortField]: sortDirection,
          },

          skip,
          take: limit,
        }),

        prisma.country.count({
          where,
        }),
      ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: countries,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(
      "GET Country ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch countries.",
      },
      {
        status: 500,
      }
    );
  }
}

// =======================================================
// POST - CREATE COUNTRY
// =======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("country");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const {
      name,
      iso2,
      iso3,
      phoneCode,
      currencyCode,
      currencyName,
      isActive = true,
    } = body;

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Country name is required.",
        },
        { status: 400 },
      );
    }

    if (!iso2?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO2 code is required.",
        },
        { status: 400 },
      );
    }

    if (iso2.trim().length !== 2) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO2 code must contain exactly 2 characters.",
        },
        { status: 400 },
      );
    }

    if (!iso3?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO3 code is required.",
        },
        { status: 400 },
      );
    }

    if (iso3.trim().length !== 3) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO3 code must contain exactly 3 characters.",
        },
        { status: 400 },
      );
    }

    if (currencyCode && currencyCode.trim().length !== 3) {
      return NextResponse.json(
        {
          success: false,
          message: "Currency code must contain exactly 3 characters.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------
    // NORMALIZE
    // ---------------------------------------------------

    const countryName = name.trim();

    const countryIso2 = iso2.trim().toUpperCase();

    const countryIso3 = iso3.trim().toUpperCase();

    const countryPhoneCode = phoneCode?.trim() || null;

    const countryCurrencyCode = currencyCode?.trim().toUpperCase() || null;

    const countryCurrencyName = currencyName?.trim() || null;

    // ---------------------------------------------------
    // DUPLICATE CHECK
    // ---------------------------------------------------

    const existingCountry = await prisma.country.findFirst({
      where: {
        OR: [
          {
            iso2: countryIso2,
          },
          {
            iso3: countryIso3,
          },
        ],
      },
    });

    if (existingCountry) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingCountry.iso2 === countryIso2
              ? "A country with this ISO2 code already exists."
              : "A country with this ISO3 code already exists.",
        },
        { status: 409 },
      );
    }

    // ---------------------------------------------------
    // CREATE
    // ---------------------------------------------------

    const country = await prisma.country.create({
      data: {
        name: countryName,
        iso2: countryIso2,
        iso3: countryIso3,
        phoneCode: countryPhoneCode,
        currencyCode: countryCurrencyCode,
        currencyName: countryCurrencyName,
        isActive: Boolean(isActive),
      },

      select: {
        id: true,
        name: true,
        iso2: true,
        iso3: true,
        phoneCode: true,
        currencyCode: true,
        currencyName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        lastSyncAt: true,
      },
    });
    // SYSTEM LOG: CREATE COUNTRY
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(country.id),
      entityType: "settings.country",
      referenceCode,
      description: `Country created: ${country.name} (${country.iso2})`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Country created successfully.",
        data: country,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Countries POST error:", error);

    // Prisma unique constraint
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "A country with the same ISO code already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create country.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// PUT - UPDATE COUNTRY
// =======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("country");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const {
      id,
      name,
      iso2,
      iso3,
      phoneCode,
      currencyCode,
      currencyName,
      isActive,
    } = body;

    // ---------------------------------------------------
    // ID VALIDATION
    // ---------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Country ID is required.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------
    // REQUIRED FIELD VALIDATION
    // ---------------------------------------------------

    if (!name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Country name is required.",
        },
        { status: 400 },
      );
    }

    if (!iso2?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO2 code is required.",
        },
        { status: 400 },
      );
    }

    if (iso2.trim().length !== 2) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO2 code must contain exactly 2 characters.",
        },
        { status: 400 },
      );
    }

    if (!iso3?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO3 code is required.",
        },
        { status: 400 },
      );
    }

    if (iso3.trim().length !== 3) {
      return NextResponse.json(
        {
          success: false,
          message: "ISO3 code must contain exactly 3 characters.",
        },
        { status: 400 },
      );
    }

    if (currencyCode && currencyCode.trim().length !== 3) {
      return NextResponse.json(
        {
          success: false,
          message: "Currency code must contain exactly 3 characters.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------
    // FIND COUNTRY
    // ---------------------------------------------------

    const existingCountry = await prisma.country.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!existingCountry || existingCountry.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Country not found.",
        },
        { status: 404 },
      );
    }

    // ---------------------------------------------------
    // NORMALIZE
    // ---------------------------------------------------

    const countryName = name.trim();

    const countryIso2 = iso2.trim().toUpperCase();

    const countryIso3 = iso3.trim().toUpperCase();

    const countryPhoneCode = phoneCode?.trim() || null;

    const countryCurrencyCode = currencyCode?.trim().toUpperCase() || null;

    const countryCurrencyName = currencyName?.trim() || null;

    // ---------------------------------------------------
    // DUPLICATE ISO CHECK
    // ---------------------------------------------------

    const duplicateCountry = await prisma.country.findFirst({
      where: {
        id: {
          not: String(id),
        },

        OR: [
          {
            iso2: countryIso2,
          },
          {
            iso3: countryIso3,
          },
        ],
      },
    });

    if (duplicateCountry) {
      return NextResponse.json(
        {
          success: false,
          message:
            duplicateCountry.iso2 === countryIso2
              ? "Another country with this ISO2 code already exists."
              : "Another country with this ISO3 code already exists.",
        },
        { status: 409 },
      );
    }

    // ---------------------------------------------------
    // UPDATE
    // ---------------------------------------------------

    const country = await prisma.country.update({
      where: {
        id: String(id),
      },

      data: {
        name: countryName,
        iso2: countryIso2,
        iso3: countryIso3,
        phoneCode: countryPhoneCode,
        currencyCode: countryCurrencyCode,
        currencyName: countryCurrencyName,
        ...(typeof isActive === "boolean"
          ? {
            isActive,
          }
          : {}),
      },

      select: {
        id: true,
        name: true,
        iso2: true,
        iso3: true,
        phoneCode: true,
        currencyCode: true,
        currencyName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        lastSyncAt: true,
      },
    });
    // SYSTEM LOG: UPDATE COUNTRY
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "update",
      userId: user?.id ? String(user.id) : null,
      entityId: String(country.id),
      entityType: "settings.country",
      referenceCode,
      description: `Country updated: ${country.name} (${country.iso2})`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({
      success: true,
      message: "Country updated successfully.",
      data: country,
    });
  } catch (error) {
    console.error("Countries PUT error:", error);

    // Prisma unique constraint
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "A country with the same ISO code already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update country.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// DELETE - SOFT DELETE COUNTRY
// =======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("country");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // ---------------------------------------------------
    // ID VALIDATION
    // ---------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Country ID is required.",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------------
    // FIND COUNTRY
    // ---------------------------------------------------

    const existingCountry = await prisma.country.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!existingCountry || existingCountry.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Country not found.",
        },
        { status: 404 },
      );
    }

    // ---------------------------------------------------
    // SOFT DELETE
    // ---------------------------------------------------

    const country = await prisma.country.update({
      where: {
        id: String(id),
      },

      data: {
        deletedAt: new Date(),
        isActive: false,
      },

      select: {
        id: true,
        name: true,
        iso2: true,
        iso3: true,
        phoneCode: true,
        currencyCode: true,
        currencyName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        lastSyncAt: true,
      },
    });
    // SYSTEM LOG: DELETE COUNTRY
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(country.id),
      entityType: "settings.country",
      referenceCode,
      description: `Country deleted: ${country.name} (${country.iso2})`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({
      success: true,
      message: "Country deleted successfully.",
      data: country,
    });
  } catch (error) {
    console.error("Countries DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete country.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      {
        status: 500,
      },
    );
  }
}
