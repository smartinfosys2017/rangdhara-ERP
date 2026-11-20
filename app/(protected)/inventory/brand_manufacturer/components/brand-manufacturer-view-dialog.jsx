"use client";
import { Calendar, CheckCircle, FileText, Layers, PlusCircle, MinusCircle, XCircle, Settings2,} from "lucide-react";

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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// FORMAT DATE
// =======================================================

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
const formatCustomFieldValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  // Boolean
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  // Array
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

  // Object
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
  const customFields = BrandManufacturers.custom_field_values || BrandManufacturers.customFields || {};

  const hasCustomFields =  customFields && typeof customFields === "object" && !Array.isArray(customFields) && Object.keys(customFields).length > 0;
  
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
              {/* GROUP NAME */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Group Name
                </div>

                <p className="text-sm">{BrandManufacturers.groupName || "-"}</p>
              </div>

              {/* DESCRIPTION */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Description
                </div>

                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {BrandManufacturers.description || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                {/* DEFAULT */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    Default Group
                  </div>

                  <p className="text-sm">{BrandManufacturers.isDefault ? "Yes" : "No"}</p>
                </div>
              </div>
              {hasCustomFields && (
                <div className="rounded-lg border mt-3 mb-3">
                  <div className="flex items-center gap-2 border-b p-4 font-semibold">
                    <Settings2 className="h-4 w-4" />
                    Custom Fields
                  </div>

                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                    {Object.entries(customFields).map(([key, value]) => (
                      <div key={key} className="rounded-lg border bg-muted/30 p-4">
                        <div className="mb-2 text-sm font-medium">{key}</div>

                        <div className="break-words text-sm text-muted-foreground">
                          {formatCustomFieldValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasCustomFields && (
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Settings2 className="h-4 w-4" />
                    Custom Fields
                  </div>

                  <p className="text-sm text-muted-foreground">
                    No custom fields available.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CREATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created Date
                  </div>

                  <p className="text-sm">{formatDate(BrandManufacturers.createdAt)}</p>
                </div>

                {/* UPDATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated Date
                  </div>

                  <p className="text-sm">{formatDate(BrandManufacturers.updatedAt)}</p>
                </div>
              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">ID</div>

                <p className="break-all text-sm text-muted-foreground">
                  {BrandManufacturers.id || "-"}
                </p>
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
