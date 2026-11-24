
"use client";

import {
  Calendar,
  CheckCircle,
  Layers,
  XCircle,
  Settings2,
  Factory,
  Package,
  Clock,
  Hash,
  Ruler,
  FileText,
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
    if (value.length === 0) return "-";

    return value
      .map((item) => {
        if (item === null || item === undefined) return "";

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
// FORMAT VALUE
// =======================================================

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
};

// =======================================================
// COMPONENT
// =======================================================

export default function ProductionViewDialog({
  open,
  closeDialog,
  Production,
}) {
  if (!Production) {
    return null;
  }

  const customFields =
    Production.custom_field_values ||
    Production.customFields ||
    {};

  const hasCustomFields =
    customFields &&
    typeof customFields === "object" &&
    !Array.isArray(customFields) &&
    Object.keys(customFields).length > 0;

  const status = Boolean(Production.status);

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
        <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Production Details</DialogTitle>

            <DialogDescription>
              View complete production information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* PRODUCTION DATE */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Calendar className="h-4 w-4" />
                  Production Date
                </div>

                <p className="text-sm">
                  {formatDate(Production.productionDate)}
                </p>
              </div>

              {/* SHIFT */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4" />
                  Shift
                </div>

                <p className="text-sm">
                  {formatValue(
                    Production.shift?.name ||
                    Production.shiftName
                  )}
                </p>
              </div>

              {/* MACHINE */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Factory className="h-4 w-4" />
                  Machine
                </div>

                <p className="text-sm">
                  {formatValue(
                    Production.machine?.machineName ||
                    Production.machineName
                  )}
                </p>

                {(Production.machine?.machineCode ||
                  Production.machineCode) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Machine Code:{" "}
                    {Production.machine?.machineCode ||
                      Production.machineCode}
                  </p>
                )}
              </div>

              {/* ITEM */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Package className="h-4 w-4" />
                  Item
                </div>

                <p className="text-sm">
                  {formatValue(
                    Production.item?.ItemName ||
                    Production.itemName
                  )}
                </p>

                {(Production.item?.SKU || Production.itemSKU) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    SKU: {Production.item?.SKU || Production.itemSKU}
                  </p>
                )}
              </div>

              {/* QUANTITY DETAILS */}

              <div className="rounded-lg border p-4">

                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Package className="h-4 w-4" />
                    Production Quantity
                  </div>

                  <p className="text-sm">
                    {formatValue(Production.productionQuantity)}
                  </p>

              </div>

              {/* REMARKS */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Remarks
                </div>

                <p className="break-words whitespace-pre-wrap text-sm">
                  {formatValue(Production.remarks)}
                </p>
              </div>

              {/* STATUS */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  {status ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}

                  Status
                </div>

                <p className="text-sm">
                  {status ? "Active" : "Inactive"}
                </p>
              </div>

              {/* CUSTOM FIELDS */}

              {hasCustomFields ? (
                <div className="rounded-lg border mt-3 mb-3">
                  <div className="flex items-center gap-2 border-b p-4 font-semibold">
                    <Settings2 className="h-4 w-4" />
                    Custom Fields
                  </div>

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
                </div>
              ) : (
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

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created Date
                  </div>

                  <p className="text-sm">
                    {formatDate(Production.createdAt)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated Date
                  </div>

                  <p className="text-sm">
                    {formatDate(Production.updatedAt)}
                  </p>
                </div>

              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">ID</div>

                <p className="break-all text-sm text-muted-foreground">
                  {Production.id || "-"}
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
