import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";

function generateReferenceCode() {
  return `SERVICE-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}
// =========================================================
// GET
//
// GET /api/settings/support/service
//
// Supported:
// ?page=1
// ?limit=10
// ?sort=id
// ?sort=name
// ?sort=createdAt
// ?sort=updatedAt
// ?dir=asc
// ?dir=desc
// ?query=support
//
// Single:
// ?id=1
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("service");

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
    // GET SINGLE SERVICE
    // =======================================================

    if (id) {
      const serviceId = Number(id);

      if (
        !Number.isInteger(serviceId) ||
        serviceId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Valid service ID is required.",
          },
          { status: 400 }
        );
      }

      const service =
        await prisma.service.findUnique({
          where: {
            id: serviceId,
          },
        });

      if (!service) {
        return NextResponse.json(
          {
            success: false,
            message: "Service not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: service,
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

    const sortField =
      allowedSortFields.includes(sort)
        ? sort
        : "id";

    const orderBy = {
      [sortField]: dir,
    };

    // =======================================================
    // TOTAL
    // =======================================================

    const total =
      await prisma.service.count({
        where,
      });

    // =======================================================
    // PAGINATION
    // =======================================================

    const skip = (page - 1) * limit;

    // =======================================================
    // FETCH
    // =======================================================

    const services =
      await prisma.service.findMany({
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

      data: services,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },

      sorting: {
        sort: sortField,
        dir,
      },

      query,
    });
  } catch (error) {
    console.error(
      "GET SERVICE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch services.",
      },
      { status: 500 }
    );
  }
}
// ---------------------------------------------------------
// POST - Create service
// ---------------------------------------------------------

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("service");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Service name is required.",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate service names
    const existingService =
      await prisma.service.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "A service with this name already exists.",
        },
        { status: 409 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name,
      },
    });
    // SYSTEM LOG: CREATE SERVICE
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(service.id),
      entityType: "settings.support.service",
      referenceCode,
      description: `Service created: ${service.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Service created successfully.",
        data: service,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE SERVICE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create service.",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------
// PUT - Update service
// ---------------------------------------------------------

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("service");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const id = Number(body.id);

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid service ID is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Service name is required.",
        },
        { status: 400 }
      );
    }

    const existingService =
      await prisma.service.findUnique({
        where: {
          id,
        },
      });

    if (!existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    // Check duplicate name excluding current service
    const duplicate =
      await prisma.service.findFirst({
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
          message: "A service with this name already exists.",
        },
        { status: 409 }
      );
    }

    const service =
      await prisma.service.update({
        where: {
          id,
        },
        data: {
          name,
        },
      });
    // SYSTEM LOG: UPDATE SERVICE
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "update",
      userId: user?.id ? String(user.id) : null,
      entityId: String(service.id),
      entityType: "settings.support.service",
      referenceCode,
      description: `Service updated: ${service.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({
      success: true,
      message: "Service updated successfully.",
      data: service,
    });
  } catch (error) {
    console.error("UPDATE SERVICE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update service.",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------
// DELETE - Delete service
// ---------------------------------------------------------

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("service");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid service ID is required.",
        },
        { status: 400 }
      );
    }

    const existingService =
      await prisma.service.findUnique({
        where: {
          id,
        },
      });

    if (!existingService) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    await prisma.service.delete({
      where: {
        id,
      },
    });
    // SYSTEM LOG: DELETE SERVICE
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();
    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(existingService.id),
      entityType: "settings.support.service",
      referenceCode,
      description: `Service deleted: ${existingService.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({
      success: true,
      message: "Service deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE SERVICE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete service.",
      },
      { status: 500 }
    );
  }
}