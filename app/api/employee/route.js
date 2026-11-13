import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { checkMenuAccess } from "@/lib/module-access";

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const MODULE_NAME = "employee";
const UPLOAD_DIRECTORY = "employees";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/*
|--------------------------------------------------------------------------
| General Helpers
|--------------------------------------------------------------------------
*/

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

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

function nullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const result = String(value).trim();

  return result || null;
}

function parseDate(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return date;
}

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
| Request Parser
|--------------------------------------------------------------------------
*/

async function parseRequestData(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json();

    return {
      body: body || {},
      files: [],
    };
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    const body = {};
    const files = [];

    for (const [key, value] of formData.entries()) {
      if (isValidFile(value)) {
        if (value.size > 0) {
          files.push({
            key,
            file: value,
          });
        }

        continue;
      }

      if (hasOwn(body, key)) {
        if (Array.isArray(body[key])) {
          body[key].push(value);
        } else {
          body[key] = [body[key], value];
        }
      } else {
        body[key] = value;
      }
    }

    if (typeof body.educationDetails === "string") {
      body.educationDetails = parseJSON(body.educationDetails, null);
    }

    return {
      body,
      files,
    };
  }

  throw new Error(
    "Unsupported request content type. Use application/json or multipart/form-data.",
  );
}

/*
|--------------------------------------------------------------------------
| Employee Data Builder
|--------------------------------------------------------------------------
*/

const STRING_FIELDS = [
  "firstName",
  "middleName",
  "lastName",
  "gender",
  "bloodGroup",
  "emailId",
  "maritalStatus",
  "mobile",
  "userId",

  "correspondenceAddress",
  "correspondenceCity",
  "correspondenceState",
  "correspondenceCountry",
  "correspondencePincode",

  "permanentAddress",
  "permanentCity",
  "permanentState",
  "permanentCountry",
  "permanentPincode",

  "reasonToLeave",
  "status",
];

const DATE_FIELDS = [
  "dateOfBirth",
  "resignationDate",
  "leavingDate",
];

const BOOLEAN_FIELDS = [
  "qualifiedForInterview",
  "permanentSameAsCorrespondence",
];

function buildEmployeeData(body, { isCreate = false } = {}) {
  const data = {};

  /*
  |--------------------------------------------------------------------------
  | String Fields
  |--------------------------------------------------------------------------
  */

  for (const field of STRING_FIELDS) {
    if (!hasOwn(body, field)) {
      continue;
    }

    if (field === "firstName" || field === "lastName") {
      const value = String(body[field] ?? "").trim();

      if (!value) {
        throw new Error(`${field} is required.`);
      }

      data[field] = value;
      continue;
    }

    if (field === "status") {
      data.status = nullableString(body.status) || "ACTIVE";
      continue;
    }

    data[field] = nullableString(body[field]);
  }

  /*
  |--------------------------------------------------------------------------
  | Required Fields
  |--------------------------------------------------------------------------
  */

  if (isCreate) {
    if (!data.firstName) {
      throw new Error("First name is required.");
    }

    if (!data.lastName) {
      throw new Error("Last name is required.");
    }

    data.status = data.status || "ACTIVE";
  }

  /*
  |--------------------------------------------------------------------------
  | Date Fields
  |--------------------------------------------------------------------------
  */

  for (const field of DATE_FIELDS) {
    if (!hasOwn(body, field)) {
      continue;
    }

    data[field] = parseDate(body[field], field);
  }

  /*
  |--------------------------------------------------------------------------
  | Boolean Fields
  |--------------------------------------------------------------------------
  */

  for (const field of BOOLEAN_FIELDS) {
    if (!hasOwn(body, field)) {
      continue;
    }

    data[field] = parseBoolean(body[field], false);
  }

  /*
  |--------------------------------------------------------------------------
  | Education Details (JSON)
  |--------------------------------------------------------------------------
  */

  if (hasOwn(body, "educationDetails")) {
    const educationDetails =
      typeof body.educationDetails === "string"
        ? parseJSON(body.educationDetails, null)
        : body.educationDetails;

    if (educationDetails !== null && educationDetails !== undefined) {
      data.educationDetails = educationDetails;
    }
  }
  /*
  |--------------------------------------------------------------------------
  | Custom Fields (JSON)
  |--------------------------------------------------------------------------
  */

  if (hasOwn(body, "customFields")) {
    let customFields = body.customFields;

    if (typeof customFields === "string") {
      try {
        customFields = customFields.trim()
          ? JSON.parse(customFields)
          : null;
      } catch {
        throw new Error("Invalid custom fields data.");
      }
    }

    if (customFields !== null && customFields !== undefined) {
      data.customFields = customFields;
    }
  }
  return data;
}

/*
|--------------------------------------------------------------------------
| Upload Helpers
|--------------------------------------------------------------------------
*/

async function getEmployeeUploadDirectory(employeeId) {
  const directory = path.join(
    process.cwd(),
    "public",
    "uploads",
    UPLOAD_DIRECTORY,
    String(employeeId),
  );

  await fs.mkdir(directory, {
    recursive: true,
  });

  return directory;
}

async function saveEmployeeFile(file, employeeId, fieldName) {
  if (!isValidFile(file) || file.size <= 0) {
    return null;
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${fieldName} must not exceed 5 MB.`);
  }

  const extension = ALLOWED_IMAGE_TYPES[file.type];

  if (!extension) {
    throw new Error(
      `${fieldName} must be a JPG, PNG, WEBP, or GIF image.`,
    );
  }

  const directory = await getEmployeeUploadDirectory(employeeId);

  const uniqueName = `${fieldName}-${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}${extension}`;

  const filePath = path.join(directory, uniqueName);

  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(filePath, buffer);

  return `/uploads/${UPLOAD_DIRECTORY}/${employeeId}/${uniqueName}`;
}

/*
|--------------------------------------------------------------------------
| Delete Uploaded File
|--------------------------------------------------------------------------
*/

async function deleteEmployeeFile(fileUrl, employeeId) {
  if (typeof fileUrl !== "string" || !fileUrl) {
    return;
  }

  const prefix = `/uploads/${UPLOAD_DIRECTORY}/${employeeId}/`;

  if (!fileUrl.startsWith(prefix)) {
    return;
  }

  const filename = path.basename(fileUrl);

  if (!filename || filename !== fileUrl.slice(prefix.length)) {
    return;
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    UPLOAD_DIRECTORY,
    String(employeeId),
    filename,
  );

  try {
    await fs.unlink(filePath);
  } catch {
    // The file may already have been removed.
  }
}

/*
|--------------------------------------------------------------------------
| Process Profile Picture and Signature Uploads
|--------------------------------------------------------------------------
*/

async function processEmployeeUploads({
  employeeId,
  files,
  existingEmployee = {},
}) {
  const uploadedPaths = {};
  const oldPaths = {};

  for (const uploaded of files) {
    const fieldName = uploaded.key;

    if (!["profilePic", "signature"].includes(fieldName)) {
      continue;
    }

    const uploadedUrl = await saveEmployeeFile(
      uploaded.file,
      employeeId,
      fieldName,
    );

    if (!uploadedUrl) {
      continue;
    }

    uploadedPaths[fieldName] = uploadedUrl;

    if (existingEmployee[fieldName]) {
      oldPaths[fieldName] = existingEmployee[fieldName];
    }
  }

  return {
    uploadedPaths,
    oldPaths,
  };
}
/*
|--------------------------------------------------------------------------
| POST - Create Employee
|--------------------------------------------------------------------------
*/
export async function POST(request) {
  let createdEmployeeId = null;

  try {
    const accessError = await checkMenuAccess(MODULE_NAME);

    if (accessError) {
      return accessError;
    }

    const { body, files } = await parseRequestData(request);

    const employeeData = buildEmployeeData(body, {
      isCreate: true,
    });

    /*
    |--------------------------------------------------------------------------
    | Normalize Email
    |--------------------------------------------------------------------------
    */

    if (employeeData.emailId) {
      employeeData.emailId = employeeData.emailId
        .trim()
        .toLowerCase();
    }

    /*
    |--------------------------------------------------------------------------
    | Generate Employee Code & Create Employee
    |--------------------------------------------------------------------------
    |
    | es001
    | es002
    | es003
    |
    | Sequence increment and employee creation happen in
    | the same transaction to avoid duplicate codes.
    |
    */

    let employee = await prisma.$transaction(async (tx) => {
      const sequence = await tx.employeeCodeSequence.upsert({
        where: {
          id: 1,
        },
        create: {
          id: 1,
          lastValue: 1,
        },
        update: {
          lastValue: {
            increment: 1,
          },
        },
      });

      const empcode = `es${String(sequence.lastValue).padStart(3, "0")}`;

      const newEmployee = await tx.employee.create({
        data: {
          ...employeeData,
          empcode,
        },
      });

      return newEmployee;
    });

    createdEmployeeId = employee.id;

    /*
    |--------------------------------------------------------------------------
    | Upload Profile Picture and Signature
    |--------------------------------------------------------------------------
    */

    if (files.length > 0) {
      const { uploadedPaths } = await processEmployeeUploads({
        employeeId: employee.id,
        files,
      });

      if (Object.keys(uploadedPaths).length > 0) {
        employee = await prisma.employee.update({
          where: {
            id: employee.id,
          },
          data: uploadedPaths,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Success Response
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,
        message: "Employee created successfully.",
        data: employee,
      },
      {
        status: 201,
      },
    );

  } catch (error) {
    console.error("CREATE EMPLOYEE ERROR:", error);

    /*
    |--------------------------------------------------------------------------
    | Cleanup If Upload Processing Fails
    |--------------------------------------------------------------------------
    */

    if (createdEmployeeId) {
      try {
        await prisma.employee.delete({
          where: {
            id: createdEmployeeId,
          },
        });

        const directory = path.join(
          process.cwd(),
          "public",
          "uploads",
          UPLOAD_DIRECTORY,
          String(createdEmployeeId),
        );

        await fs.rm(directory, {
          recursive: true,
          force: true,
        });
      } catch (cleanupError) {
        console.error("EMPLOYEE CLEANUP ERROR:", cleanupError);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Duplicate Error
    |--------------------------------------------------------------------------
    */

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message:
            "An employee with this email, User ID, or employee code already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to create employee.",
      },
      { status: 400 },
    );
  }
}
/*
|--------------------------------------------------------------------------
| GET - Fetch Single Employee or Employee List 
|--------------------------------------------------------------------------
*/
export async function GET(request) {
  try {
    const accessError = await checkMenuAccess(MODULE_NAME);

    if (accessError) {
      return accessError;
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    const page = Math.max(
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
      1,
    );

    const requestedLimit = Number.parseInt(
      searchParams.get("limit") || "10",
      10,
    );

    const limit = Math.min(
      Math.max(requestedLimit || 10, 1),
      100,
    );

    const query = searchParams.get("query")?.trim() || "";

    const sort =
      searchParams.get("sort") ||
      searchParams.get("sortBy") ||
      "createdAt";

    const dir = (
      searchParams.get("dir") ||
      searchParams.get("sortOrder") ||
      "desc"
    ).toLowerCase();

    const includeTrashed = parseBoolean(
      searchParams.get("includeTrashed"),
      false,
    );

    /*
    |--------------------------------------------------------------------------
    | SINGLE EMPLOYEE
    |--------------------------------------------------------------------------
    */

    if (id !== null) {
      const employee = await prisma.employee.findFirst({
        where: {
          id,
          ...(includeTrashed ? {} : { isTrashed: false }),
        },
        include: {
          user: true,
        },
      });

      if (!employee) {
        return NextResponse.json(
          {
            success: false,
            message: "Employee not found.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: employee,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | BASE FILTER
    |--------------------------------------------------------------------------
    */

    const where = {
      ...(includeTrashed ? {} : { isTrashed: false }),
    };

    const andConditions = [];

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    if (query) {
      andConditions.push({
        OR: [
          { empcode: { contains: query, mode: "insensitive" } },
          { firstName: { contains: query, mode: "insensitive" } },
          { middleName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { emailId: { contains: query, mode: "insensitive" } },
          { mobile: { contains: query, mode: "insensitive" } },
          { gender: { contains: query, mode: "insensitive" } },
          { bloodGroup: { contains: query, mode: "insensitive" } },
          { maritalStatus: { contains: query, mode: "insensitive" } },
          {
            correspondenceAddress: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            correspondenceCity: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            correspondenceState: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            correspondenceCountry: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            correspondencePincode: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            permanentAddress: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            permanentCity: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            permanentState: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            permanentCountry: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            permanentPincode: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            reasonToLeave: {
              contains: query,
              mode: "insensitive",
            },
          },
          { status: { contains: query, mode: "insensitive" } },
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS FILTER
    |--------------------------------------------------------------------------
    */

    const status = searchParams.get("status");

    if (status && status.toLowerCase() !== "all") {
      where.status = {
        equals: status.trim(),
        mode: "insensitive",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | GENDER FILTER
    |--------------------------------------------------------------------------
    */

    const gender = searchParams.get("gender");

    if (gender && gender.toLowerCase() !== "all") {
      where.gender = {
        equals: gender.trim(),
        mode: "insensitive",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | INTERVIEW QUALIFICATION FILTER
    |--------------------------------------------------------------------------
    */

    const qualifiedForInterview = searchParams.get(
      "qualifiedForInterview",
    );

    if (qualifiedForInterview !== null) {
      where.qualifiedForInterview = parseBoolean(
        qualifiedForInterview,
        false,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CITY FILTER
    |--------------------------------------------------------------------------
    */

    const city = searchParams.get("city")?.trim();

    if (city) {
      andConditions.push({
        OR: [
          {
            correspondenceCity: {
              contains: city,
              mode: "insensitive",
            },
          },
          {
            permanentCity: {
              contains: city,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STATE FILTER
    |--------------------------------------------------------------------------
    */

    const state = searchParams.get("state")?.trim();

    if (state) {
      andConditions.push({
        OR: [
          {
            correspondenceState: {
              contains: state,
              mode: "insensitive",
            },
          },
          {
            permanentState: {
              contains: state,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | COUNTRY FILTER
    |--------------------------------------------------------------------------
    */

    const country = searchParams.get("country")?.trim();

    if (country) {
      andConditions.push({
        OR: [
          {
            correspondenceCountry: {
              contains: country,
              mode: "insensitive",
            },
          },
          {
            permanentCountry: {
              contains: country,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATED DATE FILTER
    |--------------------------------------------------------------------------
    */

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (fromDate || toDate) {
      const createdAt = {};

      if (fromDate) {
        const startDate = parseDate(fromDate, "fromDate");
        startDate.setHours(0, 0, 0, 0);

        createdAt.gte = startDate;
      }

      if (toDate) {
        const endDate = parseDate(toDate, "toDate");
        endDate.setHours(23, 59, 59, 999);

        createdAt.lte = endDate;
      }

      where.createdAt = createdAt;
    }

    /*
    |--------------------------------------------------------------------------
    | APPLY AND CONDITIONS
    |--------------------------------------------------------------------------
    */

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    /*
    |--------------------------------------------------------------------------
    | SORT
    |--------------------------------------------------------------------------
    */

    const allowedSortFields = [
      "id",
      "empcode",
      "firstName",
      "middleName",
      "lastName",
      "emailId",
      "mobile",
      "gender",
      "bloodGroup",
      "maritalStatus",
      "status",
      "qualifiedForInterview",
      "correspondenceCity",
      "correspondenceState",
      "permanentCity",
      "permanentState",
      "resignationDate",
      "leavingDate",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(sort)
      ? sort
      : "createdAt";

    const sortDirection = dir === "asc" ? "asc" : "desc";

    /*
    |--------------------------------------------------------------------------
    | COUNT
    |--------------------------------------------------------------------------
    */

    const total = await prisma.employee.count({
      where,
    });

    const totalPages = Math.ceil(total / limit);

    const safePage =
      totalPages > 0 ? Math.min(page, totalPages) : 1;

    const skip = (safePage - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | FETCH EMPLOYEES
    |--------------------------------------------------------------------------
    */

    const employees = await prisma.employee.findMany({
      where,
      orderBy: {
        [sortField]: sortDirection,
      },
      skip,
      take: limit,
      include: {
        user: true,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,
      data: employees,
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
        status: status || "all",
        gender: gender || "all",
        city: city || "",
        state: state || "",
        country: country || "",
        qualifiedForInterview:
          qualifiedForInterview ?? "all",
        sort: sortField,
        sortOrder: sortDirection,
      },
    });
  } catch (error) {
    console.error("GET EMPLOYEE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch employees.",
      },
      { status: 400 },
    );
  }
}
/*
|--------------------------------------------------------------------------
| PUT - Update Employee
|--------------------------------------------------------------------------
*/
export async function PUT(request) {
  const newlyUploadedFiles = [];

  try {
    const accessError = await checkMenuAccess(MODULE_NAME);

    if (accessError) {
      return accessError;
    }

    const { body, files } = await parseRequestData(request);

    const id = body.id;

    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid employee ID is required.",
        },
        { status: 400 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Find Existing Employee
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.employee.findFirst({
      where: {
        id: id.trim(),
        isTrashed: false,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Build Employee Update Data
    |--------------------------------------------------------------------------
    */

    const employeeData = buildEmployeeData(body);

    // Never allow empcode to be changed through this PUT request.
    delete employeeData.empcode;

    // Normalize email.
    if (
      hasOwn(employeeData, "emailId") &&
      typeof employeeData.emailId === "string" &&
      employeeData.emailId.trim()
    ) {
      employeeData.emailId = employeeData.emailId.trim().toLowerCase();
    }

    /*
    |--------------------------------------------------------------------------
    | Handle Same As Correspondence Address
    |--------------------------------------------------------------------------
    */

    if (employeeData.permanentSameAsCorrespondence === true) {
      employeeData.permanentAddress =
        employeeData.correspondenceAddress ??
        existing.correspondenceAddress;

      employeeData.permanentCity =
        employeeData.correspondenceCity ??
        existing.correspondenceCity;

      employeeData.permanentState =
        employeeData.correspondenceState ??
        existing.correspondenceState;

      employeeData.permanentCountry =
        employeeData.correspondenceCountry ??
        existing.correspondenceCountry;

      employeeData.permanentPincode =
        employeeData.correspondencePincode ??
        existing.correspondencePincode;
    }

    /*
    |--------------------------------------------------------------------------
    | Upload Profile Picture and Signature
    |--------------------------------------------------------------------------
    */

    const { uploadedPaths, oldPaths } =
      await processEmployeeUploads({
        employeeId: existing.id,
        files,
        existingEmployee: existing,
      });

    newlyUploadedFiles.push(...Object.values(uploadedPaths));

    Object.assign(employeeData, uploadedPaths);

    /*
    |--------------------------------------------------------------------------
    | Update Employee
    |--------------------------------------------------------------------------
    */

    const employee = await prisma.employee.update({
      where: {
        id: existing.id,
      },

      data: employeeData,

      include: {
        user: true,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | Delete Old Files After Successful Update
    |--------------------------------------------------------------------------
    */

    for (const oldPath of Object.values(oldPaths)) {
      if (oldPath) {
        await deleteEmployeeFile(oldPath, existing.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully.",
      data: employee,
    });
  } catch (error) {
    console.error("UPDATE EMPLOYEE ERROR:", error);

    /*
    |--------------------------------------------------------------------------
    | Cleanup Newly Uploaded Files
    |--------------------------------------------------------------------------
    */

    for (const filePath of newlyUploadedFiles) {
      const employeeId = filePath.split("/")[3];

      if (employeeId) {
        await deleteEmployeeFile(filePath, employeeId);
      }
    }

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "This email address or User ID is already assigned.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update employee.",
      },
      { status: 400 },
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE - Soft Delete Employee
|--------------------------------------------------------------------------
*/

export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess(MODULE_NAME);

    if (accessError) {
      return accessError;
    }

    let id = new URL(request.url).searchParams.get("id");

    if (!id) {
      const body = await request.json();
      id = body?.id;
    }

    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid employee ID is required.",
        },
        { status: 400 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Find Employee
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.employee.findFirst({
      where: {
        id: id.trim(),
        isTrashed: false,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Employee not found.",
        },
        { status: 404 },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Soft Delete
    |--------------------------------------------------------------------------
    |
    | Keep uploaded files and linked User account unchanged.
    | This allows the employee record to be restored later.
    |--------------------------------------------------------------------------
    */

    const employee = await prisma.employee.update({
      where: {
        id: existing.id,
      },

      data: {
        isTrashed: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully.",
      data: {
        id: employee.id,
        isTrashed: employee.isTrashed,
      },
    });
  } catch (error) {
    console.error("DELETE EMPLOYEE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete employee.",
      },
      { status: 500 },
    );
  }
}