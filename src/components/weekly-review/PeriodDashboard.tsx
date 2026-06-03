// Shared period dashboard rendered by both Semi-Annual (6mo) and Annual (12mo)
// tabs. Pure presentation — math comes from `lib/period-aggregates.ts`.

import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import {
  ResponsiveContainer, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, ReferenceLine,
} from 'recharts';
import { computeAggregates, shortMonth } from './lib/period-aggregates';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T = any;
interface Props {
  trades: Trade[];
  months: number;       // 6 or 12
  T: T;
  isRTL: boolean;
  titleHE: string;
  titleEN: string;
}

const PIE_COLORS = ['#00f2ff', '#39FF14', '#ffd700', '#ff8c00', '#ff3b8e', '#8a5cff', '#00d6a3', '#ff6b6b', '#7a8aa3'];

export default function PeriodDashboard({ trades, months, T, isRTL, titleHE, titleEN }: Props) {
  const fg = T?.text?.primary || '#e9eef7';
  const muted = T?.text?.muted || '#7a8aa3';
  const accent = T?.accent?.cyan || '#00f2ff';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const win = T?.status?.success || '#00ff88';
  const loss = T?.status?.danger || '#ff3b3b';

  const a = useMemo(() => computeAggregates(trades, months), [trades, months]);

  const tooltipStyle = {
    background: T?.bg?.primary || '#061326',
    border: `1px solid ${border}`,
    borderRadius: 8,
    color: fg,
    fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace",
  };

  const card: React.CSSProperties = {
    padding: 'clamp(14px, 2vw, 20px)', background: panel,
    border: `1px solid ${border}`, borderRadius: 14, boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 };

  const HE = {
    netR: 'נטו R', trades: 'עסקאות', winRate: 'אחוז זכייה', pf: 'פקטור רווח',
    exp: 'תוחלת', avgWin: 'זכייה ממוצעת', avgLoss: 'הפסד ממוצע', dd: 'דרורדאון מקסימלי',
    equity: 'עקומת הון (R)', waterfall: 'ביצוע חודשי', radar: 'דנ"א סוחר',
    pf2: 'פקטור רווח חודשי', wr: 'אחוז זכייה חודשי',
    rdist: 'התפלגות R', setups: 'תרומת סטאפים', highlights: 'נקודות שיא',
    best: 'השבוע הטוב ביותר', worst: 'השבוע הגרוע ביותר',
    bestMonth: 'החודש הטוב ביותר', worstMonth: 'החודש הגרוע ביותר',
  };
  const EN = {
    netR: 'Net R', trades: 'Trades', winRate: 'Win rate', pf: 'Profit factor',
    exp: 'Expectancy', avgWin: 'Avg win', avgLoss: 'Avg loss', dd: 'Max drawdown',
    equity: 'Equity curve (R)', waterfall: 'Monthly performance', radar: 'Trader DNA',
    pf2: 'Monthly profit factor', wr: 'Monthly win rate',
    rdist: 'R distribution', setups: 'Setup contribution', highlights: 'Highlights',
    best: 'Best week', worst: 'Worst week',
    bestMonth: 'Best month', worstMonth: 'Worst month',
  };
  const L = isRTL ? HE : EN;

  const monthsData = a.months.map(m => ({
    label: shortMonth(m.monthKey),
    netR: +m.netR.toFixed(2),
    winRate: Math.round(m.winRate * 100),
    pf: Number.isFinite(m.profitFactor) ? +m.profitFactor.toFixed(2) : 0,
  }));

  const pfStr = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '∞');

  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 32 }}>
      <div>
        <div style={{ color: accent, fontSize: 10, letterSpacing: 3, fontWeight: 700 }}>
          {months === 12 ? 'ANNUAL · 12M' : 'SEMI-ANNUAL · 6M'}
        </div>
        <h2 style={{ margin: '4px 0 0', color: fg, fontSize: 'clamp(20px, 2.6vw, 28px)', fontWeight: 700 }}>
          {isRTL ? titleHE : titleEN}
        </h2>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Stat l={L.netR}    v={fmtR(a.netR)} tone={a.netR >= 0 ? win : loss} card={card} muted={muted} fg={fg} />
        <Stat l={L.trades}  v={String(a.totalTrades)} card={card} muted={muted} fg={fg} />
        <Stat l={L.winRate} v={`${Math.round(a.winRate * 100)}%`} card={card} muted={muted} fg={fg} />
        <Stat l={L.pf}      v={pfStr(a.profitFactor)} card={card} muted={muted} fg={fg} />
        <Stat l={L.exp}     v={fmtR(a.expectancyR)} tone={a.expectancyR >= 0 ? win : loss} card={card} muted={muted} fg={fg} />
        <Stat l={L.avgWin}  v={fmtR(a.avgWinR)}  tone={win}  card={card} muted={muted} fg={fg} />
        <Stat l={L.avgLoss} v={fmtR(a.avgLossR)} tone={loss} card={card} muted={muted} fg={fg} />
        <Stat l={L.dd}      v={`-${a.maxDrawdownR.toFixed(2)}R`} tone={loss} card={card} muted={muted} fg={fg} />
      </div>

      {/* Equity curve */}
      <ChartCard title={L.equity} card={card} labelStyle={labelStyle}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={a.equity} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor={accent} stopOpacity={0.55} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis stroke={muted} fontSize={10} width={36} tickFormatter={v => `${v}R`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(2)}R`, 'Equity']} labelFormatter={() => ''} />
            <ReferenceLine y={0} stroke={border} />
            <Area type="monotone" dataKey="equityR" stroke={accent} strokeWidth={2} fill="url(#eqGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Waterfall + Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <ChartCard title={L.waterfall} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={muted} fontSize={10} />
              <YAxis stroke={muted} fontSize={10} width={36} tickFormatter={v => `${v}R`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}R`, 'Net']} />
              <ReferenceLine y={0} stroke={border} />
              <Bar dataKey="netR" radius={[4, 4, 0, 0]}>
                {monthsData.map((m, i) => (
                  <Cell key={i} fill={m.netR >= 0 ? win : loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={L.radar} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={a.radar} margin={{ top: 16, right: 28, bottom: 16, left: 28 }} outerRadius="62%">
              <PolarGrid stroke={border} />
              <PolarAngleAxis dataKey="axis" stroke={muted} fontSize={10} />
              <PolarRadiusAxis stroke={border} tick={false} axisLine={false} domain={[0, 100]} />
              <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.25} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}`, '']} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* PF + Win rate trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <ChartCard title={L.pf2} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={muted} fontSize={10} />
              <YAxis stroke={muted} fontSize={10} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={1} stroke={border} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="pf" stroke="#ffd700" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={L.wr} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={muted} fontSize={10} />
              <YAxis stroke={muted} fontSize={10} width={36} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'WR']} />
              <ReferenceLine y={50} stroke={border} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="winRate" stroke={accent} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* R-distribution + Setup pie */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <ChartCard title={L.rdist} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.rDistribution} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" stroke={muted} fontSize={10} />
              <YAxis stroke={muted} fontSize={10} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {a.rDistribution.map((b, i) => (
                  <Cell key={i} fill={b.bucket.includes('-') && !b.bucket.startsWith('-1..0') ? loss : b.bucket === '0R' || b.bucket === '-1..0R' ? muted : win} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={L.setups} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={a.setupBreakdown.map(s => ({ ...s, abs: Math.abs(s.netR) || 0.0001 }))}
                dataKey="abs" nameKey="name"
                innerRadius={48} outerRadius={84}
                stroke={panel}
              >
                {a.setupBreakdown.map((s, i) => (
                  <Cell key={s.name} fill={s.netR >= 0 ? PIE_COLORS[i % PIE_COLORS.length] : loss} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(_v: number, _n, p: any) => [`${(p.payload.netR as number).toFixed(2)}R · ${p.payload.count}`, p.payload.name]} />
              <Legend wrapperStyle={{ fontSize: 10, color: muted }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Highlights */}
      <ChartCard title={L.highlights} card={card} labelStyle={labelStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Highlight l={L.best}       v={a.bestWeek ? `${a.bestWeek.weekKey} · ${fmtR(a.bestWeek.netR)}` : '—'} tone={win}  border={border} fg={fg} muted={muted} />
          <Highlight l={L.worst}      v={a.worstWeek ? `${a.worstWeek.weekKey} · ${fmtR(a.worstWeek.netR)}` : '—'} tone={loss} border={border} fg={fg} muted={muted} />
          <Highlight l={L.bestMonth}  v={a.bestMonth ? `${a.bestMonth.monthKey} · ${fmtR(a.bestMonth.netR)}` : '—'} tone={win}  border={border} fg={fg} muted={muted} />
          <Highlight l={L.worstMonth} v={a.worstMonth ? `${a.worstMonth.monthKey} · ${fmtR(a.worstMonth.netR)}` : '—'} tone={loss} border={border} fg={fg} muted={muted} />
        </div>
      </ChartCard>
    </div>
  );
}

function fmtR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}
function Stat({ l, v, tone, card, muted, fg }: { l: string; v: string; tone?: string; card: React.CSSProperties; muted: string; fg: string }) {
  return (
    <div style={card}>
      <div style={{ color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
      <div style={{ color: tone || fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, marginTop: 4 }}>{v}</div>
    </div>
  );
}
function ChartCard({ title, children, card, labelStyle }: { title: string; children: React.ReactNode; card: React.CSSProperties; labelStyle: React.CSSProperties }) {
  return (
    <div style={card}>
      <div style={{ ...labelStyle, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}
function Highlight({ l, v, tone, border, fg, muted }: { l: string; v: string; tone: string; border: string; fg: string; muted: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${border}`, borderLeft: `4px solid ${tone}` }}>
      <div style={{ color: muted, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
      <div style={{ color: fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, marginTop: 4 }}>{v}</div>
    </div>
  );
}
