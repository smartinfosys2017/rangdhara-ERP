"use client";

import { Calendar, CheckCircle, Layers, XCircle } from "lucide-react";

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
// COMPONENT
// =======================================================

export default function LocationViewDialog({ open, closeDialog, Location }) {
  if (!Location) {
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
        <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Location Details</DialogTitle>

            <DialogDescription>
              View complete location information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 max-h-[90vh] grow overflow-hidden">
            <DialogBody className="min-h-0 space-y-6 px-0 pt-0">
              {/* LOCATION CODE */}
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Location Code
                </div>

                <p className="break-all text-sm">
                  {Location.locationCode || "-"}
                </p>
              </div>

              {/* LOCATION NAME */}
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Location Name
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

              {/* CREATED AND UPDATED */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CREATED AT */}
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created At
                  </div>

                  <p className="text-sm">{formatDate(Location.createdAt)}</p>
                </div>

                {/* UPDATED AT */}
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated At
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
        </div>
      </DialogContent>
    </Dialog>
  );
}