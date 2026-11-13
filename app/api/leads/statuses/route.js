import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
// =========================================================
// GET - List Statuses / Get Single Status
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("statuses");
                      
    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE STATUS
    // -------------------------------------------------------

    if (id) {
      const statusId = Number(id);

      if (!Number.isInteger(statusId) || statusId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Status ID.",
          },
          { status: 400 }
        );
      }

      const status = await prisma.statuses.findUnique({
        where: {
          id: statusId,
        },
      });

      if (!status) {
        return NextResponse.json(
          {
            success: false,
            message: "Status not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: status,
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
      "color",
      "statusOrder",
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

    const [statuses, total] = await Promise.all([
      prisma.statuses.findMany({
        where,

        orderBy: {
          [sortField]: sortDirection,
        },

        skip,
        take: limit,
      }),

      prisma.statuses.count({
        where,
      }),
    ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: statuses,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Statuses ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch statuses.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST - Create Status
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("statuses");
                      
    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const color =
      typeof body?.color === "string"
        ? body.color.trim()
        : "";

    const statusOrder =
      Number(body?.statusOrder ?? body?.statusorder);

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Status name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // STATUS ORDER
    // -------------------------------------------------------

    const finalStatusOrder =
      Number.isInteger(statusOrder)
        ? statusOrder
        : 0;

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingStatus =
      await prisma.statuses.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingStatus) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A status with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const status =
      await prisma.statuses.create({
        data: {
          name,

          color: color || null,

          // IMPORTANT:
          // Prisma field is statusOrder
          statusOrder: finalStatusOrder,
        },
      });

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message:
          "Status created successfully.",
        data: status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE Status ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create status.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PUT - Update Status
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("statuses");
                      
    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const statusId = Number(body?.id);

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const color =
      typeof body?.color === "string"
        ? body.color.trim()
        : "";

    const statusOrder =
      Number(
        body?.statusOrder ??
        body?.statusorder
      );

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !Number.isInteger(statusId) ||
      statusId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Status ID.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Status name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK STATUS
    // -------------------------------------------------------

    const existingStatus =
      await prisma.statuses.findUnique({
        where: {
          id: statusId,
        },
      });

    if (!existingStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Status not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicateStatus =
      await prisma.statuses.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },

          NOT: {
            id: statusId,
          },
        },
      });

    if (duplicateStatus) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A status with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // UPDATE DATA
    // -------------------------------------------------------

    const updateData = {
      name,
      color: color || null,
    };

    if (Number.isInteger(statusOrder)) {
      updateData.statusOrder = statusOrder;
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const status =
      await prisma.statuses.update({
        where: {
          id: statusId,
        },

        data: updateData,
      });

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,
      message:
        "Status updated successfully.",
      data: status,
    });
  } catch (error) {
    console.error(
      "UPDATE Status ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update status.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE - Delete Status
// =========================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("statuses");
                      
    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Status ID is required.",
        },
        { status: 400 }
      );
    }

    const statusId = Number(id);

    if (
      !Number.isInteger(statusId) ||
      statusId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Status ID.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK STATUS
    // -------------------------------------------------------

    const existingStatus =
      await prisma.statuses.findUnique({
        where: {
          id: statusId,
        },
      });

    if (!existingStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Status not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // DELETE STATUS
    // -------------------------------------------------------

    const deletedStatus =
      await prisma.statuses.delete({
        where: {
          id: statusId,
        },
      });

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,
      message:
        "Status deleted successfully.",
      data: deletedStatus,
    });
  } catch (error) {
    console.error(
      "DELETE Status ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete status.",
      },
      { status: 500 }
    );
  }
}