"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Mail, User, Users, Building2, X } from "lucide-react";

const EmailTemplatePreview = ({ open = false, template = null, onClose }) => {
  if (!template) {
    return null;
  }

  const message = template.message || "";

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

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
          sm:max-w-[1000px]
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
                Email Template Preview
              </DialogTitle>

              <DialogDescription className="mt-1">
                Preview how this email template will appear.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* =================================================
            EMAIL DETAILS
        ================================================= */}

        <div className="p-6">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {/* EMAIL HEADER */}

            <div className="border-b bg-muted/20">
              {/* FROM */}

              <div className="flex gap-4 border-b px-5 py-3">
                <div className="flex w-20 shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="size-3.5" />
                  From
                </div>

                <div className="min-w-0 text-sm">
                  {template.fromName || (
                    <span className="text-muted-foreground">
                      Default sender
                    </span>
                  )}
                </div>
              </div>

              {/* TO */}

              <div className="flex gap-4 border-b px-5 py-3">
                <div className="flex w-20 shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                  <User className="size-3.5" />
                  To
                </div>

                <div className="min-w-0 break-all text-sm">
                  {template.to || "-"}
                </div>
              </div>

              {/* CC */}

              {template.cc && (
                <div className="flex gap-4 border-b px-5 py-3">
                  <div className="flex w-20 shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Users className="size-3.5" />
                    CC
                  </div>

                  <div className="min-w-0 break-all text-sm">{template.cc}</div>
                </div>
              )}

              {/* BCC */}

              {template.bcc && (
                <div className="flex gap-4 border-b px-5 py-3">
                  <div className="flex w-20 shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Users className="size-3.5" />
                    BCC
                  </div>

                  <div className="min-w-0 break-all text-sm">
                    {template.bcc}
                  </div>
                </div>
              )}

              {/* TEMPLATE */}

              <div className="flex gap-4 border-b px-5 py-3">
                <div className="flex w-20 shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Building2 className="size-3.5" />
                  Template
                </div>

                <div className="min-w-0 text-sm font-medium">
                  {template.name || "-"}
                </div>
              </div>

              {/* SUBJECT */}

              <div className="flex gap-4 px-5 py-4">
                <div className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                  Subject
                </div>

                <div className="min-w-0 text-sm font-semibold">
                  {template.subject || "-"}
                </div>
              </div>
            </div>

            {/* EMAIL BODY */}

            <div className="min-h-[300px] bg-background p-6">
              {template.plaintext ? (
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">
                  {message}
                </pre>
              ) : (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: message,
                  }}
                />
              )}
            </div>
          </div>

          {/* MERGE FIELD NOTE */}

          <div className="mt-4 rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Merge fields such as{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-medium">
                {"{contact_firstname}"}
              </code>{" "}
              will be replaced with actual values when the email is sent.
            </p>
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <DialogFooter className="border-t bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="size-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailTemplatePreview;