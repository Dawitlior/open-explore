import { useEffect, useRef } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { TV_INTERVAL } from '@/lib/market/symbol-resolver';

interface Props {
  T: TradingTheme;
  tvSymbol: string;
  interval: string;
  height: number;
  isRTL: boolean;
  /** Entry timestamp (unix ms) — the chart tries to scroll to this moment. */
  tradeMs?: number;
  /** Exit timestamp (unix ms) when known/inferred, used to frame the range. */
  exitMs?: number;
}

let scriptPromise: Promise<void> | null = null;

function loadTv(): Promise<void> {
  if ((window as any).TradingView) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('tv script failed')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let uid = 0;

/**
 * Full TradingView Advanced Chart (free widget) for any ticker on earth.
 * Mounted only while its tab is active; the container is destroyed on unmount
 * so the iframe never lingers while browsing trades. When the trade timestamp
 * is known we ask the widget to scroll to that exact window.
 */
export function TradingViewPanel({ T, tvSymbol, interval, height, isRTL, tradeMs, exitMs }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(`orca_tv_${++uid}`);

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = `<div id="${idRef.current}" style="width:100%;height:100%"></div>`;

    loadTv().then(() => {
      if (disposed) return;
      const TV = (window as any).TradingView;
      if (!TV?.widget) return;
      try {
        const w = new TV.widget({
          container_id: idRef.current,
          autosize: true,
          symbol: tvSymbol,
          interval: TV_INTERVAL[interval] ?? '15',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC',
          theme: T.isLight ? 'light' : 'dark',
          style: '1',
          locale: isRTL ? 'he_IL' : 'en',
          toolbar_bg: T.bg.tertiary,
          backgroundColor: T.bg.card,
          gridColor: T.border.subtle,
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          withdateranges: true,
          save_image: false,
        });

        // Best-effort: scroll the widget to the trade window instead of "now".
        if (tradeMs && Number.isFinite(tradeMs)) {
          const from = Math.floor((tradeMs - 6 * 3_600_000) / 1000);
          const to = Math.floor(((exitMs && exitMs > tradeMs ? exitMs : tradeMs) + 6 * 3_600_000) / 1000);
          try {
            w.onChartReady?.(() => {
              try { w.activeChart?.().setVisibleRange?.({ from, to }); } catch { /* free widget: not exposed */ }
            });
          } catch { /* no chart api */ }
        }
      } catch { /* widget failed — panel stays empty */ }
    }).catch(() => { /* offline */ });

    return () => {
      disposed = true;
      if (host) host.innerHTML = '';
    };
  }, [tvSymbol, interval, T, isRTL, tradeMs, exitMs]);

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%', height,
        borderRadius: T.radius.md,
        overflow: 'hidden',
        border: `1px solid ${T.border.subtle}`,
        background: T.bg.tertiary,
      }}
    />
  );
}

export default TradingViewPanel;
