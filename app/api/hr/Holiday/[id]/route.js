import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

const ENTITY_TYPE = "holiday";

const getClientIp = (request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

export async function PATCH(request, { params }) {
  try {
    const accessError = await checkMenuAccess("holiday");
    if (accessError) return accessError;

    const { id } = await params;
    const body = await request.json();

    if (typeof body.status !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Status must be true or false." },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    const holiday = await prisma.holiday.findFirst({
      where: { id, deletedAt: null },
    });

    if (!holiday) {
      return NextResponse.json(
        { success: false, message: "Holiday not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.holiday.update({
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
      description: `Holiday marked ${
        body.status ? "active" : "inactive"
      }: ${updated.name}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: `Holiday marked ${body.status ? "active" : "inactive"}.`,
      data: updated,
      sync: true,
    });
  } catch (error) {
    console.error("HOLIDAY STATUS UPDATE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update holiday status." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const accessError = await checkMenuAccess("holiday");
    if (accessError) return accessError;

    const { id } = await params;
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    const holiday = await prisma.holiday.findFirst({
      where: { id, deletedAt: null },
    });

    if (!holiday) {
      return NextResponse.json(
        { success: false, message: "Holiday not found." },
        { status: 404 }
      );
    }

    const deleted = await prisma.holiday.update({
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
      description: `Holiday deleted: ${deleted.name}`,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      message: "Holiday deleted successfully.",
      sync: true,
    });
  } catch (error) {
    console.error("HOLIDAY DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete holiday." },
      { status: 500 }
    );
  }
}