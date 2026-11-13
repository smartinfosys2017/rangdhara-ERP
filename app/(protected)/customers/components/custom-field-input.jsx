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

/*
|--------------------------------------------------------------------------
| Image MIME types
|--------------------------------------------------------------------------
*/

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/*
|--------------------------------------------------------------------------
| Normalize field type
|--------------------------------------------------------------------------
*/

function normalizeFieldType(type) {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, '_');
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function isImageField(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'image' ||
    normalized === 'multi_image'
  );
}

function isMultipleField(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'multi_file' ||
    normalized === 'multi_image'
  );
}

function isFileField(type) {
  const normalized = normalizeFieldType(type);

  return (
    normalized === 'file' ||
    normalized === 'image' ||
    normalized === 'multi_file' ||
    normalized === 'multi_image'
  );
}

/*
|--------------------------------------------------------------------------
| Normalize value to array
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Get file name from URL
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Check image URL
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

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

  /*
  |--------------------------------------------------------------------------
  | Field information
  |--------------------------------------------------------------------------
  */

  const type = normalizeFieldType(
    field?.type
  );

  const label =
    field?.label ||
    field?.name ||
    field?.slug ||
    'Custom Field';

  const multiple = isMultipleField(type);

  const imageField = isImageField(type);

  /*
  |--------------------------------------------------------------------------
  | Existing uploaded files
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
  | Upload files
  |--------------------------------------------------------------------------
  */

  const uploadFiles = async (files) => {
    if (!files?.length) {
      toast.error(
        'Please select at least one file.'
      );
      return;
    }

    try {
      setUploading(true);

      /*
      |--------------------------------------------------------------------------
      | Create FormData
      |--------------------------------------------------------------------------
      */

      const formData = new FormData();

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | Every file MUST use the same "files" key.
      |
      | files = file1
      | files = file2
      | files = file3
      |
      | Backend should use:
      |
      | formData.getAll('files')
      |
      |--------------------------------------------------------------------------
      */

      files.forEach((file) => {
        formData.append(
          'files',
          file,
          file.name
        );
      });

      /*
      |--------------------------------------------------------------------------
      | Send field information
      |--------------------------------------------------------------------------
      */

      formData.append(
        'fieldType',
        type
      );

      formData.append(
        'fieldSlug',
        field?.slug || ''
      );

      /*
      |--------------------------------------------------------------------------
      | Debug
      |--------------------------------------------------------------------------
      */

      console.log(
        'CUSTOM FIELD UPLOAD'
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

      /*
      |--------------------------------------------------------------------------
      | API request
      |--------------------------------------------------------------------------
      */

      const response = await apiFetch(
        '/api/customers/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      /*
      |--------------------------------------------------------------------------
      | API response
      |--------------------------------------------------------------------------
      */

      const result =
        await response
          .json()
          .catch(() => ({}));

      console.log(
        'UPLOAD API RESPONSE:',
        result
      );

      /*
      |--------------------------------------------------------------------------
      | Validate response
      |--------------------------------------------------------------------------
      */

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Upload failed.'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Get uploaded files
      |--------------------------------------------------------------------------
      */

      let uploaded = [];

      /*
      |--------------------------------------------------------------------------
      | API returns:
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

      /*
      |--------------------------------------------------------------------------
      | Normalize uploaded values
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | No URL returned
      |--------------------------------------------------------------------------
      */

      if (!uploaded.length) {
        throw new Error(
          'Upload completed but no uploaded file URL was returned by the server.'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | MULTIPLE FILE
      |--------------------------------------------------------------------------
      */

      if (multiple) {
        const current =
          normalizeArray(value);

        /*
        |--------------------------------------------------------------------------
        | Merge old + newly uploaded
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | Update parent form
        |--------------------------------------------------------------------------
        */

        onChange(merged);
      }

      /*
      |--------------------------------------------------------------------------
      | SINGLE FILE
      |--------------------------------------------------------------------------
      */

      else {
        onChange(
          uploaded[0] || ''
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Clear local selected files
      |--------------------------------------------------------------------------
      */

      setLocalFiles([]);

      /*
      |--------------------------------------------------------------------------
      | Reset input
      |--------------------------------------------------------------------------
      */

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      /*
      |--------------------------------------------------------------------------
      | Success message
      |--------------------------------------------------------------------------
      */

      toast.success(
        multiple
          ? `${uploaded.length} file(s) uploaded successfully.`
          : 'File uploaded successfully.'
      );
    } catch (error) {
      console.error(
        'CUSTOM FIELD UPLOAD ERROR:',
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

  /*
  |--------------------------------------------------------------------------
  | Select files
  |--------------------------------------------------------------------------
  */

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

    /*
    |--------------------------------------------------------------------------
    | Validate images
    |--------------------------------------------------------------------------
    */

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
          inputRef.current.value =
            '';
        }

        return;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Single file
    |--------------------------------------------------------------------------
    */

    if (!multiple) {
      uploadFiles([
        selected[0],
      ]);

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Multiple files
    |--------------------------------------------------------------------------
    |
    | Add selected files to local queue.
    |
    */

    setLocalFiles(
      (previous) => {
        const combined = [
          ...previous,
          ...selected,
        ];

        /*
        |--------------------------------------------------------------------------
        | Remove duplicate files
        |--------------------------------------------------------------------------
        */

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

    /*
    |--------------------------------------------------------------------------
    | Reset input so same file can be selected again
    |--------------------------------------------------------------------------
    */

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Upload selected multiple files
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Remove existing file
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Remove local file
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Render existing files
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Render upload section
  |--------------------------------------------------------------------------
  */

  const renderUpload = () => (
    <div className="space-y-3">

      {/* Upload area */}

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

      {/* Pending multiple files */}

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

            {/* Upload button */}

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
                  {localFiles.length !==
                  1
                    ? 's'
                    : ''}
                </>
              )}
            </Button>
          </div>
        )}
    </div>
  );

  /*
  |--------------------------------------------------------------------------
  | File / Image fields
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Checkbox
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Textarea
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Select / Dropdown
  |--------------------------------------------------------------------------
  */

  if (
    type === 'select' ||
    type === 'dropdown'
  ) {
    let options =
      field?.options;

    /*
    |--------------------------------------------------------------------------
    | Parse options
    |--------------------------------------------------------------------------
    */

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

  /*
  |--------------------------------------------------------------------------
  | Default input
  |--------------------------------------------------------------------------
  */

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