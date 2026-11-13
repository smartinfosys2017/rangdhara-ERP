
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
  questionName: "",
  questionnaireTypeId: "",
  question: "",
  status: "true",
};

// =======================================================
// COMPONENT
// =======================================================

export default function QuestionEditDialog({
  open,
  closeDialog,
  onSuccess,
  question,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [questionnaireTypes, setQuestionnaireTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [saving, setSaving] = useState(false);

  // =======================================================
  // LOAD QUESTIONNAIRE TYPES
  // =======================================================

  const loadQuestionnaireTypes = async () => {
    try {
      setLoadingTypes(true);

      const response = await fetch(
        "/api/hr/QuestionnaireType?status=active&limit=10000"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load questionnaire types."
        );
      }

      const typeList = Array.isArray(result.data)
        ? result.data
        : result.data?.items || [];

      setQuestionnaireTypes(typeList);
    } catch (error) {
      console.error("QUESTIONNAIRE TYPE LOAD ERROR:", error);
      toast.error(error.message || "Unable to load questionnaire types.");
    } finally {
      setLoadingTypes(false);
    }
  };

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (question) {
      setForm({
        id: question.id || null,
        questionName: question.questionName || "",
        questionnaireTypeId: question.questionnaireTypeId
          ? String(question.questionnaireTypeId)
          : "",
        question: question.question || "",
        status: question.status ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
    loadQuestionnaireTypes();
  }, [open, question]);

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

    const questionName = form.questionName?.trim() || "";

    if (!questionName) {
      newErrors.questionName = "Question Name is required.";
    } else if (questionName.length > 255) {
      newErrors.questionName =
        "Question Name must not exceed 255 characters.";
    }

    if (!form.questionnaireTypeId) {
      newErrors.questionnaireTypeId =
        "Questionnaire Type is required.";
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

    const questionData = {
      id: form.id,
      questionName: form.questionName.trim(),
      questionnaireTypeId: form.questionnaireTypeId,
      question: form.question.trim() || null,
      status: form.status === "true",
    };

    try {
      setSaving(true);

      const response = await fetch("/api/hr/Question", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(questionData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update question."
        );
      }

      toast.success("Question updated successfully.");

      onSuccess?.(result.data);
      handleClose();
    } catch (error) {
      console.error("QUESTION UPDATE ERROR:", error);

      toast.error(error.message || "Unable to update question.");
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
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Update question information.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex h-full max-h-[90vh] min-h-0 grow flex-col overflow-hidden">
            <DialogBody className="min-h-0 space-y-6 px-0 pt-0">

              {/* QUESTION NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Question Name <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.questionName}
                  placeholder="Enter question name"
                  maxLength={255}
                  onChange={(e) =>
                    handleChange("questionName", e.target.value)
                  }
                />

                {errors.questionName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.questionName}
                  </p>
                )}
              </div>

              {/* QUESTIONNAIRE TYPE */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Questionnaire Type{" "}
                  <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.questionnaireTypeId}
                  onValueChange={(value) =>
                    handleChange("questionnaireTypeId", value)
                  }
                  disabled={loadingTypes}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingTypes
                          ? "Loading questionnaire types..."
                          : "Select questionnaire type"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {questionnaireTypes.map((type) => (
                      <SelectItem
                        key={type.id}
                        value={String(type.id)}
                      >
                        {type.typeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.questionnaireTypeId && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.questionnaireTypeId}
                  </p>
                )}
              </div>

              {/* QUESTION */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Question
                </label>

                <Textarea
                  rows={4}
                  value={form.question}
                  placeholder="Enter question details"
                  onChange={(e) =>
                    handleChange("question", e.target.value)
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
                    handleChange("status", value)
                  }
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
              disabled={saving || loadingTypes}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}