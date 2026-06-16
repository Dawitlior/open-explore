import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { getEffectiveR } from '@/lib/r-multiple';
import {
  computeSharpe, computeSortino, computeOmega, computeMaxDrawdownAbs,
  dailySeries, formatRatio,
} from '@/lib/risk/quality-metrics';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
}

/**
 * Ultimate-tier "Risk-Adjusted Performance" block.
 * Sharpe · Sortino · Omega · Max Drawdown — fully responsive, follows R / $ mode.
 */
export const RiskAdjustedRatiosSection = ({ T, isRTL, trades: all }: Props) => {
  const { visibleTrades, isMoney } = useVisibleTrades(all);

  const { sharpe, sortino, omega, maxDD, sampleDays } = useMemo(() => {
    const series = dailySeries(
      visibleTrades,
      (t) => (isMoney ? (t.pnl || 0) : getEffectiveR(t)),
    );
    return {
      sharpe: computeSharpe(series),
      sortino: computeSortino(series),
      omega: computeOmega(series, 0),
      maxDD: computeMaxDrawdownAbs(series),
      sampleDays: series.length,
    };
  }, [visibleTrades, isMoney]);

  const unit = isMoney ? '$' : 'R';
  const ddText = isMoney
    ? `-$${maxDD.toFixed(2)}`
    : `${(-maxDD).toFixed(2)}R`;

  const tiles: Array<{
    label: string;
    value: string;
    color: string;
    sub: string;
    long: string;
  }> = [
    {
      label: 'Sharpe',
      value: formatRatio(sharpe),
      color: ratioColor(sharpe, T, [0.5, 1, 2]),
      sub: isRTL ? 'תשואה מותאמת תנודתיות' : 'Volatility-adjusted return',
      long: isRTL
        ? 'מעל 1 = איכותי · מעל 2 = מצוין'
        : '>1 good · >2 excellent',
    },
    {
      label: 'Sortino',
      value: formatRatio(sortino),
      color: ratioColor(sortino, T, [0.7, 1.5, 3]),
      sub: isRTL ? 'מותאם לסיכון השלילי בלבד' : 'Downside-only risk',
      long: isRTL
        ? 'גבוה מ-Sharpe = אסימטריה חיובית'
        : 'Above Sharpe → positive skew',
    },
    {
      label: 'Omega',
      value: omega === Infinity ? '∞' : formatRatio(omega),
      color: ratioColor(omega === Infinity ? 99 : omega, T, [1, 1.5, 2.5]),
      sub: isRTL ? 'יחס רווחים/הפסדים מצטבר' : 'Total gain / total loss',
      long: isRTL ? 'מעל 1 = רווחי' : '>1 = profitable',
    },
    {
      label: isRTL ? 'נסיגה מקס' : 'Max DD',
      value: ddText,
      color: maxDD <= 0 ? T.accent.green : T.accent.red,
      sub: isRTL ? `נסיגה גדולה ביותר ב-${unit}` : `Largest equity dip (${unit})`,
      long: isRTL ? 'מהשיא להלן' : 'Peak-to-trough',
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: `1px solid ${T.border.subtle}`,
      }}>
        <div style={{
          fontSize: 16, fontWeight: 600, color: T.text.primary,
          letterSpacing: '-0.01em',
        }}>
          {isRTL ? 'ביצועים מותאמי-סיכון' : 'Risk-Adjusted Performance'}
        </div>
        <div style={{ fontSize: 11, color: T.text.muted }}>
          {isRTL
            ? `מבוסס על ${sampleDays} ימי מסחר · ${isMoney ? 'דולר' : 'R-Multiple'}`
            : `${sampleDays} trading days · ${isMoney ? 'USD' : 'R-Multiple'}`}
        </div>
      </div>

      <div style={{
        display: 'grid', gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}>
        {tiles.map((m, i) => (
          <div key={i} style={{
            background: T.bg.card,
            border: `1px solid ${T.border.subtle}`,
            borderRadius: 12,
            padding: 14,
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.18s ease, border-color 0.18s ease',
          }}>
            <div style={{
              position: 'absolute', top: 0, insetInlineStart: 0,
              width: 3, height: '100%', background: m.color,
            }} />
            <div style={{
              fontSize: 10, color: T.text.muted, textTransform: 'uppercase',
              letterSpacing: '0.14em', marginBottom: 8,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{m.label}</div>
            <div style={{
              fontSize: 26, fontWeight: 700, color: m.color, lineHeight: 1,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{m.value}</div>
            <div style={{ fontSize: 11, color: T.text.secondary, marginTop: 8, lineHeight: 1.4 }}>
              {m.sub}
            </div>
            <div style={{
              fontSize: 9, color: T.text.muted, marginTop: 4,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
            }}>
              {m.long}
            </div>
          </div>
        ))}
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
