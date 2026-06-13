// UIE v1.2 — Phase 2 · Step 2 · Value Normalizer
// Converts raw cell values → canonical primitives based on detected ContentType.
// Pure functions, zero dependencies. Uses detectDateFormat result for dates.

import { detectDateFormat, type DateFormat } from '../matching/date-detect';

const NULL_TOKENS = new Set(['', '-', '—', '–', 'ー', 'n/a', 'na', 'null', 'none', '#n/a']);
const CURRENCY_SYMBOLS = /[$€₪¥£₣₩₽]/g;
const CURRENCY_ISO = /\b(usd|eur|ils|gbp|jpy|cny|chf|aud|cad|nzd)\b/gi;

const DIRECTION_MAP: Record<string, 'Long' | 'Short'> = {
  long: 'Long', l: 'Long', buy: 'Long', לונג: 'Long', קנייה: 'Long',
  short: 'Short', s: 'Short', sell: 'Short', שורט: 'Short', מכירה: 'Short',
};

export function isNull(raw: unknown): boolean {
  if (raw == null) return true;
  const s = String(raw).trim().toLowerCase();
  return NULL_TOKENS.has(s);
}

export function normalizeNumber(raw: unknown): number | null {
  if (isNull(raw)) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (!s) return null;

  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }

  s = s.replace(CURRENCY_SYMBOLS, '').replace(CURRENCY_ISO, '').trim();
  s = s.replace(/%\s*$/, '').trim();
  s = s.replace(/\s*[rRxX]\s*$/, '').trim();
  s = s.replace(/\s+/g, '');

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function normalizePercent(raw: unknown): number | null {
  const n = normalizeNumber(raw);
  if (n == null) return null;
  // "12.5%" → 12.5  (preserve as percent number; consumers decide /100)
  return n;
}

export function normalizeRMultiple(raw: unknown): number | null {
  return normalizeNumber(raw);
}

export function normalizeDirection(raw: unknown): 'Long' | 'Short' | null {
  if (isNull(raw)) return null;
  const s = String(raw).trim().toLowerCase();
  return DIRECTION_MAP[s] ?? null;
}

/** Format a parsed date as "YYYY-MM-DD HH:mm" (local). */
function fmt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Excel serial → Date. */
function excelSerialToDate(n: number): Date | null {
  if (!(n > 1 && n < 200000)) return null;
  const epoch = new Date(1899, 11, 30);
  const days = Math.floor(n);
  const frac = n - days;
  return new Date(epoch.getTime() + days * 86400000 + Math.round(frac * 86400000));
}

/**
 * Normalize a date value given a known column format.
 * `format` should come from `detectDateFormat` for the column.
 * Returns "YYYY-MM-DD HH:mm" or null.
 */
export function normalizeDate(raw: unknown, format: DateFormat): string | null {
  if (isNull(raw)) return null;
  if (typeof raw === 'number') {
    const d = excelSerialToDate(raw);
    return d && !isNaN(d.getTime()) ? fmt(d) : null;
  }
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : fmt(raw);

  const s = String(raw).trim();
  if (!s) return null;

  // ISO YYYY-MM-DD[ T]HH:mm
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0));
    return isNaN(d.getTime()) ? null : fmt(d);
  }

  // Two-component slash/dash form
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (m) {
    const a = +m[1], b = +m[2]; let y = +m[3];
    if (y < 100) y += 2000;
    let day: number, month: number;
    if (format === 'DD/MM') { day = a; month = b; }
    else if (format === 'MM/DD') { month = a; day = b; }
    else {
      // AMBIGUOUS / CONFLICT / EMPTY → evidence-based fallback per row:
      // if first>12 must be DD; if second>12 must be MM; else default DD/MM (no language assumption violated since both valid).
      if (a > 12 && b <= 12) { day = a; month = b; }
      else if (b > 12 && a <= 12) { month = a; day = b; }
      else { day = a; month = b; }
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(y, month - 1, day, +(m[4] || 0), +(m[5] || 0));
    return isNaN(d.getTime()) ? null : fmt(d);
  }

  const fb = new Date(s);
  if (!isNaN(fb.getTime())) return fmt(fb);
  return null;
}

/** Normalize a full column of raw date strings using one detection pass. */
export function normalizeDateColumn(values: unknown[]): {
  format: DateFormat;
  flag?: 'date_conflict' | 'date_ambiguous';
  values: (string | null)[];
} {
  const det = detectDateFormat(values);
  const normalized = values.map((v) => normalizeDate(v, det.format));
  return { format: det.format, flag: det.flag, values: normalized };
}
