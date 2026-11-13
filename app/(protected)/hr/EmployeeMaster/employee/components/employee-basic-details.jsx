
"use client";

import { useEffect, useRef, useState, useMemo } from "react";

import { LoaderCircle, CalendarIcon } from "lucide-react";
import {
    RiCheckboxCircleFill,
    RiErrorWarningFill,
} from "@remixicon/react";

import { toast } from "sonner";
import { format } from "date-fns";

import { apiFetch } from "@/lib/api";

import {
    Alert,
    AlertIcon,
    AlertTitle,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Calendar } from "@/components/ui/calendar";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import EmployeeCustomFields from "./employee-custom-fields";
import EducationInformation from "./employee-eduction-fields";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function FieldRow({ label, children, required = false }) {
    return (
        <div className="flex flex-wrap items-center gap-2.5">
            <Label className="flex w-full max-w-56 items-center gap-1">
                {label}
                {required && <span className="text-destructive">*</span>}
            </Label>

            <div className="min-w-0 grow">{children}</div>
        </div>
    );
}

function DateField({
    value,
    onChange,
    disabled = false,
    placeholder = "Pick a date",
    fromYear = 1940,
    toYear = new Date().getFullYear(),
}) {
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(new Date());

    const validDate = useMemo(() => {
        if (!value) return undefined;

        const dateString = String(value).slice(0, 10);
        const date = new Date(`${dateString}T00:00:00`);

        return !Number.isNaN(date.getTime()) ? date : undefined;
    }, [value]);

    useEffect(() => {
        if (validDate) {
            setMonth(validDate);
        }
    }, [validDate]);

    const handleSelect = (date) => {
        if (!date) return;

        onChange(format(date, "yyyy-MM-dd"));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen} modal>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className="w-full justify-between font-normal"
                >
                    <span className="flex items-center gap-2">
                        <CalendarIcon className="size-4 text-muted-foreground" />

                        {validDate ? (
                            <span>{format(validDate, "dd MMM yyyy")}</span>
                        ) : (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        )}
                    </span>

                    <icon name="chevron-down" size="sm" color="secondary" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="w-auto p-0"
                align="start"
                side="bottom"
            >
                <Calendar
                    mode="single"
                    selected={validDate}
                    onSelect={handleSelect}
                    month={month}
                    onMonthChange={setMonth}
                    captionLayout="dropdown"
                    startMonth={new Date(fromYear, 0)}
                    endMonth={new Date(toYear, 11)}
                    disabled={disabled}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    );
}

const showSuccessToast = (message) => {
    toast.custom(
        () => (
            <Alert
                variant="mono"
                icon="success"
                className="min-w-[320px] max-w-[500px] shadow-lg"
            >
                <AlertIcon>
                    <RiCheckboxCircleFill className="size-5" />
                </AlertIcon>
                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        {
            position: "top-center",
            duration: 4000,
        }
    );
};

const showErrorToast = (message) => {
    toast.custom(
        (t) => (
            <Alert
                variant="mono"
                icon="destructive"
                close
                className="min-w-[320px] max-w-[500px] shadow-lg"
                onClose={() => toast.dismiss(t)}
            >
                <AlertIcon>
                    <RiErrorWarningFill className="size-5" />
                </AlertIcon>
                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        {
            position: "top-center",
            duration: 5000,
        }
    );
};

const initialForm = {
    userId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    emailId: "",
    maritalStatus: "",
    mobile: "",
    qualifiedForInterview: false,
    status: "ACTIVE",

    correspondenceAddress: "",
    correspondenceCity: "",
    correspondenceState: "",
    correspondenceCountry: "",
    correspondencePincode: "",

    permanentAddress: "",
    permanentCity: "",
    permanentState: "",
    permanentCountry: "",
    permanentPincode: "",

    permanentSameAsCorrespondence: false,

    resignationDate: "",
    leavingDate: "",
    reasonToLeave: "",

    educationDetails: [],
};

const getDateValue = (value) => {
    if (!value) return "";

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? ""
            : format(value, "yyyy-MM-dd");
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ""
        : format(date, "yyyy-MM-dd");
};

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

const getEmployeeCustomFields = (employee) => {
    const fields = parseJsonValue(employee?.customFields, {});

    return fields && typeof fields === "object" && !Array.isArray(fields)
        ? fields
        : {};
};

const getEducationDetails = (employee) => {
    const details = parseJsonValue(employee?.educationDetails, []);

    return Array.isArray(details) ? details : [];
};

const normalizeBoolean = (value) => {
    return (
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1"
    );
};

const getEmployeeForm = (employee) => {
    if (!employee) return { ...initialForm };

    return {
        ...initialForm,
        ...employee,

        userId: employee.userId ?? "",

        firstName: employee.firstName ?? "",
        middleName: employee.middleName ?? "",
        lastName: employee.lastName ?? "",

        emailId: employee.emailId ?? "",
        mobile: employee.mobile ?? "",

        gender: normalizeOption(employee.gender, [
            "Male",
            "Female",
            "Other",
        ]) || employee.gender || "",

        bloodGroup: normalizeOption(employee.bloodGroup, [
            "A+",
            "A-",
            "B+",
            "B-",
            "AB+",
            "AB-",
            "O+",
            "O-",
        ]) || employee.bloodGroup || "",

        maritalStatus: normalizeOption(employee.maritalStatus, [
            "Single",
            "Married",
            "Divorced",
            "Widowed",
        ]) || employee.maritalStatus || "",

        status: normalizeOption(employee.status, [
            "ACTIVE",
            "INACTIVE",
            "HOLD",
        ]) || "ACTIVE",

        correspondenceAddress: employee.correspondenceAddress ?? "",
        correspondenceCity: employee.correspondenceCity ?? "",
        correspondenceState: employee.correspondenceState ?? "",
        correspondenceCountry: employee.correspondenceCountry ?? "",
        correspondencePincode: employee.correspondencePincode ?? "",

        permanentAddress: employee.permanentAddress ?? "",
        permanentCity: employee.permanentCity ?? "",
        permanentState: employee.permanentState ?? "",
        permanentCountry: employee.permanentCountry ?? "",
        permanentPincode: employee.permanentPincode ?? "",

        reasonToLeave: employee.reasonToLeave ?? "",

        dateOfBirth: getDateValue(employee.dateOfBirth),
        resignationDate: getDateValue(employee.resignationDate),
        leavingDate: getDateValue(employee.leavingDate),

        qualifiedForInterview: normalizeBoolean(
            employee.qualifiedForInterview
        ),

        permanentSameAsCorrespondence: normalizeBoolean(
            employee.permanentSameAsCorrespondence
        ),

        educationDetails: getEducationDetails(employee),
    };
};

const normalizeText = (value) => {
    if (value === null || value === undefined) return "";

    if (typeof value === "object") {
        value =
            value.value ??
            value.name ??
            value.label ??
            value.title ??
            value.id ??
            value.code ??
            "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
};

const normalizeOption = (value, options = []) => {
    if (value === null || value === undefined || value === "") {
        return "";
    }

    const normalizedValue = normalizeText(value);

    const matchingOption = options.find(
        (option) => normalizeText(option) === normalizedValue
    );

    // Preserve the original value if no matching option is found.
    return matchingOption || (
        typeof value === "object"
            ? value.value ?? value.name ?? value.label ?? ""
            : String(value).trim()
    );
};

const resolveCountry = (value, countryList = []) => {
    if (!value) return "";

    const normalizedValue = normalizeText(value);

    const matchingCountry = countryList.find((country) => {
        const possibleValues = [
            country.id,
            country.name,
            country.code,
            country.isoCode,
            country.iso2,
            country.iso3,
        ];

        return possibleValues.some(
            (item) => normalizeText(item) === normalizedValue
        );
    });

    return matchingCountry
        ? String(matchingCountry.name)
        : String(
            typeof value === "object"
                ? value.name ?? value.value ?? ""
                : value
        ).trim();
};
/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function BasicDetails({
    open,
    closeDialog,
    onSuccess,
    mode = "add",
    employee = null,
}) {
    const isEditMode = mode === "edit";

    const [loading, setLoading] = useState(false);

    const [customFieldsLoading, setCustomFieldsLoading] =
        useState(false);

    const [customFieldDefinitions, setCustomFieldDefinitions] =
        useState([]);

    const [customFields, setCustomFields] = useState({});

    const [form, setForm] = useState({ ...initialForm });

    const [profilePic, setProfilePic] = useState(null);
    const [signature, setSignature] = useState(null);

    const [countries, setCountries] = useState([]);
    const [loadingCountries, setLoadingCountries] = useState(false);

    const countryLoadingRef = useRef(false);

    /*
    |--------------------------------------------------------------------------
    | Update Form
    |--------------------------------------------------------------------------
    */

    const update = (key) => (event) => {
        const value = event.target.value;

        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    const updateCheckbox = (key) => (event) => {
        setForm((previous) => ({
            ...previous,
            [key]: event.target.checked,
        }));
    };

    // Shared handler for every Select dropdown.
    const updateSelect = (key) => (value) => {
        setForm((previous) => ({
            ...previous,
            [key]: value === "none" ? "" : value,
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | Load Custom Field Definitions
    |--------------------------------------------------------------------------
    */

    const loadCustomFields = async (currentEmployee = null) => {
        try {
            setCustomFieldsLoading(true);

            const response = await apiFetch(
                "/api/custom_fields?fieldto=employee",
                { method: "GET" }
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (!result?.success) {
                throw new Error(
                    result?.message || "Failed to load custom fields."
                );
            }

            const fields = Array.isArray(result.data)
                ? result.data
                : [];

            setCustomFieldDefinitions(fields);

            const savedValues = getEmployeeCustomFields(currentEmployee);
            const defaultValues = {};

            fields.forEach((field) => {
                if (!field?.slug) return;

                const savedValue = savedValues[field.slug];

                if (savedValue !== undefined) {
                    defaultValues[field.slug] = savedValue;
                    return;
                }

                if (field.type === "file" || field.type === "image") {
                    defaultValues[field.slug] = "";
                    return;
                }

                if (
                    field.type === "multifile" ||
                    field.type === "multiimage"
                ) {
                    defaultValues[field.slug] = [];
                    return;
                }

                if (field.type === "checkbox") {
                    defaultValues[field.slug] =
                        field.defaultValue === "true" ||
                        field.defaultValue === "1";
                    return;
                }

                if (field.type === "multiselect") {
                    if (field.defaultValue) {
                        const parsed = parseJsonValue(
                            field.defaultValue,
                            null
                        );

                        defaultValues[field.slug] = Array.isArray(parsed)
                            ? parsed
                            : String(field.defaultValue)
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean);
                    } else {
                        defaultValues[field.slug] = [];
                    }

                    return;
                }

                defaultValues[field.slug] = field.defaultValue ?? "";
            });

            setCustomFields(defaultValues);
        } catch (error) {
            console.error("LOAD EMPLOYEE CUSTOM FIELDS ERROR:", error);

            showErrorToast(
                error?.message || "Failed to load custom fields."
            );

            setCustomFieldDefinitions([]);
        } finally {
            setCustomFieldsLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Load Countries
    |--------------------------------------------------------------------------
    */

    const loadCountries = async () => {
        if (countryLoadingRef.current) return;

        try {
            countryLoadingRef.current = true;
            setLoadingCountries(true);

            const response = await apiFetch(
                "/api/countries?page=1&limit=200&sort=name&dir=asc",
                { method: "GET" }
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (!result?.success) {
                throw new Error(
                    result?.message || "Failed to load countries."
                );
            }

            const countryList = Array.isArray(result.data)
                ? result.data
                : [];

            setCountries(countryList);
        } catch (error) {
            console.error("LOAD COUNTRIES ERROR:", error);

            showErrorToast(
                error?.message || "Failed to load countries."
            );
        } finally {
            countryLoadingRef.current = false;
            setLoadingCountries(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Reset Form
    |--------------------------------------------------------------------------
    */

    const resetForm = () => {
        setForm({ ...initialForm });
        setProfilePic(null);
        setSignature(null);
        setCustomFields({});
        setCustomFieldDefinitions([]);
    };

    /*
    |--------------------------------------------------------------------------
    | Close Dialog
    |--------------------------------------------------------------------------
    */

    const handleCancel = (event) => {
        event?.preventDefault();
        event?.stopPropagation();

        if (loading) return;

        if (typeof closeDialog === "function") {
            closeDialog();
        } else {
            console.error(
                "BasicDetails: closeDialog callback was not provided."
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Initialize Form When Opened
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!open) return;

        const currentEmployee = isEditMode ? employee : null;

        setForm(getEmployeeForm(currentEmployee));

        setProfilePic(null);
        setSignature(null);

        loadCountries();
        loadCustomFields(currentEmployee);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, employee, mode]);

    /*
    |--------------------------------------------------------------------------
    | Normalize Countries After Loading
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (!countries.length || !isEditMode || !employee) {
            return;
        }

        setForm((previous) => ({
            ...previous,

            correspondenceCountry: resolveCountry(
                previous.correspondenceCountry,
                countries
            ),

            permanentCountry: resolveCountry(
                previous.permanentCountry,
                countries
            ),
        }));
    }, [countries, isEditMode, employee]);

    /*
    |--------------------------------------------------------------------------
    | Copy Correspondence Address
    |--------------------------------------------------------------------------
    */

    const handlePermanentAddressCopy = (checked) => {
        setForm((previous) => ({
            ...previous,

            permanentSameAsCorrespondence: checked,

            ...(checked
                ? {
                    permanentAddress: previous.correspondenceAddress,
                    permanentCity: previous.correspondenceCity,
                    permanentState: previous.correspondenceState,
                    permanentCountry: previous.correspondenceCountry,
                    permanentPincode: previous.correspondencePincode,
                }
                : {}),
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | Keep Permanent Address Synced
    |--------------------------------------------------------------------------
    */

    const updateCorrespondence = (key) => (event) => {
        const value = event.target.value;

        const permanentKey = key.replace(
            "correspondence",
            "permanent"
        );

        setForm((previous) => ({
            ...previous,
            [key]: value,

            ...(previous.permanentSameAsCorrespondence
                ? { [permanentKey]: value }
                : {}),
        }));
    };

    /*
    |--------------------------------------------------------------------------
    | File Selection
    |--------------------------------------------------------------------------
    */

    const handleFileChange = (event, setter) => {
        const file = event.target.files?.[0] || null;

        if (file && !file.type.startsWith("image/")) {
            showErrorToast("Please select a valid image file.");
            event.target.value = "";
            return;
        }

        if (file && file.size > 5 * 1024 * 1024) {
            showErrorToast("Image size must not exceed 5 MB.");
            event.target.value = "";
            return;
        }

        setter(file);
    };

    /*
    |--------------------------------------------------------------------------
    | Submit Employee Form
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        const requiredFields = [
            {
                key: "firstName",
                label: "First Name",
            },
            {
                key: "lastName",
                label: "Last Name",
            },
            {
                key: "dateOfBirth",
                label: "Date of Birth",
            },
            {
                key: "gender",
                label: "Gender",
            },
            {
                key: "correspondenceCity",
                label: "City",
            },
            {
                key: "correspondenceState",
                label: "State",
            },
            {
                key: "correspondenceCountry",
                label: "Country",
            },
        ];

        for (const field of requiredFields) {
            if (!String(form[field.key] ?? "").trim()) {
                showErrorToast(`${field.label} is required.`);
                return;
            }
        }

        const employeeId = employee?.id
            ? String(employee.id).trim()
            : "";

        if (isEditMode && !employeeId) {
            showErrorToast(
                "Employee ID is missing. Please reopen the employee record."
            );
            console.error("EDIT EMPLOYEE: Missing employee ID", employee);
            return;
        }

        if (!String(form.firstName || "").trim()) {
            showErrorToast("First name is required.");
            return;
        }

        if (!String(form.lastName || "").trim()) {
            showErrorToast("Last name is required.");
            return;
        }

        if (
            form.emailId &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailId)
        ) {
            showErrorToast("Please enter a valid email address.");
            return;
        }

        let educationDetails = [];

        try {
            educationDetails = Array.isArray(form.educationDetails)
                ? form.educationDetails
                : JSON.parse(form.educationDetails || "[]");

            if (!Array.isArray(educationDetails)) {
                throw new Error("Education details must be an array.");
            }
        } catch (error) {
            showErrorToast(
                error?.message || "Invalid education details."
            );
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();

            if (isEditMode) {
                formData.set("id", employeeId);
            }

            Object.entries(form).forEach(([key, value]) => {
                if (key === "educationDetails") {
                    formData.set(
                        key,
                        JSON.stringify(educationDetails)
                    );
                    return;
                }

                if (typeof value === "boolean") {
                    formData.set(key, String(value));
                    return;
                }

                if (value === null || value === undefined) {
                    formData.set(key, "");
                    return;
                }

                if (typeof value === "object") {
                    formData.set(key, JSON.stringify(value));
                    return;
                }

                formData.set(key, String(value));
            });

            if (isEditMode) {
                formData.set("id", employeeId);
            }

            if (profilePic) {
                formData.set("profilePic", profilePic);
            }

            if (signature) {
                formData.set("signature", signature);
            }

            formData.set(
                "customFields",
                JSON.stringify(customFields || {})
            );

            console.log(
                "Employee submit:",
                isEditMode ? "UPDATE" : "CREATE",
                "Employee ID:",
                formData.get("id")
            );

            const response = await apiFetch("/api/employee", {
                method: isEditMode ? "PUT" : "POST",
                body: formData,
            });

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (!result?.success) {
                throw new Error(
                    result?.message ||
                    `Failed to ${isEditMode ? "update" : "create"} employee.`
                );
            }

            const savedEmployee = result?.data;

            if (!savedEmployee?.id) {
                throw new Error(
                    "The employee was saved, but the employee ID was not returned by the API."
                );
            }

            showSuccessToast(
                isEditMode
                    ? "Employee details updated successfully."
                    : "Employee created successfully."
            );

            await onSuccess?.(savedEmployee);
        } catch (error) {
            console.error(
                `${isEditMode ? "UPDATE" : "CREATE"} EMPLOYEE ERROR:`,
                error
            );

            showErrorToast(
                error?.message ||
                `Failed to ${isEditMode ? "update" : "create"} employee.`
            );
        } finally {
            setLoading(false);
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
    */

    return (
        <form onSubmit={handleSubmit}>
            <Card className="pb-2.5">
                <CardHeader id="basic_details">
                    <CardTitle>Basic Details</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-5">

                    {/* PERSONAL INFORMATION */}

                    <div className="pt-1">
                        <h3 className="text-sm font-semibold text-foreground">
                            Personal Information
                        </h3>
                    </div>

                    <FieldRow label="First Name" required>
                        <Input
                            value={form.firstName}
                            onChange={update("firstName")}
                            disabled={loading}
                            placeholder="Enter first name"
                            required
                        />
                    </FieldRow>

                    <FieldRow label="Middle Name">
                        <Input
                            value={form.middleName}
                            onChange={update("middleName")}
                            disabled={loading}
                            placeholder="Enter middle name"
                        />
                    </FieldRow>

                    <FieldRow label="Last Name" required>
                        <Input
                            value={form.lastName}
                            onChange={update("lastName")}
                            disabled={loading}
                            placeholder="Enter last name"
                            required
                        />
                    </FieldRow>

                    <FieldRow label="Date of Birth" required>
                        <DateField
                            value={form.dateOfBirth}
                            onChange={(value) =>
                                setForm((previous) => ({
                                    ...previous,
                                    dateOfBirth: value,
                                }))
                            }
                            disabled={loading}
                            placeholder="Pick birth date"
                        />
                    </FieldRow>

                    {/* GENDER DROPDOWN */}

                    <FieldRow label="Gender" required>
                        <Select
                            value={form.gender || "Male"}
                            onValueChange={updateSelect("gender")}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </FieldRow>

                    {/* BLOOD GROUP DROPDOWN */}

                    <FieldRow label="Blood Group">
                        <Select
                            value={form.bloodGroup || "A+"}
                            onValueChange={updateSelect("bloodGroup")}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>

                            <SelectContent>
                                {[
                                    "A+", "A-", "B+", "B-",
                                    "AB+", "AB-", "O+", "O-",
                                ].map((group) => (
                                    <SelectItem key={group} value={group}>
                                        {group}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FieldRow>

                    <FieldRow label="Email">
                        <Input
                            type="email"
                            value={form.emailId}
                            onChange={update("emailId")}
                            disabled={loading}
                            placeholder="employee@example.com"
                        />
                    </FieldRow>

                    <FieldRow label="Phone Number">
                        <Input
                            type="tel"
                            value={form.mobile}
                            onChange={update("mobile")}
                            disabled={loading}
                            placeholder="Enter phone number"
                        />
                    </FieldRow>

                    {/* MARITAL STATUS DROPDOWN */}

                    <FieldRow label="Marital Status">
                        <Select
                            value={form.maritalStatus || "Single"}
                            onValueChange={updateSelect("maritalStatus")}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select marital status" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="Single">Single</SelectItem>
                                <SelectItem value="Married">Married</SelectItem>
                                <SelectItem value="Divorced">Divorced</SelectItem>
                                <SelectItem value="Widowed">Widowed</SelectItem>
                            </SelectContent>
                        </Select>
                    </FieldRow>

                    {/* PROFILE INFORMATION */}

                    <div className="pt-3">
                        <h3 className="text-sm font-semibold text-foreground">
                            Profile Information
                        </h3>
                    </div>

                    <FieldRow label="Profile Picture">
                        <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <span className="text-sm text-secondary-foreground">
                                150x150px JPEG, PNG Image (Max 5 MB)
                            </span>

                            <Input
                                type="file"
                                accept="image/*"
                                className="max-w-sm"
                                onChange={(event) =>
                                    handleFileChange(event, setProfilePic)
                                }
                                disabled={loading}
                            />
                        </div>

                        {employee?.profilePic && !profilePic && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Existing profile picture will be retained unless you select a new one.
                            </p>
                        )}

                        {profilePic && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Selected: {profilePic.name}
                            </p>
                        )}
                    </FieldRow>

                    <FieldRow label="Signature">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                                handleFileChange(event, setSignature)
                            }
                            disabled={loading}
                        />

                        {employee?.signature && !signature && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Existing signature will be retained unless you select a new one.
                            </p>
                        )}

                        {signature && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Selected: {signature.name}
                            </p>
                        )}
                    </FieldRow>

                    {/* EMPLOYEE STATUS DROPDOWN */}

                    <FieldRow label="Employee Status">
                        <Select
                            value={form.status || "ACTIVE"}
                            onValueChange={updateSelect("status")}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                <SelectItem value="HOLD">Hold</SelectItem>
                            </SelectContent>
                        </Select>
                    </FieldRow>

                    <FieldRow label="Interview Qualification">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.qualifiedForInterview}
                                onChange={updateCheckbox("qualifiedForInterview")}
                                disabled={loading}
                                className="size-4 rounded border-input"
                            />
                            Qualified for Interview
                        </label>
                    </FieldRow>

                    {/* CORRESPONDENCE ADDRESS */}

                    <div className="pt-3">
                        <h3 className="text-sm font-semibold text-foreground">
                            Correspondence Address
                        </h3>
                    </div>

                    <FieldRow label="Address">
                        <Input
                            value={form.correspondenceAddress}
                            onChange={updateCorrespondence("correspondenceAddress")}
                            disabled={loading}
                            placeholder="Street address"
                        />
                    </FieldRow>

                    <FieldRow label="City" required>
                        <Input
                            value={form.correspondenceCity}
                            onChange={updateCorrespondence("correspondenceCity")}
                            disabled={loading}
                            placeholder="City"
                        />
                    </FieldRow>

                    <FieldRow label="State" required>
                        <Input
                            value={form.correspondenceState}
                            onChange={updateCorrespondence("correspondenceState")}
                            disabled={loading}
                            placeholder="State"
                        />
                    </FieldRow>

                    {/* CORRESPONDENCE COUNTRY DROPDOWN */}

                    <FieldRow label="Country" required>
                        <Select
                            value={form.correspondenceCountry || "India"}
                            onValueChange={(value) => {
                                const countryValue =
                                    value === "none" ? "" : value;

                                setForm((previous) => ({
                                    ...previous,
                                    correspondenceCountry: countryValue,

                                    ...(previous.permanentSameAsCorrespondence
                                        ? { permanentCountry: countryValue }
                                        : {}),
                                }));
                            }}
                            disabled={loading || loadingCountries}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        loadingCountries
                                            ? "Loading countries..."
                                            : "Select country"
                                    }
                                />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="none">
                                    Select country
                                </SelectItem>

                                {countries.map((country) => (
                                    <SelectItem
                                        key={country.id}
                                        value={String(country.name)}
                                    >
                                        {country.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FieldRow>

                    <FieldRow label="Pincode">
                        <Input
                            value={form.correspondencePincode}
                            onChange={updateCorrespondence("correspondencePincode")}
                            disabled={loading}
                            placeholder="Pincode"
                        />
                    </FieldRow>

                    {/* PERMANENT ADDRESS */}

                    <div className="pt-3">
                        <h3 className="text-sm font-semibold text-foreground">
                            Permanent Address
                        </h3>
                    </div>

                    <FieldRow label="Same as Correspondence">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.permanentSameAsCorrespondence}
                                onChange={(event) =>
                                    handlePermanentAddressCopy(event.target.checked)
                                }
                                disabled={loading}
                                className="size-4 rounded border-input"
                            />
                            Same as correspondence address
                        </label>
                    </FieldRow>

                    <FieldRow label="Address">
                        <Input
                            value={form.permanentAddress}
                            onChange={update("permanentAddress")}
                            disabled={loading || form.permanentSameAsCorrespondence}
                            placeholder="Permanent address"
                        />
                    </FieldRow>

                    <FieldRow label="City">
                        <Input
                            value={form.permanentCity}
                            onChange={update("permanentCity")}
                            disabled={loading || form.permanentSameAsCorrespondence}
                            placeholder="City"
                        />
                    </FieldRow>

                    <FieldRow label="State">
                        <Input
                            value={form.permanentState}
                            onChange={update("permanentState")}
                            disabled={loading || form.permanentSameAsCorrespondence}
                            placeholder="State"
                        />
                    </FieldRow>

                    {/* PERMANENT COUNTRY DROPDOWN */}

                    <FieldRow label="Country">
                        <Select
                            value={form.permanentCountry || "India"}
                            onValueChange={updateSelect("permanentCountry")}
                            disabled={
                                loading ||
                                loadingCountries ||
                                form.permanentSameAsCorrespondence
                            }
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={
                                        loadingCountries
                                            ? "Loading countries..."
                                            : "Select country"
                                    }
                                />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="none">
                                    Select country
                                </SelectItem>

                                {countries.map((country) => (
                                    <SelectItem
                                        key={country.id}
                                        value={String(country.name)}
                                    >
                                        {country.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FieldRow>

                    <FieldRow label="Pincode">
                        <Input
                            value={form.permanentPincode}
                            onChange={update("permanentPincode")}
                            disabled={loading || form.permanentSameAsCorrespondence}
                            placeholder="Pincode"
                        />
                    </FieldRow>

                    {/* EMPLOYMENT INFORMATION */}

                    <div className="pt-3">
                        <h3 className="text-sm font-semibold text-foreground">
                            Employment Information
                        </h3>
                    </div>

                    <FieldRow label="Resignation Date">
                        <DateField
                            value={form.resignationDate}
                            onChange={(value) =>
                                setForm((previous) => ({
                                    ...previous,
                                    resignationDate: value,
                                }))
                            }
                            disabled={loading}
                        />
                    </FieldRow>

                    <FieldRow label="Leaving Date">
                        <DateField
                            value={form.leavingDate}
                            onChange={(value) =>
                                setForm((previous) => ({
                                    ...previous,
                                    leavingDate: value,
                                }))
                            }
                            disabled={loading}
                        />
                    </FieldRow>

                    <FieldRow label="Reason to Leave">
                        <textarea
                            value={form.reasonToLeave}
                            onChange={update("reasonToLeave")}
                            disabled={loading}
                            rows={3}
                            placeholder="Enter reason to leave"
                            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </FieldRow>

                    {/* EDUCATION INFORMATION */}

                    <div className="pt-3">
                        <h3 className="text-sm font-semibold text-foreground">
                            Education Information
                        </h3>
                    </div>

                    <EducationInformation
                        value={form.educationDetails}
                        onChange={(value) =>
                            setForm((previous) => ({
                                ...previous,
                                educationDetails: value,
                            }))
                        }
                        disabled={loading}
                    />

                    {/* CUSTOM FIELDS */}

                    <div className="pt-3">
                        <h3 className="text-sm font-semibold text-foreground">
                            Custom Fields
                        </h3>
                    </div>

                    {customFieldsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderCircle className="size-4 animate-spin" />
                            Loading custom fields...
                        </div>
                    ) : (
                        <EmployeeCustomFields
                            fields={customFieldDefinitions}
                            values={customFields}
                            onChange={setCustomFields}
                            disabled={loading}
                        />
                    )}
                    {/* FORM ACTIONS */}

                    <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t bg-background px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={loading || customFieldsLoading}
                        >
                            {loading ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    {isEditMode ? "Updating..." : "Saving..."}
                                </>
                            ) : (
                                "Next"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}