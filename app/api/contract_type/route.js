import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";

function generateReferenceCode() {
  return `Contrat-Type-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}
// =========================================================
// GET - List Contract Types / Get Single Contract Type
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("contract-type");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    // -------------------------------------------------------
    // GET SINGLE Contract Type
    // -------------------------------------------------------

    if (id) {
      const contract_typeId = Number(id);

      if (
        !Number.isInteger(contract_typeId) ||
        contract_typeId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Contract Type ID.",
          },
          { status: 400 }
        );
      }

      const contract_type = await prisma.ContractType.findUnique({
        where: {
          id: contract_typeId,
        },
      });

      if (!contract_type) {
        return NextResponse.json(
          {
            success: false,
            message: "Contract Type not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: contract_type,
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

    const [contract_types, total] = await Promise.all([
      prisma.ContractType.findMany({
        where,

        orderBy: {
          [sortField]: sortDirection,
        },

        skip,
        take: limit,
      }),

      prisma.ContractType.count({
        where,
      }),
    ]);

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: contract_types,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Contract Types ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to fetch Contract Types.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// POST - Create Contract Type
// =========================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("contract-type");

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
          message: "Contract Type name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE
    // -------------------------------------------------------

    const existingContractType =
      await prisma.ContractType.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      });

    if (existingContractType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A ContractType with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const contract_type =
      await prisma.ContractType.create({
        data: {
          name,
        },
      });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(contract_type.id),
      entityType: "settings.contract_type",
      referenceCode,
      description: `Contract Type created: ${contract_type.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json(
      {
        success: true,
        message:
          "Contract Type created successfully.",
        data: contract_type,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "CREATE Contract Type ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create Contract Type.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// PUT - Update Contract Type
// =========================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("contract-type");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const contract_typeId = Number(body?.id);

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !Number.isInteger(contract_typeId) ||
      contract_typeId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Contract Type ID.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Contract Type name is required.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK Contract Type
    // -------------------------------------------------------

    const existingContractType =
      await prisma.ContractType.findUnique({
        where: {
          id: contract_typeId,
        },
      });

    if (!existingContractType) {
      return NextResponse.json(
        {
          success: false,
          message: "Contract Type not found.",
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // CHECK DUPLICATE NAME
    // -------------------------------------------------------

    const duplicateContractType =
      await prisma.ContractType.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },

          NOT: {
            id: contract_typeId,
          },
        },
      });

    if (duplicateContractType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A Contract Type with this name already exists.",
        },
        { status: 409 }
      );
    }

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    const contract_type =
      await prisma.ContractType.update({
        where: {
          id: contract_typeId,
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
      entityId: String(contract_type.id),
      entityType: "settings.contract_type",
      referenceCode,
      description: `Contract Type updated: ${contract_type.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json({
      success: true,
      message:
        "Contract Type updated successfully.",
      data: contract_type,
    });
  } catch (error) {
    console.error(
      "UPDATE Contract Type ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update Contract Type.",
      },
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE - Delete Contract Type
// =================================================================================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("contract-type");

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
          message: 'Contract Type ID is required.',
        },
        { status: 400 }
      );
    }

    const contract_typeId = Number(id);

    if (
      !Number.isInteger(contract_typeId) ||
      contract_typeId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid Contract Type ID.',
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // CHECK Contract Type
    // -------------------------------------------------------

    const existingContractType =
      await prisma.ContractType.findUnique({
        where: {
          id: contract_typeId,
        },
      });

    if (!existingContractType) {
      return NextResponse.json(
        {
          success: false,
          message: 'Contract Type not found.',
        },
        { status: 404 }
      );
    }

    // -------------------------------------------------------
    // DELETE Contract Type
    // -------------------------------------------------------

    const deletedcontract_type =
      await prisma.ContractType.delete({
        where: {
          id: contract_typeId,
        },
      });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(existingContractType.id),
      entityType: "settings.contract_type",
      referenceCode,
      description: `Contract Type deleted: ${existingContractType.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,
      message: 'Contract Type deleted successfully.',
      data: deletedcontract_type,
    });

  } catch (error) {
    console.error(
      'DELETE Contract Type ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to delete Contract Type.',
      },
      { status: 500 }
    );
  }
}