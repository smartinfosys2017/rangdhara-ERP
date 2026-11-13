import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request,
    { params }
) {
    try {
        const { token } =
            await params;

        const form =
            await prisma.estimateRequestForm.findUnique(
                {
                    where: {
                        publicToken:
                            token,
                    },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        publicToken: true,
                        status: true,
                        language: true,

                        submitButtonText:
                            true,

                        submitButtonBgColor:
                            true,

                        submitButtonTextColor:
                            true,

                        submitAction:
                            true,

                        successSubmitMessage:
                            true,

                        submitRedirectUrl:
                            true,

                        fields: true,
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

        return NextResponse.json({
            success: true,
            form,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                message:
                    "Unable to load form",
            },
            {
                status: 500,
            }
        );
    }
}