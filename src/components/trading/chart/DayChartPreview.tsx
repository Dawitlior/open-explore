import { Suspense, lazy, useEffect, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor } from '@/lib/semantic-color';

const TradeChartPanel = lazy(() => import('./TradeChartPanel'));

interface Props {
  T: TradingTheme;
  trades: Trade[];
  isRTL: boolean;
  isMobile?: boolean;
}

/**
 * Chart preview for the calendar day modal: one replay chart per trade of the
 * day, with chips to switch between them. Mounted lazily and only when opened,
 * so opening a day never pays the chart cost unless the user wants it.
 */
export function DayChartPreview({ T, trades, isRTL, isMobile }: Props) {
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);
  const L = (he: string, en: string) => (isRTL ? he : en);

  useEffect(() => { setIdx(0); }, [trades.length]);

  if (!trades.length) return null;
  const trade = trades[Math.min(idx, trades.length - 1)];
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <div style={{
      border: `1px solid ${T.border.subtle}`,
      borderRadius: T.radius.md,
      background: T.bg.card,
      padding: isMobile ? 12 : 16,
      display: 'flex', flexDirection: 'column', gap: 12,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
          {L('תצוגת גרף', 'Chart Preview')}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setOpen(o => !o)}
          className="orca-focus"
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: infoColor(T), fontSize: 11, fontWeight: 700, textDecoration: 'underline',
          }}
        >
          {open ? L('הסתר', 'Hide') : L('הצג', 'Show')}
        </button>
      </div>

      {open && trades.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {trades.map((tr, i) => {
            const active = i === Math.min(idx, trades.length - 1);
            return (
              <button
                key={tr.id}
                onClick={() => setIdx(i)}
                aria-pressed={active}
                className="orca-focus"
                style={{
                  padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
                  fontFamily: "'JetBrains Mono', monospace",
                  border: `1px solid ${active ? infoColor(T) : T.border.subtle}`,
                  background: active ? `${infoColor(T)}1F` : T.bg.tertiary,
                  color: active ? infoColor(T) : T.text.muted,
                }}
              >
                {tr.coin}
              </button>
            );
          })}
        </div>
      )}

      {open && (
        <Suspense fallback={
          <div style={{ height: isMobile ? 300 : 420, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.muted, fontSize: 12 }}>
            {L('טוען גרף…', 'Loading chart…')}
          </div>
        }>
          <TradeChartPanel
            T={T}
            trade={trade}
            isRTL={isRTL}
            isMobile={!!isMobile}
            reducedMotion={!!reducedMotion}
          />
        </Suspense>
      )}
    </div>
  );
}

export default DayChartPreview;
