"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

// =======================================================
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,

  itemName: "",

  description: "",

  status: "true",

  makeGlobal: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function ChecklistEditDialog({
  open,

  closeDialog,

  onSuccess,

  Checklist,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (Checklist) {
      setForm({
        id: Checklist.id || null,

        itemName: Checklist.itemName || "",

        description: Checklist.description || "",

        status: Checklist.status ? "true" : "false",

        makeGlobal: Checklist.makeGlobal ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
  }, [open, Checklist]);

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

    const itemName = form.itemName?.trim() || "";

    if (!itemName) {
      newErrors.itemName = "Item Name is required.";
    } else if (itemName.length > 255) {
      newErrors.itemName = "Item Name must not exceed 255 characters.";
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
      id: form.id,

      itemName: form.itemName.trim(),

      description: form.description.trim() || null,

      status: form.status === "true",

      makeGlobal: form.makeGlobal === "true",
    };

    try {
      const response = await fetch("/api/hr/Checklist", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(checklistData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update checklist.");
      }

      console.log("Updated Checklist:", result.data);

      toast.success("checklist updated successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("checklist UPDATE ERROR:", error);

      toast.error(error.message || "Unable to update checklist.");
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
            Edit Checklist
          </DialogTitle>
          <DialogDescription>Update checklist information.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
         <DialogBody className="pt-2.5 space-y-6 ">
          {/* Item Name */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Item Name <span className="text-destructive">*</span>
            </label>

            <Input
              value={form.itemName}

              placeholder="Enter item name"

              onChange={(e) => handleChange("itemName", e.target.value)}
            />

            {errors.itemName && (
              <p className="mt-1 text-xs text-destructive">
                {errors.itemName}
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

          {/* DEFAULT */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Make Global
            </label>

            <Select
              value={form.makeGlobal}

              onValueChange={(value) => handleChange("makeGlobal", value)}
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
