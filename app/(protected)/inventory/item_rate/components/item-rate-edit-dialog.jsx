
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
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

import { apiFetch } from "@/lib/api";
import ItemRateCustomFields, {
  validateRequiredCustomFields,
} from "../../custom-fields/import-custom-fields";
export default function ItemRateEditDialog({
  open,
  closeDialog,
  ItemRate,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [itemGroups, setItemGroups] = useState([]);
  const [itemMasters, setItemMasters] = useState([]);
  const [brands, setBrands] = useState([]);
  const [itemConditions, setItemConditions] = useState([]);
  const [units, setUnits] = useState([]);

  const [errors, setErrors] = useState({});
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFieldsReady, setCustomFieldsReady] = useState(false);
  const [customFields, setCustomFields] = useState({});
  const [form, setForm] = useState({
    id: "",
    ItemGroupid: "",
    ItemMasterid: "",
    BrandManufacturerid: "",
    ItemConditionid: "",
    ApplicableFromDate: "",
    ApplicableToDate: "",
    Rate: "",
    Unitid: "",
    Comments: "",
  });

  // ============================
  // TOAST HELPERS
  // ============================

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

  // ============================
  // DATE FORMAT
  // ============================

  const formatDateForInput = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // ============================
  // LOAD DROPDOWNS
  // ============================

  useEffect(() => {
    if (open) {
      loadDropdowns();
    }
  }, [open]);

  const loadDropdowns = async () => {
    try {
      setDropdownLoading(true);

      const [
        groupRes,
        itemRes,
        brandRes,
        conditionRes,
        unitRes,
      ] = await Promise.all([
        apiFetch("/api/inventory/item-groups?limit=100&status=active"),
        apiFetch("/api/inventory/item-master?limit=100&status=active"),
        apiFetch("/api/inventory/brand_manufacturer?limit=100&status=active"),
        apiFetch("/api/inventory/product-type?limit=100&status=active"),
        apiFetch("/api/inventory/unit?limit=100&status=active"),
      ]);

      const [
        groupData,
        itemData,
        brandData,
        conditionData,
        unitData,
      ] = await Promise.all([
        groupRes.json(),
        itemRes.json(),
        brandRes.json(),
        conditionRes.json(),
        unitRes.json(),
      ]);

      if (!groupRes.ok || !groupData.success) {
        throw new Error(groupData.message || "Failed to load item groups.");
      }

      if (!itemRes.ok || !itemData.success) {
        throw new Error(itemData.message || "Failed to load items.");
      }

      if (!brandRes.ok || !brandData.success) {
        throw new Error(brandData.message || "Failed to load brands.");
      }

      if (!conditionRes.ok || !conditionData.success) {
        throw new Error(
          conditionData.message || "Failed to load item conditions.",
        );
      }

      if (!unitRes.ok || !unitData.success) {
        throw new Error(unitData.message || "Failed to load units.");
      }

      const activeRecords = (records) =>
        (Array.isArray(records) ? records : []).filter(
          (item) =>
            (item.status === true ||
              item.status === "true" ||
              item.status === 1) &&
            !item.deletedAt,
        );

      setItemGroups(activeRecords(groupData.data));
      setItemMasters(activeRecords(itemData.data));
      setBrands(activeRecords(brandData.data));
      setItemConditions(activeRecords(conditionData.data));
      setUnits(activeRecords(unitData.data));
    } catch (error) {
      console.error("LOAD ITEM RATE DROPDOWNS ERROR:", error);
      showErrorToast(error.message || "Failed to load dropdown data.");
    } finally {
      setDropdownLoading(false);
    }
  };

  // ============================
  // LOAD ITEM RATE DATA
  // ============================

  useEffect(() => {
    if (!open || !ItemRate) return;

    setForm({
      id: ItemRate.id || "",
      ItemGroupid: String(ItemRate.ItemGroupid || ""),
      ItemMasterid: String(ItemRate.ItemMasterid || ""),
      BrandManufacturerid: String(ItemRate.BrandManufacturerid || ""),
      ItemConditionid: String(ItemRate.ItemConditionid || ""),
      ApplicableFromDate: formatDateForInput(
        ItemRate.ApplicableFromDate,
      ),
      ApplicableToDate: formatDateForInput(
        ItemRate.ApplicableToDate,
      ),
      Rate: ItemRate.Rate ?? "",
      Unitid: String(ItemRate.Unitid || ""),
      Comments: ItemRate.Comments || "",
    });
    setCustomFields(ItemRate?.customFields ?? {});
    setCustomFieldDefinitions([]);
    setCustomFieldsReady(false);
    setErrors({});
  }, [open, ItemRate]);

  // ============================
  // UPDATE FIELD
  // ============================

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  // ============================
  // VALIDATION
  // ============================

  const validate = () => {
    const newErrors = {};

    if (!form.ItemGroupid) {
      newErrors.ItemGroupid = "Item Group is required.";
    }

    if (!form.ItemMasterid) {
      newErrors.ItemMasterid = "Item Name is required.";
    }

    if (!form.BrandManufacturerid) {
      newErrors.BrandManufacturerid =
        "Brand / Manufacturer is required.";
    }

    if (!form.ItemConditionid) {
      newErrors.ItemConditionid = "Item Condition is required.";
    }

    if (!form.ApplicableFromDate) {
      newErrors.ApplicableFromDate =
        "Applicable From Date is required.";
    }

    if (
      form.ApplicableToDate &&
      form.ApplicableFromDate &&
      form.ApplicableToDate < form.ApplicableFromDate
    ) {
      newErrors.ApplicableToDate =
        "Applicable To Date cannot be before Applicable From Date.";
    }

    if (form.Rate === "" || Number(form.Rate) <= 0) {
      newErrors.Rate = "Rate must be greater than zero.";
    }

    if (!Number.isFinite(Number(form.Rate))) {
      newErrors.Rate = "Please enter a valid rate.";
    }

    if (!form.Unitid) {
      newErrors.Unitid = "Unit is required.";
    }

    if ((form.Comments || "").trim().length > 255) {
      newErrors.Comments = "Comments must not exceed 255 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showErrorToast("Please check the required fields.");
      return false;
    }

    return true;
  };

  // ============================
  // UPDATE ITEM RATE
  // ============================

  const handleSubmit = async () => {
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
    try {
      setLoading(true);

      const payload = {
        id: form.id,
        ItemGroupid: form.ItemGroupid,
        ItemMasterid: form.ItemMasterid,
        BrandManufacturerid: form.BrandManufacturerid,
        ItemConditionid: form.ItemConditionid,
        ApplicableFromDate: form.ApplicableFromDate,
        ApplicableToDate: form.ApplicableToDate || null,
        Rate: Number(form.Rate),
        Unitid: form.Unitid,
        Comments: form.Comments.trim() || null,
        customFields: customFields ?? {},
      };

      const response = await apiFetch("/api/inventory/item-rate", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update item rate.");
      }

      showSuccessToast("Item rate updated successfully.");

      onSuccess?.(result.data);
      closeDialog?.();
    } catch (error) {
      console.error("UPDATE ITEM RATE ERROR:", error);

      showErrorToast(
        error.message || "Something went wrong while updating item rate.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // BRAND LABEL
  // ============================

  const getBrandLabel = (brand) => {
    const brandName =
      brand.brandName ||
      brand.BrandName ||
      "";

    const manufacturerName =
      brand.manufacturerName ||
      brand.ManufacturerName ||
      "";

    if (brandName && manufacturerName) {
      return `${brandName} / ${manufacturerName}`;
    }

    return (
      brandName ||
      manufacturerName ||
      brand.name ||
      "Unnamed Brand"
    );
  };

  // ============================
  // RENDER
  // ============================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeDialog?.();
      }}
    >
      <DialogContent>
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Item Rate</DialogTitle>
            <DialogDescription>
              Update item rate details.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* ITEM GROUP */}

              <div>
                <label className="text-sm font-medium">
                  Item Group <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.ItemGroupid}
                  onValueChange={(value) =>
                    updateField("ItemGroupid", value)
                  }
                  disabled={dropdownLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Item Group" />
                  </SelectTrigger>

                  <SelectContent>
                    {itemGroups.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.groupName || item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.ItemGroupid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.ItemGroupid}
                  </p>
                )}
              </div>

              {/* ITEM MASTER */}

              <div>
                <label className="text-sm font-medium">
                  Item Name <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.ItemMasterid}
                  onValueChange={(value) =>
                    updateField("ItemMasterid", value)
                  }
                  disabled={dropdownLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Item" />
                  </SelectTrigger>

                  <SelectContent>
                    {itemMasters.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.ItemName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.ItemMasterid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.ItemMasterid}
                  </p>
                )}
              </div>

              {/* BRAND / MANUFACTURER */}

              <div>
                <label className="text-sm font-medium">
                  Brand / Manufacturer{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.BrandManufacturerid}
                  onValueChange={(value) =>
                    updateField("BrandManufacturerid", value)
                  }
                  disabled={dropdownLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Brand / Manufacturer" />
                  </SelectTrigger>

                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={String(brand.id)}>
                        {getBrandLabel(brand)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.BrandManufacturerid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.BrandManufacturerid}
                  </p>
                )}
              </div>

              {/* ITEM CONDITION */}

              <div>
                <label className="text-sm font-medium">
                  Item Condition <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.ItemConditionid}
                  onValueChange={(value) =>
                    updateField("ItemConditionid", value)
                  }
                  disabled={dropdownLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Item Condition" />
                  </SelectTrigger>

                  <SelectContent>
                    {itemConditions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.ProductType || item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.ItemConditionid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.ItemConditionid}
                  </p>
                )}
              </div>

              {/* APPLICABLE FROM DATE */}

              <div>
                <label className="text-sm font-medium">
                  Applicable From Date{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Input
                  type="date"
                  value={form.ApplicableFromDate}
                  onChange={(e) =>
                    updateField("ApplicableFromDate", e.target.value)
                  }
                  aria-invalid={!!errors.ApplicableFromDate}
                />

                {errors.ApplicableFromDate && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.ApplicableFromDate}
                  </p>
                )}
              </div>

              {/* APPLICABLE TO DATE */}

              <div>
                <label className="text-sm font-medium">
                  Applicable To Date
                </label>

                <Input
                  type="date"
                  value={form.ApplicableToDate}
                  min={form.ApplicableFromDate || undefined}
                  onChange={(e) =>
                    updateField("ApplicableToDate", e.target.value)
                  }
                  aria-invalid={!!errors.ApplicableToDate}
                />

                {errors.ApplicableToDate && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.ApplicableToDate}
                  </p>
                )}
              </div>

              {/* RATE */}

              <div>
                <label className="text-sm font-medium">
                  Rate (₹) <span className="text-destructive">*</span>
                </label>

                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.Rate}
                  onChange={(e) => updateField("Rate", e.target.value)}
                  placeholder="Enter Rate"
                  aria-invalid={!!errors.Rate}
                />

                {errors.Rate && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Rate}
                  </p>
                )}
              </div>

              {/* UNIT */}

              <div>
                <label className="text-sm font-medium">
                  Unit <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.Unitid}
                  onValueChange={(value) =>
                    updateField("Unitid", value)
                  }
                  disabled={dropdownLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>

                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={String(unit.id)}>
                        {unit.unitName} ({unit.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.Unitid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Unitid}
                  </p>
                )}
              </div>

              {/* COMMENTS */}

              <div>
                <label className="text-sm font-medium">
                  Comments
                </label>

                <Textarea
                  value={form.Comments}
                  maxLength={255}
                  onChange={(e) =>
                    updateField("Comments", e.target.value)
                  }
                  placeholder="Enter comments"
                  rows={4}
                  aria-invalid={!!errors.Comments}
                />

                {errors.Comments && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Comments}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  {form.Comments.length}/255 characters
                </p>
              </div>
              {/* CUSTOM FIELDS */}

              <div className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-base font-semibold">
                    Custom Fields
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Additional Item information.
                  </p>
                </div>

                <ItemRateCustomFields
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
              variant="outline"
              onClick={closeDialog}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              disabled={loading || dropdownLoading}
              onClick={handleSubmit}
            >
              {loading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
