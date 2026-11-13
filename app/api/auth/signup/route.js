import crypto from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import { sendTemplateEmail } from "@/lib/email-template";
import { getSignupSchema } from "@/app/(auth)/forms/signup-schema";
import { UserStatus } from "@/app/models/user";

// =====================================================
// SEND VERIFICATION EMAIL
// =====================================================

async function sendVerificationEmail(user) {
  // Generate secure verification token
  const token = crypto.randomBytes(32).toString("hex");

  // Store verification token
  await prisma.verificationToken.create({
    data: {
      identifier: String(user.id),
      token,
      expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
    },
  });

  // Create verification URL
  const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  // Send email using Email Template
  await sendTemplateEmail({
    templateSlug: "signup",
    data: {
      user_name: user.name || "",
      customer_email: user.email,
      email: user.email,
      verification_link: verificationUrl,
    },
  });
}

// =====================================================
// POST
// =====================================================

export async function POST(req) {
  try {
    // ==========================================
    // RECAPTCHA
    // ==========================================

    const recaptchaToken = req.headers.get("x-recaptcha-token");

    if (!recaptchaToken) {
      return NextResponse.json(
        {
          message: "reCAPTCHA verification required",
        },
        { status: 400 },
      );
    }

    const isValidToken = await verifyRecaptchaToken(recaptchaToken);

    if (!isValidToken) {
      return NextResponse.json(
        {
          message: "reCAPTCHA verification failed",
        },
        { status: 400 },
      );
    }

    // ==========================================
    // REQUEST BODY
    // ==========================================

    const body = await req.json();

    // ==========================================
    // VALIDATION
    // ==========================================

    const result = getSignupSchema().safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Invalid input. Please check your data and try again.",
        },
        { status: 400 },
      );
    }

    const { email, password, name } = result.data;

    // ==========================================
    // FIND EXISTING USER
    // ==========================================

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        role: true,
      },
    });

    // ==========================================
    // EXISTING USER
    // ==========================================

    if (existingUser) {
      // ------------------------------------------
      // INACTIVE USER
      // ------------------------------------------

      if (existingUser.status === UserStatus.INACTIVE) {
        // Remove old verification tokens
        await prisma.verificationToken.deleteMany({
          where: {
            identifier: String(existingUser.id),
          },
        });

        // Send new verification email
        await sendVerificationEmail(existingUser);

        return NextResponse.json(
          {
            message: "Verification email resent. Please check your email.",
          },
          { status: 200 },
        );
      }

      // ------------------------------------------
      // ACTIVE USER
      // ------------------------------------------

      return NextResponse.json(
        {
          message: "Email is already registered.",
        },
        { status: 409 },
      );
    }

    // ==========================================
    // DEFAULT ROLE
    // ==========================================

    const defaultRole = await prisma.userRole.findFirst({
      where: {
        isDefault: true,
      },
    });

    if (!defaultRole) {
      throw new Error("Default role not found. Unable to create a new user.");
    }

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await prisma.user.create({
      data: {
        email,
        password,
        name,
        status: UserStatus.INACTIVE,
        roleId: defaultRole.id,
      },
      include: {
        role: true,
      },
    });

    // ==========================================
    // SEND VERIFICATION EMAIL
    // ==========================================

    await sendVerificationEmail(user);

    // ==========================================
    // SUCCESS
    // ==========================================

    return NextResponse.json(
      {
        message:
          "Registration successful. Check your email to verify your account.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("================ SIGNUP CRASH LOG ================");

    console.error(error);

    console.error("==================================================");

    return NextResponse.json(
      {
        message: "Registration failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}