// services/system-log.js

import { prisma } from '@/lib/prisma';

export async function systemLog(
  {
    event,
    userId,
    entityId = null,
    entityType = null,
    description,
    ipAddress = null,
    meta = null,
  },
  tx
) {
  try {
    if (!event || !userId) {
      console.error('[LOG] event and userId are required.');
      return;
    }

    const connection = tx ?? prisma;

    await connection.systemLog.create({
      data: {
        event,
        userId,
        entityId,
        entityType,
        description: description ?? event,
        ipAddress,
        meta: meta ?? undefined,
      },
    });
  } catch (error) {
    console.error('[LOG] Failed to log activity:', error);
  }
}