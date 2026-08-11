import { useEffect, useMemo, useRef, useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Candle } from '@/lib/market/use-trade-candles';
import { infoColor, neutralRamp } from '@/lib/semantic-color';

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
  /** Exit timestamp was inferred (first candle touching the exit price). */
  exitInferred?: boolean;
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
  T, candles, entry, stop, exit, isLong, entryTime, exitTime, exitInferred, height, reducedMotion, isRTL,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{ chart: any; series: any; lines: any[]; tradeLine: any | null } | null>(null);
  /** Levels the price scale must always keep in view (big winners included). */
  const levelsRef = useRef<number[]>([]);
  const [showTradeLine, setShowTradeLine] = useState(true);

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
        // Keep entry / stop / exit inside the visible price range even when the
        // exit is far outside the candle range (e.g. a +16R runner).
        autoscaleInfoProvider: (original: () => any) => {
          const res = original();
          const levels = levelsRef.current.filter(Number.isFinite);
          if (!levels.length) return res;
          const min = Math.min(...levels, res?.priceRange?.minValue ?? Infinity);
          const max = Math.max(...levels, res?.priceRange?.maxValue ?? -Infinity);
          if (!Number.isFinite(min) || !Number.isFinite(max)) return res;
          const pad = (max - min) * 0.06 || Math.abs(max) * 0.01 || 1;
          return { ...(res || {}), priceRange: { minValue: min - pad, maxValue: max + pad } };
        },
      });

      apiRef.current = { chart, series, lines: [], tradeLine: null };

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

      levelsRef.current = [entry, exit, ...(stop != null && Number.isFinite(stop) ? [stop] : [])];
      api.series.setData(candles);

      // clear previous price lines
      api.lines.forEach(l => { try { api.series.removePriceLine(l); } catch { /* noop */ } });
      api.lines = [];

      const mk = (price: number, color: string, title: string, dashed = false) => {
        const line = api.series.createPriceLine({
          price,
          color,
          lineWidth: 2,
          lineStyle: dashed ? 2 : 0,
          axisLabelVisible: true,
          title,
        });
        api.lines.push(line);
      };

      mk(entry, infoColor(T), isRTL ? 'כניסה' : 'ENTRY');
      if (stop != null && Number.isFinite(stop)) mk(stop, T.accent.red, isRTL ? 'סטופ' : 'STOP', true);
      const won = isLong ? exit > entry : exit < entry;
      mk(exit, won ? T.accent.green : T.accent.red, isRTL ? 'יציאה' : 'EXIT');

      // recompute autoscale now that the levels are known
      try { api.series.priceScale().applyOptions({ autoScale: true }); } catch { /* noop */ }

      const lcMod = await import('lightweight-charts');

      // entry → exit trade line, the way desks draw it
      try {
        if (api.tradeLine) { try { api.chart.removeSeries(api.tradeLine); } catch { /* noop */ } api.tradeLine = null; }
        const first = candles[0].time, last = candles[candles.length - 1].time;
        const clampT = (t?: number) => (t == null ? null : Math.min(Math.max(t, first), last));
        const et = clampT(entryTime), xt = clampT(exitTime);
        if (showTradeLine && et && xt && xt > et) {
          const line = api.chart.addSeries((lcMod as any).LineSeries, {
            color: won ? T.accent.green : T.accent.red,
            lineWidth: 2,
            lineStyle: 0,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          line.setData([{ time: et, value: entry }, { time: xt, value: exit }]);
          api.tradeLine = line;
        }

        const markers: any[] = [];
        if (et) markers.push({ time: et, position: isLong ? 'belowBar' : 'aboveBar', color: infoColor(T), shape: isLong ? 'arrowUp' : 'arrowDown', text: isRTL ? 'כניסה' : 'Entry' });
        if (xt) markers.push({ time: xt, position: isLong ? 'aboveBar' : 'belowBar', color: won ? T.accent.green : T.accent.red, shape: 'circle', text: (isRTL ? 'יציאה' : 'Exit') + (exitInferred ? ' ~' : '') });
        if (markers.length && (lcMod as any).createSeriesMarkers) {
          (lcMod as any).createSeriesMarkers(api.series, markers.sort((a, b) => a.time - b.time));
        }
      } catch { /* overlays are decorative */ }

      api.chart.timeScale().fitContent();
    })();
    return () => { cancelled = true; };
  }, [candles, entry, stop, exit, isLong, entryTime, exitTime, exitInferred, T, isRTL, reducedMotion, showTradeLine]);

  const jumpTo = (time?: number) => {
    const api = apiRef.current;
    if (!api || time == null || !candles.length) return;
    const first = candles[0].time;
    const last = candles[candles.length - 1].time;
    const center = Math.min(Math.max(time, first), last);
    const span = Math.max(60, Math.floor((last - first) / 7));
    try { api.chart.timeScale().setVisibleRange({ from: Math.max(first, center - span), to: Math.min(last, center + span) }); } catch { /* noop */ }
  };

  const controlStyle = (active = false): React.CSSProperties => ({
    border: `1px solid ${active ? infoColor(T) : T.border.subtle}`,
    background: active ? `${infoColor(T)}18` : T.bg.card,
    color: active ? infoColor(T) : T.text.secondary,
    borderRadius: T.radius.sm,
    padding: '5px 9px',
    fontSize: 10,
    fontWeight: 700,
    cursor: 'pointer',
  });

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}` }}>
        <button className="orca-focus" style={controlStyle()} onClick={() => jumpTo(entryTime)}>{isRTL ? 'כניסה' : 'Entry'}</button>
        {stop != null && Number.isFinite(stop) && <button className="orca-focus" style={controlStyle()} onClick={() => jumpTo(entryTime)}>{isRTL ? 'סטופ' : 'Stop'}</button>}
        <button className="orca-focus" style={controlStyle()} onClick={() => jumpTo(exitTime)}>{isRTL ? 'יציאה' : 'Exit'}</button>
        <div style={{ flex: 1 }} />
        <button
          className="orca-focus"
          aria-pressed={showTradeLine}
          style={controlStyle(showTradeLine)}
          onClick={() => setShowTradeLine(v => !v)}
        >
          {showTradeLine ? (isRTL ? 'הסתר קו עסקה' : 'Hide trade line') : (isRTL ? 'הצג קו עסקה' : 'Show trade line')}
        </button>
      </div>
      <div ref={hostRef} style={{ width: '100%', height }} />
    </div>
  );
}

export default TradeReplayChart;
