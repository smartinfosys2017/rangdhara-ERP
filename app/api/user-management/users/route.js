import { NextResponse } from 'next/server';

import { getServerSession } from 'next-auth/next';
import { getClientIP } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import bcrypt from "bcrypt";
import { systemLog } from '@/services/system-log';
import {
  UserAddSchema
} from

  '@/app/(protected)/user-management/users/forms/user-add-schema';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { UserStatus } from '@/app/models/user';
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10),
    );

    const query = searchParams.get("query")?.trim() || "";
    const sortField = searchParams.get("sort") || "createdAt";
    const requestedDirection = searchParams.get("dir") || "asc";

    const sortDirection =
      requestedDirection === "desc" || requestedDirection === "des"
        ? "desc"
        : "asc";

    const status = searchParams.get("status");
    const roleId = searchParams.get("roleId");

    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 },
      );
    }

    const where = {
      AND: [
        ...(status && status !== "all" ? [{ status }] : []),

        ...(roleId && roleId !== "all" ? [{ roleId }] : []),

        ...(query
          ? [
            {
              OR: [
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
            },
          ]
          : []),
      ],
    };

    const sortMap = {
      name: { name: sortDirection },
      role_name: {
        UserRole: { name: sortDirection },
      },
      status: { status: sortDirection },
      createdAt: { createdAt: sortDirection },
      lastSignInAt: { lastSignInAt: sortDirection },
    };

    const orderBy = sortMap[sortField] || {
      createdAt: sortDirection,
    };

    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where }),

      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: {
          id: true,
          isTrashed: true,
          avatar: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          lastSignInAt: true,
          UserRole: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map(({ UserRole, ...user }) => ({
      ...user,
      role: UserRole,
    }));

    return NextResponse.json({
      data: formattedUsers,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("GET users API error:", error);

    return NextResponse.json(
      {
        message: "Unable to fetch users.",
        ...(process.env.NODE_ENV === "development"
          ? {
            error: error instanceof Error ? error.message : String(error),
          }
          : {}),
      },
      { status: 500 },
    );
  }
}



export async function POST(request) {
  try {
    // ---------------------------------------------------
    // VALIDATE SESSION
    // ---------------------------------------------------

    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }
      );
    }

    const clientIp = getClientIP(request);
    const body = await request.json();

    const parsedData = UserAddSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          error: "Invalid input.",
          details: parsedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, email, roleId, password } = parsedData.data;

    const normalizedEmail = email.trim().toLowerCase();

    // ---------------------------------------------------
    // CHECK EXISTING USER
    // ---------------------------------------------------

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409 }
      );
    }

    // ---------------------------------------------------
    // CHECK ROLE
    // ---------------------------------------------------

    const existingRole = await prisma.userRole.findUnique({
      where: {
        id: roleId,
      },
    });

    if (!existingRole) {
      return NextResponse.json(
        {
          message:
            "Selected role does not exist. Someone might have deleted it already.",
        },
        { status: 404 }
      );
    }

    const roleSlug = existingRole.slug?.toLowerCase();

    // ---------------------------------------------------
    // STAFF PASSWORD
    // ---------------------------------------------------
    // StaffUser previously required a password.
    // Do not create a staff login without a valid password.

    let hashedPassword = null;

    if (roleSlug === "staff") {
      // if (!password || !String(password).trim()) {
      //   return NextResponse.json(
      //     {
      //       message: "Password is required when creating a staff user.",
      //     },
      //     { status: 400 }
      //   );
      // }

      // hashedPassword = await bcrypt.hash(String(password), 12);
      hashedPassword = await bcrypt.hash("demo123", 12);
    }

    // ---------------------------------------------------
    // CREATE USER + CUSTOMER / STAFF
    // ---------------------------------------------------

    const result = await prisma.$transaction(async (tx) => {
      // -------------------------------------------------
      // 1. CREATE USER
      // -------------------------------------------------

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          ...(hashedPassword ? { password: hashedPassword } : {}),
          status: "ACTIVE",
          roleId,
        },
      });

      let customer = null;
      let staff = null;

      // -------------------------------------------------
      // 2. CUSTOMER ROLE
      // -------------------------------------------------

      if (roleSlug === "customer") {
        customer = await tx.customer.create({
          data: {
            userId: user.id,
            company: name,
            email: normalizedEmail,
            active: true,
          },
        });
      }

      // -------------------------------------------------
      // 3. STAFF ROLE
      // -------------------------------------------------

      if (roleSlug === "staff") {
        const nameParts = String(name)
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || firstName;

        staff = await tx.staffUser.create({
          data: {
            userId: user.id,

            email: normalizedEmail,
            password: hashedPassword,

            firstName,
            lastName,

            isActive: true,
            sendWelcomeEmail: true,

            isAdministrator: false,
            isNotStaff: false,
          },
        });
      }

      // -------------------------------------------------
      // 4. SYSTEM LOG
      // -------------------------------------------------

      await systemLog(
        {
          event: "create",
          userId: session.user.id,
          entityId: user.id,
          entityType: "user",
          description:
            roleSlug === "customer"
              ? "Customer user added with customer information."
              : roleSlug === "staff"
                ? "Staff user added with staff information."
                : "User added by user.",
          ipAddress: clientIp,
        },
        tx
      );

      return {
        user,
        customer,
        staff,
      };
    });

    // ---------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------

    return NextResponse.json(
      {
        message: "User successfully added.",
        user: result.user,
        customer: result.customer,
        staff: result.staff,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("CREATE USER ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message:
          error?.message ||
          "Oops! Something went wrong. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}