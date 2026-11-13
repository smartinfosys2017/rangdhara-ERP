import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Convert a value to a string because CustomFieldValue.value
 * is expected to be a String.
 */
function serializeCustomFieldValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}


/**
 * Convert stored value back to frontend value.
 */
function deserializeCustomFieldValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}


/**
 * Normalize custom fields.
 */
function normalizeCustomFields(customFields) {
  if (
    !customFields ||
    typeof customFields !== 'object' ||
    Array.isArray(customFields)
  ) {
    return {};
  }

  return customFields;
}


/**
 * Parse JSON safely.
 */
function safeJsonParse(value, fallback = {}) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


/**
 * Convert FormData boolean values.
 *
 * FormData sends:
 *
 * "true"
 * "false"
 */
function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }

    if (value.toLowerCase() === 'false') {
      return false;
    }
  }

  return defaultValue;
}


/**
 * Convert IDs.
 */
function convertIds(value) {
  if (!value) {
    return [];
  }

  /*
   * JSON string from FormData.
   */
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (
      trimmed.startsWith('[') &&
      trimmed.endsWith(']')
    ) {
      const parsed = safeJsonParse(
        trimmed,
        []
      );

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => Number(item))
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          );
      }
    }

    return trimmed
      .split(',')
      .map((item) => Number(item.trim()))
      .filter(
        (id) =>
          Number.isInteger(id) &&
          id > 0
      );
  }

  /*
   * Array.
   */
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter(
        (id) =>
          Number.isInteger(id) &&
          id > 0
      );
  }

  return [];
}


/**
 * Convert tags.
 */
function convertTags(value) {
  if (!value) {
    return [];
  }

  /*
   * JSON array from FormData.
   */
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (
      trimmed.startsWith('[') &&
      trimmed.endsWith(']')
    ) {
      const parsed = safeJsonParse(
        trimmed,
        []
      );

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    }

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
}


/**
 * Nullable number.
 */
function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


/**
 * Nullable date.
 */
function nullableDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}


/*
|--------------------------------------------------------------------------
| Custom Field Helpers
|--------------------------------------------------------------------------
*/

/**
 * Find custom field by slug.
 *
 * IMPORTANT:
 *
 * Different versions of your Prisma schema may expose
 * the primary key differently.
 *
 * We therefore check:
 *
 * customField.id
 * customField.customFieldId
 * customField.fieldId
 */
async function findCustomFieldBySlug(slug) {
  const normalizedSlug = String(slug).trim();

  if (!normalizedSlug) {
    return null;
  }

  const customField =
    await prisma.customField.findFirst({
      where: {
        slug: normalizedSlug,
      },
    });

  return customField;
}


/**
 * Get the actual custom field ID.
 */
function getCustomFieldId(customField) {
  if (!customField) {
    return null;
  }

  /*
   * Normal Prisma schema.
   */
  if (
    customField.id !== undefined &&
    customField.id !== null
  ) {
    return customField.id;
  }

  /*
   * Alternative schema.
   */
  if (
    customField.customFieldId !== undefined &&
    customField.customFieldId !== null
  ) {
    return customField.customFieldId;
  }

  /*
   * Alternative schema.
   */
  if (
    customField.fieldId !== undefined &&
    customField.fieldId !== null
  ) {
    return customField.fieldId;
  }

  return null;
}



/**
 * Get task custom fields.
 */
async function getTaskCustomFields(taskId) {
  const values =
    await prisma.customFieldValue.findMany({
      where: {
        entityType: 'tasks',

        entityId:
          String(taskId),
      },

      orderBy: {
        id: 'asc',
      },
    });

  const slugs =
    values
      .map(
        (item) =>
          item.fieldSlug
      )
      .filter(Boolean);

  let fields = [];

  if (slugs.length) {
    fields =
      await prisma.customField.findMany({
        where: {
          slug: {
            in: slugs,
          },
        },
      });
  }

  /*
   * Add frontend-friendly parsed value.
   */
  const formattedValues =
    values.map((item) => ({
      ...item,

      parsedValue:
        deserializeCustomFieldValue(
          item.value
        ),
    }));

  return {
    fields,
    values: formattedValues,
  };
}


/**
 * Delete task custom fields.
 *
 * Used before saving PUT values so that
 * duplicate records are not created.
 */
async function deleteTaskCustomFields(
  taskId
) {
  await prisma.customFieldValue.deleteMany({
    where: {
      entityType: 'tasks',

      entityId:
        String(taskId),
    },
  });
}


/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    /*
    |--------------------------------------------------------------------------
    | SINGLE TASK
    |--------------------------------------------------------------------------
    |
    | /api/task?id=2
    |
    */

    const idParam = searchParams.get('id');

    if (idParam !== null) {
      const id = Number(idParam);

      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid task ID.',
          },
          {
            status: 400,
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Get Task
      |--------------------------------------------------------------------------
      */

      const task = await prisma.task.findUnique({
        where: {
          id,
        },
      });

      if (!task) {
        return NextResponse.json(
          {
            success: false,
            message: 'Task not found.',
          },
          {
            status: 404,
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Get Custom Fields
      |--------------------------------------------------------------------------
      */

      const customData =
        await getTaskCustomFields(task.id);

      /*
      |--------------------------------------------------------------------------
      | Normalize Custom Fields
      |--------------------------------------------------------------------------
      */

      const customFields =
        Array.isArray(customData?.fields)
          ? customData.fields
          : [];

      const customValues =
        customData?.values &&
        typeof customData.values === 'object'
          ? customData.values
          : {};

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */

      return NextResponse.json({
        success: true,

        data: {
          ...task,

          custom_fields: customFields,

          custom_field_values: customValues,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

    const pageParam = Number(
      searchParams.get('page') || 1
    );

    const limitParam = Number(
      searchParams.get('limit') || 10
    );

    const page =
      Number.isInteger(pageParam) && pageParam > 0
        ? pageParam
        : 1;

    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 10;

    const skip =
      (page - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    /*
    | Support both:
    |
    | ?query=test
    | ?search=test
    |
    */

    const search =
      (
        searchParams.get('query') ||
        searchParams.get('search') ||
        ''
      ).trim();

    /*
    |--------------------------------------------------------------------------
    | SORT
    |--------------------------------------------------------------------------
    */

    const requestedSort =
      searchParams
        .get('sort')
        ?.trim() || 'id';

    const requestedDir =
      searchParams
        .get('dir')
        ?.trim()
        .toLowerCase() || 'desc';

    /*
    |--------------------------------------------------------------------------
    | ALLOWED SORT FIELDS
    |--------------------------------------------------------------------------
    */

    const allowedSortFields = [
      'id',
      'name',
      'startDate',
      'dueDate',
      'priority',
      'hourlyRate',
      'createdAt',
      'updatedAt',
    ];

    const sort =
      allowedSortFields.includes(
        requestedSort
      )
        ? requestedSort
        : 'id';

    const dir =
      requestedDir === 'asc'
        ? 'asc'
        : 'desc';

    /*
    |--------------------------------------------------------------------------
    | WHERE
    |--------------------------------------------------------------------------
    */

    const where = search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {};

    /*
    |--------------------------------------------------------------------------
    | TOTAL
    |--------------------------------------------------------------------------
    */

    const total =
      await prisma.task.count({
        where,
      });

    /*
    |--------------------------------------------------------------------------
    | TASKS
    |--------------------------------------------------------------------------
    */

    const tasks =
      await prisma.task.findMany({
        where,

        orderBy: {
          [sort]: dir,
        },

        skip,

        take: limit,
      });

    /*
    |--------------------------------------------------------------------------
    | CUSTOM FIELDS
    |--------------------------------------------------------------------------
    */

    const data =
      await Promise.all(
        tasks.map(
          async (task) => {
            const customData =
              await getTaskCustomFields(
                task.id
              );

            return {
              ...task,

              custom_fields:
                Array.isArray(
                  customData?.fields
                )
                  ? customData.fields
                  : [],

              custom_field_values:
                customData?.values &&
                typeof customData.values ===
                  'object'
                  ? customData.values
                  : {},
            };
          }
        )
      );

    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

    const totalPages =
      total > 0
        ? Math.ceil(
            total / limit
          )
        : 0;

    const hasNextPage =
      page < totalPages;

    const hasPreviousPage =
      page > 1;

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },

      sort: {
        field: sort,
        direction: dir,
      },

      search,
    });
  } catch (error) {
    console.error(
      'GET TASK ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          'Failed to load tasks.',
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
     * Support both JSON and FormData.
     */
    const contentType =
      request.headers.get(
        'content-type'
      ) || '';

    let body = {};

    if (
      contentType.includes(
        'multipart/form-data'
      )
    ) {
      const formData =
        await request.formData();

      body = {};

      for (
        const [key, value]
        of formData.entries()
      ) {
        /*
         * Ignore actual uploaded files
         * for normal fields.
         */
        if (
          typeof value === 'string'
        ) {
          body[key] = value;
        }
      }

      /*
       * Parse JSON encoded fields.
       */
      body.assignees =
        safeJsonParse(
          body.assignees,
          []
        );

      body.followers =
        safeJsonParse(
          body.followers,
          []
        );

      body.tags =
        safeJsonParse(
          body.tags,
          []
        );

      body.customFields =
        safeJsonParse(
          body.customFields,
          {}
        );
    } else {
      body =
        await request.json();
    }

    const {
      isPublic,
      billable,
      visibleToClient,

      name,
      hourlyRate,

      startDate,
      dueDate,

      priority,
      repeatEvery,

      repeatEveryCustom,
      repeatTypeCustom,

      cycles,
      unlimitedCycles,

      relType,
      relId,

      assignees,
      followers,

      tags,
      description,

      customFields,
    } = body;

    /*
     * Validation.
     */
    if (
      !name ||
      !String(name).trim()
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Subject is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Start date is required.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Dates.
     */
    const parsedStartDate =
      nullableDate(
        startDate
      );

    const parsedDueDate =
      nullableDate(
        dueDate
      );

    if (!parsedStartDate) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Invalid start date.',
        },
        {
          status: 400,
        }
      );
    }
    let finalCustomFields = {};

    if (
      customFields &&
      typeof customFields === 'object' &&
      !Array.isArray(customFields)
    ) {
      finalCustomFields = customFields;
    }
    /*
     * Create task.
     */
    const task =
      await prisma.task.create({
        data: {
          isPublic:
            parseBoolean(
              isPublic,
              false
            ),

          billable:
            parseBoolean(
              billable,
              true
            ),

          visibleToClient:
            parseBoolean(
              visibleToClient,
              false
            ),

          name:
            String(name).trim(),

          hourlyRate:
            Number(
              hourlyRate || 0
            ),

          startDate:
            parsedStartDate,

          dueDate:
            parsedDueDate,

          priority:
            Number(
              priority || 2
            ),

          repeatEvery:
            repeatEvery || null,

          repeatEveryCustom:
            Number(
              repeatEveryCustom || 1
            ),

          repeatTypeCustom:
            repeatTypeCustom ||
            'day',

          cycles:
            Number(
              cycles || 0
            ),

          unlimitedCycles:
            parseBoolean(
              unlimitedCycles,
              true
            ),

          relType:
            relType || null,

          relId:
            nullableNumber(
              relId
            ),

          assignees:
            convertIds(
              assignees
            ),

          followers:
            convertIds(
              followers
            ),

          tags:
            convertTags(
              tags
            ),

          description:
            description || '',
          
          /*
          |--------------------------------------------------------------------------
          | Custom Fields JSON
          |--------------------------------------------------------------------------
          */

          customFields:
            finalCustomFields,
        },
      });

    /*
     * Read saved custom fields.
     */
    const customData =
      await getTaskCustomFields(
        task.id
      );

    return NextResponse.json(
      {
        success: true,

        message:
          'Task created successfully.',

        data: {
          ...task,

          custom_fields:
            customData.fields,

          custom_field_values:
            customData.values,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      'CREATE TASK ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          'Failed to create task.',
      },
      {
        status: 500,
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| PUT
|--------------------------------------------------------------------------
*/

export async function PUT(request) {
  try {
    const contentType =
      request.headers.get(
        'content-type'
      ) || '';

    let body = {};

    /*
     * Support JSON.
     */
    if (
      contentType.includes(
        'application/json'
      )
    ) {
      body =
        await request.json();
    }

    /*
     * Support FormData.
     */
    else if (
      contentType.includes(
        'multipart/form-data'
      )
    ) {
      const formData =
        await request.formData();

      for (
        const [key, value]
        of formData.entries()
      ) {
        if (
          typeof value === 'string'
        ) {
          body[key] = value;
        }
      }

      body.assignees =
        safeJsonParse(
          body.assignees,
          []
        );

      body.followers =
        safeJsonParse(
          body.followers,
          []
        );

      body.tags =
        safeJsonParse(
          body.tags,
          []
        );

      body.customFields =
        safeJsonParse(
          body.customFields,
          {}
        );
    }

    const {
      id,

      isPublic,
      billable,
      visibleToClient,

      name,
      hourlyRate,

      startDate,
      dueDate,

      priority,
      repeatEvery,

      repeatEveryCustom,
      repeatTypeCustom,

      cycles,
      unlimitedCycles,

      relType,
      relId,

      assignees,
      followers,

      tags,
      description,

      customFields,
    } = body;

    /*
     * Validate ID.
     */
    if (
      id === null ||
      id === undefined ||
      id === ''
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Task ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    const taskId =
      Number(id);

    if (
      !Number.isInteger(taskId) ||
      taskId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Invalid task ID.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Validate name.
     */
    if (
      !name ||
      !String(name).trim()
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Subject is required.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Find existing task.
     */
    const existing =
      await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Task not found.',
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Dates.
     */
    let parsedStartDate =
      existing.startDate;

    if (
      startDate !==
        undefined &&
      startDate !== ''
    ) {
      parsedStartDate =
        nullableDate(
          startDate
        );
    }

    if (!parsedStartDate) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Invalid start date.',
        },
        {
          status: 400,
        }
      );
    }

    let parsedDueDate =
      existing.dueDate;

    if (
      dueDate === null ||
      dueDate === ''
    ) {
      parsedDueDate = null;
    } else if (
      dueDate !==
      undefined
    ) {
      parsedDueDate =
        nullableDate(
          dueDate
        );
    }
    let finalCustomFields = existing.customFields || {};

    if (
      customFields !== undefined &&
      customFields !== null
    ) {
      if (
        typeof customFields === 'object' &&
        !Array.isArray(customFields)
      ) {
        finalCustomFields = customFields;
      }
    }
    /*
     * Update task.
     */
    const task =
      await prisma.task.update({
        where: {
          id: taskId,
        },

        data: {
          isPublic:
            isPublic !==
              undefined
              ? parseBoolean(
                  isPublic,
                  existing.isPublic
                )
              : existing.isPublic,

          billable:
            billable !==
              undefined
              ? parseBoolean(
                  billable,
                  existing.billable
                )
              : existing.billable,

          visibleToClient:
            visibleToClient !==
              undefined
              ? parseBoolean(
                  visibleToClient,
                  existing.visibleToClient
                )
              : existing.visibleToClient,

          name:
            String(name).trim(),

          hourlyRate:
            hourlyRate !==
              undefined &&
            hourlyRate !== null &&
            hourlyRate !== ''
              ? Number(
                  hourlyRate
                )
              : existing.hourlyRate,

          startDate:
            parsedStartDate,

          dueDate:
            parsedDueDate,

          priority:
            priority !==
              undefined &&
            priority !== null &&
            priority !== ''
              ? Number(
                  priority
                )
              : existing.priority,

          repeatEvery:
            repeatEvery !==
              undefined
              ? repeatEvery || null
              : existing.repeatEvery,

          repeatEveryCustom:
            repeatEveryCustom !==
              undefined
              ? Number(
                  repeatEveryCustom || 1
                )
              : existing.repeatEveryCustom,

          repeatTypeCustom:
            repeatTypeCustom !==
              undefined
              ? repeatTypeCustom || 'day'
              : existing.repeatTypeCustom,

          cycles:
            cycles !==
              undefined
              ? Number(
                  cycles || 0
                )
              : existing.cycles,

          unlimitedCycles:
            unlimitedCycles !==
              undefined
              ? parseBoolean(
                  unlimitedCycles,
                  existing.unlimitedCycles
                )
              : existing.unlimitedCycles,

          relType:
            relType !==
              undefined
              ? relType || null
              : existing.relType,

          relId:
            relId !==
              undefined
              ? nullableNumber(
                  relId
                )
              : existing.relId,

          assignees:
            assignees !==
              undefined
              ? convertIds(
                  assignees
                )
              : existing.assignees,

          followers:
            followers !==
              undefined
              ? convertIds(
                  followers
                )
              : existing.followers,

          tags:
            tags !==
              undefined
              ? convertTags(
                  tags
                )
              : existing.tags,

          description:
            description !==
              undefined
              ? description || ''
              : existing.description,
           /*
          |--------------------------------------------------------------------------
          | Custom Fields JSON
          |--------------------------------------------------------------------------
          */

          customFields:
            finalCustomFields,
        },
      });

    /*
     * Get custom data.
     */
    const customData =
      await getTaskCustomFields(
        task.id
      );

    return NextResponse.json({
      success: true,

      message:
        'Task updated successfully.',

      data: {
        ...task,

        custom_fields:
          customData.fields,

        custom_field_values:
          customData.values,
      },
    });
  } catch (error) {
    console.error(
      'UPDATE TASK ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          'Failed to update task.',
      },
      {
        status: 500,
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
*/

export async function DELETE(request) {
  try {
    const contentType =
      request.headers.get(
        'content-type'
      ) || '';

    let body = {};

    if (
      contentType.includes(
        'application/json'
      )
    ) {
      body =
        await request.json();
    } else {
      const { searchParams } =
        new URL(
          request.url
        );

      body.id =
        searchParams.get(
          'id'
        );
    }

    const {
      id,
    } = body;

    /*
     * Validate ID.
     */
    if (
      id === null ||
      id === undefined ||
      id === ''
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Task ID is required.',
        },
        {
          status: 400,
        }
      );
    }

    const taskId =
      Number(id);

    if (
      !Number.isInteger(taskId) ||
      taskId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Invalid task ID.',
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Check task.
     */
    const existing =
      await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,

          message:
            'Task not found.',
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Delete custom field values.
     */
    await deleteTaskCustomFields(
      taskId
    );

    /*
     * Delete task.
     */
    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        'Task deleted successfully.',
    });
  } catch (error) {
    console.error(
      'DELETE TASK ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          'Failed to delete task.',
      },
      {
        status: 500,
      }
    );
  }
}