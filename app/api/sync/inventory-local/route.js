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
// ITEM GROUP SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncItemGroups({ sourceDb, targetDb, sourceName, targetName }) {
  const itemGroups = await sourceDb.itemGroup.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const itemGroup of itemGroups) {
    try {
      if (!itemGroup.id) {
        throw new Error("ItemGroup ID missing");
      }

      if (!itemGroup.groupName) {
        throw new Error("ItemGroup name missing");
      }

      const existingGroup = await targetDb.itemGroup.findUnique({
        where: {
          id: itemGroup.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existingGroup) {
        await targetDb.itemGroup.create({
          data: {
            id: itemGroup.id,

            groupName: itemGroup.groupName,

            description: itemGroup.description || null,

            status: itemGroup.status ?? true,

            isDefault: itemGroup.isDefault ?? false,

            createdAt: itemGroup.createdAt,

            updatedAt: itemGroup.updatedAt,

            deletedAt: itemGroup.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        if (itemGroup.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(itemGroup.updatedAt).getTime();

      const targetUpdated = new Date(existingGroup.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        continue;
      }

      // ==========================
      // DELETE
      // ==========================

      if (itemGroup.deletedAt) {
        await targetDb.itemGroup.update({
          where: {
            id: itemGroup.id,
          },

          data: {
            deletedAt: itemGroup.deletedAt,

            updatedAt: itemGroup.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        continue;
      }

      // ==========================
      // RESTORE
      // ==========================

      if (existingGroup.deletedAt && !itemGroup.deletedAt) {
        await targetDb.itemGroup.update({
          where: {
            id: itemGroup.id,
          },

          data: {
            groupName: itemGroup.groupName,

            description: itemGroup.description || null,

            status: itemGroup.status ?? true,

            isDefault: itemGroup.isDefault ?? false,

            deletedAt: null,

            updatedAt: itemGroup.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        updated++;

        continue;
      }

      // ==========================
      // UPDATE
      // ==========================

      await targetDb.itemGroup.update({
        where: {
          id: itemGroup.id,
        },

        data: {
          groupName: itemGroup.groupName,

          description: itemGroup.description || null,

          status: itemGroup.status ?? true,

          isDefault: itemGroup.isDefault ?? false,

          deletedAt: null,

          updatedAt: itemGroup.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: itemGroup?.id || null,

        groupName: itemGroup?.groupName || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: itemGroups.length,

    created,

    updated,

    deleted,

    skipped,

    failed,

    errors,
  };
}
// =====================================================
// UNIT SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncUnits({ sourceDb, targetDb, sourceName, targetName }) {
  const units = await sourceDb.unit.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const unit of units) {
    try {
      if (!unit.id) {
        throw new Error("Unit ID missing");
      }

      if (!unit.unitName) {
        throw new Error("Unit name missing");
      }

      const existingUnit = await targetDb.unit.findUnique({
        where: {
          id: unit.id,
        },
      });

      // CREATE

      if (!existingUnit) {
        await targetDb.unit.create({
          data: {
            id: unit.id,

            unitName: unit.unitName,

            abbreviation: unit.abbreviation || "",

            status: unit.status ?? true,

            createdAt: unit.createdAt,

            updatedAt: unit.updatedAt,

            deletedAt: unit.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        if (unit.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // DATE CHECK

      const sourceUpdated = new Date(unit.updatedAt).getTime();

      const targetUpdated = new Date(existingUnit.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        continue;
      }

      // DELETE

      if (unit.deletedAt) {
        await targetDb.unit.update({
          where: {
            id: unit.id,
          },

          data: {
            deletedAt: unit.deletedAt,

            updatedAt: unit.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        continue;
      }

      // RESTORE

      if (existingUnit.deletedAt && !unit.deletedAt) {
        await targetDb.unit.update({
          where: {
            id: unit.id,
          },

          data: {
            unitName: unit.unitName,

            abbreviation: unit.abbreviation || "",

            status: unit.status ?? true,

            deletedAt: null,

            updatedAt: unit.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        updated++;

        continue;
      }

      // UPDATE

      await targetDb.unit.update({
        where: {
          id: unit.id,
        },

        data: {
          unitName: unit.unitName,

          abbreviation: unit.abbreviation || "",

          status: unit.status ?? true,

          deletedAt: null,

          updatedAt: unit.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: unit?.id || null,

        unitName: unit?.unitName || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: units.length,

    created,

    updated,

    deleted,

    skipped,

    failed,

    errors,
  };
}
// =====================================================
// Item TYPE SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncProductTypes({
  sourceDb,
  targetDb,
  sourceName,
  targetName,
}) {
  const productTypes = await sourceDb.ptoductType.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const productType of productTypes) {
    try {
      if (!productType.id) {
        throw new Error("Item Type ID missing");
      }

      if (!productType.ProductType) {
        throw new Error("Item Type name missing");
      }

      const existingProductType = await targetDb.ptoductType.findUnique({
        where: {
          id: productType.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existingProductType) {
        await targetDb.ptoductType.create({
          data: {
            id: productType.id,

            ProductType: productType.ProductType,

            Description: productType.Description || "",

            status: productType.status ?? true,

            isDefault: productType.isDefault ?? false,

            createdAt: productType.createdAt,

            updatedAt: productType.updatedAt,

            deletedAt: productType.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        if (productType.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(productType.updatedAt).getTime();

      const targetUpdated = new Date(existingProductType.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        continue;
      }

      // ==========================
      // DELETE
      // ==========================

      if (productType.deletedAt) {
        await targetDb.ptoductType.update({
          where: {
            id: productType.id,
          },

          data: {
            deletedAt: productType.deletedAt,

            updatedAt: productType.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        continue;
      }

      // ==========================
      // RESTORE
      // ==========================

      if (existingProductType.deletedAt && !productType.deletedAt) {
        await targetDb.ptoductType.update({
          where: {
            id: productType.id,
          },

          data: {
            ProductType: productType.ProductType,

            Description: productType.Description || "",

            status: productType.status ?? true,

            isDefault: productType.isDefault ?? false,

            deletedAt: null,

            updatedAt: productType.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        updated++;

        continue;
      }

      // ==========================
      // UPDATE
      // ==========================

      await targetDb.ptoductType.update({
        where: {
          id: productType.id,
        },

        data: {
          ProductType: productType.ProductType,

          Description: productType.Description || "",

          status: productType.status ?? true,

          isDefault: productType.isDefault ?? false,

          deletedAt: null,

          updatedAt: productType.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: productType?.id || null,

        ProductType: productType?.ProductType || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: productTypes.length,

    created,

    updated,

    deleted,

    skipped,

    failed,

    errors,
  };
}
// =====================================================
// TRANSACTION TYPE SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncTransactionTypes({
  sourceDb,
  targetDb,
  sourceName,
  targetName,
}) {
  const transactionTypes = await sourceDb.transactionType.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const transactionType of transactionTypes) {
    try {
      if (!transactionType.id) {
        throw new Error("Transaction Type ID missing");
      }

      if (!transactionType.TransactionType) {
        throw new Error("Transaction Type name missing");
      }

      const existing = await targetDb.transactionType.findUnique({
        where: {
          id: transactionType.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existing) {
        await targetDb.transactionType.create({
          data: {
            id: transactionType.id,

            TransactionType: transactionType.TransactionType,

            Description: transactionType.Description || "",

            EffectOnTransaction: transactionType.EffectOnTransaction,

            status: transactionType.status ?? true,

            isDefault: transactionType.isDefault ?? false,

            createdAt: transactionType.createdAt,

            updatedAt: transactionType.updatedAt,

            deletedAt: transactionType.deletedAt || null,

            lastSyncAt: new Date(),

            customFields: transactionType.customFields,
          },
        });

        transactionType.deletedAt ? deleted++ : created++;

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(transactionType.updatedAt).getTime();

      const targetUpdated = new Date(existing.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        continue;
      }

      // ==========================
      // DELETE
      // ==========================

      if (transactionType.deletedAt) {
        await targetDb.transactionType.update({
          where: {
            id: transactionType.id,
          },

          data: {
            deletedAt: transactionType.deletedAt,

            updatedAt: transactionType.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        continue;
      }

      // ==========================
      // RESTORE
      // ==========================

      if (existing.deletedAt && !transactionType.deletedAt) {
        await targetDb.transactionType.update({
          where: {
            id: transactionType.id,
          },

          data: {
            TransactionType: transactionType.TransactionType,

            Description: transactionType.Description || "",

            EffectOnTransaction: transactionType.EffectOnTransaction,

            status: transactionType.status ?? true,

            isDefault: transactionType.isDefault ?? false,

            deletedAt: null,

            updatedAt: transactionType.updatedAt,

            lastSyncAt: new Date(),

            customFields: transactionType.customFields,
          },
        });

        updated++;

        continue;
      }

      // ==========================
      // UPDATE
      // ==========================

      await targetDb.transactionType.update({
        where: {
          id: transactionType.id,
        },

        data: {
          TransactionType: transactionType.TransactionType,

          Description: transactionType.Description || "",

          EffectOnTransaction: transactionType.EffectOnTransaction,

          status: transactionType.status ?? true,

          isDefault: transactionType.isDefault ?? false,

          deletedAt: null,

          updatedAt: transactionType.updatedAt,

          lastSyncAt: new Date(),

          customFields: transactionType.customFields,
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: transactionType?.id || null,

        TransactionType: transactionType?.TransactionType || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: transactionTypes.length,

    created,

    updated,

    deleted,

    skipped,

    failed,

    errors,
  };
}
// =====================================================
// ITEM MASTER SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncItemMasters({ sourceDb, targetDb, sourceName, targetName }) {
  const itemMasters = await sourceDb.itemMaster.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const item of itemMasters) {
    try {
      if (!item.id) {
        throw new Error("ItemMaster ID missing");
      }

      if (!item.ItemName) {
        throw new Error("ItemMaster name missing");
      }

      const existing = await targetDb.itemMaster.findUnique({
        where: {
          id: item.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existing) {
        await targetDb.itemMaster.create({
          data: {
            id: item.id,

            ItemGroupid: item.ItemGroupid || null,

            ItemName: item.ItemName,

            Description: item.Description || null,

            openingBalance: item.openingBalance ?? null,

            Unitid: item.Unitid || null,

            rather: item.rather ?? 0,

            Tax1: item.Tax1 || null,

            Tax2: item.Tax2 || null,

            ApplicableForRelocateLevel:
              item.ApplicableForRelocateLevel ?? false,

            RelocateLevel: item.RelocateLevel || null,

            status: item.status ?? true,

            isDefault: item.isDefault ?? false,

            createdAt: item.createdAt,

            updatedAt: item.updatedAt,

            deletedAt: item.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        item.deletedAt ? deleted++ : created++;

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(item.updatedAt).getTime();

      const targetUpdated = new Date(existing.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        continue;
      }

      // ==========================
      // DELETE
      // ==========================

      if (item.deletedAt) {
        await targetDb.itemMaster.update({
          where: {
            id: item.id,
          },

          data: {
            deletedAt: item.deletedAt,

            updatedAt: item.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        continue;
      }

      // ==========================
      // RESTORE / UPDATE
      // ==========================

      await targetDb.itemMaster.update({
        where: {
          id: item.id,
        },

        data: {
          ItemGroupid: item.ItemGroupid || null,

          ItemName: item.ItemName,

          Description: item.Description || null,

          openingBalance: item.openingBalance ?? null,

          Unitid: item.Unitid || null,

          rather: item.rather ?? 0,

          Tax1: item.Tax1 || null,

          Tax2: item.Tax2 || null,

          ApplicableForRelocateLevel: item.ApplicableForRelocateLevel ?? false,

          RelocateLevel: item.RelocateLevel || null,

          status: item.status ?? true,

          isDefault: item.isDefault ?? false,

          deletedAt: null,

          updatedAt: item.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: item?.id || null,

        ItemName: item?.ItemName || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: itemMasters.length,

    created,

    updated,

    deleted,

    skipped,

    failed,

    errors,
  };
}
// =====================================================
// TAX SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncTaxes({ sourceDb, targetDb, sourceName, targetName }) {
  const taxes = await sourceDb.tax.findMany({
    orderBy: {
      updatedAt: "asc",
    },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const tax of taxes) {
    try {
      if (!tax.id) {
        throw new Error("Tax ID missing");
      }

      if (!tax.name) {
        throw new Error("Tax name missing");
      }

      const existingTax = await targetDb.tax.findUnique({
        where: {
          id: tax.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existingTax) {
        await targetDb.tax.create({
          data: {
            name: tax.name,

            taxrate: tax.taxrate ?? 0,

            createdAt: tax.createdAt,

            updatedAt: tax.updatedAt,

            deletedAt: tax.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        if (tax.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(tax.updatedAt).getTime();

      const targetUpdated = new Date(existingTax.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        continue;
      }

      // ==========================
      // DELETE
      // ==========================

      if (tax.deletedAt) {
        await targetDb.tax.update({
          where: {
            id: tax.id,
          },

          data: {
            deletedAt: tax.deletedAt,

            updatedAt: tax.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        continue;
      }

      // ==========================
      // RESTORE
      // ==========================

      if (existingTax.deletedAt && !tax.deletedAt) {
        await targetDb.tax.update({
          where: {
            id: tax.id,
          },

          data: {
            name: tax.name,

            taxrate: tax.taxrate ?? 0,

            deletedAt: null,

            updatedAt: tax.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        updated++;

        continue;
      }

      // ==========================
      // UPDATE
      // ==========================

      await targetDb.tax.update({
        where: {
          id: tax.id,
        },

        data: {
          name: tax.name,

          taxrate: tax.taxrate ?? 0,

          deletedAt: null,

          updatedAt: tax.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: tax?.id || null,

        name: tax?.name || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: taxes.length,

    created,

    updated,

    deleted,

    skipped,

    failed,

    errors,
  };
}


async function syncIssueReceipt({ sourceDb, targetDb, sourceName, targetName }) {
  return syncSimpleModel({
    sourceDb,
    targetDb,
    sourceName,
    targetName,
    modelName: "issueReceipt",
    label: "Issue/Receipt",
    validate: (record) => {
      if (!record.id) throw new Error("Issue/Receipt ID missing");
    },
  });
}

async function syncChangeLog({ sourceDb, targetDb, sourceName, targetName }) {
  return syncSimpleModel({
    sourceDb,
    targetDb,
    sourceName,
    targetName,
    modelName: "inventoryChangeLog",
    label: "Change Log",
    validate: (record) => {
      if (!record.id) throw new Error("Change Log ID missing");
    },
  });
}

// =====================================================
// REUSABLE SYNC: CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncSimpleModel({
  sourceDb,
  targetDb,
  sourceName,
  targetName,
  modelName,
  label,
  validate,
}) {
  const sourceModel = sourceDb[modelName];
  const targetModel = targetDb[modelName];

  if (!sourceModel || !targetModel) {
    throw new Error(
      `Prisma model "${modelName}" is missing in the source or target client.`
    );
  }

  const records = await sourceModel.findMany({
    orderBy: { updatedAt: "asc" },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let restored = 0;
  let skipped = 0;
  let failed = 0;

  const errors = [];

  for (const record of records) {
    try {
      validate(record);

      if (!record.updatedAt) {
        throw new Error(`${label} updatedAt is missing`);
      }

      const existing = await targetModel.findUnique({
        where: { id: record.id },
      });

      // CREATE
      if (!existing) {
        await targetModel.create({
          data: {
            ...record,
            lastSyncAt: new Date(),
          },
        });

        if (record.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // Compare source and target modification dates.
      // If the source is newer, its data wins.
      const sourceUpdated = new Date(record.updatedAt).getTime();
      const targetUpdated = new Date(existing.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;
        continue;
      }

      const wasDeleted = Boolean(existing.deletedAt);
      const isDeleted = Boolean(record.deletedAt);

      // UPDATE
      await targetModel.update({
        where: { id: record.id },
        data: {
          ...record,
          lastSyncAt: new Date(),
        },
      });

      if (isDeleted) {
        deleted++;
      } else if (wasDeleted) {
        restored++;
      } else {
        updated++;
      }
    } catch (error) {
      failed++;

      errors.push({
        id: record?.id ?? null,
        source: sourceName,
        target: targetName,
        model: label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: records.length,
    created,
    updated,
    deleted,
    restored,
    skipped,
    failed,
    errors,
  };
}

// =====================================================
// POST INVENTORY SYNC
// LOCAL ↔ LIVE
// =====================================================

export async function POST() {
  try {
    await localDb.$queryRaw`SELECT 1`;
    await liveDb.$queryRaw`SELECT 1`;

    // ==========================
    // BEFORE COUNT
    // ==========================

    const localBefore = {
      itemGroups: await localDb.itemGroup.count(),
      units: await localDb.unit.count(),
      taxes: await localDb.tax.count(),
      transactionTypes: await localDb.transactionType.count(),
      itemMasters: await localDb.itemMaster.count(),
      issueReceipts: await localDb.issueReceipt.count(),
      inventoryChangeLogs: await localDb.inventoryChangeLog.count(),
    };

    const liveBefore = {
      itemGroups: await liveDb.itemGroup.count(),
      units: await liveDb.unit.count(),
      taxes: await liveDb.tax.count(),
      transactionTypes: await liveDb.transactionType.count(),
      itemMasters: await liveDb.itemMaster.count(),
      issueReceipts: await liveDb.issueReceipt.count(),
      inventoryChangeLogs: await liveDb.inventoryChangeLog.count(),
    };

    // =====================================================
    // LOCAL → LIVE
    // =====================================================

    const localToLiveItemGroups = await syncItemGroups({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveUnits = await syncUnits({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveTaxes = await syncTaxes({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveTransactionTypes = await syncTransactionTypes({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveItemMasters = await syncItemMasters({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveIssueReceipts = await syncIssueReceipt({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveChangeLogs = await syncChangeLog({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    // =====================================================
    // LIVE → LOCAL
    // =====================================================

    const liveToLocalItemGroups = await syncItemGroups({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalUnits = await syncUnits({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalTaxes = await syncTaxes({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalTransactionTypes = await syncTransactionTypes({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalItemMasters = await syncItemMasters({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalIssueReceipts = await syncIssueReceipt({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalChangeLogs = await syncChangeLog({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    // ==========================
    // AFTER COUNT
    // ==========================

    const localAfter = {
      itemGroups: await localDb.itemGroup.count(),
      units: await localDb.unit.count(),
      taxes: await localDb.tax.count(),
      transactionTypes: await localDb.transactionType.count(),
      itemMasters: await localDb.itemMaster.count(),
      issueReceipts: await localDb.issueReceipt.count(),
      inventoryChangeLogs: await localDb.inventoryChangeLog.count(),
    };

    const liveAfter = {
      itemGroups: await liveDb.itemGroup.count(),
      units: await liveDb.unit.count(),
      taxes: await liveDb.tax.count(),
      transactionTypes: await liveDb.transactionType.count(),
      itemMasters: await liveDb.itemMaster.count(),
      issueReceipts: await liveDb.issueReceipt.count(),
      inventoryChangeLogs: await liveDb.inventoryChangeLog.count(),
    };

    // ==========================
    // RESPONSE
    // ==========================

    return NextResponse.json({
      success: true,
      message: "Inventory synchronization completed.",

      equal: {
        itemGroups:
          localAfter.itemGroups === liveAfter.itemGroups,

        units:
          localAfter.units === liveAfter.units,

        taxes:
          localAfter.taxes === liveAfter.taxes,

        transactionTypes:
          localAfter.transactionTypes === liveAfter.transactionTypes,

        itemMasters:
          localAfter.itemMasters === liveAfter.itemMasters,

        issueReceipts:
          localAfter.issueReceipts === liveAfter.issueReceipts,

        inventoryChangeLogs:
          localAfter.inventoryChangeLogs === liveAfter.inventoryChangeLogs,
      },

      before: {
        local: localBefore,
        live: liveBefore,
      },

      after: {
        local: localAfter,
        live: liveAfter,
      },

      localToLive: {
        itemGroups: localToLiveItemGroups,
        units: localToLiveUnits,
        taxes: localToLiveTaxes,
        transactionTypes: localToLiveTransactionTypes,
        itemMasters: localToLiveItemMasters,
        issueReceipts: localToLiveIssueReceipts,
        inventoryChangeLogs: localToLiveChangeLogs,
      },

      liveToLocal: {
        itemGroups: liveToLocalItemGroups,
        units: liveToLocalUnits,
        taxes: liveToLocalTaxes,
        transactionTypes: liveToLocalTransactionTypes,
        itemMasters: liveToLocalItemMasters,
        issueReceipts: liveToLocalIssueReceipts,
        inventoryChangeLogs: liveToLocalChangeLogs,
      },
    });
  } catch (error) {
    console.error("INVENTORY SYNC ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Inventory sync failed.",
      },
      {
        status: 500,
      },
    );
  }
}
