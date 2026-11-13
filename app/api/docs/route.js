import { NextResponse } from "next/server";
import { getApiDocs } from "@/lib/swagger";

export async function GET() {
  try {
    const spec = await getApiDocs();

    return NextResponse.json(spec);
  } catch (error) {
    console.error("Swagger API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate Swagger documentation.",
        error: error?.message || String(error),
      },
      {
        status: 500,
      }
    );
  }
}