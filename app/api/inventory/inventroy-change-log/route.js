
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

// =====================================================
// HELPERS
// =====================================================

const CHANGE_LOG_SORT_FIELDS = [
  "id",
  "createdAt",
  "UserName",
  "Action",
  "ItemName",
  "ItemType",
  "Details",
];

const parseChangeLogDay = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const buildChangeLogDateRange = (from, to) => {
  const start = parseChangeLogDay(from);
  const end = parseChangeLogDay(to);

  if ((from && !start) || (to && !end)) {
    return {
      error: "Invalid date filter.",
    };
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
                    end.getTime() + 24 * 60 * 60 * 1000
                  ),
                }
              : {}),
          }
        : undefined,
  };
};

const getChangeLogParamList = (searchParams, name) => [
  ...new Set(
    searchParams
      .getAll(name)
      .map((value) => String(value).trim())
      .filter(Boolean)
  ),
];

// =====================================================
// GET
// =====================================================

export async function GET(request) {
  try {
    // =================================================
    // ACCESS CONTROL
    // =================================================

    const accessError = await checkMenuAccess("inventory_change_log");

    if (accessError) return accessError;

    const { searchParams } = new URL(request.url);

    // =================================================
    // PAGINATION
    // =================================================

    const page = Math.max(
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10,
        1
      ),
      1000
    );

    const skip = (page - 1) * limit;

    // =================================================
    // SORTING
    // =================================================

    // Supports both register-style and existing parameter names.
    const sort =
      searchParams.get("sort") ||
      searchParams.get("sortField") ||
      "createdAt";

    const dir =
      searchParams.get("dir") ||
      searchParams.get("sortOrder") ||
      "desc";

    const sortField = CHANGE_LOG_SORT_FIELDS.includes(sort)
      ? sort
      : "createdAt";

    const sortDirection =
      dir.toLowerCase() === "asc" ? "asc" : "desc";

    const orderBy = [
      {
        [sortField]: sortDirection,
      },
      {
        id: "desc",
      },
    ];

    // =================================================
    // FILTERS
    // =================================================

    const search = (
      searchParams.get("search") || ""
    ).trim();

    const itemIds = getChangeLogParamList(
      searchParams,
      "itemId"
    );

    const dateRange = buildChangeLogDateRange(
      searchParams.get("dateFrom"),
      searchParams.get("dateTo")
    );

    if (dateRange.error) {
      return NextResponse.json(
        {
          success: false,
          message: dateRange.error,
        },
        { status: 400 }
      );
    }

    // =================================================
    // BUILD WHERE CONDITION
    // =================================================

    const where = {
      deletedAt: null,

      ...(itemIds.length
        ? {
            ItemMasterid: {
              in: itemIds,
            },
          }
        : {}),

      ...(dateRange.range
        ? {
            createdAt: dateRange.range,
          }
        : {}),
    };

    // =================================================
    // SEARCH FILTER
    // =================================================

    if (search) {
      where.OR = [
        {
          UserName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          Action: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          ItemName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          ItemType: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          Details: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    // =================================================
    // QUERY
    // =================================================

    const [logs, total] = await Promise.all([
      prisma.inventoryChangeLog.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),

      prisma.inventoryChangeLog.count({
        where,
      }),
    ]);

    // =================================================
    // RESPONSE
    // =================================================

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET INVENTORY CHANGE LOG ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to load Inventory Change Log.",
      },
      { status: 500 }
    );
  }
}