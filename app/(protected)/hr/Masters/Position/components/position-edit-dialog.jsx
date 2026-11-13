"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,

  positionName: "",

  description: "",

  status: "true",
};

// =======================================================
// COMPONENT
// =======================================================

export default function PositionEditDialog({
  open,

  closeDialog,

  onSuccess,

  Position,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (Position) {
      setForm({
        id: Position.id || null,

        positionName: Position.positionName || "",

        description: Position.description || "",

        status: Position.status ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
  }, [open, Position]);

  // =======================================================
  // CHANGE FIELD
  // =======================================================

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,

      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,

      [field]: "",
    }));
  };

  // =======================================================
  // VALIDATION
  // =======================================================

  const validate = () => {
    const newErrors = {};

    const positionName = form.positionName?.trim() || "";

    if (!positionName) {
      newErrors.positionName = "Position Name is required.";
    } else if (positionName.length > 255) {
      newErrors.positionName = "Position Name must not exceed 255 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please check the required fields and character limits.");
      return false;
    }

    return true;
  };

  // =======================================================
  // SAVE
  // =======================================================

  const handleSave = async () => {
    if (!validate()) return;

    const positionsData = {
      id: form.id,

      positionName: form.positionName.trim(),

      description: form.description.trim() || null,

      status: form.status === "true",
    };

    try {
      const response = await fetch("/api/hr/Position", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(positionsData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update positions.");
      }

      console.log("Updated Position:", result.data);

      toast.success("positions updated successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("positions UPDATE ERROR:", error);

      toast.error(error.message || "Unable to update positions.");
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setErrors({});

    closeDialog?.();
  };

  return (
    <Dialog
      open={open}

      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Edit Position
            </DialogTitle>
            <DialogDescription>Update positions information.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* Position Name */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Position Name <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.positionName}

                  placeholder="Enter positions name"

                  onChange={(e) => handleChange("positionName", e.target.value)}
                />

                {errors.positionName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.positionName}
                  </p>
                )}
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <Textarea
                  rows={4}

                  value={form.description}

                  placeholder="Enter description"

                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              {/* STATUS */}

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>

                <Select
                  value={form.status}

                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>

                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} >
              Close
            </Button>
            <Button type="button" onClick={handleSave} >
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
