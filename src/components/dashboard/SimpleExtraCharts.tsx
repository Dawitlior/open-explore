/**
 * SimpleExtraCharts — three lightweight dashboard charts:
 *   1. WinsByMonthChart      — # of winning trades per month, stacked Long/Short
 *   2. WinsByQuarterChart    — # of winning trades per quarter, stacked Long/Short
 *   3. ReturnPerTimeChart    — average return per trade-hour-held, per month
 *
 * Each chart respects the global $/R display mode for tooltip context where
 * relevant (chart #3). Charts #1/#2 count wins which is mode-agnostic but the
 * unit chip on ChartWrapper reflects the active mode.
 */
import { memo, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { getEffectiveR } from '@/lib/r-multiple';
import { useIsMobile } from '@/hooks/use-mobile';

interface BaseProps {
  T: TradingTheme;
  trades: Trade[];
  isRTL: boolean;
  tt: React.CSSProperties;
}

const MONTH_KEY = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const QUARTER_KEY = (d: Date) => `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
const SHORT_MONTH = (k: string) => {
  const [y, m] = k.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[Number(m) - 1] || m} ${y.slice(2)}`;
};

const tradeDate = (t: Trade): Date | null => {
  const raw = (t as any).exitTime || (t as any).date || (t as any).timestamp;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const isWin = (t: Trade): boolean =>
  t.winLoss === 'Win' || (Number.isFinite(t.pnl) && t.pnl > 0);

const isLoss = (t: Trade): boolean =>
  t.winLoss === 'Loss' || (Number.isFinite(t.pnl) && t.pnl < 0);

const fmtShort = (v: number, isMoney: boolean) => {
  if (!Number.isFinite(v)) return '—';
  if (!isMoney) return `${v >= 0 ? '+' : ''}${v.toFixed(Math.abs(v) >= 10 ? 1 : 2)}R`;
  const sign = v >= 0 ? '+' : '-';
  const abs = Math.abs(v);
  return abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : `${sign}$${abs.toFixed(abs >= 100 ? 0 : 2)}`;
};

/* ────────── #1 wins by month ────────── */
const WinsByMonthChartImpl = ({ T, trades, isRTL, tt }: BaseProps) => {
  const isMobile = useIsMobile();
  const data = useMemo(() => {
    const map = new Map<string, { name: string; Long: number; Short: number }>();
    for (const t of trades) {
      if (!isWin(t)) continue;
      const d = tradeDate(t);
      if (!d) continue;
      const key = MONTH_KEY(d);
      if (!map.has(key)) map.set(key, { name: key, Long: 0, Short: 0 });
      const row = map.get(key)!;
      if (t.direction === 'Long') row.Long += 1;
      else if (t.direction === 'Short') row.Short += 1;
    }
    return Array.from(map.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(r => ({ ...r, name: SHORT_MONTH(r.name) }));
  }, [trades]);

  if (!data.length) return <Empty T={T} isRTL={isRTL} />;

  // Desktop: skip labels so they never overlap.
  const desktopInterval = Math.max(0, Math.ceil(data.length / 12) - 1);
  // Mobile: aim for ~6 visible labels (skip the rest) + steep angle + compact "MMM 'YY" tick renderer.
  const mobileInterval = Math.max(0, Math.ceil(data.length / 6) - 1);

  const chart = (height: number, interval: number, mobile: boolean) => (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: mobile ? 24 : 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
          <XAxis
            dataKey="name"
            tick={{ fill: T.text.muted, fontSize: mobile ? 9 : 10 }}
            interval={interval}
            height={mobile ? 58 : 28}
            tickMargin={mobile ? 8 : 6}
            minTickGap={mobile ? 4 : 12}
            angle={mobile ? -55 : 0}
            textAnchor={mobile ? 'end' : 'middle'}
          />
          <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={32} allowDecimals={false} />
          <Tooltip contentStyle={tt} />
          <Legend wrapperStyle={{ fontSize: 11, color: T.text.muted }} />
          <Bar dataKey="Long" stackId="w" fill={T.accent.green} name={isRTL ? 'לונג' : 'Long'} />
          <Bar dataKey="Short" stackId="w" fill={T.accent.red} radius={[4, 4, 0, 0]} name={isRTL ? 'שורט' : 'Short'} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return isMobile ? chart(300, mobileInterval, true) : chart(260, desktopInterval, false);
};

/* ────────── #2 wins by quarter ────────── */
const WinsByQuarterChartImpl = ({ T, trades, isRTL, tt }: BaseProps) => {
  const data = useMemo(() => {
    const map = new Map<string, { name: string; Long: number; Short: number }>();
    for (const t of trades) {
      if (!isWin(t)) continue;
      const d = tradeDate(t);
      if (!d) continue;
      const key = QUARTER_KEY(d);
      if (!map.has(key)) map.set(key, { name: key, Long: 0, Short: 0 });
      const row = map.get(key)!;
      if (t.direction === 'Long') row.Long += 1;
      else if (t.direction === 'Short') row.Short += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [trades]);

  if (!data.length) {
    return <Empty T={T} isRTL={isRTL} />;
  }

  return (
    <div style={{ height: 260, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
          <XAxis dataKey="name" tick={{ fill: T.text.muted, fontSize: 10 }} />
          <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={32} allowDecimals={false} />
          <Tooltip contentStyle={tt} />
          <Legend wrapperStyle={{ fontSize: 11, color: T.text.muted }} />
          <Bar dataKey="Long" stackId="w" fill={T.accent.green} name={isRTL ? 'לונג' : 'Long'} />
          <Bar dataKey="Short" stackId="w" fill={T.accent.red} radius={[4, 4, 0, 0]} name={isRTL ? 'שורט' : 'Short'} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ────────── #4 quarterly wins/losses + net by year-quarter ────────── */
const QuarterlyWinsLossesYoYChartImpl = ({ T, trades, isRTL, tt }: BaseProps) => {
  const { isMoney, formatValue, unit } = useVisibleTrades(trades);
  const isMobile = useIsMobile();
  const data = useMemo(() => {
    const map = new Map<string, { name: string; year: number; q: number; wins: number; losses: number; net: number; trades: number }>();
    for (const t of trades) {
      const d = tradeDate(t);
      if (!d) continue;
      const q = Math.floor(d.getMonth() / 3) + 1;
      const year = d.getFullYear();
      const key = `${year}-Q${q}`;
      if (!map.has(key)) map.set(key, { name: key, year, q, wins: 0, losses: 0, net: 0, trades: 0 });
      const row = map.get(key)!;
      row.trades += 1;
      if (isWin(t)) row.wins += 1;
      if (isLoss(t)) row.losses += 1;
      row.net += isMoney ? (Number(t.pnl) || 0) : getEffectiveR(t as any);
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year || a.q - b.q);
  }, [trades, isMoney]);

  if (!data.length) return <Empty T={T} isRTL={isRTL} />;
  const minWidth = isMobile ? Math.max(360, data.length * 62) : '100%';
  const interval = isMobile ? 0 : Math.max(0, Math.ceil(data.length / 10) - 1);

  return (
    <div style={{ width: '100%', overflowX: isMobile ? 'auto' : 'visible' }}>
      <div style={{ height: 284, width: minWidth }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: T.text.muted, fontSize: 10 }} interval={interval} minTickGap={10} height={30} />
            <YAxis yAxisId="count" tick={{ fill: T.text.muted, fontSize: 10 }} width={32} allowDecimals={false} />
            <YAxis yAxisId="net" orientation="right" tick={{ fill: T.text.muted, fontSize: 10 }} width={50} tickFormatter={(v: number) => fmtShort(v, isMoney)} />
            <Tooltip
              contentStyle={tt}
              formatter={(v: any, name: string) => {
                if (name === 'net') return [formatValue(Number(v)), unit];
                return [v, name === 'wins' ? (isRTL ? 'ניצחונות' : 'Wins') : (isRTL ? 'הפסדים' : 'Losses')];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: T.text.muted }} />
            <ReferenceLine yAxisId="net" y={0} stroke={T.border.medium} strokeDasharray="3 3" />
            <Bar yAxisId="count" dataKey="wins" stackId="wl" fill={T.accent.green} name={isRTL ? 'ניצחונות' : 'wins'} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="count" dataKey="losses" stackId="wl" fill={T.accent.red} name={isRTL ? 'הפסדים' : 'losses'} radius={[4, 4, 0, 0]} />
            <Line yAxisId="net" type="monotone" dataKey="net" name="net" stroke={T.accent.cyan} strokeWidth={2.6} dot={{ r: 3, fill: T.accent.cyan }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ────────── #5 quarterly year matrix — heatmap comparison ────────── */
const QuarterlyYearMatrixChartImpl = ({ T, trades, isRTL }: BaseProps) => {
  const { isMoney } = useVisibleTrades(trades);
  const { years, rows, maxAbs } = useMemo(() => {
    const map = new Map<string, { year: number; q: number; wins: number; losses: number; net: number; trades: number }>();
    for (const t of trades) {
      const d = tradeDate(t);
      if (!d) continue;
      const year = d.getFullYear();
      const q = Math.floor(d.getMonth() / 3) + 1;
      const key = `${year}-Q${q}`;
      if (!map.has(key)) map.set(key, { year, q, wins: 0, losses: 0, net: 0, trades: 0 });
      const row = map.get(key)!;
      row.trades += 1;
      if (isWin(t)) row.wins += 1;
      if (isLoss(t)) row.losses += 1;
      row.net += isMoney ? (Number(t.pnl) || 0) : getEffectiveR(t as any);
    }
    const years = Array.from(new Set(Array.from(map.values()).map(v => v.year))).sort((a, b) => b - a);
    const rows = years.map(year => ({
      year,
      quarters: [1, 2, 3, 4].map(q => map.get(`${year}-Q${q}`) || { year, q, wins: 0, losses: 0, net: 0, trades: 0 }),
    }));
    const maxAbs = Math.max(1, ...Array.from(map.values()).map(v => Math.abs(v.net)));
    return { years, rows, maxAbs };
  }, [trades, isMoney]);

  if (!years.length) return <Empty T={T} isRTL={isRTL} />;

  return (
    <div style={{ width: '100%', overflowX: 'auto', paddingBottom: 2 }}>
      <div style={{ minWidth: 420, display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(4, minmax(74px, 1fr))', gap: 8, alignItems: 'center' }}>
          <span />
          {[1, 2, 3, 4].map(q => <span key={q} style={{ color: T.text.muted, fontSize: 10, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center' }}>Q{q}</span>)}
        </div>
        {rows.map(row => (
          <div key={row.year} style={{ display: 'grid', gridTemplateColumns: '72px repeat(4, minmax(74px, 1fr))', gap: 8, alignItems: 'stretch' }}>
            <div style={{ color: T.text.primary, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center' }}>{row.year}</div>
            {row.quarters.map(cell => {
              const positive = cell.net >= 0;
              const tone = positive ? T.accent.green : T.accent.red;
              const opacity = Math.max(0.12, Math.min(0.34, Math.abs(cell.net) / maxAbs * 0.34));
              return (
                <div key={cell.q} style={{
                  minHeight: 72, borderRadius: 12, padding: '9px 10px',
                  background: cell.trades ? `${tone}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : T.bg.tertiary,
                  border: `1px solid ${cell.trades ? tone + '44' : T.border.subtle}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: T.text.muted, fontSize: 9.5 }}>
                    <span>{cell.trades}T</span>
                    <span style={{ color: tone, fontWeight: 800 }}>{cell.wins}W/{cell.losses}L</span>
                  </div>
                  <div style={{ color: tone, fontSize: 13, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>
                    {cell.trades ? fmtShort(cell.net, isMoney) : '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                    {Array.from({ length: Math.min(8, cell.wins) }).map((_, i) => <span key={`w${i}`} style={{ width: 5, height: 5, borderRadius: 999, background: T.accent.green }} />)}
                    {Array.from({ length: Math.min(8, cell.losses) }).map((_, i) => <span key={`l${i}`} style={{ width: 5, height: 5, borderRadius: 999, background: T.accent.red }} />)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ────────── #3 return per trade-hour-held, per month ──────────
   Tries to infer holding time from entryTime/openTime → exitTime. When
   timestamps are missing we fall back to plain "avg return per trade" for
   that month so the chart never silently disappears. */
const ReturnPerTimeChartImpl = ({ T, trades, isRTL, tt }: BaseProps) => {
  const { isMoney, formatValue, unit } = useVisibleTrades(trades);

  const data = useMemo(() => {
    const map = new Map<string, { name: string; sum: number; hours: number; count: number }>();
    for (const t of trades) {
      const d = tradeDate(t);
      if (!d) continue;
      const key = MONTH_KEY(d);
      if (!map.has(key)) map.set(key, { name: key, sum: 0, hours: 0, count: 0 });
      const row = map.get(key)!;
      const val = isMoney
        ? (Number.isFinite(t.pnl) ? t.pnl : 0)
        : (Number.isFinite(getEffectiveR(t as any)) ? (getEffectiveR(t as any) as number) : 0);
      row.sum += val;
      row.count += 1;
      const entryRaw = (t as any).entryTime || (t as any).openTime;
      if (entryRaw) {
        const e = new Date(entryRaw);
        if (!isNaN(e.getTime())) {
          const h = Math.max(0.25, (d.getTime() - e.getTime()) / 3_600_000);
          row.hours += h;
        }
      }
    }
    return Array.from(map.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(r => ({
        name: r.name,
        ratio: r.hours > 0 ? r.sum / r.hours : (r.count ? r.sum / r.count : 0),
      }));
  }, [trades, isMoney]);

  if (!data.length) {
    return <Empty T={T} isRTL={isRTL} />;
  }

  return (
    <div style={{ height: 260, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
          <XAxis dataKey="name" tick={{ fill: T.text.muted, fontSize: 10 }} />
          <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={48} tickFormatter={(v: number) => formatValue(v)} />
          <Tooltip
            contentStyle={tt}
            formatter={(v: any) => [formatValue(Number(v)), unit === '$' ? (isRTL ? 'לשעה' : '/hr') : 'R/hr']}
          />
          <Line type="monotone" dataKey="ratio" stroke={T.accent.cyan} strokeWidth={2} dot={{ r: 3, fill: T.accent.cyan }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const Empty = ({ T, isRTL }: { T: TradingTheme; isRTL: boolean }) => (
  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.muted, fontSize: 12 }}>
    {isRTL ? 'אין מספיק נתונים להצגה' : 'Not enough data'}
  </div>
);


// Memoize all exports: props are stable references (trades, T, isRTL, tt)
// coming from a parent that already caches them, so the default shallow
// compare is safe and avoids re-rendering these expensive recharts trees on
// every parent tick (theme toggle, tooltip hover, mode switch elsewhere).
export const WinsByMonthChart = memo(WinsByMonthChartImpl);
export const WinsByQuarterChart = memo(WinsByQuarterChartImpl);
export const QuarterlyWinsLossesYoYChart = memo(QuarterlyWinsLossesYoYChartImpl);
export const QuarterlyYearMatrixChart = memo(QuarterlyYearMatrixChartImpl);
export const ReturnPerTimeChart = memo(ReturnPerTimeChartImpl);
