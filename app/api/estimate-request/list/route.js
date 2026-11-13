import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

/* ==========================================================================
   HELPERS
========================================================================== */

function statusToInt(status) {
    if (typeof status === "number") {
        return status;
    }

    switch (String(status || "").toLowerCase()) {
        case "completed":
            return 1;

        case "cancelled":
            return 2;

        case "processing":
        default:
            return 0;
    }
}

function statusToString(status) {
    if (
        status === "processing" ||
        status === "completed" ||
        status === "cancelled"
    ) {
        return status;
    }

    switch (Number(status)) {
        case 1:
            return "completed";

        case 2:
            return "cancelled";

        default:
            return "processing";
    }
}

function getBaseUrl(request) {
    return (
        process.env.NEXT_PUBLIC_BASE_PATH ||
        request.headers.get("origin") ||
        "http://localhost:3000"
    ).replace(/\/$/, "");
}

function getPublicUrl(request, token) {
    if (!token) {
        return "";
    }

    return `${getBaseUrl(request)}/forms/quote/${token}?styled=1`;
}

/* ==========================================================================
   NORMALIZE FORM
========================================================================== */

function normalizeForm(form, request) {
    if (!form) {
        return null;
    }

    const token =
        form.publicToken ||
        form.token ||
        "";

    let fields = [];

    if (Array.isArray(form.fields)) {
        fields = form.fields;
    } else if (typeof form.fields === "string") {
        try {
            fields = JSON.parse(form.fields);
        } catch {
            fields = [];
        }
    }

    let staff = [];
    let roles = [];

    if (Array.isArray(form.notifyStaffIds)) {
        staff = form.notifyStaffIds;
    } else if (typeof form.notifyStaffIds === "string") {
        try {
            staff = JSON.parse(form.notifyStaffIds);
        } catch {
            staff = [];
        }
    }

    if (Array.isArray(form.notifyRoleIds)) {
        roles = form.notifyRoleIds;
    } else if (typeof form.notifyRoleIds === "string") {
        try {
            roles = JSON.parse(form.notifyRoleIds);
        } catch {
            roles = [];
        }
    }

    return {
        ...form,

        name: form.name || "Untitled Form",

        status: statusToString(form.status),

        fields,

        fieldCount: fields.length,

        publicToken: token,

        token,

        url: getPublicUrl(
            request,
            token
        ),

        formUrl: getPublicUrl(
            request,
            token
        ),

        branding: {
            submitButtonText:
                form.submitButtonText ||
                "Submit",

            buttonBackground:
                form.submitButtonBgColor ||
                "#84c529",

            buttonTextColor:
                form.submitButtonTextColor ||
                "#ffffff",
        },

        submission: {
            action:
                Number(form.submitAction) === 1
                    ? "redirect"
                    : "message",

            successMessage:
                form.successSubmitMessage ||
                "Thank You",

            redirectUrl:
                form.submitRedirectUrl ||
                "",
        },

        notifications: {
            enabled:
                form.notifyRequestSubmitted ??
                true,

            type:
                form.notifyType ||
                "specific_staff",

            staff,

            roles,
        },
    };
}

/* ==========================================================================
   GET
========================================================================== */

export async function GET(request) {
    try {
        const forms =
            await prisma.estimateRequestForm.findMany(
                {
                    orderBy: {
                        createdAt: "desc",
                    },
                }
            );

        return NextResponse.json({
            success: true,

            forms: forms.map(
                (form) =>
                    normalizeForm(
                        form,
                        request
                    )
            ),
        });
    } catch (error) {
        console.error(
            "GET estimateRequestForm ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    "Failed to load forms",

                error:
                    error?.message ||
                    String(error),
            },
            {
                status: 500,
            }
        );
    }
}

/* ==========================================================================
   POST
========================================================================== */

export async function POST(request) {
    try {
        const body =
            await request.json();

        if (
            !body.name ||
            !String(body.name).trim()
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Form name is required",
                },
                {
                    status: 422,
                }
            );
        }

        const name =
            String(body.name).trim();

        const slug =
            body.slug ||
            name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

        const publicToken =
            crypto.randomUUID();

        const form =
            await prisma.estimateRequestForm.create(
                {
                    data: {
                        name,

                        slug,

                        publicToken,

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
                                ?.staff || [],

                        notifyRoleIds:
                            body.notifications
                                ?.roles || [],

                        fields:
                            body.fields || [],
                    },
                }
            );

        return NextResponse.json(
            {
                success: true,

                message:
                    "Form created successfully",

                id: form.id,

                token:
                    form.publicToken,

                url: getPublicUrl(
                    request,
                    form.publicToken
                ),

                form: normalizeForm(
                    form,
                    request
                ),
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(
            "POST estimateRequestForm ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    "Failed to create form",

                error:
                    error?.message ||
                    String(error),

                code:
                    error?.code || null,

                meta:
                    error?.meta || null,
            },
            {
                status: 500,
            }
        );
    }
}

/* ==========================================================================
   PUT
========================================================================== */

export async function PUT(request) {
    try {
        const body =
            await request.json();

        console.log(
            "UPDATE FORM BODY:",
            body
        );

        if (
            body.id === undefined ||
            body.id === null ||
            body.id === ""
        ) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Form ID is required",
                },
                {
                    status: 422,
                }
            );
        }

        const id =
            Number(body.id);

        if (!Number.isInteger(id)) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Invalid form ID",
                },
                {
                    status: 422,
                }
            );
        }

        /* --------------------------------------------------------------
           FIND EXISTING FORM
        -------------------------------------------------------------- */

        const existing =
            await prisma.estimateRequestForm.findUnique(
                {
                    where: {
                        id,
                    },
                }
            );

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Form not found",
                },
                {
                    status: 404,
                }
            );
        }

        /* --------------------------------------------------------------
           UPDATE
        -------------------------------------------------------------- */

        const form =
            await prisma.estimateRequestForm.update(
                {
                    where: {
                        id,
                    },

                    data: {
                        name:
                            body.name !==
                            undefined
                                ? String(
                                      body.name
                                  ).trim()
                                : existing.name,

                        slug:
                            body.slug ||
                            existing.slug,

                        language:
                            body.language ||
                            existing.language,

                        status:
                            body.status !==
                            undefined
                                ? statusToInt(
                                      body.status
                                  )
                                : existing.status,

                        responsible:
                            body.responsible !==
                                undefined &&
                            body.responsible !==
                                null &&
                            body.responsible !==
                                ""
                                ? Number(
                                      body.responsible
                                  )
                                : null,

                        submitButtonText:
                            body.branding
                                ?.submitButtonText ??
                            existing.submitButtonText ??
                            "Submit",

                        submitButtonBgColor:
                            body.branding
                                ?.buttonBackground ??
                            existing.submitButtonBgColor ??
                            "#84c529",

                        submitButtonTextColor:
                            body.branding
                                ?.buttonTextColor ??
                            existing.submitButtonTextColor ??
                            "#ffffff",

                        submitAction:
                            body.submission
                                ?.action ===
                            "redirect"
                                ? 1
                                : 0,

                        successSubmitMessage:
                            body.submission
                                ?.successMessage ??
                            existing.successSubmitMessage ??
                            "Thank You",

                        submitRedirectUrl:
                            body.submission
                                ?.redirectUrl ??
                            null,

                        notifyRequestSubmitted:
                            body.notifications
                                ?.enabled ??
                            existing.notifyRequestSubmitted ??
                            true,

                        notifyType:
                            body.notifications
                                ?.type ??
                            existing.notifyType ??
                            "specific_staff",

                        notifyStaffIds:
                            body.notifications
                                ?.staff ??
                            existing.notifyStaffIds ??
                            [],

                        notifyRoleIds:
                            body.notifications
                                ?.roles ??
                            existing.notifyRoleIds ??
                            [],

                        fields:
                            Array.isArray(
                                body.fields
                            )
                                ? body.fields
                                : [],
                    },
                }
            );

        const url =
            getPublicUrl(
                request,
                form.publicToken
            );

        return NextResponse.json({
            success: true,

            message:
                "Form updated successfully",

            id: form.id,

            token:
                form.publicToken,

            url,

            form: normalizeForm(
                form,
                request
            ),
        });
    } catch (error) {
        console.error(
            "PUT estimateRequestForm ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    "Failed to update form",

                error:
                    error?.message ||
                    String(error),

                code:
                    error?.code || null,

                meta:
                    error?.meta || null,
            },
            {
                status: 500,
            }
        );
    }
}

/* ==========================================================================
   DELETE
========================================================================== */

export async function DELETE(request) {
    try {
        const { searchParams } =
            new URL(request.url);

        const id =
            searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Form ID is required",
                },
                {
                    status: 422,
                }
            );
        }

        const numericId =
            Number(id);

        if (!Number.isInteger(numericId)) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Invalid form ID",
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
                        id: numericId,
                    },
                }
            );

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Form not found",
                },
                {
                    status: 404,
                }
            );
        }

        await prisma.estimateRequestForm.delete(
            {
                where: {
                    id: numericId,
                },
            }
        );

        return NextResponse.json({
            success: true,

            message:
                "Form deleted successfully",

            id: numericId,
        });
    } catch (error) {
        console.error(
            "DELETE estimateRequestForm ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    "Failed to delete form",

                error:
                    error?.message ||
                    String(error),
            },
            {
                status: 500,
            }
        );
    }
}