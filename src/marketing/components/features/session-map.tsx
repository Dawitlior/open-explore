import { useEffect, useState } from 'react'
import { WORLD_LAND_PATH } from './world-path'

/* ============================================================================
   SESSION WORLD MAP — a live "Session Clock" over a dark, realistic world map,
   the four FX sessions pinned as flag markers whose city dots blink while their
   session is open, and a MARKETS side-panel that lights up in real time.
   A dark charcoal panel framed on the pale page — the site's premium pattern.

   The land silhouette (world-path.ts, land-50m simplified) is pre-rendered with
   the SAME equirectangular projection as project() below, so every flag lands
   exactly on its city. No map library at runtime.
   ========================================================================== */

type Session = {
  key: string
  city: string
  tz: string
  flag: string
  lat: number
  lng: number
  color: string
  open: number // UTC hour, inclusive
  close: number // UTC hour, exclusive (wraps midnight when close < open)
}

const SESSIONS: Session[] = [
  { key: 'tyo', city: 'Tokyo', tz: 'Asia/Tokyo', flag: '/flags/jp.svg', lat: 35.68, lng: 139.69, color: '#e0a53a', open: 0, close: 9 },
  { key: 'syd', city: 'Sydney', tz: 'Australia/Sydney', flag: '/flags/au.svg', lat: -33.87, lng: 151.21, color: '#8b5cf6', open: 21, close: 6 },
  { key: 'ldn', city: 'London', tz: 'Europe/London', flag: '/flags/gb.svg', lat: 51.51, lng: -0.13, color: '#0ea5e9', open: 7, close: 16 },
  { key: 'nyc', city: 'New York', tz: 'America/New_York', flag: '/flags/us.svg', lat: 40.71, lng: -74.01, color: '#1a1d24', open: 12, close: 21 },
]
const byKey = Object.fromEntries(SESSIONS.map((s) => [s.key, s])) as Record<string, Session>

function isOpen(hour: number, s: Session) {
  return s.open < s.close ? hour >= s.open && hour < s.close : hour >= s.open || hour < s.close
}
// Equirectangular projection onto the 800×400 map (matches world-path.ts).
function project(lat: number, lng: number) {
  return { x: (lng + 180) * (800 / 360), y: (90 - lat) * (400 / 180) }
}
const fmt = (now: Date, tz: string, withSeconds = false) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}), hour12: false, timeZone: tz,
  }).format(now)

export function SessionWorldMap() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const utcHour = now.getUTCHours()
  const h = utcHour + now.getUTCMinutes() / 60
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  let next: { city: string; d: number } | null = null
  for (const s of SESSIONS) {
    if (isOpen(utcHour, s)) continue
    let d = s.open - h
    if (d <= 0) d += 24
    if (!next || d < next.d) next = { city: s.city, d }
  }
  const nextH = next ? Math.floor(next.d) : 0
  const nextM = next ? Math.round((next.d - nextH) * 60) : 0
  const nextLabel = next ? `${nextH}h ${String(nextM).padStart(2, '0')}m` : ''

  const L = project(byKey.ldn.lat, byKey.ldn.lng)

  return (
    <div className="relative w-full">
      {/* the map is drawn straight onto the page — no panel, no border, no hard
         edge. A whisper of cool glow gives it presence without a block. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ background: 'radial-gradient(58% 62% at 52% 46%, rgba(26,29,36,0.06), transparent 72%)' }} />

      <div className="relative grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_282px]">
        {/* ── MAP ─────────────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Session Clock overlay — dark ink on the page, not on a panel */}
          <div className="relative z-20">
            <div className="text-[14px] font-semibold text-ink-mute">Session Clock</div>
            <div className="tnum mt-0.5 text-[clamp(2rem,4.6vw,2.9rem)] font-bold leading-none text-ink">
              {fmt(now, 'UTC', true)} <span className="text-ink-faint">UTC</span>
            </div>
            <div className="mt-2 text-[13px] text-ink-mute">
              Local {fmt(now, localTz)} · {localTz.replace('_', ' ')}
            </div>
          </div>

          {/* map surface — continents drawn on the page, edges feathered so the
             graphic dissolves into the canvas instead of ending on a hard line */}
          <div className="relative mt-5 aspect-[2/1] w-full">
            <svg
              viewBox="0 0 800 400"
              preserveAspectRatio="xMidYMid slice"
              className="absolute inset-0 h-full w-full"
              aria-label="World trading sessions"
            >
              <defs>
                {/* realistic ocean — soft blue, deeper toward the equator */}
                <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#d3ecf9" />
                  <stop offset="0.5" stopColor="#b2d9f0" />
                  <stop offset="1" stopColor="#a0cfeb" />
                </linearGradient>
                {/* realistic land — green fading to a warm yellow-green */}
                <linearGradient id="land-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#cfe0a3" />
                  <stop offset="0.55" stopColor="#b3d17f" />
                  <stop offset="1" stopColor="#9cc267" />
                </linearGradient>
              </defs>
              {/* ocean base */}
              <rect x="0" y="0" width="800" height="400" fill="url(#ocean)" />
              {/* faint graticule over the water */}
              {[133, 267, 400, 533, 667].map((x) => (
                <line key={`v${x}`} x1={x} y1={0} x2={x} y2={400} stroke="#ffffff" strokeWidth={1} strokeDasharray="2 10" opacity={0.35} />
              ))}
              {[100, 200, 300].map((y) => (
                <line key={`h${y}`} x1={0} y1={y} x2={800} y2={y} stroke="#ffffff" strokeWidth={1} strokeDasharray="2 10" opacity={0.28} />
              ))}
              {/* realistic continents */}
              <path d={WORLD_LAND_PATH} fill="url(#land-grad)" stroke="#7fa14e" strokeWidth={0.5} strokeOpacity={0.65} strokeLinejoin="round" />
              {/* relay lines from London → NY / Tokyo / Sydney */}
              {(['nyc', 'tyo', 'syd'] as const).map((k) => {
                const p = project(byKey[k].lat, byKey[k].lng)
                return <line key={k} x1={L.x} y1={L.y} x2={p.x} y2={p.y} stroke="#0e7490" strokeWidth={1} strokeDasharray="2 7" strokeLinecap="round" opacity={0.5} />
              })}
            </svg>

            {/* canvas-coloured edge vignette — dissolves the map into the page on
               all four sides so the realistic colours never read as a hard block */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-[5]"
              style={{
                background:
                  'linear-gradient(to bottom, var(--color-canvas) 0%, transparent 11%, transparent 89%, var(--color-canvas) 100%),' +
                  'linear-gradient(to right, var(--color-canvas) 0%, transparent 7%, transparent 93%, var(--color-canvas) 100%)',
              }}
            />

            {/* flag markers with blinking city dots */}
            {SESSIONS.map((s) => {
              const p = project(s.lat, s.lng)
              const live = isOpen(utcHour, s)
              return (
                <div
                  key={s.key}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${(p.x / 800) * 100}%`, top: `${(p.y / 400) * 100}%` }}
                >
                  {live && (
                    <>
                      <span aria-hidden className="marker-ping absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: s.color + '33' }} />
                      <span aria-hidden className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ boxShadow: `0 0 20px 4px ${s.color}55` }} />
                    </>
                  )}
                  <div
                    className="relative overflow-hidden rounded-full border-[2.5px] border-white"
                    style={{
                      width: live ? 38 : 30,
                      height: live ? 38 : 30,
                      opacity: live ? 1 : 0.78,
                      boxShadow: live
                        ? `0 0 0 2px ${s.color}, 0 6px 16px -6px ${s.color}`
                        : '0 0 0 1px rgba(17,19,24,0.10), 0 4px 12px -5px rgba(17,19,24,0.4)',
                    }}
                  >
                    <img src={s.flag} alt={s.city} className="h-full w-full object-cover" draggable={false} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── MARKETS panel — light, on the page, hairline divider only ────── */}
        <div className="mt-8 border-t border-line pt-6 md:mt-0 md:border-t-0 md:border-l md:pt-1 md:pl-7">
          <div className="micro tracking-[0.22em] text-ink-faint">Markets</div>
          <div className="mt-5 flex flex-col gap-1">
            {SESSIONS.map((s) => {
              const live = isOpen(utcHour, s)
              return (
                <div key={s.key} className={'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ' + (live ? 'bg-canvas-deep' : '')}>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: s.color }} />}
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: live ? s.color : '#cdd2dc' }} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-ink">{s.city}</div>
                    <div className="tnum text-[13px] text-ink-mute">{fmt(now, s.tz)}</div>
                  </div>
                  {live && (
                    <span className="ml-auto rounded-md px-2 py-1 text-[10.5px] font-bold tracking-wide" style={{ backgroundColor: s.color + '1a', color: s.color }}>
                      LIVE
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 border-t border-line pt-4 text-[13.5px] text-ink-mute">
            Next: <span className="font-bold text-ink">{next?.city}</span> in {nextLabel}
          </div>
        </div>
      </div>
    </div>
  )
}
