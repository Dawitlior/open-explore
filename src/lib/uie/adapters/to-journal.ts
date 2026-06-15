// ─────────────────────────────────────────────────────────────────────────────
// THE ONLY MODULE THAT KNOWS THE HOST JOURNAL'S SCHEMA.
// Tailored to THIS platform (per the system audit): produces BOTH shapes the app uses —
//   • NormalizedTrade  (src/lib/brokers/types.ts)  — the broker contract
//   • LegacyTrade      (src/data/trades.ts)        — what useTrades / the journal renders
// The engine core (matching/, structure/, reconstruction/, delivery/, pipeline) NEVER changes.
// If the journal schema changes, edit ONLY this file.
// ─────────────────────────────────────────────────────────────────────────────
import { CanonicalTrade, EquityEvent } from '../types';

// ── target shapes (mirror the existing app types) ───────────────────────────
export interface NormalizedTrade {
  external_id: string;
  broker_id: string;
  account_label: string | null;
  source_type: 'api_sync' | 'csv_import' | 'manual';
  asset_class: 'crypto' | 'fx' | 'equities' | 'futures' | 'options' | 'other';
  symbol: string;
  direction: 'Long' | 'Short';
  entry: number;
  exit: number;
  stop_loss: number | null;
  size: number;
  leverage: number;
  pnl: number;
  fees: number;
  opened_at: string;
  closed_at: string;
  raw: Record<string, unknown>;
}

// Subset of the legacy Trade that the import path actually fills. id/trade_id are
// assigned by useTrades.importTrades (do NOT renumber here). balance is NOT set here —
// see the balance contract note below.
export interface LegacyTradeDraft {
  date: string;                 // "YYYY-MM-DD HH:mm"
  coin: string;
  direction: 'Long' | 'Short';
  entry: number;
  exit: number | null;
  stopLoss: number | null;
  size: number;                 // base units
  positionSize: number | null;  // notional = size * entry
  leverage: number | null;
  pnl: number | null;
  fees: number;
  // ── R / outcome (the dashboard reads these for R_MODE) ──
  returnR: number | null;       // R-multiple of the trade
  manualR: number | null;       // Tier-1 override mirror (kept in sync with returnR on import)
  manual_r_multiple: number | null;
  risk: number | null;          // risk amount ($) if present
  riskPct: number | null;       // risk %
  winLoss: 'Win' | 'Loss' | 'Break Even';
  orderType?: string;
  comments?: string;
  rules?: boolean | null;
  status: 'open' | 'closed';
  __provenance: {
    broker_id: string;
    account_label: string | null;
    source_type: 'csv_import';
    asset_class: NormalizedTrade['asset_class'];
    external_id: string;
    opened_at: string;
    closed_at: string | null;
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────
const DIR = (d: string): 'Long' | 'Short' => (d === 'short' ? 'Short' : 'Long');

function assetClassOf(t: CanonicalTrade): NormalizedTrade['asset_class'] {
  if (t.assetClass === 'crypto') return 'crypto';
  if (t.assetClass === 'forex') return 'fx';
  if (t.assetClass === 'stock') return 'equities';
  if (t.assetClass === 'futures') return 'futures';
  if (t.assetClass === 'option') return 'options';
  // infer crypto from a quote-pair symbol like BTC/USDT
  if (/\/(USDT|USDC|BUSD|USD|BTC|ETH)$/.test(t.symbol)) return 'crypto';
  return 'other';
}

// to "YYYY-MM-DD HH:mm" (legacy display format), from ISO. Empty stays empty.
function toLegacyDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// deterministic external_id (FNV-1a) — matches the app's existing idempotency style
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
function externalId(t: CanonicalTrade, brokerId: string, account: string | null): string {
  if (t.externalIds && t.externalIds.length) return t.externalIds.slice().sort().join('|');
  return fnv1a([brokerId, account || '', t.entryDate, t.entryPrice, t.exitPrice ?? '', t.pnl ?? '', t.quantity ?? '', t.symbol, t.direction].join(':'));
}

// ── public API ────────────────────────────────────────────────────────────────
export interface AdapterOptions {
  brokerId?: string;            // e.g. 'bybit' | 'blink' | 'orca' ; default 'import'
  accountLabel?: string | null;
}

export function toNormalizedTrade(t: CanonicalTrade, opts: AdapterOptions = {}): NormalizedTrade {
  const brokerId = opts.brokerId || 'import';
  const account = opts.accountLabel ?? null;
  return {
    external_id: externalId(t, brokerId, account),
    broker_id: brokerId,
    account_label: account,
    source_type: 'csv_import',
    asset_class: assetClassOf(t),
    symbol: t.symbol,
    direction: DIR(t.direction),
    entry: t.entryPrice,
    exit: t.exitPrice ?? t.entryPrice,         // open positions: exit unknown — see note
    stop_loss: t.stopLoss ?? null,
    size: t.quantity ?? 0,
    leverage: t.leverage ?? 1,
    pnl: t.pnl ?? 0,
    fees: t.commission ?? 0,
    opened_at: t.entryDate,
    closed_at: t.exitDate ?? '',
    raw: { symbolRaw: t.symbolRaw, derivedFields: t.derivedFields, warnings: t.warnings, unitsMode: t.unitsMode, liquidated: t.liquidated, fills: t.fills?.length ?? 0 },
  };
}

export function toLegacyTrade(t: CanonicalTrade, opts: AdapterOptions = {}): LegacyTradeDraft {
  const brokerId = opts.brokerId || 'import';
  const account = opts.accountLabel ?? null;
  const rMult = t.rMultiple ?? null;
  const basis = (t.pnl != null && t.pnl !== 0) ? t.pnl : (rMult != null ? rMult : null);
  const winLoss: 'Win' | 'Loss' | 'Break Even' = basis == null ? 'Break Even' : basis > 0 ? 'Win' : basis < 0 ? 'Loss' : 'Break Even';

  return {
    date: toLegacyDate(t.entryDate),
    coin: t.symbol,
    direction: DIR(t.direction),
    entry: t.entryPrice,
    exit: t.exitPrice ?? null,
    stopLoss: t.stopLoss ?? null,
    size: t.quantity ?? 0,
    positionSize: t.positionSize ?? (t.quantity != null ? t.entryPrice * t.quantity : null),
    leverage: t.leverage ?? null,
    pnl: t.pnl ?? null,
    fees: t.commission ?? 0,
    returnR: rMult,
    manualR: rMult,
    manual_r_multiple: rMult,
    risk: t.riskAmount ?? null,
    riskPct: (t as any).riskPercent ?? null,
    winLoss,
    orderType: undefined,
    comments: t.notes || '',                   // includes the [ייבוא] notes-overflow (commission etc.)
    rules: null,
    status: t.status,
    __provenance: {
      broker_id: brokerId,
      account_label: account,
      source_type: 'csv_import',
      asset_class: assetClassOf(t),
      external_id: externalId(t, brokerId, account),
      opened_at: t.entryDate,
      closed_at: t.exitDate ?? null,
    },
  };
}

// ── BALANCE CONTRACT (read the big note in the instructions) ───────────────────
// EquityEvents carry balances/cash that were READ FROM THE FILE. They are NEVER fabricated.
// Hand these to the equity store as-is. Do NOT replace them with a 0-based cumulative curve.
export interface EquityPoint { date: string; balance: number; source: 'file'; }
export function toEquityPoints(events: EquityEvent[]): EquityPoint[] {
  return events
    .filter(e => e.type === 'balance_snapshot')
    .map(e => ({ date: e.date, balance: e.amount, source: 'file' as const }));
}
