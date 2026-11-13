import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function generateToken() {
    return crypto.randomBytes(16).toString("hex");
}

function statusToInt(status) {
    if (typeof status === "number") {
        return status;
    }

    switch (status) {
        case "completed":
            return 3;

        case "cancelled":
            return 4;

        case "processing":
            return 2;

        case "read":
            return 1;

        case "new":
        default:
            return 0;
    }
}

/**
 * GET
 * Admin form list
 */
export async function GET() {
    try {
        const forms =
            await prisma.estimateRequestForm.findMany({
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    _count: {
                        select: {
                            requests: true,
                        },
                    },
                },
            });

        return NextResponse.json({
            success: true,
            forms,
        });
    } catch (error) {
        console.error(
            "GET /api/estimate-request",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message: "Failed to load forms",
            },
            {
                status: 500,
            }
        );
    }
}


/**
 * POST
 * Create new form
 */
export async function POST(request) {
    try {
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json(
                {
                    message: "Form name is required",
                },
                {
                    status: 422,
                }
            );
        }

        const slug =
            body.slug ||
            body.name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

        let token = generateToken();

        // Make sure token is unique
        while (
            await prisma.estimateRequestForm.findUnique({
                where: {
                    publicToken: token,
                },
            })
        ) {
            token = generateToken();
        }

        const form =
            await prisma.estimateRequestForm.create({
                data: {
                    name: body.name,

                    slug,

                    publicToken: token,

                    language:
                        body.language ||
                        "english",

                    status:
                        statusToInt(
                            body.status
                        ),

                    responsible:
                        body.responsible
                            ? Number(
                                  body.responsible
                              )
                            : null,

                    submitButtonText:
                        body.branding
                            ?.submitButtonText ||
                        "Submit",

                    submitButtonBgColor:
                        body.branding
                            ?.buttonBackground ||
                        "#84c529",

                    submitButtonTextColor:
                        body.branding
                            ?.buttonTextColor ||
                        "#ffffff",

                    submitAction:
                        body.submission
                            ?.action ===
                        "redirect"
                            ? 1
                            : 0,

                    successSubmitMessage:
                        body.submission
                            ?.successMessage ||
                        "Thank You",

                    submitRedirectUrl:
                        body.submission
                            ?.redirectUrl ||
                        null,

                    notifyRequestSubmitted:
                        body.notifications
                            ?.enabled ??
                        true,

                    notifyType:
                        body.notifications
                            ?.type ||
                        "specific_staff",

                    notifyStaffIds:
                        body.notifications
                            ?.staff || null,

                    notifyRoleIds:
                        body.notifications
                            ?.roles || null,

                    fields:
                        body.fields || [],
                },
            });

        const baseUrl =
            process.env.NEXT_PUBLIC_BASE_PATH ||
            request.headers.get("origin") ||
            "http://localhost:3000";

        const url =
            `${baseUrl}/forms/quote/${token}?styled=1`;

        return NextResponse.json(
            {
                success: true,
                message:
                    "Form created successfully",

                id: form.id,

                token,

                url,

                form,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(
            "POST /api/estimate-request",
            error
        );

        if (
            error.code === "P2002"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "A form with this slug already exists.",
                },
                {
                    status: 409,
                }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to create form",
                error:
                    process.env.NODE_ENV ===
                    "development"
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
 * PUT
 * Update existing form
 */
export async function PUT(request) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                {
                    message:
                        "Form ID is required",
                },
                {
                    status: 422,
                }
            );
        }

        const existing =
            await prisma.estimateRequestForm.findUnique(
                {
                    where: {
                        id: Number(body.id),
                    },
                }
            );

        if (!existing) {
            return NextResponse.json(
                {
                    message:
                        "Form not found",
                },
                {
                    status: 404,
                }
            );
        }

        const form =
            await prisma.estimateRequestForm.update(
                {
                    where: {
                        id: Number(body.id),
                    },

                    data: {
                        name:
                            body.name ||
                            existing.name,

                        language:
                            body.language ||
                            existing.language,

                        status:
                            statusToInt(
                                body.status
                            ),

                        responsible:
                            body.responsible
                                ? Number(
                                      body.responsible
                                  )
                                : null,

                        submitButtonText:
                            body.branding
                                ?.submitButtonText ||
                            "Submit",

                        submitButtonBgColor:
                            body.branding
                                ?.buttonBackground ||
                            "#84c529",

                        submitButtonTextColor:
                            body.branding
                                ?.buttonTextColor ||
                            "#ffffff",

                        submitAction:
                            body.submission
                                ?.action ===
                            "redirect"
                                ? 1
                                : 0,

                        successSubmitMessage:
                            body.submission
                                ?.successMessage ||
                            "Thank You",

                        submitRedirectUrl:
                            body.submission
                                ?.redirectUrl ||
                            null,

                        notifyRequestSubmitted:
                            body.notifications
                                ?.enabled ??
                            true,

                        notifyType:
                            body.notifications
                                ?.type ||
                            "specific_staff",

                        notifyStaffIds:
                            body.notifications
                                ?.staff || null,

                        notifyRoleIds:
                            body.notifications
                                ?.roles || null,

                        fields:
                            body.fields || [],
                    },
                }
            );

        const baseUrl =
            process.env.NEXT_PUBLIC_BASE_PATH ||
            request.headers.get("origin") ||
            "http://localhost:3000";

        return NextResponse.json({
            success: true,
            message:
                "Form updated successfully",

            id: form.id,

            token:
                form.publicToken,

            url:
                `${baseUrl}/forms/quote/${form.publicToken}?styled=1`,

            form,
        });
    } catch (error) {
        console.error(
            "PUT /api/estimate-request",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to update form",
            },
            {
                status: 500,
            }
        );
    }
}