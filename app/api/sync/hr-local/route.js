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
// security SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncsecuritys({ sourceDb, targetDb, sourceName, targetName }) {
  const securitys = await sourceDb.security.findMany({
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

  for (const security of securitys) {
    try {
      if (!security.id) {
        throw new Error("security ID missing");
      }

      if (!security.securityName) {
        throw new Error("security name missing");
      }

      const existingGroup = await targetDb.security.findUnique({
        where: {
          id: security.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existingGroup) {
        await targetDb.security.create({
          data: {
            id: security.id,

            securityName: security.securityName,

            description: security.description || null,

            status: security.status ?? true,

            isDefault: security.isDefault ?? false,

            createdAt: security.createdAt,

            updatedAt: security.updatedAt,

            deletedAt: security.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        if (security.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(security.updatedAt).getTime();

      const targetUpdated = new Date(existingGroup.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;

        continue;
      }

      // ==========================
      // DELETE
      // ==========================

      if (security.deletedAt) {
        await targetDb.security.update({
          where: {
            id: security.id,
          },

          data: {
            deletedAt: security.deletedAt,

            updatedAt: security.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        deleted++;

        continue;
      }

      // ==========================
      // RESTORE
      // ==========================

      if (existingGroup.deletedAt && !security.deletedAt) {
        await targetDb.security.update({
          where: {
            id: security.id,
          },

          data: {
            securityName: security.securityName,

            description: security.description || null,

            status: security.status ?? true,

            isDefault: security.isDefault ?? false,

            deletedAt: null,

            updatedAt: security.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        updated++;

        continue;
      }

      // ==========================
      // UPDATE
      // ==========================

      await targetDb.security.update({
        where: {
          id: security.id,
        },

        data: {
          securityName: security.securityName,

          description: security.description || null,

          status: security.status ?? true,

          isDefault: security.isDefault ?? false,

          deletedAt: null,

          updatedAt: security.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: security?.id || null,

        securityName: security?.securityName || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: securitys.length,

    created,

    updated,

    deleted,

    skipped,

    failed,

    errors,
  };
}
// =====================================================
// POSITION SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncpositions({ sourceDb, targetDb, sourceName, targetName }) {
  const positions = await sourceDb.position.findMany({
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

  for (const position of positions) {
    try {
      if (!position.id) {
        throw new Error("Position ID missing");
      }

      if (!position.positionName) {
        throw new Error("Position name missing");
      }

      const existingPosition = await targetDb.position.findUnique({
        where: {
          id: position.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existingPosition) {
        await targetDb.position.create({
          data: {
            id: position.id,

            positionName: position.positionName,

            description: position.description || null,

            status: position.status ?? true,

            createdAt: position.createdAt,

            updatedAt: position.updatedAt,

            deletedAt: position.deletedAt || null,

            lastSyncAt: new Date(),
          },
        });

        if (position.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(position.updatedAt).getTime();
      const targetUpdated = new Date(existingPosition.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;
        continue;
      }

      // ==========================
      // SOFT DELETE
      // ==========================

      if (position.deletedAt) {
        await targetDb.position.update({
          where: {
            id: position.id,
          },
          data: {
            deletedAt: position.deletedAt,
            updatedAt: position.updatedAt,
            lastSyncAt: new Date(),
          },
        });

        deleted++;
        continue;
      }

      // ==========================
      // RESTORE
      // ==========================

      if (existingPosition.deletedAt && !position.deletedAt) {
        await targetDb.position.update({
          where: {
            id: position.id,
          },
          data: {
            positionName: position.positionName,

            description: position.description || null,

            status: position.status ?? true,

            deletedAt: null,

            updatedAt: position.updatedAt,

            lastSyncAt: new Date(),
          },
        });

        updated++;
        continue;
      }

      // ==========================
      // UPDATE
      // ==========================

      await targetDb.position.update({
        where: {
          id: position.id,
        },
        data: {
          positionName: position.positionName,

          description: position.description || null,

          status: position.status ?? true,

          deletedAt: null,

          updatedAt: position.updatedAt,

          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: position?.id || null,

        positionName: position?.positionName || null,

        source: sourceName,

        target: targetName,

        error: error.message,
      });
    }
  }

  return {
    total: positions.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}
// =====================================================
// CHECKLIST ITEM SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncchecklistitems({
  sourceDb,
  targetDb,
  sourceName,
  targetName,
}) {
  const checklistItems = await sourceDb.checklistItem.findMany({
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

  for (const item of checklistItems) {
    try {
      if (!item.id) {
        throw new Error("Checklist item ID missing");
      }

      if (!item.itemName) {
        throw new Error("Checklist item name missing");
      }

      const existingItem = await targetDb.checklistItem.findUnique({
        where: {
          id: item.id,
        },
      });

      // ==========================
      // CREATE
      // ==========================

      if (!existingItem) {
        await targetDb.checklistItem.create({
          data: {
            id: item.id,
            itemName: item.itemName,
            description: item.description ?? null,
            status: item.status ?? true,
            makeGlobal: item.makeGlobal ?? false,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            deletedAt: item.deletedAt ?? null,
            lastSyncAt: new Date(),
          },
        });

        if (item.deletedAt) {
          deleted++;
        } else {
          created++;
        }

        continue;
      }

      // ==========================
      // DATE CHECK
      // ==========================

      const sourceUpdated = new Date(item.updatedAt).getTime();
      const targetUpdated = new Date(existingItem.updatedAt).getTime();

      if (sourceUpdated <= targetUpdated) {
        skipped++;
        continue;
      }

      // ==========================
      // SOFT DELETE
      // ==========================

      if (item.deletedAt) {
        await targetDb.checklistItem.update({
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
      // RESTORE
      // ==========================

      if (existingItem.deletedAt && !item.deletedAt) {
        await targetDb.checklistItem.update({
          where: {
            id: item.id,
          },
          data: {
            itemName: item.itemName,
            description: item.description ?? null,
            status: item.status ?? true,
            makeGlobal: item.makeGlobal ?? false,
            deletedAt: null,
            updatedAt: item.updatedAt,
            lastSyncAt: new Date(),
          },
        });

        updated++;
        continue;
      }

      // ==========================
      // UPDATE
      // ==========================

      await targetDb.checklistItem.update({
        where: {
          id: item.id,
        },
        data: {
          itemName: item.itemName,
          description: item.description ?? null,
          status: item.status ?? true,
          makeGlobal: item.makeGlobal ?? false,
          deletedAt: null,
          updatedAt: item.updatedAt,
          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;

      errors.push({
        id: item?.id ?? null,
        itemName: item?.itemName ?? null,
        source: sourceName,
        target: targetName,
        error: error.message,
      });
    }
  }

  return {
    total: checklistItems.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}
// =====================================================
// HOLIDAY SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncholidays({ sourceDb, targetDb, sourceName, targetName }) {
  const holidays = await sourceDb.holiday.findMany({
    orderBy: { updatedAt: "asc" },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const holiday of holidays) {
    try {
      if (!holiday.id) throw new Error("Holiday ID missing");
      if (!holiday.name) throw new Error("Holiday name missing");

      const existing = await targetDb.holiday.findUnique({
        where: { id: holiday.id },
      });

      // CREATE
      if (!existing) {
        await targetDb.holiday.create({
          data: {
            id: holiday.id,
            name: holiday.name,
            fromDate: holiday.fromDate,
            toDate: holiday.toDate,
            description: holiday.description ?? null,
            status: holiday.status ?? true,
            createdAt: holiday.createdAt,
            updatedAt: holiday.updatedAt,
            deletedAt: holiday.deletedAt ?? null,
            lastSyncAt: new Date(),
          },
        });

        if (holiday.deletedAt) deleted++;
        else created++;

        continue;
      }

      // DATE CHECK
      if (
        new Date(holiday.updatedAt).getTime() <=
        new Date(existing.updatedAt).getTime()
      ) {
        skipped++;
        continue;
      }

      // SOFT DELETE
      if (holiday.deletedAt) {
        await targetDb.holiday.update({
          where: { id: holiday.id },
          data: {
            deletedAt: holiday.deletedAt,
            updatedAt: holiday.updatedAt,
            lastSyncAt: new Date(),
          },
        });

        deleted++;
        continue;
      }

      // UPDATE / RESTORE
      await targetDb.holiday.update({
        where: { id: holiday.id },
        data: {
          name: holiday.name,
          fromDate: holiday.fromDate,
          toDate: holiday.toDate,
          description: holiday.description ?? null,
          status: holiday.status ?? true,
          deletedAt: null,
          updatedAt: holiday.updatedAt,
          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;
      errors.push({
        id: holiday?.id ?? null,
        name: holiday?.name ?? null,
        source: sourceName,
        target: targetName,
        error: error.message,
      });
    }
  }

  return {
    total: holidays.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}
// =====================================================
// BREAK TIME SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncbreaktimes({ sourceDb, targetDb, sourceName, targetName }) {
  const breakTimes = await sourceDb.breakTime.findMany({
    orderBy: { updatedAt: "asc" },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const breakTime of breakTimes) {
    try {
      if (!breakTime.id) throw new Error("BreakTime ID missing");
      if (!breakTime.name) throw new Error("BreakTime name missing");

      const existing = await targetDb.breakTime.findUnique({
        where: { id: breakTime.id },
      });

      // CREATE
      if (!existing) {
        await targetDb.breakTime.create({
          data: {
            id: breakTime.id,
            name: breakTime.name,
            fromTime: breakTime.fromTime,
            toTime: breakTime.toTime,
            durationMinutes: breakTime.durationMinutes ?? 0,
            breakType: breakTime.breakType ?? "paid",
            isFlexible: breakTime.isFlexible ?? false,
            status: breakTime.status ?? true,
            createdAt: breakTime.createdAt,
            updatedAt: breakTime.updatedAt,
            deletedAt: breakTime.deletedAt ?? null,
            lastSyncAt: new Date(),
          },
        });

        if (breakTime.deletedAt) deleted++;
        else created++;

        continue;
      }

      // DATE CHECK
      if (
        new Date(breakTime.updatedAt).getTime() <=
        new Date(existing.updatedAt).getTime()
      ) {
        skipped++;
        continue;
      }

      // SOFT DELETE
      if (breakTime.deletedAt) {
        await targetDb.breakTime.update({
          where: { id: breakTime.id },
          data: {
            deletedAt: breakTime.deletedAt,
            updatedAt: breakTime.updatedAt,
            lastSyncAt: new Date(),
          },
        });

        deleted++;
        continue;
      }

      // UPDATE / RESTORE
      await targetDb.breakTime.update({
        where: { id: breakTime.id },
        data: {
          name: breakTime.name,
          fromTime: breakTime.fromTime,
          toTime: breakTime.toTime,
          durationMinutes: breakTime.durationMinutes ?? 0,
          breakType: breakTime.breakType ?? "paid",
          isFlexible: breakTime.isFlexible ?? false,
          status: breakTime.status ?? true,
          deletedAt: null,
          updatedAt: breakTime.updatedAt,
          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;
      errors.push({
        id: breakTime?.id ?? null,
        name: breakTime?.name ?? null,
        source: sourceName,
        target: targetName,
        error: error.message,
      });
    }
  }

  return {
    total: breakTimes.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}
// =====================================================
// SHIFT SYNC
// CREATE + UPDATE + SOFT DELETE + RESTORE
// =====================================================

async function syncshifts({ sourceDb, targetDb, sourceName, targetName }) {
  const shifts = await sourceDb.shift.findMany({
    orderBy: { updatedAt: "asc" },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const shift of shifts) {
    try {
      if (!shift.id) throw new Error("Shift ID missing");
      if (!shift.name) throw new Error("Shift name missing");

      const existing = await targetDb.shift.findUnique({
        where: { id: shift.id },
      });

      // CREATE
      if (!existing) {
        await targetDb.shift.create({
          data: {
            id: shift.id,
            name: shift.name,
            inTime: shift.inTime,
            outTime: shift.outTime,
            graceTime: shift.graceTime ?? 0,
            description: shift.description ?? null,
            crossesMidnight: shift.crossesMidnight ?? false,
            earlyInMinutes: shift.earlyInMinutes ?? 0,
            lateOutMinutes: shift.lateOutMinutes ?? 0,
            halfDayMinutes: shift.halfDayMinutes ?? 240,
            fullDayMinutes: shift.fullDayMinutes ?? 480,
            status: shift.status ?? true,
            createdAt: shift.createdAt,
            updatedAt: shift.updatedAt,
            deletedAt: shift.deletedAt ?? null,
            lastSyncAt: new Date(),
          },
        });

        if (shift.deletedAt) deleted++;
        else created++;

        continue;
      }

      // DATE CHECK
      if (
        new Date(shift.updatedAt).getTime() <=
        new Date(existing.updatedAt).getTime()
      ) {
        skipped++;
        continue;
      }

      // SOFT DELETE
      if (shift.deletedAt) {
        await targetDb.shift.update({
          where: { id: shift.id },
          data: {
            deletedAt: shift.deletedAt,
            updatedAt: shift.updatedAt,
            lastSyncAt: new Date(),
          },
        });

        deleted++;
        continue;
      }

      // UPDATE / RESTORE
      await targetDb.shift.update({
        where: { id: shift.id },
        data: {
          name: shift.name,
          inTime: shift.inTime,
          outTime: shift.outTime,
          graceTime: shift.graceTime ?? 0,
          description: shift.description ?? null,
          crossesMidnight: shift.crossesMidnight ?? false,
          earlyInMinutes: shift.earlyInMinutes ?? 0,
          lateOutMinutes: shift.lateOutMinutes ?? 0,
          halfDayMinutes: shift.halfDayMinutes ?? 240,
          fullDayMinutes: shift.fullDayMinutes ?? 480,
          status: shift.status ?? true,
          deletedAt: null,
          updatedAt: shift.updatedAt,
          lastSyncAt: new Date(),
        },
      });

      updated++;
    } catch (error) {
      failed++;
      errors.push({
        id: shift?.id ?? null,
        name: shift?.name ?? null,
        source: sourceName,
        target: targetName,
        error: error.message,
      });
    }
  }

  return {
    total: shifts.length,
    created,
    updated,
    deleted,
    skipped,
    failed,
    errors,
  };
}
// =====================================================
// POST HR SYNC
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
      securitys: await localDb.security.count(),
      positions: await localDb.position.count(),
      checklistItems: await localDb.checklistItem.count(),
      holidays: await localDb.holiday.count(),
      breakTimes: await localDb.breakTime.count(),
      shifts: await localDb.shift.count(),
    };

    const liveBefore = {
      securitys: await liveDb.security.count(),
      positions: await liveDb.position.count(),
      checklistItems: await liveDb.checklistItem.count(),
      holidays: await liveDb.holiday.count(),
      breakTimes: await liveDb.breakTime.count(),
      shifts: await liveDb.shift.count(),
    };

    // =====================================================
    // LOCAL → LIVE
    // =====================================================

    const localToLivesecuritys = await syncsecuritys({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLivepositions = await syncpositions({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLivechecklistItems = await syncchecklistitems({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveholidays = await syncholidays({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLivebreakTimes = await syncbreaktimes({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    const localToLiveshifts = await syncshifts({
      sourceDb: localDb,
      targetDb: liveDb,
      sourceName: "LOCAL",
      targetName: "LIVE",
    });

    // =====================================================
    // LIVE → LOCAL
    // =====================================================

    const liveToLocalsecuritys = await syncsecuritys({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalpositions = await syncpositions({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalchecklistItems = await syncchecklistitems({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalholidays = await syncholidays({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalbreakTimes = await syncbreaktimes({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    const liveToLocalshifts = await syncshifts({
      sourceDb: liveDb,
      targetDb: localDb,
      sourceName: "LIVE",
      targetName: "LOCAL",
    });

    // ==========================
    // AFTER COUNT
    // ==========================

    const localAfter = {
      securitys: await localDb.security.count(),
      positions: await localDb.position.count(),
      checklistItems: await localDb.checklistItem.count(),
      holidays: await localDb.holiday.count(),
      breakTimes: await localDb.breakTime.count(),
      shifts: await localDb.shift.count(),
    };

    const liveAfter = {
      securitys: await liveDb.security.count(),
      positions: await liveDb.position.count(),
      checklistItems: await liveDb.checklistItem.count(),
      holidays: await liveDb.holiday.count(),
      breakTimes: await liveDb.breakTime.count(),
      shifts: await liveDb.shift.count(),
    };

    // ==========================
    // RESPONSE
    // ==========================

    return NextResponse.json({
      success: true,
      message: "HR synchronization completed.",

      equal: {
        securitys:
          localAfter.securitys === liveAfter.securitys,

        positions:
          localAfter.positions === liveAfter.positions,

        checklistItems:
          localAfter.checklistItems === liveAfter.checklistItems,

        holidays:
          localAfter.holidays === liveAfter.holidays,

        breakTimes:
          localAfter.breakTimes === liveAfter.breakTimes,

        shifts:
          localAfter.shifts === liveAfter.shifts,
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
        securitys: localToLivesecuritys,
        positions: localToLivepositions,
        checklistItems: localToLivechecklistItems,
        holidays: localToLiveholidays,
        breakTimes: localToLivebreakTimes,
        shifts: localToLiveshifts,
      },

      liveToLocal: {
        securitys: liveToLocalsecuritys,
        positions: liveToLocalpositions,
        checklistItems: liveToLocalchecklistItems,
        holidays: liveToLocalholidays,
        breakTimes: liveToLocalbreakTimes,
        shifts: liveToLocalshifts,
      },
    });
  } catch (error) {
    console.error("HR SYNC ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "HR sync failed.",
      },
      {
        status: 500,
      },
    );
  }
}