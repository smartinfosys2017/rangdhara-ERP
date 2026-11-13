import { NextResponse } from "next/server";

import {
    createBackupData,
    createBackupZip,
    generateBackupFileName,
    generateId,
    getBackups,
    BACKUP_STORAGE_PATH,
    ensureBackupTables,
    serializeForJson,
} from "../../../lib/database-backup";

import { prisma } from "@/lib/prisma";

import path from "path";
import fs from "fs/promises";

export const runtime = "nodejs";

// =====================================================
// GET BACKUP LIST
// =====================================================

export async function GET() {
    try {
        await ensureBackupTables();

        const backups = await getBackups();

        return NextResponse.json({
            success: true,
            backups: serializeForJson(backups),
        });
    } catch (error) {
        console.error(
            "DATABASE BACKUP LIST ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to load database backups.",
            },
            {
                status: 500,
            }
        );
    }
}

// =====================================================
// CREATE BACKUP
// =====================================================

export async function POST() {
    let backupId = null;
    let zipPath = null;

    try {
        await ensureBackupTables();

        // ---------------------------------------------
        // CREATE STORAGE DIRECTORY
        // ---------------------------------------------

        await fs.mkdir(
            BACKUP_STORAGE_PATH,
            {
                recursive: true,
            }
        );

        // ---------------------------------------------
        // CREATE BACKUP DATA
        // ---------------------------------------------

        const backupData =
            await createBackupData();

        // ---------------------------------------------
        // FILE NAME
        // ---------------------------------------------

        const fileName =
            generateBackupFileName();

        zipPath = path.join(
            BACKUP_STORAGE_PATH,
            fileName
        );

        // ---------------------------------------------
        // CREATE ZIP
        // ---------------------------------------------

        const fileSize =
            await createBackupZip(
                backupData,
                zipPath
            );

        // ---------------------------------------------
        // CREATE DB RECORD
        // ---------------------------------------------

        backupId = generateId();

        await prisma.$executeRawUnsafe(
            `
            INSERT INTO "DatabaseBackup"
            (
                "id",
                "fileName",
                "filePath",
                "fileSize",
                "status"
            )
            VALUES
            ($1, $2, $3, $4, $5)
            `,
            backupId,
            fileName,
            zipPath,
            BigInt(fileSize),
            "completed"
        );

        return NextResponse.json({
            success: true,

            message:
                "Database backup created successfully.",

            backup: {
                id: backupId,
                fileName,
                filePath: zipPath,
                fileSize,
                tableCount:
                    backupData.tableCount,
                rowCount:
                    backupData.rowCount,
                createdAt:
                    backupData.createdAt,
            },
        });
    } catch (error) {
        console.error(
            "DATABASE BACKUP CREATE ERROR:",
            error
        );

        // ---------------------------------------------
        // CLEANUP FAILED ZIP
        // ---------------------------------------------

        if (zipPath) {
            try {
                await fs.unlink(zipPath);
            } catch {}
        }

        // ---------------------------------------------
        // FAILED DB RECORD
        // ---------------------------------------------

        if (backupId) {
            try {
                await prisma.$executeRawUnsafe(
                    `
                    UPDATE "DatabaseBackup"
                    SET
                        "status" = 'failed',
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "id" = $1
                    `,
                    backupId
                );
            } catch {}
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to create database backup.",
            },
            {
                status: 500,
            }
        );
    }
}