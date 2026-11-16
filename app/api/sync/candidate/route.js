
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
// GENERIC SYNC COUNTERS
// =====================================================

const createCounters = () => ({
    total: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    restored: 0,
    skipped: 0,
    failed: 0,
    errors: [],
});

// =====================================================
// CANDIDATE SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncCandidates({
    sourceDb,
    targetDb,
    sourceName,
    targetName,
}) {
    const candidates = await sourceDb.candidate.findMany({
        include: {
            professionalDetails: true,
        },
        orderBy: {
            updatedAt: "asc",
        },
    });

    const candidateStats = createCounters();
    const professionalStats = createCounters();

    candidateStats.total = candidates.length;

    for (const candidate of candidates) {
        try {
            if (!candidate.id) {
                throw new Error("Candidate ID missing.");
            }

            // Separate relation from candidate scalar fields.
            const {
                professionalDetails,
                ...candidateData
            } = candidate;

            const existingCandidate =
                await targetDb.candidate.findUnique({
                    where: {
                        id: candidate.id,
                    },
                });

            // ==========================
            // CREATE CANDIDATE
            // ==========================

            if (!existingCandidate) {
                await targetDb.candidate.create({
                    data: candidateData,
                });

                if (candidate.deletedAt) {
                    candidateStats.deleted++;
                } else {
                    candidateStats.created++;
                }
            } else {
                // ==========================
                // DATE CHECK
                // ==========================

                const sourceUpdated = new Date(
                    candidate.updatedAt
                ).getTime();

                const targetUpdated = new Date(
                    existingCandidate.updatedAt
                ).getTime();

                if (
                    Number.isFinite(sourceUpdated) &&
                    Number.isFinite(targetUpdated) &&
                    sourceUpdated <= targetUpdated
                ) {
                    candidateStats.skipped++;
                } else {
                    // ==========================
                    // UPDATE DATA
                    // ==========================

                    const {
                        id,
                        createdAt,
                        ...updateData
                    } = candidateData;

                    // ==========================
                    // SOFT DELETE
                    // ==========================

                    if (candidate.deletedAt) {
                        await targetDb.candidate.update({
                            where: {
                                id: candidate.id,
                            },
                            data: updateData,
                        });

                        candidateStats.deleted++;
                    }

                    // ==========================
                    // RESTORE
                    // ==========================

                    else if (existingCandidate.deletedAt) {
                        await targetDb.candidate.update({
                            where: {
                                id: candidate.id,
                            },
                            data: updateData,
                        });

                        candidateStats.restored++;
                    }

                    // ==========================
                    // NORMAL UPDATE
                    // ==========================

                    else {
                        await targetDb.candidate.update({
                            where: {
                                id: candidate.id,
                            },
                            data: updateData,
                        });

                        candidateStats.updated++;
                    }
                }
            }
        } catch (error) {
            candidateStats.failed++;

            candidateStats.errors.push({
                id: candidate?.id || null,
                candidateName: [
                    candidate?.firstName,
                    candidate?.middleName,
                    candidate?.lastName,
                ]
                    .filter(Boolean)
                    .join(" "),
                source: sourceName,
                target: targetName,
                error: error.message,
            });

            // Candidate failed, so its professional details
            // cannot safely be synchronized.
            continue;
        }

        // =================================================
        // PROFESSIONAL CANDIDATE DETAILS SYNC
        // =================================================

        const professional = candidate.professionalDetails;

        // No professional record on source.
        if (!professional) {
            continue;
        }

        professionalStats.total++;

        try {
            if (!professional.candidateId) {
                throw new Error(
                    "Professional candidate detail candidateId missing."
                );
            }

            // ==========================
            // FIND EXISTING DETAIL
            // ==========================

            const existingProfessional =
                await targetDb.professionalCandidateDetail.findUnique({
                    where: {
                        candidateId: professional.candidateId,
                    },
                });

            // ==========================
            // CREATE
            // ==========================

            if (!existingProfessional) {
                await targetDb.professionalCandidateDetail.create({
                    data: professional,
                });

                if (professional.deletedAt) {
                    professionalStats.deleted++;
                } else {
                    professionalStats.created++;
                }

                continue;
            }

            // ==========================
            // DATE CHECK
            // ==========================

            const sourceUpdated = new Date(
                professional.updatedAt
            ).getTime();

            const targetUpdated = new Date(
                existingProfessional.updatedAt
            ).getTime();

            if (
                Number.isFinite(sourceUpdated) &&
                Number.isFinite(targetUpdated) &&
                sourceUpdated <= targetUpdated
            ) {
                professionalStats.skipped++;
                continue;
            }

            // ==========================
            // UPDATE DATA
            // ==========================

            const {
                id,
                candidateId,
                createdAt,
                ...updateData
            } = professional;

            // ==========================
            // SOFT DELETE
            // ==========================

            if (professional.deletedAt) {
                await targetDb.professionalCandidateDetail.update({
                    where: {
                        candidateId: professional.candidateId,
                    },
                    data: updateData,
                });

                professionalStats.deleted++;
                continue;
            }

            // ==========================
            // RESTORE
            // ==========================

            if (existingProfessional.deletedAt) {
                await targetDb.professionalCandidateDetail.update({
                    where: {
                        candidateId: professional.candidateId,
                    },
                    data: updateData,
                });

                professionalStats.restored++;
                continue;
            }

            // ==========================
            // NORMAL UPDATE
            // ==========================

            await targetDb.professionalCandidateDetail.update({
                where: {
                    candidateId: professional.candidateId,
                },
                data: updateData,
            });

            professionalStats.updated++;
        } catch (error) {
            professionalStats.failed++;

            professionalStats.errors.push({
                id: professional?.id || null,
                candidateId: professional?.candidateId || null,
                source: sourceName,
                target: targetName,
                error: error.message,
            });
        }
    }

    return {
        candidates: candidateStats,
        professionalDetails: professionalStats,
    };
}

// =====================================================
// POST - CANDIDATE SYNCHRONIZATION
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
            candidates: await localDb.candidate.count(),
            professionalDetails:
                await localDb.professionalCandidateDetail.count(),
        };

        const liveBefore = {
            candidates: await liveDb.candidate.count(),
            professionalDetails:
                await liveDb.professionalCandidateDetail.count(),
        };

        // =====================================================
        // LOCAL → LIVE
        // =====================================================

        const localToLive = await syncCandidates({
            sourceDb: localDb,
            targetDb: liveDb,
            sourceName: "LOCAL",
            targetName: "LIVE",
        });

        // =====================================================
        // LIVE → LOCAL
        // =====================================================

        const liveToLocal = await syncCandidates({
            sourceDb: liveDb,
            targetDb: localDb,
            sourceName: "LIVE",
            targetName: "LOCAL",
        });

        // ==========================
        // AFTER COUNT
        // ==========================

        const localAfter = {
            candidates: await localDb.candidate.count(),
            professionalDetails:
                await localDb.professionalCandidateDetail.count(),
        };

        const liveAfter = {
            candidates: await liveDb.candidate.count(),
            professionalDetails:
                await liveDb.professionalCandidateDetail.count(),
        };

        // ==========================
        // TOTAL FAILED RECORDS
        // ==========================

        const totalFailed =
            localToLive.candidates.failed +
            liveToLocal.candidates.failed +
            localToLive.professionalDetails.failed +
            liveToLocal.professionalDetails.failed;

        // ==========================
        // TOTAL SUMMARY
        // ==========================

        const getTotal = (key, type) =>
            localToLive[type][key] + liveToLocal[type][key];

        const summary = {
            candidates: {
                totalCreated: getTotal("created", "candidates"),
                totalUpdated: getTotal("updated", "candidates"),
                totalDeleted: getTotal("deleted", "candidates"),
                totalRestored: getTotal("restored", "candidates"),
                totalSkipped: getTotal("skipped", "candidates"),
                totalFailed:
                    localToLive.candidates.failed +
                    liveToLocal.candidates.failed,
            },

            professionalDetails: {
                totalCreated: getTotal("created", "professionalDetails"),
                totalUpdated: getTotal("updated", "professionalDetails"),
                totalDeleted: getTotal("deleted", "professionalDetails"),
                totalRestored: getTotal("restored", "professionalDetails"),
                totalSkipped: getTotal("skipped", "professionalDetails"),
                totalFailed:
                    localToLive.professionalDetails.failed +
                    liveToLocal.professionalDetails.failed,
            },

            totalFailed,
        };

        // ==========================
        // RESPONSE
        // ==========================

        return NextResponse.json({
            success: totalFailed === 0,

            message:
                totalFailed === 0
                    ? "Candidate synchronization completed successfully."
                    : "Candidate synchronization completed with some errors.",

            equal: {
                candidates:
                    localAfter.candidates === liveAfter.candidates,

                professionalDetails:
                    localAfter.professionalDetails ===
                    liveAfter.professionalDetails,
            },

            before: {
                local: localBefore,
                live: liveBefore,
            },

            after: {
                local: localAfter,
                live: liveAfter,
            },

            localToLive,
            liveToLocal,

            summary,
        });
    } catch (error) {
        console.error("CANDIDATE SYNC ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Candidate synchronization failed.",
            },
            {
                status: 500,
            }
        );
    }
}
