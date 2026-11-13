
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =======================================================
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,
  StatusName: "",
  CategoryId: "",
  mode: "Active",
  description: "",
  isDefault: "false",
};

// =======================================================
// CATEGORY HELPERS
// =======================================================

const getCategoryId = (category) =>
  String(
    category?.id ??
    category?.CategoryId ??
    category?.categoryId ??
    ""
  );

const getCategoryName = (category) =>
  category?.CategoryName ||
  category?.categoryName ||
  category?.name ||
  "";

// =======================================================
// COMPONENT
// =======================================================

export default function EmployeeCandidateEditDialog({
  open,
  closeDialog,
  onSuccess,
  EmployeeCandidate,
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  // =======================================================
  // LOAD CATEGORIES
  // =======================================================

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/hr/ContactCategory?limit=100");
        const result = await response.json();

        const categoryList = Array.isArray(result)
          ? result
          : result.data?.items ||
          result.data?.categories ||
          result.data ||
          [];

        setCategories(categoryList);

        const savedCategoryName =
          EmployeeCandidate?.CategoryName || "";

        const matchedCategory = categoryList.find(
          (category) =>
            getCategoryName(category).trim().toLowerCase() ===
            savedCategoryName.trim().toLowerCase()
        );

        setForm({
          id: EmployeeCandidate?.id || "",
          StatusName: EmployeeCandidate?.StatusName || "",
          CategoryId: matchedCategory
            ? String(getCategoryId(matchedCategory))
            : "",
          mode: EmployeeCandidate?.mode || "Active",
          description: EmployeeCandidate?.description || "",
          isDefault: EmployeeCandidate?.isDefault ? "true" : "false",
        });
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    if (open && EmployeeCandidate) {
      fetchCategories();
    }
  }, [open, EmployeeCandidate]);

  // =======================================================
  // LOAD EXISTING DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (EmployeeCandidate) {
      setForm({
        id: EmployeeCandidate.id || null,

        StatusName: EmployeeCandidate.StatusName || "",

        CategoryId: String(
          EmployeeCandidate.CategoryId ??
          EmployeeCandidate.categoryId ??
          EmployeeCandidate.category?.id ??
          ""
        ),

        mode: EmployeeCandidate.mode || "Active",

        description: EmployeeCandidate.description || "",

        isDefault: EmployeeCandidate.isDefault
          ? "true"
          : "false",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }

    setErrors({});
  }, [open, EmployeeCandidate]);

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

    const EmployeeCandidateData = {
      id: form.id,

      StatusName: form.StatusName.trim(),

      CategoryId: form.CategoryId || null,

      mode: form.mode,

      description: form.description.trim() || null,

      isDefault: form.isDefault === "true",
    };

    try {
      setSaving(true);

      const response = await fetch(
        "/api/hr/EmployeeCandidate",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(EmployeeCandidateData),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Failed to update Employee/Candidate Status."
        );
      }

      toast.success(
        "Employee/Candidate Status updated successfully."
      );

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error(
        "Employee/Candidate Status UPDATE ERROR:",
        error
      );

      toast.error(
        error.message ||
        "Unable to update Employee/Candidate Status."
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
    setForm({ ...EMPTY_FORM });
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
              Edit Employee/Candidate Status
            </DialogTitle>

            <DialogDescription>
              Update Employee/Candidate Status information.
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
                    handleChange("StatusName", e.target.value)
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
                    setForm((prev) => ({
                      ...prev,
                      CategoryId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={getCategoryId(category)}
                        value={String(getCategoryId(category))}
                      >
                        {getCategoryName(category)}
                      </SelectItem>
                    ))}
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
                    handleChange("mode", value)
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
                  value={form.description}
                  placeholder="Enter description"
                  onChange={(e) =>
                    handleChange("description", e.target.value)
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
                    handleChange("isDefault", value)
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
              {saving ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>

        </div>
      </DialogContent>
    </Dialog>
  );
}