import { importableInventoryIssueReceiptFields } from "./inventoryIssueReciptFields";

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
// NUMBER
// -------------------------------------------------

function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
}

// -------------------------------------------------
// DATE
// -------------------------------------------------

function parseDate(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

// -------------------------------------------------
// CSV → Issue/Receipt
// -------------------------------------------------

export function csvToInventory(csv) {
  const rows = parseCSV(csv);

  return rows.map((row) => {
    const issueReceipt = {};

    importableInventoryIssueReceiptFields.forEach((field) => {
      if (!(field in row)) {
        return;
      }

      const value = row[field];

      switch (field) {
        // -----------------------------------------
        // NUMERIC
        // -----------------------------------------

        case "ItemGroupid":
        case "ItemMasterid":
        case "ItemTypeid":
        case "TransactionTypeid":
        case "Qty":
        case "PreviousBalance":
        case "Price":
        case "Balance":
          issueReceipt[field] = parseNumber(value);
          break;

        // -----------------------------------------
        // DATE
        // -----------------------------------------

        case "IssueDate":
        case "DateOfRecive":
          issueReceipt[field] = parseDate(value);
          break;

        // -----------------------------------------
        // STRING
        // -----------------------------------------

        case "Particuler":
        case "Issue_by":
        case "GetPassNo":
        case "ReciptChallanNo":
        case "RecivedBy":
        case "Comment":
        default:
          issueReceipt[field] =
            value?.trim() || null;
          break;
      }
    });

    return issueReceipt;
  });
}