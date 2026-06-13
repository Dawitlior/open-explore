// UIE v1.2 — Phase 4.5 · Gap Analysis.
// Scans CanonicalTrade[] and reports missing/weak fields per row, plus
// aggregate coverage metrics. Pure & side-effect free — feeds fix-actions.

import type { CanonicalTrade, CanonicalField } from '../canonical-trade';

export type GapSeverity = 'critical' | 'warning' | 'info';

export interface RowGap {
  rowIndex: number;
  field: CanonicalField | string;
  severity: GapSeverity;
  reason: string;
}

export interface GapReport {
  totalRows: number;
  rowGaps: RowGap[];
  coverage: Record<string, number>; // field → 0..1 fraction present
  criticalRows: number[];           // indices with at least one critical gap
}

const CRITICAL_FIELDS: CanonicalField[] = ['symbol', 'direction', 'entry', 'exit'];
const WARNING_FIELDS: CanonicalField[] = ['positionSize', 'pnl', 'entryDate', 'exitDate'];
const INFO_FIELDS: CanonicalField[] = ['stopLoss', 'fees', 'externalId'];

function present(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0;
  return true;
}

export function analyzeGaps(trades: CanonicalTrade[]): GapReport {
  const rowGaps: RowGap[] = [];
  const counts: Record<string, number> = {};
  const critRows = new Set<number>();

  const track = (f: string) => { counts[f] = (counts[f] ?? 0) + 1; };

  trades.forEach((t, i) => {
    const idx = typeof t.rowIndex === 'number' ? t.rowIndex : i;
    for (const f of CRITICAL_FIELDS) {
      if (present(t[f])) track(f);
      else {
        rowGaps.push({ rowIndex: idx, field: f, severity: 'critical', reason: `missing ${f}` });
        critRows.add(idx);
      }
    }
    for (const f of WARNING_FIELDS) {
      if (present(t[f])) track(f);
      else rowGaps.push({ rowIndex: idx, field: f, severity: 'warning', reason: `missing ${f}` });
    }
    for (const f of INFO_FIELDS) {
      if (present(t[f])) track(f);
      else rowGaps.push({ rowIndex: idx, field: f, severity: 'info', reason: `missing ${f}` });
    }
  });

  const total = trades.length || 1;
  const coverage: Record<string, number> = {};
  for (const f of [...CRITICAL_FIELDS, ...WARNING_FIELDS, ...INFO_FIELDS]) {
    coverage[f] = (counts[f] ?? 0) / total;
  }

  return {
    totalRows: trades.length,
    rowGaps,
    coverage,
    criticalRows: [...critRows].sort((a, b) => a - b),
  };
}
