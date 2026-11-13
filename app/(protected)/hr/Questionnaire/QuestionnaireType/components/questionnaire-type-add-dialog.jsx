
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
// DEFAULT FORM
// =======================================================

const DEFAULT_FORM = {
  typeName: "",
  questionnaireCategoryId: "",
  description: "",
  status: "true",
};

// =======================================================
// COMPONENT
// =======================================================

export default function QuestionnaireTypeAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    ...(item && {
      typeName: item.typeName || "",
      questionnaireCategoryId: item.questionnaireCategoryId || "",
      description: item.description || "",
      status: item.status ? "true" : "false",
    }),
  });

  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  // =======================================================
  // FETCH QUESTIONNAIRE CATEGORIES
  // =======================================================

  useEffect(() => {
    if (!open) return;

    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);

        const response = await fetch(
          "/api/hr/QuestionnaireCategory?status=active&limit=10000"
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to fetch questionnaire categories."
          );
        }

        setCategories(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        console.error("QUESTIONNAIRE CATEGORY FETCH ERROR", error);
        toast.error(error.message || "Failed to load categories.");
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [open]);

  // =======================================================
  // SYNC FORM WHEN ITEM CHANGES
  // =======================================================

  useEffect(() => {
    setForm({
      ...DEFAULT_FORM,
      ...(item && {
        typeName: item.typeName || "",
        questionnaireCategoryId: item.questionnaireCategoryId || "",
        description: item.description || "",
        status: item.status ? "true" : "false",
      }),
    });

    setErrors({});
  }, [item, open]);

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

    const typeName = form.typeName?.trim() || "";

    if (!typeName) {
      newErrors.typeName = "Questionnaire Type name is required.";
    } else if (typeName.length > 255) {
      newErrors.typeName =
        "Questionnaire Type name must not exceed 255 characters.";
    }

    if (!form.questionnaireCategoryId) {
      newErrors.questionnaireCategoryId =
        "Please select a questionnaire category.";
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

    const typeData = {
      typeName: form.typeName.trim(),
      questionnaireCategoryId: form.questionnaireCategoryId,
      description: form.description.trim() || null,
      status: form.status === "true",
    };

    try {
      setSaving(true);

      const response = await fetch("/api/hr/QuestionnaireType", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(typeData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create questionnaire type."
        );
      }

      toast.success("Questionnaire Type added successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("QUESTIONNAIRE TYPE CREATE ERROR", error);

      toast.error(error.message || "Failed to add questionnaire type.");
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setErrors({});

    setForm({
      ...DEFAULT_FORM,
    });

    closeDialog?.();
  };

  // =======================================================
  // UI
  // =======================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !saving) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {item ? "Edit Questionnaire Type" : "Add Questionnaire Type"}
            </DialogTitle>

            <DialogDescription>
              {item
                ? "Update questionnaire type information."
                : "Create a new questionnaire type."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* QUESTIONNAIRE CATEGORY */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Questionnaire Category{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.questionnaireCategoryId}
                  onValueChange={(value) =>
                    updateField("questionnaireCategoryId", value)
                  }
                  disabled={loadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCategories
                          ? "Loading categories..."
                          : "Select questionnaire category"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.questionnaireCategoryId && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.questionnaireCategoryId}
                  </p>
                )}

                {!loadingCategories && categories.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No active questionnaire categories found.
                  </p>
                )}
              </div>

              {/* TYPE NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Questionnaire Type Name{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.typeName}
                  placeholder="Enter questionnaire type name"
                  maxLength={255}
                  onChange={(e) =>
                    updateField("typeName", e.target.value)
                  }
                />

                {errors.typeName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.typeName}
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
                  Status
                </label>

                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    updateField("status", value)
                  }
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
              disabled={saving || loadingCategories || categories.length === 0}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}