
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

import CustomFieldInput from "./custom-field-input";

const EMPTY_FIELDS = [];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeFieldType = (type) =>
  String(type || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_");
const isRequiredField = (field) =>
  field?.required === true ||
  field?.required === 1 ||
  field?.required === "1" ||
  field?.required === "true";

const isEmptyCustomFieldValue = (value, type) => {
  const normalizedType = normalizeFieldType(type);

  if (normalizedType === "checkbox") {
    return !Array.isArray(value) || value.length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return value === null || value === undefined || String(value).trim() === "";
};

/**
 * Returns the labels of required fields that are empty.
 * Use this function in the parent form before saving.
 */
export const validateRequiredCustomFields = (fields = [], values = {}) => {
  const savedValues = parseSavedValues(values);

  return fields
    .filter(
      (field) =>
        field?.slug &&
        isRequiredField(field) &&
        Object.prototype.hasOwnProperty.call(savedValues, field.slug),
    )
    .filter((field) =>
      isEmptyCustomFieldValue(
        savedValues[field.slug],
        field.type,
      ),
    )
    .map((field) => field.label || field.name || field.slug);
};
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
      console.error("CUSTOM FIELD JSON PARSE ERROR:", error);
    }
  }

  return {};
};

const getDefaultValue = (field) => {
  if (!field) return "";

  const type = normalizeFieldType(field.type);
  const defaultValue = field.defaultValue;

  if (
    ["multi_file", "multi_image", "multi_attachment"].includes(type)
  ) {
    return [];
  }

  if (type === "multiselect") {
    if (!defaultValue) return [];

    if (Array.isArray(defaultValue)) return defaultValue;

    try {
      const parsed = JSON.parse(defaultValue);

      if (Array.isArray(parsed)) return parsed;
    } catch {
      return String(defaultValue)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  if (["file", "image"].includes(type)) {
    return defaultValue ?? "";
  }

  if (type === "checkbox") {
    if (!defaultValue) return [];

    if (Array.isArray(defaultValue)) {
      return defaultValue.map(String);
    }

    try {
      const parsed = JSON.parse(defaultValue);

      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      return String(defaultValue)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  if (type === "colorpicker") {
    return defaultValue || "#000000";
  }

  return defaultValue ?? "";
};

/*
|--------------------------------------------------------------------------
| Normalize Saved Value According To Field Type
|--------------------------------------------------------------------------
*/

const normalizeSavedValue = (field, value) => {
  const type = normalizeFieldType(field.type);

  // Checkbox options support multiple selections
  if (type === "checkbox") {
    if (Array.isArray(value)) {
      return value.map(String);
    }

    if (typeof value === "string") {
      if (!value.trim()) return [];

      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      } catch {
        // Support comma-separated saved values
      }

      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }

    return [];
  }

  if (
    ["multi_file", "multi_image", "multi_attachment", "multiselect"].includes(
      type,
    )
  ) {
    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) return parsed;
      } catch {
        if (!value.trim()) return [];

        return type === "multiselect"
          ? value.split(",").map((item) => item.trim()).filter(Boolean)
          : [value];
      }
    }

    return [];
  }

  return value ?? "";
};

/*
|--------------------------------------------------------------------------
| Bootstrap Column
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
| Component
|--------------------------------------------------------------------------
*/

export default function TransactionCustomFields({
  fields: providedFields = EMPTY_FIELDS,
  values = {},
  onChange,
  onFieldsLoaded,
  disabled = false,
}) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Normalize Parent Values
  |--------------------------------------------------------------------------
  |
  | Supports both:
  | 1. JavaScript object
  | 2. JSON string from database
  |
  */

  const normalizedValues = useMemo(
    () => parseSavedValues(values),
    [values],
  );

  /*
  |--------------------------------------------------------------------------
  | Load Custom Field Definitions
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
            "/api/custom_fields?fieldto=inventory&disabled=false&limit=100",
            { method: "GET" },
          );

          const result = await response.json();

          if (!response.ok || !result?.success) {
            throw new Error(
              result?.message || "Failed to load custom fields.",
            );
          }

          customFieldList = Array.isArray(result.data)
            ? result.data
            : [];
        }

        if (!mounted) return;

        setFields(customFieldList);
        onFieldsLoaded?.(customFieldList);
      } catch (error) {
        console.error("CUSTOM FIELD LOAD ERROR:", error);

        if (mounted) {
          setFields([]);
          onFieldsLoaded?.([]);
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
  | Automatically Select Saved Fields
  |--------------------------------------------------------------------------
  |
  | Example saved object:
  |
  | {
  |   shape: "square",
  |   inpoutin: "UyTrdt123",
  |   gratcolor: "black"
  | }
  |
  | These three fields will automatically be selected.
  |
  */

  const selectedFieldSlugs = useMemo(() => {
    return Object.keys(normalizedValues).filter((slug) =>
      fields.some((field) => field.slug === slug)
    );
  }, [normalizedValues, fields]);

  /*
  |--------------------------------------------------------------------------
  | Select / Deselect Field
  |--------------------------------------------------------------------------
  */

  const handleFieldSelection = (field, checked) => {
    if (disabled || !field?.slug) return;

    const updatedValues = {
      ...normalizedValues,
    };

    if (checked) {
      if (
        !Object.prototype.hasOwnProperty.call(updatedValues, field.slug)
      ) {
        updatedValues[field.slug] = getDefaultValue(field);
      }
    } else {
      delete updatedValues[field.slug];
    }

    onChange?.(updatedValues);
  };

  /*
  |--------------------------------------------------------------------------
  | Select All
  |--------------------------------------------------------------------------
  */

  const handleSelectAll = () => {
    if (disabled) return;

    const updatedValues = {
      ...normalizedValues,
    };

    fields.forEach((field) => {
      if (!field?.slug) return;

      if (
        !Object.prototype.hasOwnProperty.call(
          updatedValues,
          field.slug,
        )
      ) {
        updatedValues[field.slug] = getDefaultValue(field);
      }
    });

    onChange?.(updatedValues);
  };

  /*
  |--------------------------------------------------------------------------
  | Clear All
  |--------------------------------------------------------------------------
  */

  const handleClearAll = () => {
    if (disabled) return;

    onChange?.({});
  };

  /*
  |--------------------------------------------------------------------------
  | Update Individual Field Value
  |--------------------------------------------------------------------------
  */

  const handleValueChange = (slug, newValue) => {
    onChange?.({
      ...normalizedValues,
      [slug]: newValue,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | No Fields
  |--------------------------------------------------------------------------
  */

  if (!fields.length) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Card>
      <CardContent className="space-y-5 pt-5">

        {/* Field Selection Dropdown */}

        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>
              {selectedFieldSlugs.length
                ? `${selectedFieldSlugs.length} fields selected`
                : "Select Custom Fields"}
            </span>

            <span>{dropdownOpen ? "▲" : "▼"}</span>
          </button>

          {dropdownOpen && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-background p-2 shadow-md">
              {/* Select All / Clear All */}
              <div className="sticky bottom-0 flex justify-right gap-3 border-t bg-background px-2 py-3">
                <button
                  type="button"
                  disabled={disabled}
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  onClick={handleSelectAll}
                >
                  Select All
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              </div>
              {/* Field Options */}
              {fields.map((field) => (
                <label
                  key={field.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selectedFieldSlugs.includes(field.slug)}
                    disabled={disabled}
                    onChange={(event) =>
                      handleFieldSelection(field, event.target.checked)
                    }
                  />

                  <span className="text-sm">
                    {field.name}

                    <span className="ml-2 text-xs text-muted-foreground">
                      ({field.type})
                    </span>

                    {field.required && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </span>
                </label>
              ))}


            </div>
          )}
        </div>

        {/* Selected Custom Fields */}

        <div className="row g-3">
          {fields
            .filter(
              (field) =>
                field?.slug &&
                selectedFieldSlugs.includes(field.slug),
            )
            .map((field) => {
              const savedValue = Object.prototype.hasOwnProperty.call(
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
                  key={field.id}
                  className={getColumnClass(field.bsColumn)}
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
                      field.disabled
                    }
                  />
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}