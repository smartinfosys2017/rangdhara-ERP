"use client";

import { useEffect } from "react";

import { Calendar, CheckCircle, FileText, Layers, PlusCircle, MinusCircle, XCircle, Settings2,} from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function UnitViewDialog({ open, closeDialog, Unit }) {
  if (!Unit) return null;

  const status =
    Unit.status === true || Unit.status === "true" || Unit.status === 1
      ? "true"
      : "false";

  const customFields =  Unit.custom_field_values || Unit.customFields || {};
  const hasCustomFields =  customFields && typeof customFields === "object" && !Array.isArray(customFields) && Object.keys(customFields).length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeDialog?.();
      }}
    >
      <DialogContent>
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>View Unit</DialogTitle>
            <DialogDescription>View unit information below.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody>
              {/* UNIT NAME */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit Name</label>

                <Input
                  value={Unit.unitName || ""}
                  readOnly
                  placeholder="Enter unit name"
                />
              </div>

              {/* ABBREVIATION */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Abbreviation</label>

                <Input
                  value={Unit.abbreviation || ""}
                  readOnly
                  placeholder="Enter abbreviation"
                />
              </div>

              {/* STATUS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>

                <Select value={status} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
              {/* CREATED AT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Created At
                </label>

                <Input value={formatDate(Unit.createdAt)} readOnly />
              </div>

              {/* UPDATED AT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Updated At
                </label>

                <Input value={formatDate(Unit.updatedAt)} readOnly />
              </div>

              {/* ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ID</label>

                <Input value={Unit.id ?? ""} readOnly />
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}