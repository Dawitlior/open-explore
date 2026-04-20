import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

export type WidgetId =
  | 'equity-curve'
  | 'pnl-bars'
  | 'r-distribution'
  | 'orca-radar'
  | 'direction-pie'
  | 'confidence-scatter'
  | 'drawdown'
  | 'win-rate'
  | 'expectancy'
  | 'profit-factor';

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
}

export interface CustomKPI {
  id: string;
  label: string;
  // Formula uses tokens: totalTrades, wins, losses, winRate, totalPnl,
  // avgWin, avgLoss, expectancy, profitFactor, maxDrawdown, totalR
  formula: string;
  format: 'number' | 'currency' | 'percent' | 'r-multiple';
  color?: string;
}

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'equity-curve', visible: true },
  { id: 'pnl-bars', visible: true },
  { id: 'r-distribution', visible: true },
  { id: 'orca-radar', visible: true },
  { id: 'direction-pie', visible: true },
  { id: 'confidence-scatter', visible: true },
  { id: 'drawdown', visible: true },
];

const DEFAULT_KPIS: CustomKPI[] = [];

export const WIDGET_LABELS: Record<WidgetId, { he: string; en: string }> = {
  'equity-curve': { he: 'עקומת הון', en: 'Equity Curve' },
  'pnl-bars': { he: 'P&L יומי', en: 'Daily P&L' },
  'r-distribution': { he: 'התפלגות R', en: 'R-Distribution' },
  'orca-radar': { he: 'Orca Radar', en: 'Orca Radar' },
  'direction-pie': { he: 'Long/Short', en: 'Direction Pie' },
  'confidence-scatter': { he: 'ביטחון מול תוצאה', en: 'Confidence vs Outcome' },
  'drawdown': { he: 'Drawdown', en: 'Drawdown' },
  'win-rate': { he: 'אחוז זכייה', en: 'Win Rate' },
  'expectancy': { he: 'תוחלת', en: 'Expectancy' },
  'profit-factor': { he: 'Profit Factor', en: 'Profit Factor' },
};

export function useDashboardConfig() {
  const [layout, setLayoutState] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [kpis, setKpisState] = useState<CustomKPI[]>(DEFAULT_KPIS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting<WidgetConfig[]>('dashboardLayout'),
      getSetting<CustomKPI[]>('customKpis'),
    ]).then(([l, k]) => {
      if (l && Array.isArray(l) && l.length > 0) {
        // Merge: keep saved order/visibility, add any new defaults missing
        const savedIds = new Set(l.map(w => w.id));
        const merged = [...l, ...DEFAULT_LAYOUT.filter(w => !savedIds.has(w.id))];
        setLayoutState(merged);
      }
      if (k && Array.isArray(k)) setKpisState(k);
      setLoaded(true);
    });
  }, []);

  const setLayout = useCallback((l: WidgetConfig[]) => {
    setLayoutState(l);
    setSetting('dashboardLayout', l);
  }, []);

  const setKpis = useCallback((k: CustomKPI[]) => {
    setKpisState(k);
    setSetting('customKpis', k);
  }, []);

  const toggleWidget = useCallback((id: WidgetId) => {
    setLayoutState(prev => {
      const next = prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
      setSetting('dashboardLayout', next);
      return next;
    });
  }, []);

  const moveWidget = useCallback((fromIdx: number, toIdx: number) => {
    setLayoutState(prev => {
      if (fromIdx < 0 || fromIdx >= prev.length || toIdx < 0 || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      setSetting('dashboardLayout', next);
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayoutState(DEFAULT_LAYOUT);
    setSetting('dashboardLayout', DEFAULT_LAYOUT);
  }, []);

  const isWidgetVisible = useCallback((id: WidgetId) => {
    const w = layout.find(x => x.id === id);
    return w ? w.visible : true;
  }, [layout]);

  return {
    layout, setLayout, toggleWidget, moveWidget, resetLayout, isWidgetVisible,
    kpis, setKpis,
    loaded,
  };
}

// Safe formula evaluator — only allows whitelisted variables and basic math.
// Returns null on any error.
const ALLOWED_TOKENS = new Set([
  'totalTrades', 'wins', 'losses', 'breakEven', 'winRate', 'totalPnl',
  'avgWin', 'avgLoss', 'expectancy', 'profitFactor', 'maxDrawdown',
  'totalR', 'avgR', 'bestTrade', 'worstTrade',
  'Math', 'abs', 'min', 'max', 'round', 'floor', 'ceil', 'sqrt', 'pow',
]);

export function evalCustomKPI(formula: string, ctx: Record<string, number>): number | null {
  try {
    // Strip whitespace, validate identifiers
    const ids = formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    for (const id of ids) {
      if (!ALLOWED_TOKENS.has(id) && !(id in ctx)) return null;
    }
    // Disallow assignment, semicolons, etc.
    if (/[;={}]|=>|\bfunction\b|\breturn\b|\bnew\b/.test(formula)) return null;
    // eslint-disable-next-line no-new-func
    const fn = new Function(...Object.keys(ctx), `"use strict"; return (${formula});`);
    const result = fn(...Object.values(ctx));
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
