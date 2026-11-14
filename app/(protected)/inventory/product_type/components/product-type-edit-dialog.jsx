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

  ProductType: "",

  Description: "",

  status: "true",

  isDefault: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function ProductTypeEditDialog({
  open,

  closeDialog,

  onSuccess,

  ProductType,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (ProductType) {
      setForm({
        id: ProductType.id || null,

        ProductType: ProductType.ProductType || "",

        Description: ProductType.Description || "",

        status: ProductType.status ? "true" : "false",

        isDefault: ProductType.isDefault ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
  }, [open, ProductType]);

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

    const ProductType = form.ProductType?.trim() || "";
    const Description = form.Description?.trim() || "";

    if (!ProductType) {
      newErrors.ProductType = "Item Condition is required.";
    } else if (ProductType.length > 255) {
      newErrors.ProductType = "Item Condition must not exceed 255 characters.";
    }

    if (!Description) {
      newErrors.Description = "Item Description is required.";
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
      id: form.id,

      ProductType: form.ProductType.trim(),

      Description: form.Description.trim() || null,

      status: form.status === "true",

      isDefault: form.isDefault === "true",
    };

    try {
      const response = await fetch(
        "/api/inventory/product-type",

        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(ProductTypeData),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update Item Condition.");
      }

      toast.success("Item Condition updated successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("Item Condition UPDATE ERROR:", error);

      toast.error(error.message || "Unable to update Item Condition.");
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
              Edit Item Condition
            </DialogTitle>

            <DialogDescription>
              Update Item Condition information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* Item Condition */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Item Condition<span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.ProductType}

                  placeholder="Enter Item Condition"

                  onChange={(e) => handleChange("ProductType", e.target.value)}
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
                <label className="mb-2 block text-sm font-medium">Status <span className="text-destructive">*</span></label>

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
                  Default Item Condition <span className="text-destructive">*</span>
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
