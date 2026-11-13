
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { randomUUID } from 'crypto';
import path from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';

import { getClientIP } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { systemLog } from '@/services/system-log';
import { AccountProfileSchema } from '@/app/(protected)/user-management/account/forms/account-profile-schema';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';

export const runtime = 'nodejs';

const AVATAR_DIR = path.join(
  process.cwd(),
  'public',
  'media',
  'avatars'
);

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

async function deleteLocalAvatar(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return;

  // Only delete files inside /media/avatars.
  const filename = path.basename(avatarUrl);

  if (!filename || filename !== avatarUrl.split('/').pop()) return;

  const filePath = path.join(AVATAR_DIR, filename);

  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to delete local avatar:', error);
    }
  }
}

export async function POST(request) {
  let newAvatarUrl = null;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized request.' },
        { status: 401 }
      );
    }

    const clientIp = getClientIP(request);
    const formData = await request.formData();

    const parsedData = {
      name: formData.get('name'),
      avatarFile: formData.get('avatarFile'),
      avatarAction: formData.get('avatarAction'),
    };

    const validationResult = AccountProfileSchema.safeParse(parsedData);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: 'Invalid input.',
          errors: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, avatarFile, avatarAction } = validationResult.data;

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, avatar: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { message: 'User not found.' },
        { status: 404 }
      );
    }

    let avatarUrl = currentUser.avatar;

    if (avatarAction === 'remove') {
      avatarUrl = null;
    }

    if (avatarAction === 'save') {
      if (!(avatarFile instanceof File) || avatarFile.size === 0) {
        return NextResponse.json(
          { message: 'Please select an avatar image.' },
          { status: 400 }
        );
      }

      if (avatarFile.size > MAX_AVATAR_SIZE) {
        return NextResponse.json(
          { message: 'Avatar must be 5 MB or smaller.' },
          { status: 400 }
        );
      }

      const extension = ALLOWED_TYPES[avatarFile.type];

      if (!extension) {
        return NextResponse.json(
          { message: 'Only JPG, PNG, WEBP, and GIF images are allowed.' },
          { status: 400 }
        );
      }

      // Create the directory if it does not exist.
      await mkdir(AVATAR_DIR, { recursive: true });

      // Use a random filename to avoid collisions and unsafe filenames.
      const filename = `${randomUUID()}${extension}`;
      const filePath = path.join(AVATAR_DIR, filename);
      const buffer = Buffer.from(await avatarFile.arrayBuffer());

      await writeFile(filePath, buffer);

      newAvatarUrl = `/media/avatars/${filename}`;
      avatarUrl = newAvatarUrl;
    }

    let updatedUser;

    try {
      updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          name,
          avatar: avatarUrl,
        },
      });
    } catch (error) {
      // Remove the newly written file if the database update fails.
      if (newAvatarUrl) {
        await deleteLocalAvatar(newAvatarUrl);
      }
      throw error;
    }

    // Delete the previous local avatar only after the database update succeeds.
    if (
      (avatarAction === 'remove' || avatarAction === 'save') &&
      currentUser.avatar &&
      currentUser.avatar !== avatarUrl
    ) {
      await deleteLocalAvatar(currentUser.avatar);
    }

    try {
      await systemLog({
        event: 'update',
        userId: session.user.id,
        entityId: session.user.id,
        entityType: 'user.account',
        description: 'User account updated.',
        ipAddress: clientIp,
      });
    } catch (error) {
      console.error('Failed to write account system log:', error);
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Account profile update error:', error);

    return NextResponse.json(
      {
        message: 'Unable to update account profile.',
        ...(process.env.NODE_ENV === 'development'
          ? { error: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}