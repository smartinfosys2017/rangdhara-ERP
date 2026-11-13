import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendemail";

function replaceMergeFields(value, data = {}) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (data[key] === undefined || data[key] === null) {
      return match;
    }

    return String(data[key]);
  });
}

function splitEmails(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

export async function getEmailTemplate(slug) {
  if (!slug) {
    throw new Error("Email template slug is required.");
  }

  const template = await prisma.emailTemplate.findUnique({
    where: {
      slug: String(slug),
    },
  });

  if (!template) {
    throw new Error(`Email template "${slug}" not found.`);
  }

  return template;
}

export async function sendTemplateEmail({
  templateSlug,
  data = {},
  attachments = [],
}) {
  const template = await getEmailTemplate(templateSlug);

  if (template.disabled) {
    return {
      success: false,
      disabled: true,
      message: "Email template is disabled.",
      templateId: template.id,
      templateSlug: template.slug,
    };
  }

  const to = splitEmails(replaceMergeFields(template.to, data));

  const cc = splitEmails(replaceMergeFields(template.cc, data));

  const bcc = splitEmails(replaceMergeFields(template.bcc, data));

  if (to.length === 0) {
    throw new Error(`No recipient configured for "${template.name}".`);
  }

  const subject = replaceMergeFields(template.subject, data);

  const html = replaceMergeFields(template.message, data);

  const text = htmlToText(html);

  const result = await sendEmail({
    to,
    cc,
    bcc,
    subject,
    text,
    html: template.plaintext ? text : html,
    attachments,
  });

  return {
    ...result,
    templateId: template.id,
    templateSlug: template.slug,
    templateName: template.name,
  };
}

export { replaceMergeFields, splitEmails, htmlToText };
