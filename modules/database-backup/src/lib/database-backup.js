import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";
import { gzip, gunzip } from "zlib";
import { promisify } from "util";
import crypto from "crypto";
import AdmZip from "adm-zip";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export const BACKUP_STORAGE_PATH = path.join(
  process.cwd(),
  "storage",
  "database-backups",
);

/**
 * =========================================================
 * BASIC HELPERS
 * =========================================================
 */

export function generateId(prefix = "backup") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

export function generateBackupFileName() {
  const now = new Date();

  const pad = (value) => String(value).padStart(2, "0");

  return `database-backup-${now.getFullYear()}-${pad(
    now.getMonth() + 1,
  )}-${pad(now.getDate())}-${pad(
    now.getHours(),
  )}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.zip`;
}

export async function ensureBackupStorage() {
  await fs.mkdir(BACKUP_STORAGE_PATH, {
    recursive: true,
  });
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * =========================================================
 * DATABASE BACKUP TABLES
 * =========================================================
 */

export async function ensureBackupTables() {
  await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "DatabaseBackup" (
            "id" VARCHAR(100) PRIMARY KEY,
            "fileName" VARCHAR(255) NOT NULL,
            "filePath" VARCHAR(1000) NOT NULL,
            "fileSize" BIGINT NOT NULL DEFAULT 0,
            "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
            "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

  await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "DatabaseBackupDownload" (
            "id" VARCHAR(100) PRIMARY KEY,
            "backupId" VARCHAR(100) NOT NULL,
            "fileName" VARCHAR(255) NOT NULL,
            "downloadedBy" VARCHAR(255),
            "ipAddress" VARCHAR(100),
            "userAgent" TEXT,
            "downloadedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "DatabaseBackupDownload_backupId_fkey"
            FOREIGN KEY ("backupId")
            REFERENCES "DatabaseBackup"("id")
            ON DELETE CASCADE
        )
    `);
}

/**
 * =========================================================
 * POSTGRES IDENTIFIER
 * =========================================================
 */

export function quoteIdentifier(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

/**
 * =========================================================
 * SERIALIZE VALUES
 * =========================================================
 */
export function serializeForJson(value) {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "bigint") {
        return value.toString();
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Buffer.isBuffer(value)) {
        return value.toString("base64");
    }

    if (Array.isArray(value)) {
        return value.map(serializeForJson);
    }

    if (typeof value === "object") {
        const result = {};

        for (const [key, item] of Object.entries(value)) {
            result[key] = serializeForJson(item);
        }

        return result;
    }

    return value;
}
export function serializeValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "bigint") {
    return {
      __type: "bigint",
      value: value.toString(),
    };
  }

  if (value instanceof Date) {
    return {
      __type: "date",
      value: value.toISOString(),
    };
  }

  if (Buffer.isBuffer(value)) {
    return {
      __type: "buffer",
      value: value.toString("base64"),
    };
  }

  if (value && value.constructor && value.constructor.name === "Decimal") {
    return {
      __type: "decimal",
      value: value.toString(),
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === "object") {
    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = serializeValue(item);
    }

    return result;
  }

  return value;
}

/**
 * =========================================================
 * DESERIALIZE VALUES
 * =========================================================
 */

export function deserializeValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "object" && value.__type) {
    switch (value.__type) {
      case "bigint":
        return BigInt(value.value);

      case "date":
        return new Date(value.value);

      case "buffer":
        return Buffer.from(value.value, "base64");

      case "decimal":
        return value.value;

      default:
        return value;
    }
  }

  if (Array.isArray(value)) {
    return value.map(deserializeValue);
  }

  if (typeof value === "object") {
    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = deserializeValue(item);
    }

    return result;
  }

  return value;
}

/**
 * =========================================================
 * GET PUBLIC TABLES
 * =========================================================
 */

export async function getPublicTables() {
  return prisma.$queryRawUnsafe(`
        SELECT
            table_schema,
            table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN (
              'DatabaseBackup',
              'DatabaseBackupDownload'
          )
        ORDER BY table_name
    `);
}

/**
 * =========================================================
 * GET TABLE COLUMNS
 * =========================================================
 */

export async function getTableColumns(tableSchema, tableName) {
  return prisma.$queryRawUnsafe(
    `
        SELECT
            column_name,
            data_type,
            udt_name,
            is_nullable,
            column_default,
            ordinal_position
        FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
        ORDER BY ordinal_position
        `,
    tableSchema,
    tableName,
  );
}

/**
 * =========================================================
 * GET PRIMARY KEYS
 * =========================================================
 */

export async function getPrimaryKeys(tableSchema, tableName) {
  return prisma.$queryRawUnsafe(
    `
        SELECT
            kcu.column_name,
            kcu.ordinal_position
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY kcu.ordinal_position
        `,
    tableSchema,
    tableName,
  );
}

/**
 * =========================================================
 * GET FOREIGN KEYS
 * =========================================================
 */

export async function getForeignKeys(tableSchema, tableName) {
  return prisma.$queryRawUnsafe(
    `
        SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
        ORDER BY
            tc.constraint_name,
            kcu.ordinal_position
        `,
    tableSchema,
    tableName,
  );
}

/**
 * =========================================================
 * CREATE BACKUP DATA
 * =========================================================
 */

export async function createBackupData() {
  const tables = await getPublicTables();

  const backupTables = [];

  let totalRows = 0;

  for (const table of tables) {
    const schema = table.table_schema;

    const name = table.table_name;

    const columns = await getTableColumns(schema, name);

    const primaryKeys = await getPrimaryKeys(schema, name);

    const foreignKeys = await getForeignKeys(schema, name);

    const tableIdentifier = `${quoteIdentifier(
      schema,
    )}.${quoteIdentifier(name)}`;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM ${tableIdentifier}`,
    );

    const serializedRows = rows.map((row) => serializeValue(row));

    totalRows += serializedRows.length;

    backupTables.push({
      schema,
      name,
      columns,
      primaryKeys,
      foreignKeys,
      rowCount: serializedRows.length,
      rows: serializedRows,
    });
  }

  return {
    format: "rangdhara-database-backup",

    version: 1,

    type: "application-level-postgresql-backup",

    database: "postgresql",

    createdAt: new Date().toISOString(),

    databaseInfo: {
      tableCount: backupTables.length,

      rowCount: totalRows,
    },

    tableCount: backupTables.length,

    rowCount: totalRows,

    tables: backupTables,
  };
}

/**
 * =========================================================
 * CREATE ZIP
 *
 * Uses adm-zip instead of archiver.
 * This avoids the Turbopack CommonJS/default-export issue.
 * =========================================================
 */

export async function createBackupZip(backupData, outputPath) {
  const json = JSON.stringify(backupData, null, 2);

  const compressed = await gzipAsync(Buffer.from(json, "utf8"));

  const info = {
    format: backupData.format,

    version: backupData.version,

    type: backupData.type,

    database: backupData.database,

    createdAt: backupData.createdAt,

    tableCount: backupData.tableCount,

    rowCount: backupData.rowCount,

    backupFile: "database-backup.json.gz",
  };

  const zip = new AdmZip();

  zip.addFile("database-backup.json.gz", compressed);

  zip.addFile(
    "backup-info.json",
    Buffer.from(JSON.stringify(info, null, 2), "utf8"),
  );

  await new Promise((resolve, reject) => {
    try {
      zip.writeZip(outputPath, () => {
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });

  const stat = await fs.stat(outputPath);

  return stat.size;
}

/**
 * =========================================================
 * READ BACKUP ZIP
 * =========================================================
 */

export async function readBackupZip(zipPath) {
  const zip = new AdmZip(zipPath);

  const backupEntry = zip.getEntry("database-backup.json.gz");

  if (!backupEntry) {
    throw new Error(
      "Invalid backup ZIP. database-backup.json.gz was not found.",
    );
  }

  const compressed = backupEntry.getData();

  const jsonBuffer = await gunzipAsync(compressed);

  const backupData = JSON.parse(jsonBuffer.toString("utf8"));

  if (!backupData || backupData.format !== "rangdhara-database-backup") {
    throw new Error("Invalid database backup format.");
  }

  if (!Array.isArray(backupData.tables)) {
    throw new Error("Invalid database backup. Tables data is missing.");
  }

  return backupData;
}

/**
 * =========================================================
 * GET BACKUP BY ID
 * =========================================================
 */

export async function getBackupById(id) {
  const rows = await prisma.$queryRawUnsafe(
    `
            SELECT
                "id",
                "fileName",
                "filePath",
                "fileSize",
                "status",
                "createdAt",
                "updatedAt"
            FROM "DatabaseBackup"
            WHERE "id" = $1
            LIMIT 1
            `,
    id,
  );

  return rows[0] || null;
}

/**
 * =========================================================
 * GET BACKUPS
 * =========================================================
 */

export async function getBackups() {
  return prisma.$queryRawUnsafe(`
        SELECT
            b."id",
            b."fileName",
            b."filePath",
            b."fileSize",
            b."status",
            b."createdAt",
            b."updatedAt",
            COUNT(d."id")::INTEGER AS "downloadCount"
        FROM "DatabaseBackup" b
        LEFT JOIN "DatabaseBackupDownload" d
            ON d."backupId" = b."id"
        GROUP BY
            b."id",
            b."fileName",
            b."filePath",
            b."fileSize",
            b."status",
            b."createdAt",
            b."updatedAt"
        ORDER BY
            b."createdAt" DESC
    `);
}

/**
 * =========================================================
 * DEFAULT EXPORT
 * =========================================================
 */

const databaseBackupLibrary = {
  BACKUP_STORAGE_PATH,

  generateId,

  generateBackupFileName,

  ensureBackupStorage,

  pathExists,

  ensureBackupTables,

  quoteIdentifier,

  serializeValue,

  deserializeValue,

  getPublicTables,

  getTableColumns,

  getPrimaryKeys,

  getForeignKeys,

  createBackupData,

  createBackupZip,

  readBackupZip,

  getBackupById,

  getBackups,
};

export default databaseBackupLibrary;
