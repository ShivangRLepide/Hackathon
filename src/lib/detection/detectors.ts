import type { RawMatch } from './types.ts';

type Check = (value: string) => Omit<RawMatch, 'start' | 'end'> | null;

const EMAIL_RE = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![A-Za-z0-9-]|\.[A-Za-z0-9-])/gi;
// UK mobile/geographic: 0 or +44 followed by 10 national digits, optional space or hyphen between digits.
const PHONE_RE = /(?<![\w+])(?:\+44[ -]?|0)\d(?:[ -]?\d){9}(?!\d)/g;
// Prefix excludes D,F,I,Q,U,V (first) and D,F,I,O,Q,U,V (second), plus BG,GB,KN,NK,NT,TN,ZZ.
const NINO_RE = /(?<![A-Za-z0-9])(?!(?:BG|GB|KN|NK|NT|TN|ZZ)\s?\d)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\s?\d{2}\s?\d{2}\s?\d{2}(?:\s?[A-D])?(?![A-Za-z0-9])/gi;
// 13 to 19 digits with optional single space or hyphen between digits; Luhn is checked separately.
const CARD_RE = /(?<!\d[ -]?)\d(?:[ -]?\d){12,18}(?![ -]?\d)/g;

function findAll(re: RegExp, text: string, check: Check): RawMatch[] {
  const matches: RawMatch[] = [];
  for (const m of text.matchAll(re)) {
    const info = check(m[0]);
    if (info) matches.push({ ...info, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return matches;
}

export function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function detectPaymentCards(text: string): RawMatch[] {
  return findAll(CARD_RE, text, (value) => {
    const digits = value.replace(/\D/g, '');
    if (!passesLuhn(digits)) return null;
    return {
      type: 'payment_card',
      risk: 'Critical',
      masked: `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`,
    };
  });
}

export function detectNationalInsurance(text: string): RawMatch[] {
  return findAll(NINO_RE, text, (value) => {
    const compact = value.replace(/\s/g, '').toUpperCase();
    const suffix = compact.length === 9 ? compact[8] : '';
    return { type: 'uk_nino', risk: 'High', masked: `${compact.slice(0, 2)}******${suffix}` };
  });
}

export function detectUkPhones(text: string): RawMatch[] {
  return findAll(PHONE_RE, text, (value) => {
    const digits = value.replace(/\D/g, '');
    const national = value.startsWith('+') ? `0${digits.slice(2)}` : digits;
    const kind = national[1];
    if (kind !== '7' && kind !== '1' && kind !== '2' && kind !== '3') return null;
    return {
      type: 'uk_phone',
      risk: 'Medium',
      masked: `${national.slice(0, 2)}${'*'.repeat(national.length - 5)}${national.slice(-3)}`,
    };
  });
}

export function detectEmails(text: string): RawMatch[] {
  return findAll(EMAIL_RE, text, (value) => ({
    type: 'email',
    risk: 'Low',
    masked: `${value[0]}***${value.slice(value.lastIndexOf('@'))}`,
  }));
}

// Ordered by risk, highest first, so overlaps resolve in favour of the higher risk.
export const DETECTORS: ReadonlyArray<(text: string) => RawMatch[]> = [
  detectPaymentCards,
  detectNationalInsurance,
  detectUkPhones,
  detectEmails,
];
