import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
    try {
        const body = await request.json();

        const token =
            body.token;

        const values =
            body.values || {};

        if (!token) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Form token is required",
                },
                {
                    status: 400,
                }
            );
        }

        const form =
            await prisma.estimateRequestForm.findUnique(
                {
                    where: {
                        publicToken: token,
                    },
                }
            );

        if (!form) {
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

        // Don't allow inactive/cancelled forms
        if (form.status === 4) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This form is no longer available",
                },
                {
                    status: 400,
                }
            );
        }

        const fields =
            Array.isArray(form.fields)
                ? form.fields
                : [];

        // Server-side required validation
        for (const field of fields) {
            if (
                field.type ===
                    "header" ||
                field.type ===
                    "paragraph"
            ) {
                continue;
            }

            if (
                field.required
            ) {
                const value =
                    values[field.name];

                if (
                    value ===
                        undefined ||
                    value ===
                        null ||
                    value === ""
                ) {
                    return NextResponse.json(
                        {
                            success: false,

                            message:
                                `${field.label || field.name} is required`,

                            field:
                                field.name,
                        },
                        {
                            status: 422,
                        }
                    );
                }
            }
        }

        const entry =
            await prisma.estimateRequest.create(
                {
                    data: {
                        formId:
                            form.id,

                        publicToken:
                            form.publicToken,

                        data:
                            values,

                        status: 0,
                    },
                }
            );

        return NextResponse.json(
            {
                success: true,

                id: entry.id,

                message:
                    form.successSubmitMessage ||
                    "Thank You",

                action:
                    form.submitAction,

                redirectUrl:
                    form.submitRedirectUrl,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(
            "POST /api/estimate-request/submit",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Failed to submit form",
            },
            {
                status: 500,
            }
        );
    }
}