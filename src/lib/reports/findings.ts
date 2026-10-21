import { DETECTOR_LABEL, DETECTOR_TYPES, type DetectorType, type FindingRow, type Risk, type ScanRow } from "./model.ts";
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
