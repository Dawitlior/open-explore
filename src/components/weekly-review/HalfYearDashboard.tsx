// Half-Year (6 months) Dashboard — 9 charts (5.B.1–5.B.9)

import { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine,
  Area, Line, LineChart, BarChart, Bar, Cell, PieChart, Pie, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import type { Trade } from '@/data/trades';
import { useReviewUnit } from './hooks/use-review-unit';
import { useRiskPrefs } from './hooks/use-risk-prefs';
import {
  computeEquityCurve, computeTraderDNA, computeMomentum, computeSetupEvolution,
  computeMonthlyTrends, computeProfitBySetup, computeHighlights, fmtValue, fmtShort, getTradeValue,
} from './lib/chart-compute';
import { getPalette, card, labelStyle, tooltipStyle, ChartCard, PIE_COLORS, type AnyT } from './lib/chart-ui';
import { parseTradeDate, monthKeyOf } from './lib/week-key';

interface Props { T: AnyT; isRTL: boolean; trades: Trade[]; months?: number; }

export default function HalfYearDashboard({ T, isRTL, trades, months = 6 }: Props) {
  const P = getPalette(T);
  const { unit, isUSD } = useReviewUnit();
  const risk = useRiskPrefs();

  const sliced = useMemo(() => {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months + 1); cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0);
    return trades.filter(t => { const d = parseTradeDate(t.date); return d && d >= cutoff; })
      .sort((a, b) => (parseTradeDate(a.date)?.getTime() || 0) - (parseTradeDate(b.date)?.getTime() || 0));
  }, [trades, months]);

  const equity     = useMemo(() => computeEquityCurve(sliced, unit), [sliced, unit]);
  const dna        = useMemo(() => computeTraderDNA(sliced, unit, risk.rUSD), [sliced, unit, risk.rUSD]);
  const momentum   = useMemo(() => computeMomentum(sliced, unit), [sliced, unit]);
  const evo        = useMemo(() => computeSetupEvolution(sliced, unit), [sliced, unit]);
  const trends     = useMemo(() => computeMonthlyTrends(sliced), [sliced]);
  const pie        = useMemo(() => computeProfitBySetup(sliced, unit), [sliced, unit]);
  const hi         = useMemo(() => computeHighlights(sliced, unit), [sliced, unit]);
  const waterfall  = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of sliced) {
      const d = parseTradeDate(t.date); if (!d) continue;
      const mk = monthKeyOf(d);
      m.set(mk, (m.get(mk) || 0) + getTradeValue(t, unit));
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, net]) => ({ month, net: +net.toFixed(2) }));
  }, [sliced, unit]);

  if (!sliced.length) {
    return <div style={{ ...card(P), textAlign: 'center', color: P.muted, padding: 32 }}>
      {isRTL ? 'אין נתונים בטווח הזה' : 'No data in this range'}
    </div>;
  }

  const L = isRTL ? {
    equity: 'עקומת הון', radar: 'דנ"א סוחר', waterfall: 'ביצוע חודשי', pie: 'נתח רווח לפי סטאפ',
    momentum: 'מומנטום', evolution: 'התפתחות סטאפים', wr: 'אחוז זכייה חודשי', pf: 'פקטור רווח חודשי',
    highlights: 'נקודות שיא', bestM: 'חודש מצוין', worstM: 'חודש גרוע', bestS: 'סטאפ מוביל', active: 'נכס פעיל ביותר',
  } : {
    equity: 'Equity Curve', radar: 'Trader DNA', waterfall: 'Monthly Waterfall', pie: 'Setup Profit Share',
    momentum: 'Momentum (4-week avg)', evolution: 'Setup Evolution', wr: 'Monthly Win Rate', pf: 'Monthly Profit Factor',
    highlights: 'Highlights', bestM: 'Best Month', worstM: 'Worst Month', bestS: 'Top Setup', active: 'Most Active',
  };

  const fmtAxis = (v: number) => fmtShort(v, unit);
  const fmtTip = (v: number) => fmtValue(v, unit);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 5.B.1 — 6mo Equity */}
        <ChartCard P={P} title={`${L.equity} (${isUSD ? '$' : 'R'})`}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={equity} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <defs>
                <linearGradient id="hyEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={P.accent} stopOpacity={0.35}/>
                  <stop offset="100%" stopColor={P.accent} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="idx" stroke={P.muted} fontSize={10} hide/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={P.border} strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="cum" fill="url(#hyEq)" stroke="none"/>
              <Line type="monotone" dataKey="cum" stroke={P.accent} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.B.2 — Trader DNA */}
        <ChartCard P={P} title={L.radar}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={dna} outerRadius="62%" margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
              <PolarGrid stroke={P.border}/>
              <PolarAngleAxis dataKey="metric" stroke={P.muted} fontSize={10}/>
              <PolarRadiusAxis domain={[0, 100]} stroke={P.border} tick={false} axisLine={false}/>
              <Radar dataKey="value" stroke={P.accent} fill={P.accent} fillOpacity={0.25} strokeWidth={2}/>
              <Tooltip contentStyle={tooltipStyle(P)}/>
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.B.3 — Monthly waterfall */}
        <ChartCard P={P} title={`${L.waterfall} (${isUSD ? '$' : 'R'})`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfall} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="month" stroke={P.muted} fontSize={10}/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={P.border}/>
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {waterfall.map((m, i) => <Cell key={i} fill={m.net >= 0 ? P.win : P.loss}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.B.4 — Setup profit share */}
        <ChartCard P={P} title={L.pie}>
          {pie.length === 0 ? (
            <div style={{ color: P.muted, fontSize: 13, padding: 24, textAlign: 'center' }}>—</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} stroke={P.panel}>
                  {pie.map((s, i) => <Cell key={s.name} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10, color: P.muted }}/>
                <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 5.B.5 — Momentum */}
        <ChartCard P={P} title={L.momentum}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={momentum} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="week" stroke={P.muted} fontSize={9} angle={-15} textAnchor="end" height={50}/>
              <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
              <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
              <ReferenceLine y={0} stroke={P.border}/>
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {momentum.map((m, i) => <Cell key={i} fill={m.value >= 0 ? P.win : P.loss}/>)}
              </Bar>
              <Line type="monotone" dataKey="rollingAvg" stroke={P.gold} strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5.B.6 — Setup evolution */}
        <ChartCard P={P} title={L.evolution}>
          {evo.setupNames.length === 0 ? (
            <div style={{ color: P.muted, fontSize: 13, padding: 24, textAlign: 'center' }}>—</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={evo.rows} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
                <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" stroke={P.muted} fontSize={10}/>
                <YAxis tickFormatter={fmtAxis} stroke={P.muted} fontSize={10} width={48}/>
                <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => fmtTip(v)}/>
                <Legend wrapperStyle={{ fontSize: 10, color: P.muted }}/>
                <ReferenceLine y={0} stroke={P.border}/>
                {evo.setupNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 5.B.7 — Monthly Win Rate trend */}
        <ChartCard P={P} title={`${L.wr} (%)`} hint={isRTL ? 'יעד = 50%' : 'target = 50%'}>
          {trends.length === 0 ? (
            <div style={{ color: P.muted, fontSize: 12, padding: 32, textAlign: 'center' }}>
              {isRTL ? 'אין נתונים חודשיים' : 'No monthly data yet'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={trends} margin={{ top: 14, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="wrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.accent} stopOpacity={0.35}/>
                    <stop offset="100%" stopColor={P.accent} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" stroke={P.muted} fontSize={10}/>
                <YAxis domain={[0, 100]} stroke={P.muted} fontSize={10} width={40} tickFormatter={v => `${v}%`}/>
                <Tooltip contentStyle={tooltipStyle(P)} formatter={(v: number) => [`${v}%`, isRTL ? 'אחוז זכייה' : 'Win Rate']}/>
                <ReferenceLine y={50} stroke={P.gold} strokeDasharray="4 4" label={{ value: '50%', position: 'right', fill: P.gold, fontSize: 10 }}/>
                <Area type="monotone" dataKey="winRate" fill="url(#wrFill)" stroke="none"/>
                <Line type="monotone" dataKey="winRate" stroke={P.accent} strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2, stroke: P.bg, fill: P.accent }}
                      activeDot={{ r: 6 }}/>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 5.B.8 — Monthly Profit Factor trend (cap ∞ for display, label visually) */}
        <ChartCard P={P} title={L.pf} hint={isRTL ? 'יעד ≥ 1.0' : 'target ≥ 1.0'}>
          {trends.length === 0 ? (
            <div style={{ color: P.muted, fontSize: 12, padding: 32, textAlign: 'center' }}>
              {isRTL ? 'אין נתונים חודשיים' : 'No monthly data yet'}
            </div>
          ) : (
            (() => {
              // Cap PF for display (∞ would blow the axis); record uncapped for tooltip.
              const display = trends.map(r => ({
                ...r,
                pfDisplay: r.pf >= 999 ? 5 : Math.min(5, r.pf),
                pfRaw: r.pf,
                isInf: r.pf >= 999,
              }));
              return (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={display} margin={{ top: 14, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid stroke={P.border} strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="month" stroke={P.muted} fontSize={10}/>
                    <YAxis domain={[0, 5]} stroke={P.muted} fontSize={10} width={36}
                           ticks={[0, 1, 2, 3, 5]} tickFormatter={v => v === 5 ? '5+' : String(v)}/>
                    <Tooltip contentStyle={tooltipStyle(P)}
                             formatter={(_v: number, _n, p) => {
                               // eslint-disable-next-line @typescript-eslint/no-explicit-any
                               const row = (p as any)?.payload;
                               const raw = row?.pfRaw;
                               if (row?.isInf) return [isRTL ? 'ללא הפסדים' : 'No losses', 'PF'];
                               return [Number(raw).toFixed(2), 'PF'];
                             }}/>
                    <ReferenceLine y={1} stroke={P.gold} strokeDasharray="4 4" label={{ value: '1.0', position: 'right', fill: P.gold, fontSize: 10 }}/>
                    <Bar dataKey="pfDisplay" radius={[6, 6, 0, 0]}>
                      {display.map((m, i) => <Cell key={i} fill={m.isInf ? P.gold : (m.pfRaw >= 1 ? P.win : P.loss)}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()
          )}
        </ChartCard>

      </div>

      {/* 5.B.9 — Highlights */}
      <ChartCard P={P} title={L.highlights}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <HCard P={P} label={L.bestM}  v={hi.best       ? `${hi.best[0]}\n${fmtTip(hi.best[1])}`        : '—'} tone={P.win}/>
          <HCard P={P} label={L.worstM} v={hi.worst      ? `${hi.worst[0]}\n${fmtTip(hi.worst[1])}`      : '—'} tone={P.loss}/>
          <HCard P={P} label={L.bestS}  v={hi.bestSetup  ? `${hi.bestSetup.name}\n${fmtTip(hi.bestSetup.netValue)} · ${hi.bestSetup.count}t` : '—'} tone={P.accent}/>
          <HCard P={P} label={L.active} v={hi.mostActive ? `${hi.mostActive.asset}\n${hi.mostActive.trades}t · ${fmtTip(hi.mostActive.netValue)}` : '—'} tone={P.gold}/>
        </div>
      </ChartCard>
    </div>
  );
}

function HCard({ P, label, v, tone }: { P: ReturnType<typeof getPalette>; label: string; v: string; tone: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, border: `1px solid ${P.border}`, background: P.subtleBg }}>
      <div style={labelStyle(P)}>{label}</div>
      <div style={{ color: tone, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14, marginTop: 6, whiteSpace: 'pre-line' }}>{v}</div>
    </div>
  );
}
