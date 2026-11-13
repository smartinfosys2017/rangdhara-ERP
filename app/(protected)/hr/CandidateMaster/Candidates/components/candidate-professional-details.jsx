
"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// =====================================================
// INITIAL FORM DATA
// =====================================================

const initialFormData = {
    appliedDate: "",
    applyForPost: "",
    totalExperience: "",
    salaryBeingDrawn: "",
    interviewConductedAt: "",
    referenceName: "",
    remarks: "",
};

// =====================================================
// DYNAMIC ROW CREATORS
// =====================================================

const createSkill = () => ({ name: "" });

const createPreviousEmployee = () => ({
    companyName: "",
    designation: "",
    fromDate: "",
    toDate: "",
    reasonForLeaving: "",
});

const createDocument = () => ({
    documentName: "",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    remarks: "",
});

const createCustomField = () => ({
    name: "",
    value: "",
});

// =====================================================
// HELPERS
// =====================================================

const parseJsonValue = (value, fallback) => {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }

    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const formatDate = (value) => {
    if (!value) return "";

    // Avoid timezone shifting for YYYY-MM-DD values.
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10);
};

const normalizeRows = (value, createDefault) => {
    const parsed = parseJsonValue(value, []);

    if (Array.isArray(parsed)) {
        return parsed.length ? parsed : [createDefault()];
    }

    if (parsed && typeof parsed === "object") {
        return [parsed];
    }

    return [createDefault()];
};

const normalizeSkills = (value) => {
    const parsed = parseJsonValue(value, []);

    if (!Array.isArray(parsed)) return [createSkill()];

    return parsed.length
        ? parsed.map((skill) => ({
              name:
                  typeof skill === "string"
                      ? skill
                      : String(skill?.name ?? skill?.value ?? ""),
          }))
        : [createSkill()];
};

const normalizeCustomFields = (value) => {
    const parsed = parseJsonValue(value, {});

    if (Array.isArray(parsed)) {
        const fields = parsed.map((item) => ({
            name: String(item?.name ?? ""),
            value: String(item?.value ?? ""),
        }));

        return fields.length ? fields : [createCustomField()];
    }

    if (parsed && typeof parsed === "object") {
        const fields = Object.entries(parsed).map(([name, value]) => ({
            name,
            value: value == null ? "" : String(value),
        }));

        return fields.length ? fields : [createCustomField()];
    }

    return [createCustomField()];
};

const getProfessionalForm = (data = {}) => ({
    appliedDate: formatDate(data.appliedDate),
    applyForPost: data.applyForPost ?? "",
    totalExperience: data.totalExperience ?? "",
    salaryBeingDrawn: data.salaryBeingDrawn ?? "",
    interviewConductedAt: data.interviewConductedAt ?? "",
    referenceName: data.referenceName ?? "",
    remarks: data.remarks ?? "",
});

const extractProfessionalData = (result) => {
    return result?.data?.data ?? result?.data ?? null;
};

// =====================================================
// REUSABLE COMPONENTS
// =====================================================

function FieldRow({ label, children, required = false }) {
    return (
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="w-full shrink-0 text-sm font-medium text-foreground md:max-w-56">
                {label}
                {required && (
                    <span className="ml-1 text-destructive">*</span>
                )}
            </label>

            <div className="min-w-0 grow">{children}</div>
        </div>
    );
}

function DateField({ value, onChange, disabled = false }) {
    return (
        <Input
            type="date"
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="w-full"
        />
    );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function CandidateProfessionalDetails({
    candidateId,
    onSuccess,
    closeDialog,
    onPrevious,
    mode = "add",
}) {
    const isEditMode = mode === "edit";

    // =================================================
    // STATES
    // =================================================

    const [form, setForm] = useState({ ...initialFormData });

    const [skills, setSkills] = useState([createSkill()]);

    const [previousEmployeeDetails, setPreviousEmployeeDetails] =
        useState([createPreviousEmployee()]);

    const [documentDetails, setDocumentDetails] = useState([
        createDocument(),
    ]);

    const [customFields, setCustomFields] = useState([
        createCustomField(),
    ]);

    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [hasExistingRecord, setHasExistingRecord] = useState(false);

    // =================================================
    // FORM UPDATE
    // =================================================

    const updateField = (name, value) => {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // =================================================
    // RESET FORM
    // =================================================

    const resetForm = useCallback(() => {
        setForm({ ...initialFormData });
        setSkills([createSkill()]);
        setPreviousEmployeeDetails([createPreviousEmployee()]);
        setDocumentDetails([createDocument()]);
        setCustomFields([createCustomField()]);
        setHasExistingRecord(false);
    }, []);

    // =================================================
    // LOAD CANDIDATE PROFESSIONAL DETAILS
    // =================================================

    const loadProfessionalDetails = useCallback(async () => {
        if (!candidateId) return;

        try {
            setLoadingDetails(true);

            const response = await apiFetch(
                `/api/candidate/professional-detail?candidateId=${encodeURIComponent(candidateId)}`,
                {
                    method: "GET",
                }
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (
                response?.ok === false ||
                result?.success === false
            ) {
                throw new Error(
                    result?.message ||
                        "Unable to load candidate professional details."
                );
            }

            const data = extractProfessionalData(result);

            if (data) {
                setForm(getProfessionalForm(data));

                setSkills(normalizeSkills(data.skills));

                setPreviousEmployeeDetails(
                    normalizeRows(
                        data.previousEmployeeDetails,
                        createPreviousEmployee
                    ).map((item) => ({
                        companyName: item?.companyName ?? "",
                        designation: item?.designation ?? "",
                        fromDate: formatDate(item?.fromDate),
                        toDate: formatDate(item?.toDate),
                        reasonForLeaving: item?.reasonForLeaving ?? "",
                    }))
                );

                setDocumentDetails(
                    normalizeRows(
                        data.documentDetails,
                        createDocument
                    ).map((item) => ({
                        documentName: item?.documentName ?? "",
                        documentNumber: item?.documentNumber ?? "",
                        issueDate: formatDate(item?.issueDate),
                        expiryDate: formatDate(item?.expiryDate),
                        remarks: item?.remarks ?? "",
                    }))
                );

                setCustomFields(
                    normalizeCustomFields(data.customFields)
                );

                setHasExistingRecord(true);
            } else {
                resetForm();
            }
        } catch (error) {
            console.error(
                "LOAD CANDIDATE PROFESSIONAL DETAILS ERROR:",
                error
            );

            toast.error(
                error?.message ||
                    "Unable to load candidate professional details."
            );
        } finally {
            setLoadingDetails(false);
        }
    }, [candidateId, resetForm]);

    // =================================================
    // INITIALIZE
    // =================================================

    useEffect(() => {
        if (!candidateId) {
            resetForm();
            return;
        }

        loadProfessionalDetails();
    }, [candidateId, loadProfessionalDetails, resetForm]);

    // =================================================
    // GENERIC ARRAY HELPERS
    // =================================================

    const updateArrayItem = (setter, index, field, value) => {
        setter((previous) =>
            previous.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    };

    const removeArrayItem = (setter, index, createDefault) => {
        setter((previous) => {
            const updated = previous.filter((_, i) => i !== index);

            return updated.length ? updated : [createDefault()];
        });
    };

    // =================================================
    // SKILLS
    // =================================================

    const addSkill = () => {
        setSkills((previous) => [...previous, createSkill()]);
    };

    const updateSkill = (index, value) => {
        setSkills((previous) =>
            previous.map((item, i) =>
                i === index ? { ...item, name: value } : item
            )
        );
    };

    const removeSkill = (index) => {
        removeArrayItem(setSkills, index, createSkill);
    };

    // =================================================
    // PREVIOUS EMPLOYMENT
    // =================================================

    const addPreviousEmployee = () => {
        setPreviousEmployeeDetails((previous) => [
            ...previous,
            createPreviousEmployee(),
        ]);
    };

    const updatePreviousEmployee = (index, field, value) => {
        updateArrayItem(
            setPreviousEmployeeDetails,
            index,
            field,
            value
        );
    };

    const removePreviousEmployee = (index) => {
        removeArrayItem(
            setPreviousEmployeeDetails,
            index,
            createPreviousEmployee
        );
    };

    // =================================================
    // DOCUMENT DETAILS
    // =================================================

    const addDocument = () => {
        setDocumentDetails((previous) => [
            ...previous,
            createDocument(),
        ]);
    };

    const updateDocument = (index, field, value) => {
        updateArrayItem(setDocumentDetails, index, field, value);
    };

    const removeDocument = (index) => {
        removeArrayItem(setDocumentDetails, index, createDocument);
    };

    // =================================================
    // CUSTOM FIELDS
    // =================================================

    const addCustomField = () => {
        setCustomFields((previous) => [
            ...previous,
            createCustomField(),
        ]);
    };

    const updateCustomField = (index, field, value) => {
        updateArrayItem(setCustomFields, index, field, value);
    };

    const removeCustomField = (index) => {
        removeArrayItem(setCustomFields, index, createCustomField);
    };

    // =================================================
    // JSON HELPERS
    // =================================================

    const getSkills = () =>
        skills
            .map((item) => item.name.trim())
            .filter(Boolean);

    const getPreviousEmployeeDetails = () =>
        previousEmployeeDetails.filter((item) =>
            Object.values(item).some((value) =>
                String(value || "").trim()
            )
        );

    const getDocumentDetails = () =>
        documentDetails.filter((item) =>
            Object.values(item).some((value) =>
                String(value || "").trim()
            )
        );

    const getCustomFieldsObject = () => {
        const result = {};

        customFields.forEach((field) => {
            const name = String(field.name || "").trim();

            if (name) {
                result[name] = field.value ?? "";
            }
        });

        return result;
    };

    // =================================================
    // SUBMIT
    // =================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading || loadingDetails) return;

        if (!candidateId) {
            toast.error("Please save candidate basic details first.");
            return;
        }

        const requiredFields = [
            { value: form.appliedDate, label: "Applied Date" },
            { value: form.applyForPost, label: "Apply For Post" },
            { value: form.totalExperience, label: "Total Experience" },
        ];

        const missingFields = requiredFields
            .filter((field) => !String(field.value ?? "").trim())
            .map((field) => field.label);

        if (missingFields.length > 0) {
            toast.error(
                `Please complete the required fields: ${missingFields.join(", ")}.`
            );
            return;
        }

        try {
            setLoading(true);

            const payload = {
                candidateId,
                appliedDate: form.appliedDate || null,
                applyForPost: form.applyForPost || null,
                totalExperience: form.totalExperience || null,
                salaryBeingDrawn: form.salaryBeingDrawn || null,
                interviewConductedAt: form.interviewConductedAt || null,
                skills: getSkills(),
                referenceName: form.referenceName || null,
                remarks: form.remarks || null,
                previousEmployeeDetails: getPreviousEmployeeDetails(),
                documentDetails: getDocumentDetails(),
                customFields: getCustomFieldsObject(),
            };

            const method = hasExistingRecord ? "PUT" : "POST";

            const response = await apiFetch(
                "/api/candidate/professional-detail",
                {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (
                response?.ok === false ||
                result?.success === false
            ) {
                throw new Error(
                    result?.message ||
                        "Unable to save candidate professional details."
                );
            }

            const savedData = extractProfessionalData(result);

            toast.success(
                result?.message ||
                    (hasExistingRecord
                        ? "Candidate professional details updated successfully."
                        : "Candidate professional details saved successfully.")
            );

            setHasExistingRecord(true);

            await onSuccess?.(savedData);
        } catch (error) {
            console.error(
                "SAVE CANDIDATE PROFESSIONAL DETAILS ERROR:",
                error
            );

            toast.error(
                error?.message ||
                    "Something went wrong while saving candidate professional details."
            );
        } finally {
            setLoading(false);
        }
    };

    // =================================================
    // LOADING STATE
    // =================================================

    if (loadingDetails) {
        return (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin" />
                Loading candidate professional details...
            </div>
        );
    }

    // =================================================
    // RENDER
    // =================================================

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Card className="pb-2.5">
                <CardHeader id="candidate_professional_details">
                    <CardTitle>Professional Details</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-6">
                    {/* JOB INFORMATION */}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Applied Date</Label>
                            <Input
                                type="date"
                                value={form.appliedDate || ""}
                                onChange={(e) =>
                                    updateField("appliedDate", e.target.value)
                                }
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Apply For Post</Label>
                            <Input
                                value={form.applyForPost || ""}
                                onChange={(e) =>
                                    updateField("applyForPost", e.target.value)
                                }
                                placeholder="Enter post"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Total Experience</Label>
                            <Input
                                value={form.totalExperience || ""}
                                onChange={(e) =>
                                    updateField("totalExperience", e.target.value)
                                }
                                placeholder="Enter total experience"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Salary Being Drawn</Label>
                            <Input
                                value={form.salaryBeingDrawn || ""}
                                onChange={(e) =>
                                    updateField("salaryBeingDrawn", e.target.value)
                                }
                                placeholder="Enter current salary"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* SKILLS AND REFERENCES */}

                    <div className="space-y-2">
                        <Label>Interview Conducted At</Label>
                        <Input
                            value={form.interviewConductedAt || ""}
                            onChange={(e) =>
                                updateField(
                                    "interviewConductedAt",
                                    e.target.value
                                )
                            }
                            placeholder="Enter interview location"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Skills & References
                            </h3>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSkill}
                                disabled={loading}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Skill
                            </Button>
                        </div>

                        {skills.map((skill, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    placeholder={`Enter skill ${index + 1}`}
                                    value={skill.name}
                                    onChange={(e) =>
                                        updateSkill(index, e.target.value)
                                    }
                                    disabled={loading}
                                />

                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => removeSkill(index)}
                                    disabled={loading}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        ))}

                        <FieldRow label="Reference Name">
                            <Input
                                placeholder="Enter reference name"
                                value={form.referenceName}
                                onChange={(e) =>
                                    updateField("referenceName", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>
                    </div>

                    {/* ADDITIONAL INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Additional Information
                        </h3>

                        <FieldRow label="Remarks">
                            <Textarea
                                placeholder="Enter remarks"
                                value={form.remarks}
                                onChange={(e) =>
                                    updateField("remarks", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>
                    </div>

                    {/* PREVIOUS EMPLOYMENT DETAILS */}

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Previous Employment Details
                            </h3>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addPreviousEmployee}
                                disabled={loading}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Previous Employment
                            </Button>
                        </div>

                        {previousEmployeeDetails.map((item, index) => (
                            <div
                                key={index}
                                className="rounded-md border border-border p-4"
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">
                                        Previous Employment {index + 1}
                                    </h4>

                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() =>
                                            removePreviousEmployee(index)
                                        }
                                        disabled={loading}
                                    >
                                        <Trash2 className="mr-1 size-4" />
                                        Remove
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <FieldRow label="Company Name">
                                        <Input
                                            placeholder="Enter company name"
                                            value={item.companyName}
                                            onChange={(e) =>
                                                updatePreviousEmployee(
                                                    index,
                                                    "companyName",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Designation">
                                        <Input
                                            placeholder="Enter designation"
                                            value={item.designation}
                                            onChange={(e) =>
                                                updatePreviousEmployee(
                                                    index,
                                                    "designation",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="From Date">
                                        <DateField
                                            value={item.fromDate}
                                            onChange={(value) =>
                                                updatePreviousEmployee(
                                                    index,
                                                    "fromDate",
                                                    value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="To Date">
                                        <DateField
                                            value={item.toDate}
                                            onChange={(value) =>
                                                updatePreviousEmployee(
                                                    index,
                                                    "toDate",
                                                    value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Reason for Leaving">
                                        <Textarea
                                            placeholder="Enter reason for leaving"
                                            value={item.reasonForLeaving}
                                            onChange={(e) =>
                                                updatePreviousEmployee(
                                                    index,
                                                    "reasonForLeaving",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* DOCUMENT DETAILS */}

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Document Details
                            </h3>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addDocument}
                                disabled={loading}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Document
                            </Button>
                        </div>

                        {documentDetails.map((item, index) => (
                            <div
                                key={index}
                                className="rounded-md border border-border p-4"
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">
                                        Document {index + 1}
                                    </h4>

                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeDocument(index)}
                                        disabled={loading}
                                    >
                                        <Trash2 className="mr-1 size-4" />
                                        Remove
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <FieldRow label="Document Name">
                                        <Input
                                            placeholder="Enter document name"
                                            value={item.documentName}
                                            onChange={(e) =>
                                                updateDocument(
                                                    index,
                                                    "documentName",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Document Number">
                                        <Input
                                            placeholder="Enter document number"
                                            value={item.documentNumber}
                                            onChange={(e) =>
                                                updateDocument(
                                                    index,
                                                    "documentNumber",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Issue Date">
                                        <DateField
                                            value={item.issueDate}
                                            onChange={(value) =>
                                                updateDocument(
                                                    index,
                                                    "issueDate",
                                                    value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Expiry Date">
                                        <DateField
                                            value={item.expiryDate}
                                            onChange={(value) =>
                                                updateDocument(
                                                    index,
                                                    "expiryDate",
                                                    value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Remarks">
                                        <Textarea
                                            placeholder="Enter document remarks"
                                            value={item.remarks}
                                            onChange={(e) =>
                                                updateDocument(
                                                    index,
                                                    "remarks",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CUSTOM FIELDS */}

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Custom Fields
                            </h3>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addCustomField}
                                disabled={loading}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Field
                            </Button>
                        </div>

                        {customFields.map((field, index) => (
                            <div
                                key={index}
                                className="rounded-md border border-border p-4"
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">
                                        Custom Field {index + 1}
                                    </h4>

                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeCustomField(index)}
                                        disabled={loading}
                                    >
                                        <Trash2 className="mr-1 size-4" />
                                        Remove
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <FieldRow label="Field Name">
                                        <Input
                                            placeholder="Enter field name"
                                            value={field.name}
                                            onChange={(e) =>
                                                updateCustomField(
                                                    index,
                                                    "name",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Field Value">
                                        <Input
                                            placeholder="Enter field value"
                                            value={field.value}
                                            onChange={(e) =>
                                                updateCustomField(
                                                    index,
                                                    "value",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>

                {/* FORM ACTIONS */}

                <div className="sticky bottom-0 z-10 flex flex-wrap justify-between gap-3 border-t bg-background px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={loading}
                        onClick={onPrevious}
                    >
                        Previous
                    </Button>

                    <div className="flex flex-wrap justify-end gap-3">
                        {closeDialog && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={loading}
                                onClick={closeDialog}
                            >
                                Cancel
                            </Button>
                        )}

                        <Button
                            type="submit"
                            disabled={
                                loading ||
                                loadingDetails ||
                                !candidateId
                            }
                        >
                            {loading ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Saving...
                                </>
                            ) : isEditMode ? (
                                "Update Professional Details"
                            ) : (
                                "Save Professional Details"
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </form>
    );
}
