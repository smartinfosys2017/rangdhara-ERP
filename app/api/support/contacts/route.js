import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    console.error("GET /api/support/contacts ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to load contacts.",
        data: [],
      },
      {
        status: 500,
      },
    );
  }
}
