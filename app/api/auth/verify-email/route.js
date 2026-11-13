import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendTemplateEmail } from "@/lib/email-template";
import { UserStatus } from "@/app/models/user";

export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { message: "Token is required." },
        { status: 400 },
      );
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { message: "Invalid verification token." },
        { status: 400 },
      );
    }

    // Check token expiry
    if (verificationToken.expires < new Date()) {
      return NextResponse.json(
        { message: "Verification token has expired." },
        { status: 400 },
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        id: verificationToken.identifier,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // Already active
    if (user.status === UserStatus.ACTIVE) {
      return NextResponse.json(
        { message: "Account is already activated." },
        { status: 200 },
      );
    }

    // Activate user
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    // Delete used verification token
    await prisma.verificationToken.delete({
      where: {
        token,
      },
    });

    // Send welcome email ONLY after successful activation
    await sendTemplateEmail({
      templateSlug: "welcome-mail",
      data: {
        user_name: user.name || "",
        email: user.email,
        customer_email: user.email,
      },
    });

    return NextResponse.json(
      {
        message: "Email verified successfully. Welcome email sent.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Email verification error:", error);

    return NextResponse.json(
      {
        message: "Email verification failed.",
      },
      { status: 500 },
    );
  }
}