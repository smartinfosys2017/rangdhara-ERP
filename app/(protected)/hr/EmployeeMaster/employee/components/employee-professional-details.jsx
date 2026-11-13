"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    designation: "",
    department: "",
    experienceAsOn: "",
    joinDate: "",
    jobLocation: "",
    jobType: "",
    employmentStatus: "",
    shift: "",
    breakTime: "",
    referenceName: "",
    probationPeriod: "",
    appraisalApplicable: false,
    noticePeriod: "",
    remarks: "",
    agreementSigningDate: "",
    security: "",
};

// =====================================================
// DYNAMIC ROW CREATORS
// =====================================================

const createSkill = () => ({ name: "" });

const createBankDetail = () => ({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
});

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

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const formatDate = (value) => {
    if (!value) return "";

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? ""
            : value.toISOString().slice(0, 10);
    }

    const stringValue = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
        return stringValue.slice(0, 10);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10);
};

const normalizeRows = (value, createDefault) => {
    const parsed = parseJsonValue(value, []);

    if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed : [createDefault()];
    }

    if (parsed && typeof parsed === "object") {
        return [parsed];
    }

    return [createDefault()];
};

const normalizeSkills = (value) => {
    const parsed = parseJsonValue(value, []);

    if (!Array.isArray(parsed)) {
        return [createSkill()];
    }

    return parsed.length > 0
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
        const fields = parsed.map((field) => ({
            name: String(field?.name ?? ""),
            value: String(field?.value ?? ""),
        }));

        return fields.length > 0 ? fields : [createCustomField()];
    }

    if (parsed && typeof parsed === "object") {
        const fields = Object.entries(parsed).map(([name, fieldValue]) => ({
            name,
            value:
                fieldValue === null || fieldValue === undefined
                    ? ""
                    : String(fieldValue),
        }));

        return fields.length > 0 ? fields : [createCustomField()];
    }

    return [createCustomField()];
};

const getProfessionalForm = (data) => {
    if (!data) return { ...initialFormData };

    return {
        ...initialFormData,
        ...data,

        experienceAsOn: formatDate(data.experienceAsOn),
        joinDate: formatDate(data.joinDate),
        agreementSigningDate: formatDate(data.agreementSigningDate),

        probationPeriod: data.probationPeriod ?? "",
        noticePeriod: data.noticePeriod ?? "",
        appraisalApplicable: Boolean(data.appraisalApplicable),

        designation: data.designation ?? "",
        department: data.department ?? "",
        jobLocation: data.jobLocation ?? "",
        jobType: data.jobType ?? "",
        employmentStatus: data.employmentStatus ?? "",
        shift: data.shift ?? "",
        breakTime: data.breakTime ?? "",
        referenceName: data.referenceName ?? "",
        remarks: data.remarks ?? "",
        security: data.security ?? "",
    };
};

// Handles common API response structures:
// [ ... ], { data: [ ... ] }, { data: { data: [ ... ] } }
const extractArray = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.data)) return result.data.data;
    if (Array.isArray(result?.results)) return result.results;

    return [];
};

// Converts master records into select options.
// The option value uses the record name because the professional
// details form currently saves shift, breakTime and security as strings.
const makeOptions = (records, possibleNames) => {
    return records
        .map((item) => {
            let value = "";

            for (const key of possibleNames) {
                if (item?.[key] !== undefined && item?.[key] !== null) {
                    value = item[key];
                    break;
                }
            }

            if (!value && typeof item === "string") {
                value = item;
            }

            const stringValue = String(value ?? "").trim();

            return stringValue
                ? {
                    label: stringValue,
                    value: stringValue,
                }
                : null;
        })
        .filter(Boolean);
};

// Make sure an existing saved value remains selectable even if
// it is no longer present in the active master list.
const includeCurrentOption = (options, currentValue) => {
    const value = String(currentValue ?? "").trim();

    if (!value || options.some((option) => option.value === value)) {
        return options;
    }

    return [
        {
            label: value,
            value,
        },
        ...options,
    ];
};

// =====================================================
// REUSABLE COMPONENTS
// =====================================================

function FieldRow({ label, children, required = false }) {
    return (
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="w-full shrink-0 text-sm font-medium text-foreground md:max-w-56">
                {label}
                {required && <span className="ml-1 text-destructive">*</span>}
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

function SelectField({
    value,
    onChange,
    disabled,
    placeholder,
    options = [],
}) {
    return (
        <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
        >
            <option value="">{placeholder}</option>

            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function ProfessionalDetails({
    employeeId,
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
    const [bankDetails, setBankDetails] = useState([createBankDetail()]);
    const [previousEmployeeDetails, setPreviousEmployeeDetails] =
        useState([createPreviousEmployee()]);
    const [documentDetails, setDocumentDetails] = useState([createDocument()]);
    const [customFields, setCustomFields] = useState([createCustomField()]);

    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [hasExistingRecord, setHasExistingRecord] = useState(false);

    // Master dropdown states
    const [shiftOptions, setShiftOptions] = useState([]);
    const [breakTimeOptions, setBreakTimeOptions] = useState([]);
    const [securityOptions, setSecurityOptions] = useState([]);
    const [loadingMasters, setLoadingMasters] = useState(false);

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
        setBankDetails([createBankDetail()]);
        setPreviousEmployeeDetails([createPreviousEmployee()]);
        setDocumentDetails([createDocument()]);
        setCustomFields([createCustomField()]);
        setHasExistingRecord(false);
    }, []);

    // =================================================
    // LOAD MASTER DROPDOWNS
    // =================================================

    const loadMasterDropdowns = useCallback(async () => {
        setLoadingMasters(true);

        try {
            const [shiftResponse, breakTimeResponse, securityResponse] =
                await Promise.all([
                    apiFetch("/api/hr/Shift?limit=100&status=active"),
                    apiFetch("/api/hr/BreakTime?limit=100&status=active"),
                    apiFetch("/api/hr/Security?limit=100&status=active"),
                ]);

            const [shiftResult, breakTimeResult, securityResult] =
                await Promise.all([
                    typeof shiftResponse?.json === "function"
                        ? shiftResponse.json()
                        : shiftResponse,
                    typeof breakTimeResponse?.json === "function"
                        ? breakTimeResponse.json()
                        : breakTimeResponse,
                    typeof securityResponse?.json === "function"
                        ? securityResponse.json()
                        : securityResponse,
                ]);

            if (
                shiftResponse?.ok === false ||
                shiftResult?.success === false
            ) {
                throw new Error(
                    shiftResult?.message || "Unable to load shifts."
                );
            }

            if (
                breakTimeResponse?.ok === false ||
                breakTimeResult?.success === false
            ) {
                throw new Error(
                    breakTimeResult?.message || "Unable to load break times."
                );
            }

            if (
                securityResponse?.ok === false ||
                securityResult?.success === false
            ) {
                throw new Error(
                    securityResult?.message || "Unable to load security options."
                );
            }

            const shifts = extractArray(shiftResult);
            const breakTimes = extractArray(breakTimeResult);
            const securities = extractArray(securityResult);

            setShiftOptions(
                makeOptions(shifts, [
                    "name",
                    "shiftName",
                    "title",
                    "shift",
                ])
            );

            setBreakTimeOptions(
                makeOptions(breakTimes, [
                    "name",
                    "breakTimeName",
                    "breakTime",
                    "title",
                ])
            );

            setSecurityOptions(
                makeOptions(securities, [
                    "name",
                    "securityName",
                    "security",
                    "title",
                ])
            );
        } catch (error) {
            console.error("LOAD MASTER DROPDOWNS ERROR:", error);
            toast.error(error?.message || "Unable to load master dropdowns.");
        } finally {
            setLoadingMasters(false);
        }
    }, []);

    // IMPORTANT: Load all master dropdowns when this component mounts.
    useEffect(() => {
        loadMasterDropdowns();
    }, [loadMasterDropdowns]);

    // Keep existing saved values available in edit mode.
    const finalShiftOptions = includeCurrentOption(shiftOptions, form.shift);
    const finalBreakTimeOptions = includeCurrentOption(
        breakTimeOptions,
        form.breakTime
    );
    const finalSecurityOptions = includeCurrentOption(
        securityOptions,
        form.security
    );

    // =================================================
    // LOAD PROFESSIONAL DETAILS
    // =================================================

    const loadProfessionalDetails = useCallback(async () => {
        if (!employeeId) return;

        try {
            setLoadingDetails(true);

            const response = await apiFetch(
                `/api/employee/professional-detail?employeeId=${encodeURIComponent(
                    employeeId
                )}`,
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
                    result?.message || "Unable to load professional details."
                );
            }

            const professionalData = result?.data?.data ?? result?.data ?? null;

            if (professionalData) {
                setForm(getProfessionalForm(professionalData));

                setSkills(normalizeSkills(professionalData.skills));

                setBankDetails(
                    normalizeRows(
                        professionalData.bankDetails,
                        createBankDetail
                    ).map((item) => ({
                        bankName: item?.bankName ?? "",
                        accountHolder: item?.accountHolder ?? "",
                        accountNumber: item?.accountNumber ?? "",
                        ifscCode: item?.ifscCode ?? "",
                        branch: item?.branch ?? "",
                    }))
                );

                setPreviousEmployeeDetails(
                    normalizeRows(
                        professionalData.previousEmployeeDetails,
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
                        professionalData.documentDetails,
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
                    normalizeCustomFields(professionalData.customFields)
                );

                setHasExistingRecord(true);
            } else {
                resetForm();
            }
        } catch (error) {
            console.error("LOAD PROFESSIONAL DETAILS ERROR:", error);

            toast.error(
                error?.message || "Unable to load professional details."
            );
        } finally {
            setLoadingDetails(false);
        }
    }, [employeeId, resetForm]);

    // =================================================
    // INITIALIZE
    // =================================================

    useEffect(() => {
        if (!employeeId) {
            resetForm();
            return;
        }

        loadProfessionalDetails();
    }, [employeeId, loadProfessionalDetails, resetForm]);

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

    const removeArrayItem = (setter, index) => {
        setter((previous) => {
            const updated = previous.filter((_, i) => i !== index);
            return updated.length > 0 ? updated : previous;
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
        setSkills((previous) => {
            const updated = previous.filter((_, i) => i !== index);
            return updated.length ? updated : [createSkill()];
        });
    };

    // =================================================
    // BANK DETAILS
    // =================================================

    const addBankDetail = () => {
        setBankDetails((previous) => [...previous, createBankDetail()]);
    };

    const updateBankDetail = (index, field, value) => {
        updateArrayItem(setBankDetails, index, field, value);
    };

    const removeBankDetail = (index) => {
        removeArrayItem(setBankDetails, index);
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
        updateArrayItem(setPreviousEmployeeDetails, index, field, value);
    };

    const removePreviousEmployee = (index) => {
        removeArrayItem(setPreviousEmployeeDetails, index);
    };

    // =================================================
    // DOCUMENT DETAILS
    // =================================================

    const addDocument = () => {
        setDocumentDetails((previous) => [...previous, createDocument()]);
    };

    const updateDocument = (index, field, value) => {
        updateArrayItem(setDocumentDetails, index, field, value);
    };

    const removeDocument = (index) => {
        removeArrayItem(setDocumentDetails, index);
    };

    // =================================================
    // CUSTOM FIELDS
    // =================================================

    const addCustomField = () => {
        setCustomFields((previous) => [...previous, createCustomField()]);
    };

    const updateCustomField = (index, field, value) => {
        updateArrayItem(setCustomFields, index, field, value);
    };

    const removeCustomField = (index) => {
        removeArrayItem(setCustomFields, index);
    };

    // =================================================
    // JSON HELPERS
    // =================================================

    const getSkills = () => {
        return skills
            .map((item) => item.name.trim())
            .filter(Boolean);
    };

    const getBankDetails = () => {
        return bankDetails.filter((item) =>
            Object.values(item).some((value) => String(value || "").trim())
        );
    };

    const getPreviousEmployeeDetails = () => {
        return previousEmployeeDetails.filter((item) =>
            Object.values(item).some((value) => String(value || "").trim())
        );
    };

    const getDocumentDetails = () => {
        return documentDetails.filter((item) =>
            Object.values(item).some((value) => String(value || "").trim())
        );
    };

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

        if (loading || loadingDetails || loadingMasters) return;

        if (!employeeId) {
            toast.error("Please save employee basic details first.");
            return;
        }

        // Required field validation
        const requiredFields = [
            { value: form.designation, label: "Designation" },
            { value: form.department, label: "Department" },
            { value: form.shift, label: "Shift" },
            { value: form.breakTime, label: "Break Time" },
            { value: form.security, label: "Security" },
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
                employeeId: String(employeeId),

                // Job Information
                designation: form.designation || null,
                department: form.department || null,
                experienceAsOn: form.experienceAsOn || null,
                joinDate: form.joinDate || null,
                jobLocation: form.jobLocation || null,
                jobType: form.jobType || null,
                employmentStatus: form.employmentStatus || null,
                shift: form.shift || null,
                breakTime: form.breakTime || null,

                // Skills & References
                skills: getSkills(),
                referenceName: form.referenceName || null,

                // Probation & Appraisal
                probationPeriod:
                    form.probationPeriod === ""
                        ? null
                        : Number(form.probationPeriod),

                appraisalApplicable: Boolean(form.appraisalApplicable),

                noticePeriod:
                    form.noticePeriod === ""
                        ? null
                        : Number(form.noticePeriod),

                // Banking Information
                bankDetails: getBankDetails(),

                // Additional Information
                remarks: form.remarks || null,
                agreementSigningDate: form.agreementSigningDate || null,
                security: form.security || null,

                // Previous Employment
                previousEmployeeDetails: getPreviousEmployeeDetails(),

                // Documents
                documentDetails: getDocumentDetails(),

                // Custom Fields
                customFields: getCustomFieldsObject(),
            };

            const method = hasExistingRecord ? "PUT" : "POST";

            const response = await apiFetch(
                "/api/employee/professional-detail",
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
                    result?.message || "Unable to save professional details."
                );
            }

            toast.success(
                result?.message ||
                    (hasExistingRecord
                        ? "Professional details updated successfully."
                        : "Professional details saved successfully.")
            );

            setHasExistingRecord(true);

            await onSuccess?.(result?.data);
        } catch (error) {
            console.error("SAVE PROFESSIONAL DETAILS ERROR:", error);

            toast.error(
                error?.message ||
                    "Something went wrong while saving professional details."
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
                Loading professional details...
            </div>
        );
    }

    // =================================================
    // RENDER
    // =================================================

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Card className="pb-2.5">
                <CardHeader id="professional_details">
                    <CardTitle>Professional Details</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-6">
                    {/* JOB INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Job Information
                        </h3>

                        <FieldRow label="Designation" required>
                            <Input
                                placeholder="Enter designation"
                                value={form.designation}
                                onChange={(e) =>
                                    updateField("designation", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Department" required>
                            <Input
                                placeholder="Enter department"
                                value={form.department}
                                onChange={(e) =>
                                    updateField("department", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Experience As On">
                            <DateField
                                value={form.experienceAsOn}
                                onChange={(value) =>
                                    updateField("experienceAsOn", value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Joining Date">
                            <DateField
                                value={form.joinDate}
                                onChange={(value) =>
                                    updateField("joinDate", value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Job Location">
                            <Input
                                placeholder="Enter job location"
                                value={form.jobLocation}
                                onChange={(e) =>
                                    updateField("jobLocation", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Job Type">
                            <SelectField
                                value={form.jobType}
                                onChange={(value) => updateField("jobType", value)}
                                disabled={loading}
                                placeholder="Select job type"
                                options={[
                                    { label: "Full Time", value: "Full Time" },
                                    { label: "Part Time", value: "Part Time" },
                                    { label: "Contract", value: "Contract" },
                                    { label: "Temporary", value: "Temporary" },
                                    { label: "Internship", value: "Internship" },
                                ]}
                            />
                        </FieldRow>

                        <FieldRow label="Employment Status">
                            <SelectField
                                value={form.employmentStatus}
                                onChange={(value) =>
                                    updateField("employmentStatus", value)
                                }
                                disabled={loading}
                                placeholder="Select employment status"
                                options={[
                                    { label: "Probation", value: "Probation" },
                                    { label: "Permanent", value: "Permanent" },
                                    { label: "Contract", value: "Contract" },
                                    { label: "Intern", value: "Intern" },
                                    { label: "Resigned", value: "Resigned" },
                                    { label: "Terminated", value: "Terminated" },
                                ]}
                            />
                        </FieldRow>

                        <FieldRow label="Shift" required>
                            <SelectField
                                value={form.shift}
                                onChange={(value) => updateField("shift", value)}
                                disabled={loading || loadingMasters}
                                placeholder={
                                    loadingMasters
                                        ? "Loading shifts..."
                                        : "Select shift"
                                }
                                options={finalShiftOptions}
                            />
                        </FieldRow>

                        <FieldRow label="Break Time" required>
                            <SelectField
                                value={form.breakTime}
                                onChange={(value) =>
                                    updateField("breakTime", value)
                                }
                                disabled={loading || loadingMasters}
                                placeholder={
                                    loadingMasters
                                        ? "Loading break times..."
                                        : "Select break time"
                                }
                                options={finalBreakTimeOptions}
                            />
                        </FieldRow>
                    </div>

                    {/* SKILLS AND REFERENCES */}

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
                            <div key={index} className="flex items-center gap-2">
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

                    {/* PROBATION AND APPRAISAL */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Probation & Appraisal
                        </h3>

                        <FieldRow label="Probation Period (Months)">
                            <Input
                                type="number"
                                min="0"
                                placeholder="Enter probation period"
                                value={form.probationPeriod}
                                onChange={(e) =>
                                    updateField("probationPeriod", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Appraisal Applicable">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.appraisalApplicable}
                                    onChange={(e) =>
                                        updateField(
                                            "appraisalApplicable",
                                            e.target.checked
                                        )
                                    }
                                    disabled={loading}
                                    className="size-4 rounded border-input accent-primary"
                                />
                                Applicable
                            </label>
                        </FieldRow>

                        <FieldRow label="Notice Period (Days)">
                            <Input
                                type="number"
                                min="0"
                                placeholder="Enter notice period"
                                value={form.noticePeriod}
                                onChange={(e) =>
                                    updateField("noticePeriod", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>
                    </div>

                    {/* BANKING INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Banking Information
                            </h3>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addBankDetail}
                                disabled={loading}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Bank
                            </Button>
                        </div>

                        {bankDetails.map((bank, index) => (
                            <div
                                key={index}
                                className="rounded-md border border-border p-4"
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold">
                                        Bank Account {index + 1}
                                    </h4>

                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeBankDetail(index)}
                                        disabled={loading}
                                    >
                                        <Trash2 className="mr-1 size-4" />
                                        Remove
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <FieldRow label="Bank Name">
                                        <Input
                                            placeholder="Enter bank name"
                                            value={bank.bankName}
                                            onChange={(e) =>
                                                updateBankDetail(
                                                    index,
                                                    "bankName",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Account Holder">
                                        <Input
                                            placeholder="Enter account holder name"
                                            value={bank.accountHolder}
                                            onChange={(e) =>
                                                updateBankDetail(
                                                    index,
                                                    "accountHolder",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Account Number">
                                        <Input
                                            placeholder="Enter account number"
                                            value={bank.accountNumber}
                                            onChange={(e) =>
                                                updateBankDetail(
                                                    index,
                                                    "accountNumber",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="IFSC Code">
                                        <Input
                                            placeholder="Enter IFSC code"
                                            value={bank.ifscCode}
                                            onChange={(e) =>
                                                updateBankDetail(
                                                    index,
                                                    "ifscCode",
                                                    e.target.value
                                                )
                                            }
                                            disabled={loading}
                                        />
                                    </FieldRow>

                                    <FieldRow label="Branch">
                                        <Input
                                            placeholder="Enter branch"
                                            value={bank.branch}
                                            onChange={(e) =>
                                                updateBankDetail(
                                                    index,
                                                    "branch",
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

                    {/* ADDITIONAL INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Additional Information
                        </h3>

                        <FieldRow label="Agreement Signing Date">
                            <DateField
                                value={form.agreementSigningDate}
                                onChange={(value) =>
                                    updateField("agreementSigningDate", value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Security" required>
                            <SelectField
                                value={form.security}
                                onChange={(value) =>
                                    updateField("security", value)
                                }
                                disabled={loading || loadingMasters}
                                placeholder={
                                    loadingMasters
                                        ? "Loading security options..."
                                        : "Select security"
                                }
                                options={finalSecurityOptions}
                            />
                        </FieldRow>

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
                                Previous Employee Details
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
                                loadingMasters ||
                                !employeeId
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