/**
 * PnLDistributionHistogram — Frequency histogram of trade outcomes binned
 * by P&L ($ mode) or R-Multiple (R mode), with a smoothed moving-average
 * overlay. Includes two scaling controls so a tall -1R column never crushes
 * the rest of the distribution:
 *   • Log toggle — switches the Y-axis to log scale.
 *   • "Hide losers" / Focus on profits — drops the bin that contains the
 *     dominant loss (-1R in R mode, or the largest negative bin in $ mode).
 */
import { useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { getEffectiveR } from '@/lib/r-multiple';
import { hasStrictR } from '@/lib/display-mode-format';

interface Props {
  T: TradingTheme;
  trades: Trade[];
  isMoney: boolean;
  isRTL: boolean;
  tt: React.CSSProperties;
}

export const PnLDistributionHistogram = ({ T, trades, isMoney, isRTL, tt }: Props) => {
  const [logScale, setLogScale] = useState(false);
  const [focusProfits, setFocusProfits] = useState(false);

  const { distDataMA, hasLossBin } = useMemo(() => {
    const values = trades
      .map((tr) => isMoney
        ? (Number.isFinite(tr.pnl) ? Number(tr.pnl) : null)
        : (hasStrictR(tr) ? getEffectiveR(tr) : null))
      .filter((v): v is number => v !== null && Number.isFinite(v as number));

    let binWidth = 1;
    if (values.length > 0) {
      if (isMoney) {
        const absMax = Math.max(...values.map((v) => Math.abs(v)));
        const raw = absMax / 8 || 1;
        const pow = Math.pow(10, Math.floor(Math.log10(raw)));
        const norm = raw / pow;
        const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
        binWidth = nice * pow;
      } else {
        binWidth = 1;
      }
    }

    const bins = new Map<number, { idx: number; count: number; low: number; high: number }>();
    for (const v of values) {
      const idx = Math.floor(v / binWidth);
      const low = idx * binWidth;
      const high = low + binWidth;
      const cur = bins.get(idx);
      if (cur) cur.count += 1;
      else bins.set(idx, { idx, count: 1, low, high });
    }
    const sorted = Array.from(bins.values()).sort((a, b) => a.idx - b.idx);
    if (sorted.length === 0) return { distDataMA: [], hasLossBin: false };

    const fmt = (x: number) => isMoney
      ? `$${Math.round(x)}`
      : `${x >= 0 ? '+' : ''}${x.toFixed(binWidth < 1 ? 1 : 0)}R`;

    const minIdx = sorted[0].idx;
    const maxIdx = sorted[sorted.length - 1].idx;
    const full: { label: string; count: number; mid: number; low: number; high: number }[] = [];
    for (let i = minIdx; i <= maxIdx; i++) {
      const low = i * binWidth;
      const high = low + binWidth;
      const found = bins.get(i);
      full.push({
        label: `${fmt(low)} → ${fmt(high)}`,
        count: found?.count || 0,
        mid: (low + high) / 2,
        low,
        high,
      });
    }

    // Identify the dominant-loss bin: the negative bin with the highest count.
    const negativeBins = full.filter((b) => b.high <= 0 && b.count > 0);
    const dominantLoss = negativeBins.length
      ? negativeBins.reduce((a, b) => (b.count > a.count ? b : a))
      : null;
    const hasLossBin = !!dominantLoss;

    let filtered = full;
    if (focusProfits && dominantLoss) {
      filtered = full.filter((b) => b.mid !== dominantLoss.mid);
    }

    const withMA = filtered.map((d, i, arr) => {
      let s = 0, n = 0;
      for (let k = Math.max(0, i - 1); k <= Math.min(arr.length - 1, i + 1); k++) {
        s += arr[k].count;
        n += 1;
      }
      return { ...d, ma: n > 0 ? s / n : 0 };
    });

    return { distDataMA: withMA, hasLossBin };
  }, [trades, isMoney, focusProfits]);

  if (distDataMA.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.text.muted, fontSize: 12 }}>
        {isRTL ? 'אין נתונים במצב הנבחר' : 'No data in selected mode'}
      </div>
    );
  }

  const maxCount = Math.max(...distDataMA.map((d) => d.count), 1);
  // Log scale: pad domain to next power of 10. Use [0.9, ...] so count=1 still renders.
  const logDomain: [number, number] = [0.9, Math.max(10, Math.pow(10, Math.ceil(Math.log10(maxCount + 1))))];
  const linearDomain: [number, number] = [0, maxCount];

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '3px 8px',
    fontSize: 10,
    borderRadius: 6,
    border: `1px solid ${active ? T.accent.blue || '#60a5fa' : T.border.subtle}`,
    background: active ? `${T.accent.blue || '#60a5fa'}22` : 'transparent',
    color: active ? (T.accent.blue || '#60a5fa') : T.text.muted,
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  });

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setLogScale((v) => !v)} style={btnStyle(logScale)}>
          {isRTL ? 'סקלה לוגריתמית' : 'Log scale'}
        </button>
        <button
          type="button"
          onClick={() => setFocusProfits((v) => !v)}
          disabled={!hasLossBin}
          style={{ ...btnStyle(focusProfits), opacity: hasLossBin ? 1 : 0.4, cursor: hasLossBin ? 'pointer' : 'not-allowed' }}
          title={isRTL ? 'הסתר את עמודת ההפסד הדומיננטית' : 'Hide the dominant loss bin'}
        >
          {isRTL ? 'מיקוד ברווחים' : 'Focus on profits'}
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={distDataMA} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} barCategoryGap={1}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} vertical={false} />
            <XAxis
              dataKey="mid"
              type="number"
              domain={[distDataMA[0].low, distDataMA[distDataMA.length - 1].high]}
              tick={{ fill: T.text.muted, fontSize: 10 }}
              tickFormatter={(v: number) => isMoney ? `$${Math.round(v)}` : `${v >= 0 ? '+' : ''}${v.toFixed(0)}R`}
              axisLine={{ stroke: T.border.subtle }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: T.text.muted, fontSize: 10 }}
              width={36}
              scale={logScale ? 'log' : 'linear'}
              domain={logScale ? logDomain : linearDomain}
              allowDataOverflow={logScale}
              tickFormatter={(v: number) => `${Math.round(v)}`}
            />
            <Tooltip
              contentStyle={tt}
              formatter={(v: any, name: any) => {
                if (name === 'ma') return [Number(v).toFixed(1), isRTL ? 'ממוצע נע' : 'Moving avg'];
                return [`${v} ${Number(v) === 1 ? (isRTL ? 'עסקה' : 'trade') : (isRTL ? 'עסקאות' : 'trades')}`, isRTL ? 'תדירות' : 'Frequency'];
              }}
              labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.label ?? ''}
            />
            <ReferenceLine x={0} stroke={T.border.medium} strokeDasharray="2 2" />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} stroke={T.border.medium} strokeWidth={1}>
              {distDataMA.map((d, i: number) => (
                <Cell key={i} fill={d.mid >= 0 ? T.accent.green : T.accent.red} fillOpacity={d.count === 0 ? 0.12 : 0.75} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="ma"
              stroke={T.accent.blue || '#60a5fa'}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
