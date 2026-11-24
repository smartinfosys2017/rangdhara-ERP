"use client";

import { useCallback, useEffect, useState } from "react";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";

// ======================================================
// INITIAL FORM
// ======================================================

const initialForm = {
  ItemGroupid: "",
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
});

// ======================================================
// HELPERS
// ======================================================

const getRecords = (result) => {
  return Array.isArray(result?.data) ? result.data : [];
};

const getBrandLabel = (brand) => {
  const brandName =
    brand.brandName ||
    brand.BrandName ||
    "";

  const manufacturerName =
    brand.manufacturerName ||
    brand.ManufacturerName ||
    "";

  if (
    brandName &&
    manufacturerName &&
    brandName.toLowerCase() !==
      manufacturerName.toLowerCase()
  ) {
    return `${brandName} - ${manufacturerName}`;
  }

  return (
    brandName ||
    manufacturerName ||
    brand.name ||
    `Brand #${brand.id}`
  );
};

const getUnitLabel = (unit) => {
  const name = unit.unitName || unit.name || "";
  const abbreviation = unit.abbreviation || "";

  return abbreviation
    ? `${name} (${abbreviation})`
    : name;
};
const handleItemChange = (itemId) => {
  const selectedItem = items.find(
    (item) => String(item.id) === String(itemId),
  );

  const relatedBrands = (selectedItem?.brands || [])
    .map((itemBrand) => itemBrand.brand)
    .filter((brand) => brand && brand.id)
    .filter(
      (brand, index, self) =>
        index === self.findIndex(
          (item) => String(item.id) === String(brand.id),
        ),
    );

  setFilteredBrands(relatedBrands);

  setForm((prev) => ({
    ...prev,
    ItemMasterid: itemId,
    BrandManufacturerid:
      relatedBrands.length === 1
        ? String(relatedBrands[0].id)
        : "",
  }));

  setErrors((prev) => ({
    ...prev,
    ItemMasterid: "",
    BrandManufacturerid: "",
  }));
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
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [itemConditions, setItemConditions] = useState([]);
  const [units, setUnits] = useState([]);

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
        "/api/inventory/product-type?limit=100&status=active",
        "/api/inventory/unit?limit=100",
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

      setItemConditions(
        getRecords(results[3]).filter(
          (item) => !item.deletedAt && item.status === true,
        ),
      );

      setUnits(getRecords(results[4]));

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
  // VALIDATION
  // ====================================================

  const validate = () => {
    const newErrors = {};

    if (!form.ItemGroupid) {
      newErrors.ItemGroupid = "Item Group is required.";
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
        "Item Condition is required.";
    }

    if (!form.ApplicableFromDate) {
      newErrors.ApplicableFromDate =
        "Applicable From Date is required.";
    } else if (
      Number.isNaN(
        new Date(form.ApplicableFromDate).getTime(),
      )
    ) {
      newErrors.ApplicableFromDate =
        "Please enter a valid Applicable From Date.";
    }

    if (
      form.ApplicableToDate &&
      Number.isNaN(
        new Date(form.ApplicableToDate).getTime(),
      )
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

    if (form.Rate === "" || !Number.isFinite(Number(form.Rate))) {
      newErrors.Rate = "Rate is required.";
    } else if (Number(form.Rate) <= 0) {
      newErrors.Rate = "Rate must be greater than zero.";
    }

    if (!form.Unitid) {
      newErrors.Unitid = "Unit is required.";
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

    try {
      setLoading(true);

      const payload = {
        ItemGroupid: form.ItemGroupid,
        ItemMasterid: form.ItemMasterid,
        BrandManufacturerid: form.BrandManufacturerid,
        ItemConditionid: form.ItemConditionid,

        ApplicableFromDate: form.ApplicableFromDate,
        ApplicableToDate: form.ApplicableToDate || null,

        Rate: Number(form.Rate),

        Unitid: form.Unitid,

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

      const result = await response
        .json()
        .catch(() => ({}));

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

              {/* ITEM GROUP */}

              <div className="space-y-2">
                <Label>
                  Item Group <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={form.ItemGroupid}
                  onValueChange={(value) =>
                    updateField("ItemGroupid", value)
                  }
                  disabled={loading || dropdownLoading}
                >
                  <SelectTrigger
                    className={
                      errors.ItemGroupid ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Select Item Group" />
                  </SelectTrigger>

                  <SelectContent>
                    {itemGroups.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                      >
                        {item.groupName || item.name || item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.ItemGroupid && (
                  <p className="text-sm text-destructive">
                    {errors.ItemGroupid}
                  </p>
                )}
              </div>

              {/* ITEM */}

              <div className="space-y-2">
                <Label>
                  Item <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={form.ItemMasterid}
                  onValueChange={(value) =>
                    updateField("ItemMasterid", value)
                  }
                  disabled={loading || dropdownLoading}
                >
                  <SelectTrigger
                    className={
                      errors.ItemMasterid ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Select Item" />
                  </SelectTrigger>

                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                      >
                        {item.ItemName || item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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

                <Select
                  value={form.BrandManufacturerid}
                  onValueChange={(value) =>
                    updateField("BrandManufacturerid", value)
                  }
                  disabled={loading || dropdownLoading}
                >
                  <SelectTrigger
                    className={
                      errors.BrandManufacturerid
                        ? "border-destructive"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select Brand / Manufacturer" />
                  </SelectTrigger>

                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem
                        key={brand.id}
                        value={String(brand.id)}
                      >
                        {getBrandLabel(brand)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.BrandManufacturerid && (
                  <p className="text-sm text-destructive">
                    {errors.BrandManufacturerid}
                  </p>
                )}
              </div>

              {/* ITEM CONDITION */}

              <div className="space-y-2">
                <Label>
                  Item Condition{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={form.ItemConditionid}
                  onValueChange={(value) =>
                    updateField("ItemConditionid", value)
                  }
                  disabled={loading || dropdownLoading}
                >
                  <SelectTrigger
                    className={
                      errors.ItemConditionid
                        ? "border-destructive"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select Item Condition" />
                  </SelectTrigger>

                  <SelectContent>
                    {itemConditions.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                      >
                        {item.ProductType || item.name || item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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
                    updateField(
                      "ApplicableFromDate",
                      e.target.value,
                    )
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
                    updateField(
                      "ApplicableToDate",
                      e.target.value,
                    )
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

              {/* RATE */}

              <div className="space-y-2">
                <Label>
                  Rate (₹) <span className="text-destructive">*</span>
                </Label>

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
                  className={
                    errors.Rate ? "border-destructive" : ""
                  }
                />

                {errors.Rate && (
                  <p className="text-sm text-destructive">
                    {errors.Rate}
                  </p>
                )}
              </div>

              {/* UNIT */}

              <div className="space-y-2">
                <Label>
                  Unit <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={form.Unitid}
                  onValueChange={(value) =>
                    updateField("Unitid", value)
                  }
                  disabled={loading || dropdownLoading}
                >
                  <SelectTrigger
                    className={
                      errors.Unitid ? "border-destructive" : ""
                    }
                  >
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>

                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem
                        key={unit.id}
                        value={String(unit.id)}
                      >
                        {getUnitLabel(unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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