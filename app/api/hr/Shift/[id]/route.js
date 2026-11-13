
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

const ENTITY_TYPE = "shift";

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

export async function PATCH(request, { params }) {
  try {
    const accessError = await checkMenuAccess("shift");
    if (accessError) return accessError;

    const { id } = await params;
    const body = await request.json();

    if (typeof body.status !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be true or false.",
        },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!shift) {
      return NextResponse.json(
        {
          success: false,
          message: "Shift not found.",
        },
        { status: 404 }
      );
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        status: body.status,
        lastSyncAt: new Date(),
      },
    });

    await systemLog({
      event: "update",
      userId: String(user.id),
      entityId: String(updated.id),
      entityType: ENTITY_TYPE,
      description: `Shift marked ${
        body.status ? "active" : "inactive"
      }: ${updated.name}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Shift marked ${
        body.status ? "active" : "inactive"
      }.`,
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("SHIFT STATUS UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update shift status.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const accessError = await checkMenuAccess("shift");
    if (accessError) return accessError;

    const { id } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized. Please log in again.",
        },
        { status: 401 }
      );
    }

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!shift) {
      return NextResponse.json(
        {
          success: false,
          message: "Shift not found.",
        },
        { status: 404 }
      );
    }

    const deleted = await prisma.shift.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        lastSyncAt: new Date(),
      },
    });

    await systemLog({
      event: "delete",
      userId: String(user.id),
      entityId: String(deleted.id),
      entityType: ENTITY_TYPE,
      description: `Shift deleted: ${deleted.name}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Shift deleted successfully.",
      sync: true,
    });
  } catch (error) {
    console.error("SHIFT DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete shift.",
      },
      { status: 500 }
    );
  }
}
