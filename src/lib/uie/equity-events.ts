// UIE v1.2 — Phase 4 · Step 2 · Equity events pipeline.
// Aggregates EquityEvent[] into a chronological ledger and provides helpers
// to compute running balance changes from non-trade events.

import type { EquityEvent, EquityEventKind } from './archetypes/archetype-d';

export interface EquityLedgerEntry extends EquityEvent {
  cumulativeDelta: number;
}

const POSITIVE: EquityEventKind[] = ['deposit', 'interest', 'dividend', 'rebate', 'transfer'];
const NEGATIVE: EquityEventKind[] = ['withdrawal', 'fee', 'funding'];

function signedAmount(e: EquityEvent): number {
  const a = e.amount;
  if (a == null || !Number.isFinite(a)) return 0;
  const abs = Math.abs(a);
  if (POSITIVE.includes(e.kind)) return abs;
  if (NEGATIVE.includes(e.kind)) return -abs;
  // adjustment / unknown — trust sign as-is
  return a;
}

export function buildLedger(events: EquityEvent[]): EquityLedgerEntry[] {
  const sorted = [...events].sort((a, b) => {
    const at = a.date ? Date.parse(a.date.replace(' ', 'T')) : 0;
    const bt = b.date ? Date.parse(b.date.replace(' ', 'T')) : 0;
    return at - bt;
  });
  let cum = 0;
  return sorted.map((e) => {
    cum += signedAmount(e);
    return { ...e, cumulativeDelta: cum };
  });
}

export function summarizeByKind(events: EquityEvent[]): Record<EquityEventKind, { count: number; total: number }> {
  const out = {} as Record<EquityEventKind, { count: number; total: number }>;
  for (const e of events) {
    const k = e.kind;
    if (!out[k]) out[k] = { count: 0, total: 0 };
    out[k].count++;
    out[k].total += signedAmount(e);
  }
  return out;
}
