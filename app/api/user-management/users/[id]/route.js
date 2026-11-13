import { NextResponse } from 'next/server';

import { getServerSession } from 'next-auth/next';
import { getClientIP } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { systemLog } from '@/services/system-log';
import {
  UserProfileSchema
} from

  '@/app/(protected)/user-management/users/[id]/forms/user-profile-schema';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';
import { UserStatus } from '@/app/models/user';

// GET: Fetch a specific user by ID, including role
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Invalid user ID" },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        status: true,
        lastSignInAt: true,
        UserRole: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            isTrashed: true,
            isProtected: true,
            isDefault: true,
          },
        },
      },
    });
    if (!user) {
      return NextResponse.json(
        { message: "Record not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("User GET API error:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { message: "Failed to fetch user details." },
      { status: 500 }
    );
  }
}



export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "Invalid input." },
        { status: 400 }
      );
    }

    const clientIp = getClientIP(request);
    const body = await request.json();

    const parsedData = UserProfileSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          message: "Invalid input.",
          details: parsedData.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, status, roleId } = parsedData.data;

    const roleExists = await prisma.userRole.findUnique({
      where: { id: roleId },
    });

    if (!roleExists) {
      return NextResponse.json(
        { message: "Role does not exist." },
        { status: 400 }
      );
    }

    const roleSlug = roleExists.slug?.toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      // ---------------------------------------------------
      // FIND EXISTING USER
      // ---------------------------------------------------

      const existingUser = await tx.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new Error("User not found.");
      }

      // ---------------------------------------------------
      // UPDATE USER
      // ---------------------------------------------------

      const user = await tx.user.update({
        where: { id },
        data: {
          name,
          status,
          roleId,
        },
      });

      let customer = null;
      let staff = null;

      // ---------------------------------------------------
      // CUSTOMER ROLE HANDLING
      // ---------------------------------------------------

      if (roleSlug === "customer") {
        customer = await tx.customer.findUnique({
          where: {
            userId: user.id,
          },
        });

        const customerData = {
          company: name,
          email: user.email,
          active: status === "ACTIVE",
        };

        if (customer) {
          customer = await tx.customer.update({
            where: {
              id: customer.id,
            },
            data: customerData,
          });
        } else {
          const existingCustomer = await tx.customer.findFirst({
            where: {
              email: user.email,
            },
          });

          if (existingCustomer) {
            if (
              existingCustomer.userId &&
              existingCustomer.userId !== user.id
            ) {
              throw new Error("CUSTOMER_EMAIL_ALREADY_LINKED");
            }

            customer = await tx.customer.update({
              where: {
                id: existingCustomer.id,
              },
              data: {
                ...customerData,
                userId: user.id,
              },
            });
          } else {
            customer = await tx.customer.create({
              data: {
                userId: user.id,
                ...customerData,
              },
            });
          }
        }
      }

      // ---------------------------------------------------
      // STAFF ROLE HANDLING
      // ---------------------------------------------------

      if (roleSlug === "staff") {
        /*
         * Convert User.name into Staff firstName and lastName.
         */

        const nameParts = String(name || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean);

        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || firstName;

        if (!firstName || !lastName) {
          throw new Error("STAFF_NAME_REQUIRED");
        }

        /*
         * StaffUser password is synchronized from User.
         * This assumes both tables use the same bcrypt hash.
         */

        const staffData = {
          firstName,
          lastName,
          email: user.email,
          password: user.password,
          isActive: status === "ACTIVE",
        };

        /*
         * Find StaffUser linked to this User.
         */

        staff = await tx.staffUser.findUnique({
          where: {
            userId: user.id,
          },
        });

        if (staff) {
          // Update existing linked Staff record.

          staff = await tx.staffUser.update({
            where: {
              id: staff.id,
            },
            data: staffData,
          });
        } else {
          /*
           * Check whether a Staff record already exists
           * with the same email.
           */

          const existingStaff = await tx.staffUser.findFirst({
            where: {
              email: user.email,
            },
          });

          if (existingStaff) {
            if (
              existingStaff.userId &&
              existingStaff.userId !== user.id
            ) {
              throw new Error("STAFF_EMAIL_ALREADY_LINKED");
            }

            // Link existing Staff record to User.

            staff = await tx.staffUser.update({
              where: {
                id: existingStaff.id,
              },
              data: {
                ...staffData,
                userId: user.id,
              },
            });
          } else {
            /*
             * Create new Staff record.
             */

            if (!user.password) {
              throw new Error(
                "A password is required to create the staff record."
              );
            }

            staff = await tx.staffUser.create({
              data: {
                userId: user.id,

                ...staffData,

                // Defaults for newly created Staff records.
                sendWelcomeEmail: false,
                isAdministrator: false,
                isNotStaff: false,
              },
            });
          }
        }
      }

      // ---------------------------------------------------
      // SYSTEM LOG
      // ---------------------------------------------------

      await systemLog(
        {
          event: "update",
          userId: session.user.id,
          entityId: user.id,
          entityType: "user.profile",
          description:
            roleSlug === "customer"
              ? "User profile and customer information updated."
              : roleSlug === "staff"
                ? "User profile and staff information updated."
                : "User profile updated.",
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
        message: "User profile successfully updated.",
        user: result.user,
        customer: result.customer,
        staff: result.staff,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("UPDATE USER ERROR:", error);

    if (error.message === "User not found.") {
      return NextResponse.json(
        { message: error.message },
        { status: 404 }
      );
    }

    if (error.message === "STAFF_NAME_REQUIRED") {
      return NextResponse.json(
        { message: "First name and last name are required for staff." },
        { status: 400 }
      );
    }

    if (error.message === "STAFF_EMAIL_ALREADY_LINKED") {
      return NextResponse.json(
        {
          message: "This staff email is already linked to another user.",
        },
        { status: 409 }
      );
    }

    if (error.message === "CUSTOMER_EMAIL_ALREADY_LINKED") {
      return NextResponse.json(
        {
          message: "This customer email is already linked to another user.",
        },
        { status: 409 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          message: "Customer, staff, or user email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message:
          error.message ||
          "Oops! Something went wrong. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}

/*
export async function DELETE(
  request,
  { params }) {
  try {
    // Validate user session
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized request' },
        { status: 401 } // Unauthorized
      );
    }

    const clientIp = getClientIP(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Invalid input.' },
        { status: 400 } // Bad request
      );
    }

    // Check if the role exists
    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (userToDelete && userToDelete.isProtected) {
      return NextResponse.json(
        { message: 'You do not have permission to delete system users.' },
        { status: 401 }
      );
    }

    // Use a transaction to insert multiple records atomically
    await prisma.$transaction(async (tx) => {
      const user = await prisma.user.update({
        where: { id, isProtected: false },
        data: { isTrashed: true, status: UserStatus.INACTIVE }
      });

      // Log the event
      await systemLog(
        {
          event: 'trash',
          userId: session.user.id,
          entityId: user.id,
          entityType: 'user',
          description: 'User trashed.',
          ipAddress: clientIp
        },
        tx
      );

      return user;
    });

    return NextResponse.json(
      { message: 'User successfully deleted.' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: 'Oops! Something went wrong. Please try again in a moment.' },
      { status: 500 }
    );
  }
}*/

export async function DELETE(request, { params }) {
  try {
    // Validate user session
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }
      );
    }

    const clientIp = getClientIP(request);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Invalid input." },
        { status: 400 }
      );
    }

    // Find user
    const userToDelete = await prisma.user.findUnique({
      where: { id },
    });

    if (!userToDelete) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 }
      );
    }

    // Prevent deleting protected users
    if (userToDelete.isProtected) {
      return NextResponse.json(
        {
          message: "You do not have permission to delete system users.",
        },
        { status: 403 }
      );
    }

    // Get role slug
    const userRole = await prisma.userRole.findUnique({
      where: {
        id: userToDelete.roleId,
      },
    });

    const roleSlug = userRole?.slug?.toLowerCase();

    // Soft delete User and related records
    await prisma.$transaction(async (tx) => {
      // Move Customer to trash
      if (roleSlug === "customer") {
        await prisma.customer.delete({
          where: {
            userId: id,
          },
        });
      }

      // Move StaffUser to trash
      if (roleSlug === "staff") {
        await tx.staffUser.delete({
          where: {
            userId: id,
          },
        });
      }

      // Move User to trash
      const user = await tx.user.update({
        where: {
          id,
          isProtected: false,
        },
        data: {
          isTrashed: true,
          status: "INACTIVE",
        },
      });

      // Log the event
      await systemLog(
        {
          event: "trash",
          userId: session.user.id,
          entityId: user.id,
          entityType: "user",
          description: `User moved to trash (${roleSlug || "unknown"}).`,
          ipAddress: clientIp,
        },
        tx
      );

      return user;
    });

    return NextResponse.json(
      {
        success: true,
        message: "User successfully moved to trash.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE USER ERROR:", error);

    return NextResponse.json(
      {
        message:
          "Oops! Something went wrong. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
