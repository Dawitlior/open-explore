import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { getEffectiveR } from '@/lib/r-multiple';
import {
  computeSharpe, computeSortino, computeCalmar, dailySeries, formatRatio,
} from '@/lib/risk/quality-metrics';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
  /** Existing MAR ratio from stats (drawdown-based). Optional. */
  marRatio?: number | null;
}

/** 4-tile strip: MAR · Sharpe · Sortino · Calmar. Works in both R and $ modes. */
export const QualityOfReturnsStrip = ({ T, isRTL, trades: all, marRatio }: Props) => {
  const { visibleTrades, isMoney } = useVisibleTrades(all);

  const { sharpe, sortino, calmar, sampleDays } = useMemo(() => {
    const series = dailySeries(
      visibleTrades,
      (t) => (isMoney ? (t.pnl || 0) : getEffectiveR(t)),
    );
    return {
      sharpe: computeSharpe(series),
      sortino: computeSortino(series),
      calmar: computeCalmar(series),
      sampleDays: series.length,
    };
  }, [visibleTrades, isMoney]);

  const tiles: Array<{ label: string; value: string; color: string; sub: string }> = [
    {
      label: 'MAR',
      value: marRatio != null && Number.isFinite(marRatio) ? marRatio.toFixed(2) : 'N/A',
      color: T.accent.blue,
      sub: isRTL ? 'תשואה / נסיגה' : 'Return / Drawdown',
    },
    {
      label: 'Sharpe',
      value: formatRatio(sharpe),
      color: ratioColor(sharpe, T, [0.5, 1, 2]),
      sub: isRTL ? 'תשואה מותאמת תנודתיות' : 'Volatility-adjusted',
    },
    {
      label: 'Sortino',
      value: formatRatio(sortino),
      color: ratioColor(sortino, T, [0.7, 1.5, 3]),
      sub: isRTL ? 'מתואם להפסדים בלבד' : 'Downside-adjusted',
    },
    {
      label: 'Calmar',
      value: formatRatio(calmar),
      color: ratioColor(calmar, T, [0.5, 1, 3]),
      sub: isRTL ? 'תשואה שנתית / DD' : 'Annual / Max DD',
    },
  ];

  return (
    <div>
      <div style={{
        display: 'grid', gap: 8,
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      }}>
        {tiles.map((m, i) => (
          <div key={i} style={{
            background: T.bg.card,
            border: `1px solid ${T.border.subtle}`,
            borderRadius: 10,
            padding: 12,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, insetInlineStart: 0,
              width: 3, height: '100%', background: m.color,
            }} />
            <div style={{
              fontSize: 9, color: T.text.muted, textTransform: 'uppercase',
              letterSpacing: '0.14em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace",
            }}>{m.label}</div>
            <div style={{
              fontSize: 22, fontWeight: 700, color: m.color, lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{m.value}</div>
            <div style={{ fontSize: 9, color: T.text.muted, marginTop: 4 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{
        fontSize: 9, color: T.text.muted, marginTop: 6,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
      }}>
        {isRTL
          ? `מבוסס על ${sampleDays} ימי מסחר · ${isMoney ? 'דולר' : 'R-Multiple'} · שנתי ×√252`
          : `${sampleDays} trading days · ${isMoney ? 'USD' : 'R-Multiple'} series · annualized ×√252`}
      </div>
    </div>
  );
};

function ratioColor(v: number | null, T: TradingTheme, [bad, ok, great]: number[]): string {
  if (v == null || !Number.isFinite(v)) return T.text.muted;
  if (v >= great) return T.accent.green;
  if (v >= ok) return T.accent.cyan;
  if (v >= bad) return T.accent.orange;
  return T.accent.red;
}
