'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  Label,
} from '@/components/ui/label';

import {
  Input,
} from '@/components/ui/input';

import {
  Button,
} from '@/components/ui/button';

import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import {
  LoaderCircleIcon,
} from 'lucide-react';

import {
  toast,
} from 'sonner';

/*
|--------------------------------------------------------------------------
| DEFAULT SETTINGS
|--------------------------------------------------------------------------
*/

const INITIAL_SETTINGS = {
  tasks_kanban_limit: '50',

  show_all_tasks_for_project_member: '1',

  client_staff_add_edit_delete_task_comments_first_hour:
    '0',

  new_task_auto_assign_current_member:
    '1',

  new_task_auto_follower_current_member:
    '0',

  auto_stop_tasks_timers_on_new_timer:
    '1',

  timer_started_change_status_in_progress:
    '1',

  task_biillable_checked_on_creation:
    '1',

  round_off_task_timer_option:
    '0',

  round_off_task_timer_time:
    '5',

  default_task_status:
    'auto',

  default_task_priority:
    '2',

  task_modal_class:
    'modal-lg',
};

 /*
   * =========================================================
   * SUCCESS TOAST
   * =========================================================
   */

  const showSuccessToast = (message) => {
    toast.custom(
      () => (
        <Alert variant="mono" icon="success">
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>

          <AlertTitle>
            {message}
          </AlertTitle>
        </Alert>
      ),
      {
        position: 'top-center',
      }
    );
  };

  /*
   * =========================================================
   * ERROR TOAST
   * =========================================================
   */

  const showErrorToast = (message) => {
    toast.custom(
      (t) => (
        <Alert
          variant="mono"
          icon="destructive"
          close={true}
          onClose={() => {
            toast.dismiss(t);
          }}
        >
          <AlertIcon>
            <RiErrorWarningFill />
          </AlertIcon>

          <AlertTitle>
            {message}
          </AlertTitle>
        </Alert>
      ),
      {
        position: 'top-center',
      }
    );
  };
/*
|--------------------------------------------------------------------------
| YES / NO FIELD
|--------------------------------------------------------------------------
*/

function YesNoField({
  label,
  value,
  onChange,
}) {
  const fieldId = label
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      '-'
    );

  return (
    <div className="py-5 border-b last:border-b-0">
      <Label className="block mb-3">
        {label}
      </Label>

      <RadioGroup
        value={String(value ?? '0')}
        onValueChange={onChange}
        className="flex items-center gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem
            value="1"
            id={`${fieldId}-yes`}
          />

          <Label
            htmlFor={`${fieldId}-yes`}
            className="font-normal cursor-pointer"
          >
            Yes
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <RadioGroupItem
            value="0"
            id={`${fieldId}-no`}
          />

          <Label
            htmlFor={`${fieldId}-no`}
            className="font-normal cursor-pointer"
          >
            No
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function TaskSettingsPage() {
  /*
  |--------------------------------------------------------------------------
  | SETTINGS
  |--------------------------------------------------------------------------
  */

  const [
    settings,
    setSettings,
  ] = useState(
    INITIAL_SETTINGS
  );

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  const [
    loading,
    setLoading,
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | SAVING
  |--------------------------------------------------------------------------
  */

  const [
    saving,
    setSaving,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | LOAD SETTINGS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadSettings();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | GET SETTINGS
  |--------------------------------------------------------------------------
  */

  async function loadSettings() {
    try {
      setLoading(true);

      const response =
        await fetch(
          '/api/settings/configure-features/task',
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
          'Failed to load task settings'
        );
      }

      const data =
        result.data || {};

      setSettings({
        ...INITIAL_SETTINGS,
        ...data,

        tasks_kanban_limit:
          data.tasks_kanban_limit ??
          INITIAL_SETTINGS.tasks_kanban_limit,

        show_all_tasks_for_project_member:
          data.show_all_tasks_for_project_member ??
          INITIAL_SETTINGS.show_all_tasks_for_project_member,

        client_staff_add_edit_delete_task_comments_first_hour:
          data.client_staff_add_edit_delete_task_comments_first_hour ??
          INITIAL_SETTINGS.client_staff_add_edit_delete_task_comments_first_hour,

        new_task_auto_assign_current_member:
          data.new_task_auto_assign_current_member ??
          INITIAL_SETTINGS.new_task_auto_assign_current_member,

        new_task_auto_follower_current_member:
          data.new_task_auto_follower_current_member ??
          INITIAL_SETTINGS.new_task_auto_follower_current_member,

        auto_stop_tasks_timers_on_new_timer:
          data.auto_stop_tasks_timers_on_new_timer ??
          INITIAL_SETTINGS.auto_stop_tasks_timers_on_new_timer,

        timer_started_change_status_in_progress:
          data.timer_started_change_status_in_progress ??
          INITIAL_SETTINGS.timer_started_change_status_in_progress,

        task_biillable_checked_on_creation:
          data.task_biillable_checked_on_creation ??
          INITIAL_SETTINGS.task_biillable_checked_on_creation,

        round_off_task_timer_option:
          data.round_off_task_timer_option ??
          INITIAL_SETTINGS.round_off_task_timer_option,

        round_off_task_timer_time:
          data.round_off_task_timer_time ??
          INITIAL_SETTINGS.round_off_task_timer_time,

        default_task_status:
          data.default_task_status ??
          INITIAL_SETTINGS.default_task_status,

        default_task_priority:
          data.default_task_priority ??
          INITIAL_SETTINGS.default_task_priority,

        task_modal_class:
          data.task_modal_class ??
          INITIAL_SETTINGS.task_modal_class,
      });

    } catch (error) {
      console.error(
        'Task settings loading error:',
        error
      );

      showErrorToast(
        error.message ||
        'Failed to load task settings'
      );

    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE SETTING
  |--------------------------------------------------------------------------
  */

  function updateSetting(
    key,
    value
  ) {
    setSettings(
      (previous) => ({
        ...previous,
        [key]: value,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SAVE SETTINGS
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      /*
      |--------------------------------------------------------------------------
      | FORM DATA
      |--------------------------------------------------------------------------
      */

      const formData =
        new FormData();

      Object.entries(
        settings
      ).forEach(
        ([key, value]) => {
          formData.append(
            key,
            String(
              value ?? ''
            )
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | DEBUG
      |--------------------------------------------------------------------------
      */

      console.log(
        'Task settings:',
        settings
      );

      /*
      |--------------------------------------------------------------------------
      | API REQUEST
      |--------------------------------------------------------------------------
      */

      const response =
        await fetch(
          '/api/settings/configure-features/task',
          {
            method: 'POST',

            /*
            IMPORTANT:
            Do NOT set Content-Type manually.
            Browser automatically handles multipart boundary.
            */

            body: formData,
          }
        );

      const result =
        await response.json();

      console.log(
        'Task settings API:',
        result
      );

      /*
      |--------------------------------------------------------------------------
      | ERROR
      |--------------------------------------------------------------------------
      */

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
          'Failed to save task settings'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SUCCESS
      |--------------------------------------------------------------------------
      */

      showSuccessToast(
        result.message ||
        'Task settings saved successfully.'
      );

      /*
      |--------------------------------------------------------------------------
      | RELOAD SETTINGS
      |--------------------------------------------------------------------------
      */

      await loadSettings();

    } catch (error) {
      console.error(
        'Task settings save error:',
        error
      );

      showErrorToast(
        error.message ||
        'Failed to save task settings'
      );

    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING SCREEN
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircleIcon className="size-5 animate-spin" />

          <p>
            Loading task settings...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
    <div className="space-y-6 lg:max-w-[1024px] mx-auto">  
      {/*
      |--------------------------------------------------------------------------
      | TASK SETTINGS
      |--------------------------------------------------------------------------
      */}

      <Card>
       <CardHeader className="border-b border-border">
          <CardTitle>
            Task Settings
          </CardTitle>
        </CardHeader>

        <CardContent className="py-12">
        
          {/*
          |--------------------------------------------------------------------------
          | KANBAN LIMIT
          |--------------------------------------------------------------------------
          */}

          <div className="py-5 border-b">
            <Label
              htmlFor="tasks_kanban_limit"
              className="block mb-3"
            >
              Limit tasks kanban rows per status
            </Label>

            <Input
              id="tasks_kanban_limit"
              type="number"
              min="1"
              value={
                settings.tasks_kanban_limit
              }
              onChange={(event) =>
                updateSetting(
                  'tasks_kanban_limit',
                  event.target.value
                )
              }
            />

            <p className="mt-2 text-sm text-muted-foreground">
              Set the maximum number of tasks displayed
              per status column in the Kanban view.
            </p>
          </div>

          {/*
          |--------------------------------------------------------------------------
          | ALL TASKS
          |--------------------------------------------------------------------------
          */}

          <YesNoField
            label="Allow all staff to see all tasks related to projects (includes non-staff)"
            value={
              settings.show_all_tasks_for_project_member
            }
            onChange={(value) =>
              updateSetting(
                'show_all_tasks_for_project_member',
                value
              )
            }
          />

          {/*
          |--------------------------------------------------------------------------
          | COMMENTS FIRST HOUR
          |--------------------------------------------------------------------------
          */}

          <YesNoField
            label="Allow customer/staff to add/edit task comments only in the first hour (administrators not applied)"
            value={
              settings.client_staff_add_edit_delete_task_comments_first_hour
            }
            onChange={(value) =>
              updateSetting(
                'client_staff_add_edit_delete_task_comments_first_hour',
                value
              )
            }
          />

          {/*
          |--------------------------------------------------------------------------
          | AUTO ASSIGN
          |--------------------------------------------------------------------------
          */}

          <YesNoField
            label="Auto assign task creator when new task is created"
            value={
              settings.new_task_auto_assign_current_member
            }
            onChange={(value) =>
              updateSetting(
                'new_task_auto_assign_current_member',
                value
              )
            }
          />

          {/*
          |--------------------------------------------------------------------------
          | AUTO FOLLOWER
          |--------------------------------------------------------------------------
          */}

          <YesNoField
            label="Auto add task creator as task follower when new task is created"
            value={
              settings.new_task_auto_follower_current_member
            }
            onChange={(value) =>
              updateSetting(
                'new_task_auto_follower_current_member',
                value
              )
            }
          />

          {/*
          |--------------------------------------------------------------------------
          | AUTO STOP TIMER
          |--------------------------------------------------------------------------
          */}

          <YesNoField
            label="Stop all other started timers when starting new timer"
            value={
              settings.auto_stop_tasks_timers_on_new_timer
            }
            onChange={(value) =>
              updateSetting(
                'auto_stop_tasks_timers_on_new_timer',
                value
              )
            }
          />

          {/*
          |--------------------------------------------------------------------------
          | TIMER STATUS
          |--------------------------------------------------------------------------
          */}

          <YesNoField
            label="Change task status to In Progress on timer started (valid only if task status is Not Started)"
            value={
              settings.timer_started_change_status_in_progress
            }
            onChange={(value) =>
              updateSetting(
                'timer_started_change_status_in_progress',
                value
              )
            }
          />

          {/*
          |--------------------------------------------------------------------------
          | BILLABLE
          |--------------------------------------------------------------------------
          */}

          <YesNoField
            label="Billable option is by default checked when new task is created? (only from admin area)"
            value={
              settings.task_biillable_checked_on_creation
            }
            onChange={(value) =>
              updateSetting(
                'task_biillable_checked_on_creation',
                value
              )
            }
          />        
        </CardContent>
      </Card>

      {/*
      |--------------------------------------------------------------------------
      | ROUND OFF TASK TIMER
      |--------------------------------------------------------------------------
      */}

      <Card>
        <CardHeader>
          <CardTitle>
            Round Off Task Timer
          </CardTitle>
        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/*
            |--------------------------------------------------------------------------
            | ROUND OPTION
            |--------------------------------------------------------------------------
            */}

            <div className="space-y-2">
              <Label>
                Round off task timer
              </Label>

              <Select
                value={String(
                  settings.round_off_task_timer_option
                )}
                onValueChange={(value) =>
                  updateSetting(
                    'round_off_task_timer_option',
                    value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="0">
                    Don't round off
                  </SelectItem>

                  <SelectItem value="1">
                    Round up
                  </SelectItem>

                  <SelectItem value="2">
                    Round down
                  </SelectItem>

                  <SelectItem value="3">
                    Round to nearest
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | MULTIPLES
            |--------------------------------------------------------------------------
            */}

            <div className="space-y-2">
              <Label>
                Multiples of Minutes
              </Label>

              <Select
                value={String(
                  settings.round_off_task_timer_time
                )}
                onValueChange={(value) =>
                  updateSetting(
                    'round_off_task_timer_time',
                    value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select minutes" />
                </SelectTrigger>

                <SelectContent>
                  {[
                    5,
                    10,
                    15,
                    20,
                    25,
                    30,
                    35,
                    40,
                    45,
                  ].map(
                    (minutes) => (
                      <SelectItem
                        key={minutes}
                        value={String(
                          minutes
                        )}
                      >
                        {minutes}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Applied to the Timesheets overview
            report and when invoicing a
            task/project.
          </p>

        </CardContent>
      </Card>

      {/*
      |--------------------------------------------------------------------------
      | DEFAULT TASK STATUS
      |--------------------------------------------------------------------------
      */}

      <Card>
        <CardHeader>
          <CardTitle>
            Default Task Status
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">

            <Label>
              Default status when new task is created
            </Label>

            <Select
              value={String(
                settings.default_task_status
              )}
              onValueChange={(value) =>
                updateSetting(
                  'default_task_status',
                  value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="auto">
                  Auto
                </SelectItem>

                <SelectItem value="1">
                  Not Started
                </SelectItem>

                <SelectItem value="4">
                  In Progress
                </SelectItem>

                <SelectItem value="3">
                  Testing
                </SelectItem>

                <SelectItem value="2">
                  Awaiting Feedback
                </SelectItem>

                <SelectItem value="5">
                  Complete
                </SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      {/*
      |--------------------------------------------------------------------------
      | DEFAULT PRIORITY
      |--------------------------------------------------------------------------
      */}

      <Card>
        <CardHeader>
          <CardTitle>
            Default Priority
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">

            <Label>
              Default Priority
            </Label>

            <Select
              value={String(
                settings.default_task_priority
              )}
              onValueChange={(value) =>
                updateSetting(
                  'default_task_priority',
                  value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="1">
                  Low
                </SelectItem>

                <SelectItem value="2">
                  Medium
                </SelectItem>

                <SelectItem value="3">
                  High
                </SelectItem>

                <SelectItem value="4">
                  Urgent
                </SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      {/*
      |--------------------------------------------------------------------------
      | TASK MODAL
      |--------------------------------------------------------------------------
      */}

      <Card>
        <CardHeader>
          <CardTitle>
            Task Modal
          </CardTitle>
        </CardHeader>

        <CardContent>

          <div className="space-y-2">

            <Label
              htmlFor="task_modal_class"
            >
              Modal Width Class
              {' '}
              (modal-lg, modal-xl, modal-xxl)
            </Label>

            <Input
              id="task_modal_class"
              type="text"
              value={
                settings.task_modal_class
              }
              onChange={(event) =>
                updateSetting(
                  'task_modal_class',
                  event.target.value
                )
              }
              placeholder="modal-lg"
            />

            <p className="text-sm text-muted-foreground">
              Enter a Bootstrap modal class such
              as modal-lg, modal-xl or modal-xxl.
            </p>

          </div>

        </CardContent>
      </Card>

      {/*
      |--------------------------------------------------------------------------
      | SAVE
      |--------------------------------------------------------------------------
      */}

      <div className="flex justify-end pt-2">

        <Button
          type="submit"
          disabled={saving}
          className="min-w-[140px]"
        >
          {saving ? (
            <>
              <LoaderCircleIcon className="mr-2 size-4 animate-spin" />

              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>

      </div>
    </div>      
    </form>
  );
}