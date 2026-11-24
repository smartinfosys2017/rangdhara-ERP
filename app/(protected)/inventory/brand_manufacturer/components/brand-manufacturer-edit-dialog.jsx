
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
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,
  brandName: "",
  manufacturerName: "",
  websiteURL: "https://",
  description: "",
  status: "true",
};

// =======================================================
// URL HELPER
// =======================================================

const normalizeWebsiteURL = (value) => {
  const url = String(value || "").trim();

  if (!url) return "https://";

  return `https://${url.replace(/^https?:\/\//i, "")}`;
};

// =======================================================
// COMPONENT
// =======================================================

export default function BrandManufacturerEditDialog({
  open,
  closeDialog,
  onSuccess,

  // Supports both old and new prop names.
  ItemGroup,
  BrandManufacturer,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});

  const [customFieldDefinitions, setCustomFieldDefinitions] =
    useState([]);

  const [customFields, setCustomFields] = useState({});

  const [manufacturerManuallyEdited, setManufacturerManuallyEdited] =
    useState(false);

  const [saving, setSaving] = useState(false);

  // Use BrandManufacturer first, with ItemGroup as fallback.
  const selectedItem = BrandManufacturer ?? ItemGroup ?? null;

  // =======================================================
  // LOAD SELECTED RECORD
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (selectedItem) {
      const brandName = selectedItem.brandName || "";
      const manufacturerName =
        selectedItem.manufacturerName || "";

      setForm({
        id: selectedItem.id || null,
        brandName,
        manufacturerName,
        websiteURL: normalizeWebsiteURL(
          selectedItem.websiteURL,
        ),
        description: selectedItem.description || "",
        status: selectedItem.status === false ? "false" : "true",
      });

      setManufacturerManuallyEdited(
        manufacturerName.trim() !== brandName.trim(),
      );

      setCustomFields(selectedItem.customFields ?? {});
      setCustomFieldDefinitions([]);
    } else {
      setForm({ ...EMPTY_FORM });
      setCustomFields({});
      setCustomFieldDefinitions([]);
      setManufacturerManuallyEdited(false);
    }

    setErrors({});
  }, [open, selectedItem]);

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
  // BRAND NAME CHANGE
  // =======================================================

  const handleBrandNameChange = (value) => {
    setForm((prev) => ({
      ...prev,
      brandName: value,
      ...(!manufacturerManuallyEdited
        ? { manufacturerName: value }
        : {}),
    }));

    setErrors((prev) => ({
      ...prev,
      brandName: "",
      ...(!manufacturerManuallyEdited
        ? { manufacturerName: "" }
        : {}),
    }));
  };

  // =======================================================
  // MANUFACTURER NAME CHANGE
  // =======================================================

  const handleManufacturerNameChange = (value) => {
    setManufacturerManuallyEdited(true);
    handleChange("manufacturerName", value);
  };

  // =======================================================
  // WEBSITE URL CHANGE
  // =======================================================

  const handleWebsiteChange = (value) => {
    const cleanValue = value.replace(/^https?:\/\//i, "");

    handleChange(
      "websiteURL",
      cleanValue ? `https://${cleanValue}` : "https://",
    );
  };

  // =======================================================
  // VALIDATION
  // =======================================================

  const validate = () => {
    const newErrors = {};

    const brandName = form.brandName?.trim() || "";
    const manufacturerName =
      form.manufacturerName?.trim() || "";

    const websiteURL = form.websiteURL?.trim() || "";

    if (!form.id) {
      newErrors.id = "Brand/Manufacturer ID is missing.";
    }

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

    // Website URL is optional.
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
  // SAVE / UPDATE
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

    const websiteURL = form.websiteURL.trim();

    const brandManufacturerData = {
      id: form.id,
      brandName: form.brandName.trim(),
      manufacturerName: form.manufacturerName.trim(),

      // Website URL is optional.
      websiteURL:
        !websiteURL || websiteURL === "https://"
          ? null
          : websiteURL,

      description: form.description.trim() || null,
      status: form.status === "true",
      customFields: customFields ?? {},
    };

    try {
      setSaving(true);

      const response = await fetch(
        "/api/inventory/brand_manufacturer",
        {
          method: "PUT",
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
            "Failed to update brand/manufacturer.",
        );
      }

      showSuccessToast(
        "Brand/Manufacturer updated successfully.",
      );

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error(
        "Brand/Manufacturer UPDATE ERROR:",
        error,
      );

      showErrorToast(
        error.message ||
          "Failed to update brand/manufacturer.",
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
    setForm({ ...EMPTY_FORM });
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
        if (!value) handleClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-hidden">
        <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Edit Brand/Manufacturer
            </DialogTitle>

            <DialogDescription>
              Update brand/manufacturer information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-full max-h-[90vh] min-h-0 grow">
            <DialogBody className="space-y-6 px-0 pt-0">

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
                  disabled={saving}
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
                  disabled={saving}
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
                  Website URL{" "}
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
                    disabled={saving}
                    onChange={(e) =>
                      handleWebsiteChange(e.target.value)
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
                  value={form.description}
                  placeholder="Enter description"
                  disabled={saving}
                  onChange={(e) =>
                    handleChange("description", e.target.value)
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
                  disabled={saving}
                  onValueChange={(value) =>
                    handleChange("status", value)
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
              onClick={handleSave}
              disabled={!form.id || saving}
            >
              {saving ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
