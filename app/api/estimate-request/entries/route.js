import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // 1. Get all estimate request entries
        const entries = await prisma.estimateRequest.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });

        // 2. Get all estimate request forms
        const forms = await prisma.estimateRequestForm.findMany({
            select: {
                id: true,
                name: true,
                publicToken: true,
            },
        });

        // 3. Create form lookup
        const formMap = new Map();

        forms.forEach((form) => {
            formMap.set(String(form.id), form);
        });

        // 4. Attach form information to entries
        const entriesWithForm = entries.map((entry) => {
            const form = formMap.get(
                String(entry.formId)
            );

            return {
                ...entry,

                formName:
                    form?.name ||
                    "Estimate Request",

                form: form
                    ? {
                          id: form.id,
                          name: form.name,
                          publicToken:
                              form.publicToken,
                      }
                    : null,
            };
        });

        return NextResponse.json({
            success: true,
            entries: entriesWithForm,
        });
    } catch (error) {
        console.error(
            "GET /api/estimate-request/entries error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to load estimate request entries",

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
 * DELETE estimate request submission
 */
export async function DELETE(request) {
    try {
        const body = await request.json();

        const id = body?.id;

        if (!id) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Entry ID is required",
                },
                {
                    status: 400,
                }
            );
        }

        const existingEntry =
            await prisma.estimateRequest.findUnique({
                where: {
                    id,
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
                id,
            },
        });

        return NextResponse.json({
            success: true,
            message:
                "Estimate request deleted successfully",
        });
    } catch (error) {
        console.error(
            "DELETE /api/estimate-request/entries error:",
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