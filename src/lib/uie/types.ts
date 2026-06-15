// ORCA Universal Import Engine — Canonical Types
// zero-dependency by design (see master-plan §14.1). The engine core operates on
// a RawMatrix (string[][]) — file parsing (SheetJS/PapaParse) happens at the edge.

export type AssetClass = 'crypto' | 'stock' | 'forex' | 'futures' | 'option' | 'other';
export type Direction = 'long' | 'short';
export type TradeStatus = 'closed' | 'open';
export type UnitsMode = 'MONEY' | 'R_MODE' | 'HYBRID';
export type Archetype = 'A_TRADES_LEDGER' | 'B_FILLS_LOG' | 'C_ACCOUNT_STATEMENT' | 'D_POSITIONS_SNAPSHOT' | 'AMBIGUOUS';
export type FieldDestination = 'journal_column' | 'notes_overflow' | 'equity_store' | 'metadata' | 'ignore' | 'merge_with_date';
export type Tier = 1 | 2 | 3;

export type RawMatrix = string[][];
export interface SheetInput { name: string; matrix: RawMatrix; }

export interface Fill {
  date: string; side: 'buy' | 'sell'; price: number; quantity: number;
  fee?: number; externalId?: string; liquidation?: boolean;
}

export interface CanonicalTrade {
  id: string;
  externalIds: string[];
  symbol: string; symbolRaw: string; assetClass?: AssetClass;
  direction: Direction; status: TradeStatus;
  entryDate: string; exitDate?: string;
  entryPrice: number; exitPrice?: number;
  quantity?: number; positionSize?: number; leverage?: number;
  stopLoss?: number; takeProfit?: number;
  riskAmount?: number; rMultiple?: number;
  pnl?: number; pnlPercent?: number;
  commission?: number; swapFunding?: number; tax?: number;
  liquidated?: boolean; unitsMode?: UnitsMode;
  notes: string; tags?: string[];
  fills?: Fill[];
  derivedFields: string[];          // names of fields filled by the Derivation Engine
  warnings: string[];
}

export interface EquityEvent {
  date: string;
  type: 'balance_snapshot' | 'deposit' | 'withdrawal' | 'dividend' | 'interest' | 'fee' | 'transfer' | 'tax';
  amount: number; currency?: string; description?: string;
}

export interface ColumnProfile {
  index: number; headerRaw: string; headerNorm: string;
  sample: string[]; fillRate: number; cardinality: number; cardinalityRatio: number;
  d: {                               // detected ratios 0..1
    date: number; number: number; negativeShare: number; percentLike: number;
    tickerLike: number; currencyCode: number; directionValue: number; activityValue: number;
    orderTypeValue: number; sequentialInteger: number; smallFraction: number;
    urlLike: number; durationLike: number; freeText: number; booleanLike: number;
  };
  stats?: { min: number; max: number; mean: number; median: number; monotonic: number };
}

export interface FieldMatch {
  columnIndex: number;
  field: string | null;
  score: number;                     // 0..100
  evidence: string[];                // human-readable: name pass, content, rule, …
  destination?: FieldDestination;
  status: 'auto' | 'suggested' | 'unmapped' | 'pending-content';
}

export interface DateDecision { fmt: 'DMY'|'MDY'|'ISO'|'TIME_FIRST'|'EXCEL'|'UNKNOWN'; ambiguous: boolean; conflict: boolean; }

export interface StructureResult {
  sheetName: string;
  headerRowIndex: number; dataStart: number; dataEnd: number;
  regionCols: [number, number];
  dataRowIndices: number[];
  headers: string[];                 // normalized-trimmed headers for the chosen region
  metaBlock: string[];
  subHeader: string[];               // description row, mined as evidence
  skipped: { totals: number; repeated: number; description: number; example: number; indexOnly: number; seedBalance: number; cashAsRow: number; blank: number };
  specialRows: { equityEvents: EquityEvent[] };
  notes: string[];
}

export type GapSeverity = 'blocker' | 'warning' | 'info';
export interface GapItem { code: string; severity: GapSeverity; he: string; en: string; fix?: { he: string; en: string }; }
export interface GapReport {
  readiness: number;                 // 0..100
  unitsMode: UnitsMode;
  items: GapItem[];
  counts: { tradesClosed: number; tradesOpen: number; equityEvents: number; rowsSkipped: number; duplicates: number };
}

export interface ImportResult {
  sheetName: string;
  archetype: Archetype;
  mapping: FieldMatch[];
  trades: CanonicalTrade[];
  equityEvents: EquityEvent[];
  gap: GapReport;
  dateDecision: DateDecision;
  structure: StructureResult;
}
