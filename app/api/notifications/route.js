import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "../auth/[...nextauth]/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications
 * Get notifications for the authenticated user from the database.
 */
export async function GET(request) {
  try {
    // Authenticate the active user session on the server
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Extract the authenticated user ID string
    const userId = session.user.id;

    const notifications = await prisma.notification.findMany({
      where: {
        deletedAt: null,
        OR: [
          { userId: userId }, // Personal alerts matching user ID
          { userId: null },   // Global alerts sent to everyone
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("[NOTIFICATIONS GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Failed to get notifications." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create an authenticated user notification.
 */
export async function POST(request) {
  try {
    // Authenticate the active user session on the server
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Extract the verified user ID string from session token context
    const authenticatedUserId = session?.user?.id || null;

    const body = await request.json();
    const {
      module,
      action,
      title,
      message,
      entityId = null,
      entityType = null,
      entityName = null,
      url = null,
    } = body;

    // Validation Guards
    if (!module) {
      return NextResponse.json(
        { success: false, message: "Notification module is required." },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: "Notification action is required." },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: "Notification title and message are required." },
        { status: 400 }
      );
    }

    // Natively write standard record instances to the database using Prisma engine logic
    const notification = await prisma.notification.create({
      data: {
        userId: authenticatedUserId, // Stores the secure authenticated user ID
        module,
        action,
        title,
        message,
        entityId: entityId ? String(entityId) : null,
        entityType,
        entityName,
        url,
        isRead: false,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Notification created successfully.",
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS POST ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create notification.",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Handle read state operations for user notifications.
 */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    /**
     * MARK SINGLE NOTIFICATION AS READ
     */
    if (body.action === "mark-read") {
      if (!body.id) {
        return NextResponse.json(
          { success: false, message: "Notification ID is required." },
          { status: 400 }
        );
      }

      const notification = await prisma.notification.update({
        where: {
          id: String(body.id),
          userId: userId, // Extra security parameter checkpoint
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        notification,
      });
    }

    /**
     * MARK ALL NOTIFICATIONS AS READ
     */
    if (body.action === "mark-all-read") {
      const result = await prisma.notification.updateMany({
        where: {
          userId: userId, // Restricts updates exclusively to this specific account
          deletedAt: null,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        count: result.count,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid notification action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[NOTIFICATIONS PATCH ERROR]", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update notification." },
      { status: 500 }
    );
  }
}