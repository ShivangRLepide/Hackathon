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
