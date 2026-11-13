import { NextResponse } from "next/server";

import { getServerSession } from "next-auth/next";
import { getClientIP } from "@/lib/api";
import { isUnique } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { systemLog } from "@/services/system-log";
import { RoleSchema } from "@/app/(protected)/user-management/roles/forms/role-schema";
import authOptions from "@/app/api/auth/[...nextauth]/auth-options";

// GET: Fetch a specific role by ID, including permissions
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }, // Unauthorized
      );
    }

    const role = await prisma.userRole.findUnique({
      where: { id: (await params).id },
      include: {
        permissions: {
          include: {
            permission: true, // Fetch full permission details
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    // Map permissions to a flat structure
    const permissions = role.permissions.map((p) => p.permission);

    return NextResponse.json({ ...role, permissions });
  } catch {
    return NextResponse.json(
      { message: "Oops! Something went wrong. Please try again in a moment." },
      { status: 500 },
    );
  }
}

// PUT: Edit a specific role by ID
export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 },
      );
    }

    const { params } = context;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Invalid input." }, { status: 400 });
    }

    // Check if role exists
    const existingRole = await prisma.userRole.findUnique({
      where: {
        id,
      },
    });

    if (!existingRole) {
      return NextResponse.json(
        {
          message: "Record not found. Someone might have deleted it already.",
        },
        { status: 404 },
      );
    }

    const body = await request.json();

    const parsedData = RoleSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          message: "Invalid input. Please check your data and try again.",
        },
        { status: 400 },
      );
    }

    const { name, slug, description, permissions } = parsedData.data;

    // --------------------------------------------------
    // CHECK DUPLICATE NAME / SLUG
    // --------------------------------------------------
    const duplicateRole = await prisma.userRole.findFirst({
      where: {
        id: {
          not: id,
        },
        OR: [
          {
            name,
          },
          {
            slug,
          },
        ],
      },
    });

    if (duplicateRole) {
      return NextResponse.json(
        {
          message: "Name or slug must be unique",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // UPDATE ROLE + PERMISSIONS
    // --------------------------------------------------
    const updatedRole = await prisma.$transaction(async (tx) => {
      // Update role information
      const role = await tx.userRole.update({
        where: {
          id,
        },
        data: {
          name,
          slug,
          description,
        },
      });

      // Remove old permissions
      await tx.userRolePermission.deleteMany({
        where: {
          roleId: id,
        },
      });

      // Add new permissions
      if (permissions?.length > 0) {
        const newPermissions = permissions.map((permissionId) => ({
          roleId: id,
          permissionId,
        }));

        await tx.userRolePermission.createMany({
          data: newPermissions,
          skipDuplicates: true,
        });
      }

      return role;
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error("Update role error:", error);

    return NextResponse.json(
      {
        message: "Oops! Something went wrong. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}

// DELETE: Remove a specific role by ID
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized request" },
        { status: 401 }, // Unauthorized
      );
    }

    const clientIp = getClientIP(request);
    const { id } = await params;

    // Check if id passed
    if (!id) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    // Check if record exists
    const existingCategory = await prisma.userRole.findUnique({
      where: { id },
    });
    if (!existingCategory) {
      return NextResponse.json(
        { message: "Record not found. Someone might have deleted it already." },
        { status: 404 },
      );
    }

    // Check if the role exists
    const role = await prisma.userRole.findUnique({
      where: { id },
    });

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    // Check if the role is protected
    if (role.isProtected) {
      return NextResponse.json(
        { message: "Cannot delete a protected role" },
        { status: 403 },
      );
    }

    // Check if the role is assigned to any user
    const roleAssignedToUsers = await prisma.user.count({
      where: { roleId: id },
    });

    if (roleAssignedToUsers > 0) {
      return NextResponse.json(
        { message: "Role is assigned to users and cannot be deleted" },
        { status: 403 },
      );
    }

    // Delete the role and its associated permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete linked role permissions
      await tx.userRolePermission.deleteMany({
        where: { roleId: id },
      });

      // Delete the permission itself
      await tx.userRole.delete({
        where: { id },
      });

      // Log the event
      await systemLog(
        {
          event: "delete",
          userId: session.user.id,
          entityId: id,
          entityType: "user.role",
          description: "User role deleted.",
          ipAddress: clientIp,
        },
        tx,
      );
    });

    return NextResponse.json({ message: "Role deleted successfully" });
  } catch {
    return NextResponse.json(
      { message: "Oops! Something went wrong. Please try again in a moment." },
      { status: 500 },
    );
  }
}
