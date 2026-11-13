
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// =======================================================
// PRISMA CLIENTS
// =======================================================

const globalForPrisma = globalThis;

const localPrisma =
  globalForPrisma.localPrisma || new PrismaClient();

const livePrisma =
  globalForPrisma.livePrisma ||
  new PrismaClient({
    datasourceUrl: process.env.LIVE_DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.localPrisma = localPrisma;
  globalForPrisma.livePrisma = livePrisma;
}

// =======================================================
// SYNC LOCK
// =======================================================

let userSyncRunning = false;

// =======================================================
// USER DATA MAPPER
// Use LIVE role ID.
// Do not copy passwords or authentication records.
// =======================================================

const getUserData = (user, liveRoleId) => ({
  email: user.email,
  country: user.country ?? null,
  timezone: user.timezone ?? null,
  name: user.name ?? null,
  roleId: liveRoleId,
  status: user.status,
  isTrashed: user.isTrashed,
  avatar: user.avatar ?? null,
  invitedByUserId: user.invitedByUserId ?? null,
  isProtected: user.isProtected,
});

// =======================================================
// USER DETAILS DATA MAPPER
// =======================================================

const getUserDetailsData = (details) => ({
  name: details.name ?? null,
  profilePhoto: details.profilePhoto ?? null,
  availability: details.availability ?? "available",
  birthday: details.birthday ?? null,
  gender: details.gender ?? null,
  address: details.address ?? null,
  city: details.city ?? null,
  state: details.state ?? null,
  country: details.country ?? null,
  postalCode: details.postalCode ?? null,
  publicProfile: details.publicProfile,
  socialLinkedin: details.socialLinkedin ?? null,
  socialTwitch: details.socialTwitch ?? null,
  socialX: details.socialX ?? null,
  socialDribbble: details.socialDribbble ?? null,
  referralCode: details.referralCode ?? null,
  referralLink: details.referralLink ?? null,
});

// =======================================================
// NORMALIZE VALUES FOR COMPARISON
// =======================================================

const normalize = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === undefined) {
    return null;
  }

  return value;
};

const hasChanges = (source, target, fields) => {
  return fields.some(
    (field) =>
      JSON.stringify(normalize(source[field])) !==
      JSON.stringify(normalize(target[field])),
  );
};

// =======================================================
// FIND EXISTING LIVE USER
// 1. Match by ID
// 2. Match by email
// =======================================================

const findLiveUser = async (user) => {
  if (user.id) {
    const byId = await livePrisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (byId) {
      return byId;
    }
  }

  if (user.email?.trim()) {
    return livePrisma.user.findUnique({
      where: {
        email: user.email.trim(),
      },
    });
  }

  return null;
};

// =======================================================
// GET MATCHING LIVE ROLE ID USING ROLE SLUG
// =======================================================

const getLiveRoleId = async (localRoleId) => {
  // Find role in LOCAL database
  const localRole = await localPrisma.userRole.findUnique({
    where: {
      id: localRoleId,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!localRole) {
    throw new Error(
      `Local role not found for roleId: ${localRoleId}`,
    );
  }

  if (!localRole.slug) {
    throw new Error(
      `Local role slug is missing for roleId: ${localRoleId}`,
    );
  }

  // Find matching role in LIVE database
  const liveRole = await livePrisma.userRole.findUnique({
    where: {
      slug: localRole.slug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!liveRole) {
    throw new Error(
      `Role "${localRole.slug}" does not exist in LIVE database. Please synchronize roles first.`,
    );
  }

  return liveRole.id;
};

// =======================================================
// SYNC USER DETAILS
// Uses the matched LIVE user's ID.
// =======================================================

const syncUserDetails = async (localDetails, liveUserId, stats) => {
  if (!localDetails) {
    // Do not delete existing LIVE details if local details are absent.
    return;
  }

  const detailsData = getUserDetailsData(localDetails);

  const existingDetails = await livePrisma.user_details.findUnique({
    where: {
      userId: liveUserId,
    },
  });

  // -----------------------------------------------------
  // CREATE USER DETAILS
  // -----------------------------------------------------

  if (!existingDetails) {
    await livePrisma.user_details.create({
      data: {
        userId: liveUserId,
        ...detailsData,
      },
    });

    stats.detailsCreated++;

    console.log(
      `[USER SYNC] User details created for ${liveUserId}`,
    );

    return;
  }

  // -----------------------------------------------------
  // CHECK FOR CHANGES
  // -----------------------------------------------------

  const detailFields = Object.keys(detailsData);

  const changed = hasChanges(
    detailsData,
    existingDetails,
    detailFields,
  );

  if (!changed) {
    stats.detailsSkipped++;
    return;
  }

  // -----------------------------------------------------
  // UPDATE USER DETAILS
  // -----------------------------------------------------

  await livePrisma.user_details.update({
    where: {
      userId: liveUserId,
    },
    data: detailsData,
  });

  stats.detailsUpdated++;

  console.log(
    `[USER SYNC] User details updated for ${liveUserId}`,
  );
};

// =======================================================
// POST - SYNC USERS AND USER DETAILS
// LOCAL TO LIVE
// =======================================================

export async function POST() {
  const startedAt = new Date();

  if (userSyncRunning) {
    return NextResponse.json(
      {
        success: false,
        message: "User sync is already running.",
        running: true,
      },
      { status: 409 },
    );
  }

  userSyncRunning = true;

  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,

    detailsTotal: 0,
    detailsCreated: 0,
    detailsUpdated: 0,
    detailsSkipped: 0,
    detailsFailed: 0,
  };

  const errors = [];

  try {
    // ---------------------------------------------------
    // CHECK LIVE DATABASE CONFIGURATION
    // ---------------------------------------------------

    if (!process.env.LIVE_DATABASE_URL) {
      throw new Error("LIVE_DATABASE_URL is not configured.");
    }

    // ---------------------------------------------------
    // CHECK DATABASE CONNECTIONS
    // ---------------------------------------------------

    await localPrisma.$queryRaw`SELECT 1`;
    await livePrisma.$queryRaw`SELECT 1`;

    // ---------------------------------------------------
    // GET LOCAL USERS WITH USER DETAILS
    // ---------------------------------------------------

    const users = await localPrisma.user.findMany({
      include: {
        user_details: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    stats.total = users.length;

    stats.detailsTotal = users.filter(
      (user) => user.user_details,
    ).length;

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users found to synchronize.",
        direction: "LOCAL_TO_LIVE",
        stats,
        errors,
        startedAt,
        completedAt: new Date(),
      });
    }

    // ---------------------------------------------------
    // PROCESS EACH USER
    // ---------------------------------------------------

    for (const user of users) {
      let liveUser = null;

      try {
        // ===============================================
        // FIND MATCHING LIVE USER
        // ===============================================

        liveUser = await findLiveUser(user);

        // ===============================================
        // GET MATCHING LIVE ROLE ID
        // ===============================================

        const liveRoleId = await getLiveRoleId(user.roleId);

        // ===============================================
        // PREPARE USER DATA
        // ===============================================

        const userData = getUserData(user, liveRoleId);

        // ===============================================
        // CREATE LIVE USER
        // ===============================================

        if (!liveUser) {
          /*
           * Preserve local ID for newly created users.
           * Use LIVE role ID instead of LOCAL role ID.
           * Password is intentionally not copied.
           */

          const createdUser = await livePrisma.user.create({
            data: {
              id: user.id,
              ...userData,
            },
          });

          stats.created++;

          liveUser = createdUser;

          console.log(
            `[USER SYNC] Created user: ${user.email}`,
          );
        } else {
          // =============================================
          // CHECK USER CHANGES
          // =============================================

          const userFields = Object.keys(userData);

          const changed = hasChanges(
            userData,
            liveUser,
            userFields,
          );

          // =============================================
          // UPDATE EXISTING USER
          // =============================================

          if (changed) {
            liveUser = await livePrisma.user.update({
              where: {
                id: liveUser.id,
              },
              data: userData,
            });

            stats.updated++;

            console.log(
              `[USER SYNC] Updated user: ${user.email}`,
            );
          } else {
            stats.skipped++;
          }
        }

        // ===============================================
        // SYNC USER DETAILS
        // ===============================================

        if (user.user_details) {
          try {
            await syncUserDetails(
              user.user_details,
              liveUser.id,
              stats,
            );
          } catch (detailsError) {
            stats.detailsFailed++;

            errors.push({
              type: "USER_DETAILS",
              userId: user.id,
              email: user.email,
              error:
                detailsError?.message ||
                "Unknown user details sync error.",
            });

            console.error(
              `[USER DETAILS SYNC ERROR] ${user.email}:`,
              detailsError,
            );
          }
        }
      } catch (userError) {
        stats.failed++;

        errors.push({
          type: "USER",
          id: user.id,
          email: user.email,
          error:
            userError?.message ||
            "Unknown user sync error.",
        });

        console.error(
          `[USER SYNC ERROR] ${user.email}:`,
          userError,
        );
      }
    }

    // ---------------------------------------------------
    // BUILD RESULT MESSAGE
    // ---------------------------------------------------

    const totalFailures =
      stats.failed + stats.detailsFailed;

    let message = "User synchronization completed.";

    if (totalFailures > 0) {
      message = "User synchronization completed with errors.";
    } else if (
      stats.created === 0 &&
      stats.updated === 0 &&
      stats.detailsCreated === 0 &&
      stats.detailsUpdated === 0
    ) {
      message =
        "User synchronization completed. No changes were required.";
    }

    // ---------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------

    return NextResponse.json(
      {
        success: totalFailures === 0,
        message,
        direction: "LOCAL_TO_LIVE",

        stats: {
          total: stats.total,
          created: stats.created,
          updated: stats.updated,
          skipped: stats.skipped,
          failed: stats.failed,

          detailsTotal: stats.detailsTotal,
          detailsCreated: stats.detailsCreated,
          detailsUpdated: stats.detailsUpdated,
          detailsSkipped: stats.detailsSkipped,
          detailsFailed: stats.detailsFailed,
        },

        errors,
        startedAt,
        completedAt: new Date(),
      },
      {
        status: totalFailures > 0 ? 207 : 200,
      },
    );
  } catch (error) {
    console.error("[USER SYNC FATAL ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "User synchronization failed.",
        direction: "LOCAL_TO_LIVE",
        stats,
        errors,
        startedAt,
        completedAt: new Date(),
      },
      { status: 500 },
    );
  } finally {
    userSyncRunning = false;
  }
}

// =======================================================
// GET - SYNC STATUS
// =======================================================

export async function GET() {
  return NextResponse.json({
    success: true,
    running: userSyncRunning,
    direction: "LOCAL_TO_LIVE",
    environment: process.env.NODE_ENV || "development",
    liveConfigured: Boolean(process.env.LIVE_DATABASE_URL),
  });
}
