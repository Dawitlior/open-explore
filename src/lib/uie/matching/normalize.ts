// UIE v1.2 — Phase 1 · 8-step header normalization
// Steps (master plan §5.1):
//   1. lower
//   2. trim
//   3. NFD decompose
//   4. strip RTL marks + combining diacritics
//   5. split camelCase   (?<=[a-z])(?=[A-Z])
//   6. strip parenthetical content    "Open (UTC+0)" → "Open"
//   7. strip Hebrew definite-article "ה" on tokens longer than 2 chars
//      (compare both original and stripped, keep the higher-scoring later)
//   8. expanded null-tokens collapse to ''

const RTL_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C]/g;
const COMBINING = /[\u0300-\u036f]/g;
const NULL_TOKENS = new Set(['', '-', '—', '–', 'ー', 'n/a', 'na', 'null', 'none']);

export interface NormalizedHeader {
  raw: string;
  primary: string;        // normalised "main" form
  variants: string[];     // additional forms to try (e.g. without ה)
  tokens: string[];
}

function stripHebrewArticle(s: string): string {
  return s
    .split(/\s+/)
    .map((tok) => (tok.length > 3 && tok.startsWith('ה') ? tok.slice(1) : tok))
    .join(' ');
}

export function normalizeHeader(raw: string): NormalizedHeader {
  if (raw == null) return { raw: '', primary: '', variants: [], tokens: [] };
  let s = String(raw);

  // 1-2 lower + trim
  s = s.trim().toLowerCase();
  // 3-4 NFD + strip RTL + diacritics
  s = s.normalize('NFD').replace(RTL_MARKS, '').replace(COMBINING, '');
  // 5 camelCase split (run before lower would have lost case — apply on raw too)
  const camelSplit = String(raw)
    .normalize('NFD')
    .replace(RTL_MARKS, '')
    .replace(COMBINING, '')
    .replace(/(?<=[a-z])(?=[A-Z])/g, ' ')
    .toLowerCase()
    .trim();
  s = camelSplit || s;
  // 6 strip parenthetical content
  s = s.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');
  // collapse whitespace + punctuation to single spaces
  s = s.replace(/[._/\\\-]+/g, ' ').replace(/\s+/g, ' ').trim();

  // 8 null tokens
  if (NULL_TOKENS.has(s)) return { raw, primary: '', variants: [], tokens: [] };

  // 7 hebrew article variant
  const withoutHe = stripHebrewArticle(s);
  const variants = withoutHe !== s ? [withoutHe] : [];

  const tokens = s.split(' ').filter((t) => t && !NULL_TOKENS.has(t));
  return { raw, primary: s, variants, tokens };
}

export function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}
