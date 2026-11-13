
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

const MODULE_NAME = "employee";

// Convert optional string values to null or trimmed strings.
const nullableString = (value) => {
    if (value === undefined || value === null) return null;

    const trimmed = String(value).trim();

    return trimmed === "" ? null : trimmed;
};

// Convert date strings to valid Date objects.
const parseDate = (value, fieldName) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName}.`);
    }

    return date;
};

// Validate JSON object fields.
const parseJsonObject = (value, fieldName) => {
    if (value === undefined || value === null) {
        return {};
    }

    if (
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new Error(`${fieldName} must be a valid JSON object.`);
    }

    return value;
};

// Validate JSON array fields.
const parseJsonArray = (value, fieldName) => {
    if (value === undefined || value === null) {
        return [];
    }

    if (!Array.isArray(value)) {
        throw new Error(`${fieldName} must be a valid JSON array.`);
    }

    return value;
};

// Build Prisma family detail data.
const buildFamilyDetailData = (body) => {
    const noOfDependents = Number(body.noOfDependents ?? 0);

    if (
        !Number.isInteger(noOfDependents) ||
        noOfDependents < 0
    ) {
        throw new Error("Number of dependents must be a non-negative integer.");
    }

    return {
        fatherName: nullableString(body.fatherName),
        fatherDateOfBirth: parseDate(
            body.fatherDateOfBirth,
            "father date of birth"
        ),
        fatherOccupation: nullableString(body.fatherOccupation),

        motherName: nullableString(body.motherName),
        motherDateOfBirth: parseDate(
            body.motherDateOfBirth,
            "mother date of birth"
        ),
        motherOccupation: nullableString(body.motherOccupation),

        spouseName: nullableString(body.spouseName),
        spouseDateOfBirth: parseDate(
            body.spouseDateOfBirth,
            "spouse date of birth"
        ),
        spouseOccupation: nullableString(body.spouseOccupation),

        mobile: nullableString(body.mobile),

        childrenDetails: parseJsonArray(
            body.childrenDetails,
            "Children details"
        ),

        noOfDependents,

        nomineeName: nullableString(body.nomineeName),
        nomineeRelationship: nullableString(
            body.nomineeRelationship
        ),

        importantDates: parseJsonArray(
            body.importantDates,
            "Important dates"
        ),

        customFields: parseJsonObject(
            body.customFields,
            "Custom fields"
        ),
    };
};

// GET: Fetch family details using employeeId.
export async function GET(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);

        if (accessError) {
            return accessError;
        }

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

        const employee = await prisma.employee.findFirst({
            where: {
                id: employeeId,
                isTrashed: false,
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

        const familyDetail =
            await prisma.employeeFamilyDetail.findUnique({
                where: {
                    employeeId,
                },
            });

        return NextResponse.json({
            success: true,
            message: familyDetail
                ? "Family details fetched successfully."
                : "No family details found for this employee.",
            data: familyDetail,
        });
    } catch (error) {
        console.error("GET EMPLOYEE FAMILY DETAILS ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to fetch employee family details.",
            },
            { status: 500 }
        );
    }
}

// POST: Create or update employee family details.
export async function POST(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);

        if (accessError) {
            return accessError;
        }

        const body = await request.json();

        const employeeId = nullableString(body.employeeId);

        if (!employeeId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Employee ID is required.",
                },
                { status: 400 }
            );
        }

        // Check whether employee exists and is not deleted.
        const employee = await prisma.employee.findFirst({
            where: {
                id: employeeId,
                isTrashed: false,
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

        const data = buildFamilyDetailData(body);

        // employeeId is unique in EmployeeFamilyDetail.
        // Upsert prevents duplicate family detail records.
        const familyDetail =
            await prisma.employeeFamilyDetail.upsert({
                where: {
                    employeeId,
                },
                update: {
                    ...data,
                },
                create: {
                    employeeId,
                    ...data,
                },
            });

        return NextResponse.json(
            {
                success: true,
                message: "Employee family details saved successfully.",
                data: familyDetail,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("SAVE EMPLOYEE FAMILY DETAILS ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to save employee family details.",
            },
            {
                status: 500,
            }
        );
    }
}

// PUT: Update existing employee family details.
export async function PUT(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);

        if (accessError) {
            return accessError;
        }

        const body = await request.json();

        const employeeId = nullableString(body.employeeId);

        if (!employeeId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Employee ID is required.",
                },
                { status: 400 }
            );
        }

        // Verify employee exists.
        const employee = await prisma.employee.findFirst({
            where: {
                id: employeeId,
                isTrashed: false,
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

        // Check existing family details.
        const existingFamilyDetail =
            await prisma.employeeFamilyDetail.findUnique({
                where: {
                    employeeId,
                },
            });

        if (!existingFamilyDetail) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Employee family details not found. Please create them first.",
                },
                { status: 404 }
            );
        }

        const data = buildFamilyDetailData(body);

        // Update existing family details.
        const updatedFamilyDetail =
            await prisma.employeeFamilyDetail.update({
                where: {
                    employeeId,
                },
                data,
            });

        return NextResponse.json({
            success: true,
            message: "Employee family details updated successfully.",
            data: updatedFamilyDetail,
        });
    } catch (error) {
        console.error("UPDATE EMPLOYEE FAMILY DETAILS ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Unable to update employee family details.",
            },
            { status: 500 }
        );
    }
}