import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
// =========================================================
// GET - List Sources / Get Single Source
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("sources");
                  
    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE SOURCE
    // -------------------------------------------------------

    if (id) {
      const sourceId = Number(id);

      if (
        !Number.isInteger(sourceId) ||
        sourceId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Source ID.",
          },
          { status: 400 }
        );
      }

      const source = await prisma.sources.findUnique({
        where: {
          id: sourceId,
        },
      });

      if (!source) {
        return NextResponse.json(
          {
            success: false,
            message: "Source not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: source,
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

    const [sources, total] = await Promise.all([
      prisma.sources.findMany({
        where,

        orderBy: {
          [sortField]: sortDirection,
        },

        skip,
        take: limit,
      }),

      prisma.sources.count({
        where,
      }),
    ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: sources,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Sources ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch Sources.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST - Create Source
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("sources");
                  
    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Source name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingSource =
      await prisma.sources.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingSource) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A Source with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const source =
      await prisma.sources.create({
        data: {
          name,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Source created successfully.",
        data: source,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE Source ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create Source.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PUT - Update Source
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("sources");
                  
    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const sourceId = Number(body?.id);

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !Number.isInteger(sourceId) ||
      sourceId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Source ID.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Source name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK SOURCE
    // -------------------------------------------------------

    const existingSource =
      await prisma.sources.findUnique({
        where: {
          id: sourceId,
        },
      });

    if (!existingSource) {
      return NextResponse.json(
        {
          success: false,
          message: "Source not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicateSource =
      await prisma.sources.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },

          NOT: {
            id: sourceId,
          },
        },
      });

    if (duplicateSource) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A Source with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const source =
      await prisma.sources.update({
        where: {
          id: sourceId,
        },

        data: {
          name,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Source updated successfully.",
      data: source,
    });
  } catch (error) {
    console.error(
      "UPDATE Source ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update Source.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE - Delete Source
// =================================================================================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("sources");
                  
    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get('id');

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Source ID is required.',
        },
        { status: 400 }
      );
    }

    const sourceId = Number(id);

    if (
      !Number.isInteger(sourceId) ||
      sourceId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid Source ID.',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK SOURCE
    // -------------------------------------------------------

    const existingSource =
      await prisma.sources.findUnique({
        where: {
          id: sourceId,
        },
      });

    if (!existingSource) {
      return NextResponse.json(
        {
          success: false,
          message: 'Source not found.',
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // DELETE SOURCE
    // -------------------------------------------------------

    const deletedSource =
      await prisma.sources.delete({
        where: {
          id: sourceId,
        },
      });

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,
      message: 'Source deleted successfully.',
      data: deletedSource,
    });

  } catch (error) {
    console.error(
      'DELETE Source ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to delete Source.',
      },
      { status: 500 }
    );
  }
}