"use client";

import { useState, useEffect } from "react";

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
// DEFAULT FORM
// =======================================================

const DEFAULT_FORM = {
  ProductType: "",

  Description: "",

  status: "true",

  isDefault: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function ProductTypeAddDialog({
  open,

  closeDialog,

  onSuccess,

  item = null,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // LOAD EDIT DATA
  // =======================================================

  useEffect(() => {
    if (item) {
      setForm({
        ProductType: item.ProductType || "",

        Description: item.Description || "",

        status: item.status ? "true" : "false",

        isDefault: item.isDefault ? "true" : "false",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [item, open]);

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

    const ProductType = form.ProductType?.trim() || "";
    const Description = form.Description?.trim() || "";

    if (!ProductType) {
      newErrors.ProductType = "item type is required.";
    } else if (ProductType.length > 255) {
      newErrors.ProductType = "Item Type must not exceed 255 characters.";
    }

    if (!Description) {
      newErrors.Description = "item description is required.";
    } else if (Description.length > 255) {
      newErrors.Description =
        "Item Description must not exceed 255 characters.";
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

    const ProductTypeData = {
      id: item?.id || null,

      ProductType: form.ProductType.trim(),

      Description: form.Description.trim() || null,

      status: form.status === "true",

      isDefault: form.isDefault === "true",
    };

    try {
      const response = await fetch("/api/inventory/product-type", {
        method: item ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(ProductTypeData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Item Type save failed.");
      }

      toast.success(
        item
          ? "Item Type updated successfully."
          : "Item Type added successfully.",
      );

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("Item TYPE ERROR:", error);

      toast.error(error.message || "Something went wrong.");
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setErrors({});

    setForm(DEFAULT_FORM);

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
              {item ? "Edit Item Type" : "Add Item Type"}
            </DialogTitle>

            <DialogDescription>
              {item
                ? "Update item type information."
                : "Create a new item type."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* Item TYPE */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Item Type<span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.ProductType}

                  placeholder="Enter item type"

                  onChange={(e) => updateField("ProductType", e.target.value)}
                />

                {errors.ProductType && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.ProductType}
                  </p>
                )}
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                  <span className="text-destructive">*</span>
                </label>

                <Textarea
                  name="Description"
                  rows={4}
                  maxLength={255}
                  placeholder="Enter description"
                  value={form.Description}
                  onChange={(e) => updateField("Description", e.target.value)}
                  aria-invalid={!!errors.Description}
                  className={
                    errors.Description
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />

                {errors.Description && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Description}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  {form.Description.length}/255 characters
                </p>
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

              {/* DEFAULT */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Default Item Type
                </label>

                <Select
                  value={form.isDefault}

                  onValueChange={(value) => updateField("isDefault", value)}
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
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
