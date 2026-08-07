import { useEffect, useMemo, useRef } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Candle } from '@/lib/market/use-trade-candles';

interface Props {
  T: TradingTheme;
  candles: Candle[];
  entry: number;
  stop: number | null;
  exit: number;
  isLong: boolean;
  /** unix seconds */
  entryTime?: number;
  exitTime?: number;
  height: number;
  reducedMotion: boolean;
  isRTL: boolean;
}

/**
 * Trade Replay — TradingView's open-source lightweight-charts, themed with the
 * live ORCA tokens, with exact Entry / Stop / Exit price lines and markers.
 * The library is imported dynamically by the parent so nothing loads until the
 * Chart tab is opened.
 */
export function TradeReplayChart({
  T, candles, entry, stop, exit, isLong, entryTime, exitTime, height, reducedMotion, isRTL,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{ chart: any; series: any; lines: any[] } | null>(null);

  const colors = useMemo(() => ({
    up: T.accent.green,
    down: T.accent.red,
    text: T.text.muted,
    grid: T.border.subtle,
    bg: 'transparent',
  }), [T]);

  // create once
  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      const lc = await import('lightweight-charts');
      if (disposed || !hostRef.current) return;

      const chart = lc.createChart(hostRef.current, {
        height,
        layout: {
          background: { color: 'transparent' },
          textColor: colors.text,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          attributionLogo: true,
        },
        grid: {
          vertLines: { color: colors.grid },
          horzLines: { color: colors.grid },
        },
        rightPriceScale: { borderColor: colors.grid },
        timeScale: { borderColor: colors.grid, timeVisible: true, secondsVisible: false },
        crosshair: { mode: lc.CrosshairMode.Normal },
        handleScale: true,
        handleScroll: true,
      });

      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor: colors.up,
        downColor: colors.down,
        borderUpColor: colors.up,
        borderDownColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });

      apiRef.current = { chart, series, lines: [] };

      const ro = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width ?? 0;
        if (w > 0) chart.applyOptions({ width: Math.floor(w) });
      });
      ro.observe(hostRef.current);
      (apiRef.current as any).ro = ro;
    })();

    return () => {
      disposed = true;
      const api = apiRef.current as any;
      if (api) {
        try { api.ro?.disconnect(); } catch { /* noop */ }
        try { api.chart.remove(); } catch { /* noop */ }
      }
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // theme / height updates
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    api.chart.applyOptions({
      height,
      layout: { textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      rightPriceScale: { borderColor: colors.grid },
      timeScale: { borderColor: colors.grid },
    });
    api.series.applyOptions({
      upColor: colors.up, downColor: colors.down,
      borderUpColor: colors.up, borderDownColor: colors.down,
      wickUpColor: colors.up, wickDownColor: colors.down,
    });
  }, [colors, height]);

  // data + trade overlays
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // wait for the async chart creation on first paint
      for (let i = 0; i < 50 && !apiRef.current; i++) await new Promise(r => setTimeout(r, 20));
      const api = apiRef.current;
      if (!api || cancelled || !candles.length) return;

      api.series.setData(candles);

      // clear previous price lines
      api.lines.forEach(l => { try { api.series.removePriceLine(l); } catch { /* noop */ } });
      api.lines = [];

      const mk = (price: number, color: string, title: string, dashed = false) => {
        const lc = (window as any).__lcStyles;
        const line = api.series.createPriceLine({
          price,
          color,
          lineWidth: 2,
          lineStyle: dashed ? 2 : 0,
          axisLabelVisible: true,
          title,
        });
        api.lines.push(line);
        void lc;
      };

      mk(entry, T.accent.cyan, isRTL ? 'כניסה' : 'ENTRY');
      if (stop != null && Number.isFinite(stop)) mk(stop, T.accent.red, isRTL ? 'סטופ' : 'STOP', true);
      const won = isLong ? exit > entry : exit < entry;
      mk(exit, won ? T.accent.green : T.accent.red, isRTL ? 'יציאה' : 'EXIT');

      // entry / exit markers on the time axis when we know the timestamps
      try {
        const lcMod = await import('lightweight-charts');
        const markers: any[] = [];
        const first = candles[0].time, last = candles[candles.length - 1].time;
        const clampT = (t?: number) => (t == null ? null : Math.min(Math.max(t, first), last));
        const et = clampT(entryTime), xt = clampT(exitTime);
        if (et) markers.push({ time: et, position: isLong ? 'belowBar' : 'aboveBar', color: T.accent.cyan, shape: isLong ? 'arrowUp' : 'arrowDown', text: isRTL ? 'כניסה' : 'Entry' });
        if (xt) markers.push({ time: xt, position: isLong ? 'aboveBar' : 'belowBar', color: won ? T.accent.green : T.accent.red, shape: 'circle', text: isRTL ? 'יציאה' : 'Exit' });
        if (markers.length && (lcMod as any).createSeriesMarkers) {
          (lcMod as any).createSeriesMarkers(api.series, markers.sort((a, b) => a.time - b.time));
        }
      } catch { /* markers are decorative */ }

      api.chart.timeScale().fitContent();
    })();
    return () => { cancelled = true; };
  }, [candles, entry, stop, exit, isLong, entryTime, exitTime, T, isRTL, reducedMotion]);

  return <div ref={hostRef} style={{ width: '100%', height }} />;
}

export default TradeReplayChart;
