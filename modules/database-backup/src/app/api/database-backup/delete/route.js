import { NextResponse } from "next/server";

import {
    getBackupById,
    ensureBackupTables,
} from "@/modules/database-backup/src/lib/database-backup.js";
import { prisma } from "@/lib/prisma";

import fs from "fs/promises";

export const runtime = "nodejs";

export async function DELETE(request) {
    try {
        await ensureBackupTables();

        const url = new URL(request.url);

        const id = url.searchParams.get("id");

        if (!id) {
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

        const backup =
            await getBackupById(id);

        if (!backup) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Backup not found.",
                },
                {
                    status: 404,
                }
            );
        }

        // ---------------------------------------------
        // DELETE PHYSICAL ZIP
        // ---------------------------------------------

        try {
            await fs.unlink(
                backup.filePath
            );
        } catch (error) {
            console.warn(
                "BACKUP FILE DELETE WARNING:",
                error?.message
            );
        }

        // ---------------------------------------------
        // DELETE DATABASE RECORD
        // ---------------------------------------------

        await prisma.$executeRawUnsafe(
            `
            DELETE FROM "DatabaseBackup"
            WHERE "id" = $1
            `,
            id
        );

        return NextResponse.json({
            success: true,
            message:
                "Backup deleted successfully.",
        });
    } catch (error) {
        console.error(
            "DATABASE BACKUP DELETE ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to delete backup.",
            },
            {
                status: 500,
            }
        );
    }
}