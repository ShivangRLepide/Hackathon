import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passesLuhn } from '../../src/lib/detection/detectors.ts';
import { scanText } from '../../src/lib/detection/scan.ts';

test('email: plausible address is Low and masked', () => {
  const result = scanText('Contact alex@example.test today.');
  assert.equal(result.risk, 'Low');
  assert.deepEqual(result.findings, [
    { type: 'email', risk: 'Low', count: 1, maskedExample: 'a***@example.test' },
  ]);
});

test('email: malformed address is ignored', () => {
  assert.equal(scanText('Malformed: alex@@example.test').risk, 'None');
});

test('uk phone: mobile in 0 and +44 forms is Medium', () => {
  const zero = scanText('Mobile: 07700 900123');
  assert.equal(zero.risk, 'Medium');
  assert.equal(zero.findings[0].maskedExample, '07******123');

  assert.equal(scanText('Mobile: +44 7700 900123').risk, 'Medium');
  assert.equal(scanText('Office: 020 7946 0123').risk, 'Medium');
});

test('uk phone: short digit run is ignored', () => {
  assert.equal(scanText('Fragment: 12345').risk, 'None');
});

test('uk phone: a number glued to a preceding letter is not matched', () => {
  assert.equal(scanText('Ref X07700900123').risk, 'None');
});

test('nino: permitted prefix in spaced, compact and lowercase forms is High', () => {
  const spaced = scanText('NINO: AB 12 34 56 C');
  assert.equal(spaced.risk, 'High');
  assert.equal(spaced.findings[0].maskedExample, 'AB******C');

  assert.equal(scanText('AB123456C').risk, 'High');
  assert.equal(scanText('ab 12 34 56 c').risk, 'High');
  assert.equal(scanText('AB123456').risk, 'High');
});

test('nino: disallowed prefixes and malformed suffixes are ignored', () => {
  assert.equal(scanText('QQ123456C').risk, 'None');
  assert.equal(scanText('BG123456C').risk, 'None');
  assert.equal(scanText('ZZ123456C').risk, 'None');
  assert.equal(scanText('AB123456E').risk, 'None');
  assert.equal(scanText('XAB123456C').risk, 'None');
});

test('card: Luhn-valid candidates are Critical and masked to last four digits', () => {
  const spaced = scanText('Card 4111 1111 1111 1111');
  assert.equal(spaced.risk, 'Critical');
  assert.equal(spaced.findings[0].maskedExample, '************1111');

  assert.equal(scanText('Card 4111-1111-1111-1111').risk, 'Critical');
});

test('card: Luhn failure and short candidates are ignored', () => {
  assert.equal(scanText('Card 4111 1111 1111 1112').risk, 'None');
  assert.equal(scanText('Too short: 4111 1111 1111').risk, 'None');
});

test('card: repeated non-overlapping occurrences are counted separately', () => {
  const result = scanText('First: 4111 1111 1111 1111. Second: 4111 1111 1111 1111.');
  assert.equal(result.risk, 'Critical');
  assert.equal(result.findings[0].count, 2);
});

test('classification: highest detected risk wins across detector types', () => {
  const result = scanText('alex@example.test AB123456C 07700 900123');
  assert.equal(result.risk, 'High');
  assert.deepEqual(
    result.findings.map((finding) => [finding.type, finding.risk, finding.count]),
    [
      ['uk_nino', 'High', 1],
      ['uk_phone', 'Medium', 1],
      ['email', 'Low', 1],
    ],
  );
});

test('classification: empty and clean text is None with no findings', () => {
  assert.deepEqual(scanText(''), { risk: 'None', findings: [] });
  assert.deepEqual(scanText('Meeting at noon.'), { risk: 'None', findings: [] });
});

test('output never contains raw matched values', () => {
  const raw = [
    'alex@example.test',
    '07700 900123',
    'AB123456C',
    '4111 1111 1111 1111',
    '4111111111111111',
  ];
  const text = `Contact ${raw[0]}, phone ${raw[1]}, NINO ${raw[2]}, card ${raw[3]}.`;
  const serialised = JSON.stringify(scanText(text));
  for (const value of raw) {
    assert.equal(serialised.includes(value), false);
  }
});

test('luhn: standard test vectors', () => {
  assert.equal(passesLuhn('4111111111111111'), true);
  assert.equal(passesLuhn('4111111111111112'), false);
  assert.equal(passesLuhn('79927398713'), true);
});
