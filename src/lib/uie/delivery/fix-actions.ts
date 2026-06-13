// UIE v1.2 — Phase 4.5 · Fix Actions.
// Given a GapReport, suggest deterministic fix actions per row. These are
// hints surfaced to the import UI; no mutations happen here.

import type { GapReport, RowGap } from './gap-analysis';

export type FixActionKind =
  | 'derive-from-fills'
  | 'request-user-input'
  | 'drop-row'
  | 'default-zero'
  | 'split-comments';

export interface FixAction {
  rowIndex: number;
  field: string;
  kind: FixActionKind;
  message: string;
}

export function suggestFixes(report: GapReport): FixAction[] {
  const out: FixAction[] = [];
  for (const g of report.rowGaps) {
    out.push(toAction(g));
  }
  return out;
}

function toAction(g: RowGap): FixAction {
  const base = { rowIndex: g.rowIndex, field: String(g.field) };
  switch (g.field) {
    case 'entry':
    case 'exit':
    case 'positionSize':
      return { ...base, kind: 'derive-from-fills', message: `Try VWAP from fills for ${g.field}` };
    case 'symbol':
    case 'direction':
      return g.severity === 'critical'
        ? { ...base, kind: 'request-user-input', message: `Critical: ${g.field} required` }
        : { ...base, kind: 'default-zero', message: `Use default for ${g.field}` };
    case 'fees':
    case 'pnl':
      return { ...base, kind: 'default-zero', message: `Default ${g.field} = 0` };
    default:
      return { ...base, kind: 'request-user-input', message: `Optional: provide ${g.field}` };
  }
}
