import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| Save setting
|--------------------------------------------------------------------------
*/
async function saveSetting(key, value) {
  if (value === null || value === undefined) {
    return;
  }

  await prisma.setting.upsert({
    where: {
      key: key,
    },

    update: {
      value: String(value),
    },

    create: {
      group: "general",
      key: key,
      value: String(value),
    },
  });
}

/*
|--------------------------------------------------------------------------
| Upload file
|--------------------------------------------------------------------------
*/
async function uploadFile(file) {
  if (!file) {
    return null;
  }

  /*
   * FormData can contain strings.
   * We only process actual files.
   */
  if (typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return null;
  }

  if (file.size <= 0) {
    return null;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "settings");

  await fs.mkdir(uploadDir, {
    recursive: true,
  });

  const extension = path.extname(file.name || "").toLowerCase();

  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;

  const filePath = path.join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(filePath, buffer);

  return `/uploads/settings/${fileName}`;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        group: "general",
      },
    });

    const data = {};

    settings.forEach((setting) => {
      data[setting.key] = setting.value || "";
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GENERAL SETTINGS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load general settings",

        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/
export async function POST(request) {
  try {
    /*
     * Read FormData
     */
    const formData = await request.formData();

    /*
     * Get files
     */
    const companyLogoLight = formData.get("companyLogoLight");

    const companyLogoDark = formData.get("companyLogoDark");

    const favicon = formData.get("favicon");

    /*
     * Upload files
     */
    const companyLogoLightUrl = await uploadFile(companyLogoLight);

    const companyLogoDarkUrl = await uploadFile(companyLogoDark);

    const faviconUrl = await uploadFile(favicon);

    /*
     * Get normal fields
     */
    const rtlAdmin = formData.get("rtlAdmin") || "0";

    const rtlCustomer = formData.get("rtlCustomer") || "0";

    const allowedFileTypes = formData.get("allowedFileTypes") || "";

    const storeDataBackend = formData.get("storeDataBackend") || "0";

    /*
     * Save normal settings
     */
    await saveSetting("rtl_admin", rtlAdmin);

    await saveSetting("rtl_customer", rtlCustomer);

    await saveSetting("allowed_file_types", allowedFileTypes);

    await saveSetting("store_data_backend", storeDataBackend);

    /*
     * Save uploaded file URLs
     */
    if (companyLogoLightUrl) {
      await saveSetting("company_logo_light", companyLogoLightUrl);
    }

    if (companyLogoDarkUrl) {
      await saveSetting("company_logo_dark", companyLogoDarkUrl);
    }

    if (faviconUrl) {
      await saveSetting("favicon", faviconUrl);
    }

    console.log("GENERAL SETTINGS POST SUCCESS");

    return NextResponse.json({
      success: true,
      message: "General settings saved successfully.",
    });
  } catch (error) {
    console.error("=================================");

    console.error("GENERAL SETTINGS POST ERROR");

    console.error(error);

    console.error("=================================");

    return NextResponse.json(
      {
        success: false,

        message: "Failed to save general settings",

        /*
         * VERY IMPORTANT FOR DEBUGGING
         */
        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}