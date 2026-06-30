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

  const renderBars = (
    rows: { name: string; value: number }[],
    xKind: 'day' | 'hour',
    bestName?: string,
    worstName?: string,
    forceAllLabels = false,
  ) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
        <XAxis
          dataKey="name"
          tick={{ fill: T.text.muted, fontSize: 10 }}
          // Days = always show 7 labels. Hours = let recharts pick spaced ticks
          // with a generous gap so they never overlap on desktop or mobile.
          // When `forceAllLabels` (mobile scrollable view), show every label.
          interval={forceAllLabels || xKind === 'day' ? 0 : 'preserveStartEnd'}
          minTickGap={forceAllLabels ? 0 : (xKind === 'hour' ? 24 : 4)}
          height={24}
          tickMargin={6}
        />
        <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={42} tickFormatter={formatAxis} />
        <Tooltip
          contentStyle={tt}
          formatter={(v: any) => [formatValue(Number(v)), unit === '$' ? (isRTL ? 'דולר' : 'USD') : 'R']}
        />
        <ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {rows.map((r, i) => {
            const isBest = r.name === bestName;
            const isWorst = r.name === worstName;
            const fill = r.value >= 0 ? T.accent.green : T.accent.red;
            const finalFill = isWorst ? T.accent.red : isBest ? T.accent.green : fill;
            const opacity = isBest || isWorst ? 1 : 0.55;
            const stroke = isBest ? T.accent.green : isWorst ? T.accent.red : 'transparent';
            return (
              <Cell
                key={i}
                fill={finalFill}
                fillOpacity={opacity}
                stroke={stroke}
                strokeWidth={isBest || isWorst ? 2 : 0}
              />
            );
          })}
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

  /**
   * Chart cell: on desktop renders fluid 100% width; on mobile renders inside
   * a horizontal scroll container with a min-width large enough to show every
   * X-axis label clearly (~44px per bar). Two stacked variants (desktop +
   * mobile) avoid trying to detect viewport in JS — CSS toggles visibility.
   */
  const ChartCell = ({
    label,
    rows,
    xKind,
    bestName,
    worstName,
  }: {
    label: string;
    rows: { name: string; value: number }[];
    xKind: 'day' | 'hour';
    bestName?: string;
    worstName?: string;
  }) => {
    const mobileMinWidth = Math.max(320, rows.length * (xKind === 'hour' ? 44 : 56));
    return (
      <div className="bw-window-chart-cell">
        <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
          {label}
        </div>
        {/* Desktop / tablet */}
        <div className="bw-window-chart-canvas bw-window-desktop" style={{ height: 180, width: '100%' }}>
          {renderBars(rows, xKind, bestName, worstName, false)}
        </div>
        {/* Mobile: horizontally scrollable with every label visible */}
        <div className="bw-window-mobile" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ height: 200, width: mobileMinWidth, minWidth: '100%' }}>
            {renderBars(rows, xKind, bestName, worstName, true)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bw-window-root" style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <style>{`
        .bw-window-mobile { display: none; }
        .bw-window-desktop { display: block; }
        @media (max-width: 640px) {
          .bw-window-chart-cell { min-height: 220px; }
          .bw-window-desktop { display: none !important; }
          .bw-window-mobile { display: block !important; }
        }
      `}</style>
      <div className="bw-window-highlights" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
        <Highlight label={isRTL ? 'יום הכי טוב' : 'Best day'} win={data.bestDay?.name} val={data.bestDay?.value} />
        <Highlight label={isRTL ? 'יום הכי גרוע' : 'Worst day'} win={data.worstDay?.name} val={data.worstDay?.value} />
        <Highlight label={isRTL ? 'שעה הכי טובה' : 'Best hour'} win={data.bestHour?.name} val={data.bestHour?.value} />
        <Highlight label={isRTL ? 'שעה הכי גרועה' : 'Worst hour'} win={data.worstHour?.name} val={data.worstHour?.value} />
      </div>
      <div className="bw-window-charts" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
        <ChartCell label={isRTL ? 'לפי יום' : 'By day'} rows={data.days} xKind="day" bestName={data.bestDay?.name} worstName={data.worstDay?.name} />
        <ChartCell label={isRTL ? 'לפי שעה' : 'By hour'} rows={data.hours} xKind="hour" bestName={data.bestHour?.name} worstName={data.worstHour?.name} />
      </div>
    </div>
  );
};


