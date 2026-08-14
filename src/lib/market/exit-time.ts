/**
 * Exit-time resolution for trade replay.
 * Most imported trades only carry an entry timestamp. We therefore:
 *  1. use a user-supplied exit time when one was pinned (persisted locally), else
 *  2. infer it from the first candle after entry whose range touches the exit price.
 */
import type { Candle } from './use-trade-candles';

const KEY = 'orca:exitTime:v1';

type Map_ = Record<string, number>; // tradeId -> unix ms

function read(): Map_ {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Map_) : {};
  } catch { return {}; }
}

export function getExitTimeOverride(tradeId: number | string): number | null {
  const v = read()[String(tradeId)];
  return Number.isFinite(v) ? v : null;
}

/** Exit timestamp recorded on the trade itself (from the add/edit trade form). */
export function tradeExitMs(exitDate?: string | null): number | null {
  if (!exitDate) return null;
  const ms = new Date(exitDate).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function setExitTimeOverride(tradeId: number | string, ms: number | null) {
  try {
    const map = read();
    if (ms == null || !Number.isFinite(ms)) delete map[String(tradeId)];
    else map[String(tradeId)] = ms;
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* storage disabled */ }
}

/**
 * Direction-aware, forward-only, bounded inference (unix seconds).
 *
 * Long  → first candle at/after entry whose `low  <= exitPrice`.
 * Short → first candle at/after entry whose `high >= exitPrice`.
 *
 * Display-only: the result is never written back to the trade record, and it is
 * recomputed per interval (5m and 1h legitimately land on different bars).
 * Returns `null` (→ `unknown`) when nothing is touched within `maxBars`.
 */
export function inferExitTime(
  candles: Candle[] | null,
  exit: number,
  entryMs: number,
  isLong = true,
  maxBars = 500,
): number | null {
  if (!candles?.length || !Number.isFinite(exit) || exit <= 0) return null;
  const entrySec = Math.floor(entryMs / 1000);
  let scanned = 0;
  for (const c of candles) {
    if (c.time < entrySec) continue;
    if (++scanned > maxBars) return null;
    if (isLong ? c.low <= exit : c.high >= exit) return c.time;
  }
  return null;
}


/** `2026-08-07T16:40` value for <input type="datetime-local"> in local time. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
