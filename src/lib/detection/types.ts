export type Risk = 'None' | 'Low' | 'Medium' | 'High' | 'Critical';

export type DetectorType = 'payment_card' | 'uk_nino' | 'uk_phone' | 'email';

// Masked values only: raw matches never leave the detector.
export interface RawMatch {
  type: DetectorType;
  risk: Risk;
  masked: string;
  start: number;
  end: number;
}

export interface Finding {
  type: DetectorType;
  risk: Risk;
  count: number;
  maskedExample: string;
}

export interface ScanResult {
  risk: Risk;
  findings: Finding[];
}
