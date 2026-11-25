"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";

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
import { Label } from "@/components/ui/label";

import { MultiSelect } from "@/components/ui/multi-select";
import { SelectSearch } from "@/components/ui/select-search";

import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";
import ItemRateCustomFields, {
  validateRequiredCustomFields,
} from "../../custom-fields/import-custom-fields";
// ======================================================
// INITIAL FORM
// ======================================================

const initialForm = {
  ItemGroupids: [],
  ItemMasterid: "",
  BrandManufacturerid: "",
  ItemConditionid: "",
  ApplicableFromDate: "",
  ApplicableToDate: "",
  Rate: "",
  Unitid: "",
  Comments: "",
};

const createInitialForm = () => ({
  ...initialForm,
  ItemGroupids: [],
});

// ======================================================
// HELPERS
// ======================================================

const getRecords = (result) => {
  return Array.isArray(result?.data) ? result.data : [];
};

const getBrandLabel = (brand) => {
  const brandName =
    brand?.brandName ||
    brand?.BrandName ||
    "";

  const manufacturerName =
    brand?.manufacturerName ||
    brand?.ManufacturerName ||
    "";

  if (
    brandName &&
    manufacturerName &&
    brandName.toLowerCase() !== manufacturerName.toLowerCase()
  ) {
    return `${brandName} - ${manufacturerName}`;
  }

  return (
    brandName ||
    manufacturerName ||
    brand?.name ||
    `Brand #${brand?.id}`
  );
};

const getUnitLabel = (unit) => {
  if (!unit) return "";

  const name = unit.unitName || unit.name || "";
  const abbreviation = unit.abbreviation || "";

  return abbreviation
    ? `${name} (${abbreviation})`
    : name;
};

const getItemGroupId = (item) => {
  return String(
    item?.ItemGroupid ??
    item?.ItemGroupId ??
    item?.itemGroupId ??
    "",
  );
};
const getItemConditionId = (item) => {
  return String(
    item?.ItemConditionid ??
    item?.ItemConditionId ??
    item?.itemConditionId ??
    item?.itemCondition?.id ??
    item?.ItemCondition?.id ??
    "",
  );
};
const getItemUnitId = (item) => {
  return String(
    item?.Unitid ??
    item?.UnitId ??
    item?.unitId ??
    item?.unit?.id ??
    item?.Unit?.id ??
    "",
  );
};

// Get brand relationships from the selected Item.
const getItemBrandRelations = (item) => {
  return Array.isArray(item?.brands) ? item.brands : [];
};

const getItemConditionLabel = (item, itemConditions) => {
  const conditionId = getItemConditionId(item);

  const condition = itemConditions.find(
    (condition) => String(condition.id) === conditionId,
  );

  return (
    condition?.ProductType ||
    condition?.name ||
    item?.itemCondition?.ProductType ||
    item?.ItemCondition?.ProductType ||
    ""
  );
};
// ======================================================
// MAIN COMPONENT
// ======================================================

export default function ItemRateAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [form, setForm] = useState(createInitialForm);
  const [errors, setErrors] = useState({});

  const [itemGroups, setItemGroups] = useState([]);
  const [itemConditions, setItemConditions] = useState([]);
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  // ====================================================
  // TOAST HELPERS
  // ====================================================

  const showSuccessToast = useCallback((message) => {
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
  }, []);

  const showErrorToast = useCallback((message) => {
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
  }, []);

  // ====================================================
  // RESET FORM
  // ====================================================

  const resetForm = useCallback(() => {
    setForm(createInitialForm());
    setErrors({});
  }, []);

  // ====================================================
  // UPDATE FIELD
  // ====================================================

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

  // ====================================================
  // LOAD DROPDOWN DATA
  // ====================================================

  const loadDropdowns = useCallback(async () => {
    try {
      setDropdownLoading(true);

      const endpoints = [
        "/api/inventory/item-groups?limit=100&status=active",
        "/api/inventory/item-master?limit=100&status=active",
        "/api/inventory/brand_manufacturer?limit=100&status=active",
        "/api/inventory/unit?limit=100",
        "/api/inventory/product-type?limit=100&status=active",
      ];

      const responses = await Promise.all(
        endpoints.map((endpoint) => apiFetch(endpoint)),
      );

      const results = await Promise.all(
        responses.map(async (response) => {
          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(
              result.message || "Failed to load dropdown data.",
            );
          }

          return result;
        }),
      );

      setItemGroups(getRecords(results[0]));
      setItems(getRecords(results[1]));
      setBrands(getRecords(results[2]));
      setUnits(getRecords(results[3]));

      setItemConditions(
        getRecords(results[4]).filter(
          (item) => !item.deletedAt && item.status === true,
        ),
      );
    } catch (error) {
      console.error("LOAD ITEM RATE DROPDOWNS ERROR:", error);

      showErrorToast(
        error.message || "Failed to load dropdown options.",
      );
    } finally {
      setDropdownLoading(false);
    }
  }, [showErrorToast]);

  // ====================================================
  // LOAD DROPDOWNS WHEN DIALOG OPENS
  // ====================================================

  useEffect(() => {
    if (open) {
      loadDropdowns();
    }
  }, [open, loadDropdowns]);

  // ====================================================
  // ITEM GROUP OPTIONS
  // ====================================================

  const itemGroupOptions = useMemo(() => {
    return itemGroups.map((item) => ({
      label: item.groupName || item.name || `Group #${item.id}`,
      value: String(item.id),
    }));
  }, [itemGroups]);

  // ====================================================
  // FILTER ITEMS BY SELECTED GROUPS
  // ====================================================

  const filteredItems = useMemo(() => {
    if (!form.ItemGroupids.length) return [];

    return items.filter((item) =>
      form.ItemGroupids.includes(getItemGroupId(item)),
    );
  }, [items, form.ItemGroupids]);

  // ====================================================
  // ITEM OPTIONS
  // ====================================================

  const itemOptions = useMemo(() => {
    return filteredItems.map((item) => ({
      label: item.ItemName || `Item #${item.id}`,
      value: String(item.id),
    }));
  }, [filteredItems]);

  // ====================================================
  // SELECTED ITEM
  // ====================================================

  const selectedItem = useMemo(() => {
    return items.find(
      (item) => String(item.id) === String(form.ItemMasterid),
    ) || null;
  }, [items, form.ItemMasterid]);

  // ====================================================
  // FILTER BRANDS BY SELECTED ITEM
  // ====================================================

  const filteredBrands = useMemo(() => {
    if (!selectedItem) return [];

    const relations = getItemBrandRelations(selectedItem);

    const relatedBrands = relations
      .map((relation) => relation?.brand)
      .filter((brand) => brand?.id);

    // Remove duplicate brands.
    return relatedBrands.filter(
      (brand, index, self) =>
        index === self.findIndex(
          (item) => String(item.id) === String(brand.id),
        ),
    );
  }, [selectedItem]);

  // ====================================================
  // BRAND OPTIONS
  // ====================================================

  const brandOptions = useMemo(() => {
    return filteredBrands.map((brand) => ({
      label: getBrandLabel(brand),
      value: String(brand.id),
    }));
  }, [filteredBrands]);


  // ====================================================
  // AUTOMATIC UNIT
  // ====================================================

  const automaticUnitId = useMemo(() => {
    return getItemUnitId(selectedItem);
  }, [selectedItem]);

  const selectedUnit = useMemo(() => {
    return units.find(
      (unit) => String(unit.id) === String(form.Unitid),
    ) || selectedItem?.unit || selectedItem?.Unit || null;
  }, [units, form.Unitid, selectedItem]);

  const unitLabel = useMemo(() => {
    return getUnitLabel(selectedUnit);
  }, [selectedUnit]);

  // ====================================================
  // ITEM GROUP CHANGE
  // ====================================================

  const handleItemGroupsChange = (values) => {
    const selectedGroups = Array.isArray(values)
      ? values.map(String)
      : [];

    setForm((prev) => ({
      ...prev,
      ItemGroupids: selectedGroups,
      ItemMasterid: "",
      BrandManufacturerid: "",
      ItemConditionid: "",
      Unitid: "",
    }));

    setErrors((prev) => ({
      ...prev,
      ItemGroupids: "",
      ItemMasterid: "",
      BrandManufacturerid: "",
      ItemConditionid: "",
      Unitid: "",
    }));
  };
  // ====================================================
  // ITEM CHANGE
  // ====================================================

  const handleItemChange = (itemId) => {
    const selected = items.find(
      (item) => String(item.id) === String(itemId),
    );

    if (!selected) return;

    const relatedBrands = getItemBrandRelations(selected)
      .map((relation) => relation?.brand)
      .filter((brand) => brand?.id)
      .filter(
        (brand, index, self) =>
          index ===
          self.findIndex(
            (item) => String(item.id) === String(brand.id),
          ),
      );

    // Get automatic values from the selected Item.
    const selectedUnitId = getItemUnitId(selected);
    const itemConditionId = getItemConditionId(selected);

    const defaultBrandId =
      relatedBrands.length === 1
        ? String(relatedBrands[0].id)
        : "";

    setForm((prev) => ({
      ...prev,
      ItemMasterid: String(itemId),
      BrandManufacturerid: defaultBrandId,
      ItemConditionid: itemConditionId,
      Unitid: selectedUnitId,
    }));

    setErrors((prev) => ({
      ...prev,
      ItemMasterid: "",
      BrandManufacturerid: "",
      ItemConditionid: "",
      Unitid: "",
    }));
  };

  // ====================================================
  // BRAND CHANGE
  // ====================================================

  const handleBrandChange = (brandId) => {
    setForm((prev) => ({
      ...prev,
      BrandManufacturerid: String(brandId),
    }));

    setErrors((prev) => ({
      ...prev,
      BrandManufacturerid: "",
    }));
  };

  useEffect(() => {
    if (form.Unitid !== automaticUnitId) {
      setForm((prev) => ({
        ...prev,
        Unitid: automaticUnitId,
      }));
    }
  }, [automaticUnitId, form.Unitid]);

  // ====================================================
  // VALIDATION
  // ====================================================

  const validate = () => {
    const newErrors = {};

    if (!form.ItemGroupids.length) {
      newErrors.ItemGroupids = "At least one Item Group is required.";
    }

    if (!form.ItemMasterid) {
      newErrors.ItemMasterid = "Item is required.";
    }

    if (!form.BrandManufacturerid) {
      newErrors.BrandManufacturerid =
        "Brand / Manufacturer is required.";
    }

    if (!form.ItemConditionid) {
      newErrors.ItemConditionid =
        "Item Condition could not be determined from the selected Item.";
    }

    if (!form.ApplicableFromDate) {
      newErrors.ApplicableFromDate =
        "Applicable From Date is required.";
    } else if (
      Number.isNaN(new Date(form.ApplicableFromDate).getTime())
    ) {
      newErrors.ApplicableFromDate =
        "Please enter a valid Applicable From Date.";
    }

    if (
      form.ApplicableToDate &&
      Number.isNaN(new Date(form.ApplicableToDate).getTime())
    ) {
      newErrors.ApplicableToDate =
        "Please enter a valid Applicable To Date.";
    }

    if (
      form.ApplicableFromDate &&
      form.ApplicableToDate &&
      form.ApplicableToDate < form.ApplicableFromDate
    ) {
      newErrors.ApplicableToDate =
        "Applicable To Date cannot be before Applicable From Date.";
    }

    if (
      form.Rate === "" ||
      !Number.isFinite(Number(form.Rate))
    ) {
      newErrors.Rate = "Rate is required.";
    } else if (Number(form.Rate) <= 0) {
      newErrors.Rate = "Rate must be greater than zero.";
    }

    if (!form.Unitid) {
      newErrors.Unitid =
        "Unit could not be determined from the selected Item.";
    }

    if (form.Comments.length > 255) {
      newErrors.Comments =
        "Comments must not exceed 255 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showErrorToast(
        "Please check the required fields and validation errors.",
      );

      return false;
    }

    return true;
  };

  // ====================================================
  // SAVE ITEM RATE
  // ====================================================

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

      const selectedItemGroupId = getItemGroupId(selectedItem);

      const payload = {
        // Existing API expects one ItemGroupid.
        // Use the selected Item's actual group.
        ItemGroupid: selectedItemGroupId,

        ItemMasterid: form.ItemMasterid,
        BrandManufacturerid: form.BrandManufacturerid,
        ItemConditionid: form.ItemConditionid,

        ApplicableFromDate: form.ApplicableFromDate,
        ApplicableToDate: form.ApplicableToDate || null,

        Rate: Number(form.Rate),

        // Automatically populated from selected Item.
        Unitid: form.Unitid,
        customFields: customFields ?? {},
        Comments: form.Comments.trim() || null,
      };

      const response = await apiFetch(
        "/api/inventory/item-rate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create Item Rate.",
        );
      }

      showSuccessToast("Item Rate created successfully.");

      onSuccess?.(result.data);

      resetForm();
      closeDialog?.();
    } catch (error) {
      console.error("CREATE ITEM RATE ERROR:", error);

      showErrorToast(
        error.message ||
        "Something went wrong while creating Item Rate.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !loading) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">

          {/* HEADER */}

          <DialogHeader>
            <DialogTitle>Add Item Rate</DialogTitle>

            <DialogDescription>
              Add a rate for an item, brand, and condition.
            </DialogDescription>
          </DialogHeader>

          {/* FORM */}

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* ITEM GROUP MULTISELECT */}

              <div className="space-y-2">
                <Label>
                  Item Group <span className="text-destructive">*</span>
                </Label>

                <MultiSelect
                  options={itemGroupOptions}
                  value={form.ItemGroupids}
                  onValueChange={handleItemGroupsChange}
                  placeholder="Select Item Groups"
                  searchPlaceholder="Search Item Groups..."
                  className="w-full"
                  disabled={loading || dropdownLoading}
                />

                {errors.ItemGroupids && (
                  <p className="text-sm text-destructive">
                    {errors.ItemGroupids}
                  </p>
                )}
              </div>

              {/* ITEM */}

              <div className="space-y-2">
                <Label>
                  Item <span className="text-destructive">*</span>
                </Label>

                <SelectSearch
                  options={itemOptions}
                  value={form.ItemMasterid}
                  onValueChange={handleItemChange}
                  placeholder={
                    form.ItemGroupids.length
                      ? "Select Item"
                      : "Select Item Group first"
                  }
                  searchPlaceholder="Search Items..."
                  emptyMessage="No items found for selected groups."
                  disabled={
                    loading ||
                    dropdownLoading ||
                    !form.ItemGroupids.length
                  }
                />

                {errors.ItemMasterid && (
                  <p className="text-sm text-destructive">
                    {errors.ItemMasterid}
                  </p>
                )}
              </div>

              {/* BRAND / MANUFACTURER */}

              <div className="space-y-2">
                <Label>
                  Brand / Manufacturer{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <SelectSearch
                  options={brandOptions}
                  value={form.BrandManufacturerid}
                  onValueChange={handleBrandChange}
                  placeholder={
                    form.ItemMasterid
                      ? "Select Brand / Manufacturer"
                      : "Select Item first"
                  }
                  searchPlaceholder="Search Brand / Manufacturer..."
                  emptyMessage="No brands are assigned to this item."
                  disabled={
                    loading ||
                    dropdownLoading ||
                    !form.ItemMasterid ||
                    !brandOptions.length
                  }
                />

                {errors.BrandManufacturerid && (
                  <p className="text-sm text-destructive">
                    {errors.BrandManufacturerid}
                  </p>
                )}
              </div>

              {/* ITEM CONDITION - AUTOMATIC */}

              <div className="space-y-2">
                <Label>Item Condition</Label>

                <Input
                  value={getItemConditionLabel(selectedItem, itemConditions)}
                  readOnly
                  disabled
                  placeholder="Automatically set from selected Item"
                />

                {errors.ItemConditionid && (
                  <p className="text-sm text-destructive">
                    {errors.ItemConditionid}
                  </p>
                )}
              </div>

              {/* APPLICABLE FROM DATE */}

              <div className="space-y-2">
                <Label>
                  Applicable From Date{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Input
                  type="date"
                  value={form.ApplicableFromDate}
                  onChange={(e) =>
                    updateField("ApplicableFromDate", e.target.value)
                  }
                  disabled={loading}
                  aria-invalid={!!errors.ApplicableFromDate}
                  className={
                    errors.ApplicableFromDate
                      ? "border-destructive"
                      : ""
                  }
                />

                {errors.ApplicableFromDate && (
                  <p className="text-sm text-destructive">
                    {errors.ApplicableFromDate}
                  </p>
                )}
              </div>

              {/* APPLICABLE TO DATE */}

              <div className="space-y-2">
                <Label>Applicable To Date</Label>

                <Input
                  type="date"
                  value={form.ApplicableToDate}
                  min={form.ApplicableFromDate || undefined}
                  onChange={(e) =>
                    updateField("ApplicableToDate", e.target.value)
                  }
                  disabled={loading}
                  aria-invalid={!!errors.ApplicableToDate}
                  className={
                    errors.ApplicableToDate
                      ? "border-destructive"
                      : ""
                  }
                />

                {errors.ApplicableToDate && (
                  <p className="text-sm text-destructive">
                    {errors.ApplicableToDate}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Leave empty if the rate has no end date.
                </p>
              </div>

              {/* RATE WITH AUTOMATIC UNIT LABEL */}

              <div className="space-y-2">
                <Label>
                  Rate (₹) <span className="text-destructive">*</span>
                </Label>

                <div className="relative">
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.Rate}
                    onChange={(e) =>
                      updateField("Rate", e.target.value)
                    }
                    placeholder="Enter rate"
                    disabled={loading}
                    aria-invalid={!!errors.Rate}
                    className={`${errors.Rate ? "border-destructive" : ""
                      } ${unitLabel ? "pr-36" : ""}`}
                  />

                  {unitLabel && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none max-w-[45%] truncate">
                      {unitLabel}
                    </span>
                  )}
                </div>

                {errors.Rate && (
                  <p className="text-sm text-destructive">
                    {errors.Rate}
                  </p>
                )}

                {errors.Unitid && (
                  <p className="text-sm text-destructive">
                    {errors.Unitid}
                  </p>
                )}
              </div>

              {/* COMMENTS */}

              <div className="space-y-2">
                <Label>Comments</Label>

                <Textarea
                  value={form.Comments}
                  maxLength={255}
                  onChange={(e) =>
                    updateField("Comments", e.target.value)
                  }
                  placeholder="Enter comments"
                  rows={4}
                  disabled={loading}
                  aria-invalid={!!errors.Comments}
                  className={
                    errors.Comments ? "border-destructive" : ""
                  }
                />

                {errors.Comments && (
                  <p className="text-sm text-destructive">
                    {errors.Comments}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
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
              {dropdownLoading && (
                <p className="text-center text-sm text-muted-foreground">
                  Loading dropdown options...
                </p>
              )}

            </DialogBody>
          </ScrollArea>

          {/* FOOTER */}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                closeDialog?.();
              }}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || dropdownLoading}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}