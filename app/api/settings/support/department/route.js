import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";
function generateReferenceCode() {
  return `DEPT-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}

// =========================================================
// GET
//
// GET /api/settings/support/department
//
// Supported:
// ?page=1
// ?limit=10
// ?sort=id
// ?sort=name
// ?dir=asc
// ?dir=desc
// ?query=support
//
// Single:
// ?id=1
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("department");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    const page = Math.max(
      Number(searchParams.get("page") || 1),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") || 10),
        1
      ),
      100
    );

    const sort = searchParams.get("sort") || "id";

    const dir =
      searchParams.get("dir") === "asc"
        ? "asc"
        : "desc";

    const query =
      searchParams.get("query")?.trim() || "";

    // =======================================================
    // GET SINGLE DEPARTMENT
    // =======================================================

    if (id) {
      const departmentId = Number(id);

      if (!departmentId || Number.isNaN(departmentId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Valid department ID is required.",
          },
          { status: 400 }
        );
      }

      const department =
        await prisma.department.findUnique({
          where: {
            id: departmentId,
          },
        });

      if (!department) {
        return NextResponse.json(
          {
            success: false,
            message: "Department not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: department,
      });
    }

    // =======================================================
    // SEARCH
    // =======================================================

    const where = {};

    if (query) {
      where.name = {
        contains: query,
        mode: "insensitive",
      };
    }

    // =======================================================
    // SORT
    // =======================================================

    const allowedSortFields = [
      "id",
      "name",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "id";

    const orderBy = {
      [sortField]: dir,
    };

    // =======================================================
    // TOTAL
    // =======================================================

    const total = await prisma.department.count({
      where,
    });

    // =======================================================
    // PAGINATION
    // =======================================================

    const skip = (page - 1) * limit;

    // =======================================================
    // FETCH
    // =======================================================

    const departments =
      await prisma.department.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      });

    // =======================================================
    // RESPONSE
    // =======================================================

    return NextResponse.json({
      success: true,

      data: departments,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      sorting: {
        sort: sortField,
        dir,
      },

      query,
    });
  } catch (error) {
    console.error(
      "GET DEPARTMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch departments.",
      },
      { status: 500 }
    );
  }
}
// =========================================================
// POST
// Create Department
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("department");

    if (accessError) {
      return accessError;
    }
    const body =
      await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Department name is required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingDepartment =
      await prisma.department.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingDepartment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A department with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const department =
      await prisma.department.create({
        data: {
          name,
        },
      });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(department.id),
      entityType: "settings.support.department",
      referenceCode,
      description: `Department created: ${department.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json(
      {
        success: true,
        message:
          "Department created successfully.",
        data: department,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE DEPARTMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create department.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// PUT
// Update Department
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("department");

    if (accessError) {
      return accessError;
    }
    const body =
      await request.json();

    const id =
      Number(body.id);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid department ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Department name is required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // CHECK DEPARTMENT
    // -------------------------------------------------------

    const existingDepartment =
      await prisma.department.findUnique({
        where: {
          id,
        },
      });

    if (!existingDepartment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Department not found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicate =
      await prisma.department.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
          NOT: {
            id,
          },
        },
      });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another department with this name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const department =
      await prisma.department.update({
        where: {
          id,
        },
        data: {
          name,
        },
      });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "update",
      userId: user?.id ? String(user.id) : null,
      entityId: String(department.id),
      entityType: "settings.support.department",
      referenceCode,
      description: `Department updated: ${department.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({
      success: true,
      message:
        "Department updated successfully.",
      data: department,
    });
  } catch (error) {
    console.error(
      "UPDATE DEPARTMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update department.",
      },
      {
        status: 500,
      }
    );
  }
}

// =========================================================
// DELETE
// Delete Department
// =========================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("department");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id =
      Number(
        searchParams.get("id")
      );

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Valid department ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // -------------------------------------------------------
    // CHECK DEPARTMENT
    // -------------------------------------------------------

    const department =
      await prisma.department.findUnique({
        where: {
          id,
        },
      });

    if (!department) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Department not found.",
        },
        {
          status: 404,
        }
      );
    }

    // -------------------------------------------------------
    // DELETE
    // -------------------------------------------------------

    await prisma.department.delete({
      where: {
        id,
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await prisma.department.delete({
      where: {
        id,
      },
    });

    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(department.id),
      entityType: "settings.support.department",
      referenceCode,
      description: `Department deleted: ${department.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({
      success: true,
      message:
        "Department deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE DEPARTMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete department.",
      },
      {
        status: 500,
      }
    );
  }
}