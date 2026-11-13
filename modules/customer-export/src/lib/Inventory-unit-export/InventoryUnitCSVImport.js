import { importableInventoryUnitFields } from "./inventoryUnitFields";

// -------------------------------------------------
// PARSE CSV LINE
// -------------------------------------------------

function parseCSVLine(line) {
  const values = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    // Escaped quote: ""
    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i++;
      continue;
    }

    // Start / end quotes
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    // Comma outside quotes
    if (char === "," && !insideQuotes) {
      values.push(value.trim());
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value.trim());

  return values;
}

// -------------------------------------------------
// PARSE CSV
// -------------------------------------------------

function parseCSV(csv) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCSVLine(lines[0]).map((header) =>
    header.trim()
  );

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);

    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

// -------------------------------------------------
// BOOLEAN
// -------------------------------------------------

function parseBoolean(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no"
  ) {
    return false;
  }

  return null;
}

// -------------------------------------------------
// CSV → UNITS
// -------------------------------------------------

export function csvToUnits(csv) {
  const rows = parseCSV(csv);

  return rows.map((row) => {
    const unit = {};

    importableInventoryUnitFields.forEach((field) => {
      if (!(field in row)) {
        return;
      }

      const value = row[field];

      switch (field) {
        // -----------------------------------------
        // ID
        // -----------------------------------------
        case "id":
          unit[field] = value?.trim() || null;
          break;

        // -----------------------------------------
        // BOOLEAN
        // -----------------------------------------
        case "status":
          unit[field] = parseBoolean(value);
          break;

        // -----------------------------------------
        // STRING
        // -----------------------------------------
        case "unitName":
        case "abbreviation":
        default:
          unit[field] = value?.trim() || null;
          break;
      }
    });

    return unit;
  });
}