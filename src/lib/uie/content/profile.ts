// UIE v1.2 — Phase 2 · Step 1 · Content Profiler
// Per-column statistical profile. Sample up to 200 non-empty values.
// Detects: numeric · date · enum · currency · percent · r-multiple · string · mixed.
// Used to LOCK Phase-1 `pending-content` matches (rMultiple/riskAmount/riskPct/returnPct).
//
// Zero dependency. Pure functions. Evidence-based — never guesses.

import { detectDateFormat } from '../matching/date-detect';

export type ContentType =
  | 'numeric'
  | 'date'
  | 'enum'
  | 'currency'
  | 'percent'
  | 'r-multiple'
  | 'string'
  | 'empty'
  | 'mixed';

export interface ContentProfile {
  type: ContentType;
  confidence: number;          // 0..1
  sampleValues: string[];      // up to 5
  flags: string[];             // 'has_currency_symbol', 'has_percent_suffix', 'has_r_suffix', 'european_decimal', 'date_conflict', 'date_ambiguous'
  numericMeta?: {
    min: number;
    max: number;
    hasNegative: boolean;
    likelyBoundedZeroOne: boolean;   // values all in [0,1]
    likelyRMultipleRange: boolean;   // |max| ≤ 20 and at least one |x|>1
  };
  enumMeta?: {
    values: string[];                // distinct values (lowercased)
    isDirection: boolean;            // long/short/buy/sell + HE equivalents
  };
}

const NULL_TOKENS = new Set(['', '-', '—', '–', 'ー', 'n/a', 'na', 'null', 'none', '#n/a']);
const CURRENCY_SYMBOLS = /[$€₪¥£₣₩₽]/;
const CURRENCY_ISO = /\b(usd|eur|ils|gbp|jpy|cny|chf|aud|cad|nzd)\b/i;
const PERCENT_SUFFIX = /%\s*$/;
const R_SUFFIX = /\b[rR]\b\s*$|\d+\s*[rR]\s*$/;
const X_SUFFIX = /\d+\s*[xX]\s*$/;

const DIRECTION_TOKENS = new Set([
  'long', 'short', 'buy', 'sell', 'l', 's',
  'לונג', 'שורט', 'קנייה', 'מכירה',
]);

const SAMPLE_LIMIT = 200;
const PREVIEW_LIMIT = 5;

function isNullToken(s: string): boolean {
  return NULL_TOKENS.has(s.trim().toLowerCase());
}

function stripCurrency(s: string): string {
  return s.replace(CURRENCY_SYMBOLS, '').replace(CURRENCY_ISO, '').trim();
}

function tryParseNumber(raw: string): { ok: true; value: number; european: boolean } | { ok: false } {
  let s = raw.trim();
  if (!s) return { ok: false };

  // strip parenthetical negatives: (123.45) → -123.45
  let isNeg = false;
  if (/^\(.*\)$/.test(s)) {
    isNeg = true;
    s = s.slice(1, -1).trim();
  }

  s = stripCurrency(s);
  s = s.replace(PERCENT_SUFFIX, '').trim();
  s = s.replace(/\s+/g, '');

  // European: "1.234,56" → "1234.56"
  let european = false;
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // last separator wins as decimal
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      european = true;
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Could be either "1,234" (thousands) or "1,5" (decimal). If exactly one comma
    // followed by 1-2 digits → decimal.
    const m = s.match(/^-?\d+,(\d{1,2})$/);
    if (m) {
      european = true;
      s = s.replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, value: isNeg ? -n : n, european };
}

function isDateLike(raw: string): boolean {
  // YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, with optional time
  return /^\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/.test(raw.trim());
}

export function profileColumn(rawValues: unknown[], headerHint?: string): ContentProfile {
  const samples: string[] = [];
  for (const v of rawValues) {
    if (samples.length >= SAMPLE_LIMIT) break;
    if (v == null) continue;
    const s = String(v);
    if (!s.trim() || isNullToken(s)) continue;
    samples.push(s);
  }

  if (samples.length === 0) {
    return { type: 'empty', confidence: 1, sampleValues: [], flags: [] };
  }

  const preview = samples.slice(0, PREVIEW_LIMIT);
  const flags = new Set<string>();
  const header = (headerHint ?? '').toLowerCase();

  // ── date ────────────────────────────────────────────────────────────────
  const dateHits = samples.filter(isDateLike).length;
  if (dateHits / samples.length >= 0.8) {
    const det = detectDateFormat(samples);
    if (det.flag) flags.add(det.flag);
    return {
      type: 'date',
      confidence: dateHits / samples.length,
      sampleValues: preview,
      flags: Array.from(flags),
    };
  }

  // ── numeric family ──────────────────────────────────────────────────────
  const numHits: number[] = [];
  let currencyHits = 0;
  let percentHits = 0;
  let rHits = 0;
  let europeanHits = 0;

  for (const s of samples) {
    if (CURRENCY_SYMBOLS.test(s) || CURRENCY_ISO.test(s)) currencyHits++;
    if (PERCENT_SUFFIX.test(s)) percentHits++;
    if (R_SUFFIX.test(s) || X_SUFFIX.test(s)) rHits++;
    const parsed = tryParseNumber(s);
    if (parsed.ok) {
      numHits.push(parsed.value);
      if (parsed.european) europeanHits++;
    }
  }

  const numericRatio = numHits.length / samples.length;
  const isMostlyNumeric = numericRatio >= 0.8;

  if (isMostlyNumeric) {
    if (currencyHits > 0) flags.add('has_currency_symbol');
    if (percentHits > 0) flags.add('has_percent_suffix');
    if (rHits > 0) flags.add('has_r_suffix');
    if (europeanHits > 0) flags.add('european_decimal');

    const min = Math.min(...numHits);
    const max = Math.max(...numHits);
    const hasNegative = numHits.some((n) => n < 0);
    const likelyBoundedZeroOne = numHits.every((n) => n >= 0 && n <= 1);
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    const likelyRMultipleRange = absMax <= 20 && numHits.some((n) => Math.abs(n) > 0.1);

    // Currency wins if symbol present.
    if (currencyHits / samples.length >= 0.3) {
      return {
        type: 'currency', confidence: 0.9, sampleValues: preview,
        flags: Array.from(flags),
        numericMeta: { min, max, hasNegative, likelyBoundedZeroOne, likelyRMultipleRange },
      };
    }

    // Percent: explicit suffix OR header says % AND values bounded 0..1 (or 0..100 with header hint)
    const headerSaysPercent = /\b(pct|percent|%|אחוז|תשואה)\b/.test(header);
    if (percentHits / samples.length >= 0.5 || (headerSaysPercent && (likelyBoundedZeroOne || max <= 100))) {
      flags.add('has_percent_suffix');
      return {
        type: 'percent', confidence: 0.85, sampleValues: preview,
        flags: Array.from(flags),
        numericMeta: { min, max, hasNegative, likelyBoundedZeroOne, likelyRMultipleRange },
      };
    }

    // R-multiple: suffix R/x OR header says r/risk multiple AND value range tight
    const headerSaysR = /\b(r\s*multiple|r\s*value|מכפיל)\b/.test(header) || /^r$/i.test(header.trim());
    if (rHits / samples.length >= 0.3 || (headerSaysR && likelyRMultipleRange)) {
      return {
        type: 'r-multiple', confidence: 0.85, sampleValues: preview,
        flags: Array.from(flags),
        numericMeta: { min, max, hasNegative, likelyBoundedZeroOne, likelyRMultipleRange },
      };
    }

    return {
      type: 'numeric', confidence: numericRatio, sampleValues: preview,
      flags: Array.from(flags),
      numericMeta: { min, max, hasNegative, likelyBoundedZeroOne, likelyRMultipleRange },
    };
  }

  // ── enum / direction ────────────────────────────────────────────────────
  const distinct = new Set(samples.map((s) => s.trim().toLowerCase()));
  if (distinct.size > 0 && distinct.size <= Math.max(8, samples.length * 0.1)) {
    const values = Array.from(distinct);
    const isDirection = values.every((v) => DIRECTION_TOKENS.has(v));
    return {
      type: 'enum',
      confidence: isDirection ? 0.95 : 0.7,
      sampleValues: preview,
      flags: Array.from(flags),
      enumMeta: { values, isDirection },
    };
  }

  // ── mixed if some numeric ──
  if (numericRatio > 0 && numericRatio < 0.8) {
    flags.add('mixed_content');
    return { type: 'mixed', confidence: 0.5, sampleValues: preview, flags: Array.from(flags) };
  }

  return { type: 'string', confidence: 0.8, sampleValues: preview, flags: Array.from(flags) };
}

/**
 * Phase-2 contract: given a Phase-1 match flagged `pending-content`, return
 * whether the column's content profile CONFIRMS the proposed canonical field.
 */
export function confirmsPendingField(
  field: 'rMultiple' | 'riskAmount' | 'riskPct' | 'returnPct',
  profile: ContentProfile,
): boolean {
  switch (field) {
    case 'rMultiple':
      return profile.type === 'r-multiple' ||
        (profile.type === 'numeric' && !!profile.numericMeta?.likelyRMultipleRange);
    case 'riskPct':
    case 'returnPct':
      return profile.type === 'percent' ||
        (profile.type === 'numeric' && !!profile.numericMeta?.likelyBoundedZeroOne);
    case 'riskAmount':
      return profile.type === 'currency' || profile.type === 'numeric';
    default:
      return false;
  }
}
