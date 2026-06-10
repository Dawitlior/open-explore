import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Trade } from '@/data/trades';
import { getEffectiveR } from '@/lib/r-multiple';

/* ============================================================
 *  DUAL-CURRENCY ENGINE — Global displayMode state
 *  ----------------------------------------------------------
 *  Drives every dashboard view between fiat-money ($) and
 *  expectancy-in-R (R-Multiple) without touching chart code.
 *  Trades imported via CSV carry `stopLoss: null` and are
 *  excluded from R-Multiple computations on purpose.
 * ============================================================ */

export type DisplayMode = 'MONEY' | 'R_MULTIPLE';

interface DisplayModeCtx {
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  /** True when at least one trade has a real stop-loss. */
  hasAnyR: boolean;
  /** True when toggle should be locked in MONEY (no R-eligible rows). */
  locked: boolean;
  /** Filtered trades to feed the dashboard for the current mode. */
  visibleTrades: Trade[];
  /** Count of trades hidden by the R filter (for the * hint). */
  hiddenCount: number;
  /** Total trades regardless of mode. */
  totalCount: number;
}

const Ctx = createContext<DisplayModeCtx | null>(null);

/** A trade qualifies for R-Multiple math when stopLoss is a real number. */
export function hasValidStop(t: Trade): boolean {
  return t != null && typeof t.stopLoss === 'number' && isFinite(t.stopLoss) && t.stopLoss !== 0;
}

/** Strict R eligibility: real stop-loss plus a non-synthetic R result. */
export function hasStrictR(t: Trade): boolean {
  return hasValidStop(t) && getEffectiveR(t, { strict: true }) !== null;
}

/** Pure selector — apply the active displayMode filter to an arbitrary list. */
export function selectVisibleTrades(trades: Trade[], mode: DisplayMode): Trade[] {
  if (mode === 'MONEY') return trades;
  return trades.filter(hasStrictR);
}

const STORAGE_KEY = 'orca:displayMode';

export function DisplayModeProvider({ trades, children }: { trades: Trade[]; children: ReactNode }) {
  const hasAnyR = useMemo(() => trades.some(hasStrictR), [trades]);
  const locked = !hasAnyR;

  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    if (typeof window === 'undefined') return 'R_MULTIPLE';
    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached === 'MONEY' || cached === 'R_MULTIPLE') return cached;
    } catch { /* ignore */ }
    return 'R_MULTIPLE';
  });

  // Derive effective mode synchronously — prevents a one-frame flicker on
  // first paint when an effect would otherwise downgrade R_MULTIPLE → MONEY.
  const effectiveMode: DisplayMode = locked ? 'MONEY' : displayMode;

  // Persist the reconciled state back to React state so consumers that read
  // `displayMode` (rather than the derived value) eventually converge.
  useEffect(() => {
    if (locked && displayMode !== 'MONEY') setDisplayModeState('MONEY');
  }, [locked, displayMode]);

  const setDisplayMode = (m: DisplayMode) => {
    if (locked && m === 'R_MULTIPLE') return; // can't enter R without eligible data
    setDisplayModeState(m);
    try { window.localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  };

  const visibleTrades = useMemo(
    () => selectVisibleTrades(trades, effectiveMode),
    [trades, effectiveMode],
  );

  const value: DisplayModeCtx = {
    displayMode: effectiveMode,
    setDisplayMode,
    hasAnyR,
    locked,
    visibleTrades,
    hiddenCount: Math.max(0, trades.length - visibleTrades.length),
    totalCount: trades.length,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDisplayMode(): DisplayModeCtx {
  const v = useContext(Ctx);
  if (!v) {
    // Safe fallback if a consumer renders outside the provider tree.
    return {
      displayMode: 'MONEY',
      setDisplayMode: () => undefined,
      hasAnyR: false,
      locked: true,
      visibleTrades: [],
      hiddenCount: 0,
      totalCount: 0,
    };
  }
  return v;
}

/** Hebrew/English hint shown in R mode when some trades are filtered out. */
export function buildHiddenHint(hiddenCount: number, totalCount: number, isRTL: boolean): string | null {
  if (hiddenCount <= 0) return null;
  const shown = totalCount - hiddenCount;
  return isRTL
    ? `* מציג ${shown} מתוך ${totalCount} עסקאות (עסקאות ללא סיכון מוגדר הוסתרו)`
    : `* Showing ${shown} of ${totalCount} trades (entries without a defined stop are hidden)`;
}
