
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

const MODULE_NAME = "candidate";

const cleanString = (value) => {
    if (value === null || value === undefined) return null;

    const cleaned = String(value).trim();
    return cleaned || null;
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
    if (value && typeof value === "object" && !Array.isArray(value)) {
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

const cleanRows = (value) => {
    return parseArray(value).filter((item) =>
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        Object.values(item).some(
            (value) => String(value ?? "").trim() !== ""
        )
    );
};

const prepareProfessionalData = (body) => {
    const skills = parseArray(body.skills)
        .map((skill) => String(skill).trim())
        .filter(Boolean);

    return {
        appliedDate: cleanString(body.appliedDate),
        applyForPost: cleanString(body.applyForPost),
        totalExperience: cleanString(body.totalExperience),
        salaryBeingDrawn: cleanString(body.salaryBeingDrawn),

        interviewConductedAt: cleanString(body.interviewConductedAt),
        skills,
        referenceName: cleanString(body.referenceName),

        remarks: cleanString(body.remarks),
        previousEmployeeDetails: cleanRows(
            body.previousEmployeeDetails
        ),
        documentDetails: cleanRows(body.documentDetails),
        customFields: parseObject(body.customFields) || {},
    };
};

const findCandidate = async (candidateId) => {
    return prisma.candidate.findFirst({
        where: {
            id: candidateId,
            deletedAt: null,
        },
        select: {
            id: true,
        },
    });
};

// GET: Fetch candidate professional details
export async function GET(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);
        if (accessError) return accessError;

        const { searchParams } = new URL(request.url);
        const candidateId = searchParams.get("candidateId");

        if (!candidateId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Candidate ID is required.",
                },
                { status: 400 }
            );
        }

        const candidate = await findCandidate(candidateId);

        if (!candidate) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Candidate not found.",
                },
                { status: 404 }
            );
        }

        const professionalDetail =
            await prisma.professionalCandidateDetail.findUnique({
                where: { candidateId },
            });

        return NextResponse.json({
            success: true,
            data: professionalDetail,
        });
    } catch (error) {
        console.error("Candidate Professional Detail GET Error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Failed to fetch candidate professional details.",
            },
            { status: 500 }
        );
    }
}

// POST: Create candidate professional details
export async function POST(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);
        if (accessError) return accessError;

        const body = await request.json();
        const candidateId = body.candidateId;

        if (!candidateId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Candidate ID is required.",
                },
                { status: 400 }
            );
        }

        const candidate = await findCandidate(candidateId);

        if (!candidate) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Candidate not found.",
                },
                { status: 404 }
            );
        }

        const existingDetail =
            await prisma.professionalCandidateDetail.findUnique({
                where: { candidateId },
            });

        if (existingDetail) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Professional details already exist for this candidate. Please update the existing record.",
                },
                { status: 409 }
            );
        }

        const professionalDetail =
            await prisma.professionalCandidateDetail.create({
                data: {
                    candidateId,
                    ...prepareProfessionalData(body),
                },
            });

        return NextResponse.json(
            {
                success: true,
                message: "Candidate professional details saved successfully.",
                data: professionalDetail,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Candidate Professional Detail POST Error:", error);

        if (error?.code === "P2002") {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Professional details already exist for this candidate.",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Failed to save candidate professional details.",
            },
            { status: 500 }
        );
    }
}

// PUT: Update candidate professional details
export async function PUT(request) {
    try {
        const accessError = await checkMenuAccess(MODULE_NAME);
        if (accessError) return accessError;

        const body = await request.json();
        const candidateId = body.candidateId;

        if (!candidateId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Candidate ID is required.",
                },
                { status: 400 }
            );
        }

        const candidate = await findCandidate(candidateId);

        if (!candidate) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Candidate not found.",
                },
                { status: 404 }
            );
        }

        const existingDetail =
            await prisma.professionalCandidateDetail.findUnique({
                where: { candidateId },
            });

        if (!existingDetail) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Candidate professional details not found.",
                },
                { status: 404 }
            );
        }

        const professionalDetail =
            await prisma.professionalCandidateDetail.update({
                where: { candidateId },
                data: prepareProfessionalData(body),
            });

        return NextResponse.json({
            success: true,
            message: "Candidate professional details updated successfully.",
            data: professionalDetail,
        });
    } catch (error) {
        console.error("Candidate Professional Detail PUT Error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Failed to update candidate professional details.",
            },
            { status: 500 }
        );
    }
}
