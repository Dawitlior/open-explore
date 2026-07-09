// Dashboard Advanced Lab — adds Monte Carlo, Monthly Box Plot, and 4 net-new
// charts to the main dashboard. All charts are dual-unit (R | $) and work
// off the live trade journal.
//
// The 4 new charts that don't exist anywhere else in the platform:
//   • Hour-of-Day Performance Radar  — average net per hour, 24-segment ring
//   • Win Probability Cone           — running probability of net > 0 over time
//   • Risk-Reward Frontier           — avg risk % vs avg outcome per setup
//   • Trade Velocity Heatmap         — trades per day-of-week × ISO week
//
// Reuses computeMonteCarlo / computeMonthlyBox / fmt helpers from weekly-review.

import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ComposedChart,
  CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, Cell, Area,
  ScatterChart, Scatter, ZAxis, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import {
  computeMonteCarlo, computeMonthlyBox, fmtValue, fmtShort, type Unit,
} from '@/components/weekly-review/lib/chart-compute';
import { parseTradeDate } from '@/components/weekly-review/lib/week-key';
import { useDisplayMode } from '@/lib/display-mode';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
}

const valueOf = (t: Trade, unit: Unit) =>
  unit === 'USD' ? (Number(t.pnl) || 0) : (Number(t.returnR) || 0);

export default function DashboardAdvancedLab({ T, isRTL, trades }: Props) {
  // Follow the global Dual-Currency Engine — no per-chart override.
  const { displayMode } = useDisplayMode();
  const unit: Unit = displayMode === 'MONEY' ? 'USD' : 'R';
  const isUSD = unit === 'USD';
  const isMobile = useIsMobile();
  const chartH = isMobile ? 240 : 220;
  const minCard = isMobile ? 9999 : 320; // force single column on mobile
  const heatCell = isMobile ? 18 : 16;
  const accent = T.accent.cyan;
  const muted  = T.text.muted;
  const border = T.border.subtle;
  const fg     = T.text.primary;
  const win    = T.accent.green;
  const loss   = T.accent.red;
  const gold   = T.accent.orange;

  const tt = {
    background: T.bg.card, border: `1px solid ${T.border.medium}`,
    borderRadius: 10, color: fg, fontSize: 11, padding: '8px 12px',
  };

  const cardStyle: React.CSSProperties = {
    background: T.bg.card,
    border: `1px solid ${border}`,
    borderRadius: 14,
    padding: isMobile ? 10 : 14,
    minWidth: 0,
    overflow: 'hidden',
  };

  const sorted = useMemo(() => [...trades].sort((a, b) =>
    (parseTradeDate(a.date)?.getTime() || 0) - (parseTradeDate(b.date)?.getTime() || 0)
  ), [trades]);

  const mc  = useMemo(() => computeMonteCarlo(sorted, unit, 200, 100), [sorted, unit]);
  const box = useMemo(() => computeMonthlyBox(sorted, unit), [sorted, unit]);

  // ── NEW 1 · Hour-of-Day Performance Radar ──────────────────────
  const hourRadar = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ h, sum: 0, n: 0 }));
    for (const t of sorted) {
      const d = parseTradeDate(t.date); if (!d) continue;
      const b = buckets[d.getHours()];
      b.sum += valueOf(t, unit); b.n++;
    }
    return buckets.map(b => ({
      hour: `${String(b.h).padStart(2, '0')}h`,
      avg: b.n ? +(b.sum / b.n).toFixed(3) : 0,
      n: b.n,
    }));
  }, [sorted, unit]);

  // ── NEW 2 · Win Probability Cone ───────────────────────────────
  const probCone = useMemo(() => {
    let cum = 0, posCount = 0;
    return sorted.map((t, i) => {
      cum += valueOf(t, unit);
      if (cum > 0) posCount++;
      return { idx: i + 1, equity: +cum.toFixed(3), prob: +((posCount / (i + 1)) * 100).toFixed(1) };
    });
  }, [sorted, unit]);

  // ── NEW 3 · Risk-Reward Frontier (per setup) ───────────────────
  const frontier = useMemo(() => {
    const m = new Map<string, { sumRiskPct: number; sumVal: number; n: number; wins: number }>();
    for (const t of sorted) {
      const k = t.coin || '—';
      const e = m.get(k) || { sumRiskPct: 0, sumVal: 0, n: 0, wins: 0 };
      e.sumRiskPct += Number(t.riskPct) || 0;
      e.sumVal     += valueOf(t, unit);
      e.n++;
      if (t.winLoss === 'Win') e.wins++;
      m.set(k, e);
    }
    return Array.from(m.entries()).map(([asset, v]) => ({
      asset,
      x: +(v.sumRiskPct / v.n).toFixed(3),        // avg risk %
      y: +(v.sumVal / v.n).toFixed(3),            // avg outcome (R or $)
      z: Math.max(40, v.n * 12),
      wr: +((v.wins / v.n) * 100).toFixed(0),
      n: v.n,
    })).filter(d => d.n >= 2);
  }, [sorted, unit]);

  // ── NEW 4 · Trade Velocity Heatmap (DOW × ISO week) ────────────
  const velocity = useMemo(() => {
    const grid = new Map<string, number>();        // "week-dow" → count
    const weeks = new Set<string>();
    for (const t of sorted) {
      const d = parseTradeDate(t.date); if (!d) continue;
      const week = isoWeek(d);
      const key = `${week}-${d.getDay()}`;
      weeks.add(week);
      grid.set(key, (grid.get(key) || 0) + 1);
    }
    const weekList = Array.from(weeks).sort();
    const max = Math.max(1, ...Array.from(grid.values()));
    return { grid, weeks: weekList, max };
  }, [sorted]);

  // ── NEW 5 · Kelly-Optimal Growth Curve ─────────────────────────
  // g(f) = p·log(1+b·f) + q·log(1−f). f* = (p·b − q)/b.
  const kelly = useMemo(() => {
    const wins  = sorted.filter(t => (Number(t.returnR) || 0) > 0);
    const losses = sorted.filter(t => (Number(t.returnR) || 0) < 0);
    if (wins.length < 3 || losses.length < 3) return null;
    const avgWin  = wins.reduce((s, t) => s + (Number(t.returnR) || 0), 0) / wins.length;
    const avgLoss = Math.abs(losses.reduce((s, t) => s + (Number(t.returnR) || 0), 0) / losses.length);
    const p = wins.length / (wins.length + losses.length);
    const q = 1 - p;
    const b = avgLoss > 0 ? avgWin / avgLoss : 0;
    if (!isFinite(b) || b <= 0) return null;
    const fStar = Math.max(0, Math.min(0.5, (p * b - q) / b));
    const pts = [] as { f: number; g: number; safe: number; agg: number }[];
    for (let i = 0; i <= 50; i++) {
      const f = i / 100; // 0 .. 0.50
      const inside1 = 1 + b * f;
      const inside2 = 1 - f;
      const g = inside2 > 0 ? (p * Math.log(inside1) + q * Math.log(inside2)) : NaN;
      pts.push({ f: +(f * 100).toFixed(1), g: +(g * 100).toFixed(3), safe: f <= fStar ? +(g * 100).toFixed(3) : 0, agg: f > fStar ? +(g * 100).toFixed(3) : 0 });
    }
    return { pts, fStar: +(fStar * 100).toFixed(2), p: +(p * 100).toFixed(1), b: +b.toFixed(2) };
  }, [sorted]);

  // ── NEW 6 · Streak Anatomy (win/loss run-length distribution) ──
  const streaks = useMemo(() => {
    if (sorted.length === 0) return [] as { len: number; wins: number; losses: number }[];
    const winRuns = new Map<number, number>();
    const lossRuns = new Map<number, number>();
    let cur = 0; let curSign: 1 | -1 | 0 = 0;
    const flush = () => {
      if (cur > 0 && curSign !== 0) {
        const m = curSign === 1 ? winRuns : lossRuns;
        m.set(cur, (m.get(cur) || 0) + 1);
      }
      cur = 0;
    };
    for (const t of sorted) {
      const r = Number(t.returnR) || 0;
      const s: 1 | -1 | 0 = r > 0 ? 1 : r < 0 ? -1 : 0;
      if (s === 0) { flush(); curSign = 0; continue; }
      if (s === curSign) { cur++; }
      else { flush(); curSign = s; cur = 1; }
    }
    flush();
    const maxLen = Math.max(1, ...winRuns.keys(), ...lossRuns.keys());
    const out: { len: number; wins: number; losses: number }[] = [];
    for (let i = 1; i <= Math.min(12, maxLen); i++) {
      out.push({ len: i, wins: winRuns.get(i) || 0, losses: -(lossRuns.get(i) || 0) });
    }
    return out;
  }, [sorted]);

  // ── NEW · Performance Regime Matrix (smart table) ──────────────
  const regime = useMemo(() => {
    const globalMean = sorted.length ? sorted.reduce((s, t) => s + valueOf(t, unit), 0) / sorted.length : 0;
    const globalStd = (() => {
      if (sorted.length < 2) return 0;
      const m = globalMean;
      const v = sorted.reduce((s, t) => s + Math.pow(valueOf(t, unit) - m, 2), 0) / (sorted.length - 1);
      return Math.sqrt(v);
    })();

    type Row = { dim: string; bucket: string; n: number; winRate: number; avg: number; z: number; expectancy: number };
    const rows: Row[] = [];
    const push = (dim: string, bucket: string, arr: number[], wins: number) => {
      if (arr.length === 0) return;
      const n = arr.length;
      const avg = arr.reduce((s, v) => s + v, 0) / n;
      const wr = (wins / n) * 100;
      const winsVals = arr.filter(v => v > 0);
      const lossVals = arr.filter(v => v < 0);
      const aw = winsVals.length ? winsVals.reduce((s, v) => s + v, 0) / winsVals.length : 0;
      const al = lossVals.length ? Math.abs(lossVals.reduce((s, v) => s + v, 0) / lossVals.length) : 0;
      const exp = (wr / 100) * aw - (1 - wr / 100) * al;
      const se = globalStd > 0 ? globalStd / Math.sqrt(n) : 0;
      const z = se > 0 ? (avg - globalMean) / se : 0;
      rows.push({ dim, bucket, n, winRate: +wr.toFixed(1), avg: +avg.toFixed(3), z: +z.toFixed(2), expectancy: +exp.toFixed(3) });
    };
    const group = <K extends string>(dim: string, keyFn: (t: Trade) => K | null) => {
      const buckets = new Map<string, { arr: number[]; wins: number }>();
      for (const t of sorted) {
        const k = keyFn(t); if (!k) continue;
        const e = buckets.get(k) || { arr: [], wins: 0 };
        e.arr.push(valueOf(t, unit));
        if ((Number(t.returnR) || 0) > 0) e.wins++;
        buckets.set(k, e);
      }
      const entries = Array.from(buckets.entries()).sort((a, b) => b[1].arr.length - a[1].arr.length);
      for (const [bucket, e] of entries) push(dim, bucket, e.arr, e.wins);
    };

    // Hour bucket (4h windows)
    group(isRTL ? 'שעה' : 'Hour', (t) => {
      const d = parseTradeDate(t.date); if (!d) return null;
      const h = d.getHours();
      const start = Math.floor(h / 4) * 4;
      return `${String(start).padStart(2,'0')}–${String(start+4).padStart(2,'0')}` as any;
    });
    // Day of week
    const dowLbl = isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    group(isRTL ? 'יום' : 'Day', (t) => {
      const d = parseTradeDate(t.date); if (!d) return null;
      return dowLbl[d.getDay()] as any;
    });
    // Session
    group(isRTL ? 'סשן' : 'Session', (t) => {
      const d = parseTradeDate(t.date); if (!d) return null;
      const h = d.getHours();
      if (h < 8) return (isRTL ? 'אסיה' : 'Asia') as any;
      if (h < 16) return (isRTL ? 'אירופה' : 'Europe') as any;
      return (isRTL ? 'ארה״ב' : 'US') as any;
    });
    // Direction
    group(isRTL ? 'כיוון' : 'Direction', (t) => {
      const dir = String((t as any).direction || (t as any).side || '').toLowerCase();
      if (dir.includes('long') || dir.includes('buy')) return (isRTL ? 'לונג' : 'Long') as any;
      if (dir.includes('short') || dir.includes('sell')) return (isRTL ? 'שורט' : 'Short') as any;
      return null;
    });
    // Top assets (limit to top 5 by volume)
    const assetRows: Row[] = [];
    const buf: Row[] = [];
    const before = rows.length;
    group(isRTL ? 'נכס' : 'Asset', (t) => (t.coin || null) as any);
    // Keep only top 5 assets by n
    const assetSlice = rows.splice(before).sort((a, b) => b.n - a.n).slice(0, 5);
    rows.push(...assetSlice);
    void assetRows; void buf;

    return { rows, globalMean: +globalMean.toFixed(3), globalStd: +globalStd.toFixed(3) };
  }, [sorted, unit, isRTL]);


  if (sorted.length < 5) return null;

  const fmtAxis = (v: number) => fmtShort(v, unit);
  const fmtTip  = (v: number) => fmtValue(v, unit);

  // Pull labels
  const L = isRTL ? {
    title: '◆ מעבדת אנליטיקה מתקדמת', sub: `גרפים כמותיים — יחידה: ${isUSD ? 'דולר ($)' : 'R-Multiple'}`,
    mc: 'סימולציית מונטה קרלו · n=100',
    box: 'התפלגות חודשית (Box Plot)',
    hour: 'ביצוע לפי שעת יום',
    prob: 'קונוס הסתברות לרווח',
    front: 'גבול סיכון-תשואה',
    vel: 'מהירות מסחר — יום × שבוע',
    kelly: 'עקומת קלי — צמיחה גיאומטרית לפי סיכון',
    kellyF: 'סיכון לעסקה f (%)', kellyG: 'תוחלת log-צמיחה (%)',
    kellyStar: 'קלי אופטימלי',
    kellySafe: 'אזור בטוח (≤f*)', kellyAgg: 'אזור אגרסיבי (>f*)',
    streak: 'אנטומיית רצפים — התפלגות אורכי סדרות',
    streakLen: 'אורך סדרה', streakCount: 'מספר סדרות',
    streakW: 'רצפי ניצחון', streakL: 'רצפי הפסד',
    matrix: 'מטריצת ביצועים לפי משטר — Z-Score מול תוחלת גלובלית',
    matrixDim: 'מימד', matrixBucket: 'משטר', matrixN: '# עסקאות',
    matrixWr: 'אחוז הצלחה', matrixAvg: 'ממוצע', matrixExp: 'תוחלת',
    matrixZ: 'Z-Score', matrixEdge: 'עוצמת יתרון',
    iqr: 'IQR', median: 'חציון', equity: 'הון', prob2: 'הסתברות חיובי %',
    avgRisk: 'סיכון ממוצע %', avgOut: 'תשואה ממוצעת', noVel: 'אין נתונים',
  } : {
    title: '◆ ADVANCED ANALYTICS LAB', sub: `Quant charts — unit: ${isUSD ? 'USD ($)' : 'R-Multiple'}`,
    mc: 'Monte Carlo · n=100',
    box: 'Monthly Box Plot',
    hour: 'Hour-of-Day Performance',
    prob: 'Win Probability Cone',
    front: 'Risk-Reward Frontier',
    vel: 'Trade Velocity — Day × Week',
    kelly: 'Kelly Growth Curve — geometric growth by risk',
    kellyF: 'Risk per trade f (%)', kellyG: 'Expected log-growth (%)',
    kellyStar: 'Optimal Kelly',
    kellySafe: 'Safe zone (≤f*)', kellyAgg: 'Aggressive zone (>f*)',
    streak: 'Streak Anatomy — run-length distribution',
    streakLen: 'Run length', streakCount: 'Runs',
    streakW: 'Winning runs', streakL: 'Losing runs',
    matrix: 'Performance Regime Matrix — Z-Score vs global mean',
    matrixDim: 'Dimension', matrixBucket: 'Regime', matrixN: '# Trades',
    matrixWr: 'Win %', matrixAvg: 'Avg', matrixExp: 'Expectancy',
    matrixZ: 'Z-Score', matrixEdge: 'Edge strength',
    iqr: 'IQR', median: 'Median', equity: 'Equity', prob2: 'Positive prob %',
    avgRisk: 'Avg risk %', avgOut: 'Avg outcome', noVel: 'No data',
  };

  return (
    <div data-advanced-lab dir={isRTL ? 'rtl' : 'ltr'} style={{ marginTop: 20, display: 'grid', gap: 14, width: '100%', minWidth: 0 }}>
      {/* Header — unit is locked to the global Dual-Currency Engine */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 10, color: muted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {L.title}
          </div>
          <div style={{ fontSize: 13, color: fg, fontWeight: 600, marginTop: 2 }}>{L.sub}</div>
        </div>
        <div
          title={isRTL ? 'יחידת התצוגה נקבעת על-ידי מתג ה-$/R הראשי' : 'Display unit is controlled by the main $/R toggle'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', background: T.bg.tertiary,
            border: `1px solid ${border}`, borderRadius: 999,
            color: accent, fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800, fontSize: 11, letterSpacing: 1,
          }}
        >
          <span style={{ opacity: 0.55, fontSize: 9 }}>{isRTL ? 'יחידה' : 'UNIT'}</span>
          <span>{isUSD ? '$' : 'R'}</span>
        </div>
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(auto-fit, minmax(min(100%, ${minCard}px), 1fr))`, gap: isMobile ? 10 : 14 }}>
        {/* 1 · Monte Carlo */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.mc}</div>
          <ResponsiveContainer width="100%" height={chartH}>
            <LineChart data={mc}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="idx" stroke={muted} fontSize={10}/>
              <YAxis tickFormatter={fmtAxis} stroke={muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tt} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={border}/>
              <Line type="monotone" dataKey="p5"     stroke={loss}   strokeWidth={1} dot={false} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="p25"    stroke={loss}   strokeWidth={1} dot={false}/>
              <Line type="monotone" dataKey="median" stroke={accent} strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="p75"    stroke={win}    strokeWidth={1} dot={false}/>
              <Line type="monotone" dataKey="p95"    stroke={win}    strokeWidth={1} dot={false} strokeDasharray="3 3"/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 2 · Monthly Box Plot */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.box}</div>
          {box.length === 0 ? <Empty muted={muted}/> : (
            <ResponsiveContainer width="100%" height={chartH}>
              <ComposedChart data={box.map(b => ({
                month: b.month, low: b.min, q1q3: [b.q1, b.q3], median: b.median, hi: b.max,
              }))}>
                <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" stroke={muted} fontSize={10}/>
                <YAxis tickFormatter={fmtAxis} stroke={muted} fontSize={10} width={48}/>
                <Tooltip
                  contentStyle={tt}
                  formatter={(v: number | number[], n) =>
                    Array.isArray(v) ? [`${fmtTip(v[0])} → ${fmtTip(v[1])}`, L.iqr] : [fmtTip(v as number), n as string]
                  }/>
                <ReferenceLine y={0} stroke={border}/>
                <Bar dataKey="q1q3"   fill={accent} fillOpacity={0.4} barSize={20}/>
                <Line type="monotone" dataKey="median" stroke={gold}   strokeWidth={2} dot={{ r: 3 }}/>
                <Line type="monotone" dataKey="low"    stroke={loss}   strokeWidth={1} dot={{ r: 2 }} strokeDasharray="3 3"/>
                <Line type="monotone" dataKey="hi"     stroke={win}    strokeWidth={1} dot={{ r: 2 }} strokeDasharray="3 3"/>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 3 · Hour-of-Day Performance (24h bars) */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.hour}</div>
          {hourRadar.every(d => d.n === 0) ? <Empty muted={muted}/> : (
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={hourRadar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="hour" stroke={muted} fontSize={9} interval={1}/>
                <YAxis tickFormatter={fmtAxis} stroke={muted} fontSize={10} width={48}/>
                <ReferenceLine y={0} stroke={border}/>
                <Tooltip
                  contentStyle={tt}
                  formatter={(v: number, _n, p: any) => [fmtTip(v), `${p.payload.hour} · ${p.payload.n}t`]}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="avg" radius={[3, 3, 0, 0]}>
                  {hourRadar.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 0 ? win : loss} fillOpacity={d.n ? 0.9 : 0.15}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>


        {/* 4 · NEW Win Probability Cone */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.prob}</div>
          <ResponsiveContainer width="100%" height={chartH}>
            <ComposedChart data={probCone}>
              <defs>
                <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="idx" stroke={muted} fontSize={10}/>
              <YAxis yAxisId="L" tickFormatter={fmtAxis} stroke={muted} fontSize={10} width={48}/>
              <YAxis yAxisId="R" orientation="right" tickFormatter={(v: number) => `${v}%`} stroke={muted} fontSize={10} width={36} domain={[0, 100]}/>
              <Tooltip contentStyle={tt} formatter={(v: number, n) =>
                n === 'prob' ? [`${v}%`, L.prob2] : [fmtTip(v), L.equity]}/>
              <ReferenceLine yAxisId="L" y={0} stroke={border}/>
              <ReferenceLine yAxisId="R" y={50} stroke={gold} strokeDasharray="4 4"/>
              <Area yAxisId="L" type="monotone" dataKey="equity" fill="url(#probGrad)" stroke={accent} strokeWidth={2}/>
              <Line yAxisId="R" type="monotone" dataKey="prob"   stroke={gold} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 5 · NEW Risk-Reward Frontier */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.front}</div>
          {frontier.length === 0 ? <Empty muted={muted}/> : (
            <ResponsiveContainer width="100%" height={chartH}>
              <ScatterChart>
                <CartesianGrid stroke={border} strokeDasharray="3 3"/>
                <XAxis dataKey="x" name={L.avgRisk} stroke={muted} fontSize={10} tickFormatter={(v: number) => `${v.toFixed(1)}%`}/>
                <YAxis dataKey="y" name={L.avgOut}  stroke={muted} fontSize={10} tickFormatter={fmtAxis}/>
                <ZAxis dataKey="z" range={[40, 220]}/>
                <ReferenceLine y={0} stroke={border}/>
                <Tooltip contentStyle={tt} cursor={{ stroke: muted, strokeDasharray: '3 3' }}
                  formatter={(v: any, n: string) =>
                    n === 'y' ? [fmtTip(v), L.avgOut] :
                    n === 'x' ? [`${Number(v).toFixed(2)}%`, L.avgRisk] : [v, n]}
                  labelFormatter={() => ''}
                />
                <Scatter data={frontier}>
                  {frontier.map((d, i) => <Cell key={i} fill={d.y >= 0 ? win : loss}/>)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 6 · NEW Trade Velocity Heatmap */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.vel}</div>
          {velocity.weeks.length === 0 ? <Empty muted={muted}/> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>
                <thead>
                  <tr>
                    <th/>
                    {velocity.weeks.map(w => <th key={w} style={{ color: muted, padding: '2px 4px', writingMode: 'vertical-rl', fontWeight: 400 }}>{w}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4, 5, 6].map(d => (
                    <tr key={d}>
                      <th style={{ color: muted, padding: '2px 6px', textAlign: 'right', fontWeight: 600 }}>
                        {(isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['Su','Mo','Tu','We','Th','Fr','Sa'])[d]}
                      </th>
                      {velocity.weeks.map(w => {
                        const v = velocity.grid.get(`${w}-${d}`) || 0;
                        const alpha = v / velocity.max;
                        return (
                          <td key={w} title={`${w} · ${(isRTL ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[d]} · ${v}t`} style={{
                            width: heatCell, height: heatCell, borderRadius: 3,
                            background: v ? `rgba(0, 242, 255, ${0.18 + alpha * 0.7})` : T.bg.tertiary,
                            border: `1px solid ${border}`,
                            color: alpha > 0.5 ? T.bg.primary : fg, textAlign: 'center',
                          }}>{v || ''}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 7 · NEW Kelly-Optimal Growth Curve */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.kelly}</div>
          {!kelly ? <Empty muted={muted}/> : (
            <>
              <ResponsiveContainer width="100%" height={chartH}>
                <ComposedChart data={kelly.pts} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kellySafeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={win} stopOpacity={0.45}/>
                      <stop offset="100%" stopColor={win} stopOpacity={0.02}/>
                    </linearGradient>
                    <linearGradient id="kellyAggGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={loss} stopOpacity={0.4}/>
                      <stop offset="100%" stopColor={loss} stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="f" stroke={muted} fontSize={10} tickFormatter={(v: number) => `${v}%`} label={{ value: L.kellyF, position: 'insideBottom', offset: -2, fill: muted, fontSize: 9 }}/>
                  <YAxis stroke={muted} fontSize={10} width={44} tickFormatter={(v: number) => `${v.toFixed(1)}%`}/>
                  <ReferenceLine y={0} stroke={border}/>
                  <ReferenceLine x={kelly.fStar} stroke={gold} strokeDasharray="4 4" label={{ value: `f* ${kelly.fStar}%`, fill: gold, fontSize: 10, position: 'top' }}/>
                  <Tooltip contentStyle={tt} formatter={(v: number, n) => {
                    if (n === 'safe') return [`${(v as number).toFixed(3)}%`, L.kellySafe];
                    if (n === 'agg')  return [`${(v as number).toFixed(3)}%`, L.kellyAgg];
                    return [`${(v as number).toFixed(3)}%`, L.kellyG];
                  }} labelFormatter={(v) => `f = ${v}%`}/>
                  <Area type="monotone" dataKey="safe" stroke={win}  strokeWidth={2} fill="url(#kellySafeGrad)"/>
                  <Area type="monotone" dataKey="agg"  stroke={loss} strokeWidth={2} fill="url(#kellyAggGrad)"/>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: muted }}>
                <span><span style={{ color: gold, fontWeight: 700 }}>f*</span> {kelly.fStar}%</span>
                <span>p {kelly.p}%</span>
                <span>b {kelly.b}x</span>
              </div>
            </>
          )}
        </div>

        {/* 8 · NEW Streak Anatomy */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.streak}</div>
          {streaks.length === 0 ? <Empty muted={muted}/> : (
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={streaks} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="len" stroke={muted} fontSize={10} label={{ value: L.streakLen, position: 'insideBottom', offset: -2, fill: muted, fontSize: 9 }}/>
                <YAxis stroke={muted} fontSize={10} width={40} tickFormatter={(v: number) => `${Math.abs(v)}`}/>
                <ReferenceLine y={0} stroke={border}/>
                <Tooltip contentStyle={tt}
                  formatter={(v: number, n) => [Math.abs(v as number), n === 'wins' ? L.streakW : L.streakL]}
                  labelFormatter={(v) => `${L.streakLen}: ${v}`}
                />
                <Bar dataKey="wins"   stackId="s" fill={win}  radius={[3, 3, 0, 0]}/>
                <Bar dataKey="losses" stackId="s" fill={loss} radius={[0, 0, 3, 3]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* NEW · Performance Regime Matrix (smart table) */}
      <div style={cardStyle}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 8, flexWrap: 'wrap', marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, color: muted, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.matrix}</div>
          <div style={{ fontSize: 10, color: muted, fontFamily: "'JetBrains Mono', monospace" }}>
            μ {fmtValue(regime.globalMean, unit)} · σ {fmtValue(regime.globalStd, unit)}
          </div>
        </div>
        {regime.rows.length === 0 ? <Empty muted={muted}/> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, minWidth: 640 }}>
              <thead>
                <tr style={{ color: muted, textAlign: isRTL ? 'right' : 'left', borderBottom: `1px solid ${border}` }}>
                  <th style={{ padding: '6px 8px', fontWeight: 500 }}>{L.matrixDim}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500 }}>{L.matrixBucket}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>{L.matrixN}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>{L.matrixWr}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>{L.matrixAvg}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>{L.matrixExp}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, textAlign: 'right' }}>{L.matrixZ}</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, minWidth: 100 }}>{L.matrixEdge}</th>
                </tr>
              </thead>
              <tbody>
                {regime.rows.map((r, i) => {
                  const zAbs = Math.min(3, Math.abs(r.z));
                  const barW = (zAbs / 3) * 100;
                  const color = r.z >= 0 ? win : loss;
                  const strong = zAbs >= 1.5;
                  return (
                    <tr key={`${r.dim}-${r.bucket}-${i}`} style={{
                      borderBottom: `1px solid ${border}`,
                      background: strong ? `${color}0F` : 'transparent',
                    }}>
                      <td style={{ padding: '6px 8px', color: muted, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{r.dim}</td>
                      <td style={{ padding: '6px 8px', color: fg, fontWeight: 600 }}>{r.bucket}</td>
                      <td style={{ padding: '6px 8px', color: fg, textAlign: 'right' }}>{r.n}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: r.winRate >= 50 ? win : gold }}>{r.winRate}%</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: r.avg >= 0 ? win : loss }}>{fmtValue(r.avg, unit)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: r.expectancy >= 0 ? win : loss }}>{fmtValue(r.expectancy, unit)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color, fontWeight: 700 }}>{r.z >= 0 ? '+' : ''}{r.z.toFixed(2)}σ</td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ position: 'relative', height: 8, background: T.bg.tertiary, borderRadius: 4, overflow: 'hidden', border: `1px solid ${border}` }}>
                          <div style={{
                            position: 'absolute', top: 0, bottom: 0,
                            [isRTL ? 'right' : 'left']: '50%',
                            width: `${barW / 2}%`,
                            transform: r.z >= 0 ? 'none' : (isRTL ? 'translateX(100%)' : 'translateX(-100%)'),
                            background: color, opacity: 0.75,
                          } as any}/>
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: border }}/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ muted }: { muted: string }) {
  return <div style={{ textAlign: 'center', color: muted, padding: 36, fontSize: 11 }}>—</div>;
}

function isoWeek(d: Date): string {
  // YYYY-Www
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const w = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}
