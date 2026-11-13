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

// =======================================================
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,
  typeName: "",
  questionnaireCategoryId: "",
  description: "",
  status: "true",
};

// =======================================================
// COMPONENT
// =======================================================

export default function QuestionnaireTypeEditDialog({
  open,
  closeDialog,
  onSuccess,
  questionnaireType,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);

  // =======================================================
  // LOAD CATEGORIES
  // =======================================================

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await fetch(
        "/api/hr/QuestionnaireCategory?status=active&limit=10000"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load categories.");
      }

      const categoryList = Array.isArray(result.data)
        ? result.data
        : result.data?.items || [];

      setCategories(categoryList);
    } catch (error) {
      console.error("QUESTIONNAIRE CATEGORY LOAD ERROR:", error);
      toast.error(error.message || "Unable to load questionnaire categories.");
    } finally {
      setLoadingCategories(false);
    }
  };

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (questionnaireType) {
      setForm({
        id: questionnaireType.id || null,
        typeName: questionnaireType.typeName || "",
        questionnaireCategoryId: questionnaireType.questionnaireCategoryId
          ? String(questionnaireType.questionnaireCategoryId)
          : "",
        description: questionnaireType.description || "",
        status: questionnaireType.status ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
    loadCategories();
  }, [open, questionnaireType]);

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

    const typeName = form.typeName?.trim() || "";

    if (!typeName) {
      newErrors.typeName = "Type Name is required.";
    } else if (typeName.length > 255) {
      newErrors.typeName = "Type Name must not exceed 255 characters.";
    }

    if (!form.questionnaireCategoryId) {
      newErrors.questionnaireCategoryId =
        "Questionnaire Category is required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please check the required fields and character limits.");
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
      id: form.id,
      typeName: form.typeName.trim(),
      questionnaireCategoryId: form.questionnaireCategoryId,
      description: form.description.trim() || null,
      status: form.status === "true",
    };

    try {
      setSaving(true);

      const response = await fetch("/api/hr/QuestionnaireType", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(typeData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update questionnaire type."
        );
      }

      toast.success("Questionnaire type updated successfully.");

      onSuccess?.(result.data);
      handleClose();
    } catch (error) {
      console.error("QUESTIONNAIRE TYPE UPDATE ERROR:", error);

      toast.error(error.message || "Unable to update questionnaire type.");
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
        <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Questionnaire Type</DialogTitle>
            <DialogDescription>
              Update questionnaire type information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex h-full max-h-[90vh] min-h-0 grow flex-col overflow-hidden">
            <DialogBody className="min-h-0 space-y-6 px-0 pt-0">

              {/* TYPE NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Type Name <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.typeName}
                  placeholder="Enter questionnaire type name"
                  maxLength={255}
                  onChange={(e) => handleChange("typeName", e.target.value)}
                />

                {errors.typeName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.typeName}
                  </p>
                )}
              </div>

              {/* QUESTIONNAIRE CATEGORY */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Questionnaire Category{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.questionnaireCategoryId}
                  onValueChange={(value) =>
                    handleChange("questionnaireCategoryId", value)
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
                      <SelectItem
                        key={category.id}
                        value={String(category.id)}
                      >
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

              {/* STATUS */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Status
                </label>

                <Select
                  value={form.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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
              disabled={saving || loadingCategories}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}