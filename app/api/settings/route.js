
import { NextResponse } from "next/server";
import { getAllSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getAllSettings();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Settings API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch settings",
      },
      { status: 500 }
    );
  }
}
