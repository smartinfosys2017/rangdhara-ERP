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

import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

import TaskCustomFields from './task-custom-fields';

// =======================================================
// TOAST
// =======================================================

const showSuccessToast = (message) => {
  toast.custom(
    () => (
      <div className="min-w-[320px] max-w-[500px] rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <RiCheckboxCircleFill className="size-5 text-green-500" />
          <span className="text-sm font-medium">
            {message}
          </span>
        </div>
      </div>
    ),
    {
      position: 'top-center',
      duration: 4000,
    }
  );
};

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <div className="min-w-[320px] max-w-[500px] rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RiErrorWarningFill className="size-5 text-destructive" />

            <span className="text-sm font-medium">
              {message}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toast.dismiss(t)}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      </div>
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

const priorityOptions = [
  {
    value: '1',
    label: 'Low',
  },
  {
    value: '2',
    label: 'Medium',
  },
  {
    value: '3',
    label: 'High',
  },
  {
    value: '4',
    label: 'Urgent',
  },
];

const statusOptions = [
  {
    value: 'not_started',
    label: 'Not Started',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
  },
  {
    value: 'testing',
    label: 'Testing',
  },
  {
    value: 'awaiting_feedback',
    label: 'Awaiting Feedback',
  },
  {
    value: 'complete',
    label: 'Complete',
  },
];

const repeatOptions = [
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
];

// =======================================================
// HELPERS
// =======================================================

const formatDateForInput = (date) => {
  if (!date) {
    return '';
  }

  try {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();

    const month = String(
      parsed.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      parsed.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

// =======================================================
// COMPONENT
// =======================================================

export default function TaskEditDialog({
  open,
  closeDialog,
  onSuccess,
  task,
}) {
  const [loading, setLoading] =
    useState(false);

  const [customFields, setCustomFields] =
    useState({});

  const [form, setForm] = useState({
    name: '',
    description: '',

    isPublic: false,
    billable: true,
    visibleToClient: false,

    hourlyRate: '',

    startDate: '',
    dueDate: '',

    priority: '2',

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

    status: 'not_started',
  });

  // =====================================================
  // LOAD TASK
  // =====================================================

  useEffect(() => {
    if (!task) {
      return;
    }

    setForm({
      name: task.name || '',

      description:
        task.description || '',

      isPublic:
        Boolean(task.isPublic),

      billable:
        task.billable !== false,

      visibleToClient:
        Boolean(task.visibleToClient),

      hourlyRate:
        task.hourlyRate !== null &&
        task.hourlyRate !== undefined
          ? String(task.hourlyRate)
          : '',

      startDate:
        formatDateForInput(
          task.startDate
        ),

      dueDate:
        formatDateForInput(
          task.dueDate
        ),

      priority:
        task.priority !== undefined &&
        task.priority !== null
          ? String(task.priority)
          : '2',

      repeatEvery:
        task.repeatEvery || '',

      repeatEveryCustom:
        task.repeatEveryCustom !==
          null &&
        task.repeatEveryCustom !==
          undefined
          ? String(
              task.repeatEveryCustom
            )
          : '',

      repeatTypeCustom:
        task.repeatTypeCustom || '',

      cycles:
        task.cycles !== null &&
        task.cycles !== undefined
          ? String(task.cycles)
          : '',

      unlimitedCycles:
        task.unlimitedCycles !== false,

      relType:
        task.relType || '',

      relId:
        task.relId !== null &&
        task.relId !== undefined
          ? String(task.relId)
          : '',

      assignees:
        Array.isArray(task.assignees)
          ? task.assignees
          : [],

      followers:
        Array.isArray(task.followers)
          ? task.followers
          : [],

      tags:
        Array.isArray(task.tags)
          ? task.tags
          : [],

      status:
        task.status || 'not_started',
    });

    setCustomFields(
      task.customFields &&
        typeof task.customFields === 'object'
        ? task.customFields
        : {}
    );
  }, [task]);

  // =====================================================
  // UPDATE FIELD
  // =====================================================

  const update = (key) => (event) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  // =====================================================
  // UPDATE CHECKBOX
  // =====================================================

  const updateCheckbox =
    (key) => (checked) => {
      setForm((previous) => ({
        ...previous,
        [key]: Boolean(checked),
      }));
    };

  // =====================================================
  // UPDATE ARRAY FIELD
  // =====================================================

  const updateArray = (key) => (
    event
  ) => {
    const value = event.target.value;

    setForm((previous) => ({
      ...previous,
      [key]: value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      showErrorToast(
        'Task name is required.'
      );

      return;
    }

    if (!form.startDate) {
      showErrorToast(
        'Start date is required.'
      );

      return;
    }

    if (!task?.id) {
      showErrorToast(
        'Task ID is missing.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/task',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: task.id,

              name:
                form.name.trim(),

              description:
                form.description.trim() ||
                null,

              isPublic:
                form.isPublic,

              billable:
                form.billable,

              visibleToClient:
                form.visibleToClient,

              hourlyRate:
                form.hourlyRate
                  ? Number(
                      form.hourlyRate
                    )
                  : null,

              startDate:
                form.startDate,

              dueDate:
                form.dueDate || null,

              priority:
                Number(
                  form.priority
                ),

              repeatEvery:
                form.repeatEvery ||
                null,

              repeatEveryCustom:
                form.repeatEveryCustom
                  ? Number(
                      form.repeatEveryCustom
                    )
                  : null,

              repeatTypeCustom:
                form.repeatTypeCustom ||
                null,

              cycles:
                form.cycles
                  ? Number(
                      form.cycles
                    )
                  : null,

              unlimitedCycles:
                form.unlimitedCycles,

              relType:
                form.relType ||
                null,

              relId:
                form.relId
                  ? Number(
                      form.relId
                    )
                  : null,

              assignees:
                form.assignees,

              followers:
                form.followers,

              tags:
                form.tags,

              status:
                form.status,

              customFields:
                customFields || {},
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to update task.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Task updated successfully.'
      );

      onSuccess?.();

      closeDialog?.();
    } catch (error) {
      console.error(
        'UPDATE TASK ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update task.'
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
        if (!value && !loading) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Task
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
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
                Update the task details.
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
                  value={form.name}
                  onChange={update('name')}
                  disabled={loading}
                  placeholder="Task name"
                />
              </div>

              {/* DESCRIPTION */}

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Description
                </Label>

                <Textarea
                  value={form.description}
                  onChange={update(
                    'description'
                  )}
                  disabled={loading}
                  placeholder="Task description"
                  rows={5}
                />
              </div>

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
                  value={form.startDate}
                  onChange={update(
                    'startDate'
                  )}
                  disabled={loading}
                />
              </div>

              {/* DUE DATE */}

              <div className="space-y-2">
                <Label>
                  Due Date
                </Label>

                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={update(
                    'dueDate'
                  )}
                  disabled={loading}
                />
              </div>

              {/* PRIORITY */}

              <div className="space-y-2">
                <Label>
                  Priority
                </Label>

                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      priority: value,
                    }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {priorityOptions.map(
                      (item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* STATUS */}

              <div className="space-y-2">
                <Label>
                  Status
                </Label>

                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      status: value,
                    }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {statusOptions.map(
                      (item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* HOURLY RATE */}

              <div className="space-y-2">
                <Label>
                  Hourly Rate
                </Label>

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={
                    form.hourlyRate
                  }
                  onChange={update(
                    'hourlyRate'
                  )}
                  disabled={loading}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              OPTIONS
          ===================================================== */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">
                Task Options
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={
                    form.isPublic
                  }
                  onCheckedChange={updateCheckbox(
                    'isPublic'
                  )}
                  disabled={loading}
                />

                <span className="text-sm">
                  Public Task
                </span>
              </label>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={
                    form.billable
                  }
                  onCheckedChange={updateCheckbox(
                    'billable'
                  )}
                  disabled={loading}
                />

                <span className="text-sm">
                  Billable
                </span>
              </label>

              <label className="flex items-center gap-2">
                <Checkbox
                  checked={
                    form.visibleToClient
                  }
                  onCheckedChange={updateCheckbox(
                    'visibleToClient'
                  )}
                  disabled={loading}
                />

                <span className="text-sm">
                  Visible To Client
                </span>
              </label>
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

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label>
                  Repeat Every
                </Label>

                <Select
                  value={
                    form.repeatEvery
                  }
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      repeatEvery: value,
                    }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Does not repeat" />
                  </SelectTrigger>

                  <SelectContent>
                    {repeatOptions.map(
                      (item) => (
                        <SelectItem
                          key={item.value || 'none'}
                          value={
                            item.value ||
                            'none'
                          }
                        >
                          {item.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

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
                    loading ||
                    !form.repeatEvery
                  }
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Custom Type
                </Label>

                <Input
                  value={
                    form.repeatTypeCustom
                  }
                  onChange={update(
                    'repeatTypeCustom'
                  )}
                  disabled={
                    loading ||
                    !form.repeatEvery
                  }
                  placeholder="days / weeks / months"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Cycles
                </Label>

                <Input
                  type="number"
                  min="1"
                  value={form.cycles}
                  onChange={update(
                    'cycles'
                  )}
                  disabled={
                    loading ||
                    form.unlimitedCycles
                  }
                  placeholder="Number of cycles"
                />
              </div>

              <label className="flex items-center gap-2 pt-8">
                <Checkbox
                  checked={
                    form.unlimitedCycles
                  }
                  onCheckedChange={updateCheckbox(
                    'unlimitedCycles'
                  )}
                  disabled={loading}
                />

                <span className="text-sm">
                  Unlimited Cycles
                </span>
              </label>
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
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Relation Type
                </Label>

                <Input
                  value={form.relType}
                  onChange={update(
                    'relType'
                  )}
                  disabled={loading}
                  placeholder="customer / project / invoice"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Relation ID
                </Label>

                <Input
                  type="number"
                  value={form.relId}
                  onChange={update(
                    'relId'
                  )}
                  disabled={loading}
                  placeholder="Related record ID"
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              ASSIGNEES / FOLLOWERS / TAGS
          ===================================================== */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">
                Assignment
              </h3>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
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
                  onChange={updateArray(
                    'assignees'
                  )}
                  disabled={loading}
                  placeholder="1, 2, 3"
                />
              </div>

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
                  onChange={updateArray(
                    'followers'
                  )}
                  disabled={loading}
                  placeholder="1, 2, 3"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Tags
                </Label>

                <Input
                  value={
                    form.tags.join(', ')
                  }
                  onChange={updateArray(
                    'tags'
                  )}
                  disabled={loading}
                  placeholder="design, urgent"
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              CUSTOM FIELDS
          ===================================================== */}

          <div className="space-y-4">
            <TaskCustomFields
              taskId={task?.id}
              values={customFields}
              onChange={
                setCustomFields
              }
              disabled={loading}
            />
          </div>

          {/* =====================================================
              FOOTER
          ===================================================== */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}