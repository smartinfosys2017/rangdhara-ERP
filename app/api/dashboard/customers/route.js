
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.user.findMany({
      where: {
        isTrashed: false,
        UserRole: {
          name: {
            equals: "customer",
            mode: "insensitive",
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        status: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Dashboard customers API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load customers.",
      },
      { status: 500 }
    );
  }
}
