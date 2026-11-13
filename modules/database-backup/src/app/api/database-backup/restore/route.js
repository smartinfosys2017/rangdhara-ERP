import { NextResponse } from "next/server";

import {
  readBackupZip,
  quoteIdentifier,
  deserializeValue,
  ensureBackupTables,
} from "@/modules/database-backup/src/lib/database-backup.js";

import { prisma } from "@/lib/prisma";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const TEMP_RESTORE_PATH = path.join(
  process.cwd(),
  "storage",
  "database-backups",
  "restore-temp",
);

// =====================================================
// GET SAFE PRIMITIVE VALUE
// =====================================================

function unwrapValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(unwrapValue);
  }

  if (typeof value === "object") {
    // ---------------------------------------------
    // Serialized backup values
    // ---------------------------------------------

    if (
      value.__type === "decimal" ||
      value.__type === "bigint" ||
      value.__type === "date"
    ) {
      return unwrapValue(value.value);
    }

    if (value.__type === "buffer") {
      return Buffer.from(value.value, "base64");
    }

    // ---------------------------------------------
    // Common Decimal object shapes
    // ---------------------------------------------

    if (value.value !== undefined && value.value !== null) {
      return unwrapValue(value.value);
    }

    // ---------------------------------------------
    // Prisma Decimal / Decimal.js
    // ---------------------------------------------

    if (typeof value.toString === "function") {
      try {
        const stringValue = value.toString();

        if (stringValue && stringValue !== "[object Object]") {
          return stringValue;
        }
      } catch {}
    }

    // ---------------------------------------------
    // Plain object
    // ---------------------------------------------

    const result = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = unwrapValue(item);
    }

    return result;
  }

  return value;
}

// =====================================================
// CONVERT VALUE FOR POSTGRES
// =====================================================

function convertValueForPostgres(value, dataType, udtName) {
  value = unwrapValue(value);

  if (value === null || value === undefined) {
    return null;
  }

  // =================================================
  // JSON / JSONB
  // =================================================

  if (dataType === "json" || dataType === "jsonb") {
    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value);
  }

  // =================================================
  // NUMERIC / DECIMAL
  // =================================================

  if (dataType === "numeric" || dataType === "decimal") {
    function extractNumericValue(input) {
      if (input === null || input === undefined) {
        return null;
      }

      // -----------------------------------------
      // Number
      // -----------------------------------------

      if (typeof input === "number") {
        if (!Number.isFinite(input)) {
          return null;
        }

        return String(input);
      }

      // -----------------------------------------
      // BigInt
      // -----------------------------------------

      if (typeof input === "bigint") {
        return input.toString();
      }

      // -----------------------------------------
      // String
      // -----------------------------------------

      if (typeof input === "string") {
        let numericString = input.trim();

        if (!numericString) {
          return null;
        }

        numericString = numericString.replace(/^["']|["']$/g, "");

        // -------------------------------------
        // Comma decimal support
        //
        // 11,9900000
        //      ↓
        // 11.9900000
        // -------------------------------------

        if (numericString.includes(",") && numericString.includes(".")) {
          // Example:
          // 1,234.567
          //
          // comma = thousands separator

          numericString = numericString.replace(/,/g, "");
        } else if (numericString.includes(",")) {
          // Example:
          // 11,9900000
          //
          // comma = decimal separator

          numericString = numericString.replace(",", ".");
        }

        numericString = numericString.replace(/\s/g, "");

        if (
          !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(numericString)
        ) {
          return null;
        }

        return numericString;
      }

      // -----------------------------------------
      // Buffer
      // -----------------------------------------

      if (Buffer.isBuffer(input)) {
        return extractNumericValue(input.toString());
      }

      // -----------------------------------------
      // Object
      // -----------------------------------------

      if (typeof input === "object") {
        // -------------------------------------
        // Serialized Decimal / BigInt
        // -------------------------------------

        if (input.__type !== undefined) {
          const type = String(input.__type).toLowerCase();

          if (type === "decimal" || type === "bigint") {
            if (input.value !== undefined) {
              return extractNumericValue(input.value);
            }
          }
        }

        // -------------------------------------
        // Generic value
        // -------------------------------------

        if (input.value !== undefined) {
          const result = extractNumericValue(input.value);

          if (result !== null) {
            return result;
          }
        }

        // -------------------------------------
        // Decimal.js / Prisma Decimal
        // -------------------------------------

        if (typeof input.toString === "function") {
          try {
            const stringValue = input.toString();

            if (stringValue && stringValue !== "[object Object]") {
              return extractNumericValue(stringValue);
            }
          } catch {}
        }

        // -------------------------------------
        // Other numeric representations
        // -------------------------------------

        if (input._value !== undefined) {
          const result = extractNumericValue(input._value);

          if (result !== null) {
            return result;
          }
        }

        if (input.d !== undefined) {
          const result = extractNumericValue(input.d);

          if (result !== null) {
            return result;
          }
        }
      }

      return null;
    }

    const numericValue = extractNumericValue(value);

    if (numericValue !== null && numericValue !== undefined) {
      return numericValue;
    }

    console.error("INVALID NUMERIC RESTORE VALUE:", {
      value,
      dataType,
      udtName,
    });

    throw new Error("Unable to convert numeric value for PostgreSQL column.");
  }

  // =================================================
  // BIGINT
  // =================================================

  if (dataType === "bigint") {
    if (typeof value === "bigint") {
      return value;
    }

    return BigInt(String(value));
  }

  // =================================================
  // INTEGER
  // =================================================

  if (dataType === "integer" || dataType === "smallint") {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      throw new Error(`Invalid integer value: ${String(value)}`);
    }

    return numberValue;
  }

  // =================================================
  // REAL / DOUBLE
  // =================================================

  if (dataType === "real" || dataType === "double precision") {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      throw new Error(`Invalid floating-point value: ${String(value)}`);
    }

    return numberValue;
  }

  // =================================================
  // BOOLEAN
  // =================================================

  if (dataType === "boolean") {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true" || value === "1" || value === 1) {
      return true;
    }

    if (value === "false" || value === "0" || value === 0) {
      return false;
    }

    return Boolean(value);
  }

  // =================================================
  // DATE
  // =================================================

  if (dataType === "date") {
    if (value instanceof Date) {
      return value;
    }

    return new Date(value);
  }

  // =================================================
  // TIMESTAMP
  // =================================================

  if (
    dataType === "timestamp without time zone" ||
    dataType === "timestamp with time zone"
  ) {
    if (value instanceof Date) {
      return value;
    }

    return new Date(value);
  }

  // =================================================
  // TIME
  // =================================================

  if (
    dataType === "time" ||
    dataType === "time without time zone" ||
    dataType === "time with time zone"
  ) {
    return String(value);
  }

  // =================================================
  // UUID
  // =================================================

  if (dataType === "uuid") {
    return String(value);
  }

  // =================================================
  // BYTEA
  // =================================================

  if (dataType === "bytea") {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    return Buffer.from(String(value), "base64");
  }

  // =================================================
  // TEXT / VARCHAR / CHAR
  // =================================================

  if (
    dataType === "text" ||
    dataType === "character varying" ||
    dataType === "character"
  ) {
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  // =================================================
  // ARRAY
  // =================================================

  if (udtName && udtName.startsWith("_")) {
    if (Array.isArray(value)) {
      return value;
    }

    return [value];
  }

  // =================================================
  // FALLBACK
  // =================================================

  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return value;
}

// =====================================================
// GET COLUMN INFORMATION
// =====================================================

async function getTableColumns(tx, tableName) {
  const columns = await tx.$queryRawUnsafe(
    `
                SELECT
                    column_name,
                    data_type,
                    udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = $1
                ORDER BY ordinal_position
            `,
    tableName,
  );

  return new Map(
    columns.map((column) => [
      column.column_name,
      {
        dataType: column.data_type,
        udtName: column.udt_name,
      },
    ]),
  );
}

// =====================================================
// GET FOREIGN KEY DEPENDENCIES
// =====================================================

async function getForeignKeyDependencies(tx) {
  const foreignKeys = await tx.$queryRawUnsafe(
    `
                SELECT
                    tc.table_name AS table_name,
                    ccu.table_name AS referenced_table
                FROM information_schema.table_constraints AS tc

                INNER JOIN information_schema.constraint_column_usage AS ccu
                    ON tc.constraint_name =
                       ccu.constraint_name
                    AND tc.table_schema =
                       ccu.table_schema

                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public'
            `,
  );

  return foreignKeys.map((item) => ({
    tableName: item.table_name,
    referencedTable: item.referenced_table,
  }));
}

// =====================================================
// SORT TABLES BY DEPENDENCIES
// =====================================================

function sortTablesByDependencies(tables, dependencies) {
  const tableNames = new Set(tables.map((table) => table.name));

  const dependencyMap = new Map();

  for (const tableName of tableNames) {
    dependencyMap.set(tableName, new Set());
  }

  for (const dependency of dependencies) {
    const tableName = dependency.tableName;

    const referencedTable = dependency.referencedTable;

    if (!tableNames.has(tableName) || !tableNames.has(referencedTable)) {
      continue;
    }

    // Self-reference is handled by
    // row-level retry.
    if (tableName === referencedTable) {
      continue;
    }

    dependencyMap.get(tableName).add(referencedTable);
  }

  const sorted = [];

  const remaining = new Map();

  for (const [tableName, deps] of dependencyMap) {
    remaining.set(tableName, new Set(deps));
  }

  while (remaining.size > 0) {
    const ready = [];

    for (const [tableName, deps] of remaining) {
      if (deps.size === 0) {
        ready.push(tableName);
      }
    }

    if (ready.length === 0) {
      // Circular dependency.
      //
      // Keep remaining tables in
      // backup order.
      for (const table of tables) {
        if (remaining.has(table.name)) {
          sorted.push(table.name);
          remaining.delete(table.name);
        }
      }

      break;
    }

    for (const tableName of ready) {
      sorted.push(tableName);
      remaining.delete(tableName);
    }

    for (const deps of remaining.values()) {
      for (const tableName of ready) {
        deps.delete(tableName);
      }
    }
  }

  const tableMap = new Map(tables.map((table) => [table.name, table]));

  return sorted.map((name) => tableMap.get(name)).filter(Boolean);
}

// =====================================================
// BUILD INSERT QUERY
// =====================================================

function buildInsertQuery(tableName, columns, columnInfo) {
  const quotedTable = quoteIdentifier(tableName);

  const quotedColumns = columns.map(quoteIdentifier).join(", ");

  const placeholders = columns
    .map((column, index) => {
      const info = columnInfo.get(column);

      if (!info) {
        return `$${index + 1}`;
      }

      const parameter = `$${index + 1}`;

      // -----------------------------------------
      // JSON / JSONB
      // -----------------------------------------

      if (info.dataType === "json" || info.dataType === "jsonb") {
        return `${parameter}::${info.dataType}`;
      }

      // -----------------------------------------
      // NUMERIC / DECIMAL
      // -----------------------------------------

      if (info.dataType === "numeric" || info.dataType === "decimal") {
        return `${parameter}::numeric`;
      }

      // -----------------------------------------
      // BIGINT
      // -----------------------------------------

      if (info.dataType === "bigint") {
        return `${parameter}::bigint`;
      }

      // -----------------------------------------
      // INTEGER / SMALLINT
      // -----------------------------------------

      if (info.dataType === "integer" || info.dataType === "smallint") {
        return `${parameter}::${info.dataType}`;
      }

      // -----------------------------------------
      // REAL
      // -----------------------------------------

      if (info.dataType === "real") {
        return `${parameter}::real`;
      }

      // -----------------------------------------
      // DOUBLE
      // -----------------------------------------

      if (info.dataType === "double precision") {
        return `${parameter}::double precision`;
      }

      // -----------------------------------------
      // BOOLEAN
      // -----------------------------------------

      if (info.dataType === "boolean") {
        return `${parameter}::boolean`;
      }

      // -----------------------------------------
      // DATE
      // -----------------------------------------

      if (info.dataType === "date") {
        return `${parameter}::date`;
      }

      // -----------------------------------------
      // TIMESTAMP
      // -----------------------------------------

      if (
        info.dataType === "timestamp without time zone" ||
        info.dataType === "timestamp with time zone"
      ) {
        return `${parameter}::${info.dataType}`;
      }

      // -----------------------------------------
      // UUID
      // -----------------------------------------

      if (info.dataType === "uuid") {
        return `${parameter}::uuid`;
      }

      // -----------------------------------------
      // BYTEA
      // -----------------------------------------

      if (info.dataType === "bytea") {
        return `${parameter}::bytea`;
      }

      // -----------------------------------------
      // TIME
      // -----------------------------------------

      if (
        info.dataType === "time" ||
        info.dataType === "time without time zone" ||
        info.dataType === "time with time zone"
      ) {
        return `${parameter}::${info.dataType}`;
      }

      // -----------------------------------------
      // POSTGRES ENUM / USER-DEFINED TYPE
      //
      // Example:
      //
      // data_type = USER-DEFINED
      // udt_name  = EffectOnTransaction
      //
      // Generates:
      //
      // $1::"EffectOnTransaction"
      // -----------------------------------------

      if (info.dataType === "USER-DEFINED") {
        if (!info.udtName) {
          throw new Error(
            `Unable to determine PostgreSQL custom type for column "${column}" in table "${tableName}".`,
          );
        }

        return `${parameter}::${quoteIdentifier(info.udtName)}`;
      }

      // -----------------------------------------
      // ARRAY
      // -----------------------------------------

      if (info.udtName && info.udtName.startsWith("_")) {
        return parameter;
      }

      // -----------------------------------------
      // FALLBACK
      // -----------------------------------------

      return parameter;
    })
    .join(", ");

  return `
        INSERT INTO
        ${quotedTable}
        (${quotedColumns})
        VALUES
        (${placeholders})
    `;
}

// =====================================================
// FOREIGN KEY ERROR CHECK
// =====================================================

function isForeignKeyError(error) {
  return (
    error?.code === "23503" ||
    error?.meta?.code === "23503" ||
    String(error?.message || "").includes("violates foreign key constraint")
  );
}

// =====================================================
// RESTORE TABLE ROWS
// =====================================================

async function restoreTableRows(tx, table, columnInfo) {
  if (!Array.isArray(table.rows) || table.rows.length === 0) {
    return {
      restoredRows: 0,
    };
  }

  // -------------------------------------------------
  // Only restore columns that still exist
  // -------------------------------------------------

  const columns = Object.keys(table.rows[0]).filter((column) =>
    columnInfo.has(column),
  );

  if (columns.length === 0) {
    return {
      restoredRows: 0,
    };
  }

  const insertQuery = buildInsertQuery(table.name, columns, columnInfo);

  let pendingRows = table.rows.map((row, index) => ({
    row,
    index,
  }));

  let restoredRows = 0;
  let passNumber = 0;

  while (pendingRows.length > 0) {
    passNumber++;

    let progress = false;

    const stillPending = [];

    for (const pending of pendingRows) {
      const row = pending.row;

      // -----------------------------------------
      // Convert values
      // -----------------------------------------

      const values = columns.map((column) => {
        const rawValue = deserializeValue(row[column]);

        const info = columnInfo.get(column);

        return convertValueForPostgres(rawValue, info.dataType, info.udtName);
      });

      // -----------------------------------------
      // SAVEPOINT
      // -----------------------------------------

      const savepointName =
        `restore_row_${passNumber}_${pending.index}`.replace(
          /[^a-zA-Z0-9_]/g,
          "_",
        );

      try {
        await tx.$executeRawUnsafe(`SAVEPOINT ${savepointName}`);

        // -------------------------------------
        // INSERT
        // -------------------------------------

        await tx.$executeRawUnsafe(insertQuery, ...values);

        // -------------------------------------
        // SUCCESS
        // -------------------------------------

        await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName}`);

        restoredRows++;
        progress = true;
      } catch (insertError) {
        // -------------------------------------
        // Rollback failed INSERT to savepoint
        // -------------------------------------

        try {
          await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepointName}`);
        } catch (rollbackError) {
          console.error(
            `SAVEPOINT ROLLBACK FAILED: table="${table.name}", row=${pending.index}`,
            rollbackError,
          );

          throw insertError;
        }

        // -------------------------------------
        // FK ERROR
        // -------------------------------------

        if (isForeignKeyError(insertError)) {
          stillPending.push(pending);

          try {
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName}`);
          } catch {}

          continue;
        }

        // -------------------------------------
        // NON-FK ERROR
        // -------------------------------------

        try {
          await tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepointName}`);
        } catch {}

        let rowPreview = "";

        try {
          rowPreview = JSON.stringify(row, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          );
        } catch {
          rowPreview = "[unable to serialize row]";
        }

        console.error(
          `FAILED RESTORING TABLE "${table.name}" ROW ${pending.index}`,
          {
            error: insertError,
            columns,
            row: rowPreview,
          },
        );

        throw new Error(
          `Failed restoring table "${table.name}" row ${pending.index}: ${
            insertError?.message || insertError
          }`,
        );
      }
    }

    // -------------------------------------------------
    // No progress = unresolved FK dependency
    // -------------------------------------------------

    if (stillPending.length > 0 && !progress) {
      const first = stillPending[0];

      let rowPreview = "";

      try {
        rowPreview = JSON.stringify(first.row, (_key, value) =>
          typeof value === "bigint" ? value.toString() : value,
        );
      } catch {
        rowPreview = "[unable to serialize row]";
      }

      throw new Error(
        `Unable to restore table "${table.name}". ` +
          `${stillPending.length} row(s) still violate a foreign-key constraint after ${passNumber} attempt(s). ` +
          `This may be a circular or invalid foreign-key dependency. ` +
          `First pending row: ${rowPreview}`,
      );
    }

    pendingRows = stillPending;
  }

  return {
    restoredRows,
  };
}

// =====================================================
// POST
// =====================================================

export async function POST(request) {
  let tempFile = null;

  try {
    await ensureBackupTables();

    // =================================================
    // GET UPLOADED FILE
    // =================================================

    const formData = await request.formData();

    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "Backup ZIP file is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid uploaded backup file.",
        },
        {
          status: 400,
        },
      );
    }

    // =================================================
    // TEMP DIRECTORY
    // =================================================

    await fs.mkdir(TEMP_RESTORE_PATH, {
      recursive: true,
    });

    // =================================================
    // TEMP ZIP
    // =================================================

    tempFile = path.join(
      TEMP_RESTORE_PATH,
      `restore-${crypto.randomUUID()}.zip`,
    );

    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(tempFile, buffer);

    // =================================================
    // READ BACKUP ZIP
    // =================================================

    const backup = await readBackupZip(tempFile);

    if (!Array.isArray(backup.tables)) {
      throw new Error("Backup contains no table information.");
    }

    // =================================================
    // CURRENT DATABASE TABLES
    // =================================================

    const currentTables = await prisma.$queryRawUnsafe(
      `
                    SELECT tablename
                    FROM pg_tables
                    WHERE schemaname = 'public'
                `,
    );

    const currentTableNames = new Set(
      currentTables.map((item) => item.tablename),
    );

    let restoredTables = 0;
    let restoredRows = 0;

    const skippedTables = [];

    // =================================================
    // TRANSACTION
    // =================================================

    await prisma.$transaction(
      async (tx) => {
        // -----------------------------------------
        // FOREIGN KEYS
        // -----------------------------------------

        const dependencies = await getForeignKeyDependencies(tx);

        // -----------------------------------------
        // ONLY EXISTING TABLES
        // -----------------------------------------

        const tablesToRestore = backup.tables.filter((table) => {
          if (!currentTableNames.has(table.name)) {
            skippedTables.push(table.name);

            return false;
          }

          return true;
        });

        // -----------------------------------------
        // PARENT TABLES FIRST
        // -----------------------------------------

        const orderedTables = sortTablesByDependencies(
          tablesToRestore,
          dependencies,
        );

        console.log(
          "DATABASE RESTORE TABLE ORDER:",
          orderedTables.map((table) => table.name),
        );

        // -----------------------------------------
        // TRUNCATE
        // -----------------------------------------

        for (const table of tablesToRestore) {
          const quoted = quoteIdentifier(table.name);

          await tx.$executeRawUnsafe(
            `
                            TRUNCATE TABLE
                            ${quoted}
                            RESTART IDENTITY
                            CASCADE
                        `,
          );
        }

        // -----------------------------------------
        // RESTORE
        // -----------------------------------------

        for (const table of orderedTables) {
          console.log(`RESTORING TABLE: ${table.name}`);

          const columnInfo = await getTableColumns(tx, table.name);

          const result = await restoreTableRows(tx, table, columnInfo);

          restoredRows += result.restoredRows;

          restoredTables++;

          console.log(
            `RESTORED TABLE: ${table.name} | ROWS: ${result.restoredRows}`,
          );
        }
      },
      {
        timeout: 300000,
      },
    );

    // =================================================
    // SUCCESS
    // =================================================

    return NextResponse.json({
      success: true,
      message: "Database restored successfully.",
      restoredTables,
      restoredRows,
      skippedTables,
    });
  } catch (error) {
    console.error("DATABASE BACKUP RESTORE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Unable to restore database.",
      },
      {
        status: 500,
      },
    );
  } finally {
    // =================================================
    // REMOVE TEMP FILE
    // =================================================

    if (tempFile) {
      try {
        await fs.unlink(tempFile);
      } catch {}
    }
  }
}
