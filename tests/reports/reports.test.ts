import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { summarise, newestFirst } from '../../src/lib/reports/summary.ts';
import {
  DEFAULT_SORT,
  filterFindings,
  joinFindings,
  paginate,
  searchFindings,
  sortFindings,
  toggleSort,
} from '../../src/lib/reports/findings.ts';
import { deleteScan } from '../../src/lib/reports/delete.ts';
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

describe('summarise scans list', () => {
  it('exposes every scan newest first, for paged history', () => {
    const summary = summarise(scans);
    assert.deepEqual(summary.scans.map((scan) => scan.id), ['s2', 's3', 's1', 's4']);
  });
});

describe('searchFindings', () => {
  const rows = joinFindings(findings, scans);

  it('matches the file name case-insensitively', () => {
    assert.deepEqual(searchFindings(rows, 'NEWER').map((row) => row.id), ['f2', 'f3']);
  });

  it('returns every row for an empty or blank query', () => {
    assert.equal(searchFindings(rows, '').length, 4);
    assert.equal(searchFindings(rows, '   ').length, 4);
  });

  it('returns nothing when no file name matches', () => {
    assert.deepEqual(searchFindings(rows, 'nomatch'), []);
  });
});

describe('sortFindings', () => {
  const rows = joinFindings(findings, scans);

  it('sorts by file name in both directions, keeping ties in input order', () => {
    assert.deepEqual(sortFindings(rows, { key: 'fileName', direction: 'ascending' }).map((row) => row.id), ['f4', 'f2', 'f3', 'f1']);
    assert.deepEqual(sortFindings(rows, { key: 'fileName', direction: 'descending' }).map((row) => row.id), ['f1', 'f2', 'f3', 'f4']);
  });

  it('sorts by scan time', () => {
    assert.deepEqual(sortFindings(rows, { key: 'scannedAt', direction: 'ascending' }).map((row) => row.id), ['f1', 'f4', 'f2', 'f3']);
  });

  it('sorts by risk using the risk scale', () => {
    assert.deepEqual(sortFindings(rows, { key: 'risk', direction: 'descending' }).map((row) => row.id), ['f2', 'f4', 'f3', 'f1']);
    assert.deepEqual(sortFindings(rows, { key: 'risk', direction: 'ascending' }).map((row) => row.id), ['f3', 'f1', 'f4', 'f2']);
  });

  it('sorts by occurrence count', () => {
    assert.deepEqual(sortFindings(rows, { key: 'occurrenceCount', direction: 'descending' }).map((row) => row.id), ['f2', 'f4', 'f3', 'f1']);
  });

  it('default sort matches the joined order and does not mutate its input', () => {
    const before = rows.map((row) => row.id);
    assert.deepEqual(sortFindings(rows, DEFAULT_SORT).map((row) => row.id), ['f2', 'f3', 'f4', 'f1']);
    assert.deepEqual(rows.map((row) => row.id), before);
  });
});

describe('toggleSort', () => {
  it('flips the direction when the active column is clicked again', () => {
    assert.deepEqual(toggleSort({ key: 'risk', direction: 'descending' }, 'risk'), { key: 'risk', direction: 'ascending' });
    assert.deepEqual(toggleSort({ key: 'risk', direction: 'ascending' }, 'risk'), { key: 'risk', direction: 'descending' });
  });

  it('starts file names A to Z and other columns highest first', () => {
    assert.deepEqual(toggleSort(DEFAULT_SORT, 'fileName'), { key: 'fileName', direction: 'ascending' });
    assert.deepEqual(toggleSort(DEFAULT_SORT, 'risk'), { key: 'risk', direction: 'descending' });
    assert.deepEqual(toggleSort(DEFAULT_SORT, 'occurrenceCount'), { key: 'occurrenceCount', direction: 'descending' });
  });
});

describe('paginate', () => {
  const numbers = Array.from({ length: 25 }, (_, index) => index + 1);

  it('returns the first page of ten with one-based indexes', () => {
    const page = paginate(numbers, 1);
    assert.equal(page.page, 1);
    assert.equal(page.pages, 3);
    assert.equal(page.items.length, 10);
    assert.equal(page.firstIndex, 1);
    assert.equal(page.lastIndex, 10);
  });

  it('returns a partial last page', () => {
    const page = paginate(numbers, 3);
    assert.deepEqual(page.items, [21, 22, 23, 24, 25]);
    assert.equal(page.firstIndex, 21);
    assert.equal(page.lastIndex, 25);
  });

  it('clamps requests outside the range', () => {
    assert.equal(paginate(numbers, 9).page, 3);
    assert.equal(paginate(numbers, 0).page, 1);
    assert.equal(paginate(numbers, -4).page, 1);
  });

  it('honours a custom page size', () => {
    const page = paginate([1, 2, 3, 4, 5], 2, 2);
    assert.deepEqual(page.items, [3, 4]);
    assert.equal(page.pages, 3);
  });

  it('handles an empty list with zero indexes and one page', () => {
    const page = paginate([], 1);
    assert.deepEqual(page, { items: [], page: 1, pages: 1, firstIndex: 0, lastIndex: 0 });
  });
});

describe('deleteScan', () => {
  function fakeClient(result: { data: unknown; error: unknown }) {
    const calls: unknown[][] = [];
    const chain = {
      delete() {
        calls.push(['delete']);
        return chain;
      },
      eq(column: string, value: string) {
        calls.push(['eq', column, value]);
        return chain;
      },
      select(columns: string) {
        calls.push(['select', columns]);
        return Promise.resolve(result);
      },
    };
    const client = {
      from(table: string) {
        calls.push(['from', table]);
        return chain;
      },
    };
    return { client: client as unknown as SupabaseClient, calls };
  }

  it('deletes the scan by id and asks for the deleted row back', async () => {
    const { client, calls } = fakeClient({ data: [{ id: 's1' }], error: null });
    await deleteScan(client, 's1');
    assert.deepEqual(calls, [
      ['from', 'scans'],
      ['delete'],
      ['eq', 'id', 's1'],
      ['select', 'id'],
    ]);
  });

  it('rejects when the database returns an error', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await assert.rejects(deleteScan(client, 's1'), { message: 'delete_failed' });
  });

  it('rejects when no row was deleted, for example because RLS blocked it', async () => {
    const { client } = fakeClient({ data: [], error: null });
    await assert.rejects(deleteScan(client, 's1'), { message: 'not_deleted' });
  });
});
