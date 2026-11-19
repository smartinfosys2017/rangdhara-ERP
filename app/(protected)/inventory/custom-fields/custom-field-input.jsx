"use client";

import { useMemo, useRef, useState } from "react";

import { FileIcon, ImageIcon, LoaderCircle, Upload, X } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiFetch } from "@/lib/api";

/*
|--------------------------------------------------------------------------
| VALID FIELD TYPES
|--------------------------------------------------------------------------
*/

export const VALID_TYPES = [
  "input",
  "number",
  "textarea",
  "email",
  "phone",
  "url",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "date_picker",
  "time_picker",
  "date_picker_time",
  "colorpicker",
  "link",
  "file",
  "multi_file",
  "multi_attachment",
  "image",
  "multi_image",
];

/*
|--------------------------------------------------------------------------
| IMAGE MIME TYPES
|--------------------------------------------------------------------------
*/

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

/*
|--------------------------------------------------------------------------
| NORMALIZE FIELD TYPE
|--------------------------------------------------------------------------
*/

function normalizeFieldType(type) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, "_");
}

/*
|--------------------------------------------------------------------------
| FIELD TYPE HELPERS
|--------------------------------------------------------------------------
*/

function isImageField(type) {
  return ["image", "multi_image"].includes(normalizeFieldType(type));
}

function isMultipleField(type) {
  return ["multi_file", "multi_image", "multi_attachment"].includes(
    normalizeFieldType(type),
  );
}

function isFileField(type) {
  return [
    "file",
    "image",
    "multi_file",
    "multi_image",
    "multi_attachment",
  ].includes(normalizeFieldType(type));
}

/*
|--------------------------------------------------------------------------
| NORMALIZE ARRAY
|--------------------------------------------------------------------------
*/

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

      return [value];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| GET FIELD OPTIONS
|--------------------------------------------------------------------------
*/

function getFieldOptions(field) {
  let options = field?.options;

  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      options = options
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option) => {
      if (typeof option === "string") {
        return {
          value: option,
          label: option,
        };
      }

      return {
        value: String(option?.value ?? option?.label ?? ""),
        label: String(option?.label ?? option?.value ?? ""),
      };
    })
    .filter((option) => option.value);
}

/*
|--------------------------------------------------------------------------
| GET FILE NAME
|--------------------------------------------------------------------------
*/

function getFileName(url) {
  try {
    return decodeURIComponent(
      String(url).split("/").pop()?.split("?")[0] || url,
    );
  } catch {
    return String(url || "");
  }
}

/*
|--------------------------------------------------------------------------
| CHECK IMAGE URL
|--------------------------------------------------------------------------
*/

function isImageUrl(url) {
  if (!url) return false;

  const cleanUrl = String(url).split("?")[0].toLowerCase();

  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cleanUrl);
}

/*
|--------------------------------------------------------------------------
| COMPONENT
|--------------------------------------------------------------------------
*/

export default function CustomFieldInput({
  field,
  value,
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | FIELD INFORMATION
  |--------------------------------------------------------------------------
  */

  const type = normalizeFieldType(field?.type);

  const label = field?.label || field?.name || field?.slug || "Custom Field";

  const multiple = isMultipleField(type);
  const imageField = isImageField(type);

  const required = Boolean(field?.required);

  /*
  |--------------------------------------------------------------------------
  | EXISTING UPLOADED FILES
  |--------------------------------------------------------------------------
  */

  const existingFiles = useMemo(() => {
    if (multiple) {
      return normalizeArray(value);
    }

    return value ? [value] : [];
  }, [value, multiple]);

  /*
  |--------------------------------------------------------------------------
  | UPLOAD FILES
  |--------------------------------------------------------------------------
  */

  const uploadFiles = async (files) => {
    if (!files?.length) {
      toast.error("Please select at least one file.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file, file.name);
      });

      formData.append("fieldType", type);
      formData.append("fieldSlug", field?.slug || "");

      const response = await apiFetch("/api/customers/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Upload failed.");
      }

      let uploaded = [];

      if (Array.isArray(result?.files)) {
        uploaded = result.files;
      }

      if (!uploaded.length && result?.file) {
        uploaded = [result.file];
      }

      uploaded = uploaded
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return item?.url || item?.path || item?.file || item?.location || "";
        })
        .filter(Boolean);

      if (!uploaded.length) {
        throw new Error("Upload completed but no file URL was returned.");
      }

      if (multiple) {
        const current = normalizeArray(value);

        const merged = [...current, ...uploaded].filter(
          (item, index, array) => array.indexOf(item) === index,
        );

        onChange(merged);
      } else {
        onChange(uploaded[0] || "");
      }

      setLocalFiles([]);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      toast.success(
        multiple
          ? `${uploaded.length} file(s) uploaded successfully.`
          : "File uploaded successfully.",
      );
    } catch (error) {
      console.error("CUSTOM FIELD UPLOAD ERROR:", error);

      toast.error(error?.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SELECT FILES
  |--------------------------------------------------------------------------
  */

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);

    if (!selected.length) return;

    if (imageField) {
      const invalid = selected.find((file) => !IMAGE_TYPES.includes(file.type));

      if (invalid) {
        toast.error(`${invalid.name} is not a valid image.`);

        if (inputRef.current) {
          inputRef.current.value = "";
        }

        return;
      }
    }

    if (!multiple) {
      uploadFiles([selected[0]]);
      return;
    }

    setLocalFiles((previous) => {
      const combined = [...previous, ...selected];

      return combined.filter(
        (file, index, array) =>
          index ===
          array.findIndex(
            (item) =>
              item.name === file.name &&
              item.size === file.size &&
              item.lastModified === file.lastModified,
          ),
      );
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPLOAD SELECTED FILES
  |--------------------------------------------------------------------------
  */

  const uploadSelectedFiles = () => {
    if (!localFiles.length) {
      toast.error("Please select at least one file.");
      return;
    }

    uploadFiles(localFiles);
  };

  /*
  |--------------------------------------------------------------------------
  | REMOVE EXISTING FILE
  |--------------------------------------------------------------------------
  */

  const removeExisting = (url) => {
    if (multiple) {
      onChange(normalizeArray(value).filter((item) => item !== url));

      return;
    }

    onChange("");
  };

  /*
  |--------------------------------------------------------------------------
  | REMOVE LOCAL FILE
  |--------------------------------------------------------------------------
  */

  const removeLocalFile = (index) => {
    setLocalFiles((previous) => previous.filter((_, i) => i !== index));
  };

  /*
  |--------------------------------------------------------------------------
  | FIELD LABEL
  |--------------------------------------------------------------------------
  */

  const renderLabel = () => (
    <Label>
      {label}

      {required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  );

  /*
  |--------------------------------------------------------------------------
  | EXISTING FILES
  |--------------------------------------------------------------------------
  */

  const renderExistingFiles = () => {
    if (!existingFiles.length) {
      return null;
    }

    return (
      <div className="space-y-2">
        <Label>Uploaded Files</Label>

        <div className="grid gap-3 md:grid-cols-2">
          {existingFiles.map((url, index) => {
            const image = imageField || isImageUrl(url);

            return (
              <div
                key={`${url}-${index}`}
                className="relative overflow-hidden rounded-lg border"
              >
                {image ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={url}
                      alt={getFileName(url)}
                      className="h-32 w-full object-cover"
                    />
                  </a>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4"
                  >
                    <FileIcon className="size-8 shrink-0 text-muted-foreground" />

                    <span className="truncate text-sm">{getFileName(url)}</span>
                  </a>
                )}

                <Button
                  type="button"
                  mode="icon"
                  variant="destructive"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => removeExisting(url)}
                  disabled={disabled || uploading}
                >
                  <X />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | UPLOAD SECTION
  |--------------------------------------------------------------------------
  */

  const renderUpload = () => (
    <div className="space-y-3">
      <div
        className={`
          flex min-h-28 flex-col items-center justify-center
          rounded-lg border border-dashed p-5 text-center
          transition hover:bg-muted/50
          ${disabled || uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        `}
        onClick={() => {
          if (!disabled && !uploading) {
            inputRef.current?.click();
          }
        }}
      >
        {imageField ? (
          <ImageIcon className="mb-2 size-8 text-muted-foreground" />
        ) : (
          <Upload className="mb-2 size-8 text-muted-foreground" />
        )}

        <p className="text-sm font-medium">Click to upload</p>

        <p className="mt-1 text-xs text-muted-foreground">
          {multiple ? "You can select multiple files" : "Select one file"}
        </p>

        <Input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={imageField ? "image/*" : undefined}
          disabled={disabled || uploading}
          onChange={handleFileChange}
        />
      </div>

      {multiple && localFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Files Ready To Upload</Label>

            <span className="text-xs text-muted-foreground">
              {localFiles.length} file(s)
            </span>
          </div>

          <div className="space-y-2">
            {localFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {imageField ? (
                    <ImageIcon className="size-4 shrink-0" />
                  ) : (
                    <FileIcon className="size-4 shrink-0" />
                  )}

                  <div className="min-w-0">
                    <span className="block truncate text-sm">{file.name}</span>

                    <span className="block text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  mode="icon"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLocalFile(index)}
                  disabled={uploading || disabled}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            disabled={uploading || disabled || !localFiles.length}
            onClick={uploadSelectedFiles}
          >
            {uploading ? (
              <>
                <LoaderCircle className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload />
                Upload {localFiles.length} File(s)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  /*
  |--------------------------------------------------------------------------
  | FILE / IMAGE / ATTACHMENT
  |--------------------------------------------------------------------------
  */

  if (isFileField(type)) {
    return (
      <div className="space-y-4">
        {renderLabel()}
        {renderExistingFiles()}
        {renderUpload()}
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CHECKBOX
  |--------------------------------------------------------------------------
  */

  if (type === "checkbox") {
    const options = getFieldOptions(field);

    const selectedValues = normalizeArray(value).map(String);

    const handleCheckboxChange = (optionValue, checked) => {
      const normalizedOption = String(optionValue);

      let updatedValues;

      if (checked) {
        updatedValues = selectedValues.includes(normalizedOption)
          ? selectedValues
          : [...selectedValues, normalizedOption];
      } else {
        updatedValues = selectedValues.filter(
          (item) => item !== normalizedOption
        );
      }

      onChange(updatedValues);
    };

    return (
      <div className="space-y-3">
        {renderLabel()}

        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => {
            const isChecked = selectedValues.includes(option.value);

            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(option.value, checked === true)
                  }
                  disabled={disabled}
                />

                <span className="text-sm select-none">
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | TEXTAREA
  |--------------------------------------------------------------------------
  */

  if (type === "textarea") {
    return (
      <div className="space-y-2">
        {renderLabel()}

        <Textarea
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          placeholder={field?.placeholder || ""}
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SELECT
  |--------------------------------------------------------------------------
  */

  if (type === "select") {
    const options = getFieldOptions(field);

    return (
      <div className="space-y-2">
        {renderLabel()}

        <Select
          value={value ? String(value) : ""}
          onValueChange={onChange}
          disabled={disabled}
          required={required}
        >
          <SelectTrigger>
            <SelectValue placeholder={field?.placeholder || "Select"} />
          </SelectTrigger>

          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MULTISELECT
  |--------------------------------------------------------------------------
  */

  if (type === "multiselect") {
    const options = getFieldOptions(field);
    const selectedValues = normalizeArray(value).map(String);

    return (
      <div className="space-y-2">
        {renderLabel()}

        <select
          multiple
          value={selectedValues}
          disabled={disabled}
          required={required}
          onChange={(event) => {
            const selected = Array.from(
              event.target.selectedOptions,
              (option) => option.value,
            );

            onChange(selected);
          }}
          className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <p className="text-xs text-muted-foreground">
          Hold Ctrl (Windows) or Command (Mac) to select multiple options.
        </p>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RADIO
  |--------------------------------------------------------------------------
  */

  if (type === "radio") {
    const options = getFieldOptions(field);

    return (
      <div className="space-y-2">
        {renderLabel()}

        <div className="flex flex-wrap gap-4">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name={`custom-field-${field.id}`}
                value={option.value}
                checked={String(value ?? "") === option.value}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                required={required}
              />

              {option.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DATE PICKER
  |--------------------------------------------------------------------------
  */

  if (type === "date_picker") {
    return (
      <div className="space-y-2">
        {renderLabel()}

        <Input
          type="date"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | TIME PICKER
  |--------------------------------------------------------------------------
  */

  if (type === "time_picker") {
    return (
      <div className="space-y-2">
        {renderLabel()}

        <Input
          type="time"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DATE + TIME PICKER
  |--------------------------------------------------------------------------
  */

  if (type === "date_picker_time") {
    return (
      <div className="space-y-2">
        {renderLabel()}

        <Input
          type="datetime-local"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
        />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | COLOR PICKER
  |--------------------------------------------------------------------------
  */

  if (type === "colorpicker") {
    const colorValue = /^#[0-9a-f]{6}$/i.test(String(value || ""))
      ? value
      : "#000000";

    return (
      <div className="space-y-2">
        {renderLabel()}

        <div className="flex items-center gap-3">
          <Input
            type="color"
            value={colorValue}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="h-10 w-16 cursor-pointer p-1"
          />

          <Input
            type="text"
            value={value ?? ""}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            required={required}
            placeholder="#000000"
          />
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | LINK
  |--------------------------------------------------------------------------
  */

  if (type === "link") {
    return (
      <div className="space-y-2">
        {renderLabel()}

        <Input
          type="url"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          placeholder={field?.placeholder || "https://example.com"}
        />

        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm text-primary underline"
          >
            Open Link
          </a>
        )}
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DEFAULT INPUT TYPES
  |--------------------------------------------------------------------------
  */

  const inputTypes = {
    input: "text",
    number: "number",
    email: "email",
    phone: "tel",
    url: "url",
  };

  const inputType = inputTypes[type] || "text";

  return (
    <div className="space-y-2">
      {renderLabel()}

      <Input
        type={inputType}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        placeholder={field?.placeholder || ""}
        min={type === "number" ? field?.min : undefined}
        max={type === "number" ? field?.max : undefined}
      />
    </div>
  );
}