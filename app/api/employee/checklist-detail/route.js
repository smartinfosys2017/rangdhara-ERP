
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
|--------------------------------------------------------------------------
| GET - Fetch Employee Checklist Details
|--------------------------------------------------------------------------
*/

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const employeeId = searchParams.get("employeeId");

        if (!employeeId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Employee ID is required.",
                },
                { status: 400 }
            );
        }

        // Check employee exists
        const employee = await prisma.employee.findUnique({
            where: {
                id: employeeId,
            },
            select: {
                id: true,
            },
        });

        if (!employee) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Employee not found.",
                },
                { status: 404 }
            );
        }

        // Fetch saved checklist details
        const checklistDetails = await prisma.checklistDetail.findMany({
            where: {
                employeeId,
                deletedAt: null,
            },
            include: {
                checklist: {
                    select: {
                        id: true,
                        itemName: true,
                        description: true,
                        status: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: checklistDetails,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("GET EMPLOYEE CHECKLIST ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: error?.message || "Failed to fetch employee checklist.",
            },
            { status: 500 }
        );
    }
}

/*
|--------------------------------------------------------------------------
| POST - Save / Update Employee Checklist Details
|--------------------------------------------------------------------------
*/

export async function POST(request) {
    try {
        const body = await request.json();

        const { employeeId, checklistDetails } = body;

        // Validate employee ID
        if (!employeeId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Employee ID is required.",
                },
                { status: 400 }
            );
        }

        // Validate checklist details
        if (!Array.isArray(checklistDetails)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Checklist details must be an array.",
                },
                { status: 400 }
            );
        }

        // Check employee exists
        const employee = await prisma.employee.findUnique({
            where: {
                id: employeeId,
            },
            select: {
                id: true,
            },
        });

        if (!employee) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Employee not found.",
                },
                { status: 404 }
            );
        }

        // Validate checklist data
        const normalizedDetails = checklistDetails.map((item) => ({
            checklistId: String(item.checklistId || "").trim(),
            status: String(item.status || "PENDING").toUpperCase().trim(),
            comment: item.comment
                ? String(item.comment).trim()
                : null,
        }));

        for (const item of normalizedDetails) {
            if (!item.checklistId) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Checklist item ID is required.",
                    },
                    { status: 400 }
                );
            }

            if (!["PENDING", "CHECKED"].includes(item.status)) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Invalid checklist status for item ${item.checklistId}.`,
                    },
                    { status: 400 }
                );
            }
        }

        // Prevent duplicate checklist IDs in the same request
        const checklistIds = normalizedDetails.map(
            (item) => item.checklistId
        );

        if (new Set(checklistIds).size !== checklistIds.length) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Duplicate checklist items are not allowed.",
                },
                { status: 400 }
            );
        }

        // Verify all checklist master items exist and are active
        const validChecklistItems = await prisma.checklistItem.findMany({
            where: {
                id: {
                    in: checklistIds,
                },
                status: true,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        const validChecklistIds = new Set(
            validChecklistItems.map((item) => item.id)
        );

        const invalidChecklistIds = checklistIds.filter(
            (id) => !validChecklistIds.has(id)
        );

        if (invalidChecklistIds.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "One or more checklist items are invalid or inactive.",
                    invalidChecklistIds,
                },
                { status: 400 }
            );
        }

        // Save or update employee checklist details
        const savedDetails = await prisma.$transaction(
            normalizedDetails.map((item) =>
                prisma.checklistDetail.upsert({
                    where: {
                        employeeId_checklistId: {
                            employeeId,
                            checklistId: item.checklistId,
                        },
                    },
                    update: {
                        status: item.status,
                        comment: item.comment,
                        deletedAt: null,
                    },
                    create: {
                        employeeId,
                        checklistId: item.checklistId,
                        status: item.status,
                        comment: item.comment,
                    },
                })
            )
        );

        return NextResponse.json(
            {
                success: true,
                message: "Employee checklist saved successfully.",
                data: savedDetails,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("SAVE EMPLOYEE CHECKLIST ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: error?.message || "Failed to save employee checklist.",
            },
            { status: 500 }
        );
    }
}
