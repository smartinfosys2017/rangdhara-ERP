
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

export async function GET() {
  try {
    const accessError = await checkMenuAccess("unit");

    if (accessError) return accessError;

    const users = await prisma.user.findMany({
      where: {
        isTrashed: false,
        UserRole: {
          slug: "admin",
          isTrashed: false,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Unit filter users error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch administrator users.",
      },
      { status: 500 }
    );
  }
}
