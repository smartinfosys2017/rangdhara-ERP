
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
    questionName: "",
    questionnaireTypeId: "",
    question: "",
    status: "true",
};

// =======================================================
// COMPONENT
// =======================================================

export default function QuestionAddDialog({
    open,
    closeDialog,
    onSuccess,
}) {
    const [form, setForm] = useState({
        ...DEFAULT_FORM,
    });

    const [errors, setErrors] = useState({});

    const [questionnaireTypes, setQuestionnaireTypes] = useState([]);
    const [loadingTypes, setLoadingTypes] = useState(false);

    const [saving, setSaving] = useState(false);

    // =======================================================
    // FETCH QUESTIONNAIRE TYPES
    // =======================================================

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        const fetchQuestionnaireTypes = async () => {
            try {
                setLoadingTypes(true);

                const response = await fetch(
                    "/api/hr/QuestionnaireType?status=active&limit=10000",
                    {
                        cache: "no-store",
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        "Failed to fetch questionnaire types."
                    );
                }

                if (!cancelled) {
                    setQuestionnaireTypes(
                        Array.isArray(result.data)
                            ? result.data
                            : []
                    );
                }
            } catch (error) {
                console.error(
                    "QUESTIONNAIRE TYPE FETCH ERROR",
                    error
                );

                if (!cancelled) {
                    toast.error(
                        error.message ||
                        "Failed to load questionnaire types."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingTypes(false);
                }
            }
        };

        void fetchQuestionnaireTypes();

        return () => {
            cancelled = true;
        };
    }, [open]);

    // =======================================================
    // RESET FORM WHEN DIALOG OPENS
    // =======================================================

    useEffect(() => {
        if (!open) return;

        setForm({
            ...DEFAULT_FORM,
        });

        setErrors({});
    }, [open]);

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

        const questionName = form.questionName?.trim() || "";

        if (!questionName) {
            newErrors.questionName =
                "Question name is required.";
        } else if (questionName.length > 255) {
            newErrors.questionName =
                "Question name must not exceed 255 characters.";
        }

        if (!form.questionnaireTypeId) {
            newErrors.questionnaireTypeId =
                "Please select a questionnaire type.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error("Please check the required fields.");
            return false;
        }

        return true;
    };

    // =======================================================
    // SAVE QUESTION
    // =======================================================

    const handleSave = async () => {
        if (!validate()) return;

        const questionData = {
            questionName: form.questionName.trim(),

            questionnaireTypeId: form.questionnaireTypeId,

            question: form.question.trim() || null,

            status: form.status === "true",
        };

        try {
            setSaving(true);

            const response = await fetch(
                "/api/hr/Question",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(questionData),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Failed to create question."
                );
            }

            toast.success("Question added successfully.");

            onSuccess?.(result.data);

            handleClose();
        } catch (error) {
            console.error(
                "QUESTION CREATE ERROR",
                error
            );

            toast.error(
                error.message ||
                "Failed to add question."
            );
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
                <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">

                    {/* HEADER */}

                    <DialogHeader>
                        <DialogTitle>
                            Add Question
                        </DialogTitle>

                        <DialogDescription>
                            Create a new question and assign it to a questionnaire type.
                        </DialogDescription>
                    </DialogHeader>

                    {/* FORM */}

                    <ScrollArea className="flex h-full max-h-[90vh] min-h-0 grow flex-col overflow-hidden">
                        <DialogBody className="min-h-0 space-y-6 px-0 pt-0">

                            {/* QUESTIONNAIRE TYPE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Questionnaire Type{" "}
                                    <span className="text-destructive">
                                        *
                                    </span>
                                </label>

                                <Select
                                    value={form.questionnaireTypeId}
                                    onValueChange={(value) =>
                                        updateField(
                                            "questionnaireTypeId",
                                            value
                                        )
                                    }
                                    disabled={
                                        loadingTypes ||
                                        saving
                                    }
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
                                        {questionnaireTypes.map(
                                            (type) => (
                                                <SelectItem
                                                    key={type.id}
                                                    value={String(type.id)}
                                                >
                                                    {type.typeName}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>

                                {errors.questionnaireTypeId && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.questionnaireTypeId}
                                    </p>
                                )}

                                {!loadingTypes &&
                                    questionnaireTypes.length === 0 && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            No active questionnaire types found.
                                        </p>
                                    )}
                            </div>

                            {/* QUESTION NAME */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Question Name{" "}
                                    <span className="text-destructive">
                                        *
                                    </span>
                                </label>

                                <Input
                                    value={form.questionName}
                                    placeholder="Enter question name"
                                    maxLength={255}
                                    disabled={saving}
                                    onChange={(event) =>
                                        updateField(
                                            "questionName",
                                            event.target.value
                                        )
                                    }
                                />

                                {errors.questionName && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.questionName}
                                    </p>
                                )}
                            </div>

                            {/* QUESTION */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Question
                                </label>

                                <Textarea
                                    rows={5}
                                    placeholder="Enter question details"
                                    value={form.question}
                                    disabled={saving}
                                    onChange={(event) =>
                                        updateField(
                                            "question",
                                            event.target.value
                                        )
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
                                        updateField(
                                            "status",
                                            value
                                        )
                                    }
                                    disabled={saving}
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

                        </DialogBody>
                    </ScrollArea>

                    {/* FOOTER */}

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
                            disabled={
                                saving ||
                                loadingTypes ||
                                questionnaireTypes.length === 0
                            }
                        >
                            {saving
                                ? "Saving..."
                                : "Save"}
                        </Button>
                    </DialogFooter>

                </div>
            </DialogContent>
        </Dialog>
    );
}