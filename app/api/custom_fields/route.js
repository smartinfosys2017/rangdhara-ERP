import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
import { randomUUID } from "crypto";

function generateReferenceCode() {
  return `CustomField-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .split("-")[0]
    .toUpperCase()}`;
}
/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const VALID_TYPES = [
  "input",
  "number",
  "textarea",
  "email",
  "phone",
  "url",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "date_picker",
  "time_picker",
  "date_picker_time",
  "colorpicker",
  "link",
  "file",
  "multi_file",
  "multi_attachment",
  "image",
  "multi_image",
];

const VALID_FIELD_TO = ["company", "leads", "customers", "tasks", "transaction","employee"];

/*
|--------------------------------------------------------------------------
| File Based Field Types
|--------------------------------------------------------------------------
|
| File validation will ONLY run for these types.
|
*/

const FILE_TYPES = ["file", "multi_attachment", "image", "multi_image"];

/*
|--------------------------------------------------------------------------
| Allowed Sorting Columns
|--------------------------------------------------------------------------
*/

const ALLOWED_SORT_FIELDS = [
  "id",
  "fieldto",
  "name",
  "slug",
  "type",
  "fieldOrder",
  "bsColumn",
  "disabled",
  "required",
  "showOnTable",
  "showOnPdf",
  "showOnClientPortal",
  "showOnTicketForm",
  "createdAt",
  "updatedAt",
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Create slug
 */
const createSlug = (value = "") => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

/**
 * Convert value to boolean
 */
const toBoolean = (value) => {
  return value === true || value === "true" || value === 1 || value === "1";
};

/**
 * Normalize options
 */
const normalizeOptions = (options) => {
  if (options === null || options === undefined) {
    return null;
  }

  const value = String(options).trim();

  return value || null;
};

/**
 * Normalize field order
 */
const normalizeFieldOrder = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.floor(number);
};

/**
 * Normalize bootstrap column
 */
const normalizeBsColumn = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 12;
  }

  return Math.min(Math.max(Math.floor(number), 1), 12);
};

/**
 * Normalize file extensions
 */
const normalizeFileOptions = (options) => {
  if (!options) {
    return null;
  }

  const extensions = [
    ...new Set(
      String(options)
        .split(",")
        .map((item) => item.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean),
    ),
  ];

  return extensions.join(", ");
};

/**
 * Normalize ID
 *
 * Prisma CustomField.id is String.
 */
const normalizeId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const id = String(value).trim();

  return id || null;
};

/*
|--------------------------------------------------------------------------
| Validate Custom Field
|--------------------------------------------------------------------------
*/

const validateField = ({ fieldto, name, type, options }) => {
  /*
  |--------------------------------------------------------------------------
  | Field Belongs To
  |--------------------------------------------------------------------------
  */

  if (!fieldto) {
    return "Field Belongs to is required.";
  }

  if (!VALID_FIELD_TO.includes(fieldto)) {
    return "Invalid Field Belongs to value.";
  }

  /*
  |--------------------------------------------------------------------------
  | Name
  |--------------------------------------------------------------------------
  */

  if (!name?.trim()) {
    return "Field Name is required.";
  }

  /*
  |--------------------------------------------------------------------------
  | Type
  |--------------------------------------------------------------------------
  */

  if (!type) {
    return "Field Type is required.";
  }

  /*
  |--------------------------------------------------------------------------
  | Allow All Valid Field Types
  |--------------------------------------------------------------------------
  */

  if (!VALID_TYPES.includes(type)) {
    return `Invalid field type: ${type}.`;
  }

  /*
  |--------------------------------------------------------------------------
  | Select / Multi Select / Radio / Checkbox
  |--------------------------------------------------------------------------
  */

  if (["select", "multiselect", "radio", "checkbox"].includes(type)) {
    if (!options?.trim()) {
      return "Options are required.";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | File / Multi Attachment / Image / Multi Image
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | This validation ONLY runs for FILE_TYPES.
  |
  */

  if (FILE_TYPES.includes(type)) {
    if (!options?.trim()) {
      return "Allowed file types are required.";
    }

    const extensions = String(options)
      .split(",")
      .map((item) => item.trim().toLowerCase().replace(/^\./, ""))
      .filter(Boolean);

    if (!extensions.length) {
      return "Please enter at least one allowed file type.";
    }

    const invalidExtensions = extensions.filter(
      (extension) => !/^[a-z0-9]+$/.test(extension),
    );

    if (invalidExtensions.length) {
      return `Invalid file type: ${invalidExtensions.join(", ")}`;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Other Types
  |--------------------------------------------------------------------------
  |
  | input
  | number
  | textarea
  | email
  | phone
  | url
  | date_picker
  | time_picker
  | date_picker_time
  | colorpicker
  | link
  | multi_file
  |
  | No special options validation.
  |
  */

  return null;
};

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Get Custom Fields
|--------------------------------------------------------------------------
*/

export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("custom-fields");

    if (accessError) {
      return accessError;
    }
    const { searchParams } = new URL(request.url);

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const pageParam = Number(searchParams.get("page"));

    const limitParam = Number(searchParams.get("limit"));

    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 10;

    const skip = (page - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    const search = searchParams.get("query")?.trim() || "";

    /*
    |--------------------------------------------------------------------------
    | Field To
    |--------------------------------------------------------------------------
    */

    const fieldto = searchParams.get("fieldto")?.trim() || "";

    if (fieldto && !VALID_FIELD_TO.includes(fieldto)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Field Belongs to value.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Sorting
    |--------------------------------------------------------------------------
    */

    const requestedSortBy = searchParams.get("sortBy") || "id";

    const sortBy = ALLOWED_SORT_FIELDS.includes(requestedSortBy)
      ? requestedSortBy
      : "id";

    const requestedSortOrder = searchParams.get("sortOrder") || "desc";

    const sortOrder = requestedSortOrder === "asc" ? "asc" : "desc";

    /*
    |--------------------------------------------------------------------------
    | Where
    |--------------------------------------------------------------------------
    */

    const where = { deletedAt: null };

    /*
    |--------------------------------------------------------------------------
    | Field To Filter
    |--------------------------------------------------------------------------
    */

    // Filter by fieldto
    if (fieldto) {
      where.fieldto = {
        equals: fieldto,
        mode: "insensitive",
      };
    }
    /*
    |--------------------------------------------------------------------------
    | Search Filter
    |--------------------------------------------------------------------------
    */

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          fieldto: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          type: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Get Total
    |--------------------------------------------------------------------------
    */

    const total = await prisma.customField.count({
      where,
    });

    /*
    |--------------------------------------------------------------------------
    | Get Records
    |--------------------------------------------------------------------------
    */

    const fields = await prisma.customField.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,
      data: fields,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        search,
        fieldto,
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    console.error("GET CUSTOM FIELDS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load custom fields.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Create Custom Field
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("custom-fields");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const {
      fieldto,
      name,
      slug,
      type,
      options,
      defaultValue,
      fieldOrder,
      bsColumn,
      disabled,
      displayInline,
      onlyAdmin,
      disallowClientToEdit,
      required,
      showOnTable,
      showOnPdf,
      showOnClientPortal,
      showOnTicketForm,
    } = body;

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    const validationError = validateField({
      fieldto,
      name,
      type,
      options,
    });

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Slug
    |--------------------------------------------------------------------------
    */

    const finalSlug = createSlug(slug || name);

    if (!finalSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid slug is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Duplicate Slug
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.customField.findUnique({
      where: {
        slug: finalSlug,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug already exists.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Options
    |--------------------------------------------------------------------------
    */

    let normalizedOptions = normalizeOptions(options);

    /*
    |--------------------------------------------------------------------------
    | Normalize File Options ONLY
    |--------------------------------------------------------------------------
    */

    if (FILE_TYPES.includes(type)) {
      normalizedOptions = normalizeFileOptions(normalizedOptions);
    }

    /*
    |--------------------------------------------------------------------------
    | Generate String ID
    |--------------------------------------------------------------------------
    */

    const fieldId = crypto.randomUUID();

    /*
    |--------------------------------------------------------------------------
    | Create
    |--------------------------------------------------------------------------
    */

    const field = await prisma.customField.create({
      data: {
        id: fieldId,

        fieldto,

        name: name.trim(),

        slug: finalSlug,

        type,

        options: normalizedOptions,

        defaultValue:
          defaultValue !== undefined &&
            defaultValue !== null &&
            String(defaultValue).trim()
            ? String(defaultValue).trim()
            : null,

        fieldOrder: normalizeFieldOrder(fieldOrder),

        bsColumn: normalizeBsColumn(bsColumn),

        disabled: toBoolean(disabled),

        displayInline: toBoolean(displayInline),

        onlyAdmin: toBoolean(onlyAdmin),

        disallowClientToEdit: toBoolean(disallowClientToEdit),

        required: toBoolean(required),

        showOnTable: toBoolean(showOnTable),

        showOnPdf: toBoolean(showOnPdf),

        showOnClientPortal: toBoolean(showOnClientPortal),

        showOnTicketForm: toBoolean(showOnTicketForm),
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "create",
      userId: user?.id ? String(user.id) : null,
      entityId: String(field.id),
      entityType: "settings.customfield",
      referenceCode,
      description: `CustomField created: ${field.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,
        message: "Custom field created successfully.",
        data: field,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("CREATE CUSTOM FIELD ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "A custom field with this slug already exists.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create custom field.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT
|--------------------------------------------------------------------------
| Update Custom Field
|--------------------------------------------------------------------------
*/

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("custom-fields");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const {
      id,
      fieldto,
      name,
      slug,
      type,
      options,
      defaultValue,
      fieldOrder,
      bsColumn,
      disabled,
      displayInline,
      onlyAdmin,
      disallowClientToEdit,
      required,
      showOnTable,
      showOnPdf,
      showOnClientPortal,
      showOnTicketForm,
    } = body;

    /*
    |--------------------------------------------------------------------------
    | ID
    |--------------------------------------------------------------------------
    */

    const fieldId = normalizeId(id);

    if (!fieldId) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid custom field ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate
    |--------------------------------------------------------------------------
    */

    const validationError = validateField({
      fieldto,
      name,
      type,
      options,
    });

    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Slug
    |--------------------------------------------------------------------------
    */

    const finalSlug = createSlug(slug || name);

    if (!finalSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid slug is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing Record
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.customField.findUnique({
      where: {
        id: fieldId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Custom field not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Duplicate Slug
    |--------------------------------------------------------------------------
    */

    const duplicate = await prisma.customField.findFirst({
      where: {
        slug: finalSlug,
        NOT: {
          id: fieldId,
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "Slug already exists.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize Options
    |--------------------------------------------------------------------------
    */

    let normalizedOptions = normalizeOptions(options);

    /*
    |--------------------------------------------------------------------------
    | Normalize File Options ONLY
    |--------------------------------------------------------------------------
    */

    if (FILE_TYPES.includes(type)) {
      normalizedOptions = normalizeFileOptions(normalizedOptions);
    }

    /*
    |--------------------------------------------------------------------------
    | Update
    |--------------------------------------------------------------------------
    */

    const field = await prisma.customField.update({
      where: {
        id: fieldId,
      },

      data: {
        fieldto,

        name: name.trim(),

        slug: finalSlug,

        type,

        options: normalizedOptions,

        defaultValue:
          defaultValue !== undefined &&
            defaultValue !== null &&
            String(defaultValue).trim()
            ? String(defaultValue).trim()
            : null,

        fieldOrder: normalizeFieldOrder(fieldOrder),

        bsColumn: normalizeBsColumn(bsColumn),

        disabled: toBoolean(disabled),

        displayInline: toBoolean(displayInline),

        onlyAdmin: toBoolean(onlyAdmin),

        disallowClientToEdit: toBoolean(disallowClientToEdit),

        required: toBoolean(required),

        showOnTable: toBoolean(showOnTable),

        showOnPdf: toBoolean(showOnPdf),

        showOnClientPortal: toBoolean(showOnClientPortal),

        showOnTicketForm: toBoolean(showOnTicketForm),
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "update",
      userId: user?.id ? String(user.id) : null,
      entityId: String(field.id),
      entityType: "settings.customfield",
      referenceCode,
      description: `CustomField updated: ${field.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,
      message: "Custom field updated successfully.",
      data: field,
    });
  } catch (error) {
    console.error("UPDATE CUSTOM FIELD ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "A custom field with this slug already exists.",
        },
        {
          status: 400,
        },
      );
    }

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: "Custom field not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (error?.name === "PrismaClientValidationError") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid custom field data.",
          error:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update custom field.",
      },
      {
        status: 500,
      },
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
    const accessError = await checkMenuAccess("custom-fields");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    /*
    |--------------------------------------------------------------------------
    | ID
    |--------------------------------------------------------------------------
    */

    const fieldId = normalizeId(body?.id);

    /*
    |--------------------------------------------------------------------------
    | Validate ID
    |--------------------------------------------------------------------------
    */

    if (!fieldId) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid custom field ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Check Record
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.customField.findUnique({
      where: {
        id: fieldId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Custom field not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Only deletedAt is changed.
    |
    | lastSyncedAt is NOT changed.
    |
    */

    const deleted = await prisma.customField.update({
      where: {
        id: fieldId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    const user = await getAuthenticatedUser();
    const referenceCode = generateReferenceCode();

    await systemLog({
      event: "delete",
      userId: user?.id ? String(user.id) : null,
      entityId: String(existing.id),
      entityType: "settings.customfield",
      referenceCode,
      description: `CustomField deleted: ${existing.name}`,
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
    });
    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,
      message: "Custom field deleted successfully.",
      data: deleted,
    });
  } catch (error) {
    console.error("DELETE CUSTOM FIELD ERROR:", error);

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          message: "Custom field not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete custom field.",
      },
      {
        status: 500,
      },
    );
  }
}
