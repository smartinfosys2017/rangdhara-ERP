import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import {
    ensureBackupTables,
} from "@/modules/database-backup/src/lib/database-backup.js";

export const runtime = "nodejs";

export async function GET(request) {
    try {
        await ensureBackupTables();

        const url = new URL(request.url);

        const backupId =
            url.searchParams.get(
                "backupId"
            );

        if (!backupId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Backup ID is required.",
                },
                {
                    status: 400,
                }
            );
        }

        const history =
            await prisma.$queryRawUnsafe(
                `
                SELECT
                    "id",
                    "backupId",
                    "fileName",
                    "downloadedBy",
                    "ipAddress",
                    "userAgent",
                    "downloadedAt"
                FROM "DatabaseBackupDownload"
                WHERE "backupId" = $1
                ORDER BY "downloadedAt" DESC
                `,
                backupId
            );

        return NextResponse.json({
            success: true,
            history,
        });
    } catch (error) {
        console.error(
            "DATABASE BACKUP DOWNLOAD HISTORY ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to load download history.",
            },
            {
                status: 500,
            }
        );
    }
}