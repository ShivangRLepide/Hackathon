import { formatTimestamp } from "../reports/format.ts";
import { RISKS } from "../reports/model.ts";
import type { Summary } from "../reports/summary.ts";

const SCOPE = "I can only answer questions about this dashboard.";
const EXAMPLES =
  "Try asking how many files you have scanned, how many findings, how many high or critical files, the risk breakdown, or about your latest scan.";
const NO_SCANS = "No files have been scanned yet. Upload a file to see results here.";

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

interface Intent {
  pattern: RegExp;
  answer: (summary: Summary) => string;
}

// Order matters: the first matching pattern wins.
const INTENTS: Intent[] = [
  {
    pattern: /\b(high|critical)\b/,
    answer: ({ scanCount, riskCounts }) => {
      const flagged = riskCounts.High + riskCounts.Critical;
      return `${flagged} of your ${scanCount} ${plural(scanCount, "file")} ${flagged === 1 ? "is" : "are"} High or Critical risk (${riskCounts.Critical} Critical, ${riskCounts.High} High).`;
    },
  },
  {
    pattern: /\b(findings?|sensitive|detections?)\b/,
    answer: ({ findingTotal }) =>
      `Your scans have found ${findingTotal} ${plural(findingTotal, "finding")} in total.`,
  },
  {
    pattern: /\b(latest|last|recent|newest)\b/,
    answer: ({ recent }) => {
      const [latest] = recent;
      return `Your latest scan is ${latest.file_name}, scanned at ${formatTimestamp(latest.created_at)}, with ${latest.overall_risk} overall risk and ${latest.total_findings} ${plural(latest.total_findings, "finding")}.`;
    },
  },
  {
    pattern: /\b(risks?|levels?|breakdown|distribution)\b/,
    answer: ({ riskCounts }) =>
      `Risk levels: ${[...RISKS]
        .reverse()
        .map((risk) => `${risk} ${riskCounts[risk]}`)
        .join(", ")}.`,
  },
  {
    pattern: /\b(files?|scans?|scanned|uploaded|uploads?|how many)\b/,
    answer: ({ scanCount }) => `You have scanned ${scanCount} ${plural(scanCount, "file")} so far.`,
  },
];

/** Answers a dashboard question from the loaded summary. Rule-based; no external service. */
export function answerQuestion(question: string, summary: Summary): string {
  const text = question.toLowerCase();

  if (/\b(help|what can you|what do you)\b/.test(text)) return `${SCOPE} ${EXAMPLES}`;

  const intent = INTENTS.find(({ pattern }) => pattern.test(text));
  if (!intent) return `${SCOPE} ${EXAMPLES}`;
  if (summary.scanCount === 0) return NO_SCANS;

  return intent.answer(summary);
}
