// Monthly Dashboard — 11 charts (5.A.1–5.A.11)
// Pulls live trades for the selected month from the trading journal.

import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine,
  Area, Line, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts';
import type { Trade } from '@/data/trades';
import { useReviewUnit } from './hooks/use-review-unit';
import {
  computeQuantMetrics, computeEquityCurve, computeDistribution,
  computeSetupDominance, computeProfitBySetup, computeAssetBreakdown,
  computePsychCorrelation, computeHeatmap, computeMoM, computeCompliance,
  computeBestWorstWeek, fmtValue, fmtShort,
} from './lib/chart-compute';
import { getPalette, card, labelStyle, tooltipStyle, ChartCard, StatCard, PIE_COLORS, type AnyT } from './lib/chart-ui';
import { parseTradeDate, monthKeyOf } from './lib/week-key';

interface Props { T: AnyT; isRTL: boolean; trades: Trade[]; monthKey: string; }

const DAY_NAMES_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_HE = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

export default function MonthlyDashboard({ T, isRTL, trades, monthKey }: Props) {
  const P = getPalette(T);
  const { unit: unitRaw, isUSD: isUSDRaw } = useReviewUnit();
  const hasMoney = useMemo(() => trades.some(t => Number(t.pnl) !== 0 && Number.isFinite(Number(t.pnl))), [trades]);
  // Force R when the portfolio has no real money data; prevents "0$" charts.
  const isUSD = isUSDRaw && hasMoney;
  const unit = isUSD ? unitRaw : 'R';

  const monthTrades = useMemo(() =>
    trades.filter(t => {
      const d = parseTradeDate(t.date);
      return d && monthKeyOf(d) === monthKey;
    }).sort((a, b) => (parseTradeDate(a.date)?.getTime() || 0) - (parseTradeDate(b.date)?.getTime() || 0))
  , [trades, monthKey]);

  const qm        = useMemo(() => computeQuantMetrics(monthTrades, unit), [monthTrades, unit]);
  const equity    = useMemo(() => computeEquityCurve(monthTrades, unit), [monthTrades, unit]);
  const dist      = useMemo(() => computeDistribution(monthTrades, unit), [monthTrades, unit]);
  const setupDom  = useMemo(() => computeSetupDominance(monthTrades, unit), [monthTrades, unit]);
  const profitPie = useMemo(() => computeProfitBySetup(monthTrades, unit), [monthTrades, unit]);
  const assets    = useMemo(() => computeAssetBreakdown(monthTrades, unit), [monthTrades, unit]);
  const psych     = useMemo(() => computePsychCorrelation(monthTrades, unit), [monthTrades, unit]);
  const heat      = useMemo(() => computeHeatmap(monthTrades, unit), [monthTrades, unit]);
  const mom       = useMemo(() => computeMoM(trades, parseTradeDate(monthKey + '-15') || new Date(), unit), [trades, monthKey, unit]);
  const comp      = useMemo(() => computeCompliance(monthTrades), [monthTrades]);
  const bw        = useMemo(() => computeBestWorstWeek(monthTrades, unit), [monthTrades, unit]);

  if (!monthTrades.length) {
    return (
      <div style={{ ...card(P), textAlign: 'center', color: P.muted, padding: 32 }}>
        {isRTL ? `אין עסקאות בחודש ${monthKey}` : `No trades in ${monthKey}`}
      </div>
    );
  }

  const L = isRTL ? {
    pf: 'פקטור רווח', exp: 'תוחלת', sharpe: 'שארפ', maxdd: 'דרורדאון מקס׳', maxrec: 'התאוששות מקס׳',
    avgw: 'זכייה ממוצעת', avgl: 'הפסד ממוצע', wr: 'אחוז זכייה', total: 'סה״כ עסקאות',
    equity: 'עקומת הון', dist: 'התפלגות', setupDom: 'דומיננטיות סטאפים', profit: 'רווח לפי סטאפ',
    assets: 'פירוט נכסים', psych: 'מתאם פסיכולוגי', heat: 'יום/שעה', mom: 'השוואה לחודש קודם',
    comp: 'ציון משמעת', best: 'השבוע הטוב', worst: 'השבוע הגרוע',
    trades: 'עסקאות', noPsych: 'אין תיוגי רגש (Emotion:X בהערות)',
    noTime: 'אין נתוני שעת כניסה',
  } : {
    pf: 'Profit Factor', exp: 'Expectancy', sharpe: 'Sharpe', maxdd: 'Max Drawdown', maxrec: 'Max Recovery',
    avgw: 'Avg Winner', avgl: 'Avg Loser', wr: 'Win Rate', total: 'Total Trades',
    equity: 'Equity Curve', dist: 'Distribution', setupDom: 'Setup Dominance', profit: 'Profit by Setup',
    assets: 'Asset Breakdown', psych: 'Psych Correlation', heat: 'Time / Day', mom: 'Month-over-Month',
    comp: 'Compliance', best: 'Best Week', worst: 'Worst Week',
    trades: 'Trades', noPsych: 'No emotion tags (Emotion:X in comments)',
    noTime: 'No entry-time data',
  };

  const fmtAxis = (v: number) => fmtShort(v, unit);
  const fmtTip = (v: number) => fmtValue(v, unit);
  const dayNames = isRTL ? DAY_NAMES_HE : DAY_NAMES_EN;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* 5.A.1 — Quant cards */}
      {qm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatCard P={P} label={L.pf}     value={qm.profitFactor} />
          <StatCard P={P} label={L.exp}    value={fmtTip(qm.expectancy)} tone={qm.expectancy >= 0 ? P.win : P.loss} />
          <StatCard P={P} label={L.sharpe} value={qm.sharpe.toFixed(2)} />
          <StatCard P={P} label={L.maxdd}  value={fmtTip(qm.maxDrawdown)} tone={P.loss} />
          <StatCard P={P} label={L.maxrec} value={fmtTip(qm.maxRecovery)} tone={P.win} />
          <StatCard P={P} label={L.avgw}   value={fmtTip(qm.avgWinner)} tone={P.win} />
          <StatCard P={P} label={L.avgl}   value={fmtTip(qm.avgLoser)} tone={P.loss} />
          <StatCard P={P} label={L.wr}     value={`${Math.round(qm.winRate * 100)}%`} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 5.A.2 — Equity */}
        <ChartCard P={P} title={`${L.equity} (${isUSD ? '$' : 'R'})`}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={equity} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={P.win} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={P.win} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={P.loss} stopOpacity={0}/>
                  <stop offset="100%" stopColor={P.loss} stopOpacity={0.3}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false}/>
              <XAxis dataKey="idx" stroke={P.muted} fontSize={10}/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => [fmtTip(v), 'Equity']} labelFormatter={l => `# ${l}`}/>
              <ReferenceLine y={0} stroke={P.border} strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="cum" fill="url(#eqGrad)" stroke="none"/>
              <Area type="monotone" dataKey="drawdown" fill="url(#ddGrad)" stroke="none"/>
              <Line type="monotone" dataKey="cum" stroke={P.win} strokeWidth={2.5} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.A.3 — Distribution */}
        <ChartCard P={P} title={L.dist}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dist} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="range" stroke={P.muted} fontSize={9} angle={-20} textAnchor="end" height={50}/>
              <YAxis stroke={P.muted} fontSize={10} width={32} allowDecimals={false}/>
              <Tooltip contentStyle={tooltipStyle(P)}/>
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {dist.map((d, i) => (
                  <Cell key={i} fill={d.sign === 'pos' ? P.win : d.sign === 'neg' ? P.loss : P.muted}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.A.4 — Setup Dominance dual-axis */}
        <ChartCard P={P} title={`${L.setupDom} (${isUSD ? '$' : 'R'} + WR%)`}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={setupDom} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="name" stroke={P.muted} fontSize={10}/>
              <YAxis yAxisId="v" tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <YAxis yAxisId="w" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} stroke={P.gold} fontSize={10} width={36}/>
              <Tooltip contentStyle={tooltipStyle(P)}/>
              <ReferenceLine yAxisId="v" y={0} stroke={P.border}/>
              <Bar yAxisId="v" dataKey="netValue" radius={[4, 4, 0, 0]}>
                {setupDom.map((d, i) => <Cell key={i} fill={d.netValue >= 0 ? P.win : P.loss}/>)}
              </Bar>
              <Line yAxisId="w" type="monotone" dataKey="winRate" stroke={P.gold} strokeWidth={2}/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.A.5 — Profit by Setup pie */}
        <ChartCard P={P} title={L.profit}>
          {profitPie.length === 0 ? (
            <div style={{ color: P.muted, fontSize: 13, padding: 24, textAlign: 'center' }}>—</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={profitPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} stroke={P.panel}>
                  {profitPie.map((s, i) => <Cell key={s.name} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10, color: P.muted }}/>
                <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* 5.A.6 — Asset breakdown table */}
      <ChartCard P={P} title={L.assets}>
        <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${P.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ color: P.muted, background: P.subtleBg, textAlign: isRTL ? 'right' : 'left' }}>
                <Th>{isRTL ? 'נכס' : 'Asset'}</Th>
                <Th align="right">{L.trades}</Th>
                <Th align="right">{isUSD ? '$ Net' : 'Net R'}</Th>
                <Th align="right">WR</Th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.asset} style={{ borderTop: `1px solid ${P.border}`, color: P.fg }}>
                  <Td>{a.asset}</Td>
                  <Td align="right">{a.trades}</Td>
                  <Td align="right" style={{ color: a.netValue >= 0 ? P.win : P.loss, fontWeight: 700 }}>{fmtTip(a.netValue)}</Td>
                  <Td align="right">{a.winRate}%</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 5.A.7 — Psych correlation */}
        <ChartCard P={P} title={L.psych}>
          {psych.length === 0 ? (
            <div style={{ color: P.muted, fontSize: 12, padding: 24, textAlign: 'center' }}>{L.noPsych}</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, psych.length * 36)}>
              <BarChart data={psych} layout="vertical" margin={{ top: 10, right: 12, bottom: 8, left: 60 }}>
                <CartesianGrid stroke={P.border} strokeDasharray="3 3"/>
                <XAxis type="number" tickFormatter={fmtAxis} stroke={P.muted} fontSize={10}/>
                <YAxis type="category" dataKey="emotion" stroke={P.muted} fontSize={10} width={80}/>
                <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
                <ReferenceLine x={0} stroke={P.border}/>
                <Bar dataKey="netValue" radius={[0, 4, 4, 0]}>
                  {psych.map((d, i) => <Cell key={i} fill={d.netValue >= 0 ? P.win : P.loss}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 5.A.8 — Heatmap */}
        <ChartCard P={P} title={L.heat}>
          {heat.maxAbs === 0 ? (
            <div style={{ color: P.muted, fontSize: 12, padding: 24, textAlign: 'center' }}>{L.noTime}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(24, minmax(14px, 1fr))`, gap: 2, fontSize: 9, color: P.muted, minWidth: 480 }}>
                <div/>
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} style={{ textAlign: 'center' }}>{h}</div>
                ))}
                {dayNames.map((day, d) => (
                  <>
                    <div key={`d${d}`} style={{ alignSelf: 'center' }}>{day}</div>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const cell = heat.cells[`${d}-${h}`];
                      if (!cell) return <div key={`${d}-${h}`} style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.04)', borderRadius: 2 }}/>;
                      const intensity = Math.min(1, Math.abs(cell.net) / heat.maxAbs);
                      const color = cell.net >= 0 ? `rgba(0,255,136,${0.15 + intensity * 0.85})` : `rgba(255,59,59,${0.15 + intensity * 0.85})`;
                      return (
                        <div key={`${d}-${h}`} title={`${dayNames[d]} ${h}:00 — ${fmtTip(cell.net)} (${cell.count} trades)`}
                             style={{ aspectRatio: '1', background: color, borderRadius: 2 }}/>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 5.A.9 — MoM */}
        <ChartCard P={P} title={L.mom}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
            <thead>
              <tr style={{ color: P.muted, textAlign: isRTL ? 'right' : 'left' }}>
                <Th>Metric</Th>
                <Th align="right">{isRTL ? 'נוכחי' : 'Current'}</Th>
                <Th align="right">{isRTL ? 'קודם' : 'Previous'}</Th>
                <Th align="right">Δ</Th>
              </tr>
            </thead>
            <tbody>
              {mom.map(r => (
                <tr key={r.label} style={{ borderTop: `1px solid ${P.border}`, color: P.fg }}>
                  <Td>{r.label}</Td>
                  <Td align="right">{r.label.startsWith('Net') ? fmtTip(r.current) : r.current}</Td>
                  <Td align="right">{r.label.startsWith('Net') ? fmtTip(r.previous) : r.previous}</Td>
                  <Td align="right" style={{ color: r.delta >= 0 ? P.win : P.loss, fontWeight: 700 }}>
                    {r.delta >= 0 ? '+' : ''}{r.label.startsWith('Net') ? fmtTip(r.delta) : r.delta}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>

        {/* 5.A.10 — Compliance */}
        <ChartCard P={P} title={L.comp}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 8px' }}>
            <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={P.border} strokeWidth="3"/>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={P.win} strokeWidth="3"
                        strokeDasharray={`${comp.pct * 100}, 100`} strokeLinecap="round"/>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 22, color: P.fg }}>
                {Math.round(comp.pct * 100)}%
              </div>
            </div>
            <div style={{ color: P.muted, fontSize: 12 }}>
              {comp.score} / {comp.total} {isRTL ? 'עסקאות לפי הכללים' : 'trades followed rules'}
            </div>
          </div>
        </ChartCard>

        {/* 5.A.11 — Best/Worst week */}
        <ChartCard P={P} title={`${L.best} / ${L.worst}`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <BWCard P={P} label={L.best}  v={bw.best  ? `${bw.best.weekKey}\n${fmtTip(bw.best.net)} · ${bw.best.trades}t`  : '—'} tone={P.win}/>
            <BWCard P={P} label={L.worst} v={bw.worst ? `${bw.worst.weekKey}\n${fmtTip(bw.worst.net)} · ${bw.worst.trades}t` : '—'} tone={P.loss}/>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function BWCard({ P, label, v, tone }: { P: ReturnType<typeof getPalette>; label: string; v: string; tone: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${P.border}`, background: P.subtleBg }}>
      <div style={labelStyle(P)}>{label}</div>
      <div style={{ color: tone, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14, marginTop: 6, whiteSpace: 'pre-line' }}>{v}</div>
    </div>
  );
}
function Th({ children, align }: { children?: React.ReactNode; align?: 'right' | 'left' | 'center' }) {
  return <th style={{ padding: '8px 10px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textAlign: align || 'inherit', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align, style }: { children?: React.ReactNode; align?: 'right' | 'left' | 'center'; style?: React.CSSProperties }) {
  return <td style={{ padding: '8px 10px', textAlign: align || 'inherit', ...style }}>{children}</td>;
}
