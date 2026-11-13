"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { LoaderCircle, Save, X, Mail, FileText, Settings2 } from "lucide-react";

import { toast } from "sonner";

import EmailTemplateEditor from "./email-template-editor";
import EmailTemplateMergeFields from "./email-template-merge-fields";

/*
 * =====================================================
 * EMPTY FORM
 * =====================================================
 */

const getInitialFormData = () => ({
  name: "",
  slug: "",
  subject: "",
  fromName: "",
  to: "",
  cc: "",
  bcc: "",
  message: "",
  plaintext: false,
  disabled: false,
});

/*
 * =====================================================
 * COMPONENT
 * =====================================================
 */

const EmailTemplateUpdate = ({
  open = false,
  id = null,
  template = null,
  onClose,
  onUpdated,
}) => {
  /*
   * =====================================================
   * FORM STATE
   * =====================================================
   */

  const [formData, setFormData] = useState(getInitialFormData());

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState({});

  /*
   * =====================================================
   * TEMPLATE ID
   * =====================================================
   *
   * Supports:
   * id={template.id}
   *
   * OR
   *
   * template={template}
   */

  const templateId = id || template?.id || template?._id || null;

  /*
   * =====================================================
   * GENERATE SLUG
   * =====================================================
   */

  const generateSlug = (value) => {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  /*
   * =====================================================
   * SET TEMPLATE DATA
   * =====================================================
   */

  const fillFormData = (data = {}) => {
    setFormData({
      name: data.name ?? "",
      slug: data.slug ?? "",
      subject: data.subject ?? "",
      fromName: data.fromName ?? "",
      to: data.to ?? "",
      cc: data.cc ?? "",
      bcc: data.bcc ?? "",
      message: data.message ?? "",
      plaintext: Boolean(data.plaintext),
      disabled: Boolean(data.disabled),
    });

    setErrors({});
  };

  /*
   * =====================================================
   * HANDLE CHANGE
   * =====================================================
   */

  const handleChange = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  /*
   * =====================================================
   * HANDLE NAME CHANGE
   * =====================================================
   */

  const handleNameChange = (value) => {
    setFormData((previous) => {
      const currentSlug = previous.slug;

      const oldGeneratedSlug = generateSlug(previous.name);

      const shouldGenerateSlug =
        !currentSlug || currentSlug === oldGeneratedSlug;

      return {
        ...previous,
        name: value,
        slug: shouldGenerateSlug ? generateSlug(value) : currentSlug,
      };
    });

    setErrors((previous) => ({
      ...previous,
      name: "",
      slug: "",
    }));
  };

  /*
   * =====================================================
   * LOAD TEMPLATE FROM API
   * =====================================================
   */

  const loadTemplate = async () => {
    if (!templateId) {
      toast.error("Email template ID is required.");
      return;
    }

    try {
      setLoading(true);

      /*
       * If template object is already available from
       * the list, fill the form immediately.
       */
      if (template) {
        fillFormData(template);
      }

      /*
       * Get latest template data from API.
       */
      const response = await fetch(
        `/api/email-templates/${encodeURIComponent(templateId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load email template.");
      }

      /*
       * Support common API response formats.
       */
      const data =
        result.data || result.template || result.emailTemplate || null;

      if (!data) {
        throw new Error("Email template data was not found.");
      }

      /*
       * Fill form with latest API data.
       */
      fillFormData(data);
    } catch (error) {
      console.error("Load Email Template Error:", error);

      /*
       * If the list already provided template data,
       * don't clear it when API loading fails.
       */
      if (!template) {
        toast.error(error.message || "Failed to load email template.");
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * =====================================================
   * LOAD WHEN DIALOG OPENS
   * =====================================================
   */

  useEffect(() => {
    if (!open) {
      setFormData(getInitialFormData());
      setErrors({});
      setLoading(false);
      setSaving(false);

      return;
    }

    if (templateId) {
      loadTemplate();
    } else {
      setFormData(getInitialFormData());
    }
  }, [open, templateId]);

  /*
   * =====================================================
   * VALIDATE
   * =====================================================
   */

  const validate = () => {
    const nextErrors = {};

    /*
     * NAME
     */
    if (!formData.name.trim()) {
      nextErrors.name = "Template name is required.";
    }

    /*
     * SLUG
     */
    if (!formData.slug.trim()) {
      nextErrors.slug = "Template slug is required.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      nextErrors.slug =
        "Slug may contain lowercase letters, numbers and hyphens only.";
    }

    /*
     * SUBJECT
     */
    if (!formData.subject.trim()) {
      nextErrors.subject = "Subject is required.";
    }

    /*
     * TO
     */
    if (!formData.to.trim()) {
      nextErrors.to = "Recipient email is required.";
    }

    /*
     * MESSAGE
     */
    const messageText =
      formData.message
        ?.replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim() || "";

    if (!messageText) {
      nextErrors.message = "Message is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  /*
   * =====================================================
   * UPDATE TEMPLATE
   * =====================================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || loading) {
      return;
    }

    if (!templateId) {
      toast.error("Email template ID is required.");
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/email-templates/${encodeURIComponent(templateId)}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: formData.name.trim(),

            slug: formData.slug.trim(),

            subject: formData.subject.trim(),

            fromName: formData.fromName.trim(),

            to: formData.to.trim(),

            cc: formData.cc.trim(),

            bcc: formData.bcc.trim(),

            message: formData.message,

            plaintext: Boolean(formData.plaintext),

            disabled: Boolean(formData.disabled),
          }),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update email template.");
      }

      toast.success(result.message || "Email template updated successfully.");

      /*
       * Send updated data back to list.
       */
      if (onUpdated) {
        onUpdated(result.data || formData);
      }
    } catch (error) {
      console.error("Update Email Template Error:", error);

      toast.error(error.message || "Failed to update email template.");
    } finally {
      setSaving(false);
    }
  };

  /*
   * =====================================================
   * CLOSE
   * =====================================================
   */

  const handleClose = () => {
    if (saving) {
      return;
    }

    if (onClose) {
      onClose();
    }
  };

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="
          max-h-[95vh]
          overflow-y-auto
          p-0
          sm:max-w-[1200px]
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <DialogHeader className="border-b px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>

            <div>
              <DialogTitle className="text-lg font-semibold">
                Update Email Template
              </DialogTitle>

              <DialogDescription className="mt-1">
                Update the email template and its dynamic merge fields.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <LoaderCircle className="size-7 animate-spin" />

              <p className="text-sm">Loading email template...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 px-6 py-6">
              {/* =================================================
                  TEMPLATE INFORMATION
              ================================================= */}

              <div className="rounded-xl border bg-card">
                <div className="flex items-center gap-3 border-b px-5 py-4">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-4 text-muted-foreground" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">
                      Template Information
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      Basic information about this email template.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 p-5 md:grid-cols-2">
                  {/* NAME */}

                  <div className="grid gap-2">
                    <Label htmlFor="template-update-name">
                      <span className="text-destructive">*</span> Name
                    </Label>

                    <Input
                      id="template-update-name"
                      value={formData.name}
                      onChange={(event) => handleNameChange(event.target.value)}
                      placeholder="Customer Welcome Email"
                      disabled={saving}
                    />

                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>

                  {/* SLUG */}

                  <div className="grid gap-2">
                    <Label htmlFor="template-update-slug">
                      <span className="text-destructive">*</span> Slug
                    </Label>

                    <Input
                      id="template-update-slug"
                      value={formData.slug}
                      onChange={(event) =>
                        handleChange("slug", generateSlug(event.target.value))
                      }
                      placeholder="customer-welcome-email"
                      disabled={saving}
                    />

                    {errors.slug && (
                      <p className="text-xs text-destructive">{errors.slug}</p>
                    )}
                  </div>

                  {/* SUBJECT */}

                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="template-update-subject">
                      <span className="text-destructive">*</span> Subject
                    </Label>

                    <Input
                      id="template-update-subject"
                      value={formData.subject}
                      onChange={(event) =>
                        handleChange("subject", event.target.value)
                      }
                      placeholder="Welcome {contact_firstname}"
                      disabled={saving}
                    />

                    {errors.subject && (
                      <p className="text-xs text-destructive">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  {/* FROM NAME */}

                  <div className="grid gap-2">
                    <Label htmlFor="template-update-from-name">From Name</Label>

                    <Input
                      id="template-update-from-name"
                      value={formData.fromName}
                      onChange={(event) =>
                        handleChange("fromName", event.target.value)
                      }
                      placeholder="{companyname} | CRM"
                      disabled={saving}
                    />
                  </div>

                  {/* TO */}

                  <div className="grid gap-2">
                    <Label htmlFor="template-update-to">
                      <span className="text-destructive">*</span> To
                    </Label>

                    <Input
                      id="template-update-to"
                      value={formData.to}
                      onChange={(event) =>
                        handleChange("to", event.target.value)
                      }
                      placeholder="{contact_email}"
                      disabled={saving}
                    />

                    {errors.to && (
                      <p className="text-xs text-destructive">{errors.to}</p>
                    )}
                  </div>

                  {/* CC */}

                  <div className="grid gap-2">
                    <Label htmlFor="template-update-cc">CC</Label>

                    <Input
                      id="template-update-cc"
                      value={formData.cc}
                      onChange={(event) =>
                        handleChange("cc", event.target.value)
                      }
                      placeholder="{manager_email}"
                      disabled={saving}
                    />
                  </div>

                  {/* BCC */}

                  <div className="grid gap-2">
                    <Label htmlFor="template-update-bcc">BCC</Label>

                    <Input
                      id="template-update-bcc"
                      value={formData.bcc}
                      onChange={(event) =>
                        handleChange("bcc", event.target.value)
                      }
                      placeholder="{admin_email}"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              {/* =================================================
                  EMAIL MESSAGE
              ================================================= */}

              <div className="rounded-xl border bg-card">
                <div className="border-b px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                        <Mail className="size-4 text-muted-foreground" />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold">Email Message</h3>

                        <p className="text-xs text-muted-foreground">
                          Create and format your email message.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <EmailTemplateEditor
                    value={formData.message}
                    onChange={(value) => handleChange("message", value)}
                    disabled={saving}
                    placeholder="Write your email message..."
                  />

                  {errors.message && (
                    <p className="mt-2 text-xs text-destructive">
                      {errors.message}
                    </p>
                  )}
                </div>
              </div>

              {/* =================================================
                  MERGE FIELDS
              ================================================= */}

              <EmailTemplateMergeFields disabled={saving} />

              {/* =================================================
                  TEMPLATE OPTIONS
              ================================================= */}

              <div className="rounded-xl border bg-card">
                <div className="flex items-center gap-3 border-b px-5 py-4">
                  <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                    <Settings2 className="size-4 text-muted-foreground" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">Template Options</h3>

                    <p className="text-xs text-muted-foreground">
                      Configure how this template is handled.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {/* PLAINTEXT */}

                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                      id="template-update-plaintext"
                      checked={formData.plaintext}
                      onCheckedChange={(checked) =>
                        handleChange("plaintext", checked === true)
                      }
                      disabled={saving}
                    />

                    <div className="grid gap-1">
                      <Label
                        htmlFor="template-update-plaintext"
                        className="cursor-pointer font-medium"
                      >
                        Plain Text
                      </Label>

                      <p className="text-xs text-muted-foreground">
                        Send the message without HTML formatting.
                      </p>
                    </div>
                  </div>

                  {/* DISABLED */}

                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                      id="template-update-disabled"
                      checked={formData.disabled}
                      onCheckedChange={(checked) =>
                        handleChange("disabled", checked === true)
                      }
                      disabled={saving}
                    />

                    <div className="grid gap-1">
                      <Label
                        htmlFor="template-update-disabled"
                        className="cursor-pointer font-medium"
                      >
                        Disabled
                      </Label>

                      <p className="text-xs text-muted-foreground">
                        Disabled templates cannot be used for sending.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                FOOTER
            ================================================= */}

            <DialogFooter className="border-t bg-muted/20 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                <X className="size-4" />
                Cancel
              </Button>

              <Button type="submit" disabled={saving || loading}>
                {saving ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Update Template
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplateUpdate;