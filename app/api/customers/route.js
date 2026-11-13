import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { checkMenuAccess } from "@/lib/module-access";
/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const CUSTOMER_FIELD_TO = "customers";

const UPLOAD_FIELD_TYPES = ["file", "image", "multifile", "multiimage"];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function isUploadField(field) {
  return UPLOAD_FIELD_TYPES.includes(field?.type);
}

function isMultiUploadField(field) {
  return field?.type === "multifile" || field?.type === "multiimage";
}

function normalizeCustomFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| Parse JSON safely
|--------------------------------------------------------------------------
*/

function parseJSON(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/*
|--------------------------------------------------------------------------
| Parse checkbox
|--------------------------------------------------------------------------
*/

function parseBoolean(value, defaultValue = false) {
  if (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === 1 ||
    value === "on"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "0" ||
    value === 0 ||
    value === "off"
  ) {
    return false;
  }

  return defaultValue;
}

/*
|--------------------------------------------------------------------------
| Parse multiselect
|--------------------------------------------------------------------------
*/

function parseMultiValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  const parsed = parseJSON(value, null);

  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| Sanitize filename
|--------------------------------------------------------------------------
*/

function sanitizeFilename(filename) {
  return String(filename || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

/*
|--------------------------------------------------------------------------
| Get extension
|--------------------------------------------------------------------------
*/

function getFileExtension(file) {
  const originalName = file?.name || "";

  const originalExtension = path.extname(originalName);

  if (originalExtension) {
    return originalExtension.toLowerCase();
  }

  const mimeMap = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
  };

  return mimeMap[file?.type] || "";
}

/*
|--------------------------------------------------------------------------
| Check valid File
|--------------------------------------------------------------------------
*/

function isValidFile(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.name === "string"
  );
}

/*
|--------------------------------------------------------------------------
| Upload directory
|--------------------------------------------------------------------------
*/

async function getCustomerUploadDirectory(customerId) {
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "customers",
    String(customerId),
  );

  await fs.mkdir(uploadDirectory, {
    recursive: true,
  });

  return uploadDirectory;
}

/*
|--------------------------------------------------------------------------
| Save uploaded file
|--------------------------------------------------------------------------
*/

async function saveUploadedFile(file, customerId) {
  if (!isValidFile(file)) {
    return null;
  }

  if (file.size <= 0) {
    return null;
  }

  const uploadDirectory = await getCustomerUploadDirectory(customerId);

  const extension = getFileExtension(file);

  const baseName = sanitizeFilename(
    path.basename(file.name, path.extname(file.name)),
  );

  const uniqueId = crypto.randomBytes(8).toString("hex");

  const filename = `${baseName}-${Date.now()}-${uniqueId}${extension}`;

  const filePath = path.join(uploadDirectory, filename);

  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(filePath, buffer);

  return `/uploads/customers/${customerId}/${filename}`;
}

/*
|--------------------------------------------------------------------------
| Delete uploaded file
|--------------------------------------------------------------------------
|
| Only deletes files that belong to the customer upload directory.
|--------------------------------------------------------------------------
*/

async function deleteUploadedFile(fileUrl, customerId) {
  if (typeof fileUrl !== "string" || !fileUrl) {
    return;
  }

  const prefix = `/uploads/customers/${customerId}/`;

  if (!fileUrl.startsWith(prefix)) {
    return;
  }

  const filename = path.basename(fileUrl);

  if (!filename) {
    return;
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "customers",
    String(customerId),
    filename,
  );

  try {
    await fs.unlink(filePath);
  } catch {
    /*
     * File may already be deleted.
     */
  }
}

/*
|--------------------------------------------------------------------------
| Process custom field value
|--------------------------------------------------------------------------
*/

function normalizeCustomFieldValue(field, value, fallback = "") {
  if (!field) {
    return value;
  }

  /*
  |--------------------------------------------------------------------------
  | File / Image
  |--------------------------------------------------------------------------
  */

  if (field.type === "file" || field.type === "image") {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value[0] || fallback;
    }

    return fallback;
  }

  /*
  |--------------------------------------------------------------------------
  | Multi File / Multi Image
  |--------------------------------------------------------------------------
  */

  if (field.type === "multifile" || field.type === "multiimage") {
    return parseMultiValue(value);
  }

  /*
  |--------------------------------------------------------------------------
  | Checkbox
  |--------------------------------------------------------------------------
  */

  if (field.type === "checkbox") {
    return parseBoolean(
      value,
      field.defaultValue === "true" || field.defaultValue === "1",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Multiselect
  |--------------------------------------------------------------------------
  */

  if (field.type === "multiselect") {
    return parseMultiValue(value);
  }

  /*
  |--------------------------------------------------------------------------
  | JSON values
  |--------------------------------------------------------------------------
  */

  if (
    typeof value === "string" &&
    (value.startsWith("[") || value.startsWith("{"))
  ) {
    const parsed = parseJSON(value, null);

    if (parsed !== null) {
      return parsed;
    }
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| Get active customer custom fields
|--------------------------------------------------------------------------
*/

async function getCustomerFieldDefinitions() {
  return prisma.customField.findMany({
    where: {
      fieldto: CUSTOMER_FIELD_TO,
      disabled: false,
    },

    orderBy: [
      {
        fieldOrder: "asc",
      },
      {
        id: "asc",
      },
    ],
  });
}

/*
|--------------------------------------------------------------------------
| Build custom field values
|--------------------------------------------------------------------------
*/

function buildCustomFieldValues(fields, savedValues) {
  const saved = normalizeCustomFields(savedValues);

  const values = {};

  fields.forEach((field) => {
    /*
    |--------------------------------------------------------------------------
    | Existing saved value
    |--------------------------------------------------------------------------
    */

    if (Object.prototype.hasOwnProperty.call(saved, field.slug)) {
      values[field.slug] = normalizeCustomFieldValue(field, saved[field.slug]);

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | File
    |--------------------------------------------------------------------------
    */

    if (field.type === "file" || field.type === "image") {
      values[field.slug] = "";
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Multi File / Multi Image
    |--------------------------------------------------------------------------
    */

    if (field.type === "multifile" || field.type === "multiimage") {
      values[field.slug] = [];
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Checkbox
    |--------------------------------------------------------------------------
    */

    if (field.type === "checkbox") {
      values[field.slug] =
        field.defaultValue === "true" || field.defaultValue === "1";

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Multiselect
    |--------------------------------------------------------------------------
    */

    if (field.type === "multiselect") {
      values[field.slug] = parseMultiValue(field.defaultValue);

      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Normal
    |--------------------------------------------------------------------------
    */

    values[field.slug] = field.defaultValue ?? "";
  });

  return values;
}

/*
|--------------------------------------------------------------------------
| Extract request data
|--------------------------------------------------------------------------
|
| Supports:
|
| 1. application/json
| 2. multipart/form-data
|--------------------------------------------------------------------------
*/

async function parseRequestData(request) {
  const contentType = request.headers.get("content-type") || "";

  /*
  |--------------------------------------------------------------------------
  | JSON
  |--------------------------------------------------------------------------
  */

  if (contentType.includes("application/json")) {
    const body = await request.json();

    return {
      body,
      files: [],
    };
  }

  /*
  |--------------------------------------------------------------------------
  | FormData
  |--------------------------------------------------------------------------
  */

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const body = {};
    const files = [];

    for (const [key, value] of formData.entries()) {
      /*
      |--------------------------------------------------------------------------
      | File
      |--------------------------------------------------------------------------
      */

      if (isValidFile(value)) {
        files.push({
          key,
          file: value,
        });

        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | Normal value
      |--------------------------------------------------------------------------
      */

      if (Object.prototype.hasOwnProperty.call(body, key)) {
        if (Array.isArray(body[key])) {
          body[key].push(value);
        } else {
          body[key] = [body[key], value];
        }
      } else {
        body[key] = value;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Parse customFields
    |--------------------------------------------------------------------------
    */

    if (typeof body.customFields === "string") {
      body.customFields = parseJSON(body.customFields, {});
    }

    return {
      body,
      files,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Unsupported content type
  |--------------------------------------------------------------------------
  */

  throw new Error(
    "Unsupported request content type. Use application/json or multipart/form-data.",
  );
}

/*
|--------------------------------------------------------------------------
| Process uploaded custom field files
|--------------------------------------------------------------------------
*/

async function processCustomFieldUploads({
  customerId,
  fields,
  customFields,
  files,
  existingCustomFields = {},
}) {
  const result = normalizeCustomFields(customFields);

  const existing = normalizeCustomFields(existingCustomFields);

  const fieldMap = {};

  fields.forEach((field) => {
    fieldMap[field.slug] = field;
  });

  /*
  |--------------------------------------------------------------------------
  | Process each uploaded file
  |--------------------------------------------------------------------------
  */

  for (const uploaded of files) {
    const key = uploaded.key;

    /*
    |--------------------------------------------------------------------------
    | Supported key formats
    |--------------------------------------------------------------------------
    |
    | customField_<slug>
    | customFields_<slug>
    | customFields[<slug>]
    |
    |--------------------------------------------------------------------------
    */

    let slug = null;

    if (key.startsWith("customField_")) {
      slug = key.substring("customField_".length);
    }

    if (key.startsWith("customFields_")) {
      slug = key.substring("customFields_".length);
    }

    const bracketMatch = key.match(/^customFields\[(.+)\]$/);

    if (bracketMatch) {
      slug = bracketMatch[1];
    }

    if (!slug) {
      continue;
    }

    const field = fieldMap[slug];

    if (!field) {
      continue;
    }

    if (!isUploadField(field)) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Save file
    |--------------------------------------------------------------------------
    */

    const uploadedUrl = await saveUploadedFile(uploaded.file, customerId);

    if (!uploadedUrl) {
      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Single file
    |--------------------------------------------------------------------------
    */

    if (field.type === "file" || field.type === "image") {
      /*
      | Delete old file if it exists
      */

      const oldValue = existing[slug];

      if (
        typeof oldValue === "string" &&
        oldValue &&
        oldValue !== uploadedUrl
      ) {
        await deleteUploadedFile(oldValue, customerId);
      }

      result[slug] = uploadedUrl;

      continue;
    }

    /*
    |--------------------------------------------------------------------------
    | Multiple files
    |--------------------------------------------------------------------------
    */

    if (field.type === "multifile" || field.type === "multiimage") {
      const currentValue = Array.isArray(result[slug]) ? result[slug] : [];

      currentValue.push(uploadedUrl);

      result[slug] = currentValue;
    }
  }

  return result;
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(request) {
  try {
    const accessError = await checkMenuAccess("customers");

    if (accessError) {
      return accessError;
    }

    const { body, files } = await parseRequestData(request);

    const {
      company,
      vat,
      email,
      phone,
      website,
      currency,
      defaultLanguage,
      address,
      city,
      state,
      zip,
      country,
      billingStreet,
      billingCity,
      billingState,
      billingZip,
      billingCountry,
      shippingStreet,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
      groups,
      active,
      customFields,
    } = body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!company || !String(company).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Company is required.",
        },
        { status: 400 },
      );
    }

    // User.email is required and unique in your User model.
    if (!email || !String(email).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required to create a customer account.",
        },
        { status: 400 },
      );
    }

    const customerEmail = String(email).trim().toLowerCase();
    const customerCompany = String(company).trim();

    /*
    |--------------------------------------------------------------------------
    | Find Customer Role
    |--------------------------------------------------------------------------
    */

    const customerRole = await prisma.userRole.findUnique({
      where: {
        slug: "customer",
      },
      select: {
        id: true,
      },
    });

    if (!customerRole) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer role not found. Please configure the customer role.",
        },
        { status: 400 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Custom Field Definitions
    |--------------------------------------------------------------------------
    */

    const fields = await getCustomerFieldDefinitions();

    let finalCustomFields = buildCustomFieldValues(
      fields,
      normalizeCustomFields(customFields),
    );

    /*
    |--------------------------------------------------------------------------
    | Create User First, Then Customer
    |--------------------------------------------------------------------------
    |
    | Both records are created inside one transaction.
    | The generated User ID is linked to Customer.userId.
    |--------------------------------------------------------------------------
    */

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User account first
      const user = await tx.user.create({
        data: {
          email: customerEmail,

          name: customerCompany,

          country: country || null,

          roleId: customerRole.id,

          password: await bcrypt.hash("demo123", 12),
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          roleId: true,
          status: true,
        },
      });

      // 2. Create Customer and link the generated User ID
      const customer = await tx.customer.create({
        data: {
          userId: user.id,

          company: customerCompany,

          vatNumber: vat ? String(vat).trim() : null,

          email: customerEmail,

          phone: phone ? String(phone).trim() : null,

          website: website ? String(website).trim() : null,

          defaultCurrency: currency || null,

          defaultLanguage: defaultLanguage || null,

          address: address ? String(address).trim() : null,

          city: city ? String(city).trim() : null,

          state: state ? String(state).trim() : null,

          zip: zip ? String(zip).trim() : null,

          country: country || null,

          billingStreet: billingStreet
            ? String(billingStreet).trim()
            : null,

          billingCity: billingCity
            ? String(billingCity).trim()
            : null,

          billingState: billingState
            ? String(billingState).trim()
            : null,

          billingZip: billingZip
            ? String(billingZip).trim()
            : null,

          billingCountry: billingCountry || null,

          shippingStreet: shippingStreet
            ? String(shippingStreet).trim()
            : null,

          shippingCity: shippingCity
            ? String(shippingCity).trim()
            : null,

          shippingState: shippingState
            ? String(shippingState).trim()
            : null,

          shippingZip: shippingZip
            ? String(shippingZip).trim()
            : null,

          shippingCountry: shippingCountry || null,

          groups: Array.isArray(groups)
            ? groups
            : parseMultiValue(groups),

          active:
            typeof active === "boolean"
              ? active
              : parseBoolean(active, true),

          customFields: finalCustomFields,
        },
      });

      return {
        user,
        customer,
      };
    });

    let customer = result.customer;

    /*
    |--------------------------------------------------------------------------
    | Process Uploaded Custom Files
    |--------------------------------------------------------------------------
    */

    if (files.length > 0) {
      finalCustomFields = await processCustomFieldUploads({
        customerId: customer.id,

        fields,

        customFields: finalCustomFields,

        files,

        existingCustomFields: {},
      });

      customer = await prisma.customer.update({
        where: {
          id: customer.id,
        },

        data: {
          customFields: finalCustomFields,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        message: "Customer and user account created successfully.",

        data: {
          ...customer,
          user: result.user,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("CREATE CUSTOMER ERROR:", error);

    // Handle duplicate email or other unique constraint errors.
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "A user or customer with this email already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create customer.",
      },
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/
export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("customers");

    if (accessError) {
      return accessError;
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.max(Number(searchParams.get("limit")) || 10, 1);

    const sort =
      searchParams.get("sort") ||
      searchParams.get("sortBy") ||
      "id";

    const dir = (
      searchParams.get("dir") ||
      searchParams.get("sortOrder") ||
      "desc"
    ).toLowerCase();

    const query = searchParams.get("query")?.trim() || "";

    /*
    |--------------------------------------------------------------------------
    | SINGLE CUSTOMER
    |--------------------------------------------------------------------------
    */

    if (id !== null) {
      const customerId = Number(id);

      if (!Number.isInteger(customerId) || customerId <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid customer ID.",
          },
          { status: 400 },
        );
      }

      const customer = await prisma.customer.findUnique({
        where: {
          id: customerId,
        },
      });

      if (!customer) {
        return NextResponse.json(
          {
            success: false,
            message: "Customer not found.",
          },
          { status: 404 },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | GET COUNTRY NAME
      |--------------------------------------------------------------------------
      */

      const country = customer.country
        ? await prisma.country.findUnique({
          where: {
            id: customer.country,
          },
          select: {
            id: true,
            name: true,
          },
        })
        : null;

      const countryName = country?.name || "-";

      /*
      |--------------------------------------------------------------------------
      | CUSTOM FIELD DEFINITIONS
      |--------------------------------------------------------------------------
      */

      const fields = await getCustomerFieldDefinitions();

      const customFieldValues = buildCustomFieldValues(
        fields,
        customer.customFields,
      );

      return NextResponse.json({
        success: true,

        data: {
          ...customer,
          countryName,
          custom_fields: fields,
          custom_field_values: customFieldValues,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    let searchConditions = [];

    if (query) {
      searchConditions = [
        {
          company: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          vatNumber: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          website: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          city: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          state: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          zip: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          billingStreet: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          billingCity: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          billingState: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          billingZip: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          billingCountry: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          shippingStreet: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          shippingCity: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          shippingState: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          shippingZip: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          shippingCountry: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];

      /*
      |--------------------------------------------------------------------------
      | SEARCH BY COUNTRY NAME
      |--------------------------------------------------------------------------
      */

      const matchingCountries = await prisma.country.findMany({
        where: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
        },
      });

      const countryIds = matchingCountries.map(
        (country) => country.id,
      );

      if (countryIds.length > 0) {
        searchConditions.push({
          country: {
            in: countryIds,
          },
        });
      }
    }

    const where = query
      ? {
        OR: searchConditions,
      }
      : {};

    /*
    |--------------------------------------------------------------------------
    | SORT
    |--------------------------------------------------------------------------
    */

    const allowedSortFields = [
      "id",
      "company",
      "vatNumber",
      "email",
      "phone",
      "website",
      "defaultCurrency",
      "defaultLanguage",
      "city",
      "state",
      "zip",
      "country",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "id";

    const sortDirection = dir === "asc" ? "asc" : "desc";

    /*
    |--------------------------------------------------------------------------
    | TOTAL
    |--------------------------------------------------------------------------
    */

    const total = await prisma.customer.count({
      where,
    });

    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

    const totalPages = Math.ceil(total / limit);

    const safePage =
      totalPages > 0 ? Math.min(page, totalPages) : 1;

    const skip = (safePage - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | GET CUSTOMERS
    |--------------------------------------------------------------------------
    */

    const customers = await prisma.customer.findMany({
      where,

      orderBy: {
        [sortField]: sortDirection,
      },

      skip,

      take: limit,
    });

    /*
    |--------------------------------------------------------------------------
    | GET COUNTRY NAMES
    |--------------------------------------------------------------------------
    */

    const countryIds = [
      ...new Set(
        customers
          .map((customer) => customer.country)
          .filter(Boolean),
      ),
    ];

    const countries = countryIds.length
      ? await prisma.country.findMany({
        where: {
          id: {
            in: countryIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
      : [];

    const countryMap = new Map(
      countries.map((country) => [
        country.id,
        country.name,
      ]),
    );

    /*
    |--------------------------------------------------------------------------
    | ADD COUNTRY NAME TO CUSTOMERS
    |--------------------------------------------------------------------------
    */

    const formattedCustomers = customers.map((customer) => ({
      ...customer,
      countryName: countryMap.get(customer.country) || "-",
    }));

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      data: formattedCustomers,

      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },

      filters: {
        query,
        sort: sortField,
        sortOrder: sortDirection,
      },
    });
  } catch (error) {
    console.error("GET CUSTOMER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch customers.",
      },
      { status: 500 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| PUT
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| PUT - Update Customer and Linked User
|--------------------------------------------------------------------------
*/

export async function PUT(request) {
  try {
    const accessError = await checkMenuAccess("customers");

    if (accessError) {
      return accessError;
    }
    const { body, files } = await parseRequestData(request);

    const {
      id,
      company,
      vat,
      email,
      phone,
      website,
      currency,
      defaultLanguage,
      address,
      city,
      state,
      zip,
      country,
      billingStreet,
      billingCity,
      billingState,
      billingZip,
      billingCountry,
      shippingStreet,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
      groups,
      active,
      customFields,
    } = body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer ID is required.",
        },
        { status: 400 },
      );
    }

    if (!company || !String(company).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Company is required.",
        },
        { status: 400 },
      );
    }

    if (!email || !String(email).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 },
      );
    }

    const customerId = Number(id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid customer ID.",
        },
        { status: 400 },
      );
    }

    const customerEmail = String(email).trim().toLowerCase();
    const customerCompany = String(company).trim();

    const isActive =
      typeof active === "boolean"
        ? active
        : parseBoolean(active, true);

    /*
    |--------------------------------------------------------------------------
    | Existing Customer
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found.",
        },
        { status: 404 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Custom Field Definitions
    |--------------------------------------------------------------------------
    */

    const fields = await getCustomerFieldDefinitions();

    const existingCustomFields = normalizeCustomFields(
      existing.customFields,
    );

    const submittedCustomFields = normalizeCustomFields(
      customFields,
    );

    /*
    |--------------------------------------------------------------------------
    | Merge Custom Fields
    |--------------------------------------------------------------------------
    */

    let finalCustomFields = {
      ...existingCustomFields,
      ...submittedCustomFields,
    };

    /*
    |--------------------------------------------------------------------------
    | Normalize Custom Field Types
    |--------------------------------------------------------------------------
    */

    fields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(
          finalCustomFields,
          field.slug,
        )
      ) {
        finalCustomFields[field.slug] = normalizeCustomFieldValue(
          field,
          finalCustomFields[field.slug],
          existingCustomFields[field.slug] ?? "",
        );
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Process Uploaded Custom Files
    |--------------------------------------------------------------------------
    */

    if (files.length > 0) {
      finalCustomFields = await processCustomFieldUploads({
        customerId,
        fields,
        customFields: finalCustomFields,
        files,
        existingCustomFields,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update User and Customer
    |--------------------------------------------------------------------------
    |
    | Update the linked User account first, then update Customer.
    | If the Customer has no User account, create one.
    | Both database operations run in one transaction.
    |--------------------------------------------------------------------------
    */

    const result = await prisma.$transaction(async (tx) => {
      let user;

      // Check whether this Customer already has a linked User.
      if (existing.userId) {
        user = await tx.user.findUnique({
          where: {
            id: existing.userId,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Existing User
      |--------------------------------------------------------------------------
      */

      if (user) {
        const emailChanged =
          user.email.toLowerCase() !== customerEmail;

        user = await tx.user.update({
          where: {
            id: user.id,
          },

          data: {
            name: customerCompany,

            email: customerEmail,

            country: country || null,

            // Synchronize account activation with Customer status.
            status: isActive ? "ACTIVE" : "INACTIVE",

            // Reset verification only when email changes.
            ...(emailChanged
              ? { emailVerifiedAt: null }
              : {}),
          },

          select: {
            id: true,
            email: true,
            name: true,
            roleId: true,
            status: true,
            emailVerifiedAt: true,
          },
        });
      } else {
        /*
        |--------------------------------------------------------------------------
        | Create User for Existing Customer Without User Link
        |--------------------------------------------------------------------------
        */

        const customerRole = await tx.userRole.findUnique({
          where: {
            slug: "customer",
          },

          select: {
            id: true,
          },
        });

        if (!customerRole) {
          throw new Error(
            "Customer role not found. Please configure the customer role.",
          );
        }

        const hashedPassword = await bcrypt.hash("demo123", 12);

        user = await tx.user.create({
          data: {
            email: customerEmail,

            password: hashedPassword,

            name: customerCompany,

            country: country || null,

            roleId: customerRole.id,

            status: isActive ? "ACTIVE" : "INACTIVE",

            emailVerifiedAt: new Date(),
          },

          select: {
            id: true,
            email: true,
            name: true,
            roleId: true,
            status: true,
            emailVerifiedAt: true,
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Update Customer
      |--------------------------------------------------------------------------
      */

      const customer = await tx.customer.update({
        where: {
          id: customerId,
        },

        data: {
          // Link Customer with User
          userId: user.id,

          company: customerCompany,

          vatNumber: vat
            ? String(vat).trim()
            : null,

          email: customerEmail,

          phone: phone
            ? String(phone).trim()
            : null,

          website: website
            ? String(website).trim()
            : null,

          defaultCurrency: currency || null,

          defaultLanguage: defaultLanguage || null,

          address: address
            ? String(address).trim()
            : null,

          city: city
            ? String(city).trim()
            : null,

          state: state
            ? String(state).trim()
            : null,

          zip: zip
            ? String(zip).trim()
            : null,

          country: country || null,

          billingStreet: billingStreet
            ? String(billingStreet).trim()
            : null,

          billingCity: billingCity
            ? String(billingCity).trim()
            : null,

          billingState: billingState
            ? String(billingState).trim()
            : null,

          billingZip: billingZip
            ? String(billingZip).trim()
            : null,

          billingCountry: billingCountry || null,

          shippingStreet: shippingStreet
            ? String(shippingStreet).trim()
            : null,

          shippingCity: shippingCity
            ? String(shippingCity).trim()
            : null,

          shippingState: shippingState
            ? String(shippingState).trim()
            : null,

          shippingZip: shippingZip
            ? String(shippingZip).trim()
            : null,

          shippingCountry: shippingCountry || null,

          groups: Array.isArray(groups)
            ? groups
            : parseMultiValue(groups),

          active: isActive,

          customFields: finalCustomFields,
        },
      });

      return {
        customer,
        user,
      };
    });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      message: "Customer and user account updated successfully.",

      data: {
        ...result.customer,
        user: result.user,
      },
    });
  } catch (error) {
    console.error("UPDATE CUSTOMER ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "This email address is already registered.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update customer.",
      },
      { status: 500 },
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
    const accessError = await checkMenuAccess("customers");

    if (accessError) {
      return accessError;
    }
    const body = await request.json();

    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const customerId = Number(id);

    if (Number.isNaN(customerId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid customer ID.",
        },
        {
          status: 400,
        },
      );
    }

    const existing = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Delete uploaded custom files
    |--------------------------------------------------------------------------
    */

    const customFields = normalizeCustomFields(existing.customFields);

    for (const value of Object.values(customFields)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          await deleteUploadedFile(item, customerId);
        }
      } else if (typeof value === "string") {
        await deleteUploadedFile(value, customerId);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Delete Customer
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | No CustomFieldValue operation here.
    |--------------------------------------------------------------------------
    */


    // Soft delete Customer and linked User
    await prisma.$transaction(async (tx) => {
      await prisma.customer.delete({
        where: {
          id: customerId,
        },
      });

      // Soft delete linked User
      if (existing.userId) {
        await tx.user.update({
          where: {
            id: existing.userId,
          },
          data: {
            isTrashed: true,
          },
        });
      }
    });
    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,

      message: "Customer deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE CUSTOMER ERROR:", error);

    return NextResponse.json(
      {
        success: false,

        message: error?.message || "Failed to delete customer.",
      },
      {
        status: 500,
      },
    );
  }
}