import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText } from '../../src/lib/detection/scan.ts';

const FIXTURES = fileURLToPath(new URL('../fixtures/', import.meta.url));
const ADDITIONAL = join(FIXTURES, 'additional');

interface ExpectedEntry {
  file: string;
  expected_file_risk: string;
  bytes: number;
}

const expected = JSON.parse(
  readFileSync(join(ADDITIONAL, 'EXPECTED_RESULTS.json'), 'utf8'),
) as ExpectedEntry[];

test('EXPECTED_RESULTS byte sizes match the fixture files', () => {
  for (const entry of expected) {
    assert.equal(statSync(join(ADDITIONAL, entry.file)).size, entry.bytes, entry.file);
  }
});

// Reject entries (28-30) are upload-validation cases for Phase 2 and are not scanned here.
const scannable = expected.filter((entry) => entry.expected_file_risk !== 'Reject');

for (const entry of scannable) {
  test(`fixture ${entry.file} classifies as ${entry.expected_file_risk}`, () => {
    const text = readFileSync(join(ADDITIONAL, entry.file), 'utf8');
    assert.equal(scanText(text).risk, entry.expected_file_risk, entry.file);
  });
}

const samples: Array<[string, string]> = [
  ['sample-mixed.txt', 'Critical'],
  ['sample-safe.txt', 'None'],
];

for (const [file, risk] of samples) {
  test(`sample ${file} classifies as ${risk}`, () => {
    const text = readFileSync(join(FIXTURES, file), 'utf8');
    assert.equal(scanText(text).risk, risk, file);
  });
}
