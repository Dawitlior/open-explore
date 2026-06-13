// UIE v1.2 — Phase 2 · Step 4 · Archetype B · Open/Close paired rows
// Two rows per trade: one with Action=Open (or "Buy"/"Entry"), one with
// Action=Close (or "Sell"/"Exit"). Pair by externalId when present, else by
// (symbol, direction, nearest-time) heuristic.
//
// Output: CanonicalTrade[] where each trade carries entryDate, exitDate,
// avgEntry (entry), avgExit (exit), positionSize, pnl, fees, etc.

import type { CanonicalField, CanonicalTrade } from '../canonical-trade';
import { archetypeA, type ColumnPlan } from './archetype-a';

const OPEN_TOKENS = new Set(['open', 'buy', 'entry', 'in', 'long', 'short', 'פתיחה', 'כניסה']);
const CLOSE_TOKENS = new Set(['close', 'sell', 'exit', 'out', 'סגירה', 'יציאה']);

export type ActionKind = 'open' | 'close' | 'unknown';

export interface ArchetypeBResult {
  trades: CanonicalTrade[];
  plan: ColumnPlan[];
  warnings: string[];
  diagnostics: {
    totalRows: number;
    openRows: number;
    closeRows: number;
    pairedTrades: number;
    orphanRows: number;
  };
}

function classifyAction(value: unknown): ActionKind {
  if (value == null) return 'unknown';
  const s = String(value).trim().toLowerCase();
  if (OPEN_TOKENS.has(s)) return 'open';
  if (CLOSE_TOKENS.has(s)) return 'close';
  // suffixed forms (e.g., "Open Long", "Close Short")
  for (const t of OPEN_TOKENS) if (s.startsWith(t + ' ')) return 'open';
  for (const t of CLOSE_TOKENS) if (s.startsWith(t + ' ')) return 'close';
  return 'unknown';
}

/**
 * Heuristic detection: does this table look like paired open/close rows?
 *   - has an "Action"/"Side"-style column whose values include open AND close
 *     tokens (not just long/short).
 */
export function looksLikeArchetypeB(headers: string[], rows: unknown[][]): boolean {
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c].toLowerCase();
    if (!/(action|type|side|event|status|פעולה|סוג)/.test(h)) continue;
    let opens = 0, closes = 0;
    for (const r of rows.slice(0, 200)) {
      const k = classifyAction(r?.[c]);
      if (k === 'open') opens++;
      else if (k === 'close') closes++;
    }
    if (opens >= 1 && closes >= 1) return true;
  }
  return false;
}

function findActionColumn(headers: string[], rows: unknown[][]): number {
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c].toLowerCase();
    if (!/(action|type|side|event|status|פעולה|סוג)/.test(h)) continue;
    let opens = 0, closes = 0;
    for (const r of rows.slice(0, 500)) {
      const k = classifyAction(r?.[c]);
      if (k === 'open') opens++;
      else if (k === 'close') closes++;
    }
    if (opens && closes) return c;
  }
  return -1;
}

function timeMs(t: unknown): number | null {
  if (t == null || t === '') return null;
  if (typeof t === 'string') {
    // CanonicalTrade dates are "YYYY-MM-DD HH:mm"
    const d = new Date(t.replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof t === 'number') return t;
  return null;
}

function mergePair(openT: CanonicalTrade, closeT: CanonicalTrade, rowIndex: number): CanonicalTrade {
  const out: CanonicalTrade = { rowIndex };

  // Dates
  if (openT.date != null) { out.entryDate = openT.date; out.date = openT.date; }
  if (closeT.date != null) out.exitDate = closeT.date;

  // Identity
  out.symbol = closeT.symbol ?? openT.symbol;
  out.direction = openT.direction ?? closeT.direction;
  if (openT.orderType != null) out.orderType = openT.orderType;
  if (openT.externalId != null) out.externalId = openT.externalId;
  else if (closeT.externalId != null) out.externalId = closeT.externalId;

  // Prices
  if (openT.entry != null) out.entry = openT.entry;
  else if (openT.avgEntry != null) out.entry = openT.avgEntry;
  if (closeT.exit != null) out.exit = closeT.exit;
  else if (closeT.avgExit != null) out.exit = closeT.avgExit;

  // Size — close row typically has the realized size; fall back to open.
  out.positionSize = closeT.positionSize ?? openT.positionSize;

  // Money
  const pnl = closeT.pnl ?? closeT.realizedPnl;
  if (pnl != null) { out.pnl = pnl; out.realizedPnl = pnl; }
  const feeO = openT.fees ?? openT.feeOpen;
  const feeC = closeT.fees ?? closeT.feeClose;
  if (feeO != null) out.feeOpen = feeO;
  if (feeC != null) out.feeClose = feeC;
  if (feeO != null || feeC != null) {
    out.feeTotal = (Number(feeO) || 0) + (Number(feeC) || 0);
    out.fees = out.feeTotal;
  }

  // Risk / R copy from whichever row has it (usually the open row).
  for (const f of ['stopLoss', 'takeProfit', 'leverage', 'riskAmount', 'riskPct', 'rMultiple', 'returnPct', 'mfe', 'mae', 'comments', 'balance'] as CanonicalField[]) {
    if (out[f] == null) out[f] = openT[f] ?? closeT[f];
  }

  out.status = 'closed';
  return out;
}

export function archetypeB(headers: string[], rows: unknown[][]): ArchetypeBResult {
  // 1) Run Archetype A first to normalize every row.
  const a = archetypeA(headers, rows);
  const actionCol = findActionColumn(headers, rows);

  if (actionCol === -1) {
    // No paired structure — fall through, treat as Archetype A.
    return {
      trades: a.trades,
      plan: a.plan,
      warnings: [...a.warnings, 'archetype-b: no action column found, fell back to archetype-a'],
      diagnostics: { totalRows: rows.length, openRows: 0, closeRows: 0, pairedTrades: a.trades.length, orphanRows: 0 },
    };
  }

  // 2) Classify every (still original) row as open/close.
  const kinds = rows.map((r) => classifyAction(r?.[actionCol]));

  // CanonicalTrades from A are produced in the same order as non-empty rows.
  // Build a parallel list of {kind, trade} preserving alignment with `a.trades`.
  const aligned: Array<{ kind: ActionKind; trade: CanonicalTrade }> = [];
  let ai = 0;
  for (let i = 0; i < rows.length; i++) {
    const at = a.trades[ai];
    // Re-derive whether this row produced an output (matches archetypeA: hasAnyValue)
    // Simplest safe approach: walk both in lockstep, skipping rows where row is fully empty.
    const rowEmpty = !rows[i] || rows[i].every((c) => c == null || String(c).trim() === '');
    if (rowEmpty) continue;
    if (!at) break;
    aligned.push({ kind: kinds[i], trade: at });
    ai++;
  }

  let openRows = 0, closeRows = 0;
  const opens: CanonicalTrade[] = [];
  const closes: CanonicalTrade[] = [];
  for (const { kind, trade } of aligned) {
    if (kind === 'open') { opens.push(trade); openRows++; }
    else if (kind === 'close') { closes.push(trade); closeRows++; }
  }

  // 3) Pair: externalId first, then (symbol+direction+nearest-later time).
  const usedCloses = new Set<number>();
  const paired: CanonicalTrade[] = [];
  let rowIdx = 1;

  for (const op of opens) {
    let matchIdx = -1;

    if (op.externalId != null) {
      matchIdx = closes.findIndex((c, i) => !usedCloses.has(i) && c.externalId === op.externalId);
    }

    if (matchIdx === -1) {
      const opTime = timeMs(op.date);
      let bestDelta = Infinity;
      closes.forEach((c, i) => {
        if (usedCloses.has(i)) return;
        if (op.symbol && c.symbol && op.symbol !== c.symbol) return;
        if (op.direction && c.direction && op.direction !== c.direction) return;
        const ct = timeMs(c.date);
        if (opTime != null && ct != null) {
          if (ct < opTime) return; // close must be ≥ open
          const d = ct - opTime;
          if (d < bestDelta) { bestDelta = d; matchIdx = i; }
        } else if (matchIdx === -1) {
          matchIdx = i; // fallback: first available
        }
      });
    }

    if (matchIdx !== -1) {
      usedCloses.add(matchIdx);
      paired.push(mergePair(op, closes[matchIdx], rowIdx++));
    } else {
      // orphan open — keep as open-status trade
      paired.push({ ...op, status: 'open', rowIndex: rowIdx++ });
    }
  }

  // Unpaired closes (orphans) — surface as their own rows so data isn't lost.
  let orphanRows = 0;
  closes.forEach((c, i) => {
    if (!usedCloses.has(i)) { paired.push({ ...c, status: 'orphan_close', rowIndex: rowIdx++ }); orphanRows++; }
  });

  return {
    trades: paired,
    plan: a.plan,
    warnings: a.warnings,
    diagnostics: { totalRows: rows.length, openRows, closeRows, pairedTrades: paired.length - orphanRows, orphanRows },
  };
}
