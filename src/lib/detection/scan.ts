import { DETECTORS } from './detectors.ts';
import type { DetectorType, Finding, RawMatch, Risk, ScanResult } from './types.ts';

const RISK_RANK: Record<Risk, number> = { None: 0, Low: 1, Medium: 2, High: 3, Critical: 4 };

export function highestRisk(risks: readonly Risk[]): Risk {
  return risks.reduce<Risk>((top, risk) => (RISK_RANK[risk] > RISK_RANK[top] ? risk : top), 'None');
}

export function scanText(text: string): ScanResult {
  const accepted: RawMatch[] = [];
  const claimed: Array<[number, number]> = [];

  for (const detect of DETECTORS) {
    for (const match of detect(text)) {
      if (claimed.some(([start, end]) => match.start < end && start < match.end)) continue;
      claimed.push([match.start, match.end]);
      accepted.push(match);
    }
  }

  return {
    risk: highestRisk(accepted.map((match) => match.risk)),
    findings: aggregate(accepted),
  };
}

function aggregate(matches: readonly RawMatch[]): Finding[] {
  const byType = new Map<DetectorType, Finding>();
  for (const match of matches) {
    const existing = byType.get(match.type);
    if (existing) {
      existing.count += 1;
    } else {
      byType.set(match.type, {
        type: match.type,
        risk: match.risk,
        count: 1,
        maskedExample: match.masked,
      });
    }
  }
  return [...byType.values()];
}
