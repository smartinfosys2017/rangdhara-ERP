import { customerFields } from "./customerFields";

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

export function customersToCSV(customers) {
  const header = customerFields.join(",");

  const rows = customers.map((customer) => {
    return customerFields
      .map((field) => escapeCSV(customer[field]))
      .join(",");
  });

  return [header, ...rows].join("\r\n");
}