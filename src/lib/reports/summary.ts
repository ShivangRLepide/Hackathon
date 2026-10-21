import { RISKS, type Risk, type ScanRow } from "./model.ts";

export interface Summary {
  scanCount: number;
  findingTotal: number;
  highOrCriticalScans: number;
  riskCounts: Record<Risk, number>;
  /** Every scan, newest first. */
  scans: ScanRow[];
  recent: ScanRow[];
}

/** Sort rows newest first by parsed timestamp (string order is not reliable for timestamps). */
export function newestFirst<T extends { created_at: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function summarise(scans: readonly ScanRow[], recentLimit = 5): Summary {
  const riskCounts = Object.fromEntries(RISKS.map((risk) => [risk, 0])) as Record<Risk, number>;
  let findingTotal = 0;

  for (const scan of scans) {
    riskCounts[scan.overall_risk] += 1;
    findingTotal += scan.total_findings;
  }

  const ordered = newestFirst(scans);
  return {
    scanCount: scans.length,
    findingTotal,
    highOrCriticalScans: riskCounts.High + riskCounts.Critical,
    riskCounts,
    scans: ordered,
    recent: ordered.slice(0, recentLimit),
  };
}
