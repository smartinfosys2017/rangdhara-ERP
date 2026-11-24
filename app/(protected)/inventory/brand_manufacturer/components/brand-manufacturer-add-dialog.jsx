
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";

import BrandManufacturerCustomFields, {
  validateRequiredCustomFields,
} from "../../custom-fields/import-custom-fields";

// =======================================================
// TOAST HELPERS
// =======================================================

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

// =======================================================
// DEFAULT FORM
// =======================================================

const DEFAULT_FORM = {
  brandName: "",
  manufacturerName: "",
  websiteURL: "https://",
  description: "",
  status: "true",
};

// =======================================================
// COMPONENT
// =======================================================

export default function BrandManufacturerAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(item && {
      brandName: item.brandName || "",
      manufacturerName: item.manufacturerName || "",
      websiteURL: item.websiteURL || "https://",
      description: item.description || "",
      status: item.status ? "true" : "false",
    }),
  }));

  const [manufacturerManuallyEdited, setManufacturerManuallyEdited] =
    useState(Boolean(item?.manufacturerName));

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

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
  // BRAND NAME CHANGE
  // AUTO COPY TO MANUFACTURER NAME
  // =======================================================

  const handleBrandNameChange = (value) => {
    setForm((prev) => ({
      ...prev,
      brandName: value,
      ...(!manufacturerManuallyEdited && {
        manufacturerName: value,
      }),
    }));

    setErrors((prev) => ({
      ...prev,
      brandName: "",
      ...(!manufacturerManuallyEdited && {
        manufacturerName: "",
      }),
    }));
  };

  // =======================================================
  // MANUFACTURER NAME CHANGE
  // =======================================================

  const handleManufacturerNameChange = (value) => {
    setManufacturerManuallyEdited(true);
    updateField("manufacturerName", value);
  };

  // =======================================================
  // VALIDATION
  // =======================================================

  const validate = () => {
    const newErrors = {};

    const brandName = form.brandName?.trim() || "";
    const manufacturerName = form.manufacturerName?.trim() || "";
    const websiteURL = form.websiteURL?.trim() || "";

    if (!brandName) {
      newErrors.brandName = "Brand name is required.";
    } else if (brandName.length > 255) {
      newErrors.brandName =
        "Brand name must not exceed 255 characters.";
    }

    if (!manufacturerName) {
      newErrors.manufacturerName =
        "Manufacturer name is required.";
    } else if (manufacturerName.length > 255) {
      newErrors.manufacturerName =
        "Manufacturer name must not exceed 255 characters.";
    }

    // WEBSITE URL - OPTIONAL

    if (websiteURL && websiteURL !== "https://") {
      if (websiteURL.length > 255) {
        newErrors.websiteURL =
          "Website URL must not exceed 255 characters.";
      } else {
        try {
          const parsedURL = new URL(websiteURL);

          if (
            !["http:", "https:"].includes(parsedURL.protocol) ||
            !parsedURL.hostname.includes(".")
          ) {
            throw new Error("Invalid URL");
          }
        } catch {
          newErrors.websiteURL =
            "Please enter a valid website URL.";
        }
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showErrorToast(
        "Please check the required fields and character limits.",
      );
      return false;
    }

    return true;
  };

  // =======================================================
  // SAVE
  // =======================================================

  const handleSave = async () => {
    if (saving) return;

    if (!validate()) return;

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

    const brandManufacturerData = {
      brandName: form.brandName.trim(),
      manufacturerName: form.manufacturerName.trim(),
      websiteURL: form.websiteURL.trim() === "https://"  ? null : form.websiteURL.trim() || null,
      description: form.description.trim() || null,
      status: form.status === "true",
      customFields: customFields ?? {},
    };

    try {
      setSaving(true);

      const response = await fetch(
        "/api/inventory/brand_manufacturer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(brandManufacturerData),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Failed to create brand/manufacturer.",
        );
      }

      showSuccessToast(
        "Brand/Manufacturer added successfully.",
      );

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error(
        "Brand/Manufacturer CREATE ERROR:",
        error,
      );

      showErrorToast(
        error.message ||
        "Failed to create brand/manufacturer.",
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    if (saving) return;

    setErrors({});
    setForm({ ...DEFAULT_FORM });
    setCustomFields({});
    setCustomFieldDefinitions([]);
    setManufacturerManuallyEdited(false);

    closeDialog?.();
  };

  // =======================================================
  // UI
  // =======================================================

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
              {item
                ? "Edit Brand/Manufacturer"
                : "Add Brand/Manufacturer"}
            </DialogTitle>

            <DialogDescription>
              {item
                ? "Update brand/manufacturer information."
                : "Create a new brand/manufacturer."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* BRAND NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Brand Name{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.brandName}
                  placeholder="Enter brand name"
                  maxLength={255}
                  onChange={(e) =>
                    handleBrandNameChange(e.target.value)
                  }
                />

                {errors.brandName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.brandName}
                  </p>
                )}
              </div>

              {/* MANUFACTURER NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Manufacturer Name{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.manufacturerName}
                  placeholder="Enter manufacturer name"
                  maxLength={255}
                  onChange={(e) =>
                    handleManufacturerNameChange(e.target.value)
                  }
                />

                {errors.manufacturerName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.manufacturerName}
                  </p>
                )}
              </div>

              {/* WEBSITE URL - OPTIONAL */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Website URL
                </label>

                <div className="flex w-full">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    https://
                  </span>

                  <Input
                    type="text"
                    value={form.websiteURL.replace(/^https?:\/\//i, "")}
                    placeholder="example.com"
                    maxLength={248}
                    className="rounded-l-none"
                    onChange={(e) =>
                      updateField(
                        "websiteURL",
                        `https://${e.target.value.replace(/^https?:\/\//i, "")}`,
                      )
                    }
                  />
                </div>

                {errors.websiteURL && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.websiteURL}
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
                  placeholder="Enter description"
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                />
              </div>

              {/* STATUS */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Status{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    updateField("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">
                      Active
                    </SelectItem>
                    <SelectItem value="false">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CUSTOM FIELDS */}

              <div className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-base font-semibold">
                    Custom Fields
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Additional brand/manufacturer information.
                  </p>
                </div>

                <BrandManufacturerCustomFields
                  values={customFields}
                  onChange={setCustomFields}
                  onFieldsLoaded={(loadedFields) => {
                    setCustomFieldDefinitions(loadedFields);
                  }}
                />
              </div>
            </DialogBody>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={handleClose}
            >
              Close
            </Button>

            <Button
              type="button"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}