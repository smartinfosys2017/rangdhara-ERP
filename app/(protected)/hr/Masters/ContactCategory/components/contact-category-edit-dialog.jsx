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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

  CategoryName: "",

  description: "",

  status: "true",

  isDefault: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function ContactCategoryEditDialog({
  open,

  closeDialog,

  onSuccess,

  ContactCategory,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (ContactCategory) {
      setForm({
        id: ContactCategory.id || null,

        CategoryName: ContactCategory.CategoryName || "",

        description: ContactCategory.description || "",

        status: ContactCategory.status ? "true" : "false",

        isDefault: ContactCategory.isDefault ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
  }, [open, ContactCategory]);

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

    const CategoryName = form.CategoryName?.trim() || "";

    if (!CategoryName) {
      newErrors.CategoryName = "ContactCategory Name is required.";
    } else if (CategoryName.length > 255) {
      newErrors.CategoryName = "ContactCategory Name must not exceed 255 characters.";
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

    const ContactCategoryData = {
      id: form.id,

      CategoryName: form.CategoryName.trim(),

      description: form.description.trim() || null,

      status: form.status === "true",

      isDefault: form.isDefault === "true",
    };

    try {
      const response = await fetch("/api/hr/ContactCategory", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(ContactCategoryData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update ContactCategory.");
      }

      console.log("Updated ContactCategory:", result.data);

      toast.success("ContactCategory updated successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("ContactCategory UPDATE ERROR:", error);

      toast.error(error.message || "Unable to update ContactCategory.");
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
            Edit ContactCategory
          </DialogTitle>
          <DialogDescription>Update ContactCategory information.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
         <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
          {/* ContactCategory Name */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              ContactCategory Name <span className="text-destructive">*</span>
            </label>

            <Input
              value={form.CategoryName}

              placeholder="Enter ContactCategory name"

              onChange={(e) => handleChange("CategoryName", e.target.value)}
            />

            {errors.CategoryName && (
              <p className="mt-1 text-xs text-destructive">
                {errors.CategoryName}
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
              Default Group
            </label>

            <Select
              value={form.isDefault}

              onValueChange={(value) => handleChange("isDefault", value)}
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
