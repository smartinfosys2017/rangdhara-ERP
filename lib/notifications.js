import { prisma } from "@/lib/prisma";

/**
 * Create a notification
 */
export async function createNotification({
  userId = null,
  module,
  action,
  title,
  message,
  entityId = null,
  entityType = null,
  entityName = null,
  url = null,
}) {
  if (!module) {
    throw new Error("Notification module is required.");
  }

  if (!action) {
    throw new Error("Notification action is required.");
  }

  if (!title) {
    throw new Error("Notification title is required.");
  }

  if (!message) {
    throw new Error("Notification message is required.");
  }

  const notification = await prisma.notification.create({
    data: {
      userId,

      module,
      action,

      title,
      message,

      entityId,
      entityType,
      entityName,
      url,

      isRead: false,

      syncStatus: "pending",

      lastSyncedAt: null,
      deletedAt: null,
    },
  });

  return notification;
}

/**
 * Get notifications
 */
export async function getNotifications({
  userId = null,
  limit = 50,
} = {}) {
  const notifications =
    await prisma.notification.findMany({
      where: {
        deletedAt: null,

        OR: [
          {
            userId,
          },
          {
            userId: null,
          },
        ],
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });

  return notifications;
}

/**
 * Get pending notifications
 */
export async function getPendingNotifications({
  userId = null,
} = {}) {
  return prisma.notification.findMany({
    where: {
      deletedAt: null,

      syncStatus: "pending",

      OR: [
        {
          userId,
        },
        {
          userId: null,
        },
      ],
    },

    orderBy: {
      createdAt: "asc",
    },
  });
}

/**
 * Mark notifications as synced
 */
export async function markNotificationsSynced(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return {
      count: 0,
    };
  }

  return prisma.notification.updateMany({
    where: {
      id: {
        in: ids,
      },
    },

    data: {
      syncStatus: "synced",
      lastSyncedAt: new Date(),
    },
  });
}