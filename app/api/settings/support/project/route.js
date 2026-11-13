import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";

function generateReferenceCode() {
  return `PROJECT-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}
// =========================================================
// GET - List projects / Get single project
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("project");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE PROJECT
    // -------------------------------------------------------

    if (id) {
      const projectId = Number(id);

      if (
        !Number.isInteger(projectId) ||
        projectId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid project ID.",
          },
          { status: 400 }
        );
      }

      const project =
        await prisma.project.findUnique({
          where: {
            id: projectId,
          },
        });

      if (!project) {
        return NextResponse.json(
          {
            success: false,
            message: "Project not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: project,
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
      allowedSortFields.includes(
        requestedSort
      )
        ? requestedSort
        : "id";

    const sortDirection =
      searchParams.get("dir") === "asc"
        ? "asc"
        : "desc";

    // -------------------------------------------------------
    // GET DATA + TOTAL
    // -------------------------------------------------------

    const [projects, total] =
      await Promise.all([
        prisma.project.findMany({
          where,

          orderBy: {
            [sortField]: sortDirection,
          },

          skip,

          take: limit,
        }),

        prisma.project.count({
          where,
        }),
      ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: projects,

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
      "GET PROJECT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to fetch projects.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST - Create project
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("project");

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
          message: "Project name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingProject =
      await prisma.project.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingProject) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A project with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const project =
      await prisma.project.create({
        data: {
          name,
        },
      });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(project.id),
      entityType: "settings.project",
      referenceCode,
      description: `Project created: ${project.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json(
      {
        success: true,

        message:
          "Project created successfully.",

        data: project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE PROJECT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to create project.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PUT - Update project
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("project");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const projectId = Number(body?.id);

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !Number.isInteger(projectId) ||
      projectId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid project ID.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Project name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK PROJECT
    // -------------------------------------------------------

    const existingProject =
      await prisma.project.findUnique({
        where: {
          id: projectId,
        },
      });

    if (!existingProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicateProject =
      await prisma.project.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },

          NOT: {
            id: projectId,
          },
        },
      });

    if (duplicateProject) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A project with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const project =
      await prisma.project.update({
        where: {
          id: projectId,
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
      entityId: String(project.id),
      entityType: "settings.project",
      referenceCode,
      description: `Project updated: ${project.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json({
      success: true,

      message:
        "Project updated successfully.",

      data: project,
    });
  } catch (error) {
    console.error(
      "UPDATE PROJECT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to update project.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE - Delete project
// =========================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("project");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    const projectId = Number(id);

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !Number.isInteger(projectId) ||
      projectId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid project ID.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK PROJECT
    // -------------------------------------------------------

    const existingProject =
      await prisma.project.findUnique({
        where: {
          id: projectId,
        },
      });

    if (!existingProject) {
      return NextResponse.json(
        {
          success: false,
          message: "Project not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // DELETE
    // -------------------------------------------------------

    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(existingProject.id),
      entityType: "settings.project",
      referenceCode,
      description: `Project deleted: ${existingProject.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json({
      success: true,

      message:
        "Project deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE PROJECT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to delete project.",
      },
      { status: 500 }
    );
  }
}