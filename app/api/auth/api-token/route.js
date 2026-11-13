import { NextResponse } from "next/server";
import { createApiToken } from "@/lib/jwt";

export async function POST(request) {
  try {
    const body = await request.json();

    const { username, password } = body;

    /*
     * TEST LOGIN
     *
     * Replace this later with your database/user authentication.
     */
    if ( username !== "user" || password !== "user123" ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 }
      );
    }

    const token = await createApiToken({
      userId: 1,
      username: "admin",
      type: "api",
    });

    return NextResponse.json({
      success: true,
      message: "API token generated successfully.",
      data: {
        token,
        token_type: "Bearer",
        expires_in: "7 days",
      },
    });
  } catch (error) {
    console.error("API token error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate API token.",
      },
      { status: 500 }
    );
  }
}