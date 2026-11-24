
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

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

import { apiFetch } from "@/lib/api";

// ======================================================
// INITIAL FORM
// ======================================================

const initialForm = {
  ItemGroupid: "",
  ItemName: "",
  BrandManufacturerids: [],
  SKU: "",
  Barcode: "",
  Description: "",
  openingBalance: "0",
  Unitid: "",
  rather: "0",
  Tax1: "",
  Tax2: "",
  Locationid: "",
  Machineid: "",
  ItemConditionid: "",

  RestockLevelType: "ITEM",

  ApplicableForRelocateLevel: false,
  RelocateLevel: "",

  BrandRestockLevels: {},

  status: true,
  isDefault: false,
};

const createInitialForm = () => ({
  ...initialForm,
  BrandManufacturerids: [],
  BrandRestockLevels: {},
});

// ======================================================
// PAGINATED SEARCH MULTISELECT
// Defined outside the main component to prevent remounting
// ======================================================

function PaginatedSearchSelect({
  endpoint,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  getLabel,
  disabled = false,
  multiple = false,
  knownOptions = [],
  onOptionsLoaded,
  onError,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [options, setOptions] = useState([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const selectedValues = multiple
    ? Array.isArray(value)
      ? value.map(String)
      : []
    : value
      ? [String(value)]
      : [];

  // ------------------------------------------------------
  // DEBOUNCE SEARCH
  // ------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ------------------------------------------------------
  // FETCH OPTIONS
  // ------------------------------------------------------

  useEffect(() => {
    if (!dropdownOpen) return;

    let cancelled = false;

    const fetchOptions = async () => {
      try {
        setDropdownLoading(true);
        setOptions([]);
        setPage(1);
        setTotalPages(1);

        const params = new URLSearchParams({
          page: "1",
          limit: "100",
          query: debouncedQuery,
          status: "all",
        });

        const response = await apiFetch(
          `${endpoint}?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load options.",
          );
        }

        if (cancelled) return;

        const records = Array.isArray(result.data)
          ? result.data
          : [];

        setOptions(records);

        onOptionsLoaded?.(records);

        setPage(Number(result.pagination?.page) || 1);

        setTotalPages(
          Number(result.pagination?.totalPages) || 1,
        );
      } catch (error) {
        if (!cancelled) {
          setOptions([]);
          setTotalPages(1);

          console.error("DROPDOWN FETCH ERROR:", error);

          onError?.(
            error.message || "Failed to load options.",
          );
        }
      } finally {
        if (!cancelled) {
          setDropdownLoading(false);
        }
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, [
    dropdownOpen,
    debouncedQuery,
    endpoint,
    onOptionsLoaded,
    onError,
  ]);

  // ------------------------------------------------------
  // LOAD MORE OPTIONS
  // ------------------------------------------------------

  const loadMore = async () => {
    if (
      dropdownLoading ||
      loadingMore ||
      page >= totalPages
    ) {
      return;
    }

    const nextPage = page + 1;

    try {
      setLoadingMore(true);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "100",
        query: debouncedQuery,
        status: "all",
      });

      const response = await apiFetch(
        `${endpoint}?${params.toString()}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load more options.",
        );
      }

      const records = Array.isArray(result.data)
        ? result.data
        : [];

      const mergedMap = new Map(
        options.map((item) => [String(item.id), item]),
      );

      records.forEach((item) => {
        mergedMap.set(String(item.id), item);
      });

      const mergedOptions = Array.from(
        mergedMap.values(),
      );

      setOptions(mergedOptions);

      onOptionsLoaded?.(mergedOptions);

      setPage(Number(result.pagination?.page) || nextPage);

      setTotalPages(
        Number(result.pagination?.totalPages) || totalPages,
      );
    } catch (error) {
      console.error("DROPDOWN LOAD MORE ERROR:", error);

      onError?.(
        error.message || "Failed to load more options.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  // ------------------------------------------------------
  // COMBINE CURRENT OPTIONS + PREVIOUSLY LOADED OPTIONS
  // ------------------------------------------------------

  const combinedOptionsMap = new Map();

  [...knownOptions, ...options].forEach((item) => {
    combinedOptionsMap.set(String(item.id), item);
  });

  const combinedOptions = Array.from(
    combinedOptionsMap.values(),
  );

  const selectedOptions = selectedValues.map((id) =>
    combinedOptions.find(
      (item) => String(item.id) === String(id),
    ),
  );

  // ------------------------------------------------------
  // SELECT / DESELECT OPTION
  // ------------------------------------------------------

  const handleOptionClick = (option) => {
    const optionId = String(option.id);

    if (multiple) {
      const updatedIds = selectedValues.includes(optionId)
        ? selectedValues.filter((id) => id !== optionId)
        : [...selectedValues, optionId];

      onChange([...new Set(updatedIds)]);
    } else {
      onChange(optionId);
      setDropdownOpen(false);
    }
  };

  // ------------------------------------------------------
  // SELECT ALL CURRENTLY LOADED SEARCH RESULTS
  // ------------------------------------------------------

  const handleSelectAll = () => {
    const updatedIds = [
      ...new Set([
        ...selectedValues,
        ...options.map((item) => String(item.id)),
      ]),
    ];

    onChange(updatedIds);
  };

  // ------------------------------------------------------
  // CLEAR ALL SELECTED OPTIONS
  // ------------------------------------------------------

  const handleClearAll = () => {
    onChange([]);
  };

  const allLoadedSelected =
    options.length > 0 &&
    options.every((item) =>
      selectedValues.includes(String(item.id)),
    );

  // ------------------------------------------------------
  // SELECTED LABEL
  // ------------------------------------------------------

  const getSelectedLabel = () => {
    if (multiple) {
      if (selectedValues.length === 0) {
        return placeholder;
      }

      const labels = selectedOptions
        .filter(Boolean)
        .map((item) => getLabel(item));

      if (labels.length === selectedValues.length) {
        return labels.join(", ");
      }

      return `${selectedValues.length} brand(s) selected`;
    }

    if (selectedOptions[0]) {
      return getLabel(selectedOptions[0]);
    }

    return placeholder;
  };

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------

  return (
    <Popover
      open={dropdownOpen}
      onOpenChange={(value) => {
        setDropdownOpen(value);

        if (!value) {
          setQuery("");
          setDebouncedQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {getSelectedLabel()}
          </span>

          <span className="ml-2 shrink-0">⌄</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-2"
      >
        {/* SEARCH */}

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2"
        />

        {/* SELECT ALL / CLEAR ALL */}

        {multiple && (
          <div className="mb-2 flex items-center justify-between gap-2 border-b pb-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleSelectAll}
              disabled={
                dropdownLoading ||
                options.length === 0 ||
                allLoadedSelected
              }
            >
              Select All
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClearAll}
              disabled={selectedValues.length === 0}
            >
              Clear All
            </Button>
          </div>
        )}

        {/* OPTIONS */}

        <div
          className="max-h-60 overflow-y-auto"
          onScroll={(event) => {
            const element = event.currentTarget;

            const nearBottom =
              element.scrollTop + element.clientHeight >=
              element.scrollHeight - 30;

            if (nearBottom) {
              loadMore();
            }
          }}
        >
          {dropdownLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : options.length > 0 ? (
            <>
              {options.map((option) => {
                const optionId = String(option.id);

                const isSelected =
                  selectedValues.includes(optionId);

                return (
                  <div
                    key={option.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOptionClick(option)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        handleOptionClick(option);
                      }
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted ${
                      isSelected ? "bg-muted" : ""
                    }`}
                  >
                    {multiple && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          handleOptionClick(option)
                        }
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      />
                    )}

                    <span className="flex-1">
                      {getLabel(option)}
                    </span>

                    {!multiple && isSelected && (
                      <span className="text-primary">✓</span>
                    )}
                  </div>
                );
              })}

              {loadingMore && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  Loading more...
                </p>
              )}

              {!loadingMore && page >= totalPages && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No more records
                </p>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No records found.
            </p>
          )}
        </div>

        {/* FOOTER */}

        {multiple && (
          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <span className="text-xs text-muted-foreground">
              {selectedValues.length} selected
            </span>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDropdownOpen(false)}
            >
              Done
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ======================================================
// MAIN COMPONENT
// ======================================================

export default function ItemMasterAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  const [itemGroups, setItemGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);
  const [itemCondition, setItemCondition] = useState([]);

  const [brandOptions, setBrandOptions] = useState([]);

  const [errors, setErrors] = useState({});

  const [form, setForm] = useState(createInitialForm);

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
  // BRAND LABEL
  // ====================================================

  const getBrandLabel = useCallback((brand) => {
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
  }, []);

  // ====================================================
  // STORE LOADED BRAND OPTIONS
  // ====================================================

  const handleBrandOptionsLoaded = useCallback((records) => {
    setBrandOptions((previous) => {
      const merged = new Map(
        previous.map((item) => [
          String(item.id),
          item,
        ]),
      );

      records.forEach((item) => {
        merged.set(String(item.id), item);
      });

      return Array.from(merged.values());
    });
  }, []);

  // ====================================================
  // RESET FORM
  // ====================================================

  const resetForm = useCallback(() => {
    setForm(createInitialForm());
    setErrors({});
    setBrandOptions([]);
  }, []);

  // ====================================================
  // LOAD DROPDOWNS
  // ====================================================

  useEffect(() => {
    if (!open) return;

    loadItemGroups();
    loadUnits();
    loadTaxes();
    loadLocations();
    loadMachines();
    loadItemCondition();
  }, [open]);

  // ====================================================
  // LOAD ITEM GROUPS
  // ====================================================

  const loadItemGroups = async () => {
    try {
      const res = await apiFetch(
        "/api/inventory/item-groups?limit=100&status=active",
      );

      const json = await res.json();

      const groups = json.data || [];

      setItemGroups(groups);

      const defaultGroup = groups.find(
        (item) =>
          item.isDefault === true ||
          item.isDefault === 1 ||
          item.isDefault === "1",
      );

      if (defaultGroup) {
        setForm((prev) => ({
          ...prev,
          ItemGroupid: String(defaultGroup.id),
        }));
      }
    } catch (error) {
      console.error("LOAD ITEM GROUPS ERROR", error);
    }
  };

  // ====================================================
  // LOAD UNITS
  // ====================================================

  const loadUnits = async () => {
    try {
      const res = await apiFetch(
        "/api/inventory/unit?limit=100",
      );

      const json = await res.json();

      setUnits(json.data || []);
    } catch (error) {
      console.error("LOAD UNITS ERROR", error);
    }
  };

  // ====================================================
  // LOAD TAXES
  // ====================================================

  const loadTaxes = async () => {
    try {
      const res = await apiFetch(
        "/api/finance/tax_rates",
      );

      const json = await res.json();

      setTaxes(json.data || []);
    } catch (error) {
      console.error("LOAD TAXES ERROR", error);
    }
  };

  // ====================================================
  // LOAD LOCATIONS
  // ====================================================

  const loadLocations = async () => {
    try {
      const res = await apiFetch(
        "/api/inventory/location?limit=100&status=active",
      );

      const json = await res.json();

      setLocations(
        (json.data || []).filter(
          (location) =>
            location.status === true &&
            !location.deletedAt,
        ),
      );
    } catch (error) {
      console.error("LOAD LOCATIONS ERROR", error);
    }
  };

  // ====================================================
  // LOAD MACHINES
  // ====================================================

  const loadMachines = async () => {
    try {
      const res = await apiFetch(
        "/api/inventory/machine-master?limit=100&status=active",
      );

      const json = await res.json();

      setMachines(
        (json.data || []).filter(
          (machine) =>
            machine.status === true &&
            !machine.deletedAt,
        ),
      );
    } catch (error) {
      console.error("LOAD MACHINES ERROR", error);
    }
  };

  // ====================================================
  // LOAD ITEM CONDITION
  // ====================================================

  const loadItemCondition = async () => {
    try {
      const res = await apiFetch(
        "/api/inventory/product-type?limit=100&status=active",
      );

      const json = await res.json();

      setItemCondition(
        (json.data || []).filter(
          (item) =>
            item.status === true &&
            !item.deletedAt,
        ),
      );
    } catch (error) {
      console.error("LOAD ITEM CONDITION ERROR", error);
    }
  };

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
  // BRAND SELECTION
  // ====================================================

  const handleBrandSelection = (selectedIds) => {
    setForm((prev) => {
      const updatedLevels = {};

      selectedIds.forEach((brandId) => {
        updatedLevels[brandId] =
          prev.BrandRestockLevels?.[brandId] ?? "";
      });

      return {
        ...prev,
        BrandManufacturerids: selectedIds,
        BrandRestockLevels: updatedLevels,
      };
    });

    setErrors((prev) => ({
      ...prev,
      BrandManufacturerids: "",
      BrandRestockLevels: "",
    }));
  };

  // ====================================================
  // RESET RATE WHEN BRAND COUNT IS NOT ONE
  // ====================================================

  useEffect(() => {
    if (form.BrandManufacturerids.length !== 1) {
      setForm((prev) => {
        if (Number(prev.rather || 0) === 0) {
          return prev;
        }

        return {
          ...prev,
          rather: "0",
        };
      });
    }
  }, [form.BrandManufacturerids.length]);

  // ====================================================
  // VALIDATION
  // ====================================================

  const validate = () => {
    const newErrors = {};

    const ItemName = form.ItemName?.trim() || "";
    const SKU = form.SKU?.trim() || "";
    const Barcode = form.Barcode?.trim() || "";
    const Description = form.Description?.trim() || "";

    const openingBalance = Number(
      form.openingBalance || 0,
    );

    if (!form.ItemGroupid) {
      newErrors.ItemGroupid =
        "Item Group is required.";
    }

    if (!form.ItemConditionid) {
      newErrors.ItemConditionid =
        "Item Condition is required.";
    }

    if (!ItemName) {
      newErrors.ItemName =
        "Item Name is required.";
    } else if (ItemName.length > 255) {
      newErrors.ItemName =
        "Item Name must not exceed 255 characters.";
    }

    if (SKU.length > 100) {
      newErrors.SKU =
        "SKU must not exceed 100 characters.";
    }

    if (Barcode.length > 100) {
      newErrors.Barcode =
        "Barcode must not exceed 100 characters.";
    }

    if (!form.Unitid) {
      newErrors.Unitid = "Unit is required.";
    }

    if (
      !Number.isFinite(openingBalance) ||
      openingBalance < 0
    ) {
      newErrors.openingBalance =
        "Opening Balance must be a valid non-negative number.";
    }

    if (
      openingBalance > 0 &&
      !form.Locationid &&
      !form.Machineid
    ) {
      newErrors.Locationid =
        "Please select either Location or Machine.";

      newErrors.Machineid =
        "Please select either Location or Machine.";
    }

    if (Description.length > 255) {
      newErrors.Description =
        "Description must not exceed 255 characters.";
    }

    // ITEM LEVEL RESTOCK VALIDATION

    if (
      form.RestockLevelType === "ITEM" &&
      form.ApplicableForRelocateLevel
    ) {
      const restockLevel = String(
        form.RelocateLevel ?? "",
      ).trim();

      if (!restockLevel) {
        newErrors.RelocateLevel =
          "Restock Level is required.";
      } else if (
        !Number.isFinite(Number(restockLevel)) ||
        Number(restockLevel) < 0
      ) {
        newErrors.RelocateLevel =
          "Restock Level must be a valid non-negative number.";
      }
    }

    // BRAND LEVEL RESTOCK VALIDATION

    if (form.RestockLevelType === "BRAND") {
      if (!form.BrandManufacturerids.length) {
        newErrors.BrandManufacturerids =
          "Please select at least one brand for brand-wise restock.";
      } else {
        const invalidBrand = form.BrandManufacturerids.some(
          (brandId) => {
            const level = String(
              form.BrandRestockLevels?.[brandId] ?? "",
            ).trim();

            return (
              level === "" ||
              !Number.isFinite(Number(level)) ||
              Number(level) < 0
            );
          },
        );

        if (invalidBrand) {
          newErrors.BrandRestockLevels =
            "Enter a valid non-negative restock level for every selected brand.";
        }
      }
    }

    // RATE VALIDATION

    if (
      form.BrandManufacturerids.length === 1 &&
      (
        !Number.isFinite(Number(form.rather)) ||
        Number(form.rather) <= 0
      )
    ) {
      newErrors.rather =
        "Rate must be greater than zero.";
    }

    if (
      form.BrandManufacturerids.length !== 1 &&
      Number(form.rather || 0) !== 0
    ) {
      newErrors.rather =
        "Rate is only allowed when exactly one brand is selected.";
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

  // ====================================================
  // SAVE ITEM
  // ====================================================

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const response = await apiFetch(
        "/api/inventory/item-master",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            ...form,

            ItemName: form.ItemName.trim(),

            BrandManufacturerids:
              form.BrandManufacturerids || [],

            SKU: form.SKU.trim() || null,

            Barcode: form.Barcode.trim() || null,

            Description: form.Description.trim(),

            openingBalance: String(
              form.openingBalance ?? "0",
            ),

            rather:
              form.BrandManufacturerids?.length === 1
                ? Number(form.rather || 0)
                : 0,

            BrandRestockLevels:
              form.RestockLevelType === "BRAND"
                ? form.BrandRestockLevels
                : {},

            Tax1: String(form.Tax1 || ""),

            Tax2: String(form.Tax2 || ""),

            Locationid: form.Locationid || null,

            Machineid: form.Machineid || null,

            ItemConditionid:
              form.ItemConditionid || null,

            status: form.status ?? true,

            isDefault: form.isDefault ?? false,
          }),
        },
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || "Failed creating item.",
        );
      }

      showSuccessToast("Item created successfully.");

      onSuccess?.(result.data);

      closeDialog?.();

      resetForm();
    } catch (error) {
      console.error("CREATE ITEM ERROR", error);

      showErrorToast(
        error?.message ||
          "Something went wrong while creating the item.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // RENDER BRAND FIELD
  // ====================================================

  const renderBrandField = () => (
    <div className="space-y-2">
      <Label>Brand / Manufacturer</Label>

      <PaginatedSearchSelect
        endpoint="/api/inventory/brand_manufacturer"
        value={form.BrandManufacturerids}
        onChange={handleBrandSelection}
        placeholder="Select Brand / Manufacturer"
        searchPlaceholder="Search brand or manufacturer..."
        disabled={loading}
        multiple={true}
        getLabel={getBrandLabel}
        knownOptions={brandOptions}
        onOptionsLoaded={handleBrandOptionsLoaded}
        onError={showErrorToast}
      />

      {form.BrandManufacturerids.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2">
          <p className="text-xs font-medium">
            {form.BrandManufacturerids.length} brand(s) selected
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {form.BrandManufacturerids.map((brandId) => {
              const brand = brandOptions.find(
                (item) =>
                  String(item.id) === String(brandId),
              );

              return (
                <span
                  key={brandId}
                  className="rounded-md border bg-background px-2 py-1 text-xs"
                >
                  {brand
                    ? getBrandLabel(brand)
                    : `Brand #${brandId}`}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {errors.BrandManufacturerids && (
        <p className="text-sm text-destructive">
          {errors.BrandManufacturerids}
        </p>
      )}
    </div>
  );

  // ====================================================
  // RENDER
  // ====================================================

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
            <DialogTitle>Add Item</DialogTitle>

            <DialogDescription>
              Create new inventory item.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 mr-1 pt-0 px-0 min-h-0">

              {/* ITEM GROUP */}

              <div>
                <Label>
                  Item Group{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={form.ItemGroupid}
                  onValueChange={(value) =>
                    updateField("ItemGroupid", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Item Group" />
                  </SelectTrigger>

                  <SelectContent>
                    {itemGroups.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                      >
                        {item.groupName}
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

              {/* ITEM NAME */}

              <div>
                <Label>
                  Item Name{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Input
                  value={form.ItemName}
                  maxLength={255}
                  onChange={(e) =>
                    updateField("ItemName", e.target.value)
                  }
                />

                {errors.ItemName && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.ItemName}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  {form.ItemName.length}/255 characters
                </p>
              </div>

              {/* SKU */}

              <div>
                <Label>SKU</Label>

                <Input
                  value={form.SKU}
                  maxLength={100}
                  onChange={(e) =>
                    updateField("SKU", e.target.value)
                  }
                  placeholder="Enter SKU"
                  aria-invalid={!!errors.SKU}
                  className={
                    errors.SKU ? "border-destructive" : ""
                  }
                />

                {errors.SKU && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.SKU}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  {form.SKU.length}/100 characters
                </p>
              </div>

              {/* BARCODE */}

              <div>
                <Label>Barcode</Label>

                <Input
                  value={form.Barcode}
                  maxLength={100}
                  onChange={(e) =>
                    updateField("Barcode", e.target.value)
                  }
                  placeholder="Enter Barcode"
                  aria-invalid={!!errors.Barcode}
                  className={
                    errors.Barcode ? "border-destructive" : ""
                  }
                />

                {errors.Barcode && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Barcode}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  {form.Barcode.length}/100 characters
                </p>
              </div>

              {/* UNIT */}

              <div>
                <Label>
                  Unit (Abbreviation){" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={form.Unitid}
                  onValueChange={(value) =>
                    updateField("Unitid", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>

                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem
                        key={unit.id}
                        value={String(unit.id)}
                      >
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

              {/* OPENING BALANCE */}

              <div>
                <Label>
                  Opening Balance{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Input
                  type="number"
                  min="0"
                  value={form.openingBalance ?? "0"}
                  onChange={(e) =>
                    updateField(
                      "openingBalance",
                      e.target.value,
                    )
                  }
                />

                {errors.openingBalance && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.openingBalance}
                  </p>
                )}
              </div>

              {/* LOCATION */}

              <div>
                <Label>
                  Warehouse
                  {Number(form.openingBalance || 0) > 0 && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>

                <Select
                  value={form.Locationid || "none"}
                  onValueChange={(value) => {
                    updateField(
                      "Locationid",
                      value === "none" ? "" : value,
                    );

                    setErrors((prev) => ({
                      ...prev,
                      Locationid: "",
                      Machineid: "",
                    }));
                  }}
                >
                  <SelectTrigger
                    className={
                      errors.Locationid
                        ? "border-destructive"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select Location" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      No Location
                    </SelectItem>

                    {locations.map((location) => (
                      <SelectItem
                        key={location.id}
                        value={String(location.id)}
                      >
                        {location.locationName} (
                        {location.locationCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.Locationid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Locationid}
                  </p>
                )}
              </div>

              {/* MACHINE */}

              <div>
                <Label>
                  Machine
                  {Number(form.openingBalance || 0) > 0 && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>

                <Select
                  value={form.Machineid || "none"}
                  onValueChange={(value) => {
                    updateField(
                      "Machineid",
                      value === "none" ? "" : value,
                    );

                    setErrors((prev) => ({
                      ...prev,
                      Locationid: "",
                      Machineid: "",
                    }));
                  }}
                >
                  <SelectTrigger
                    className={
                      errors.Machineid
                        ? "border-destructive"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select Machine" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      No Machine
                    </SelectItem>

                    {machines.map((machine) => (
                      <SelectItem
                        key={machine.id}
                        value={String(machine.id)}
                      >
                        {machine.machineName} (
                        {machine.machineCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.Machineid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Machineid}
                  </p>
                )}
              </div>

              {/* ITEM CONDITION */}

              <div>
                <Label>
                  Item Condition{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={form.ItemConditionid || "none"}
                  onValueChange={(value) =>
                    updateField(
                      "ItemConditionid",
                      value === "none" ? "" : value,
                    )
                  }
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
                    <SelectItem value="none">
                      Select Item Condition
                    </SelectItem>

                    {itemCondition.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                      >
                        {item.ProductType}
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

              {/* BRAND / MANUFACTURER */}

              {renderBrandField()}

              {/* RATE */}

              <div className="space-y-2">
                <Label>
                  Rate (₹)
                  {form.BrandManufacturerids.length === 1 && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>

                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.rather ?? "0"}
                  disabled={
                    form.BrandManufacturerids.length !== 1 ||
                    loading
                  }
                  onChange={(e) =>
                    updateField("rather", e.target.value)
                  }
                  placeholder={
                    form.BrandManufacturerids.length > 1
                      ? "Rate managed in Item Rates module"
                      : form.BrandManufacturerids.length === 0
                        ? "Select one brand to enter rate"
                        : "Enter rate"
                  }
                />

                {errors.rather && (
                  <p className="text-sm text-destructive">
                    {errors.rather}
                  </p>
                )}

                {form.BrandManufacturerids.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Multiple brands selected. Manage individual
                    brand rates in the Item Rates module.
                  </p>
                )}
              </div>

              {/* TAX 1 */}

              <div>
                <Label>Tax 1</Label>

                <Select
                  value={form.Tax1}
                  onValueChange={(value) =>
                    updateField("Tax1", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax 1" />
                  </SelectTrigger>

                  <SelectContent>
                    {taxes
                      .filter(
                        (tax) =>
                          String(tax.id) !==
                          String(form.Tax2),
                      )
                      .map((tax) => (
                        <SelectItem
                          key={tax.id}
                          value={String(tax.id)}
                        >
                          {tax.name || tax.taxName} (
                          {tax.taxrate} %)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TAX 2 */}

              <div>
                <Label>Tax 2</Label>

                <Select
                  value={form.Tax2}
                  onValueChange={(value) =>
                    updateField("Tax2", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax 2" />
                  </SelectTrigger>

                  <SelectContent>
                    {taxes
                      .filter(
                        (tax) =>
                          String(tax.id) !==
                          String(form.Tax1),
                      )
                      .map((tax) => (
                        <SelectItem
                          key={tax.id}
                          value={String(tax.id)}
                        >
                          {tax.name || tax.taxName} (
                          {tax.taxrate} %)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DESCRIPTION */}

              <div>
                <Label>Description</Label>

                <Textarea
                  value={form.Description}
                  maxLength={255}
                  onChange={(e) =>
                    updateField("Description", e.target.value)
                  }
                  placeholder="Enter description"
                  rows={4}
                  aria-invalid={!!errors.Description}
                  className={
                    errors.Description
                      ? "border-destructive"
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

              {/* ========================================
                  RESTOCK LEVEL TYPE
              ======================================== */}

              <div className="space-y-4 rounded-md border p-4">
                <div>
                  <Label className="text-base font-semibold">
                    Restock Level Type
                  </Label>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose whether the restock level should
                    apply to the entire item or individually
                    to each selected brand.
                  </p>
                </div>

                <RadioGroup
                  value={form.RestockLevelType}
                  onValueChange={(value) =>
                    updateField("RestockLevelType", value)
                  }
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="ITEM"
                      id="restock-item"
                    />

                    <Label
                      htmlFor="restock-item"
                      className="cursor-pointer"
                    >
                      Item Level Restock
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="BRAND"
                      id="restock-brand"
                    />

                    <Label
                      htmlFor="restock-brand"
                      className="cursor-pointer"
                    >
                      Brand Level Restock
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* ========================================
                  ITEM LEVEL RESTOCK
              ======================================== */}

              {form.RestockLevelType === "ITEM" && (
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        form.ApplicableForRelocateLevel
                      }
                      onCheckedChange={(value) =>
                        updateField(
                          "ApplicableForRelocateLevel",
                          value === true,
                        )
                      }
                    />

                    <Label className="cursor-pointer">
                      Applicable For Restock Level
                    </Label>
                  </div>

                  {form.ApplicableForRelocateLevel && (
                    <div className="space-y-2">
                      <Label>
                        Restock Level{" "}
                        <span className="text-destructive">*</span>
                      </Label>

                      <Input
                        type="number"
                        min="0"
                        value={form.RelocateLevel}
                        onChange={(e) =>
                          updateField(
                            "RelocateLevel",
                            e.target.value,
                          )
                        }
                        placeholder="Enter restock level"
                        aria-invalid={!!errors.RelocateLevel}
                        className={
                          errors.RelocateLevel
                            ? "border-destructive"
                            : ""
                        }
                      />

                      {errors.RelocateLevel && (
                        <p className="text-sm text-destructive">
                          {errors.RelocateLevel}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================
                  BRAND LEVEL RESTOCK
              ======================================== */}

              {form.RestockLevelType === "BRAND" && (
                <div className="space-y-3 rounded-md border p-4">
                  <div>
                    <Label className="text-base font-semibold">
                      Brand Wise Restock Level
                    </Label>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Set a separate restock quantity for
                      each selected brand.
                    </p>
                  </div>

                  {form.BrandManufacturerids.length === 0 ? (
                    <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Please select brands first using the
                      Brand / Manufacturer multiselect.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-md border">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[450px] text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="w-16 p-3 text-left">
                                No.
                              </th>

                              <th className="p-3 text-left">
                                Brand / Manufacturer
                              </th>

                              <th className="p-3 text-left">
                                Restock Level
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {form.BrandManufacturerids.map(
                              (brandId, index) => {
                                const brand = brandOptions.find(
                                  (item) =>
                                    String(item.id) ===
                                    String(brandId),
                                );

                                const brandLabel = brand
                                  ? getBrandLabel(brand)
                                  : `Brand #${brandId}`;

                                return (
                                  <tr
                                    key={brandId}
                                    className="border-t"
                                  >
                                    <td className="p-3">
                                      {index + 1}
                                    </td>

                                    <td className="p-3 font-medium">
                                      {brandLabel}
                                    </td>

                                    <td className="p-3">
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Enter quantity"
                                        value={
                                          form.BrandRestockLevels?.[
                                            brandId
                                          ] ?? ""
                                        }
                                        aria-invalid={
                                          !!errors.BrandRestockLevels
                                        }
                                        className={
                                          errors.BrandRestockLevels
                                            ? "border-destructive"
                                            : ""
                                        }
                                        onChange={(e) => {
                                          setForm((prev) => ({
                                            ...prev,

                                            BrandRestockLevels: {
                                              ...prev.BrandRestockLevels,

                                              [brandId]:
                                                e.target.value,
                                            },
                                          }));

                                          setErrors((prev) => ({
                                            ...prev,
                                            BrandRestockLevels: "",
                                          }));
                                        }}
                                      />
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {errors.BrandRestockLevels && (
                    <p className="text-sm text-destructive">
                      {errors.BrandRestockLevels}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Selected brands:{" "}
                    {form.BrandManufacturerids.length}
                  </p>
                </div>
              )}

              {/* STATUS */}

              <div>
                <Label>
                  Status{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={String(form.status)}
                  onValueChange={(value) =>
                    updateField("status", value === "true")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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

              {/* DEFAULT */}

              <div>
                <Label>
                  Is Default{" "}
                  <span className="text-destructive">*</span>
                </Label>

                <Select
                  value={String(form.isDefault)}
                  onValueChange={(value) =>
                    updateField("isDefault", value === "true")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">
                      Yes
                    </SelectItem>

                    <SelectItem value="false">
                      No
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </DialogBody>
          </ScrollArea>

          {/* FOOTER */}

          <DialogFooter className="gap-2">
            <Button
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
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}