"use client";

import { Clock3, CalendarDays } from "lucide-react";

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
// FORMAT TIME
// Supports "HH:mm", "HH:mm:ss", and ISO time strings
// =======================================================

const formatTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const time = String(value).match(/(?:T|\s)?(\d{2}):(\d{2})/);

  if (!time) return String(value);

  const hours = Number(time[1]);
  const minutes = Number(time[2]);

  if (hours > 23 || minutes > 59) return String(value);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// =======================================================
// READ-ONLY FIELD
// =======================================================

function ViewField({ label, value, placeholder = "" }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input
        value={value === null || value === undefined ? "" : String(value)}
        readOnly
        placeholder={placeholder}
      />
    </div>
  );
}

// =======================================================
// COMPONENT
// =======================================================

export default function ShiftViewDialog({
  open,
  closeDialog,
  Shift,
}) {
  if (!Shift) return null;

  const status =
    Shift.status === true ||
      Shift.status === "true" ||
      Shift.status === 1
      ? "true"
      : "false";

  const crossesMidnight =
    Shift.crossesMidnight === true ||
      Shift.crossesMidnight === "true" ||
      Shift.crossesMidnight === 1
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
          <DialogTitle>View Shift</DialogTitle>
          <DialogDescription>
            View shift timings and attendance settings below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
            <div className="space-y-5">
              {/* SHIFT NAME */}
              <ViewField
                label="Shift Name"
                value={Shift.name}
                placeholder="Shift name"
              />

              {/* SHIFT TIMINGS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="h-4 w-4" />
                    In Time
                  </label>
                  <Input value={formatTime(Shift.inTime)} readOnly />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="h-4 w-4" />
                    Out Time
                  </label>
                  <Input value={formatTime(Shift.outTime)} readOnly />
                </div>
              </div>

              {/* OVERNIGHT SHIFT */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Overnight Shift</label>
                <Select value={crossesMidnight} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ATTENDANCE SETTINGS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ViewField
                  label="Grace Time (minutes)"
                  value={Shift.graceTime ?? 0}
                />

                <ViewField
                  label="Early In Allowed (minutes)"
                  value={Shift.earlyInMinutes ?? 0}
                />

                <ViewField
                  label="Late Out Allowed (minutes)"
                  value={Shift.lateOutMinutes ?? 0}
                />

                <ViewField
                  label="Half Day (minutes)"
                  value={Shift.halfDayMinutes ?? 240}
                />

                <ViewField
                  label="Full Day (minutes)"
                  value={Shift.fullDayMinutes ?? 480}
                />
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={Shift.description || ""}
                  readOnly
                  placeholder="No description provided"
                  rows={3}
                />
              </div>

              {/* STATUS */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CREATED AT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4" />
                  Created At
                </label>
                <Input value={formatDate(Shift.createdAt)} readOnly />
              </div>

              {/* UPDATED AT */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4" />
                  Updated At
                </label>
                <Input value={formatDate(Shift.updatedAt)} readOnly />
              </div>

              {/* ID */}
              <ViewField label="ID" value={Shift.id} />
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