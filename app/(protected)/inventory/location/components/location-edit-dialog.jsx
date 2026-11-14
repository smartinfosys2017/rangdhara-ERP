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

import { ScrollArea } from "@/components/ui/scroll-area";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

const EMPTY_FORM = {
  id: null,
  locationName: "",
  locationCode: "",
  status: "true",
};

export default function LocationEditDialog({
  open,
  closeDialog,
  onSuccess,
  Location,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // LOAD LOCATION DATA
  useEffect(() => {
    if (!open) return;

    if (Location) {
      setForm({
        id: Location.id || null,
        locationName: Location.locationName || "",
        locationCode: Location.locationCode || "",
        status: Location.status ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
  }, [open, Location]);

  // CHANGE FIELD
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

  // VALIDATION
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
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive" close={false}>
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>
              Please check the required fields and character limits.
            </AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );

      return false;
    }

    return true;
  };

  // SAVE
  const handleSave = async () => {
    if (!validate()) return;

    if (!form.id) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive" close={false}>
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>Location ID is missing.</AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );
      return;
    }

    const locationData = {
      id: form.id,
      locationName: form.locationName.trim(),
      locationCode: form.locationCode.trim(),
      status: form.status === "true",
    };

    try {
      setSaving(true);

      const response = await fetch("/api/inventory/location", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update location.");
      }

      toast.custom(
        () => (
          <Alert variant="mono" icon="success" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Location updated successfully.</AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );

      onSuccess?.(result.data);
      handleClose();
    } catch (error) {
      console.error("Location UPDATE ERROR:", error);

      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive" close={false}>
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );
    } finally {
      setSaving(false);
    }
  };

  // CLOSE
  const handleClose = () => {
    setErrors({});
    closeDialog?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent className="max-h-[75vh] overflow-y-auto">
        <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update location information.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0">
            <DialogBody className="space-y-6 px-0 pt-0">
              {/* LOCATION CODE */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Location Code <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.locationCode}
                  maxLength={25}
                  readOnly
                  placeholder="Enter location code"
                  onChange={(e) => handleChange("locationCode", e.target.value)}
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
                  maxLength={255}
                  placeholder="Enter location name"
                  onChange={(e) => handleChange("locationName", e.target.value)}
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
                  onValueChange={(value) => handleChange("status", value)}
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
          </ScrollArea>

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
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}