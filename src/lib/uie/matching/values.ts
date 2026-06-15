// Value normalization: numbers, dates (evidential, no language default), symbols,
// directions, durations. See master-plan §9, calibration §5.2 + §B.6.
import { DateDecision } from '../types';
import { isNullToken, cleanCell } from './normalize';
import { DIRECTION_VALUES } from '../dictionary/canonical-fields';

// ── numbers ──────────────────────────────────────────────
export function parseNumber(raw: any): number | null {
  if (isNullToken(raw)) return null;
  let s = cleanCell(raw);
  let neg = false;
  s = s.replace(/[\u2212]/g, '-');                    // unicode minus
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }   // (123) accounting
  if (/-\s*$/.test(s)) { neg = true; s = s.replace(/-\s*$/, ''); } // trailing minus (RTL reports)
  s = s.replace(/[₪$€£%]/g, '').replace(/[a-zA-Zא-ת"׳']/g, '').trim();
  // decide thousand/decimal: european 1.234,56 vs 1,234.56
  const hasComma = s.indexOf(',') >= 0, hasDot = s.indexOf('.') >= 0;
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.'); // european
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length !== 3) s = s.replace(',', '.'); // 12,5 -> decimal
    else s = s.replace(/,/g, '');                    // thousands
  }
  s = s.replace(/\s/g, '');
  if (s === '' || s === '-' || s === '.') return null;
  const n = Number(s);
  if (!isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}

export function looksNumeric(raw: any): boolean { return parseNumber(raw) !== null; }

// ── dates ────────────────────────────────────────────────
const ISO_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/;
const TIME_FIRST_RE = /^\d{1,2}:\d{2}(:\d{2})?\s+\d{4}-\d{2}-\d{2}/;     // Bybit: HH:MM YYYY-MM-DD
const SLASH_RE = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})([ T]\d{1,2}:\d{2}(:\d{2})?)?$/;
const TIMEONLY_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

export function decideDateFormat(values: string[]): DateDecision {
  const v = values.map(cleanCell).filter(x => !isNullToken(x));
  if (!v.length) return { fmt: 'UNKNOWN', ambiguous: true, conflict: false };
  let iso = 0, timeFirst = 0, excel = 0, slash = 0, firstGt12 = false, secondGt12 = false;
  for (const x of v) {
    if (TIME_FIRST_RE.test(x)) { timeFirst++; continue; }
    if (ISO_RE.test(x)) { iso++; continue; }
    const m = x.match(SLASH_RE);
    if (m) { slash++; const a = +m[1], b = +m[2]; if (a > 12) firstGt12 = true; if (b > 12) secondGt12 = true; continue; }
    const n = Number(x); if (isFinite(n) && n >= 25569 && n <= 80000) excel++;
  }
  const top = Math.max(iso, timeFirst, excel, slash);
  if (top === 0) return { fmt: 'UNKNOWN', ambiguous: true, conflict: false };
  if (timeFirst === top) return { fmt: 'TIME_FIRST', ambiguous: false, conflict: false };
  if (iso === top) return { fmt: 'ISO', ambiguous: false, conflict: false };
  if (excel === top) return { fmt: 'EXCEL', ambiguous: false, conflict: false };
  // slash: evidential — NO language default (calibration #36)
  if (firstGt12 && secondGt12) return { fmt: 'DMY', ambiguous: true, conflict: true }; // contradictory column
  if (firstGt12) return { fmt: 'DMY', ambiguous: false, conflict: false };
  if (secondGt12) return { fmt: 'MDY', ambiguous: false, conflict: false };
  return { fmt: 'DMY', ambiguous: true, conflict: false };   // undecidable -> flag, provisional DMY
}

export function parseDate(raw: any, dec: DateDecision): string | null {
  if (isNullToken(raw)) return null;
  const s = cleanCell(raw);
  let Y = 0, Mo = 0, D = 0, h = 0, mi = 0, se = 0;
  if (dec.fmt === 'TIME_FIRST') {
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null; h = +m[1]; mi = +m[2]; se = +(m[3]||0); Y = +m[4]; Mo = +m[5]; D = +m[6];
  } else if (dec.fmt === 'ISO') {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null; Y = +m[1]; Mo = +m[2]; D = +m[3]; h = +(m[4]||0); mi = +(m[5]||0); se = +(m[6]||0);
  } else if (dec.fmt === 'EXCEL') {
    const n = Number(s); if (!isFinite(n)) return null;
    const ms = Math.round((n - 25569) * 86400 * 1000); const d = new Date(ms);
    return d.toISOString();
  } else { // DMY or MDY
    const m = s.match(SLASH_RE); if (!m) return null;
    const a = +m[1], b = +m[2]; let yy = +m[3];
    if (yy < 100) yy += 2000;
    if (dec.fmt === 'MDY') { Mo = a; D = b; } else { D = a; Mo = b; }
    Y = yy;
    const t = m[4]; if (t) { const tm = t.trim().match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/); if (tm) { h = +tm[1]; mi = +tm[2]; se = +(tm[3]||0); } }
  }
  if (!Y || !Mo || !D) return null;
  const dt = new Date(Date.UTC(Y, Mo - 1, D, h, mi, se));
  if (isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export const isTimeOnly = (raw: any) => TIMEONLY_RE.test(cleanCell(raw));

// ── direction ────────────────────────────────────────────
export function normalizeDirection(raw: any): 'long' | 'short' | null {
  const s = cleanCell(raw).toLowerCase();
  if (DIRECTION_VALUES.long.indexOf(s) >= 0) return 'long';
  if (DIRECTION_VALUES.short.indexOf(s) >= 0) return 'short';
  return null;
}

// ── symbol ───────────────────────────────────────────────
const QUOTES = ['USDT','USDC','BUSD','USD','ILS','EUR','BTC','ETH'];
export function normalizeSymbol(raw: any): string {
  let s = cleanCell(raw);
  if (/^[\u0590-\u05FF]/.test(s)) return s;             // Hebrew name — keep as-is
  s = s.toUpperCase().replace(/[._\-\/]/g, '').replace(/\.P$|PERP$/, '');
  for (const q of QUOTES) {
    if (s.length > q.length && s.endsWith(q)) return s.slice(0, -q.length) + '/' + q;
  }
  return s;
}

// ── duration "0D 1H 10M" or "2:35" ──────────────────────
export function parseDuration(raw: any): number | null { // returns minutes
  const s = cleanCell(raw);
  let m = s.match(/(\d+)\s*D/i); let d = m ? +m[1] : 0;
  let hm = s.match(/(\d+)\s*H/i); let h = hm ? +hm[1] : 0;
  let mm = s.match(/(\d+)\s*M/i); let mn = mm ? +mm[1] : 0;
  if (d || h || mn) return d * 1440 + h * 60 + mn;
  const c = s.match(/^(\d+):(\d{2})$/); if (c) return +c[1] * 60 + +c[2];
  return null;
}
