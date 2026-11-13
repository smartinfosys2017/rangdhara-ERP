"use client";

import { Calendar } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =======================================================
// FORMAT DATE
// =======================================================

const formatDate = (value) => {
  if (!value) return "-";

  const dateString = String(value).slice(0, 10);
  const parts = dateString.split("-");

  if (parts.length === 3) {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// =======================================================
// COMPONENT
// =======================================================

export default function HolidayViewDialog({
  open,
  closeDialog,
  Holiday,
}) {
  if (!Holiday) return null;

  const status =
    Holiday.status === true ||
      Holiday.status === "true" ||
      Holiday.status === 1
      ? "true"
      : "false";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeDialog?.();
      }}
    >
      <DialogContent className="flex flex-col h-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>View Holiday</DialogTitle>

          <DialogDescription>
            View holiday information below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

            <div className="space-y-4">
              {/* HOLIDAY NAME */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Holiday Name
                </label>

                <Input
                  value={Holiday.name || ""}
                  readOnly
                  placeholder="Holiday name"
                />
              </div>

              {/* FROM DATE */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  From Date
                </label>

                <Input
                  value={formatDate(Holiday.fromDate)}
                  readOnly
                />
              </div>

              {/* TO DATE */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  To Date
                </label>

                <Input
                  value={formatDate(Holiday.toDate)}
                  readOnly
                />
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description
                </label>

                <Textarea
                  value={Holiday.description || ""}
                  readOnly
                  placeholder="No description provided"
                  rows={3}
                />
              </div>

              {/* STATUS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Status
                </label>

                <Select value={status} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">
                      Active
                    </SelectItem>

                    <SelectItem value="false">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CREATED AT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Created At
                </label>

                <Input
                  value={formatDate(Holiday.createdAt)}
                  readOnly
                />
              </div>

              {/* UPDATED AT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Updated At
                </label>

                <Input
                  value={formatDate(Holiday.updatedAt)}
                  readOnly
                />
              </div>

              {/* ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  ID
                </label>

                <Input
                  value={Holiday.id ?? ""}
                  readOnly
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogBody>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}