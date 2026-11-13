import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customFields = await prisma.customField.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: customFields,
    });
  } catch (error) {
    console.error("GET /api/support/custom-fields ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load custom fields.",
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
