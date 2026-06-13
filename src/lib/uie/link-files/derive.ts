// UIE v1.2 — Phase 3 · Step 4 · Field derivation
// Given a CanonicalTrade with sparse fields, derive missing values from
// available ones. Used as the final cleanup pass after linking.

import type { CanonicalTrade } from '../canonical-trade';

export function deriveFields(t: CanonicalTrade): CanonicalTrade {
  const out: CanonicalTrade = { ...t };

  // entry ← avgEntry
  if (out.entry == null && out.avgEntry != null) out.entry = out.avgEntry;
  // exit ← avgExit
  if (out.exit == null && out.avgExit != null) out.exit = out.avgExit;
  // pnl ← realizedPnl
  if (out.pnl == null && out.realizedPnl != null) out.pnl = out.realizedPnl;
  // fees ← feeTotal
  if (out.fees == null && out.feeTotal != null) out.fees = out.feeTotal;
  // feeTotal ← feeOpen+feeClose
  if (out.feeTotal == null && (out.feeOpen != null || out.feeClose != null)) {
    out.feeTotal = (Number(out.feeOpen) || 0) + (Number(out.feeClose) || 0);
  }
  // date ← entryDate
  if (out.date == null && out.entryDate != null) out.date = out.entryDate;

  // pnl from entry/exit/positionSize/direction
  if (out.pnl == null && out.entry != null && out.exit != null && out.positionSize != null) {
    const dir = out.direction === 'Short' ? -1 : 1;
    const pnl = dir * (Number(out.exit) - Number(out.entry)) * Number(out.positionSize);
    if (Number.isFinite(pnl)) out.pnl = pnl;
  }

  return out;
}

export function deriveAll(trades: CanonicalTrade[]): CanonicalTrade[] {
  return trades.map(deriveFields);
}
