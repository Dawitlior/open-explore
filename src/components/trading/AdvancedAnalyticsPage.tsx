/**
 * 📊 ADVANCED ANALYTICS PAGE — "The Mission Control"
 * ────────────────────────────────────────────────────────────────
 * Premium Hebrew-only analytics deck. Designed as the visual flagship
 * alongside the AI Mainframe, with a different identity:
 *
 *   • Hero KPI grid (8 ultra-dense tiles)
 *   • Equity vs Drawdown overlay (composed)
 *   • R-multiple distribution heatmap
 *   • Monthly heat tiles (calendar feel)
 *   • Day-of-week × Hour matrix
 *   • Setup leaderboard (sortable)
 *   • Risk-vs-reward scatter
 *   • Streak ladder
 *   • Edge decay sparkline
 *   • Direction split radial
 *
 * 100% Hebrew copy. Heebo font. RTL.
 */

import { useMemo, useState, lazy, Suspense, memo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ComposedChart, RadialBarChart, RadialBar, PolarAngleAxis,
  Legend, ReferenceLine,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import type { OperatingMode } from '@/hooks/use-settings';
import { GlassCard } from './TradingUI';
import type { ChartExplanation } from './ChartWrapper';
import type { ChartSpec } from '@/lib/chart-registry';
import { useLang } from '@/hooks/use-lang';
import { RProxyBanner } from './RProxyBanner';
import { getEffectiveR, sumDailyR } from '@/lib/r-multiple';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { useChartGuard } from '@/lib/dashboard-engine';
const AnalyticsQuantLab = lazy(() => import('./AnalyticsQuantLab').then(m => ({ default: m.AnalyticsQuantLab })));
import { TimeSeriesPerfMatrix } from './TimeSeriesPerfMatrix';
import { UltimateAnalyticsDeck } from './UltimateDeckCharts';
import { useEntitlement } from '@/hooks/use-entitlement';
import DashboardAdvancedLab from '@/components/dashboard/DashboardAdvancedLab';
import { useIsMobile } from '@/hooks/use-mobile';

import { RiskAdjustedRatiosSection } from '@/components/dashboard/RiskAdjustedRatiosSection';


interface AdvancedAnalyticsPageProps {
  T: TradingTheme;
  isRTL: boolean;
  isAlpha: boolean;
  /** Operating context: beginner | live (standard) | review | research */
  operatingMode?: OperatingMode;
  trades: Trade[];
  stats: TradingStats;
  privacyMode: boolean;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
  /**
   * Phase 2 — registry-driven allowlist for this surface.
   * When provided, only charts whose `id` is in the list are rendered.
   * Absent ⇒ legacy behavior (all charts that pass the local tier gates).
   */
  registryCharts?: ChartSpec[];
}

const HEB_DOW = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const ENG_DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HEB_DOW_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const ENG_DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AdvancedAnalyticsPage_Impl = ({ T, trades: _allTrades, stats, privacyMode, isAlpha, operatingMode = 'live', registryCharts, onExplainClick }: AdvancedAnalyticsPageProps) => {
  // Phase 3 dev-only invariant — warns if a non-canonical chart is rendered here.
  useChartGuard('analytics');
  // Registry guard — permissive when prop absent (legacy callers).
  const registryAllows = (id: string) =>
    !registryCharts || registryCharts.some(c => c.id === id);
  const { t, isRTL: langRTL } = useLang();
  // 🔀 Dual-Currency Engine: filtered dataset + adaptive axis/format helpers
  const { visibleTrades: trades, isMoney, formatAxis: fmtAxis, formatValue: fmtVal, rEligibleCount, totalCount } = useVisibleTrades(_allTrades);
  const { tier: appTier } = useEntitlement();
  const DOW = langRTL ? HEB_DOW : ENG_DOW;
  const DOW_FULL = langRTL ? HEB_DOW_FULL : ENG_DOW_FULL;
  // SaaS tier resolution — Standard → core · Advanced → pro · Ultimate → max.
  const tier: 'core' | 'pro' | 'max' = appTier === 'ultimate' ? 'max' : appTier === 'advanced' ? 'pro' : 'core';
  const showPro = tier === 'pro' || tier === 'max';
  const showMax = tier === 'max';
  const showCore = true;
  const isMobile = useIsMobile();

  const tt = {
    background: T.bg.card,
    border: `1px solid ${T.border.medium}`,
    borderRadius: 10,
    color: T.text.primary,
    fontSize: 12,
    boxShadow: T.shadow.elevated,
    padding: '8px 12px',
  };

  const [sortKey, setSortKey] = useState<'pnl' | 'exp' | 'wr' | 'n'>('pnl');

  /* ─────────── DERIVED DATA ─────────── */

  const tradesByDay = useMemo(() => {
    const byDay = new Map<string, Trade[]>();
    for (const tr of trades) {
      const key = (tr.date || '').slice(0, 10);
      if (!key) continue;
      const list = byDay.get(key) || [];
      list.push(tr);
      byDay.set(key, list);
    }
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [trades]);

  // 1. Equity & drawdown overlay — carries BOTH cumulative R and cumulative fiat
  //    so the chart can swap dataKey at render time based on displayMode.
  const equityDD = useMemo(() => {
    let cumR = 0, cumPnl = 0, peak = 0, peakMoney = 0;
    return tradesByDay.map(([day, dayTrades], i) => {
      const { total } = sumDailyR(dayTrades);
      const dayPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
      cumR += total;
      cumPnl += dayPnl;
      if (cumR > peak) peak = cumR;
      if (cumPnl > peakMoney) peakMoney = cumPnl;
      const ddR = peak > 0 ? -((peak - cumR) / Math.max(Math.abs(peak), 1) * 100) : 0;
      const ddMoney = peakMoney > 0 ? -((peakMoney - cumPnl) / Math.max(Math.abs(peakMoney), 1) * 100) : 0;
      return {
        id: i + 1,
        day: day.slice(5),
        equity: +cumR.toFixed(3),
        equityMoney: +cumPnl.toFixed(2),
        dd: +ddR.toFixed(2),
        ddMoney: +ddMoney.toFixed(2),
        pnl: dayPnl,
      };
    });
  }, [tradesByDay]);


  // 2. R buckets
  const rBuckets = useMemo(() => {
    const labels = {
      lt_m2: t('מתחת ל-2R-','< -2R'),
      m2_m1: t('-2R עד -1R','-2R to -1R'),
      m1_0:  t('-1R עד 0','-1R to 0'),
      z_1:   t('0 עד 1R','0 to 1R'),
      o1_2:  t('1R עד 2R','1R to 2R'),
      o2_3:  t('2R עד 3R','2R to 3R'),
      gt_3:  t('מעל 3R','> 3R'),
    } as const;
    const buckets: Record<string, number> = {
      [labels.lt_m2]: 0, [labels.m2_m1]: 0, [labels.m1_0]: 0,
      [labels.z_1]: 0, [labels.o1_2]: 0, [labels.o2_3]: 0, [labels.gt_3]: 0,
    };
    trades.forEach(tr => {
      const r = getEffectiveR(tr);
      if (r < -2) buckets[labels.lt_m2]++;
      else if (r < -1) buckets[labels.m2_m1]++;
      else if (r < 0) buckets[labels.m1_0]++;
      else if (r < 1) buckets[labels.z_1]++;
      else if (r < 2) buckets[labels.o1_2]++;
      else if (r < 3) buckets[labels.o2_3]++;
      else buckets[labels.gt_3]++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [trades, t]);

  // 3. Setup leaderboard
  const setupBoard = useMemo(() => {
    const m: Record<string, { coin: string; n: number; wins: number; pnl: number; r: number; risk: number }> = {};
    trades.forEach(t => {
      if (!m[t.coin]) m[t.coin] = { coin: t.coin, n: 0, wins: 0, pnl: 0, r: 0, risk: 0 };
      m[t.coin].n++;
      m[t.coin].pnl += t.pnl;
      m[t.coin].r += getEffectiveR(t);
      m[t.coin].risk += t.risk;
      if (t.winLoss === 'Win') m[t.coin].wins++;
    });
    const arr = Object.values(m).map(s => ({
      coin: s.coin,
      n: s.n,
      wr: (s.wins / s.n) * 100,
      pnl: s.pnl,
      exp: s.r / s.n,
      avgRisk: s.risk / s.n,
    }));
    return arr.sort((a, b) => {
      if (sortKey === 'pnl') return b.pnl - a.pnl;
      if (sortKey === 'exp') return b.exp - a.exp;
      if (sortKey === 'wr') return b.wr - a.wr;
      return b.n - a.n;
    });
  }, [trades, sortKey]);

  // 4. Day × Hour matrix (cells) — accumulates both $ and R so it respects displayMode
  const dhMatrix = useMemo(() => {
    const grid: { day: number; hour: number; pnl: number; r: number; n: number }[] = [];
    const m = new Map<string, { pnl: number; r: number; n: number }>();
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const k = `${d.getDay()}-${d.getHours()}`;
        const cur = m.get(k) || { pnl: 0, r: 0, n: 0 };
        cur.pnl += Number(t.pnl) || 0;
        cur.r += Number(getEffectiveR(t)) || 0;
        cur.n++;
        m.set(k, cur);
      } catch { /* skip */ }
    });
    m.forEach((v, k) => {
      const [day, hour] = k.split('-').map(Number);
      grid.push({ day, hour, pnl: v.pnl, r: v.r, n: v.n });
    });
    return grid;
  }, [trades]);

  // 5. Risk vs P&L scatter (carries both $ and R)
  const rvp = useMemo(() =>
    trades.map(t => ({
      risk: t.risk,
      pnl: t.pnl,
      r: getEffectiveR(t),
      win: t.winLoss === 'Win',
      coin: t.coin,
    })),
  [trades]);

  // 6. Streak ladder
  const streaks = useMemo(() => {
    const out: { type: 'W' | 'L'; len: number; pnl: number; r: number }[] = [];
    let cur: { type: 'W' | 'L'; len: number; pnl: number; r: number } | null = null;
    trades.forEach(t => {
      if (t.winLoss === 'Break Even') return;
      const ty: 'W' | 'L' = t.winLoss === 'Win' ? 'W' : 'L';
      if (cur && cur.type === ty) {
        cur.len++; cur.pnl += t.pnl; cur.r += getEffectiveR(t);
      } else {
        if (cur) out.push(cur);
        cur = { type: ty, len: 1, pnl: t.pnl, r: getEffectiveR(t) };
      }
    });
    if (cur) out.push(cur);
    return out;
  }, [trades]);

  // 7. Edge decay (rolling expectancy buckets of 5)
  const edgeDecay = useMemo(() => {
    const W = 5;
    const out: { period: number; exp: number }[] = [];
    for (let i = 0; i + W <= trades.length; i += W) {
      const slice = trades.slice(i, i + W);
      out.push({ period: Math.floor(i / W) + 1, exp: slice.reduce((s, t) => s + getEffectiveR(t), 0) / slice.length });
    }
    return out;
  }, [trades]);

  const effectiveStats = useMemo(() => {
    const returns = trades.map(t => getEffectiveR(t));
    if (!returns.length) return { expectancyR: 0, volAdjExpectancy: 0, kelly: 0, riskOfRuin: 0, bestR: 0, worstR: 0 };
    const winsR = trades.filter(t => t.winLoss === 'Win').map(t => Math.abs(getEffectiveR(t)));
    const lossesR = trades.filter(t => t.winLoss === 'Loss').map(t => Math.abs(getEffectiveR(t)));
    const wins = winsR.length;
    const losses = lossesR.length;
    const winRate = wins / trades.length;
    const lossRate = losses / trades.length;
    const avgWinR = wins ? winsR.reduce((s, r) => s + r, 0) / wins : 0;
    const avgLossR = losses ? lossesR.reduce((s, r) => s + r, 0) / losses : 0;
    const expectancyR = (winRate * avgWinR) - (lossRate * avgLossR);
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
    const sd = Math.sqrt(variance);
    const payoffRatio = avgLossR > 0 ? avgWinR / avgLossR : 0;
    const kelly = payoffRatio > 0 ? Math.max(0, Math.min(100, (winRate - ((1 - winRate) / payoffRatio)) * 100)) : 0;
    const edge = expectancyR > 0 && avgLossR > 0 ? expectancyR / avgLossR : 0;
    const ruinBase = edge > 0 ? Math.max(0, Math.min(0.99, (1 - edge) / (1 + edge))) : 1;
    const riskOfRuin = edge > 0 ? Math.max(0, Math.min(99.9, Math.pow(ruinBase, 10) * 100)) : 99.9;
    return {
      expectancyR,
      volAdjExpectancy: sd > 0 ? expectancyR / sd : 0,
      kelly,
      riskOfRuin,
      bestR: Math.max(...returns),
      worstR: Math.min(...returns),
    };
  }, [trades]);

  // 8. Direction split
  const dirSplit = useMemo(() => {
    const longs = trades.filter(t => t.direction === 'Long');
    const shorts = trades.filter(t => t.direction === 'Short');
    return [
      { name: t('לונג','Long'), n: longs.length, wr: longs.length ? (longs.filter(t => t.winLoss === 'Win').length / longs.length) * 100 : 0, color: T.accent.green },
      { name: t('שורט','Short'), n: shorts.length, wr: shorts.length ? (shorts.filter(t => t.winLoss === 'Win').length / shorts.length) * 100 : 0, color: T.accent.red },
    ];
  }, [trades, T, t]);

  // 9. Monthly heat tiles (carries both $ and R)
  const monthHeat = useMemo(() => {
    const m: Record<string, { key: string; pnl: number; r: number; n: number }> = {};
    trades.forEach(tr => {
      try {
        const d = new Date(tr.date.replace(' ', 'T'));
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!m[k]) m[k] = { key: k, pnl: 0, r: 0, n: 0 };
        m[k].pnl += tr.pnl; m[k].r += getEffectiveR(tr); m[k].n++;
      } catch { /* skip */ }
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
  }, [trades]);

  // 10. Hero KPIs (R-side)
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  const payoff = losses.length && wins.length
    ? (wins.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / wins.length) /
      (losses.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / losses.length)
    : 0;

  // 10b. Hero KPIs (Money-side) — safe against zero-division / NaN
  const moneyStats = useMemo(() => {
    if (!trades.length) {
      return { avgWin: 0, avgLoss: 0, payoff: 0, profitFactor: 0, maxDDMoney: 0, maxDDPct: 0, grossProfit: 0, grossLoss: 0 };
    }
    const w$ = wins.map(t => t.pnl).filter(n => isFinite(n));
    const l$ = losses.map(t => Math.abs(t.pnl)).filter(n => isFinite(n));
    const avgWin = w$.length ? w$.reduce((s, v) => s + v, 0) / w$.length : 0;
    const avgLoss = l$.length ? l$.reduce((s, v) => s + v, 0) / l$.length : 0;
    const grossProfit = w$.reduce((s, v) => s + v, 0);
    const grossLoss = l$.reduce((s, v) => s + v, 0);
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
    const payoff$ = avgLoss > 0 ? avgWin / avgLoss : 0;
    let cum = 0, peak = 0, maxDD = 0;
    trades.forEach(t => {
      cum += t.pnl;
      if (cum > peak) peak = cum;
      const dd = peak - cum;
      if (dd > maxDD) maxDD = dd;
    });
    const maxDDPct = peak > 0 ? (maxDD / peak) * 100 : 0;
    return { avgWin, avgLoss, payoff: payoff$, profitFactor, maxDDMoney: maxDD, maxDDPct, grossProfit, grossLoss };
  }, [trades, wins, losses]);


  /* ─────────── ADVANCED (PRO/MAX) DATASETS ─────────── */

  // A) Sharpe-like rolling ratio (mean / stdev) — window of 20
  const sharpeRoll = useMemo(() => {
    const W = 20;
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const mean = slice.reduce((s, t) => s + getEffectiveR(t), 0) / slice.length;
      const variance = slice.reduce((s, t) => s + Math.pow(getEffectiveR(t) - mean, 2), 0) / slice.length;
      const sd = Math.sqrt(variance);
      return { i: i + 1, sharpe: sd > 0 ? +(mean / sd).toFixed(3) : 0 };
    });
  }, [trades]);

  // B) Underwater curve — % below all-time peak
  const underwater = useMemo(() => {
    let cum = 0, peak = 0;
    return tradesByDay.map(([day, dayTrades], i) => {
      const { total } = sumDailyR(dayTrades);
      cum += total;
      if (cum > peak) peak = cum;
      const uw = peak > 0 ? -((peak - cum) / Math.max(Math.abs(peak), 1)) * 100 : 0;
      return { i: i + 1, day: day.slice(5), uw: +uw.toFixed(2) };
    });
  }, [tradesByDay]);

  // C) Profit-factor evolution (cumulative gross-win / gross-loss)
  //    Respects display mode: $ uses pnl, R uses effective-R so R-only imports
  //    (no money data) still render a meaningful curve.
  const pfEvolution = useMemo(() => {
    let gw = 0, gl = 0;
    const out: Array<{ i: number; pf: number }> = [];
    trades.forEach((t, i) => {
      const v = isMoney ? Number(t.pnl) || 0 : (getEffectiveR(t) ?? 0);
      if (v >= 0) gw += v; else gl += Math.abs(v);
      // Emit a point only once at least one loss exists — otherwise PF is
      // undefined (division by zero) and would flat-line at 0 or 5 forever.
      const pf = gl > 0 ? +(gw / gl).toFixed(3) : (gw > 0 ? null : 0);
      if (pf !== null) out.push({ i: i + 1, pf });
    });
    return out;
  }, [trades, isMoney]);


  // D) Win-rate vs Avg-R quadrant (per coin) — strategic positioning
  const quadrant = useMemo(() => {
    const m: Record<string, { n: number; wins: number; r: number; pnl: number }> = {};
    trades.forEach(t => {
      if (!m[t.coin]) m[t.coin] = { n: 0, wins: 0, r: 0, pnl: 0 };
      m[t.coin].n++; m[t.coin].r += getEffectiveR(t); m[t.coin].pnl += t.pnl;
      if (t.winLoss === 'Win') m[t.coin].wins++;
    });
    return Object.entries(m).map(([coin, v]) => ({
      coin,
      wr: +((v.wins / v.n) * 100).toFixed(1),
      avgR: +(v.r / v.n).toFixed(3),
      n: v.n,
      pnl: v.pnl,
    }));
  }, [trades]);

  // E) Heat-tape (last 60 trades as a vertical strip)
  const heatTape = useMemo(() =>
    trades.slice(-60).map((t, i) => ({ i, r: getEffectiveR(t), win: t.winLoss === 'Win' })),
  [trades]);

  /* ─────────── HELPERS ─────────── */

  const PV = ({ children }: { children: React.ReactNode }) => (
    <span style={privacyMode ? { filter: 'blur(8px)', userSelect: 'none' } : {}}>{children}</span>
  );

  const heatColor = (pnl: number, max: number): string => {
    if (max === 0) return T.bg.tertiary;
    const norm = pnl / max; // -1..1
    if (norm >= 0) {
      const a = 0.15 + Math.min(norm, 1) * 0.55;
      return `rgba(16,185,129,${a})`;
    } else {
      const a = 0.15 + Math.min(-norm, 1) * 0.55;
      return `rgba(255,30,30,${a})`;
    }
  };

  const maxAbsHeat = Math.max(isMoney ? 1 : 0.01, ...dhMatrix.map(c => Math.abs(isMoney ? c.pnl : c.r)));
  const maxAbsMonth = Math.max(1, ...monthHeat.map(c => Math.abs(isMoney ? c.pnl : c.r)));

  /* ─────────── EMPTY ─────────── */

  if (trades.length === 0) {
    return (
      <GlassCard T={T} style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, color: T.text.primary, fontWeight: 700 }}>{t('אין נתונים להצגה','No data to display')}</div>
        <div style={{ fontSize: 12, color: T.text.muted, marginTop: 6 }}>{t('הוסף עסקאות כדי לפתוח את לוח האנליטיקה.','Add trades to unlock the analytics deck.')}</div>
      </GlassCard>
    );
  }

  /* ─────────── RENDER ─────────── */

  return (
    <div dir={langRTL ? 'rtl' : 'ltr'} style={{ fontFamily: langRTL ? "'Heebo', 'Inter', sans-serif" : "'Inter', 'Heebo', sans-serif" }}>
      {!isMoney && <RProxyBanner T={T} isRTL={langRTL} rEligibleCount={rEligibleCount} totalCount={totalCount} />}
      {/* HERO HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 14 }}
      >
        <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>
          ORCA · PERFORMANCE DECK
        </div>
        <div style={{ fontSize: 22, color: T.text.primary, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {t('לוח ביצועים מתקדם','Advanced Performance Deck')}
        </div>
        <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 2 }}>
          {t(`ניתוח רב-ממדי של ${trades.length} עסקאות לאורך כל ההיסטוריה.`, `Multi-dimensional analysis of ${trades.length} trades across history.`)}
        </div>
      </motion.div>

      {/* ═══ HERO KPI GRID — 8 fiat-based tiles (R-only KPIs removed) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: isMoney ? t('ניצחון ממוצע ($)','Avg Win ($)') : t('ניצחון ממוצע (R)','Avg Win (R)'),
            value: isMoney ? <PV>{fmtVal(moneyStats.avgWin)}</PV> : <PV>{`+${stats.avgWinR.toFixed(2)}R`}</PV>,
            color: T.accent.green },
          { label: isMoney ? t('הפסד ממוצע ($)','Avg Loss ($)') : t('הפסד ממוצע (R)','Avg Loss (R)'),
            value: isMoney ? <PV>{fmtVal(-moneyStats.avgLoss)}</PV> : <PV>{`-${stats.avgLossR.toFixed(2)}R`}</PV>,
            color: T.accent.red },
          { label: t('פקטור רווח','Profit Factor'),
            value: (() => { const pf = isMoney ? moneyStats.profitFactor : stats.profitFactorR; return isFinite(pf) ? `${pf.toFixed(2)}x` : '∞'; })(),
            color: (isMoney ? moneyStats.profitFactor : stats.profitFactorR) >= 1.5 ? T.accent.green : (isMoney ? moneyStats.profitFactor : stats.profitFactorR) >= 1 ? T.accent.orange : T.accent.red },
          { label: t('אחוז הצלחה','Win Rate'), value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? T.accent.green : T.accent.orange },
          { label: isMoney ? t('יחס תשלום ($)','Payoff Ratio ($)') : t('יחס תשלום (R)','Payoff Ratio (R)'),
            value: (() => { const p = isMoney ? moneyStats.payoff : (stats.avgLossR > 0 ? stats.avgWinR / stats.avgLossR : 0); return p > 0 ? p.toFixed(2) : '—'; })(),
            color: T.accent.blue },
          { label: isMoney ? t('P&L מצטבר','Cumulative P&L') : t('R מצטבר','Cumulative R'),
            value: <PV>{isMoney ? fmtVal(stats.totalPnl) : `${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(2)}R`}</PV>,
            color: (isMoney ? stats.totalPnl : stats.totalR) >= 0 ? T.accent.green : T.accent.red },
          { label: isMoney ? t('נסיגה מקס ($)','Max Drawdown ($)') : t('נסיגה מקס R (%)','Max Drawdown R (%)'),
            value: isMoney ? <PV>{fmtVal(-moneyStats.maxDDMoney)}</PV> : `${stats.maxDrawdown.toFixed(1)}%`,
            color: T.accent.orange },
          { label: t('נסיגה מקס (%)','Max Drawdown (%)'), value: `${moneyStats.maxDDPct.toFixed(1)}%`, color: T.accent.orange },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <GlassCard T={T} style={{ padding: 12 }}>
              <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>{k.value}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>



      {/* ═══ KEY OBSERVATIONS — promoted to top for instant signal ═══ */}
      <GlassCard T={T} glow={`${T.accent.cyan}22`} style={{ marginBottom: 16, borderInlineStart: `3px solid ${T.accent.cyan}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, color: T.accent.cyan, textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 800 }}>● {t('תקציר','Snapshot')}</div>
          <div style={{ fontSize: 13, color: T.text.primary, fontWeight: 800 }}>{t('תצפיות מרכזיות','Key Observations')}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 10 }}>
          {[
            { l: t('רצף ניצחונות הארוך ביותר','Longest win streak'), v: `${Math.max(0, ...streaks.filter(s => s.type === 'W').map(s => s.len))} ${t('עסקאות','trades')}`, c: T.accent.green },
            { l: t('רצף הפסדים הארוך ביותר','Longest loss streak'), v: `${Math.max(0, ...streaks.filter(s => s.type === 'L').map(s => s.len))} ${t('עסקאות','trades')}`, c: T.accent.red },
            { l: t('עסקה הכי טובה','Best trade'), v: isMoney ? fmtVal(Math.max(...trades.map(tr => tr.pnl), 0)) : `+${stats.bestTradeR.toFixed(2)}R`, c: T.accent.green },
            { l: t('עסקה הכי גרועה','Worst trade'), v: isMoney ? fmtVal(Math.min(...trades.map(tr => tr.pnl), 0)) : `${stats.worstTradeR.toFixed(2)}R`, c: T.accent.red },
            { l: t('נכסים פעילים','Active assets'), v: String(setupBoard.length), c: T.accent.blue },
            { l: t('סיכון קריסה','Risk of Ruin'), v: `${effectiveStats.riskOfRuin.toFixed(1)}%`, c: effectiveStats.riskOfRuin > 50 ? T.accent.red : T.accent.green },
          ].map((o, i) => (
            <div key={i} style={{ padding: 12, background: T.bg.tertiary, borderRadius: 10, borderInlineStart: `3px solid ${o.c}` }}>
              <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 4, letterSpacing: '0.05em' }}>{o.l}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: o.c, fontFamily: "'JetBrains Mono', monospace" }}>{o.v}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ═══ TIME-SERIES PERFORMANCE DISTRIBUTION MATRIX — Advanced only ═══ */}
      {showPro && !showMax && registryAllows('tsPerfMatrix') && (
        <TimeSeriesPerfMatrix T={T} trades={trades} />
      )}

      {/* ═══ EQUITY + DRAWDOWN OVERLAY ═══ */}
      {showCore && registryAllows('equityCurve') && <GlassCard T={T} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700 }}>{t('עקומת הון מול נסיגה','Equity vs Drawdown')}</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 10, color: T.text.muted }}>
            <span>● <span style={{ color: T.accent.cyan }}>{isMoney ? t('הון מצטבר ($)','Cumulative P&L ($)') : t('R מצטבר','Cumulative R')}</span></span>
            <span>● <span style={{ color: T.accent.red }}>{t('נסיגה (%)','Drawdown (%)')}</span></span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={equityDD}>
            <defs>
              <linearGradient id="equityG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.5} />
                <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ddG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent.red} stopOpacity={0.05} />
                <stop offset="100%" stopColor={T.accent.red} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
            <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} />
            <YAxis yAxisId="L" tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => fmtAxis(v)} />
            <YAxis yAxisId="R" orientation="right" tick={{ fill: T.text.muted, fontSize: 10 }} domain={[(dataMin: number) => Math.min(-1, Math.max(-100, dataMin)), 0]} tickFormatter={(v: number) => `${v.toFixed(0)}%`} allowDataOverflow={false} />
            <Tooltip contentStyle={tt} formatter={(v: number, n: string) => n === 'dd' || n === 'ddMoney' ? `${v.toFixed(2)}%` : fmtVal(v)} />
            <Area yAxisId="L" type="monotone" dataKey={isMoney ? 'equityMoney' : 'equity'} stroke={T.accent.cyan} strokeWidth={2.5} fill="url(#equityG)" />
            <Area yAxisId="R" type="monotone" dataKey={isMoney ? 'ddMoney' : 'dd'} stroke={T.accent.red} strokeWidth={1.5} fill="url(#ddG)" />
          </ComposedChart>
        </ResponsiveContainer>
      </GlassCard>}


      {/* ═══ Direction Split (Win Rate) — full-width after R Distribution removal ═══ */}
      {showCore && registryAllows('directionAnalysis') && <GlassCard T={T} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>{t('פיצול כיוון (אחוז הצלחה)','Direction Split (Win Rate)')}</div>
        <ResponsiveContainer width="100%" height={230}>
          <RadialBarChart innerRadius="30%" outerRadius="100%" data={dirSplit} startAngle={180} endAngle={0}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar background dataKey="wr" cornerRadius={6}>
              {dirSplit.map((d, i) => <Cell key={i} fill={d.color} />)}
            </RadialBar>
            <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(1)}%`} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4 }}>
          {dirSplit.map(d => (
            <div key={d.name} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: T.text.muted }}>{d.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: d.color, fontFamily: "'JetBrains Mono', monospace" }}>{d.wr.toFixed(0)}%</div>
              <div style={{ fontSize: 9, color: T.text.muted }}>{d.n} {t('עסקאות','trades')}</div>
            </div>
          ))}
        </div>
      </GlassCard>}


      {/* ═══ DAY × HOUR MATRIX ═══  (registry: performanceByDay) */}
      {showMax && registryAllows('performanceByDay') && <GlassCard T={T} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 12 }}>{t('מפת ביצועים — יום × שעה','Performance Heatmap — Day × Hour')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", margin: '0 auto' }}>
            <thead>
              <tr>
                <th style={{ padding: 4 }}></th>
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} style={{ padding: 2, color: T.text.muted, fontWeight: 500, fontSize: 9, width: 22 }}>{String(h).padStart(2, '0')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <tr key={day}>
                  <td style={{ padding: 2, color: T.text.muted, fontWeight: 600, fontSize: 10, textAlign: 'center' }}>{DOW[day]}</td>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = dhMatrix.find(c => c.day === day && c.hour === h);
                    const value = cell ? (isMoney ? cell.pnl : cell.r) : 0;
                    const bg = cell ? heatColor(value, maxAbsHeat) : T.bg.tertiary;
                    const valueStr = isMoney
                      ? `${value >= 0 ? '+' : ''}$${value.toFixed(0)}`
                      : `${value >= 0 ? '+' : ''}${value.toFixed(2)}R`;
                    return (
                      <td
                        key={h}
                        title={cell ? `${DOW_FULL[day]} ${String(h).padStart(2, '0')}:00 — ${cell.n} ${t('עסקאות','trades')}, ${valueStr}` : ''}
                        style={{ width: 22, height: 22, background: bg, borderRadius: 3, border: cell ? `1px solid ${T.border.subtle}` : 'none' }}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 12, fontSize: 10, color: T.text.muted }}>
          <span>{t('הפסד','Loss')}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[-1, -0.6, -0.3, 0, 0.3, 0.6, 1].map(v => (
              <div key={v} style={{ width: 14, height: 10, background: heatColor(v * maxAbsHeat, maxAbsHeat), borderRadius: 2 }} />
            ))}
          </div>
          <span>{t('רווח','Profit')}</span>
        </div>
      </GlassCard>}

      {/* ═══ RISK-ADJUSTED PERFORMANCE — moved directly below Day×Hour heatmap ═══ */}
      {showMax && (
        <div style={{ marginBottom: 16 }}>
          <RiskAdjustedRatiosSection T={T} isRTL={langRTL} trades={_allTrades} />
        </div>
      )}

      {/* ═══ QUANT LAB ═══ */}
      {showMax && registryAllows('rollingSharpe') && (
        <Suspense fallback={<div style={{ padding: 18, fontSize: 11, color: T.text.muted, opacity: 0.7 }}>Loading Quant Lab…</div>}>
          <AnalyticsQuantLab T={T} trades={trades} privacyMode={privacyMode} />
        </Suspense>
      )}


      {/* ═══ MONTHLY HEAT TILES ═══ */}
      {showPro && registryAllows('monthlyPerformance') && monthHeat.length > 1 && (
        <GlassCard T={T} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 12 }}>{t('חום חודשי','Monthly Heat')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))', gap: 8 }}>
            {monthHeat.map((m, i) => {
              const v = isMoney ? m.pnl : m.r;
              return (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                style={{
                  padding: 12,
                  background: heatColor(v, maxAbsMonth),
                  borderRadius: 10,
                  border: `1px solid ${T.border.subtle}`,
                }}
              >
                <div style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{m.key}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  <PV>{fmtVal(v)}</PV>
                </div>
                <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>{m.n} {t('עסקאות','trades')}</div>
              </motion.div>
            );})}
          </div>
        </GlassCard>
      )}

      {/* Leaderboard moved to bottom — see end of page */}

      {/* ═══ MONTHLY PERFORMANCE — compact single-chart visual ═══ */}
      {showPro && registryAllows('cumWinLossRatio') && stats.monthlyPerf && stats.monthlyPerf.length > 0 && (() => {
        const monthly = stats.monthlyPerf.map((mp: any) => {
          const val = isMoney ? Number(mp.pnl) || 0 : (Number(mp.expectancyR) || 0) * (Number(mp.trades) || 0);
          return {
            month: mp.month,
            value: val,
            trades: Number(mp.trades) || 0,
            winRate: Number(mp.winRate) || 0,
            expectancyR: Number(mp.expectancyR) || 0,
            pnl: Number(mp.pnl) || 0,
          };
        });
        const positives = monthly.filter((m: any) => m.value > 0).length;
        const negatives = monthly.filter((m: any) => m.value < 0).length;
        const bestMonth = monthly.reduce((b: any, c: any) => (c.value > (b?.value ?? -Infinity) ? c : b), monthly[0]);
        const worstMonth = monthly.reduce((b: any, c: any) => (c.value < (b?.value ?? Infinity) ? c : b), monthly[0]);
        const netSum = monthly.reduce((s: number, m: any) => s + m.value, 0);
        const fmt = (v: number) => isMoney
          ? `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`
          : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;

        return (
          <GlassCard T={T} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700 }}>{t('פירוט ביצועים חודשיים','Monthly Performance Detail')}</div>
              <span style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
                {monthly.length} {t('חודשים','months')} · {isMoney ? '$' : 'R'}
              </span>
            </div>

            {/* Quick summary strip — replaces the tall card grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
              gap: 6,
              marginBottom: 12,
            }}>
              {[
                { label: t('חודשים חיוביים','Green months'), value: `${positives}/${monthly.length}`, color: T.accent.green },
                { label: t('חודשים שליליים','Red months'), value: `${negatives}/${monthly.length}`, color: T.accent.red },
                { label: t('חודש חזק','Best month'), value: bestMonth ? `${bestMonth.month} · ${fmt(bestMonth.value)}` : '—', color: T.accent.green },
                { label: t('חודש חלש','Worst month'), value: worstMonth ? `${worstMonth.month} · ${fmt(worstMonth.value)}` : '—', color: T.accent.red },
                { label: t('סה״כ נטו','Net total'), value: fmt(netSum), color: netSum >= 0 ? T.accent.green : T.accent.red },
              ].map((k, i) => (
                <div key={i} style={{
                  padding: '7px 9px', borderRadius: 8,
                  background: `${T.bg.tertiary}55`, border: `1px solid ${T.border.subtle}`,
                }}>
                  <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: k.color, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Single combined chart: bars for P&L/R, line for win-rate */}
            <div style={{ width: '100%', height: isMobile ? 220 : 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: T.text.secondary, fontSize: isMobile ? 9 : 11, fontWeight: 600 }}
                    interval={monthly.length > (isMobile ? 8 : 18) ? 'preserveStartEnd' : 0}
                    angle={isMobile && monthly.length > 6 ? -35 : 0}
                    textAnchor={isMobile && monthly.length > 6 ? 'end' : 'middle'}
                    height={isMobile && monthly.length > 6 ? 46 : 26}
                    tickMargin={6}
                    padding={{ left: 6, right: 6 }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: T.text.muted, fontSize: 10 }}
                    width={48}
                    tickFormatter={(v: number) => isMoney ? `$${Math.round(v)}` : `${v.toFixed(1)}R`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fill: T.text.muted, fontSize: 10 }}
                    width={36}
                    tickFormatter={(v: number) => `${Math.round(v)}%`}
                  />
                  <Tooltip
                    contentStyle={tt}
                    formatter={(v: any, name: any, p: any) => {
                      if (name === 'value') return [fmt(Number(v)), `${p?.payload?.trades || 0} ${t('עסקאות','trades')}`];
                      if (name === 'winRate') return [`${Number(v).toFixed(0)}%`, t('אחוז הצלחה','Win rate')];
                      return [v, name];
                    }}
                  />
                  <ReferenceLine yAxisId="left" y={0} stroke={T.border.medium} />
                  <Bar yAxisId="left" dataKey="value" radius={[5, 5, 0, 0]}>
                    {monthly.map((m: any, i: number) => (
                      <Cell key={i} fill={m.value >= 0 ? T.accent.green : T.accent.red} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="winRate"
                    stroke={T.accent.cyan}
                    strokeWidth={2}
                    dot={{ r: 3, fill: T.accent.cyan, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        );
      })()}


      {/* ═══ QUARTERLY & YEARLY PERFORMANCE DETAIL ═══ */}
      {showPro && stats.monthlyPerf && stats.monthlyPerf.length > 0 && (() => {
        type Bucket = { label: string; pnl: number; trades: number; wins: number; totalR: number };
        const aggregate = (keyFn: (mp: any) => string) => {
          const map = new Map<string, Bucket>();
          stats.monthlyPerf.forEach((mp: any) => {
            const k = keyFn(mp);
            const cur = map.get(k) || { label: k, pnl: 0, trades: 0, wins: 0, totalR: 0 };
            cur.pnl += Number(mp.pnl) || 0;
            cur.trades += Number(mp.trades) || 0;
            cur.wins += Number(mp.wins) || 0;
            cur.totalR += (Number(mp.avgR) || 0) * (Number(mp.trades) || 0);
            map.set(k, cur);
          });
          return Array.from(map.values())
            .map(b => ({
              ...b,
              winRate: b.trades > 0 ? (b.wins / b.trades) * 100 : 0,
              expectancyR: b.trades > 0 ? b.totalR / b.trades : 0,
              value: isMoney ? b.pnl : b.totalR,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
        };

        const quarterly = aggregate((mp: any) => {
          const [y, m] = String(mp.monthKey).split('-').map(Number);
          const q = Math.floor((m || 0) / 3) + 1;
          return `${y} Q${q}`;
        });
        const yearly = aggregate((mp: any) => String(mp.monthKey).split('-')[0]);

        const fmt = (v: number) => isMoney
          ? `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`
          : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;

        return (
          <>
            {/* ── QUARTERLY · horizontal bar chart with KPI strip ── */}
            <GlassCard T={T} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, letterSpacing: '0.05em' }}>
                  {t('פירוט ביצועים רבעוני', 'Quarterly Performance Detail')}
                </div>
                <span style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
                  {quarterly.length} {t('רבעונים', 'quarters')} · {isMoney ? '$' : 'R'}
                </span>
              </div>
              <div style={{ width: '100%', height: isMobile ? 200 : 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={quarterly}
                    margin={{ top: 12, right: 8, bottom: 8, left: 0 }}
                    barCategoryGap={isMobile ? '18%' : '24%'}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: T.text.secondary, fontSize: isMobile ? 9 : 11, fontWeight: 600 }}
                      interval={0}
                      angle={isMobile && quarterly.length > 6 ? -35 : 0}
                      textAnchor={isMobile && quarterly.length > 6 ? 'end' : 'middle'}
                      height={isMobile && quarterly.length > 6 ? 46 : 26}
                      tickMargin={6}
                      padding={{ left: 6, right: 6 }}
                    />
                    <YAxis
                      tick={{ fill: T.text.muted, fontSize: 10 }}
                      width={48}
                      tickFormatter={(v: number) => isMoney ? `$${Math.round(v)}` : `${v.toFixed(1)}R`}
                    />
                    <Tooltip
                      contentStyle={tt}
                      formatter={(v: any, _n: any, p: any) => [fmt(Number(v)), `${p?.payload?.trades || 0} ${t('עסקאות','trades')} · ${(p?.payload?.winRate || 0).toFixed(0)}% WR`]}
                    />
                    <ReferenceLine y={0} stroke={T.border.medium} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {quarterly.map((b, i) => (
                        <Cell key={i} fill={b.value >= 0 ? T.accent.green : T.accent.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* KPI strip — flush on mobile, spacious on desktop */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? 'repeat(auto-fit, minmax(min(100%, 92px), 1fr))'
                  : 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                gap: isMobile ? 4 : 8,
                marginTop: isMobile ? 4 : 12,
                paddingTop: isMobile ? 6 : 12,
                borderTop: isMobile ? 'none' : `1px solid ${T.border.subtle}`,
              }}>
                {quarterly.map((b) => (
                  <div key={b.label} style={{
                    padding: isMobile ? '6px 7px' : '8px 10px',
                    borderRadius: 8,
                    background: `${T.bg.tertiary}40`,
                    border: `1px solid ${T.border.subtle}`,
                  }}>
                    <div style={{ fontSize: isMobile ? 9 : 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>{b.label}</div>
                    <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 800, color: b.value >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                      <PV>{fmt(b.value)}</PV>
                    </div>
                    <div style={{ fontSize: isMobile ? 8.5 : 9, color: T.text.muted, marginTop: 2 }}>
                      {b.trades}{t(' עס׳',' tr')} · {b.winRate.toFixed(0)}% · {b.expectancyR >= 0 ? '+' : ''}{b.expectancyR.toFixed(2)}R
                    </div>
                  </div>
                ))}
              </div>

            </GlassCard>

            {/* ── YEARLY · CHART 1 — P&L / R per year (area + bars) ── */}
            <GlassCard T={T} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, letterSpacing: '0.05em' }}>
                  {t('ביצועים שנתיים — רווח/הפסד', 'Yearly Performance — P&L')}
                </div>
                <span style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
                  {yearly.length} {t('שנים', 'years')} · {isMoney ? '$' : 'R'}
                </span>
              </div>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearly} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                    <defs>
                      <linearGradient id="yrCumG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                    <XAxis dataKey="label" tick={{ fill: T.text.muted, fontSize: 11, fontWeight: 600 }} />
                    <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={56} tickFormatter={(v: number) => isMoney ? `$${Math.round(v)}` : `${v.toFixed(1)}R`} />
                    <Tooltip contentStyle={tt} formatter={(v: any, n: any) => [fmt(Number(v)), n === 'value' ? (isMoney ? 'P&L' : 'R') : (isMoney ? 'Cumulative $' : 'Cumulative R')]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: T.text.muted }} />
                    <ReferenceLine y={0} stroke={T.border.medium} />
                    <Bar dataKey="value" name={isMoney ? t('רווח שנתי','Yearly P&L') : t('R שנתי','Yearly R')} radius={[6,6,0,0]} barSize={48}>
                      {yearly.map((b, i) => (
                        <Cell key={i} fill={b.value >= 0 ? T.accent.green : T.accent.red} />
                      ))}
                    </Bar>
                    <Area
                      type="monotone"
                      dataKey={(d: any) => {
                        // running cumulative
                        const idx = yearly.findIndex(y => y.label === d.label);
                        return yearly.slice(0, idx + 1).reduce((s, y) => s + y.value, 0);
                      }}
                      name={isMoney ? t('מצטבר','Cumulative') : t('R מצטבר','Cumulative R')}
                      stroke={T.accent.cyan}
                      strokeWidth={2.5}
                      fill="url(#yrCumG)"
                      dot={{ r: 3, fill: T.accent.cyan }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* ── YEARLY · CHART 2 — Win Rate + Expectancy line ── */}
            <GlassCard T={T} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, letterSpacing: '0.05em' }}>
                  {t('ביצועים שנתיים — איכות (Win % · תוחלת R)', 'Yearly Performance — Quality (Win % · Expectancy R)')}
                </div>
                <span style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
                  {yearly.length} {t('שנים', 'years')}
                </span>
              </div>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearly} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                    <XAxis dataKey="label" tick={{ fill: T.text.muted, fontSize: 11, fontWeight: 600 }} />
                    <YAxis yAxisId="wr" orientation="left" tick={{ fill: T.text.muted, fontSize: 10 }} width={42} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fill: T.text.muted, fontSize: 10 }} width={42} tickFormatter={(v: number) => `${v.toFixed(1)}R`} />
                    <Tooltip
                      contentStyle={tt}
                      formatter={(v: any, n: any) => {
                        if (n === t('הצלחה','Win %')) return [`${Number(v).toFixed(1)}%`, n];
                        if (n === t('תוחלת R','Expectancy R')) return [`${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}R`, n];
                        return [v, n];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: T.text.muted }} />
                    <ReferenceLine yAxisId="wr" y={50} stroke={T.border.medium} strokeDasharray="3 3" />
                    <Bar yAxisId="wr" dataKey="winRate" name={t('הצלחה','Win %')} fill={T.accent.purple} radius={[6,6,0,0]} barSize={36} opacity={0.7} />
                    <Line yAxisId="r" type="monotone" dataKey="expectancyR" name={t('תוחלת R','Expectancy R')} stroke={T.accent.orange} strokeWidth={2.5} dot={{ r: 4, fill: T.accent.orange }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </>
        );
      })()}





      {/* ═══ ADVANCED LAYER (PRO/MAX modes) ═══ */}
      {showPro && (registryAllows('rDistribution') || registryAllows('edgeDecay')) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12, marginBottom: 12 }}>
          {registryAllows('rDistribution') && <GlassCard T={T} glow={`${T.accent.red}18`}>
            <div style={{ fontSize: 11, color: T.accent.red, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 700 }}>● PRO · {t('עקומת תת-מים (Underwater)','Underwater Curve')}</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={underwater}>
                <defs>
                  <linearGradient id="uwG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.accent.red} stopOpacity={0.04} />
                    <stop offset="100%" stopColor={T.accent.red} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={tt} />
                <Area type="monotone" dataKey="uw" stroke={T.accent.red} fill="url(#uwG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>}
          {registryAllows('edgeDecay') && <GlassCard T={T} glow={`${T.accent.green}18`}>
            <div style={{ fontSize: 11, color: T.accent.green, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 700 }}>
              ● PRO · {t('אבולוציית Profit Factor','Profit Factor Evolution')}
              <span style={{ marginInlineStart: 8, color: T.text.muted, fontSize: 9.5, letterSpacing: '0.12em' }}>· {isMoney ? '$' : 'R'}</span>
            </div>
            {pfEvolution.length < 2 ? (
              <div style={{ height: 220, display: 'grid', placeItems: 'center', color: T.text.muted, fontSize: 12, textAlign: 'center', padding: 12 }}>
                {t(
                  `לא ניתן לחשב Profit Factor ב-${isMoney ? 'כסף' : 'R'} — נדרש לפחות הפסד אחד ורווח אחד.`,
                  `Not enough ${isMoney ? '$' : 'R'} data — Profit Factor needs at least one winning and one losing trade.`
                )}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={pfEvolution} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="pfG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.accent.green} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `${Number(v).toFixed(2)}x`} />
                  <ReferenceLine y={1} stroke={T.border.medium} strokeDasharray="4 3" />
                  <Tooltip
                    contentStyle={tt}
                    formatter={(v: any) => [`${Number(v).toFixed(2)}x`, t('פקטור רווח','Profit Factor')]}
                    labelFormatter={(l: any) => `${t('עסקה','Trade')} #${l}`}
                  />
                  <Area type="monotone" dataKey="pf" stroke={T.accent.green} fill="url(#pfG)" strokeWidth={2.2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </GlassCard>}

        </div>
      )}


      {/* Tier badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <span style={{
          fontSize: 9.5, padding: '3px 10px', borderRadius: 10,
          background: showMax ? `${T.accent.cyan}18` : showPro ? `${T.accent.purple}18` : `${T.bg.tertiary}`,
          color: showMax ? T.accent.cyan : showPro ? T.accent.purple : T.text.muted,
          fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em', fontWeight: 700,
          border: `1px solid ${showMax ? T.accent.cyan : showPro ? T.accent.purple : T.border.subtle}33`,
        }}>
          {t('רמה','Tier')}: {showMax ? t('ULTIMATE','ULTIMATE') : showPro ? t('ADVANCED','ADVANCED') : t('STANDARD','STANDARD')}
        </span>
      </div>

      {/* Quant Lab moved up to render directly under Day × Hour heatmap. */}



      {/* ═══ ULTIMATE-TIER DECK (Phase 4) ═══ */}
      <UltimateAnalyticsDeck
        T={T}
        trades={trades}
        onExplainClick={onExplainClick}
        registryAllows={registryAllows}
      />

      {/* ═══ SETUP LEADERBOARD — bottom of page ═══ */}
      {showPro && registryAllows('strategyExpectancy') && <GlassCard T={T} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700 }}>{t('טבלת מובילים — לפי נכס','Leaderboard — by asset')}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {([
              { k: 'pnl', l: 'P&L' }, { k: 'exp', l: t('תוחלת','Expectancy') }, { k: 'wr', l: t('הצלחה','Win %') }, { k: 'n', l: t('עסקאות','Trades') },
            ] as const).map(o => (
              <button
                key={o.k}
                onClick={() => setSortKey(o.k)}
                style={{
                  padding: '4px 10px', fontSize: 10, fontWeight: 700,
                  background: sortKey === o.k ? T.accent.cyan : 'transparent',
                  color: sortKey === o.k ? T.bg.primary : T.text.muted,
                  border: `1px solid ${sortKey === o.k ? T.accent.cyan : T.border.subtle}`,
                  borderRadius: 6, cursor: 'pointer',
                }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.bg.tertiary }}>
                {[t('נכס','Asset'), t('עסקאות','Trades'), t('הצלחה','Win %'), 'P&L', t('תוחלת R','Expectancy R'), t('סיכון ממוצע','Avg Risk')].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'right', color: T.text.muted, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${T.border.medium}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setupBoard.map((s, i) => (
                <tr key={s.coin} style={{ background: i % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 700, color: T.accent.cyan }}>{s.coin}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>{s.n}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 700, color: s.wr >= 50 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{s.wr.toFixed(0)}%</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.pnl >= 0 ? T.accent.green : T.accent.red }}>
                    <PV>{s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}</PV>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", color: s.exp >= 0 ? T.accent.cyan : T.accent.red, fontWeight: 600 }}>{s.exp >= 0 ? '+' : ''}{s.exp.toFixed(2)}R</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}><PV>${s.avgRisk.toFixed(2)}</PV></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>}

      {/* ═══ ULTIMATE-ONLY · Advanced Analytics Lab (Risk-Adjusted moved below Day×Hour heatmap) ═══ */}
      {showMax && (
        <div style={{ marginTop: 24 }}>
          <DashboardAdvancedLab T={T} isRTL={langRTL} trades={_allTrades} />
        </div>
      )}
    </div>
  );
};

export const AdvancedAnalyticsPage = memo(AdvancedAnalyticsPage_Impl);
