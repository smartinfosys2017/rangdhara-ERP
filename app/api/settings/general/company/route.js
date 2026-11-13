import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';


/*
|--------------------------------------------------------------------------
| Company Entity
|--------------------------------------------------------------------------
*/

const COMPANY_ENTITY_TYPE = 'company';
const COMPANY_ENTITY_ID = '1';


/*
|--------------------------------------------------------------------------
| Upload Directory
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
| Helper: Create Safe File Name
|--------------------------------------------------------------------------
*/

function createSafeFileName(fileName) {

  const extension =
    path.extname(fileName || '').toLowerCase();

  const baseName =
    path.basename(
      fileName || 'file',
      extension
    )
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  const uniqueId =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;

  return `${baseName || 'file'}-${uniqueId}${extension}`;
}


/*
|--------------------------------------------------------------------------
| Helper: Parse Allowed Extensions
|--------------------------------------------------------------------------
*/

function getAllowedExtensions(options) {

  return String(options || '')
    .split(/[\n,]+/)
    .map((item) =>
      item
        .trim()
        .toLowerCase()
        .replace(/^\./, '')
    )
    .filter(Boolean);
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
    | Company Settings
    |--------------------------------------------------------------------------
    */

    const settings =
      await prisma.setting.findMany({
        where: {
          group: 'company',
        },
      });


    const data = {};

    settings.forEach((setting) => {

      data[setting.key] =
        setting.value || '';

    });


    /*
    |--------------------------------------------------------------------------
    | Company Custom Fields
    |--------------------------------------------------------------------------
    */

    const customFields =
      await prisma.customField.findMany({

        where: {
          fieldto: 'company',
          disabled: false,
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
    | Saved Custom Field Values
    |--------------------------------------------------------------------------
    */

    const customFieldValues =
      await prisma.customFieldValue.findMany({

        where: {
          entityType:
            COMPANY_ENTITY_TYPE,

          entityId:
            COMPANY_ENTITY_ID,
        },

        include: {
          customField: true,
        },

      });


    const savedValues = {};


    customFieldValues.forEach((item) => {

      if (!item.customField) {
        return;
      }


      /*
      | Only company fields
      */

      if (
        item.customField.fieldto !== 'company' ||
        item.customField.disabled === true
      ) {
        return;
      }


      /*
      | File field
      |
      | File path is already stored as a normal
      | string, so don't JSON decode it.
      */

      if (
        item.customField.type === 'file'
      ) {

        savedValues[
          item.customField.slug
        ] = item.value || '';

        return;
      }


      /*
      | Empty value
      */

      if (
        item.value === null ||
        item.value === undefined ||
        item.value === ''
      ) {
        return;
      }


      let value =
        item.value;


      /*
      | Decode JSON values
      */

      try {

        if (
          typeof value === 'string' &&
          (
            value.startsWith('[') ||
            value.startsWith('{')
          )
        ) {

          value =
            JSON.parse(value);

        }

      } catch (error) {

        // Keep original string

      }


      savedValues[
        item.customField.slug
      ] = value;

    });


    /*
    |--------------------------------------------------------------------------
    | Build Final Custom Values
    |--------------------------------------------------------------------------
    */

    const customValues = {};


    customFields.forEach((field) => {

      /*
      |--------------------------------------------------------------------------
      | Saved value
      |--------------------------------------------------------------------------
      */

      if (
        Object.prototype.hasOwnProperty.call(
          savedValues,
          field.slug
        )
      ) {

        customValues[field.slug] =
          savedValues[field.slug];

        return;

      }


      /*
      |--------------------------------------------------------------------------
      | File default
      |--------------------------------------------------------------------------
      */

      if (field.type === 'file') {

        customValues[field.slug] =
          '';

        return;

      }


      /*
      |--------------------------------------------------------------------------
      | Checkbox
      |--------------------------------------------------------------------------
      */

      if (field.type === 'checkbox') {

        customValues[field.slug] =
          field.defaultValue === 'true' ||
          field.defaultValue === '1';

        return;

      }


      /*
      |--------------------------------------------------------------------------
      | Multiselect
      |--------------------------------------------------------------------------
      */

      if (field.type === 'multiselect') {

        if (
          field.defaultValue &&
          typeof field.defaultValue === 'string'
        ) {

          try {

            if (
              field.defaultValue.startsWith('[')
            ) {

              customValues[field.slug] =
                JSON.parse(
                  field.defaultValue
                );

              return;

            }

          } catch (error) {

            // Continue

          }


          customValues[field.slug] =
            field.defaultValue
              .split(',')
              .map(
                (item) =>
                  item.trim()
              )
              .filter(Boolean);

          return;

        }


        customValues[field.slug] =
          [];

        return;

      }


      /*
      |--------------------------------------------------------------------------
      | Normal field
      |--------------------------------------------------------------------------
      */

      customValues[field.slug] =
        field.defaultValue ?? '';

    });


    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({

      success: true,

      data: {

        ...data,

        custom_fields:
          customFields,

        custom_field_values:
          customValues,

      },

    });

  } catch (error) {

    console.error(
      'Company GET error:',
      error
    );


    return NextResponse.json(

      {
        success: false,

        message:
          'Failed to load company information',

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
|
| Supports:
|
| - Normal company settings
| - Text custom fields
| - Checkbox
| - Multiselect
| - File upload
|
*/

export async function POST(request) {
  try {
    const formData = await request.formData();

    const companyName = formData.get('companyName') || '';
    const address = formData.get('address') || '';
    const city = formData.get('city') || '';
    const state = formData.get('state') || '';
    const countryCode = formData.get('countryCode') || '';
    const zipCode = formData.get('zipCode') || '';
    const phone = formData.get('phone') || '';
    const vatNumber = formData.get('vatNumber') || '';
    const companyInformationFormat =
      formData.get('companyInformationFormat') || '';

    let customFields = {};

    const customFieldsRaw = formData.get('customFields');

    if (customFieldsRaw) {
      try {
        customFields = JSON.parse(String(customFieldsRaw));
      } catch (error) {
        console.error('Invalid customFields JSON:', error);

        return NextResponse.json(
          {
            success: false,
            message: 'Invalid custom field data.',
          },
          {
            status: 400,
          }
        );
      }
    }

    const FILE_TYPES = [
      'file',
      'image',
      'multi_file',
      'multi_image',
      'multi_attachment',
    ];

    const MULTI_FILE_TYPES = [
      'multi_file',
      'multi_image',
      'multi_attachment',
    ];

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    const companyFields = await prisma.customField.findMany({
      where: {
        fieldto: 'company',
      },
      select: {
        id: true,
        slug: true,
        type: true,
        options: true,
        disabled: true,
      },
    });

    const fieldMap = new Map();

    companyFields.forEach((field) => {
      fieldMap.set(field.slug, field);
    });

    await fs.mkdir(UPLOAD_DIR, {
      recursive: true,
    });

    const uploadedFiles = {};

    for (const field of companyFields) {
      if (!FILE_TYPES.includes(field.type)) {
        continue;
      }

      if (field.disabled) {
        continue;
      }

      const fileKey = `customFile_${field.slug}`;

      let files = formData.getAll(fileKey);

      files = files.filter(
        (file) =>
          file &&
          typeof file !== 'string' &&
          typeof file.size === 'number' &&
          file.size > 0
      );

      if (!files.length) {
        continue;
      }

      const isMultiple = MULTI_FILE_TYPES.includes(field.type);

      if (!isMultiple) {
        files = [files[0]];
      }

      const allowedExtensions = getAllowedExtensions(
        field.options
      );

      const fieldUploadedFiles = [];

      for (const uploadedFile of files) {
        const extension = path
          .extname(uploadedFile.name || '')
          .toLowerCase()
          .replace(/^\./, '');

        if (
          allowedExtensions.length > 0 &&
          !allowedExtensions.includes(extension)
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `Invalid file type for "${field.slug}". Allowed types: ${allowedExtensions.join(
                ', '
              )}`,
            },
            {
              status: 400,
            }
          );
        }

        if (
          ['image', 'multi_image'].includes(field.type)
        ) {
          const isImage =
            uploadedFile.type &&
            uploadedFile.type.startsWith('image/');

          if (!isImage) {
            return NextResponse.json(
              {
                success: false,
                message: `Only image files are allowed for "${field.slug}".`,
              },
              {
                status: 400,
              }
            );
          }
        }

        if (uploadedFile.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              success: false,
              message: `File "${uploadedFile.name}" is too large. Maximum file size is 10 MB.`,
            },
            {
              status: 400,
            }
          );
        }

        const safeFileName = createSafeFileName(
          uploadedFile.name
        );

        const filePath = path.join(
          UPLOAD_DIR,
          safeFileName
        );

        const arrayBuffer =
          await uploadedFile.arrayBuffer();

        const buffer = Buffer.from(arrayBuffer);

        await fs.writeFile(
          filePath,
          buffer
        );

        const fileUrl =
          `/uploads/custom-fields/${safeFileName}`;

        fieldUploadedFiles.push(fileUrl);
      }

      if (isMultiple) {
        uploadedFiles[field.slug] =
          fieldUploadedFiles;
      } else {
        uploadedFiles[field.slug] =
          fieldUploadedFiles[0] || '';
      }
    }

    await prisma.$transaction(async (tx) => {
      const settings = {
        company_name: companyName,
        address: address,
        city: city,
        state: state,
        country_code: countryCode,
        zip_code: zipCode,
        phone: phone,
        vat_number: vatNumber,
        company_information_format:
          companyInformationFormat,
      };

      for (const [key, settingValue] of Object.entries(
        settings
      )) {
        await tx.setting.upsert({
          where: {
            key,
          },
          update: {
            value: String(settingValue),
            group: 'company',
          },
          create: {
            group: 'company',
            key,
            value: String(settingValue),
          },
        });
      }

      for (const [slug, rawValue] of Object.entries(
        customFields
      )) {
        const field = fieldMap.get(slug);

        if (!field) {
          continue;
        }

        if (field.disabled) {
          continue;
        }

        let value = '';

        if (FILE_TYPES.includes(field.type)) {
          const newFiles = uploadedFiles[slug];

          if (newFiles === undefined) {
            continue;
          }

          const isMultiple =
            MULTI_FILE_TYPES.includes(field.type);

          if (isMultiple) {
            let existingFiles = [];

            const existingRecord =
              await tx.customFieldValue.findUnique({
                where: {
                  customFieldId_entityType_entityId: {
                    customFieldId: field.id,
                    entityType:
                      COMPANY_ENTITY_TYPE,
                    entityId:
                      COMPANY_ENTITY_ID,
                  },
                },
                select: {
                  value: true,
                },
              });

            if (existingRecord?.value) {
              try {
                const parsed =
                  JSON.parse(
                    existingRecord.value
                  );

                if (Array.isArray(parsed)) {
                  existingFiles = parsed;
                } else if (
                  typeof parsed === 'string' &&
                  parsed
                ) {
                  existingFiles = [parsed];
                }
              } catch {
                if (
                  typeof existingRecord.value ===
                    'string' &&
                  existingRecord.value.trim()
                ) {
                  existingFiles = [
                    existingRecord.value,
                  ];
                }
              }
            }

            const newFileList = Array.isArray(
              newFiles
            )
              ? newFiles
              : [newFiles];

            const mergedFiles = [
              ...existingFiles,
              ...newFileList.filter(Boolean),
            ];

            value = JSON.stringify(
              mergedFiles
            );
          } else {
            value = String(
              newFiles || ''
            );
          }

          await tx.customFieldValue.upsert({
            where: {
              customFieldId_entityType_entityId: {
                customFieldId: field.id,
                entityType:
                  COMPANY_ENTITY_TYPE,
                entityId:
                  COMPANY_ENTITY_ID,
              },
            },
            update: {
              value,
            },
            create: {
              customFieldId: field.id,
              entityType:
                COMPANY_ENTITY_TYPE,
              entityId:
                COMPANY_ENTITY_ID,
              value,
            },
          });

          continue;
        }

        if (field.type === 'checkbox') {
          if (field.options) {
            let checkboxValues = [];

            if (Array.isArray(rawValue)) {
              checkboxValues = rawValue;
            } else if (
              typeof rawValue === 'string'
            ) {
              try {
                const parsed =
                  JSON.parse(rawValue);

                if (Array.isArray(parsed)) {
                  checkboxValues = parsed;
                } else {
                  checkboxValues = [
                    rawValue,
                  ];
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

            value =
              JSON.stringify(
                checkboxValues
              );
          } else {
            value =
              rawValue === true ||
              rawValue === 'true' ||
              rawValue === 1 ||
              rawValue === '1'
                ? 'true'
                : 'false';
          }
        } else if (
          Array.isArray(rawValue)
        ) {
          value =
            JSON.stringify(
              rawValue
            );
        } else if (
          typeof rawValue === 'object' &&
          rawValue !== null
        ) {
          value =
            JSON.stringify(
              rawValue
            );
        } else {
          value = String(
            rawValue ?? ''
          );
        }

        await tx.customFieldValue.upsert({
          where: {
            customFieldId_entityType_entityId: {
              customFieldId: field.id,
              entityType:
                COMPANY_ENTITY_TYPE,
              entityId:
                COMPANY_ENTITY_ID,
            },
          },
          update: {
            value,
          },
          create: {
            customFieldId:
              field.id,
            entityType:
              COMPANY_ENTITY_TYPE,
            entityId:
              COMPANY_ENTITY_ID,
            value,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message:
        'Company information saved successfully',
      files: uploadedFiles,
    });
  } catch (error) {
    console.error(
      'Company POST error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Failed to save company information',
        error:
          process.env.NODE_ENV ===
          'development'
            ? error?.message
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}