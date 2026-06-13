// UIE v1.2 — Phase 1 · Per-column, evidence-based date format detection.
// NO LANGUAGE DEFAULT. NEVER GUESSES.
//   firstGt12  → some row has component[0] > 12  → component[0] cannot be month
//   secondGt12 → some row has component[1] > 12  → component[1] cannot be month
// Rules:
//   firstGt12 && !secondGt12  → DD/MM (green)
//   secondGt12 && !firstGt12  → MM/DD (green)
//   firstGt12 && secondGt12   → 🟡 date_conflict   (mixed/corrupt column)
//   neither                    → 🟡 date_ambiguous  (return both candidates)

export type DateFormat = 'DD/MM' | 'MM/DD' | 'AMBIGUOUS' | 'CONFLICT' | 'EMPTY';

export interface DateDetectResult {
  format: DateFormat;
  flag?: 'date_conflict' | 'date_ambiguous';
  candidates?: Array<'DD/MM' | 'MM/DD'>;
  samples: { firstGt12: string[]; secondGt12: string[] };
}

const SPLIT = /[\/\-.]/;

function readPair(raw: unknown): [number, number] | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // grab the first two numeric components separated by / - or .
  const parts = s.split(SPLIT).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 1 || b < 1 || a > 31 || b > 31) return null;
  return [a, b];
}

export function detectDateFormat(columnValues: unknown[]): DateDetectResult {
  const firstSamples: string[] = [];
  const secondSamples: string[] = [];
  let firstGt12 = false;
  let secondGt12 = false;

  for (const v of columnValues) {
    const pair = readPair(v);
    if (!pair) continue;
    const [a, b] = pair;
    if (a > 12) { firstGt12 = true; if (firstSamples.length < 3) firstSamples.push(String(v)); }
    if (b > 12) { secondGt12 = true; if (secondSamples.length < 3) secondSamples.push(String(v)); }
  }

  const samples = { firstGt12: firstSamples, secondGt12: secondSamples };

  if (firstGt12 && secondGt12) {
    return { format: 'CONFLICT', flag: 'date_conflict', samples };
  }
  if (firstGt12) return { format: 'DD/MM', samples };
  if (secondGt12) return { format: 'MM/DD', samples };

  // no evidence either way
  if (firstSamples.length === 0 && secondSamples.length === 0 && columnValues.every((v) => v == null || String(v).trim() === '')) {
    return { format: 'EMPTY', samples };
  }
  return {
    format: 'AMBIGUOUS',
    flag: 'date_ambiguous',
    candidates: ['DD/MM', 'MM/DD'],
    samples,
  };
}
