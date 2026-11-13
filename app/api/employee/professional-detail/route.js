
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

const MODULE_NAME = "employee";

const parseDate = (value) => {
    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
};

const parseNumber = (value) => {
    if (value === "" || value === null || value === undefined) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? Math.trunc(number) : null;
};

const parseArray = (value) => {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
};

const parseObject = (value) => {
    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        return value;
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);

            return parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
                ? parsed
                : null;
        } catch {
            return null;
        }
    }

    return null;
};

const cleanString = (value) => {
    if (value === null || value === undefined) return null;

    const cleaned = String(value).trim();

    return cleaned || null;
};

const prepareProfessionalData = (body) => {
    const skills = parseArray(body.skills)
        .map((skill) => String(skill).trim())
        .filter(Boolean);

    const bankDetails = parseObject(body.bankDetails);

    const previousEmployeeDetails = parseArray(
        body.previousEmployeeDetails
    ).filter((item) =>
        Object.values(item || {}).some(
            (value) => String(value ?? "").trim() !== ""
        )
    );

    const documentDetails = parseArray(
        body.documentDetails
    ).filter((item) =>
        Object.values(item || {}).some(
            (value) => String(value ?? "").trim() !== ""
        )
    );

    const customFields = parseObject(body.customFields);

    return {
        designation: cleanString(body.designation),
        department: cleanString(body.department),

        experienceAsOn: parseDate(body.experienceAsOn),
        joinDate: parseDate(body.joinDate),

        jobLocation: cleanString(body.jobLocation),
        jobType: cleanString(body.jobType),
        employmentStatus: cleanString(body.employmentStatus),
        shift: cleanString(body.shift),
        breakTime: cleanString(body.breakTime),

        skills,
        referenceName: cleanString(body.referenceName),

        probationPeriod: parseNumber(body.probationPeriod),
        appraisalApplicable: Boolean(body.appraisalApplicable),
        noticePeriod: parseNumber(body.noticePeriod),

        bankDetails:
            bankDetails &&
            Object.values(bankDetails).some(
                (value) => String(value ?? "").trim() !== ""
            )
                ? bankDetails
                : null,

        remarks: cleanString(body.remarks),
        agreementSigningDate: parseDate(body.agreementSigningDate),
        security: cleanString(body.security),

        previousEmployeeDetails,
        documentDetails,
        customFields,
    };
};

// GET: Fetch professional details for an employee
export async function GET(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);

        if (accessError) return accessError;

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

        const professionalDetail =
            await prisma.professionalDetail.findUnique({
                where: {
                    employeeId,
                },
            });

        return NextResponse.json({
            success: true,
            data: professionalDetail,
        });
    } catch (error) {
        console.error("Professional Detail GET Error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Failed to fetch professional details.",
            },
            { status: 500 }
        );
    }
}

// POST: Create professional details
export async function POST(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);

        if (accessError) return accessError;

        const body = await request.json();

        const employeeId = body.employeeId;

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

        const existingDetail =
            await prisma.professionalDetail.findUnique({
                where: {
                    employeeId,
                },
            });

        if (existingDetail) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Professional details already exist for this employee. Please update the existing record.",
                },
                { status: 409 }
            );
        }

        const professionalData = prepareProfessionalData(body);

        const professionalDetail =
            await prisma.professionalDetail.create({
                data: {
                    employeeId,
                    ...professionalData,
                },
            });

        return NextResponse.json(
            {
                success: true,
                message: "Professional details saved successfully.",
                data: professionalDetail,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Professional Detail POST Error:", error);

        if (error?.code === "P2002") {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Professional details already exist for this employee.",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Failed to save professional details.",
            },
            { status: 500 }
        );
    }
}

// PUT: Update professional details
export async function PUT(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);

        if (accessError) return accessError;

        const body = await request.json();

        const employeeId = body.employeeId;

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

        const existingDetail =
            await prisma.professionalDetail.findUnique({
                where: {
                    employeeId,
                },
            });

        if (!existingDetail) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Professional details not found.",
                },
                { status: 404 }
            );
        }

        const professionalData = prepareProfessionalData(body);

        const professionalDetail =
            await prisma.professionalDetail.update({
                where: {
                    employeeId,
                },
                data: professionalData,
            });

        return NextResponse.json({
            success: true,
            message: "Professional details updated successfully.",
            data: professionalDetail,
        });
    } catch (error) {
        console.error("Professional Detail PUT Error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Failed to update professional details.",
            },
            { status: 500 }
        );
    }
}
