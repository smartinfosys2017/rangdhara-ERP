import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-user";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(request) {
  try {
    // Verify the logged-in user.
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { message: 'Please select an image using the "file" field.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { message: "Only JPG, PNG, WEBP, and GIF images are allowed." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: "Image must be larger than 0 and no more than 5 MB." },
        { status: 400 }
      );
    }

    // Create a unique filename to avoid overwriting other users' files.
    const extension = ALLOWED_TYPES[file.type];
    const filename = `${user.id}-${randomUUID()}${extension}`;

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "userpic"
    );

    await mkdir(uploadDirectory, { recursive: true });

    const filePath = path.join(uploadDirectory, filename);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await writeFile(filePath, fileBuffer);

    // This URL is stored in the database, not the local filesystem path.
    const profilePhoto = `/uploads/userpic/${filename}`;

    await prisma.userDetails.upsert({
      where: {
        userId: user.id,
      },
      update: {
        profilePhoto,
      },
      create: {
        userId: user.id,
        profilePhoto,
      },
    });

    return NextResponse.json({
      message: "Profile photo uploaded successfully.",
      profilePhoto,
    });
  } catch (error) {
    console.error("Profile photo upload error:", error);

    return NextResponse.json(
      { message: "Unable to upload profile photo." },
      { status: 500 }
    );
  }
}