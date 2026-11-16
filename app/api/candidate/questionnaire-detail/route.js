
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Allowed fields based on Prisma model
const allowedFields = [
  "QuestionCategory",
  "QuestionName",
  "questionnaireID",
  "questionAnswer",
];

// Prepare request data
const prepareData = (body) => {
  const data = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
};

// Validate required questionnaire fields
const validateData = (data, isCreate = false) => {
  const requiredFields = [
    "QuestionCategory",
    "QuestionName",
    "questionnaireID",
    "questionAnswer",
  ];

  for (const field of requiredFields) {
    if (
      (isCreate || Object.prototype.hasOwnProperty.call(data, field)) &&
      (typeof data[field] !== "string" || !data[field].trim())
    ) {
      return `${field} is required and must be a non-empty string.`;
    }
  }

  return null;
};

// GET: Fetch questionnaire details by candidateId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json(
        { success: false, message: "candidateId is required." },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.findFirst({
      where: {
        id: candidateId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, message: "Candidate not found." },
        { status: 404 }
      );
    }

    const questionnaireDetail =
      await prisma.questionnaireCandidateDetail.findFirst({
        where: {
          candidateId,
          deletedAt: null,
        },
      });

    return NextResponse.json({
      success: true,
      data: questionnaireDetail,
    });
  } catch (error) {
    console.error("GET Questionnaire Detail Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch questionnaire details." },
      { status: 500 }
    );
  }
}

// POST: Create questionnaire details
export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json(
        { success: false, message: "candidateId is required." },
        { status: 400 }
      );
    }

    const data = prepareData(body);
    const validationError = validateData(data, true);

    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.findFirst({
      where: {
        id: candidateId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, message: "Candidate not found." },
        { status: 404 }
      );
    }

    const existingDetail =
      await prisma.questionnaireCandidateDetail.findUnique({
        where: { candidateId },
      });

    if (existingDetail && !existingDetail.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Questionnaire details already exist for this candidate.",
        },
        { status: 409 }
      );
    }

    let questionnaireDetail;

    if (existingDetail) {
      // Restore previously soft-deleted record
      questionnaireDetail =
        await prisma.questionnaireCandidateDetail.update({
          where: { candidateId },
          data: {
            ...data,
            deletedAt: null,
          },
        });
    } else {
      questionnaireDetail =
        await prisma.questionnaireCandidateDetail.create({
          data: {
            ...data,
            candidateId,
          },
        });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Questionnaire details saved successfully.",
        data: questionnaireDetail,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Questionnaire Detail Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save questionnaire details.",
      },
      { status: 500 }
    );
  }
}

// PUT: Update questionnaire details
export async function PUT(request) {
  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json(
        { success: false, message: "candidateId is required." },
        { status: 400 }
      );
    }

    const data = prepareData(body);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields provided to update." },
        { status: 400 }
      );
    }

    const validationError = validateData(data);

    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 }
      );
    }

    const existingDetail =
      await prisma.questionnaireCandidateDetail.findFirst({
        where: {
          candidateId,
          deletedAt: null,
        },
      });

    if (!existingDetail) {
      return NextResponse.json(
        { success: false, message: "Questionnaire details not found." },
        { status: 404 }
      );
    }

    const updatedDetail =
      await prisma.questionnaireCandidateDetail.update({
        where: { candidateId },
        data,
      });

    return NextResponse.json({
      success: true,
      message: "Questionnaire details updated successfully.",
      data: updatedDetail,
    });
  } catch (error) {
    console.error("PUT Questionnaire Detail Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update questionnaire details." },
      { status: 500 }
    );
  }
}

// DELETE: Soft-delete questionnaire details
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get("candidateId");

    if (!candidateId) {
      return NextResponse.json(
        { success: false, message: "candidateId is required." },
        { status: 400 }
      );
    }

    const existingDetail =
      await prisma.questionnaireCandidateDetail.findFirst({
        where: {
          candidateId,
          deletedAt: null,
        },
      });

    if (!existingDetail) {
      return NextResponse.json(
        { success: false, message: "Questionnaire details not found." },
        { status: 404 }
      );
    }

    await prisma.questionnaireCandidateDetail.update({
      where: { candidateId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Questionnaire details deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE Questionnaire Detail Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete questionnaire details." },
      { status: 500 }
    );
  }
}
