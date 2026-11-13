import { importableCustomerFields } from "./customerFields";

function parseCSVLine(line) {
  const values = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);

  return values;
}

function parseCSV(csv) {
  const lines = csv
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (!lines.length) {
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

function parseBoolean(value) {
  if (
    value === true ||
    value === "true" ||
    value === "1" ||
    value === "yes"
  ) {
    return true;
  }

  return false;
}

function parseJSONValue(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function csvToCustomers(csv) {
  const rows = parseCSV(csv);

  return rows.map((row) => {
    const customer = {};

    importableCustomerFields.forEach((field) => {
      if (!(field in row)) {
        return;
      }

      const value = row[field];

      if (field === "groups") {
        customer[field] = parseJSONValue(value, []);
        return;
      }

      if (field === "customFields") {
        customer[field] = parseJSONValue(value, null);
        return;
      }

      if (field === "active") {
        customer[field] = parseBoolean(value);
        return;
      }

      customer[field] = value || null;
    });

    return customer;
  });
}