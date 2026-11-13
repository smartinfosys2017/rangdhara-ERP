import { NextResponse } from "next/server";
import { getActiveDb } from "@/lib/db";
import { checkMenuAccess } from "@/lib/module-access";

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("customer-sync");

    if (accessError) {
      return accessError;
    }

    const db = await getActiveDb();

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 10),
    );

    // Search
    const query = searchParams.get("query")?.trim() || "";

    // Sorting
    const sort = searchParams.get("sort") || "createdAt";

    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";

    // Allowed sorting fields
    const allowedSortFields = [
      "id",
      "name",
      "email",
      "phone",
      "lastSyncedAt",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort) ? sort : "createdAt";

    // -----------------------------------------
    // WHERE CONDITION
    // -----------------------------------------
    // Only active customers.
    // deletedAt IS NULL
    // means customer is not deleted.
    const where = {
      deletedAt: null,
    };

    // Search
    if (query) {
      where.OR = [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer_sync.findMany({
        where,

        orderBy: {
          [sortField]: dir,
        },

        skip: (page - 1) * limit,

        take: limit,
      }),

      db.customer_sync.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,

      data: customers,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[CUSTOMERS GET ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch customers",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("customer-sync");

    if (accessError) {
      return accessError;
    }

    const body = await request.json();

    const name = body?.name?.trim();

    const email = body?.email?.trim().toLowerCase();

    const phone = body?.phone?.trim() || null;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required",
        },
        { status: 400 },
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 },
      );
    }

    const db = await getActiveDb();

    const existingCustomer = await db.customer_sync.findUnique({
      where: {
        email,
      },
    });

    if (existingCustomer) {
      if (existingCustomer.deletedAt) {
        const restoredCustomer = await db.customer_sync.update({
          where: {
            id: existingCustomer.id,
          },

          data: {
            name,
            email,
            phone,
            deletedAt: null,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          customer: restoredCustomer,
          message: "Previously deleted customer restored successfully",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: "Customer with this email already exists",
        },
        { status: 409 },
      );
    }
    const id = crypto.randomUUID();

    const customer = await db.customer_sync.create({
      data: {
        id,
        name,
        email,
        phone,
        deletedAt: null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        customer,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[CUSTOMERS POST ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create customer",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("customer-sync");

    if (accessError) {
      return accessError;
    }

    const body = await request.json();

    const id = body?.id?.trim();

    if (!id || id === "CustomerSync") {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const name = body?.name?.trim();

    const email = body?.email?.trim().toLowerCase();

    const phone = body?.phone?.trim() || null;

    const lastSyncedAt = body?.lastSyncedAt
      ? new Date(body.lastSyncedAt)
      : null;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Name is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        {
          status: 400,
        },
      );
    }

    if (body?.lastSyncedAt && isNaN(lastSyncedAt.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid lastSyncedAt date",
        },
        {
          status: 400,
        },
      );
    }

    const db = await getActiveDb();

    const existingCustomer = await db.customer_sync.findUnique({
      where: {
        id,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        {
          status: 404,
        },
      );
    }

    if (existingCustomer.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer has been deleted",
        },
        {
          status: 410,
        },
      );
    }

    const duplicateEmail = await db.customer_sync.findFirst({
      where: {
        email,

        NOT: {
          id,
        },

        deletedAt: null,
      },
    });

    if (duplicateEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Another customer already uses this email",
        },
        {
          status: 409,
        },
      );
    }

    const customer = await db.customer_sync.update({
      where: {
        id,
      },

      data: {
        name,
        email,
        phone,
        lastSyncedAt,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("[CUSTOMER PUT ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to update customer",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("customer-sync");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const id = body?.id?.trim();

    if (!id || id === "CustomerSync") {
      return NextResponse.json(
        {
          success: false,
          error: "Customer ID is required",
        },
        {
          status: 400,
        },
      );
    }

    const db = await getActiveDb();

    const existingCustomer = await db.customer_sync.findUnique({
      where: {
        id,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        {
          status: 404,
        },
      );
    }

    if (existingCustomer.deletedAt) {
      return NextResponse.json({
        success: true,
        message: "Customer already deleted",
        customer: existingCustomer,
      });
    }

    const customer = await db.customer_sync.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,

      message: "Customer deleted successfully",

      customer,
    });
  } catch (error) {
    console.error("[CUSTOMER DELETE ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to delete customer",
      },
      {
        status: 500,
      },
    );
  }
}