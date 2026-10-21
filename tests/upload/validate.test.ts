import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUpload, MAX_UPLOAD_BYTES, precheckUpload } from '../../src/lib/upload/validate.ts';

const ADDITIONAL = fileURLToPath(new URL('../fixtures/additional/', import.meta.url));
const encode = (text: string) => new TextEncoder().encode(text);

test('accepts a small CSV and a small TXT file', () => {
  const csv = checkUpload('people.csv', encode('name,email\nA,a@example.test\n'));
  assert.equal(csv.ok, true);
  if (csv.ok) assert.equal(csv.fileType, 'csv');

  const txt = checkUpload('notes.txt', encode('hello'));
  assert.equal(txt.ok, true);
  if (txt.ok) assert.equal(txt.fileType, 'txt');
});

test('accepts upper-case extensions', () => {
  assert.equal(checkUpload('DATA.CSV', encode('a')).ok, true);
});

test('accepts a file of exactly 1 MiB and rejects one byte more', () => {
  assert.equal(checkUpload('max.txt', new Uint8Array(MAX_UPLOAD_BYTES).fill(0x61)).ok, true);
  assert.deepEqual(checkUpload('over.txt', new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(0x61)), {
    ok: false,
    reason: 'oversized',
  });
});

test('rejects an empty file', () => {
  assert.deepEqual(checkUpload('empty.txt', new Uint8Array(0)), { ok: false, reason: 'empty' });
});

test('rejects files without a CSV or TXT extension', () => {
  assert.deepEqual(checkUpload('data.json', encode('{}')), { ok: false, reason: 'unsupported_type' });
  assert.deepEqual(checkUpload('csv', encode('a')), { ok: false, reason: 'unsupported_type' });
  assert.deepEqual(checkUpload('report.csv.exe', encode('a')), { ok: false, reason: 'unsupported_type' });
});

test('rejects binary content with a NUL byte even when the extension is allowed', () => {
  assert.deepEqual(checkUpload('image.txt', new Uint8Array([0x61, 0x00, 0x62])), {
    ok: false,
    reason: 'binary',
  });
});

test('rejects bytes that are not valid UTF-8', () => {
  assert.deepEqual(checkUpload('latin.txt', new Uint8Array([0x63, 0xff, 0xfe])), {
    ok: false,
    reason: 'invalid_utf8',
  });
});

test('fixtures 28 to 30 are rejected as the expected results require', () => {
  const empty = checkUpload('28_empty.txt', readFileSync(join(ADDITIONAL, '28_empty.txt')));
  const unsupported = checkUpload('29_unsupported.json', readFileSync(join(ADDITIONAL, '29_unsupported.json')));
  const oversized = checkUpload('30_oversized.txt', readFileSync(join(ADDITIONAL, '30_oversized.txt')));
  assert.deepEqual(empty, { ok: false, reason: 'empty' });
  assert.deepEqual(unsupported, { ok: false, reason: 'unsupported_type' });
  assert.deepEqual(oversized, { ok: false, reason: 'oversized' });
});

test('precheckUpload passes a small CSV or TXT file without reading its content', () => {
  assert.equal(precheckUpload('people.csv', 120), null);
  assert.equal(precheckUpload('DATA.CSV', 3), null);
  assert.equal(precheckUpload('notes.txt', MAX_UPLOAD_BYTES), null);
});

test('precheckUpload rejects an empty file, an oversized file and an unsupported extension', () => {
  assert.equal(precheckUpload('empty.txt', 0), 'empty');
  assert.equal(precheckUpload('big.txt', MAX_UPLOAD_BYTES + 1), 'oversized');
  assert.equal(precheckUpload('data.json', 5), 'unsupported_type');
  assert.equal(precheckUpload('csv', 5), 'unsupported_type');
});
