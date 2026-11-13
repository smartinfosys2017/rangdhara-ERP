import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error("GET /api/support/services ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load services.",
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
