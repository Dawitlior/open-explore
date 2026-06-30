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
import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { getEffectiveR } from '@/lib/r-multiple';

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
const useIsMobile = () => {
  const [m, setM] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const on = () => setM(window.innerWidth < 640);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return m;
};

const tradeDate = (t: Trade): Date | null => {
  const raw = (t as any).exitTime || (t as any).date || (t as any).timestamp;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const isWin = (t: Trade): boolean =>
  t.winLoss === 'Win' || (Number.isFinite(t.pnl) && t.pnl > 0);

/* ────────── #1 wins by month ────────── */
export const WinsByMonthChart = ({ T, trades, isRTL, tt }: BaseProps) => {
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

  // Skip labels when crowded so the desktop X-axis stays readable.
  const desktopInterval = Math.max(0, Math.ceil(data.length / 12) - 1);
  const interval = isMobile ? 0 : desktopInterval;

  return (
    <div style={{ height: isMobile ? 300 : 260, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: isMobile ? 40 : 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
          <XAxis
            dataKey="name"
            tick={{ fill: T.text.muted, fontSize: isMobile ? 9 : 10 }}
            interval={interval}
            angle={isMobile ? -45 : (data.length > 8 ? -35 : 0)}
            textAnchor={isMobile || data.length > 8 ? 'end' : 'middle'}
            height={isMobile ? 50 : (data.length > 8 ? 50 : 30)}
            minTickGap={8}
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
};

/* ────────── #2 wins by quarter ────────── */
export const WinsByQuarterChart = ({ T, trades, isRTL, tt }: BaseProps) => {
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

/* ────────── #3 return per trade-hour-held, per month ──────────
   Tries to infer holding time from entryTime/openTime → exitTime. When
   timestamps are missing we fall back to plain "avg return per trade" for
   that month so the chart never silently disappears. */
export const ReturnPerTimeChart = ({ T, trades, isRTL, tt }: BaseProps) => {
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
