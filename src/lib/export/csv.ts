import type { ReportFinding } from "../reports/findings.ts";

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Stop spreadsheet formula injection: text starting with = + - @ tab or CR
 * is prefixed with an apostrophe so spreadsheets show it as text.
 */
export function neutraliseCell(value: string): string {
  return FORMULA_START.test(value) ? `'${value}` : value;
}

/** RFC 4180 field: always quoted, internal quotes doubled. */
export function csvField(value: string): string {
  return `"${neutraliseCell(value).replace(/"/g, '""')}"`;
}

/** Build CSV text with CRLF line endings and a trailing newline. */
export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvField).join(","));
  return `${lines.join("\r\n")}\r\n`;
}

export const FINDINGS_CSV_HEADER = [
  "File name",
  "Scanned at (UTC)",
  "Overall risk",
  "Finding type",
  "Finding risk",
  "Occurrences",
  "Masked example",
];

export function findingsCsv(rows: readonly ReportFinding[]): string {
  return toCsv(
    FINDINGS_CSV_HEADER,
    rows.map((row) => [
      row.fileName,
      new Date(row.scannedAt).toISOString(),
      row.overallRisk,
      row.detectorLabel,
      row.risk,
      String(row.occurrenceCount),
      row.maskedExample,
    ]),
  );
}
