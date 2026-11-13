
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";

function getIpAddress(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function DELETE(request, { params }) {
  try {
    const accessError = await checkMenuAccess("unit");

    if (accessError) return accessError;

    const { id } = await params;
    const unitId = String(id || "").trim();

    if (!unitId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit ID is required.",
        },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Authenticated user not found.",
        },
        { status: 401 }
      );
    }

    // Find active unit
    const existingUnit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        deletedAt: null,
      },
    });

    if (!existingUnit) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit not found or already deleted.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    // Soft delete
    const deletedUnit = await prisma.unit.update({
      where: {
        id: unitId,
      },
      data: {
        deletedAt: now,
        updateby: String(user.id),
        lastSyncAt: now,
      },
    });

    // System log
    await systemLog({
      event: "delete",
      userId: String(user.id),
      entityId: String(deletedUnit.id),
      entityType: "inventory.unit",
      description: `Unit deleted: ${deletedUnit.unitName}`,
      ipAddress: getIpAddress(request),
    });

    return NextResponse.json({
      success: true,
      message: "Unit deleted successfully.",
      sync: true,
    });
  } catch (error) {
    console.error("UNIT DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete unit.",
      },
      { status: 500 }
    );
  }
}
