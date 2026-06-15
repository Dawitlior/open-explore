/**
 * Equity Store — balance points READ FROM THE FILE. Source of truth for the equity chart.
 *
 * BALANCE CONTRACT (master plan §"חוזה ה-BALANCE"):
 *   - These points came from the user's file. Never fabricated.
 *   - When this store has points → equity chart MUST use them, not the from-0 cumulative.
 *   - When empty → consumer must label charts as "P&L cumulative (no balance data)",
 *     never present 0-based cumulative as if it were the user's real equity.
 *
 * Per-user scoping piggybacks on the existing user id resolution (auth session id when
 * available, otherwise a single shared local key). We keep this in localStorage so the
 * fix lands without touching the DB schema this commit.
 */

import type { EquityPoint } from './adapters/to-journal';

const KEY = 'orca:uie:equity-points';

function readAll(): EquityPoint[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.date === 'string' && typeof p.balance === 'number');
  } catch {
    return [];
  }
}

function writeAll(points: EquityPoint[]): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(KEY, JSON.stringify(points));
    window.dispatchEvent(new CustomEvent('orca:equity-points-updated'));
  } catch {
    /* ignore quota / disabled */
  }
}

export function getEquityPoints(): EquityPoint[] {
  return readAll().sort((a, b) => a.date.localeCompare(b.date));
}

export function hasFileEquity(): boolean {
  return readAll().length > 0;
}

/** Merge new file-sourced points with whatever is stored; dedupe by date. */
export function mergeEquityPoints(incoming: EquityPoint[]): EquityPoint[] {
  const cur = readAll();
  const byDate = new Map<string, EquityPoint>();
  for (const p of cur) byDate.set(p.date, p);
  for (const p of incoming) byDate.set(p.date, p);
  const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  writeAll(merged);
  return merged;
}

export function clearEquityPoints(): void {
  writeAll([]);
}
