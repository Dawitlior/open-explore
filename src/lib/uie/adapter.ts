// UIE v1.2 — Phase 4 · D1 · Adapter: CanonicalTrade → NormalizedTrade.
// The ONLY place that translates the rich UIE shape into the broker-agnostic
// NormalizedTrade row persisted to public.trades. Keeps a verbatim copy in
// `raw` for forensic replay.

import type { CanonicalTrade } from './canonical-trade';
import type { NormalizedTrade } from '../brokers/types';

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') { const n = parseFloat(v); if (Number.isFinite(n)) return n; }
  return fallback;
}

function toIso(v: unknown): string {
  if (v == null) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  if (!s) return new Date().toISOString();
  // CanonicalTrade dates are "YYYY-MM-DD HH:mm"
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export interface AdapterOptions {
  brokerId: string;
  accountLabel?: string | null;
  /** asset_class default; consumers can override per-row. */
  defaultAssetClass?: NormalizedTrade['asset_class'];
  sourceType?: NormalizedTrade['source_type'];
}

export function canonicalToNormalized(
  ct: CanonicalTrade,
  opts: AdapterOptions,
): NormalizedTrade | null {
  const symbol = String(ct.symbol ?? '').trim();
  const direction = (ct.direction === 'Short' ? 'Short' : 'Long') as 'Long' | 'Short';
  const entry = num(ct.entry ?? ct.avgEntry);
  const exit = num(ct.exit ?? ct.avgExit);
  // Drop rows that have nothing usable.
  if (!symbol && entry === 0 && exit === 0) return null;

  const externalId = String(ct.externalId ?? `${symbol}-${ct.entryDate ?? ct.date ?? Date.now()}`).slice(0, 200);
  const stopLossRaw = ct.stopLoss;
  const stop_loss = typeof stopLossRaw === 'number' && Number.isFinite(stopLossRaw) ? stopLossRaw : null;

  const fees = num(ct.fees ?? ct.feeTotal);
  const pnl = num(ct.pnl ?? ct.realizedPnl);

  return {
    external_id: externalId,
    broker_id: opts.brokerId,
    account_label: opts.accountLabel ?? null,
    source_type: opts.sourceType ?? 'file',
    asset_class: opts.defaultAssetClass ?? 'crypto',
    symbol: symbol || 'UNKNOWN',
    direction,
    entry,
    exit,
    stop_loss,
    size: num(ct.positionSize ?? ct.maxOpenSize),
    leverage: num(ct.leverage, 1),
    pnl,
    fees,
    opened_at: toIso(ct.entryDate ?? ct.date),
    closed_at: toIso(ct.exitDate ?? ct.date),
    raw: { ...ct } as Record<string, unknown>,
  };
}

export function canonicalBatchToNormalized(
  trades: CanonicalTrade[],
  opts: AdapterOptions,
): NormalizedTrade[] {
  const out: NormalizedTrade[] = [];
  for (const ct of trades) {
    const n = canonicalToNormalized(ct, opts);
    if (n) out.push(n);
  }
  return out;
}
