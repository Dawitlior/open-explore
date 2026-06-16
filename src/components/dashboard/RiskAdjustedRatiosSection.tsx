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
 * Expanding-window series — recomputes a metric from day 0 up to each point.
 * This is the *actual* lifetime ratio over time, not a sliding sample, so the
 * curve shown matches the headline number at the right edge.
 */
function expandingSeries(
  series: number[],
  minWindow: number,
  compute: (s: number[]) => number | null,
): Array<{ i: number; v: number }> {
  const out: Array<{ i: number; v: number }> = [];
  for (let i = minWindow; i <= series.length; i++) {
    const v = compute(series.slice(0, i));
    if (v !== null && Number.isFinite(v)) out.push({ i, v });
  }
  return out;
}

/** Inline SVG sparkline. Normalized to viewBox; falls back to flat line if too few points. */
const Sparkline = ({
  data, color, T, height = 48, fill = true, baseline = null,
}: {
  data: Array<{ v: number }>;
  color: string;
  T: TradingTheme;
  height?: number;
  fill?: boolean;
  baseline?: number | null;
}) => {
  if (data.length < 2) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace",
        background: `${T.bg.tertiary}40`, borderRadius: 6, marginTop: 10,
      }}>
        {data.length === 0 ? 'No history' : 'Building history…'}
      </div>
    );
  }
  const W = 200;
  const H = height;
  const vals = data.map(d => d.v);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (baseline !== null) {
    min = Math.min(min, baseline);
    max = Math.max(max, baseline);
  }
  if (min === max) { min -= 1; max += 1; }
  const pad = 4;
  const x = (i: number) => (i / (data.length - 1)) * (W - pad * 2) + pad;
  const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const pts = data.map((d, i) => `${x(i).toFixed(2)},${y(d.v).toFixed(2)}`).join(' ');
  const areaPath = `M ${pad},${H} L ${data.map((d, i) => `${x(i).toFixed(2)},${y(d.v).toFixed(2)}`).join(' L ')} L ${(W - pad).toFixed(2)},${H} Z`;
  const gradId = `sg-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  const baselineY = baseline !== null ? y(baseline) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', marginTop: 10 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {baselineY !== null && (
        <line x1={pad} x2={W - pad} y1={baselineY} y2={baselineY}
          stroke={T.text.muted} strokeWidth="0.7" strokeDasharray="2 3" opacity="0.5" />
      )}
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(data.length - 1)} cy={y(vals[vals.length - 1])} r="2.4" fill={color} />
    </svg>
  );
};

/**
 * Ultimate-tier "Risk-Adjusted Performance" block.
 * Sharpe · Sortino · Omega · Max Drawdown — each tile shows its rolling-history sparkline.
 */
export const RiskAdjustedRatiosSection = ({ T, isRTL, trades: all }: Props) => {
  const { visibleTrades, isMoney } = useVisibleTrades(all);

  const { sharpe, sortino, omega, maxDD, sampleDays, sharpeSpark, sortinoSpark, omegaSpark, ddSpark } = useMemo(() => {
    const series = dailySeries(
      visibleTrades,
      (t) => (isMoney ? (t.pnl || 0) : getEffectiveR(t)),
    );

    // Expanding-window evolution — the curve ends exactly on the headline value.
    const minW = Math.max(5, Math.min(10, Math.floor(series.length / 4) || 5));
    const sharpeSpark  = expandingSeries(series, minW, computeSharpe);
    const sortinoSpark = expandingSeries(series, minW, computeSortino);
    const omegaSpark   = expandingSeries(series, minW, (s) => computeOmega(s, 0))
      .filter(p => Number.isFinite(p.v)); // strip Infinity

    // Equity curve + running drawdown (always growing, never recovers in this view).
    let cum = 0, peak = 0;
    const ddSpark: Array<{ i: number; v: number }> = [];
    series.forEach((r, i) => {
      cum += r;
      if (cum > peak) peak = cum;
      ddSpark.push({ i, v: -(peak - cum) }); // negative dd value
    });

    return {
      sharpe: computeSharpe(series),
      sortino: computeSortino(series),
      omega: computeOmega(series, 0),
      maxDD: computeMaxDrawdownAbs(series),
      sampleDays: series.length,
      sharpeSpark, sortinoSpark, omegaSpark, ddSpark,
    };
  }, [visibleTrades, isMoney]);

  const unit = isMoney ? '$' : 'R';
  const ddText = isMoney ? `-$${maxDD.toFixed(2)}` : `${(-maxDD).toFixed(2)}R`;

  const tiles: Array<{
    label: string;
    value: string;
    color: string;
    sub: string;
    long: string;
    spark: Array<{ i: number; v: number }>;
    baseline: number | null;
    fillSpark: boolean;
  }> = [
    {
      label: 'Sharpe',
      value: formatRatio(sharpe),
      color: ratioColor(sharpe, T, [0.5, 1, 2]),
      sub: isRTL ? 'תשואה מותאמת תנודתיות' : 'Volatility-adjusted return',
      long: isRTL ? 'מעל 1 = איכותי · מעל 2 = מצוין' : '>1 good · >2 excellent',
      spark: sharpeSpark, baseline: 1, fillSpark: true,
    },
    {
      label: 'Sortino',
      value: formatRatio(sortino),
      color: ratioColor(sortino, T, [0.7, 1.5, 3]),
      sub: isRTL ? 'מותאם לסיכון השלילי בלבד' : 'Downside-only risk',
      long: isRTL ? 'גבוה מ-Sharpe = אסימטריה חיובית' : 'Above Sharpe → positive skew',
      spark: sortinoSpark, baseline: 1, fillSpark: true,
    },
    {
      label: 'Omega',
      value: omega === Infinity ? '∞' : formatRatio(omega),
      color: ratioColor(omega === Infinity ? 99 : omega, T, [1, 1.5, 2.5]),
      sub: isRTL ? 'יחס רווחים/הפסדים מצטבר' : 'Total gain / total loss',
      long: isRTL ? 'מעל 1 = רווחי' : '>1 = profitable',
      spark: omegaSpark, baseline: 1, fillSpark: true,
    },
    {
      label: isRTL ? 'נסיגה מקס' : 'Max DD',
      value: ddText,
      color: T.accent.red,
      sub: isRTL ? `נסיגה גדולה ביותר ב-${unit}` : `Largest equity dip (${unit})`,
      long: isRTL ? 'מהשיא להלן' : 'Peak-to-trough',
      spark: ddSpark, baseline: 0, fillSpark: true,
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
        marginBottom: 12, paddingBottom: 10,
        borderBottom: `1px solid ${T.border.subtle}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.text.primary, letterSpacing: '-0.01em' }}>
          {isRTL ? 'ביצועים מותאמי-סיכון' : 'Risk-Adjusted Performance'}
        </div>
        <div style={{ fontSize: 11, color: T.text.muted }}>
          {isRTL
            ? `מבוסס על ${sampleDays} ימי מסחר · ${isMoney ? 'דולר' : 'R-Multiple'} · גרפים מתגלגלים`
            : `${sampleDays} trading days · ${isMoney ? 'USD' : 'R-Multiple'} · rolling sparklines`}
        </div>
      </div>

      <div style={{
        display: 'grid', gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}>
        {tiles.map((m, i) => {
          const first = m.spark[0]?.v;
          const last = m.spark[m.spark.length - 1]?.v;
          const delta = (first != null && last != null) ? (last - first) : null;
          const deltaColor = delta == null ? T.text.muted : delta >= 0 ? T.accent.green : T.accent.red;
          const deltaArrow = delta == null ? '·' : delta >= 0 ? '▲' : '▼';

          return (
            <div key={i} style={{
              background: T.bg.card,
              border: `1px solid ${T.border.subtle}`,
              borderRadius: 12,
              padding: 14,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, insetInlineStart: 0,
                width: 3, height: '100%', background: m.color,
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  fontSize: 10, color: T.text.muted, textTransform: 'uppercase',
                  letterSpacing: '0.14em', fontFamily: "'JetBrains Mono', monospace",
                }}>{m.label}</div>
                {delta != null && (
                  <div style={{
                    fontSize: 9, color: deltaColor, fontFamily: "'JetBrains Mono', monospace",
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <span>{deltaArrow}</span>
                    <span>{Math.abs(delta).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 24, fontWeight: 700, color: m.color, lineHeight: 1, marginTop: 8,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{m.value}</div>

              {/* Sparkline */}
              <Sparkline data={m.spark} color={m.color} T={T} baseline={m.baseline} fill={m.fillSpark} />

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
          );
        })}
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
