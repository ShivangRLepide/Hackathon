import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passesLuhn } from '../../src/lib/detection/detectors.ts';
import { scanText } from '../../src/lib/detection/scan.ts';

// Characterisation only: these record current behaviour pending a human decision. They do not endorse it.

function withLuhnCheckDigit(base: string): string {
  for (let d = 0; d <= 9; d++) {
    if (passesLuhn(base + d)) return base + d;
  }
  throw new Error('no check digit found');
}

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomDigits(rand: () => number, length: number): string {
  let out = String(1 + Math.floor(rand() * 9));
  for (let i = 1; i < length; i++) out += String(Math.floor(rand() * 10));
  return out;
}

// Fixed seed so the 200-string sample is identical on every run.
const rand = lcg(20261021);
const EPOCH_LIKE = Array.from({ length: 100 }, () => `1${5 + Math.floor(rand() * 4)}${randomDigits(rand, 11)}`);
const ORDER_LIKE = Array.from({ length: 100 }, (_, i) => randomDigits(rand, 13 + (i % 7)));

// Observed counts from the first run of this file; see WORK_LOG.md.
const PINNED_EPOCH_CRITICAL = 11;
const PINNED_ORDER_CRITICAL = 9;

test('DECISION PENDING: 13-digit Luhn-valid timestamp-shaped number is classified Critical', () => {
  const timestamp = withLuhnCheckDigit('175000000000');
  assert.equal(timestamp.length, 13);
  assert.equal(passesLuhn(timestamp), true);

  const result = scanText(`Created ${timestamp}`);
  assert.equal(result.risk, 'Critical');
  assert.equal(result.findings[0].type, 'payment_card');
});

test('DECISION PENDING: 16-digit Luhn-valid order-ID-shaped number is classified Critical', () => {
  const orderId = withLuhnCheckDigit('120034567890123');
  assert.equal(orderId.length, 16);
  assert.equal(passesLuhn(orderId), true);

  const result = scanText(`Order ${orderId}`);
  assert.equal(result.risk, 'Critical');
  assert.equal(result.findings[0].type, 'payment_card');
});

test('DECISION PENDING: fixed 200-string non-card digit sample count classified Critical is pinned', () => {
  assert.equal(EPOCH_LIKE.length + ORDER_LIKE.length, 200);
  for (const value of [...EPOCH_LIKE, ...ORDER_LIKE]) {
    assert.match(value, /^\d{13,19}$/);
  }

  const epochCritical = EPOCH_LIKE.filter((value) => scanText(value).risk === 'Critical').length;
  const orderCritical = ORDER_LIKE.filter((value) => scanText(value).risk === 'Critical').length;

  assert.equal(epochCritical, PINNED_EPOCH_CRITICAL, 'epoch-like Critical count');
  assert.equal(orderCritical, PINNED_ORDER_CRITICAL, 'order-like Critical count');
});

test('DECISION PENDING: NINO without suffix is classified High', () => {
  const result = scanText('Ref AB123456');
  assert.equal(result.risk, 'High');
  assert.equal(result.findings[0].type, 'uk_nino');
  assert.equal(result.findings[0].maskedExample, 'AB******');
});

test('DECISION PENDING: 11-digit number starting 01, 02 or 03 with no phone context is classified Medium', () => {
  for (const value of ['01234567890', '02012345678', '03001234567']) {
    const result = scanText(`Code ${value}`);
    assert.equal(result.risk, 'Medium', value);
    assert.equal(result.findings[0].type, 'uk_phone', value);
  }
});
