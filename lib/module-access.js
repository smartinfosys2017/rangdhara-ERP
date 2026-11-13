// lib/module-access.js

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function isMenuActiveBySlug(slug) {
    if (!slug) {
        return false;
    }
    const result = await prisma.$queryRawUnsafe(
        ` SELECT "status" FROM public."Menu" WHERE LOWER("slug") = LOWER($1) LIMIT 1`, slug
    );

    return (result.length > 0 && result[0].status === true);
}
export async function checkMenuAccess(slug) {
    const active = await isMenuActiveBySlug(slug);
    if (!active) {
        return NextResponse.json(
            {
                success: false,
                message: "This functionality is currently inactive.",
            },
            { status: 403, }
        );
    }
    return null;
}