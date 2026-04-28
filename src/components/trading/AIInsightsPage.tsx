/**
 * 🧠 AI INSIGHTS PAGE — "The Mainframe"
 * ────────────────────────────────────────────────────────────────
 * Central motherboard-shaped pulse button. On click:
 *   1) Royal loading sequence (electric circuits + scan).
 *   2) Deep analysis runs over trades.
 *   3) A randomly-rotated "chart pack" (1 of 4) animates in
 *      together with the deep insights.
 *   4) Every subsequent click swaps to a different chart pack.
 *
 * All copy in Hebrew. Designed to feel like opening a vault.
 */

import { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell, LineChart, Line,
  RadialBarChart, RadialBar, Treemap, ComposedChart,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';
import { analyzeDeep, type DeepInsight, type DeepSeverity } from '@/lib/ai-insights-deep';

interface AIInsightsPageProps {
  T: TradingTheme;
  trades: Trade[];
}

const SEV_META: Record<DeepSeverity, { label: string; color: (T: TradingTheme) => string; icon: string }> = {
  critical: { label: 'דחוף', color: (T) => T.accent.red, icon: '⛔' },
  warning:  { label: 'אזהרה', color: (T) => T.accent.orange, icon: '⚠️' },
  strength: { label: 'חוזק', color: (T) => T.accent.green, icon: '💎' },
  insight:  { label: 'תובנה', color: (T) => T.accent.cyan, icon: '🔍' },
};

const CAT_LABEL: Record<string, string> = {
  behavioural: 'התנהגותי',
  statistical: 'סטטיסטי',
  edge: "אדג'",
  timing: 'תזמון',
  risk: 'סיכון',
};

/* ──────────────────────────────────────────────────────────────── */
/* MOTHERBOARD BUTTON                                               */
/* ──────────────────────────────────────────────────────────────── */

const MotherboardButton: React.FC<{
  onClick: () => void;
  loading: boolean;
  T: TradingTheme;
  hasResult: boolean;
}> = ({ onClick, loading, T, hasResult }) => {
  const accent = T.accent.cyan;
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={loading ? {} : { scale: 1.03 }}
      whileTap={loading ? {} : { scale: 0.97 }}
      style={{
        position: 'relative',
        width: 240,
        height: 240,
        borderRadius: 28,
        border: `1.5px solid ${accent}55`,
        background: `radial-gradient(circle at 50% 35%, ${T.bg.tertiary}, ${T.bg.primary} 70%)`,
        boxShadow: loading
          ? `0 0 60px ${accent}66, inset 0 0 40px ${accent}33`
          : `0 0 40px ${accent}33, inset 0 0 30px ${accent}15`,
        cursor: loading ? 'wait' : 'pointer',
        overflow: 'hidden',
        padding: 0,
        outline: 'none',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Circuit traces — SVG */}
      <svg viewBox="0 0 240 240" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="trace-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.05" />
            <stop offset="50%" stopColor={accent} stopOpacity="0.8" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.05" />
          </linearGradient>
          <filter id="glow-filter">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static traces */}
        {[
          'M30,30 L80,30 L80,70 L120,70',
          'M210,30 L160,30 L160,70 L120,70',
          'M30,210 L80,210 L80,170 L120,170',
          'M210,210 L160,210 L160,170 L120,170',
          'M120,70 L120,170',
          'M30,120 L90,120',
          'M210,120 L150,120',
        ].map((d, i) => (
          <path key={i} d={d} stroke={`${accent}30`} strokeWidth={1.2} fill="none" />
        ))}

        {/* Animated electric pulses on traces */}
        {loading && [
          'M30,30 L80,30 L80,70 L120,70',
          'M210,30 L160,30 L160,70 L120,70',
          'M30,210 L80,210 L80,170 L120,170',
          'M210,210 L160,210 L160,170 L120,170',
        ].map((d, i) => (
          <path
            key={`pulse-${i}`}
            d={d}
            stroke="url(#trace-grad)"
            strokeWidth={2.2}
            fill="none"
            strokeDasharray="20 200"
            filter="url(#glow-filter)"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-220" dur={`${1.2 + i * 0.15}s`} repeatCount="indefinite" />
          </path>
        ))}

        {/* Solder pads */}
        {[[30, 30], [210, 30], [30, 210], [210, 210], [30, 120], [210, 120]].map(([x, y], i) => (
          <circle key={`pad-${i}`} cx={x} cy={y} r={4} fill={T.bg.primary} stroke={`${accent}AA`} strokeWidth={1.5} />
        ))}
      </svg>

      {/* Central CPU chip */}
      <motion.div
        animate={loading ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={loading ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{
          position: 'absolute',
          inset: '50% 0 0 50%',
          width: 110,
          height: 110,
          transform: 'translate(-50%, -50%)',
          borderRadius: 14,
          background: `linear-gradient(135deg, ${T.bg.surface}, ${T.bg.tertiary})`,
          border: `1.5px solid ${accent}88`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `inset 0 0 24px ${accent}22, 0 0 22px ${accent}55`,
        }}
      >
        {/* Pin lines */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 6,
              height: 2,
              background: `${accent}66`,
              top: -1,
              left: 12 + i * 12,
            }}
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <div
            key={`b-${i}`}
            style={{
              position: 'absolute',
              width: 6,
              height: 2,
              background: `${accent}66`,
              bottom: -1,
              left: 12 + i * 12,
            }}
          />
        ))}
        <div style={{ fontSize: 10, color: T.text.muted, letterSpacing: '0.2em', fontFamily: "'JetBrains Mono', monospace" }}>ORCA-AI</div>
        <div style={{
          fontSize: 30,
          marginTop: 4,
          filter: loading ? `drop-shadow(0 0 8px ${accent})` : 'none',
        }}>
          {loading ? '⚡' : (hasResult ? '🧠' : '◉')}
        </div>
        <div style={{
          fontSize: 10,
          marginTop: 4,
          color: loading ? accent : T.text.secondary,
          fontWeight: 700,
          letterSpacing: '0.08em',
        }}>
          {loading ? 'מנתח...' : hasResult ? 'נתח שוב' : 'הפעל'}
        </div>
      </motion.div>

      {/* Scan line during load */}
      {loading && (
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 260 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow: `0 0 18px ${accent}`,
          }}
        />
      )}
    </motion.button>
  );
};

/* ──────────────────────────────────────────────────────────────── */
/* CHART PACKS                                                      */
/* ──────────────────────────────────────────────────────────────── */

const CHART_PACKS = [
  'radar+heat',
  'scatter+treemap',
  'monthly+rolling',
  'streak+bucket',
  // ──── NEW ADVANCED PACKS ─────────────────────────────────────
  'equity+drawdown',     // pack 5: full equity curve + max-drawdown river
  'duration+session',    // pack 6: hold-time vs R + 24h session profit ring
  'momentum+volatility', // pack 7: rolling 10-trade win-rate + R volatility
  'kelly+sizing',        // pack 8: Kelly-optimal sizing vs actual + risk drift
  'efficiency+mae',      // pack 9: MAE/MFE-style efficiency cloud + regret index
  'dna+focus',           // pack 10: spider matrix per setup + focus pareto
] as const;
type Pack = typeof CHART_PACKS[number];

/* ──────────────────────────────────────────────────────────────── */
/* MAIN PAGE                                                        */
/* ──────────────────────────────────────────────────────────────── */

export const AIInsightsPage: React.FC<AIInsightsPageProps> = ({ T, trades }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeDeep> | null>(null);
  const [pack, setPack] = useState<Pack>('radar+heat');
  const runCount = useRef(0);

  const tt = {
    background: T.bg.card,
    border: `1px solid ${T.border.medium}`,
    borderRadius: 10,
    color: T.text.primary,
    fontSize: 12,
    boxShadow: T.shadow.elevated,
    padding: '8px 12px',
  };

  const run = useCallback(() => {
    if (loading) return;
    setLoading(true);
    // pick a different pack
    runCount.current++;
    const next = CHART_PACKS[runCount.current % CHART_PACKS.length];
    setPack(next);
    // royal loading window
    setTimeout(() => {
      setAnalysis(analyzeDeep(trades));
      setLoading(false);
    }, 1900);
  }, [loading, trades]);

  /* ──── Chart data ──── */

  const dnaData = useMemo(() => {
    if (!analysis) return [];
    const d = analysis.dna;
    return [
      { axis: "אדג'", value: d.edge, full: 100 },
      { axis: 'משמעת', value: d.discipline, full: 100 },
      { axis: 'עקביות', value: d.consistency, full: 100 },
      { axis: 'התנהגות', value: d.behaviour, full: 100 },
    ];
  }, [analysis]);

  const heatData = useMemo(() => {
    // Day x Hour heatmap data — flat list
    const matrix: { day: number; hour: number; pnl: number; n: number; avgR: number }[] = [];
    const map = new Map<string, { pnl: number; n: number; r: number }>();
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const k = `${d.getDay()}-${d.getHours()}`;
        const cur = map.get(k) || { pnl: 0, n: 0, r: 0 };
        cur.pnl += t.pnl; cur.n++; cur.r += t.returnR;
        map.set(k, cur);
      } catch { /* skip */ }
    });
    map.forEach((v, k) => {
      const [day, hour] = k.split('-').map(Number);
      matrix.push({ day, hour, pnl: v.pnl, n: v.n, avgR: v.r / v.n });
    });
    return matrix;
  }, [trades]);

  const scatterData = useMemo(() =>
    trades.map(t => ({
      risk: t.risk,
      pnl: t.pnl,
      r: t.returnR,
      coin: t.coin,
      win: t.winLoss === 'Win',
    })),
  [trades]);

  const treemapData = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach(t => { map[t.coin] = (map[t.coin] || 0) + Math.abs(t.pnl); });
    return Object.entries(map).map(([name, size]) => ({ name, size }));
  }, [trades]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; pnl: number; r: number; n: number }> = {};
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!map[k]) map[k] = { month: k, pnl: 0, r: 0, n: 0 };
        map[k].pnl += t.pnl; map[k].r += t.returnR; map[k].n++;
      } catch { /* skip */ }
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      month: m.month,
      pnl: m.pnl,
      avgR: m.r / m.n,
      trades: m.n,
    }));
  }, [trades]);

  const rollingData = useMemo(() => {
    const W = Math.max(5, Math.min(15, Math.floor(trades.length / 4)));
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const exp = slice.reduce((s, t) => s + t.returnR, 0) / slice.length;
      return { id: i + 1, exp };
    });
  }, [trades]);

  const streakBands = useMemo(() => {
    const bands: { idx: number; len: number; type: 'W' | 'L' }[] = [];
    let cur: { type: 'W' | 'L'; len: number } | null = null;
    trades.forEach((t, i) => {
      if (t.winLoss === 'Break Even') return;
      const ty = t.winLoss === 'Win' ? 'W' : 'L';
      if (cur && cur.type === ty) cur.len++;
      else {
        if (cur) bands.push({ idx: bands.length, ...cur });
        cur = { type: ty, len: 1 };
      }
    });
    if (cur) bands.push({ idx: bands.length, ...cur });
    return bands;
  }, [trades]);

  const rBuckets = useMemo(() => {
    const b: Record<string, number> = { '<-2R': 0, '-2 ÷ -1R': 0, '-1 ÷ 0R': 0, '0 ÷ 1R': 0, '1 ÷ 2R': 0, '2 ÷ 3R': 0, '3R+': 0 };
    trades.forEach(t => {
      const r = t.returnR;
      if (r < -2) b['<-2R']++;
      else if (r < -1) b['-2 ÷ -1R']++;
      else if (r < 0) b['-1 ÷ 0R']++;
      else if (r < 1) b['0 ÷ 1R']++;
      else if (r < 2) b['1 ÷ 2R']++;
      else if (r < 3) b['2 ÷ 3R']++;
      else b['3R+']++;
    });
    return Object.entries(b).map(([k, v]) => ({ bucket: k, count: v }));
  }, [trades]);

  /* ──── EMPTY STATE ──── */

  if (trades.length === 0) {
    return (
      <GlassCard T={T} style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🧠</div>
        <div style={{ fontSize: 18, color: T.text.primary, fontWeight: 700, marginBottom: 6 }}>אין עדיין נתונים לניתוח</div>
        <div style={{ fontSize: 13, color: T.text.muted }}>הוסף עסקאות כדי להפעיל את מנוע התובנות העמוק.</div>
      </GlassCard>
    );
  }

  /* ──── RENDER ──── */

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', 'Inter', sans-serif" }}>
      {/* HERO — central motherboard button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px 28px' }}>
        <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 6 }}>
          ORCA · MAINFRAME
        </div>
        <div style={{ fontSize: 22, color: T.text.primary, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em' }}>
          מנוע תובנות עמוק
        </div>
        <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 22, maxWidth: 460, textAlign: 'center', lineHeight: 1.6 }}>
          ניתוח רב-שכבתי של {trades.length} עסקאות — מזהה דפוסים סמויים שאף סוחר לא היה רואה לבד.
        </div>

        <MotherboardButton onClick={run} loading={loading} T={T} hasResult={!!analysis} />

        {/* Loading status text */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              {[
                'טוען מטריצת עסקאות...',
                'מזהה דפוסים סמויים...',
                'מחשב DNA סוחר...',
                'מסנן לפי מובהקות סטטיסטית...',
              ].map((s, i) => (
                <motion.div
                  key={s}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ delay: i * 0.35, duration: 1.5, repeat: Infinity }}
                  style={{ fontSize: 11, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em' }}
                >
                  {s}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RESULTS */}
      <AnimatePresence mode="wait">
        {analysis && !loading && (
          <motion.div
            key={`${pack}-${runCount.current}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* DNA STRIP */}
            <GlassCard T={T} style={{ marginBottom: 16, padding: 18 }} glow={`${T.accent.cyan}22`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>DNA סוחר</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>
                  {analysis.dna.overall}
                  <span style={{ fontSize: 12, color: T.text.muted, marginInlineStart: 4 }}>/100</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: "אדג'", value: analysis.dna.edge, color: T.accent.cyan },
                  { label: 'משמעת', value: analysis.dna.discipline, color: T.accent.green },
                  { label: 'עקביות', value: analysis.dna.consistency, color: T.accent.blue },
                  { label: 'התנהגות', value: analysis.dna.behaviour, color: T.accent.purple },
                ].map((s, i) => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ height: 6, background: T.bg.tertiary, borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.value}%` }}
                        transition={{ duration: 1.1, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: '100%', background: s.color, boxShadow: `0 0 10px ${s.color}88` }}
                      />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.color, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* CHART PACK — rotates each click */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
              {pack === 'radar+heat' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>ראדאר DNA</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={dnaData}>
                        <PolarGrid stroke={T.border.subtle} />
                        <PolarAngleAxis dataKey="axis" tick={{ fill: T.text.secondary, fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: T.text.muted, fontSize: 9 }} />
                        <Radar dataKey="value" stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.35} strokeWidth={2} />
                        <Tooltip contentStyle={tt} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>מפת ביצועים יום × שעה</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="hour" name="שעה" domain={[0, 23]} tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis type="number" dataKey="day" name="יום" domain={[0, 6]} tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(d) => ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][d] || ''} />
                        <ZAxis type="number" dataKey="n" range={[40, 400]} />
                        <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} />
                        <Scatter data={heatData}>
                          {heatData.map((d, i) => (
                            <Cell key={i} fill={d.avgR >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.7} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {pack === 'scatter+treemap' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>סיכון מול תשואה</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="risk" name="סיכון $" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis type="number" dataKey="pnl" name="P&L $" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} />
                        <Scatter data={scatterData}>
                          {scatterData.map((d, i) => (
                            <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.75} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>מפת חשיפה לפי נכס</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <Treemap
                        data={treemapData}
                        dataKey="size"
                        stroke={T.bg.primary}
                        fill={T.accent.cyan}
                      />
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {pack === 'monthly+rolling' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>אבולוציית תוחלת חודשית</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={monthlyData}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {monthlyData.map((m, i) => <Cell key={i} fill={m.pnl >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.85} />)}
                        </Bar>
                        <Line type="monotone" dataKey="avgR" stroke={T.accent.cyan} strokeWidth={2} dot={{ fill: T.accent.cyan, r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>תוחלת מתגלגלת (R)</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={rollingData}>
                        <defs>
                          <linearGradient id="rollG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.purple} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={T.accent.purple} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Area type="monotone" dataKey="exp" stroke={T.accent.purple} fill="url(#rollG)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {pack === 'streak+bucket' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>גלי רצפים</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={streakBands.map(b => ({ idx: b.idx + 1, len: b.type === 'W' ? b.len : -b.len, type: b.type }))}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="idx" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Bar dataKey="len" radius={[4, 4, 4, 4]}>
                          {streakBands.map((b, i) => <Cell key={i} fill={b.type === 'W' ? T.accent.green : T.accent.red} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>התפלגות R לפי טווח</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadialBarChart innerRadius="20%" outerRadius="100%" data={rBuckets} startAngle={180} endAngle={0}>
                        <RadialBar background dataKey="count">
                          {rBuckets.map((b, i) => (
                            <Cell key={i} fill={b.bucket.includes('-') || b.bucket.startsWith('<') ? T.accent.red : T.accent.cyan} />
                          ))}
                        </RadialBar>
                        <Tooltip contentStyle={tt} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}
            </div>

            {/* INSIGHTS */}
            {analysis.insights.length === 0 ? (
              <GlassCard T={T} style={{ padding: 30, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <div style={{ fontSize: 14, color: T.text.secondary }}>לא נמצאו דפוסים מובהקים. המשך לצבור עסקאות כדי לקבל תובנות חזקות יותר.</div>
              </GlassCard>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
                {analysis.insights.map((ins, i) => (
                  <DeepInsightCard key={ins.id} ins={ins} T={T} delay={i * 0.06} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────── */
/* INSIGHT CARD                                                     */
/* ──────────────────────────────────────────────────────────────── */

const DeepInsightCard: React.FC<{ ins: DeepInsight; T: TradingTheme; delay: number }> = ({ ins, T, delay }) => {
  const meta = SEV_META[ins.severity];
  const c = meta.color(T);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <GlassCard T={T} glow={`${c}1f`} style={{ borderInlineStart: `3px solid ${c}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ fontSize: 26, lineHeight: 1, marginTop: 2 }}>{ins.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: T.text.primary }}>{ins.title}</span>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: `${c}22`, color: c, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{meta.label}</span>
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: T.bg.tertiary, color: T.text.muted, fontWeight: 600 }}>{CAT_LABEL[ins.category] || ins.category}</span>
              <span style={{ fontSize: 9, color: T.text.dim, marginInlineStart: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                {(ins.confidence * 100).toFixed(0)}% ביטחון
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: T.text.primary, lineHeight: 1.65, marginBottom: 8 }}>{ins.finding}</div>
            <div style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.6, marginBottom: 10, padding: '8px 10px', background: T.bg.tertiary, borderRadius: 8, borderInlineStart: `2px solid ${T.border.medium}` }}>
              <span style={{ color: T.text.muted, fontWeight: 700, marginInlineEnd: 6 }}>ראיה:</span>
              {ins.evidence}
            </div>
            <div style={{ fontSize: 12, color: T.text.primary, lineHeight: 1.55, padding: '8px 10px', background: `${c}10`, borderRadius: 8, borderInlineStart: `2px solid ${c}` }}>
              <span style={{ color: c, fontWeight: 800, marginInlineEnd: 6 }}>פעולה:</span>
              {ins.action}
            </div>
            {ins.metric && ins.metric.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {ins.metric.map((m, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 70, padding: '6px 10px', background: T.bg.tertiary, borderRadius: 6, textAlign: 'center', border: `1px solid ${T.border.subtle}` }}>
                    <div style={{ fontSize: 9, color: T.text.muted, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};
