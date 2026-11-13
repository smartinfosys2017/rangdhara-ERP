"use client";

import { Calendar, CheckCircle, FileText, Layers, XCircle } from "lucide-react";

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

export default function SecurityViewDialog({
  open,

  closeDialog,

  Security,
}) {
  if (!Security) {
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
              Security Details
            </DialogTitle>

            <DialogDescription>
              View complete security information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="pt-2.5 space-y-6 ">
              {/* Security Name */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Security Name
                </div>

                <p className="text-sm">{Security.securityName || "-"}</p>
              </div>

              {/* DESCRIPTION */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Description
                </div>

                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {Security.description || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* STATUS */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    {Security.status ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Status
                  </div>

                  <p className="text-sm">
                    {Security.status ? "Active" : "Inactive"}
                  </p>
                </div>

                {/* DEFAULT */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    Default Group
                  </div>

                  <p className="text-sm">{Security.isDefault ? "Yes" : "No"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CREATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created At
                  </div>

                  <p className="text-sm">{formatDate(Security.createdAt)}</p>
                </div>

                {/* UPDATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated At
                  </div>

                  <p className="text-sm">{formatDate(Security.updatedAt)}</p>
                </div>
              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">ID</div>

                <p className="break-all text-sm text-muted-foreground">
                  {Security.id || "-"}
                </p>
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
