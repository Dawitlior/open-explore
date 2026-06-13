// UIE v1.2 — Phase 3 · Step 2 · Archetype C · Fills aggregation
// Groups fill rows by orderId/externalId and produces one CanonicalTrade per
// completed (or open) position. Computes:
//   - entry  = VWAP of opening fills (signed cumulative qty going from 0 → max)
//   - exit   = VWAP of closing fills (unwind back to 0)
//   - positionSize = max |signed cumulative qty|
//   - pnl    = Σ realized PnL across closing fills (sign-aware)
//   - fees   = Σ fees
//   - entryDate / exitDate from first opening / last closing fill timestamps

import type { CanonicalTrade } from '../canonical-trade';
import { archetypeA } from './archetype-a';
import { classifyFills, type FillClassifyResult } from './fill-classify';

export interface ArchetypeCResult {
  trades: CanonicalTrade[];
  warnings: string[];
  diagnostics: {
    totalFills: number;
    groupedOrders: number;
    closedPositions: number;
    openPositions: number;
  };
  classification: FillClassifyResult;
}

interface FillRow {
  orderId: string;
  symbol: string;
  side: 'Long' | 'Short' | null;
  price: number | null;
  qty: number | null;
  fee: number | null;
  pnl: number | null;
  date: string | null;
  externalId: string | null;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  return null;
}

export function archetypeC(headers: string[], rows: unknown[][]): ArchetypeCResult {
  const cls = classifyFills(headers, rows);
  const warnings: string[] = [];

  // 1) Use Archetype A to normalize each fill row into a CanonicalTrade (1 per fill).
  const a = archetypeA(headers, rows);

  // 2) Map every per-fill CanonicalTrade into a FillRow.
  const orderIdCol = cls.columns.orderIdIdx;
  const fills: FillRow[] = [];

  a.trades.forEach((t, i) => {
    // orderId: prefer externalId, then the raw cell from orderIdCol
    let orderId = String(t.externalId ?? '').trim();
    if (!orderId && orderIdCol >= 0) {
      const rowIdx = (typeof t.rowIndex === 'number' ? t.rowIndex : i + 1) - 1;
      orderId = String(rows[rowIdx]?.[orderIdCol] ?? '').trim();
    }
    if (!orderId) orderId = `__orphan_${i}`;

    fills.push({
      orderId,
      symbol: String(t.symbol ?? '').trim() || 'UNKNOWN',
      side: (t.direction as 'Long' | 'Short') ?? null,
      price: num(t.entry) ?? num(t.exit) ?? num(t.avgEntry) ?? null,
      qty: num(t.positionSize),
      fee: num(t.fees) ?? num(t.feeTotal),
      pnl: num(t.pnl) ?? num(t.realizedPnl),
      date: (t.date as string) ?? null,
      externalId: (t.externalId as string) ?? null,
    });
  });

  // 3) Group by (orderId, symbol). Symbol guards against orderId collisions across markets.
  const groups = new Map<string, FillRow[]>();
  for (const f of fills) {
    const key = `${f.orderId}::${f.symbol}`;
    const arr = groups.get(key) ?? [];
    arr.push(f);
    groups.set(key, arr);
  }

  // 4) Aggregate each group.
  const trades: CanonicalTrade[] = [];
  let closed = 0, open = 0;

  for (const [, group] of groups) {
    // sort chronologically
    group.sort((a, b) => {
      const at = a.date ? Date.parse(a.date.replace(' ', 'T')) : 0;
      const bt = b.date ? Date.parse(b.date.replace(' ', 'T')) : 0;
      return at - bt;
    });

    // Track signed cumulative qty: + for Long opens / Short closes, - for the opposite.
    // Simplest model: side carried by the position. The first non-null side is the
    // position direction; opens add qty, closes subtract.
    let position: 'Long' | 'Short' | null = null;
    let cumQty = 0;
    let openCost = 0;     // Σ(qty * price) for opening fills
    let openQty = 0;
    let closeProceeds = 0;
    let closeQty = 0;
    let feeTotal = 0;
    let pnlTotal = 0;
    let firstOpenDate: string | null = null;
    let lastCloseDate: string | null = null;
    const symbol = group[0]?.symbol ?? 'UNKNOWN';
    const orderId = group[0]?.orderId ?? '';

    for (const f of group) {
      if (!position && f.side) position = f.side;
      const qty = f.qty ?? 0;
      const price = f.price ?? 0;
      const isOpenFill = position == null || f.side === position;

      if (isOpenFill) {
        openCost += qty * price;
        openQty += qty;
        cumQty += qty;
        if (!firstOpenDate && f.date) firstOpenDate = f.date;
      } else {
        closeProceeds += qty * price;
        closeQty += qty;
        cumQty -= qty;
        if (f.date) lastCloseDate = f.date;
      }
      if (f.fee != null) feeTotal += f.fee;
      if (f.pnl != null) pnlTotal += f.pnl;
    }

    const vwapEntry = openQty > 0 ? openCost / openQty : null;
    const vwapExit = closeQty > 0 ? closeProceeds / closeQty : null;

    // Fallback PnL when not provided per fill:
    let computedPnl = pnlTotal;
    if (computedPnl === 0 && vwapEntry != null && vwapExit != null && closeQty > 0) {
      const dir = position === 'Short' ? -1 : 1;
      computedPnl = dir * (vwapExit - vwapEntry) * closeQty - feeTotal;
    }

    const isClosed = Math.abs(cumQty) < 1e-9;
    if (isClosed) closed++; else open++;

    trades.push({
      rowIndex: trades.length + 1,
      externalId: orderId || undefined,
      symbol,
      direction: position,
      entry: vwapEntry ?? undefined,
      avgEntry: vwapEntry ?? undefined,
      exit: vwapExit ?? undefined,
      avgExit: vwapExit ?? undefined,
      positionSize: Math.max(openQty, closeQty),
      maxOpenSize: openQty,
      pnl: computedPnl || undefined,
      realizedPnl: computedPnl || undefined,
      feeTotal: feeTotal || undefined,
      fees: feeTotal || undefined,
      entryDate: firstOpenDate ?? undefined,
      exitDate: lastCloseDate ?? undefined,
      date: firstOpenDate ?? undefined,
      status: isClosed ? 'closed' : 'open',
    });
  }

  if (a.warnings.length) warnings.push(...a.warnings);

  return {
    trades,
    warnings,
    diagnostics: {
      totalFills: fills.length,
      groupedOrders: groups.size,
      closedPositions: closed,
      openPositions: open,
    },
    classification: cls,
  };
}
