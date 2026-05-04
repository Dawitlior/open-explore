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

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ComposedChart, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import type { OperatingMode } from '@/hooks/use-settings';
import { GlassCard } from './TradingUI';
import type { ChartExplanation } from './ChartWrapper';
import { AnalyticsQuantLab } from './AnalyticsQuantLab';

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
}

const HEB_DOW = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const HEB_DOW_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const AdvancedAnalyticsPage = ({ T, trades, stats, privacyMode, isAlpha, operatingMode = 'live' }: AdvancedAnalyticsPageProps) => {
  // Tier resolution — controls which chart layers render.
  // beginner → minimal · live (standard) → core · review → +pro · research/alpha → +everything
  const tier: 'minimal' | 'core' | 'pro' | 'max' =
    isAlpha || operatingMode === 'research' ? 'max'
    : operatingMode === 'review' ? 'pro'
    : operatingMode === 'beginner' ? 'minimal'
    : 'core';
  const showPro = tier === 'pro' || tier === 'max';
  const showMax = tier === 'max';
  const showCore = tier !== 'minimal';
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

  // 1. Equity & drawdown overlay
  const equityDD = useMemo(() => {
    let cum = 0, peak = 0;
    return trades.map((t, i) => {
      cum += t.pnl;
      if (cum > peak) peak = cum;
      const dd = peak > 0 ? -((peak - cum) / peak * 100) : 0;
      return { id: i + 1, equity: cum, dd, pnl: t.pnl };
    });
  }, [trades]);

  // 2. R buckets
  const rBuckets = useMemo(() => {
    const buckets: Record<string, number> = {
      'מתחת ל-2R-': 0, '-2R עד -1R': 0, '-1R עד 0': 0,
      '0 עד 1R': 0, '1R עד 2R': 0, '2R עד 3R': 0, 'מעל 3R': 0,
    };
    trades.forEach(t => {
      const r = t.returnR;
      if (r < -2) buckets['מתחת ל-2R-']++;
      else if (r < -1) buckets['-2R עד -1R']++;
      else if (r < 0) buckets['-1R עד 0']++;
      else if (r < 1) buckets['0 עד 1R']++;
      else if (r < 2) buckets['1R עד 2R']++;
      else if (r < 3) buckets['2R עד 3R']++;
      else buckets['מעל 3R']++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [trades]);

  // 3. Setup leaderboard
  const setupBoard = useMemo(() => {
    const m: Record<string, { coin: string; n: number; wins: number; pnl: number; r: number; risk: number }> = {};
    trades.forEach(t => {
      if (!m[t.coin]) m[t.coin] = { coin: t.coin, n: 0, wins: 0, pnl: 0, r: 0, risk: 0 };
      m[t.coin].n++;
      m[t.coin].pnl += t.pnl;
      m[t.coin].r += t.returnR;
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

  // 4. Day × Hour matrix (cells)
  const dhMatrix = useMemo(() => {
    const grid: { day: number; hour: number; pnl: number; n: number }[] = [];
    const m = new Map<string, { pnl: number; n: number }>();
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const k = `${d.getDay()}-${d.getHours()}`;
        const cur = m.get(k) || { pnl: 0, n: 0 };
        cur.pnl += t.pnl; cur.n++;
        m.set(k, cur);
      } catch { /* skip */ }
    });
    m.forEach((v, k) => {
      const [day, hour] = k.split('-').map(Number);
      grid.push({ day, hour, pnl: v.pnl, n: v.n });
    });
    return grid;
  }, [trades]);

  // 5. Risk vs P&L scatter
  const rvp = useMemo(() =>
    trades.map(t => ({
      risk: t.risk,
      pnl: t.pnl,
      r: t.returnR,
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
        cur.len++; cur.pnl += t.pnl; cur.r += t.returnR;
      } else {
        if (cur) out.push(cur);
        cur = { type: ty, len: 1, pnl: t.pnl, r: t.returnR };
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
      out.push({ period: Math.floor(i / W) + 1, exp: slice.reduce((s, t) => s + t.returnR, 0) / slice.length });
    }
    return out;
  }, [trades]);

  // 8. Direction split
  const dirSplit = useMemo(() => {
    const longs = trades.filter(t => t.direction === 'Long');
    const shorts = trades.filter(t => t.direction === 'Short');
    return [
      { name: 'לונג', n: longs.length, wr: longs.length ? (longs.filter(t => t.winLoss === 'Win').length / longs.length) * 100 : 0, color: T.accent.green },
      { name: 'שורט', n: shorts.length, wr: shorts.length ? (shorts.filter(t => t.winLoss === 'Win').length / shorts.length) * 100 : 0, color: T.accent.red },
    ];
  }, [trades, T]);

  // 9. Monthly heat tiles
  const monthHeat = useMemo(() => {
    const m: Record<string, { key: string; pnl: number; n: number }> = {};
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!m[k]) m[k] = { key: k, pnl: 0, n: 0 };
        m[k].pnl += t.pnl; m[k].n++;
      } catch { /* skip */ }
    });
    return Object.values(m).sort((a, b) => a.key.localeCompare(b.key));
  }, [trades]);

  // 10. Hero KPIs
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  const payoff = losses.length && wins.length
    ? (wins.reduce((s, t) => s + Math.abs(t.returnR), 0) / wins.length) /
      (losses.reduce((s, t) => s + Math.abs(t.returnR), 0) / losses.length)
    : 0;

  /* ─────────── ADVANCED (PRO/MAX) DATASETS ─────────── */

  // A) Sharpe-like rolling ratio (mean / stdev) — window of 20
  const sharpeRoll = useMemo(() => {
    const W = 20;
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const mean = slice.reduce((s, t) => s + t.returnR, 0) / slice.length;
      const variance = slice.reduce((s, t) => s + Math.pow(t.returnR - mean, 2), 0) / slice.length;
      const sd = Math.sqrt(variance);
      return { i: i + 1, sharpe: sd > 0 ? +(mean / sd).toFixed(3) : 0 };
    });
  }, [trades]);

  // B) Underwater curve — % below all-time peak
  const underwater = useMemo(() => {
    let cum = 0, peak = 0;
    return trades.map((t, i) => {
      cum += t.pnl;
      if (cum > peak) peak = cum;
      const uw = peak > 0 ? -((peak - cum) / peak) * 100 : 0;
      return { i: i + 1, uw: +uw.toFixed(2) };
    });
  }, [trades]);

  // C) Profit-factor evolution (cumulative gross-win / gross-loss)
  const pfEvolution = useMemo(() => {
    let gw = 0, gl = 0;
    return trades.map((t, i) => {
      if (t.pnl >= 0) gw += t.pnl; else gl += Math.abs(t.pnl);
      return { i: i + 1, pf: gl > 0 ? +(gw / gl).toFixed(3) : (gw > 0 ? 5 : 0) };
    });
  }, [trades]);

  // D) Win-rate vs Avg-R quadrant (per coin) — strategic positioning
  const quadrant = useMemo(() => {
    const m: Record<string, { n: number; wins: number; r: number; pnl: number }> = {};
    trades.forEach(t => {
      if (!m[t.coin]) m[t.coin] = { n: 0, wins: 0, r: 0, pnl: 0 };
      m[t.coin].n++; m[t.coin].r += t.returnR; m[t.coin].pnl += t.pnl;
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
    trades.slice(-60).map((t, i) => ({ i, r: t.returnR, win: t.winLoss === 'Win' })),
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

  const maxAbsHeat = Math.max(1, ...dhMatrix.map(c => Math.abs(c.pnl)));
  const maxAbsMonth = Math.max(1, ...monthHeat.map(c => Math.abs(c.pnl)));

  /* ─────────── EMPTY ─────────── */

  if (trades.length === 0) {
    return (
      <GlassCard T={T} style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 16, color: T.text.primary, fontWeight: 700 }}>אין נתונים להצגה</div>
        <div style={{ fontSize: 12, color: T.text.muted, marginTop: 6 }}>הוסף עסקאות כדי לפתוח את לוח האנליטיקה.</div>
      </GlassCard>
    );
  }

  /* ─────────── RENDER ─────────── */

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', 'Inter', sans-serif" }}>
      {/* HERO HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: 14 }}
      >
        <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 4 }}>
          ORCA · ANALYTICS DECK
        </div>
        <div style={{ fontSize: 22, color: T.text.primary, fontWeight: 800, letterSpacing: '-0.01em' }}>
          לוח אנליטיקה מתקדם
        </div>
        <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 2 }}>
          ניתוח רב-ממדי של {trades.length} עסקאות לאורך כל ההיסטוריה.
        </div>
      </motion.div>

      {/* ═══ HERO KPI GRID — 8 tiles ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'תוחלת R', value: `${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(3)}R`, color: stats.expectancyR >= 0 ? T.accent.cyan : T.accent.red },
          { label: 'פקטור רווח', value: `${stats.profitFactor.toFixed(2)}x`, color: stats.profitFactor >= 1.5 ? T.accent.green : stats.profitFactor >= 1 ? T.accent.orange : T.accent.red },
          { label: 'אחוז הצלחה', value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? T.accent.green : T.accent.orange },
          { label: 'יחס תשלום', value: `${payoff.toFixed(2)}`, color: T.accent.blue },
          { label: 'P&L מצטבר', value: <PV>{`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(2)}`}</PV>, color: stats.totalPnl >= 0 ? T.accent.green : T.accent.red },
          { label: 'נסיגה מקס', value: `${stats.maxDrawdown.toFixed(1)}%`, color: T.accent.orange },
          { label: 'קלי אופטימלי', value: `${stats.kellyOptimal.toFixed(1)}%`, color: T.accent.purple },
          { label: 'שארפ', value: stats.volatilityAdjustedExpectancy.toFixed(2), color: T.accent.cyan },
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

      {/* ═══ EQUITY + DRAWDOWN OVERLAY ═══ */}
      {showCore && <GlassCard T={T} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700 }}>עקומת הון מול נסיגה</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 10, color: T.text.muted }}>
            <span>● <span style={{ color: T.accent.cyan }}>הון מצטבר</span></span>
            <span>● <span style={{ color: T.accent.red }}>נסיגה (%)</span></span>
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
            <YAxis yAxisId="L" tick={{ fill: T.text.muted, fontSize: 10 }} />
            <YAxis yAxisId="R" orientation="right" tick={{ fill: T.text.muted, fontSize: 10 }} domain={['dataMin', 0]} />
            <Tooltip contentStyle={tt} />
            <Area yAxisId="L" type="monotone" dataKey="equity" stroke={T.accent.cyan} strokeWidth={2.5} fill="url(#equityG)" />
            <Area yAxisId="R" type="monotone" dataKey="dd" stroke={T.accent.red} strokeWidth={1.5} fill="url(#ddG)" />
          </ComposedChart>
        </ResponsiveContainer>
      </GlassCard>}

      {/* ═══ ROW: R Distribution + Direction Radial ═══ */}
      {showCore && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>התפלגות R לפי טווח</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={rBuckets} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis type="category" dataKey="bucket" tick={{ fill: T.text.muted, fontSize: 10 }} width={75} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {rBuckets.map((b, i) => (
                  <Cell key={i} fill={b.bucket.includes('-') || b.bucket.startsWith('מתחת') ? T.accent.red : T.accent.cyan} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>פיצול כיוון (אחוז הצלחה)</div>
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
                <div style={{ fontSize: 9, color: T.text.muted }}>{d.n} עסקאות</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>}

      {/* ═══ DAY × HOUR MATRIX ═══ */}
      {showMax && <GlassCard T={T} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 12 }}>מפת ביצועים — יום × שעה</div>
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
                  <td style={{ padding: 2, color: T.text.muted, fontWeight: 600, fontSize: 10, textAlign: 'center' }}>{HEB_DOW[day]}</td>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = dhMatrix.find(c => c.day === day && c.hour === h);
                    const bg = cell ? heatColor(cell.pnl, maxAbsHeat) : T.bg.tertiary;
                    return (
                      <td
                        key={h}
                        title={cell ? `${HEB_DOW_FULL[day]} ${String(h).padStart(2, '0')}:00 — ${cell.n} עסקאות, ${cell.pnl >= 0 ? '+' : ''}$${cell.pnl.toFixed(0)}` : ''}
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
          <span>הפסד</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[-1, -0.6, -0.3, 0, 0.3, 0.6, 1].map(v => (
              <div key={v} style={{ width: 14, height: 10, background: heatColor(v * maxAbsHeat, maxAbsHeat), borderRadius: 2 }} />
            ))}
          </div>
          <span>רווח</span>
        </div>
      </GlassCard>}

      {/* ═══ MONTHLY HEAT TILES ═══ */}
      {showPro && monthHeat.length > 1 && (
        <GlassCard T={T} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 12 }}>חום חודשי</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            {monthHeat.map((m, i) => (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                style={{
                  padding: 12,
                  background: heatColor(m.pnl, maxAbsMonth),
                  borderRadius: 10,
                  border: `1px solid ${T.border.subtle}`,
                }}
              >
                <div style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{m.key}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                  <PV>{m.pnl >= 0 ? '+' : ''}${m.pnl.toFixed(0)}</PV>
                </div>
                <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>{m.n} עסקאות</div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ═══ SETUP LEADERBOARD ═══ */}
      {showPro && <GlassCard T={T} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 8px' }}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700 }}>טבלת מובילים — לפי נכס</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { k: 'pnl', l: 'P&L' }, { k: 'exp', l: 'תוחלת' }, { k: 'wr', l: 'הצלחה' }, { k: 'n', l: 'עסקאות' },
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
                {['נכס', 'עסקאות', 'הצלחה', 'P&L', 'תוחלת R', 'סיכון ממוצע'].map(h => (
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

      {/* ═══ ROW: Risk-vs-PnL Scatter + Edge Decay ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>פיזור סיכון מול תוצאה</div>
          <ResponsiveContainer width="100%" height={230}>
            <ScatterChart>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="risk" name="סיכון" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis type="number" dataKey="pnl" name="P&L" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <ZAxis range={[40, 160]} />
              <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} formatter={(v: number, n: string) => [n === 'risk' ? `$${v.toFixed(2)}` : `$${v.toFixed(2)}`, n === 'risk' ? 'סיכון' : 'P&L']} />
              <Scatter data={rvp}>
                {rvp.map((d, i) => (
                  <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>אבולוציית האדג' (חלונות של 5)</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={edgeDecay}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(2)}R`} />
              <Line type="monotone" dataKey="exp" stroke={T.accent.purple} strokeWidth={2.5} dot={{ fill: T.accent.purple, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* ═══ STREAK LADDER ═══ */}
      {showPro && <GlassCard T={T} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 12 }}>סולם רצפים</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {streaks.map((s, i) => (
            <div
              key={i}
              title={`${s.type === 'W' ? 'רצף ניצחונות' : 'רצף הפסדים'}: ${s.len} עסקאות, ${s.r >= 0 ? '+' : ''}${s.r.toFixed(2)}R`}
              style={{
                padding: '6px 10px',
                background: s.type === 'W' ? `${T.accent.green}18` : `${T.accent.red}18`,
                border: `1px solid ${s.type === 'W' ? T.accent.green : T.accent.red}40`,
                borderRadius: 8,
                minWidth: 60,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: s.type === 'W' ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.type === 'W' ? '+' : '−'}{s.len}
              </div>
              <div style={{ fontSize: 9, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{s.r >= 0 ? '+' : ''}{s.r.toFixed(1)}R</div>
            </div>
          ))}
        </div>
      </GlassCard>}

      {/* ═══ MONTHLY DETAIL LIST ═══ */}
      {showPro && stats.monthlyPerf && stats.monthlyPerf.length > 0 && (
        <GlassCard T={T} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 12 }}>פירוט ביצועים חודשיים</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.monthlyPerf.map((mp, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: mp.pnl >= 0 ? `${T.accent.green}0a` : `${T.accent.red}0a`,
                  border: `1px solid ${mp.pnl >= 0 ? T.accent.green : T.accent.red}20`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: T.text.primary, fontWeight: 600 }}>{mp.month}</span>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: T.text.muted }}>{mp.trades} עסקאות</span>
                  <span style={{ fontSize: 11, color: T.text.muted }}>הצלחה {mp.winRate.toFixed(0)}%</span>
                  <span style={{ fontSize: 11, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>תוחלת {mp.expectancyR >= 0 ? '+' : ''}{mp.expectancyR.toFixed(2)}R</span>
                  <span style={{ fontSize: 13, color: mp.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}>
                    <PV>{mp.pnl >= 0 ? '+' : ''}${mp.pnl.toFixed(2)}</PV>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ═══ ADVANCED LAYER (PRO/MAX modes) ═══ */}
      {showPro && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
          <GlassCard T={T} glow={`${T.accent.purple}18`}>
            <div style={{ fontSize: 11, color: T.accent.purple, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 700 }}>● PRO · יחס שארפ מתגלגל</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sharpeRoll}>
                <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                <Tooltip contentStyle={tt} />
                <Line type="monotone" dataKey="sharpe" stroke={T.accent.purple} strokeWidth={2.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
          <GlassCard T={T} glow={`${T.accent.red}18`}>
            <div style={{ fontSize: 11, color: T.accent.red, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 700 }}>● PRO · עקומת תת-מים (Underwater)</div>
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
          </GlassCard>
          <GlassCard T={T} glow={`${T.accent.green}18`}>
            <div style={{ fontSize: 11, color: T.accent.green, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 700 }}>● PRO · אבולוציית Profit Factor</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={pfEvolution}>
                <defs>
                  <linearGradient id="pfG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.accent.green} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                <Tooltip contentStyle={tt} />
                <Area type="monotone" dataKey="pf" stroke={T.accent.green} fill="url(#pfG)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}

      {showMax && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
          <GlassCard T={T} glow={`${T.accent.cyan}22`}>
            <div style={{ fontSize: 11, color: T.accent.cyan, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 700 }}>★ MAX · רביעון אסטרטגי (WR × R)</div>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="wr" name="ניצחונות" unit="%" domain={[0, 100]} tick={{ fill: T.text.muted, fontSize: 10 }} />
                <YAxis type="number" dataKey="avgR" name="תוחלת R" tick={{ fill: T.text.muted, fontSize: 10 }} />
                <ZAxis type="number" dataKey="n" range={[60, 380]} />
                <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} formatter={(v: any, n: any, p: any) => [v, p.payload.coin]} />
                <Scatter data={quadrant}>
                  {quadrant.map((d, i) => (
                    <Cell key={i} fill={d.pnl >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.75} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </GlassCard>
          <GlassCard T={T} glow={`${T.accent.orange}22`}>
            <div style={{ fontSize: 11, color: T.accent.orange, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 8, fontWeight: 700 }}>★ MAX · סרט-חום 60 עסקאות אחרונות</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 3, padding: 8 }}>
              {heatTape.map((c, i) => {
                const intensity = Math.min(1, Math.abs(c.r) / 3);
                const bg = c.r >= 0
                  ? `rgba(0,255,163,${0.15 + intensity * 0.7})`
                  : `rgba(255,77,77,${0.15 + intensity * 0.7})`;
                return (
                  <div key={i} title={`R: ${c.r.toFixed(2)}`} style={{
                    aspectRatio: '1', borderRadius: 4, background: bg,
                    border: `1px solid ${T.border.subtle}`,
                    boxShadow: `inset 0 0 4px ${bg}`,
                  }} />
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: T.text.muted, textAlign: 'center', marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>
              ירוק = רווח · אדום = הפסד · עוצמה = |R|
            </div>
          </GlassCard>
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
          רמה: {showMax ? 'MAX · מחקר/אלפא' : showPro ? 'PRO · סקירה' : tier === 'minimal' ? 'BASIC · מתחיל' : 'CORE · סטנדרט'}
        </span>
      </div>

      {/* ═══ QUANT LAB — appears in review/research/alpha ═══ */}
      {showPro && <AnalyticsQuantLab T={T} trades={trades} privacyMode={privacyMode} />}

      {/* ═══ KEY OBSERVATIONS ═══ */}
      <GlassCard T={T} glow={`${T.accent.cyan}18`}>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>תצפיות מרכזיות</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {[
            { l: 'רצף ניצחונות הארוך ביותר', v: `${Math.max(0, ...streaks.filter(s => s.type === 'W').map(s => s.len))} עסקאות`, c: T.accent.green },
            { l: 'רצף הפסדים הארוך ביותר', v: `${Math.max(0, ...streaks.filter(s => s.type === 'L').map(s => s.len))} עסקאות`, c: T.accent.red },
            { l: 'עסקה הכי טובה', v: `+${stats.bestTradeR.toFixed(2)}R`, c: T.accent.green },
            { l: 'עסקה הכי גרועה', v: `${stats.worstTradeR.toFixed(2)}R`, c: T.accent.red },
            { l: 'נכסים פעילים', v: String(setupBoard.length), c: T.accent.blue },
            { l: 'תקופת מסחר', v: `${edgeDecay.length} חלונות`, c: T.accent.purple },
          ].map((o, i) => (
            <div key={i} style={{ padding: 10, background: T.bg.tertiary, borderRadius: 8, borderInlineStart: `2px solid ${o.c}` }}>
              <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 3 }}>{o.l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: o.c, fontFamily: "'JetBrains Mono', monospace" }}>{o.v}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
