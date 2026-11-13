import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";

export async function GET() {
  const accessError = await checkMenuAccess("email-templates");

  if (accessError) {
    return accessError;
  }

  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Email Template GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load email templates.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  const accessError = await checkMenuAccess("email-templates");

  if (accessError) {
    return accessError;
  }

  try {
    const body = await request.json();

    const {
      id,
      slug,
      name,
      subject,
      fromName,
      to,
      cc,
      bcc,
      message,
      plaintext,
      disabled,
    } = body;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Template name is required.",
        },
        { status: 400 },
      );
    }

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Template slug is required.",
        },
        { status: 400 },
      );
    }

    let template;

    if (id) {
      template = await prisma.emailTemplate.update({
        where: {
          id: String(id),
        },

        data: {
          slug,
          name,
          subject: subject || "",
          fromName: fromName || "",
          to: to || "",
          cc: cc || "",
          bcc: bcc || "",
          message: message || "",
          plaintext: Boolean(plaintext),
          disabled: Boolean(disabled),
        },
      });
    } else {
      template = await prisma.emailTemplate.create({
        data: {
          slug,
          name,
          subject: subject || "",
          fromName: fromName || "",
          to: to || "",
          cc: cc || "",
          bcc: bcc || "",
          message: message || "",
          plaintext: Boolean(plaintext),
          disabled: Boolean(disabled),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email template saved successfully.",
      data: template,
    });
  } catch (error) {
    console.error("Email Template POST Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save email template.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  const accessError = await checkMenuAccess("email-templates");

  if (accessError) {
    return accessError;
  }

  try {
    const body = await request.json();

    let ids = [];

    // Support single ID
    if (body?.id) {
      ids.push(String(body.id));
    }

    // Support multiple IDs
    if (Array.isArray(body?.ids)) {
      ids = [...ids, ...body.ids.map((id) => String(id))];
    }

    // Remove duplicate IDs
    ids = [...new Set(ids)].filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select at least one template.",
        },
        { status: 400 },
      );
    }

    const result = await prisma.emailTemplate.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No email templates found to delete.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        result.count === 1
          ? "Email template deleted successfully."
          : `${result.count} email templates deleted successfully.`,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Email Template DELETE Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete email templates.",
      },
      { status: 500 },
    );
  }
}