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

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import LocationCustomFields, { validateRequiredCustomFields, } from "../../custom-fields/import-custom-fields";
// ======================================================
// HELPERS
// ======================================================
const showSuccessToast = (message) => {
  toast.custom(
    () => (
      <Alert variant="mono" icon="success">
        <AlertIcon>
          <RiCheckboxCircleFill />
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: "top-center" },
  );
};

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close={true}
        onClose={() => toast.dismiss(t)}
      >
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: "top-center" },
  );
};
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
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  const [customFieldsReady, setCustomFieldsReady] = useState(false);
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
      newErrors.locationName = "Warehouse name is required.";
    } else if (locationName.length > 255) {
      newErrors.locationName = "Warehouse name must not exceed 255 characters.";
    }

    if (!locationCode) {
      newErrors.locationCode = "Warehouse code is required.";
    } else if (locationCode.length > 25) {
      newErrors.locationCode = "Warehouse code must not exceed 25 characters.";
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
  // SAVE Warehouse
  // ======================================================

  const handleSave = async () => {
    if (saving || !validate()) return;
    const missingCustomFields = validateRequiredCustomFields(
      customFieldDefinitions,
      customFields,
    );

    if (missingCustomFields.length > 0) {
      showErrorToast(
        `Please fill in required custom fields: ${missingCustomFields.join(", ")}`,
      );
      return;
    }
    const locationData = {
      locationName: form.locationName.trim(),
      locationCode: form.locationCode.trim(),
      status: form.status === "true",
      customFields: customFields ?? {},
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
          result.message || `Failed to ${item ? "update" : "create"} warehouse.`,
        );
      }

      showToast(
        "success",
        item
          ? "Warehouse updated successfully."
          : "Warehouse added successfully.",
      );

      onSuccess?.(result.data);
      handleClose();
    } catch (error) {
      console.error("Warehouse SAVE ERROR:", error);

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
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="mx-auto flex w-[calc(100%-2rem)] max-w-[486px] max-h-[90vh] flex-col gap-0 overflow-hidden  px-4 sm:px-6 md:px-10 " variant="fullscreen">
        <DialogHeader>
          <DialogTitle>Add Warehouse</DialogTitle>
          <DialogDescription>
            Create a new warehouse.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 py-0 mb-5 ps-0 pe-3 -me-7">
          <DialogBody>
            {/* Warehouse CODE */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Warehouse Code <span className="text-destructive">*</span>
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

            {/* Warehouse NAME */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Warehouse Name <span className="text-destructive">*</span>
              </label>

              <Input
                value={form.locationName}
                placeholder="Enter warehouse name"
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
            {/* CUSTOM FIELDS */}

            <div className="space-y-4 border-t pt-5">
              <div>
                <h3 className="text-base font-semibold">Custom Fields</h3>

                <p className="text-sm text-muted-foreground">
                  Additional warehouse information.
                </p>
              </div>

              <LocationCustomFields
                values={customFields}
                onChange={setCustomFields}
                onFieldsLoaded={(loadedFields) => {
                  setCustomFieldDefinitions(loadedFields);
                  setCustomFieldsReady(true);
                }}
              />
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
            {saving ? "Saving..." : item ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  );
}