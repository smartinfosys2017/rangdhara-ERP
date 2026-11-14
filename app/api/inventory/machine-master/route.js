
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

// ======================================================
// CONFIG
// ======================================================

const MENU_KEY = "machine-master";
const ENTITY_TYPE = "inventory.machine-master";

// ======================================================
// HELPERS
// ======================================================

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

//const getMachineCode = () =>`MCH-${randomUUID().slice(0, 8).toUpperCase()}`;

const getDate = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRange = (from, to) => {
  const start = getDate(from);
  const end = getDate(to);

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
              lt: new Date(end.getTime() + 86400000),
            }
            : {}),
        }
        : undefined,
  };
};

const parseItemDetails = (items) => {
  if (!Array.isArray(items)) {
    throw new Error("Item details must be an array.");
  }

  return items.map((item) => {
    const Selecteditem = String(item.Selecteditem || "").trim();
    const SelectedGroupName = String(
      item.SelectedGroupName || ""
    ).trim();
    const itemUnit = String(item.itemUnit || "").trim();
    const itemQty = String(item.itemQty ?? "").trim();
    const itemdescription = String(
      item.itemdescription || ""
    ).trim();

    if (!Selecteditem) {
      throw new Error("Selected item name is required.");
    }

    if (!SelectedGroupName) {
      throw new Error(
        `Group name is required for ${Selecteditem}.`
      );
    }

    if (!itemUnit) {
      throw new Error(`Unit is required for ${Selecteditem}.`);
    }

    if (
      !itemQty ||
      !Number.isFinite(Number(itemQty)) ||
      Number(itemQty) <= 0
    ) {
      throw new Error(
        `Enter a valid quantity for ${Selecteditem}.`
      );
    }

    return {
      // itemMasterId is intentionally excluded.
      SelectedGroupName,
      Selecteditem,
      itemUnit,
      itemQty,
      itemdescription: itemdescription || null,
    };
  });
};

const getMachineWhere = (searchParams) => {
  const query = searchParams.get("query")?.trim() || "";
  const status = searchParams.get("status") || "all";
  const createdBy = searchParams.get("createdBy") || "";
  const updatedBy = searchParams.get("updatedBy") || "";

  const createdRange = getDateRange(
    searchParams.get("createdFrom"),
    searchParams.get("createdTo")
  );

  const updatedRange = getDateRange(
    searchParams.get("updatedFrom"),
    searchParams.get("updatedTo")
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
              machineNumber: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              machineName: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              machineCode: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              ipAddress: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              OperateId: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              comment: {
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

const logMachine = async ({
  request,
  event,
  machine,
  user,
}) => {
  if (!machine || !user?.id) return;

  await systemLog({
    event,
    userId: String(user.id),
    entityId: String(machine.id),
    entityType: ENTITY_TYPE,
    description: `Machine ${event === "create"
      ? "created"
      : event === "update"
        ? "updated"
        : "deleted"
      }: ${machine.machineName} (${machine.machineNumber})`,
    ipAddress: getClientIp(request),
  });
};

const getAuthenticatedUserOrResponse = async () => {
  const user = await getAuthenticatedUser();

  if (!user?.id) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 }
      ),
    };
  }

  return { user };
};

// ======================================================
// GET MACHINE MASTER LIST / SINGLE MACHINE
// ======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    // Fetch single machine using ?id=...
    const id = searchParams.get("id");

    if (id) {
      const machine = await prisma.machineMaster.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          itemDetails: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!machine) {
        return NextResponse.json(
          {
            success: false,
            message: "Machine not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Machine fetched successfully.",
        data: machine,
      });
    }

    // Pagination
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10",
      10
    );

    const limit = Math.min(
      10000,
      Math.max(
        1,
        Number.isFinite(requestedLimit) ? requestedLimit : 10
      )
    );

    // Sorting
    const allowedSortFields = [
      "id",
      "machineNumber",
      "machineName",
      "machineCode",
      "ipAddress",
      "OperateId",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const requestedSort = searchParams.get("sort") || "createdAt";

    const sortField = allowedSortFields.includes(requestedSort)
      ? requestedSort
      : "createdAt";

    const dir =
      searchParams.get("dir") === "asc" ? "asc" : "desc";

    const filterResult = getMachineWhere(searchParams);

    if (filterResult.error) {
      return NextResponse.json(
        {
          success: false,
          message: filterResult.error,
        },
        { status: 400 }
      );
    }

    const where = filterResult.where;

    const [total, machines] = await Promise.all([
      prisma.machineMaster.count({ where }),

      prisma.machineMaster.findMany({
        where,
        orderBy: {
          [sortField]: dir,
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          itemDetails: {
            where: {
              deletedAt: null,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      }),
    ]);

    // Fetch creator/updater names.
    const userIds = [
      ...new Set(
        machines
          .flatMap((machine) => [
            machine.createby,
            machine.updateby,
          ])
          .filter(Boolean)
          .map(String)
      ),
    ];

    const users = userIds.length
      ? await prisma.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
      : [];

    const userMap = new Map(
      users.map((user) => [
        String(user.id),
        user.name || "-",
      ])
    );

    const data = machines.map((machine) => ({
      ...machine,
      createdByName:
        userMap.get(String(machine.createby)) || "-",
      updatedByName:
        userMap.get(String(machine.updateby)) || "-",
    }));

    return NextResponse.json({
      success: true,
      message: "Machines fetched successfully.",
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("MACHINE MASTER GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch machines.",
      },
      { status: 500 }
    );
  }
}

// ======================================================
// POST - CREATE MACHINE MASTER
// ======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    const machineNumber = String(body.machineNumber || "").trim();
    const machineName = String(body.machineName || "").trim();
    const machineCode = String(body.machineCode || "").trim();
    const ipAddress = String(body.ipAddress || "").trim();
    const OperateId = "";
    const comment = String(body.comment || "").trim();

    // REQUIRED FIELD VALIDATION
    if (!machineNumber) {
      return NextResponse.json(
        { success: false, message: "Machine number is required." },
        { status: 400 }
      );
    }

    if (!machineName) {
      return NextResponse.json(
        { success: false, message: "Machine name is required." },
        { status: 400 }
      );
    }

    // GROUP NAME VALIDATION
    let groupNames = body.GroupName;

    if (typeof groupNames === "string") {
      try {
        groupNames = JSON.parse(groupNames);
      } catch {
        groupNames = [groupNames];
      }
    }

    if (!Array.isArray(groupNames) || groupNames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select at least one group.",
        },
        { status: 400 }
      );
    }

    const groups = [
      ...new Set(
        groupNames
          .map((group) => String(group).trim())
          .filter(Boolean)
      ),
    ];

    if (!groups.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select valid groups.",
        },
        { status: 400 }
      );
    }

    // STATUS VALIDATION
    if (typeof body.status !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "A valid machine status is required.",
        },
        { status: 400 }
      );
    }

    // LENGTH VALIDATION
    if (machineNumber.length > 255 || machineName.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Machine number and name cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }

    if (ipAddress.length > 45) {
      return NextResponse.json(
        {
          success: false,
          message: "IP address cannot exceed 45 characters.",
        },
        { status: 400 }
      );
    }

    // AUTHENTICATED USER
    const userResult = await getAuthenticatedUserOrResponse();
    if (userResult.error) return userResult.error;

    const user = userResult.user;

    // ITEM DETAILS
    const itemDetails = parseItemDetails(body.itemDetails || []);

    // DUPLICATE MACHINE NUMBER CHECK
    const existingMachine = await prisma.machineMaster.findFirst({
      where: {
        machineNumber: {
          equals: machineNumber,
          mode: "insensitive",
        },
        deletedAt: null,
      },
    });

    if (existingMachine) {
      return NextResponse.json(
        {
          success: false,
          message: "Machine number already exists.",
        },
        { status: 409 }
      );
    }

    // CREATE MACHINE + ITEM DETAILS + CHANGE LOG
    const machine = await prisma.$transaction(async (tx) => {
      const createdMachine = await tx.machineMaster.create({
        data: {
          machineNumber,
          machineName,
          machineCode,
          ipAddress: ipAddress || null,
          GroupName: JSON.stringify(groups),
          OperateId,
          comment: comment || null,
          status: body.status,
          lastSyncAt: new Date(),
          createby: String(user.id),
          updateby: String(user.id),
          itemDetails: {
            create: itemDetails.map((item) => ({
              ...item,
              createby: String(user.id),
              updateby: String(user.id),
            })),
          },
        },
        include: {
          itemDetails: {
            where: { deletedAt: null },
          },
        },
      });

      // ONE CHANGE-LOG ENTRY USING HELPER
      await createMachineChangeLogs({
        tx,
        machineId: createdMachine.id,
        user,
        changes: {
          machineNumber: createdMachine.machineNumber,
          machineName: createdMachine.machineName,
          machineCode: createdMachine.machineCode,
          ipAddress: createdMachine.ipAddress,
          GroupName: createdMachine.GroupName,
          OperateId: createdMachine.OperateId,
          comment: createdMachine.comment,
          status: createdMachine.status,
          itemDetails: createdMachine.itemDetails,
        },
        action: "CREATE",
      });

      return createdMachine;
    });

    // SYSTEM LOG (AFTER TRANSACTION)
    await logMachine({
      request,
      event: "create",
      machine,
      user,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Machine created successfully.",
        data: machine,
        sync: true,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("MACHINE MASTER CREATE ERROR:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "Machine number or machine code already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create machine.",
      },
      { status: 500 }
    );
  }
}


async function createMachineChangeLogs({
  tx,
  machineId,
  user,
  changes,
  action = "UPDATE",
}) {
  if (!changes || Object.keys(changes).length === 0) {
    return 0;
  }

  const fields = Object.keys(changes);

  const selectedItem =
    action === "CREATE"
      ? "Machine Created"
      : fields.length === 1 && fields[0] === "status"
        ? "status"
        : "Machine Updated";

  const details = {};

  for (const [field, value] of Object.entries(changes)) {
    details[field] = {
      oldValue: value.oldValue ?? null,
      newValue: value.newValue ?? null,
    };
  }

  await tx.machineChangeLog.create({
    data: {
      machineId: String(machineId),
      UserId: String(user.id),
      UserName: user.name || user.email || "Unknown",
      Action: action,
      Selecteditem: selectedItem,
      Details: JSON.stringify(details),
      createby: String(user.id),
      updateby: String(user.id),
    },
  });

  return 1;
}


// ======================================================
// PUT - UPDATE MACHINE MASTER
// ======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Machine ID is required." },
        { status: 400 }
      );
    }

    const userResult = await getAuthenticatedUserOrResponse();
    if (userResult.error) return userResult.error;

    const user = userResult.user;

    const existing = await prisma.machineMaster.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Machine not found." },
        { status: 404 }
      );
    }

    const updateData = {
      lastSyncAt: new Date(),
      updateby: String(user.id),
    };

    if (body.machineNumber !== undefined) {
      const machineNumber = String(body.machineNumber).trim();

      if (!machineNumber) {
        return NextResponse.json(
          { success: false, message: "Machine number is required." },
          { status: 400 }
        );
      }

      if (machineNumber.length > 255) {
        return NextResponse.json(
          { success: false, message: "Machine number cannot exceed 255 characters." },
          { status: 400 }
        );
      }

      updateData.machineNumber = machineNumber;
    }

    if (body.machineName !== undefined) {
      const machineName = String(body.machineName).trim();

      if (!machineName) {
        return NextResponse.json(
          { success: false, message: "Machine name is required." },
          { status: 400 }
        );
      }

      if (machineName.length > 255) {
        return NextResponse.json(
          { success: false, message: "Machine name cannot exceed 255 characters." },
          { status: 400 }
        );
      }

      updateData.machineName = machineName;
    }

    if (body.machineCode !== undefined) {
      const machineCode = String(body.machineCode).trim();

      if (!machineCode || machineCode.length > 25) {
        return NextResponse.json(
          {
            success: false,
            message: "Machine code is required and cannot exceed 25 characters.",
          },
          { status: 400 }
        );
      }

      updateData.machineCode = machineCode;
    }

    if (body.ipAddress !== undefined) {
      const ipAddress = String(body.ipAddress || "").trim();

      if (ipAddress.length > 45) {
        return NextResponse.json(
          { success: false, message: "IP address cannot exceed 45 characters." },
          { status: 400 }
        );
      }

      updateData.ipAddress = ipAddress || null;
    }

    if (body.GroupName !== undefined) {
      let groups = body.GroupName;

      if (typeof groups === "string") {
        try {
          groups = JSON.parse(groups);
        } catch {
          groups = [groups];
        }
      }

      if (!Array.isArray(groups) || !groups.length) {
        return NextResponse.json(
          { success: false, message: "Please select at least one group." },
          { status: 400 }
        );
      }

      groups = [
        ...new Set(
          groups.map((group) => String(group).trim()).filter(Boolean)
        ),
      ];

      if (!groups.length) {
        return NextResponse.json(
          { success: false, message: "Please select valid groups." },
          { status: 400 }
        );
      }

      updateData.GroupName = JSON.stringify(groups);
    }

    // OperateId removed

    if (body.comment !== undefined) {
      updateData.comment = String(body.comment || "").trim() || null;
    }

    if (body.status !== undefined) {
      if (typeof body.status !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Invalid machine status." },
          { status: 400 }
        );
      }

      updateData.status = body.status;
    }

    // Check duplicate machine number
    if (updateData.machineNumber !== undefined) {
      const duplicate = await prisma.machineMaster.findFirst({
        where: {
          machineNumber: {
            equals: updateData.machineNumber,
            mode: "insensitive",
          },
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "Machine number already exists." },
          { status: 409 }
        );
      }
    }

    // Check duplicate machine code
    if (updateData.machineCode !== undefined) {
      const duplicateCode = await prisma.machineMaster.findFirst({
        where: {
          machineCode: updateData.machineCode,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicateCode) {
        return NextResponse.json(
          { success: false, message: "Machine code already exists." },
          { status: 409 }
        );
      }
    }

    // Item details
    const shouldUpdateItems = body.itemDetails !== undefined;

    const itemDetails = shouldUpdateItems
      ? parseItemDetails(body.itemDetails)
      : [];

    // Prepare all changes in one object
    const changes = {};

    for (const [field, newValue] of Object.entries(updateData)) {
      if (["updateby", "lastSyncAt"].includes(field)) continue;

      const oldValue = existing[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[field] = {
          oldValue,
          newValue,
        };
      }
    }

    // Get existing item details for comparison
    let oldItems = [];

    if (shouldUpdateItems) {
      const existingItems = await prisma.machineItemDetails.findMany({
        where: {
          machineId: id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      oldItems = existingItems.map((item) => ({
        SelectedGroupName: item.SelectedGroupName,
        Selecteditem: item.Selecteditem,
        itemUnit: item.itemUnit,
        itemQty: item.itemQty,
        itemdescription: item.itemdescription,
      }));

      const newItems = itemDetails.map((item) => ({
        SelectedGroupName: item.SelectedGroupName,
        Selecteditem: item.Selecteditem,
        itemUnit: item.itemUnit,
        itemQty: item.itemQty,
        itemdescription: item.itemdescription,
      }));

      if (JSON.stringify(oldItems) !== JSON.stringify(newItems)) {
        changes.itemDetails = {
          oldValue: oldItems,
          newValue: newItems,
        };
      }
    }

    // Check whether actual business data has changed
    const hasChanges = Object.keys(changes).length > 0;

    const updated = await prisma.$transaction(async (tx) => {
      if (shouldUpdateItems) {
        await tx.machineItemDetails.updateMany({
          where: {
            machineId: id,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
            updateby: String(user.id),
          },
        });

        if (itemDetails.length > 0) {
          await tx.machineItemDetails.createMany({
            data: itemDetails.map((item) => ({
              machineId: id,
              ...item,
              createby: String(user.id),
              updateby: String(user.id),
            })),
          });
        }
      }

      const machine = await tx.machineMaster.update({
        where: { id },
        data: updateData,
        include: {
          itemDetails: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Insert exactly ONE change log row if any actual field changed
      if (hasChanges) {
        await createMachineChangeLogs({
          tx,
          machineId: id,
          user,
          changes,
          action: "UPDATE",
        });
      }

      return machine;
    });

    await logMachine({
      request,
      event: "update",
      machine: updated,
      user,
    });

    return NextResponse.json({
      success: true,
      message: "Machine updated successfully.",
      data: updated,
      changeLogged: hasChanges,
      sync: true,
    });
  } catch (error) {
    console.error("MACHINE MASTER UPDATE ERROR:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "Machine number or machine code already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update machine.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const userResult = await getAuthenticatedUserOrResponse();
    if (userResult.error) return userResult.error;

    const user = userResult.user;

    const body = await request.json();
    const { id, ids, status } = body;

    if (typeof status !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be a boolean value.",
        },
        { status: 400 }
      );
    }

    const machineIds = Array.isArray(ids)
      ? [...new Set(ids.map((value) => String(value).trim()).filter(Boolean))]
      : id
        ? [String(id).trim()]
        : [];

    if (!machineIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Machine ID or IDs are required.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get existing active machines before updating.
      const existingMachines = await tx.machineMaster.findMany({
        where: {
          id: { in: machineIds },
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existingMachines.length) {
        return {
          updatedCount: 0,
          logCount: 0,
        };
      }

      // Find machines whose status actually changed.
      const changedMachines = existingMachines.filter(
        (machine) => machine.status !== status
      );

      // Update machine status.
      const updateResult = await tx.machineMaster.updateMany({
        where: {
          id: {
            in: existingMachines.map((machine) => machine.id),
          },
          deletedAt: null,
        },
        data: {
          status,
          updateby: String(user.id),
          lastSyncAt: new Date(),
        },
      });

      // Create one log entry per machine whose status changed.
      for (const machine of changedMachines) {
        await createMachineChangeLogs({
          tx,
          machineId: machine.id,
          user,
          changes: {
            status: {
              oldValue: machine.status,
              newValue: status,
            },
          },
          action: "UPDATE",
        });
      }

      return {
        updatedCount: updateResult.count,
        logCount: changedMachines.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: `${result.updatedCount} machine(s) updated successfully.`,
      data: {
        requestedCount: machineIds.length,
        updatedCount: result.updatedCount,
        changedCount: result.logCount,
        status,
      },
    });
  } catch (error) {
    console.error("PATCH MACHINE MASTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update machine status.",
      },
      { status: 500 }
    );
  }
}
// ======================================================
// DELETE - SOFT DELETE MACHINE MASTER
// Supports { id } and { ids: [] }.
// ======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess(MENU_KEY);
    if (accessError) return accessError;

    const body = await request.json();

    const ids = [
      ...new Set(
        (Array.isArray(body.ids)
          ? body.ids
          : body.id
            ? [body.id]
            : []
        )
          .filter(
            (id) =>
              id !== null &&
              id !== undefined &&
              String(id).trim()
          )
          .map(String)
      ),
    ];

    if (!ids.length) {
      return NextResponse.json(
        {
          success: false,
          message: "At least one machine ID is required.",
        },
        { status: 400 }
      );
    }

    const userResult = await getAuthenticatedUserOrResponse();
    if (userResult.error) return userResult.error;

    const user = userResult.user;

    const existingMachines = await prisma.machineMaster.findMany({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        machineNumber: true,
        machineName: true,
      },
    });

    if (!existingMachines.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No active machines were found to delete.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const deleteResult = await prisma.machineMaster.updateMany({
      where: {
        id: {
          in: existingMachines.map((machine) => machine.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        lastSyncAt: now,
        updateby: String(user.id),
      },
    });

    for (const machine of existingMachines) {
      await logMachine({
        request,
        event: "delete",
        machine,
        user,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        deleteResult.count === 1
          ? "Machine deleted successfully."
          : `${deleteResult.count} machines deleted successfully.`,
      count: deleteResult.count,
      sync: true,
    });
  } catch (error) {
    console.error("MACHINE MASTER DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete machine(s).",
      },
      { status: 500 }
    );
  }
}
