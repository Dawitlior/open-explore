// Tiny global unit context for the Weekly Review subtree.
// Persists to localStorage so the toggle survives reloads.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ReviewUnit = 'R' | 'USD';

interface Ctx {
  unit: ReviewUnit;
  setUnit: (u: ReviewUnit) => void;
  /** True when the active unit is USD — convenient gate. */
  isUSD: boolean;
}

const KEY = 'orca.weekly-review.unit';
const UnitCtx = createContext<Ctx>({ unit: 'R', setUnit: () => {}, isUSD: false });

export const useReviewUnit = () => useContext(UnitCtx);

export function ReviewUnitProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<ReviewUnit>(() => {
    if (typeof window === 'undefined') return 'R';
    const stored = window.localStorage.getItem(KEY);
    return stored === 'USD' ? 'USD' : 'R';
  });

  useEffect(() => {
    try { window.localStorage.setItem(KEY, unit); } catch { /* ignore quota */ }
  }, [unit]);

  const setUnit = useCallback((u: ReviewUnit) => setUnitState(u), []);

  return (
    <UnitCtx.Provider value={{ unit, setUnit, isUSD: unit === 'USD' }}>
      {children}
    </UnitCtx.Provider>
  );
}

/** Formatters used everywhere — keep output consistent across tabs/charts. */
export function fmtR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}
export function fmtUSD(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  const s = abs >= 1000
    ? abs.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : abs.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${v < 0 ? '-' : v > 0 ? '+' : ''}$${s}`;
}
export function fmtUnit(n: number, unit: ReviewUnit) {
  return unit === 'USD' ? fmtUSD(n) : fmtR(n);
}
