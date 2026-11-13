import { NextResponse } from "next/server";

import {
  getPendingNotifications,
  markNotificationsSynced,
} from "@/lib/notifications";

/**
 * POST /api/notifications/sync
 *
 * Gets pending notifications.
 *
 * The client sends received notification IDs back
 * so we know which notifications were actually consumed.
 */
export async function POST(request) {
  try {
    let body = {};

    try {
      body = await request.json();
    } catch {
      body = {};
    }

    /**
     * Replace with authenticated user ID.
     */
    const userId = null;

    /**
     * Notifications already received by client.
     */
    const receivedIds = Array.isArray(
      body.receivedIds
    )
      ? body.receivedIds
      : [];

    /**
     * Mark previously received notifications
     * as synced.
     */
    if (receivedIds.length > 0) {
      await markNotificationsSynced(
        receivedIds
      );
    }

    /**
     * Get remaining pending notifications.
     */
    const pendingNotifications =
      await getPendingNotifications({
        userId,
      });

    return NextResponse.json({
      success: true,

      synced: receivedIds.length,

      pending:
        pendingNotifications.length,

      notifications:
        pendingNotifications,
    });
  } catch (error) {
    console.error(
      "[NOTIFICATION SYNC ERROR]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to synchronize notifications.",
      },
      {
        status: 500,
      }
    );
  }
}