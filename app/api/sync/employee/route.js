
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

// =====================================================
// DATABASE CONNECTIONS
// =====================================================

const localDb = new PrismaClient({
    datasources: {
        db: {
            url: process.env.LOCAL_DATABASE_URL,
        },
    },
});

const liveDb = new PrismaClient({
    datasources: {
        db: {
            url: process.env.LIVE_DATABASE_URL,
        },
    },
});

// =====================================================
// EMPLOYEE SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncEmployees({
    sourceDb,
    targetDb,
    sourceName,
    targetName,
}) {
    const employees = await sourceDb.employee.findMany({
        orderBy: {
            updatedAt: "asc",
        },
    });

    let created = 0;
    let updated = 0;
    let deleted = 0;
    let restored = 0;
    let skipped = 0;
    let failed = 0;

    const errors = [];

    for (const employee of employees) {
        try {
            if (!employee.id) {
                throw new Error("Employee ID missing.");
            }

            if (!employee.empcode) {
                throw new Error("Employee code missing.");
            }

            // All scalar fields are returned by findMany().
            // This keeps employee fields, including JSON fields,
            // addresses, profilePic, signature and customFields,
            // synchronized without manually listing every field.

            const existingEmployee =
                await targetDb.employee.findUnique({
                    where: {
                        id: employee.id,
                    },
                });

            // ==========================
            // CREATE
            // ==========================

            if (!existingEmployee) {
                await targetDb.employee.create({
                    data: employee,
                });

                if (employee.isTrashed) {
                    deleted++;
                } else {
                    created++;
                }

                continue;
            }

            // ==========================
            // DATE CHECK
            // ==========================

            const sourceUpdated = new Date(
                employee.updatedAt
            ).getTime();

            const targetUpdated = new Date(
                existingEmployee.updatedAt
            ).getTime();

            if (
                Number.isFinite(sourceUpdated) &&
                Number.isFinite(targetUpdated) &&
                sourceUpdated <= targetUpdated
            ) {
                skipped++;
                continue;
            }

            // ==========================
            // UPDATE DATA
            // ==========================

            const {
                id,
                createdAt,
                ...updateData
            } = employee;

            // ==========================
            // SOFT DELETE
            // ==========================

            if (employee.isTrashed) {
                await targetDb.employee.update({
                    where: {
                        id: employee.id,
                    },
                    data: {
                        isTrashed: true,
                        updatedAt: employee.updatedAt,
                    },
                });

                deleted++;
                continue;
            }

            // ==========================
            // RESTORE
            // ==========================

            if (
                existingEmployee.isTrashed &&
                !employee.isTrashed
            ) {
                await targetDb.employee.update({
                    where: {
                        id: employee.id,
                    },
                    data: {
                        ...updateData,
                        isTrashed: false,
                        updatedAt: employee.updatedAt,
                    },
                });

                restored++;
                continue;
            }

            // ==========================
            // NORMAL UPDATE
            // ==========================

            await targetDb.employee.update({
                where: {
                    id: employee.id,
                },
                data: {
                    ...updateData,
                    isTrashed: false,
                    updatedAt: employee.updatedAt,
                },
            });

            updated++;
        } catch (error) {
            failed++;

            errors.push({
                id: employee?.id || null,
                empcode: employee?.empcode || null,
                employeeName: [
                    employee?.firstName,
                    employee?.middleName,
                    employee?.lastName,
                ]
                    .filter(Boolean)
                    .join(" "),
                source: sourceName,
                target: targetName,
                error: error.message,
            });
        }
    }

    return {
        total: employees.length,
        created,
        updated,
        deleted,
        restored,
        skipped,
        failed,
        errors,
    };
}

// =====================================================
// POST - EMPLOYEE SYNCHRONIZATION
// =====================================================

export async function POST() {
    try {
        // ==========================
        // ENVIRONMENT CHECK
        // ==========================

        if (
            !process.env.LOCAL_DATABASE_URL ||
            !process.env.LIVE_DATABASE_URL
        ) {
            throw new Error(
                "LOCAL_DATABASE_URL or LIVE_DATABASE_URL is missing."
            );
        }

        // ==========================
        // DATABASE CONNECTION CHECK
        // ==========================

        await localDb.$queryRaw`SELECT 1`;
        await liveDb.$queryRaw`SELECT 1`;

        // ==========================
        // BEFORE COUNT
        // ==========================

        const localBefore = {
            employees: await localDb.employee.count(),
        };

        const liveBefore = {
            employees: await liveDb.employee.count(),
        };

        // =====================================================
        // LOCAL → LIVE
        // =====================================================

        const localToLiveEmployees = await syncEmployees({
            sourceDb: localDb,
            targetDb: liveDb,
            sourceName: "LOCAL",
            targetName: "LIVE",
        });

        // =====================================================
        // LIVE → LOCAL
        // =====================================================

        const liveToLocalEmployees = await syncEmployees({
            sourceDb: liveDb,
            targetDb: localDb,
            sourceName: "LIVE",
            targetName: "LOCAL",
        });

        // ==========================
        // AFTER COUNT
        // ==========================

        const localAfter = {
            employees: await localDb.employee.count(),
        };

        const liveAfter = {
            employees: await liveDb.employee.count(),
        };

        // ==========================
        // TOTAL FAILED RECORDS
        // ==========================

        const totalFailed =
            localToLiveEmployees.failed +
            liveToLocalEmployees.failed;

        // ==========================
        // RESPONSE
        // ==========================

        return NextResponse.json({
            success: totalFailed === 0,

            message:
                totalFailed === 0
                    ? "Employee synchronization completed successfully."
                    : "Employee synchronization completed with some errors.",

            equal: {
                employees:
                    localAfter.employees === liveAfter.employees,
            },

            before: {
                local: localBefore,
                live: liveBefore,
            },

            after: {
                local: localAfter,
                live: liveAfter,
            },

            localToLive: {
                employees: localToLiveEmployees,
            },

            liveToLocal: {
                employees: liveToLocalEmployees,
            },

            summary: {
                totalCreated:
                    localToLiveEmployees.created +
                    liveToLocalEmployees.created,

                totalUpdated:
                    localToLiveEmployees.updated +
                    liveToLocalEmployees.updated,

                totalDeleted:
                    localToLiveEmployees.deleted +
                    liveToLocalEmployees.deleted,

                totalRestored:
                    localToLiveEmployees.restored +
                    liveToLocalEmployees.restored,

                totalSkipped:
                    localToLiveEmployees.skipped +
                    liveToLocalEmployees.skipped,

                totalFailed,
            },
        });
    } catch (error) {
        console.error("EMPLOYEE SYNC ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Employee synchronization failed.",
            },
            {
                status: 500,
            }
        );
    }
}
