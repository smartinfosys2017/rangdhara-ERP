"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
import { Check, ChevronsUpDown, Search } from "lucide-react";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import ItemGroupCustomFields, {
  validateRequiredCustomFields,
} from "../../custom-fields/import-custom-fields";

// =======================================================
// CONSTANTS
// =======================================================

const PAGE_SIZE = 100;

// =======================================================
// TOASTS
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
  groupName: "",
  description: "",
  parentId: null,
  status: "true",
  isDefault: "false",
};

// =======================================================
// BUILD CATEGORY TREE
// =======================================================

const buildCategoryTree = (categories, parentId = null) => {
  return categories
    .filter((category) => (category.parentId || null) === parentId)
    .map((category) => ({
      ...category,
      children: buildCategoryTree(categories, category.id),
    }));
};

// =======================================================
// FLATTEN CATEGORY TREE
// =======================================================

const flattenCategoryTree = (categories, level = 0) => {
  return categories.flatMap((category) => [
    {
      id: category.id,
      groupName: category.groupName,
      level,
    },
    ...flattenCategoryTree(category.children || [], level + 1),
  ]);
};

// =======================================================
// GET DESCENDANT IDS
// =======================================================

const getDescendantIds = (categories, parentId, visited = new Set()) => {
  if (!parentId || visited.has(parentId)) {
    return [];
  }

  visited.add(parentId);

  const children = categories.filter(
    (category) => category.parentId === parentId,
  );

  return children.flatMap((child) => [
    child.id,
    ...getDescendantIds(categories, child.id, visited),
  ]);
};

// =======================================================
// COMPONENT
// =======================================================

export default function ItemGroupEditDialog({
  open,
  closeDialog,
  onSuccess,
  ItemGroup,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // CATEGORY PAGINATION STATES
  // =======================================================

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [loadingMoreCategories, setLoadingMoreCategories] = useState(false);

  const [categoriesPage, setCategoriesPage] = useState(1);
  const [hasMoreCategories, setHasMoreCategories] = useState(true);

  // =======================================================
  // PARENT DROPDOWN STATES
  // =======================================================

  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const [parentSearch, setParentSearch] = useState("");

  // =======================================================
  // CUSTOM FIELDS
  // =======================================================

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  const [customFieldsReady, setCustomFieldsReady] = useState(false);

  // =======================================================
  // PAGINATION REFS
  // =======================================================

  const loadingMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const requestIdRef = useRef(0);

  // =======================================================
  // LOAD ITEM GROUP DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (ItemGroup) {
      setForm({
        id: ItemGroup.id || null,
        groupName: ItemGroup.groupName || "",
        description: ItemGroup.description || "",
        parentId: ItemGroup.parentId || null,
        status: ItemGroup.status ? "true" : "false",
        isDefault: ItemGroup.isDefault ? "true" : "false",
      });

      setCustomFields(ItemGroup?.customFields ?? {});
      setCustomFieldDefinitions([]);
      setCustomFieldsReady(false);
    } else {
      setForm(EMPTY_FORM);
      setCustomFields({});
      setCustomFieldDefinitions([]);
      setCustomFieldsReady(false);
    }

    setErrors({});
    setParentSearch("");
    setParentDropdownOpen(false);
  }, [open, ItemGroup]);

  // =======================================================
  // FETCH CATEGORIES WITH PAGINATION
  // =======================================================

  const fetchCategories = useCallback(
    async (pageNumber = 1, append = false) => {
      if (append && (loadingMoreRef.current || !hasMoreRef.current)) {
        return;
      }

      if (append) {
        loadingMoreRef.current = true;
        setLoadingMoreCategories(true);
      } else {
        setCategoriesLoading(true);
      }

      const requestId = requestIdRef.current;

      try {
        const response = await fetch(
          `/api/inventory/item-groups?page=${pageNumber}&limit=${PAGE_SIZE}`,
        );

        const result = await response.json();

        // Ignore old dialog requests.
        if (requestId !== requestIdRef.current) return;

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load item groups.");
        }

        const newCategories = Array.isArray(result.data) ? result.data : [];

        setCategories((previous) => {
          if (!append) {
            return newCategories;
          }

          // Avoid duplicate records.
          const existingIds = new Set(previous.map((category) => category.id));

          return [
            ...previous,
            ...newCategories.filter(
              (category) => !existingIds.has(category.id),
            ),
          ];
        });

        currentPageRef.current = pageNumber;
        setCategoriesPage(pageNumber);

        const totalPages = Number(result.pagination?.totalPages || 0);

        const moreAvailable =
          totalPages > 0
            ? pageNumber < totalPages
            : newCategories.length === PAGE_SIZE;

        hasMoreRef.current = moreAvailable;
        setHasMoreCategories(moreAvailable);
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.error("ITEM GROUP FETCH ERROR:", error);

          showErrorToast(error.message || "Failed to load parent categories.");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setCategoriesLoading(false);
          setLoadingMoreCategories(false);
        }

        if (append) {
          loadingMoreRef.current = false;
        }
      }
    },
    [],
  );

  // =======================================================
  // LOAD FIRST 100 CATEGORIES
  // =======================================================

  useEffect(() => {
    if (!open) return;

    requestIdRef.current += 1;

    currentPageRef.current = 1;
    hasMoreRef.current = true;
    loadingMoreRef.current = false;

    setCategories([]);
    setCategoriesPage(1);
    setHasMoreCategories(true);
    setCategoriesLoading(true);
    setLoadingMoreCategories(false);

    fetchCategories(1, false);

    return () => {
      requestIdRef.current += 1;
      loadingMoreRef.current = false;
    };
  }, [open, fetchCategories]);

  // =======================================================
  // PARENT CATEGORY OPTIONS
  // =======================================================

  const parentOptions = useMemo(() => {
    let availableCategories = categories;

    if (form.id) {
      const invalidIds = new Set([
        form.id,
        ...getDescendantIds(categories, form.id),
      ]);

      availableCategories = categories.filter(
        (category) => !invalidIds.has(category.id),
      );
    }

    const categoryTree = buildCategoryTree(availableCategories);

    return flattenCategoryTree(categoryTree);
  }, [categories, form.id]);

  // =======================================================
  // SEARCH CATEGORY OPTIONS
  // =======================================================

  const filteredParentOptions = useMemo(() => {
    const search = parentSearch.trim().toLowerCase();

    if (!search) {
      return parentOptions;
    }

    return parentOptions.filter((category) =>
      category.groupName?.toLowerCase().includes(search),
    );
  }, [parentOptions, parentSearch]);

  // =======================================================
  // SELECTED PARENT CATEGORY
  // =======================================================

  const selectedParent = parentOptions.find(
    (category) => category.id === form.parentId,
  );

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
  // SELECT PARENT CATEGORY
  // =======================================================

  const handleParentSelect = (parentId) => {
    handleChange("parentId", parentId);

    setParentDropdownOpen(false);
    setParentSearch("");
  };

  // =======================================================
  // LOAD NEXT PAGE ON SCROLL
  // =======================================================

  const handleCategoryScroll = (event) => {
    const element = event.currentTarget;

    const isNearBottom =
      element.scrollTop + element.clientHeight >= element.scrollHeight - 40;

    if (
      isNearBottom &&
      hasMoreRef.current &&
      !loadingMoreRef.current &&
      !categoriesLoading
    ) {
      fetchCategories(currentPageRef.current + 1, true);
    }
  };

  // =======================================================
  // VALIDATION
  // =======================================================

  const validate = () => {
    const newErrors = {};

    const groupName = form.groupName?.trim() || "";

    if (!groupName) {
      newErrors.groupName = "Group name is required.";
    } else if (groupName.length > 255) {
      newErrors.groupName = "Group name must not exceed 255 characters.";
    }

    // Prevent selecting itself or its descendants.
    if (form.parentId && form.id) {
      const invalidParentIds = [
        form.id,
        ...getDescendantIds(categories, form.id),
      ];

      if (invalidParentIds.includes(form.parentId)) {
        newErrors.parentId =
          "You cannot select yourself or a child category as parent.";
      }
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

  // =======================================================
  // SAVE
  // =======================================================

  const handleSave = async () => {
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

    const itemGroupData = {
      id: form.id,
      groupName: form.groupName.trim(),
      description: form.description.trim() || null,
      parentId: form.parentId || null,
      status: form.status === "true",
      isDefault: form.isDefault === "true",
      customFields: customFields ?? {},
    };

    try {
      const response = await fetch("/api/inventory/item-groups", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemGroupData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update item group.");
      }

      console.log("Updated Item Group:", result.data);

      showSuccessToast("Item group updated successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("ITEM GROUP UPDATE ERROR:", error);

      showErrorToast(error.message || "Failed to update item group.");
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    requestIdRef.current += 1;

    loadingMoreRef.current = false;
    currentPageRef.current = 1;
    hasMoreRef.current = true;

    setErrors({});

    setCategories([]);
    setCategoriesPage(1);
    setHasMoreCategories(true);
    setCategoriesLoading(false);
    setLoadingMoreCategories(false);

    setParentSearch("");
    setParentDropdownOpen(false);

    setCustomFields({});
    setCustomFieldDefinitions([]);
    setCustomFieldsReady(false);

    setForm(EMPTY_FORM);

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
      <DialogContent className="max-h-[75vh] overflow-y-auto">
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Item Group</DialogTitle>

            <DialogDescription>
              Update item group information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* GROUP NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Group Name <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.groupName}
                  placeholder="Enter group name"
                  onChange={(e) => handleChange("groupName", e.target.value)}
                />

                {errors.groupName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.groupName}
                  </p>
                )}
              </div>

              {/* PARENT CATEGORY */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Parent Category
                </label>

                <Popover
                  open={parentDropdownOpen}
                  onOpenChange={(value) => {
                    setParentDropdownOpen(value);

                    if (!value) {
                      setParentSearch("");
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={parentDropdownOpen}
                      disabled={categoriesLoading}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {categoriesLoading
                          ? "Loading categories..."
                          : form.parentId
                            ? selectedParent?.groupName ||
                              "Select parent category"
                            : "Root (No Parent)"}
                      </span>

                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                  >
                    {/* SEARCH */}

                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />

                      <Input
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        placeholder="Search category..."
                        className="h-10 border-0 shadow-none focus-visible:ring-0"
                      />
                    </div>

                    {/* SCROLLABLE CATEGORY LIST */}

                    <div
                      className="max-h-56 overflow-y-auto overscroll-contain"
                      onScroll={handleCategoryScroll}
                    >
                      <div className="p-1">
                        {/* ROOT CATEGORY */}

                        <button
                          type="button"
                          onClick={() => handleParentSelect(null)}
                          className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <span>Root (No Parent)</span>

                          {!form.parentId && <Check className="h-4 w-4" />}
                        </button>

                        {/* CATEGORY OPTIONS */}

                        {filteredParentOptions.length > 0 ? (
                          filteredParentOptions.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleParentSelect(category.id)}
                              className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              <span
                                className="truncate"
                                style={{
                                  paddingLeft: `${category.level * 16}px`,
                                }}
                              >
                                {category.level > 0 && (
                                  <span className="mr-1 text-muted-foreground">
                                    {Array(category.level).fill("—").join(" ")}
                                  </span>
                                )}

                                {category.groupName}
                              </span>

                              {form.parentId === category.id && (
                                <Check className="ml-2 h-4 w-4 shrink-0" />
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                            {categoriesLoading
                              ? "Loading categories..."
                              : "No categories found."}
                          </p>
                        )}

                        {/* LOADING MORE */}

                        {loadingMoreCategories && (
                          <p className="py-3 text-center text-xs text-muted-foreground">
                            Loading more categories...
                          </p>
                        )}

                        {/* END OF LIST */}

                        {!hasMoreCategories && categories.length > 0 && (
                          <p className="py-3 text-center text-xs text-muted-foreground">
                            All categories loaded.
                          </p>
                        )}

                        {/* EMPTY STATE */}

                        {!categoriesLoading && categories.length === 0 && (
                          <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                            No categories available.
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {errors.parentId && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.parentId}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  Search and select a parent category, or select Root if this
                  category should not have a parent.
                </p>
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
                  onChange={(e) => handleChange("description", e.target.value)}
                />
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
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DEFAULT */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Default Group <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.isDefault}
                  onValueChange={(value) => handleChange("isDefault", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CUSTOM FIELDS */}

              <div className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-base font-semibold">Custom Fields</h3>

                  <p className="text-sm text-muted-foreground">
                    Additional item group information.
                  </p>
                </div>

                <ItemGroupCustomFields
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>

            <Button type="button" onClick={handleSave}>
              Update
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}