
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// ======================================================
// HELPERS
// ======================================================

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

const validDate = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRange = (from, to) => {
  const start = validDate(from);
  const end = validDate(to);

  if ((from && !start) || (to && !end)) {
    return { error: "Invalid date filter." };
  }

  if (start && end && start > end) {
    return {
      error: "The From date cannot be after the To date.",
    };
  }

  return {
    range:
      start || end
        ? {
          ...(start ? { gte: start } : {}),
          ...(end
            ? {
              lt: new Date(end.getTime() + 24 * 60 * 60 * 1000),
            }
            : {}),
        }
        : undefined,
  };
};

const getProductTypeWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const createdRange = getDateRange(
    searchParams.get("createdFrom"),
    searchParams.get("createdTo"),
  );

  const updatedRange = getDateRange(
    searchParams.get("updatedFrom"),
    searchParams.get("updatedTo"),
  );

  if (createdRange.error || updatedRange.error) {
    return {
      error: createdRange.error || updatedRange.error,
    };
  }

  return {
    where: {
      deletedAt: null,

      ...(query
        ? {
          OR: [
            {
              ProductType: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              Description: {
                contains: query,
                mode: "insensitive",
              },
            },
          ],
        }
        : {}),

      ...(status === "active"
        ? { status: true }
        : status === "inactive"
          ? { status: false }
          : {}),

      ...(createdRange.range
        ? { createdAt: createdRange.range }
        : {}),

      ...(updatedRange.range
        ? { updatedAt: updatedRange.range }
        : {}),
    },
  };
};

const getProductTypeIds = (body) =>
  [
    ...new Set(
      (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
        .filter(
          (id) =>
            id !== null &&
            id !== undefined &&
            String(id).trim() !== "",
        )
        .map(String),
    ),
  ];

const logProductType = async ({
  request,
  event,
  productType,
  user,
}) => {
  if (!productType || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(productType.id),
    entityType: "inventory.product-type",
    description: `Item Type ${event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted"
      }: ${productType.ProductType}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET Item TYPE LIST
// Supports search, pagination, sorting, status and dates.
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("item-type-master");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10",
      10,
    );

    const limit = Math.min(
      10000,
      Math.max(
        1,
        Number.isFinite(requestedLimit) ? requestedLimit : 10,
      ),
    );

    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    // Whitelist Prisma sort fields.
    const allowedSortFields = [
      "id",
      "ProductType",
      "Description",
      "status",
      "isDefault",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getProductTypeWhere(searchParams);

    if (filterResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: filterResult.error,
        },
        { status: 400 },
      );
    }

    const where = filterResult.where;

    const [total, data] = await Promise.all([
      prisma.ptoductType.count({ where }),

      prisma.ptoductType.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Item Types fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("ITEM TYPE LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch Item Types.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE Item TYPE
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("item-type-master");

    if (accessError) return accessError;

    const body = await request.json();

    // 1. Validate ProductType
    if (typeof body.ProductType !== "string" || !body.ProductType.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Type name is required and must be a valid string.",
        },
        { status: 400 },
      );
    }

    const ProductType = body.ProductType.trim();

    if (ProductType.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Type name must not exceed 255 characters.",
        },
        { status: 400 },
      );
    }

    // 2. Validate Description
    if (
      body.Description !== undefined &&
      body.Description !== null &&
      typeof body.Description !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Description must be a valid string.",
        },
        { status: 400 },
      );
    }

    const Description = body.Description?.trim() || "";

    if (Description.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Description must not exceed 255 characters.",
        },
        { status: 400 },
      );
    }

    // 3. Validate status
    if (
      body.status !== undefined &&
      typeof body.status !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be true or false.",
        },
        { status: 400 },
      );
    }

    // 4. Validate isDefault
    if (
      body.isDefault !== undefined &&
      typeof body.isDefault !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "isDefault must be true or false.",
        },
        { status: 400 },
      );
    }

    // 5. Authenticate user
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    // 6. Check duplicate Item Type name
    const existingProductType = await prisma.ptoductType.findFirst({
      where: {
        ProductType: {
          equals: ProductType,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (existingProductType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Item Type name already exists. Please enter a unique Item Type name.",
        },
        { status: 409 },
      );
    }

    // 7. Create Item Type
    const productType = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.ptoductType.updateMany({
          where: {
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
            lastSyncAt: new Date(),
          },
        });
      }

      return tx.ptoductType.create({
        data: {
          ProductType,
          Description,
          status: body.status ?? true,
          isDefault: body.isDefault ?? false,
          lastSyncAt: new Date(),
        },
      });
    });

    // 8. System log
    await logProductType({
      request,
      event: "create",
      productType,
      user,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Item Type created successfully.",
        data: productType,
        sync: true,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("ITEM TYPE CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Item Type.",
      },
      { status: 500 },
    );
  }
}
// ======================================================
// UPDATE Item TYPE
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("item-type-master");

    if (accessError) return accessError;

    const body = await request.json();

    // 1. Validate ID
    if (
      body.id === undefined ||
      body.id === null ||
      body.id === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Type ID is required.",
        },
        { status: 400 },
      );
    }

    // 2. Validate ProductType
    if (body.ProductType !== undefined) {
      if (
        typeof body.ProductType !== "string" ||
        !body.ProductType.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Item Type name is required and must be a valid string.",
          },
          { status: 400 },
        );
      }

      if (body.ProductType.trim().length > 255) {
        return NextResponse.json(
          {
            success: false,
            message: "Item Type name must not exceed 255 characters.",
          },
          { status: 400 },
        );
      }
    }

    // 3. Validate Description
    if (
      body.Description !== undefined &&
      body.Description !== null &&
      typeof body.Description !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Description must be a valid string.",
        },
        { status: 400 },
      );
    }

    if (
      typeof body.Description === "string" &&
      body.Description.trim().length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Description must not exceed 1000 characters.",
        },
        { status: 400 },
      );
    }

    // 4. Validate status
    if (
      body.status !== undefined &&
      typeof body.status !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be true or false.",
        },
        { status: 400 },
      );
    }

    // 5. Validate isDefault
    if (
      body.isDefault !== undefined &&
      typeof body.isDefault !== "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "isDefault must be true or false.",
        },
        { status: 400 },
      );
    }

    // 6. Authenticate user
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    // 7. Check whether Item Type exists
    const existing = await prisma.ptoductType.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Item Type not found.",
        },
        { status: 404 },
      );
    }

    // 8. Check duplicate name, excluding the current record
    if (body.ProductType !== undefined) {
      const ProductType = body.ProductType.trim();

      const duplicateProductType = await prisma.ptoductType.findFirst({
        where: {
          ProductType: {
            equals: ProductType,
            mode: "insensitive",
          },
          id: { not: body.id },
          deletedAt: null,
        },
      });

      if (duplicateProductType) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This Item Type name already exists. Please enter a unique Item Type name.",
          },
          { status: 409 },
        );
      }
    }

    // 9. Update Item Type
    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.ptoductType.updateMany({
          where: {
            id: { not: body.id },
            isDefault: true,
            deletedAt: null,
          },
          data: {
            isDefault: false,
            lastSyncAt: new Date(),
          },
        });
      }

      const updateData = {
        lastSyncAt: new Date(),
      };

      if (body.ProductType !== undefined) {
        updateData.ProductType = body.ProductType.trim();
      }

      if (body.Description !== undefined) {
        updateData.Description = body.Description?.trim() || "";
      }

      if (body.status !== undefined) {
        updateData.status = body.status;
      }

      if (body.isDefault !== undefined) {
        updateData.isDefault = body.isDefault;
      }

      return tx.ptoductType.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    // 10. System log
    await logProductType({
      request,
      event: "update",
      productType: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item Type updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM TYPE UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update Item Type.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH Item TYPE STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("item-type-master");

    if (accessError) return accessError;

    const body = await request.json();

    if (typeof body.status !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "A valid status (true or false) is required.",
        },
        { status: 400 },
      );
    }

    const ids = getProductTypeIds(body);

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Item Type ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const existingProductTypes = await prisma.ptoductType.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        ProductType: true,
      },
    });

    if (!existingProductTypes.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Item Types were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.ptoductType.updateMany({
      where: {
        id: {
          in: existingProductTypes.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        status: body.status,
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingProductTypes) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "inventory.product-type",
        description: `Item Type marked ${body.status ? "active" : "inactive"
          }: ${item.ProductType}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Item Type(s) marked ${body.status ? "active" : "inactive"
        }.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM TYPE STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update Item Type status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE Item TYPE(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("item-type-master");

    if (accessError) return accessError;

    const body = await request.json();
    const ids = getProductTypeIds(body);

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Item Type ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const existingProductTypes = await prisma.ptoductType.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        ProductType: true,
      },
    });

    if (!existingProductTypes.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active Item Types were found to delete.",
        },
        { status: 404 },
      );
    }

    const deleteResult = await prisma.ptoductType.updateMany({
      where: {
        id: {
          in: existingProductTypes.map((item) => item.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        lastSyncAt: new Date(),
      },
    });

    for (const item of existingProductTypes) {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "inventory.product-type",
        description: `Item Type deleted: ${item.ProductType}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Item Type deleted successfully."
          : `${deleteResult.count} Item Type(s) deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM TYPE DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete Item Type(s).",
      },
      { status: 500 },
    );
  }
}
