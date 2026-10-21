import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { answerQuestion } from '../../src/lib/assistant/answer.ts';
import { summarise } from '../../src/lib/reports/summary.ts';
import type { ScanRow } from '../../src/lib/reports/model.ts';

const scans: ScanRow[] = [
  { id: 's1', file_name: 'older.csv', created_at: '2026-10-20T09:00:00.000+00:00', overall_risk: 'Low', total_findings: 1 },
  { id: 's2', file_name: 'newer.txt', created_at: '2026-10-21T10:00:00.000+00:00', overall_risk: 'Critical', total_findings: 4 },
  { id: 's3', file_name: 'middle.txt', created_at: '2026-10-21T09:30:00.000+00:00', overall_risk: 'High', total_findings: 2 },
  { id: 's4', file_name: 'clean.txt', created_at: '2026-10-19T08:00:00.000+00:00', overall_risk: 'None', total_findings: 0 },
];

describe('answerQuestion', () => {
  it('answers how many files have been scanned from the data', () => {
    assert.equal(answerQuestion('How many files have I scanned till now?', summarise(scans)), 'You have scanned 4 files so far.');
  });

  it('uses the singular for one file', () => {
    assert.equal(answerQuestion('how many files?', summarise(scans.slice(0, 1))), 'You have scanned 1 file so far.');
  });

  it('answers the total number of findings', () => {
    assert.equal(answerQuestion('how many findings?', summarise(scans)), 'Your scans have found 7 findings in total.');
  });

  it('counts high and critical files', () => {
    assert.equal(
      answerQuestion('how many high or critical files?', summarise(scans)),
      '2 of your 4 files are High or Critical risk (1 Critical, 1 High).',
    );
  });

  it('gives the risk breakdown from highest to lowest', () => {
    assert.equal(
      answerQuestion('what is the risk breakdown?', summarise(scans)),
      'Risk levels: Critical 1, High 1, Medium 0, Low 1, None 1.',
    );
  });

  it('describes the latest scan', () => {
    const answer = answerQuestion('what was my latest scan?', summarise(scans));
    assert.match(answer, /^Your latest scan is newer\.txt, scanned at .* UTC, with Critical overall risk and 4 findings\.$/);
  });

  it('says no files have been scanned when the dashboard is empty', () => {
    assert.equal(
      answerQuestion('how many files have I scanned?', summarise([])),
      'No files have been scanned yet. Upload a file to see results here.',
    );
  });

  it('explains the scope for unrelated questions', () => {
    assert.match(answerQuestion('what is the weather?', summarise(scans)), /^I can only answer questions about this dashboard\./);
  });

  it('lists example questions for help', () => {
    assert.match(answerQuestion('help', summarise(scans)), /how many files you have scanned/);
  });
});

// Fixed clock for date questions. Scans in the list above fall on 19 to 21 October 2026 (UTC).
const NOW_21_AFTERNOON = new Date('2026-10-21T15:00:00.000Z');

describe('answerQuestion riskiest file', () => {
  it('names the file with the highest risk', () => {
    const answer = answerQuestion('what is my riskiest file?', summarise(scans), NOW_21_AFTERNOON);
    assert.match(answer, /^Your riskiest file is newer\.txt, with Critical overall risk and 4 findings, scanned at .* UTC\.$/);
  });

  it('breaks a tie on risk by the number of findings', () => {
    const tied: ScanRow[] = [
      { id: 'a', file_name: 'few.csv', created_at: '2026-10-21T10:00:00.000+00:00', overall_risk: 'Critical', total_findings: 2 },
      { id: 'b', file_name: 'many.csv', created_at: '2026-10-20T10:00:00.000+00:00', overall_risk: 'Critical', total_findings: 5 },
    ];
    assert.match(answerQuestion('most sensitive file?', summarise(tied)), /^Your riskiest file is many\.csv,/);
  });

  it('prefers the newer scan when risk and findings are equal', () => {
    const tied: ScanRow[] = [
      { id: 'o', file_name: 'old.csv', created_at: '2026-10-20T10:00:00.000+00:00', overall_risk: 'High', total_findings: 2 },
      { id: 'n', file_name: 'new.csv', created_at: '2026-10-21T10:00:00.000+00:00', overall_risk: 'High', total_findings: 2 },
    ];
    assert.match(answerQuestion('worst file', summarise(tied)), /^Your riskiest file is new\.csv,/);
  });

  it('says so when every file has no findings', () => {
    const clean: ScanRow[] = [
      { id: 'c', file_name: 'clean.txt', created_at: '2026-10-20T10:00:00.000+00:00', overall_risk: 'None', total_findings: 0 },
    ];
    assert.equal(answerQuestion('riskiest file?', summarise(clean)), 'None of your files has any sensitive-data findings.');
  });
});

describe('answerQuestion date ranges', () => {
  it('answers for today in UTC', () => {
    assert.equal(
      answerQuestion('what did I scan today?', summarise(scans), NOW_21_AFTERNOON),
      'Today you scanned 2 files and found 6 findings.',
    );
  });

  it('answers for yesterday and excludes today', () => {
    assert.equal(
      answerQuestion('what did I scan yesterday?', summarise(scans), NOW_21_AFTERNOON),
      'Yesterday you scanned 1 file and found 1 finding.',
    );
  });

  it('counts the last N days including today', () => {
    assert.equal(
      answerQuestion('files scanned in the last 7 days?', summarise(scans), NOW_21_AFTERNOON),
      'In the last 7 days you scanned 4 files and found 7 findings.',
    );
  });

  it('uses the singular for one day', () => {
    assert.equal(
      answerQuestion('last 1 day', summarise(scans), NOW_21_AFTERNOON),
      'In the last 1 day you scanned 2 files and found 6 findings.',
    );
  });

  it('maps last week and last month to 7 and 30 days', () => {
    assert.equal(
      answerQuestion('what was scanned last week?', summarise(scans), NOW_21_AFTERNOON),
      'In the last 7 days you scanned 4 files and found 7 findings.',
    );
    assert.equal(
      answerQuestion('scans in the past month', summarise(scans), NOW_21_AFTERNOON),
      'In the last 30 days you scanned 4 files and found 7 findings.',
    );
  });

  it('asks for a valid range when the number of days is out of bounds', () => {
    assert.equal(answerQuestion('last 0 days', summarise(scans), NOW_21_AFTERNOON), 'Ask about 1 to 365 days.');
    assert.equal(answerQuestion('last 400 days', summarise(scans), NOW_21_AFTERNOON), 'Ask about 1 to 365 days.');
  });

  it('still treats "last scan" as the latest scan question', () => {
    assert.match(
      answerQuestion('what was my last scan?', summarise(scans), NOW_21_AFTERNOON),
      /^Your latest scan is newer\.txt,/,
    );
  });
});
