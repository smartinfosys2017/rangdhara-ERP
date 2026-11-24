"use client";

import { Calendar, CheckCircle, FileText, Layers, PlusCircle, MinusCircle, XCircle, Settings2, } from "lucide-react";

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
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

// =======================================================
// FORMAT DATE
// =======================================================

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default function LocationViewDialog({ open, closeDialog, Location }) {
  if (!Location) {
    return null;
  }

  const customFields = Location.custom_field_values || Location.customFields || {};

  const hasCustomFields = customFields && typeof customFields === "object" && !Array.isArray(customFields) && Object.keys(customFields).length > 0;

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="mx-auto flex w-[calc(100%-2rem)] max-w-[486px] max-h-[90vh] flex-col gap-0 overflow-hidden  px-4 sm:px-6 md:px-10 " variant="fullscreen">
          <DialogHeader>
            <DialogTitle>Warehouse Details</DialogTitle>

            <DialogDescription>
              View complete warehouse information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 py-0 mb-5 ps-0 pe-3 -me-7">
            <DialogBody className="space-y-6">
              {/* Warehouse CODE */}
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Warehouse Code
                </div>

                <p className="break-all text-sm">
                  {Location.locationCode || "-"}
                </p>
              </div>

              {/* Warehouse NAME */}
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Warehouse Name
                </div>

                <p className="break-words text-sm">
                  {Location.locationName || "-"}
                </p>
              </div>

              {/* STATUS */}
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  {Location.status ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  Status
                </div>

                <p className="text-sm">
                  {Location.status ? "Active" : "Inactive"}
                </p>
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

              {/* CREATED AND UPDATED */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CREATED Date */}
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created Date
                  </div>

                  <p className="text-sm">{formatDate(Location.createdAt)}</p>
                </div>

                {/* UPDATED Date */}
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated Date
                  </div>

                  <p className="text-sm">{formatDate(Location.updatedAt)}</p>
                </div>
              </div>

              {/* ID */}
              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">ID</div>

                <p className="break-all text-sm text-muted-foreground">
                  {Location.id || "-"}
                </p>
              </div>
            </DialogBody>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}