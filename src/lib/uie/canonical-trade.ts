// UIE v1.2 — Phase 1
// Internal rich shape used during import. The journal adapter (Phase 4 D1)
// is the only layer allowed to translate this into the legacy Trade type.

export type CanonicalField =
  // existing mirrors
  | 'date'
  | 'time'
  | 'symbol'
  | 'direction'
  | 'orderType'
  | 'entry'
  | 'exit'
  | 'stopLoss'
  | 'takeProfit'
  | 'positionSize'
  | 'pnl'
  | 'fees'
  | 'leverage'
  | 'balance'
  | 'comments'
  | 'rowIndex'
  // 19 new canonical fields (UIE v1.2)
  | 'entryDate'
  | 'exitDate'
  | 'durationStr'
  | 'avgEntry'
  | 'avgExit'
  | 'maxOpenSize'
  | 'realizedPnl'
  | 'unrealizedPnl'
  | 'feeOpen'
  | 'feeClose'
  | 'feeTotal'
  | 'fundingFee'
  | 'rMultiple'
  | 'riskAmount'
  | 'riskPct'
  | 'returnPct'
  | 'mfe'
  | 'mae'
  | 'status'
  | 'liquidated'
  | 'externalId';

export type MatchTier = 'P1' | 'P2' | 'P3' | 'P4' | null;
export type MatchStatus = 'mapped' | 'pending-content' | 'unmapped';

export interface MatchResult {
  field: CanonicalField | null;
  score: number;          // 0..1
  tier: MatchTier;
  evidenceLayers: string[];
  status: MatchStatus;
  flags?: string[];       // e.g. ['date_conflict', 'date_ambiguous']
  notes?: string;
}

export interface CanonicalTrade {
  // Free-form bag — the adapter to NormalizedTrade lives in Phase 4 (D1).
  [k: string]: unknown;
}
