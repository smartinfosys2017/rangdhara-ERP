import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

const getAccessError = async () => checkMenuAccess("transaction-type-master");
const allowedSortFields = new Set([
  "id", "TransactionType", "Description", "EffectOnTransaction", "status",
  "isDefault", "createdAt", "updatedAt",
]);

function parseDateStart(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseDateEndExclusive(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000`);
  if (Number.isNaN(date.getTime())) return undefined;
  date.setDate(date.getDate() + 1);
  return date;
}

function buildWhere(searchParams) {
  const query = (searchParams.get("query") || "").trim();
  const status = searchParams.get("status") || "all";
  const createdFrom = parseDateStart(searchParams.get("createdFrom"));
  const createdTo = parseDateEndExclusive(searchParams.get("createdTo"));
  const updatedFrom = parseDateStart(searchParams.get("updatedFrom"));
  const updatedTo = parseDateEndExclusive(searchParams.get("updatedTo"));

  return {
    deletedAt: null,
    ...(query && {
      OR: [
        { TransactionType: { contains: query, mode: "insensitive" } },
        { Description: { contains: query, mode: "insensitive" } },
      ],
    }),
    ...(status === "active" ? { status: true } : {}),
    ...(status === "inactive" ? { status: false } : {}),
    ...((createdFrom || createdTo) && {
      createdAt: { ...(createdFrom ? { gte: createdFrom } : {}), ...(createdTo ? { lt: createdTo } : {}) },
    }),
    ...((updatedFrom || updatedTo) && {
      updatedAt: { ...(updatedFrom ? { gte: updatedFrom } : {}), ...(updatedTo ? { lt: updatedTo } : {}) },
    }),
  };
}

// GET: filtered, sorted, paginated list; export=1 returns all matching records.
export async function GET(request) {
  try {
    const accessError = await getAccessError();
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 10)));
    const requestedSort = searchParams.get("sort") || "createdAt";
    const sort = allowedSortFields.has(requestedSort) ? requestedSort : "createdAt";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
    const where = buildWhere(searchParams);
    const isExport = searchParams.get("export") === "1";

    const [total, data] = await Promise.all([
      prisma.transactionType.count({ where }),
      prisma.transactionType.findMany({
        where,
        orderBy: { [sort]: dir },
        ...(isExport ? {} : { skip: (page - 1) * limit, take: limit }),
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Transaction Type fetched successfully.",
      data,
      pagination: { total, page, limit: isExport ? total : limit },
    });
  } catch (error) {
    console.error("TRANSACTION TYPE LIST ERROR", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch Transaction Type." }, { status: 500 });
  }
}

// POST: create a transaction type. The Copy action uses this endpoint too.
export async function POST(request) {
  try {
    // 1. Check access
    const accessError = await getAccessError();
    if (accessError) return accessError;

    // 2. Parse request body
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 },
      );
    }

    // 3. Validate TransactionType
    if (
      typeof body.TransactionType !== "string" ||
      !body.TransactionType.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction Type is required and must be a valid string.",
        },
        { status: 400 },
      );
    }

    const name = body.TransactionType.trim();

    if (name.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction Type must not exceed 255 characters.",
        },
        { status: 400 },
      );
    }

    // 4. Validate Description
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

    const description = body.Description?.trim() || "";

    if (description.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Description must not exceed 255 characters.",
        },
        { status: 400 },
      );
    }

    // 5. Validate EffectOnTransaction
    const allowedEffects = ["addition", "deductions"];

    if (
      body.EffectOnTransaction !== undefined &&
      (
        typeof body.EffectOnTransaction !== "string" ||
        !allowedEffects.includes(body.EffectOnTransaction)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "EffectOnTransaction must be addition or deductions.",
        },
        { status: 400 },
      );
    }

    // 6. Validate status
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

    // 7. Validate isDefault
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

    // 8. Validate customFields
    let submittedCustomFields = {};

    if (body.customFields !== undefined) {
      if (
        body.customFields === null ||
        typeof body.customFields !== "object" ||
        Array.isArray(body.customFields)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "customFields must be a valid object.",
          },
          { status: 400 },
        );
      }

      submittedCustomFields = body.customFields;
    }

    // 9. Authenticate user
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

    // 10. Check duplicate Transaction Type name
    const existingTransactionType =
      await prisma.transactionType.findFirst({
        where: {
          TransactionType: {
            equals: name,
            mode: "insensitive",
          },
          deletedAt: null,
        },
      });

    if (existingTransactionType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Transaction Type already exists. Please enter a unique Transaction Type.",
        },
        { status: 409 },
      );
    }

    // 11. Create Transaction Type
    const transactionType = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.transactionType.updateMany({
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

      return tx.transactionType.create({
        data: {
          TransactionType: name,
          Description: description,
          EffectOnTransaction: body.EffectOnTransaction ?? "addition",
          status: body.status ?? true,
          isDefault: body.isDefault ?? false,
          customFields: submittedCustomFields,
          lastSyncAt: new Date(),
        },
      });
    });

    // 12. System log
    await systemLog({
      event: "create",
      userId: String(user.id),
      entityId: String(transactionType.id),
      entityType: "inventory.transaction-type",
      description: `Transaction Type created: ${transactionType.TransactionType}`,
      ipAddress:
        request.headers
          .get("x-forwarded-for")
          ?.split(",")[0]
          ?.trim() || null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transaction Type created successfully.",
        data: transactionType,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("TRANSACTION TYPE CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Transaction Type.",
      },
      { status: 500 },
    );
  }
}

// PUT: update one transaction type.
export async function PUT(request) {
  try {
    // 1. Check access
    const accessError = await getAccessError();
    if (accessError) return accessError;

    // 2. Parse request body
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 },
      );
    }

    // 3. Validate ID
    if (
      body.id === undefined ||
      body.id === null ||
      body.id === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction Type ID is required.",
        },
        { status: 400 },
      );
    }

    // 4. Validate TransactionType if supplied
    if (body.TransactionType !== undefined) {
      if (
        typeof body.TransactionType !== "string" ||
        !body.TransactionType.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Transaction Type is required and must be a valid string.",
          },
          { status: 400 },
        );
      }

      if (body.TransactionType.trim().length > 255) {
        return NextResponse.json(
          {
            success: false,
            message: "Transaction Type must not exceed 255 characters.",
          },
          { status: 400 },
        );
      }
    }

    // 5. Validate Description
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

    // 6. Validate EffectOnTransaction
    const allowedEffects = ["addition", "deductions"];

    if (
      body.EffectOnTransaction !== undefined &&
      (
        typeof body.EffectOnTransaction !== "string" ||
        !allowedEffects.includes(body.EffectOnTransaction)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "EffectOnTransaction must be addition or deductions.",
        },
        { status: 400 },
      );
    }

    // 7. Validate status
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

    // 8. Validate isDefault
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

    // 9. Validate customFields
    if (
      body.customFields !== undefined &&
      (
        body.customFields === null ||
        typeof body.customFields !== "object" ||
        Array.isArray(body.customFields)
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "customFields must be a valid object.",
        },
        { status: 400 },
      );
    }

    // 10. Authenticate user
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

    // 11. Check existing record
    const existing = await prisma.transactionType.findUnique({
      where: { id: body.id },
      select: {
        customFields: true,
        deletedAt: true,
      },
    });

    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Transaction Type not found.",
        },
        { status: 404 },
      );
    }

    // 12. Check duplicate TransactionType name
    if (body.TransactionType !== undefined) {
      const name = body.TransactionType.trim();

      const duplicate = await prisma.transactionType.findFirst({
        where: {
          TransactionType: {
            equals: name,
            mode: "insensitive",
          },
          id: { not: body.id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This Transaction Type already exists. Please enter a unique Transaction Type.",
          },
          { status: 409 },
        );
      }
    }

    // 13. Merge custom fields
    const existingCustomFields =
      existing.customFields &&
        typeof existing.customFields === "object" &&
        !Array.isArray(existing.customFields)
        ? existing.customFields
        : {};

    const submittedCustomFields =
      body.customFields !== undefined
        ? body.customFields
        : {};

    const mergedCustomFields = {
      ...existingCustomFields,
      ...submittedCustomFields,
    };

    // 14. Update Transaction Type
    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.transactionType.updateMany({
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

      if (body.TransactionType !== undefined) {
        updateData.TransactionType = body.TransactionType.trim();
      }

      if (body.Description !== undefined) {
        updateData.Description = body.Description?.trim() || "";
      }

      if (body.EffectOnTransaction !== undefined) {
        updateData.EffectOnTransaction = body.EffectOnTransaction;
      }

      if (body.status !== undefined) {
        updateData.status = body.status;
      }

      if (body.isDefault !== undefined) {
        updateData.isDefault = body.isDefault;
      }

      if (body.customFields !== undefined) {
        updateData.customFields = mergedCustomFields;
      }

      return tx.transactionType.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    // 15. System log
    await systemLog({
      event: "update",
      userId: user?.id ? String(user.id) : null,
      entityId: String(updated.id),
      entityType: "inventory.transaction-type",
      description: `Transaction Type updated: ${updated.TransactionType}`,
      ipAddress:
        request.headers
          .get("x-forwarded-for")
          ?.split(",")[0]
          ?.trim() || null,
    });

    return NextResponse.json({
      success: true,
      message: "Transaction Type updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("TRANSACTION TYPE UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update Transaction Type.",
      },
      { status: 500 },
    );
  }
}

// PATCH: mark one or many records active/inactive.
export async function PATCH(request) {
  try {
    const accessError = await getAccessError();
    if (accessError) return accessError;
    const body = await request.json();
    if (typeof body.status !== "boolean") return NextResponse.json({ success: false, message: "A valid status is required." }, { status: 400 });
    const ids = [...new Set([...(Array.isArray(body.ids) ? body.ids : []), ...(body.id ? [body.id] : [])])].filter(Boolean);
    if (!ids.length) return NextResponse.json({ success: false, message: "Select at least one Transaction Type." }, { status: 400 });

    const result = await prisma.transactionType.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { status: body.status, lastSyncAt: new Date() },
    });
    const user = await getAuthenticatedUser();
    await systemLog({
      event: "update",
      userId: user?.id ? String(user.id) : null,
      entityId: ids.join(","),
      entityType: "inventory.transaction-type",
      description: `Transaction Type status set to ${body.status ? "Active" : "Inactive"} for ${result.count} record(s)`,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({ success: true, message: `${result.count} transaction type(s) marked ${body.status ? "active" : "inactive"}.`, count: result.count, sync: true });
  } catch (error) {
    console.error("TRANSACTION TYPE STATUS ERROR", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update status." }, { status: 500 });
  }
}

// DELETE: soft-delete one record or multiple selected records.
export async function DELETE(request) {
  try {
    const accessError = await getAccessError();
    if (accessError) return accessError;
    const body = await request.json();
    const ids = [...new Set([...(Array.isArray(body.ids) ? body.ids : []), ...(body.id ? [body.id] : [])])].filter(Boolean);
    if (!ids.length) return NextResponse.json({ success: false, message: "Transaction Type ID required." }, { status: 400 });

    const records = await prisma.transactionType.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, TransactionType: true } });
    const now = new Date();
    const result = await prisma.transactionType.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt: now, lastSyncAt: now } });
    const user = await getAuthenticatedUser();
    for (const record of records) {
      await systemLog({
        event: "delete",
        userId: user?.id ? String(user.id) : null,
        entityId: String(record.id),
        entityType: "inventory.transaction-type",
        description: `Transaction Type deleted: ${record.TransactionType}`,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      });
    }
    return NextResponse.json({ success: true, message: `${result.count} transaction type(s) deleted successfully.`, count: result.count, sync: true });
  } catch (error) {
    console.error("TRANSACTION TYPE DELETE ERROR", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to delete Transaction Type." }, { status: 500 });
  }
}
