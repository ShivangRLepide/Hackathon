import type { SupabaseClient } from "@supabase/supabase-js";
import type { FindingRow, ScanRow } from "./model.ts";

export interface ReportData {
  scans: ScanRow[];
  findings: FindingRow[];
}

/**
 * Read the signed-in user's scans and findings. Row Level Security limits both
 * queries to the caller's own rows, so no user id filter is applied here.
 */
export async function loadReports(supabase: SupabaseClient): Promise<ReportData> {
  const [scansResult, findingsResult] = await Promise.all([
    supabase
      .from("scans")
      .select("id, file_name, created_at, overall_risk, total_findings")
      .order("created_at", { ascending: false }),
    supabase
      .from("findings")
      .select("id, scan_id, detector_type, risk, occurrence_count, masked_example"),
  ]);

  if (scansResult.error || findingsResult.error) {
    throw new Error("load_failed");
  }

  return {
    scans: (scansResult.data ?? []) as ScanRow[],
    findings: (findingsResult.data ?? []) as FindingRow[],
  };
}
