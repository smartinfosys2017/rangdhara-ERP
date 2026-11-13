
"use client";

import { useEffect, useState } from "react";
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

/*
|--------------------------------------------------------------------------
| Initial Form Data
|--------------------------------------------------------------------------
*/

const initialFormData = {
    fatherName: "",
    fatherDateOfBirth: "",
    fatherOccupation: "",

    motherName: "",
    motherDateOfBirth: "",
    motherOccupation: "",

    spouseName: "",
    spouseDateOfBirth: "",
    spouseOccupation: "",

    mobile: "",
    childrenDetails: [],
    noOfDependents: 0,

    nomineeName: "",
    nomineeRelationship: "",

    importantDates: [],
};

/*
|--------------------------------------------------------------------------
| Dynamic Row Creators
|--------------------------------------------------------------------------
*/

const createChild = () => ({
    name: "",
    dateOfBirth: "",
    gender: "",
    occupation: "",
});

const createImportantDate = () => ({
    title: "",
    date: "",
    description: "",
});

const createCustomField = () => ({
    name: "",
    value: "",
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const parseJsonValue = (value, fallback) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
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

    // Avoid timezone shifts for date-only values.
    if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
        return stringValue.slice(0, 10);
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10);
};

const normalizeArray = (value) => {
    const parsed = parseJsonValue(value, []);

    return Array.isArray(parsed) ? parsed : [];
};

const normalizeCustomFields = (value) => {
    const parsed = parseJsonValue(value, {});

    if (Array.isArray(parsed)) {
        const fields = parsed.map((field) => ({
            name: String(field?.name ?? ""),
            value: String(field?.value ?? ""),
        }));

        return fields.length > 0
            ? fields
            : [createCustomField()];
    }

    if (parsed && typeof parsed === "object") {
        const fields = Object.entries(parsed).map(
            ([name, fieldValue]) => ({
                name,
                value:
                    fieldValue === null ||
                    fieldValue === undefined
                        ? ""
                        : String(fieldValue),
            })
        );

        return fields.length > 0
            ? fields
            : [createCustomField()];
    }

    return [createCustomField()];
};

const getFamilyForm = (data) => {
    if (!data) {
        return {
            ...initialFormData,
            childrenDetails: [],
            importantDates: [],
        };
    }

    return {
        ...initialFormData,
        ...data,

        fatherDateOfBirth: formatDate(data.fatherDateOfBirth),
        motherDateOfBirth: formatDate(data.motherDateOfBirth),
        spouseDateOfBirth: formatDate(data.spouseDateOfBirth),

        childrenDetails: normalizeArray(
            data.childrenDetails
        ).map((child) => ({
            name: child?.name ?? "",
            dateOfBirth: formatDate(child?.dateOfBirth),
            gender: child?.gender ?? "",
            occupation: child?.occupation ?? "",
        })),

        importantDates: normalizeArray(
            data.importantDates
        ).map((item) => ({
            title: item?.title ?? "",
            date: formatDate(item?.date),
            description: item?.description ?? "",
        })),

        noOfDependents: Number(data.noOfDependents) || 0,

        mobile: data.mobile ?? "",

        fatherName: data.fatherName ?? "",
        fatherOccupation: data.fatherOccupation ?? "",

        motherName: data.motherName ?? "",
        motherOccupation: data.motherOccupation ?? "",

        spouseName: data.spouseName ?? "",
        spouseOccupation: data.spouseOccupation ?? "",

        nomineeName: data.nomineeName ?? "",
        nomineeRelationship: data.nomineeRelationship ?? "",
    };
};

/*
|--------------------------------------------------------------------------
| Reusable Components
|--------------------------------------------------------------------------
*/

function FieldRow({ label, children }) {
    return (
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="w-full shrink-0 text-sm font-medium text-foreground md:max-w-56">
                {label}
            </label>

            <div className="min-w-0 grow">
                {children}
            </div>
        </div>
    );
}

function DateField({
    value,
    onChange,
    disabled = false,
}) {
    return (
        <Input
            type="date"
            value={value || ""}
            onChange={(event) =>
                onChange(event.target.value)
            }
            disabled={disabled}
            className="w-full"
        />
    );
}

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

export default function FamilyDetails({
    employeeId,
    onSuccess,
    closeDialog,
    onPrevious,
    mode = "add",
}) {
    const isEditMode = mode === "edit";

    const [form, setForm] = useState({
        ...initialFormData,
    });

    const [customFields, setCustomFields] = useState([
        createCustomField(),
    ]);

    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [hasExistingRecord, setHasExistingRecord] =
        useState(false);

    /*
    |--------------------------------------------------------------------------
    | Update Main Form
    |--------------------------------------------------------------------------
    */

    const updateField = (name, value) => {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | Load Existing Family Details
    |--------------------------------------------------------------------------
    */

    const loadFamilyDetails = async () => {
        if (!employeeId) return;

        try {
            setLoadingDetails(true);

            const response = await apiFetch(
                `/api/employee/family-detail?employeeId=${encodeURIComponent(
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

            if (!response?.ok && response?.status !== undefined) {
                throw new Error(
                    result?.message ||
                    "Unable to load family details."
                );
            }

            if (result?.success === false) {
                throw new Error(
                    result.message ||
                    "Unable to load family details."
                );
            }

            const familyData = result?.data || null;

            if (familyData) {
                setForm(getFamilyForm(familyData));

                setCustomFields(
                    normalizeCustomFields(
                        familyData.customFields
                    )
                );

                setHasExistingRecord(true);
            } else {
                setForm(getFamilyForm(null));
                setCustomFields([createCustomField()]);
                setHasExistingRecord(false);
            }
        } catch (error) {
            console.error(
                "LOAD FAMILY DETAILS ERROR:",
                error
            );

            toast.error(
                error?.message ||
                "Unable to load family details."
            );
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        if (!employeeId) return;

        if (isEditMode) {
            loadFamilyDetails();
        } else {
            setForm(getFamilyForm(null));
            setCustomFields([createCustomField()]);
            setHasExistingRecord(false);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId, mode]);

    /*
    |--------------------------------------------------------------------------
    | Children Details
    |--------------------------------------------------------------------------
    */

    const addChild = () => {
        setForm((previous) => ({
            ...previous,
            childrenDetails: [
                ...previous.childrenDetails,
                createChild(),
            ],
        }));
    };

    const updateChild = (index, field, value) => {
        setForm((previous) => ({
            ...previous,
            childrenDetails: previous.childrenDetails.map(
                (child, i) =>
                    i === index
                        ? { ...child, [field]: value }
                        : child
            ),
        }));
    };

    const removeChild = (index) => {
        setForm((previous) => ({
            ...previous,
            childrenDetails:
                previous.childrenDetails.filter(
                    (_, i) => i !== index
                ),
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | Important Dates
    |--------------------------------------------------------------------------
    */

    const addImportantDate = () => {
        setForm((previous) => ({
            ...previous,
            importantDates: [
                ...previous.importantDates,
                createImportantDate(),
            ],
        }));
    };

    const updateImportantDate = (
        index,
        field,
        value
    ) => {
        setForm((previous) => ({
            ...previous,
            importantDates: previous.importantDates.map(
                (item, i) =>
                    i === index
                        ? { ...item, [field]: value }
                        : item
            ),
        }));
    };

    const removeImportantDate = (index) => {
        setForm((previous) => ({
            ...previous,
            importantDates:
                previous.importantDates.filter(
                    (_, i) => i !== index
                ),
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | Dynamic Custom Fields
    |--------------------------------------------------------------------------
    */

    const addCustomField = () => {
        setCustomFields((previous) => [
            ...previous,
            createCustomField(),
        ]);
    };

    const updateCustomField = (
        index,
        field,
        value
    ) => {
        setCustomFields((previous) =>
            previous.map((item, i) =>
                i === index
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    const removeCustomField = (index) => {
        setCustomFields((previous) =>
            previous.filter((_, i) => i !== index)
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Convert Custom Fields to Object
    |--------------------------------------------------------------------------
    */

    const getCustomFieldsObject = () => {
        const customFieldsObject = {};

        customFields.forEach((field) => {
            const name = String(field.name || "").trim();

            if (name) {
                customFieldsObject[name] =
                    field.value ?? "";
            }
        });

        return customFieldsObject;
    };

    /*
    |--------------------------------------------------------------------------
    | Submit Family Details
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading || loadingDetails) return;

        if (!employeeId) {
            toast.error(
                "Please save employee basic details first."
            );
            return;
        }

        try {
            setLoading(true);

            const payload = {
                employeeId: String(employeeId),

                fatherName: form.fatherName || null,
                fatherDateOfBirth:
                    form.fatherDateOfBirth || null,
                fatherOccupation:
                    form.fatherOccupation || null,

                motherName: form.motherName || null,
                motherDateOfBirth:
                    form.motherDateOfBirth || null,
                motherOccupation:
                    form.motherOccupation || null,

                spouseName: form.spouseName || null,
                spouseDateOfBirth:
                    form.spouseDateOfBirth || null,
                spouseOccupation:
                    form.spouseOccupation || null,

                mobile: form.mobile || null,

                childrenDetails: form.childrenDetails.map(
                    (child) => ({
                        name: child.name || "",
                        dateOfBirth: child.dateOfBirth || "",
                        gender: child.gender || "",
                        occupation: child.occupation || "",
                    })
                ),

                noOfDependents:
                    Number(form.noOfDependents) || 0,

                nomineeName: form.nomineeName || null,

                nomineeRelationship:
                    form.nomineeRelationship || null,

                importantDates: form.importantDates.map(
                    (item) => ({
                        title: item.title || "",
                        date: item.date || "",
                        description: item.description || "",
                    })
                ),

                customFields: getCustomFieldsObject(),
            };

            const method = hasExistingRecord
                ? "PUT"
                : "POST";

            const response = await apiFetch(
                "/api/employee/family-detail",
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
                    "Unable to save employee family details."
                );
            }

            toast.success(
                result?.message ||
                (
                    hasExistingRecord
                        ? "Family details updated successfully."
                        : "Family details saved successfully."
                )
            );

            setHasExistingRecord(true);

            await onSuccess?.(result?.data);
        } catch (error) {
            console.error(
                "SAVE FAMILY DETAILS ERROR:",
                error
            );

            toast.error(
                error?.message ||
                "Something went wrong while saving family details."
            );
        } finally {
            setLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Loading State
    |--------------------------------------------------------------------------
    */

    if (loadingDetails) {
        return (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin" />
                Loading family details...
            </div>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
        >
            <Card className="pb-2.5">

                <CardHeader id="family_details">
                    <CardTitle>Family Details</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-6">

                    {/* FATHER INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Father Information
                        </h3>

                        <FieldRow label="Father Name">
                            <Input
                                placeholder="Enter father name"
                                value={form.fatherName}
                                onChange={(e) =>
                                    updateField(
                                        "fatherName",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Date of Birth">
                            <DateField
                                value={form.fatherDateOfBirth}
                                onChange={(value) =>
                                    updateField(
                                        "fatherDateOfBirth",
                                        value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Occupation">
                            <Input
                                placeholder="Enter occupation"
                                value={form.fatherOccupation}
                                onChange={(e) =>
                                    updateField(
                                        "fatherOccupation",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>
                    </div>

                    {/* MOTHER INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Mother Information
                        </h3>

                        <FieldRow label="Mother Name">
                            <Input
                                placeholder="Enter mother name"
                                value={form.motherName}
                                onChange={(e) =>
                                    updateField(
                                        "motherName",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Date of Birth">
                            <DateField
                                value={form.motherDateOfBirth}
                                onChange={(value) =>
                                    updateField(
                                        "motherDateOfBirth",
                                        value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Occupation">
                            <Input
                                placeholder="Enter occupation"
                                value={form.motherOccupation}
                                onChange={(e) =>
                                    updateField(
                                        "motherOccupation",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>
                    </div>

                    {/* SPOUSE INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Spouse Information
                        </h3>

                        <FieldRow label="Spouse Name">
                            <Input
                                placeholder="Enter spouse name"
                                value={form.spouseName}
                                onChange={(e) =>
                                    updateField(
                                        "spouseName",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Date of Birth">
                            <DateField
                                value={form.spouseDateOfBirth}
                                onChange={(value) =>
                                    updateField(
                                        "spouseDateOfBirth",
                                        value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Occupation">
                            <Input
                                placeholder="Enter occupation"
                                value={form.spouseOccupation}
                                onChange={(e) =>
                                    updateField(
                                        "spouseOccupation",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>
                    </div>

                    {/* CONTACT AND DEPENDENTS */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Contact & Dependents
                        </h3>

                        <FieldRow label="Family Contact Number">
                            <Input
                                type="tel"
                                placeholder="Enter mobile number"
                                value={form.mobile}
                                onChange={(e) =>
                                    updateField(
                                        "mobile",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Number of Dependents">
                            <Input
                                type="number"
                                min="0"
                                placeholder="Enter number of dependents"
                                value={form.noOfDependents}
                                onChange={(e) =>
                                    updateField(
                                        "noOfDependents",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>
                    </div>

                    {/* CHILDREN DETAILS */}

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Children Details
                            </h3>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addChild}
                                disabled={loading}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Child
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Add employee children information.
                        </p>

                        {form.childrenDetails.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No children details added.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                {form.childrenDetails.map(
                                    (child, index) => (
                                        <div
                                            key={index}
                                            className="rounded-md border border-border p-4"
                                        >
                                            <div className="mb-5 flex items-center justify-between">
                                                <h4 className="text-sm font-semibold">
                                                    Child {index + 1}
                                                </h4>

                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        removeChild(index)
                                                    }
                                                    disabled={loading}
                                                >
                                                    <Trash2 className="mr-1 size-4" />
                                                    Remove
                                                </Button>
                                            </div>

                                            <div className="flex flex-col gap-5">
                                                <FieldRow label="Child Name">
                                                    <Input
                                                        placeholder="Enter name"
                                                        value={child.name}
                                                        onChange={(e) =>
                                                            updateChild(
                                                                index,
                                                                "name",
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                </FieldRow>

                                                <FieldRow label="Date of Birth">
                                                    <DateField
                                                        value={child.dateOfBirth}
                                                        onChange={(value) =>
                                                            updateChild(
                                                                index,
                                                                "dateOfBirth",
                                                                value
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                </FieldRow>

                                                <FieldRow label="Gender">
                                                    <select
                                                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={child.gender}
                                                        onChange={(e) =>
                                                            updateChild(
                                                                index,
                                                                "gender",
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={loading}
                                                    >
                                                        <option value="">
                                                            Select Gender
                                                        </option>
                                                        <option value="Male">
                                                            Male
                                                        </option>
                                                        <option value="Female">
                                                            Female
                                                        </option>
                                                        <option value="Other">
                                                            Other
                                                        </option>
                                                    </select>
                                                </FieldRow>

                                                <FieldRow label="Occupation">
                                                    <Input
                                                        placeholder="Enter occupation"
                                                        value={child.occupation}
                                                        onChange={(e) =>
                                                            updateChild(
                                                                index,
                                                                "occupation",
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                </FieldRow>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* NOMINEE INFORMATION */}

                    <div className="flex flex-col gap-5">
                        <h3 className="border-b pb-2 text-sm font-semibold text-foreground">
                            Nominee Information
                        </h3>

                        <FieldRow label="Nominee Name">
                            <Input
                                placeholder="Enter nominee name"
                                value={form.nomineeName}
                                onChange={(e) =>
                                    updateField(
                                        "nomineeName",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Relationship with Nominee">
                            <select
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                value={form.nomineeRelationship}
                                onChange={(e) =>
                                    updateField(
                                        "nomineeRelationship",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            >
                                <option value="">
                                    Select Relationship
                                </option>
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Son">Son</option>
                                <option value="Daughter">Daughter</option>
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Other">Other</option>
                            </select>
                        </FieldRow>
                    </div>

                    {/* IMPORTANT DATES */}

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                            <h3 className="text-sm font-semibold text-foreground">
                                Important Dates
                            </h3>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addImportantDate}
                                disabled={loading}
                            >
                                <Plus className="mr-1 size-4" />
                                Add Date
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Add important family dates.
                        </p>

                        {form.importantDates.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No important dates added.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                {form.importantDates.map(
                                    (item, index) => (
                                        <div
                                            key={index}
                                            className="rounded-md border border-border p-4"
                                        >
                                            <div className="mb-5 flex items-center justify-between">
                                                <h4 className="text-sm font-semibold">
                                                    Important Date {index + 1}
                                                </h4>

                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        removeImportantDate(index)
                                                    }
                                                    disabled={loading}
                                                >
                                                    <Trash2 className="mr-1 size-4" />
                                                    Remove
                                                </Button>
                                            </div>

                                            <div className="flex flex-col gap-5">
                                                <FieldRow label="Title">
                                                    <Input
                                                        placeholder="e.g. Anniversary"
                                                        value={item.title}
                                                        onChange={(e) =>
                                                            updateImportantDate(
                                                                index,
                                                                "title",
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                </FieldRow>

                                                <FieldRow label="Date">
                                                    <DateField
                                                        value={item.date}
                                                        onChange={(value) =>
                                                            updateImportantDate(
                                                                index,
                                                                "date",
                                                                value
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                </FieldRow>

                                                <FieldRow label="Description">
                                                    <Textarea
                                                        placeholder="Enter description"
                                                        value={item.description}
                                                        onChange={(e) =>
                                                            updateImportantDate(
                                                                index,
                                                                "description",
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={loading}
                                                    />
                                                </FieldRow>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* DYNAMIC CUSTOM FIELDS */}

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

                        <p className="text-sm text-muted-foreground">
                            Add additional family information.
                        </p>

                        {customFields.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                No custom fields added.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
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
                                                onClick={() =>
                                                    removeCustomField(index)
                                                }
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
                        )}
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
                            disabled={loading || !employeeId}
                        >
                            {loading ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                isEditMode
                                    ? "Update Family Details"
                                    : "Save Family Details"
                            )}
                        </Button>
                    </div>
                </div>

            </Card>
        </form>
    );
}