import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { checkMenuAccess } from "@/lib/module-access";
import { systemLog } from "@/services/system-log";
import { getAuthenticatedUser } from "@/lib/auth-user";
/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Parse boolean values.
 */
function parseBoolean(value, defaultValue = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  return defaultValue;
}


/**
 * Nullable string.
 */
function nullableString(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  return String(value).trim();
}


/**
 * Convert hourly rate.
 */
function nullableDecimal(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number;
}


/**
 * Parse request body.
 *
 * Supports:
 *
 * application/json
 * multipart/form-data
 */
async function parseRequestBody(request) {
  const contentType =
    request.headers.get('content-type') || '';

  /*
  |--------------------------------------------------------------------------
  | JSON
  |--------------------------------------------------------------------------
  */

  if (
    contentType.includes('application/json')
  ) {
    return {
      body: await request.json(),
      file: null,
    };
  }


  /*
  |--------------------------------------------------------------------------
  | FormData
  |--------------------------------------------------------------------------
  */

  if (
    contentType.includes('multipart/form-data')
  ) {
    const formData =
      await request.formData();

    const body = {};
    let file = null;

    for (
      const [key, value]
      of formData.entries()
    ) {
      /*
       * Uploaded file.
       */
      if (
        value &&
        typeof value === 'object' &&
        typeof value.arrayBuffer === 'function'
      ) {
        if (
          key === 'profileImage' ||
          key === 'profile_image' ||
          key === 'image'
        ) {
          file = value;
        }

        continue;
      }

      body[key] = value;
    }

    return {
      body,
      file,
    };
  }


  /*
  |--------------------------------------------------------------------------
  | Empty / unsupported content type
  |--------------------------------------------------------------------------
  */

  return {
    body: {},
    file: null,
  };
}


/**
 * Save uploaded profile image.
 */
async function saveProfileImage(file) {
  if (!file) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Validate file
  |--------------------------------------------------------------------------
  */

  if (
    !file.name ||
    !file.type
  ) {
    throw new Error(
      'Invalid profile image.'
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Allowed MIME types
  |--------------------------------------------------------------------------
  */

  const allowedMimeTypes = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };

  if (
    !allowedMimeTypes[file.type]
  ) {
    throw new Error(
      'Only JPG, PNG, WEBP and GIF images are allowed.'
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Maximum file size
  |--------------------------------------------------------------------------
  |
  | 5 MB
  |
  */

  const maxFileSize =
    5 * 1024 * 1024;

  if (
    file.size > maxFileSize
  ) {
    throw new Error(
      'Profile image must be smaller than 5 MB.'
    );
  }


  /*
  |--------------------------------------------------------------------------
  | Upload directory
  |--------------------------------------------------------------------------
  */

  const uploadDirectory =
    path.join(
      process.cwd(),
      'public',
      'uploads',
      'staff'
    );

  await fs.mkdir(
    uploadDirectory,
    {
      recursive: true,
    }
  );


  /*
  |--------------------------------------------------------------------------
  | Generate unique filename
  |--------------------------------------------------------------------------
  */

  const extension =
    allowedMimeTypes[file.type];

  const uniqueName =
    `staff-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}${extension}`;


  const filePath =
    path.join(
      uploadDirectory,
      uniqueName
    );


  /*
  |--------------------------------------------------------------------------
  | Save file
  |--------------------------------------------------------------------------
  */

  const bytes =
    await file.arrayBuffer();

  const buffer =
    Buffer.from(bytes);

  await fs.writeFile(
    filePath,
    buffer
  );


  /*
  |--------------------------------------------------------------------------
  | Public URL
  |--------------------------------------------------------------------------
  */

  return `/uploads/staff/${uniqueName}`;
}


/**
 * Delete profile image from filesystem.
 */
async function deleteProfileImage(
  imageUrl
) {
  if (
    !imageUrl ||
    typeof imageUrl !== 'string'
  ) {
    return;
  }

  /*
   * Only delete our local staff uploads.
   */
  if (
    !imageUrl.startsWith(
      '/uploads/staff/'
    )
  ) {
    return;
  }

  try {
    const filename =
      path.basename(imageUrl);

    const filePath =
      path.join(
        process.cwd(),
        'public',
        'uploads',
        'staff',
        filename
      );

    await fs.unlink(
      filePath
    );
  } catch (error) {
    /*
     * File may already be deleted.
     */
    console.warn(
      'PROFILE IMAGE DELETE WARNING:',
      error?.message
    );
  }
}


/**
 * Remove password from response.
 */
function sanitizeStaff(staff) {
  if (!staff) {
    return staff;
  }

  const {
    password,
    ...safeStaff
  } = staff;

  return safeStaff;
}


/**
 * Generate staff response.
 */
function formatStaff(staff) {
  return sanitizeStaff({
    ...staff,
    hourlyRate:
      staff.hourlyRate !== null &&
        staff.hourlyRate !== undefined
        ? Number(staff.hourlyRate)
        : 0,
  });
}


/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Single:
|
| /api/staff?id=USER_ID
|
| List:
|
| /api/staff?page=1&limit=10
|
| Search:
|
| /api/staff?search=john
|
|--------------------------------------------------------------------------
*/
export async function GET(request) {
  try {
    const accessError = await checkMenuAccess("staff");

    if (accessError) {
      return accessError;
    }
    const { searchParams } =
      new URL(request.url);


    /*
    |--------------------------------------------------------------------------
    | SINGLE STAFF
    |--------------------------------------------------------------------------
    |
    | /api/staff?id=xxxxxxxx
    |
    */

    const id =
      searchParams.get('id');


    if (id !== null) {
      const staffId =
        String(id).trim();


      if (!staffId) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Invalid staff user ID.',
          },
          {
            status: 400,
          }
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Get Staff
      |--------------------------------------------------------------------------
      */

      const staff =
        await prisma.staffUser.findUnique({
          where: {
            id: staffId,
          },
        });


      if (!staff) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Staff user not found.',
          },
          {
            status: 404,
          }
        );
      }


      /*
      |--------------------------------------------------------------------------
      | Get Staff Roles
      |--------------------------------------------------------------------------
      |
      | StaffUserRole is a separate table.
      | There is no Prisma relation required here.
      |
      */

      const staffRoles =
        await prisma.staffUserRole.findMany({
          where: {
            staffUserId:
              staff.id,
          },

          select: {
            roleId: true,
            assignedAt: true,
          },

          orderBy: {
            assignedAt:
              'asc',
          },
        });


      /*
      |--------------------------------------------------------------------------
      | Role IDs
      |--------------------------------------------------------------------------
      */

      const roleIds =
        staffRoles.map(
          (item) =>
            String(item.roleId)
        );


      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */

      return NextResponse.json({
        success: true,

        data: {
          ...formatStaff(staff),

          roleIds,

          /*
           * Optional complete mapping information.
           */
          staffRoles,
        },
      });
    }


    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

    const pageParam =
      Number(
        searchParams.get('page') || 1
      );


    const limitParam =
      Number(
        searchParams.get('limit') || 10
      );


    const page =
      Number.isInteger(pageParam) &&
        pageParam > 0
        ? pageParam
        : 1;


    const limit =
      Number.isInteger(limitParam) &&
        limitParam > 0
        ? Math.min(
          limitParam,
          100
        )
        : 10;


    const skip =
      (page - 1) * limit;


    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    const search =
      (
        searchParams.get('search') ||
        searchParams.get('query') ||
        ''
      ).trim();


    /*
    |--------------------------------------------------------------------------
    | STATUS FILTER
    |--------------------------------------------------------------------------
    |
    | Supported:
    |
    | ?status=active
    | ?status=inactive
    | ?status=true
    | ?status=false
    | ?status=1
    | ?status=0
    |
    */

    const statusParam =
      searchParams.get('status');


    let statusFilter = {};


    if (statusParam !== null) {
      const normalizedStatus =
        String(statusParam)
          .trim()
          .toLowerCase();


      if (
        normalizedStatus ===
        'active' ||
        normalizedStatus ===
        'true' ||
        normalizedStatus ===
        '1'
      ) {
        statusFilter = {
          isActive: true,
        };
      } else if (
        normalizedStatus ===
        'inactive' ||
        normalizedStatus ===
        'false' ||
        normalizedStatus ===
        '0'
      ) {
        statusFilter = {
          isActive: false,
        };
      }
    }


    /*
    |--------------------------------------------------------------------------
    | SORT
    |--------------------------------------------------------------------------
    */

    const requestedSort =
      searchParams
        .get('sort')
        ?.trim() ||
      'createdAt';


    const requestedDir =
      searchParams
        .get('dir')
        ?.trim()
        .toLowerCase() ||
      'desc';


    const allowedSortFields = [
      'id',
      'email',
      'firstName',
      'lastName',
      'hourlyRate',
      'createdAt',
      'updatedAt',
      'lastLoginAt',
    ];


    const sort =
      allowedSortFields.includes(
        requestedSort
      )
        ? requestedSort
        : 'createdAt';


    const dir =
      requestedDir === 'asc'
        ? 'asc'
        : 'desc';


    /*
    |--------------------------------------------------------------------------
    | WHERE
    |--------------------------------------------------------------------------
    */

    const where = {
      /*
       * Do not show trashed staff.
       */
      isTrashed: false,


      /*
       * Active / inactive filter.
       */
      ...statusFilter,


      /*
       * Search.
       */
      ...(search
        ? {
          OR: [
            {
              firstName: {
                contains:
                  search,

                mode:
                  'insensitive',
              },
            },

            {
              lastName: {
                contains:
                  search,

                mode:
                  'insensitive',
              },
            },

            {
              email: {
                contains:
                  search,

                mode:
                  'insensitive',
              },
            },

            {
              phone: {
                contains:
                  search,

                mode:
                  'insensitive',
              },
            },
          ],
        }
        : {}),
    };


    /*
    |--------------------------------------------------------------------------
    | TOTAL
    |--------------------------------------------------------------------------
    */

    const total =
      await prisma.staffUser.count({
        where,
      });


    /*
    |--------------------------------------------------------------------------
    | STAFF USERS
    |--------------------------------------------------------------------------
    */

    const staffUsers =
      await prisma.staffUser.findMany({
        where,

        orderBy: {
          [sort]: dir,
        },

        skip,

        take: limit,
      });


    /*
    |--------------------------------------------------------------------------
    | STAFF IDs
    |--------------------------------------------------------------------------
    */

    const staffIds =
      staffUsers.map(
        (staff) =>
          staff.id
      );


    /*
    |--------------------------------------------------------------------------
    | GET ALL ROLE MAPPINGS
    |--------------------------------------------------------------------------
    |
    | One query instead of one query
    | for every staff member.
    |
    */

    let staffRoles = [];


    if (
      staffIds.length > 0
    ) {
      staffRoles =
        await prisma.staffUserRole.findMany({
          where: {
            staffUserId: {
              in: staffIds,
            },
          },

          select: {
            staffUserId: true,
            roleId: true,
            assignedAt: true,
          },

          orderBy: {
            assignedAt:
              'asc',
          },
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Group Roles By Staff User
    |--------------------------------------------------------------------------
    */

    const rolesByStaff =
      new Map();


    for (
      const staffRole of staffRoles
    ) {
      const staffUserId =
        String(
          staffRole.staffUserId
        );


      if (
        !rolesByStaff.has(
          staffUserId
        )
      ) {
        rolesByStaff.set(
          staffUserId,
          []
        );
      }


      rolesByStaff
        .get(staffUserId)
        .push(
          String(
            staffRole.roleId
          )
        );
    }


    /*
    |--------------------------------------------------------------------------
    | FORMAT DATA
    |--------------------------------------------------------------------------
    */

    const data =
      staffUsers.map(
        (staff) => {
          const roleIds =
            rolesByStaff.get(
              String(staff.id)
            ) || [];


          return {
            ...formatStaff(
              staff
            ),

            /*
             * Selected role IDs.
             */
            roleIds,

            /*
             * Optional convenience field.
             */
            staffRoles:
              roleIds.map(
                (roleId) => ({
                  roleId,
                })
              ),
          };
        }
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

        hasNextPage:
          page <
          totalPages,

        hasPreviousPage:
          page > 1,
      },

      sort: {
        field: sort,
        direction: dir,
      },

      search,

      status:
        statusParam !== null
          ? String(
            statusParam
          )
            .trim()
            .toLowerCase()
          : 'all',
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    console.error(
      'GET STAFF ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          'Failed to load staff.',
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
| Create staff user.
|
|--------------------------------------------------------------------------
*/
export async function POST(request) {
  let uploadedImage = null;

  try {
    const accessError = await checkMenuAccess("staff");

    if (accessError) {
      return accessError;
    }

    const { body, file } = await parseRequestBody(request);

    /*
    |--------------------------------------------------------------------------
    | FIELDS
    |--------------------------------------------------------------------------
    */

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      hourlyRate,
      facebook,
      linkedin,
      skype,
      defaultLanguage,
      direction,
      timezone,
      emailSignature,
      sendWelcomeEmail,
      isActive,
      isAdministrator,
      isNotStaff,
      createdByUserId,
      roleIds,
      roleIdsJson,
      permissions,
    } = body;

    /*
    |--------------------------------------------------------------------------
    | PARSE ROLE IDS
    |--------------------------------------------------------------------------
    */

    let parsedRoleIds = [];

    if (roleIdsJson) {
      try {
        let parsed = roleIdsJson;

        if (typeof parsed === "string") {
          parsed = JSON.parse(parsed);
        }

        if (Array.isArray(parsed)) {
          parsedRoleIds = parsed
            .map((id) => String(id).trim())
            .filter(Boolean);
        }
      } catch (error) {
        console.error("ROLE IDS JSON PARSE ERROR:", error);
      }
    }

    if (parsedRoleIds.length === 0 && roleIds) {
      if (Array.isArray(roleIds)) {
        parsedRoleIds = roleIds
          .map((id) => String(id).trim())
          .filter(Boolean);
      } else {
        try {
          const parsed = JSON.parse(String(roleIds));

          if (Array.isArray(parsed)) {
            parsedRoleIds = parsed
              .map((id) => String(id).trim())
              .filter(Boolean);
          } else {
            parsedRoleIds = [String(roleIds).trim()].filter(Boolean);
          }
        } catch {
          parsedRoleIds = [String(roleIds).trim()].filter(Boolean);
        }
      }
    }

    parsedRoleIds = [
      ...new Set(
        parsedRoleIds
          .map((id) => String(id).trim())
          .filter(Boolean)
      ),
    ];

    /*
    |--------------------------------------------------------------------------
    | ADMINISTRATOR
    |--------------------------------------------------------------------------
    */

    const administrator = parseBoolean(isAdministrator, false);

    const finalRoleIds = administrator ? [] : parsedRoleIds;

    /*
    |--------------------------------------------------------------------------
    | VALIDATION
    |--------------------------------------------------------------------------
    */

    if (!email || !String(email).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (!password || !String(password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required.",
        },
        { status: 400 }
      );
    }

    if (!firstName || !String(firstName).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "First name is required.",
        },
        { status: 400 }
      );
    }

    if (!lastName || !String(lastName).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Last name is required.",
        },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE EMAIL
    |--------------------------------------------------------------------------
    */

    const normalizedEmail = String(email).trim().toLowerCase();

    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();

    const fullName = `${normalizedFirstName} ${normalizedLastName}`;

    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE EMAIL
    |--------------------------------------------------------------------------
    */

    const [existingStaff, existingUser] = await Promise.all([
      prisma.staffUser.findUnique({
        where: {
          email: normalizedEmail,
        },
      }),

      prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      }),
    ]);

    if (existingStaff || existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "A user with this email already exists.",
        },
        { status: 409 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | GET STAFF USER ROLE
    |--------------------------------------------------------------------------
    |
    | User.roleId references UserRole.
    | Find the correct role using slug instead of hardcoded ID.
    |
    */

    const staffRole = await prisma.userRole.findUnique({
      where: {
        slug: "staff",
      },
    });

    if (!staffRole) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The "staff" role does not exist. Please create the staff role first.',
        },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PASSWORD HASH
    |--------------------------------------------------------------------------
    */

    const hashedPassword = await bcrypt.hash(
      String(password),
      12
    );

    /*
    |--------------------------------------------------------------------------
    | PROFILE IMAGE
    |--------------------------------------------------------------------------
    */

    if (file) {
      uploadedImage = await saveProfileImage(file);
    }

    /*
    |--------------------------------------------------------------------------
    | PREPARE STATUS
    |--------------------------------------------------------------------------
    */

    const activeStatus = parseBoolean(isActive, true);

    const userStatus = activeStatus ? "ACTIVE" : "INACTIVE";

    /*
    |--------------------------------------------------------------------------
    | GET AUTHENTICATED USER
    |--------------------------------------------------------------------------
    */

    const loggedInUser = await getAuthenticatedUser();

    /*
    |--------------------------------------------------------------------------
    | CREATE USER + STAFF + STAFF ROLES
    |--------------------------------------------------------------------------
    |
    | All records are created atomically.
    |
    */

    const result = await prisma.$transaction(async (tx) => {
      // ---------------------------------------------------
      // 1. CREATE USER
      // ---------------------------------------------------

      const user = await tx.user.create({
        data: {
          name: fullName,
          email: normalizedEmail,
          password: hashedPassword,
          roleId: staffRole.id,
          status: userStatus,
        },
      });

      // ---------------------------------------------------
      // 2. CREATE STAFF USER
      // ---------------------------------------------------

      const staff = await tx.staffUser.create({
        data: {
          userId: user.id,

          email: normalizedEmail,
          password: hashedPassword,

          firstName: normalizedFirstName,
          lastName: normalizedLastName,

          phone: nullableString(phone),

          hourlyRate: nullableDecimal(hourlyRate),

          facebook: nullableString(facebook),
          linkedin: nullableString(linkedin),
          skype: nullableString(skype),

          defaultLanguage: nullableString(defaultLanguage),
          direction: nullableString(direction),
          timezone: nullableString(timezone),

          emailSignature: nullableString(emailSignature),

          sendWelcomeEmail: parseBoolean(sendWelcomeEmail, true),

          isActive: activeStatus,

          isAdministrator: administrator,

          isNotStaff: parseBoolean(isNotStaff, false),

          profileImage: uploadedImage,

          createdByUserId: nullableString(createdByUserId),
        },
      });

      // ---------------------------------------------------
      // 3. CREATE STAFF USER ROLES
      // ---------------------------------------------------

      let createdRoles = [];

      if (finalRoleIds.length > 0) {
        const roleData = finalRoleIds.map((roleId) => ({
          staffUserId: staff.id,
          roleId: String(roleId).trim(),
        }));

        await tx.staffUserRole.createMany({
          data: roleData,
          skipDuplicates: true,
        });

        createdRoles = finalRoleIds;
      }

      return {
        user,
        staff,
        createdRoles,
      };
    });

    /*
    |--------------------------------------------------------------------------
    | SYSTEM LOG
    |--------------------------------------------------------------------------
    */

    try {
      await systemLog({
        event: "create",
        userId: String(loggedInUser.id),
        entityId: String(result.staff.id),
        entityType: "hr.staff",
        description: `Staff created: ${result.staff.firstName} ${result.staff.lastName} (${result.staff.email})`,
        ipAddress:
          request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() || null,
      });
    } catch (logError) {
      console.error("CREATE STAFF SYSTEM LOG ERROR:", logError);
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,
        message: "Staff user created successfully.",

        data: {
          ...formatStaff(result.staff),

          roleIds: result.createdRoles,

          permissions: permissions || null,

          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            roleId: result.user.roleId,
            status: result.user.status,
          },
        },
      },
      { status: 201 }
    );

  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | CLEANUP UPLOADED IMAGE
    |--------------------------------------------------------------------------
    */

    if (uploadedImage) {
      try {
        await deleteProfileImage(uploadedImage);
      } catch (imageError) {
        console.error(
          "DELETE UPLOADED IMAGE ERROR:",
          imageError
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | ERROR HANDLING
    |--------------------------------------------------------------------------
    */

    console.error("CREATE STAFF ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "A user or staff record with this email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Failed to create staff user.",
      },
      { status: 500 }
    );
  }
}


/*
|--------------------------------------------------------------------------
| PATCH
|--------------------------------------------------------------------------
|
| THIS FIXES:
|
| PATCH /api/staff
| 405 Method Not Allowed
|
| Supports multipart/form-data including profile image.
|
|--------------------------------------------------------------------------
*/


export async function PATCH(request) {
  let uploadedImage = null;

  try {
    const accessError = await checkMenuAccess("staff");

    if (accessError) return accessError;

    const { body, file } = await parseRequestBody(request);

    /*
    |--------------------------------------------------------------------------
    | STAFF ID
    |--------------------------------------------------------------------------
    */

    const { searchParams } = new URL(request.url);
    const staffId = String(searchParams.get("id") || "").trim();

    if (!staffId) {
      return NextResponse.json(
        { success: false, message: "Staff user ID is required." },
        { status: 400 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | EXISTING STAFF
    |--------------------------------------------------------------------------
    */

    const existing = await prisma.staffUser.findUnique({
      where: { id: staffId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Staff user not found." },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | FIELDS
    |--------------------------------------------------------------------------
    */

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      hourlyRate,
      facebook,
      linkedin,
      skype,
      defaultLanguage,
      direction,
      timezone,
      emailSignature,
      sendWelcomeEmail,
      isActive,
      isAdministrator,
      isNotStaff,
      createdByUserId,
      roleIds,
      roleIdsJson,
      permissions,
      removeProfileImage,
    } = body;

    /*
    |--------------------------------------------------------------------------
    | PARSE ROLE IDS
    |--------------------------------------------------------------------------
    */

    let parsedRoleIds = [];

    const hasRoleData =
      roleIdsJson !== undefined || roleIds !== undefined;

    if (
      roleIdsJson !== undefined &&
      roleIdsJson !== null &&
      String(roleIdsJson).trim() !== ""
    ) {
      try {
        const parsed =
          typeof roleIdsJson === "string"
            ? JSON.parse(roleIdsJson)
            : roleIdsJson;

        if (!Array.isArray(parsed)) {
          return NextResponse.json(
            { success: false, message: "Invalid roleIdsJson format." },
            { status: 400 }
          );
        }

        parsedRoleIds = parsed
          .map((id) => String(id).trim())
          .filter(Boolean);
      } catch {
        return NextResponse.json(
          { success: false, message: "Invalid roleIdsJson format." },
          { status: 400 }
        );
      }
    }

    if (
      parsedRoleIds.length === 0 &&
      roleIds !== undefined &&
      roleIds !== null &&
      String(roleIds).trim() !== ""
    ) {
      if (Array.isArray(roleIds)) {
        parsedRoleIds = roleIds
          .map((id) => String(id).trim())
          .filter(Boolean);
      } else {
        try {
          const parsed = JSON.parse(String(roleIds));

          parsedRoleIds = Array.isArray(parsed)
            ? parsed.map((id) => String(id).trim()).filter(Boolean)
            : [String(roleIds).trim()].filter(Boolean);
        } catch {
          parsedRoleIds = [String(roleIds).trim()].filter(Boolean);
        }
      }
    }

    parsedRoleIds = [
      ...new Set(parsedRoleIds.filter(Boolean)),
    ];

    /*
    |--------------------------------------------------------------------------
    | FINAL VALUES
    |--------------------------------------------------------------------------
    */

    const finalIsAdministrator =
      isAdministrator !== undefined
        ? parseBoolean(isAdministrator, existing.isAdministrator)
        : existing.isAdministrator;

    const finalFirstName =
      firstName !== undefined
        ? String(firstName).trim()
        : existing.firstName;

    const finalLastName =
      lastName !== undefined
        ? String(lastName).trim()
        : existing.lastName;

    if (!finalFirstName || !finalLastName) {
      return NextResponse.json(
        {
          success: false,
          message: "First name and last name are required.",
        },
        { status: 400 }
      );
    }

    const finalEmail =
      email !== undefined && String(email).trim()
        ? String(email).trim().toLowerCase()
        : existing.email;

    const activeStatus =
      isActive !== undefined
        ? parseBoolean(isActive, existing.isActive)
        : existing.isActive;

    const userStatus = activeStatus ? "ACTIVE" : "INACTIVE";

    const fullName = `${finalFirstName} ${finalLastName}`;

    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE EMAIL
    |--------------------------------------------------------------------------
    */

    const staffEmailExists = await prisma.staffUser.findFirst({
      where: {
        email: finalEmail,
        NOT: { id: staffId },
      },
    });

    if (staffEmailExists) {
      return NextResponse.json(
        {
          success: false,
          message: "A staff user with this email already exists.",
        },
        { status: 409 }
      );
    }

    // Check duplicate email in User table.
    // Exclude the User already linked to this Staff record.

    const userEmailExists = await prisma.user.findFirst({
      where: {
        email: finalEmail,
        ...(existing.userId
          ? { NOT: { id: existing.userId } }
          : {}),
      },
    });

    if (userEmailExists) {
      return NextResponse.json(
        {
          success: false,
          message: "A user with this email already exists.",
        },
        { status: 409 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | GET STAFF ROLE
    |--------------------------------------------------------------------------
    */

    const staffRole = await prisma.userRole.findUnique({
      where: { slug: "staff" },
    });

    if (!staffRole) {
      return NextResponse.json(
        {
          success: false,
          message: 'The "staff" role does not exist.',
        },
        { status: 404 }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | PASSWORD
    |--------------------------------------------------------------------------
    */

    let finalPassword = existing.password;

    if (
      password !== undefined &&
      password !== null &&
      String(password).trim()
    ) {
      finalPassword = await bcrypt.hash(String(password), 12);
    }

    /*
    |--------------------------------------------------------------------------
    | PROFILE IMAGE
    |--------------------------------------------------------------------------
    */

    let finalProfileImage = existing.profileImage;

    if (file) {
      uploadedImage = await saveProfileImage(file);
      finalProfileImage = uploadedImage;
    } else if (parseBoolean(removeProfileImage, false)) {
      finalProfileImage = null;
    }

    /*
    |--------------------------------------------------------------------------
    | STAFF UPDATE DATA
    |--------------------------------------------------------------------------
    */

    const updateData = {
      email: finalEmail,
      password: finalPassword,
      firstName: finalFirstName,
      lastName: finalLastName,
      profileImage: finalProfileImage,
    };

    if (phone !== undefined) {
      updateData.phone = nullableString(phone);
    }

    if (hourlyRate !== undefined) {
      updateData.hourlyRate = nullableDecimal(hourlyRate);
    }

    if (facebook !== undefined) {
      updateData.facebook = nullableString(facebook);
    }

    if (linkedin !== undefined) {
      updateData.linkedin = nullableString(linkedin);
    }

    if (skype !== undefined) {
      updateData.skype = nullableString(skype);
    }

    if (defaultLanguage !== undefined) {
      updateData.defaultLanguage = nullableString(defaultLanguage);
    }

    if (direction !== undefined) {
      updateData.direction = nullableString(direction);
    }

    if (timezone !== undefined) {
      updateData.timezone = nullableString(timezone);
    }

    if (emailSignature !== undefined) {
      updateData.emailSignature = nullableString(emailSignature);
    }

    if (sendWelcomeEmail !== undefined) {
      updateData.sendWelcomeEmail = parseBoolean(
        sendWelcomeEmail,
        existing.sendWelcomeEmail
      );
    }

    if (isActive !== undefined) {
      updateData.isActive = activeStatus;
    }

    if (isAdministrator !== undefined) {
      updateData.isAdministrator = finalIsAdministrator;
    }

    if (isNotStaff !== undefined) {
      updateData.isNotStaff = parseBoolean(
        isNotStaff,
        existing.isNotStaff
      );
    }

    if (createdByUserId !== undefined) {
      updateData.createdByUserId = nullableString(createdByUserId);
    }

    /*
    |--------------------------------------------------------------------------
    | AUTHENTICATED USER
    |--------------------------------------------------------------------------
    */

    const loggedInUser = await getAuthenticatedUser();

    /*
    |--------------------------------------------------------------------------
    | TRANSACTION: UPDATE STAFF + USER + ROLES
    |--------------------------------------------------------------------------
    */

    const result = await prisma.$transaction(async (tx) => {
      // ---------------------------------------------------
      // 1. UPDATE STAFF
      // ---------------------------------------------------

      const updatedStaff = await tx.staffUser.update({
        where: { id: staffId },
        data: updateData,
      });

      // ---------------------------------------------------
      // 2. UPDATE OR CREATE LINKED USER
      // ---------------------------------------------------

      let linkedUser;

      const userData = {
        name: fullName,
        email: finalEmail,
        password: finalPassword,
        roleId: staffRole.id,
        status: userStatus,
      };

      if (existing.userId) {
        linkedUser = await tx.user.update({
          where: { id: existing.userId },
          data: userData,
        });
      } else {
        // Supports older Staff records that do not have a linked User.

        linkedUser = await tx.user.create({
          data: userData,
        });

        await tx.staffUser.update({
          where: { id: staffId },
          data: {
            userId: linkedUser.id,
          },
        });
      }

      // ---------------------------------------------------
      // 3. UPDATE STAFF ROLES
      // ---------------------------------------------------

      if (hasRoleData) {
        if (finalIsAdministrator) {
          await tx.staffUserRole.deleteMany({
            where: { staffUserId: staffId },
          });
        } else {
          // Validate role IDs before replacing existing assignments.

          if (parsedRoleIds.length > 0) {
            const validRoles = await tx.staffRole.findMany({
              where: {
                id: { in: parsedRoleIds },
              },
              select: { id: true },
            });

            if (validRoles.length !== parsedRoleIds.length) {
              throw new Error("One or more selected staff roles are invalid.");
            }
          }

          await tx.staffUserRole.deleteMany({
            where: { staffUserId: staffId },
          });

          if (parsedRoleIds.length > 0) {
            await tx.staffUserRole.createMany({
              data: parsedRoleIds.map((roleId) => ({
                staffUserId: staffId,
                roleId,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      // ---------------------------------------------------
      // 4. GET CURRENT ROLE IDS
      // ---------------------------------------------------

      const currentRoles = await tx.staffUserRole.findMany({
        where: { staffUserId: staffId },
        select: { roleId: true },
        orderBy: { assignedAt: "asc" },
      });

      return {
        staff: updatedStaff,
        user: linkedUser,
        roleIds: currentRoles.map((item) => String(item.roleId)),
      };
    });

    /*
    |--------------------------------------------------------------------------
    | SYSTEM LOG
    |--------------------------------------------------------------------------
    */

    try {
      await systemLog({
        event: "update",
        userId: String(loggedInUser.id),
        entityId: String(result.staff.id),
        entityType: "hr.staff",
        description: `Staff updated: ${result.staff.firstName} ${result.staff.lastName} (${result.staff.email})`,
        ipAddress:
          request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() || null,
      });
    } catch (logError) {
      console.error("UPDATE STAFF SYSTEM LOG ERROR:", logError);
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE OLD PROFILE IMAGE AFTER SUCCESSFUL UPDATE
    |--------------------------------------------------------------------------
    */

    if (
      existing.profileImage &&
      existing.profileImage !== finalProfileImage
    ) {
      try {
        await deleteProfileImage(existing.profileImage);
      } catch (imageError) {
        console.error("DELETE OLD PROFILE IMAGE ERROR:", imageError);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,
        message: "Staff user updated successfully.",
        data: {
          ...formatStaff(result.staff),
          roleIds: result.roleIds,
          permissions: permissions !== undefined ? permissions : null,
          user: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            roleId: result.user.roleId,
            status: result.user.status,
          },
        },
      },
      { status: 200 }
    );

  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | CLEANUP NEW IMAGE IF UPDATE FAILED
    |--------------------------------------------------------------------------
    */

    if (uploadedImage) {
      try {
        await deleteProfileImage(uploadedImage);
      } catch (imageError) {
        console.error("DELETE UPLOADED IMAGE ERROR:", imageError);
      }
    }

    console.error("PATCH STAFF ERROR:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          message: "A user or staff record with this email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update staff user.",
      },
      { status: 500 }
    );
  }
}



/*
|--------------------------------------------------------------------------
| PUT
|--------------------------------------------------------------------------
|
| Keep PUT as an alias for PATCH.
|
| This allows existing frontend code using
| PUT to continue working.
|
|--------------------------------------------------------------------------
*/

export async function PUT(request) {
  return PATCH(request);
}


/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
|
| /api/staff?id=UUID
|
| or JSON:
|
| {
|   "id": "UUID"
| }
|
|--------------------------------------------------------------------------
*/


export async function DELETE(request) {
  try {
    const accessError = await checkMenuAccess("staff");

    if (accessError) {
      return accessError;
    }

    const contentType = request.headers.get("content-type") || "";
    let id = null;

    // Get ID from JSON body or query parameter
    if (contentType.includes("application/json")) {
      const body = await request.json();
      id = body.id;
    } else {
      const { searchParams } = new URL(request.url);
      id = searchParams.get("id");
    }

    // Validate ID
    if (id === null || id === undefined || id === "") {
      return NextResponse.json(
        {
          success: false,
          message: "Staff user ID is required.",
        },
        { status: 400 }
      );
    }

    const staffId = String(id).trim();

    // Find existing StaffUser
    const existing = await prisma.staffUser.findUnique({
      where: {
        id: staffId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff user not found.",
        },
        { status: 404 }
      );
    }

    // Delete StaffUser and linked User
    await prisma.$transaction(async (tx) => {
      // Delete StaffUser first
      await tx.staffUser.delete({
        where: {
          id: staffId,
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

    // Delete profile image after successful database deletion
    if (existing.profileImage) {
      try {
        await deleteProfileImage(existing.profileImage);
      } catch (imageError) {
        console.error(
          "DELETE STAFF PROFILE IMAGE ERROR:",
          imageError
        );
      }
    }

    // System log
    const user = await getAuthenticatedUser();

    try {
      await systemLog({
        event: "delete",
        userId: String(user.id),
        entityId: String(existing.id),
        entityType: "hr.staff",
        description: `Staff deleted: ${existing.firstName} ${existing.lastName} (${existing.email})`,
        ipAddress:
          request.headers
            .get("x-forwarded-for")
            ?.split(",")[0]
            ?.trim() || null,
      });
    } catch (logError) {
      console.error("DELETE STAFF SYSTEM LOG ERROR:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Staff user and linked User record deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE STAFF ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.code === "P2003"
            ? "Unable to delete this staff user because related records still exist."
            : error?.message || "Failed to delete staff user.",
      },
      { status: 500 }
    );
  }
}