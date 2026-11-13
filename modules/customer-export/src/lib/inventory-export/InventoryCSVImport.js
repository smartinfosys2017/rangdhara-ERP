import { importableInventoryFields } from "./inventoryFields";

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
    if (
      char === '"' &&
      insideQuotes &&
      next === '"'
    ) {
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
    if (
      char === "," &&
      !insideQuotes
    ) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);

  return values;
}

// -------------------------------------------------
// PARSE CSV
// -------------------------------------------------

function parseCSV(csv) {
  const lines = csv
    .split(/\r?\n/)
    .filter(
      (line) => line.trim() !== ""
    );

  if (!lines.length) {
    return [];
  }

  const headers = parseCSVLine(lines[0]).map(
    (header) => header.trim()
  );

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);

    const row = {};

    headers.forEach(
      (header, index) => {
        row[header] =
          values[index] ?? "";
      }
    );

    return row;
  });
}

// -------------------------------------------------
// INTEGER
// -------------------------------------------------

function parseInteger(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    return null;
  }

  return number;
}

// -------------------------------------------------
// BOOLEAN
// -------------------------------------------------

function parseBoolean(value) {
  if (
    value === true ||
    value === "true" ||
    value === "TRUE" ||
    value === "True" ||
    value === "1" ||
    value === "yes" ||
    value === "YES" ||
    value === "Yes"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === "FALSE" ||
    value === "False" ||
    value === "0" ||
    value === "no" ||
    value === "NO" ||
    value === "No"
  ) {
    return false;
  }

  return null;
}

// -------------------------------------------------
// CSV → INVENTORY
// -------------------------------------------------

export function csvToInventory(csv) {
  const rows = parseCSV(csv);

  return rows.map((row) => {
    const inventory = {};

    importableInventoryFields.forEach(
      (field) => {
        if (!(field in row)) {
          return;
        }

        const value = row[field];

        switch (field) {
          // -----------------------------------------
          // INTEGER
          // -----------------------------------------

          case "rather":
            inventory[field] =
              parseInteger(value);
            break;

          // -----------------------------------------
          // BOOLEAN
          // -----------------------------------------

          case "ApplicableForRelocateLevel":
          case "status":
          case "isDefault":
            inventory[field] =
              parseBoolean(value);
            break;

          // -----------------------------------------
          // STRING
          // -----------------------------------------
          case "id":
          case "ItemGroupid":
          case "ItemName":
          case "Description":
          case "openingBalance":
          case "Unitid":
          case "Tax1":
          case "Tax2":
          case "RelocateLevel":
          default:
            inventory[field] =
              value?.trim() || null;
            break;
        }
      }
    );

    return inventory;
  });
}