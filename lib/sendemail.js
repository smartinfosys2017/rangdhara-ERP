// lib/sendemail.js

import nodemailer from "nodemailer";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";

/**
 * =========================================================
 * SMTP MODE
 * =========================================================
 *
 * true
 *  -> Use STATIC SMTP configuration below.
 *
 * false
 *  -> Use SMTP configuration from Setting table.
 */
const USE_STATIC_SMTP = false;

/**
 * =========================================================
 * STATIC SMTP CONFIGURATION
 * =========================================================
 *
 * Used only when:
 *
 * USE_STATIC_SMTP = true
 *
 * Example: Mailtrap SMTP
 */
const STATIC_SMTP_CONFIG = {
  host: "sandbox.smtp.mailtrap.io",

  port: 2525,

  secure: false,

  username: "d2a6000456f615",

  password: "1d563713e40abd",

  from: "NoReply@Rangdhrara.com>",
};

/**
 * Get email setting from Setting table.
 */
async function getSetting(key, defaultValue = "") {
  const result = await prisma.$queryRawUnsafe(
    `
        SELECT "value"
        FROM public."Setting"
        WHERE "group" = 'email'
          AND "key" = $1
        LIMIT 1
        `,
    key,
  );

  if (!result || result.length === 0) {
    return defaultValue;
  }

  return result[0].value ?? defaultValue;
}

/**
 * Convert database setting value to boolean.
 *
 * Supports:
 * true
 * "true"
 * 1
 * "1"
 */
function isSettingTrue(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

/**
 * Get all email settings.
 */
async function getEmailSettings() {
  return {
    mail_engine: await getSetting("mail_engine", "SMTP"),

    email_protocol: await getSetting("email_protocol", "smtp"),

    email_encryption: await getSetting("email_encryption", "tls"),

    smtp_host: await getSetting("smtp_host", ""),

    smtp_port: await getSetting("smtp_port", "587"),

    email: await getSetting("email", ""),

    smtp_username: await getSetting("smtp_username", ""),

    smtp_password: await getSetting("smtp_password", ""),

    email_charset: await getSetting("email_charset", "UTF-8"),

    bcc_all_emails: await getSetting("bcc_all_emails", ""),

    email_signature: await getSetting("email_signature", ""),

    predefined_header: await getSetting("predefined_header", ""),

    predefined_footer: await getSetting("predefined_footer", ""),

    enable_email_queue: await getSetting("enable_email_queue", "0"),

    exclude_attachments: await getSetting("exclude_attachments", "0"),
  };
}

/**
 * Create Nodemailer transporter.
 */
async function createTransporter(settings) {
  /**
   * =======================================================
   * STATIC SMTP
   * =======================================================
   *
   * When USE_STATIC_SMTP is true,
   * ignore database SMTP host/username/password
   * and use STATIC_SMTP_CONFIG.
   */
  if (USE_STATIC_SMTP) {
    console.log("[sendEmail] Using STATIC SMTP configuration:", {
      host: STATIC_SMTP_CONFIG.host,
      port: STATIC_SMTP_CONFIG.port,
      secure: STATIC_SMTP_CONFIG.secure,
      username: STATIC_SMTP_CONFIG.username,
      passwordConfigured: Boolean(STATIC_SMTP_CONFIG.password),
    });

    if (
      !STATIC_SMTP_CONFIG.host ||
      !STATIC_SMTP_CONFIG.username ||
      !STATIC_SMTP_CONFIG.password
    ) {
      throw new Error("Static SMTP configuration is incomplete.");
    }

    const transporter = nodemailer.createTransport({
      host: STATIC_SMTP_CONFIG.host,

      port: Number(STATIC_SMTP_CONFIG.port),

      secure: Boolean(STATIC_SMTP_CONFIG.secure),

      auth: {
        user: STATIC_SMTP_CONFIG.username,

        pass: STATIC_SMTP_CONFIG.password,
      },
    });

    return transporter;
  }

  /**
   * =======================================================
   * DYNAMIC SMTP
   * =======================================================
   *
   * When USE_STATIC_SMTP is false,
   * use SMTP settings from the Setting table.
   */
  const port = Number(settings.smtp_port || 587);

  const encryption = String(settings.email_encryption || "").toLowerCase();

  const secure = encryption === "ssl" || encryption === "smtps" || port === 465;

  if (
    !settings.smtp_host ||
    !settings.smtp_username ||
    !settings.smtp_password
  ) {
    throw new Error("SMTP configuration is incomplete.");
  }

  console.log("[sendEmail] SMTP configuration:", {
    host: settings.smtp_host,

    port,

    secure,

    username: settings.smtp_username,

    passwordConfigured: Boolean(settings.smtp_password),
  });

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,

    port,

    secure,

    auth: {
      user: settings.smtp_username,

      pass: settings.smtp_password,
    },

    ...(encryption === "tls" && !secure
      ? {
        requireTLS: true,
      }
      : {}),
  });

  return transporter;
}

/**
 * Create EmailQueue record.
 */

async function createEmailQueue({ to, subject, body, hasAttachment }) {
  const id = crypto.randomUUID();

  const result = await prisma.$queryRawUnsafe(
    `
      INSERT INTO public."EmailQueue"
      (
        "id",
        "to",
        "subject",
        "body",
        "status",
        "hasAttachment",
        "createdAt",
        "updatedAt"
      )
      VALUES
      (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING "id", "status"
    `,
    id,
    String(to),
    String(subject),
    String(body || ""),
    "Queue",
    Boolean(hasAttachment)
  );

  return result[0];
}


/**
 * Update EmailQueue status.
 */
async function updateEmailQueueStatus(id, status) {
  if (!id) {
    return;
  }

  await prisma.$executeRawUnsafe(
    `
        UPDATE public."EmailQueue"
        SET
            "status" = $1,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $2::uuid
        `,
    status,
    id,
  );
}

/**
 * Send email.
 *
 * Conditions:
 *
 * enable_email_queue = true
 *      -> Store email in EmailQueue.
 *
 * enable_email_queue = false
 *      -> Do not store new email in EmailQueue.
 *
 * exclude_attachments = true
 *      -> Do not send attachments.
 *
 * exclude_attachments = false
 *      -> Send attachments normally.
 */

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments = [],
  queueId = null,
  createQueue = true,
}) {
  const settings = await getEmailSettings();

  const enableEmailQueue = isSettingTrue(settings.enable_email_queue);
  const excludeAttachments = isSettingTrue(settings.exclude_attachments);

  const finalAttachments = Array.isArray(attachments) ? attachments : [];
  const hasAttachment = finalAttachments.length > 0;

  // Queue emails without attachments when queueing is enabled.
  // If excludeAttachments is enabled, emails with attachments
  // bypass the queue and are sent immediately.
  const shouldQueue =
    enableEmailQueue &&
    createQueue &&
    !queueId &&
    !(excludeAttachments && hasAttachment);

  if (shouldQueue) {
    const queue = await createEmailQueue({
      to,
      subject,
      body: html || text || "",
      hasAttachment: false,
    });

    return {
      success: true,
      messageId: null,
      queueId: queue.id,
      queued: true,
      sent: false,
      hasAttachment: false,
      attachmentCount: 0,
      status: "Queue",
    };
  }

  // Mark a queued email as Queue until sending starts.
  // Only the final result is stored as Sent or Failed.
  if (queueId) {
    await updateEmailQueueStatus(queueId, "Queue");
  }

  try {
    const transporter = await createTransporter(settings);

    const mailOptions = {
      from: USE_STATIC_SMTP
        ? STATIC_SMTP_CONFIG.from
        : settings.email || settings.smtp_username,
      to,
      subject,
      attachments: finalAttachments,
    };

    if (text) mailOptions.text = text;
    if (html) mailOptions.html = html;

    if (settings.bcc_all_emails) {
      mailOptions.bcc = settings.bcc_all_emails;
    }

    await transporter.verify();

    const info = await transporter.sendMail(mailOptions);

    if (queueId) {
      await updateEmailQueueStatus(queueId, "Sent");
    }

    return {
      success: true,
      messageId: info.messageId,
      queueId: queueId || null,
      queued: false,
      sent: true,
      hasAttachment,
      attachmentCount: finalAttachments.length,
      status: "Sent",
    };
  } catch (error) {
    if (queueId) {
      try {
        await updateEmailQueueStatus(queueId, "Failed");
      } catch (queueError) {
        console.error(
          "Failed to update EmailQueue status:",
          queueError
        );
      }
    }

    throw error;
  }
}



/**
 * Send test email.
 *
 * This uses the same sendEmail() function, so:
 *
 * enable_email_queue
 *      -> controls EmailQueue storage
 *
 * exclude_attachments
 *      -> controls attachments
 */
export async function sendTestEmail({ to = null } = {}) {
  const settings = await getEmailSettings();

  // If recipient is not provided, use configured email setting
  const recipient = to || settings.email || settings.smtp_username;

  if (!recipient) {
    throw new Error("Test email recipient is required.");
  }

  const subject = "Test Email - Rangdhara";

  const text = "This is a test email from Rangdhara.";

  const html = `
        <div style="font-family: Arial, sans-serif;">
            <h2>Test Email</h2>

            <p>
                This is a test email from
                <strong>Rangdhara</strong>.
            </p>

            <p>
                If you received this email,
                your SMTP configuration is working correctly.
            </p>
        </div>
    `;

  return await sendEmail({
    to: recipient,
    subject,
    text,
    html,
    attachments: [],
  });
}