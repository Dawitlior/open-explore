import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Candle } from '@/lib/market/use-trade-candles';
import { infoColor } from '@/lib/semantic-color';
import {
  formatDateTimeInZone, formatDayInZone, formatTimeInZone, zoneOffsetLabel,
} from '@/lib/market/display-timezone';

/** Exit time is one of exactly three states — never a fabricated position. */
export type ExitState = 'exact' | 'inferred' | 'unknown';

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
  exitState: ExitState;
  /** Outcome chip content. */
  rMultiple?: number | null;
  pnl?: number | null;
  height: number;
  reducedMotion: boolean;
  isRTL: boolean;
  /** IANA zone every label in this view formats through. */
  timeZone: string;
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

interface LevelDef {
  key: string;
  price: number;
  title: string;
  color: string;
  dashed?: boolean;
}

const MONO = "'JetBrains Mono', monospace";
const BAR_PAD = 30; // K bars of horizontal padding on each side of the trade

function decimalsFor(v: number): number {
  const a = Math.abs(v);
  if (!Number.isFinite(a) || a === 0) return 2;
  if (a < 1) return 6;
  if (a < 10) return 4;
  if (a < 1000) return 2;
  return 2;
}

function durationLabel(fromSec?: number, toSec?: number): string | null {
  if (fromSec == null || toSec == null || toSec <= fromSec) return null;
  const mins = Math.round((toSec - fromSec) / 60);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

/**
 * Trade Replay — TradingView's open-source lightweight-charts, themed with the
 * live ORCA tokens. Entry / Stop / Exit are drawn as price lines, but their
 * axis labels are rendered by our own overlay so collisions can be merged and
 * the native ticks underneath are masked. All times render through the shared
 * display-timezone helper; epoch values are never mutated.
 */
export function TradeReplayChart({
  T, candles, entry, stop, exit, target, isLong, entryTime, exitTime, exitState,
  rMultiple, pnl, height, reducedMotion, isRTL, timeZone,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<{ chart: any; series: any; lines: any[] } | null>(null);
  const levelsRef = useRef<number[]>([]);
  const tzRef = useRef(timeZone);
  const [showZones, setShowZones] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [overflow, setOverflow] = useState<Badge[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [tradeXs, setTradeXs] = useState<{ entry: number; exit: number | null } | null>(null);
  const [markerYs, setMarkerYs] = useState<{ entry: number | null; exit: number | null }>({ entry: null, exit: null });
  const rafRef = useRef<number | null>(null);

  const dec = decimalsFor(entry);
  const won = isLong ? exit > entry : exit < entry;
  const hasStop = stop != null && Number.isFinite(stop);
  const hasTarget = target != null && Number.isFinite(target);
  const hasExit = exitState !== 'unknown';
  const locale = isRTL ? 'he-IL' : 'en-GB';

  const colors = useMemo(() => ({
    up: T.accent.green,
    down: T.accent.red,
    text: T.text.muted,
    grid: T.border.subtle,
    info: infoColor(T),
  }), [T]);

  const L = useCallback((he: string, en: string) => (isRTL ? he : en), [isRTL]);

  tzRef.current = timeZone;

  /** Levels with their presentation, in a stable order. */
  const levelDefs = useMemo<LevelDef[]>(() => {
    const out: LevelDef[] = [];
    out.push({ key: 'entry', price: entry, title: L('כניסה', 'ENTRY'), color: colors.info });
    if (hasStop) out.push({ key: 'stop', price: stop as number, title: L('סטופ', 'STOP'), color: T.accent.red, dashed: true });
    if (hasTarget) out.push({ key: 'target', price: target as number, title: L('יעד', 'TARGET'), color: T.accent.green, dashed: true });
    if (hasExit) out.push({ key: 'exit', price: exit, title: L('יציאה', 'EXIT'), color: won ? T.accent.green : T.accent.red });
    return out;
  }, [entry, stop, exit, target, hasStop, hasTarget, hasExit, won, colors.info, T.accent.red, T.accent.green, L]);

  /** Recompute the overlay (merged badges + risk/reward bands) from live coordinates. */
  const sync = useCallback(() => {
    const api = apiRef.current;
    const host = hostRef.current;
    if (!api || !host) return;

    const w = host.clientWidth;
    const narrow = w < 480;
    const points = levelDefs
      .map(l => {
        const y = api.series.priceToCoordinate(l.price);
        return y == null ? null : { ...l, y: y as number };
      })
      .filter(Boolean) as Array<LevelDef & { y: number }>;

    points.sort((a, b) => a.y - b.y);

    // Merge levels that resolve to the same rendered line.
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
        // ENTRY fills with the info token, so it needs the dark page ink for AA.
        fg: isDarkFill ? '#FFFFFF' : T.bg.primary,
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

    // Narrow viewports never stack axis badges: keep the most severe one, the
    // rest are described by the bottom legend.
    if (narrow && rawBadges.length > 1) {
      const keep = [...rawBadges].sort((a, b) => {
        const sev = (k: string) => Math.max(...k.split('+').map(severity));
        return sev(b.key) - sev(a.key);
      })[0];
      setBadges([keep]);
      setOverflow(rawBadges.filter(b => b.key !== keep.key));
    } else {
      setBadges(rawBadges);
      setOverflow([]);
    }

    // risk / reward zones, clipped to the trade window
    const ts = api.chart.timeScale();
    const nearestCandleTime = (time?: number) => {
      if (time == null || !candles.length) return null;
      return candles.reduce((nearest, candle) => (
        Math.abs(candle.time - time) < Math.abs(nearest - time) ? candle.time : nearest
      ), candles[0].time);
    };
    const zoneEntryTime = nearestCandleTime(entryTime);
    const zoneExitTime = hasExit ? nearestCandleTime(exitTime) : null;
    const x1raw = zoneEntryTime != null ? ts.timeToCoordinate(zoneEntryTime as any) : null;
    const x2raw = zoneExitTime != null ? ts.timeToCoordinate(zoneExitTime as any) : null;

    setTradeXs(x1raw != null ? { entry: x1raw as number, exit: x2raw as number | null } : null);
    setMarkerYs({
      entry: api.series.priceToCoordinate(entry) as number | null,
      exit: hasExit ? (api.series.priceToCoordinate(exit) as number | null) : null,
    });

    const nb: Band[] = [];
    if (showZones && x1raw != null) {
      const other = (x2raw ?? x1raw) as number;
      const left = Math.max(0, Math.min(x1raw as number, other));
      const right = Math.min(w, Math.max(x1raw as number, other));
      const width = Math.max(0, right - left);
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
    }
    setBands(nb);
  }, [levelDefs, dec, entry, stop, target, hasStop, hasTarget, hasExit, entryTime, exitTime, showZones, candles, T]);

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
        localization: {
          // The library formats in UTC unless told otherwise. Crosshair label:
          timeFormatter: (t: any) => formatDateTimeInZone(Number(t) * 1000, tzRef.current, 'en-GB'),
        },
        grid: {
          vertLines: { color: colors.grid },
          horzLines: { color: colors.grid },
        },
        rightPriceScale: { borderColor: colors.grid, scaleMargins: { top: 0.08, bottom: 0.08 } },
        timeScale: {
          borderColor: colors.grid,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 2,
          // Axis tick marks, same zone as everything else.
          tickMarkFormatter: (t: any, tickType: any) => {
            const ms = Number(t) * 1000;
            return tickType <= 1
              ? formatDayInZone(ms, tzRef.current, 'en-GB')
              : formatTimeInZone(ms, tzRef.current, 'en-GB');
          },
        },
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
        // The library's last-price line looks like another trade level and
        // creates an unexplained native badge. Trade levels own this canvas.
        priceLineVisible: false,
        lastValueVisible: false,
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

  // timezone change → repaint axis + crosshair labels without touching data
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    try {
      api.chart.applyOptions({
        localization: { timeFormatter: (t: any) => formatDateTimeInZone(Number(t) * 1000, tzRef.current, 'en-GB') },
        timeScale: {
          tickMarkFormatter: (t: any, tickType: any) => {
            const ms = Number(t) * 1000;
            return tickType <= 1
              ? formatDayInZone(ms, tzRef.current, 'en-GB')
              : formatTimeInZone(ms, tzRef.current, 'en-GB');
          },
        },
      });
    } catch { /* noop */ }
    scheduleSync();
  }, [timeZone, scheduleSync]);

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
      const xt = hasExit ? nearestCandleTime(clampT(exitTime)) : null;

      try {
        const markers: any[] = [];
        if (et) markers.push({ time: et, position: isLong ? 'belowBar' : 'aboveBar', color: colors.info, shape: isLong ? 'arrowUp' : 'arrowDown', text: '' });
        if (xt) markers.push({ time: xt, position: isLong ? 'aboveBar' : 'belowBar', color: won ? T.accent.green : T.accent.red, shape: 'circle', text: '' });
        if (markers.length && (lcMod as any).createSeriesMarkers) {
          (lcMod as any).createSeriesMarkers(api.series, markers.sort((a, b) => a.time - b.time));
        }
      } catch { /* overlays are decorative */ }

      // Framing measured in bars, not wall clock: K bars either side of the trade.
      try {
        const step = candles.length > 1 ? candles[1].time - candles[0].time : 60;
        const from = Math.max(first, (et ?? first) - step * BAR_PAD);
        const to = Math.min(last, (xt ?? et ?? last) + step * BAR_PAD);
        if (to > from) api.chart.timeScale().setVisibleRange({ from: from as any, to: to as any });
        else api.chart.timeScale().fitContent();
      } catch { api.chart.timeScale().fitContent(); }

      scheduleSync();
    })();
    return () => { cancelled = true; };
  }, [candles, levelDefs, isLong, entryTime, exitTime, hasExit, won, colors.info, T, scheduleSync]);

  useEffect(() => { scheduleSync(); }, [showZones, scheduleSync]);

  const jumpTo = (time?: number) => {
    const api = apiRef.current;
    if (!api || time == null || !candles.length) return;
    const first = candles[0].time;
    const last = candles[candles.length - 1].time;
    const center = Math.min(Math.max(time, first), last);
    const step = candles.length > 1 ? candles[1].time - candles[0].time : 60;
    const span = step * 20;
    try { api.chart.timeScale().setVisibleRange({ from: Math.max(first, center - span) as any, to: Math.min(last, center + span) as any }); } catch { /* noop */ }
    scheduleSync();
  };

  const jumpBtn = (label: string, time?: number, dotColor?: string, disabled?: boolean) => (
    <button
      className="orca-focus"
      onClick={() => jumpTo(time)}
      disabled={disabled}
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
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: dotColor ?? T.text.muted }} />
      {label}
    </button>
  );

  const outcomeColor = won ? T.accent.green : T.accent.red;
  const hasOutcome = (rMultiple != null && Number.isFinite(rMultiple)) || (pnl != null && Number.isFinite(pnl));
  const held = hasExit ? durationLabel(entryTime, exitTime) : null;
  const approx = exitState === 'inferred';

  /** Legend rows generated from the same style objects that draw the lines. */
  const legendRows = useMemo(() => {
    const rows: Array<{ key: string; color: string; dashed: boolean; label: string }> = [];
    const byPrice = new Map<string, LevelDef[]>();
    levelDefs.forEach(l => {
      const k = l.price.toFixed(dec);
      byPrice.set(k, [...(byPrice.get(k) ?? []), l]);
    });
    byPrice.forEach((group, price) => {
      const severity = (k: string) => (k === 'stop' ? 3 : k === 'exit' ? 2 : k === 'target' ? 1 : 0);
      const lead = [...group].sort((a, b) => severity(b.key) - severity(a.key))[0];
      const label = group.map(l => (l.key === 'entry' ? L('כניסה', 'Entry')
        : l.key === 'stop' ? L('סטופ', 'Stop')
          : l.key === 'target' ? L('יעד', 'Target') : L('יציאה', 'Exit'))).join(' · ');
      const hasExitInGroup = group.some(l => l.key === 'exit');
      rows.push({
        key: group.map(l => l.key).join('+'),
        color: lead.color,
        dashed: Boolean(lead.dashed),
        label: `${label} ${price}${hasExitInGroup && approx ? ` (${L('משוער', 'approx.')})` : ''}`,
      });
    });
    return rows;
  }, [levelDefs, dec, approx, L]);

  const markerBadge = (
    key: string, x: number, y: number, color: string, label: string, priceText: string, timeSec?: number, above = true,
  ) => (
    <div
      key={key}
      style={{
        position: 'absolute', pointerEvents: 'none', zIndex: 4,
        left: x, top: y,
        transform: `translate(${x > (hostRef.current?.clientWidth ?? 0) - 150 ? '-100%' : '8px'}, ${above ? '-34px' : '14px'})`,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 7px', borderRadius: T.radius.sm,
        background: T.bg.card, border: `1px solid ${color}`,
        boxShadow: `0 0 0 3px ${T.bg.tertiary}`,
        color, fontFamily: MONO, fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap',
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.9 }}>{priceText}</span>
      {timeSec != null && (
        <span style={{ opacity: 0.75 }}>· {formatTimeInZone(timeSec * 1000, timeZone, 'en-GB')}</span>
      )}
    </div>
  );

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
        {jumpBtn(L('יציאה', 'Exit'), exitTime, outcomeColor, !hasExit)}
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
            transition: reducedMotion ? 'none' : 'background .16s ease',
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

        {/* Entry-time guide; it shares the zone's exact x anchor. */}
        {tradeXs && (
          <div aria-hidden style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 2,
            left: tradeXs.entry, top: 0, bottom: 0,
            borderLeft: `1px dashed ${colors.info}`,
            opacity: 0.72,
          }} />
        )}

        {/* symmetric entry / exit markers — same badge treatment, halo backed */}
        {tradeXs && markerYs.entry != null && markerBadge(
          'entry-marker', tradeXs.entry, markerYs.entry, colors.info,
          L('כניסה', 'Entry'), entry.toFixed(dec), entryTime, isLong,
        )}
        {tradeXs && tradeXs.exit != null && markerYs.exit != null && markerBadge(
          'exit-marker', tradeXs.exit, markerYs.exit, outcomeColor,
          `${approx ? '~ ' : ''}${L('יציאה', 'Exit')}`, exit.toFixed(dec), exitTime, !isLong,
        )}

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
            <span style={{ opacity: 0.9 }}>{b.title}</span>
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
            {held && (
              <>
                <span aria-hidden style={{ width: 1, height: 10, background: `${outcomeColor}55` }} />
                <span style={{ color: T.text.muted, fontWeight: 700 }}>{held}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* legend — single source; swatches come from the drawing styles */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
        padding: '8px 10px', borderTop: `1px solid ${T.border.subtle}`,
        fontSize: 9.5, color: T.text.muted, fontFamily: MONO, letterSpacing: 0.3,
      }}>
        <LegendItem color={colors.info} dashed label={L('זמן כניסה', 'Entry time')} />
        {legendRows.map(row => (
          <LegendItem key={row.key} color={row.color} dashed={row.dashed} label={row.label} />
        ))}
        {!hasExit && (
          <span style={{ opacity: 0.65 }}>{L('יציאה — לא ידועה', 'Exit — unknown')}</span>
        )}
        {overflow.map(b => (
          <span key={`ovf-${b.key}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: b.bg }} />
            {b.title} {b.price}
          </span>
        ))}
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
        {!hasTarget && (
          <span style={{ opacity: 0.6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden style={{ width: 14, height: 9, border: `1px dashed ${T.border.medium}` }} />
            {L('אזור רווח — לא הוגדר יעד', 'Reward zone — no target set')}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ opacity: 0.8 }}>
          {L(`השעות מוצגות ב-${timeZone} (${zoneOffsetLabel(Date.now(), timeZone)})`,
            `Times shown in ${timeZone} (${zoneOffsetLabel(Date.now(), timeZone)})`)}
        </span>
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
