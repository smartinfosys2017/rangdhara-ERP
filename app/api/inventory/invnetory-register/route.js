
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkMenuAccess } from "@/lib/module-access";
import { getAuthenticatedUser } from "@/lib/auth-user";

const prisma = new PrismaClient();

// =====================================================
// HELPERS
// =====================================================

const toRegisterNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getStaffName = (user) => {
  if (!user) return "-";

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.name || user.username || user.email || "-";
};

const REGISTER_SORT_FIELDS = [
  "id",
  "GroupName",
  "ItemName",
  "UnitMeasure",
  "Balance",
  "RestockLevel",
  "AddedDate",
  "LastUpdateDate",
  "AddedBy",
  "LastUpdatedBy",
];

const REGISTER_NUMBER_FIELDS = ["Balance", "RestockLevel"];
const REGISTER_DATE_FIELDS = ["AddedDate", "LastUpdateDate"];

const parseRegisterDay = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const buildRegisterDateRange = (from, to) => {
  const start = parseRegisterDay(from);
  const end = parseRegisterDay(to);

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
                  lt: new Date(
                    end.getTime() + 24 * 60 * 60 * 1000,
                  ),
                }
              : {}),
          }
        : undefined,
  };
};

const getRegisterParamList = (searchParams, name) => [
  ...new Set(
    searchParams
      .getAll(name)
      .map((value) => String(value).trim())
      .filter(Boolean),
  ),
];

const isInRegisterRange = (value, range) => {
  if (!range) return true;
  if (!value) return false;

  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return false;
  if (range.gte && time < range.gte.getTime()) return false;
  if (range.lt && time >= range.lt.getTime()) return false;

  return true;
};

// =====================================================
// LOCATION / MACHINE NAME LOOKUP
// =====================================================

const getLocationMachineMaps = async (stockBalances) => {
  const locationIds = [
    ...new Set(
      stockBalances
        .filter((stock) => stock.LocationType === "LOCATION")
        .map((stock) => stock.LocationId)
        .filter(Boolean),
    ),
  ];

  const machineIds = [
    ...new Set(
      stockBalances
        .filter((stock) => stock.LocationType === "MACHINE")
        .map((stock) => stock.LocationId)
        .filter(Boolean),
    ),
  ];

  const [locations, machines] = await Promise.all([
    locationIds.length
      ? prisma.location.findMany({
          where: {
            id: { in: locationIds },
          },
          select: {
            id: true,
            locationName: true,
          },
        })
      : [],

    machineIds.length
      ? prisma.machineMaster.findMany({
          where: {
            id: { in: machineIds },
          },
          select: {
            id: true,
            machineName: true,
            machineNumber: true,
          },
        })
      : [],
  ]);

  const locationMap = new Map(
    locations.map((location) => [
      String(location.id),
      location.locationName || "-",
    ]),
  );

  const machineMap = new Map(
    machines.map((machine) => [
      String(machine.id),
      machine.machineName || machine.machineNumber || "-",
    ]),
  );

  return { locationMap, machineMap };
};

const formatManageQty = (stock, locationMap, machineMap) => ({
  ItemMasterid: stock.ItemMasterid,
  ItemTypeid: stock.ItemTypeid,
  LocationType: stock.LocationType,
  LocationId: stock.LocationId,

  LocationName:
    stock.LocationType === "LOCATION"
      ? locationMap.get(String(stock.LocationId)) || "-"
      : null,

  MachineName:
    stock.LocationType === "MACHINE"
      ? machineMap.get(String(stock.LocationId)) || "-"
      : null,

  ManageQty: Number(stock.Quantity) || 0,
});

// =====================================================
// GET
// =====================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("inventory_register");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // =================================================
    // SINGLE ITEM
    // =================================================

    if (id) {
      const itemMaster = await prisma.itemMaster.findFirst({
        where: {
          id,
          deletedAt: null,
          status: true,
        },
      });

      if (!itemMaster) {
        return NextResponse.json(
          {
            success: false,
            message: "Item not found",
          },
          { status: 404 },
        );
      }

      const [
        latestIssueReceipt,
        itemGroup,
        unit,
        stockBalances,
      ] = await Promise.all([
        prisma.issueReceipt.findFirst({
          where: {
            ItemMasterid: itemMaster.id,
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
        }),

        itemMaster.ItemGroupid
          ? prisma.itemGroup.findFirst({
              where: {
                id: itemMaster.ItemGroupid,
                deletedAt: null,
              },
            })
          : null,

        itemMaster.Unitid
          ? prisma.unit.findFirst({
              where: {
                id: itemMaster.Unitid,
                deletedAt: null,
              },
            })
          : null,

        // InventoryStockBalance does not have deletedAt.
        prisma.inventoryStockBalance.findMany({
          where: {
            ItemMasterid: itemMaster.id,
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
      ]);

      const [addedBy, lastUpdatedBy] = await Promise.all([
        latestIssueReceipt?.Issue_by
          ? prisma.StaffUser.findFirst({
              where: {
                id: latestIssueReceipt.Issue_by,
              },
            })
          : null,

        latestIssueReceipt?.RecivedBy
          ? prisma.StaffUser.findFirst({
              where: {
                id: latestIssueReceipt.RecivedBy,
              },
            })
          : null,
      ]);

      const { locationMap, machineMap } =
        await getLocationMachineMaps(stockBalances);

      const manageQtyByLocation = stockBalances.map((stock) =>
        formatManageQty(stock, locationMap, machineMap),
      );

      const totalManageQty = manageQtyByLocation.reduce(
        (total, stock) => total + stock.ManageQty,
        0,
      );

      return NextResponse.json({
        success: true,
        data: {
          id: itemMaster.id,
          ItemMaster: itemMaster,

          GroupName:
            itemGroup?.groupName || itemGroup?.name || "-",

          ItemName: itemMaster.ItemName || "-",

          UnitMeasure:
            unit?.unitName ||
            unit?.name ||
            unit?.abbreviation ||
            "-",

          Balance: totalManageQty,

          manageQtyByLocation,

          LocationQty: manageQtyByLocation
            .filter((stock) => stock.LocationType === "LOCATION")
            .reduce((sum, stock) => sum + stock.ManageQty, 0),

          MachineQty: manageQtyByLocation
            .filter((stock) => stock.LocationType === "MACHINE")
            .reduce((sum, stock) => sum + stock.ManageQty, 0),

          VendorQty: manageQtyByLocation
            .filter((stock) => stock.LocationType === "VENDOR")
            .reduce((sum, stock) => sum + stock.ManageQty, 0),

          RestockLevel:
            toRegisterNumber(itemMaster.RelocateLevel) ?? 0,

          AddedDate: itemMaster.createdAt || null,

          LastUpdateDate:
            latestIssueReceipt?.updatedAt ??
            itemMaster.updatedAt ??
            null,

          AddedBy: getStaffName(addedBy),

          LastUpdatedBy: getStaffName(lastUpdatedBy),

          latestIssueReceipt: latestIssueReceipt || null,
        },
      });
    }

    // =================================================
    // LIST PARAMETERS
    // =================================================

    const page = Math.max(
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10,
        1,
      ),
      10000,
    );

    const sort = searchParams.get("sort") || "AddedDate";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    const sortField = REGISTER_SORT_FIELDS.includes(sort)
      ? sort
      : "AddedDate";

    const query = (
      searchParams.get("query") || ""
    ).trim().toLowerCase();

    const restockLevel = searchParams.get("restockLevel") || "";

    if (restockLevel && !["lte", "gt"].includes(restockLevel)) {
      return NextResponse.json(
        {
          success: false,
          message: "restockLevel must be lte or gt.",
        },
        { status: 400 },
      );
    }

    const groupIds = getRegisterParamList(searchParams, "groupId");
    const itemIds = getRegisterParamList(searchParams, "itemId");
    const itemTypeIds = getRegisterParamList(searchParams, "itemTypeId");

    const addedRange = buildRegisterDateRange(
      searchParams.get("addedFrom"),
      searchParams.get("addedTo"),
    );

    const updatedRange = buildRegisterDateRange(
      searchParams.get("updatedFrom"),
      searchParams.get("updatedTo"),
    );

    const rangeError = addedRange.error || updatedRange.error;

    if (rangeError) {
      return NextResponse.json(
        {
          success: false,
          message: rangeError,
        },
        { status: 400 },
      );
    }

    // =================================================
    // ITEM MASTERS
    // =================================================

    const itemMasters = await prisma.itemMaster.findMany({
      where: {
        deletedAt: null,

        ...(groupIds.length
          ? {
              ItemGroupid: {
                in: groupIds,
              },
            }
          : {}),

        ...(itemIds.length
          ? {
              id: {
                in: itemIds,
              },
            }
          : {}),

        ...(addedRange.range
          ? {
              createdAt: addedRange.range,
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!itemMasters.length) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }

    const masterIds = itemMasters.map((item) => item.id);

    // =================================================
    // RELATED DATA
    // =================================================

    const [
      itemGroups,
      units,
      issueReceipts,
      staffUsers,
      stockBalances,
    ] = await Promise.all([
      prisma.itemGroup.findMany({
        where: {
          deletedAt: null,
        },
      }),

      prisma.unit.findMany({
        where: {
          deletedAt: null,
        },
      }),

      prisma.issueReceipt.findMany({
        where: {
          ItemMasterid: {
            in: masterIds,
          },
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.StaffUser.findMany(),

      // InventoryStockBalance does not have deletedAt.
      prisma.inventoryStockBalance.findMany({
        where: {
          ItemMasterid: {
            in: masterIds,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

    // =================================================
    // LOCATION / MACHINE LOOKUPS
    // =================================================

    const { locationMap, machineMap } =
      await getLocationMachineMaps(stockBalances);

    // =================================================
    // LOOKUP MAPS
    // =================================================

    const itemGroupMap = new Map(
      itemGroups.map((item) => [
        String(item.id),
        item.groupName || item.name || "-",
      ]),
    );

    const unitMap = new Map(
      units.map((unit) => [
        String(unit.id),
        unit.unitName || unit.name || unit.abbreviation || "-",
      ]),
    );

    const staffMap = new Map(
      staffUsers.map((user) => [
        String(user.id),
        getStaffName(user),
      ]),
    );

    // =================================================
    // LATEST RECEIPT + ITEM TYPES
    // =================================================

    const latestReceiptMap = new Map();
    const itemTypesByItem = new Map();

    for (const receipt of issueReceipts) {
      if (!receipt.ItemMasterid) continue;

      const itemMasterId = String(receipt.ItemMasterid);

      if (!latestReceiptMap.has(itemMasterId)) {
        latestReceiptMap.set(itemMasterId, receipt);
      }

      if (receipt.ItemTypeid) {
        if (!itemTypesByItem.has(itemMasterId)) {
          itemTypesByItem.set(itemMasterId, new Set());
        }

        itemTypesByItem
          .get(itemMasterId)
          .add(String(receipt.ItemTypeid));
      }
    }

    // =================================================
    // GROUP STOCK BY ITEM
    // =================================================

    const stockByItemMap = new Map();

    for (const stock of stockBalances) {
      const itemMasterId = String(stock.ItemMasterid);

      if (!stockByItemMap.has(itemMasterId)) {
        stockByItemMap.set(itemMasterId, []);
      }

      stockByItemMap.get(itemMasterId).push(
        formatManageQty(stock, locationMap, machineMap),
      );
    }

    // =================================================
    // FORMAT REGISTER
    // =================================================

    let register = itemMasters.map((item) => {
      const itemId = String(item.id);

      const latestReceipt = latestReceiptMap.get(itemId);

      const manageQtyByLocation =
        stockByItemMap.get(itemId) || [];

      const totalManageQty = manageQtyByLocation.reduce(
        (total, stock) => total + stock.ManageQty,
        0,
      );

      return {
        id: item.id,

        GroupName:
          itemGroupMap.get(String(item.ItemGroupid)) || "-",

        ItemName: item.ItemName || "-",

        UnitMeasure:
          unitMap.get(String(item.Unitid)) || "-",

        Balance: totalManageQty,

        manageQtyByLocation,

        LocationQty: manageQtyByLocation
          .filter((stock) => stock.LocationType === "LOCATION")
          .reduce((sum, stock) => sum + stock.ManageQty, 0),

        MachineQty: manageQtyByLocation
          .filter((stock) => stock.LocationType === "MACHINE")
          .reduce((sum, stock) => sum + stock.ManageQty, 0),

        VendorQty: manageQtyByLocation
          .filter((stock) => stock.LocationType === "VENDOR")
          .reduce((sum, stock) => sum + stock.ManageQty, 0),

        RestockLevel:
          toRegisterNumber(item.RelocateLevel) ?? 0,

        AddedDate: item.createdAt || null,

        LastUpdateDate:
          latestReceipt?.updatedAt ??
          item.updatedAt ??
          null,

        AddedBy: latestReceipt?.Issue_by
          ? staffMap.get(String(latestReceipt.Issue_by)) || "-"
          : "-",

        LastUpdatedBy: latestReceipt?.RecivedBy
          ? staffMap.get(String(latestReceipt.RecivedBy)) || "-"
          : "-",

        latestIssueReceipt: latestReceipt || null,
      };
    });

    // =================================================
    // ITEM TYPE FILTER
    // =================================================

    if (itemTypeIds.length) {
      register = register.filter((row) => {
        const types = itemTypesByItem.get(String(row.id));

        return (
          !!types &&
          itemTypeIds.some((typeId) => types.has(typeId))
        );
      });
    }

    // =================================================
    // RESTOCK FILTER
    // =================================================

    if (restockLevel) {
      register = register.filter((row) => {
        const balance = toRegisterNumber(row.Balance) ?? 0;
        const level = toRegisterNumber(row.RestockLevel) ?? 0;

        return restockLevel === "lte"
          ? balance <= level
          : balance > level;
      });
    }

    // =================================================
    // UPDATED DATE FILTER
    // =================================================

    if (updatedRange.range) {
      register = register.filter((row) =>
        isInRegisterRange(
          row.LastUpdateDate,
          updatedRange.range,
        ),
      );
    }

    // =================================================
    // SEARCH FILTER
    // =================================================

    if (query) {
      register = register.filter((row) =>
        [
          row.GroupName,
          row.ItemName,
          row.UnitMeasure,
          row.AddedBy,
          row.LastUpdatedBy,
          ...row.manageQtyByLocation.map(
            (stock) => stock.LocationName || stock.MachineName || "",
          ),
        ].some((value) =>
          String(value ?? "").toLowerCase().includes(query),
        ),
      );
    }

    // =================================================
    // SORT
    // =================================================

    const getSortValue = (row) => {
      if (REGISTER_NUMBER_FIELDS.includes(sortField)) {
        return (
          toRegisterNumber(row[sortField]) ??
          Number.NEGATIVE_INFINITY
        );
      }

      if (REGISTER_DATE_FIELDS.includes(sortField)) {
        return row[sortField]
          ? new Date(row[sortField]).getTime() || 0
          : 0;
      }

      return String(row[sortField] ?? "").toLowerCase();
    };

    register.sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      let result;

      if (typeof aValue === "number") {
        result =
          aValue === bValue
            ? 0
            : aValue < bValue
              ? -1
              : 1;
      } else {
        result = aValue.localeCompare(bValue);
      }

      if (result === 0) {
        result = String(a.id).localeCompare(String(b.id));
      }

      return dir === "asc" ? result : -result;
    });

    // =================================================
    // PAGINATION
    // =================================================

    const total = register.length;

    const pageRows = register.slice(
      (page - 1) * limit,
      page * limit,
    );

    return NextResponse.json({
      success: true,
      data: pageRows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET Stock REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed loading Inventory Register",
      },
      { status: 500 },
    );
  }
}

// =====================================================
// DELETE
// =====================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("inventory_register");

    if (accessError) return accessError;

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please sign in again.",
        },
        { status: 401 },
      );
    }

    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide an array of item IDs.",
        },
        { status: 400 },
      );
    }

    const itemIds = [
      ...new Set(
        ids
          .filter(
            (id) =>
              typeof id === "string" && id.trim().length > 0,
          )
          .map((id) => id.trim()),
      ),
    ];

    if (!itemIds.length) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid item IDs provided.",
        },
        { status: 400 },
      );
    }

    const deletedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const existingItems = await tx.itemMaster.findMany({
        where: {
          id: {
            in: itemIds,
          },
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!existingItems.length) {
        return null;
      }

      const existingIds = existingItems.map((item) => item.id);

      // A. SOFT DELETE ISSUE RECEIPTS
      const receiptResult = await tx.issueReceipt.updateMany({
        where: {
          ItemMasterid: {
            in: existingIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt,
          updatedAt: deletedAt,
          updateby: String(user.id),
        },
      });

      // B. SOFT DELETE CHANGE LOGS
      const changeLogResult = await tx.inventoryChangeLog.updateMany({
        where: {
          ItemMasterid: {
            in: existingIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt,
          updatedAt: deletedAt,
          updateby: String(user.id),
        },
      });

      // C. Stock Ledger has no deletedAt field.
      // Keep ledger history intact.

      // D. Stock Balance has no deletedAt field.
      // Keep balance records intact.

      // E. SOFT DELETE MAIN ITEM MASTER
      const itemResult = await tx.itemMaster.updateMany({
        where: {
          id: {
            in: existingIds,
          },
          deletedAt: null,
        },
        data: {
          deletedAt,
          updatedAt: deletedAt,
          updateby: String(user.id),
        },
      });

      return {
        deletedItems: itemResult.count,
        deletedIssueReceipts: receiptResult.count,
        deletedChangeLogs: changeLogResult.count,
        deletedStockLedgers: 0,
        deletedStockBalances: 0,
      };
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "No active inventory items found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Inventory items and supported associated records deleted successfully. Stock ledger and balance records were retained.",
      deletedAt,
      deletedRecords: {
        itemMaster: result.deletedItems,
        issueReceipts: result.deletedIssueReceipts,
        inventoryChangeLogs: result.deletedChangeLogs,
        inventoryStockLedgers: result.deletedStockLedgers,
        inventoryStockBalances: result.deletedStockBalances,
      },
    });
  } catch (error) {
    console.error("DELETE Stock REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete inventory register items.",
      },
      { status: 500 },
    );
  }
}
