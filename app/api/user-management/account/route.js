import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized request' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        UserRole: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Record not found.' },
        { status: 404 }
      );
    }

    // Keep the response compatible with frontend code expecting "role".
    const { UserRole, ...userData } = user;

    return NextResponse.json({
      ...userData,
      role: UserRole,
    });
  } catch (error) {
    console.error('Account API GET error:', error);

    return NextResponse.json(
      {
        message: 'Unable to fetch account details.',
        ...(process.env.NODE_ENV === 'development'
          ? { error: error.message }
          : {}),
      },
      { status: 500 }
    );
  }
}