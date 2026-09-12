import { useEffect, useRef, useState } from 'react'
import {
  CalendarClock, Globe2, Radar, Bell, Zap, ArrowRight, ArrowUpRight,
  Sun, Moon, Sunrise, Activity, Landmark, Filter, Check, ShieldCheck, TrendingUp,
} from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'
import { FeatureIntro, Sparkles } from './features/blocks'
import { SessionWorldMap } from './features/session-map'

/* ============================================================================
   ECONOMIC CALENDAR (/features/economic-calendar) — a map of the trading day,
   not a table of dates. Every section is built as its own distinct shape so no
   two read alike: a live dark world map, a session-overlap timeline, a feed
   that prints releases in real time, a phone catching platform pushes, an
   interactive noise→signal market filter, and two fully-isolated CTAs.
   ========================================================================== */

const IMPACT = {
  high: { label: 'High', dot: '#e5484d', tint: 'bg-rose-soft text-rose' },
  med: { label: 'Med', dot: '#e0a53a', tint: 'bg-amber-soft text-amber' },
  low: { label: 'Low', dot: '#1a1d24', tint: 'bg-teal-soft text-teal' },
} as const
type Imp = keyof typeof IMPACT

/* live countdown to the next :30 release slot */
function useNextRelease() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const target = new Date(now)
  target.setUTCSeconds(0, 0)
  target.setUTCMinutes(now.getUTCMinutes() < 30 ? 30 : 60)
  const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  const mm = String(Math.floor(diff / 60)).padStart(2, '0')
  const ss = String(diff % 60).padStart(2, '0')
  const label = `${String(target.getUTCHours() % 24).padStart(2, '0')}:${String(target.getUTCMinutes() % 60).padStart(2, '0')} UTC`
  return { mmss: `${mm}:${ss}`, label }
}

const GAP_SPARKS = [
  { top: '10%', left: '5%', size: 12, delay: '0s' },
  { top: '16%', left: '93%', size: 10, delay: '1.1s' },
  { top: '88%', left: '7%', size: 11, delay: '0.7s' },
  { top: '92%', left: '92%', size: 12, delay: '1.7s' },
]

/* ── HERO — custom, map-led ────────────────────────────────────────────────── */
function EconHero() {
  return (
    <section className="relative overflow-hidden px-6 pt-36 pb-10 md:px-10 md:pt-40">
      <HoloGlow className="!inset-x-[10%] !top-[6%] !bottom-auto !h-[320px]" opacity={0.22} blur={90} />
      <div className="relative mx-auto max-w-[820px] text-center">
        <span data-reveal className="micro inline-flex items-center gap-2 font-semibold text-teal">
          <CalendarClock className="h-3.5 w-3.5" strokeWidth={2} /> Economic Calendar
        </span>
        <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.4rem,5.2vw,4rem)] leading-[1.03] font-bold text-ink">
          The market never sleeps. <br className="hidden sm:block" />
          <span className="text-teal">So neither does your calendar.</span>
        </h1>
        <p data-reveal className="mx-auto mt-6 max-w-[560px] text-[16.5px] leading-[1.65] text-ink-mute">
          Watch the trading day travel the planet — Sydney to Tokyo to London to New York — and see every
          market-moving release land the moment it matters, all in one live view.
        </p>
        <div data-reveal className="mx-auto mt-9 flex max-w-[380px] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center [&>a]:w-full [&>a]:justify-center sm:[&>a]:w-auto">
          <CTA href="/signup">Start free</CTA>
          <CTA href="/pricing" variant="secondary">See plans</CTA>
        </div>
      </div>

      <div data-reveal className="relative mx-auto mt-14 max-w-[1040px]">
        <SessionWorldMap />
      </div>
    </section>
  )
}

/* ── 24-HOUR SESSION TIMELINE — native overlap viz ─────────────────────────── */
const LANES: { city: string; color: string; segs: [number, number][]; icon: typeof Sun }[] = [
  { city: 'Sydney', color: '#a78bfa', segs: [[21, 24], [0, 6]], icon: Moon },
  { city: 'Tokyo', color: '#e0a53a', segs: [[0, 9]], icon: Sunrise },
  { city: 'London', color: '#0ea5e9', segs: [[7, 16]], icon: Sun },
  { city: 'New York', color: '#1a1d24', segs: [[12, 21]], icon: Activity },
]
const pct = (h: number) => (h / 24) * 100

function SessionTimeline() {
  const [nowH, setNowH] = useState(() => new Date().getUTCHours() + new Date().getUTCMinutes() / 60)
  useEffect(() => {
    const id = setInterval(() => setNowH(new Date().getUTCHours() + new Date().getUTCMinutes() / 60), 60_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="relative rounded-3xl border border-line bg-surface p-6 elev-2 md:p-8">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink">The trading day, in UTC</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-semibold text-ink-mute">
          <span className="h-2 w-2 rounded-full bg-[#0ea5e9]" /> London × NY overlap
        </span>
      </div>
      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 rounded-lg" style={{ left: `${pct(12)}%`, width: `${pct(4)}%`, background: 'linear-gradient(180deg, rgba(14,165,233,0.14), rgba(14,165,233,0.05))' }} />
        <div className="pointer-events-none absolute -top-1 bottom-6 z-10 w-px bg-ink/40" style={{ left: `${pct(nowH)}%` }}>
          <span className="absolute -top-1 -left-[3px] h-1.5 w-1.5 rounded-full bg-ink" />
        </div>
        <div className="relative flex flex-col gap-2.5">
          {LANES.map((lane) => (
            <div key={lane.city} className="flex items-center gap-3">
              <span className="flex w-[92px] shrink-0 items-center gap-2 text-[12.5px] font-semibold text-ink">
                <lane.icon className="h-3.5 w-3.5" strokeWidth={2} style={{ color: lane.color }} />
                {lane.city}
              </span>
              <div className="relative h-6 flex-1 rounded-lg bg-canvas">
                {lane.segs.map(([a, b], i) => (
                  <div key={i} className="absolute inset-y-0 rounded-md" style={{ left: `${pct(a)}%`, width: `${pct(b - a)}%`, background: lane.color, opacity: 0.85 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="relative mt-2 ml-[104px] h-4">
          {[0, 6, 12, 18, 24].map((hh) => (
            <span key={hh} className="tnum absolute -translate-x-1/2 text-[10.5px] text-ink-faint" style={{ left: `${pct(hh)}%` }}>
              {String(hh % 24).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── THE HOT LIST — a feed that prints releases in real time ────────────────── */
const FEED_POOL: { cur: string; title: string; impact: Imp }[] = [
  { cur: 'USD', title: 'CPI (YoY)', impact: 'high' },
  { cur: 'USD', title: 'Non-Farm Payrolls', impact: 'high' },
  { cur: 'EUR', title: 'ECB Rate Decision', impact: 'high' },
  { cur: 'GBP', title: 'BoE Gov Speaks', impact: 'high' },
  { cur: 'USD', title: 'ISM Services PMI', impact: 'med' },
  { cur: 'EUR', title: 'German IFO', impact: 'med' },
  { cur: 'AUD', title: 'Employment Change', impact: 'med' },
  { cur: 'JPY', title: 'Tankan Index', impact: 'low' },
  { cur: 'CAD', title: 'GDP m/m', impact: 'med' },
  { cur: 'NZD', title: 'Trade Balance', impact: 'low' },
]
type FeedItem = { id: number; time: string; cur: string; title: string; impact: Imp }
const nowHHMM = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date())

function LiveHotList() {
  const { mmss, label } = useNextRelease()
  const idRef = useRef(0)
  const make = (): FeedItem => {
    const p = FEED_POOL[Math.floor(Math.random() * FEED_POOL.length)]
    return { id: idRef.current++, time: nowHHMM(), ...p }
  }
  const [items, setItems] = useState<FeedItem[]>(() => Array.from({ length: 5 }, make))
  useEffect(() => {
    const id = setInterval(() => setItems((prev) => [make(), ...prev.slice(0, 4)]), 3200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.3} blur={70} />
      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface elev-3">
        <div className="flex items-center gap-3 border-b border-line bg-canvas px-5 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-soft text-rose"><Zap className="h-4.5 w-4.5" strokeWidth={2} /></span>
          <div>
            <div className="text-[12.5px] font-bold text-ink">Next release in</div>
            <div className="text-[11.5px] text-ink-mute">{label} · high impact</div>
          </div>
          <span className="tnum ml-auto rounded-lg bg-ink px-3 py-1.5 text-[15px] font-bold text-white">{mmss}</span>
        </div>
        <div className="flex flex-col">
          {items.map((e, i) => {
            const im = IMPACT[e.impact]
            return (
              <div key={e.id} className={'feed-in relative flex items-center gap-3 border-b border-line px-5 py-3 ' + (i === 0 ? 'feed-flash' : '')}>
                {i === 0 && <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: im.dot }} />}
                <span className="tnum w-[42px] shrink-0 text-[12.5px] font-semibold text-ink-mute">{e.time}</span>
                <span className="w-[38px] shrink-0 rounded-md border border-line bg-canvas px-1.5 py-0.5 text-center text-[10.5px] font-bold text-ink-2">{e.cur}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{e.title}</span>
                {i === 0 && <span className="shrink-0 rounded bg-teal-soft px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-teal uppercase">New</span>}
                <span className={'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ' + im.tint}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: im.dot }} /> {im.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── REAL-TIME ALERTS — a phone catching platform pushes (novel shape) ──────── */
const PUSH_POOL = [
  { title: 'US CPI drops in 5 minutes', body: 'High-impact USD release. You’re long 2 USD pairs.', impact: 'high' as Imp },
  { title: 'FOMC decision in 30 minutes', body: 'Expect volatility across majors. Tighten stops.', impact: 'high' as Imp },
  { title: 'ECB press conference now live', body: 'EUR pairs moving. Watch your open EURUSD short.', impact: 'med' as Imp },
  { title: 'NFP tomorrow at 13:30 UTC', body: 'The month’s biggest print. Plan your session.', impact: 'high' as Imp },
]
type Push = { id: number; title: string; body: string; impact: Imp; ago: string }

function PhoneAlerts() {
  const idRef = useRef(0)
  const make = (): Push => ({ id: idRef.current++, ...PUSH_POOL[Math.floor(Math.random() * PUSH_POOL.length)], ago: 'now' })
  const [stack, setStack] = useState<Push[]>(() => [make(), { ...make(), ago: '2m ago' }])
  const [clock, setClock] = useState(() => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))
  useEffect(() => {
    const push = setInterval(() => setStack((prev) => [make(), { ...prev[0], ago: 'now' as string }].slice(0, 3)), 3000)
    const tick = setInterval(() => setClock(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())), 10_000)
    return () => { clearInterval(push); clearInterval(tick) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <Sparkles points={GAP_SPARKS} color="rgba(229,72,77,0.32)" />
      <div className="mx-auto max-w-[720px] text-center">
        <span className="micro inline-flex items-center gap-2 font-semibold text-rose">
          <Bell className="h-3.5 w-3.5" strokeWidth={2} /> Real-time alerts
        </span>
        <h3 data-animate="title" className="mt-4 font-display text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[1.12] font-bold text-ink">
          A heads-up the second <span className="text-rose">news is about to hit.</span>
        </h3>
        <p data-reveal className="mx-auto mt-5 max-w-[520px] text-[16px] leading-[1.65] text-ink-mute">
          Orca pushes the alert straight to your phone — minutes before the release, and only for the
          currencies you actually trade. Tighten up, stand aside, or trade it on purpose.
        </p>
      </div>

      {/* the phone */}
      <div className="relative mx-auto mt-12 w-[300px]">
        <HoloGlow className="!inset-x-[-22%] !inset-y-[-10%]" opacity={0.28} blur={80} />
        <div className="relative rounded-[46px] border border-[#20242e] bg-[#0c0f16] p-3 shadow-[0_40px_90px_-40px_rgba(9,12,18,0.9)]">
          <div className="relative overflow-hidden rounded-[36px]" style={{ background: 'linear-gradient(180deg,#141b2b 0%,#0f1420 60%,#0c0f16 100%)' }}>
            {/* dynamic island */}
            <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
            {/* lock screen */}
            <div className="px-5 pb-6 pt-14 text-center">
              <div className="text-[13px] font-medium text-white/55">Wednesday, 10 September</div>
              <div className="tnum text-[56px] font-bold leading-none text-white">{clock}</div>
            </div>
            {/* notification stack */}
            <div className="flex flex-col gap-2.5 px-3 pb-6">
              {stack.map((p, i) => (
                <div key={p.id} className={'flex items-start gap-2.5 rounded-2xl bg-white/[0.09] p-3 backdrop-blur-md ' + (i === 0 ? 'push-in' : '')} style={{ opacity: 1 - i * 0.16 }}>
                  <img src="/orca-icon.png" alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wide text-white/70 uppercase">Orca</span>
                      <span className="rounded px-1 py-0.5 text-[8.5px] font-bold uppercase" style={{ background: IMPACT[p.impact].dot + '33', color: '#fff' }}>{IMPACT[p.impact].label}</span>
                      <span className="ml-auto text-[10px] text-white/40">{p.ago}</span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-white">{p.title}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-white/60">{p.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* trust row */}
      <div className="mx-auto mt-10 flex max-w-[640px] flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {[
          { Icon: Zap, t: 'Fires minutes before each release' },
          { Icon: ShieldCheck, t: 'Flags if your positions are exposed' },
          { Icon: Filter, t: 'Only the currencies you trade' },
        ].map((x) => (
          <span key={x.t} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-ink-mute">
            <x.Icon className="h-4 w-4 text-rose" strokeWidth={2} /> {x.t}
          </span>
        ))}
      </div>
    </section>
  )
}

/* ── CTA #1 — SITUATIONAL AWARENESS. Embedded line-art radar, engraved on the
   page (no dark box); a calm vertical composition in the site palette. ─────── */
function SituationalAwarenessCTA() {
  const { mmss, label } = useNextRelease()
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      {/* faint engraved rings bleeding behind, tying it to the page */}
      <svg viewBox="0 0 600 600" aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 opacity-[0.5]">
        {[80, 150, 220, 290].map((r) => (
          <circle key={r} cx={300} cy={300} r={r} fill="none" stroke="#dfd7f2" strokeWidth={1} />
        ))}
        <line x1={300} y1={0} x2={300} y2={600} stroke="#e4ddf4" strokeWidth={1} />
        <line x1={0} y1={300} x2={600} y2={300} stroke="#e4ddf4" strokeWidth={1} />
      </svg>

      <div className="relative mx-auto flex max-w-[600px] flex-col items-center text-center">
        {/* line-art radar emblem with a subtle sweep */}
        <div className="relative h-[132px] w-[132px]">
          <svg viewBox="0 0 132 132" className="absolute inset-0 h-full w-full">
            {[20, 38, 56].map((r) => (
              <circle key={r} cx={66} cy={66} r={r} fill="none" stroke="#c9bff0" strokeWidth={1.25} />
            ))}
            <line x1={66} y1={8} x2={66} y2={124} stroke="#c9bff0" strokeWidth={1.25} />
            <line x1={8} y1={66} x2={124} y2={66} stroke="#c9bff0" strokeWidth={1.25} />
            <circle cx={96} cy={44} r={3} fill="#7c3aed" />
            <circle cx={48} cy={88} r={2.4} fill="#1a1d24" />
          </svg>
          <div className="radar-spin absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 0deg, rgba(124,58,237,0.22), transparent 60deg)', WebkitMaskImage: 'radial-gradient(circle, #000 56px, transparent 57px)', maskImage: 'radial-gradient(circle, #000 56px, transparent 57px)' }} />
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet" />
        </div>

        <span className="micro mt-8 inline-flex items-center gap-2 font-semibold text-violet">
          <Radar className="h-3.5 w-3.5" strokeWidth={2} /> Situational awareness
        </span>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
          Never get caught on the <span className="text-violet">wrong side of the news.</span>
        </h2>
        <p data-reveal className="mx-auto mt-5 max-w-[460px] text-[16px] leading-[1.65] text-ink-mute">
          Every high-impact release is on your radar before it fires. Orca watches the clock so you can
          watch the chart — and move before the market does.
        </p>

        {/* live countdown chip, in the page palette */}
        <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-3 elev-1">
          <span className="micro text-ink-faint">Next high-impact</span>
          <span className="tnum text-[18px] font-bold text-ink">{mmss}</span>
          <span className="tnum text-[12px] text-ink-mute">{label}</span>
        </div>

        <div data-reveal className="mt-8">
          <CTA href="/signup">Put it on my radar</CTA>
        </div>
      </div>
    </section>
  )
}

/* ── YOUR MARKETS ONLY — interactive noise→signal filter (creative shape) ──── */
const MK_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'NZD']
const MK_EVENTS: { t: string; cur: string; title: string; imp: Imp }[] = [
  { t: '12:30', cur: 'USD', title: 'CPI (YoY)', imp: 'high' },
  { t: '14:00', cur: 'USD', title: 'FOMC Rate Decision', imp: 'high' },
  { t: '08:00', cur: 'EUR', title: 'German IFO Climate', imp: 'med' },
  { t: '09:30', cur: 'GBP', title: 'BoE Gov Bailey Speaks', imp: 'high' },
  { t: '23:50', cur: 'JPY', title: 'Tankan Manufacturing', imp: 'low' },
  { t: '01:30', cur: 'AUD', title: 'Employment Change', imp: 'med' },
  { t: '13:30', cur: 'CAD', title: 'GDP m/m', imp: 'med' },
  { t: '15:00', cur: 'USD', title: 'ISM Services PMI', imp: 'high' },
  { t: '21:45', cur: 'NZD', title: 'Trade Balance', imp: 'low' },
  { t: '06:00', cur: 'GBP', title: 'Retail Sales m/m', imp: 'med' },
  { t: '11:00', cur: 'EUR', title: 'Core CPI Flash', imp: 'high' },
  { t: '18:00', cur: 'EUR', title: 'ECB Bulletin', imp: 'low' },
]

function MarketsFilter() {
  const [active, setActive] = useState<Set<string>>(() => new Set(['USD', 'GBP']))
  const toggle = (c: string) => setActive((prev) => {
    const n = new Set(prev)
    n.has(c) ? n.delete(c) : n.add(c)
    return n
  })
  const match = MK_EVENTS.filter((e) => active.has(e.cur)).length
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[760px] text-center">
        <span className="micro inline-flex items-center gap-2 font-semibold text-teal">
          <Filter className="h-3.5 w-3.5" strokeWidth={2} /> Your markets only
        </span>
        <h3 data-animate="title" className="mt-4 font-display text-[clamp(1.7rem,3.2vw,2.6rem)] leading-[1.12] font-bold text-ink">
          Turn the whole world’s calendar <span className="text-teal">into just your book.</span>
        </h3>
        <p data-reveal className="mx-auto mt-5 max-w-[520px] text-[16px] leading-[1.65] text-ink-mute">
          Tap the currencies you trade. The noise fades; only the releases that can actually move your
          positions stay sharp. Try it — it’s live.
        </p>
      </div>

      <div className="relative mx-auto mt-10 max-w-[820px] rounded-[26px] border border-line bg-surface p-5 elev-2 md:p-7">
        {/* currency chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {MK_CURRENCIES.map((c) => {
            const on = active.has(c)
            return (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={'rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-all ' + (on ? 'border-transparent bg-teal text-white shadow-[0_8px_18px_-8px_rgba(26,29,36,0.7)]' : 'border-line bg-canvas text-ink-mute hover:text-ink')}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* readout */}
        <div className="mt-6 flex items-center justify-center gap-3 text-[13.5px]">
          <span className="tnum font-bold text-ink-faint line-through">{MK_EVENTS.length} today</span>
          <ArrowRight className="h-4 w-4 text-teal" strokeWidth={2.5} />
          <span className="tnum rounded-full bg-teal-soft px-3 py-1 font-bold text-teal">{match} on your book</span>
        </div>

        {/* filtered list */}
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MK_EVENTS.map((e) => {
            const on = active.has(e.cur)
            const im = IMPACT[e.imp]
            return (
              <div
                key={e.title}
                className="relative flex items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 transition-all duration-500"
                style={{
                  borderColor: on ? '#e7e8ec' : 'transparent',
                  background: on ? '#fff' : '#f6f6f8',
                  opacity: on ? 1 : 0.34,
                  filter: on ? 'none' : 'grayscale(1) blur(0.4px)',
                  boxShadow: on ? '0 1px 2px rgba(17,19,24,0.04)' : 'none',
                }}
              >
                {on && <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: im.dot }} />}
                <span className="tnum w-[40px] shrink-0 text-[12px] font-semibold text-ink-mute">{e.t}</span>
                <span className="w-[36px] shrink-0 rounded-md border border-line bg-canvas px-1 py-0.5 text-center text-[10px] font-bold text-ink-2">{e.cur}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{e.title}</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: im.dot }} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── CTA #2 — FOLLOW THE SUN. An animated day→night scene; the sun crosses an
   arc, stars wake on the night side. Ties the close back to the world map. ─── */
function FollowTheSunCTA() {
  return (
    <section className="px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[900px]">
        {/* animated sky band */}
        <div className="relative overflow-hidden rounded-[28px] border border-line elev-2">
          <svg viewBox="0 0 900 240" preserveAspectRatio="xMidYMid slice" className="block h-[190px] w-full md:h-[230px]">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#fbe7c6" />
                <stop offset="0.32" stopColor="#e3ebf7" />
                <stop offset="0.6" stopColor="#cfe0fb" />
                <stop offset="0.82" stopColor="#3b3566" />
                <stop offset="1" stopColor="#10132a" />
              </linearGradient>
              <radialGradient id="sunglow" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#fff6df" />
                <stop offset="0.5" stopColor="#ffd27a" />
                <stop offset="1" stopColor="#ffbf5c" stopOpacity="0" />
              </radialGradient>
              <path id="sunarc" d="M 40 210 Q 450 -60 860 210" fill="none" />
            </defs>
            <rect width="900" height="240" fill="url(#sky)" />
            {/* stars on the night side */}
            {[[690, 60], [740, 110], [780, 50], [820, 90], [855, 140], [710, 150], [800, 175]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={1.5} fill="#fff" className="twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
            ))}
            {/* moon */}
            <circle cx={835} cy={70} r={16} fill="#eef1ff" opacity={0.9} />
            <circle cx={828} cy={64} r={16} fill="#3b3566" />
            {/* horizon */}
            <line x1={0} y1={210} x2={900} y2={210} stroke="#ffffff" strokeOpacity={0.25} strokeWidth={1} />
            {/* travelling sun */}
            <g>
              <circle r={26} fill="url(#sunglow)">
                <animateMotion dur="14s" repeatCount="indefinite" rotate="0"><mpath href="#sunarc" /></animateMotion>
              </circle>
              <circle r={11} fill="#ffd27a">
                <animateMotion dur="14s" repeatCount="indefinite" rotate="0"><mpath href="#sunarc" /></animateMotion>
              </circle>
            </g>
          </svg>
        </div>

        <div className="mt-10 text-center">
          <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
            Keep the same hours <span className="text-teal">the market does.</span>
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-[520px] text-[16px] leading-[1.65] text-ink-mute">
            Every session, every release, one calendar that follows the sun with you. Trade the hours where
            your edge is real — and sit out the ones where it isn’t.
          </p>
          <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <CTA href="/signup">Start free</CTA>
            <CTA href="/pricing" variant="secondary">Compare plans</CTA>
          </div>
        </div>
      </div>
    </section>
  )
}

export function EconomicCalendarPage() {
  return (
    <PageShell>
      <EconHero />

      <FeatureIntro>
        The whole trading day — sessions and news — <span className="text-teal">on one living calendar.</span>
      </FeatureIntro>

      {/* sessions timeline */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <Sparkles points={GAP_SPARKS} color="rgba(14,165,233,0.4)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <div data-side="left">
            <span className="micro inline-flex items-center gap-2 font-semibold text-teal">
              <Globe2 className="h-3.5 w-3.5" strokeWidth={2} /> Follow the sun
            </span>
            <h3 className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.13] font-bold text-ink">
              Know exactly when <span className="text-teal">your pairs come alive.</span>
            </h3>
            <p className="mt-5 max-w-[460px] text-[15.5px] leading-[1.7] text-ink-mute">
              Liquidity hands off around the globe every day. See the four majors on one 24-hour band — and
              the London–New York overlap, where the real volume lives — so you stop trading dead hours.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {['All four sessions on a single UTC timeline', 'The overlap window highlighted automatically', 'A live marker on the hour you’re trading now'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14.5px] text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div data-side="right"><SessionTimeline /></div>
        </div>
      </section>

      {/* the hot list */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-side="left" className="lg:order-2">
            <span className="micro inline-flex items-center gap-2 font-semibold text-teal">
              <Landmark className="h-3.5 w-3.5" strokeWidth={2} /> The hot list
            </span>
            <h3 className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.13] font-bold text-ink">
              Every release that moves price, <span className="text-teal">printing live.</span>
            </h3>
            <p className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              CPI, NFP, rate decisions, central-bank speakers — ranked by impact and streaming in as the day
              unfolds, counting down to the next one. The whole board in a single glance.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {['High / medium / low impact, colour-coded', 'New prints stream to the top in real time', 'A live countdown to the next high-impact event'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14.5px] text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><TrendingUp className="h-3 w-3" strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div data-side="right" className="lg:order-1"><LiveHotList /></div>
        </div>
      </section>

      {/* real-time alerts — phone */}
      <PhoneAlerts />

      {/* CTA #1 — situational awareness */}
      <SituationalAwarenessCTA />

      {/* your markets — interactive filter */}
      <MarketsFilter />

      {/* CTA #2 — follow the sun close */}
      <FollowTheSunCTA />
    </PageShell>
  )
}
