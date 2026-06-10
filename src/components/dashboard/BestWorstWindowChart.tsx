/**
 * BestWorstWindowChart — Shows the best and worst day-of-week and
 * hour-of-day windows for the trader, in either USD or R based on
 * the global display mode. Replaces the older Risk Evolution chart.
 */
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { getEffectiveR } from '@/lib/r-multiple';

interface Props {
  T: TradingTheme;
  trades: Trade[];
  isRTL: boolean;
  tt: React.CSSProperties;
}

const DAY_KEYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_KEYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export const BestWorstWindowChart = ({ T, trades, isRTL, tt }: Props) => {
  const { isMoney, formatAxis, formatValue, unit } = useVisibleTrades(trades);

  const data = useMemo(() => {
    // Aggregate by day-of-week and hour-of-day.
    const dayAgg = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    const hourAgg = Array.from({ length: 24 }, () => ({ sum: 0, n: 0 }));
    for (const t of trades) {
      const raw = (t as any).exitTime || (t as any).date || (t as any).timestamp;
      if (!raw) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;
      const val = isMoney
        ? (Number.isFinite(t.pnl) ? t.pnl : 0)
        : (Number.isFinite(getEffectiveR(t as any)) ? (getEffectiveR(t as any) as number) : 0);
      dayAgg[d.getDay()].sum += val;
      dayAgg[d.getDay()].n += 1;
      hourAgg[d.getHours()].sum += val;
      hourAgg[d.getHours()].n += 1;
    }
    const dayLabels = isRTL ? DAY_KEYS_HE : DAY_KEYS_EN;
    const days = dayAgg
      .map((a, i) => ({ name: dayLabels[i], value: a.sum, n: a.n }))
      .filter(d => d.n > 0);
    const hours = hourAgg
      .map((a, i) => ({ name: `${String(i).padStart(2, '0')}:00`, value: a.sum, n: a.n }))
      .filter(h => h.n > 0);

    const bestDay = days.length ? days.reduce((a, b) => (b.value > a.value ? b : a)) : null;
    const worstDay = days.length ? days.reduce((a, b) => (b.value < a.value ? b : a)) : null;
    const bestHour = hours.length ? hours.reduce((a, b) => (b.value > a.value ? b : a)) : null;
    const worstHour = hours.length ? hours.reduce((a, b) => (b.value < a.value ? b : a)) : null;

    return { days, hours, bestDay, worstDay, bestHour, worstHour };
  }, [trades, isMoney, isRTL]);

  const empty = data.days.length === 0 && data.hours.length === 0;

  if (empty) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.muted, fontSize: 12 }}>
        {isRTL ? 'אין מספיק נתונים להצגה' : 'Not enough data'}
      </div>
    );
  }

  const renderBars = (rows: { name: string; value: number }[]) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
        <XAxis dataKey="name" tick={{ fill: T.text.muted, fontSize: 10 }} />
        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={42} tickFormatter={formatAxis} />
        <Tooltip
          contentStyle={tt}
          formatter={(v: any) => [formatValue(Number(v)), unit === '$' ? (isRTL ? 'דולר' : 'USD') : 'R']}
        />
        <ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.value >= 0 ? T.accent.green : T.accent.red} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const Highlight = ({ label, win, val }: { label: string; win: string | undefined; val: number | undefined }) => (
    <div style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: `${T.bg.surface}80`, border: `1px solid ${T.border.subtle}` }}>
      <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text.primary }}>{win ?? '—'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: (val ?? 0) >= 0 ? T.accent.green : T.accent.red }}>
          {val !== undefined ? formatValue(val) : '—'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="bw-window-root" style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <div className="bw-window-highlights" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
        <Highlight label={isRTL ? 'יום הכי טוב' : 'Best day'} win={data.bestDay?.name} val={data.bestDay?.value} />
        <Highlight label={isRTL ? 'יום הכי גרוע' : 'Worst day'} win={data.worstDay?.name} val={data.worstDay?.value} />
        <Highlight label={isRTL ? 'שעה הכי טובה' : 'Best hour'} win={data.bestHour?.name} val={data.bestHour?.value} />
        <Highlight label={isRTL ? 'שעה הכי גרועה' : 'Worst hour'} win={data.worstHour?.name} val={data.worstHour?.value} />
      </div>
      <div className="bw-window-charts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
        <div className="bw-window-chart-cell">
          <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            {isRTL ? 'לפי יום' : 'By day'}
          </div>
          <div style={{ height: 150, width: '100%' }}>{renderBars(data.days)}</div>
        </div>
        <div className="bw-window-chart-cell">
          <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            {isRTL ? 'לפי שעה' : 'By hour'}
          </div>
          <div style={{ height: 150, width: '100%' }}>{renderBars(data.hours)}</div>
        </div>
      </div>
    </div>
  );
};
