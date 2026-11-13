import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";

function generateReferenceCode() {
  return `CUSTOMER-GROUP-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}

// =======================================================
// FORMAT CUSTOMER GROUP
// =======================================================

const formatCustomerGroup = (group) => ({
  id: group.id,
  name: group.name,
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
});

// =======================================================
// GET
// =======================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("customer-group");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    // =====================================================
    // SINGLE CUSTOMER GROUP
    // =====================================================

    const id = searchParams.get('id');

    if (id !== null) {
      const group =
        await prisma.customerGroup.findUnique({
          where: {
            id: String(id),
          },
        });

      if (!group) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Customer group not found.',
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        success: true,
        data: formatCustomerGroup(group),
      });
    }

    // =====================================================
    // PAGINATION
    // =====================================================

    const pageParam = Number(
      searchParams.get('page') || 1
    );

    const limitParam = Number(
      searchParams.get('limit') || 10
    );

    const page =
      Number.isInteger(pageParam) &&
        pageParam > 0
        ? pageParam
        : 1;

    const limit =
      Number.isInteger(limitParam) &&
        limitParam > 0
        ? Math.min(limitParam, 100)
        : 10;

    const skip =
      (page - 1) * limit;

    // =====================================================
    // SEARCH
    // =====================================================

    const search = (
      searchParams.get('search') ||
      searchParams.get('query') ||
      ''
    ).trim();

    // =====================================================
    // SORT
    // =====================================================

    const requestedSort =
      searchParams
        .get('sort')
        ?.trim() ||
      'createdAt';

    const requestedDir =
      searchParams
        .get('dir')
        ?.trim()
        .toLowerCase() ||
      'desc';

    const allowedSortFields = [
      'id',
      'name',
      'createdAt',
      'updatedAt',
    ];

    const sort =
      allowedSortFields.includes(
        requestedSort
      )
        ? requestedSort
        : 'createdAt';

    const dir =
      requestedDir === 'asc'
        ? 'asc'
        : 'desc';

    // =====================================================
    // WHERE
    // =====================================================

    const where = search
      ? {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      }
      : {};

    // =====================================================
    // TOTAL
    // =====================================================

    const total =
      await prisma.customerGroup.count({
        where,
      });

    // =====================================================
    // CUSTOMER GROUPS
    // =====================================================

    const groups =
      await prisma.customerGroup.findMany({
        where,

        orderBy: {
          [sort]: dir,
        },

        skip,

        take: limit,
      });

    // =====================================================
    // PAGINATION
    // =====================================================

    const totalPages =
      total > 0
        ? Math.ceil(total / limit)
        : 0;

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      data: groups.map(
        formatCustomerGroup
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },

      sort: {
        field: sort,
        direction: dir,
      },

      search,
    });
  } catch (error) {
    console.error(
      'GET CUSTOMER GROUP ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to load customer groups.',
      },
      {
        status: 500,
      }
    );
  }
}

// =======================================================
// POST
// =======================================================

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("customer-group");

    if (accessError) {
      return accessError;
    }
    const body =
      await request.json();

    const name =
      typeof body?.name === 'string'
        ? body.name.trim()
        : '';

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Customer group name is required.',
        },
        {
          status: 400,
        }
      );
    }
    // name length validation
    if (name.length > 255) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer Group Name cannot exceed 255 characters.",
        },
        { status: 400 }
      );
    }  
    // =====================================================
    // DUPLICATE CHECK
    // =====================================================

    const existingGroup =
      await prisma.customerGroup.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
      });

    if (existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Customer group already exists.',
        },
        {
          status: 409,
        }
      );
    }

    // =====================================================
    // CREATE
    // =====================================================

    const group =
      await prisma.customerGroup.create({
        data: {
          name,
        },
      });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(group.id),
      entityType: "settings.customer-group",
      referenceCode,
      description: `Customer group created: ${group.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json(
      {
        success: true,
        message:
          'Customer group created successfully.',
        data: formatCustomerGroup(group),
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      'CREATE CUSTOMER GROUP ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to create customer group.',
      },
      {
        status: 500,
      }
    );
  }
}

// =======================================================
// PUT
// =======================================================

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("customer-group");

    if (accessError) {
      return accessError;
    }
    const body =
      await request.json();

    const id =
      typeof body?.id === 'string'
        ? body.id.trim()
        : '';

    const name =
      typeof body?.name === 'string'
        ? body.name.trim()
        : '';

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Customer group ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Customer group name is required.',
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // FIND GROUP
    // =====================================================

    const existingGroup =
      await prisma.customerGroup.findUnique({
        where: {
          id,
        },
      });

    if (!existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Customer group not found.',
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // DUPLICATE NAME CHECK
    // =====================================================

    const duplicateGroup =
      await prisma.customerGroup.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive',
          },

          NOT: {
            id,
          },
        },
      });

    if (duplicateGroup) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Another customer group with this name already exists.',
        },
        {
          status: 409,
        }
      );
    }

    // =====================================================
    // UPDATE
    // =====================================================

    const group =
      await prisma.customerGroup.update({
        where: {
          id,
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
      entityId: String(group.id),
      entityType: "settings.customer-group",
      referenceCode,
      description: `Customer group updated: ${group.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json({
      success: true,

      message:
        'Customer group updated successfully.',

      data: formatCustomerGroup(group),
    });
  } catch (error) {
    console.error(
      'UPDATE CUSTOMER GROUP ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to update customer group.',
      },
      {
        status: 500,
      }
    );
  }
}

// =======================================================
// DELETE
// =======================================================

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("customer-group");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get('id');

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Customer group ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // FIND GROUP
    // =====================================================

    const existingGroup =
      await prisma.customerGroup.findUnique({
        where: {
          id: String(id),
        },
      });

    if (!existingGroup) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Customer group not found.',
        },
        {
          status: 404,
        }
      );
    }

    // =====================================================
    // DELETE
    // =====================================================

    await prisma.customerGroup.delete({
      where: {
        id: String(id),
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(existingGroup.id),
      entityType: "settings.customer-group",
      referenceCode,
      description: `Customer group deleted: ${existingGroup.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json({
      success: true,

      message:
        'Customer group deleted successfully.',
    });
  } catch (error) {
    console.error(
      'DELETE CUSTOMER GROUP ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to delete customer group.',
      },
      {
        status: 500,
      }
    );
  }
}