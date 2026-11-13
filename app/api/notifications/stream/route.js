import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  /**
   * Replace with authenticated user ID.
   */
  const userId = null;

  const encoder = new TextEncoder();

  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify(data)}\n\n`
            )
          );
        } catch {
          closed = true;
        }
      };

      /**
       * Initial connection.
       */
      send({
        type: "connected",
        timestamp: new Date().toISOString(),
      });

      let lastCheckedAt = new Date();

      /**
       * Check database for new notifications.
       */
      const checkNotifications = async () => {
        if (closed) {
          return;
        }

        try {
          const notifications =
            await prisma.notification.findMany({
              where: {
                deletedAt: null,

                createdAt: {
                  gt: lastCheckedAt,
                },

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

              take: 50,
            });

          if (notifications.length > 0) {
            send({
              type: "notifications",
              notifications,
            });

            /**
             * Move timestamp forward.
             */
            lastCheckedAt =
              notifications[
                notifications.length - 1
              ].createdAt;
          }
        } catch (error) {
          console.error(
            "[NOTIFICATION STREAM ERROR]",
            error
          );
        }
      };

      /**
       * Check every 2 seconds.
       *
       * This provides near real-time notifications
       * without requiring WebSocket infrastructure.
       */
      const interval = setInterval(
        checkNotifications,
        2000
      );

      /**
       * Keep SSE connection alive.
       */
      const heartbeat = setInterval(() => {
        if (closed) {
          return;
        }

        send({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        });
      }, 15000);

      /**
       * Cleanup.
       */
      request.signal.addEventListener(
        "abort",
        () => {
          closed = true;

          clearInterval(interval);
          clearInterval(heartbeat);

          try {
            controller.close();
          } catch {}
        }
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control":
        "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}