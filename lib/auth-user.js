
import { getServerSession } from "next-auth";
import authOptions from "@/app/api/auth/[...nextauth]/auth-options";
import prisma from "@/lib/prisma";

export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
    },
  });
}