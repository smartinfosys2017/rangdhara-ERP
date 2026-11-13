
"use client";

import {
  Calendar,
  CheckCircle,
  FileText,
  Layers,
  Tag,
  Settings,
  XCircle,
  Clock,
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
  });
};

// =======================================================
// COMPONENT
// =======================================================

export default function EmployeeCandidateViewDialog({
  open,
  closeDialog,
  EmployeeCandidate,
}) {
  if (!EmployeeCandidate) {
    return null;
  }

  const categoryName =
    EmployeeCandidate.category?.CategoryName ||
    EmployeeCandidate.category?.categoryName ||
    EmployeeCandidate.Category?.CategoryName ||
    EmployeeCandidate.CategoryName ||
    "-";

  const mode = EmployeeCandidate.mode || "Active";

  const isActive = mode === "Active";

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
              Employee/Candidate Status Details
            </DialogTitle>

            <DialogDescription>
              View complete Employee/Candidate Status information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="pt-2.5 space-y-6">

              {/* STATUS NAME */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Layers className="h-4 w-4" />
                  Status Name
                </div>

                <p className="text-sm">
                  {EmployeeCandidate.StatusName || "-"}
                </p>
              </div>

              {/* CATEGORY */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Tag className="h-4 w-4" />
                  Category
                </div>

                <p className="text-sm">
                  {categoryName}
                </p>
              </div>

              {/* MODE AND DEFAULT */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* MODE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    {isActive ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}

                    Mode
                  </div>

                  <p className="text-sm">
                    {mode}
                  </p>
                </div>

                {/* IS DEFAULT */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    Is Default
                  </div>

                  <p className="text-sm">
                    {EmployeeCandidate.isDefault ? "Yes" : "No"}
                  </p>
                </div>

              </div>

              {/* DESCRIPTION */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Description
                </div>

                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {EmployeeCandidate.description || "-"}
                </p>
              </div>

              {/* CREATED AND UPDATED */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* CREATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created At
                  </div>

                  <p className="text-sm">
                    {formatDate(EmployeeCandidate.createdAt)}
                  </p>
                </div>

                {/* UPDATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4" />
                    Updated At
                  </div>

                  <p className="text-sm">
                    {formatDate(EmployeeCandidate.updatedAt)}
                  </p>
                </div>

              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">
                  ID
                </div>

                <p className="break-all text-sm text-muted-foreground">
                  {EmployeeCandidate.id || "-"}
                </p>
              </div>

            </DialogBody>
          </ScrollArea>

          <DialogFooter>
            <Button
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