/**
 * Portfolio exposure derived from `public.open_positions` (live broker mirror).
 * If there are no open positions (manual journal), exposure is reported as 0
 * and the UI shows a "no live positions" hint.
 */
import { supabase } from '@/integrations/supabase/client';

export interface OpenPositionRow {
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  unrealized_pnl: number;
  provider: string;
}

export interface ExposureSummary {
  positions: OpenPositionRow[];
  /** Σ |size × entry| */
  grossNotional: number;
  /** Σ signed (long − short) */
  netNotional: number;
  /** gross / equity */
  leverage: number;
  /** Σ unrealized P&L */
  unrealized: number;
  /** Top symbol share of gross (0-1) */
  topConcentration: number;
  topSymbol: string | null;
}

export async function fetchOpenPositions(userId: string): Promise<OpenPositionRow[]> {
  const { data, error } = await supabase
    .from('open_positions')
    .select('symbol, side, size, entry_price, unrealized_pnl, provider')
    .eq('user_id', userId);
  if (error || !data) return [];
  return data as OpenPositionRow[];
}

export function summarizeExposure(rows: OpenPositionRow[], equity: number): ExposureSummary {
  let gross = 0, net = 0, unr = 0;
  const bySymbol = new Map<string, number>();
  for (const p of rows) {
    const notional = Math.abs(Number(p.size) * Number(p.entry_price));
    const signed = (String(p.side).toLowerCase().startsWith('s') ? -1 : 1) * notional;
    gross += notional;
    net += signed;
    unr += Number(p.unrealized_pnl) || 0;
    bySymbol.set(p.symbol, (bySymbol.get(p.symbol) || 0) + notional);
  }
  let topSymbol: string | null = null;
  let topNotional = 0;
  for (const [s, n] of bySymbol) {
    if (n > topNotional) { topNotional = n; topSymbol = s; }
  }
  return {
    positions: rows,
    grossNotional: gross,
    netNotional: net,
    unrealized: unr,
    leverage: equity > 0 ? gross / equity : 0,
    topConcentration: gross > 0 ? topNotional / gross : 0,
    topSymbol,
  };
}
