import { DETECTOR_LABEL, DETECTOR_TYPES, RISKS, type DetectorType, type FindingRow, type Risk, type ScanRow } from "./model.ts";
import { newestFirst } from "./summary.ts";

/** A stored finding joined with the file it came from. Masked values only. */
export interface ReportFinding {
  id: string;
  fileName: string;
  scannedAt: string;
  overallRisk: Risk;
  detectorType: DetectorType;
  detectorLabel: string;
  risk: Risk;
  occurrenceCount: number;
  maskedExample: string;
}

export type TypeFilter = DetectorType | "all";
export type RiskFilter = Risk | "all";

export interface FindingFilter {
  type: TypeFilter;
  risk: RiskFilter;
}

/**
 * Join findings to their scans in JS, newest scan first, then by detector order.
 * Findings whose scan is not in the list are dropped.
 */
export function joinFindings(findings: readonly FindingRow[], scans: readonly ScanRow[]): ReportFinding[] {
  const scanById = new Map(scans.map((scan) => [scan.id, scan]));
  const scanOrder = new Map(newestFirst(scans).map((scan, index) => [scan.id, index]));
  const typeOrder = new Map(DETECTOR_TYPES.map((type, index) => [type, index]));

  return findings
    .filter((finding) => scanById.has(finding.scan_id))
    .sort(
      (a, b) =>
        (scanOrder.get(a.scan_id) ?? 0) - (scanOrder.get(b.scan_id) ?? 0) ||
        (typeOrder.get(a.detector_type) ?? 0) - (typeOrder.get(b.detector_type) ?? 0),
    )
    .map((finding) => {
      const scan = scanById.get(finding.scan_id) as ScanRow;
      return {
        id: finding.id,
        fileName: scan.file_name,
        scannedAt: scan.created_at,
        overallRisk: scan.overall_risk,
        detectorType: finding.detector_type,
        detectorLabel: DETECTOR_LABEL[finding.detector_type],
        risk: finding.risk,
        occurrenceCount: finding.occurrence_count,
        maskedExample: finding.masked_example,
      };
    });
}

export function filterFindings(rows: readonly ReportFinding[], filter: FindingFilter): ReportFinding[] {
  return rows.filter(
    (row) =>
      (filter.type === "all" || row.detectorType === filter.type) &&
      (filter.risk === "all" || row.risk === filter.risk),
  );
}

/** Case-insensitive match on the file name. An empty query returns the rows unchanged. */
export function searchFindings(rows: readonly ReportFinding[], query: string): ReportFinding[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return rows.slice();
  return rows.filter((row) => row.fileName.toLowerCase().includes(needle));
}

export type SortKey = "fileName" | "scannedAt" | "risk" | "occurrenceCount";
export type SortDirection = "ascending" | "descending";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

/** Default order: newest scan first, which is the order joinFindings produces. */
export const DEFAULT_SORT: SortState = { key: "scannedAt", direction: "descending" };

/**
 * Clicking the active column flips its direction. Clicking another column sorts by it,
 * starting with the order that suits the column (A to Z for names, highest first otherwise).
 */
export function toggleSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) {
    return { key, direction: current.direction === "ascending" ? "descending" : "ascending" };
  }
  return { key, direction: key === "fileName" ? "ascending" : "descending" };
}

const RISK_RANK = new Map(RISKS.map((risk, index) => [risk, index]));

/** Returns a new sorted array. Ties keep their input order (the sort is stable). */
export function sortFindings(rows: readonly ReportFinding[], sort: SortState): ReportFinding[] {
  const direction = sort.direction === "ascending" ? 1 : -1;
  const compare = (a: ReportFinding, b: ReportFinding): number => {
    switch (sort.key) {
      case "fileName":
        return a.fileName.localeCompare(b.fileName, "en-GB");
      case "scannedAt":
        return Date.parse(a.scannedAt) - Date.parse(b.scannedAt);
      case "risk":
        return (RISK_RANK.get(a.risk) ?? 0) - (RISK_RANK.get(b.risk) ?? 0);
      case "occurrenceCount":
        return a.occurrenceCount - b.occurrenceCount;
    }
  };
  return [...rows].sort((a, b) => direction * compare(a, b));
}

export const PAGE_SIZE = 10;

export interface Page<T> {
  items: T[];
  /** The requested page, clamped to the valid range. */
  page: number;
  pages: number;
  /** One-based index of the first item on the page, or 0 when there are no items. */
  firstIndex: number;
  /** One-based index of the last item on the page, or 0 when there are no items. */
  lastIndex: number;
}

export function paginate<T>(rows: readonly T[], requestedPage: number, pageSize: number = PAGE_SIZE): Page<T> {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Math.max(1, Math.floor(requestedPage)), pages);
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);
  return {
    items,
    page,
    pages,
    firstIndex: items.length === 0 ? 0 : start + 1,
    lastIndex: start + items.length,
  };
}
