import { useEffect, useMemo, useState } from 'react';
import { useLang } from '@/hooks/use-lang';
import { WORLD_LAND_PATH } from '@/lib/world-map-path';
import { ChevronDown, ChevronUp } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 * Session Clock — interactive world map of the four FX sessions.
 *   • Collapsible compact strip by default (does not dominate page)
 *   • Expanded view shows live UTC clock, day/night world map,
 *     market pins, and per-market local time / open / closed state.
 * ───────────────────────────────────────────────────────────── */

interface MarketDef {
  id: string;
  he: string;
  en: string;
  tz: string;
  flag: string;
  lon: number;
  lat: number;
  /** Local session window, in local hours. */
  open: number;
  close: number;
}

const MARKETS: MarketDef[] = [
  { id: 'sydney', he: 'סידני', en: 'Sydney', tz: 'Australia/Sydney', flag: '🇦🇺', lon: 151.21, lat: -33.87, open: 7, close: 16 },
  { id: 'tokyo', he: 'טוקיו', en: 'Tokyo', tz: 'Asia/Tokyo', flag: '🇯🇵', lon: 139.69, lat: 35.68, open: 9, close: 18 },
  { id: 'london', he: 'לונדון', en: 'London', tz: 'Europe/London', flag: '🇬🇧', lon: -0.13, lat: 51.51, open: 8, close: 17 },
  { id: 'newyork', he: 'ניו יורק', en: 'New York', tz: 'America/New_York', flag: '🇺🇸', lon: -74.01, lat: 40.71, open: 8, close: 17 },
];

const MAP_W = 1000;
const MAP_H = 500;

const projX = (lon: number) => ((lon + 180) / 360) * MAP_W;
const projY = (lat: number) => ((90 - lat) / 180) * MAP_H;

/** Offset of a time zone from UTC, in minutes, at a given instant. */
function tzOffsetMinutes(tz: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(at)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return Math.round((asUTC - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

interface MarketState {
  def: MarketDef;
  localLabel: string;
  localMinutes: number;
  localDow: number;
  isOpen: boolean;
  /** Minutes until the session closes (when open) or opens (when closed). */
  countdown: number;
}

function computeMarket(def: MarketDef, now: Date): MarketState {
  const off = tzOffsetMinutes(def.tz, now);
  const local = new Date(now.getTime() + off * 60000);
  const dow = local.getUTCDay();
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const openMin = def.open * 60;
  const closeMin = def.close * 60;
  const weekday = dow >= 1 && dow <= 5;
  const isOpen = weekday && minutes >= openMin && minutes < closeMin;

  let countdown = 0;
  if (isOpen) {
    countdown = closeMin - minutes;
  } else {
    for (let d = 0; d <= 7; d++) {
      const candDow = (dow + d) % 7;
      if (candDow === 0 || candDow === 6) continue;
      const delta = d * 1440 + openMin - minutes;
      if (delta > 0) { countdown = delta; break; }
    }
  }

  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return { def, localLabel: `${hh}:${mm}`, localMinutes: minutes, localDow: dow, isOpen, countdown };
}

function fmtCountdown(mins: number, isRTL: boolean): string {
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}${isRTL ? ' ימים' : 'd'}`);
  if (d > 0 || h > 0) parts.push(`${h}${isRTL ? ' ש׳' : 'h'}`);
  parts.push(`${m}${isRTL ? ' דק׳' : 'm'}`);
  return parts.join(' ');
}

interface Props {
  T?: any;
  compact?: boolean;
}

export default function SessionClock({ T, compact: compactProp = true }: Props) {
  const { lang } = useLang();
  const isRTL = lang === 'he';
  const [now, setNow] = useState(() => new Date());
  const [focus, setFocus] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compactProp);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const PANEL = T?.bg?.card ?? '#0a1420';
  const SURFACE = T?.bg?.tertiary ?? 'rgba(255,255,255,0.04)';
  const BORDER = T?.border?.medium ?? 'rgba(255,255,255,0.10)';
  const BORDER_SOFT = T?.border?.subtle ?? 'rgba(255,255,255,0.06)';
  const TEXT = T?.text?.primary ?? '#f1f5f9';
  const TEXT_MUTED = T?.text?.secondary ?? '#94a3b8';
  const TEXT_DIM = T?.text?.muted ?? '#64748b';
  const ACCENT = T?.accent?.cyan ?? '#00f2ff';
  const OPEN_C = T?.accent?.green ?? '#22c55e';

  /* Palette-aware map surfaces — keeps the globe readable on light themes
     instead of painting hard black bands down both sides. */
  const isLightTheme = useMemo(() => {
    const raw = String(T?.bg?.primary ?? T?.bg?.card ?? '#0a1420').trim();
    const hex = raw.startsWith('#') ? raw.slice(1) : '';
    if (hex.length !== 6 && hex.length !== 3) return false;
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
  }, [T]);

  /** Accent-tinted alpha — keeps the map in the active palette instead of a
      washed-out grey slab. Falls back to the raw colour for non-hex tokens. */
  const withA = (color: string, a: number): string => {
    const raw = String(color ?? '').trim();
    if (!raw.startsWith('#')) return raw;
    const hex = raw.slice(1);
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    if (full.length !== 6) return raw;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  const OCEAN = withA(ACCENT, isLightTheme ? 0.07 : 0.05);
  const LAND = withA(ACCENT, isLightTheme ? 0.48 : 0.3);
  const LAND_STROKE = withA(ACCENT, isLightTheme ? 0.75 : 0.5);
  const GRID_C = withA(ACCENT, isLightTheme ? 0.18 : 0.14);
  const NIGHT_C = isLightTheme ? '#1e293b' : '#00060f';
  const NIGHT_O = isLightTheme ? 0.14 : 0.5;

  const markets = useMemo(
    () => MARKETS.map(m => computeMarket(m, now)),
    [now],
  );

  const utcLabel = useMemo(() => {
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [now]);

  const localLabel = useMemo(
    () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now),
    [now],
  );
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /** Sub-solar longitude — drives the night overlay. */
  const nightBands = useMemo(() => {
    const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    const solarLon = 180 - (utcMin / 1440) * 360; // longitude where it is local noon
    const nightCenter = solarLon + 180;
    const norm = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;
    const start = norm(nightCenter - 90);
    const end = norm(nightCenter + 90);
    const x1 = projX(start);
    const x2 = projX(end);
    return x1 <= x2
      ? [{ x: x1, w: x2 - x1 }]
      : [{ x: 0, w: x2 }, { x: x1, w: MAP_W - x1 }];
  }, [now]);

  const openCount = markets.filter(m => m.isOpen).length;
  const nextUp = markets.filter(m => !m.isOpen).sort((a, b) => a.countdown - b.countdown)[0];
  const focused = markets.find(m => m.def.id === focus) ?? null;
  const pinnedMarket = markets.find(m => m.def.id === pinned) ?? null;

  const ExpandIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="rounded-xl overflow-hidden"
      style={{ background: PANEL, border: `1px solid ${BORDER}`, fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ── Compact header strip ── */}
      <div
        className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-3 md:px-4 md:py-2.5"
        style={{ background: SURFACE }}
      >
        {/* Clock block */}
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: TEXT_DIM }}>
              {isRTL ? 'שעון סשנים' : 'Session Clock'}
            </div>
            <div
              className="text-[22px] md:text-[26px] font-bold leading-none tabular-nums"
              style={{ color: TEXT, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.01em' }}
            >
              {utcLabel} <span style={{ fontSize: '0.42em', color: TEXT_DIM, letterSpacing: '0.12em' }}>UTC</span>
            </div>
            <div className="text-[10px] leading-none" style={{ color: TEXT_DIM }}>
              {isRTL ? 'מקומי' : 'Local'} {localLabel} · {localZone}
            </div>
          </div>
        </div>

        {/* Market chips */}
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
          {markets.map(m => {
            const active = focus === m.def.id;
            return (
              <button
                key={m.def.id}
                type="button"
                onMouseEnter={() => setFocus(m.def.id)}
                onMouseLeave={() => setFocus(null)}
                onClick={() => setFocus(f => (f === m.def.id ? null : m.def.id))}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition"
                style={{
                  background: active ? `${ACCENT}14` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? `${ACCENT}55` : BORDER_SOFT}`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: m.isOpen ? OPEN_C : TEXT_DIM,
                    boxShadow: m.isOpen ? `0 0 8px ${OPEN_C}` : 'none',
                  }}
                />
                <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: m.isOpen ? TEXT : TEXT_MUTED }}>
                  {m.def[isRTL ? 'he' : 'en']}
                </span>
                <span
                  className="text-[11px] tabular-nums whitespace-nowrap"
                  style={{ color: m.isOpen ? TEXT : TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {m.localLabel}
                </span>
                <span className="text-[9px] hidden sm:inline" style={{ color: TEXT_DIM }}>
                  {m.isOpen
                    ? (isRTL ? `נסגר בעוד ${fmtCountdown(m.countdown, true)}` : `closes ${fmtCountdown(m.countdown, false)}`)
                    : (isRTL ? `נפתח בעוד ${fmtCountdown(m.countdown, true)}` : `opens ${fmtCountdown(m.countdown, false)}`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status + expand toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-[10px] leading-tight" style={{ color: TEXT_MUTED }}>
            {openCount > 0 ? (
              <span>
                <span style={{ color: OPEN_C, fontWeight: 700 }}>{openCount}</span>{' '}
                {isRTL ? 'סשנים פעילים' : `active session${openCount > 1 ? 's' : ''}`}
              </span>
            ) : nextUp ? (
              <span>
                {isRTL ? 'הבא: ' : 'Next: '}{' '}
                <b style={{ color: TEXT }}>{nextUp.def[isRTL ? 'he' : 'en']}</b>{' '}
                {fmtCountdown(nextUp.countdown, isRTL)}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition"
            style={{ color: ACCENT, border: `1px solid ${ACCENT}44`, background: `${ACCENT}0d` }}
          >
            {expanded ? (isRTL ? 'צמצם' : 'Collapse') : (isRTL ? 'הרחב' : 'Expand')}
            <ExpandIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Expanded map view ── */}
      {expanded && (
        <div className="flex flex-col md:flex-row">
          <div className="relative flex-1 min-w-0 p-4 md:p-5">
            {/* World map */}
            <div className="relative" style={{ width: '100%' }}>
              <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="sc-night" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={NIGHT_C} stopOpacity="0" />
                    <stop offset="28%" stopColor={NIGHT_C} stopOpacity={NIGHT_O} />
                    <stop offset="72%" stopColor={NIGHT_C} stopOpacity={NIGHT_O} />
                    <stop offset="100%" stopColor={NIGHT_C} stopOpacity="0" />
                  </linearGradient>
                  <clipPath id="sc-frame">
                    <rect x={0} y={0} width={MAP_W} height={MAP_H} rx={14} />
                  </clipPath>
                </defs>

                <g clipPath="url(#sc-frame)">
                  {/* Ocean */}
                  <rect x={0} y={0} width={MAP_W} height={MAP_H} fill={OCEAN} />

                  {/* Graticule */}
                  {[-60, -30, 0, 30, 60].map(lat => (
                    <line key={`la${lat}`} x1={0} x2={MAP_W} y1={projY(lat)} y2={projY(lat)} stroke={GRID_C} strokeWidth={1} />
                  ))}
                  {[-120, -60, 0, 60, 120].map(lon => (
                    <line key={`lo${lon}`} y1={0} y2={MAP_H} x1={projX(lon)} x2={projX(lon)} stroke={GRID_C} strokeWidth={1} />
                  ))}

                  {/* Land */}
                  <path d={WORLD_LAND_PATH} fill={LAND} stroke={LAND_STROKE} strokeWidth={0.8} />

                  {/* Night side */}
                  {nightBands.map((b, i) => (
                    <rect key={i} x={b.x} y={0} width={b.w} height={MAP_H} fill="url(#sc-night)" pointerEvents="none" />
                  ))}
                </g>

                <rect
                  x={0.5} y={0.5} width={MAP_W - 1} height={MAP_H - 1} rx={14}
                  fill="none" stroke={BORDER_SOFT} strokeWidth={1} pointerEvents="none"
                />

                {/* Market pins */}
                {markets.map(m => {
                  const x = projX(m.def.lon);
                  const y = projY(m.def.lat);
                  const active = focus === null || focus === m.def.id;
                  const c = m.isOpen ? OPEN_C : TEXT_DIM;
                  return (
                    <g
                      key={m.def.id}
                      role="button"
                      tabIndex={0}
                      aria-label={m.def[isRTL ? 'he' : 'en']}
                      style={{ cursor: 'pointer', opacity: active ? 1 : 0.35, transition: 'opacity .2s' }}
                      onMouseEnter={() => setFocus(m.def.id)}
                      onMouseLeave={() => setFocus(null)}
                      onClick={() => setPinned(p => (p === m.def.id ? null : m.def.id))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPinned(p => (p === m.def.id ? null : m.def.id));
                        }
                      }}
                    >
                      {m.isOpen && (
                        <circle cx={x} cy={y} r={16} fill="none" stroke={OPEN_C} strokeWidth={1.5} opacity={0.5}>
                          <animate attributeName="r" values="12;24;12" dur="3s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <clipPath id={`sc-flag-${m.def.id}`}>
                        <circle cx={x} cy={y} r={11} />
                      </clipPath>
                      <circle cx={x} cy={y} r={18} fill="transparent" />
                      <image
                        href={FLAG_SRC[m.def.id]}
                        x={x - 11} y={y - 11} width={22} height={22}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#sc-flag-${m.def.id})`}
                        opacity={m.isOpen ? 1 : 0.55}
                        pointerEvents="none"
                      />
                      <circle
                        cx={x} cy={y} r={11} fill="none"
                        stroke={m.isOpen ? OPEN_C : PANEL} strokeWidth={2} opacity={m.isOpen ? 0.95 : 0.7}
                      />
                      <text
                        x={x}
                        y={y - 17}
                        textAnchor="middle"
                        style={{ fontSize: 17, fill: m.isOpen ? TEXT : TEXT_DIM, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {m.def[isRTL ? 'he' : 'en']} {m.localLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Click-through detail card, anchored to the pin */}
              {pinnedMarket && (
                <div
                  className="absolute z-20 rounded-xl shadow-2xl"
                  style={{
                    left: `${(projX(pinnedMarket.def.lon) / MAP_W) * 100}%`,
                    top: `${(projY(pinnedMarket.def.lat) / MAP_H) * 100}%`,
                    transform: 'translate(-50%, calc(-100% - 18px))',
                    width: 188,
                    background: PANEL,
                    border: `1px solid ${pinnedMarket.isOpen ? `${OPEN_C}66` : BORDER}`,
                    padding: '10px 12px',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: pinnedMarket.isOpen ? OPEN_C : TEXT_DIM,
                        boxShadow: pinnedMarket.isOpen ? `0 0 8px ${OPEN_C}` : 'none',
                      }}
                    />
                    <span className="text-[12px] font-semibold" style={{ color: TEXT }}>
                      {pinnedMarket.def.flag} {pinnedMarket.def[isRTL ? 'he' : 'en']}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPinned(null)}
                      aria-label={isRTL ? 'סגור' : 'Close'}
                      className="ms-auto text-[13px] leading-none px-1"
                      style={{ color: TEXT_DIM }}
                    >
                      ×
                    </button>
                  </div>
                  <div
                    className="mt-1.5 text-[18px] font-bold tabular-nums leading-none"
                    style={{ color: TEXT, fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {pinnedMarket.localLabel}
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: pinnedMarket.isOpen ? OPEN_C : TEXT_DIM }}>
                    {pinnedMarket.isOpen ? (isRTL ? 'פתוח' : 'Open') : (isRTL ? 'סגור' : 'Closed')}
                    {' · '}
                    {pinnedMarket.isOpen
                      ? (isRTL ? `נסגר בעוד ${fmtCountdown(pinnedMarket.countdown, true)}` : `closes in ${fmtCountdown(pinnedMarket.countdown, false)}`)
                      : (isRTL ? `נפתח בעוד ${fmtCountdown(pinnedMarket.countdown, true)}` : `opens in ${fmtCountdown(pinnedMarket.countdown, false)}`)}
                  </div>
                  <div className="mt-1.5 text-[10px]" style={{ color: TEXT_MUTED }}>
                    {isRTL ? 'סשן' : 'Session'} {String(pinnedMarket.def.open).padStart(2, '0')}:00–
                    {String(pinnedMarket.def.close).padStart(2, '0')}:00 · {pinnedMarket.def.tz}
                  </div>
                  <span
                    className="absolute"
                    style={{
                      left: '50%', bottom: -6, width: 10, height: 10,
                      transform: 'translateX(-50%) rotate(45deg)',
                      background: PANEL,
                      borderRight: `1px solid ${pinnedMarket.isOpen ? `${OPEN_C}66` : BORDER}`,
                      borderBottom: `1px solid ${pinnedMarket.isOpen ? `${OPEN_C}66` : BORDER}`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Status line */}
            <div className="mt-3 text-[11px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              {focused ? (
                <span>
                  <b style={{ color: focused.isOpen ? OPEN_C : TEXT }}>{focused.def[isRTL ? 'he' : 'en']}</b>{' '}
                  {focused.isOpen
                    ? (isRTL ? `פתוח · נסגר בעוד ${fmtCountdown(focused.countdown, true)}` : `open · closes in ${fmtCountdown(focused.countdown, false)}`)
                    : (isRTL ? `סגור · נפתח בעוד ${fmtCountdown(focused.countdown, true)}` : `closed · opens in ${fmtCountdown(focused.countdown, false)}`)}
                </span>
              ) : openCount > 0 ? (
                <span>
                  <span style={{ color: OPEN_C, fontWeight: 700 }}>{openCount}</span>{' '}
                  {isRTL ? 'סשנים פעילים כרגע' : `session${openCount > 1 ? 's' : ''} currently active`}
                </span>
              ) : nextUp ? (
                <span>
                  {isRTL ? 'כל השווקים סגורים. ' : 'All markets closed. '}
                  <b style={{ color: TEXT }}>{nextUp.def[isRTL ? 'he' : 'en']}</b>{' '}
                  {isRTL ? `נפתח בעוד ${fmtCountdown(nextUp.countdown, true)}` : `opens in ${fmtCountdown(nextUp.countdown, false)}`}
                </span>
              ) : null}
            </div>
          </div>

          {/* ── Market list ── */}
          <div
            className="w-full md:w-[230px] shrink-0 p-4 md:p-4"
            style={{ background: SURFACE, borderInlineStart: `1px solid ${BORDER_SOFT}` }}
          >
            <div className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: TEXT_DIM }}>
              {isRTL ? 'שווקים' : 'Markets'}
            </div>
            <div className="flex flex-col gap-1.5">
              {markets.map(m => {
                const active = focus === m.def.id;
                return (
                  <button
                    key={m.def.id}
                    type="button"
                    onMouseEnter={() => setFocus(m.def.id)}
                    onMouseLeave={() => setFocus(null)}
                    onClick={() => setFocus(f => (f === m.def.id ? null : m.def.id))}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition"
                    style={{
                      background: active ? `${ACCENT}14` : 'transparent',
                      border: `1px solid ${active ? `${ACCENT}55` : 'transparent'}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: m.isOpen ? OPEN_C : TEXT_DIM,
                        boxShadow: m.isOpen ? `0 0 8px ${OPEN_C}` : 'none',
                      }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] font-medium truncate" style={{ color: m.isOpen ? TEXT : TEXT_MUTED }}>
                        {m.def[isRTL ? 'he' : 'en']}
                      </span>
                      <span className="block text-[10px]" style={{ color: TEXT_DIM }}>
                        {m.isOpen
                          ? (isRTL ? `נסגר בעוד ${fmtCountdown(m.countdown, true)}` : `closes in ${fmtCountdown(m.countdown, false)}`)
                          : (isRTL ? `נפתח בעוד ${fmtCountdown(m.countdown, true)}` : `opens in ${fmtCountdown(m.countdown, false)}`)}
                      </span>
                    </span>
                    <span
                      className="text-[12px] tabular-nums"
                      style={{ color: m.isOpen ? TEXT : TEXT_DIM, fontFamily: "'IBM Plex Mono', monospace" }}
                    >
                      {m.localLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
