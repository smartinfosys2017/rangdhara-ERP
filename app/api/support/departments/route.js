import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("GET /api/support/departments ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load departments.",
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
