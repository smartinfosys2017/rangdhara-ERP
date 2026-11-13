import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

let cachedLocalClient = null;
let cachedLiveClient = null;

const SETTING_KEY = 'active_environment';

/**
 * Create a Prisma client using a specific database URL.
 */
function getClient(url, name = 'DATABASE') {
  if (!url) {
    throw new Error(`${name} is not configured`);
  }

  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
}

/**
 * LOCAL database is always used for storing
 * the active environment setting.
 */
export const localCoreDb =
  cachedLocalClient ||
  getClient(
    process.env.LOCAL_DATABASE_URL,
    'LOCAL_DATABASE_URL'
  );

cachedLocalClient = localCoreDb;

/**
 * Returns the currently active database.
 *
 * The environment setting is ALWAYS read from
 * the local database.
 *
 * If setting = live:
 *     LIVE_DATABASE_URL is used.
 *
 * Otherwise:
 *     LOCAL_DATABASE_URL is used.
 */
export async function getActiveDb() {
  try {
    const setting = await localCoreDb.setting.findUnique({
      where: {
        key: SETTING_KEY,
      },
    });

    const currentMode = setting?.value || 'local';

    console.log('[DB] Active environment:', currentMode);

    if (currentMode === 'live') {
      if (!cachedLiveClient) {
        console.log('[DB] Creating LIVE database client');

        cachedLiveClient = getClient(
          process.env.LIVE_DATABASE_URL,
          'LIVE_DATABASE_URL'
        );
      }

      return cachedLiveClient;
    }

    return localCoreDb;
  } catch (error) {
    console.error(
      '[DB] Failed to read environment setting:',
      error
    );

    console.log('[DB] Falling back to LOCAL database');

    return localCoreDb;
  }
}

/**
 * Checks if a record is unique in a Prisma table.
 *
 * @param {string} table
 * @param {Object} fields
 * @param {Object|null} exclude
 * @returns {Promise<boolean>}
 */
export async function isUnique(
  table,
  fields,
  exclude = null
) {
  const db = await getActiveDb();

  if (!(table in db)) {
    throw new Error(
      `Table '${table}' does not exist in Prisma Client.`
    );
  }

  const whereClause = {
    AND: [
      {
        OR: Object.entries(fields).map(
          ([key, value]) => ({
            [key]: value,
          })
        ),
      },
    ],
  };

  if (exclude) {
    whereClause.AND.push({
      NOT: Object.entries(exclude).map(
        ([key, value]) => ({
          [key]: value,
        })
      ),
    });
  }

  const model = db[table];

  const record = await model.findFirst({
    where: whereClause,
  });

  return !record;
}

/**
 * Fetches the first record from the setting table.
 *
 * Settings are stored in the LOCAL database because
 * the local database controls the active environment.
 */
export async function getSettings() {
  const settings = await localCoreDb.setting.findFirst();

  return settings;
}