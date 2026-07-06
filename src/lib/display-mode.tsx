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
  /** Dataset-health fallback used when the selected unit cannot explain the imported data. */
  recommendation: DisplayModeRecommendation;
}

export interface DisplayModeRecommendation {
  recommendedMode: DisplayMode;
  shouldPrompt: boolean;
  reason: 'r_only_data' | 'money_only_data' | 'r_majority' | 'money_majority' | null;
  rEligibleCount: number;
  moneyValueCount: number;
  totalCount: number;
}

const Ctx = createContext<DisplayModeCtx | null>(null);

/** A trade qualifies for R-Multiple math when stopLoss is a real number. */
export function hasValidStop(t: Trade): boolean {
  return t != null && typeof t.stopLoss === 'number' && isFinite(t.stopLoss) && t.stopLoss !== 0;
}

function finiteNum(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function hasMoneyValue(t: Trade): boolean {
  const pnl = finiteNum(t?.pnl);
  return pnl !== null && Math.abs(pnl) > 1e-9;
}

/** Strict R eligibility: explicit manual/returnR or calculable risk-based R, with no daily proxy. */
export function hasStrictR(t: Trade): boolean {
  const manual = t == null ? null : finiteNum(t.manual_r_multiple ?? t.manualR);
  if (manual !== null) return true;
  const explicitReturnR = t == null ? null : finiteNum(t.returnR);
  if (explicitReturnR !== null && explicitReturnR !== 0) return true;
  const r = getEffectiveR(t, { strict: true });
  const risk = t == null ? null : finiteNum(t.risk);
  return typeof r === 'number' && isFinite(r) && (hasValidStop(t) || (risk !== null && risk > 0));
}

/** Pure selector — apply the active displayMode filter to an arbitrary list. */
export function selectVisibleTrades(trades: Trade[], mode: DisplayMode): Trade[] {
  if (mode === 'MONEY') return trades;
  return trades.filter(hasStrictR);
}

const STORAGE_KEY = 'orca:displayMode';

/** Auto-pick the mode the user most likely wants, based on their data:
 *  more R-eligible trades than not → R_MULTIPLE; otherwise → MONEY.
 *  This is the SINGLE SOURCE OF TRUTH — the platform always follows the
 *  majority of the user's actual trades, never a stale manual override. */
export function autoPickMode(trades: Trade[]): DisplayMode {
  if (!trades || trades.length === 0) return 'R_MULTIPLE';
  let rOk = 0;
  let moneyOk = 0;
  for (const t of trades) if (hasStrictR(t)) rOk++;
  for (const t of trades) if (hasMoneyValue(t)) moneyOk++;
  if (rOk > 0 && moneyOk === 0) return 'R_MULTIPLE';
  if (moneyOk > 0 && rOk === 0) return 'MONEY';
  return rOk > trades.length - rOk ? 'R_MULTIPLE' : 'MONEY';
}

export function getDisplayModeRecommendation(trades: Trade[], currentMode: DisplayMode): DisplayModeRecommendation {
  const totalCount = trades?.length || 0;
  let rEligibleCount = 0;
  let moneyValueCount = 0;
  for (const t of trades || []) {
    if (hasStrictR(t)) rEligibleCount++;
    if (hasMoneyValue(t)) moneyValueCount++;
  }
  const recommendedMode = autoPickMode(trades || []);
  const reason: DisplayModeRecommendation['reason'] =
    recommendedMode === 'R_MULTIPLE' && moneyValueCount === 0 && rEligibleCount > 0 ? 'r_only_data' :
    recommendedMode === 'MONEY' && rEligibleCount === 0 && moneyValueCount > 0 ? 'money_only_data' :
    recommendedMode === 'R_MULTIPLE' && rEligibleCount > totalCount - rEligibleCount ? 'r_majority' :
    recommendedMode === 'MONEY' && totalCount > 0 ? 'money_majority' :
    null;
  const shouldPrompt = totalCount > 0 && currentMode !== recommendedMode && reason !== null;
  return { recommendedMode, shouldPrompt, reason, rEligibleCount, moneyValueCount, totalCount };
}

export function DisplayModeProvider({ trades, children }: { trades: Trade[]; children: ReactNode }) {
  const hasAnyR = useMemo(() => trades.some(hasStrictR), [trades]);
  const locked = !hasAnyR;
  const autoMode = useMemo(() => autoPickMode(trades), [trades]);

  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => autoPickMode(trades));

  // Derive effective mode synchronously — prevents a one-frame flicker on
  // first paint when an effect would otherwise downgrade R_MULTIPLE → MONEY.
  const effectiveMode: DisplayMode = locked ? 'MONEY' : displayMode;

  useEffect(() => {
    if (locked && displayMode !== 'MONEY') setDisplayModeState('MONEY');
  }, [locked, displayMode]);

  // ALWAYS auto-follow the majority of the data. Manual toggles are ephemeral
  // (current render only) — as soon as the trade set changes, the majority
  // wins. Broadcast unconditionally so external consumers (useEffectiveDisplayMode,
  // components outside the provider) re-sync even when the mode didn't change.
  useEffect(() => {
    if (autoMode !== displayMode) setDisplayModeState(autoMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, autoMode);
      window.sessionStorage.setItem(STORAGE_KEY, autoMode);
    } catch { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent('orca:displayMode-changed', { detail: autoMode })); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMode]);

  const setDisplayMode = (m: DisplayMode) => {
    if (locked && m === 'R_MULTIPLE') return; // can't enter R without eligible data
    setDisplayModeState(m);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, m);
      window.localStorage.setItem(STORAGE_KEY, m);
    } catch { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent('orca:displayMode-changed', { detail: m })); } catch { /* noop */ }
  };


  const visibleTrades = useMemo(
    () => selectVisibleTrades(trades, effectiveMode),
    [trades, effectiveMode],
  );
  const recommendation = useMemo(
    () => getDisplayModeRecommendation(trades, effectiveMode),
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
    recommendation,
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
      recommendation: { recommendedMode: 'MONEY', shouldPrompt: false, reason: null, rEligibleCount: 0, moneyValueCount: 0, totalCount: 0 },
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
  // Auto-follow the majority of trades — this is the SINGLE SOURCE OF TRUTH.
  // localStorage is only a fallback for when there are no trades at all.
  const autoMode = useMemo(() => autoPickMode(trades), [trades]);
  const [stored, setStored] = useState<DisplayMode>(autoMode);
  useEffect(() => { setStored(autoMode); }, [autoMode]);
  useEffect(() => {
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<DisplayMode>;
      if (ce.detail === 'MONEY' || ce.detail === 'R_MULTIPLE') setStored(ce.detail);
    };
    window.addEventListener('orca:displayMode-changed', onChange);
    return () => window.removeEventListener('orca:displayMode-changed', onChange);
  }, []);
  const locked = !hasAnyR;
  const displayMode: DisplayMode = locked ? 'MONEY' : stored;
  return { displayMode, isR: displayMode === 'R_MULTIPLE', isMoney: displayMode === 'MONEY', locked };
}
