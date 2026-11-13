import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error("GET /api/support/projects ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load projects.",
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
