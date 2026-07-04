/**
 * IBKR Flex XML normalizer — pure module (no I/O, no supabase, no env).
 *
 * Consumes IBKR Activity Flex Web Service XML and produces:
 *  1. `ParsedFlex` — parsed report or failure envelope.
 *  2. `reconstructClosedTrades()` — generalised FIFO over Trade executions
 *     (long + short symmetric, contract-multiplier aware, fee-apportioned).
 *  3. `crosscheckPnl()` — sanity check against IBKR's own fifoPnlRealized.
 *  4. `mapOpenPositions()` — shape OpenPosition rows for public.open_positions.
 *
 * Design notes:
 *  - Parses attributes defensively; missing/empty numeric attrs → null (never NaN).
 *  - Never throws for a single bad row — bad rows are dropped with a warning.
 *  - external_id = closing fill's ibExecID (falls back to tradeID). Stable
 *    across re-runs; underpins the idempotent overwrite in sync-ibkr-flex.
 */

import { XMLParser } from 'npm:fast-xml-parser@4.5.0';

// ---------- Types ----------
export interface FlexTradeAttr {
  tradeID?: string;
  ibExecID?: string;
  accountId?: string;
  symbol?: string;
  assetCategory?: string;
  currency?: string;
  tradeDate?: string;
  dateTime?: string;
  quantity?: string;
  tradePrice?: string;
  ibCommission?: string;
  buySell?: string;
  openCloseIndicator?: string;
  fifoPnlRealized?: string;
  multiplier?: string;
  orderID?: string;
  exchange?: string;
}

export interface FlexOpenPositionAttr {
  accountId?: string;
  symbol?: string;
  assetCategory?: string;
  currency?: string;
  position?: string;
  markPrice?: string;
  costBasisPrice?: string;
  fifoPnlUnrealized?: string;
  multiplier?: string;
  side?: string;
}

export interface FlexAccountStatement {
  accountId: string;
  fromDate: string | null;
  toDate: string | null;
  whenGenerated: string | null;
  trades: FlexTradeAttr[];
  openPositions: FlexOpenPositionAttr[];
}

export type ParsedFlex =
  | { kind: 'report'; statements: FlexAccountStatement[]; warnings: string[] }
  | { kind: 'in_progress'; code: string; message: string } // 1019 = still generating
  | { kind: 'error'; code: string; message: string };

export interface ClosedTrade {
  external_id: string;
  account_id: string;
  symbol: string;
  asset_category: string;
  currency: string;
  multiplier: number;
  direction: 'Long' | 'Short';
  entry: number;
  exit: number;
  qty: number;
  gross_pnl: number;   // (exit-entry) * qty * mult * sign — pre-fee
  fees: number;
  pnl: number;         // net
  opened_at: string;   // ISO
  closed_at: string;   // ISO
  ib_fifo_pnl?: number; // sum of the closing fill's fifoPnlRealized share
}

export interface ReconResult {
  closedTrades: ClosedTrade[];
  warnings: string[];
}

// ---------- Defensive parsers ----------
export function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Accepts yyyyMMdd, yyyy-MM-dd, and dateTime with `;` or ` ` separator
 *  plus HHmmss or HH:mm:ss. Timezone-less — parsed as if UTC. */
export function parseFlexDateTime(s: string | undefined | null): string | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  // Pull date + optional time halves.
  const sepMatch = trimmed.match(/^(\S+?)(?:[; ](\S+))?$/);
  if (!sepMatch) return null;
  const rawDate = sepMatch[1];
  const rawTime = sepMatch[2] ?? '00:00:00';

  // Date → yyyy-MM-dd
  let y = '', mo = '', d = '';
  if (/^\d{8}$/.test(rawDate)) {
    y = rawDate.slice(0, 4); mo = rawDate.slice(4, 6); d = rawDate.slice(6, 8);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    [y, mo, d] = rawDate.split('-');
  } else {
    return null;
  }

  // Time → HH:mm:ss
  let hh = '00', mm = '00', ss = '00';
  const t = rawTime.replace(/[^\d:]/g, '');
  if (/^\d{6}$/.test(t)) {
    hh = t.slice(0, 2); mm = t.slice(2, 4); ss = t.slice(4, 6);
  } else if (/^\d{2}:\d{2}:\d{2}$/.test(t)) {
    [hh, mm, ss] = t.split(':');
  } else if (/^\d{2}:\d{2}$/.test(t)) {
    [hh, mm] = t.split(':');
  }

  const iso = `${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`;
  const d0 = new Date(iso);
  return Number.isNaN(d0.getTime()) ? null : d0.toISOString();
}

// ---------- XML parsing ----------
function coerceArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function attrObj(node: unknown): Record<string, string> {
  if (!node || typeof node !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k.startsWith('@_')) out[k.slice(2)] = String(v);
  }
  return out;
}

export function parseFlexXml(xml: string): ParsedFlex {
  const warnings: string[] = [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: false,
    trimValues: true,
    allowBooleanAttributes: true,
  });
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    return { kind: 'error', code: 'parse_error', message: (e as Error).message };
  }

  // FlexStatementResponse envelope — success ticket or failure.
  const respWrap = doc.FlexStatementResponse as Record<string, unknown> | undefined;
  if (respWrap) {
    const status = String((respWrap.Status as string) ?? '').trim();
    const code = String((respWrap.ErrorCode as string | number) ?? '').trim();
    const message = String((respWrap.ErrorMessage as string) ?? '').trim();
    if (status.toLowerCase() === 'fail') {
      if (code === '1019') return { kind: 'in_progress', code, message: message || 'Statement generation in progress' };
      return { kind: 'error', code: code || 'unknown', message: message || 'Flex error' };
    }
    // Success envelope but no report body — caller wanted step-1 not step-2.
    // Not a normal state to hit here; treat as error to be safe.
    return { kind: 'error', code: 'unexpected_envelope', message: 'FlexStatementResponse without failure and without report body' };
  }

  const report = doc.FlexQueryResponse as Record<string, unknown> | undefined;
  if (!report) {
    return { kind: 'error', code: 'unrecognized_xml', message: 'No FlexQueryResponse or FlexStatementResponse root' };
  }

  const stmts = coerceArray((report.FlexStatements as { FlexStatement?: unknown } | undefined)?.FlexStatement);
  const statements: FlexAccountStatement[] = [];
  for (const s of stmts) {
    const sa = attrObj(s);
    const node = (s && typeof s === 'object') ? (s as Record<string, unknown>) : {};
    // fast-xml-parser collapses `<Trades> </Trades>` (whitespace-only body) to
    // an empty string rather than an object. Both shapes MUST parse as "no
    // trades" — never as an error. A positions-only Flex report (open
    // positions but zero closed trades in the window) is a valid success.
    const tradesRaw = node.Trades;
    const openRaw = node.OpenPositions;
    const tradesWrap = (tradesRaw && typeof tradesRaw === 'object')
      ? (tradesRaw as { Trade?: unknown }) : undefined;
    const openWrap = (openRaw && typeof openRaw === 'object')
      ? (openRaw as { OpenPosition?: unknown }) : undefined;
    const trades = coerceArray(tradesWrap?.Trade).map(t => attrObj(t)) as FlexTradeAttr[];
    const openPositions = coerceArray(openWrap?.OpenPosition).map(t => attrObj(t)) as FlexOpenPositionAttr[];
    statements.push({
      accountId: sa.accountId || '',
      fromDate: sa.fromDate || null,
      toDate: sa.toDate || null,
      whenGenerated: sa.whenGenerated || null,
      trades,
      openPositions,
    });
    if (!sa.accountId) warnings.push('FlexStatement missing accountId');
  }

  return { kind: 'report', statements, warnings };
}

// ---------- FIFO reconstruction ----------
interface Lot {
  qty: number;         // signed remaining size, matches direction
  price: number;
  fee: number;         // remaining commission attributable to this lot
  time: number;        // ms
  ibExecID: string;
}

interface CookedFill {
  ibExecID: string;
  tradeID: string;
  accountId: string;
  symbol: string;
  assetCategory: string;
  currency: string;
  multiplier: number;
  time: number;
  timeIso: string;
  signedQty: number;   // +BUY, -SELL
  price: number;
  fee: number;         // positive
  ibFifo: number;      // fifoPnlRealized from IBKR (usually only on close)
}

function cookFill(t: FlexTradeAttr, warnings: string[]): CookedFill | null {
  const id = String(t.ibExecID || t.tradeID || '').trim();
  if (!id) { warnings.push(`Trade missing ibExecID and tradeID — dropped`); return null; }
  const price = num(t.tradePrice);
  const qty = num(t.quantity);
  const iso = parseFlexDateTime(t.dateTime) ?? parseFlexDateTime(t.tradeDate);
  if (price === null || qty === null || !iso) {
    warnings.push(`Trade ${id} missing price/qty/dateTime — dropped`);
    return null;
  }
  const bs = String(t.buySell || '').trim().toUpperCase();
  const sign = bs === 'BUY' ? 1 : bs === 'SELL' ? -1 : (qty >= 0 ? 1 : -1);
  const signedQty = Math.abs(qty) * sign;
  const fee = Math.abs(num(t.ibCommission) ?? 0);
  const mult = num(t.multiplier) ?? 1;
  const ibFifo = num(t.fifoPnlRealized) ?? 0;
  return {
    ibExecID: id,
    tradeID: String(t.tradeID || id),
    accountId: String(t.accountId || ''),
    symbol: String(t.symbol || ''),
    assetCategory: String(t.assetCategory || 'STK'),
    currency: String(t.currency || 'USD'),
    multiplier: mult || 1,
    time: new Date(iso).getTime(),
    timeIso: iso,
    signedQty,
    price,
    fee,
    ibFifo,
  };
}

/**
 * Generalised FIFO over signed quantities.
 * - Long lots (positive qty) close against SELL fills (negative signedQty).
 * - Short lots (negative qty) close against BUY fills (positive signedQty).
 * - A fill that flips through zero is split: the closing portion closes,
 *   the remainder opens a new lot in the opposite direction.
 * - Fees are apportioned pro-rata by quantity from both sides.
 */
export function reconstructClosedTrades(execs: FlexTradeAttr[]): ReconResult {
  const warnings: string[] = [];
  const cooked: CookedFill[] = [];
  for (const e of execs) {
    const c = cookFill(e, warnings);
    if (c) cooked.push(c);
  }

  const hasCash = cooked.some(c => c.assetCategory === 'CASH');
  if (hasCash) {
    warnings.push('CASH (forex) executions processed with quantity-in-base-units semantics — verify manually');
  }

  // Group by instrument key.
  const groups = new Map<string, CookedFill[]>();
  for (const f of cooked) {
    const key = `${f.accountId}|${f.symbol}|${f.assetCategory}|${f.currency}|${f.multiplier}`;
    const arr = groups.get(key) ?? [];
    arr.push(f);
    groups.set(key, arr);
  }

  const closedTrades: ClosedTrade[] = [];
  for (const [, fills] of groups) {
    fills.sort((a, b) => (a.time - b.time) || a.ibExecID.localeCompare(b.ibExecID));
    const lots: Lot[] = [];

    for (const f of fills) {
      let remaining = f.signedQty;
      let remainingFee = f.fee;
      const totalFillAbs = Math.abs(f.signedQty);

      // Close against opposite-side lots while direction is opposite.
      while (
        Math.abs(remaining) > 1e-12 &&
        lots.length > 0 &&
        Math.sign(lots[0].qty) !== Math.sign(remaining)
      ) {
        const lot = lots[0];
        const matched = Math.min(Math.abs(lot.qty), Math.abs(remaining));
        const lotAbs = Math.abs(lot.qty);
        const lotFeePortion = lotAbs > 0 ? lot.fee * (matched / lotAbs) : 0;
        const fillFeePortion = totalFillAbs > 0 ? f.fee * (matched / totalFillAbs) : 0;
        lot.fee -= lotFeePortion;
        remainingFee -= fillFeePortion;

        const direction: 'Long' | 'Short' = lot.qty > 0 ? 'Long' : 'Short';
        const entry = lot.price;
        const exit = f.price;
        const signMul = direction === 'Long' ? 1 : -1;
        const gross = (exit - entry) * matched * f.multiplier * signMul;
        const feesShare = lotFeePortion + fillFeePortion;
        // IB's fifoPnlRealized on the closing fill applies to the matched qty
        // proportionally. Fill-level totalFillAbs proxy is fine because a
        // single fill's ibFifo scales linearly with its matched portion.
        const ibShare = totalFillAbs > 0 ? f.ibFifo * (matched / totalFillAbs) : 0;

        closedTrades.push({
          external_id: f.ibExecID,
          account_id: f.accountId,
          symbol: f.symbol,
          asset_category: f.assetCategory,
          currency: f.currency,
          multiplier: f.multiplier,
          direction,
          entry,
          exit,
          qty: matched,
          gross_pnl: gross,
          fees: feesShare,
          pnl: gross - feesShare,
          opened_at: new Date(lot.time).toISOString(),
          closed_at: f.timeIso,
          ib_fifo_pnl: ibShare,
        });

        // Consume from lot & fill in signed space.
        const consumedSigned = matched * Math.sign(lot.qty);
        lot.qty -= consumedSigned;
        remaining += consumedSigned; // remaining had opposite sign, adds toward 0
        if (Math.abs(lot.qty) <= 1e-12) lots.shift();
      }

      // Remainder opens a new lot in the fill's direction.
      if (Math.abs(remaining) > 1e-12) {
        lots.push({
          qty: remaining,
          price: f.price,
          fee: remainingFee > 0 ? remainingFee : 0,
          time: f.time,
          ibExecID: f.ibExecID,
        });
      }
    }
  }

  // NaN guard.
  for (const t of closedTrades) {
    if (!Number.isFinite(t.pnl)) t.pnl = 0;
    if (!Number.isFinite(t.gross_pnl)) t.gross_pnl = 0;
    if (!Number.isFinite(t.fees)) t.fees = 0;
  }

  return { closedTrades, warnings };
}

// ---------- PnL crosscheck ----------
export interface CrosscheckResult {
  ours: number;
  ibkr: number;
  delta: number;
  basis: 'gross';
}

export function crosscheckPnl(
  closed: ClosedTrade[],
  _execs: FlexTradeAttr[],
): CrosscheckResult {
  // Basis 'gross' — compare (exit-entry)*qty*mult vs IBKR's fifoPnlRealized
  // (which is also pre-commission on IBKR's side).
  const ours = closed.reduce((s, t) => s + t.gross_pnl, 0);
  const ibkr = closed.reduce((s, t) => s + (t.ib_fifo_pnl ?? 0), 0);
  const delta = ours - ibkr;
  return { ours, ibkr, delta, basis: 'gross' };
}

// ---------- Open positions ----------
export interface MappedOpenPosition {
  provider: 'ibkr_flex';
  account_label: string | null;
  symbol: string;
  side: 'Long' | 'Short';
  size: number;
  entry_price: number;
  unrealized_pnl: number;
  stop_loss: null;
  leverage: null;
}

export function mapOpenPositions(
  raw: FlexOpenPositionAttr[],
  accountLabel: string | null,
): MappedOpenPosition[] {
  const out: MappedOpenPosition[] = [];
  for (const p of raw) {
    const pos = num(p.position);
    if (pos === null || pos === 0) continue;
    const side: 'Long' | 'Short' =
      (String(p.side || '').toLowerCase() === 'short' || pos < 0) ? 'Short' : 'Long';
    out.push({
      provider: 'ibkr_flex',
      account_label: accountLabel,
      symbol: String(p.symbol || ''),
      side,
      size: Math.abs(pos),
      entry_price: num(p.costBasisPrice) ?? 0,
      unrealized_pnl: num(p.fifoPnlUnrealized) ?? 0,
      stop_loss: null,
      leverage: null,
    });
  }
  return out;
}
