import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiToken } from "@/lib/jwt";

export async function GET(request) {
  try {
    // ---------------------------------------
    // Check Authorization Header
    // ---------------------------------------
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization token is required.",
        },
        { status: 401 }
      );
    }

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authorization format.",
        },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);

    // ---------------------------------------
    // Verify JWT
    // ---------------------------------------
    try {
      await verifyApiToken(token);
    } catch (error) {
      console.error("JWT verification error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token.",
        },
        { status: 401 }
      );
    }

    // ---------------------------------------
    // Get Company Settings
    // ---------------------------------------
    const settings = await prisma.setting.findMany({
      where: {
        group: "company",
      },
      select: {
        key: true,
        value: true,
      },
    });

    // ---------------------------------------
    // Convert settings to object
    // ---------------------------------------
    const company = {};

    settings.forEach((setting) => {
      company[setting.key] = setting.value;
    });

    // ---------------------------------------
    // Response
    // ---------------------------------------
    return NextResponse.json({
      success: true,
      message: "Company information fetched successfully.",
      data: company,
    });
  } catch (error) {
    console.error("Get company info error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get company information.",
      },
      { status: 500 }
    );
  }
}