import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const dynamic = 'force-dynamic';

const editableFields = [
  'name',
  'profilePhoto',
  'availability',
  'birthday',
  'gender',
  'address',
  'city',
  'state',
  'country',
  'postalCode',
  'publicProfile',
  'socialLinkedin',
  'socialTwitch',
  'socialX',
  'socialDribbble',
];

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userDetails = await prisma.userDetails.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
      },
      userDetails,
    });
  } catch (error) {
    console.error('GET /api/user-details:', error);

    return NextResponse.json(
      { message: 'Unable to load profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = {};

    for (const field of editableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        data[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "No editable fields provided" },
        { status: 400 },
      );
    }

    const stringFields = editableFields.filter(
      (field) => !["publicProfile", "birthday"].includes(field),
    );

    for (const field of stringFields) {
      if (
        data[field] !== undefined &&
        data[field] !== null &&
        typeof data[field] !== "string"
      ) {
        return NextResponse.json(
          { message: `Invalid value for ${field}` },
          { status: 400 },
        );
      }
    }

    if (
      data.publicProfile !== undefined &&
      typeof data.publicProfile !== "boolean"
    ) {
      return NextResponse.json(
        { message: "Invalid public profile setting" },
        { status: 400 },
      );
    }

    if (data.birthday !== undefined) {
      if (data.birthday === "" || data.birthday === null) {
        data.birthday = null;
      } else {
        const date = new Date(data.birthday);

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            { message: "Invalid birthday" },
            { status: 400 },
          );
        }

        data.birthday = date;
      }
    }

    // Update both tables in a single transaction.
    const userDetails = await prisma.$transaction(async (tx) => {
      // Update User table when name is provided.
      if (Object.prototype.hasOwnProperty.call(data, "name")) {
        await tx.user.update({
          where: { id: user.id },
          data: { name: data.name },
        });
      }

      // Update UserDetails table.
      return tx.userDetails.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...data,
        },
        update: data,
      });
    });

    return NextResponse.json({
      message: "Profile saved successfully",
      userDetails,
    });
  } catch (error) {
    console.error("PUT /api/user-details:", error);

    return NextResponse.json(
      { message: "Unable to save profile" },
      { status: 500 },
    );
  }
}