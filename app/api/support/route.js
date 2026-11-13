import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function safeJsonParse(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toInt(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isInteger(number) ? number : null;
}

function toStringOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeTicket(ticket) {
  if (!ticket) return null;

  return {
    ...ticket,

    customFields: ticket.customFields || {},
  };
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| GET /api/support
| GET /api/support?tickets=1
| GET /api/support?id=123
|
|--------------------------------------------------------------------------
*/

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("support");
                      
    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const ticketsParam = searchParams.get("tickets");

    // =========================================================
    // SINGLE TICKET
    // /api/support?id=123
    // =========================================================

    if (id) {
      const ticketId = Number(id);

      if (!Number.isInteger(ticketId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid ticket ID.",
          },
          { status: 400 },
        );
      }

      const ticket = await prisma.ticket.findUnique({
        where: {
          id: ticketId,
        },
      });

      if (!ticket) {
        return NextResponse.json(
          {
            success: false,
            message: "Ticket not found.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          ticket: normalizeTicket(ticket),
        },
      });
    }

    // =========================================================
    // TICKET LIST
    //
    // /api/support?tickets=1
    //
    // OR
    //
    // /api/support?page=1&limit=10
    // =========================================================

    const hasPagination =
      searchParams.has("page") ||
      searchParams.has("limit") ||
      searchParams.has("sort") ||
      searchParams.has("dir") ||
      searchParams.has("query");

    if (ticketsParam === "1" || hasPagination) {
      const pageValue = Number(searchParams.get("page") || 1);

      const limitValue = Number(searchParams.get("limit") || 10);

      const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

      const limit =
        Number.isInteger(limitValue) && limitValue > 0
          ? Math.min(limitValue, 100)
          : 10;

      const skip = (page - 1) * limit;

      // -------------------------------------------------------
      // SEARCH
      // -------------------------------------------------------

      const query = searchParams.get("query")?.trim() || "";

      const where = query
        ? {
            OR: [
              {
                subject: {
                  contains: query,
                  mode: "insensitive",
                },
              },

              {
                ticketNumber: {
                  contains: query,
                  mode: "insensitive",
                },
              },

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
            ],
          }
        : {};

      // -------------------------------------------------------
      // SORT
      // -------------------------------------------------------

      const requestedSort = searchParams.get("sort") || "createdAt";

      const requestedDir = searchParams.get("dir") || "desc";

      const allowedSortFields = [
        "id",
        "ticketNumber",
        "subject",
        "name",
        "email",
        "department",
        "priority",
        "status",
        "createdAt",
        "updatedAt",
      ];

      const sortField = allowedSortFields.includes(requestedSort)
        ? requestedSort
        : "createdAt";

      const sortDirection = requestedDir === "asc" ? "asc" : "desc";

      // -------------------------------------------------------
      // GET TICKETS
      // -------------------------------------------------------

      const [ticketList, total] = await Promise.all([
        prisma.ticket.findMany({
          where,

          orderBy: {
            [sortField]: sortDirection,
          },

          skip,

          take: limit,
        }),

        prisma.ticket.count({
          where,
        }),
      ]);

      console.log("SUPPORT TICKETS:", ticketList.length);

      console.log("SUPPORT TOTAL:", total);

      return NextResponse.json({
        success: true,

        data: {
          tickets: ticketList.map(normalizeTicket),
        },

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    // =========================================================
    // DEFAULT LOOKUP DATA
    // /api/support
    // =========================================================

    const [departments, services, users, projects, contacts, customFields] =
      await Promise.allSettled([
        prisma.department.findMany({
          orderBy: {
            id: "asc",
          },
        }),

        prisma.service.findMany({
          orderBy: {
            id: "asc",
          },
        }),

        prisma.user.findMany({
          orderBy: {
            id: "asc",
          },
        }),

        prisma.project.findMany({
          orderBy: {
            id: "asc",
          },
        }),

        prisma.contact.findMany({
          orderBy: {
            id: "asc",
          },
        }),

        prisma.customField.findMany({
          orderBy: {
            id: "asc",
          },
        }),
      ]);

    return NextResponse.json({
      success: true,

      data: {
        departments:
          departments.status === "fulfilled" ? departments.value : [],

        services: services.status === "fulfilled" ? services.value : [],

        staff: users.status === "fulfilled" ? users.value : [],

        users: users.status === "fulfilled" ? users.value : [],

        projects: projects.status === "fulfilled" ? projects.value : [],

        contacts: contacts.status === "fulfilled" ? contacts.value : [],

        customFields:
          customFields.status === "fulfilled" ? customFields.value : [],
      },
    });
  } catch (error) {
    console.error("GET /api/support ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load support data.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
|
| Create Ticket
|
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("support");
                      
    if (accessError) {
      return accessError;
    }
    const contentType = request.headers.get("content-type") || "";

    let data = {};

    /*
    |--------------------------------------------------------------------------
    | JSON
    |--------------------------------------------------------------------------
    */

    if (contentType.includes("application/json")) {
      data = await request.json();
    }

    /*
    |--------------------------------------------------------------------------
    | FormData
    |--------------------------------------------------------------------------
    */
    else {
      const formData = await request.formData();

      data = Object.fromEntries(formData.entries());
    }

    /*
    |--------------------------------------------------------------------------
    | Required Fields
    |--------------------------------------------------------------------------
    */

    const subject = data.subject?.toString().trim() || "";

    const message =
      data.message?.toString().trim() ||
      data.description?.toString().trim() ||
      "";

    const department = data.department?.toString().trim() || "";

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          message: "Subject is required.",
        },
        { status: 400 },
      );
    }

    if (!department) {
      return NextResponse.json(
        {
          success: false,
          message: "Department is required.",
        },
        { status: 400 },
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket message is required.",
        },
        { status: 400 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Custom Fields
    |--------------------------------------------------------------------------
    */

    const customFields = safeJsonParse(data.customFields, []);

    /*
    |--------------------------------------------------------------------------
    | Generate Ticket Number
    |--------------------------------------------------------------------------
    */

    const ticketNumber = await generateTicketNumber();

    /*
    |--------------------------------------------------------------------------
    | Create Ticket
    |--------------------------------------------------------------------------
    */

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,

        subject,

        contactId: toInt(data.contactid) ?? toInt(data.contactId),

        userId: toInt(data.userid) ?? toInt(data.userId),

        name: data.name?.toString() || null,

        email: data.email?.toString() || null,

        department,

        cc: data.cc?.toString() || null,

        tags: data.tags?.toString() || null,

        assigned: toInt(data.assigned) ?? toInt(data.assignedTo),

        priority: toInt(data.priority) || 2,

        service: data.service?.toString() || null,

        projectId: toInt(data.project_id) ?? toInt(data.projectId),

        message,

        status: data.status?.toString() || "open",

        customFields,
      },
    });

    return NextResponse.json(
      {
        success: true,

        message: "Ticket created successfully.",

        data: {
          ticket: normalizeTicket(ticket),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("POST /api/support ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create ticket.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT
|--------------------------------------------------------------------------
|
| Update Ticket
|
|--------------------------------------------------------------------------
*/

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("support");
                      
    if (accessError) {
      return accessError;
    }
    const contentType = request.headers.get("content-type") || "";

    let data = {};

    /*
    |--------------------------------------------------------------------------
    | JSON
    |--------------------------------------------------------------------------
    */

    if (contentType.includes("application/json")) {
      data = await request.json();
    }

    /*
    |--------------------------------------------------------------------------
    | FormData
    |--------------------------------------------------------------------------
    */
    else {
      const formData = await request.formData();

      data = Object.fromEntries(formData.entries());
    }

    /*
    |--------------------------------------------------------------------------
    | Ticket ID
    |--------------------------------------------------------------------------
    */

    const id = toInt(data.id);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Existing Ticket
    |--------------------------------------------------------------------------
    */

    const existingTicket = await prisma.ticket.findUnique({
      where: {
        id,
      },
    });

    if (!existingTicket) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Fields
    |--------------------------------------------------------------------------
    */

    const subject =
      data.subject !== undefined
        ? data.subject?.toString().trim()
        : existingTicket.subject;

    const message =
      data.message !== undefined
        ? data.message?.toString().trim()
        : data.description !== undefined
          ? data.description?.toString().trim()
          : existingTicket.message;

    const department =
      data.department !== undefined
        ? data.department?.toString().trim()
        : existingTicket.department;

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          message: "Subject is required.",
        },
        { status: 400 },
      );
    }

    if (!department) {
      return NextResponse.json(
        {
          success: false,
          message: "Department is required.",
        },
        { status: 400 },
      );
    }

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket message is required.",
        },
        { status: 400 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Custom Fields
    |--------------------------------------------------------------------------
    */

    let customFields = existingTicket.customFields || {};

    if (data.customFields !== undefined && data.customFields !== "") {
      const parsed = safeJsonParse(data.customFields, null);

      if (parsed !== null) {
        customFields = parsed;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    */

    const updatedTicket = await prisma.ticket.update({
      where: {
        id,
      },

      data: {
        subject,

        contactId:
          data.contactid !== undefined
            ? toInt(data.contactid)
            : data.contactId !== undefined
              ? toInt(data.contactId)
              : existingTicket.contactId,

        userId:
          data.userid !== undefined
            ? toInt(data.userid)
            : data.userId !== undefined
              ? toInt(data.userId)
              : existingTicket.userId,

        name:
          data.name !== undefined
            ? toStringOrNull(data.name)
            : existingTicket.name,

        email:
          data.email !== undefined
            ? toStringOrNull(data.email)
            : existingTicket.email,

        department,

        cc: data.cc !== undefined ? toStringOrNull(data.cc) : existingTicket.cc,

        tags:
          data.tags !== undefined
            ? toStringOrNull(data.tags)
            : existingTicket.tags,

        assigned:
          data.assigned !== undefined
            ? toInt(data.assigned)
            : data.assignedTo !== undefined
              ? toInt(data.assignedTo)
              : existingTicket.assigned,

        priority:
          data.priority !== undefined
            ? toInt(data.priority) || 2
            : existingTicket.priority,

        service:
          data.service !== undefined
            ? toStringOrNull(data.service)
            : existingTicket.service,

        projectId:
          data.project_id !== undefined
            ? toInt(data.project_id)
            : data.projectId !== undefined
              ? toInt(data.projectId)
              : existingTicket.projectId,

        message,

        status:
          data.status !== undefined
            ? data.status?.toString().trim()
            : existingTicket.status,

        customFields,
      },
    });

    return NextResponse.json({
      success: true,

      message: "Ticket updated successfully.",

      data: {
        ticket: normalizeTicket(updatedTicket),
      },
    });
  } catch (error) {
    console.error("PUT /api/support ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update ticket.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("support");
                      
    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    const id = toInt(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: {
        id,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket not found.",
        },
        {
          status: 404,
        },
      );
    }

    await prisma.ticket.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Ticket deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/support ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete ticket.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| Generate Ticket Number
|--------------------------------------------------------------------------
*/

async function generateTicketNumber() {
  const lastTicket = await prisma.ticket.findFirst({
    orderBy: {
      id: "desc",
    },

    select: {
      id: true,
    },
  });

  const nextId = (lastTicket?.id || 0) + 1;

  return `TKT-${String(nextId).padStart(6, "0")}`;
}
