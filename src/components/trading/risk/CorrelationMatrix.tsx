import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { buildCorrelationMatrix, effectiveIndependentBets } from '@/lib/risk/correlation';

interface Props { T: TradingTheme; isRTL: boolean; trades: Trade[]; }

export const CorrelationMatrix = ({ T, isRTL, trades: all }: Props) => {
  const { visibleTrades, isMoney } = useVisibleTrades(all);

  const matrix = useMemo(
    () => buildCorrelationMatrix(visibleTrades, { mode: isMoney ? 'money' : 'r' }),
    [visibleTrades, isMoney],
  );
  const nEff = useMemo(() => effectiveIndependentBets(matrix), [matrix]);

  if (matrix.symbols.length < 2) {
    return (
      <div style={{
        background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 10,
        padding: 14, fontSize: 11, color: T.text.muted, textAlign: 'center',
      }}>
        {isRTL ? 'דרושים לפחות 2 נכסים עם 3+ עסקאות כל אחד למטריצת מתאם.' : 'Need at least 2 symbols with 3+ trades each for a correlation matrix.'}
      </div>
    );
  }

  const n = matrix.symbols.length;
  // Header column shows symbol labels; remaining N cells split equally.
  const gridCols = `minmax(72px, auto) repeat(${n}, minmax(40px, 1fr))`;

  return (
    <div style={{
      background: T.bg.card,
      border: `1px solid ${T.border.subtle}`,
      borderRadius: 10,
      padding: 14,
      width: '100%',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{
          fontSize: 10, color: T.text.muted, textTransform: 'uppercase',
          letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isRTL ? 'מטריצת מתאם בין נכסים' : 'Cross-Asset Correlation'}
        </div>
        <div style={{
          fontSize: 10, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isRTL ? `הימורים בלתי-תלויים ≈ ${nEff.toFixed(1)}` : `effective bets ≈ ${nEff.toFixed(1)}`}
        </div>
      </div>

      {/* Responsive CSS-grid matrix — stretches to fill its container, no awkward side-gap. */}
      <div style={{ width: '100%', overflowX: 'auto', direction: 'ltr' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: 3,
          minWidth: Math.max(360, n * 56 + 90),
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {/* Column header row */}
          <div />
          {matrix.symbols.map(s => (
            <div key={`h-${s}`} style={{
              fontSize: 9, color: T.text.muted, fontWeight: 600,
              textAlign: 'center', padding: '4px 2px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }} title={s}>{s.replace('/USDT', '')}</div>
          ))}

          {/* Body rows */}
          {matrix.symbols.map((row, i) => (
            <>
              <div key={`r-${row}`} style={{
                fontSize: 10, color: T.text.secondary, padding: '0 8px',
                textAlign: 'right', fontWeight: 600, alignSelf: 'center',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }} title={row}>{row.replace('/USDT', '')}</div>
              {matrix.symbols.map((_, j) => {
                const v = matrix.values[i][j];
                const abs = Math.abs(v);
                const color = i === j
                  ? T.border.medium
                  : abs >= 0.7 ? T.accent.red
                    : abs >= 0.4 ? T.accent.orange
                      : T.accent.green;
                return (
                  <div key={`${i}-${j}`} title={`${matrix.symbols[i]} ↔ ${matrix.symbols[j]} = ${v.toFixed(2)}`}
                    style={{
                      aspectRatio: '1.4 / 1',
                      minHeight: 32,
                      background: `${color}${abs < 0.4 ? '22' : abs < 0.7 ? '55' : '88'}`,
                      border: `1px solid ${color}55`,
                      borderRadius: 4,
                      color: T.text.primary,
                      fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    {v.toFixed(2)}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 12, marginTop: 10, fontSize: 9, color: T.text.muted,
        fontFamily: "'JetBrains Mono', monospace", flexWrap: 'wrap',
      }}>
        <Legend color={T.accent.green} label={isRTL ? '<0.4 עצמאי' : '<0.4 independent'} />
        <Legend color={T.accent.orange} label={isRTL ? '0.4–0.7 בינוני' : '0.4–0.7 moderate'} />
        <Legend color={T.accent.red} label={isRTL ? '>0.7 כפילות' : '>0.7 redundant'} />
      </div>
    </div>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
    <span>{label}</span>
  </div>
);
