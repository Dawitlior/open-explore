// Yearly Dashboard — 10 charts (5.C.1–5.C.10)

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, ZAxis, Tooltip, ReferenceLine,
  Area, Line, LineChart, BarChart, Bar, Cell, Treemap, ScatterChart, Scatter,
} from 'recharts';
import type { Trade } from '@/data/trades';
import { useReviewUnit } from './hooks/use-review-unit';
import {
  computeDailyCalendar, computeAnnualEquity, computeMonthlyBox,
  computeMaeMfe, computeHoldingTime, computeAssetCorrelation, computeTreemap,
  computeMonteCarlo, computeRollingEdge, computeExpectancyEvolution,
  fmtValue, fmtShort,
} from './lib/chart-compute';
import { getPalette, card, labelStyle, tooltipStyle, ChartCard, type AnyT } from './lib/chart-ui';
import { parseTradeDate } from './lib/week-key';

interface Props { T: AnyT; isRTL: boolean; trades: Trade[]; }

export default function YearlyDashboard({ T, isRTL, trades }: Props) {
  const P = getPalette(T);
  const { unit, isUSD } = useReviewUnit();
  const [mcLength, setMcLength] = useState(100);

  const sliced = useMemo(() => {
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
    return trades.filter(t => { const d = parseTradeDate(t.date); return d && d >= cutoff; })
      .sort((a, b) => (parseTradeDate(a.date)?.getTime() || 0) - (parseTradeDate(b.date)?.getTime() || 0));
  }, [trades]);

  const cal   = useMemo(() => computeDailyCalendar(sliced, unit), [sliced, unit]);
  const eq    = useMemo(() => computeAnnualEquity(sliced, unit), [sliced, unit]);
  const box   = useMemo(() => computeMonthlyBox(sliced, unit), [sliced, unit]);
  const mae   = useMemo(() => computeMaeMfe(sliced), [sliced]);
  const hold  = useMemo(() => computeHoldingTime(sliced), [sliced]);
  const corr  = useMemo(() => computeAssetCorrelation(sliced, unit), [sliced, unit]);
  const tm    = useMemo(() => computeTreemap(sliced, unit), [sliced, unit]);
  const mc    = useMemo(() => computeMonteCarlo(sliced, unit, 200, mcLength), [sliced, unit, mcLength]);
  const edge  = useMemo(() => computeRollingEdge(sliced, unit, 20), [sliced, unit]);
  const expE  = useMemo(() => computeExpectancyEvolution(sliced, unit), [sliced, unit]);

  if (!sliced.length) {
    return <div style={{ ...card(P), textAlign: 'center', color: P.muted, padding: 32 }}>
      {isRTL ? 'אין נתונים שנתיים' : 'No annual data'}
    </div>;
  }

  const L = isRTL ? {
    cal: 'יומן יומי', equity: 'הון + דרורדאון שנתי', box: 'התפלגות חודשית (Box)',
    mae: 'MAE מול MFE', hold: 'משך החזקה מול R', corr: 'מתאם נכסים', tm: 'מפת נכסים',
    mc: 'סימולציית מונטה קרלו', edge: 'דעיכת אדג׳ (20)', exp: 'התפתחות תוחלת',
  } : {
    cal: 'Daily PnL Calendar', equity: 'Annual Equity + Drawdown', box: 'Monthly Box Plot',
    mae: 'MAE vs MFE', hold: 'Holding Time vs R', corr: 'Asset Correlation', tm: 'Asset Treemap',
    mc: 'Monte Carlo Simulation', edge: 'Rolling Edge Decay (20)', exp: 'Expectancy Evolution',
  };


  const fmtAxis = (v: number) => fmtShort(v, unit);
  const fmtTip = (v: number) => fmtValue(v, unit);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 5.C.1 — Daily calendar */}
      <ChartCard P={P} title={L.cal}>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${cal.weeks.length * 14 + 30} 120`} style={{ width: '100%', minWidth: cal.weeks.length * 8, maxWidth: '100%' }}>
            {cal.weeks.map((w, wi) => (
              <g key={wi} transform={`translate(${wi * 14 + 30}, 16)`}>
                {w.monthLabel && <text x={0} y={-4} fontSize={9} fill={P.muted}>{w.monthLabel}</text>}
                {w.days.map((d, di) => {
                  if (!d) return <rect key={di} x={0} y={di * 12} width={10} height={10} fill="rgba(255,255,255,0.03)" rx={2}/>;
                  const intensity = Math.min(1, Math.abs(d.value) / cal.threshold);
                  const fill = d.value >= 0
                    ? `rgba(0,255,136,${0.2 + intensity * 0.8})`
                    : `rgba(255,59,59,${0.2 + intensity * 0.8})`;
                  return (
                    <rect key={di} x={0} y={di * 12} width={10} height={10} fill={fill} rx={2}>
                      <title>{d.date} · {fmtTip(d.value)} · {d.trades}t</title>
                    </rect>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </ChartCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 5.C.2 — Annual equity + drawdown */}
        <ChartCard P={P} title={`${L.equity} (${isUSD ? '$' : 'R'})`}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={eq} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="yEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={P.accent} stopOpacity={0.35}/>
                  <stop offset="100%" stopColor={P.accent} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="yDd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={P.loss} stopOpacity={0}/>
                  <stop offset="100%" stopColor={P.loss} stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="idx" stroke={P.muted} fontSize={10} hide/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={P.border} strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="equity" fill="url(#yEq)" stroke="none"/>
              <Area type="monotone" dataKey="drawdown" fill="url(#yDd)" stroke="none"/>
              <Line type="monotone" dataKey="equity" stroke={P.accent} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.C.3 — Monthly box plot (rendered as range bars) */}
        <ChartCard P={P} title={L.box}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={box.map(b => ({
              month: b.month, low: b.min, q1q3: [b.q1, b.q3], median: b.median, hi: b.max,
            }))} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="month" stroke={P.muted} fontSize={10}/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)}
                       formatter={(v: number | number[], n) => Array.isArray(v) ? [`${fmtTip(v[0])} → ${fmtTip(v[1])}`, 'IQR'] : [fmtTip(v as number), n as string]}/>
              <ReferenceLine y={0} stroke={P.border}/>
              <Bar dataKey="q1q3" fill={P.accent} fillOpacity={0.45} barSize={20}/>
              <Line type="monotone" dataKey="median" stroke={P.gold} strokeWidth={2} dot={{ r: 3 }}/>
              <Line type="monotone" dataKey="low" stroke={P.loss} strokeWidth={1} dot={{ r: 2 }} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="hi"  stroke={P.win}  strokeWidth={1} dot={{ r: 2 }} strokeDasharray="3 3"/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.C.4 — MAE vs MFE scatter (only when real data) */}
        {mae.length > 0 && (
          <ChartCard P={P} title={L.mae}>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={P.border} strokeDasharray="3 3"/>
                <XAxis dataKey="mae" name="MAE" stroke={P.muted} fontSize={10}/>
                <YAxis dataKey="mfe" name="MFE" stroke={P.muted} fontSize={10}/>
                <ZAxis range={[40, 40]}/>
                <Tooltip contentStyle={tooltipStyle(P)} cursor={{ stroke: P.muted, strokeDasharray: '3 3' }}/>
                <Scatter data={mae}>
                  {mae.map((p, i) => <Cell key={i} fill={p.isWin ? P.win : P.loss}/>)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 5.C.5 — Holding time vs R (only when real data) */}
        {hold.length > 0 && (
          <ChartCard P={P} title={L.hold}>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={P.border} strokeDasharray="3 3"/>
                <XAxis dataKey="hours" name="Hours" stroke={P.muted} fontSize={10}/>
                <YAxis dataKey="r" name="R" stroke={P.muted} fontSize={10}/>
                <Tooltip contentStyle={tooltipStyle(P)} cursor={{ stroke: P.muted, strokeDasharray: '3 3' }}/>
                <ReferenceLine y={0} stroke={P.border}/>
                <Scatter data={hold}>
                  {hold.map((p, i) => <Cell key={i} fill={p.isWin ? P.win : P.loss}/>)}

                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* 5.C.6 — Asset correlation matrix */}
      <ChartCard P={P} title={L.corr}>
        {corr.assets.length < 2 ? (
          <div style={{ color: P.muted, fontSize: 12, padding: 24, textAlign: 'center' }}>
            {isRTL ? 'דרושים לפחות 2 נכסים' : 'Need ≥ 2 assets'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead>
                <tr>
                  <th/>
                  {corr.assets.map(a => <th key={a} style={{ color: P.muted, padding: '4px 6px', writingMode: 'vertical-rl', textAlign: 'left' }}>{a}</th>)}
                </tr>
              </thead>
              <tbody>
                {corr.assets.map((a, i) => (
                  <tr key={a}>
                    <th style={{ color: P.muted, padding: '4px 8px', textAlign: 'right' }}>{a}</th>
                    {corr.matrix[i].map((v, j) => {
                      const alpha = Math.abs(v);
                      const fill = v >= 0 ? `rgba(0,255,136,${alpha})` : `rgba(255,59,59,${alpha})`;
                      return <td key={j} title={`${a}↔${corr.assets[j]} = ${v}`} style={{ background: fill, color: alpha > 0.5 ? '#000' : P.fg, padding: '6px 8px', minWidth: 36, textAlign: 'center', borderRadius: 4 }}>{v.toFixed(2)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 5.C.7 — Treemap */}
        <ChartCard P={P} title={L.tm}>
          {tm.length === 0 ? (
            <div style={{ color: P.muted, fontSize: 13, padding: 24, textAlign: 'center' }}>—</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <Treemap data={tm} dataKey="size" stroke={P.bg} content={<TreemapCell P={P} fmtTip={fmtTip}/>}/>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 5.C.8 — Monte Carlo */}
        <ChartCard P={P} title={`${L.mc} · n=${mcLength}`} hint="p5 · p25 · median · p75 · p95">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[50, 100, 250, 500].map(n => (
              <button key={n} onClick={() => setMcLength(n)} style={{
                padding: '4px 10px', fontSize: 10, borderRadius: 6,
                background: mcLength === n ? `${P.accent}22` : 'transparent',
                color: mcLength === n ? P.accent : P.muted,
                border: `1px solid ${mcLength === n ? P.accent + '88' : P.border}`,
                cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace",
              }}>{n}</button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={mc} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="idx" stroke={P.muted} fontSize={10}/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={P.border}/>
              <Line type="monotone" dataKey="p5" stroke={P.loss} strokeWidth={1} dot={false} strokeDasharray="3 3"/>
              <Line type="monotone" dataKey="p25" stroke={P.loss} strokeWidth={1} dot={false}/>
              <Line type="monotone" dataKey="median" stroke={P.accent} strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="p75" stroke={P.win} strokeWidth={1} dot={false}/>
              <Line type="monotone" dataKey="p95" stroke={P.win} strokeWidth={1} dot={false} strokeDasharray="3 3"/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.C.9 — Rolling edge */}
        <ChartCard P={P} title={L.edge}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={edge} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="idx" stroke={P.muted} fontSize={10}/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={P.border} strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="expectancy" stroke={P.gold} strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.C.10 — Expectancy evolution */}
        <ChartCard P={P} title={L.exp}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={expE} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="month" stroke={P.muted} fontSize={10}/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={P.border}/>
              <Bar dataKey="expectancy" radius={[4, 4, 0, 0]}>
                {expE.map((m, i) => <Cell key={i} fill={m.expectancy >= 0 ? P.win : P.loss}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TreemapCell(props: any) {
  const { x, y, width, height, payload, P, fmtTip } = props;
  if (width === undefined || height === undefined || !payload) return null;
  const v = payload.value as number;
  const fill = v >= 0 ? P.win : P.loss;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.55} stroke={P.bg}/>
      {width > 50 && height > 30 && <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={700}>{payload.name}</text>}
      {width > 50 && height > 50 && <text x={x + 6} y={y + 30} fill="#fff" fontSize={10}>{fmtTip(v)}</text>}
    </g>
  );
}
