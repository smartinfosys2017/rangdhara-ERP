import { inventoryItemGroupFields } from "./inventoryItemGroupFields";

function escapeCSV(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let output = value;

  if (Array.isArray(value)) {
    output = JSON.stringify(value);
  }

  if (typeof value === "object") {
    output = JSON.stringify(value);
  }

  output = String(output);

  if (
    output.includes(",") ||
    output.includes('"') ||
    output.includes("\n") ||
    output.includes("\r")
  ) {
    return `"${output.replace(/"/g, '""')}"`;
  }

  return output;
}

export function inventoryToCSV(inventory) {
  const header = inventoryItemGroupFields.join(",");

  const rows = inventory.map((inventory) => {
    return inventoryItemGroupFields
      .map((field) => escapeCSV(inventory[field]))
      .join(",");
  });

  return [header, ...rows].join("\r\n");
}