import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { checkMasterUsage } from "@/lib/check-master-usage";

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
    return { error: "The From date cannot be after the To date." };
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

const getItemGroupWhere = (searchParams) => {
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
                groupName: {
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

      ...(createdRange.range ? { createdAt: createdRange.range } : {}),

      ...(updatedRange.range ? { updatedAt: updatedRange.range } : {}),

      ...(createdBy ? { createby: createdBy } : {}),
      ...(updatedBy ? { updateby: updatedBy } : {}),
    },
  };
};

const logItemGroup = async ({ request, event, itemGroup, user }) => {
  if (!itemGroup || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(itemGroup.id),
    entityType: "inventory.item-group",
    description: `Item Group ${
      event === "create"
        ? "created"
        : event === "update"
          ? "updated"
          : "deleted"
    }: ${itemGroup.groupName}`,
    ipAddress: getClientIp(request),
  });
};

// ======================================================
// VALIDATE PARENT CATEGORY
// ======================================================

const validateParentCategory = async (tx, parentId, currentId = null) => {
  // Root category: no parent.
  if (!parentId) {
    return { valid: true };
  }

  const parent = await tx.itemGroup.findFirst({
    where: {
      id: parentId,
      deletedAt: null,
    },
    select: {
      id: true,
      groupName: true,
    },
  });

  if (!parent) {
    return {
      valid: false,
      message: "Selected parent category does not exist or has been deleted.",
    };
  }

  // No circular validation required for a new category.
  if (!currentId) {
    return { valid: true };
  }

  if (parentId === currentId) {
    return {
      valid: false,
      message: "A category cannot be its own parent.",
    };
  }

  // Fetch all active categories to check descendants.
  const categories = await tx.itemGroup.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      parentId: true,
    },
  });

  const descendants = new Set();
  const queue = [currentId];

  while (queue.length > 0) {
    const currentParentId = queue.shift();

    const children = categories.filter(
      (category) => category.parentId === currentParentId,
    );

    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }

  if (descendants.has(parentId)) {
    return {
      valid: false,
      message: "You cannot select a child category as its parent.",
    };
  }

  return { valid: true };
};

// ======================================================
// GET ITEM GROUP LIST
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("item-group");

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
      "groupName",
      "description",
      "status",
      "isDefault",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";

    const filterResult = getItemGroupWhere(searchParams);

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

    const [total, itemGroups] = await Promise.all([
      prisma.itemGroup.count({ where }),

      prisma.itemGroup.findMany({
        where,
        orderBy: { [sortField]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Collect creator and updater IDs.
    const userIds = [
      ...new Set(
        itemGroups
          .flatMap((item) => [item.createby, item.updateby])
          .filter(Boolean)
          .map(String),
      ),
    ];

    // Fetch corresponding user names.
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

    // Attach creator and updater names.
    const data = itemGroups.map((item) => ({
      ...item,
      createdByName: userMap.get(String(item.createby)) || "-",
      updatedByName: userMap.get(String(item.updateby)) || "-",
    }));

    return NextResponse.json({
      success: true,
      message: "Item groups fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("ITEM GROUP LIST ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch item groups.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// CREATE ITEM GROUP
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("item-group");

    if (accessError) return accessError;

    const body = await request.json();
    const groupName = body.groupName?.trim();

    if (!groupName) {
      return NextResponse.json(
        {
          success: false,
          message: "Group name is required.",
        },
        { status: 400 },
      );
    }
    // Group name length validation
    if (groupName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Group name cannot exceed 255 characters.",
        },
        { status: 400 },
      );
    }
    // Validate customFields.
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
    const parentId =
      typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;
    // Check duplicate itemGroup name (case-insensitive)
    const existingGroup = await prisma.itemGroup.findFirst({
      where: {
        groupName: {
          equals: groupName,
          mode: "insensitive",
        },
      },
    });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This Group name already exists. Please enter a unique Group name.",
        },
        { status: 409 },
      );
    }
    const itemGroup = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.itemGroup.updateMany({
          where: {
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }
      const user = await getAuthenticatedUser();

      if (!user?.id) {
        return NextResponse.json(
          {
            success: false,
            message: "Authenticated user not found.",
          },
          { status: 401 },
        );
      }
      const parentValidation = await validateParentCategory(tx, parentId);

      if (!parentValidation.valid) {
        throw new Error(parentValidation.message);
      }
      return tx.itemGroup.create({
        data: {
          groupName,
          description: body.description?.trim() || null,
          parentId,
          status: body.status ?? true,
          isDefault: body.isDefault ?? false,
          customFields: submittedCustomFields,
          lastSyncAt: new Date(),
          createby: String(user.id),
          updateby: String(user.id),
        },
      });
    });

    await logItemGroup({
      request,
      event: "create",
      itemGroup,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item group created successfully.",
      data: itemGroup,
    });
  } catch (error) {
    console.error("ITEM GROUP CREATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create item group.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// UPDATE ITEM GROUP
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("item-group");

    if (accessError) return accessError;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Item group ID required.",
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

    const existing = await prisma.itemGroup.findFirst({
      where: {
        id: body.id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Item group not found.",
        },
        { status: 404 },
      );
    }
    // Check duplicate name, excluding the current itemGroup
    const duplicateitemGroup = await prisma.itemGroup.findFirst({
      where: {
        groupName: {
          equals: body.groupName,
          mode: "insensitive",
        },
        NOT: {
          id: body.id,
        },
      },
    });

    if (duplicateitemGroup) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This item Group name already exists. Please enter a unique item Group name.",
        },
        { status: 409 },
      );
    }
    const parentId =
      typeof body.parentId === "string" && body.parentId.trim()
        ? body.parentId.trim()
        : null;
    // Validate customFields.
    if (
      body.customFields !== undefined &&
      (body.customFields === null ||
        typeof body.customFields !== "object" ||
        Array.isArray(body.customFields))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "customFields must be a valid object.",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault === true) {
        await tx.itemGroup.updateMany({
          where: {
            id: { not: body.id },
            isDefault: true,
            deletedAt: null,
          },
          data: { isDefault: false },
        });
      }

      const updateData = {
        lastSyncAt: new Date(),
      };

      if (body.groupName !== undefined) {
        const groupName = body.groupName?.trim();

        if (!groupName) {
          throw new Error("Group name is required.");
        }

        updateData.groupName = groupName;
      }

      if (body.description !== undefined) {
        updateData.description = body.description?.trim() || null;
      }

      if (body.status !== undefined) {
        updateData.status = body.status;
      }

      if (body.isDefault !== undefined) {
        updateData.isDefault = body.isDefault;
      }
      const updatedCustomFields =
        body.customFields !== undefined
          ? body.customFields
          : (existing.customFields ?? {});
      if (body.customFields !== undefined) {
        updateData.customFields = updatedCustomFields;
      }
      const user = await getAuthenticatedUser();

      if (!user?.id) {
        return NextResponse.json(
          {
            success: false,
            message: "Authenticated user not found.",
          },
          { status: 401 },
        );
      }
      updateData.updateby = String(user.id);
      // Update parent category only when parentId is supplied.
      if (Object.prototype.hasOwnProperty.call(body, "parentId")) {
        const parentValidation = await validateParentCategory(
          tx,
          parentId,
          body.id,
        );

        if (!parentValidation.valid) {
          throw new Error(parentValidation.message);
        }

        updateData.parentId = parentId;
      }
      return tx.itemGroup.update({
        where: { id: body.id },
        data: updateData,
      });
    });

    await logItemGroup({
      request,
      event: "update",
      itemGroup: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Item group updated successfully.",
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM GROUP UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update item group.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// PATCH ITEM GROUP STATUS
// Supports { id, status } and { ids: [], status }.
// ======================================================

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess("item-group");

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
          .filter((id) => id !== null && id !== undefined && String(id))
          .map(String),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one item group ID is required.",
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

    const existingGroups = await prisma.itemGroup.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        groupName: true,
      },
    });

    if (!existingGroups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active item groups were found.",
        },
        { status: 404 },
      );
    }

    const updateResult = await prisma.itemGroup.updateMany({
      where: {
        id: { in: existingGroups.map((item) => item.id) },
        deletedAt: null,
      },
      data: {
        status: body.status,
        lastSyncAt: new Date(),
      },
    });

    // Record each changed item in the system log.
    for (const item of existingGroups) {
      await systemLog({
        event: "update",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "inventory.item-group",
        description: `Item Group marked ${
          body.status ? "active" : "inactive"
        }: ${item.groupName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Item group(s) marked ${body.status ? "active" : "inactive"}.`,
      count: updateResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM GROUP STATUS UPDATE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update item group status.",
      },
      { status: 500 },
    );
  }
}

// ======================================================
// DELETE ITEM GROUP(S) - SOFT DELETE
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("item-group");

    if (accessError) return accessError;

    const body = await request.json();

    // Support single and bulk delete.
    const ids = [
      ...new Set(
        (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [])
          .filter((id) => id !== null && id !== undefined && String(id).trim())
          .map((id) => String(id).trim()),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one item group ID is required.",
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

    // Find active Item Groups.
    const existingGroups = await prisma.itemGroup.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        groupName: true,
      },
    });

    if (existingGroups.length !== ids.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more item groups were not found or have already been deleted.",
        },
        { status: 404 },
      );
    }

    const activeIds = existingGroups.map((item) => item.id);
    const groupNames = existingGroups.map((item) => item.groupName);

    // Check ItemMaster, IssueReceipt and MachineItemDetails usage.
    const usage = await checkMasterUsage([
      {
        model: prisma.itemMaster,
        where: {
          ItemGroupid: { in: activeIds },
          deletedAt: null,
        },
        message:
          "Cannot delete Item Group because it is already used in Item Master. Please remove or update the associated Item Master records first.",
      },
      {
        model: prisma.issueReceipt,
        where: {
          ItemGroupid: { in: activeIds },
          deletedAt: null,
        },
        message:
          "Cannot delete Item Group because it is already used in Stock Movement. Please remove or update the associated Stock Movement records first.",
      },
      {
        model: prisma.machineItemDetails,
        where: {
          SelectedGroupName: { in: groupNames },
          deletedAt: null,
        },
        message:
          "Cannot delete Item Group because it is already assigned to a Machine. Please remove the associated Machine Item Details first.",
      },
    ]);

    if (!usage.canDelete) {
      return NextResponse.json(
        {
          success: false,
          message: usage.message,
        },
        { status: 409 },
      );
    }

    const now = new Date();

    // Recheck usage and soft-delete inside transaction.
    const deleteResult = await prisma.$transaction(async (tx) => {
      const transactionUsage = await checkMasterUsage([
        {
          model: tx.itemMaster,
          where: {
            ItemGroupid: { in: activeIds },
            deletedAt: null,
          },
          message:
            "Cannot delete Item Group because it is already used in Item Master. Please remove or update the associated Item Master records first.",
        },
        {
          model: tx.issueReceipt,
          where: {
            ItemGroupid: { in: activeIds },
            deletedAt: null,
          },
          message:
            "Cannot delete Item Group because it is already used in Stock Movement. Please remove or update the associated Stock Movement records first.",
        },
        {
          model: tx.machineItemDetails,
          where: {
            SelectedGroupName: { in: groupNames },
            deletedAt: null,
          },
          message:
            "Cannot delete Item Group because it is already assigned to a Machine. Please remove the associated Machine Item Details first.",
        },
      ]);

      if (!transactionUsage.canDelete) {
        throw new Error(transactionUsage.message);
      }

      const result = await tx.itemGroup.updateMany({
        where: {
          id: { in: activeIds },
          deletedAt: null,
        },
        data: {
          deletedAt: now,
          updateby: String(user.id),
          lastSyncAt: now,
        },
      });

      if (result.count !== activeIds.length) {
        throw new Error(
          "Some item groups could not be deleted. Please refresh and try again.",
        );
      }

      return result;
    });

    // Create system logs.
    for (const item of existingGroups) {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(item.id),
        entityType: "inventory.item-group",
        description: `Item Group deleted: ${item.groupName}`,
        ipAddress: getClientIp(request),
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Item group deleted successfully."
          : `${deleteResult.count} item group(s) deleted successfully.`,
      count: deleteResult.count,
      deletedIds: activeIds,
      sync: true,
    });
  } catch (error) {
    console.error("ITEM GROUP DELETE ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete item group(s).",
      },
      {
        status: error.message?.includes("already used") ? 409 : 500,
      },
    );
  }
}