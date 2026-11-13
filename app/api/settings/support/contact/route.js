import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";

function generateReferenceCode() {
  return `CONTACT-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}
// =========================================================
// GET
//
// GET /api/settings/support/contact
//
// Supported:
// ?page=1
// ?limit=10
// ?sort=id
// ?sort=name
// ?sort=email
// ?sort=phone
// ?sort=createdAt
// ?sort=updatedAt
// ?dir=asc
// ?dir=desc
// ?query=support
//
// Single:
// ?id=1
// =========================================================

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("contact");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get('id');

    const page = Math.max(
      Number(
        searchParams.get('page') || 1
      ),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(
          searchParams.get('limit') || 10
        ),
        1
      ),
      100
    );

    const sort =
      searchParams.get('sort') || 'id';

    const dir =
      searchParams.get('dir') === 'asc'
        ? 'asc'
        : 'desc';

    const query =
      searchParams
        .get('query')
        ?.trim() || '';

    // =======================================================
    // GET SINGLE CONTACT
    // =======================================================

    if (id) {
      const contactId = Number(id);

      if (
        !contactId ||
        Number.isNaN(contactId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Valid contact ID is required.',
          },
          { status: 400 }
        );
      }

      const contact =
        await prisma.contact.findUnique({
          where: {
            id: contactId,
          },
        });

      if (!contact) {
        return NextResponse.json(
          {
            success: false,
            message: 'Contact not found.',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: contact,
      });
    }

    // =======================================================
    // SEARCH
    // =======================================================

    const where = {};

    if (query) {
      where.OR = [
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: query,
            mode: 'insensitive',
          },
        },
      ];
    }

    // =======================================================
    // SORT
    // =======================================================

    const allowedSortFields = [
      'id',
      'name',
      'email',
      'phone',
      'createdAt',
      'updatedAt',
    ];

    const sortField =
      allowedSortFields.includes(sort)
        ? sort
        : 'id';

    const orderBy = {
      [sortField]: dir,
    };

    // =======================================================
    // TOTAL
    // =======================================================

    const total =
      await prisma.contact.count({
        where,
      });

    // =======================================================
    // PAGINATION
    // =======================================================

    const skip =
      (page - 1) * limit;

    // =======================================================
    // FETCH CONTACTS
    // =======================================================

    const contacts =
      await prisma.contact.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      });

    // =======================================================
    // RESPONSE
    // =======================================================

    return NextResponse.json({
      success: true,

      data: contacts,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(total / limit),
      },

      sorting: {
        sort: sortField,
        dir,
      },

      query,
    });
  } catch (error) {
    console.error(
      'GET CONTACT ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          'Failed to fetch contacts.',
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------
// POST - CREATE CONTACT
// ---------------------------------------------------------

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("contact");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const name =
      body.name !== undefined &&
        body.name !== null
        ? String(body.name).trim()
        : "";

    const email =
      body.email !== undefined &&
        body.email !== null
        ? String(body.email).trim()
        : "";

    const phone =
      body.phone !== undefined &&
        body.phone !== null
        ? String(body.phone).trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact name is required.",
        },
        { status: 400 }
      );
    }

    // Optional email validation
    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.create({
      data: {
        name: name || null,
        email: email || null,
        phone: phone || null,
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(contact.id),
      entityType: "settings.support.contact",
      referenceCode,
      description: `Contact created: ${contact.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Contact created successfully.",
        data: contact,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE CONTACT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to create contact.",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------
// PUT - UPDATE CONTACT
// ---------------------------------------------------------

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("contact");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const id = Number(body.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid contact ID is required.",
        },
        { status: 400 }
      );
    }

    const existingContact =
      await prisma.contact.findUnique({
        where: {
          id,
        },
      });

    if (!existingContact) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact not found.",
        },
        { status: 404 }
      );
    }

    const name =
      body.name !== undefined &&
        body.name !== null
        ? String(body.name).trim()
        : "";

    const email =
      body.email !== undefined &&
        body.email !== null
        ? String(body.email).trim()
        : "";

    const phone =
      body.phone !== undefined &&
        body.phone !== null
        ? String(body.phone).trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact name is required.",
        },
        { status: 400 }
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.update({
      where: {
        id,
      },
      data: {
        name: name || null,
        email: email || null,
        phone: phone || null,
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "update",
      userId: user?.id ? String(user.id) : null,
      entityId: String(contact.id),
      entityType: "settings.support.contact",
      referenceCode,
      description: `Contact updated: ${contact.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json({
      success: true,
      message: "Contact updated successfully.",
      data: contact,
    });
  } catch (error) {
    console.error("UPDATE CONTACT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to update contact.",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------
// DELETE - DELETE CONTACT
// ---------------------------------------------------------

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("contact");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = Number(searchParams.get("id"));

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid contact ID is required.",
        },
        { status: 400 }
      );
    }

    const existingContact =
      await prisma.contact.findUnique({
        where: {
          id,
        },
      });

    if (!existingContact) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact not found.",
        },
        { status: 404 }
      );
    }

    await prisma.contact.delete({
      where: {
        id,
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(existingContact.id),
      entityType: "settings.support.contact",
      referenceCode,
      description: `Contact deleted: ${existingContact.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    return NextResponse.json({
      success: true,
      message: "Contact deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE CONTACT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message ||
          "Failed to delete contact.",
      },
      { status: 500 }
    );
  }
}