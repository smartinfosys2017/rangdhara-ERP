"use client";

import { useState } from "react";

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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =======================================================
// DEFAULT FORM
// =======================================================

const DEFAULT_FORM = {
  itemName: "",

  description: "",

  status: "true",

  makeGlobal: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function ChecklistAddDialog({
  open,

  closeDialog,

  onSuccess,

  item = null,
}) {
  const [form, setForm] = useState({
    ...DEFAULT_FORM,

    ...(item && {
      itemName: item.itemName || "",

      description: item.description || "",

      status: item.status ? "true" : "false",

      makeGlobal: item.makeGlobal ? "true" : "false",
    }),
  });

  const [errors, setErrors] = useState({});

  // =======================================================
  // UPDATE FIELD
  // =======================================================

  const updateField = (field, value) => {
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

    const itemName = form.itemName?.trim() || "";

    if (!itemName) {
      newErrors.itemName = "Item name is required.";
    } else if (itemName.length > 255) {
      newErrors.itemName = "item name must not exceed 255 characters.";
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

    const checklistData = {
      itemName: form.itemName.trim(),

      description: form.description.trim() || null,

      status: form.status === "true",

      makeGlobal: form.makeGlobal === "true",
    };

    try {
      const response = await fetch("/api/hr/Checklist", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(checklistData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create checklist.");
      }

      console.log("Created Checklist:", result.data);

      toast.success("Checklist added successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("Checklist CREATE ERROR", error);

      toast.error(error.message || "Failed to add checklist.");
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setErrors({});

    setForm({
      ...DEFAULT_FORM,
    });

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
          <DialogTitle>{item ? "Edit Checklist" : "Add Checklist"}</DialogTitle>

          <DialogDescription>
            {item ? "Update checklist information." : "Create a new checklist."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
        <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
          {/* Item NAME */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Item Name <span className="text-destructive">*</span>
            </label>

            <Input
              value={form.itemName}

              placeholder="Enter group name"

              onChange={(e) => updateField("itemName", e.target.value)}
            />

            {errors.itemName && (
              <p className="mt-1 text-xs text-destructive">{errors.itemName}</p>
            )}
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <Textarea
              rows={4}
              placeholder="Enter description"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          {/* STATUS */}

          <div>
            <label className="mb-2 block text-sm font-medium">Status</label>

            <Select
              value={form.status}

              onValueChange={(value) => updateField("status", value)}
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

          {/* makeGlobal */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Make Global
            </label>

            <Select
              value={form.makeGlobal}

              onValueChange={(value) => updateField("makeGlobal", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>

                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogBody>
            </ScrollArea>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
