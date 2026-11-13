import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const SETTING_GROUP = 'clients';

/*
|--------------------------------------------------------------------------
| CUSTOMER ENTITY
|--------------------------------------------------------------------------
|
| IMPORTANT:
| customFieldValue.entityId is String in Prisma.
|
*/

const CUSTOMER_ENTITY_TYPE = 'customers';
const CUSTOMER_ENTITY_ID = '0';

/*
|--------------------------------------------------------------------------
| UPLOAD DIRECTORY
|--------------------------------------------------------------------------
*/

const UPLOAD_DIR = path.join(
  process.cwd(),
  'public',
  'uploads',
  'custom-fields'
);

/*
|--------------------------------------------------------------------------
| DEFAULT CUSTOMER SETTINGS
|--------------------------------------------------------------------------
*/

const DEFAULT_SETTINGS = {
  customer_settings: '1',

  clients_default_theme: 'perfex',

  customer_default_country: '',

  visible_customer_profile_tabs: [
    'notes',
    'statement',
    'invoices',
    'payments',
    'proposals',
    'credit_notes',
    'estimates',
    'subscriptions',
    'expenses',
    'contracts',
    'projects',
    'tasks',
    'tickets',
    'attachments',
    'vault',
    'reminders',
    'map',
  ],

  required_register_fields: [
    'contact_firstname',
    'contact_lastname',
    'contact_email',
    'company_company',
  ],

  company_is_required: '1',

  company_requires_vat_number_field: '1',

  allow_registration: '0',

  customers_register_require_confirmation: '0',

  allow_primary_contact_to_manage_other_contacts: '0',

  enable_honeypot_spam_validation: '0',

  allow_primary_contact_to_view_edit_billing_and_shipping: '0',

  only_own_files_contacts: '0',

  allow_contact_to_delete_files: '0',

  use_knowledge_base: '1',

  knowledge_base_without_registration: '1',

  show_estimate_request_in_customers_area: '0',

  default_contact_permissions: [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
  ],

  customer_info_format:
    `{company_name}
{street}
{city} {state}
{country_code} {zip_code}
{vat_number_with_label}`,
};

/*
|--------------------------------------------------------------------------
| ARRAY SETTINGS
|--------------------------------------------------------------------------
*/

const ARRAY_SETTINGS = [
  'visible_customer_profile_tabs',
  'required_register_fields',
  'default_contact_permissions',
];

/*
|--------------------------------------------------------------------------
| DECODE SETTING VALUE
|--------------------------------------------------------------------------
*/

function decodeValue(value, key) {
  if (
    value === null ||
    value === undefined
  ) {
    return DEFAULT_SETTINGS[key] ?? '';
  }

  if (
    ARRAY_SETTINGS.includes(key)
  ) {
    try {
      const parsed = JSON.parse(
        String(value)
      );

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      if (typeof value === 'string') {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return [];
    }

    return [];
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| ENCODE SETTING VALUE
|--------------------------------------------------------------------------
*/

function encodeValue(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value);
}

/*
|--------------------------------------------------------------------------
| SAFE FILE NAME
|--------------------------------------------------------------------------
*/

function createSafeFileName(filename) {
  const extension =
    path.extname(filename);

  const name =
    path.basename(
      filename,
      extension
    );

  const safeName =
    name
      .replace(
        /[^a-zA-Z0-9_-]/g,
        '-'
      )
      .replace(
        /-+/g,
        '-'
      )
      .replace(
        /^-|-$/g,
        ''
      );

  return (
    `${safeName || 'file'}-${Date.now()}${extension.toLowerCase()}`
  );
}

/*
|--------------------------------------------------------------------------
| GET ALLOWED EXTENSIONS
|--------------------------------------------------------------------------
*/

function getAllowedExtensions(options) {
  if (!options) {
    return [];
  }

  if (Array.isArray(options)) {
    return options
      .map((item) =>
        String(item)
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
  }

  if (typeof options === 'string') {
    try {
      const parsed =
        JSON.parse(options);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            String(item)
              .trim()
              .toLowerCase()
          )
          .filter(Boolean);
      }

      if (
        typeof parsed === 'object' &&
        parsed !== null
      ) {
        const values =
          Object.values(parsed);

        return values
          .map((item) =>
            String(item)
              .trim()
              .toLowerCase()
          )
          .filter(Boolean);
      }
    } catch {
      // Continue with comma separated value
    }

    return options
      .split(',')
      .map((item) =>
        item
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| DECODE CUSTOM FIELD VALUE
|--------------------------------------------------------------------------
*/

function decodeCustomFieldValue(
  value,
  field
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  /*
  |--------------------------------------------------------------------------
  | File
  |--------------------------------------------------------------------------
  */

  if (
    field?.type === 'file'
  ) {
    return String(value);
  }

  /*
  |--------------------------------------------------------------------------
  | Checkbox / Multiselect / JSON
  |--------------------------------------------------------------------------
  */

  if (
    field?.type === 'checkbox' ||
    field?.type === 'multiselect'
  ) {
    try {
      const parsed =
        JSON.parse(
          String(value)
        );

      return parsed;
    } catch {
      if (
        typeof value === 'string' &&
        value.includes(',')
      ) {
        return value
          .split(',')
          .map((item) =>
            item.trim()
          )
          .filter(Boolean);
      }

      return value;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Try JSON for other fields
  |--------------------------------------------------------------------------
  */

  if (
    typeof value === 'string' &&
    (
      value.startsWith('[') ||
      value.startsWith('{')
    )
  ) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| ENCODE CUSTOM FIELD VALUE
|--------------------------------------------------------------------------
*/

function encodeCustomFieldValue(
  rawValue,
  field
) {
  /*
  |--------------------------------------------------------------------------
  | Checkbox
  |--------------------------------------------------------------------------
  */

  if (
    field?.type === 'checkbox'
  ) {
    /*
    | Checkbox with multiple options
    */

    if (field.options) {
      let checkboxValues = [];

      if (
        Array.isArray(rawValue)
      ) {
        checkboxValues =
          rawValue;
      } else if (
        typeof rawValue === 'string'
      ) {
        try {
          const parsed =
            JSON.parse(rawValue);

          if (
            Array.isArray(parsed)
          ) {
            checkboxValues =
              parsed;
          } else {
            checkboxValues =
              [rawValue];
          }
        } catch {
          checkboxValues =
            rawValue
              .split(',')
              .map((item) =>
                item.trim()
              )
              .filter(Boolean);
        }
      } else if (
        rawValue !== null &&
        rawValue !== undefined
      ) {
        checkboxValues =
          [rawValue];
      }

      checkboxValues =
        checkboxValues.filter(
          (item) =>
            item !== false &&
            item !== 'false' &&
            item !== null &&
            item !== undefined &&
            String(item).trim() !== ''
        );

      return JSON.stringify(
        checkboxValues
      );
    }

    /*
    | Boolean checkbox
    */

    return (
      rawValue === true ||
      rawValue === 'true' ||
      rawValue === '1'
    )
      ? 'true'
      : 'false';
  }

  /*
  |--------------------------------------------------------------------------
  | Multiselect
  |--------------------------------------------------------------------------
  */

  if (
    field?.type === 'multiselect'
  ) {
    if (
      Array.isArray(rawValue)
    ) {
      return JSON.stringify(
        rawValue
      );
    }

    if (
      typeof rawValue === 'string'
    ) {
      try {
        const parsed =
          JSON.parse(rawValue);

        if (
          Array.isArray(parsed)
        ) {
          return JSON.stringify(
            parsed
          );
        }
      } catch {
        // Continue
      }

      return JSON.stringify(
        rawValue
          .split(',')
          .map((item) =>
            item.trim()
          )
          .filter(Boolean)
      );
    }

    return JSON.stringify([]);
  }

  /*
  |--------------------------------------------------------------------------
  | Array
  |--------------------------------------------------------------------------
  */

  if (
    Array.isArray(rawValue)
  ) {
    return JSON.stringify(
      rawValue
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Object
  |--------------------------------------------------------------------------
  */

  if (
    typeof rawValue === 'object' &&
    rawValue !== null
  ) {
    return JSON.stringify(
      rawValue
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Normal value
  |--------------------------------------------------------------------------
  */

  return String(
    rawValue ?? ''
  );
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    /*
    |--------------------------------------------------------------------------
    | Load Customer Settings
    |--------------------------------------------------------------------------
    */

    const settings =
      await prisma.setting.findMany({
        where: {
          group: SETTING_GROUP,
        },

        orderBy: {
          id: 'asc',
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Start With Defaults
    |--------------------------------------------------------------------------
    */

    const data = {
      ...DEFAULT_SETTINGS,
    };

    /*
    |--------------------------------------------------------------------------
    | Replace Defaults With DB Values
    |--------------------------------------------------------------------------
    */

    settings.forEach(
      (setting) => {
        data[setting.key] =
          decodeValue(
            setting.value,
            setting.key
          );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | LOAD ALL CUSTOMER CUSTOM FIELDS
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | fieldto = "customers"
    |
    */

    const customFields =
      await prisma.customField.findMany({
        where: {
          fieldto: 'customers',
        },

        orderBy: [
          {
            fieldOrder: 'asc',
          },
          {
            id: 'asc',
          },
        ],
      });

    /*
    |--------------------------------------------------------------------------
    | LOAD SAVED CUSTOMER CUSTOM FIELD VALUES
    |--------------------------------------------------------------------------
    |
    | entityId MUST be String.
    |
    */

    const customFieldValues =
      await prisma.customFieldValue.findMany({
        where: {
          entityType:
            CUSTOMER_ENTITY_TYPE,

          entityId:
            CUSTOMER_ENTITY_ID,
        },

        include: {
          customField: true,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Build Saved Values
    |--------------------------------------------------------------------------
    */

    const savedValues = {};

    customFieldValues.forEach(
      (item) => {
        if (!item.customField) {
          return;
        }

        /*
        | Only customers fields
        */

        if (
          item.customField.fieldto !==
          'customers'
        ) {
          return;
        }

        /*
        | Disabled field
        */

        if (
          item.customField.disabled ===
          true
        ) {
          return;
        }

        savedValues[
          item.customField.slug
        ] =
          decodeCustomFieldValue(
            item.value,
            item.customField
          );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Build Final Custom Field Values
    |--------------------------------------------------------------------------
    */

    const customValues = {};

    customFields.forEach(
      (field) => {
        /*
        |--------------------------------------------------------------------------
        | Saved value exists
        |--------------------------------------------------------------------------
        */

        if (
          Object.prototype.hasOwnProperty.call(
            savedValues,
            field.slug
          )
        ) {
          customValues[
            field.slug
          ] =
            savedValues[
              field.slug
            ];

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | File
        |--------------------------------------------------------------------------
        */

        if (
          field.type === 'file'
        ) {
          customValues[
            field.slug
          ] = '';

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Checkbox
        |--------------------------------------------------------------------------
        */

        if (
          field.type === 'checkbox'
        ) {
          if (
            field.options
          ) {
            customValues[
              field.slug
            ] = [];

          } else {
            customValues[
              field.slug
            ] =
              field.defaultValue ===
                'true' ||
              field.defaultValue ===
                '1';
          }

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Multiselect
        |--------------------------------------------------------------------------
        */

        if (
          field.type ===
          'multiselect'
        ) {
          if (
            field.defaultValue
          ) {
            try {
              const parsed =
                JSON.parse(
                  field.defaultValue
                );

              if (
                Array.isArray(parsed)
              ) {
                customValues[
                  field.slug
                ] = parsed;

                return;
              }
            } catch {
              // Continue
            }

            customValues[
              field.slug
            ] =
              String(
                field.defaultValue
              )
                .split(',')
                .map((item) =>
                  item.trim()
                )
                .filter(Boolean);

            return;
          }

          customValues[
            field.slug
          ] = [];

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Normal Field
        |--------------------------------------------------------------------------
        */

        customValues[
          field.slug
        ] =
          field.defaultValue ??
          '';
      }
    );

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      data,

      custom_fields:
        customFields,

      custom_field_values:
        customValues,
    });

  } catch (error) {
    console.error(
      'Customer settings GET error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          'Failed to load customer settings',

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

export async function POST(
  request
) {
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
    | Customer Settings
    |--------------------------------------------------------------------------
    */

    let customerSettings = {};

    const customerSettingsRaw =
      formData.get(
        'customerSettings'
      );

    if (
      customerSettingsRaw
    ) {
      try {
        customerSettings =
          JSON.parse(
            String(
              customerSettingsRaw
            )
          );
      } catch (error) {
        console.error(
          'Invalid customerSettings JSON:',
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid customer settings data.',
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Custom Field Values
    |--------------------------------------------------------------------------
    */

    let customFields = {};

    const customFieldsRaw =
      formData.get(
        'customFields'
      );

    if (
      customFieldsRaw
    ) {
      try {
        customFields =
          JSON.parse(
            String(
              customFieldsRaw
            )
          );
      } catch (error) {
        console.error(
          'Invalid customFields JSON:',
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid custom field data.',
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Load Customer Custom Fields
    |--------------------------------------------------------------------------
    */

    const customerFields =
      await prisma.customField.findMany({
        where: {
          fieldto: 'customers',
        },

        select: {
          id: true,
          slug: true,
          type: true,
          options: true,
          disabled: true,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | Field Map
    |--------------------------------------------------------------------------
    */

    const fieldMap =
      new Map();

    customerFields.forEach(
      (field) => {
        fieldMap.set(
          field.slug,
          field
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Make Upload Directory
    |--------------------------------------------------------------------------
    */

    await fs.mkdir(
      UPLOAD_DIR,
      {
        recursive: true,
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Uploaded Files
    |--------------------------------------------------------------------------
    */

    const uploadedFiles = {};

    /*
    |--------------------------------------------------------------------------
    | Process File Fields
    |--------------------------------------------------------------------------
    */

    for (
      const field of customerFields
    ) {
      if (
        field.type !== 'file'
      ) {
        continue;
      }

      const fileKey =
        `customFile_${field.slug}`;

      const uploadedFile =
        formData.get(
          fileKey
        );

      /*
      | No file
      */

      if (
        !uploadedFile ||
        typeof uploadedFile ===
          'string' ||
        uploadedFile.size === 0
      ) {
        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | Allowed Extensions
      |--------------------------------------------------------------------------
      */

      const allowedExtensions =
        getAllowedExtensions(
          field.options
        );

      const extension =
        path
          .extname(
            uploadedFile.name
          )
          .toLowerCase()
          .replace(
            /^\./,
            ''
          );

      if (
        allowedExtensions.length >
          0 &&
        !allowedExtensions.includes(
          extension
        )
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              `Invalid file type for "${field.slug}". Allowed types: ${allowedExtensions.join(', ')}`,
          },
          {
            status: 400,
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | File Size
      |--------------------------------------------------------------------------
      */

      const MAX_FILE_SIZE =
        10 * 1024 * 1024;

      if (
        uploadedFile.size >
        MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              `File "${uploadedFile.name}" is too large. Maximum file size is 10 MB.`,
          },
          {
            status: 400,
          }
        );
      }

      /*
      |--------------------------------------------------------------------------
      | File Name
      |--------------------------------------------------------------------------
      */

      const safeFileName =
        createSafeFileName(
          uploadedFile.name
        );

      const filePath =
        path.join(
          UPLOAD_DIR,
          safeFileName
        );

      /*
      |--------------------------------------------------------------------------
      | Save File
      |--------------------------------------------------------------------------
      */

      const arrayBuffer =
        await uploadedFile.arrayBuffer();

      const buffer =
        Buffer.from(
          arrayBuffer
        );

      await fs.writeFile(
        filePath,
        buffer
      );

      /*
      |--------------------------------------------------------------------------
      | Public URL
      |--------------------------------------------------------------------------
      */

      uploadedFiles[
        field.slug
      ] =
        `/uploads/custom-fields/${safeFileName}`;
    }

    /*
    |--------------------------------------------------------------------------
    | DATABASE TRANSACTION
    |--------------------------------------------------------------------------
    */

    await prisma.$transaction(
      async (tx) => {
        /*
        |--------------------------------------------------------------------------
        | Save Normal Customer Settings
        |--------------------------------------------------------------------------
        */

        for (
          const [
            key,
            rawValue,
          ] of Object.entries(
            customerSettings
          )
        ) {
          /*
          | Skip custom fields
          */

          if (
            key ===
            'customFields'
          ) {
            continue;
          }

          if (
            rawValue === undefined
          ) {
            continue;
          }

          const value =
            encodeValue(
              rawValue
            );

          await tx.setting.upsert({
            where: {
              key,
            },

            update: {
              value,

              group:
                SETTING_GROUP,
            },

            create: {
              group:
                SETTING_GROUP,

              key,

              value,
            },
          });
        }

        /*
        |--------------------------------------------------------------------------
        | Save Customer Custom Fields
        |--------------------------------------------------------------------------
        */

        for (
          const [
            slug,
            rawValue,
          ] of Object.entries(
            customFields
          )
        ) {
          const field =
            fieldMap.get(
              slug
            );

          /*
          | Unknown field
          */

          if (!field) {
            continue;
          }

          /*
          | Disabled field
          */

          if (
            field.disabled
          ) {
            continue;
          }

          /*
          |--------------------------------------------------------------------------
          | File Field
          |--------------------------------------------------------------------------
          */

          if (
            field.type ===
            'file'
          ) {
            /*
            | Only save when a new
            | file was uploaded.
            */

            if (
              uploadedFiles[
                slug
              ]
            ) {
              await tx.customFieldValue.upsert(
                {
                  where: {
                    customFieldId_entityType_entityId:
                      {
                        customFieldId:
                          field.id,

                        entityType:
                          CUSTOMER_ENTITY_TYPE,

                        entityId:
                          CUSTOMER_ENTITY_ID,
                      },
                  },

                  update: {
                    value:
                      uploadedFiles[
                        slug
                      ],
                  },

                  create: {
                    customFieldId:
                      field.id,

                    entityType:
                      CUSTOMER_ENTITY_TYPE,

                    entityId:
                      CUSTOMER_ENTITY_ID,

                    value:
                      uploadedFiles[
                        slug
                      ],
                  },
                }
              );
            }

            continue;
          }

          /*
          |--------------------------------------------------------------------------
          | Encode Value
          |--------------------------------------------------------------------------
          */

          const value =
            encodeCustomFieldValue(
              rawValue,
              field
            );

          /*
          |--------------------------------------------------------------------------
          | UPSERT CUSTOM FIELD VALUE
          |--------------------------------------------------------------------------
          */

          await tx.customFieldValue.upsert(
            {
              where: {
                customFieldId_entityType_entityId:
                  {
                    customFieldId:
                      field.id,

                    entityType:
                      CUSTOMER_ENTITY_TYPE,

                    entityId:
                      CUSTOMER_ENTITY_ID,
                  },
              },

              update: {
                value,
              },

              create: {
                customFieldId:
                  field.id,

                entityType:
                  CUSTOMER_ENTITY_TYPE,

                entityId:
                  CUSTOMER_ENTITY_ID,

                value,
              },
            }
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      message:
        'Customer settings saved successfully',

      files:
        uploadedFiles,
    });

  } catch (error) {
    console.error(
      'Customer settings POST error:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          'Failed to save customer settings',

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