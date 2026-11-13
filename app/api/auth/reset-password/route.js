import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { sendTemplateEmail } from "@/lib/email-template";

export async function POST(req) {
  try {
    // ==========================================
    // RECAPTCHA
    // ==========================================

    const recaptchaToken = req.headers.get("x-recaptcha-token");

    if (!recaptchaToken) {
      return NextResponse.json(
        {
          message: "Please complete the reCAPTCHA verification.",
        },
        { status: 400 },
      );
    }

    const isValidToken = await verifyRecaptchaToken(recaptchaToken);

    if (!isValidToken) {
      return NextResponse.json(
        {
          message: "reCAPTCHA verification failed. Please try again.",
        },
        { status: 400 },
      );
    }

    // ==========================================
    // GET EMAIL
    // ==========================================

    const { email } = await req.json();

    if (!email || !String(email).trim()) {
      return NextResponse.json(
        {
          message: "Email address is required.",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // ==========================================
    // FIND USER
    // ==========================================

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Don't reveal whether the email exists
    if (!user) {
      return NextResponse.json(
        {
          message:
            "If an account with that email exists, a password reset link has been sent11.1",
        },
        { status: 200 },
      );
    }

    // ==========================================
    // GENERATE RESET TOKEN
    // ==========================================

    const token = crypto.randomBytes(32).toString("hex");

    // ==========================================
    // STORE TOKEN
    // ==========================================

    await prisma.verificationToken.create({
      data: {
        // Your VerificationToken identifier
        // stores the user ID.
        identifier: String(user.id),

        token,

        expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
      },
    });

    // ==========================================
    // RESET URL
    // ==========================================

    const resetUrl = `${process.env.NEXTAUTH_URL}/change-password?token=${token}`;

    // ==========================================
    // SEND EMAIL TEMPLATE
    // ==========================================

    await sendTemplateEmail({
      templateSlug: "reset-password",
      data: {
        user_name: user.name || "",
        email: user.email,
        customer_email: user.email,
        reset_link: resetUrl,
      },
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return NextResponse.json(
      {
        message:
          "If an account with that email exists, a password reset link has been sent2.222",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Password reset error:", err);

    return NextResponse.json(
      {
        message: "Failed to process request.",
      },
      { status: 500 },
    );
  }
}