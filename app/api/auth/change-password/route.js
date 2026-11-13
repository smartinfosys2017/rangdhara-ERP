import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { sendTemplateEmail } from "@/lib/email-template";
import { getChangePasswordApiSchema } from "@/app/(auth)/forms/change-password-schema";

export async function POST(req) {
  try {
    // Parse and validate the request body
    const body = await req.json();

    const parsedData = getChangePasswordApiSchema().safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        {
          message: "Invalid input. Please check your data and try again.",
        },
        { status: 400 },
      );
    }

    const { token, newPassword } = parsedData.data;

    // Validate the token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { message: "Invalid or expired token." },
        { status: 400 },
      );
    }

    // Fetch the user using the token identifier
    const user = await prisma.user.findUnique({
      where: {
        id: verificationToken.identifier,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: {
        id: verificationToken.identifier,
      },
      data: {
        password: hashedPassword,
      },
    });

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: { token },
    });

    // Send password reset success email using email template
    await sendTemplateEmail({
      templateSlug: "password-reset-successful",
      data: {
        user_name: user.name || "",
        email: user.email,
        customer_email: user.email,
      },
    });

    return NextResponse.json(
      {
        message: "Password reset successful.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Change password error:", error);

    return NextResponse.json(
      {
        message: "Password reset failed.",
      },
      { status: 500 },
    );
  }
}