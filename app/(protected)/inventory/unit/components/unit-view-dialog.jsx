"use client";

import { useEffect } from "react";
import { Calendar } from "lucide-react";

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
// COMPONENT
// =======================================================

export default function UnitViewDialog({ open, closeDialog, Unit }) {
  if (!Unit) return null;

  const status =
    Unit.status === true || Unit.status === "true" || Unit.status === 1
      ? "true"
      : "false";

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