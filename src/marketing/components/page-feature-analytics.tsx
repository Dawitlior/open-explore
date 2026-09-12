import { useRef, useState, type ReactNode } from 'react'
import {
  Flame,
  ShieldCheck,
  Users,
  Check,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  TrendingUp,
  Target,
  Zap,
} from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'
import { FeatureHero, FeatureIntro, FeatureRow, FeatureSectionHead, WaveBand, Blob, Sparkles } from './features/blocks'
import { FEATURES } from './features/catalog'

/* ============================================================================
   ANALYTICS (/features/analytics) — ten marketing sections that turn hard
   analytics into sharp, trader-facing copy. Each section is a different shape;
   real product shots drop in where they fit, native viz fills the rest.
   ========================================================================== */

const GRID_SPARKS = [
  { top: '8%', left: '5%', size: 12, delay: '0s' },
  { top: '12%', left: '93%', size: 10, delay: '1.1s' },
  { top: '90%', left: '8%', size: 11, delay: '0.7s' },
  { top: '94%', left: '91%', size: 12, delay: '1.7s' },
]

const LOGOS = ['bybit', 'binance', 'coinbase', 'kraken', 'mexc', 'cryptocom', 'gateio', 'ibkr']

const RISK = [
  { Icon: CalendarDays, label: 'Daily', used: '0.6R', limit: '2R', pct: 30 },
  { Icon: CalendarRange, label: 'Weekly', used: '1.8R', limit: '5R', pct: 36 },
  { Icon: CalendarClock, label: 'Monthly', used: '3.1R', limit: '10R', pct: 31 },
]

/* ── native viz ──────────────────────────────────────────────────────────── */

/* Drag-to-compare: messy spreadsheet (Before) wiping into the Orca dashboard (After). */
/* Big drag-to-compare: the messy spreadsheet wiping into the Orca dashboard,
   floating over a dark, soft-blurred glow (light section behind). */
function BeforeAfterSlider() {
  const [pos, setPos] = useState(52)
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const moveTo = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }

  return (
    <div className="relative mx-auto w-full max-w-[1160px]">
      {/* darker soft blur behind (not a full dark background) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 rounded-[48px]"
        style={{ background: 'radial-gradient(58% 62% at 50% 48%, rgba(12,15,22,0.55), rgba(26,29,36,0.20) 62%, transparent 78%)', filter: 'blur(46px)' }}
      />
      <div
        ref={ref}
        className="relative aspect-[16/9] w-full touch-none overflow-hidden rounded-[24px] border border-line bg-surface shadow-[0_50px_90px_-30px_rgba(11,13,18,0.6)] select-none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); moveTo(e.clientX) }}
        onPointerMove={(e) => { if (dragging) moveTo(e.clientX) }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); setDragging(false) }}
      >
        {/* After — the Orca dashboard */}
        <img src="/spread-dashboard.png" alt="Orca dashboard" className="absolute inset-0 h-full w-full object-cover object-left-top" draggable={false} />
        <span className="pointer-events-none absolute top-4 right-4 rounded-full bg-teal px-3.5 py-1.5 text-[12px] font-bold text-white shadow-md">After · Orca</span>

        {/* Before — the messy spreadsheet, clipped to the handle */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src="/spread-sheet.png" alt="Messy trade-log spreadsheet" className="absolute inset-0 h-full w-full object-cover object-left-top" draggable={false} />
          <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-[#2b2233] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-md">Before · Spreadsheet</span>
        </div>

        {/* Divider + handle */}
        <div className="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" style={{ left: `${pos}%` }}>
          <div
            className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-line bg-white text-ink shadow-[0_10px_28px_-6px_rgba(0,0,0,0.45)]"
            onPointerDown={(e) => { e.stopPropagation(); setDragging(true) }}
          >
            <ChevronLeft className="h-4 w-4 -mr-1" strokeWidth={2.5} />
            <ChevronRight className="h-4 w-4 -ml-1" strokeWidth={2.5} />
          </div>
        </div>
      </div>
      <p className="mt-5 text-center text-[13px] text-ink-faint">← Drag to compare the old way with Orca →</p>
    </div>
  )
}

/* Streaks — a floating cluster of six behavioral cards. */
const STREAK_IMGS = [
  { src: '/streak-6.png', cls: 'left-[6%] top-[2%] w-[52%] rotate-[-4deg] z-30', delay: 'float-slow' },
  { src: '/streak-5.png', cls: 'right-[3%] top-[16%] w-[50%] rotate-[3deg] z-40', delay: 'float-slower' },
  { src: '/streak-1.png', cls: 'left-[2%] top-[40%] w-[46%] rotate-[2deg] z-20', delay: 'float-slower' },
  { src: '/streak-3.png', cls: 'right-[6%] bottom-[10%] w-[44%] rotate-[-3deg] z-30', delay: 'float-slow' },
  { src: '/streak-2.png', cls: 'left-[16%] bottom-[1%] w-[46%] rotate-[4deg] z-10', delay: 'float-slow' },
  { src: '/streak-4.png', cls: 'right-[20%] top-[0%] w-[38%] rotate-[-2deg] z-10', delay: 'float-slower' },
]

function StreakCluster() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[560px] sm:aspect-square">
      <Blob variant="hero" morph from="#fb7185" to="#be123c" className="pointer-events-none absolute inset-[-6%] -z-10 h-[112%] w-[112%] opacity-[0.10]" />
      <Blob variant="side" morph from="#3a4150" to="#171a21" className="pointer-events-none absolute -bottom-[8%] -left-[8%] -z-10 h-[46%] w-[46%] opacity-[0.12]" />
      {STREAK_IMGS.map((im) => (
        <img
          key={im.src}
          src={im.src}
          alt=""
          className={'absolute overflow-hidden rounded-xl border border-line shadow-[0_24px_48px_-18px_rgba(20,16,50,0.4)] ' + im.delay + ' ' + im.cls}
        />
      ))}
    </div>
  )
}

function StreakStrip() {
  // W = win, L = loss; a red run near the end flags tilt risk
  const seq = ['W', 'W', 'L', 'W', 'W', 'W', 'L', 'W', 'L', 'L', 'L', 'W', 'W', 'L', 'W', 'W']
  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.3} blur={66} />
      <Blob variant="side" morph from="#fb7185" to="#be123c" className="pointer-events-none absolute -bottom-[12%] -left-[10%] -z-10 h-[300px] w-[300px] opacity-[0.12]" />
      <div className="relative rounded-3xl border border-line bg-surface p-6 elev-3">
        <div className="flex items-center justify-between">
          <span className="micro text-ink-faint">Last 16 trades</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-soft px-2.5 py-1 text-[11px] font-bold text-rose">
            <Flame className="h-3 w-3" strokeWidth={2.5} /> 3-loss streak
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {seq.map((s, i) => (
            <span
              key={i}
              className={'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold ' + (s === 'W' ? 'bg-teal-soft text-teal' : 'bg-rose-soft text-rose')}
            >
              {s}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-rose/25 bg-rose-soft/60 px-3.5 py-3 text-[12.5px] font-semibold text-ink">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose text-white">!</span>
          Behavior shift detected — size dropping, frequency rising. Step back.
        </div>
      </div>
    </div>
  )
}

function GuardrailRings() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {RISK.map((r) => {
        const circ = 2 * Math.PI * 26
        return (
          <div key={r.label} data-reveal className="flex flex-col items-center rounded-2xl border border-line bg-surface p-6 elev-1">
            <div className="relative h-[80px] w-[80px]">
              <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#e9e6ef" strokeWidth="7" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#e0a53a" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - r.pct / 100)} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-ink">{r.pct}%</span>
            </div>
            <span className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-ink">
              <r.Icon className="h-3.5 w-3.5 text-amber" strokeWidth={2} /> {r.label}
            </span>
            <span className="tnum mt-1 text-[12px] text-ink-faint">{r.used} of {r.limit}</span>
          </div>
        )
      })}
    </div>
  )
}

function LogoConstellation() {
  const pos = ['top-[4%] left-[30%]', 'top-[14%] right-[6%]', 'top-[46%] right-[0%]', 'bottom-[10%] right-[14%]', 'bottom-[2%] left-[34%]', 'bottom-[12%] left-[2%]', 'top-[44%] left-[0%]', 'top-[12%] left-[8%]']
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      <Blob variant="hero" morph from="#3a4150" to="#171a21" className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.10]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {[[30, 8], [92, 16], [98, 50], [82, 88], [40, 96], [6, 86], [4, 48], [12, 16]].map(([x, y], i) => (
          <line key={i} x1="50" y1="50" x2={x} y2={y} stroke="#bfe6d8" strokeWidth="0.5" strokeDasharray="2 2" />
        ))}
      </svg>
      {/* central node */}
      <div className="absolute top-1/2 left-1/2 flex h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface elev-3">
        <img src="/orca-icon.png" alt="Orca" className="h-16 w-16 rounded-full object-cover" />
      </div>
      {LOGOS.map((l, i) => (
        <span key={l} className={'float-slow absolute flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface elev-2 ' + pos[i]}>
          <img src={`/logos/${l}.png`} alt={l} className="h-8 w-8 rounded-lg object-contain" />
        </span>
      ))}
    </div>
  )
}

function RiskGauge() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.3} blur={66} />
      <div className="relative rounded-3xl border border-line bg-surface p-8 elev-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft text-teal"><ShieldCheck className="h-5 w-5" strokeWidth={2} /></span>
          <span className="micro text-ink-faint">Risk of ruin</span>
        </div>
        <svg viewBox="0 0 200 116" className="mx-auto mt-4 w-full max-w-[300px]">
          <path d="M16 104 A84 84 0 0 1 184 104" fill="none" stroke="#e9484d" strokeWidth="13" strokeLinecap="round" opacity="0.28" />
          <path d="M16 104 A84 84 0 0 1 70 30" fill="none" stroke="#1a1d24" strokeWidth="13" strokeLinecap="round" />
          <line x1="100" y1="104" x2="42" y2="58" stroke="#111318" strokeWidth="5" strokeLinecap="round" />
          <circle cx="100" cy="104" r="8" fill="#111318" />
        </svg>
        <div className="text-center">
          <div className="font-display text-[40px] leading-none font-bold text-teal">&lt; 1%</div>
          <div className="mt-2 text-[13px] text-ink-mute">Chance of blowing the account at your current sizing</div>
        </div>
      </div>
    </div>
  )
}

/* A framed dark product shot (for the real screenshot sections). */
function ShotCard({ src, alt, glow = 0.32 }: { src: string; alt: string; glow?: number }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={glow} blur={72} />
      <div className="[perspective:1600px]">
        <div className="overflow-hidden rounded-[16px] border border-line bg-surface p-2 elev-3 transition-transform duration-500 ease-out [transform:rotateY(-6deg)_rotateX(3deg)] hover:[transform:rotateY(-2deg)_rotateX(1deg)]">
          <img src={src} alt={alt} className="block w-full rounded-[10px] object-cover" />
        </div>
      </div>
    </div>
  )
}

/* ── generic section wrapper for the native-viz blocks ───────────────────── */
function VizSection({
  eyebrow,
  accent,
  title,
  body,
  aside,
  visual,
  flip = false,
}: {
  eyebrow: string
  accent: string
  title: ReactNode
  body: string
  aside?: string
  visual: ReactNode
  flip?: boolean
}) {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-36">
      <Sparkles points={GRID_SPARKS} color="rgba(26,29,36,0.4)" />
      <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div data-side={flip ? 'right' : 'left'} className={flip ? 'lg:order-2' : ''}>
          <span className="micro font-semibold" style={{ color: accent }}>{eyebrow}</span>
          <span className="mt-3 block h-[3px] w-9 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.13] font-bold text-ink">{title}</h3>
          <p className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">{body}</p>
          {aside && (
            <p className="mt-5 flex items-start gap-2.5 text-[14px] font-semibold text-ink">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: accent }}>
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {aside}
            </p>
          )}
        </div>
        <div data-side={flip ? 'left' : 'right'} className={flip ? 'lg:order-1' : ''}>{visual}</div>
      </div>
    </section>
  )
}

export function AnalyticsFeaturePage() {
  const c = FEATURES.analytics
  return (
    <PageShell>
      <FeatureHero
        eyebrow={c.eyebrow}
        Icon={c.Icon}
        accent={c.accent}
        title={c.title}
        titleAccent={c.titleAccent}
        sub={c.sub}
        shot={c.shot}
        backdrop="wave"
      />

      <FeatureIntro>
        The hard numbers, translated into <span className="text-teal">decisions you can act on.</span>
      </FeatureIntro>

      {/* 1 — Death of spreadsheets (before/after on a dark banner) */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-36">
        <Sparkles points={GRID_SPARKS} color="rgba(26,29,36,0.4)" />
        <div className="mx-auto mb-14 max-w-[680px] text-center">
          <span data-reveal className="micro font-semibold text-teal">No more spreadsheets</span>
          <h3 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.12] font-bold text-ink">
            Most traders journal wrong — <span className="text-teal">or not at all.</span>
          </h3>
          <p data-reveal className="mx-auto mt-5 max-w-[560px] text-[15.5px] leading-[1.7] text-ink-mute">
            Manual spreadsheets eat hours, memory lies, and the patterns hide in the noise. Drop a
            statement file and the same trades turn into a dashboard that actually tells you something —
            drag the handle and see the difference for yourself.
          </p>
        </div>
        <div data-reveal>
          <BeforeAfterSlider />
        </div>
      </section>

      {/* 2 — Know your real edge (real shot) */}
      <FeatureRow
        flip
        eyebrow="Your real edge"
        accent="indigo"
        title={<>Stop trading blind. <span className="text-indigo">Find where you actually win.</span></>}
        body="Which hours pay you, and which just bleed the account? Orca reads your full history and lays your edge out in black and white — no more guessing which asset, session or setup is really carrying you."
        bullets={['Best and worst hours, surfaced automatically', 'Edge by asset, session and setup', 'Clarity instead of gut feel']}
        shot="/carousel/analytics.png"
        shotTag="Analytics · Edge finder"
      />

      {/* CTA #1 — after section 2 (decision angle; wall of trades → one move) */}
      <OneDecisionCTA />

      {/* 3 — Psychology of streaks (big editorial + floating cluster) */}
      <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-44">
        <div className="mx-auto grid max-w-[1240px] items-center gap-16 lg:grid-cols-2 lg:gap-14">
          {/* rich copy */}
          <div>
            <h3 data-animate="title" className="font-display text-[clamp(2rem,3.8vw,3rem)] leading-[1.06] font-bold text-ink">
              Master your streaks <br className="hidden sm:block" />before they master your account.
            </h3>
            <span data-reveal className="mt-6 block h-[3px] w-24 rounded-full bg-gradient-to-r from-rose to-amber" />
            <p data-reveal className="mt-7 max-w-[500px] text-[17px] leading-[1.6] font-semibold text-rose">
              See exactly how your behavior changes after a loss — and after a win.
            </p>
            <p data-reveal className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Losing runs are where accounts quietly die. When the urge to win it back takes over, size
              creeps up, discipline drops, and one red day becomes a red week.
            </p>
            <p data-reveal className="mt-4 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Orca maps the structure of every streak — its length, its frequency, the extra risk you add
              after a win — and lays it out in black and white, so you can stop the spiral before it starts.
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {['Spot revenge trading the moment it begins', 'Catch overconfidence right after a win'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] font-semibold text-ink">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <a
              href="/features/trader-mind"
              data-reveal
              className="group mt-9 inline-flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-6 text-[14px] font-semibold text-ink elev-1 transition-all hover:-translate-y-0.5 hover:elev-3"
            >
              Explore behavior insights
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose to-amber text-white">
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.25} />
              </span>
            </a>
          </div>
          {/* cluster */}
          <div data-side="right"><StreakCluster /></div>
        </div>
      </section>

      {/* 4 — Institutional-grade clarity (hero-style green blob) */}
      <FeatureHero
        eyebrow="Fund-level reporting"
        Icon={c.Icon}
        accent="teal"
        title="Performance decks,"
        titleAccent="built for retail."
        sub="Why should only fund managers get clean, deep reporting? Growth curves, quarterly splits, green months against red — the whole financial picture, in a design that makes you feel like you’re running a real business."
        shot="/fund-level.png"
      />

      <WaveBand
        title={<>Survive first. <span className="text-teal">Then compound.</span></>}
        sub="The traders who last aren’t the ones who win biggest — they’re the ones who never blow up."
      />

      {/* 5 — Risk control guardrails */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-36">
        <Blob variant="hero" morph from="#f59e0b" to="#b45309" className="pointer-events-none absolute top-1/2 -left-40 -z-10 h-[540px] w-[540px] -translate-y-1/2 opacity-[0.07]" />
        <div className="mx-auto max-w-[1000px]">
          <FeatureSectionHead
            eyebrow="Guardrails"
            accent="amber"
            title={<>Set your limits <span className="text-amber">while you’re calm.</span></>}
            sub="It’s easy to promise you won’t over-risk — until you’re mid-drawdown. Daily, weekly and monthly limits set in advance hold the line when the market tries to talk you out of the plan."
          />
          <div className="mt-14">
            <GuardrailRings />
          </div>
        </div>
      </section>

      {/* 6 — Multi-broker freedom */}
      <VizSection
        eyebrow="One feed"
        accent="#1a1d24"
        title={<>Every account, <span className="text-teal">one dashboard.</span></>}
        body="Crypto, futures, forex and stocks — often across half a dozen brokers. Instead of ten tabs and a mental spreadsheet, Orca syncs all of it into a single, unified feed you can actually read."
        aside="Connect multiple brokers into one clean picture."
        visual={<LogoConstellation />}
      />

      {/* 7 — Zero risk of ruin */}
      <VizSection
        flip
        eyebrow="Survive first"
        accent="#1a1d24"
        title={<>Engineer a <span className="text-teal">bulletproof risk model.</span></>}
        body="A pro’s first job is to survive; profit comes second. Orca weighs your position sizing against your history and volatility, so a single bad trade — or a bad week — can never wipe the account."
        aside="Know your risk of ruin, and keep it near zero."
        visual={<ShotCard src="/survive-first.png" alt="Behavioral health index" />}
      />

      {/* 8 — Asset leaderboard */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-36">
        <Sparkles points={GRID_SPARKS} color="rgba(124,58,237,0.4)" />
        <div className="mx-auto max-w-[900px]">
          <FeatureSectionHead
            eyebrow="Leaderboard"
            accent="indigo"
            title={<>See what prints — <span className="text-indigo">and what drains.</span></>}
            sub="Not every instrument deserves your time. Often the asset you obsess over just farms fees while the one you barely touch carries the account. The leaderboard ranks them, so you double down on what works."
          />
          <div className="mt-12">
            <ShotCard src="/leaderboard.png" alt="Asset leaderboard" glow={0.28} />
          </div>
        </div>
      </section>

      {/* 9 — Session & time optimization (real shot) */}
      <FeatureRow
        flip
        eyebrow="Timing"
        accent="teal"
        title={<>Stop grinding <span className="text-teal">dead sessions.</span></>}
        body="Every market has a rhythm and you have your hours. Orca maps your P&L across Asia, London and New York — so you show up when the edge is real and log off when it isn’t. Fewer hours at the screen, sharper results."
        bullets={['P&L by session and hour', 'Your high-probability windows', 'Warnings for the hours that cost you']}
        shot="/opportunity-window.png"
        shotTag="Analytics · Sessions"
      />

      {/* 10 — Built for traders */}
      <section className="relative overflow-hidden px-6 py-28 text-center md:px-10 md:py-40">
        <Blob variant="hero" morph from="#3a4150" to="#171a21" className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]" />
        <div className="mx-auto max-w-[720px]">
          <span data-reveal className="micro inline-flex items-center gap-2 font-semibold text-teal">
            <Users className="h-3.5 w-3.5" strokeWidth={2} /> By traders, for traders
          </span>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.1] font-bold text-ink">
            Built by people who <span className="text-teal">actually take the trade.</span>
          </h2>
          <p data-reveal className="mx-auto mt-6 max-w-[560px] text-[16px] leading-[1.7] text-ink-mute">
            Too many tools are made by engineers who’ve never held a losing position. Orca was built from
            the screen out — for the mental load, the inconsistency, the risk mistakes. No fluff, just the
            sharpest edge from one trade to the next.
          </p>
        </div>
      </section>

      {/* CTA #2 — after the last section (evidence angle; numbers count up) */}
      <YourNumbersCTA />
    </PageShell>
  )
}

/* ── CTA #1 — the spotlight. Angle: analytics exist to produce ONE decision.
   A single insight held under a soft spotlight — a shape unique to this page. */
function OneDecisionCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[820px]">
        <div className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-8 elev-3 md:p-12">
          {/* spotlight wash */}
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 90% at 30% 0%, rgba(26,29,36,0.14), transparent 60%)' }} />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1 text-[11.5px] font-bold text-teal">
              <Target className="h-3.5 w-3.5" strokeWidth={2.25} /> One insight, from your data
            </span>
            <p className="mt-5 font-display text-[clamp(1.5rem,3vw,2.3rem)] leading-[1.18] font-bold text-ink">
              “Your edge lives in the <span className="text-teal">first hour of London</span> — and quietly
              leaks it back after 3pm.”
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['+2.8R avg · 08:00–09:00', '−0.9R avg · after 15:00', '212 trades analysed'].map((c) => (
                <span key={c} className="tnum rounded-lg border border-line bg-canvas px-3 py-1.5 text-[12px] font-semibold text-ink-mute">{c}</span>
              ))}
            </div>
            <p className="mt-6 max-w-[520px] text-[15px] leading-[1.65] text-ink-mute">
              A wall of trades is just noise until it points at a move. Orca turns yours into the two or three
              decisions that actually change your month.
            </p>
            <div className="mt-8"><CTA href="/signup">Find your one move</CTA></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #2 — the receipt of proof. Angle: your real numbers, counted from your
   own account. A row of giant tabular figures — distinct closing shape. */
const NUMS = [
  { v: '58', suffix: '%', label: 'Win rate', Icon: Target },
  { v: '2.3', suffix: 'R', label: 'Average win', Icon: TrendingUp },
  { v: '2.1', suffix: '×', label: 'Profit factor', Icon: Zap },
  { v: '45', suffix: '+', label: 'Trades before a verdict', Icon: CalendarClock },
]
function YourNumbersCTA() {
  return (
    <section className="relative overflow-hidden px-6 pt-8 pb-32 md:px-10">
      <div className="mx-auto max-w-[960px] rounded-[28px] border border-line p-8 text-center md:p-12" style={{ background: 'linear-gradient(180deg, #f2ecfe 0%, #f6f6f8 100%)' }}>
        <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-bold text-ink">
          Your real numbers. <span className="text-teal">Not a gut feeling.</span>
        </h2>
        <div className="mt-9 grid grid-cols-2 gap-6 md:grid-cols-4">
          {NUMS.map((n) => (
            <div key={n.label} className="flex flex-col items-center">
              <n.Icon className="h-5 w-5 text-teal" strokeWidth={2} />
              <div className="tnum mt-2 text-[clamp(2rem,4vw,3rem)] font-bold leading-none text-ink">
                <span data-count={n.v} data-suffix={n.suffix}>{n.v}{n.suffix}</span>
              </div>
              <div className="mt-2 text-[12.5px] font-semibold text-ink-mute">{n.label}</div>
            </div>
          ))}
        </div>
        <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <CTA href="/signup">See your analytics</CTA>
          <CTA href="/pricing" variant="secondary">Compare plans</CTA>
        </div>
      </div>
    </section>
  )
}
