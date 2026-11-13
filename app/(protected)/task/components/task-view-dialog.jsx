'use client';

import {
  useEffect,
  useState,
} from 'react';

import { formatDateTime } from '@/lib/helpers';
import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// =======================================================
// HELPERS
// =======================================================

function normalizeFieldType(type) {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]/g, '_');
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        return [parsed];
      }
    } catch {
      // Not JSON
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [value];
}

function getFileUrl(item) {
  if (!item) {
    return '';
  }

  if (typeof item === 'string') {
    return item;
  }

  return (
    item?.url ||
    item?.path ||
    item?.file ||
    ''
  );
}

function getFileName(item) {
  const url = getFileUrl(item);

  if (!url) {
    return '';
  }

  try {
    return decodeURIComponent(
      String(url)
        .split('/')
        .pop()
        ?.split('?')[0] || ''
    );
  } catch {
    return (
      String(url)
        .split('/')
        .pop()
        ?.split('?')[0] || ''
    );
  }
}

function isImageUrl(url) {
  if (!url) {
    return false;
  }

  const cleanUrl = String(url)
    .split('?')[0]
    .toLowerCase();

  return (
    cleanUrl.endsWith('.jpg') ||
    cleanUrl.endsWith('.jpeg') ||
    cleanUrl.endsWith('.png') ||
    cleanUrl.endsWith('.gif') ||
    cleanUrl.endsWith('.webp') ||
    cleanUrl.endsWith('.svg')
  );
}

function isPdfUrl(url) {
  if (!url) {
    return false;
  }

  return String(url)
    .split('?')[0]
    .toLowerCase()
    .endsWith('.pdf');
}

function isImageType(type) {
  const normalized =
    normalizeFieldType(type);

  return (
    normalized === 'image' ||
    normalized === 'multi_image'
  );
}

function isFileType(type) {
  const normalized =
    normalizeFieldType(type);

  return (
    normalized === 'file' ||
    normalized === 'multi_file'
  );
}

function isMultipleType(type) {
  const normalized =
    normalizeFieldType(type);

  return (
    normalized === 'multi_file' ||
    normalized === 'multi_image'
  );
}

function formatBoolean(value) {
  if (
    value === true ||
    value === 'true' ||
    value === 1 ||
    value === '1'
  ) {
    return 'Yes';
  }

  if (
    value === false ||
    value === 'false' ||
    value === 0 ||
    value === '0'
  ) {
    return 'No';
  }

  return '-';
}

function formatDecimal(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '-';
  }

  return String(value);
}

function formatArray(value) {
  const items = normalizeArray(value);

  if (!items.length) {
    return '-';
  }

  return items
    .map((item) => {
      if (
        typeof item === 'object' &&
        item !== null
      ) {
        return (
          item?.name ||
          item?.label ||
          item?.value ||
          getFileName(item) ||
          JSON.stringify(item)
        );
      }

      return String(item);
    })
    .join(', ');
}

// =======================================================
// FIELD LABEL
// =======================================================

function formatFieldLabel(slug) {
  if (!slug) {
    return 'Custom Field';
  }

  return String(slug)
    .replace(/[_-]+/g, ' ')
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase()
    );
}

// =======================================================
// INFO ITEM
// =======================================================

const InfoItem = ({
  label,
  value,
}) => {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="break-words text-sm font-medium text-foreground">
        {value || '-'}
      </div>
    </div>
  );
};

// =======================================================
// IMAGE PREVIEW
// =======================================================

const ImagePreview = ({
  item,
  fieldName,
  multiple = false,
}) => {
  const imageUrl = getFileUrl(item);

  if (!imageUrl) {
    return null;
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <img
        src={imageUrl}
        alt={fieldName || 'Image'}
        className={
          multiple
            ? 'h-24 w-24 rounded-md border object-cover'
            : 'h-32 w-32 rounded-md border object-cover'
        }
      />
    </a>
  );
};

// =======================================================
// FILE LINK
// =======================================================

const FileLink = ({
  item,
}) => {
  const fileUrl = getFileUrl(item);

  if (!fileUrl) {
    return null;
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 items-center gap-3 rounded-md border p-3 transition hover:bg-muted/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h8" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-primary">
          {getFileName(item) ||
            'View file'}
        </div>

        <div className="truncate text-xs text-muted-foreground">
          {fileUrl}
        </div>
      </div>
    </a>
  );
};

// =======================================================
// MULTIPLE IMAGE VIEW
// =======================================================

const MultipleImages = ({
  value,
  fieldName,
}) => {
  const images = normalizeArray(value);

  if (!images.length) {
    return (
      <span className="text-muted-foreground">
        -
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((item, index) => {
          const imageUrl =
            getFileUrl(item);

          if (!imageUrl) {
            return null;
          }

          return (
            <div
              key={`${imageUrl}-${index}`}
              className="overflow-hidden rounded-md border"
            >
              <ImagePreview
                item={item}
                fieldName={fieldName}
                multiple
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =======================================================
// MULTIPLE FILE VIEW
// =======================================================

const MultipleFiles = ({
  value,
}) => {
  const files = normalizeArray(value);

  if (!files.length) {
    return (
      <span className="text-muted-foreground">
        -
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((item, index) => {
        const fileUrl =
          getFileUrl(item);

        if (!fileUrl) {
          return null;
        }

        return (
          <FileLink
            key={`${fileUrl}-${index}`}
            item={item}
          />
        );
      })}
    </div>
  );
};

// =======================================================
// AUTO FILE / IMAGE VALUE
// =======================================================

const AutoFileValue = ({
  value,
  fieldName,
}) => {
  const items = normalizeArray(value);

  if (!items.length) {
    return (
      <span className="text-muted-foreground">
        -
      </span>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const url = getFileUrl(item);

        if (!url) {
          return null;
        }

        if (isImageUrl(url)) {
          return (
            <div
              key={`${url}-${index}`}
              className="space-y-2"
            >
              <ImagePreview
                item={item}
                fieldName={fieldName}
                multiple={
                  items.length > 1
                }
              />

              {items.length === 1 && (
                <div className="break-all text-xs text-muted-foreground">
                  {url}
                </div>
              )}
            </div>
          );
        }

        return (
          <FileLink
            key={`${url}-${index}`}
            item={item}
          />
        );
      })}
    </div>
  );
};

// =======================================================
// FORMAT CUSTOM FIELD VALUE
// =======================================================

const CustomFieldValue = ({
  field,
  value,
}) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return (
      <span className="text-muted-foreground">
        -
      </span>
    );
  }

  const type =
    normalizeFieldType(field?.type);

  // BOOLEAN
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // CHECKBOX
  if (type === 'checkbox') {
    return formatBoolean(value);
  }

  // IMAGE
  if (
    type === 'image' ||
    (
      !type &&
      isImageUrl(getFileUrl(value))
    )
  ) {
    return (
      <AutoFileValue
        value={value}
        fieldName={field?.name}
      />
    );
  }

  // FILE
  if (
    type === 'file' ||
    (
      !type &&
      isPdfUrl(getFileUrl(value))
    )
  ) {
    return (
      <AutoFileValue
        value={value}
        fieldName={field?.name}
      />
    );
  }

  // MULTI IMAGE
  if (type === 'multi_image') {
    return (
      <MultipleImages
        value={value}
        fieldName={field?.name}
      />
    );
  }

  // MULTI FILE
  if (type === 'multi_file') {
    return (
      <MultipleFiles
        value={value}
      />
    );
  }

  // ARRAY
  if (Array.isArray(value)) {
    const fileItems = value.filter(
      (item) =>
        isImageUrl(getFileUrl(item)) ||
        isPdfUrl(getFileUrl(item))
    );

    if (fileItems.length === value.length) {
      return (
        <AutoFileValue
          value={value}
          fieldName={field?.name}
        />
      );
    }

    return (
      <div className="space-y-1">
        {value.map((item, index) => {
          if (
            typeof item === 'object' &&
            item !== null
          ) {
            const url =
              getFileUrl(item);

            if (url) {
              return (
                <div
                  key={index}
                  className="break-all"
                >
                  {url}
                </div>
              );
            }
          }

          return (
            <div
              key={index}
              className="break-words"
            >
              {String(item)}
            </div>
          );
        })}
      </div>
    );
  }

  // OBJECT
  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const objectUrl =
      getFileUrl(value);

    if (objectUrl) {
      return (
        <AutoFileValue
          value={value}
          fieldName={field?.name}
        />
      );
    }

    try {
      return (
        <pre className="whitespace-pre-wrap break-words text-xs">
          {JSON.stringify(
            value,
            null,
            2
          )}
        </pre>
      );
    } catch {
      return '-';
    }
  }

  // STRING
  return String(value);
};

// =======================================================
// SECTION
// =======================================================

const Section = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {children}
      </div>
    </div>
  );
};

// =======================================================
// TASK VIEW DIALOG
// =======================================================

const TaskViewDialog = ({
  open,
  closeDialog,
  task,
}) => {
  const [loading, setLoading] =
    useState(false);

  const [taskData, setTaskData] =
    useState(task);

  // =====================================================
  // LOAD COMPLETE TASK
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const loadTask = async () => {
      if (
        !open ||
        !task?.id
      ) {
        return;
      }

      try {
        setLoading(true);

        const response =
          await apiFetch(
            `/api/task?id=${task.id}`
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              'Failed to load task.'
          );
        }

        if (!mounted) {
          return;
        }

        const data =
          Array.isArray(result.data)
            ? result.data.find(
                (item) =>
                  String(item?.id) ===
                  String(task.id)
              ) ||
              result.data[0]
            : result.data;

        setTaskData(
          data || task
        );
      } catch (error) {
        console.error(
          'TASK VIEW LOAD ERROR:',
          error
        );

        if (mounted) {
          setTaskData(task);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTask();

    return () => {
      mounted = false;
    };
  }, [
    open,
    task?.id,
  ]);

  if (!taskData) {
    return null;
  }

  // =====================================================
  // CUSTOM FIELDS
  // =====================================================

  const customFields =
    Array.isArray(
      taskData.custom_fields
    )
      ? taskData.custom_fields
      : Array.isArray(
          taskData.customFields
        )
      ? taskData.customFields
      : [];

  const customValues =
    taskData.custom_field_values &&
    typeof taskData.custom_field_values ===
      'object'
      ? taskData.custom_field_values
      : taskData.customFieldValues &&
        typeof taskData.customFieldValues ===
          'object'
      ? taskData.customFieldValues
      : {};

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1000px]">

        <DialogHeader>
          <DialogTitle>
            Task Details
          </DialogTitle>

          <DialogDescription>
            View task information.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Loading task details...
          </div>
        ) : (
          <div className="space-y-8 py-4">

            {/* ==================================================
                BASIC TASK INFORMATION
            ================================================== */}

            <Section
              title="Task Information"
              description="Basic task information."
            >
              <InfoItem
                label="Task ID"
                value={`#${taskData.id}`}
              />

              <InfoItem
                label="Name"
                value={
                  taskData.name ||
                  taskData.title
                }
              />

              <InfoItem
                label="Status"
                value={
                  taskData.status
                }
              />

              <InfoItem
                label="Priority"
                value={
                  taskData.priority
                }
              />

              <InfoItem
                label="Description"
                value={
                  taskData.description
                }
              />
            </Section>

            {/* ==================================================
                DATES
            ================================================== */}

            <Section
              title="Dates"
              description="Task start and due dates."
            >
              <InfoItem
                label="Start Date"
                value={
                  taskData.startDate
                    ? formatDateTime(
                        new Date(
                          taskData.startDate
                        )
                      )
                    : '-'
                }
              />

              <InfoItem
                label="Due Date"
                value={
                  taskData.dueDate
                    ? formatDateTime(
                        new Date(
                          taskData.dueDate
                        )
                      )
                    : '-'
                }
              />
            </Section>

            {/* ==================================================
                BILLING
            ================================================== */}

            <Section
              title="Billing"
              description="Task billing information."
            >
              <InfoItem
                label="Public"
                value={formatBoolean(
                  taskData.isPublic
                )}
              />

              <InfoItem
                label="Billable"
                value={formatBoolean(
                  taskData.billable
                )}
              />

              <InfoItem
                label="Visible To Client"
                value={formatBoolean(
                  taskData.visibleToClient
                )}
              />

              <InfoItem
                label="Hourly Rate"
                value={formatDecimal(
                  taskData.hourlyRate
                )}
              />
            </Section>

            {/* ==================================================
                REPEAT SETTINGS
            ================================================== */}

            <Section
              title="Repeat Settings"
              description="Task recurring configuration."
            >
              <InfoItem
                label="Repeat Every"
                value={
                  taskData.repeatEvery
                }
              />

              <InfoItem
                label="Repeat Interval"
                value={
                  taskData.repeatEveryCustom
                }
              />

              <InfoItem
                label="Repeat Type"
                value={
                  taskData.repeatTypeCustom
                }
              />

              <InfoItem
                label="Cycles"
                value={
                  taskData.cycles
                }
              />

              <InfoItem
                label="Unlimited Cycles"
                value={formatBoolean(
                  taskData.unlimitedCycles
                )}
              />
            </Section>

            {/* ==================================================
                RELATION
            ================================================== */}

            <Section
              title="Relation"
              description="Task relation information."
            >
              <InfoItem
                label="Relation Type"
                value={
                  taskData.relType
                }
              />

              <InfoItem
                label="Relation ID"
                value={
                  taskData.relId
                }
              />
            </Section>

            {/* ==================================================
                PEOPLE
            ================================================== */}

            <Section
              title="People"
              description="Task assignees and followers."
            >
              <InfoItem
                label="Assignees"
                value={formatArray(
                  taskData.assignees
                )}
              />

              <InfoItem
                label="Followers"
                value={formatArray(
                  taskData.followers
                )}
              />
            </Section>

            {/* ==================================================
                TAGS
            ================================================== */}

            <Section
              title="Tags"
              description="Task tags and attachments."
            >
              <InfoItem
                label="Tags"
                value={formatArray(
                  taskData.tags
                )}
              />

              <InfoItem
                label="Attachments"
                value={formatArray(
                  taskData.attachments
                )}
              />
            </Section>

            {/* ==================================================
                CUSTOM FIELDS
            ================================================== */}

            {customFields.length > 0 && (
              <Section
                title="Custom Fields"
                description="Additional customer information."
              >
                {customFields.map(
                  (field) => {
                    const value =
                      customValues?.[
                        field.slug
                      ];

                    const fieldType =
                      normalizeFieldType(
                        field?.type
                      );

                    const fullWidth =
                      fieldType ===
                        'textarea' ||
                      isFileType(
                        fieldType
                      ) ||
                      isImageType(
                        fieldType
                      ) ||
                      isMultipleType(
                        fieldType
                      );

                    return (
                      <div
                        key={
                          field.id
                        }
                        className={
                          fullWidth
                            ? 'md:col-span-2'
                            : ''
                        }
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {field.name}
                          </div>

                          <div className="text-sm font-medium text-foreground">
                            <CustomFieldValue
                              field={
                                field
                              }
                              value={
                                value
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </Section>
            )}

            {/* ==================================================
                RECORD INFORMATION
            ================================================== */}

            <Section
              title="Record Information"
              description="Task record timestamps."
            >
              <InfoItem
                label="Created At"
                value={
                  taskData.createdAt
                    ? formatDateTime(
                        new Date(
                          taskData.createdAt
                        )
                      )
                    : '-'
                }
              />

              <InfoItem
                label="Updated At"
                value={
                  taskData.updatedAt
                    ? formatDateTime(
                        new Date(
                          taskData.updatedAt
                        )
                      )
                    : '-'
                }
              />
            </Section>

          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
          >
            Close
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default TaskViewDialog;