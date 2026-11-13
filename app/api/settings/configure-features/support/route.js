import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        group: "support",
      },
    });

    const data = {};

    settings.forEach((setting) => {
      data[setting.key] = setting.value ?? "";
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Support settings GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load support settings.",
        error:
          process.env.NODE_ENV === "development"
            ? error?.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    /**
     * Frontend sends JSON:
     *
     * {
     *   settings: {
     *      services: "1",
     *      disable_ticket_public_url: "0",
     *      ...
     *   }
     * }
     */

    const body = await request.json();

    const settings = body?.settings;

    if (
      !settings ||
      typeof settings !== "object" ||
      Array.isArray(settings) ||
      Object.keys(settings).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Settings data is missing.",
        },
        { status: 400 }
      );
    }

    /**
     * Save settings
     */
    await prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        if (!key || typeof key !== "string") {
          continue;
        }

        const settingValue = String(value ?? "");

        /**
         * IMPORTANT:
         * Prisma model uses `key`, NOT `name`.
         *
         * If key exists -> update
         * If key does not exist -> insert
         */
        await tx.setting.upsert({
          where: {
            key: key,
          },

          update: {
            value: settingValue,
            group: "support",
          },

          create: {
            key: key,
            value: settingValue,
            group: "support",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Support settings saved successfully.",
      data: settings,
    });
  } catch (error) {
    console.error("Support settings POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save support settings.",
        error:
          process.env.NODE_ENV === "development"
            ? error?.message
            : error?.message,
      },
      { status: 500 }
    );
  }
}