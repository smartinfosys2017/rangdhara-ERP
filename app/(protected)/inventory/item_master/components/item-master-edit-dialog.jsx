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
  id: "",
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
// BOOLEAN VALUE HELPER
// ======================================================

const isTrue = (value) => {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true"
  );
};
const normalizeIds = (values = []) =>
  [...new Set(
    (Array.isArray(values) ? values : [])
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map(String)
  )];

const getBrandLabel = (brand) => {
  if (!brand) return "Unknown Brand";

  const brandName = brand.brandName || brand.BrandName || "";
  const manufacturerName =
    brand.manufacturerName || brand.ManufacturerName || "";

  if (brandName && manufacturerName) {
    return `${brandName} (${manufacturerName})`;
  }

  return (
    brandName ||
    manufacturerName ||
    brand.name ||
    `Brand #${brand.id || ""}`
  );
};
const getBrandRestockData = (itemMaster) => {
  const relations = Array.isArray(itemMaster?.ItemMasterBrand)
    ? itemMaster.ItemMasterBrand
    : [];

  const brandIds = [];
  const restockLevels = {};
  const brands = [];

  relations.forEach((relation) => {
    const brandId = relation?.ItemBrandid;

    if (!brandId) return;

    const id = String(brandId);

    brandIds.push(id);

    restockLevels[id] =
      relation.RestockLevel !== null &&
        relation.RestockLevel !== undefined
        ? String(relation.RestockLevel)
        : "";

    const brand =
      relation.brand ||
      relation.BrandManufacturer ||
      relation.Brand ||
      null;

    if (brand) {
      brands.push({
        ...brand,
        id,
      });
    }
  });

  return {
    brandIds: normalizeIds(brandIds),
    restockLevels,
    brands,
  };
};

// ======================================================
// PAGINATED SEARCH MULTISELECT
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Fetch options when dropdown opens or search changes.
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
          `${endpoint}?${params.toString()}`
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load options."
          );
        }

        if (cancelled) return;

        // Corrected: do not reassign a const variable.
        const records = Array.isArray(result.data)
          ? result.data
          : [];

        setOptions(records);

        onOptionsLoaded?.(records);

        setPage(Number(result.pagination?.page) || 1);

        setTotalPages(
          Number(result.pagination?.totalPages) || 1
        );
      } catch (error) {
        if (!cancelled) {
          setOptions([]);
          setTotalPages(1);

          console.error("DROPDOWN FETCH ERROR:", error);

          onError?.(
            error.message || "Failed to load options."
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

  // Load next page.
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

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load more options.",
        );
      }

      const records = Array.isArray(result.data)
        ? result.data
        : [];

      setOptions((previous) => {
        const mergedMap = new Map(
          previous.map((item) => [String(item.id), item]),
        );

        records.forEach((item) => {
          mergedMap.set(String(item.id), item);
        });

        return Array.from(mergedMap.values());
      });

      // Notify the parent outside the state updater.
      if (onOptionsLoaded) {
        onOptionsLoaded(records);
      }

      setPage(Number(result.pagination?.page) || nextPage);

      setTotalPages(
        Number(result.pagination?.totalPages) || totalPages,
      );
    } catch (error) {
      console.error("LOAD MORE ERROR:", error);

      onError?.(
        error.message || "Failed to load more options.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  // Combine selected known options and currently loaded options.
  const combinedOptionsMap = new Map();

  [...knownOptions, ...options].forEach((item) => {
    if (item?.id !== null && item?.id !== undefined) {
      combinedOptionsMap.set(String(item.id), item);
    }
  });

  const combinedOptions = Array.from(
    combinedOptionsMap.values(),
  );

  const selectedOptions = selectedValues.map((id) =>
    combinedOptions.find(
      (item) => String(item.id) === String(id),
    ),
  );

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

  const handleSelectAll = () => {
    const updatedIds = [
      ...new Set([
        ...selectedValues,
        ...options.map((item) => String(item.id)),
      ]),
    ];

    onChange(updatedIds);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const allLoadedSelected =
    options.length > 0 &&
    options.every((item) =>
      selectedValues.includes(String(item.id)),
    );

  const getSelectedLabel = () => {
    if (multiple) {
      if (selectedValues.length === 0) {
        return placeholder;
      }

      const labels = selectedOptions
        .filter(Boolean)
        .map((item) => getLabel(item));

      return labels.length === selectedValues.length
        ? labels.join(", ")
        : `${selectedValues.length} brand(s) selected`;
    }

    return selectedOptions[0]
      ? getLabel(selectedOptions[0])
      : placeholder;
  };

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
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2"
        />

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
                    className={`flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted ${isSelected ? "bg-muted" : ""
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

export default function ItemMasterEditDialog({
  open,
  closeDialog,
  ItemMaster,
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
        previous.map((item) => [String(item.id), item])
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
  // PREFILL ITEM
  // ====================================================

  useEffect(() => {
    if (!open || !ItemMaster) return;

    const {
      brandIds,
      restockLevels,
      brands,
    } = getBrandRestockData(ItemMaster);

    // Add existing selected brands to dropdown options.
    // This is important because the dropdown may not have loaded
    // these brands from its API yet.
    setBrandOptions((previous) => {
      const optionsMap = new Map();

      previous.forEach((brand) => {
        optionsMap.set(String(brand.id), brand);
      });

      brands.forEach((brand) => {
        optionsMap.set(String(brand.id), brand);
      });

      return Array.from(optionsMap.values());
    });

    const hasBrandRestockLevels =
      Object.keys(restockLevels).length > 0;

    const restockLevelType =
      ItemMaster.RestockLevelType === "BRAND" ||
        ItemMaster.RestockLevelType === "ITEM"
        ? ItemMaster.RestockLevelType
        : hasBrandRestockLevels
          ? "BRAND"
          : "ITEM";

    setForm({
      id: ItemMaster.id || "",

      ItemGroupid: String(ItemMaster.ItemGroupid || ""),
      ItemName: ItemMaster.ItemName || "",

      BrandManufacturerids: brandIds,

      SKU: ItemMaster.SKU || "",
      Barcode: ItemMaster.Barcode || "",
      Description: ItemMaster.Description || "",

      openingBalance: String(ItemMaster.openingBalance ?? "0"),
      Unitid: String(ItemMaster.Unitid || ""),
      rather: String(ItemMaster.rather ?? "0"),

      Tax1: String(ItemMaster.Tax1 || ""),
      Tax2: String(ItemMaster.Tax2 || ""),

      Locationid: String(ItemMaster.Locationid || ""),
      Machineid: String(ItemMaster.Machineid || ""),
      ItemConditionid: String(ItemMaster.ItemConditionid || ""),

      RestockLevelType: restockLevelType,

      ApplicableForRelocateLevel: Boolean(
        ItemMaster.ApplicableForRelocateLevel
      ),

      RelocateLevel: String(ItemMaster.RelocateLevel ?? ""),

      // Existing brand-wise restock values.
      BrandRestockLevels: restockLevels,

      status:
        ItemMaster.status === true ||
        ItemMaster.status === 1 ||
        ItemMaster.status === "1" ||
        ItemMaster.status === "true",

      isDefault:
        ItemMaster.isDefault === true ||
        ItemMaster.isDefault === 1 ||
        ItemMaster.isDefault === "1" ||
        ItemMaster.isDefault === "true",
    });

    setErrors({});
  }, [open, ItemMaster]);

  // ====================================================
  // LOAD DROPDOWNS
  // ====================================================

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadDropdowns = async () => {
      try {
        const [
          groupRes,
          unitRes,
          taxRes,
          locationRes,
          machineRes,
          itemConditionRes,
        ] = await Promise.all([
          apiFetch(
            "/api/inventory/item-groups?limit=100&status=active",
          ),

          apiFetch(
            "/api/inventory/unit?limit=100",
          ),

          apiFetch(
            "/api/finance/tax_rates",
          ),

          apiFetch(
            "/api/inventory/location?limit=100&status=active",
          ),

          apiFetch(
            "/api/inventory/machine-master?limit=100&status=active",
          ),

          apiFetch(
            "/api/inventory/product-type?limit=100&status=active",
          ),
        ]);

        const [
          groupsData,
          unitsData,
          taxData,
          locationsData,
          machinesData,
          itemConditionData,
        ] = await Promise.all([
          groupRes.json(),
          unitRes.json(),
          taxRes.json(),
          locationRes.json(),
          machineRes.json(),
          itemConditionRes.json(),
        ]);

        if (cancelled) return;

        setItemGroups(groupsData.data || []);
        setUnits(unitsData.data || []);
        setTaxes(taxData.data || []);

        setLocations(
          (locationsData.data || []).filter(
            (location) =>
              isTrue(location.status) &&
              !location.deletedAt,
          ),
        );

        setMachines(
          (machinesData.data || []).filter(
            (machine) =>
              isTrue(machine.status) &&
              !machine.deletedAt,
          ),
        );

        setItemCondition(
          (itemConditionData.data || []).filter(
            (item) =>
              isTrue(item.status) &&
              !item.deletedAt,
          ),
        );
      } catch (error) {
        if (!cancelled) {
          console.error(
            "LOAD ITEM DROPDOWNS ERROR:",
            error,
          );

          showErrorToast(
            "Failed to load dropdown data.",
          );
        }
      }
    };

    loadDropdowns();

    return () => {
      cancelled = true;
    };
  }, [open, showErrorToast]);

  // ====================================================
  // UPDATE FIELD
  // ====================================================

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: "",
    }));
  };

  // ====================================================
  // BRAND SELECTION
  // ====================================================

  const handleBrandSelection = (selectedIds) => {
    const normalizedIds = normalizeIds(selectedIds);

    setForm((previous) => {
      const updatedLevels = {};

      normalizedIds.forEach((brandId) => {
        updatedLevels[brandId] =
          previous.BrandRestockLevels?.[brandId] ?? "";
      });

      return {
        ...previous,
        BrandManufacturerids: normalizedIds,
        BrandRestockLevels: updatedLevels,
        rather:
          normalizedIds.length === 1
            ? previous.rather
            : "0",
      };
    });

    setErrors((previous) => ({
      ...previous,
      BrandManufacturerids: "",
      BrandRestockLevels: "",
      rather: "",
    }));
  };

  // ====================================================
  // RESET RATE WHEN BRAND COUNT IS NOT ONE
  // ====================================================

  useEffect(() => {
    if (form.BrandManufacturerids.length !== 1) {
      setForm((previous) => {
        if (Number(previous.rather || 0) === 0) {
          return previous;
        }

        return {
          ...previous,
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
    const Description =
      form.Description?.trim() || "";

    const openingBalance = Number(
      form.openingBalance || 0,
    );

    // ITEM ID

    if (!form.id) {
      newErrors.id = "Item ID is missing.";
    }

    // ITEM GROUP

    if (!form.ItemGroupid) {
      newErrors.ItemGroupid =
        "Item Group is required.";
    }

    // ITEM CONDITION

    if (!form.ItemConditionid) {
      newErrors.ItemConditionid =
        "Item Condition is required.";
    }

    // ITEM NAME

    if (!ItemName) {
      newErrors.ItemName =
        "Item Name is required.";
    } else if (ItemName.length > 255) {
      newErrors.ItemName =
        "Item Name must not exceed 255 characters.";
    }

    // SKU

    if (SKU.length > 100) {
      newErrors.SKU =
        "SKU must not exceed 100 characters.";
    }

    // BARCODE

    if (Barcode.length > 100) {
      newErrors.Barcode =
        "Barcode must not exceed 100 characters.";
    }

    // UNIT

    if (!form.Unitid) {
      newErrors.Unitid = "Unit is required.";
    }

    // OPENING BALANCE

    if (
      !Number.isFinite(openingBalance) ||
      openingBalance < 0
    ) {
      newErrors.openingBalance =
        "Opening Balance must be a valid non-negative number.";
    }

    // LOCATION OR MACHINE

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

    // DESCRIPTION

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
        const invalidBrand =
          form.BrandManufacturerids.some(
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
      console.error(
        "ITEM MASTER VALIDATION ERRORS:",
        newErrors,
      );

      showErrorToast(
        "Please check the required fields and character limits.",
      );

      return false;
    }

    return true;
  };

  // ====================================================
  // UPDATE ITEM
  // ====================================================

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const payload = {
        ...form,

        id: form.id,

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
          form.BrandManufacturerids.length === 1
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
      };

      console.log(
        "UPDATE ITEM MASTER PAYLOAD:",
        payload,
      );

      const response = await apiFetch(
        "/api/inventory/item-master",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        },
      );

      const result = await response
        .json()
        .catch(() => ({}));

      console.log(
        "UPDATE ITEM MASTER RESPONSE:",
        result,
      );

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || "Failed updating item.",
        );
      }

      showSuccessToast(
        "Item updated successfully.",
      );

      onSuccess?.(result.data);

      closeDialog?.();
    } catch (error) {
      console.error(
        "UPDATE ITEM ERROR:",
        error,
      );

      showErrorToast(
        error?.message ||
        "Something went wrong while updating the item.",
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
        multiple
        knownOptions={brandOptions}
        onOptionsLoaded={handleBrandOptionsLoaded}
        onError={showErrorToast}
        getLabel={getBrandLabel}
        placeholder="Select Brand / Manufacturer"
        searchPlaceholder="Search brand or manufacturer..."
      />

      {form.BrandManufacturerids.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-2">
          <p className="text-xs font-medium">
            {form.BrandManufacturerids.length} brand(s) selected
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {form.BrandManufacturerids.map((brandId) => {
              const brand = brandOptions.find(
                (item) => String(item.id) === String(brandId),
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
        if (!value) {
          resetForm();
          closeDialog?.();
        }
      }}
    >
      <DialogContent>
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>

            <DialogDescription>
              Update inventory item details.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* ITEM GROUP */}

              <div>
                <Label>
                  Item Group{" "}
                  <span className="text-destructive">
                    *
                  </span>
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
                  <span className="text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  value={form.ItemName}
                  maxLength={255}
                  onChange={(e) =>
                    updateField(
                      "ItemName",
                      e.target.value,
                    )
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
                    errors.SKU
                      ? "border-destructive"
                      : ""
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
                    updateField(
                      "Barcode",
                      e.target.value,
                    )
                  }
                  placeholder="Enter Barcode"
                  aria-invalid={!!errors.Barcode}
                  className={
                    errors.Barcode
                      ? "border-destructive"
                      : ""
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
                  <span className="text-destructive">
                    *
                  </span>
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
                  <span className="text-destructive">
                    *
                  </span>
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

              {/* CLOSING BALANCE */}

              <div>
                <Label>Closing Balance</Label>

                <Input
                  type="number"
                  value={String(
                    ItemMaster?.closingBalance ??
                    ItemMaster?.ClosingBalance ??
                    "",
                  )}
                  readOnly
                />

                <p className="mt-1 text-xs text-muted-foreground">
                  Closing balance is read-only.
                </p>
              </div>

              {/* LOCATION */}

              <div>
                <Label>
                  Warehouse
                  {Number(form.openingBalance || 0) > 0 && (
                    <span className="text-destructive">
                      {" "}*
                    </span>
                  )}
                </Label>

                <Select
                  value={form.Locationid || "none"}
                  onValueChange={(value) => {
                    updateField(
                      "Locationid",
                      value === "none" ? "" : value,
                    );

                    setErrors((previous) => ({
                      ...previous,
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
                    <span className="text-destructive">
                      {" "}*
                    </span>
                  )}
                </Label>

                <Select
                  value={form.Machineid || "none"}
                  onValueChange={(value) => {
                    updateField(
                      "Machineid",
                      value === "none" ? "" : value,
                    );

                    setErrors((previous) => ({
                      ...previous,
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
                  <span className="text-destructive">
                    *
                  </span>
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
                  <p className="mt-1 text-sm text-destructive">
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
                  {form.BrandManufacturerids.length ===
                    1 && (
                      <span className="text-destructive">
                        {" "}*
                      </span>
                    )}
                </Label>

                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.rather ?? "0"}
                  disabled={
                    form.BrandManufacturerids.length !==
                    1 || loading
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
                  value={form.Tax1 || "none"}
                  onValueChange={(value) =>
                    updateField(
                      "Tax1",
                      value === "none" ? "" : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax 1" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      No Tax
                    </SelectItem>

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
                  value={form.Tax2 || "none"}
                  onValueChange={(value) =>
                    updateField(
                      "Tax2",
                      value === "none" ? "" : value,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax 2" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      No Tax
                    </SelectItem>

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
                    updateField(
                      "Description",
                      e.target.value,
                    )
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

              {/* RESTOCK LEVEL TYPE */}

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
                    updateField(
                      "RestockLevelType",
                      value,
                    )
                  }
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="ITEM"
                      id="edit-restock-item"
                    />

                    <Label
                      htmlFor="edit-restock-item"
                      className="cursor-pointer"
                    >
                      Item Level Restock
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="BRAND"
                      id="edit-restock-brand"
                    />

                    <Label
                      htmlFor="edit-restock-brand"
                      className="cursor-pointer"
                    >
                      Brand Level Restock
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* ITEM LEVEL RESTOCK */}

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
                        <span className="text-destructive">
                          *
                        </span>
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
                        aria-invalid={
                          !!errors.RelocateLevel
                        }
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

              {/* BRAND LEVEL RESTOCK */}

              {form.RestockLevelType === "BRAND" && (
                <div className="space-y-3">
                  <Label>Brand Wise Restock Level</Label>

                  {form.BrandManufacturerids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Please select at least one brand.
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-2 gap-4 border-b bg-muted/50 p-3">
                        <Label>Brand / Manufacturer</Label>
                        <Label>Restock Level</Label>
                      </div>

                      {form.BrandManufacturerids.map((brandId) => {
                        const brand = brandOptions.find(
                          (item) => String(item.id) === String(brandId)
                        );

                        return (
                          <div
                            key={brandId}
                            className="grid grid-cols-2 items-center gap-4 border-b p-3 last:border-b-0"
                          >
                            <div className="text-sm font-medium">
                              {brand
                                ? getBrandLabel(brand)
                                : `Brand #${brandId}`}
                            </div>

                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={
                                form.BrandRestockLevels?.[brandId] ?? ""
                              }
                              placeholder="Enter restock level"
                              onChange={(event) => {
                                const value = event.target.value;

                                setForm((previous) => ({
                                  ...previous,
                                  BrandRestockLevels: {
                                    ...previous.BrandRestockLevels,
                                    [brandId]: value,
                                  },
                                }));

                                setErrors((previous) => ({
                                  ...previous,
                                  BrandRestockLevels: "",
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {errors.BrandRestockLevels && (
                    <p className="text-sm text-destructive">
                      {errors.BrandRestockLevels}
                    </p>
                  )}
                </div>
              )}

              {/* STATUS */}

              <div>
                <Label>
                  Status{" "}
                  <span className="text-destructive">
                    *
                  </span>
                </Label>

                <Select
                  value={String(form.status)}
                  onValueChange={(value) =>
                    updateField(
                      "status",
                      value === "true",
                    )
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
                  <span className="text-destructive">
                    *
                  </span>
                </Label>

                <Select
                  value={String(form.isDefault)}
                  onValueChange={(value) =>
                    updateField(
                      "isDefault",
                      value === "true",
                    )
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
              disabled={loading}
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