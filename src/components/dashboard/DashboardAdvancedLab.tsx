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
    borderRadius: 14, padding: 14,
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
    iqr: 'IQR', median: 'Median', equity: 'Equity', prob2: 'Positive prob %',
    avgRisk: 'Avg risk %', avgOut: 'Avg outcome', noVel: 'No data',
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ marginTop: 20, display: 'grid', gap: 14 }}>
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


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
        {/* 1 · Monte Carlo */}
        <div style={cardStyle}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>{L.mc}</div>
          <ResponsiveContainer width="100%" height={220}>
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
            <ResponsiveContainer width="100%" height={220}>
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
            <ResponsiveContainer width="100%" height={220}>
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
          <ResponsiveContainer width="100%" height={220}>
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
            <ResponsiveContainer width="100%" height={220}>
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
                            width: 16, height: 16, borderRadius: 3,
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
