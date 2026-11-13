import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/*
|--------------------------------------------------------------------------
| TASK SETTINGS
|--------------------------------------------------------------------------
*/

const TASK_SETTINGS = [
  'tasks_kanban_limit',
  'show_all_tasks_for_project_member',
  'client_staff_add_edit_delete_task_comments_first_hour',
  'new_task_auto_assign_current_member',
  'new_task_auto_follower_current_member',
  'auto_stop_tasks_timers_on_new_timer',
  'timer_started_change_status_in_progress',
  'task_biillable_checked_on_creation',
  'round_off_task_timer_option',
  'round_off_task_timer_time',
  'default_task_status',
  'default_task_priority',
  'task_modal_class',
];

/*
|--------------------------------------------------------------------------
| DEFAULT VALUES
|--------------------------------------------------------------------------
*/

const DEFAULT_SETTINGS = {
  tasks_kanban_limit: '50',

  show_all_tasks_for_project_member: '1',

  client_staff_add_edit_delete_task_comments_first_hour:
    '0',

  new_task_auto_assign_current_member: '1',

  new_task_auto_follower_current_member: '0',

  auto_stop_tasks_timers_on_new_timer: '1',

  timer_started_change_status_in_progress: '1',

  task_biillable_checked_on_creation: '1',

  round_off_task_timer_option: '0',

  round_off_task_timer_time: '5',

  default_task_status: 'auto',

  default_task_priority: '2',

  task_modal_class: 'modal-lg',
};

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    const settings =
      await prisma.setting.findMany({
        where: {
          key: {
            in: TASK_SETTINGS,
          },
        },

        select: {
          key: true,
          value: true,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Build settings object
    |--------------------------------------------------------------------------
    */

    const data = {
      ...DEFAULT_SETTINGS,
    };

    settings.forEach((setting) => {
      data[setting.key] =
        setting.value ?? '';
    });

    return NextResponse.json({
      success: true,

      message:
        'Task settings loaded successfully',

      data,
    });
  } catch (error) {
    console.error(
      'Task settings GET error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          'Failed to load task settings',

        error:
          process.env.NODE_ENV ===
          'development'
            ? error.message
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    /*
    |--------------------------------------------------------------------------
    | Read FormData
    |--------------------------------------------------------------------------
    */

    const formData =
      await request.formData();

    /*
    |--------------------------------------------------------------------------
    | Read Values
    |--------------------------------------------------------------------------
    */

    const tasksKanbanLimit =
      formData.get(
        'tasks_kanban_limit'
      ) ?? DEFAULT_SETTINGS.tasks_kanban_limit;

    const showAllTasks =
      formData.get(
        'show_all_tasks_for_project_member'
      ) ??
      DEFAULT_SETTINGS
        .show_all_tasks_for_project_member;

    const commentsFirstHour =
      formData.get(
        'client_staff_add_edit_delete_task_comments_first_hour'
      ) ??
      DEFAULT_SETTINGS
        .client_staff_add_edit_delete_task_comments_first_hour;

    const autoAssignCreator =
      formData.get(
        'new_task_auto_assign_current_member'
      ) ??
      DEFAULT_SETTINGS
        .new_task_auto_assign_current_member;

    const autoFollowerCreator =
      formData.get(
        'new_task_auto_follower_current_member'
      ) ??
      DEFAULT_SETTINGS
        .new_task_auto_follower_current_member;

    const autoStopTimers =
      formData.get(
        'auto_stop_tasks_timers_on_new_timer'
      ) ??
      DEFAULT_SETTINGS
        .auto_stop_tasks_timers_on_new_timer;

    const timerStartedStatus =
      formData.get(
        'timer_started_change_status_in_progress'
      ) ??
      DEFAULT_SETTINGS
        .timer_started_change_status_in_progress;

    const billableChecked =
      formData.get(
        'task_biillable_checked_on_creation'
      ) ??
      DEFAULT_SETTINGS
        .task_biillable_checked_on_creation;

    const roundOffOption =
      formData.get(
        'round_off_task_timer_option'
      ) ??
      DEFAULT_SETTINGS
        .round_off_task_timer_option;

    const roundOffTime =
      formData.get(
        'round_off_task_timer_time'
      ) ??
      DEFAULT_SETTINGS
        .round_off_task_timer_time;

    const defaultTaskStatus =
      formData.get(
        'default_task_status'
      ) ??
      DEFAULT_SETTINGS
        .default_task_status;

    const defaultTaskPriority =
      formData.get(
        'default_task_priority'
      ) ??
      DEFAULT_SETTINGS
        .default_task_priority;

    const taskModalClass =
      formData.get(
        'task_modal_class'
      ) ??
      DEFAULT_SETTINGS
        .task_modal_class;

    /*
    |--------------------------------------------------------------------------
    | Prepare Settings
    |--------------------------------------------------------------------------
    */

    const settings = {
      tasks_kanban_limit:
        String(tasksKanbanLimit),

      show_all_tasks_for_project_member:
        String(showAllTasks),

      client_staff_add_edit_delete_task_comments_first_hour:
        String(commentsFirstHour),

      new_task_auto_assign_current_member:
        String(autoAssignCreator),

      new_task_auto_follower_current_member:
        String(autoFollowerCreator),

      auto_stop_tasks_timers_on_new_timer:
        String(autoStopTimers),

      timer_started_change_status_in_progress:
        String(timerStartedStatus),

      task_biillable_checked_on_creation:
        String(billableChecked),

      round_off_task_timer_option:
        String(roundOffOption),

      round_off_task_timer_time:
        String(roundOffTime),

      default_task_status:
        String(defaultTaskStatus),

      default_task_priority:
        String(defaultTaskPriority),

      task_modal_class:
        String(taskModalClass),
    };

    /*
    |--------------------------------------------------------------------------
    | Save Settings
    |--------------------------------------------------------------------------
    */

    await prisma.$transaction(
      async (tx) => {
        for (
          const [key, value] of Object.entries(
            settings
          )
        ) {
          await tx.setting.upsert({
            where: {
              key,
            },

            update: {
              value,
              group: 'tasks',
            },

            create: {
              key,
              value,
              group: 'tasks',
            },
          });
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      message:
        'Task settings saved successfully',

      data: settings,
    });
  } catch (error) {
    console.error(
      'Task settings POST error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          'Failed to save task settings',

        error:
          process.env.NODE_ENV ===
          'development'
            ? error.message
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}