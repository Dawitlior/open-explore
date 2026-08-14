import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Candle } from '@/lib/market/use-trade-candles';
import { infoColor } from '@/lib/semantic-color';

interface Props {
  T: TradingTheme;
  candles: Candle[];
  entry: number;
  stop: number | null;
  exit: number;
  /** Planned target, when the trade stored one. Only a real target draws the reward zone. */
  target?: number | null;
  isLong: boolean;
  /** unix seconds */
  entryTime?: number;
  exitTime?: number;
  /** Exit timestamp was inferred (first candle touching the exit price). */
  exitInferred?: boolean;
  /** Outcome chip content. */
  rMultiple?: number | null;
  pnl?: number | null;
  height: number;
  reducedMotion: boolean;
  isRTL: boolean;
}

interface Badge {
  key: string;
  y: number;
  anchorY: number;
  title: string;
  price: string;
  fg: string;
  bg: string;
  border: string;
}

interface Band {
  key: string;
  top: number;
  height: number;
  left: number;
  width: number;
  color: string;
  border: string;
}

const MONO = "'JetBrains Mono', monospace";

function decimalsFor(v: number): number {
  const a = Math.abs(v);
  if (!Number.isFinite(a) || a === 0) return 2;
  if (a < 1) return 6;
  if (a < 10) return 4;
  if (a < 1000) return 2;
  return 2;
}

/**
 * Trade Replay — TradingView's open-source lightweight-charts, themed with the
 * live ORCA tokens. Entry / Stop / Exit are drawn as price lines, but their
 * axis labels are rendered by our own overlay so collisions can be merged and
 * the native ticks underneath are masked.
 */
export function TradeReplayChart({
  T, candles, entry, stop, exit, target, isLong, entryTime, exitTime, exitInferred,
  rMultiple, pnl, height, reducedMotion, isRTL,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{ chart: any; series: any; lines: any[] } | null>(null);
  const levelsRef = useRef<number[]>([]);
  const [showZones, setShowZones] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [tradeXs, setTradeXs] = useState<{ entry: number; exit: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const dec = decimalsFor(entry);
  const won = isLong ? exit > entry : exit < entry;
  const hasStop = stop != null && Number.isFinite(stop);
  const hasTarget = target != null && Number.isFinite(target);

  const colors = useMemo(() => ({
    up: T.accent.green,
    down: T.accent.red,
    text: T.text.muted,
    grid: T.border.subtle,
    info: infoColor(T),
  }), [T]);

  const L = useCallback((he: string, en: string) => (isRTL ? he : en), [isRTL]);

  /** Levels with their presentation, in a stable order. */
  const levelDefs = useMemo(() => {
    const out: Array<{ key: string; price: number; title: string; color: string; dashed?: boolean }> = [];
    out.push({ key: 'entry', price: entry, title: L('כניסה', 'ENTRY'), color: colors.info });
    if (hasStop) out.push({ key: 'stop', price: stop as number, title: L('סטופ', 'STOP'), color: T.accent.red, dashed: true });
    if (hasTarget) out.push({ key: 'target', price: target as number, title: L('יעד', 'TARGET'), color: T.accent.green, dashed: true });
    out.push({ key: 'exit', price: exit, title: L('יציאה', 'EXIT'), color: won ? T.accent.green : T.accent.red });
    return out;
  }, [entry, stop, exit, target, hasStop, hasTarget, won, colors.info, T.accent.red, T.accent.green, L]);

  /** Recompute the overlay (merged badges + risk/reward bands) from live coordinates. */
  const sync = useCallback(() => {
    const api = apiRef.current;
    const host = hostRef.current;
    if (!api || !host) return;

    const w = host.clientWidth;
    const points = levelDefs
      .map(l => {
        const y = api.series.priceToCoordinate(l.price);
        return y == null ? null : { ...l, y: y as number };
      })
      .filter(Boolean) as Array<{ key: string; price: number; title: string; color: string; y: number }>;

    points.sort((a, b) => a.y - b.y);

    // Merge only truly identical prices. Nearby, different levels remain
    // distinct and are laid out with a minimum vertical gap below.
    const groups: Array<typeof points> = [];
    for (const p of points) {
      const last = groups[groups.length - 1];
      if (last && p.price.toFixed(dec) === last[0].price.toFixed(dec)) last.push(p);
      else groups.push([p]);
    }

    const severity = (k: string) => (k === 'stop' ? 3 : k === 'exit' ? 2 : k === 'target' ? 1 : 0);
    const rawBadges: Badge[] = groups.map(gp => {
      const lead = [...gp].sort((a, b) => severity(b.key) - severity(a.key))[0];
      const samePrice = gp.every(p => p.price.toFixed(dec) === gp[0].price.toFixed(dec));
      const price = samePrice
        ? gp[0].price.toFixed(dec)
        : `${Math.min(...gp.map(p => p.price)).toFixed(dec)}–${Math.max(...gp.map(p => p.price)).toFixed(dec)}`;
      const isDarkFill = lead.key !== 'entry';
      return {
        key: gp.map(p => p.key).join('+'),
        y: gp.reduce((s, p) => s + p.y, 0) / gp.length,
        anchorY: gp.reduce((s, p) => s + p.y, 0) / gp.length,
        title: gp.map(p => p.title).join(' · '),
        price,
        fg: isDarkFill ? '#fff' : T.bg.primary,
        bg: lead.color,
        border: lead.color,
      };
    });
    const minY = 14;
    const maxY = Math.max(minY, host.clientHeight - 14);
    const minGap = 24;
    rawBadges.forEach((badge, i) => {
      badge.y = Math.max(minY, i === 0 ? badge.anchorY : Math.max(badge.anchorY, rawBadges[i - 1].y + minGap));
    });
    for (let i = rawBadges.length - 1; i >= 0; i--) {
      const ceiling = i === rawBadges.length - 1 ? maxY : rawBadges[i + 1].y - minGap;
      rawBadges[i].y = Math.min(rawBadges[i].y, ceiling);
    }
    const next = rawBadges;
    setBadges(next);

    // risk / reward zones, clipped to the trade window
    const ts = api.chart.timeScale();
    const x1raw = entryTime != null ? ts.timeToCoordinate(entryTime as any) : null;
    const x2raw = exitTime != null ? ts.timeToCoordinate(exitTime as any) : null;
    const nb: Band[] = [];
    if (showZones && x1raw != null && x2raw != null) {
      const left = Math.max(0, Math.min(x1raw as number, x2raw as number));
      const right = Math.min(w, Math.max(x1raw as number, x2raw as number));
      const width = Math.max(0, right - left);
      setTradeXs({ entry: x1raw as number, exit: x2raw as number });
      const yEntry = api.series.priceToCoordinate(entry);
      if (width > 1 && yEntry != null) {
        const push = (price: number, color: string, key: string) => {
          const y = api.series.priceToCoordinate(price);
          if (y == null) return;
          const top = Math.min(y as number, yEntry as number);
          const h = Math.abs((y as number) - (yEntry as number));
          if (h < 1) return;
          nb.push({ key, top, height: h, left, width, color: `${color}1F`, border: `${color}55` });
        };
        // Red = Entry ↔ Stop, always (when a stop exists).
        if (hasStop) push(stop as number, T.accent.red, 'risk');
        // Green = Entry ↔ Target, ONLY when the trade stored a target.
        if (hasTarget) push(target as number, T.accent.green, 'reward');
      }
    } else setTradeXs(x1raw != null && x2raw != null ? { entry: x1raw as number, exit: x2raw as number } : null);
    setBands(nb);
  }, [levelDefs, dec, entry, stop, target, hasStop, hasTarget, entryTime, exitTime, showZones, T]);

  const scheduleSync = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      sync();
    });
  }, [sync]);

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
          fontFamily: MONO,
          fontSize: 10,
          attributionLogo: true,
        },
        grid: {
          vertLines: { color: colors.grid },
          horzLines: { color: colors.grid },
        },
        rightPriceScale: { borderColor: colors.grid, scaleMargins: { top: 0.12, bottom: 0.12 } },
        timeScale: { borderColor: colors.grid, timeVisible: true, secondsVisible: false, rightOffset: 6 },
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
        autoscaleInfoProvider: (original: () => any) => {
          const res = original();
          const levels = levelsRef.current.filter(Number.isFinite);
          if (!levels.length) return res;
          const min = Math.min(...levels, res?.priceRange?.minValue ?? Infinity);
          const max = Math.max(...levels, res?.priceRange?.maxValue ?? -Infinity);
          if (!Number.isFinite(min) || !Number.isFinite(max)) return res;
          const pad = (max - min) * 0.08 || Math.abs(max) * 0.01 || 1;
          return { ...(res || {}), priceRange: { minValue: min - pad, maxValue: max + pad } };
        },
      });

      apiRef.current = { chart, series, lines: [] };

      chart.timeScale().subscribeVisibleLogicalRangeChange(scheduleSync);
      chart.subscribeCrosshairMove(scheduleSync);

      const ro = new ResizeObserver(entries => {
        const w = entries[0]?.contentRect.width ?? 0;
        if (w > 0) chart.applyOptions({ width: Math.floor(w) });
        scheduleSync();
      });
      ro.observe(hostRef.current);
      (apiRef.current as any).ro = ro;
      scheduleSync();
    })();

    return () => {
      disposed = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
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
    scheduleSync();
  }, [colors, height, scheduleSync]);

  // data + trade overlays
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 50 && !apiRef.current; i++) await new Promise(r => setTimeout(r, 20));
      const api = apiRef.current;
      if (!api || cancelled || !candles.length) return;

      levelsRef.current = levelDefs.map(l => l.price);
      api.series.setData(candles);

      api.lines.forEach(l => { try { api.series.removePriceLine(l); } catch { /* noop */ } });
      api.lines = [];

      // price lines without native axis labels — our overlay renders them merged
      levelDefs.forEach(l => {
        api.lines.push(api.series.createPriceLine({
          price: l.price,
          color: l.color,
          lineWidth: 2,
          lineStyle: l.dashed ? 2 : 0,
          axisLabelVisible: false,
          title: '',
        }));
      });

      try { api.series.priceScale().applyOptions({ autoScale: true }); } catch { /* noop */ }

      const lcMod = await import('lightweight-charts');
      const first = candles[0].time, last = candles[candles.length - 1].time;
       const clampT = (t?: number) => (t == null ? null : Math.min(Math.max(t, first), last));
       const nearestCandleTime = (t: number | null) => {
         if (t == null) return null;
         return candles.reduce((nearest, candle) => (
           Math.abs(candle.time - t) < Math.abs(nearest - t) ? candle.time : nearest
         ), candles[0].time);
       };
       // Markers and zones use the exact same snapped timestamps, so their
       // horizontal boundaries cannot drift apart.
       const et = nearestCandleTime(clampT(entryTime));
       const xt = nearestCandleTime(clampT(exitTime));

      try {
        const markers: any[] = [];
        if (et) markers.push({ time: et, position: isLong ? 'belowBar' : 'aboveBar', color: colors.info, shape: isLong ? 'arrowUp' : 'arrowDown', text: L('כניסה', 'Entry') });
        if (xt) markers.push({ time: xt, position: isLong ? 'aboveBar' : 'belowBar', color: won ? T.accent.green : T.accent.red, shape: 'circle', text: '' });
        if (markers.length && (lcMod as any).createSeriesMarkers) {
          (lcMod as any).createSeriesMarkers(api.series, markers.sort((a, b) => a.time - b.time));
        }
      } catch { /* overlays are decorative */ }

      // frame the trade: a few bars before entry, a few after exit
      try {
        const step = candles.length > 1 ? candles[1].time - candles[0].time : 60;
        const from = Math.max(first, (et ?? first) - step * 8);
        const to = Math.min(last + step * 6, (xt ?? last) + step * 10);
        if (to > from) api.chart.timeScale().setVisibleRange({ from: from as any, to: to as any });
        else api.chart.timeScale().fitContent();
      } catch { api.chart.timeScale().fitContent(); }

      scheduleSync();
    })();
    return () => { cancelled = true; };
  }, [candles, levelDefs, isLong, entryTime, exitTime, exitInferred, won, colors.info, T, L, scheduleSync]);

  useEffect(() => { scheduleSync(); }, [showZones, scheduleSync]);

  const jumpTo = (time?: number) => {
    const api = apiRef.current;
    if (!api || time == null || !candles.length) return;
    const first = candles[0].time;
    const last = candles[candles.length - 1].time;
    const center = Math.min(Math.max(time, first), last);
    const span = Math.max(60, Math.floor((last - first) / 7));
    try { api.chart.timeScale().setVisibleRange({ from: Math.max(first, center - span) as any, to: Math.min(last, center + span) as any }); } catch { /* noop */ }
    scheduleSync();
  };

  const jumpBtn = (label: string, time?: number, dotColor?: string) => (
    <button
      className="orca-focus"
      onClick={() => jumpTo(time)}
      title={isRTL ? `דלג ל${label}` : `Jump to ${label}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        minWidth: 78, justifyContent: 'center',
        border: `1px solid ${T.border.subtle}`,
        background: T.bg.card,
        color: T.text.secondary,
        borderRadius: T.radius.sm,
        padding: '5px 10px',
        fontSize: 10.5,
        fontFamily: MONO,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: dotColor ?? T.text.muted }} />
      {label}
    </button>
  );

  const outcomeColor = won ? T.accent.green : T.accent.red;
  const hasOutcome = (rMultiple != null && Number.isFinite(rMultiple)) || (pnl != null && Number.isFinite(pnl));

  return (
    <div style={{ width: '100%' }} dir="ltr">
      {/* control row */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`,
      }}>
        <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: T.text.muted, marginInlineEnd: 2 }}>
          {L('דלג אל', 'Jump to')}
        </span>
        {jumpBtn(L('כניסה', 'Entry'), entryTime, colors.info)}
        {hasStop && jumpBtn(L('סטופ', 'Stop'), entryTime, T.accent.red)}
        {jumpBtn(L('יציאה', 'Exit'), exitTime, outcomeColor)}
        <div style={{ flex: 1 }} />
        <button
          className="orca-focus"
          aria-pressed={showZones}
          onClick={() => setShowZones(v => !v)}
          disabled={!hasStop && !hasTarget}
          style={{
            minWidth: 96,
            border: `1px solid ${showZones ? colors.info : T.border.subtle}`,
            background: showZones ? colors.info : T.bg.card,
            color: showZones ? T.bg.primary : T.text.secondary,
            borderRadius: T.radius.sm,
            padding: '5px 10px',
            fontSize: 10.5,
            fontFamily: MONO,
            fontWeight: 700,
            opacity: !hasStop && !hasTarget ? 0.45 : 1,
            cursor: !hasStop && !hasTarget ? 'not-allowed' : 'pointer',
          }}
        >
          {showZones ? L('אזורים: פעיל', 'Zones: On') : L('אזורים: כבוי', 'Zones: Off')}
        </button>
      </div>

      {/* chart + overlay */}
      <div style={{ position: 'relative' }}>
        <div ref={hostRef} style={{ width: '100%', height }} />

        {/* risk / reward bands */}
        {bands.map(b => (
          <div
            key={b.key}
            aria-hidden
            style={{
              position: 'absolute', pointerEvents: 'none',
              left: b.left, width: b.width, top: b.top, height: b.height,
              background: b.color,
              borderTop: `1px solid ${b.border}`,
              borderBottom: `1px solid ${b.border}`,
            }}
          />
        ))}

        {/* Entry-time guide restored; it shares the zone's exact x anchor. */}
        {tradeXs && (
          <div aria-hidden style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            left: tradeXs.entry, top: 0, bottom: 0,
            borderLeft: `1px dashed ${colors.info}`,
            opacity: 0.72,
          }} />
        )}

        {/* Exit label is offset from the candle and backed by an opaque halo. */}
        {tradeXs && (() => {
          const exitY = apiRef.current?.series?.priceToCoordinate(exit);
          if (exitY == null) return null;
          return (
            <div style={{
              position: 'absolute', pointerEvents: 'none', zIndex: 4,
              left: tradeXs.exit, top: exitY,
              transform: `translate(${tradeXs.exit > (hostRef.current?.clientWidth ?? 0) - 110 ? '-100%' : '8px'}, ${isLong ? '-30px' : '12px'})`,
              padding: '3px 7px', borderRadius: T.radius.sm,
              background: T.bg.card, border: `1px solid ${outcomeColor}`,
              boxShadow: `0 0 0 3px ${T.bg.tertiary}`,
              color: outcomeColor, fontFamily: MONO, fontSize: 9.5, fontWeight: 800,
              whiteSpace: 'nowrap',
            }}>
              {(exitInferred ? '~ ' : '') + L('יציאה', 'Exit')}
            </div>
          );
        })()}

        {/* merged price-scale badges (mask the native ticks underneath) */}
        {badges.map(b => (
          <div key={b.key}>
            {Math.abs(b.y - b.anchorY) > 2 && <span aria-hidden style={{
              position: 'absolute', right: 62, top: Math.min(b.y, b.anchorY),
              height: Math.abs(b.y - b.anchorY), borderRight: `1px solid ${b.border}`,
              pointerEvents: 'none', zIndex: 3,
            }} />}
            <div style={{
              position: 'absolute', right: 62, top: b.y - 10,
              transform: 'translateZ(0)',
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '2px 6px',
              borderRadius: T.radius.sm,
              background: b.bg,
              border: `1px solid ${b.border}`,
              color: b.fg,
              fontFamily: MONO,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: 0.4,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          >
            <span style={{ opacity: 0.85 }}>{b.title}</span>
            <span>{b.price}</span>
            </div>
          </div>
        ))}

        {/* outcome chip */}
        {hasOutcome && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', borderRadius: T.radius.sm,
            background: T.bg.card, border: `1px solid ${outcomeColor}55`,
            fontFamily: MONO, fontSize: 10.5, fontWeight: 800, color: outcomeColor,
            pointerEvents: 'none',
          }}>
            {rMultiple != null && Number.isFinite(rMultiple) && <span>{rMultiple.toFixed(2)}R</span>}
            {rMultiple != null && Number.isFinite(rMultiple) && pnl != null && Number.isFinite(pnl) && (
              <span aria-hidden style={{ width: 1, height: 10, background: `${outcomeColor}55` }} />
            )}
            {pnl != null && Number.isFinite(pnl) && (
              <span>{pnl >= 0 ? '+' : '−'}${Math.abs(pnl).toFixed(2)}</span>
            )}
          </div>
        )}
      </div>

      {/* legend */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
        padding: '8px 10px', borderTop: `1px solid ${T.border.subtle}`,
        fontSize: 9.5, color: T.text.muted, fontFamily: MONO, letterSpacing: 0.3,
      }}>
        <LegendItem color={colors.info} label={`${L('כניסה', 'Entry')} ${entry.toFixed(dec)}`} />
        {hasStop && <LegendItem color={T.accent.red} dashed label={`${L('סטופ', 'Stop')} ${(stop as number).toFixed(dec)}`} />}
        {hasTarget && <LegendItem color={T.accent.green} dashed label={`${L('יעד', 'Target')} ${(target as number).toFixed(dec)}`} />}
        <LegendItem color={outcomeColor} label={`${L('יציאה', 'Exit')} ${exit.toFixed(dec)}${exitInferred ? ` (${L('משוער', 'approx.')})` : ''}`} />
        {showZones && hasStop && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden style={{ width: 14, height: 9, background: `${T.accent.red}1F`, border: `1px solid ${T.accent.red}55` }} />
            {L('אזור סיכון (כניסה↔סטופ)', 'Risk zone (Entry↔Stop)')}
          </span>
        )}
        {showZones && hasTarget && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden style={{ width: 14, height: 9, background: `${T.accent.green}1F`, border: `1px solid ${T.accent.green}55` }} />
            {L('אזור רווח (כניסה↔יעד)', 'Reward zone (Entry↔Target)')}
          </span>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span aria-hidden style={{ width: 14, height: 0, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      {label}
    </span>
  );
}

export default TradeReplayChart;
