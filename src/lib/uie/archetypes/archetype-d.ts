// UIE v1.2 — Phase 4 · Step 1 · Archetype D · Equity statements
// Brokerage account statements: many rows, most are NOT trades — they're equity
// events (deposit, withdrawal, fee, funding, interest, dividend, transfer,
// rebate). Only trade-like rows (buy/sell with quantity & price) contribute to
// CanonicalTrade output; everything else becomes an EquityEvent.

import type { CanonicalTrade } from '../canonical-trade';
import { archetypeA } from './archetype-a';
import { archetypeC } from './archetype-c';

export type EquityEventKind =
  | 'deposit'
  | 'withdrawal'
  | 'fee'
  | 'funding'
  | 'interest'
  | 'dividend'
  | 'transfer'
  | 'rebate'
  | 'adjustment'
  | 'unknown';

export interface EquityEvent {
  kind: EquityEventKind;
  date: string | null;
  amount: number | null;
  currency?: string;
  symbol?: string;
  description?: string;
  rowIndex: number;
}

export interface ArchetypeDResult {
  trades: CanonicalTrade[];
  events: EquityEvent[];
  warnings: string[];
  diagnostics: {
    totalRows: number;
    tradeRows: number;
    eventRows: number;
    skipped: number;
  };
}

const TYPE_REGEX = /(type|action|transaction|description|event|movement|פעולה|סוג)/i;

const EVENT_TOKENS: Record<EquityEventKind, string[]> = {
  deposit: ['deposit', 'fund in', 'transfer in', 'הפקדה'],
  withdrawal: ['withdraw', 'withdrawal', 'transfer out', 'משיכה'],
  fee: ['fee', 'commission', 'עמלה'],
  funding: ['funding', 'swap', 'overnight'],
  interest: ['interest', 'ריבית'],
  dividend: ['dividend', 'div', 'דיבידנד'],
  transfer: ['transfer', 'internal transfer', 'העברה'],
  rebate: ['rebate', 'cashback', 'החזר'],
  adjustment: ['adjustment', 'correction', 'תיקון'],
  unknown: [],
};

const TRADE_TOKENS = ['buy', 'sell', 'trade', 'fill', 'exec', 'open', 'close', 'long', 'short', 'קנייה', 'מכירה'];

function classifyRow(value: string): { isTrade: boolean; kind: EquityEventKind } {
  const s = value.toLowerCase();
  if (!s) return { isTrade: false, kind: 'unknown' };
  if (TRADE_TOKENS.some((t) => s.includes(t))) return { isTrade: true, kind: 'unknown' };
  for (const [kind, tokens] of Object.entries(EVENT_TOKENS) as [EquityEventKind, string[]][]) {
    if (tokens.some((t) => s.includes(t))) return { isTrade: false, kind };
  }
  return { isTrade: false, kind: 'unknown' };
}

function findTypeColumn(headers: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (TYPE_REGEX.test(headers[i])) return i;
  }
  return -1;
}

export function looksLikeArchetypeD(headers: string[], rows: unknown[][]): boolean {
  const idx = findTypeColumn(headers);
  if (idx === -1) return false;
  let events = 0, trades = 0;
  for (const r of rows.slice(0, 500)) {
    const c = classifyRow(String(r?.[idx] ?? ''));
    if (c.isTrade) trades++;
    else if (c.kind !== 'unknown') events++;
  }
  // Need a meaningful mix of event rows alongside trade rows OR ≥3 distinct event kinds.
  return events >= 3;
}

export function archetypeD(headers: string[], rows: unknown[][]): ArchetypeDResult {
  const typeCol = findTypeColumn(headers);
  const warnings: string[] = [];

  if (typeCol === -1) {
    const a = archetypeA(headers, rows);
    warnings.push('archetype-d: no type column, fell back to archetype-a');
    return {
      trades: a.trades, events: [], warnings,
      diagnostics: { totalRows: rows.length, tradeRows: a.trades.length, eventRows: 0, skipped: 0 },
    };
  }

  // Partition rows into trade rows vs event rows by inspecting the type column.
  const tradeRows: unknown[][] = [];
  const eventRowIndices: { row: unknown[]; kind: EquityEventKind; originalIdx: number }[] = [];

  rows.forEach((r, idx) => {
    const c = classifyRow(String(r?.[typeCol] ?? ''));
    if (c.isTrade) tradeRows.push(r);
    else if (c.kind !== 'unknown') eventRowIndices.push({ row: r, kind: c.kind, originalIdx: idx });
  });

  // Run trade rows through Archetype A (or C if fills shape detected).
  // For simplicity here, archetype-a is used; xlsx-engine can choose C later.
  const a = tradeRows.length ? archetypeA(headers, tradeRows) : { trades: [], warnings: [] as string[] };
  warnings.push(...a.warnings);

  // Build event records from each event row by re-normalizing via archetype-a
  // (so we benefit from date detection and number normalization).
  const eventsTable = eventRowIndices.map((e) => e.row);
  const evA = eventsTable.length ? archetypeA(headers, eventsTable) : { trades: [], warnings: [] as string[] };

  const events: EquityEvent[] = eventRowIndices.map((entry, i) => {
    const ct = evA.trades[i] ?? {};
    const amount =
      (typeof ct.pnl === 'number' ? ct.pnl :
        typeof ct.realizedPnl === 'number' ? ct.realizedPnl :
          typeof ct.positionSize === 'number' ? ct.positionSize :
            typeof ct.fees === 'number' ? -Math.abs(ct.fees) :
              null);
    return {
      kind: entry.kind,
      date: (ct.date as string) ?? null,
      amount: amount ?? null,
      symbol: (ct.symbol as string) ?? undefined,
      description: String(entry.row?.[typeCol] ?? '').trim() || undefined,
      rowIndex: entry.originalIdx + 1,
    };
  });

  // If we found fills-like trade rows but no exit prices, archetype-C might be more
  // appropriate. Detect cheaply: many rows for the same row-derived symbol.
  let finalTrades = a.trades;
  if (tradeRows.length > a.trades.length * 1.5) {
    try {
      const c = archetypeC(headers, tradeRows);
      if (c.trades.length && c.trades.length <= a.trades.length) finalTrades = c.trades;
    } catch { /* keep A result */ }
  }

  return {
    trades: finalTrades,
    events,
    warnings,
    diagnostics: {
      totalRows: rows.length,
      tradeRows: tradeRows.length,
      eventRows: events.length,
      skipped: rows.length - tradeRows.length - events.length,
    },
  };
}
