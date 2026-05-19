import { getEffectiveR } from "@/lib/r-multiple";
import { useVisibleTrades } from '@/lib/display-mode-format';
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

import { useMemo, useState, useCallback, useRef, memo } from 'react';
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
import { findBestEdge } from '@/lib/psychology-diagnostic';
import { useLang } from '@/hooks/use-lang';

type Tr = (he: string, en: string) => string;

interface AIInsightsPageProps {
  T: TradingTheme;
  trades: Trade[];
}

const getSevMeta = (t: Tr): Record<DeepSeverity, { label: string; color: (T: TradingTheme) => string; icon: string }> => ({
  critical: { label: t('דחוף','Critical'), color: (T) => T.accent.red, icon: '⛔' },
  warning:  { label: t('אזהרה','Warning'), color: (T) => T.accent.orange, icon: '⚠️' },
  strength: { label: t('חוזק','Strength'), color: (T) => T.accent.green, icon: '💎' },
  insight:  { label: t('תובנה','Insight'), color: (T) => T.accent.cyan, icon: '🔍' },
});

const getCatLabel = (t: Tr): Record<string, string> => ({
  behavioural: t('התנהגותי','Behavioral'),
  statistical: t('סטטיסטי','Statistical'),
  edge: t("אדג'",'Edge'),
  timing: t('תזמון','Timing'),
  risk: t('סיכון','Risk'),
});

/* ──────────────────────────────────────────────────────────────── */
/* MOTHERBOARD BUTTON                                               */
/* ──────────────────────────────────────────────────────────────── */

const MotherboardButton: React.FC<{
  onClick: () => void;
  loading: boolean;
  T: TradingTheme;
  hasResult: boolean;
  t: Tr;
}> = ({ onClick, loading, T, hasResult, t }) => {
  const accent = T.accent.cyan;
  return (
    <motion.button
      data-mainframe-button
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
          {loading ? t('מנתח...','Analyzing...') : hasResult ? t('נתח שוב','Re-analyze') : t('הפעל','Run')}
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
  'equity+drawdown',
  'duration+session',
  'momentum+volatility',
  'kelly+sizing',
  'efficiency+mae',
  'dna+focus',
  // ── ELITE QUANT PACKS ─────────────────────────────────────────
  'autocorr+regime',     // pack 11: lag-1 autocorrelation + win-rate regime band
  'montecarlo+riskcone', // pack 12: 200-path Monte Carlo equity + 95% risk cone
] as const;
type Pack = typeof CHART_PACKS[number];

/* ──────────────────────────────────────────────────────────────── */
/* LOW TRADES POPUP                                                 */
/* ──────────────────────────────────────────────────────────────── */
const LowTradesPopup: React.FC<{ count: number; T: TradingTheme; isRTL: boolean; onClose: () => void }> = ({ count, T, isRTL, onClose }) => {
  const linesHe = [
    `עם ${count} עסקאות איזה תובנות אתה רוצה חחח 😅`,
    'אחי, גם המודל הכי חכם בעולם לא ימציא דפוסים יש מאין.',
    'תחזור לשוק, תן בראש, ותבוא נדבר אחרי שיש לפחות 10 עסקאות.',
    'אנחנו מחכים לך 🐋📈',
  ];
  const linesEn = [
    `With only ${count} trades — what insights are you even hoping for? 😅`,
    "Even the smartest model on Earth can't hallucinate patterns out of nothing.",
    'Get back to the market, give it your best, and come back once you have at least 10 trades.',
    "We'll be waiting 🐋📈",
  ];
  const lines = isRTL ? linesHe : linesEn;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)', display: 'grid', placeItems: 'center', padding: 20 }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ width: '100%', maxWidth: 460, background: `linear-gradient(165deg, ${T.bg.card}, ${T.bg.secondary})`, border: `1px solid ${T.accent.cyan}40`, borderRadius: 24, padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${T.accent.cyan}22` }}
      >
        <div style={{ position: 'absolute', top: -2, left: 24, right: 24, height: 2, background: `linear-gradient(90deg, transparent, ${T.accent.cyan}, transparent)` }} />
        <div style={{ fontSize: 64, marginBottom: 12, lineHeight: 1 }}>🤔</div>
        <div style={{ fontSize: 11, color: T.accent.cyan, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>
          {isRTL ? 'אזהרת נתונים דלילים' : 'Sparse data warning'}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, marginBottom: 18, lineHeight: 1.4 }}>{lines[0]}</div>
        <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7, marginBottom: 22 }}>
          {lines.slice(1).map((l, i) => <div key={i} style={{ marginBottom: 6 }}>{l}</div>)}
        </div>
        <div style={{ padding: '10px 16px', marginBottom: 20, borderRadius: 12, background: `${T.accent.green}10`, border: `1px solid ${T.accent.green}30`, fontSize: 12, color: T.accent.green, fontWeight: 600 }}>
          {isRTL ? `יש לך ${count} עסקאות · נדרשות לפחות 10` : `You have ${count} trades · 10 minimum required`}
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.green})`, color: T.bg.primary, fontWeight: 800, fontSize: 14, cursor: 'pointer', letterSpacing: '0.04em', boxShadow: `0 10px 24px ${T.accent.cyan}40` }}>
          {isRTL ? 'יאלה, חזרתי לשוק 🚀' : 'Got it, back to the market 🚀'}
        </button>
      </motion.div>
    </motion.div>
  );
};

/* ──────────────────────────────────────────────────────────────── */
/* MAIN PAGE                                                        */
/* ──────────────────────────────────────────────────────────────── */

const AIInsightsPage_Impl: React.FC<AIInsightsPageProps> = ({ T, trades: _allTrades }) => {
  const { visibleTrades: trades, isMoney, formatAxis: fmtAxis, formatValue: fmtVal } = useVisibleTrades(_allTrades);
  const { t, isRTL } = useLang();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeDeep> | null>(null);
  const [pack, setPack] = useState<Pack>('radar+heat');
  const [showLowTradesPopup, setShowLowTradesPopup] = useState(false);
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
    if (trades.length < 10) {
      setShowLowTradesPopup(true);
      return;
    }
    setLoading(true);
    runCount.current++;
    const next = CHART_PACKS[runCount.current % CHART_PACKS.length];
    setPack(next);
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
      { axis: t('אדג׳',t('אדג\'','Edge')), value: d.edge, full: 100 },
      { axis: t('משמעת','Discipline'), value: d.discipline, full: 100 },
      { axis: t('עקביות','Consistency'), value: d.consistency, full: 100 },
      { axis: t('התנהגות','Behavior'), value: d.behaviour, full: 100 },
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
        cur.pnl += t.pnl; cur.n++; cur.r += getEffectiveR(t);
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
      r: getEffectiveR(t),
      coin: t.coin,
      win: t.winLoss === 'Win',
    })),
  [trades]);

  const treemapData = useMemo(() => {
    const map: Record<string, { size: number; pnl: number; wins: number; losses: number; n: number }> = {};
    trades.forEach(t => {
      if (!map[t.coin]) map[t.coin] = { size: 0, pnl: 0, wins: 0, losses: 0, n: 0 };
      map[t.coin].size += Math.abs(t.pnl);
      map[t.coin].pnl += t.pnl;
      map[t.coin].n += 1;
      if (t.winLoss === 'Win') map[t.coin].wins += 1;
      else if (t.winLoss === 'Loss') map[t.coin].losses += 1;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.size - a.size);
  }, [trades]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; pnl: number; r: number; n: number }> = {};
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!map[k]) map[k] = { month: k, pnl: 0, r: 0, n: 0 };
        map[k].pnl += t.pnl; map[k].r += getEffectiveR(t); map[k].n++;
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
      const exp = slice.reduce((s, t) => s + getEffectiveR(t), 0) / slice.length;
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
      const r = getEffectiveR(t);
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

  /* ──── NEW DATASETS for advanced packs ──── */

  const equityDrawdown = useMemo(() => {
    let eq = 0, peak = 0, eqR = 0, peakR = 0;
    return trades.map((t, i) => {
      eq += t.pnl;
      eqR += getEffectiveR(t);
      if (eq > peak) peak = eq;
      if (eqR > peakR) peakR = eqR;
      const dd = peak > 0 ? ((eq - peak) / peak) * 100 : 0;
      const ddR = peakR > 0 ? ((eqR - peakR) / peakR) * 100 : 0;
      return { i: i + 1, equity: +eq.toFixed(2), equityR: +eqR.toFixed(3), drawdown: +dd.toFixed(2), drawdownR: +ddR.toFixed(2) };
    });
  }, [trades]);

  const sessionRing = useMemo(() => {
    const s = [
      { name: t('אסיה','Asia'), from: 0, to: 7, pnl: 0, n: 0 },
      { name: t('לונדון','London'), from: 7, to: 13, pnl: 0, n: 0 },
      { name: t('ניו-יורק','New York'), from: 13, to: 20, pnl: 0, n: 0 },
      { name: t('לילה','Night'), from: 20, to: 24, pnl: 0, n: 0 },
    ];
    trades.forEach(t => {
      try {
        const h = new Date(t.date.replace(' ', 'T')).getHours();
        const sess = s.find(x => h >= x.from && h < x.to);
        if (sess) { sess.pnl += t.pnl; sess.n++; }
      } catch { /* skip */ }
    });
    return s.map(x => ({ name: x.name, value: Math.abs(x.pnl) || 0.01, pnl: +x.pnl.toFixed(2), n: x.n }));
  }, [trades]);

  const durationData = useMemo(() =>
    trades.slice(0, 200).map((t, i) => ({
      idx: i + 1,
      r: getEffectiveR(t),
      size: Math.max(2, Math.abs(t.risk) || 2),
      win: t.winLoss === 'Win',
    })), [trades]);

  const momentumData = useMemo(() => {
    const W = 10;
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const wins = slice.filter(x => x.winLoss === 'Win').length;
      const wr = (wins / slice.length) * 100;
      const mean = slice.reduce((s, x) => s + getEffectiveR(x), 0) / slice.length;
      const variance = slice.reduce((s, x) => s + Math.pow(getEffectiveR(x) - mean, 2), 0) / slice.length;
      return { i: i + 1, wr: +wr.toFixed(1), vol: +Math.sqrt(variance).toFixed(3) };
    });
  }, [trades]);

  const kellyData = useMemo(() => {
    const W = 20;
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const wins = slice.filter(x => x.winLoss === 'Win');
      const losses = slice.filter(x => x.winLoss === 'Loss');
      const wr = wins.length / Math.max(slice.length, 1);
      const avgW = wins.length ? wins.reduce((s, x) => s + getEffectiveR(x), 0) / wins.length : 1;
      const avgL = losses.length ? Math.abs(losses.reduce((s, x) => s + getEffectiveR(x), 0) / losses.length) : 1;
      const rr = avgW / Math.max(avgL, 0.001);
      const kelly = Math.max(0, Math.min(0.25, (wr - (1 - wr) / Math.max(rr, 0.01))));
      const actual = (slice.reduce((s, x) => s + Math.abs(x.risk || 0), 0) / Math.max(slice.length, 1)) / 100;
      return { i: i + 1, kelly: +(kelly * 100).toFixed(2), actual: +(actual * 100).toFixed(2) };
    });
  }, [trades]);

  const efficiencyCloud = useMemo(() =>
    trades.map((t, i) => ({
      i,
      eff: Math.max(-5, Math.min(5, getEffectiveR(t))),
      pnl: t.pnl,
      risk: Math.abs(t.risk) || 1,
      win: t.winLoss === 'Win',
    })), [trades]);

  const setupSpider = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; n: number; r: number }> = {};
    trades.forEach(t => {
      const k = t.coin || 'OTHER';
      if (!map[k]) map[k] = { pnl: 0, wins: 0, n: 0, r: 0 };
      map[k].pnl += t.pnl; map[k].n++; map[k].r += getEffectiveR(t);
      if (t.winLoss === 'Win') map[k].wins++;
    });
    const arr = Object.entries(map).map(([coin, v]) => ({
      coin, pnl: v.pnl, wr: (v.wins / v.n) * 100, exp: v.r / v.n, n: v.n,
    })).sort((a, b) => b.pnl - a.pnl).slice(0, 6);
    if (arr.length === 0) return [];
    const maxP = Math.max(...arr.map(x => Math.abs(x.pnl)), 1);
    const maxN = Math.max(...arr.map(x => x.n), 1);
    return arr.map(x => ({
      axis: x.coin,
      Profit: Math.max(0, Math.round((x.pnl / maxP) * 100)),
      Wins: Math.round(x.wr),
      Expectancy: Math.max(0, Math.min(100, Math.round((x.exp + 1) * 50))),
      Volume: Math.round((x.n / maxN) * 100),
    }));
  }, [trades]);

  const focusPareto = useMemo(() => {
    const map: Record<string, number> = {};
    trades.forEach(t => { map[t.coin] = (map[t.coin] || 0) + t.pnl; });
    const arr = Object.entries(map).map(([k, v]) => ({ k, pnl: v })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 10);
    let cum = 0;
    const total = arr.reduce((s, x) => s + Math.abs(x.pnl), 0) || 1;
    return arr.map(x => {
      cum += Math.abs(x.pnl);
      return { name: x.k, pnl: +x.pnl.toFixed(2), cum: +((cum / total) * 100).toFixed(1) };
    });
  }, [trades]);

  /* ── Lag-1 autocorrelation: does today's R predict tomorrow's R? ── */
  const autocorrData = useMemo(() => {
    if (trades.length < 3) return [];
    return trades.slice(1).map((t, i) => ({
      prev: +getEffectiveR(trades[i]).toFixed(2),
      cur: +getEffectiveR(t).toFixed(2),
      win: t.winLoss === 'Win',
    }));
  }, [trades]);

  /* ── Rolling regime band: 20-trade win-rate corridor ── */
  const regimeData = useMemo(() => {
    const W = 20;
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const wins = slice.filter(x => x.winLoss === 'Win').length;
      const wr = (wins / slice.length) * 100;
      // bull/bear regime bands
      return { i: i + 1, wr: +wr.toFixed(1), bull: 60, bear: 40 };
    });
  }, [trades]);

  /* ── Monte Carlo equity simulation (200 paths) ── */
  const monteCarloData = useMemo(() => {
    if (trades.length < 5) return [];
    const returns = trades.map(t => getEffectiveR(t));
    const PATHS = 50;
    const STEPS = Math.min(60, trades.length * 2);
    const allPaths: number[][] = [];
    for (let p = 0; p < PATHS; p++) {
      const path = [0];
      for (let s = 0; s < STEPS; s++) {
        const r = returns[Math.floor(Math.random() * returns.length)];
        path.push(path[path.length - 1] + r);
      }
      allPaths.push(path);
    }
    // build per-step percentile envelope
    const result = [];
    for (let s = 0; s <= STEPS; s++) {
      const vals = allPaths.map(p => p[s]).sort((a, b) => a - b);
      result.push({
        step: s,
        p05: +vals[Math.floor(vals.length * 0.05)].toFixed(2),
        p25: +vals[Math.floor(vals.length * 0.25)].toFixed(2),
        p50: +vals[Math.floor(vals.length * 0.5)].toFixed(2),
        p75: +vals[Math.floor(vals.length * 0.75)].toFixed(2),
        p95: +vals[Math.floor(vals.length * 0.95)].toFixed(2),
      });
    }
    return result;
  }, [trades]);

  /* ── BEST-OF EDGE — golden card data ── */
  const bestEdge = useMemo(() => findBestEdge(trades), [trades]);


  if (trades.length === 0) {
    return (
      <GlassCard T={T} style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🧠</div>
        <div style={{ fontSize: 18, color: T.text.primary, fontWeight: 700, marginBottom: 6 }}>{t('אין עדיין נתונים לניתוח','No data to analyze yet')}</div>
        <div style={{ fontSize: 13, color: T.text.muted }}>{t('הוסף עסקאות כדי להפעיל את מנוע התובנות העמוק.','Add trades to power the deep insights engine.')}</div>
      </GlassCard>
    );
  }

  /* ──── RENDER ──── */

  // Elite SVG defs — referenced by url(#id) inside Recharts charts below.
  // Rendered once, hidden, accessible to all chart SVGs as global defs.
  const EliteDefs = (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
      <defs>
        <linearGradient id="orca-g-cyan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.95} />
          <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="orca-g-cyan-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={1} />
          <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.35} />
        </linearGradient>
        <linearGradient id="orca-g-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent.green} stopOpacity={1} />
          <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.25} />
        </linearGradient>
        <linearGradient id="orca-g-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent.red} stopOpacity={1} />
          <stop offset="100%" stopColor={T.accent.red} stopOpacity={0.25} />
        </linearGradient>
        <linearGradient id="orca-g-purple" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent.purple} stopOpacity={0.9} />
          <stop offset="100%" stopColor={T.accent.purple} stopOpacity={0.08} />
        </linearGradient>
        <linearGradient id="orca-g-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent.orange} stopOpacity={1} />
          <stop offset="100%" stopColor={T.accent.orange} stopOpacity={0.2} />
        </linearGradient>
        <radialGradient id="orca-g-radial" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.7} />
          <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0} />
        </radialGradient>
        <filter id="orca-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="orca-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={T.accent.cyan} floodOpacity="0.35" />
        </filter>
      </defs>
    </svg>
  );

  // Elite chart frame — premium header, badges, divider strip
  const Frame: React.FC<{
    title: string; subtitle?: string; tone?: 'cyan' | 'green' | 'red' | 'purple' | 'orange';
    badge?: string | number; children: React.ReactNode;
  }> = ({ title, subtitle, tone = 'cyan', badge, children }) => {
    const tColor = tone === 'green' ? T.accent.green : tone === 'red' ? T.accent.red
      : tone === 'purple' ? T.accent.purple : tone === 'orange' ? T.accent.orange : T.accent.cyan;
    return (
      <GlassCard T={T} style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: 2, background: `linear-gradient(90deg, transparent, ${tColor}, transparent)`,
          opacity: 0.7,
        }} />
        <div style={{ padding: '14px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 9.5, color: T.text.dim, textTransform: 'uppercase',
              letterSpacing: '0.22em', marginBottom: 3, fontFamily: "'JetBrains Mono', monospace",
            }}>{tone.toUpperCase()} · ANALYSIS</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {badge !== undefined && (
            <div style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 10,
              fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
              background: `${tColor}18`, color: tColor, border: `1px solid ${tColor}40`,
              flexShrink: 0,
            }}>{badge}</div>
          )}
        </div>
        <div style={{ padding: '4px 8px 12px' }}>{children}</div>
      </GlassCard>
    );
  };

  return (
    <div dir={t('rtl','ltr')} style={{ fontFamily: "'Heebo', 'Inter', sans-serif" }}>
      {EliteDefs}
      <AnimatePresence>
        {showLowTradesPopup && (
          <LowTradesPopup count={trades.length} T={T} isRTL={isRTL} onClose={() => setShowLowTradesPopup(false)} />
        )}
      </AnimatePresence>

      {/* HERO — central motherboard button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px 28px' }}>
        <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 6 }}>
          ORCA · MAINFRAME
        </div>
        <div style={{ fontSize: 22, color: T.text.primary, fontWeight: 800, marginBottom: 4, letterSpacing: '-0.01em' }}>
          {t('מנוע תובנות עמוק','Deep Insights Engine')}
        </div>
        <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 22, maxWidth: 460, textAlign: 'center', lineHeight: 1.6 }}>
          {t(`ניתוח רב-שכבתי של ${trades.length} trades — מזהה דפוסים סמויים שאף סוחר לא היה רואה לבד.`, `Multi-layer analysis of ${trades.length} trades — surfaces hidden patterns no trader could spot alone.`)}
        </div>

        <MotherboardButton onClick={run} loading={loading} T={T} hasResult={!!analysis} t={t} />

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
                t('טוען מטריצת עסקאות...','Loading trade matrix...'),
                t('מזהה דפוסים סמויים...','Detecting hidden patterns...'),
                t('מחשב DNA סוחר...','Computing trader DNA...'),
                t('מסנן לפי מובהקות סטטיסטית...','Filtering by statistical significance...'),
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
                <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.18em' }}>{t('DNA סוחר','Trader DNA')}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>
                  {analysis.dna.overall}
                  <span style={{ fontSize: 12, color: T.text.muted, marginInlineStart: 4 }}>/100</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: t('אדג׳',t('אדג\'','Edge')), value: analysis.dna.edge, color: T.accent.cyan },
                  { label: t('משמעת','Discipline'), value: analysis.dna.discipline, color: T.accent.green },
                  { label: t('עקביות','Consistency'), value: analysis.dna.consistency, color: T.accent.blue },
                  { label: t('התנהגות','Behavior'), value: analysis.dna.behaviour, color: T.accent.purple },
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
                  <Frame title={t('ראדאר ה-DNA הסוחר','Trader DNA Radar')} subtitle={t('ארבעה מימדים: Edge, Discipline, Consistency, Behavior','Four axes: Edge, Discipline, Consistency, Behavior')} tone="cyan" badge={`${analysis.dna.overall}/100`}>
                    <ResponsiveContainer width="100%" height={290}>
                      <RadarChart data={dnaData}>
                        <defs>
                          <radialGradient id="radar-fill">
                            <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.55} />
                            <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.05} />
                          </radialGradient>
                        </defs>
                        <PolarGrid stroke={T.border.subtle} strokeDasharray="2 4" />
                        <PolarAngleAxis dataKey="axis" tick={{ fill: T.text.secondary, fontSize: 12, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: T.text.dim, fontSize: 9 }} stroke={T.border.subtle} />
                        <Radar dataKey="value" stroke={T.accent.cyan} fill="url(#radar-fill)" strokeWidth={2.5} filter="url(#orca-glow)" />
                        <Tooltip contentStyle={tt} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Frame>
                  <Frame title={t('מפת ביצועים: יום × שעה','Performance Heatmap: day × hour')} subtitle={t('גודל הנקודה = מספר עסקאות, צבע = רווח/הפסד','Dot size = trade count, color = P&L')} tone="purple" badge={`${heatData.length} buckets`}>
                    <ResponsiveContainer width="100%" height={290}>
                      <ScatterChart margin={{ top: 8, right: 14, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="2 4" />
                        <XAxis type="number" dataKey="hour" name={t('שעה','Hour')} domain={[0, 23]} ticks={[0, 4, 8, 12, 16, 20]} tick={{ fill: T.text.muted, fontSize: 10 }} label={{ value: t('שעה','Hour'), position: 'insideBottom', offset: -2, fill: T.text.dim, fontSize: 10 }} />
                        <YAxis type="number" dataKey="day" name={t('יום','Day')} domain={[0, 6]} tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(d) => (t('rtl','ltr') === 'rtl' ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] : ['Su','Mo','Tu','We','Th','Fr','Sa'])[d] || ''} />
                        <ZAxis type="number" dataKey="n" range={[60, 520]} />
                        <Tooltip contentStyle={tt} cursor={{ stroke: T.accent.cyan, strokeOpacity: 0.3, strokeDasharray: '3 3' }} />
                        <Scatter data={heatData}>
                          {heatData.map((d, i) => (
                            <Cell key={i} fill={d.avgR >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.78} stroke={d.avgR >= 0 ? T.accent.green : T.accent.red} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Frame>
                </>
              )}

              {pack === 'scatter+treemap' && (
                <>
                  <Frame title={t('Risk מול תשואה','Risk vs Return')} subtitle={t('גילוי קלאסטרים — היכן ה-edge האמיתי שלך','Cluster discovery — where your real edge lives')} tone="cyan" badge={`r-pearson`}>
                    <ResponsiveContainer width="100%" height={290}>
                      <ScatterChart margin={{ top: 8, right: 14, left: 0, bottom: 8 }}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="2 4" />
                        <XAxis type="number" dataKey="risk" name={t('סיכון $','Risk $')} tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis type="number" dataKey="pnl" name="P&L $" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} cursor={{ stroke: T.accent.cyan, strokeOpacity: 0.3 }} />
                        <Scatter data={scatterData}>
                          {scatterData.map((d, i) => (
                            <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.8} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Frame>
                  <Frame title={t('מפת חשיפה לפי נכס','Asset Exposure Map')} subtitle={t('ריכוז Risk — איפה אתה מוטה','Risk concentration — where you are exposed')} tone="purple" badge={`${treemapData.length} ${t('נכסים','assets')}`}>
                    <ExposureMap data={treemapData} T={T} isRTL={t('rtl','ltr') === 'rtl'} />
                  </Frame>
                </>
              )}

              {pack === 'monthly+rolling' && (
                <>
                  <Frame title={t('אבולוציית תוחלת חודשית','Monthly Expectancy Evolution')} subtitle={t('עמודה = P&L · קו = ממוצע R','Bar = P&L · Line = avg R')} tone="green" badge={`${monthlyData.length} mo`}>
                    <ResponsiveContainer width="100%" height={290}>
                      <ComposedChart data={monthlyData} margin={{ top: 8, right: 14, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="2 4" />
                        <XAxis dataKey="month" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                          {monthlyData.map((m, i) => <Cell key={i} fill={m.pnl >= 0 ? 'url(#orca-g-green)' : 'url(#orca-g-red)'} />)}
                        </Bar>
                        <Line type="monotone" dataKey="avgR" stroke={T.accent.cyan} strokeWidth={2.5} dot={{ fill: T.accent.cyan, r: 3.5, strokeWidth: 0 }} filter="url(#orca-glow)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Frame>
                  <Frame title={t('תוחלת מתגלגלת (R)','Rolling Expectancy (R)')} subtitle={t('חלון מתגלגל מציג את היציבות שלך לאורך זמן','Rolling window shows your stability over time')} tone="purple" badge={`${rollingData.length} pts`}>
                    <ResponsiveContainer width="100%" height={290}>
                      <AreaChart data={rollingData} margin={{ top: 8, right: 14, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="2 4" />
                        <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Area type="monotone" dataKey="exp" stroke={T.accent.purple} fill="url(#orca-g-purple)" strokeWidth={2.8} filter="url(#orca-glow)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Frame>
                </>
              )}

              {pack === 'streak+bucket' && (
                <>
                  <Frame title={t('גלי רצפים: ניצחונות מול הפסדים','Streak Waves: wins vs losses')} subtitle={t('גובה = אורך הרצף · צבע = סוג','Height = streak length · Color = type')} tone="green" badge={`${streakBands.length} streaks`}>
                    <ResponsiveContainer width="100%" height={290}>
                      <BarChart data={streakBands.map(b => ({ idx: b.idx + 1, len: b.type === 'W' ? b.len : -b.len, type: b.type }))} margin={{ top: 8, right: 14, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="2 4" />
                        <XAxis dataKey="idx" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Bar dataKey="len" radius={[6, 6, 6, 6]}>
                          {streakBands.map((b, i) => <Cell key={i} fill={b.type === 'W' ? 'url(#orca-g-green)' : 'url(#orca-g-red)'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Frame>
                  <Frame title={t('התפלגות R לפי טווח','R Distribution by Range')} subtitle={t('הצורה האידיאלית: זנב ימני שמן, זנב שמאלי קצר','Ideal shape: fat right tail, short left tail')} tone="cyan" badge={`${rBuckets.reduce((a, b) => a + b.count, 0)} trades`}>
                    <ResponsiveContainer width="100%" height={290}>
                      <RadialBarChart innerRadius="22%" outerRadius="100%" data={rBuckets} startAngle={180} endAngle={0}>
                        <RadialBar background={{ fill: T.bg.tertiary }} dataKey="count" cornerRadius={6}>
                          {rBuckets.map((b, i) => (
                            <Cell key={i} fill={b.bucket.includes('-') || b.bucket.startsWith('<') ? 'url(#orca-g-red)' : 'url(#orca-g-cyan-bar)'} />
                          ))}
                        </RadialBar>
                        <Tooltip contentStyle={tt} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </Frame>
                </>
              )}

              {/* PACK 5 — Equity curve + Drawdown river */}
              {pack === 'equity+drawdown' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('עקומת הון מצטברת','Cumulative Equity Curve')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={equityDrawdown}>
                        <defs>
                          <linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.green} stopOpacity={0.55} />
                            <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => { const a = Math.abs(v); return a >= 1000 ? `${v < 0 ? '-' : ''}$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `${v < 0 ? '-' : ''}$${a.toFixed(0)}`; }} />
                        <Tooltip contentStyle={tt} formatter={(v: number) => `$${Number(v).toFixed(2)}`} />
                        <Area type="monotone" dataKey="equity" stroke={T.accent.green} fill="url(#eqG)" strokeWidth={2.4} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('נהר ירידות (Drawdown %)','Drawdown River (%)')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={equityDrawdown}>
                        <defs>
                          <linearGradient id="ddG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.red} stopOpacity={0.05} />
                            <stop offset="100%" stopColor={T.accent.red} stopOpacity={0.55} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} domain={[(dataMin: number) => Math.min(-1, Math.max(-100, dataMin)), 0]} tickFormatter={(v: number) => `${v.toFixed(0)}%`} allowDataOverflow={false} />
                        <Tooltip contentStyle={tt} formatter={(v: number) => `${Number(v).toFixed(2)}%`} />
                        <Area type="monotone" dataKey="drawdown" stroke={T.accent.red} fill="url(#ddG)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {/* PACK 6 — Duration vs R + Session ring */}
              {pack === 'duration+session' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('משך החזקה מול תשואה (R)','Hold Duration vs Return (R)')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="idx" name={t('עסקה','Trade')} tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis type="number" dataKey="r" name="R" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <ZAxis type="number" dataKey="size" range={[30, 320]} />
                        <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} />
                        <Scatter data={durationData}>
                          {durationData.map((d, i) => (
                            <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.7} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('טבעת סשנים גלובליים','Global Sessions Ring')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadialBarChart innerRadius="35%" outerRadius="100%" data={sessionRing} startAngle={90} endAngle={-270}>
                        <RadialBar background dataKey="value">
                          {sessionRing.map((s, i) => (
                            <Cell key={i} fill={s.pnl >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.85} />
                          ))}
                        </RadialBar>
                        <Tooltip contentStyle={tt} formatter={(v: any, _n: any, p: any) => [`${p.payload.pnl >= 0 ? '+' : ''}$${p.payload.pnl} · ${p.payload.n} trades`, p.payload.name]} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {/* PACK 7 — Momentum win-rate + Volatility */}
              {pack === 'momentum+volatility' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('מומנטום אחוז ניצחונות (חלון 10)','Win-rate Momentum (window 10)')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={momentumData}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
                        <Tooltip contentStyle={tt} />
                        <Line type="monotone" dataKey="wr" stroke={T.accent.cyan} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('תנודתיות תשואה (סטיית-תקן R)','Return Volatility (StDev R)')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={momentumData}>
                        <defs>
                          <linearGradient id="volG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.orange} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={T.accent.orange} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Area type="monotone" dataKey="vol" stroke={T.accent.orange} fill="url(#volG)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {/* PACK 8 — Kelly optimal vs Actual sizing */}
              {pack === 'kelly+sizing' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('Kelly אופטימלי מול גודל פוזיציה בפועל (%)','Optimal Kelly vs actual position size (%)')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={kellyData}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
                        <Tooltip contentStyle={tt} />
                        <Area type="monotone" dataKey="kelly" stroke={T.accent.purple} fill={T.accent.purple} fillOpacity={0.18} strokeWidth={2} />
                        <Line type="monotone" dataKey="actual" stroke={T.accent.cyan} strokeWidth={2.2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('סחיפת Risk לאורך זמן','Risk drift over time')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={kellyData}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
                        <Tooltip contentStyle={tt} />
                        <Line type="monotone" dataKey="actual" stroke={T.accent.red} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {/* PACK 9 — Efficiency cloud + R distribution */}
              {pack === 'efficiency+mae' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('ענן יעילות (R לTrade)','Efficiency Cloud (R per trade)')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="i" name={t('עסקה','Trade')} tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis type="number" dataKey="eff" name="R" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <ZAxis type="number" dataKey="risk" range={[40, 300]} />
                        <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} />
                        <Scatter data={efficiencyCloud}>
                          {efficiencyCloud.map((d, i) => (
                            <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.65} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('מדד חרטה — צבירת הפסדים נמנעים','Regret Index — accumulated avoidable losses')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={equityDrawdown.map(d => ({ i: d.i, regret: Math.abs(Math.min(0, d.drawdown)) }))}>
                        <defs>
                          <linearGradient id="rgG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.orange} stopOpacity={0.55} />
                            <stop offset="100%" stopColor={T.accent.orange} stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} />
                        <Area type="monotone" dataKey="regret" stroke={T.accent.orange} fill="url(#rgG)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {/* PACK 10 — Setup spider + Pareto focus */}
              {pack === 'dna+focus' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('DNA לפי נכס — 4 צירים','DNA by asset — 4 axes')}</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={setupSpider}>
                        <PolarGrid stroke={T.border.subtle} />
                        <PolarAngleAxis dataKey="axis" tick={{ fill: T.text.secondary, fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: T.text.muted, fontSize: 9 }} />
                        <Radar dataKey={t('רווח','Profit')} stroke={T.accent.green} fill={T.accent.green} fillOpacity={0.22} strokeWidth={1.6} />
                        <Radar dataKey={t('ניצחונות','Wins')} stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.18} strokeWidth={1.6} />
                        <Radar dataKey={t('תוחלת','Expectancy')} stroke={T.accent.purple} fill={T.accent.purple} fillOpacity={0.18} strokeWidth={1.6} />
                        <Tooltip contentStyle={tt} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('פוקוס פארטו — 80/20 של הProfit','Pareto Focus — 80/20 of P&L')}</div>
                    <ResponsiveContainer width="100%" height={260}>
                      <ComposedChart data={focusPareto}>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis yAxisId="l" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
                        <Tooltip contentStyle={tt} />
                        <Bar yAxisId="l" dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {focusPareto.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.85} />)}
                        </Bar>
                        <Line yAxisId="r" type="monotone" dataKey="cum" stroke={T.accent.orange} strokeWidth={2.5} dot={{ fill: T.accent.orange, r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {/* PACK 11 — Lag-1 Autocorrelation + Win-rate Regime */}
              {pack === 'autocorr+regime' && (
                <>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('אוטוקורלציה — האם הביצועים משפיעים על הבא?','Autocorrelation — does past affect next?')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ScatterChart>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="prev" name={t('R קודם','Previous R')} tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis type="number" dataKey="cur" name={t('R נוכחי','Current R')} tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} />
                        <Scatter data={autocorrData}>
                          {autocorrData.map((d, i) => (
                            <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.7} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </GlassCard>
                  <GlassCard T={T}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>{t('משטר ביצועים — חלון 20 עסקאות','Performance Regime — 20-trade window')}</div>
                    <ResponsiveContainer width="100%" height={250}>
                      <ComposedChart data={regimeData}>
                        <defs>
                          <linearGradient id="regG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.5} />
                            <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.04} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
                        <Tooltip contentStyle={tt} />
                        <Area type="monotone" dataKey="wr" stroke={T.accent.cyan} fill="url(#regG)" strokeWidth={2.4} />
                        <Line type="monotone" dataKey="bull" stroke={T.accent.green} strokeWidth={1.2} strokeDasharray="4 4" dot={false} />
                        <Line type="monotone" dataKey="bear" stroke={T.accent.red} strokeWidth={1.2} strokeDasharray="4 4" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </>
              )}

              {/* PACK 12 — Monte Carlo Equity Cone (probabilistic forecast) */}
              {pack === 'montecarlo+riskcone' && (
                <>
                  <GlassCard T={T} style={{ gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{t('Monte Carlo — קונוס תוצאות אפשריות (50 מסלולים)','Monte Carlo — outcome cone (50 paths)')}</div>
                      <div style={{ fontSize: 10, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em' }}>QUANT TIER</div>
                    </div>
                    <ResponsiveContainer width="100%" height={290}>
                      <AreaChart data={monteCarloData}>
                        <defs>
                          <linearGradient id="mcOuter" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.purple} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={T.accent.purple} stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="mcInner" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                        <XAxis dataKey="step" tick={{ fill: T.text.muted, fontSize: 10 }} label={{ value: t('עסקאות קדימה','Trades ahead'), fill: T.text.muted, fontSize: 10, position: 'insideBottom', offset: -4 }} />
                        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} label={{ value: t('R מצטבר','Cumulative R'), angle: -90, fill: T.text.muted, fontSize: 10, position: 'insideLeft' }} />
                        <Tooltip contentStyle={tt} />
                        <Area type="monotone" dataKey="p95" stroke={T.accent.purple} fill="url(#mcOuter)" strokeWidth={1.4} />
                        <Area type="monotone" dataKey="p75" stroke={T.accent.cyan} fill="url(#mcInner)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="p25" stroke={T.accent.cyan} fill={T.bg.primary} fillOpacity={0.6} strokeWidth={1.5} />
                        <Area type="monotone" dataKey="p05" stroke={T.accent.purple} fill={T.bg.primary} fillOpacity={1} strokeWidth={1.4} />
                        <Line type="monotone" dataKey="p50" stroke={T.accent.green} strokeWidth={2.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", flexWrap: 'wrap' }}>
                      <span>● {t('חציון','Median')} (P50)</span>
                      <span style={{ color: T.accent.cyan }}>● {t('50% טווח','50% range')} (P25-P75)</span>
                      <span style={{ color: T.accent.purple }}>● {t('90% טווח','90% range')} (P05-P95)</span>
                    </div>
                  </GlassCard>
                </>
              )}
            </div>

            {/* INSIGHTS */}
            {analysis.insights.length === 0 ? (
              <GlassCard T={T} style={{ padding: 30, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <div style={{ fontSize: 14, color: T.text.secondary }}>{t('לא נמצאו דפוסים מובהקים. המשך לצבור עסקאות כדי לקבל תובנות חזקות יותר.','No significant patterns yet. Keep logging trades for stronger insights.')}</div>
              </GlassCard>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
                {analysis.insights.map((ins, i) => (
                  <DeepInsightCard key={ins.id} ins={ins} T={T} delay={i * 0.06} />
                ))}
              </div>
            )}

            {/* GOLDEN CARD — t('כרטיסיית הזהב','Gold Card') — Best Of Edge */}
            {bestEdge.enoughData && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  marginTop: 18, position: 'relative', borderRadius: 22, padding: 24,
                  background: `linear-gradient(135deg, rgba(255,200,80,0.08) 0%, rgba(255,160,40,0.04) 50%, rgba(120,80,20,0.06) 100%), ${T.bg.card}`,
                  border: '1.5px solid rgba(255,196,90,0.45)',
                  boxShadow: '0 24px 80px -20px rgba(255,180,40,0.30), 0 0 0 1px rgba(255,196,90,0.18) inset, 0 0 60px rgba(255,180,40,0.15)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 35%, rgba(255,220,140,0.18) 50%, transparent 65%)', pointerEvents: 'none' }}
                />
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 30, filter: 'drop-shadow(0 0 12px rgba(255,200,80,0.7))' }}>👑</span>
                      <div>
                        <div style={{ fontSize: 11, color: '#FFD27A', letterSpacing: '0.22em', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>◆ ORCA · GOLDEN EDGE</div>
                        <div style={{ fontSize: 22, color: T.text.primary, fontWeight: 900, marginTop: 2 }}>{t('Gold Card — הEdge האישי שלך','Gold Card — Your Personal Edge')}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>Based on {trades.length} trades</div>
                  </div>

                  <div style={{ fontSize: 14, color: T.text.secondary, lineHeight: 1.6, marginBottom: 18, padding: '10px 14px', background: 'rgba(255,200,80,0.06)', borderRadius: 12, border: '1px solid rgba(255,200,80,0.18)' }}>
                    💡 {bestEdge.edgeStatement}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    {[
                      bestEdge.bestAsset && { icon: '💎', label: t('הנכס הכי טוב','Best Asset'), value: bestEdge.bestAsset.name, sub: `${bestEdge.bestAsset.pnl >= 0 ? '+' : ''}$${bestEdge.bestAsset.pnl} · ${bestEdge.bestAsset.wr}% WR · ${bestEdge.bestAsset.expR >= 0 ? '+' : ''}${bestEdge.bestAsset.expR}R` },
                      bestEdge.bestDay && { icon: '📅', label: t('היום הכי טוב','Best Day'), value: bestEdge.bestDay.name, sub: `${bestEdge.bestDay.pnl >= 0 ? '+' : ''}$${bestEdge.bestDay.pnl} · ${bestEdge.bestDay.wr}% WR · ${bestEdge.bestDay.n} trades` },
                      bestEdge.bestHour && { icon: '⏰', label: t('השעה הכי טובה','Best Hour'), value: bestEdge.bestHour.label, sub: `${bestEdge.bestHour.pnl >= 0 ? '+' : ''}$${bestEdge.bestHour.pnl} · ${bestEdge.bestHour.wr}% WR` },
                      bestEdge.bestSession && { icon: '🌍', label: t('הסשן הכי טוב','Best Session'), value: bestEdge.bestSession.name, sub: `${bestEdge.bestSession.pnl >= 0 ? '+' : ''}$${bestEdge.bestSession.pnl} · ${bestEdge.bestSession.n} trades` },
                      bestEdge.bestSetup && { icon: '🎯', label: t('האסטרטגיה הכי טובה','Best Strategy'), value: bestEdge.bestSetup.name, sub: `${bestEdge.bestSetup.pnl >= 0 ? '+' : ''}$${bestEdge.bestSetup.pnl} · ${bestEdge.bestSetup.wr}% WR` },
                      bestEdge.bestStreakDay && { icon: '🚀', label: t('היום הכי רווחי בלוח','Most Profitable Day'), value: bestEdge.bestStreakDay.name, sub: `${bestEdge.bestStreakDay.pnl >= 0 ? '+' : ''}$${bestEdge.bestStreakDay.pnl} · ${bestEdge.bestStreakDay.n} trades` },
                    ].filter(Boolean).map((card: any, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + i * 0.06 }}
                        style={{ padding: 14, borderRadius: 14, background: 'rgba(255,210,120,0.06)', border: '1px solid rgba(255,210,120,0.22)', position: 'relative', overflow: 'hidden' }}
                      >
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{card.icon}</div>
                        <div style={{ fontSize: 10, color: '#FFD27A', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>{card.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 900, color: T.text.primary, marginBottom: 4, lineHeight: 1.2 }}>{card.value}</div>
                        <div style={{ fontSize: 11, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{card.sub}</div>
                      </motion.div>
                    ))}
                  </div>

                  {bestEdge.worstAsset && (
                    <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: `${T.accent.red}10`, border: `1px solid ${T.accent.red}30`, fontSize: 12, color: T.text.secondary }}>
                      ⚠️ <strong style={{ color: T.accent.red }}>{t('הנכס שמדמם הכי הרבה:','Worst-bleeding asset:')}</strong> {bestEdge.worstAsset.name} ({bestEdge.worstAsset.pnl}$ {t('ב','in')}-{bestEdge.worstAsset.n} trades) — {t('שקול לסנן או להוריד גודל.','consider filtering or reducing size.')}
                    </div>
                  )}
                </div>
              </motion.div>
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
  const { t } = useLang();
  const meta = getSevMeta(t)[ins.severity];
  const catLabel = getCatLabel(t);
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
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: T.bg.tertiary, color: T.text.muted, fontWeight: 600 }}>{catLabel[ins.category] || ins.category}</span>
              <span style={{ fontSize: 9, color: T.text.dim, marginInlineStart: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                {(ins.confidence * 100).toFixed(0)}% {t('ביטחון','confidence')}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: T.text.primary, lineHeight: 1.65, marginBottom: 8 }}>{ins.finding}</div>
            <div style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.6, marginBottom: 10, padding: '8px 10px', background: T.bg.tertiary, borderRadius: 8, borderInlineStart: `2px solid ${T.border.medium}` }}>
              <span style={{ color: T.text.muted, fontWeight: 700, marginInlineEnd: 6 }}>{t('ראיה:','Evidence:')}</span>
              {ins.evidence}
            </div>
            <div style={{ fontSize: 12, color: T.text.primary, lineHeight: 1.55, padding: '8px 10px', background: `${c}10`, borderRadius: 8, borderInlineStart: `2px solid ${c}` }}>
              <span style={{ color: c, fontWeight: 800, marginInlineEnd: 6 }}>{t('פעולה:','Action:')}</span>
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

// ============================================================================
// Asset Exposure Map — clean, label-correct, no overlapping text.
// Replaces the broken Recharts Treemap. Shows ranked assets with
// risk-weighted bars, P&L sign, win/loss split, and percentage of total.
// ============================================================================
interface ExposureRow { name: string; size: number; pnl: number; wins: number; losses: number; n: number; }
const ExposureMap = ({ data, T, isRTL }: { data: ExposureRow[]; T: any; isRTL: boolean }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 290, display: 'grid', placeItems: 'center', color: T.text.dim, fontSize: 12 }}>
        {isRTL ? 'אין נתוני חשיפה' : 'No exposure data yet'}
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.size, 0) || 1;
  const rows = data.slice(0, 10);
  return (
    <div style={{ height: 290, overflowY: 'auto', padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((row) => {
        const pct = (row.size / total) * 100;
        const isPositive = row.pnl >= 0;
        const accent = isPositive ? T.accent.green : T.accent.red;
        const winRate = row.n > 0 ? Math.round((row.wins / row.n) * 100) : 0;
        return (
          <div key={row.name} style={{
            position: 'relative', padding: '10px 12px', borderRadius: 10,
            background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
            overflow: 'hidden', minHeight: 54,
          }}>
            {/* Fill bar (absolute, behind text) */}
            <div style={{
              position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
              width: `${Math.max(4, pct)}%`,
              background: `linear-gradient(90deg, ${accent}33, ${accent}11)`,
              borderInlineEnd: `2px solid ${accent}88`,
              transition: 'width .35s ease', pointerEvents: 'none',
            }} />
            {/* Content — bullet-proof 2-column grid, no wrap collisions */}
            <div style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 13,
                    color: T.text.primary, letterSpacing: 0.4,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120,
                  }}>{row.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 999,
                    background: `${accent}22`, color: accent, fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap',
                  }}>{pct.toFixed(1)}%</span>
                </div>
                <span style={{
                  fontSize: 10.5, color: T.text.muted,
                  fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap',
                }}>
                  {row.n} {isRTL ? 'עסקאות' : 'trades'} · {winRate}% WR
                </span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 800,
                color: accent, fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: 'nowrap',
              }}>
                {isPositive ? '+' : ''}${row.pnl.toFixed(0)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AIInsightsPage = memo(AIInsightsPage_Impl);
