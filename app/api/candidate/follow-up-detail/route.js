
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Allowed fields
const allowedFields = [
  "followupDate",
  "followupResponse",
  "appointmentDate",
  "appointmentResponse",
  "interviewConductedBy",
  "mode",
  "status",
];

// Convert date values safely
const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }

  return date;
};

// Prepare request data
const prepareData = (body) => {
  const data = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      if (field === "followupDate" || field === "appointmentDate") {
        data[field] = parseDate(body[field]);
      } else {
        data[field] = body[field] || null;
      }
    }
  }

  return data;
};

// GET: Fetch follow-up details by candidateId
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

    const followupDetail =
      await prisma.followupCandidateDetail.findFirst({
        where: {
          candidateId,
          deletedAt: null,
        },
      });

    return NextResponse.json({
      success: true,
      data: followupDetail,
    });
  } catch (error) {
    console.error("GET Follow-up Detail Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch follow-up details." },
      { status: 500 }
    );
  }
}

// POST: Create follow-up details
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
      await prisma.followupCandidateDetail.findUnique({
        where: { candidateId },
      });

    if (existingDetail && !existingDetail.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Follow-up details already exist for this candidate.",
        },
        { status: 409 }
      );
    }

    const data = prepareData(body);

    let followupDetail;

    if (existingDetail) {
      // Restore previously soft-deleted record
      followupDetail =
        await prisma.followupCandidateDetail.update({
          where: { candidateId },
          data: {
            ...data,
            deletedAt: null,
          },
        });
    } else {
      followupDetail =
        await prisma.followupCandidateDetail.create({
          data: {
            ...data,
            candidateId,
          },
        });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Follow-up details saved successfully.",
        data: followupDetail,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Follow-up Detail Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to save follow-up details.",
      },
      { status: 500 }
    );
  }
}

// PUT: Update follow-up details
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

    const existingDetail =
      await prisma.followupCandidateDetail.findFirst({
        where: {
          candidateId,
          deletedAt: null,
        },
      });

    if (!existingDetail) {
      return NextResponse.json(
        { success: false, message: "Follow-up details not found." },
        { status: 404 }
      );
    }

    const data = prepareData(body);

    const updatedDetail =
      await prisma.followupCandidateDetail.update({
        where: { candidateId },
        data,
      });

    return NextResponse.json({
      success: true,
      message: "Follow-up details updated successfully.",
      data: updatedDetail,
    });
  } catch (error) {
    console.error("PUT Follow-up Detail Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update follow-up details.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Soft-delete follow-up details
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
      await prisma.followupCandidateDetail.findFirst({
        where: {
          candidateId,
          deletedAt: null,
        },
      });

    if (!existingDetail) {
      return NextResponse.json(
        { success: false, message: "Follow-up details not found." },
        { status: 404 }
      );
    }

    await prisma.followupCandidateDetail.update({
      where: { candidateId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Follow-up details deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE Follow-up Detail Error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete follow-up details." },
      { status: 500 }
    );
  }
}
