import { formatTimestamp } from "../reports/format.ts";
import { RISKS, type Risk } from "../reports/model.ts";
import type { Summary } from "../reports/summary.ts";

const SCOPE = "I can only answer questions about this dashboard.";
const EXAMPLES =
  "Try asking how many files you have scanned, how many findings, how many high or critical files, the risk breakdown, your latest scan, your riskiest file, or what you scanned today, yesterday or in the last 7 days.";
const NO_SCANS = "No files have been scanned yet. Upload a file to see results here.";

const RISK_RANK: Record<Risk, number> = { None: 0, Low: 1, Medium: 2, High: 3, Critical: 4 };
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 365;
// Matches "today", "yesterday", "last 7 days", "past 3 days", "last week" and "last month".
const DATE_PATTERN = /\b(today|yesterday|(?:last|past) (?:(\d{1,3}) days?|(week|month)))\b/;

interface Context {
  summary: Summary;
  text: string;
  now: Date;
}

interface Intent {
  pattern: RegExp;
  answer: (context: Context) => string;
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

/** Midnight UTC on the day `now` falls on. The app shows all times in UTC, so day ranges use UTC too. */
function utcMidnight(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function answerDateRange({ summary, text, now }: Context): string {
  const match = DATE_PATTERN.exec(text);
  if (!match) return `${SCOPE} ${EXAMPLES}`;

  const today = utcMidnight(now);
  let label: string;
  let start: number;
  let end = Number.POSITIVE_INFINITY;

  if (match[1] === "today") {
    label = "Today";
    start = today;
  } else if (match[1] === "yesterday") {
    label = "Yesterday";
    start = today - DAY_MS;
    end = today;
  } else {
    const days = match[2] !== undefined ? Number(match[2]) : match[3] === "week" ? 7 : 30;
    if (days < 1 || days > MAX_DAYS) return `Ask about 1 to ${MAX_DAYS} days.`;
    // "Last N days" includes today, so the window starts N - 1 days before today.
    label = `In the last ${days} ${plural(days, "day")}`;
    start = today - (days - 1) * DAY_MS;
  }

  const inWindow = summary.scans.filter((scan) => {
    const time = Date.parse(scan.created_at);
    return time >= start && time < end;
  });
  const findings = inWindow.reduce((total, scan) => total + scan.total_findings, 0);
  return `${label} you scanned ${inWindow.length} ${plural(inWindow.length, "file")} and found ${findings} ${plural(findings, "finding")}.`;
}

// Order matters: the first matching pattern wins.
const INTENTS: Intent[] = [
  {
    pattern: /\b(riskiest|worst|most risky|highest risk|most sensitive)\b/,
    answer: ({ summary }) => {
      // summary.scans is newest first, so a tie on risk and findings keeps the newer scan.
      let top = summary.scans[0];
      for (const scan of summary.scans) {
        const higherRisk = RISK_RANK[scan.overall_risk] > RISK_RANK[top.overall_risk];
        const sameRiskMoreFindings =
          scan.overall_risk === top.overall_risk && scan.total_findings > top.total_findings;
        if (higherRisk || sameRiskMoreFindings) top = scan;
      }
      if (top.overall_risk === "None") return "None of your files has any sensitive-data findings.";
      return `Your riskiest file is ${top.file_name}, with ${top.overall_risk} overall risk and ${top.total_findings} ${plural(top.total_findings, "finding")}, scanned at ${formatTimestamp(top.created_at)}.`;
    },
  },
  {
    pattern: DATE_PATTERN,
    answer: answerDateRange,
  },
  {
    pattern: /\b(high|critical)\b/,
    answer: ({ summary: { scanCount, riskCounts } }) => {
      const flagged = riskCounts.High + riskCounts.Critical;
      return `${flagged} of your ${scanCount} ${plural(scanCount, "file")} ${flagged === 1 ? "is" : "are"} High or Critical risk (${riskCounts.Critical} Critical, ${riskCounts.High} High).`;
    },
  },
  {
    pattern: /\b(findings?|sensitive|detections?)\b/,
    answer: ({ summary: { findingTotal } }) =>
      `Your scans have found ${findingTotal} ${plural(findingTotal, "finding")} in total.`,
  },
  {
    pattern: /\b(latest|last|recent|newest)\b/,
    answer: ({ summary }) => {
      const [latest] = summary.recent;
      return `Your latest scan is ${latest.file_name}, scanned at ${formatTimestamp(latest.created_at)}, with ${latest.overall_risk} overall risk and ${latest.total_findings} ${plural(latest.total_findings, "finding")}.`;
    },
  },
  {
    pattern: /\b(risks?|levels?|breakdown|distribution)\b/,
    answer: ({ summary: { riskCounts } }) =>
      `Risk levels: ${[...RISKS]
        .reverse()
        .map((risk) => `${risk} ${riskCounts[risk]}`)
        .join(", ")}.`,
  },
  {
    pattern: /\b(files?|scans?|scanned|uploaded|uploads?|how many)\b/,
    answer: ({ summary: { scanCount } }) => `You have scanned ${scanCount} ${plural(scanCount, "file")} so far.`,
  },
];

/**
 * Answers a dashboard question from the loaded summary. Rule-based; no external service.
 * `now` is injectable so date questions can be tested.
 */
export function answerQuestion(question: string, summary: Summary, now: Date = new Date()): string {
  const text = question.toLowerCase();

  if (/\b(help|what can you|what do you)\b/.test(text)) return `${SCOPE} ${EXAMPLES}`;

  const intent = INTENTS.find(({ pattern }) => pattern.test(text));
  if (!intent) return `${SCOPE} ${EXAMPLES}`;
  if (summary.scanCount === 0) return NO_SCANS;

  return intent.answer({ summary, text, now });
}
