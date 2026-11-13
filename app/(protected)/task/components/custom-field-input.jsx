'use client';

import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  FileIcon,
  ImageIcon,
  LoaderCircle,
  Upload,
  X,
} from 'lucide-react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  Checkbox,
} from '@/components/ui/checkbox';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { apiFetch } from '@/lib/api';

// =======================================================
// IMAGE MIME TYPES
// =======================================================

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// =======================================================
// NORMALIZE FIELD TYPE
// =======================================================

function normalizeFieldType(type) {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, '_');
}

// =======================================================
// FIELD TYPE HELPERS
// =======================================================

function isImageField(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'image' ||
    normalized === 'multi_image' ||
    normalized === 'multiimage'
  );
}

function isMultipleField(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'multi_file' ||
    normalized === 'multifile' ||
    normalized === 'multi_image' ||
    normalized === 'multiimage'
  );
}

function isFileField(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'file' ||
    normalized === 'image' ||
    normalized === 'multi_file' ||
    normalized === 'multifile' ||
    normalized === 'multi_image' ||
    normalized === 'multiimage'
  );
}

// =======================================================
// NORMALIZE VALUE TO ARRAY
// =======================================================

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value) {
    return [];
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

      return [value];
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

// =======================================================
// GET FILE NAME FROM URL
// =======================================================

function getFileName(url) {
  try {
    return decodeURIComponent(
      String(url)
        .split('/')
        .pop()
        ?.split('?')[0] || url
    );
  } catch {
    return String(url || '');
  }
}

// =======================================================
// CHECK IMAGE URL
// =======================================================

function isImageUrl(url) {
  if (!url) {
    return false;
  }

  const cleanUrl = String(url)
    .split('?')[0]
    .toLowerCase();

  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
    cleanUrl
  );
}

// =======================================================
// COMPONENT
// =======================================================

export default function CustomFieldInput({
  field,
  value,
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const [uploading, setUploading] =
    useState(false);

  const [localFiles, setLocalFiles] =
    useState([]);

  // =====================================================
  // FIELD INFORMATION
  // =====================================================

  const type = normalizeFieldType(
    field?.type
  );

  const label =
    field?.label ||
    field?.name ||
    field?.slug ||
    'Custom Field';

  const multiple =
    isMultipleField(type);

  const imageField =
    isImageField(type);

  // =====================================================
  // EXISTING UPLOADED FILES
  // =====================================================

  const existingFiles = useMemo(() => {
    if (multiple) {
      return normalizeArray(value);
    }

    return value ? [value] : [];
  }, [value, multiple]);

  // =====================================================
  // UPLOAD FILES
  // =====================================================

  const uploadFiles = async (files) => {
    if (!files?.length) {
      toast.error(
        'Please select at least one file.'
      );

      return;
    }

    try {
      setUploading(true);

      // =================================================
      // CREATE FORMDATA
      // =================================================

      const formData = new FormData();

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | Every selected file uses the same "files" key.
      |
      */

      files.forEach((file) => {
        formData.append(
          'files',
          file,
          file.name
        );
      });

      // =================================================
      // FIELD INFORMATION
      // =================================================

      formData.append(
        'fieldType',
        type
      );

      formData.append(
        'fieldSlug',
        field?.slug || ''
      );

      // =================================================
      // DEBUG
      // =================================================

      console.log(
        '========================================'
      );

      console.log(
        'TASK CUSTOM FIELD UPLOAD'
      );

      console.log(
        'Field type:',
        type
      );

      console.log(
        'Field slug:',
        field?.slug
      );

      console.log(
        'Multiple:',
        multiple
      );

      console.log(
        'Files count:',
        files.length
      );

      console.log(
        'Files:',
        files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        }))
      );

      // =================================================
      // TASK UPLOAD API
      // =================================================

      const response =
        await apiFetch(
          '/api/task/upload',
          {
            method: 'POST',
            body: formData,
          }
        );

      // =================================================
      // API RESPONSE
      // =================================================

      const result =
        await response
          .json()
          .catch(() => ({}));

      console.log(
        'TASK UPLOAD API RESPONSE:',
        result
      );

      // =================================================
      // VALIDATE RESPONSE
      // =================================================

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Upload failed.'
        );
      }

      // =================================================
      // GET UPLOADED FILES
      // =================================================

      let uploaded = [];

      /*
      |--------------------------------------------------------------------------
      | Expected:
      |
      | {
      |   success: true,
      |   files: [...]
      | }
      |--------------------------------------------------------------------------
      */

      if (
        Array.isArray(
          result?.files
        )
      ) {
        uploaded =
          result.files;
      }

      /*
      |--------------------------------------------------------------------------
      | Fallback:
      |
      | {
      |   success: true,
      |   file: {...}
      | }
      |--------------------------------------------------------------------------
      */

      if (
        !uploaded.length &&
        result?.file
      ) {
        uploaded = [
          result.file,
        ];
      }

      // =================================================
      // NORMALIZE UPLOADED VALUES
      // =================================================

      uploaded = uploaded
        .map((item) => {
          if (
            typeof item ===
            'string'
          ) {
            return item;
          }

          return (
            item?.url ||
            item?.path ||
            item?.file ||
            item?.location ||
            ''
          );
        })
        .filter(Boolean);

      // =================================================
      // NO URL RETURNED
      // =================================================

      if (!uploaded.length) {
        throw new Error(
          'Upload completed but no uploaded file URL was returned by the server.'
        );
      }

      // =================================================
      // MULTIPLE FILE / IMAGE
      // =================================================

      if (multiple) {
        const current =
          normalizeArray(value);

        const merged = [
          ...current,
          ...uploaded,
        ].filter(
          (item, index, array) =>
            array.indexOf(item) ===
            index
        );

        console.log(
          'Existing files:',
          current
        );

        console.log(
          'New uploaded files:',
          uploaded
        );

        console.log(
          'Final files:',
          merged
        );

        // Update parent
        onChange(merged);
      }

      // =================================================
      // SINGLE FILE / IMAGE
      // =================================================

      else {
        onChange(
          uploaded[0] || ''
        );
      }

      // =================================================
      // CLEAR LOCAL FILES
      // =================================================

      setLocalFiles([]);

      // =================================================
      // RESET INPUT
      // =================================================

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      // =================================================
      // SUCCESS
      // =================================================

      toast.success(
        multiple
          ? `${uploaded.length} file(s) uploaded successfully.`
          : 'File uploaded successfully.'
      );
    } catch (error) {
      console.error(
        'TASK CUSTOM FIELD UPLOAD ERROR:',
        error
      );

      toast.error(
        error?.message ||
          'Failed to upload file.'
      );
    } finally {
      setUploading(false);
    }
  };

  // =======================================================
  // SELECT FILES
  // =======================================================

  const handleFileChange = (
    event
  ) => {
    const selected =
      Array.from(
        event.target.files || []
      );

    console.log(
      'SELECTED FILES:',
      selected
    );

    console.log(
      'SELECTED FILE COUNT:',
      selected.length
    );

    if (!selected.length) {
      return;
    }

    // =================================================
    // VALIDATE IMAGES
    // =================================================

    if (imageField) {
      const invalid =
        selected.find(
          (file) =>
            !IMAGE_TYPES.includes(
              file.type
            )
        );

      if (invalid) {
        toast.error(
          `${invalid.name} is not a valid image.`
        );

        if (inputRef.current) {
          inputRef.current.value = '';
        }

        return;
      }
    }

    // =================================================
    // SINGLE FILE
    // =================================================

    if (!multiple) {
      uploadFiles([
        selected[0],
      ]);

      return;
    }

    // =================================================
    // MULTIPLE FILES
    // =================================================

    setLocalFiles(
      (previous) => {
        const combined = [
          ...previous,
          ...selected,
        ];

        return combined.filter(
          (file, index, array) =>
            index ===
            array.findIndex(
              (item) =>
                item.name ===
                  file.name &&
                item.size ===
                  file.size &&
                item.lastModified ===
                  file.lastModified
            )
        );
      }
    );

    // =================================================
    // RESET INPUT
    // =================================================

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  // =======================================================
  // UPLOAD SELECTED MULTIPLE FILES
  // =======================================================

  const uploadSelectedFiles = () => {
    if (!localFiles.length) {
      toast.error(
        'Please select at least one file.'
      );

      return;
    }

    uploadFiles(
      localFiles
    );
  };

  // =======================================================
  // REMOVE EXISTING FILE
  // =======================================================

  const removeExisting = (
    url
  ) => {
    if (multiple) {
      const updated =
        normalizeArray(value)
          .filter(
            (item) =>
              item !== url
          );

      onChange(updated);

      return;
    }

    onChange('');
  };

  // =======================================================
  // REMOVE LOCAL FILE
  // =======================================================

  const removeLocalFile = (
    index
  ) => {
    setLocalFiles(
      (previous) =>
        previous.filter(
          (_, i) =>
            i !== index
        )
    );
  };

  // =======================================================
  // RENDER EXISTING FILES
  // =======================================================

  const renderExistingFiles =
    () => {
      if (
        !existingFiles.length
      ) {
        return null;
      }

      return (
        <div className="space-y-2">

          <Label>
            Uploaded Files
          </Label>

          <div className="grid gap-3 md:grid-cols-2">

            {existingFiles.map(
              (url, index) => {
                const image =
                  imageField ||
                  isImageUrl(url);

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
                          alt={getFileName(
                            url
                          )}
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

                        <span className="truncate text-sm">
                          {getFileName(
                            url
                          )}
                        </span>
                      </a>
                    )}

                    <Button
                      type="button"
                      mode="icon"
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() =>
                        removeExisting(
                          url
                        )
                      }
                      disabled={
                        disabled ||
                        uploading
                      }
                    >
                      <X />
                    </Button>

                  </div>
                );
              }
            )}

          </div>
        </div>
      );
    };

  // =======================================================
  // RENDER UPLOAD
  // =======================================================

  const renderUpload = () => (
    <div className="space-y-3">

      {/* UPLOAD AREA */}

      <div
        className="
          flex
          min-h-28
          cursor-pointer
          flex-col
          items-center
          justify-center
          rounded-lg
          border
          border-dashed
          p-5
          text-center
          transition
          hover:bg-muted/50
        "
        onClick={() => {
          if (
            !disabled &&
            !uploading
          ) {
            inputRef.current?.click();
          }
        }}
      >

        {imageField ? (
          <ImageIcon className="mb-2 size-8 text-muted-foreground" />
        ) : (
          <Upload className="mb-2 size-8 text-muted-foreground" />
        )}

        <p className="text-sm font-medium">
          Click to upload
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {multiple
            ? 'You can select multiple files'
            : 'Select one file'}
        </p>

        <Input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={
            imageField
              ? 'image/*'
              : undefined
          }
          disabled={
            disabled ||
            uploading
          }
          onChange={
            handleFileChange
          }
        />

      </div>

      {/* =================================================
          PENDING MULTIPLE FILES
      ================================================= */}

      {multiple &&
        localFiles.length > 0 && (
          <div className="space-y-2">

            <div className="flex items-center justify-between">

              <Label>
                Files Ready To Upload
              </Label>

              <span className="text-xs text-muted-foreground">
                {localFiles.length}{' '}
                file
                {localFiles.length !== 1
                  ? 's'
                  : ''}
              </span>

            </div>

            <div className="space-y-2">

              {localFiles.map(
                (
                  file,
                  index
                ) => (
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

                        <span className="block truncate text-sm">
                          {file.name}
                        </span>

                        <span className="block text-xs text-muted-foreground">
                          {(
                            file.size /
                            1024 /
                            1024
                          ).toFixed(2)}{' '}
                          MB
                        </span>

                      </div>
                    </div>

                    <Button
                      type="button"
                      mode="icon"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        removeLocalFile(
                          index
                        )
                      }
                      disabled={
                        uploading
                      }
                    >
                      <X />
                    </Button>

                  </div>
                )
              )}

            </div>

            {/* UPLOAD BUTTON */}

            <Button
              type="button"
              disabled={
                uploading ||
                disabled ||
                !localFiles.length
              }
              onClick={
                uploadSelectedFiles
              }
            >

              {uploading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload />

                  Upload{' '}
                  {localFiles.length}{' '}
                  File
                  {localFiles.length !== 1
                    ? 's'
                    : ''}
                </>
              )}

            </Button>

          </div>
        )}

    </div>
  );

  // =======================================================
  // FILE / IMAGE FIELDS
  // =======================================================

  if (isFileField(type)) {
    return (
      <div className="space-y-4">

        <Label>
          {label}

          {field?.required && (
            <span className="ml-1 text-destructive">
              *
            </span>
          )}
        </Label>

        {renderExistingFiles()}

        {renderUpload()}

      </div>
    );
  }

  // =======================================================
  // CHECKBOX
  // =======================================================

  if (type === 'checkbox') {
    return (
      <div className="flex items-center gap-2">

        <Checkbox
          checked={
            value === true ||
            value === 'true' ||
            value === '1'
          }
          onCheckedChange={
            onChange
          }
          disabled={disabled}
        />

        <Label>
          {label}

          {field?.required && (
            <span className="ml-1 text-destructive">
              *
            </span>
          )}
        </Label>

      </div>
    );
  }

  // =======================================================
  // TEXTAREA
  // =======================================================

  if (type === 'textarea') {
    return (
      <div className="space-y-2">

        <Label>
          {label}

          {field?.required && (
            <span className="ml-1 text-destructive">
              *
            </span>
          )}
        </Label>

        <Textarea
          value={value ?? ''}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          disabled={disabled}
          placeholder={
            field?.placeholder || ''
          }
        />

      </div>
    );
  }

  // =======================================================
  // SELECT / DROPDOWN
  // =======================================================

  if (
    type === 'select' ||
    type === 'dropdown'
  ) {
    let options =
      field?.options;

    // =====================================================
    // PARSE OPTIONS
    // =====================================================

    if (
      typeof options ===
      'string'
    ) {
      try {
        options =
          JSON.parse(
            options
          );
      } catch {
        options =
          options
            .split(',')
            .map(
              (item) =>
                item.trim()
            )
            .filter(Boolean);
      }
    }

    if (
      !Array.isArray(
        options
      )
    ) {
      options = [];
    }

    return (
      <div className="space-y-2">

        <Label>
          {label}

          {field?.required && (
            <span className="ml-1 text-destructive">
              *
            </span>
          )}
        </Label>

        <Select
          value={value || ''}
          onValueChange={
            onChange
          }
          disabled={disabled}
        >

          <SelectTrigger>
            <SelectValue
              placeholder={
                field?.placeholder ||
                'Select'
              }
            />
          </SelectTrigger>

          <SelectContent>

            {options.map(
              (
                option,
                index
              ) => {
                const optionValue =
                  typeof option ===
                  'string'
                    ? option
                    : option?.value;

                const optionLabel =
                  typeof option ===
                  'string'
                    ? option
                    : option?.label;

                if (
                  !optionValue
                ) {
                  return null;
                }

                return (
                  <SelectItem
                    key={`${optionValue}-${index}`}
                    value={String(
                      optionValue
                    )}
                  >
                    {optionLabel ||
                      optionValue}
                  </SelectItem>
                );
              }
            )}

          </SelectContent>
        </Select>

      </div>
    );
  }

  // =======================================================
  // DEFAULT INPUT
  // =======================================================

  return (
    <div className="space-y-2">

      <Label>
        {label}

        {field?.required && (
          <span className="ml-1 text-destructive">
            *
          </span>
        )}
      </Label>

      <Input
        type={
          type === 'number'
            ? 'number'
            : type === 'email'
              ? 'email'
              : type === 'url'
                ? 'url'
                : 'text'
        }
        value={value ?? ''}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        disabled={disabled}
        placeholder={
          field?.placeholder || ''
        }
      />

    </div>
  );
}