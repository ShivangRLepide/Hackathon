export const RISKS = ["None", "Low", "Medium", "High", "Critical"] as const;
export type Risk = (typeof RISKS)[number];

export const DETECTOR_TYPES = ["payment_card", "uk_nino", "uk_phone", "email"] as const;
export type DetectorType = (typeof DETECTOR_TYPES)[number];

export const DETECTOR_LABEL: Record<DetectorType, string> = {
  payment_card: "Payment card number",
  uk_nino: "UK National Insurance number",
  uk_phone: "UK phone number",
  email: "Email address",
};

/** One row of the `scans` table as read under RLS. */
export interface ScanRow {
  id: string;
  file_name: string;
  created_at: string;
  overall_risk: Risk;
  total_findings: number;
}

/** One row of the `findings` table as read under RLS. Masked values only. */
export interface FindingRow {
  id: string;
  scan_id: string;
  detector_type: DetectorType;
  risk: Risk;
  occurrence_count: number;
  masked_example: string;
}
