
"use client";

import {
  Calendar,
  CheckCircle,
  FileText,
  Building2,
  Globe,
  XCircle,
  Settings2,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// =======================================================
// FORMAT DATE
// =======================================================

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// =======================================================
// FORMAT CUSTOM FIELD VALUE
// =======================================================

const formatCustomFieldValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "-";
    }

    return value
      .map((item) => {
        if (item === null || item === undefined) {
          return "";
        }

        if (typeof item === "object") {
          return JSON.stringify(item);
        }

        return String(item);
      })
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

// =======================================================
// COMPONENT
// =======================================================

export default function BrandManufacturersViewDialog({
  open,
  closeDialog,
  BrandManufacturers,
}) {
  if (!BrandManufacturers) {
    return null;
  }

  const customFields =
    BrandManufacturers.customFields ??
    BrandManufacturers.custom_field_values ??
    {};

  const hasCustomFields =
    customFields &&
    typeof customFields === "object" &&
    !Array.isArray(customFields) &&
    Object.keys(customFields).length > 0;

  const brandName = BrandManufacturers.brandName || "-";
  const manufacturerName = BrandManufacturers.manufacturerName || "-";
  const websiteURL = BrandManufacturers.websiteURL || "-";
  const description = BrandManufacturers.description || "-";

  // Supports either joined user names or raw user IDs.
  const createdBy =
    BrandManufacturers.createdByName ||
    BrandManufacturers.createdBy?.name ||
    BrandManufacturers.createbyName ||
    BrandManufacturers.createby ||
    "-";

  const updatedBy =
    BrandManufacturers.updatedByName ||
    BrandManufacturers.updatedBy?.name ||
    BrandManufacturers.updatebyName ||
    BrandManufacturers.updateby ||
    "-";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent>
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Brand/Manufacturer Details
            </DialogTitle>

            <DialogDescription>
              View complete brand/manufacturer information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* BRAND NAME */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4" />
                  Brand Name
                </div>

                <p className="break-words text-sm">
                  {brandName}
                </p>
              </div>

              {/* MANUFACTURER NAME */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4" />
                  Manufacturer Name
                </div>

                <p className="break-words text-sm">
                  {manufacturerName}
                </p>
              </div>

              {/* WEBSITE URL */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Globe className="h-4 w-4" />
                  Website URL
                </div>

                {websiteURL !== "-" ? (
                  <a
                    href={websiteURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    {websiteURL}
                  </a>
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>

              {/* DESCRIPTION */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Description
                </div>

                <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {description}
                </p>
              </div>

              {/* STATUS */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  {BrandManufacturers.status ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}

                  Status
                </div>

                <p className="text-sm">
                  {BrandManufacturers.status ? "Active" : "Inactive"}
                </p>
              </div>

              {/* CUSTOM FIELDS */}

              <div className="rounded-lg border">
                <div className="flex items-center gap-2 border-b p-4 font-semibold">
                  <Settings2 className="h-4 w-4" />
                  Custom Fields
                </div>

                {hasCustomFields ? (
                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                    {Object.entries(customFields).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg border bg-muted/30 p-4"
                      >
                        <div className="mb-2 text-sm font-medium">
                          {key}
                        </div>

                        <div className="break-words text-sm text-muted-foreground">
                          {formatCustomFieldValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    No custom fields available.
                  </p>
                )}
              </div>

              {/* AUDIT DETAILS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* CREATED DATE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created Date
                  </div>

                  <p className="text-sm">
                    {formatDate(BrandManufacturers.createdAt)}
                  </p>
                </div>

                {/* UPDATED DATE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated Date
                  </div>

                  <p className="text-sm">
                    {formatDate(BrandManufacturers.updatedAt)}
                  </p>
                </div>

                {/* CREATED BY */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4" />
                    Created By
                  </div>

                  <p className="break-words text-sm">
                    {createdBy}
                  </p>
                </div>

                {/* UPDATED BY */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4" />
                    Updated By
                  </div>

                  <p className="break-words text-sm">
                    {updatedBy}
                  </p>
                </div>
              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">
                  ID
                </div>

                <p className="break-all text-sm text-muted-foreground">
                  {BrandManufacturers.id || "-"}
                </p>
              </div>

            </DialogBody>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}