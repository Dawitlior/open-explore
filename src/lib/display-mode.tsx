import { createContext, useContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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

/** Strict R eligibility: any trade whose R can be resolved through the
 *  centralized engine — manual override, trusted `returnR`, pnl / risk$,
 *  or calculable stop-based R. Trades imported with only an R value
 *  (no stop-loss, no $ P&L) still qualify, so auto-mode correctly
 *  flips to R_MULTIPLE for R-only portfolios. */
export function hasStrictR(t: Trade): boolean {
  if (t == null) return false;
  const manual = Number(t.manual_r_multiple ?? t.manualR);
  if (Number.isFinite(manual)) return true;
  const rr = Number((t as { returnR?: number | null }).returnR);
  if (Number.isFinite(rr) && rr !== 0) return true;
  const r = getEffectiveR(t, { strict: true });
  return typeof r === 'number' && isFinite(r);
}

/** Pure selector — apply the active displayMode filter to an arbitrary list. */
export function selectVisibleTrades(trades: Trade[], mode: DisplayMode): Trade[] {
  if (mode === 'MONEY') return trades;
  return trades.filter(hasStrictR);
}

const STORAGE_KEY = 'orca:displayMode';
const PREFERENCE_KEY = 'orca:displayModePreference';

function isDisplayMode(v: unknown): v is DisplayMode {
  return v === 'MONEY' || v === 'R_MULTIPLE';
}

function readMode(key: string): DisplayMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const sessionValue = window.sessionStorage.getItem(key);
    if (isDisplayMode(sessionValue)) return sessionValue;
    const localValue = window.localStorage.getItem(key);
    if (isDisplayMode(localValue)) return localValue;
  } catch { /* ignore */ }
  return null;
}

function writeMode(key: string, mode: DisplayMode) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, mode);
    window.localStorage.setItem(key, mode);
  } catch { /* ignore */ }
}

function broadcastMode(mode: DisplayMode) {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent('orca:displayMode-changed', { detail: mode })); } catch { /* noop */ }
}

function resolveDisplayMode(trades: Trade[], locked: boolean): DisplayMode {
  if (locked) return 'MONEY';
  const savedPreference = readMode(PREFERENCE_KEY);
  if (savedPreference) return savedPreference;
  // Backward compatibility: the old key was also auto-written on hydration,
  // so only honor a legacy R value. Legacy MONEY is ignored when data supports R
  // to prevent refreshes from getting stuck in money mode forever.
  const legacyMode = readMode(STORAGE_KEY);
  if (legacyMode === 'R_MULTIPLE') return 'R_MULTIPLE';
  return autoPickMode(trades);
}

/** Auto-pick the mode the user most likely wants, based on their data:
 *  more R-eligible trades than not → R_MULTIPLE; otherwise → MONEY.
 *  This is the SINGLE SOURCE OF TRUTH — the platform always follows the
 *  majority of the user's actual trades, never a stale manual override. */
export function autoPickMode(trades: Trade[]): DisplayMode {
  if (!trades || trades.length === 0) return 'R_MULTIPLE';
  let rOk = 0;
  for (const t of trades) if (hasStrictR(t)) rOk++;
  const moneyOnly = trades.length - rOk;
  return rOk > moneyOnly ? 'R_MULTIPLE' : 'MONEY';
}

export function DisplayModeProvider({ trades, children }: { trades: Trade[]; children: ReactNode }) {
  const hasAnyR = useMemo(() => trades.some(hasStrictR), [trades]);
  const locked = !hasAnyR;

  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => resolveDisplayMode(trades, locked));

  // Derive effective mode synchronously — prevents a one-frame flicker on
  // first paint when an effect would otherwise downgrade R_MULTIPLE → MONEY.
  const effectiveMode: DisplayMode = locked ? 'MONEY' : displayMode;

  useEffect(() => {
    if (locked && displayMode !== 'MONEY') setDisplayModeState('MONEY');
  }, [locked, displayMode]);

  // Resolve on hydration / portfolio changes. A manual choice persists across
  // refreshes; without one, the platform still auto-detects the best mode.
  useEffect(() => {
    const nextMode = resolveDisplayMode(trades, locked);
    if (nextMode !== displayMode) setDisplayModeState(nextMode);
    writeMode(STORAGE_KEY, nextMode);
    broadcastMode(nextMode);
  }, [trades, locked, displayMode]);

  const setDisplayMode = useCallback((m: DisplayMode) => {
    if (locked && m === 'R_MULTIPLE') return; // can't enter R without eligible data
    setDisplayModeState(m);
    writeMode(PREFERENCE_KEY, m);
    writeMode(STORAGE_KEY, m);
    broadcastMode(m);
  }, [locked]);


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

/**
 * useEffectiveDisplayMode — context-free reader of the active display mode.
 * Works in components that render OUTSIDE DisplayModeProvider's subtree
 * (e.g. Index.tsx body where the provider lives further down). Stays in sync
 * via the custom `orca:displayMode-changed` event dispatched by setDisplayMode.
 *
 * Pass `trades` to enforce the same "lock to MONEY when no R-eligible rows"
 * rule as the provider, so the two stay aligned.
 */
export function useEffectiveDisplayMode(trades: Trade[]): {
  displayMode: DisplayMode;
  isR: boolean;
  isMoney: boolean;
  locked: boolean;
} {
  const hasAnyR = useMemo(() => trades.some(hasStrictR), [trades]);
  const [stored, setStored] = useState<DisplayMode>(() => resolveDisplayMode(trades, !hasAnyR));
  useEffect(() => { setStored(resolveDisplayMode(trades, !hasAnyR)); }, [trades, hasAnyR]);
  useEffect(() => {
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<DisplayMode>;
      if (isDisplayMode(ce.detail)) setStored(ce.detail);
    };
    window.addEventListener('orca:displayMode-changed', onChange);
    return () => window.removeEventListener('orca:displayMode-changed', onChange);
  }, []);
  const locked = !hasAnyR;
  const displayMode: DisplayMode = locked ? 'MONEY' : stored;
  return { displayMode, isR: displayMode === 'R_MULTIPLE', isMoney: displayMode === 'MONEY', locked };
}
