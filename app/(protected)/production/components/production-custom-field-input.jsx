
'use client';

import { useMemo, useRef, useState } from 'react';

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
import { Checkbox } from '@/components/ui/checkbox';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { apiFetch } from '@/lib/api';

const IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
];

const UPLOAD_API = '/api/task/upload';

// ======================================================
// TYPE HELPERS
// ======================================================

const normalizeType = (type) =>
    String(type || '')
        .trim()
        .toLowerCase()
        .replace(/[-\s]/g, '_');

const isImageField = (type) =>
    ['image', 'multi_image', 'multiimage'].includes(
        normalizeType(type)
    );

const isMultipleFileField = (type) =>
    [
        'multi_file',
        'multifile',
        'multi_image',
        'multiimage',
    ].includes(normalizeType(type));

const isFileField = (type) =>
    [
        'file',
        'image',
        'multi_file',
        'multifile',
        'multi_image',
        'multiimage',
    ].includes(normalizeType(type));

const isMultiSelectField = (type) =>
    [
        'multiselect',
        'multi_select',
        'multiple_select',
        'multiple',
    ].includes(normalizeType(type));

const isSelectField = (type) =>
    ['select', 'dropdown'].includes(normalizeType(type));

// ======================================================
// VALUE HELPERS
// ======================================================

const normalizeArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .filter((item) => item !== null && item !== undefined && item !== '')
            .map(String);
    }

    if (value === null || value === undefined || value === '') {
        return [];
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) return [];

        try {
            const parsed = JSON.parse(trimmed);

            if (Array.isArray(parsed)) {
                return parsed
                    .filter((item) => item !== null && item !== undefined && item !== '')
                    .map(String);
            }
        } catch {
            // Continue with comma-separated or single-value handling.
        }

        if (trimmed.startsWith('[')) {
            return [];
        }

        return trimmed
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [String(value)];
};

const normalizeOptions = (rawOptions) => {
    let options = rawOptions;

    if (typeof options === 'string') {
        const trimmed = options.trim();

        if (!trimmed) return [];

        try {
            options = JSON.parse(trimmed);
        } catch {
            options = trimmed
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }
    }

    if (!Array.isArray(options)) {
        if (options && typeof options === 'object') {
            options = Object.entries(options).map(([value, label]) => ({
                value,
                label: String(label),
            }));
        } else {
            return [];
        }
    }

    return options
        .map((option) => {
            if (
                typeof option === 'string' ||
                typeof option === 'number'
            ) {
                return {
                    value: String(option),
                    label: String(option),
                };
            }

            if (!option || typeof option !== 'object') {
                return null;
            }

            const value =
                option.value ??
                option.id ??
                option.key ??
                option.name ??
                option.label;

            const label =
                option.label ??
                option.name ??
                option.title ??
                option.value ??
                option.id;

            if (
                value === null ||
                value === undefined ||
                String(value) === ''
            ) {
                return null;
            }

            return {
                value: String(value),
                label: String(label ?? value),
            };
        })
        .filter(Boolean);
};

// ======================================================
// FILE HELPERS
// ======================================================

const getFileName = (url) => {
    try {
        return decodeURIComponent(
            String(url).split('/').pop()?.split('?')[0] || url
        );
    } catch {
        return String(url || '');
    }
};

const isImageUrl = (url) =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(
        String(url || '').split('?')[0]
    );

const getUploadedUrl = (item) => {
    if (typeof item === 'string') return item;

    return (
        item?.url ||
        item?.path ||
        item?.file ||
        item?.location ||
        ''
    );
};

// ======================================================
// COMPONENT
// ======================================================

export default function ProductionCustomFieldInput({
    field,
    value,
    onChange,
    disabled = false,
    uploadEndpoint = UPLOAD_API,
}) {
    const inputRef = useRef(null);

    const [uploading, setUploading] = useState(false);
    const [localFiles, setLocalFiles] = useState([]);

    const type = normalizeType(field?.type);

    const label =
        field?.label ||
        field?.name ||
        field?.slug ||
        'Custom Field';

    const multipleFiles = isMultipleFileField(type);
    const imageField = isImageField(type);

    const existingFiles = useMemo(() => {
        if (multipleFiles) return normalizeArray(value);

        return value ? [value] : [];
    }, [value, multipleFiles]);

    const options = useMemo(
        () => normalizeOptions(field?.options),
        [field?.options]
    );

    // ==================================================
    // UPLOAD FILES
    // ==================================================

    const uploadFiles = async (files) => {
        if (!files?.length) {
            toast.error('Please select at least one file.');
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();

            files.forEach((file) => {
                formData.append('files', file, file.name);
            });

            formData.append('fieldType', type);
            formData.append('fieldSlug', field?.slug || '');

            const response = await apiFetch(uploadEndpoint, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok || !result?.success) {
                throw new Error(
                    result?.message || 'File upload failed.'
                );
            }

            let uploaded = Array.isArray(result?.files)
                ? result.files
                : [];

            if (!uploaded.length && result?.file) {
                uploaded = [result.file];
            }

            uploaded = uploaded
                .map(getUploadedUrl)
                .filter(Boolean);

            if (!uploaded.length) {
                throw new Error(
                    'Upload completed, but no file URL was returned.'
                );
            }

            if (multipleFiles) {
                const current = normalizeArray(value);

                const merged = [...current, ...uploaded].filter(
                    (url, index, array) =>
                        array.indexOf(url) === index
                );

                onChange(merged);
            } else {
                onChange(uploaded[0]);
            }

            setLocalFiles([]);

            if (inputRef.current) {
                inputRef.current.value = '';
            }

            toast.success(
                `${uploaded.length} file(s) uploaded successfully.`
            );
        } catch (error) {
            console.error(
                'PRODUCTION CUSTOM FIELD UPLOAD ERROR:',
                error
            );

            toast.error(
                error?.message || 'Failed to upload files.'
            );
        } finally {
            setUploading(false);
        }
    };

    // ==================================================
    // SELECT FILES
    // ==================================================

    const handleFileChange = (event) => {
        const selected = Array.from(
            event.target.files || []
        );

        if (!selected.length) return;

        if (imageField) {
            const invalid = selected.find(
                (file) => !IMAGE_TYPES.includes(file.type)
            );

            if (invalid) {
                toast.error(
                    `${invalid.name} is not a valid image.`
                );

                event.target.value = '';
                return;
            }
        }

        if (!multipleFiles) {
            uploadFiles([selected[0]]);
            return;
        }

        setLocalFiles((previous) => {
            const combined = [...previous, ...selected];

            return combined.filter(
                (file, index, array) =>
                    index === array.findIndex(
                        (item) =>
                            item.name === file.name &&
                            item.size === file.size &&
                            item.lastModified === file.lastModified
                    )
            );
        });

        event.target.value = '';
    };

    // ==================================================
    // REMOVE FILES
    // ==================================================

    const removeExisting = (url) => {
        if (multipleFiles) {
            onChange(
                normalizeArray(value).filter(
                    (item) => item !== url
                )
            );
        } else {
            onChange('');
        }
    };

    const removeLocalFile = (index) => {
        setLocalFiles((previous) =>
            previous.filter((_, i) => i !== index)
        );
    };

    // ==================================================
    // FILE FIELD UI
    // ==================================================

    if (isFileField(type)) {
        return (
            <div className="space-y-4">
                <Label>
                    {label}

                    {field?.required && (
                        <span className="ml-1 text-destructive">*</span>
                    )}
                </Label>

                {existingFiles.length > 0 && (
                    <div className="space-y-2">
                        <Label>Uploaded Files</Label>

                        <div className="grid gap-3 md:grid-cols-2">
                            {existingFiles.map((url, index) => {
                                const image =
                                    imageField || isImageUrl(url);

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

                                                <span className="truncate text-sm">
                                                    {getFileName(url)}
                                                </span>
                                            </a>
                                        )}

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
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
                )}

                <div
                    className={`
                        flex min-h-28 flex-col items-center
                        justify-center rounded-lg border border-dashed
                        p-5 text-center transition
                        ${disabled || uploading
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-muted/50'
                        }
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

                    <p className="text-sm font-medium">
                        Click to upload
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        {multipleFiles
                            ? 'You can select multiple files'
                            : 'Select one file'}
                    </p>

                    <Input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        multiple={multipleFiles}
                        accept={imageField ? 'image/*' : undefined}
                        disabled={disabled || uploading}
                        onChange={handleFileChange}
                    />
                </div>

                {multipleFiles && localFiles.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Files Ready To Upload</Label>

                            <span className="text-xs text-muted-foreground">
                                {localFiles.length} file(s)
                            </span>
                        </div>

                        <div className="space-y-2">
                            {localFiles.map((file, index) => (
                                <div
                                    key={`${file.name}-${file.size}-${file.lastModified}`}
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
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
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
                            onClick={() => uploadFiles(localFiles)}
                            disabled={
                                uploading ||
                                disabled ||
                                !localFiles.length
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
                                    Upload {localFiles.length} File(s)
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    // ==================================================
    // CHECKBOX
    // ==================================================

    if (type === 'checkbox') {
        return (
            <div className="flex items-center gap-2">
                <Checkbox
                    checked={
                        value === true ||
                        value === 'true' ||
                        value === '1'
                    }
                    onCheckedChange={(checked) =>
                        onChange(checked === true)
                    }
                    disabled={disabled}
                />

                <Label>
                    {label}

                    {field?.required && (
                        <span className="ml-1 text-destructive">*</span>
                    )}
                </Label>
            </div>
        );
    }

    // ==================================================
    // TEXTAREA
    // ==================================================

    if (type === 'textarea') {
        return (
            <div className="space-y-2">
                <Label>
                    {label}

                    {field?.required && (
                        <span className="ml-1 text-destructive">*</span>
                    )}
                </Label>

                <Textarea
                    value={value ?? ''}
                    onChange={(event) => onChange(event.target.value)}
                    disabled={disabled}
                    placeholder={field?.placeholder || ''}
                />
            </div>
        );
    }

    // ==================================================
    // SELECT / DROPDOWN
    // ==================================================

    if (isSelectField(type)) {
        return (
            <div className="space-y-2">
                <Label>
                    {label}

                    {field?.required && (
                        <span className="ml-1 text-destructive">*</span>
                    )}
                </Label>

                <Select
                    value={
                        value === null || value === undefined
                            ? ''
                            : String(value)
                    }
                    onValueChange={(selectedValue) =>
                        onChange(selectedValue)
                    }
                    disabled={disabled}
                >
                    <SelectTrigger>
                        <SelectValue
                            placeholder={field?.placeholder || 'Select an option'}
                        />
                    </SelectTrigger>

                    <SelectContent>
                        {options.length > 0 ? (
                            options.map((option, index) => (
                                <SelectItem
                                    key={`${option.value}-${index}`}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                No options available.
                            </div>
                        )}
                    </SelectContent>
                </Select>
            </div>
        );
    }

    // ==================================================
    // MULTIPLE SELECT
    // ==================================================

    if (isMultiSelectField(type)) {
        const selected = normalizeArray(value);

        const toggleOption = (optionValue, checked) => {
            const nextValue = checked
                ? [...new Set([...selected, optionValue])]
                : selected.filter((item) => item !== optionValue);

            onChange(nextValue);
        };

        return (
            <div className="space-y-2">
                <Label>
                    {label}

                    {field?.required && (
                        <span className="ml-1 text-destructive">*</span>
                    )}
                </Label>

                <div className="space-y-2 rounded-md border p-3">
                    {options.length > 0 ? (
                        options.map((option, index) => (
                            <div
                                key={`${option.value}-${index}`}
                                className="flex items-center gap-2"
                            >
                                <Checkbox
                                    id={`${field?.slug || 'custom-field'}-${index}`}
                                    checked={selected.includes(option.value)}
                                    disabled={disabled}
                                    onCheckedChange={(checked) =>
                                        toggleOption(
                                            option.value,
                                            checked === true
                                        )
                                    }
                                />

                                <Label
                                    htmlFor={`${field?.slug || 'custom-field'}-${index}`}
                                    className="cursor-pointer font-normal"
                                >
                                    {option.label}
                                </Label>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No options available.
                        </p>
                    )}
                </div>

                {selected.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        {selected.length} option(s) selected
                    </p>
                )}
            </div>
        );
    }

    // ==================================================
    // DEFAULT INPUT
    // ==================================================

    return (
        <div className="space-y-2">
            <Label>
                {label}

                {field?.required && (
                    <span className="ml-1 text-destructive">*</span>
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
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                placeholder={field?.placeholder || ''}
            />
        </div>
    );
}
