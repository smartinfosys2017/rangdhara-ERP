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
  Skeleton,
} from '@/components/ui/skeleton';

import {
  apiFetch,
} from '@/lib/api';

import CustomFieldInput from './custom-field-input';

/*
|--------------------------------------------------------------------------
| Normalize Field Type
|--------------------------------------------------------------------------
*/

const normalizeFieldType = (type) => {
  return String(type || '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
};

/*
|--------------------------------------------------------------------------
| Default Value
|--------------------------------------------------------------------------
*/

const getDefaultValue = (field) => {
  if (!field) {
    return '';
  }

  const type = normalizeFieldType(field.type);

  if (
    type === 'multi_file' ||
    type === 'multi_image'
  ) {
    return [];
  }

  if (
    type === 'file' ||
    type === 'image'
  ) {
    return '';
  }

  if (type === 'checkbox') {
    return (
      field.defaultValue === true ||
      field.defaultValue === 'true' ||
      field.defaultValue === '1'
    );
  }

  if (type === 'multiselect') {
    if (field.defaultValue) {
      if (
        typeof field.defaultValue === 'string' &&
        field.defaultValue.trim().startsWith('[')
      ) {
        try {
          const parsed = JSON.parse(
            field.defaultValue
          );

          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          // Continue
        }
      }

      return String(field.defaultValue)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  return field.defaultValue ?? '';
};

export default function TaskCustomFields({
  taskId,
  values,
  onChange,
  disabled = false,
}) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCustomFields = async () => {
      try {
        setLoading(true);

        /*
        |--------------------------------------------------------------------------
        | Load Task Custom Field Definitions
        |--------------------------------------------------------------------------
        */

        const fieldsResponse = await apiFetch(
          '/api/custom_fields?fieldto=tasks',
          {
            method: 'GET',
          }
        );

        const fieldsResult =
          await fieldsResponse.json();

        if (
          !fieldsResponse.ok ||
          !fieldsResult?.success
        ) {
          throw new Error(
            fieldsResult?.message ||
              'Failed to load custom fields.'
          );
        }

        if (!mounted) {
          return;
        }

        const customFieldList =
          Array.isArray(fieldsResult.data)
            ? fieldsResult.data
            : [];

        setFields(customFieldList);

        /*
        |--------------------------------------------------------------------------
        | Existing Task
        |--------------------------------------------------------------------------
        */

        if (taskId) {
          const taskResponse = await apiFetch(
            `/api/task?id=${taskId}`,
            {
              method: 'GET',
            }
          );

          const taskResult =
            await taskResponse.json();

          if (
            !taskResponse.ok ||
            !taskResult?.success
          ) {
            throw new Error(
              taskResult?.message ||
                'Failed to load task.'
            );
          }

          if (!mounted) {
            return;
          }

          /*
          |--------------------------------------------------------------------------
          | API returns data as an array
          |--------------------------------------------------------------------------
          */

          const task = Array.isArray(
            taskResult.data
          )
            ? taskResult.data.find(
                (item) =>
                  String(item?.id) ===
                  String(taskId)
              ) ||
              taskResult.data[0]
            : taskResult.data;

          const savedValues =
            task?.custom_field_values;

          /*
          |--------------------------------------------------------------------------
          | Build Complete Values
          |--------------------------------------------------------------------------
          */

          const completeValues = {};

          customFieldList.forEach(
            (field) => {
              if (!field?.slug) {
                return;
              }

              if (
                savedValues &&
                Object.prototype.hasOwnProperty.call(
                  savedValues,
                  field.slug
                )
              ) {
                let saved =
                  savedValues[field.slug];

                const type =
                  normalizeFieldType(
                    field.type
                  );

                /*
                |--------------------------------------------------------------------------
                | Multi File / Multi Image
                |--------------------------------------------------------------------------
                */

                if (
                  type === 'multi_file' ||
                  type === 'multi_image'
                ) {
                  if (
                    typeof saved === 'string'
                  ) {
                    try {
                      const parsed =
                        JSON.parse(saved);

                      if (
                        Array.isArray(parsed)
                      ) {
                        saved = parsed;
                      }
                    } catch {
                      if (!saved.trim()) {
                        saved = [];
                      }
                    }
                  }

                  if (
                    !Array.isArray(saved)
                  ) {
                    saved = [];
                  }
                }

                completeValues[field.slug] =
                  saved;
              } else {
                completeValues[field.slug] =
                  getDefaultValue(field);
              }
            }
          );

          onChange(completeValues);

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | New Task
        |--------------------------------------------------------------------------
        */

        const defaultValues = {};

        customFieldList.forEach(
          (field) => {
            if (!field?.slug) {
              return;
            }

            defaultValues[field.slug] =
              getDefaultValue(field);
          }
        );

        /*
        |--------------------------------------------------------------------------
        | Don't overwrite existing values
        |--------------------------------------------------------------------------
        */

        if (
          !values ||
          Object.keys(values).length === 0
        ) {
          onChange(defaultValues);
        }
      } catch (error) {
        console.error(
          'TASK CUSTOM FIELD LOAD ERROR:',
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCustomFields();

    return () => {
      mounted = false;
    };
  }, [taskId]);

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | No Fields
  |--------------------------------------------------------------------------
  */

  if (!fields.length) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Custom Fields
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => {
            const type =
              normalizeFieldType(field.type);

            const fullWidth =
              type === 'textarea' ||
              type === 'file' ||
              type === 'image' ||
              type === 'multi_file' ||
              type === 'multi_image';

            let currentValue =
              values?.[field.slug];

            if (
              currentValue === undefined ||
              currentValue === null
            ) {
              currentValue =
                getDefaultValue(field);
            }

            return (
              <div
                key={field.id}
                className={
                  fullWidth
                    ? 'md:col-span-2'
                    : ''
                }
              >
                <CustomFieldInput
                  field={field}
                  value={currentValue}
                  onChange={(newValue) => {
                    onChange({
                      ...(values || {}),
                      [field.slug]: newValue,
                    });
                  }}
                  disabled={
                    disabled ||
                    field.disabled
                  }
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}