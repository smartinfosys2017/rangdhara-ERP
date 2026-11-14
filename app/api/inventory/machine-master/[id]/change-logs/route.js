import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Machine ID is required." },
        { status: 400 }
      );
    }

    const logs = await prisma.machineChangeLog.findMany({
      where: {
        machineId: id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("MACHINE CHANGE LOG ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch machine change history.",
      },
      { status: 500 }
    );
  }
}