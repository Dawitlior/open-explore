// UIE v1.2 — Phase 4.5 · Notes Overflow.
// Any non-canonical fields the importer carried along are folded into the
// CanonicalTrade.comments string so nothing is lost when the adapter (D1)
// later writes a NormalizedTrade.

import type { CanonicalTrade, CanonicalField } from '../canonical-trade';

const CANONICAL_KEYS: Set<string> = new Set<CanonicalField>([
  'date','time','symbol','direction','orderType','entry','exit','stopLoss',
  'takeProfit','positionSize','pnl','fees','leverage','balance','comments',
  'rowIndex','entryDate','exitDate','durationStr','avgEntry','avgExit',
  'maxOpenSize','realizedPnl','unrealizedPnl','feeOpen','feeClose','feeTotal',
  'fundingFee','rMultiple','riskAmount','riskPct','returnPct','mfe','mae',
  'status','liquidated','externalId',
]);

export interface OverflowOptions {
  maxLen?: number; // hard cap on comments length (default 1000)
  separator?: string;
}

export function foldOverflowIntoComments(
  t: CanonicalTrade,
  opts: OverflowOptions = {},
): CanonicalTrade {
  const maxLen = opts.maxLen ?? 1000;
  const sep = opts.separator ?? ' · ';
  const extras: string[] = [];

  for (const k of Object.keys(t)) {
    if (CANONICAL_KEYS.has(k)) continue;
    const v = t[k];
    if (v == null) continue;
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (!s || !s.trim()) continue;
    extras.push(`${k}=${s}`);
  }

  if (extras.length === 0) return t;
  const existing = typeof t.comments === 'string' ? t.comments.trim() : '';
  const joined = extras.join(sep);
  const merged = existing ? `${existing}${sep}${joined}` : joined;
  const capped = merged.length > maxLen ? `${merged.slice(0, maxLen - 1)}…` : merged;

  const out: CanonicalTrade = { ...t, comments: capped };
  for (const k of Object.keys(t)) if (!CANONICAL_KEYS.has(k)) delete out[k];
  return out;
}

export function foldOverflowBatch(
  trades: CanonicalTrade[],
  opts?: OverflowOptions,
): CanonicalTrade[] {
  return trades.map((t) => foldOverflowIntoComments(t, opts));
}
