import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

/**
 * GET /api/email-templates/:id
 */
export async function GET(request, { params }) {
  const accessError = await checkMenuAccess("email-templates");

  if (accessError) {
    return accessError;
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Template ID is required.",
        },
        { status: 400 },
      );
    }

    const template = await prisma.emailTemplate.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          message: "Email template not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Email Template GET by ID Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load email template.",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/email-templates/:id
 */
export async function PUT(request, { params }) {
  const accessError = await checkMenuAccess("email-templates");

  if (accessError) {
    return accessError;
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Template ID is required.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const {
      name,
      slug,
      subject,
      fromName,
      to,
      cc,
      bcc,
      message,
      plaintext,
      disabled,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Template name and slug are required.",
        },
        { status: 400 },
      );
    }

    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        {
          success: false,
          message: "Email template not found.",
        },
        { status: 404 },
      );
    }

    const templateData = {
      name: String(name).trim(),
      slug: String(slug).trim(),
      subject: String(subject || ""),
      fromName: String(fromName || ""),
      to: String(to || ""),
      cc: String(cc || ""),
      bcc: String(bcc || ""),
      message: String(message || ""),
      plaintext: Boolean(plaintext),
      disabled: Boolean(disabled),
    };

    const template = await prisma.emailTemplate.update({
      where: {
        id: String(id),
      },
      data: templateData,
    });

    return NextResponse.json({
      success: true,
      message: "Email template updated successfully.",
      data: template,
    });
  } catch (error) {
    console.error("Email Template PUT Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update email template.",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/email-templates/:id
 */
export async function DELETE(request, { params }) {
  const accessError = await checkMenuAccess("email-templates");

  if (accessError) {
    return accessError;
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Template ID is required.",
        },
        { status: 400 },
      );
    }

    const existingTemplate = await prisma.emailTemplate.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        {
          success: false,
          message: "Email template not found.",
        },
        { status: 404 },
      );
    }

    await prisma.emailTemplate.delete({
      where: {
        id: String(id),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email template deleted successfully.",
    });
  } catch (error) {
    console.error("Email Template DELETE by ID Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete email template.",
      },
      { status: 500 },
    );
  }
}