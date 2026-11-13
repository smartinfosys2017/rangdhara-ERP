import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendTestEmail, sendEmail } from "@/lib/sendemail";

export const runtime = "nodejs";

/* Setting helper */

async function saveSetting(key, value) {
  await prisma.setting.upsert({
    where: {
      key,
    },

    update: {
      value: String(value ?? ""),
    },

    create: {
      group: "email",
      key,
      value: String(value ?? ""),
    },
  });
}

/*  GET */

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        group: "email",
      },
    });

    const data = {};

    settings.forEach((setting) => {
      data[setting.key] = setting.value || "";
    });

    /* Email Queue*/

    const queue = await prisma.emailQueue.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 100,

      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,

      data,

      queue,
    });
  } catch (error) {
    console.error("EMAIL SETTINGS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to load email settings",

        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}

/* POST */

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let body = {};
    let formData = null;

    if (contentType.includes("multipart/form-data")) {
      formData = await request.formData();

      body = {
        action: formData.get("action"),
        recipients: formData.get("recipients"),
        subject: formData.get("subject"),
        message: formData.get("message"),
      };
    } else {
      body = await request.json();
    }

    /* TEST EMAIL */

    if (body.action === "test-email") {
      try {
        const testEmail = String(body.test_email || "").trim();

        if (!testEmail) {
          return NextResponse.json(
            {
              success: false,
              message: "Test email address is required.",
            },
            {
              status: 400,
            },
          );
        }

        const result = await sendTestEmail(testEmail);

        return NextResponse.json({
          success: true,
          message: "Test email sent successfully.",
          data: result,
        });
      } catch (error) {
        console.error("TEST EMAIL ERROR:", error);

        return NextResponse.json(
          {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to send test email.",
          },
          {
            status: 500,
          },
        );
      }
    }
    /* BULK EMAIL */

    if (body.action === "bulk-email") {
      let { recipients, subject, message } = body;

      /**
       * =====================================================
       * RECIPIENTS
       * =====================================================
       */

      if (typeof recipients === "string") {
        try {
          recipients = JSON.parse(recipients);
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              message: "Invalid recipients format.",
            },
            {
              status: 400,
            },
          );
        }
      }

      /**
       * =====================================================
       * ATTACHMENTS
       * =====================================================
       *
       * Attachments come from FormData:
       *
       * attachments[]
       *
       * Convert each uploaded File into a Buffer
       * that Nodemailer can send.
       */

      const uploadedAttachments = [];

      if (formData) {
        const files = formData.getAll("attachments");

        for (const file of files) {
          if (
            file &&
            typeof file === "object" &&
            typeof file.arrayBuffer === "function"
          ) {
            const buffer = Buffer.from(await file.arrayBuffer());

            uploadedAttachments.push({
              filename: file.name,
              content: buffer,
              contentType: file.type || undefined,
            });
          }
        }
      }

      /**
       * =====================================================
       * VALIDATION
       * =====================================================
       */

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "At least one recipient is required.",
          },
          {
            status: 400,
          },
        );
      }

      if (!subject || !String(subject).trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Email subject is required.",
          },
          {
            status: 400,
          },
        );
      }

      if (!message || !String(message).trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Email message is required.",
          },
          {
            status: 400,
          },
        );
      }

      /**
       * =====================================================
       * CLEAN RECIPIENTS
       * =====================================================
       */

      const cleanedRecipients = [
        ...new Set(
          recipients
            .map((recipient) =>
              String(recipient || "")
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean),
        ),
      ];

      /**
       * =====================================================
       * EMAIL VALIDATION
       * =====================================================
       */

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const invalidRecipients = cleanedRecipients.filter(
        (recipient) => !emailRegex.test(recipient),
      );

      if (invalidRecipients.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid email address found.",
            invalidRecipients,
          },
          {
            status: 400,
          },
        );
      }

      /**
       * =====================================================
       * SEND BULK EMAIL
       * =====================================================
       */

      let sentCount = 0;
      let failedCount = 0;

      const failedRecipients = [];

      if (uploadedAttachments.length > 0) {
        console.log(
          "Attachment Files:",
          uploadedAttachments.map((attachment) => ({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.content.length,
          })),
        );
      }

      /**
       * =====================================================
       * SEND TO EACH RECIPIENT
       * =====================================================
       */

      for (const recipient of cleanedRecipients) {
        try {
          await sendEmail({
            to: recipient,

            subject: String(subject).trim(),

            text: String(message)
              .replace(/<[^>]*>/g, "")
              .trim(),

            html: String(message),

            attachments: uploadedAttachments,
          });

          sentCount++;
        } catch (sendError) {
          failedCount++;

          const errorMessage =
            sendError instanceof Error ? sendError.message : String(sendError);

          failedRecipients.push({
            email: recipient,
            error: errorMessage,
          });

          console.error(`BULK EMAIL FAILED: ${recipient}`, sendError);
        }
      }

      if (sentCount === 0) {
        return NextResponse.json(
          {
            success: false,

            message: "Failed to send bulk email.",

            total: cleanedRecipients.length,

            sent: sentCount,

            failed: failedCount,

            failedRecipients,

            attachments: uploadedAttachments.map(
              (attachment) => attachment.filename,
            ),
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        success: true,

        message:
          failedCount > 0
            ? "Bulk email completed with some failures."
            : "Bulk email sent successfully.",

        total: cleanedRecipients.length,

        sent: sentCount,

        failed: failedCount,

        failedRecipients,

        attachments: uploadedAttachments.map(
          (attachment) => attachment.filename,
        ),
      });
    }
    if (body.action === "send-queue") {
      const { queueIds } = body;

      if (!Array.isArray(queueIds) || queueIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select at least one queued email.",
          },
          { status: 400 },
        );
      }

      let sentCount = 0;
      let failedCount = 0;
      const failedEmails = [];

      for (const queueId of queueIds) {
        try {
          const queue = await prisma.emailQueue.findUnique({
            where: {
              id: String(queueId),
            },
          });

          if (!queue) {
            failedCount++;

            failedEmails.push({
              id: queueId,
              error: "Queue email not found.",
            });

            continue;
          }

          if (queue.status === "sent") {
            continue;
          }

          await prisma.emailQueue.update({
            where: {
              id: String(queueId),
            },
            data: {
              status: "sending",
            },
          });

          try {
            await sendEmail({
              to: queue.to,
              subject: queue.subject,
              text: String(queue.body || "").replace(/<[^>]*>/g, ""),
              html: queue.body || "",
              queueId: queue.id,
              createQueue: false,
            });

            sentCount++;
          } catch (sendError) {
            await prisma.emailQueue.update({
              where: {
                id: String(queueId),
              },
              data: {
                status: "failed",
              },
            });

            failedCount++;

            failedEmails.push({
              id: queueId,
              email: queue.to,
              error:
                sendError instanceof Error
                  ? sendError.message
                  : String(sendError),
            });
          }
        } catch (error) {
          failedCount++;

          failedEmails.push({
            id: queueId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return NextResponse.json({
        success: sentCount > 0,
        message:
          failedCount > 0
            ? "Queue email sending completed with some failures."
            : "Queued emails sent successfully.",
        total: queueIds.length,
        sent: sentCount,
        failed: failedCount,
        failedEmails,
      });
    }

    if (body.action === "delete-queue") {
      const { queueIds } = body;

      if (!Array.isArray(queueIds) || queueIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Please select at least one email.",
          },
          { status: 400 },
        );
      }

      try {
        const ids = queueIds.map((id) => String(id));

        const deleted = await prisma.emailQueue.deleteMany({
          where: {
            id: {
              in: ids,
            },
          },
        });

        return NextResponse.json({
          success: true,
          message:
            deleted.count === 1
              ? "Queued email deleted successfully."
              : `${deleted.count} queued emails deleted successfully.`,
          deletedCount: deleted.count,
        });
      } catch (error) {
        console.error("Delete Queue Error:", error);

        return NextResponse.json(
          {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Failed to delete queued emails.",
          },
          { status: 500 },
        );
      }
    }
    /* SMTP SETTINGS */

    if (body.mailEngine !== undefined) {
      await saveSetting("mail_engine", body.mailEngine);
    }

    if (body.emailProtocol !== undefined) {
      await saveSetting("email_protocol", body.emailProtocol);
    }

    if (body.emailEncryption !== undefined) {
      await saveSetting("email_encryption", body.emailEncryption);
    }

    if (body.smtpHost !== undefined) {
      await saveSetting("smtp_host", body.smtpHost);
    }

    if (body.smtpPort !== undefined) {
      await saveSetting("smtp_port", body.smtpPort);
    }

    if (body.email !== undefined) {
      await saveSetting("email", body.email);
    }

    if (body.smtpUsername !== undefined) {
      await saveSetting("smtp_username", body.smtpUsername);
    }

    /*
     * Only update SMTP password when it is provided.
     *
     * This prevents an empty password from overwriting
     * the existing password when the frontend does not
     * send the password field.
     */
    if (body.smtpPassword !== undefined && body.smtpPassword !== "") {
      await saveSetting("smtp_password", body.smtpPassword);
    }

    if (body.emailCharset !== undefined) {
      await saveSetting("email_charset", body.emailCharset);
    }

    if (body.bccAllEmails !== undefined) {
      await saveSetting("bcc_all_emails", body.bccAllEmails);
    }

    if (body.emailSignature !== undefined) {
      await saveSetting("email_signature", body.emailSignature);
    }

    if (body.predefinedHeader !== undefined) {
      await saveSetting("predefined_header", body.predefinedHeader);
    }

    if (body.predefinedFooter !== undefined) {
      await saveSetting("predefined_footer", body.predefinedFooter);
    }

    /* EMAIL QUEUE SETTINGS */

    if (body.enableEmailQueue !== undefined) {
      await saveSetting(
        "enable_email_queue",
        body.enableEmailQueue ? "1" : "0",
      );
    }

    if (body.excludeAttachments !== undefined) {
      await saveSetting(
        "exclude_attachments",
        body.excludeAttachments ? "1" : "0",
      );
    }

    await saveSetting(
      "exclude_attachments",
      body.excludeAttachments ? "1" : "0",
    );

    return NextResponse.json({
      success: true,

      message: "Email settings saved successfully.",
    });
  } catch (error) {
    console.error("EMAIL SETTINGS POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,

        message: "Failed to save email settings",

        error: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}