import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET single estimate request entry
 *
 * /api/estimate-request/entries/1
 */
export async function GET(request, { params }) {
    try {
        const { id } = await params;

        const entryId = Number(id);

        if (!id || !Number.isInteger(entryId)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid entry ID",
                },
                {
                    status: 400,
                }
            );
        }

        const entry =
            await prisma.estimateRequest.findUnique({
                where: {
                    id: entryId,
                },
            });

        if (!entry) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Estimate request entry not found",
                },
                {
                    status: 404,
                }
            );
        }

        return NextResponse.json({
            success: true,
            entry,
        });
    } catch (error) {
        console.error(
            "GET /api/estimate-request/entries/[id] error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to load estimate request entry",
                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined,
            },
            {
                status: 500,
            }
        );
    }
}

/**
 * DELETE single estimate request entry
 */
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        const entryId = Number(id);

        if (!id || !Number.isInteger(entryId)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid entry ID",
                },
                {
                    status: 400,
                }
            );
        }

        const existingEntry =
            await prisma.estimateRequest.findUnique({
                where: {
                    id: entryId,
                },
            });

        if (!existingEntry) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Estimate request entry not found",
                },
                {
                    status: 404,
                }
            );
        }

        await prisma.estimateRequest.delete({
            where: {
                id: entryId,
            },
        });

        return NextResponse.json({
            success: true,
            message:
                "Estimate request deleted successfully",
        });
    } catch (error) {
        console.error(
            "DELETE /api/estimate-request/entries/[id] error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to delete estimate request",
                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined,
            },
            {
                status: 500,
            }
        );
    }
}