'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  LoaderCircle,
} from 'lucide-react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import {
  toast,
} from 'sonner';

import {
  apiFetch,
} from '@/lib/api';

import {
  Button,
} from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Input,
} from '@/components/ui/input';

import {
  Label,
} from '@/components/ui/label';

import {
  Textarea,
} from '@/components/ui/textarea';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import TaskCustomFields from './task-custom-fields';

// =======================================================
// TOAST
// =======================================================

const showSuccessToast = (
  message
) => {
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

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 4000,
    }
  );
};

const showErrorToast = (
  message
) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() =>
          toast.dismiss(t)
        }
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
};

// =======================================================
// OPTIONS
// =======================================================

const priorities = [
  {
    value: 1,
    label: 'High',
  },
  {
    value: 2,
    label: 'Medium',
  },
  {
    value: 3,
    label: 'Low',
  },
];

const statuses = [
  {
    value: 'not_started',
    label: 'Not Started',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
  },
  {
    value: 'completed',
    label: 'Completed',
  },
  {
    value: 'on_hold',
    label: 'On Hold',
  },
];

const repeatTypes = [
  {
    value: '',
    label: 'Does not repeat',
  },
  {
    value: 'daily',
    label: 'Daily',
  },
  {
    value: 'weekly',
    label: 'Weekly',
  },
  {
    value: 'monthly',
    label: 'Monthly',
  },
  {
    value: 'yearly',
    label: 'Yearly',
  },
  {
    value: 'custom',
    label: 'Custom',
  },
];

// =======================================================
// TASK ADD DIALOG
// =======================================================

export default function TaskAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  // =====================================================
  // LOADING
  // =====================================================

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    customFieldsLoading,
    setCustomFieldsLoading,
  ] = useState(false);

  // =====================================================
  // CUSTOM FIELD DEFINITIONS
  // =====================================================

  const [
    customFieldDefinitions,
    setCustomFieldDefinitions,
  ] = useState([]);

  // =====================================================
  // CUSTOM FIELD VALUES
  // =====================================================

  const [
    customFields,
    setCustomFields,
  ] = useState({});

  // =====================================================
  // TASK FORM
  // =====================================================

  const [
    form,
    setForm,
  ] = useState({
    name: '',
    description: '',

    isPublic: false,
    billable: true,
    visibleToClient: false,

    hourlyRate: '',

    startDate: '',
    dueDate: '',

    priority: 2,

    repeatEvery: '',
    repeatEveryCustom: '',
    repeatTypeCustom: '',

    cycles: '',
    unlimitedCycles: true,

    relType: '',
    relId: '',

    assignees: [],
    followers: [],

    tags: [],
    attachments: [],

    status: 'not_started',
  });

  // =====================================================
  // LOAD CUSTOM FIELDS
  // =====================================================

  const loadCustomFields = async () => {
    try {
      setCustomFieldsLoading(true);

      const response =
        await apiFetch(
          '/api/custom_fields?fieldto=tasks',
          {
            method: 'GET',
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to load custom fields.'
        );
      }

      const fields =
        Array.isArray(result.data)
          ? result.data
          : [];

      setCustomFieldDefinitions(
        fields
      );

      // -----------------------------------------------
      // DEFAULT VALUES
      // -----------------------------------------------

      const defaultValues = {};

      fields.forEach(
        (field) => {
          if (!field?.slug) {
            return;
          }

          // File

          if (
            field.type === 'file' ||
            field.type === 'image'
          ) {
            defaultValues[
              field.slug
            ] = '';

            return;
          }

          // Multi file / Multi image

          if (
            field.type === 'multifile' ||
            field.type === 'multiimage'
          ) {
            defaultValues[
              field.slug
            ] = [];

            return;
          }

          // Checkbox

          if (
            field.type === 'checkbox'
          ) {
            defaultValues[
              field.slug
            ] =
              field.defaultValue ===
                'true' ||
              field.defaultValue ===
                '1';

            return;
          }

          // Multiselect

          if (
            field.type === 'multiselect'
          ) {
            if (
              field.defaultValue
            ) {
              if (
                typeof field.defaultValue ===
                  'string' &&
                field.defaultValue.startsWith(
                  '['
                )
              ) {
                try {
                  const parsed =
                    JSON.parse(
                      field.defaultValue
                    );

                  if (
                    Array.isArray(
                      parsed
                    )
                  ) {
                    defaultValues[
                      field.slug
                    ] = parsed;

                    return;
                  }
                } catch {
                  // Continue below
                }
              }

              defaultValues[
                field.slug
              ] =
                String(
                  field.defaultValue
                )
                  .split(',')
                  .map(
                    (item) =>
                      item.trim()
                  )
                  .filter(Boolean);

              return;
            }

            defaultValues[
              field.slug
            ] = [];

            return;
          }

          // Normal field

          defaultValues[
            field.slug
          ] =
            field.defaultValue ??
            '';
        }
      );

      setCustomFields(
        defaultValues
      );
    } catch (error) {
      console.error(
        'LOAD TASK CUSTOM FIELDS ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to load custom fields.'
      );

      setCustomFieldDefinitions(
        []
      );
    } finally {
      setCustomFieldsLoading(
        false
      );
    }
  };

  // =====================================================
  // LOAD FIELDS WHEN DIALOG OPENS
  // =====================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    loadCustomFields();
  }, [open]);

  // =====================================================
  // UPDATE NORMAL FIELD
  // =====================================================

  const update =
    (key) =>
    (event) => {
      setForm(
        (previous) => ({
          ...previous,

          [key]:
            event.target.value,
        })
      );
    };

  // =====================================================
  // UPDATE CHECKBOX
  // =====================================================

  const updateCheckbox =
    (key) =>
    (event) => {
      setForm(
        (previous) => ({
          ...previous,

          [key]:
            event.target.checked,
        })
      );
    };

  // =====================================================
  // TAGS
  // =====================================================

  const updateTags = (
    event
  ) => {
    const value =
      event.target.value;

    setForm(
      (previous) => ({
        ...previous,

        tags: value
          .split(',')
          .map(
            (tag) =>
              tag.trim()
          )
          .filter(Boolean),
      })
    );
  };

  // =====================================================
  // ASSIGNEES
  // =====================================================

  const updateAssignees = (
    event
  ) => {
    const value =
      event.target.value;

    setForm(
      (previous) => ({
        ...previous,

        assignees: value
          .split(',')
          .map(
            (id) =>
              Number(id.trim())
          )
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          ),
      })
    );
  };

  // =====================================================
  // FOLLOWERS
  // =====================================================

  const updateFollowers = (
    event
  ) => {
    const value =
      event.target.value;

    setForm(
      (previous) => ({
        ...previous,

        followers: value
          .split(',')
          .map(
            (id) =>
              Number(id.trim())
          )
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          ),
      })
    );
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (
        !form.name.trim()
      ) {
        showErrorToast(
          'Task name is required.'
        );

        return;
      }

      if (
        !form.startDate
      ) {
        showErrorToast(
          'Start date is required.'
        );

        return;
      }

      if (
        form.dueDate &&
        form.startDate &&
        form.dueDate <
          form.startDate
      ) {
        showErrorToast(
          'Due date cannot be before start date.'
        );

        return;
      }

      try {
        setLoading(true);

        // ---------------------------------------------
        // PAYLOAD
        // ---------------------------------------------

        const payload = {
          name:
            form.name.trim(),

          description:
            form.description.trim() ||
            null,

          isPublic:
            Boolean(
              form.isPublic
            ),

          billable:
            Boolean(
              form.billable
            ),

          visibleToClient:
            Boolean(
              form.visibleToClient
            ),

          hourlyRate:
            form.hourlyRate !== ''
              ? Number(
                  form.hourlyRate
                )
              : null,

          startDate:
            form.startDate,

          dueDate:
            form.dueDate ||
            null,

          priority:
            Number(
              form.priority
            ),

          repeatEvery:
            form.repeatEvery ||
            null,

          repeatEveryCustom:
            form.repeatEveryCustom !==
            ''
              ? Number(
                  form.repeatEveryCustom
                )
              : null,

          repeatTypeCustom:
            form.repeatTypeCustom ||
            null,

          cycles:
            form.cycles !== ''
              ? Number(
                  form.cycles
                )
              : null,

          unlimitedCycles:
            Boolean(
              form.unlimitedCycles
            ),

          relType:
            form.relType ||
            null,

          relId:
            form.relId !== ''
              ? Number(
                  form.relId
                )
              : null,

          assignees:
            Array.isArray(
              form.assignees
            )
              ? form.assignees
              : [],

          followers:
            Array.isArray(
              form.followers
            )
              ? form.followers
              : [],

          tags:
            Array.isArray(
              form.tags
            )
              ? form.tags
              : [],

          attachments:
            Array.isArray(
              form.attachments
            )
              ? form.attachments
              : [],

          status:
            form.status ||
            'not_started',

          customFields:
            customFields || {},
        };

        // ---------------------------------------------
        // CREATE TASK
        // ---------------------------------------------

        const response =
          await apiFetch(
            '/api/task',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const result =
          await response.json();

        // ---------------------------------------------
        // ERROR
        // ---------------------------------------------

        if (
          !response.ok ||
          !result?.success
        ) {
          throw new Error(
            result?.message ||
              'Failed to create task.'
          );
        }

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        showSuccessToast(
          'Task created successfully.'
        );

        // ---------------------------------------------
        // RESET
        // ---------------------------------------------

        setForm({
          name: '',
          description: '',

          isPublic: false,
          billable: true,
          visibleToClient: false,

          hourlyRate: '',

          startDate: '',
          dueDate: '',

          priority: 2,

          repeatEvery: '',
          repeatEveryCustom: '',
          repeatTypeCustom: '',

          cycles: '',
          unlimitedCycles: true,

          relType: '',
          relId: '',

          assignees: [],
          followers: [],

          tags: [],
          attachments: [],

          status: 'not_started',
        });

        setCustomFields({});

        onSuccess?.();
      } catch (error) {
        console.error(
          'CREATE TASK ERROR:',
          error
        );

        showErrorToast(
          error?.message ||
            'Failed to create task.'
        );
      } finally {
        setLoading(false);
      }
    };

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
      <DialogContent
        className="
          max-h-[90vh]
          max-w-5xl
          overflow-y-auto
        "
      >
        <DialogHeader>
          <DialogTitle>
            Add Task
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-8"
        >

          {/* =====================================================
              TASK INFORMATION
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Task Information
              </h3>

              <p className="text-sm text-muted-foreground">
                Enter the basic task information.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* NAME */}

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Task Name
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  value={
                    form.name
                  }
                  onChange={update(
                    'name'
                  )}
                  disabled={
                    loading
                  }
                  placeholder="Task name"
                />
              </div>

              {/* DESCRIPTION */}

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Description
                </Label>

                <Textarea
                  value={
                    form.description
                  }
                  onChange={update(
                    'description'
                  )}
                  disabled={
                    loading
                  }
                  placeholder="Task description"
                  rows={5}
                />
              </div>

              {/* STATUS */}

              <div className="space-y-2">
                <Label>
                  Status
                </Label>

                <select
                  value={
                    form.status
                  }
                  onChange={update(
                    'status'
                  )}
                  disabled={
                    loading
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {statuses.map(
                    (status) => (
                      <option
                        key={
                          status.value
                        }
                        value={
                          status.value
                        }
                      >
                        {
                          status.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* PRIORITY */}

              <div className="space-y-2">
                <Label>
                  Priority
                </Label>

                <select
                  value={
                    form.priority
                  }
                  onChange={(event) =>
                    setForm(
                      (
                        previous
                      ) => ({
                        ...previous,
                        priority:
                          Number(
                            event
                              .target
                              .value
                          ),
                      })
                    )
                  }
                  disabled={
                    loading
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {priorities.map(
                    (priority) => (
                      <option
                        key={
                          priority.value
                        }
                        value={
                          priority.value
                        }
                      >
                        {
                          priority.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

            </div>
          </div>

          {/* =====================================================
              TASK OPTIONS
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Task Options
              </h3>

              <p className="text-sm text-muted-foreground">
                Configure task visibility and billing.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">

              {/* PUBLIC */}

              <label className="flex items-center gap-3 rounded-md border p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    form.isPublic
                  }
                  onChange={updateCheckbox(
                    'isPublic'
                  )}
                  disabled={
                    loading
                  }
                  className="h-4 w-4"
                />

                <div>
                  <div className="text-sm font-medium">
                    Public Task
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Make this task public.
                  </div>
                </div>
              </label>

              {/* BILLABLE */}

              <label className="flex items-center gap-3 rounded-md border p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    form.billable
                  }
                  onChange={updateCheckbox(
                    'billable'
                  )}
                  disabled={
                    loading
                  }
                  className="h-4 w-4"
                />

                <div>
                  <div className="text-sm font-medium">
                    Billable
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Mark this task as billable.
                  </div>
                </div>
              </label>

              {/* CLIENT */}

              <label className="flex items-center gap-3 rounded-md border p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    form.visibleToClient
                  }
                  onChange={updateCheckbox(
                    'visibleToClient'
                  )}
                  disabled={
                    loading
                  }
                  className="h-4 w-4"
                />

                <div>
                  <div className="text-sm font-medium">
                    Visible To Client
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Show task to the client.
                  </div>
                </div>
              </label>

            </div>
          </div>

          {/* =====================================================
              DATE & BILLING
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Dates & Billing
              </h3>

              <p className="text-sm text-muted-foreground">
                Set task dates and hourly billing rate.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">

              {/* START DATE */}

              <div className="space-y-2">
                <Label>
                  Start Date
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  type="date"
                  value={
                    form.startDate
                  }
                  onChange={update(
                    'startDate'
                  )}
                  disabled={
                    loading
                  }
                />
              </div>

              {/* DUE DATE */}

              <div className="space-y-2">
                <Label>
                  Due Date
                </Label>

                <Input
                  type="date"
                  value={
                    form.dueDate
                  }
                  onChange={update(
                    'dueDate'
                  )}
                  disabled={
                    loading
                  }
                />
              </div>

              {/* HOURLY RATE */}

              <div className="space-y-2">
                <Label>
                  Hourly Rate
                </Label>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.hourlyRate
                  }
                  onChange={update(
                    'hourlyRate'
                  )}
                  disabled={
                    loading
                  }
                  placeholder="0.00"
                />
              </div>

            </div>
          </div>

          {/* =====================================================
              REPEAT
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Repeat
              </h3>

              <p className="text-sm text-muted-foreground">
                Configure recurring task settings.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* REPEAT EVERY */}

              <div className="space-y-2">
                <Label>
                  Repeat
                </Label>

                <select
                  value={
                    form.repeatEvery
                  }
                  onChange={update(
                    'repeatEvery'
                  )}
                  disabled={
                    loading
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {repeatTypes.map(
                    (repeat) => (
                      <option
                        key={
                          repeat.value
                        }
                        value={
                          repeat.value
                        }
                      >
                        {
                          repeat.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* CUSTOM TYPE */}

              {form.repeatEvery ===
                'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>
                      Custom Interval
                    </Label>

                    <Input
                      type="number"
                      min="1"
                      value={
                        form.repeatEveryCustom
                      }
                      onChange={update(
                        'repeatEveryCustom'
                      )}
                      disabled={
                        loading
                      }
                      placeholder="Enter interval"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Custom Type
                    </Label>

                    <select
                      value={
                        form.repeatTypeCustom
                      }
                      onChange={update(
                        'repeatTypeCustom'
                      )}
                      disabled={
                        loading
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">
                        Select Type
                      </option>

                      <option value="days">
                        Days
                      </option>

                      <option value="weeks">
                        Weeks
                      </option>

                      <option value="months">
                        Months
                      </option>

                      <option value="years">
                        Years
                      </option>
                    </select>
                  </div>
                </>
              )}

              {/* UNLIMITED */}

              <label className="flex items-center gap-3 rounded-md border p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    form.unlimitedCycles
                  }
                  onChange={updateCheckbox(
                    'unlimitedCycles'
                  )}
                  disabled={
                    loading
                  }
                  className="h-4 w-4"
                />

                <span className="text-sm font-medium">
                  Unlimited Cycles
                </span>
              </label>

              {/* CYCLES */}

              {!form.unlimitedCycles && (
                <div className="space-y-2">
                  <Label>
                    Cycles
                  </Label>

                  <Input
                    type="number"
                    min="1"
                    value={
                      form.cycles
                    }
                    onChange={update(
                      'cycles'
                    )}
                    disabled={
                      loading
                    }
                    placeholder="Number of cycles"
                  />
                </div>
              )}

            </div>
          </div>

          {/* =====================================================
              RELATION
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Related To
              </h3>

              <p className="text-sm text-muted-foreground">
                Optionally link this task to another record.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* REL TYPE */}

              <div className="space-y-2">
                <Label>
                  Relation Type
                </Label>

                <Input
                  value={
                    form.relType
                  }
                  onChange={update(
                    'relType'
                  )}
                  disabled={
                    loading
                  }
                  placeholder="customer, project, lead..."
                />
              </div>

              {/* REL ID */}

              <div className="space-y-2">
                <Label>
                  Relation ID
                </Label>

                <Input
                  type="number"
                  min="1"
                  value={
                    form.relId
                  }
                  onChange={update(
                    'relId'
                  )}
                  disabled={
                    loading
                  }
                  placeholder="Record ID"
                />
              </div>

            </div>
          </div>

          {/* =====================================================
              ASSIGNEES / FOLLOWERS
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Users
              </h3>

              <p className="text-sm text-muted-foreground">
                Enter user IDs separated by commas.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* ASSIGNEES */}

              <div className="space-y-2">
                <Label>
                  Assignees
                </Label>

                <Input
                  value={
                    form.assignees.join(
                      ', '
                    )
                  }
                  onChange={
                    updateAssignees
                  }
                  disabled={
                    loading
                  }
                  placeholder="1, 2, 3"
                />
              </div>

              {/* FOLLOWERS */}

              <div className="space-y-2">
                <Label>
                  Followers
                </Label>

                <Input
                  value={
                    form.followers.join(
                      ', '
                    )
                  }
                  onChange={
                    updateFollowers
                  }
                  disabled={
                    loading
                  }
                  placeholder="1, 2, 3"
                />
              </div>

            </div>
          </div>

          {/* =====================================================
              TAGS
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Tags
              </h3>

              <p className="text-sm text-muted-foreground">
                Enter tags separated by commas.
              </p>
            </div>

            <Input
              value={
                form.tags.join(
                  ', '
                )
              }
              onChange={
                updateTags
              }
              disabled={
                loading
              }
              placeholder="frontend, urgent, website"
            />

          </div>

          {/* =====================================================
              CUSTOM FIELDS
          ===================================================== */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                Custom Fields
              </h3>

              <p className="text-sm text-muted-foreground">
                Additional task information.
              </p>
            </div>

            {customFieldsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />

                Loading custom fields...
              </div>
            ) : (
              <TaskCustomFields
                fields={
                  customFieldDefinitions
                }
                values={
                  customFields
                }
                onChange={
                  setCustomFields
                }
                disabled={
                  loading
                }
              />
            )}

          </div>

          {/* =====================================================
              FOOTER
          ===================================================== */}

          <DialogFooter>

            <Button
              type="button"
              variant="outline"
              onClick={
                closeDialog
              }
              disabled={
                loading
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                loading ||
                customFieldsLoading
              }
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Task'
              )}
            </Button>

          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
}