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
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// =======================================================
// DEFAULT FORM
// =======================================================

const DEFAULT_FORM = {
    StatusName: "",
    CategoryId: "",
    mode: "Active",
    description: "",
    isDefault: "false",
};

// =======================================================
// CATEGORY HELPERS
// =======================================================

const getCategoryId = (category) => {
    return (
        category?.CategoryId ??
        category?.categoryId ??
        category?.id ??
        ""
    );
};

const getCategoryName = (category) => {
    return (
        category?.CategoryName ||
        category?.categoryName ||
        category?.name ||
        ""
    );
};

// =======================================================
// COMPONENT
// =======================================================

export default function   AddDialog({
    open,
    closeDialog,
    onSuccess,
    item = null,
}) {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [saving, setSaving] = useState(false);

    // =======================================================
    // FETCH CATEGORIES
    // =======================================================

    useEffect(() => {
        if (!open) return;

        const fetchCategories = async () => {
            try {
                setLoadingCategories(true);

                const response = await fetch(
                    "/api/hr/ContactCategory?limit=100&status=active"
                );

                const result = await response.json();

                if (!response.ok || result.success === false) {
                    throw new Error(
                        result.message || "Failed to load categories."
                    );
                }

                const categoryList = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                        ? result.data
                        : Array.isArray(result.data?.items)
                            ? result.data.items
                            : Array.isArray(result.data?.categories)
                                ? result.data.categories
                                : [];

                setCategories(categoryList);
            } catch (error) {
                console.error("CATEGORY FETCH ERROR:", error);
                toast.error(error.message || "Failed to load categories.");
                setCategories([]);
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchCategories();
    }, [open]);

    // =======================================================
    // INITIALIZE FORM
    // =======================================================

    useEffect(() => {
        if (!open) return;

        if (item) {
            setForm({
                StatusName: item.StatusName || "",
                CategoryId: String(
                    item.CategoryId ??
                    item.categoryId ??
                    item.category?.CategoryId ??
                    item.category?.id ??
                    ""
                ),
                mode: item.mode || "Active",
                description: item.description || "",
                isDefault: item.isDefault ? "true" : "false",
            });
        } else {
            setForm(DEFAULT_FORM);
        }

        setErrors({});
    }, [open, item]);

    // =======================================================
    // SELECT DEFAULT CATEGORY
    // =======================================================

    useEffect(() => {
        if (!open || item || !categories.length) return;

        const defaultCategory = categories.find(
            (category) =>
                category.isDefault === true ||
                category.isDefault === 1 ||
                category.isDefault === "true"
        );

        if (defaultCategory) {
            setForm((prev) => ({
                ...prev,
                CategoryId: String(getCategoryId(defaultCategory)),
            }));
        }
    }, [open, item, categories]);

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
    // VALIDATION
    // =======================================================

    const validate = () => {
        const newErrors = {};

        const statusName = form.StatusName?.trim() || "";

        if (!statusName) {
            newErrors.StatusName = "Status name is required.";
        } else if (statusName.length > 255) {
            newErrors.StatusName =
                "Status name must not exceed 255 characters.";
        }

        if (!form.CategoryId) {
            newErrors.CategoryId = "Please select a category.";
        }

        if (!["Active", "Inactive", "Hold"].includes(form.mode)) {
            newErrors.mode = "Please select a valid mode.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please check the required fields.");
            return false;
        }

        return true;
    };

    // =======================================================
    // SAVE
    // =======================================================

    const handleSave = async () => {
        if (!validate()) return;

        const categoryData = {
            StatusName: form.StatusName.trim(),
            CategoryId: form.CategoryId,
            mode: form.mode,
            description: form.description.trim() || null,
            isDefault: form.isDefault === "true",
        };

        try {
            setSaving(true);

            const response = await fetch("/api/hr/EmployeeCandidate", {
                method: item ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(
                    item
                        ? {
                            id: item.id,
                            ...categoryData,
                        }
                        : categoryData
                ),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    `Failed to ${item ? "update" : "create"} status.`
                );
            }

            toast.success(
                item
                    ? "Status updated successfully."
                    : "Status added successfully."
            );

            onSuccess?.(result.data);
            handleClose();
        } catch (error) {
            console.error("EMPLOYEE CANDIDATE SAVE ERROR:", error);

            toast.error(
                error.message ||
                `Failed to ${item ? "update" : "add"} status.`
            );
        } finally {
            setSaving(false);
        }
    };

    // =======================================================
    // CLOSE
    // =======================================================

    const handleClose = () => {
        setErrors({});
        setForm(DEFAULT_FORM);
        closeDialog?.();
    };

    // =======================================================
    // RENDER
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
                            {item ? "Edit Status" : "Add Status"}
                        </DialogTitle>

                        <DialogDescription>
                            {item
                                ? "Update status information."
                                : "Create a new status."}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                        <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

                            {/* STATUS NAME */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Status Name{" "}
                                    <span className="text-destructive">*</span>
                                </label>

                                <Input
                                    value={form.StatusName}
                                    placeholder="Enter status name"
                                    onChange={(e) =>
                                        updateField("StatusName", e.target.value)
                                    }
                                />

                                {errors.StatusName && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.StatusName}
                                    </p>
                                )}
                            </div>

                            {/* CATEGORY */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Category{" "}
                                    <span className="text-destructive">*</span>
                                </label>

                                <Select
                                    value={form.CategoryId}
                                    onValueChange={(value) =>
                                        updateField("CategoryId", value)
                                    }
                                    disabled={loadingCategories}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                loadingCategories
                                                    ? "Loading categories..."
                                                    : "Select category"
                                            }
                                        />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {categories.map((category) => {
                                            const categoryId = getCategoryId(category);
                                            const categoryName = getCategoryName(category);

                                            if (!categoryId || !categoryName) {
                                                return null;
                                            }

                                            return (
                                                <SelectItem
                                                    key={categoryId}
                                                    value={String(categoryId)}
                                                >
                                                    {categoryName}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>

                                {errors.CategoryId && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.CategoryId}
                                    </p>
                                )}
                            </div>

                            {/* MODE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Mode{" "}
                                    <span className="text-destructive">*</span>
                                </label>

                                <Select
                                    value={form.mode}
                                    onValueChange={(value) =>
                                        updateField("mode", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select mode" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="Active">
                                            Active
                                        </SelectItem>

                                        <SelectItem value="Inactive">
                                            Inactive
                                        </SelectItem>

                                        <SelectItem value="Hold">
                                            Hold
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {errors.mode && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.mode}
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

                            {/* IS DEFAULT */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Is Default
                                </label>

                                <Select
                                    value={form.isDefault}
                                    onValueChange={(value) =>
                                        updateField("isDefault", value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select default option" />
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
                        <ScrollArea className="hidden" />
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

                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || loadingCategories}
                        >
                            {saving
                                ? "Saving..."
                                : item
                                    ? "Update"
                                    : "Save"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}