import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { csvField, neutraliseCell, toCsv, findingsCsv } from '../../src/lib/export/csv.ts';
import type { ReportFinding } from '../../src/lib/reports/findings.ts';

describe('neutraliseCell', () => {
  it('prefixes formula-leading text with an apostrophe', () => {
    for (const value of ['=HYPERLINK("x")', '+44', '-1', '@SUM(A1)', '\tcmd', '\rcmd']) {
      assert.equal(neutraliseCell(value), `'${value}`);
    }
  });

  it('leaves ordinary text unchanged', () => {
    assert.equal(neutraliseCell('report.csv'), 'report.csv');
    assert.equal(neutraliseCell('07*****123'), '07*****123');
    assert.equal(neutraliseCell(''), '');
  });
});

describe('csvField', () => {
  it('always quotes and doubles internal quotes', () => {
    assert.equal(csvField('say "hi"'), '"say ""hi"""');
  });

  it('keeps commas and line breaks inside the quoted field', () => {
    assert.equal(csvField('a,b\r\nc'), '"a,b\r\nc"');
  });

  it('neutralises formula injection inside the quoted field', () => {
    assert.equal(csvField('=1+1'), `"'=1+1"`);
  });
});

describe('toCsv', () => {
  it('uses CRLF line endings and a trailing newline', () => {
    assert.equal(toCsv(['A', 'B'], [['1', '2']]), '"A","B"\r\n"1","2"\r\n');
  });
});

describe('findingsCsv', () => {
  const row: ReportFinding = {
    id: 'f1',
    fileName: '=cmd|"x".csv',
    scannedAt: '2026-10-21T10:00:00.000Z',
    overallRisk: 'High',
    detectorType: 'uk_nino',
    detectorLabel: 'UK National Insurance number',
    risk: 'High',
    occurrenceCount: 2,
    maskedExample: 'QQ ** ** ** C',
  };

  it('writes the header and one line per finding in the documented column order', () => {
    const csv = findingsCsv([row]);
    const lines = csv.split('\r\n');
    assert.equal(lines[0], '"File name","Scanned at (UTC)","Overall risk","Finding type","Finding risk","Occurrences","Masked example"');
    assert.equal(
      lines[1],
      '"\'=cmd|""x"".csv","2026-10-21T10:00:00.000Z","High","UK National Insurance number","High","2","QQ ** ** ** C"',
    );
    assert.equal(lines[2], '');
  });

  it('writes only the header for an empty list', () => {
    assert.equal(findingsCsv([]).split('\r\n').length, 2);
  });

  it('never includes raw values: only the masked example column is used', () => {
    const csv = findingsCsv([{ ...row, maskedExample: '4111 **** **** 1111' }]);
    assert.ok(csv.includes('4111 **** **** 1111'));
    assert.ok(!csv.includes('4111 1111 1111 1111'));
  });
});
