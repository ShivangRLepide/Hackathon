import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { summarise, newestFirst } from '../../src/lib/reports/summary.ts';
import { joinFindings, filterFindings } from '../../src/lib/reports/findings.ts';
import type { FindingRow, ScanRow } from '../../src/lib/reports/model.ts';

const scans: ScanRow[] = [
  { id: 's1', file_name: 'older.csv', created_at: '2026-10-20T09:00:00.000+00:00', overall_risk: 'Low', total_findings: 1 },
  { id: 's2', file_name: 'newer.txt', created_at: '2026-10-21T10:00:00.5+00:00', overall_risk: 'Critical', total_findings: 4 },
  { id: 's3', file_name: 'middle.txt', created_at: '2026-10-21T09:30:00+00:00', overall_risk: 'High', total_findings: 2 },
  { id: 's4', file_name: 'clean.txt', created_at: '2026-10-19T08:00:00+00:00', overall_risk: 'None', total_findings: 0 },
];

const findings: FindingRow[] = [
  { id: 'f1', scan_id: 's1', detector_type: 'email', risk: 'Low', occurrence_count: 1, masked_example: 'u***@example.test' },
  { id: 'f2', scan_id: 's2', detector_type: 'payment_card', risk: 'Critical', occurrence_count: 3, masked_example: '4111 **** **** 1111' },
  { id: 'f3', scan_id: 's2', detector_type: 'email', risk: 'Low', occurrence_count: 1, masked_example: 'a***@example.test' },
  { id: 'f4', scan_id: 's3', detector_type: 'uk_nino', risk: 'High', occurrence_count: 2, masked_example: 'QQ ** ** ** C' },
  { id: 'f5', scan_id: 'missing', detector_type: 'uk_phone', risk: 'Medium', occurrence_count: 1, masked_example: '07*****123' },
];

describe('summarise', () => {
  it('counts scans, sums findings and counts high or critical scans', () => {
    const summary = summarise(scans);
    assert.equal(summary.scanCount, 4);
    assert.equal(summary.findingTotal, 7);
    assert.equal(summary.highOrCriticalScans, 2);
  });

  it('builds a risk distribution with zero for unused risks', () => {
    const summary = summarise(scans);
    assert.deepEqual(summary.riskCounts, { None: 1, Low: 1, Medium: 0, High: 1, Critical: 1 });
  });

  it('returns the most recent scans first, parsed as timestamps, limited to the requested count', () => {
    const summary = summarise(scans, 3);
    assert.deepEqual(summary.recent.map((scan) => scan.id), ['s2', 's3', 's1']);
  });

  it('handles an empty list', () => {
    const summary = summarise([]);
    assert.equal(summary.scanCount, 0);
    assert.equal(summary.findingTotal, 0);
    assert.deepEqual(summary.recent, []);
  });

  it('does not mutate its input when sorting', () => {
    const before = scans.map((scan) => scan.id);
    newestFirst(scans);
    assert.deepEqual(scans.map((scan) => scan.id), before);
  });
});

describe('joinFindings', () => {
  it('joins each finding to its scan and drops findings whose scan is not visible', () => {
    const rows = joinFindings(findings, scans);
    assert.equal(rows.length, 4);
    assert.ok(rows.every((row) => row.id !== 'f5'));
    const f4 = rows.find((row) => row.id === 'f4');
    assert.equal(f4?.fileName, 'middle.txt');
    assert.equal(f4?.overallRisk, 'High');
    assert.equal(f4?.detectorLabel, 'UK National Insurance number');
  });

  it('orders by newest scan first, then by detector order', () => {
    const rows = joinFindings(findings, scans);
    assert.deepEqual(rows.map((row) => row.id), ['f2', 'f3', 'f4', 'f1']);
  });
});

describe('filterFindings', () => {
  const rows = joinFindings(findings, scans);

  it('returns everything when both filters are all', () => {
    assert.equal(filterFindings(rows, { type: 'all', risk: 'all' }).length, 4);
  });

  it('filters by detector type', () => {
    const result = filterFindings(rows, { type: 'email', risk: 'all' });
    assert.deepEqual(result.map((row) => row.id), ['f3', 'f1']);
  });

  it('filters by risk and combines with type', () => {
    assert.deepEqual(filterFindings(rows, { type: 'all', risk: 'Critical' }).map((row) => row.id), ['f2']);
    assert.deepEqual(filterFindings(rows, { type: 'uk_nino', risk: 'Low' }), []);
  });
});
