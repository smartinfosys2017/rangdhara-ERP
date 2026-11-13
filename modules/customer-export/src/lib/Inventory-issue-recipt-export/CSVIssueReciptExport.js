export default class CSVIssueReciptExport {
  constructor(filename = "export.csv") {
    this.filename = filename;
    this.headers = [];
    this.rows = [];
  }

  setHeaders(headers = []) {
    this.headers = headers;
    return this;
  }

  addRow(row = []) {
    this.rows.push(row);
    return this;
  }

  addRows(rows = []) {
    this.rows.push(...rows);
    return this;
  }

  escape(value) {
    if (value === null || value === undefined) return "";

    if (Array.isArray(value)) {
      value = value.join(", ");
    }

    if (typeof value === "object") {
      value = JSON.stringify(value);
    }

    return `"${String(value).replace(/"/g, '""')}"`;
  }

  generate() {
    const lines = [];

    if (this.headers.length) {
      lines.push(this.headers.map((value) => this.escape(value)).join(","));
    }

    for (const row of this.rows) {
      lines.push(row.map((value) => this.escape(value)).join(","));
    }

    return "\uFEFF" + lines.join("\r\n");
  }

  getFilename() {
    return this.filename;
  }

  getBuffer() {
    return Buffer.from(this.generate(), "utf8");
  }
}