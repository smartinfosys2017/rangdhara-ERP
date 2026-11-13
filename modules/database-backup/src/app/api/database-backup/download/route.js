import { NextResponse } from "next/server";

import {
  getBackupById,
  ensureBackupTables,
  generateId,
} from "@/modules/database-backup/src/lib/database-backup.js";

import { prisma } from "@/lib/prisma";

import fs from "fs/promises";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    // ---------------------------------------------
    // ENSURE BACKUP TABLES EXIST
    // ---------------------------------------------

    await ensureBackupTables();

    // ---------------------------------------------
    // GET BACKUP ID
    // ---------------------------------------------

    const url = new URL(request.url);

    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Backup ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------
    // GET BACKUP
    // ---------------------------------------------

    const backup = await getBackupById(id);

    if (!backup) {
      return NextResponse.json(
        {
          success: false,
          message: "Backup not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ---------------------------------------------
    // CHECK BACKUP FILE
    // ---------------------------------------------

    try {
      await fs.access(backup.filePath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Backup ZIP file does not exist.",
        },
        {
          status: 404,
        },
      );
    }

    // ---------------------------------------------
    // READ EXISTING ZIP
    // ---------------------------------------------

    const file = await fs.readFile(backup.filePath);

    // ---------------------------------------------
    // GET DOWNLOAD INFORMATION
    // ---------------------------------------------

    const forwardedFor = request.headers.get("x-forwarded-for");

    const realIp = request.headers.get("x-real-ip");

    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    const userAgent = request.headers.get("user-agent") || null;

    // ---------------------------------------------
    // STORE DOWNLOAD HISTORY
    // ---------------------------------------------

    await prisma.$executeRawUnsafe(
      `
            INSERT INTO "DatabaseBackupDownload"
            (
                "id",
                "backupId",
                "fileName",
                "downloadedBy",
                "ipAddress",
                "userAgent"
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6
            )
            `,
      generateId("download"),
      backup.id,
      backup.fileName,
      null,
      ipAddress,
      userAgent,
    );

    // ---------------------------------------------
    // RETURN ZIP FILE
    // ---------------------------------------------

    return new NextResponse(file, {
      status: 200,

      headers: {
        "Content-Type": "application/zip",

        "Content-Disposition": `attachment; filename="${backup.fileName}"`,

        "Content-Length": String(file.length),

        "Cache-Control": "no-store, no-cache, must-revalidate",

        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("DATABASE BACKUP DOWNLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to download backup.",
      },
      {
        status: 500,
      },
    );
  }
}
