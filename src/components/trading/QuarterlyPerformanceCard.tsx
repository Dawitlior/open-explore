/**
 * QuarterlyPerformanceCard — advanced multi-view of quarterly P&L across years.
 * Replaces the "Monthly Performance (R)" chart at its original position in the
 * dashboard Alpha grid. Contains:
 *   • A donut / pie chart of the total R distribution per quarter (Q1..Q4)
 *     aggregated across all years — the strongest quarter is emphasized.
 *   • A compact list of mini-bars per quarter, with wins/losses and expectancy.
 *   • A quick "best quarter" callout header.
 *
 * Purely presentational. No fake data — computes strictly from `trades`.
 */

import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { getEffectiveR } from '@/lib/r-multiple';
import { parseTradeDate } from '@/components/weekly-review/lib/week-key';
import { useDisplayMode } from '@/lib/display-mode';

interface Props {
  T: TradingTheme;
  trades: Trade[];
  isRTL: boolean;
}

type QKey = 1 | 2 | 3 | 4;
interface QBucket {
  q: QKey;
  n: number;
  wins: number;
  losses: number;
  totalR: number;
  totalPnl: number;
}

const QLABELS = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' } as const;

function polarToCartesian(cx: number, cy: number, r: number, angle: number): [number, number] {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function arcPath(cx: number, cy: number, r: number, start: number, end: number, innerR: number): string {
  if (Math.abs(end - start) < 0.01) return '';
  const [x0, y0] = polarToCartesian(cx, cy, r, end);
  const [x1, y1] = polarToCartesian(cx, cy, r, start);
  const [x2, y2] = polarToCartesian(cx, cy, innerR, start);
  const [x3, y3] = polarToCartesian(cx, cy, innerR, end);
  const large = end - start > 180 ? 1 : 0;
  return `M${x0},${y0} A${r},${r} 0 ${large} 0 ${x1},${y1} L${x2},${y2} A${innerR},${innerR} 0 ${large} 1 ${x3},${y3} Z`;
}

export function QuarterlyPerformanceCard({ T, trades, isRTL }: Props) {
  const { displayMode } = useDisplayMode();
  const isMoney = displayMode === 'MONEY';

  const { buckets, yearsRange, bestQ, hasData } = useMemo(() => {
    const map = new Map<QKey, QBucket>();
    ([1, 2, 3, 4] as QKey[]).forEach(q => map.set(q, { q, n: 0, wins: 0, losses: 0, totalR: 0, totalPnl: 0 }));
    let minY = Infinity, maxY = -Infinity;
    for (const tr of trades) {
      const d = parseTradeDate(tr.date);
      if (!d) continue;
      const q = (Math.floor(d.getMonth() / 3) + 1) as QKey;
      const b = map.get(q)!;
      // Non-strict: falls back to a proxy R when explicit R is missing.
      // This mirrors the money-mode behaviour and prevents an empty card
      // for R-only imports without stop/target metadata.
      const r = getEffectiveR(tr, { strict: false });
      const pnl = Number(tr.pnl) || 0;
      b.n += 1;
      b.totalPnl += pnl;
      if (r != null && Number.isFinite(r)) b.totalR += r;
      if (pnl > 0) b.wins += 1;
      else if (pnl < 0) b.losses += 1;
      const y = d.getFullYear();
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const buckets = Array.from(map.values()).sort((a, b) => a.q - b.q);
    // Rank by the metric we're currently displaying so "strongest quarter"
    // always matches the value shown in the callout.
    const rankMetric = (b: QBucket) => (isMoney ? b.totalPnl : b.totalR);
    const bestQ = buckets.reduce((best, cur) => (rankMetric(cur) > rankMetric(best) ? cur : best), buckets[0]);
    const yearsRange = minY === Infinity ? '' : (minY === maxY ? `${minY}` : `${minY} – ${maxY}`);
    const hasData = buckets.some(b => b.n > 0);
    return { buckets, yearsRange, bestQ, hasData };
  }, [trades, isMoney]);

  const fmtMoney = (v: number) => `${v >= 0 ? '+' : ''}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: v >= 1000 || v <= -1000 ? 0 : 2 })}`;
  const fmtR = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
  const fmtVal = (b: QBucket) => (isMoney ? fmtMoney(b.totalPnl) : fmtR(b.totalR));
  const valueOf = (b: QBucket) => (isMoney ? b.totalPnl : b.totalR);


  const QCOLORS: Record<QKey, string> = { 1: T.accent.cyan, 2: T.accent.green, 3: T.accent.purple, 4: T.accent.orange };

  // Donut math — proportional to |value| in the active display mode, so a
  // dominant quarter in either $ or R is always visible.
  const absTotals = buckets.map(b => Math.abs(valueOf(b)));
  const grandAbs = absTotals.reduce((s, v) => s + v, 0) || 1;
  const cx = 62, cy = 62, R = 58, IR = 34;
  let cursor = 0;
  const slices = buckets.map((b, i) => {
    const share = (absTotals[i] / grandAbs) * 360;
    const start = cursor;
    const end = cursor + share;
    cursor = end;
    return { b, start, end, share };
  });

  const maxAbs = Math.max(isMoney ? 0.01 : 1, ...buckets.map(b => Math.abs(valueOf(b))));
  const t = (he: string, en: string) => (isRTL ? he : en);
  const grandTotal = buckets.reduce((s, b) => s + valueOf(b), 0);

  if (!hasData) {
    return (
      <div style={{ padding: '18px 4px', textAlign: 'center', color: T.text.muted, fontSize: 12 }}>
        {t('אין עדיין נתונים לפי רבעון.', 'No quarterly data yet.')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Best-quarter callout */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '8px 10px', borderRadius: 10,
        background: `linear-gradient(90deg, ${QCOLORS[bestQ.q]}18, transparent)`,
        border: `1px solid ${QCOLORS[bestQ.q]}40`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            width: 26, height: 26, borderRadius: 7, background: `${QCOLORS[bestQ.q]}22`,
            border: `1px solid ${QCOLORS[bestQ.q]}55`, color: QCOLORS[bestQ.q],
            display: 'grid', placeItems: 'center', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 800,
          }}>{QLABELS[bestQ.q]}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.text.muted, letterSpacing: 0.4 }}>
              {t('הרבעון החזק ביותר', 'Strongest quarter')} {yearsRange && `· ${yearsRange}`}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>
              {QLABELS[bestQ.q]} · {t(`${bestQ.wins} ניצחונות`, `${bestQ.wins} wins`)}
            </div>
          </div>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800,
          color: valueOf(bestQ) >= 0 ? T.accent.green : T.accent.red,
        }}>
          {fmtVal(bestQ)}
        </div>
      </div>

      {/* Donut + legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '124px 1fr', gap: 14, alignItems: 'center' }}>
        <svg viewBox="0 0 124 124" width={124} height={124} style={{ display: 'block' }}>
          {slices.map(({ b, start, end }) => {
            const path = arcPath(cx, cy, R, start, end, IR);
            if (!path) return null;
            return (
              <path
                key={b.q}
                d={path}
                fill={QCOLORS[b.q]}
                opacity={b.q === bestQ.q ? 0.95 : 0.55}
                stroke={T.bg.card}
                strokeWidth={1.2}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={IR - 2} fill={T.bg.card} />
          <text x={cx} y={cy - 4} textAnchor="middle" fill={T.text.muted} fontSize={8}
            style={{ letterSpacing: 1.4, fontFamily: "'JetBrains Mono', monospace" }}>
            {isMoney ? t('סה״כ $', 'TOTAL $') : t('סה״כ R', 'TOTAL R')}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle"
            fill={grandTotal >= 0 ? T.accent.green : T.accent.red}
            fontSize={isMoney ? 12 : 14} fontWeight={800} fontFamily="'JetBrains Mono', monospace">
            {isMoney
              ? `${grandTotal >= 0 ? '+' : ''}${Math.round(grandTotal).toLocaleString()}`
              : `${grandTotal >= 0 ? '+' : ''}${grandTotal.toFixed(1)}`}
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {buckets.map(b => {
            const col = QCOLORS[b.q];
            const v = valueOf(b);
            const barPct = Math.min(100, (Math.abs(v) / maxAbs) * 100);
            return (
              <div key={b.q} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 26, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 800, color: col,
                }}>{QLABELS[b.q]}</span>
                <div style={{ flex: 1, height: 8, background: T.bg.tertiary, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${barPct}%`, height: '100%',
                    background: v >= 0 ? `linear-gradient(90deg, ${col}bb, ${col})` : `linear-gradient(90deg, ${T.accent.red}bb, ${T.accent.red})`,
                    transition: 'width .4s ease',
                  }} />
                </div>
                <span style={{
                  minWidth: 64, textAlign: 'end', fontSize: 10.5, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: v >= 0 ? T.accent.green : T.accent.red,
                }}>
                  {fmtVal(b)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini stats matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
        {buckets.map(b => {
          const col = QCOLORS[b.q];
          const wr = b.n > 0 ? (b.wins / b.n) * 100 : 0;
          const exp = b.n > 0 ? b.totalR / b.n : 0;
          const expM = b.n > 0 ? b.totalPnl / b.n : 0;
          return (
            <div key={b.q} style={{
              padding: '8px 8px 9px', borderRadius: 8,
              background: T.bg.tertiary, border: `1px solid ${b.q === bestQ.q ? col + '66' : T.border.subtle}`,
              display: 'flex', flexDirection: 'column', gap: 3,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: col, fontFamily: "'JetBrains Mono', monospace" }}>{QLABELS[b.q]}</span>
                <span style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{b.n}</span>
              </div>
              <div style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: T.text.primary }}>
                {wr.toFixed(0)}% <span style={{ color: T.text.muted, fontSize: 9 }}>WR</span>
              </div>
              <div style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: (isMoney ? expM : exp) >= 0 ? T.accent.green : T.accent.red }}>
                {isMoney
                  ? `${expM >= 0 ? '+' : ''}$${Math.abs(expM).toFixed(expM >= 100 || expM <= -100 ? 0 : 2)}`
                  : `${exp >= 0 ? '+' : ''}${exp.toFixed(2)}R`}
                <span style={{ color: T.text.muted, fontSize: 9 }}>/tr</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

}

export default QuarterlyPerformanceCard;
