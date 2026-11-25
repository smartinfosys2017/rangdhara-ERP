
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
    Check,
    ChevronDown,
    Search,
} from "lucide-react";

import {
    Card,
    CardContent,
} from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { apiFetch } from "@/lib/api";

import CustomFieldInput from "./production-custom-field-input";

const EMPTY_FIELDS = [];

/*
|--------------------------------------------------------------------------
| NORMALIZE FIELD TYPE
|--------------------------------------------------------------------------
*/

const normalizeFieldType = (type) =>
    String(type || "")
        .trim()
        .toLowerCase()
        .replace(/[-\s]/g, "_");

/*
|--------------------------------------------------------------------------
| FIELD TYPE HELPERS
|--------------------------------------------------------------------------
*/

const isMultiSelectField = (type) =>
    [
        "multiselect",
        "multi_select",
        "multiple_select",
        "multiple",
    ].includes(normalizeFieldType(type));

const isMultiFileField = (type) =>
    [
        "multi_file",
        "multi_image",
        "multi_attachment",
    ].includes(normalizeFieldType(type));

/*
|--------------------------------------------------------------------------
| REQUIRED FIELD
|--------------------------------------------------------------------------
*/

const isRequiredField = (field) =>
    field?.required === true ||
    field?.required === 1 ||
    field?.required === "1" ||
    field?.required === "true";

/*
|--------------------------------------------------------------------------
| PARSE SAVED VALUES
|--------------------------------------------------------------------------
*/

const parseSavedValues = (savedValues) => {
    if (!savedValues) return {};

    if (
        typeof savedValues === "object" &&
        !Array.isArray(savedValues)
    ) {
        return savedValues;
    }

    if (typeof savedValues === "string") {
        try {
            const parsed = JSON.parse(savedValues);

            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
            ) {
                return parsed;
            }
        } catch (error) {
            console.error(
                "PRODUCTION CUSTOM FIELD JSON PARSE ERROR:",
                error,
            );
        }
    }

    return {};
};

/*
|--------------------------------------------------------------------------
| NORMALIZE ARRAY
|--------------------------------------------------------------------------
*/

const normalizeArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .filter(
                (item) =>
                    item !== null &&
                    item !== undefined &&
                    String(item).trim() !== "",
            )
            .map(String);
    }

    if (value === null || value === undefined || value === "") {
        return [];
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);

            if (Array.isArray(parsed)) {
                return parsed.map(String);
            }
        } catch {
            // Support comma-separated values.
        }

        return value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

/*
|--------------------------------------------------------------------------
| DEFAULT FIELD VALUE
|--------------------------------------------------------------------------
*/

const getDefaultValue = (field) => {
    if (!field) return "";

    const type = normalizeFieldType(field.type);
    const defaultValue = field.defaultValue;

    if (
        isMultiSelectField(type) ||
        isMultiFileField(type)
    ) {
        return normalizeArray(defaultValue);
    }

    if (type === "checkbox") {
        if (
            typeof defaultValue === "boolean" ||
            defaultValue === 0 ||
            defaultValue === 1
        ) {
            return Boolean(defaultValue);
        }

        if (
            defaultValue === "true" ||
            defaultValue === "false"
        ) {
            return defaultValue === "true";
        }

        if (Array.isArray(defaultValue)) {
            return defaultValue.map(String);
        }

        if (typeof defaultValue === "string" && defaultValue.trim()) {
            try {
                const parsed = JSON.parse(defaultValue);

                if (Array.isArray(parsed)) {
                    return parsed.map(String);
                }

                if (typeof parsed === "boolean") {
                    return parsed;
                }
            } catch {
                return normalizeArray(defaultValue);
            }
        }

        return false;
    }

    if (["file", "image"].includes(type)) {
        return defaultValue ?? "";
    }

    if (type === "colorpicker") {
        return defaultValue || "#000000";
    }

    return defaultValue ?? "";
};

/*
|--------------------------------------------------------------------------
| NORMALIZE SAVED VALUE
|--------------------------------------------------------------------------
*/

const normalizeSavedValue = (field, value) => {
    const type = normalizeFieldType(field?.type);

    if (
        isMultiSelectField(type) ||
        isMultiFileField(type)
    ) {
        return normalizeArray(value);
    }

    if (type === "checkbox") {
        if (Array.isArray(value)) {
            return value.map(String);
        }

        if (typeof value === "boolean") {
            return value;
        }

        if (value === 1 || value === "1") {
            return true;
        }

        if (value === 0 || value === "0") {
            return false;
        }

        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();

            if (normalized === "true") return true;
            if (normalized === "false") return false;

            return normalizeArray(value);
        }

        return false;
    }

    return value ?? "";
};

/*
|--------------------------------------------------------------------------
| EMPTY VALUE CHECK
|--------------------------------------------------------------------------
*/

const isEmptyCustomFieldValue = (value, type) => {
    const normalizedType = normalizeFieldType(type);

    if (normalizedType === "checkbox") {
        if (typeof value === "boolean") {
            return !value;
        }

        if (Array.isArray(value)) {
            return value.length === 0;
        }

        return !value;
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    return (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    );
};

/*
|--------------------------------------------------------------------------
| VALIDATE REQUIRED CUSTOM FIELDS
|--------------------------------------------------------------------------
|
| Use this function in the parent Production form before saving.
|
*/

export const validateRequiredCustomFields = (
    fields = [],
    values = {},
) => {
    const savedValues = parseSavedValues(values);

    return fields
        .filter(
            (field) =>
                field?.slug &&
                isRequiredField(field) &&
                Object.prototype.hasOwnProperty.call(
                    savedValues,
                    field.slug,
                ),
        )
        .filter((field) =>
            isEmptyCustomFieldValue(
                normalizeSavedValue(
                    field,
                    savedValues[field.slug],
                ),
                field.type,
            ),
        )
        .map(
            (field) =>
                field.label ||
                field.name ||
                field.slug,
        );
};

/*
|--------------------------------------------------------------------------
| BOOTSTRAP COLUMN
|--------------------------------------------------------------------------
*/

const getColumnClass = (bsColumn) => {
    const value = String(bsColumn || "12").trim();

    const match = value.match(/(?:col-md-)?(\d+)/);

    const column = Number(match?.[1] || 12);

    return `col-md-${column >= 1 && column <= 12 ? column : 12}`;
};

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function ProductionCustomFields({
    fields: providedFields = EMPTY_FIELDS,
    values = {},
    onChange,
    onFieldsLoaded,
    disabled = false,
}) {
    const [fields, setFields] = useState([]);

    const [loading, setLoading] = useState(true);

    const [selectorOpen, setSelectorOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE PARENT VALUES
    |--------------------------------------------------------------------------
    */

    const normalizedValues = useMemo(
        () => parseSavedValues(values),
        [values],
    );

    /*
    |--------------------------------------------------------------------------
    | LATEST VALUE REFERENCES
    |--------------------------------------------------------------------------
    */

    const valuesRef = useRef(normalizedValues);

    const onChangeRef = useRef(onChange);

    const onFieldsLoadedRef = useRef(onFieldsLoaded);

    useEffect(() => {
        valuesRef.current = normalizedValues;
    }, [normalizedValues]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onFieldsLoadedRef.current = onFieldsLoaded;
    }, [onFieldsLoaded]);

    /*
    |--------------------------------------------------------------------------
    | LOAD PRODUCTION CUSTOM FIELD DEFINITIONS
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        let mounted = true;

        const loadCustomFields = async () => {
            try {
                setLoading(true);

                let customFieldList = [];

                if (
                    Array.isArray(providedFields) &&
                    providedFields.length > 0
                ) {
                    customFieldList = providedFields;
                } else {
                    const response = await apiFetch(
                        "/api/custom_fields?fieldto=production&disabled=false&limit=100",
                        {
                            method: "GET",
                        },
                    );

                    const result = await response.json();

                    if (!response.ok || !result?.success) {
                        throw new Error(
                            result?.message ||
                                "Failed to load production custom fields.",
                        );
                    }

                    customFieldList = Array.isArray(result.data)
                        ? result.data
                        : [];
                }

                if (!mounted) return;

                setFields(customFieldList);

                /*
                 * Keep the latest parent values.
                 * Do not overwrite existing edit-mode values.
                 */

                const currentValues = parseSavedValues(
                    valuesRef.current,
                );

                const normalizedExistingValues = {
                    ...currentValues,
                };

                customFieldList.forEach((field) => {
                    if (
                        field?.slug &&
                        Object.prototype.hasOwnProperty.call(
                            currentValues,
                            field.slug,
                        )
                    ) {
                        normalizedExistingValues[field.slug] =
                            normalizeSavedValue(
                                field,
                                currentValues[field.slug],
                            );
                    }
                });

                valuesRef.current = normalizedExistingValues;

                onChangeRef.current?.(
                    normalizedExistingValues,
                );

                onFieldsLoadedRef.current?.(customFieldList);
            } catch (error) {
                console.error(
                    "PRODUCTION CUSTOM FIELD LOAD ERROR:",
                    error,
                );

                if (mounted) {
                    setFields([]);

                    onFieldsLoadedRef.current?.([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadCustomFields();

        return () => {
            mounted = false;
        };
    }, [providedFields]);

    /*
    |--------------------------------------------------------------------------
    | SELECTED FIELD SLUGS
    |--------------------------------------------------------------------------
    |
    | Saved fields automatically remain selected in Edit mode.
    |
    */

    const selectedFieldSlugs = useMemo(() => {
        return Object.keys(normalizedValues).filter((slug) =>
            fields.some(
                (field) => field?.slug === slug,
            ),
        );
    }, [normalizedValues, fields]);

    /*
    |--------------------------------------------------------------------------
    | SELECTABLE FIELDS
    |--------------------------------------------------------------------------
    */

    const selectableFields = useMemo(
        () =>
            fields.filter(
                (field) =>
                    field?.slug &&
                    !field.disabled,
            ),
        [fields],
    );

    /*
    |--------------------------------------------------------------------------
    | FILTER FIELDS
    |--------------------------------------------------------------------------
    */

    const filteredFields = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        if (!search) {
            return fields;
        }

        return fields.filter((field) => {
            const name = String(
                field.name || field.label || "",
            ).toLowerCase();

            const label = String(
                field.label || "",
            ).toLowerCase();

            const type = String(
                field.type || "",
            ).toLowerCase();

            const slug = String(
                field.slug || "",
            ).toLowerCase();

            return (
                name.includes(search) ||
                label.includes(search) ||
                type.includes(search) ||
                slug.includes(search)
            );
        });
    }, [fields, searchTerm]);

    /*
    |--------------------------------------------------------------------------
    | SELECTED FIELDS
    |--------------------------------------------------------------------------
    */

    const selectedFields = useMemo(
        () =>
            fields.filter(
                (field) =>
                    field?.slug &&
                    selectedFieldSlugs.includes(field.slug),
            ),
        [fields, selectedFieldSlugs],
    );

    /*
    |--------------------------------------------------------------------------
    | UPDATE CUSTOM FIELD VALUE
    |--------------------------------------------------------------------------
    */

    const handleValueChange = (slug, newValue) => {
        const updatedValues = {
            ...valuesRef.current,
            [slug]: newValue,
        };

        valuesRef.current = updatedValues;

        onChangeRef.current?.(updatedValues);
    };

    /*
    |--------------------------------------------------------------------------
    | HANDLE FIELD SELECTION
    |--------------------------------------------------------------------------
    */

    const handleSelectionChange = (selectedSlugs) => {
        if (disabled) return;

        const updatedValues = {
            ...valuesRef.current,
        };

        /*
         * Remove only deselected custom fields.
         * Preserve unrelated parent values.
         */

        fields.forEach((field) => {
            if (
                field?.slug &&
                !selectedSlugs.includes(field.slug)
            ) {
                delete updatedValues[field.slug];
            }
        });

        /*
         * Add default values for newly selected fields.
         */

        selectedSlugs.forEach((slug) => {
            if (
                !Object.prototype.hasOwnProperty.call(
                    updatedValues,
                    slug,
                )
            ) {
                const field = fields.find(
                    (item) => item.slug === slug,
                );

                if (field) {
                    updatedValues[slug] =
                        getDefaultValue(field);
                }
            }
        });

        valuesRef.current = updatedValues;

        onChangeRef.current?.(updatedValues);
    };

    /*
    |--------------------------------------------------------------------------
    | SELECT ALL
    |--------------------------------------------------------------------------
    */

    const handleSelectAll = () => {
        handleSelectionChange([
            ...new Set([
                ...selectedFieldSlugs,
                ...selectableFields.map(
                    (field) => field.slug,
                ),
            ]),
        ]);
    };

    /*
    |--------------------------------------------------------------------------
    | CLEAR ALL
    |--------------------------------------------------------------------------
    */

    const handleClearAll = () => {
        handleSelectionChange(
            selectedFieldSlugs.filter((slug) =>
                fields.some(
                    (field) =>
                        field.slug === slug &&
                        field.disabled,
                ),
            ),
        );
    };

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <Card>
                <CardContent className="space-y-4 pt-5">
                    <Skeleton className="h-10 w-full" />

                    <Skeleton className="h-5 w-40" />

                    <div className="grid gap-5 md:grid-cols-2">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    /*
    |--------------------------------------------------------------------------
    | NO CUSTOM FIELDS
    |--------------------------------------------------------------------------
    */

    if (!fields.length) {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (
        <Card>
            <CardContent className="space-y-5 pt-5">

                {/* CUSTOM FIELD SELECTOR */}

                <div className="space-y-2">
                    <div className="relative">

                        {/* SELECTOR TRIGGER */}

                        <Button
                            type="button"
                            variant="outline"
                            disabled={disabled}
                            onClick={() =>
                                setSelectorOpen((previous) => !previous)
                            }
                            className="h-10 w-full justify-between font-normal"
                        >
                            <span className="truncate text-left">
                                {selectedFields.length > 0
                                    ? selectedFields
                                        .map(
                                            (field) =>
                                                field.name ||
                                                field.label ||
                                                field.slug,
                                        )
                                        .join(", ")
                                    : "Select Custom Fields"}
                            </span>

                            <ChevronDown
                                className={`ml-2 size-4 shrink-0 transition-transform ${
                                    selectorOpen
                                        ? "rotate-180"
                                        : ""
                                }`}
                            />
                        </Button>

                        {/* SELECTOR POPUP */}

                        {selectorOpen && (
                            <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl sm:w-[380px]">

                                {/* SEARCH */}

                                <div className="border-b p-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                                        <Input
                                            value={searchTerm}
                                            onChange={(event) =>
                                                setSearchTerm(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Search Custom Fields..."
                                            className="h-9 pl-9"
                                        />
                                    </div>

                                    {/* SELECT ALL / CLEAR ALL */}

                                    <div className="flex items-center justify-between px-1 pt-2 text-xs">
                                        <span className="text-muted-foreground">
                                            {selectedFieldSlugs.length} selected
                                        </span>

                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={handleSelectAll}
                                                disabled={
                                                    disabled ||
                                                    selectableFields.length === 0
                                                }
                                                className="font-medium text-primary hover:underline disabled:opacity-50"
                                            >
                                                Select All
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleClearAll}
                                                disabled={
                                                    disabled ||
                                                    selectedFieldSlugs.length === 0
                                                }
                                                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* CUSTOM FIELD LIST */}

                                <div className="max-h-60 overflow-y-auto p-1.5">
                                    {filteredFields.length > 0 ? (
                                        filteredFields.map((field) => {
                                            const checked =
                                                selectedFieldSlugs.includes(
                                                    field.slug,
                                                );

                                            return (
                                                <label
                                                    key={
                                                        field.id ||
                                                        field.slug
                                                    }
                                                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-sm transition-colors hover:bg-accent ${
                                                        checked
                                                            ? "bg-accent/70"
                                                            : ""
                                                    } ${
                                                        field.disabled
                                                            ? "cursor-not-allowed opacity-50"
                                                            : ""
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        disabled={
                                                            disabled ||
                                                            Boolean(field.disabled)
                                                        }
                                                        onCheckedChange={(
                                                            isChecked,
                                                        ) => {
                                                            const updated =
                                                                isChecked
                                                                    ? [
                                                                        ...selectedFieldSlugs,
                                                                        field.slug,
                                                                    ]
                                                                    : selectedFieldSlugs.filter(
                                                                        (slug) =>
                                                                            slug !==
                                                                            field.slug,
                                                                    );

                                                            handleSelectionChange(
                                                                [
                                                                    ...new Set(
                                                                        updated,
                                                                    ),
                                                                ],
                                                            );
                                                        }}
                                                    />

                                                    <span className="min-w-0 flex-1">
                                                        {field.name ||
                                                            field.label ||
                                                            field.slug}

                                                        <span className="ml-1 text-muted-foreground">
                                                            ({field.type})
                                                        </span>

                                                        {isRequiredField(
                                                            field,
                                                        ) && (
                                                            <span className="ml-1 text-destructive">
                                                                *
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    ) : (
                                        <div className="py-8 text-center text-sm text-muted-foreground">
                                            No custom fields found.
                                        </div>
                                    )}
                                </div>

                                {/* POPUP FOOTER */}

                                <div className="flex items-center justify-between border-t px-3 py-2.5">
                                    <span className="text-xs text-muted-foreground">
                                        {fields.length} options
                                    </span>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setSelectorOpen(false);
                                            setSearchTerm("");
                                        }}
                                    >
                                        Done
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {selectedFieldSlugs.length} custom field(s) selected
                    </p>
                </div>

                {/* SELECTED CUSTOM FIELD INPUTS */}

                {selectedFields.length > 0 && (
                        <div className="row g-3">
                            {selectedFields.map((field) => {
                                const savedValue =
                                    Object.prototype.hasOwnProperty.call(
                                        normalizedValues,
                                        field.slug,
                                    )
                                        ? normalizeSavedValue(
                                            field,
                                            normalizedValues[field.slug],
                                        )
                                        : getDefaultValue(field);

                                return (
                                    <div
                                        key={field.id || field.slug}
                                        className={getColumnClass(
                                            field.bsColumn,
                                        )}
                                    >
                                        <CustomFieldInput
                                            field={field}
                                            value={savedValue}
                                            onChange={(newValue) =>
                                                handleValueChange(
                                                    field.slug,
                                                    newValue,
                                                )
                                            }
                                            disabled={
                                                disabled ||
                                                Boolean(field.disabled)
                                            }
                                        />
                                    </div>
                                );
                            })}
                        </div>
                )}
            </CardContent>
        </Card>
    );
}
