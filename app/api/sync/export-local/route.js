// app/api/sync/export-local/route.js

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const localDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LOCAL_DATABASE_URL,
    },
  },
});

const liveDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LIVE_DATABASE_URL,
    },
  },
});

// =====================================================
// CUSTOMER SYNC
// CREATE + UPDATE + SOFT DELETE
// =====================================================

async function syncCustomers({ sourceDb, targetDb, sourceName, targetName }) {
  const customers = await sourceDb.customer_sync.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  console.log(`[CUSTOMER SYNC] ${sourceName} records:`, customers.length);

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const customer of customers) {
    try {
      console.log(
        `[CUSTOMER SYNC] ${sourceName} → ${targetName}:`,
        customer.email,
      );

      // =================================================
      // VALIDATION
      // =================================================

      if (!customer.id) {
        throw new Error("Customer ID is missing");
      }

      if (!customer.email) {
        throw new Error("Customer email is missing");
      }

      // =================================================
      // FIND TARGET BY ID
      // =================================================

      let existingCustomer = await targetDb.customer_sync.findUnique({
        where: {
          id: customer.id,
        },
      });

      // =================================================
      // FALLBACK: FIND BY EMAIL
      // =================================================

      if (!existingCustomer) {
        existingCustomer = await targetDb.customer_sync.findUnique({
          where: {
            email: customer.email,
          },
        });
      }

      // =================================================
      // CREATE
      // =================================================

      if (!existingCustomer) {
        await targetDb.customer_sync.create({
          data: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone || null,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt,
            deletedAt: customer.deletedAt || null,
            lastSyncedAt: new Date(),
          },
        });

        if (customer.deletedAt) {
          deleted++;

          console.log(
            `[CUSTOMER SYNC] Created deleted record in ${targetName}:`,
            customer.email,
          );
        } else {
          created++;

          console.log(`[CUSTOMER SYNC] Created ${targetName}:`, customer.email);
        }

        continue;
      }

      // =================================================
      // COMPARE UPDATED DATE
      // =================================================

      const sourceUpdated = new Date(customer.updatedAt).getTime();

      const targetUpdated = new Date(existingCustomer.updatedAt).getTime();

      // =================================================
      // TARGET IS SAME OR NEWER
      // =================================================

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        console.log(`[CUSTOMER SYNC] Skipped ${targetName}:`, customer.email);

        continue;
      }

      // =================================================
      // SOURCE DELETED
      // =================================================

      if (customer.deletedAt) {
        await targetDb.customer_sync.update({
          where: {
            id: existingCustomer.id,
          },
          data: {
            deletedAt: customer.deletedAt,
            updatedAt: customer.updatedAt,
            lastSyncedAt: new Date(),
          },
        });

        deleted++;

        console.log(`[CUSTOMER SYNC] Deleted ${targetName}:`, customer.email);

        continue;
      }

      // =================================================
      // SOURCE RESTORED
      // =================================================

      if (existingCustomer.deletedAt && !customer.deletedAt) {
        await targetDb.customer_sync.update({
          where: {
            id: existingCustomer.id,
          },
          data: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone || null,
            deletedAt: null,
            updatedAt: customer.updatedAt,
            lastSyncedAt: new Date(),
          },
        });

        updated++;

        console.log(`[CUSTOMER SYNC] Restored ${targetName}:`, customer.email);

        continue;
      }

      // =================================================
      // NORMAL UPDATE
      // =================================================

      await targetDb.customer_sync.update({
        where: {
          id: existingCustomer.id,
        },
        data: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone || null,
          updatedAt: customer.updatedAt,
          deletedAt: null,
          lastSyncedAt: new Date(),
        },
      });

      updated++;

      console.log(`[CUSTOMER SYNC] Updated ${targetName}:`, customer.email);
    } catch (customerError) {
      failed++;

      console.error(
        `[CUSTOMER SYNC] Failed ${sourceName} → ${targetName}:`,
        customer.email,
        customerError,
      );

      errors.push({
        id: customer.id,
        email: customer.email,
        source: sourceName,
        target: targetName,
        error: customerError?.message || "Failed to synchronize customer",
      });
    }
  }

  return {
    total: customers.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}

// =====================================================
// CUSTOM FIELD SYNC
//
// CREATE + UPDATE + DELETE
//
// CustomField ID is String @id.
// The same UUID is kept on Local and Live.
//
// IMPORTANT:
// CustomField does not use deletedAt.
// Therefore records that exist on target but no longer
// exist on source are physically deleted.
// =====================================================

async function syncCustomFields({
  sourceDb,
  targetDb,
  sourceName,
  targetName,
}) {
  const sourceFields = await sourceDb.customField.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  const targetFields = await targetDb.customField.findMany();

  console.log(
    `[CUSTOM FIELD SYNC] ${sourceName} records:`,
    sourceFields.length,
  );

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  // =====================================================
  // TARGET MAP
  // =====================================================

  const targetMap = new Map(
    targetFields.map((field) => [String(field.id), field]),
  );

  // =====================================================
  // SOURCE IDS
  // =====================================================

  const sourceIds = new Set(sourceFields.map((field) => String(field.id)));

  // =====================================================
  // CREATE + UPDATE
  // =====================================================

  for (const field of sourceFields) {
    try {
      const fieldId = String(field.id || "").trim();

      // =================================================
      // VALIDATION
      // =================================================

      if (!fieldId) {
        throw new Error("CustomField ID is missing");
      }

      if (!field.name) {
        throw new Error("CustomField name is missing");
      }

      console.log(
        `[CUSTOM FIELD SYNC] ${sourceName} → ${targetName}:`,
        field.name,
        fieldId,
      );

      // =================================================
      // FIND TARGET
      // =================================================

      const existingField = targetMap.get(fieldId);

      // =================================================
      // CREATE
      // =================================================

      if (!existingField) {
        await targetDb.customField.create({
          data: {
            id: fieldId,

            fieldto: field.fieldto,
            name: field.name,
            slug: field.slug,
            type: field.type,

            options: field.options,
            defaultValue: field.defaultValue,

            fieldOrder: field.fieldOrder,
            bsColumn: field.bsColumn,

            disabled: field.disabled,
            required: field.required,

            showOnTable: field.showOnTable,

            showOnPdf: field.showOnPdf,

            showOnClientPortal: field.showOnClientPortal,

            showOnTicketForm: field.showOnTicketForm,

            createdAt: field.createdAt,
            updatedAt: field.updatedAt,
            deletedAt: field.deletedAt || null,
            lastSyncedAt: new Date(),
          },
        });
        if (customField.deletedAt) {
          deleted++;

          console.log(
            `[CUSTOM FIELD SYNC] Created deleted record in ${targetName}:`,
            field.name,
          );
        } else {
          created++;

          console.log(
            `[CUSTOM FIELD SYNC] Created ${targetName}:`,
            field.name,
            fieldId,
          );
        }

        continue;
      }

      // =================================================
      // COMPARE UPDATED DATE
      // =================================================

      const sourceUpdated = new Date(field.updatedAt).getTime();

      const targetUpdated = new Date(existingField.updatedAt).getTime();

      // =================================================
      // TARGET IS SAME OR NEWER
      // =================================================

      if (
        !Number.isNaN(sourceUpdated) &&
        !Number.isNaN(targetUpdated) &&
        sourceUpdated <= targetUpdated
      ) {
        skipped++;

        console.log(
          `[CUSTOM FIELD SYNC] Skipped ${targetName}:`,
          field.name,
          "(target is same/newer)",
        );

        continue;
      }

      // =================================================
      // UPDATE
      // =================================================

      await targetDb.customField.update({
        where: {
          id: fieldId,
        },

        data: {
          fieldto: field.fieldto,
          name: field.name,
          slug: field.slug,
          type: field.type,

          options: field.options,
          defaultValue: field.defaultValue,
          fieldOrder: field.fieldOrder,
          bsColumn: field.bsColumn,

          disabled: field.disabled,
          required: field.required,

          showOnTable: field.showOnTable,

          showOnPdf: field.showOnPdf,

          showOnClientPortal: field.showOnClientPortal,

          showOnTicketForm: field.showOnTicketForm,

          updatedAt: field.updatedAt,
          deletedAt: field.deletedAt || null,
        },
      });

      updated++;

      console.log(
        `[CUSTOM FIELD SYNC] Updated ${targetName}:`,
        field.name,
        fieldId,
      );
    } catch (fieldError) {
      failed++;

      console.error(
        `[CUSTOM FIELD SYNC] Failed ${sourceName} → ${targetName}:`,
        field?.name,
        fieldError,
      );

      errors.push({
        id: field?.id ? String(field.id) : null,

        name: field?.name || null,

        source: sourceName,
        target: targetName,

        error: fieldError?.message || "Failed to synchronize custom field",
      });
    }
  }

  // =====================================================
  // DELETE
  //
  // If a CustomField exists in TARGET but does not exist
  // in SOURCE, remove it from TARGET.
  // =====================================================

  for (const targetField of targetFields) {
    try {
      const targetId = String(targetField.id || "").trim();

      if (!targetId) {
        continue;
      }

      if (!sourceIds.has(targetId)) {
        await targetDb.customField.update({
          where: {
            id: targetId,
          },
          data: {
            deletedAt: new Date(),
            updatedAt: targetField.updatedAt,
            lastSyncedAt: new Date(),
          },
        });

        deleted++;
        console.log(
          `[CUSTOM FIELD SYNC] Deleted ${targetName}:`,
          targetField.name,
          targetId,
        );

        continue;
      }
    } catch (deleteError) {
      failed++;

      console.error(
        `[CUSTOM FIELD SYNC] Delete failed ${targetName}:`,
        targetField?.name,
        deleteError,
      );

      errors.push({
        id: targetField?.id ? String(targetField.id) : null,

        name: targetField?.name || null,

        source: sourceName,
        target: targetName,

        error: deleteError?.message || "Failed to delete custom field",
      });
    }
    // =================================================
    // SOURCE RESTORED
    // =================================================
    const targetId = String(targetField.id || "").trim();
    if (targetField.deletedAt && !targetField.deletedAt) {
      await targetDb.customField.update({
        where: {
          id: targetId,
        },
        data: {
          name: targetField?.name || null,
          deletedAt: null,
          updatedAt: targetField.updatedAt,
          lastSyncedAt: new Date(),
        },
      });

      updated++;

      console.log(`[CUSTOMER Field] Restored ${targetName}:`, targetField.name);

      continue;
    }
  }

  return {
    total: sourceFields.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}
// =====================================================
// COUNTRY SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncCountries({ sourceDb, targetDb, sourceName, targetName }) {
  const countries = await sourceDb.country.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  console.log(`[COUNTRY SYNC] ${sourceName} records:`, countries.length);

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  // =====================================================
  // PROCESS EACH COUNTRY
  // =====================================================

  for (const country of countries) {
    try {
      console.log(
        `[COUNTRY SYNC] ${sourceName} → ${targetName}:`,
        country.name,
        country.id,
      );

      // =================================================
      // VALIDATION
      // =================================================

      if (!country.id) {
        throw new Error("Country ID is missing");
      }

      if (!country.name) {
        throw new Error("Country name is missing");
      }

      if (!country.iso2) {
        throw new Error("Country ISO2 is missing");
      }

      if (!country.iso3) {
        throw new Error("Country ISO3 is missing");
      }

      const countryId = String(country.id);

      // =================================================
      // FIND TARGET BY UUID
      // =================================================

      const existingCountry = await targetDb.country.findUnique({
        where: {
          id: countryId,
        },
      });

      // =================================================
      // CREATE
      // =================================================

      if (!existingCountry) {
        await targetDb.country.create({
          data: {
            id: countryId,

            name: country.name,
            iso2: country.iso2,
            iso3: country.iso3,

            phoneCode: country.phoneCode || null,

            currencyCode: country.currencyCode || null,

            currencyName: country.currencyName || null,

            isActive: country.isActive ?? true,

            createdAt: country.createdAt,

            updatedAt: country.updatedAt,

            deletedAt: country.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        // -----------------------------------------------
        // CREATED AS DELETED
        // -----------------------------------------------

        if (country.deletedAt) {
          deleted++;

          console.log(
            `[COUNTRY SYNC] Created deleted record in ${targetName}:`,
            country.name,
            countryId,
          );
        } else {
          created++;

          console.log(
            `[COUNTRY SYNC] Created ${targetName}:`,
            country.name,
            countryId,
          );
        }

        continue;
      }

      // =================================================
      // COMPARE UPDATED DATE
      // =================================================

      const sourceUpdated = new Date(country.updatedAt).getTime();

      const targetUpdated = new Date(existingCountry.updatedAt).getTime();

      // =================================================
      // INVALID DATE FALLBACK
      // =================================================

      if (Number.isNaN(sourceUpdated) || Number.isNaN(targetUpdated)) {
        console.log(
          `[COUNTRY SYNC] Invalid updatedAt detected for ${country.name}.`,
        );
      }

      // =================================================
      // TARGET IS SAME OR NEWER
      // =================================================

      if (
        !Number.isNaN(sourceUpdated) &&
        !Number.isNaN(targetUpdated) &&
        sourceUpdated <= targetUpdated
      ) {
        skipped++;

        console.log(
          `[COUNTRY SYNC] Skipped ${targetName}:`,
          country.name,
          "(target is same/newer)",
        );

        continue;
      }

      // =================================================
      // SOURCE DELETED
      // =================================================

      if (country.deletedAt) {
        await targetDb.country.update({
          where: {
            id: countryId,
          },

          data: {
            deletedAt: country.deletedAt,

            isActive: false,

            updatedAt: country.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        console.log(
          `[COUNTRY SYNC] Deleted ${targetName}:`,
          country.name,
          countryId,
        );

        continue;
      }

      // =================================================
      // SOURCE RESTORED
      // =================================================

      if (existingCountry.deletedAt && !country.deletedAt) {
        await targetDb.country.update({
          where: {
            id: countryId,
          },

          data: {
            name: country.name,

            iso2: country.iso2,

            iso3: country.iso3,

            phoneCode: country.phoneCode || null,

            currencyCode: country.currencyCode || null,

            currencyName: country.currencyName || null,

            isActive: country.isActive ?? true,

            deletedAt: null,

            updatedAt: country.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        updated++;

        console.log(
          `[COUNTRY SYNC] Restored ${targetName}:`,
          country.name,
          countryId,
        );

        continue;
      }

      // =================================================
      // NORMAL UPDATE
      // =================================================

      await targetDb.country.update({
        where: {
          id: countryId,
        },

        data: {
          name: country.name,

          iso2: country.iso2,

          iso3: country.iso3,

          phoneCode: country.phoneCode || null,

          currencyCode: country.currencyCode || null,

          currencyName: country.currencyName || null,

          isActive: country.isActive ?? true,

          deletedAt: null,

          updatedAt: country.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;

      console.log(
        `[COUNTRY SYNC] Updated ${targetName}:`,
        country.name,
        countryId,
      );
    } catch (countryError) {
      failed++;

      console.error(
        `[COUNTRY SYNC] Failed ${sourceName} → ${targetName}:`,
        country?.name,
        countryError,
      );

      errors.push({
        id: country?.id ? String(country.id) : null,

        name: country?.name || null,

        iso2: country?.iso2 || null,

        iso3: country?.iso3 || null,

        source: sourceName,
        target: targetName,

        error: countryError?.message || "Failed to synchronize country",
      });
    }
  }

  // =====================================================
  // RETURN RESULT
  // =====================================================

  return {
    total: countries.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}
// =====================================================
// POST - TWO WAY SYNC
// =====================================================
//
// LOCAL → LIVE
//   CustomerSync
//   CustomField
//
// LIVE → LOCAL
//   CustomerSync
//   CustomField
//
// =====================================================

export async function POST() {
  try {
    console.log("");
    console.log("======================================");
    console.log("[SYNC] TWO-WAY SYNC STARTED");
    console.log("======================================");

    // =====================================================
    // CHECK DATABASE CONNECTIONS
    // =====================================================

    await localDb.$queryRaw`SELECT 1`;

    console.log("[SYNC] Local DB connected");

    await liveDb.$queryRaw`SELECT 1`;

    console.log("[SYNC] Live DB connected");

    // =====================================================
    // INITIAL COUNTS
    // =====================================================

    const localCustomerBefore = await localDb.customer_sync.count();

    const liveCustomerBefore = await liveDb.customer_sync.count();

    const localCustomFieldBefore = await localDb.customField.count();

    const liveCustomFieldBefore = await liveDb.customField.count();

    const localCountryBefore = await localDb.country.count();

    const liveCountryBefore = await liveDb.country.count();

    console.log("[SYNC] Local customers before:", localCustomerBefore);

    console.log("[SYNC] Live customers before:", liveCustomerBefore);

    console.log("[SYNC] Local custom fields before:", localCustomFieldBefore);

    console.log("[SYNC] Live custom fields before:", liveCustomFieldBefore);

    console.log("[SYNC] Local countries before:", localCountryBefore);

    console.log("[SYNC] Live countries before:", liveCountryBefore);

    // =====================================================
    // STEP 1
    // LOCAL → LIVE
    // =====================================================

    console.log("");
    console.log("========== LOCAL → LIVE ==========");

    // -----------------------------------------------------
    // CUSTOMERS
    // -----------------------------------------------------

    const localCustomersToLive = await syncCustomers({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    // -----------------------------------------------------
    // CUSTOM FIELDS
    // -----------------------------------------------------

    const localCustomFieldsToLive = await syncCustomFields({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    // -----------------------------------------------------
    // COUNTRIES
    // -----------------------------------------------------

    const localCountriesToLive = await syncCountries({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    // =====================================================
    // STEP 2
    // LIVE → LOCAL
    // =====================================================

    console.log("");
    console.log("========== LIVE → LOCAL ==========");

    // -----------------------------------------------------
    // CUSTOMERS
    // -----------------------------------------------------

    const liveCustomersToLocal = await syncCustomers({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    // -----------------------------------------------------
    // CUSTOM FIELDS
    // -----------------------------------------------------

    const liveCustomFieldsToLocal = await syncCustomFields({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    // -----------------------------------------------------
    // COUNTRIES
    // -----------------------------------------------------

    const liveCountriesToLocal = await syncCountries({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    // =====================================================
    // FINAL COUNTS
    // =====================================================

    const localCustomerAfter = await localDb.customer_sync.count();

    const liveCustomerAfter = await liveDb.customer_sync.count();

    const localCustomFieldAfter = await localDb.customField.count();

    const liveCustomFieldAfter = await liveDb.customField.count();

    const localCountryAfter = await localDb.country.count();

    const liveCountryAfter = await liveDb.country.count();

    console.log("");
    console.log("======================================");
    console.log("[SYNC] TWO-WAY SYNC COMPLETED");
    console.log("======================================");

    console.log("[SYNC] Local customers after:", localCustomerAfter);

    console.log("[SYNC] Live customers after:", liveCustomerAfter);

    console.log("[SYNC] Local custom fields after:", localCustomFieldAfter);

    console.log("[SYNC] Live custom fields after:", liveCustomFieldAfter);

    console.log("[SYNC] Local countries after:", localCountryAfter);

    console.log("[SYNC] Live countries after:", liveCountryAfter);

    // =====================================================
    // CUSTOMER LOGS
    // =====================================================

    console.log("");
    console.log("---------- CUSTOMER SYNC ----------");

    console.log("[SYNC] Local → Live created:", localCustomersToLive.created);

    console.log("[SYNC] Local → Live updated:", localCustomersToLive.updated);

    console.log("[SYNC] Local → Live deleted:", localCustomersToLive.deleted);

    console.log("[SYNC] Local → Live skipped:", localCustomersToLive.skipped);

    console.log("[SYNC] Local → Live failed:", localCustomersToLive.failed);

    console.log("[SYNC] Live → Local created:", liveCustomersToLocal.created);

    console.log("[SYNC] Live → Local updated:", liveCustomersToLocal.updated);

    console.log("[SYNC] Live → Local deleted:", liveCustomersToLocal.deleted);

    console.log("[SYNC] Live → Local skipped:", liveCustomersToLocal.skipped);

    console.log("[SYNC] Live → Local failed:", liveCustomersToLocal.failed);

    // =====================================================
    // CUSTOM FIELD LOGS
    // =====================================================

    console.log("");
    console.log("-------- CUSTOM FIELD SYNC --------");

    console.log(
      "[SYNC] Local → Live created:",
      localCustomFieldsToLive.created,
    );

    console.log(
      "[SYNC] Local → Live updated:",
      localCustomFieldsToLive.updated,
    );

    console.log(
      "[SYNC] Local → Live deleted:",
      localCustomFieldsToLive.deleted,
    );

    console.log(
      "[SYNC] Local → Live skipped:",
      localCustomFieldsToLive.skipped,
    );

    console.log("[SYNC] Local → Live failed:", localCustomFieldsToLive.failed);

    console.log(
      "[SYNC] Live → Local created:",
      liveCustomFieldsToLocal.created,
    );

    console.log(
      "[SYNC] Live → Local updated:",
      liveCustomFieldsToLocal.updated,
    );

    console.log(
      "[SYNC] Live → Local deleted:",
      liveCustomFieldsToLocal.deleted,
    );

    console.log(
      "[SYNC] Live → Local skipped:",
      liveCustomFieldsToLocal.skipped,
    );

    console.log("[SYNC] Live → Local failed:", liveCustomFieldsToLocal.failed);

    // =====================================================
    // COUNTRY LOGS
    // =====================================================

    console.log("");
    console.log("---------- COUNTRY SYNC ----------");

    console.log("[SYNC] Local → Live created:", localCountriesToLive.created);

    console.log("[SYNC] Local → Live updated:", localCountriesToLive.updated);

    console.log("[SYNC] Local → Live deleted:", localCountriesToLive.deleted);

    console.log("[SYNC] Local → Live skipped:", localCountriesToLive.skipped);

    console.log("[SYNC] Local → Live failed:", localCountriesToLive.failed);

    console.log("[SYNC] Live → Local created:", liveCountriesToLocal.created);

    console.log("[SYNC] Live → Local updated:", liveCountriesToLocal.updated);

    console.log("[SYNC] Live → Local deleted:", liveCountriesToLocal.deleted);

    console.log("[SYNC] Live → Local skipped:", liveCountriesToLocal.skipped);

    console.log("[SYNC] Live → Local failed:", liveCountriesToLocal.failed);

    console.log("======================================");

    // =====================================================
    // ALL ERRORS
    // =====================================================

    const errors = [
      ...localCustomersToLive.errors,
      ...liveCustomersToLocal.errors,

      ...localCustomFieldsToLive.errors,
      ...liveCustomFieldsToLocal.errors,

      ...localCountriesToLive.errors,
      ...liveCountriesToLocal.errors,
    ];

    // =====================================================
    // CHECK DATABASE COUNTS
    // =====================================================

    const customerDatabasesEqual = localCustomerAfter === liveCustomerAfter;

    const customFieldDatabasesEqual =
      localCustomFieldAfter === liveCustomFieldAfter;

    const countryDatabasesEqual = localCountryAfter === liveCountryAfter;

    const databasesEqual =
      customerDatabasesEqual &&
      customFieldDatabasesEqual &&
      countryDatabasesEqual;

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message: databasesEqual
        ? "Local and Live databases are synchronized successfully."
        : "Synchronization completed, but one or more database totals are different.",

      databasesEqual,

      customersEqual: customerDatabasesEqual,

      customFieldsEqual: customFieldDatabasesEqual,

      countriesEqual: countryDatabasesEqual,

      // ===================================================
      // BEFORE
      // ===================================================

      before: {
        local: {
          customers: localCustomerBefore,

          customFields: localCustomFieldBefore,

          countries: localCountryBefore,
        },

        live: {
          customers: liveCustomerBefore,

          customFields: liveCustomFieldBefore,

          countries: liveCountryBefore,
        },
      },

      // ===================================================
      // AFTER
      // ===================================================

      after: {
        local: {
          customers: localCustomerAfter,

          customFields: localCustomFieldAfter,

          countries: localCountryAfter,
        },

        live: {
          customers: liveCustomerAfter,

          customFields: liveCustomFieldAfter,

          countries: liveCountryAfter,
        },
      },

      // ===================================================
      // LOCAL → LIVE
      // ===================================================

      localToLive: {
        customers: {
          total: localCustomersToLive.total,

          created: localCustomersToLive.created,

          updated: localCustomersToLive.updated,

          deleted: localCustomersToLive.deleted,

          skipped: localCustomersToLive.skipped,

          failed: localCustomersToLive.failed,
        },

        customFields: {
          total: localCustomFieldsToLive.total,

          created: localCustomFieldsToLive.created,

          updated: localCustomFieldsToLive.updated,

          deleted: localCustomFieldsToLive.deleted,

          skipped: localCustomFieldsToLive.skipped,

          failed: localCustomFieldsToLive.failed,
        },

        countries: {
          total: localCountriesToLive.total,

          created: localCountriesToLive.created,

          updated: localCountriesToLive.updated,

          deleted: localCountriesToLive.deleted,

          skipped: localCountriesToLive.skipped,

          failed: localCountriesToLive.failed,
        },
      },

      // ===================================================
      // LIVE → LOCAL
      // ===================================================

      liveToLocal: {
        customers: {
          total: liveCustomersToLocal.total,

          created: liveCustomersToLocal.created,

          updated: liveCustomersToLocal.updated,

          deleted: liveCustomersToLocal.deleted,

          skipped: liveCustomersToLocal.skipped,

          failed: liveCustomersToLocal.failed,
        },

        customFields: {
          total: liveCustomFieldsToLocal.total,

          created: liveCustomFieldsToLocal.created,

          updated: liveCustomFieldsToLocal.updated,

          deleted: liveCustomFieldsToLocal.deleted,

          skipped: liveCustomFieldsToLocal.skipped,

          failed: liveCustomFieldsToLocal.failed,
        },

        countries: {
          total: liveCountriesToLocal.total,

          created: liveCountriesToLocal.created,

          updated: liveCountriesToLocal.updated,

          deleted: liveCountriesToLocal.deleted,

          skipped: liveCountriesToLocal.skipped,

          failed: liveCountriesToLocal.failed,
        },
      },

      // ===================================================
      // ERRORS
      // ===================================================

      errors,
    });
  } catch (error) {
    console.error("");
    console.error("======================================");
    console.error("[SYNC ERROR]");
    console.error("MESSAGE:", error?.message);
    console.error("CODE:", error?.code);
    console.error("META:", error?.meta);
    console.error("STACK:", error?.stack);
    console.error("======================================");

    return NextResponse.json(
      {
        success: false,

        error: error?.message || "Database synchronization failed.",

        code: error?.code || null,

        meta: error?.meta || null,
      },
      {
        status: 500,
      },
    );
  }
}
