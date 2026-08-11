import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { pickInterval, resolveSymbol, type Interval } from '@/lib/market/symbol-resolver';
import { frameWindow, useTradeCandles } from '@/lib/market/use-trade-candles';
import { infoColor, neutralRamp } from '@/lib/semantic-color';

interface Props {
  T: TradingTheme;
  trade: Trade;
  isRTL: boolean;
  onOpen: () => void;
}

const MONO = "'JetBrains Mono', monospace";

/**
 * Compact price preview for the Overview tab — a lightweight SVG sparkline of
 * the trade window with entry / stop / exit rails. No chart library, no iframe:
 * it reuses the memoised candle cache so opening the full Chart tab is instant.
 */
export function TradeMiniChart({ T, trade, isRTL, onOpen }: Props) {
  const resolved = useMemo(() => resolveSymbol(trade.coin), [trade.coin]);
  const entryMs = useMemo(() => {
    const t = new Date(trade.date).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }, [trade.date]);
  const interval = useMemo(() => pickInterval(4 * 60 * 60 * 1000) as Interval, []);
  const win = useMemo(() => frameWindow(entryMs, entryMs + 4 * 60 * 60 * 1000, interval), [entryMs, interval]);
  const { candles, loading } = useTradeCandles(resolved.klineSymbol, interval, win, true);

  const L = (he: string, en: string) => (isRTL ? he : en);
  const outcome = trade.exit > trade.entry === (trade.direction === 'Long') ? T.accent.green : T.accent.red;

  const W = 320, H = 96;
  const path = useMemo(() => {
    if (!candles?.length) return null;
    const closes = candles.map(c => c.close);
    const levels = [trade.entry, trade.exit, trade.stopLoss].filter(n => n != null && Number.isFinite(n)) as number[];
    const lo = Math.min(...closes, ...levels, ...candles.map(c => c.low));
    const hi = Math.max(...closes, ...levels, ...candles.map(c => c.high));
    const span = hi - lo || 1;
    const y = (v: number) => H - ((v - lo) / span) * (H - 12) - 6;
    const d = closes.map((c, i) => `${i === 0 ? 'M' : 'L'}${(i / (closes.length - 1 || 1)) * W},${y(c)}`).join(' ');
    return { d, y, area: `${d} L${W},${H} L0,${H} Z` };
  }, [candles, trade.entry, trade.exit, trade.stopLoss, H, W]);

  return (
    <button
      onClick={onOpen}
      className="orca-focus"
      aria-label={L('פתח את הגרף המלא', 'Open full chart')}
      style={{
        position: 'relative', overflow: 'hidden', width: '100%', textAlign: 'start',
        padding: '12px 14px 10px', borderRadius: T.radius.lg,
        border: `1px solid ${T.border.subtle}`, background: T.bg.tertiary,
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 9.5, letterSpacing: 0.9, textTransform: 'uppercase', color: T.text.muted }}>
          {L('תצוגה מקדימה', 'Price preview')}
        </span>
        <span style={{ fontSize: 9.5, fontFamily: MONO, color: infoColor(T) }}>
          {L('פתח גרף', 'Open chart')} ›
        </span>
      </div>

      <div style={{ position: 'relative', height: H }}>
        {path ? (
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
            <defs>
              <linearGradient id={`orca-mini-${trade.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={outcome} stopOpacity="0.22" />
                <stop offset="100%" stopColor={outcome} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path.area} fill={`url(#orca-mini-${trade.id})`} />
            <path d={path.d} fill="none" stroke={outcome} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            {trade.stopLoss != null && (
              <line x1="0" x2={W} y1={path.y(trade.stopLoss)} y2={path.y(trade.stopLoss)} stroke={T.accent.red} strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" opacity="0.8" />
            )}
            <line x1="0" x2={W} y1={path.y(trade.entry)} y2={path.y(trade.entry)} stroke={infoColor(T)} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.9" />
            <line x1="0" x2={W} y1={path.y(trade.exit)} y2={path.y(trade.exit)} stroke={outcome} strokeWidth="1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity="0.9" />
          </svg>
        ) : (
          <div style={{ height: H, display: 'grid', placeItems: 'center', fontSize: 11, color: T.text.muted, textAlign: 'center', padding: '0 10px' }}>
            {loading
              ? L('טוען…', 'Loading…')
              : L('אין נתוני נרות — פתח את לשונית הגרף ל-TradingView', 'No candles — open the Chart tab for TradingView')}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, fontSize: 9, fontFamily: MONO, color: T.text.muted, flexWrap: 'wrap' }}>
        <span style={{ color: infoColor(T) }}>— {L('כניסה', 'Entry')} {trade.entry}</span>
        {trade.stopLoss != null && <span style={{ color: T.accent.red }}>-- {L('סטופ', 'Stop')} {trade.stopLoss}</span>}
        <span style={{ color: outcome }}>·· {L('יציאה', 'Exit')} {trade.exit}</span>
      </div>
    </button>
  );
}

export default TradeMiniChart;
