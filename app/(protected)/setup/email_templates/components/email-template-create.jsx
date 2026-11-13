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

const EmailTemplateCreate = ({ open = true, onClose, onCreated }) => {
  /*
   * =====================================================
   * FORM STATE
   * =====================================================
   */

  const [formData, setFormData] = useState(getInitialFormData());

  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState({});

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

      const generatedFromOldName = generateSlug(previous.name);

      const shouldGenerateSlug =
        !currentSlug || currentSlug === generatedFromOldName;

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
   * VALIDATE
   * =====================================================
   */

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Template name is required.";
    }

    if (!formData.slug.trim()) {
      nextErrors.slug = "Template slug is required.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      nextErrors.slug =
        "Slug may contain lowercase letters, numbers and hyphens only.";
    }

    if (!formData.subject.trim()) {
      nextErrors.subject = "Subject is required.";
    }

    if (!formData.to.trim()) {
      nextErrors.to = "Recipient email is required.";
    }

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
   * CREATE TEMPLATE
   * =====================================================
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/email-templates", {
        method: "POST",

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
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create email template.");
      }

      toast.success(result.message || "Email template created successfully.");

      if (onCreated) {
        onCreated(result.data);
      }
    } catch (error) {
      console.error("Create Email Template Error:", error);

      toast.error(error.message || "Failed to create email template.");
    } finally {
      setSaving(false);
    }
  };

  /*
   * =====================================================
   * RESET FORM
   * =====================================================
   */

  useEffect(() => {
    if (!open) {
      setFormData(getInitialFormData());
      setErrors({});
      setSaving(false);
    }
  }, [open]);

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
                Add Email Template
              </DialogTitle>

              <DialogDescription className="mt-1">
                Create a reusable email template with dynamic merge fields.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
                  <Label htmlFor="template-name">
                    <span className="text-destructive">*</span> Name
                  </Label>

                  <Input
                    id="template-name"
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
                  <Label htmlFor="template-slug">
                    <span className="text-destructive">*</span> Slug
                  </Label>

                  <Input
                    id="template-slug"
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
                  <Label htmlFor="template-subject">
                    <span className="text-destructive">*</span> Subject
                  </Label>

                  <Input
                    id="template-subject"
                    value={formData.subject}
                    onChange={(event) =>
                      handleChange("subject", event.target.value)
                    }
                    placeholder="Welcome {contact_firstname}"
                    disabled={saving}
                  />

                  {errors.subject && (
                    <p className="text-xs text-destructive">{errors.subject}</p>
                  )}
                </div>

                {/* FROM NAME */}

                <div className="grid gap-2">
                  <Label htmlFor="template-from-name">From Name</Label>

                  <Input
                    id="template-from-name"
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
                  <Label htmlFor="template-to">
                    <span className="text-destructive">*</span> To
                  </Label>

                  <Input
                    id="template-to"
                    value={formData.to}
                    onChange={(event) => handleChange("to", event.target.value)}
                    placeholder="{contact_email}"
                    disabled={saving}
                  />

                  {errors.to && (
                    <p className="text-xs text-destructive">{errors.to}</p>
                  )}
                </div>

                {/* CC */}

                <div className="grid gap-2">
                  <Label htmlFor="template-cc">CC</Label>

                  <Input
                    id="template-cc"
                    value={formData.cc}
                    onChange={(event) => handleChange("cc", event.target.value)}
                    placeholder="{manager_email}"
                    disabled={saving}
                  />
                </div>

                {/* BCC */}

                <div className="grid gap-2">
                  <Label htmlFor="template-bcc">BCC</Label>

                  <Input
                    id="template-bcc"
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

            {/* =================================================
    EMAIL MESSAGE
================================================= */}

            <div className="rounded-xl border bg-card">
              <div className="border-b px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* LEFT */}

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
                    id="template-plaintext"
                    checked={formData.plaintext}
                    onCheckedChange={(checked) =>
                      handleChange("plaintext", checked === true)
                    }
                    disabled={saving}
                  />

                  <div className="grid gap-1">
                    <Label
                      htmlFor="template-plaintext"
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
                    id="template-disabled"
                    checked={formData.disabled}
                    onCheckedChange={(checked) =>
                      handleChange("disabled", checked === true)
                    }
                    disabled={saving}
                  />

                  <div className="grid gap-1">
                    <Label
                      htmlFor="template-disabled"
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

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Create Template
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplateCreate;