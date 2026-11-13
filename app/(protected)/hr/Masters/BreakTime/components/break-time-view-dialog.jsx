"use client";

import { Calendar, Clock } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// FORMAT DATE
// =======================================================

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// =======================================================
// FORMAT TIME
// =======================================================

const formatTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const timeString = String(value);
  const match = timeString.match(/(\d{2}):(\d{2})/);

  if (!match) return timeString;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return timeString;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// =======================================================
// COMPONENT
// =======================================================

export default function BreakTimeViewDialog({
  open,
  closeDialog,
  BreakTime,
}) {
  if (!BreakTime) return null;

  const isActive =
    BreakTime.status === true ||
    BreakTime.status === "true" ||
    BreakTime.status === 1;

  const breakType = String(BreakTime.breakType || "").toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeDialog?.();
      }}
    >
      <DialogContent className="flex flex-col h-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>View Break Time</DialogTitle>

          <DialogDescription>
            View break time information below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
            <div className="space-y-4">
              {/* BREAK TIME NAME */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Break Time Name
                </label>

                <Input
                  value={BreakTime.name ?? ""}
                  readOnly
                  placeholder="Break time name"
                />
              </div>

              {/* FROM TIME */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  From Time
                </label>

                <Input value={formatTime(BreakTime.fromTime)} readOnly />
              </div>

              {/* TO TIME */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" />
                  To Time
                </label>

                <Input value={formatTime(BreakTime.toTime)} readOnly />
              </div>

              {/* BREAK TYPE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Break Type
                </label>

                <Input
                  value={
                    breakType
                      ? breakType.charAt(0).toUpperCase() + breakType.slice(1)
                      : "-"
                  }
                  readOnly
                />
              </div>

              {/* DURATION */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Duration (Minutes)
                </label>

                <Input
                  value={
                    BreakTime.durationMinutes !== null &&
                      BreakTime.durationMinutes !== undefined
                      ? String(BreakTime.durationMinutes)
                      : "-"
                  }
                  readOnly
                />
              </div>

              {/* FLEXIBLE BREAK */}
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={Boolean(BreakTime.isFlexible)}
                  disabled
                />

                <label className="text-sm font-medium">
                  Flexible Break
                </label>

                <span className="text-sm text-muted-foreground">
                  {BreakTime.isFlexible ? "Yes" : "No"}
                </span>
              </div>

              {/* STATUS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Status
                </label>

                <Input
                  value={isActive ? "Active" : "Inactive"}
                  readOnly
                />
              </div>

              {/* CREATED AT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Created At
                </label>

                <Input
                  value={formatDate(BreakTime.createdAt)}
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
                  value={formatDate(BreakTime.updatedAt)}
                  readOnly
                />
              </div>

              {/* ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ID</label>

                <Input value={String(BreakTime.id ?? "")} readOnly />
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