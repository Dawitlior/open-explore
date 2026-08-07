import { useEffect, useRef, useState } from 'react';
import type { Interval } from './symbol-resolver';

export interface Candle {
  time: number; // unix seconds
  open: number; high: number; low: number; close: number; volume: number;
}

const MEM = new Map<string, Candle[]>();
const MAX_ENTRIES = 40;

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-candles`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const MS: Record<Interval, number> = {
  '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
};

export interface CandleWindow { startTime: number; endTime: number }

/** Frame the trade with ~35% padding on each side, minimum 60 bars. */
export function frameWindow(tradeStart: number, tradeEnd: number, interval: Interval): CandleWindow {
  const step = MS[interval];
  const span = Math.max(tradeEnd - tradeStart, step * 10);
  const pad = Math.max(span * 0.35, step * 25);
  return { startTime: tradeStart - pad, endTime: tradeEnd + pad };
}

export interface CandleState {
  candles: Candle[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches OHLC candles for a trade window through the market-candles backend
 * function. Results are memoised per symbol|interval|window so paging between
 * trades (or reopening the same one) costs zero requests.
 */
export function useTradeCandles(
  klineSymbol: string | null,
  interval: Interval,
  win: CandleWindow | null,
  enabled: boolean,
): CandleState {
  const [state, setState] = useState<CandleState>({ candles: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const key = klineSymbol && win
    ? `${klineSymbol}|${interval}|${Math.floor(win.startTime / 60000)}|${Math.floor(win.endTime / 60000)}`
    : '';

  useEffect(() => {
    if (!enabled || !klineSymbol || !win) return;

    const cached = MEM.get(key);
    if (cached) { setState({ candles: cached, loading: false, error: null }); return; }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setState({ candles: null, loading: true, error: null });

    const qs = new URLSearchParams({
      symbol: klineSymbol,
      interval,
      startTime: String(Math.floor(win.startTime)),
      endTime: String(Math.floor(win.endTime)),
      limit: '500',
    });

    fetch(`${FN_URL}?${qs}`, {
      signal: ac.signal,
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    })
      .then(r => r.json())
      .then((body: { candles?: Candle[]; error?: string }) => {
        if (ac.signal.aborted) return;
        const candles = Array.isArray(body.candles) ? body.candles : [];
        if (!candles.length) {
          setState({ candles: [], loading: false, error: body.error ?? 'no-data' });
          return;
        }
        if (MEM.size >= MAX_ENTRIES) MEM.delete(MEM.keys().next().value as string);
        MEM.set(key, candles);
        setState({ candles, loading: false, error: null });
      })
      .catch(err => {
        if (ac.signal.aborted) return;
        setState({ candles: null, loading: false, error: err?.message ?? 'network error' });
      });

    return () => ac.abort();
  }, [key, enabled, klineSymbol, interval]);

  return state;
}
