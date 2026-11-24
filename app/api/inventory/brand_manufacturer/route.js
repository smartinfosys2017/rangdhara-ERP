
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// ======================================================
// HELPERS
// ======================================================

const ENTITY_TYPE = "inventory.brand-manufacturer";
const MENU_KEY = "brand_manufacturer";

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
    return { error: "The From date cannot be after the To date." };
  }

  return {
    range:
      start || end
        ? {
          ...(start ? { gte: start } : {}),
          ...(end
            ? { lt: new Date(end.getTime() + 24 * 60 * 60 * 1000) }
            : {}),
        }
        : undefined,
  };
};

const validateCustomFields = (customFields) =>
  customFields !== null &&
  typeof customFields === "object" &&
  !Array.isArray(customFields);

const validateBrandManufacturer = (body) => {
  const brandName = body.brandName?.trim();
  const manufacturerName = body.manufacturerName?.trim();

  const websiteURL =
    body.websiteURL == null
      ? ""
      : typeof body.websiteURL === "string"
        ? body.websiteURL.trim()
        : null;

  if (!brandName) return "Brand name is required.";
  if (!manufacturerName) return "Manufacturer name is required.";

  if (brandName.length > 255) {
    return "Brand name cannot exceed 255 characters.";
  }

  if (manufacturerName.length > 255) {
    return "Manufacturer name cannot exceed 255 characters.";
  }

  // Website URL is optional.
  if (websiteURL === null) {
    return "Website URL must be a valid string.";
  }

  // Validate only when Website URL contains text.
  if (websiteURL && websiteURL !== "https://") {
    if (websiteURL.length > 255) {
      return "Website URL cannot exceed 255 characters.";
    }

    try {
      const normalizedURL =
        /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(websiteURL)
          ? websiteURL
          : `https://${websiteURL}`;

      const url = new URL(normalizedURL);

      if (
        !["http:", "https:"].includes(url.protocol) ||
        !url.hostname.includes(".")
      ) {
        return "Please enter a valid website URL.";
      }
    } catch {
      return "Please enter a valid website URL.";
    }
  }

  if (
    body.description != null &&
    typeof body.description !== "string"
  ) {
    return "Description must be a valid string.";
  }

  if (
    body.customFields !== undefined &&
    !validateCustomFields(body.customFields)
  ) {
    return "customFields must be a valid object.";
  }

  return null;
};

const getBrandManufacturerWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";

  const createdBy = searchParams.get("createdBy") || "";
  const updatedBy = searchParams.get("updatedBy") || "";

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
              brandName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              manufacturerName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              websiteURL: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              description: {
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

      ...(createdBy ? { createby: createdBy } : {}),
      ...(updatedBy ? { updateby: updatedBy } : {}),
    },
  };
};

const logBrandManufacturer = async ({
  request,
  event,
  record,
  user,
}) => {
  if (!record || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(record.id),
    entityType: ENTITY_TYPE,
    description: `Brand & Manufacturer ${event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted"
      }: ${record.brandName} - ${record.manufacturerName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// GET BRAND & MANUFACTURER LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
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
      Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10),
    );

    const sort = searchParams.get("sort") || "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const allowedSortFields = [
      "id",
      "brandName",
      "manufacturerName",
      "websiteURL",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const filterResult = getBrandManufacturerWhere(searchParams);

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

    const [total, records] = await Promise.all([
      prisma.brandManufacturer.count({ where }),

      prisma.brandManufacturer.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const userIds = [
      ...new Set(
        records
          .flatMap((item) => [item.createby, item.updateby])
          .filter(Boolean)
          .map(String),
      ),
    ];

    const users = userIds.length
      ? await prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          name: true,
        },
      })
      : [];

    const userMap = new Map(
      users.map((user) => [String(user.id), user.name || "-"]),
    );

    const data = records.map((item) => ({
      ...item,
      createdByName: userMap.get(String(item.createby)) || "-",
      updatedByName: userMap.get(String(item.updateby)) || "-",
    }));

    return NextResponse.json({
      success: true,
      message: "Brand & Manufacturer records fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("BRAND MANUFACTURER LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch records.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE BRAND & MANUFACTURER
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    const validationError = validateBrandManufacturer(body);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const brandName = body.brandName.trim();
    const manufacturerName = body.manufacturerName.trim();
    const websiteURL = body.websiteURL?.trim() || "";

    const duplicate = await prisma.brandManufacturer.findFirst({
      where: {
        brandName: {
          equals: brandName,
          mode: "insensitive",
        },
        manufacturerName: {
          equals: manufacturerName,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Brand and Manufacturer combination already exists.",
        },
        { status: 409 },
      );
    }

    const record = await prisma.brandManufacturer.create({
      data: {
        brandName,
        manufacturerName,
        websiteURL: websiteURL && websiteURL !== "https://" ? websiteURL : null,
        description: body.description?.trim() || null,
        status: body.status ?? true,
        customFields: body.customFields ?? {},
        createby: String(user.id),
        updateby: String(user.id),
        lastSyncAt: new Date(),
      },
    });

    await logBrandManufacturer({
      request,
      event: "create",
      record,
      user,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Brand & Manufacturer created successfully.",
        data: record,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("BRAND MANUFACTURER CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create record.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE BRAND & MANUFACTURER
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Brand & Manufacturer ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const existing = await prisma.brandManufacturer.findFirst({
      where: {
        id: String(body.id),
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Brand & Manufacturer record not found.",
        },
        { status: 404 },
      );
    }

    const validationBody = {
      brandName: body.brandName ?? existing.brandName,
      manufacturerName:
        body.manufacturerName ?? existing.manufacturerName,

      // Preserve existing URL only when the field is omitted.
      // Explicit null means the user cleared the URL.
      websiteURL:
        body.websiteURL !== undefined
          ? body.websiteURL
          : existing.websiteURL,

      description: body.description ?? existing.description,

      customFields:
        body.customFields !== undefined
          ? body.customFields
          : existing.customFields ?? {},
    };

    const validationError = validateBrandManufacturer(validationBody);

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
        },
        { status: 400 },
      );
    }

    const brandName = validationBody.brandName.trim();
    const manufacturerName = validationBody.manufacturerName.trim();

    const duplicate = await prisma.brandManufacturer.findFirst({
      where: {
        brandName: {
          equals: brandName,
          mode: "insensitive",
        },
        manufacturerName: {
          equals: manufacturerName,
          mode: "insensitive",
        },
        deletedAt: null,
        NOT: {
          id: String(body.id),
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Brand and Manufacturer combination already exists.",
        },
        { status: 409 },
      );
    }

    const updateData = {
      lastSyncAt: new Date(),
      updateby: String(user.id),
    };

    if (body.brandName !== undefined) {
      updateData.brandName = brandName;
    }

    if (body.manufacturerName !== undefined) {
      updateData.manufacturerName = manufacturerName;
    }

    if (body.websiteURL !== undefined) {
      const websiteURL =
        typeof body.websiteURL === "string"
          ? body.websiteURL.trim()
          : "";

      updateData.websiteURL =
        websiteURL && websiteURL !== "https://"
          ? websiteURL
          : null;
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.status !== undefined) {
      if (typeof body.status !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            message: "Status must be true or false.",
          },
          { status: 400 },
        );
      }

      updateData.status = body.status;
    }

    if (body.customFields !== undefined) {
      updateData.customFields = body.customFields;
    }

    const updated = await prisma.brandManufacturer.update({
      where: {
        id: String(body.id),
      },
      data: updateData,
    });

    await logBrandManufacturer({
      request,
      event: "update",
      record: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Brand & Manufacturer updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("BRAND MANUFACTURER UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update record.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH BRAND & MANUFACTURER STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
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

    const ids = [
      ...new Set(
        (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
          .filter(
            (id) =>
              id !== null &&
              id !== undefined &&
              String(id).trim(),
          )
          .map((id) => String(id).trim()),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Brand & Manufacturer ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const records = await prisma.brandManufacturer.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        brandName: true,
        manufacturerName: true,
      },
    });

    if (records.length !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more records were not found or have already been deleted.",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    const result = await prisma.brandManufacturer.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: {
        status: body.status,
        updateby: String(user.id),
        lastSyncAt: now,
      },
    });

    for (const record of records) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(record.id),
        entityType: ENTITY_TYPE,
        description: `Brand & Manufacturer marked ${body.status ? "active" : "inactive"
          }: ${record.brandName} - ${record.manufacturerName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Brand & Manufacturer record(s) marked ${body.status ? "active" : "inactive"
        }.`,
      count: result.count,
      updatedIds: ids,
      sync: true,
    });
  } catch (error) {
    console.error("BRAND MANUFACTURER STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE BRAND & MANUFACTURER(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    const ids = [
      ...new Set(
        (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
          .filter(
            (id) =>
              id !== null &&
              id !== undefined &&
              String(id).trim(),
          )
          .map((id) => String(id).trim()),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one Brand & Manufacturer ID is required.",
        },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 },
      );
    }

    const records = await prisma.brandManufacturer.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
    });

    if (records.length !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more records were not found or have already been deleted.",
        },
        { status: 404 },
      );
    }

    const now = new Date();

    const result = await prisma.brandManufacturer.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        updateby: String(user.id),
        lastSyncAt: now,
      },
    });

    if (result.count !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Some records could not be deleted. Please refresh and try again.",
        },
        { status: 409 },
      );
    }

    for (const record of records) {
      await logBrandManufacturer({
        request,
        event: "delete",
        record,
        user,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        result.count === 1
          ? "Brand & Manufacturer deleted successfully."
          : `${result.count} Brand & Manufacturer records deleted successfully.`,
      count: result.count,
      deletedIds: ids,
      sync: true,
    });
  } catch (error) {
    console.error("BRAND MANUFACTURER DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete record(s).",
      },
      { status: 500 },
    );
  }
}