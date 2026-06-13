// UIE v1.2 — Phase 4.5 · Dedup.
// Deduplicates CanonicalTrade[] by externalId when present, otherwise by a
// composite key (symbol + entryDate + entry + positionSize + direction).
// Later occurrences merge non-empty fields into the first occurrence.

import type { CanonicalTrade } from '../canonical-trade';

export interface DedupResult {
  unique: CanonicalTrade[];
  duplicates: Array<{ keptIndex: number; droppedIndex: number; key: string }>;
}

function present(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  return true;
}

function keyOf(t: CanonicalTrade): string {
  const ext = t.externalId;
  if (typeof ext === 'string' && ext.trim()) return `ext:${ext.trim()}`;
  const parts = [
    String(t.symbol ?? '').toUpperCase().trim(),
    String(t.direction ?? '').trim(),
    String(t.entryDate ?? t.date ?? '').trim(),
    String(t.entry ?? ''),
    String(t.positionSize ?? ''),
  ];
  return `cmp:${parts.join('|')}`;
}

function merge(into: CanonicalTrade, from: CanonicalTrade): void {
  for (const k of Object.keys(from)) {
    if (!present(into[k]) && present(from[k])) into[k] = from[k];
  }
}

export function dedupTrades(trades: CanonicalTrade[]): DedupResult {
  const byKey = new Map<string, number>(); // key → index in unique
  const unique: CanonicalTrade[] = [];
  const duplicates: DedupResult['duplicates'] = [];

  trades.forEach((t, i) => {
    const k = keyOf(t);
    const existingIdx = byKey.get(k);
    if (existingIdx == null) {
      byKey.set(k, unique.length);
      unique.push({ ...t });
    } else {
      merge(unique[existingIdx], t);
      duplicates.push({ keptIndex: existingIdx, droppedIndex: i, key: k });
    }
  });

  return { unique, duplicates };
}
