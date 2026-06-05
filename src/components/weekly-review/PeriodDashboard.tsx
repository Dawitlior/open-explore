import { themeBgs } from './lib/theme-bg';
// Shared period dashboard rendered by both Semi-Annual (6mo) and Annual (12mo)
// tabs. Pure presentation — math comes from `lib/period-aggregates.ts`.
// Dual-unit aware: every chart respects the global R | $ toggle.

import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import {
  ResponsiveContainer, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, ReferenceLine,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { computeAggregates, shortMonth } from './lib/period-aggregates';
import { useReviewUnit } from './hooks/use-review-unit';

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

  const { isUSD, unit } = useReviewUnit();
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
    equity: 'עקומת הון', waterfall: 'ביצוע חודשי', radar: 'דנ"א סוחר',
    pf2: 'פקטור רווח חודשי', wr: 'אחוז זכייה חודשי',
    rdist: 'התפלגות R', setups: 'תרומת סטאפים', highlights: 'נקודות שיא',
    best: 'השבוע הטוב ביותר', worst: 'השבוע הגרוע ביותר',
    bestMonth: 'החודש הטוב ביותר', worstMonth: 'החודש הגרוע ביותר',
  };
  const EN = {
    netR: 'Net R', trades: 'Trades', winRate: 'Win rate', pf: 'Profit factor',
    exp: 'Expectancy', avgWin: 'Avg win', avgLoss: 'Avg loss', dd: 'Max drawdown',
    equity: 'Equity curve', waterfall: 'Monthly performance', radar: 'Trader DNA',
    pf2: 'Monthly profit factor', wr: 'Monthly win rate',
    rdist: 'R distribution', setups: 'Setup contribution', highlights: 'Highlights',
    best: 'Best week', worst: 'Worst week',
    bestMonth: 'Best month', worstMonth: 'Worst month',
  };
  const L = isRTL ? HE : EN;

  const monthsData = a.months.map(m => ({
    label: shortMonth(m.monthKey),
    netR:  +m.netR.toFixed(2),
    netUSD:+m.netUSD.toFixed(2),
    net:   +(isUSD ? m.netUSD : m.netR).toFixed(2),
    winRate: Math.round(m.winRate * 100),
    pf: Number.isFinite(m.profitFactor) ? +m.profitFactor.toFixed(2) : 0,
  }));

  // Equity curve points — pick equity field per active unit
  const equityData = a.equity.map(p => ({
    i: p.i,
    label: p.date,
    equity: +(isUSD ? p.equityUSD : p.equityR).toFixed(2),
  }));

  // R distribution always bucketed on R (conceptual buckets); chart is unit-agnostic
  const rDistData = a.rDistribution;

  // Setup contribution — sort by active unit, drop empty buckets
  const setupData = a.setupBreakdown
    .map(s => ({ name: s.name, value: +(isUSD ? s.netUSD : s.netR).toFixed(2), count: s.count, netR: s.netR, netUSD: s.netUSD }))
    .filter(s => s.value !== 0)
    .sort((x, y) => Math.abs(y.value) - Math.abs(x.value));

  const unitSymbol = isUSD ? '$' : 'R';
  const pfStr = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '∞');
  const fmtAxis = (v: number) => (isUSD ? `$${shortNum(v)}` : `${v}R`);
  void unit; // suppress unused warn — kept for downstream use

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

      {/* Stat strip — every metric shown as R AND $ (auto-summed from journal pnl) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <DualStat l={L.netR}    r={fmtR(a.netR)}    d={fmtUSD(a.netUSD)}    tone={a.netR >= 0 ? win : loss}        card={card} muted={muted} fg={fg} />
        <Stat     l={L.trades}  v={String(a.totalTrades)}                                                          card={card} muted={muted} fg={fg} />
        <Stat     l={L.winRate} v={`${Math.round(a.winRate * 100)}%`}                                              card={card} muted={muted} fg={fg} />
        <Stat     l={L.pf}      v={pfStr(a.profitFactor)}                                                          card={card} muted={muted} fg={fg} />
        <DualStat l={L.exp}     r={fmtR(a.expectancyR)} d={fmtUSD(a.expectancyUSD)} tone={a.expectancyR >= 0 ? win : loss} card={card} muted={muted} fg={fg} />
        <DualStat l={L.avgWin}  r={fmtR(a.avgWinR)}  d={fmtUSD(a.avgWinUSD)}  tone={win}                          card={card} muted={muted} fg={fg} />
        <DualStat l={L.avgLoss} r={fmtR(a.avgLossR)} d={fmtUSD(a.avgLossUSD)} tone={loss}                         card={card} muted={muted} fg={fg} />
        <DualStat l={L.dd}      r={`-${a.maxDrawdownR.toFixed(2)}R`} d={fmtUSD(-Math.abs(a.maxDrawdownUSD))} tone={loss} card={card} muted={muted} fg={fg} />
      </div>

      {/* Trader DNA + Monthly PF + Monthly WR — currency-agnostic, kept */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
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

        <ChartCard title={L.pf2} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={260}>
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
          <ResponsiveContainer width="100%" height={260}>
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

      {/* ===== Rebuilt dual-unit charts ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* 1) Equity curve */}
        <ChartCard title={`${L.equity} (${unitSymbol})`} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={equityData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="i" stroke={muted} fontSize={10} hide />
              <YAxis stroke={muted} fontSize={10} width={48} tickFormatter={fmtAxis} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_v, p) => (p?.[0]?.payload?.label || '')}
                formatter={(v: number) => [isUSD ? fmtUSD(v) : fmtR(v), L.equity]}
              />
              <ReferenceLine y={0} stroke={border} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="equity" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2) Monthly waterfall — bars colored by sign */}
        <ChartCard title={`${L.waterfall} (${unitSymbol})`} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthsData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" stroke={muted} fontSize={10} />
              <YAxis stroke={muted} fontSize={10} width={48} tickFormatter={fmtAxis} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [isUSD ? fmtUSD(v) : fmtR(v), L.waterfall]}
              />
              <ReferenceLine y={0} stroke={border} />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {monthsData.map((m, i) => (
                  <Cell key={i} fill={m.net >= 0 ? win : loss} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3) R distribution (bucketed on R — unit-agnostic) */}
        <ChartCard title={L.rdist} card={card} labelStyle={labelStyle}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rDistData} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid stroke={border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bucket" stroke={muted} fontSize={9} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis stroke={muted} fontSize={10} width={32} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {rDistData.map((d, i) => {
                  const isNeg = d.bucket.startsWith('-') || d.bucket.startsWith('≤-');
                  return <Cell key={i} fill={d.bucket === '0R' ? muted : isNeg ? loss : win} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4) Setup contribution — donut, signed slices */}
        <ChartCard title={`${L.setups} (${unitSymbol})`} card={card} labelStyle={labelStyle}>
          {setupData.length === 0 ? (
            <div style={{ color: muted, fontSize: 13, padding: 24, textAlign: 'center' }}>—</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={setupData.map(s => ({ ...s, value: Math.abs(s.value) }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={90}
                  paddingAngle={2}
                  stroke={panel}
                >
                  {setupData.map((s, i) => (
                    <Cell key={s.name} fill={s.value >= 0 ? PIE_COLORS[i % PIE_COLORS.length] : loss} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10, color: muted }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(_v: number, _n: string, p) => {
                    const item = p?.payload as { netR: number; netUSD: number; count: number };
                    if (!item) return [_v, _n];
                    return [isUSD ? fmtUSD(item.netUSD) : fmtR(item.netR), `${item.count}× ${_n}`];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>



      {/* Monthly breakdown table — shows BOTH R and $ for every month (live from journal) */}
      <ChartCard title={isRTL ? 'פירוט חודשי' : 'Monthly breakdown'} card={card} labelStyle={labelStyle}>
        {a.months.length === 0 ? (
          <div style={{ color: muted, fontSize: 13, padding: 24, textAlign: 'center' }}>—</div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
              <thead>
                <tr style={{ color: muted, background: themeBgs(T).subtle, textAlign: isRTL ? 'right' : 'left' }}>
                  <th style={th}>{isRTL ? 'חודש' : 'Month'}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{L.trades}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{L.netR}</th>
                  <th style={{ ...th, textAlign: 'right' }}>$ P&amp;L</th>
                  <th style={{ ...th, textAlign: 'right' }}>WR</th>
                  <th style={{ ...th, textAlign: 'right' }}>PF</th>
                </tr>
              </thead>
              <tbody>
                {a.months.map(m => (
                  <tr key={m.monthKey} style={{ borderTop: `1px solid ${border}`, color: fg }}>
                    <td style={td}>{m.monthKey}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{m.trades}</td>
                    <td style={{ ...td, textAlign: 'right', color: m.netR >= 0 ? win : loss, fontWeight: 700 }}>{fmtR(m.netR)}</td>
                    <td style={{ ...td, textAlign: 'right', color: m.netUSD >= 0 ? win : loss, fontWeight: 700 }}>{fmtUSD(m.netUSD)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{Math.round(m.winRate * 100)}%</td>
                    <td style={{ ...td, textAlign: 'right' }}>{pfStr(m.profitFactor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>


      {/* Highlights */}
      <ChartCard title={L.highlights} card={card} labelStyle={labelStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <Highlight l={L.best}       v={a.bestWeek  ? `${a.bestWeek.weekKey}  · ${fmtR(a.bestWeek.netR)}  · ${fmtUSD(a.bestWeek.netUSD)}`   : '—'} tone={win}  border={border} fg={fg} muted={muted} />
          <Highlight l={L.worst}      v={a.worstWeek ? `${a.worstWeek.weekKey} · ${fmtR(a.worstWeek.netR)} · ${fmtUSD(a.worstWeek.netUSD)}`  : '—'} tone={loss} border={border} fg={fg} muted={muted} />
          <Highlight l={L.bestMonth}  v={a.bestMonth ? `${a.bestMonth.monthKey} · ${fmtR(a.bestMonth.netR)} · ${fmtUSD(a.bestMonth.netUSD)}` : '—'} tone={win}  border={border} fg={fg} muted={muted} />
          <Highlight l={L.worstMonth} v={a.worstMonth? `${a.worstMonth.monthKey}· ${fmtR(a.worstMonth.netR)}· ${fmtUSD(a.worstMonth.netUSD)}`: '—'} tone={loss} border={border} fg={fg} muted={muted} />

        </div>
      </ChartCard>
    </div>
  );
}

function fmtR(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
}
function fmtUSD(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  const formatted = abs >= 1000 ? abs.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                 : abs.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${v < 0 ? '-' : v > 0 ? '+' : ''}$${formatted}`;
}
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' };
const td: React.CSSProperties = { padding: '8px 10px' };
function Stat({ l, v, tone, card, muted, fg }: { l: string; v: string; tone?: string; card: React.CSSProperties; muted: string; fg: string }) {
  return (
    <div style={card}>
      <div style={{ color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
      <div style={{ color: tone || fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, marginTop: 4 }}>{v}</div>
    </div>
  );
}
function DualStat({ l, r, d, tone, card, muted, fg }: { l: string; r: string; d: string; tone?: string; card: React.CSSProperties; muted: string; fg: string }) {
  return (
    <div style={card}>
      <div style={{ color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>{l}</div>
      <div style={{ color: tone || fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, marginTop: 4 }}>{r}</div>
      <div style={{ color: muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, marginTop: 2, opacity: 0.85 }}>{d}</div>
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

function shortNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(0)}`;
}
