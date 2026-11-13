import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// =======================================================
// PRISMA CLIENTS
// =======================================================

const globalForPrisma = globalThis;

const localPrisma =
  globalForPrisma.localPrisma ||
  new PrismaClient();

const livePrisma =
  globalForPrisma.livePrisma ||
  new PrismaClient({
    datasourceUrl:
      process.env.LIVE_DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.localPrisma = localPrisma;
  globalForPrisma.livePrisma = livePrisma;
}

// =======================================================
// SYNC LOCK
// =======================================================

let customerSyncRunning = false;

// =======================================================
// CUSTOMER DATA MAPPER
// =======================================================

const getCustomerData = (customer) => {
  return {
    company: customer.company,

    vatNumber: customer.vatNumber ?? null,

    phone: customer.phone ?? null,

    website: customer.website ?? null,

    defaultCurrency:
      customer.defaultCurrency ?? null,

    defaultLanguage:
      customer.defaultLanguage ?? null,

    address: customer.address ?? null,

    city: customer.city ?? null,

    state: customer.state ?? null,

    zip: customer.zip ?? null,

    country: customer.country ?? null,

    billingStreet:
      customer.billingStreet ?? null,

    billingCity:
      customer.billingCity ?? null,

    billingState:
      customer.billingState ?? null,

    billingZip:
      customer.billingZip ?? null,

    billingCountry:
      customer.billingCountry ?? null,

    shippingStreet:
      customer.shippingStreet ?? null,

    shippingCity:
      customer.shippingCity ?? null,

    shippingState:
      customer.shippingState ?? null,

    shippingZip:
      customer.shippingZip ?? null,

    shippingCountry:
      customer.shippingCountry ?? null,

    groups: Array.isArray(customer.groups)
      ? customer.groups
      : [],

    active:
      customer.active !== false,

    customFields:
      customer.customFields ?? null,

    createdAt: customer.createdAt,

    updatedAt: customer.updatedAt,
  };
};

// =======================================================
// FIND EXISTING CUSTOMER
// =======================================================

const findLiveCustomer = async (customer) => {
  // -----------------------------------------------------
  // 1. Match by ID
  // -----------------------------------------------------

  if (customer.id) {
    const byId =
      await livePrisma.customer.findUnique({
        where: {
          id: customer.id,
        },
      });

    if (byId) {
      return byId;
    }
  }

  // -----------------------------------------------------
  // 2. Match by VAT Number
  // -----------------------------------------------------

  if (
    customer.vatNumber &&
    customer.vatNumber.trim()
  ) {
    const byVat =
      await livePrisma.customer.findFirst({
        where: {
          vatNumber:
            customer.vatNumber.trim(),
        },
      });

    if (byVat) {
      return byVat;
    }
  }

  // -----------------------------------------------------
  // 3. Match by Company + Phone
  // -----------------------------------------------------

  if (
    customer.company &&
    customer.phone
  ) {
    const byCompanyPhone =
      await livePrisma.customer.findFirst({
        where: {
          company: customer.company,
          phone: customer.phone,
        },
      });

    if (byCompanyPhone) {
      return byCompanyPhone;
    }
  }

  // -----------------------------------------------------
  // 4. Match by Company
  //
  // Only used when phone is empty.
  // -----------------------------------------------------

  if (
    customer.company &&
    !customer.phone
  ) {
    const byCompany =
      await livePrisma.customer.findFirst({
        where: {
          company: customer.company,
        },
      });

    if (byCompany) {
      return byCompany;
    }
  }

  return null;
};

// =======================================================
// POST - SYNC CUSTOMERS
// =======================================================

export async function POST() {
  const startedAt = new Date();

  // -----------------------------------------------------
  // Prevent duplicate sync requests
  // -----------------------------------------------------

  if (customerSyncRunning) {
    return NextResponse.json(
      {
        success: false,

        message:
          "Customer sync is already running.",

        running: true,
      },
      {
        status: 409,
      },
    );
  }

  customerSyncRunning = true;

  // -----------------------------------------------------
  // Counters
  // -----------------------------------------------------

  const stats = {
    total: 0,

    created: 0,

    updated: 0,

    skipped: 0,

    failed: 0,
  };

  const errors = [];

  try {
    // ===================================================
    // CHECK LIVE DATABASE URL
    // ===================================================

    if (!process.env.LIVE_DATABASE_URL) {
      throw new Error(
        "LIVE_DATABASE_URL is not configured.",
      );
    }

    // ===================================================
    // CHECK LOCAL DATABASE
    // ===================================================

    await localPrisma.$queryRaw`SELECT 1`;

    // ===================================================
    // CHECK LIVE DATABASE
    // ===================================================

    await livePrisma.$queryRaw`SELECT 1`;

    // ===================================================
    // GET LOCAL CUSTOMERS
    // ===================================================

    const customers =
      await localPrisma.customer.findMany({
        orderBy: {
          id: "asc",
        },
      });

    stats.total = customers.length;

    // ===================================================
    // NOTHING TO SYNC
    // ===================================================

    if (customers.length === 0) {
      return NextResponse.json({
        success: true,

        message:
          "No customers found to synchronize.",

        direction: "LOCAL_TO_LIVE",

        stats,

        startedAt,

        completedAt: new Date(),
      });
    }

    // ===================================================
    // SYNC EACH CUSTOMER
    // ===================================================

    for (const customer of customers) {
      try {
        // -------------------------------------------------
        // Find matching customer in LIVE database
        // -------------------------------------------------

        const existing =
          await findLiveCustomer(customer);

        const customerData =
          getCustomerData(customer);

        // =================================================
        // CREATE
        // =================================================

        if (!existing) {
          /*
           * We intentionally do not send the local
           * auto-increment ID when creating a new record.
           *
           * The LIVE database generates its own ID.
           */

          const {
            createdAt,
            updatedAt,
            ...createData
          } = customerData;

          await livePrisma.customer.create({
            data: createData,
          });

          stats.created++;

          console.log(
            `[CUSTOMER SYNC] Created: ${customer.company}`,
          );

          continue;
        }

        // =================================================
        // CHECK IF CHANGED
        // =================================================

        const fieldsToCompare = [
          "company",
          "vatNumber",
          "phone",
          "website",
          "defaultCurrency",
          "defaultLanguage",
          "address",
          "city",
          "state",
          "zip",
          "country",
          "billingStreet",
          "billingCity",
          "billingState",
          "billingZip",
          "billingCountry",
          "shippingStreet",
          "shippingCity",
          "shippingState",
          "shippingZip",
          "shippingCountry",
          "groups",
          "active",
          "customFields",
        ];

        let changed = false;

        for (const field of fieldsToCompare) {
          const localValue =
            customerData[field];

          const liveValue =
            existing[field];

          if (
            JSON.stringify(localValue) !==
            JSON.stringify(liveValue)
          ) {
            changed = true;
            break;
          }
        }

        // =================================================
        // SKIP
        // =================================================

        if (!changed) {
          stats.skipped++;

          continue;
        }

        // =================================================
        // UPDATE
        // =================================================

        await livePrisma.customer.update({
          where: {
            id: existing.id,
          },

          data: customerData,
        });

        stats.updated++;

        console.log(
          `[CUSTOMER SYNC] Updated: ${customer.company}`,
        );
      } catch (customerError) {
        stats.failed++;

        const errorMessage =
          customerError?.message ||
          "Unknown customer sync error.";

        errors.push({
          id: customer?.id ?? null,

          company:
            customer?.company || "Unknown",

          error: errorMessage,
        });

        console.error(
          `[CUSTOMER SYNC ERROR] Customer ID ${customer?.id}:`,
          customerError,
        );
      }
    }

    // ===================================================
    // RESULT MESSAGE
    // ===================================================

    let message =
      "Customer synchronization completed.";

    if (stats.failed > 0) {
      message =
        "Customer synchronization completed with errors.";
    } else if (
      stats.created === 0 &&
      stats.updated === 0
    ) {
      message =
        "Customer synchronization completed. No changes were required.";
    }

    // ===================================================
    // RESPONSE
    // ===================================================

    return NextResponse.json(
      {
        success: stats.failed === 0,

        message,

        direction: "LOCAL_TO_LIVE",

        stats: {
          total: stats.total,

          created: stats.created,

          updated: stats.updated,

          skipped: stats.skipped,

          failed: stats.failed,
        },

        errors,

        startedAt,

        completedAt: new Date(),
      },
      {
        status:
          stats.failed > 0
            ? 207
            : 200,
      },
    );
  } catch (error) {
    console.error(
      "[CUSTOMER SYNC FATAL ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Customer synchronization failed.",

        direction: "LOCAL_TO_LIVE",

        stats,

        errors,

        startedAt,

        completedAt: new Date(),
      },
      {
        status: 500,
      },
    );
  } finally {
    customerSyncRunning = false;
  }
}

// =======================================================
// GET - SYNC STATUS
// =======================================================

export async function GET() {
  return NextResponse.json({
    success: true,

    running: customerSyncRunning,

    direction: "LOCAL_TO_LIVE",

    environment:
      process.env.NODE_ENV || "development",

    liveConfigured:
      Boolean(
        process.env.LIVE_DATABASE_URL,
      ),
  });
}