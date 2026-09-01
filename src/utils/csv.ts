/**
 * Minimal, dependency-free CSV serializer. Escapes double quotes and wraps
 * any field containing a comma, quote, or newline in double quotes, per
 * RFC 4180.
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvField).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvField).join(","));
  }
  // CRLF per RFC 4180; also works fine for most spreadsheet apps.
  return lines.join("\r\n");
}
