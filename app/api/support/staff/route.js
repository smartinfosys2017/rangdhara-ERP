import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const staff = await prisma.user.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error("GET /api/support/staff ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load staff.",
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
