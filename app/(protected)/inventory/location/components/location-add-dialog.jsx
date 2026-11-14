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

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

// ======================================================
// HELPERS
// ======================================================

const generateLocationCode = () => {
  return `LOC-${crypto
    .randomUUID()
    .replace(/-/g, "")
    .substring(0, 8)
    .toUpperCase()}`;
};

const getDefaultForm = () => ({
  locationName: "",
  locationCode: generateLocationCode(),
  status: "true",
});

const showToast = (type, message) => {
  toast.custom(
    () => (
      <Alert
        variant="mono"
        icon={type === "success" ? "success" : "destructive"}
        close={false}
      >
        <AlertIcon>
          {type === "success" ? (
            <RiCheckboxCircleFill />
          ) : (
            <RiErrorWarningFill />
          )}
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: "top-center" },
  );
};

// ======================================================
// COMPONENT
// ======================================================

export default function LocationAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const [form, setForm] = useState(getDefaultForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ======================================================
  // INITIALIZE FORM
  // ======================================================

  useEffect(() => {
    if (!open) return;

    setForm({
      locationName: item?.locationName || "",
      locationCode: item?.locationCode || generateLocationCode(),
      status: item ? (item.status ? "true" : "false") : "true",
    });

    setErrors({});
  }, [open, item]);

  // ======================================================
  // UPDATE FIELD
  // ======================================================

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

  // ======================================================
  // VALIDATION
  // ======================================================

  const validate = () => {
    const newErrors = {};

    const locationName = form.locationName.trim();
    const locationCode = form.locationCode.trim();

    if (!locationName) {
      newErrors.locationName = "Location name is required.";
    } else if (locationName.length > 255) {
      newErrors.locationName = "Location name must not exceed 255 characters.";
    }

    if (!locationCode) {
      newErrors.locationCode = "Location code is required.";
    } else if (locationCode.length > 25) {
      newErrors.locationCode = "Location code must not exceed 25 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast(
        "error",
        "Please check the required fields and character limits.",
      );

      return false;
    }

    return true;
  };

  // ======================================================
  // SAVE LOCATION
  // ======================================================

  const handleSave = async () => {
    if (saving || !validate()) return;

    const locationData = {
      locationName: form.locationName.trim(),
      locationCode: form.locationCode.trim(),
      status: form.status === "true",
    };

    try {
      setSaving(true);

      const response = await fetch("/api/inventory/location", {
        method: item ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          item
            ? {
                id: item.id,
                ...locationData,
              }
            : locationData,
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `Failed to ${item ? "update" : "create"} location.`,
        );
      }

      showToast(
        "success",
        item
          ? "Location updated successfully."
          : "Location added successfully.",
      );

      onSuccess?.(result.data);
      handleClose();
    } catch (error) {
      console.error("LOCATION SAVE ERROR:", error);

      showToast("error", error.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // CLOSE DIALOG
  // ======================================================

  const handleClose = () => {
    if (saving) return;

    setErrors({});
    setForm(getDefaultForm());

    closeDialog?.();
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent>
        <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{item ? "Edit Location" : "Add Location"}</DialogTitle>

            <DialogDescription>
              {item ? "Update location information." : "Create a new location."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5 pt-0">
            {/* LOCATION CODE */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Location Code <span className="text-destructive">*</span>
              </label>

              <Input
                value={form.locationCode}
                placeholder="Auto Generated"
                readOnly
                maxLength={25}
              />

              {errors.locationCode && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.locationCode}
                </p>
              )}
            </div>

            {/* LOCATION NAME */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Location Name <span className="text-destructive">*</span>
              </label>

              <Input
                value={form.locationName}
                placeholder="Enter location name"
                maxLength={255}
                onChange={(e) => updateField("locationName", e.target.value)}
              />

              {errors.locationName && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.locationName}
                </p>
              )}
            </div>

            {/* STATUS */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Status <span className="text-destructive">*</span>
              </label>

              <Select
                value={form.status}
                onValueChange={(value) => updateField("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>

                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Close
            </Button>

            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : item ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}