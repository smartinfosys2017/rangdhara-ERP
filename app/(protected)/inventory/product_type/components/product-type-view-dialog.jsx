"use client";

import {
  Calendar,
  CheckCircle,
  FileText,
  Layers,
  XCircle,
  Database,
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

// =======================================================
// COMPONENT
// =======================================================

export default function ProductTypeViewDialog({
  open,
  closeDialog,
  ProductType,
}) {
  if (!ProductType) {
    return null;
  }

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
              Item Type Details
            </DialogTitle>

            <DialogDescription>
              View complete item type information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* Item TYPE */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Item Type
                </div>

                <p className="text-sm">{ProductType.ProductType || "-"}</p>
              </div>

              {/* DESCRIPTION */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Description
                </div>

                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {ProductType.Description || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* STATUS */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    {ProductType.status ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Status
                  </div>

                  <p className="text-sm">
                    {ProductType.status ? "Active" : "Inactive"}
                  </p>
                </div>

                {/* DEFAULT */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    Default Item Type
                  </div>

                  <p className="text-sm">{ProductType.isDefault ? "Yes" : "No"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CREATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created At
                  </div>

                  <p className="text-sm">{formatDate(ProductType.createdAt)}</p>
                </div>

                {/* UPDATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated At
                  </div>

                  <p className="text-sm">{formatDate(ProductType.updatedAt)}</p>
                </div>
              </div>

              {/* SYNC INFO */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Database className="h-4 w-4" />
                  Last Sync
                </div>

                <p className="text-sm">{formatDate(ProductType.lastSyncAt)}</p>
              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">ID</div>

                <p className="break-all text-sm text-muted-foreground">
                  {ProductType.id || "-"}
                </p>
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
