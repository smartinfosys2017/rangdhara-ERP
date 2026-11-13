import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

const parseChangeLogDay = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
};

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("inventory_change_log");

    if (accessError) {
      return accessError;
    }

    const { searchParams } = new URL(request.url);

    // =================================================
    // PAGINATION
    // =================================================

    const page = Math.max(
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "10", 10) || 10, 1),
      1000
    );

    const skip = (page - 1) * limit;

    // =================================================
    // FILTERS
    // =================================================

    const search = searchParams.get("search")?.trim() || "";

    // Repeated param: itemId=1&itemId=2
    const itemIds = [
      ...new Set(
        searchParams
          .getAll("itemId")
          .map((id) => String(id).trim())
          .filter(Boolean)
      ),
    ];

    const dateFromValue = searchParams.get("dateFrom") || "";
    const dateToValue = searchParams.get("dateTo") || "";

    const dateFrom = parseChangeLogDay(dateFromValue);
    const dateTo = parseChangeLogDay(dateToValue);

    if ((dateFromValue && !dateFrom) || (dateToValue && !dateTo)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date filter.",
        },
        {
          status: 400,
        }
      );
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json(
        {
          success: false,
          message: "The From date cannot be after the To date.",
        },
        {
          status: 400,
        }
      );
    }

    const where = {deletedAt: null,};

    // Search: user, action, item, item type, detail
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

    // Item Name dropdown (selected item master IDs)
    if (itemIds.length > 0) {
      where.ItemMasterid = {
        in: itemIds,
      };
    }

    // Date range: From is the start of the day, To includes the whole day.
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo
          ? { lt: new Date(dateTo.getTime() + 24 * 60 * 60 * 1000) }
          : {}),
      };
    }

    // =================================================
    // QUERY
    // =================================================

    const [logs, total] = await Promise.all([
      prisma.inventoryChangeLog.findMany({
        where,
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        skip,
        take: limit,
      }),

      prisma.inventoryChangeLog.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("INVENTORY CHANGE LOG GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to fetch Inventory Change Log",
      },
      {
        status: 500,
      }
    );
  }
}