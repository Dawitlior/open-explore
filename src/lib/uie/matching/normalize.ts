// Header normalization — 8 steps incl. camelCase split, Hebrew article (ה') strip,
// parenthesis removal, RTL-mark stripping. See master-plan §4.1 + calibration §3, §B.6.
import { NULL_TOKENS } from '../dictionary/canonical-fields';

const RTL_MARKS = /[\u200e\u200f\u202a-\u202e\ufeff\u00a0]/g;

export function normalizeHeader(raw: string, stripHe = false): string {
  if (raw == null) return '';
  let s = String(raw);
  s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');      // 1. camelCase: feeCoin -> fee Coin
  s = s.replace(RTL_MARKS, ' ');                      // 2. RTL / BOM / NBSP
  s = s.replace(/\(.*?\)/g, ' ');                     // 3. parenthesis content: (UTC+0)
  s = s.toLowerCase();                                // 4. lowercase (EN)
  s = s.replace(/["'״׳`]/g, '');                      // 5. quotes / gershayim
  s = s.replace(/[.,:;()\[\]{}\\?!*]/g, ' ');         // 6. punctuation -> space
  s = s.replace(/[\-_\/+]/g, ' ');                    // 7. separators -> space (keep +/- as tokens removed)
  s = s.replace(/\s+/g, ' ').trim();                  // collapse
  if (stripHe) {                                      // 8. Hebrew definite article on tokens >2
    s = s.split(' ').map(t =>
      (t.length > 2 && t[0] === 'ה' && /^[\u0590-\u05FF]+$/.test(t)) ? t.slice(1) : t
    ).join(' ');
  }
  return s;
}

// produce both variants (with/without ה'-strip); matcher takes the higher score
export function headerVariants(raw: string): string[] {
  const a = normalizeHeader(raw, false);
  const b = normalizeHeader(raw, true);
  return a === b ? [a] : [a, b];
}

export function isNullToken(v: any): boolean {
  if (v == null) return true;
  const s = String(v).replace(RTL_MARKS, '').trim().toLowerCase();
  return NULL_TOKENS.indexOf(s) >= 0;
}

export function cleanCell(v: any): string {
  if (v == null) return '';
  return String(v).replace(RTL_MARKS, ' ').replace(/\s+/g, ' ').trim();
}
