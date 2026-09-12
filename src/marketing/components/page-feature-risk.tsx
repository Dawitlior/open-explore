import type { ReactNode } from 'react'
import {
  Ruler,
  Bell,
  TrendingDown,
  Layers,
  Gauge,
  Activity,
  Play,
  ChevronRight,
  Mail,
  Check,
  Scale,
  TrendingUp,
} from 'lucide-react'
import { PageShell } from './page-shell'
import { ScoreRing } from './ui/primitives'

/* ============================================================================
   RISK ENGINE (/features/risk) — rebuilt in the APPWAY homepage design the
   founder chose (gradient blob hero + tilted mockups, a 2×2 feature grid with
   one highlighted card, blob-backed feature sections with "Learn more" pills, a
   video panel, and a newsletter), adapted to Orca: violet brand identity, and a
   MONOCHROME severity scale (grey → charcoal → near-black) for the risk/alert
   states — never red/amber. Two isolated CTAs: the video panel and newsletter.
   ========================================================================== */

const OK = '#7c3aed' // within limits — brand violet
const WARN = '#6b7180' // pressure — charcoal grey
const BREACH = '#12141a' // breached — near-black

/* ── APPWAY-style "Learn more" pill (label + filled arrow disc) ─────────── */
function LearnMore({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group inline-flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-6 text-[14px] font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo/40 hover:elev-2">
      {children}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-white transition-transform duration-300 group-hover:translate-x-0.5">
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </span>
    </a>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="micro font-semibold tracking-[0.14em] text-indigo uppercase">{children}</span>
}

/* ── decorative shape kit (breaks the flat-white monotony) ──────────────── */
const WAVE_TOP = 'M0,64 C240,10 480,110 720,74 C960,38 1200,4 1440,52 L1440,120 L0,120 Z'

/** A tinted wave edge — sits at the top or bottom of a colored band. */
function WaveEdge({ fill, flip = false, className = 'h-[56px] md:h-[88px]' }: { fill: string; flip?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden className={'block w-full ' + className + (flip ? ' [transform:scaleY(-1)]' : '')} style={{ fill }}>
      <path d={WAVE_TOP} />
    </svg>
  )
}

/** Faint diagonal-stripe hatch — the APPWAY texture accent. */
function Hatch({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={'pointer-events-none absolute ' + className}
      style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(124,58,237,0.10) 0 1px, transparent 1px 8px)' }}
    />
  )
}

/** Scattered floating shapes — dots, a ring, a square, a plus. */
function FloatShapes({ tone = 'rgba(124,58,237,0.18)' }: { tone?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="float-slow absolute top-[16%] left-[5%] h-3 w-3 rounded-full" style={{ background: tone }} />
      <span className="float-slower absolute top-[26%] right-[7%] h-5 w-5 rotate-12 rounded-[5px] border-2" style={{ borderColor: tone }} />
      <span className="float-slow absolute bottom-[18%] left-[9%] h-9 w-9 rounded-full border" style={{ borderColor: tone }} />
      <span className="float-slower absolute bottom-[24%] right-[10%] text-3xl font-light" style={{ color: tone }}>+</span>
    </div>
  )
}

/* ── Hero — gradient blob with a wavy cut + tilted product mockups ───────── */
function Hero() {
  return (
    <section className="relative">
      <div
        className="relative overflow-hidden pt-32 pb-40 md:pt-36 md:pb-52"
        style={{
          background:
            'radial-gradient(1200px 520px at 85% -10%, #8b5cf6 0%, transparent 55%),' +
            'radial-gradient(900px 620px at -5% 120%, #4c1d95 0%, transparent 60%),' +
            'linear-gradient(135deg, #6d28d9 0%, #5b21b6 55%, #4c1d95 100%)',
        }}
      >
        <span aria-hidden className="absolute -top-24 -left-16 h-[360px] w-[360px] rounded-full bg-white/10 blur-2xl" />
        <span aria-hidden className="absolute top-16 right-[-60px] h-[280px] w-[280px] rounded-[46%_54%_57%_43%/48%_40%_60%_52%] bg-[#7c3aed]/40 blur-xl" />
        {/* twinkles */}
        {[
          ['12%', '20%'], ['22%', '54%'], ['70%', '10%'], ['82%', '46%'], ['16%', '86%'],
        ].map(([top, left], i) => (
          <span key={i} aria-hidden className="absolute h-1.5 w-1.5 rounded-full bg-white/40" style={{ top, left }} />
        ))}

        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-6 md:px-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <span className="micro font-semibold tracking-[0.14em] text-white/70 uppercase">Risk Engine</span>
            <h1 data-animate="title" className="mt-4 font-display text-[clamp(2.5rem,5.4vw,4rem)] leading-[1.03] font-bold text-white">
              The account survives the bad day
            </h1>
            <p data-reveal className="mt-6 max-w-[460px] text-[16.5px] leading-[1.6] text-white/80">
              Most traders don’t blow up from a bad strategy — they blow up from inconsistent size and one bad
              day that never stopped. Orca measures every trade in R and enforces the line for you.
            </p>
            <div data-reveal className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:flex [&>a]:w-full [&>a]:items-center [&>a]:justify-center sm:[&>a]:inline-flex sm:[&>a]:w-auto">
              <a href="/signup" className="rounded-full bg-white px-7 py-3.5 text-[14.5px] font-semibold text-indigo shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5">
                Start free
              </a>
              <a href="/#demo" className="rounded-full border border-white/30 px-7 py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-white/10">
                See how it works
              </a>
            </div>
          </div>

          {/* tilted mockups on the blob */}
          <div data-reveal className="relative hidden h-[420px] lg:block">
            <div className="absolute top-6 right-6 w-[300px] rotate-[6deg] overflow-hidden rounded-[18px] border border-white/20 bg-surface p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
              <img src="/score-risk.png" alt="Risk score" className="w-full rounded-[10px]" />
            </div>
            <div className="absolute bottom-2 left-2 w-[330px] -rotate-[5deg] overflow-hidden rounded-[18px] border border-white/20 bg-surface p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]">
              <img src="/survive-first.png" alt="Survive first" className="w-full rounded-[10px]" />
            </div>
          </div>
        </div>
      </div>

      {/* wavy cut into the canvas */}
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden className="-mt-px block h-[70px] w-full md:h-[110px]" style={{ fill: 'var(--color-canvas)' }}>
        <path d="M0,64 C240,10 480,110 720,74 C960,38 1200,4 1440,52 L1440,120 L0,120 Z" />
      </svg>
    </section>
  )
}

/* ── 2×2 feature grid (one highlighted, one accent-bordered) ─────────────── */
const WATCH = [
  { Icon: Ruler, title: 'Risk in R, not dollars', body: 'Every trade measured against the risk you set — comparable across any account size or market.', variant: 'plain' as const },
  { Icon: Bell, title: 'A four-level circuit breaker', body: 'Trade, day, week, month. The moment a limit breaks, Orca stops you — with a full-screen alert.', variant: 'accent' as const },
  { Icon: TrendingDown, title: 'Only losses count', body: 'Wins don’t buy back a bad day. The limit measures erosion, not net return.', variant: 'plain' as const },
  { Icon: Layers, title: 'Hidden correlation', body: 'Five positions that move together aren’t diversification — they’re one leveraged bet.', variant: 'solid' as const },
]

function WatchGrid() {
  return (
    <section className="relative mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <Hatch className="right-6 top-10 hidden h-24 w-40 rounded-xl md:block" />
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* illustration */}
        <div data-reveal className="relative order-2 lg:order-1">
          <span aria-hidden className="absolute -left-8 -bottom-8 -z-10 h-52 w-52 rounded-full opacity-80 blur-2xl" style={{ background: 'linear-gradient(180deg,#c4b5fd,#8b5cf6)' }} />
          <span aria-hidden className="absolute -inset-6 -z-10 rounded-[36px] opacity-70 blur-2xl" style={{ background: 'radial-gradient(60% 60% at 40% 30%, #ede9fe, transparent 70%)' }} />
          <div className="overflow-hidden rounded-[22px] border border-line bg-surface p-2.5 elev-3 transition-transform duration-500 [transform:rotate(-2deg)] hover:[transform:rotate(0deg)]">
            <img src="/survive-first.png" alt="Orca risk dashboard" className="w-full rounded-xl" />
          </div>
          {/* overlapping stat chip */}
          <div className="absolute -right-3 -bottom-5 flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 elev-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: BREACH }}><Bell className="h-4 w-4" strokeWidth={2.25} /></span>
            <span className="text-[13px] leading-tight"><b className="text-ink">Day limit</b><br /><span className="text-ink-faint">−2R · enforced</span></span>
          </div>
        </div>

        {/* copy + cards */}
        <div className="order-1 lg:order-2">
          <Eyebrow>What the engine watches</Eyebrow>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
            Four things standing between you and a blown account
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {WATCH.map((c) => {
              const solid = c.variant === 'solid'
              return (
                <div
                  key={c.title}
                  data-reveal
                  className={
                    'rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 ' +
                    (solid
                      ? 'text-white elev-2'
                      : 'border border-line bg-surface elev-1 ' + (c.variant === 'accent' ? 'border-l-[3px] border-l-indigo' : ''))
                  }
                  style={solid ? { background: 'linear-gradient(150deg, #7c3aed, #5b21b6)' } : undefined}
                >
                  <span className={'flex h-11 w-11 items-center justify-center rounded-[13px] ' + (solid ? 'bg-white/15 text-white' : 'bg-indigo-soft text-indigo')}>
                    <c.Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <h3 className={'mt-4 text-[15.5px] font-bold ' + (solid ? 'text-white' : 'text-ink')}>{c.title}</h3>
                  <p className={'mt-1.5 text-[13px] leading-[1.6] ' + (solid ? 'text-white/80' : 'text-ink-mute')}>{c.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Soft violet blob cluster behind a section visual ───────────────────── */
function BlobCluster() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <span className="absolute top-4 left-[8%] h-40 w-40 rounded-full opacity-70 blur-2xl" style={{ background: 'linear-gradient(180deg,#c4b5fd,#8b5cf6)' }} />
      <span className="absolute bottom-2 left-[22%] h-52 w-52 rounded-full opacity-60 blur-2xl" style={{ background: 'linear-gradient(180deg,#a855f7,#ec4899)' }} />
      <span className="absolute top-10 right-[10%] h-44 w-44 rounded-full opacity-50 blur-2xl" style={{ background: 'linear-gradient(180deg,#818cf8,#6d28d9)' }} />
    </div>
  )
}

/* ── Circuit breaker (text left, live visual right on blobs) ─────────────── */
function CircuitBreaker() {
  const levels = [
    { level: 'Per trade', limit: '−1R', used: 80, usedR: '−0.8R' },
    { level: 'Per day', limit: '−2R', used: 100, usedR: '−2.0R', breached: true },
    { level: 'Per week', limit: '−5R', used: 52, usedR: '−2.6R' },
    { level: 'Per month', limit: '−10R', used: 31, usedR: '−3.1R' },
  ]
  return (
    <section className="relative">
      <WaveEdge fill="#f4effe" />
      <div style={{ background: '#f4effe' }} className="relative px-6 py-14 md:px-10 md:py-20">
      <BlobCluster />
      <FloatShapes />
      <div className="relative mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>From measurement to enforcement</Eyebrow>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
            Four limits. Set once, when your head is clear.
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            1R · 2R · 5R · 10R — a nested circuit breaker for the trade, the day, the week and the month.
            The instant one breaks, Orca stops you. This is the line your willpower can’t hold alone.
          </p>
          <div data-reveal className="mt-8"><LearnMore href="/#demo">See it in action</LearnMore></div>
        </div>

        <div data-reveal className="rounded-[24px] border border-line bg-surface p-6 elev-3 md:p-8">
          <div className="flex flex-col gap-5">
            {levels.map((l) => {
              const tone = l.breached ? BREACH : l.used >= 75 ? WARN : OK
              return (
                <div key={l.level}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="font-bold text-ink">{l.level}</span>
                    <span className="tnum font-semibold" style={{ color: tone }}>{l.limit}</span>
                  </div>
                  <div className="relative h-8 w-full overflow-hidden rounded-lg bg-canvas-deep">
                    <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${l.used}%`, backgroundColor: tone }} />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="tnum text-[12px] font-semibold" style={{ color: l.used > 55 ? '#fff' : 'var(--color-ink-mute)' }}>{l.usedR} used</span>
                      {l.breached && <span className="flex items-center gap-1 text-[11px] font-bold text-white"><Bell className="h-3.5 w-3.5" strokeWidth={2.5} /> STOPPED</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3.5" style={{ background: BREACH }}>
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-white"><Bell className="h-4 w-4" strokeWidth={2.25} /></span>
            <div>
              <p className="text-[13px] font-bold text-white">Daily limit reached — trading paused for today.</p>
              <p className="mt-0.5 text-[12px] text-white/60">Come back tomorrow clear, not tilted.</p>
            </div>
          </div>
        </div>
      </div>
      </div>
      <WaveEdge fill="#f4effe" flip />
    </section>
  )
}

/* ── Think in R (visual left on blobs, copy right, Learn more) ───────────── */
function ThinkInR() {
  const bars = [
    { label: 'Your stop', r: '−1R', w: 34, tone: WARN },
    { label: 'A scratch', r: '+0.4R', w: 16, tone: OK },
    { label: 'A clean win', r: '+2.5R', w: 78, tone: OK },
  ]
  return (
    <section className="relative px-6 py-20 md:px-10 md:py-28">
      <FloatShapes />
      <div className="relative mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div data-reveal className="relative order-2 lg:order-1">
          <span aria-hidden className="absolute -inset-3 -z-10 rounded-[30px] bg-[#f2ecfe] [transform:rotate(-3deg)]" />
          <span aria-hidden className="absolute -right-6 -top-6 -z-10 h-24 w-24 rounded-full opacity-70 blur-2xl" style={{ background: 'linear-gradient(180deg,#a855f7,#ec4899)' }} />
          <div className="rounded-[24px] border border-line bg-surface p-7 elev-3 md:p-9">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-ink-mute">One trade, three outcomes</span>
            <span className="tnum rounded-md border border-line bg-canvas px-2 py-0.5 text-[11px] text-ink-faint">1R = your stop</span>
          </div>
          <div className="mt-6 flex flex-col gap-5">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-ink">{b.label}</span>
                  <span className="tnum font-bold" style={{ color: b.tone }}>{b.r}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas-deep">
                  <div className="h-full rounded-full" style={{ width: `${b.w}%`, backgroundColor: b.tone }} />
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>The unit of measure</Eyebrow>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
            Think in R — not dollars
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            R is the risk you decided on before the trade. If your stop risks $100, that’s 1R; a $250 win is
            2.5R. Suddenly your results are comparable across a $2K and a $200K account — and across Bitcoin
            and a blue-chip stock.
          </p>
          <div data-reveal className="mt-8"><LearnMore href="/#demo">How R works</LearnMore></div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #1 — video panel (APPWAY "Play Video Now") ─────────────────────── */
function VideoCTA() {
  return (
    <section className="px-6 py-10 md:px-10 md:py-16">
      <div className="relative mx-auto grid max-w-[1160px] overflow-hidden rounded-[28px] md:grid-cols-2">
        <a href="/#demo" className="group relative flex min-h-[300px] items-center justify-center overflow-hidden p-6" style={{ background: 'linear-gradient(150deg,#6d28d9,#4c1d95)' }} aria-label="Watch the Orca demo">
          <img src="/dashboard.png" alt="Orca dashboard" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-indigo shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105">
            <span className="absolute inset-0 rounded-full bg-white/60 animate-ping" style={{ animationDuration: '2.4s' }} />
            <Play className="relative ml-1 h-8 w-8 fill-current" strokeWidth={0} />
          </span>
        </a>
        <div className="relative flex flex-col justify-center overflow-hidden bg-canvas-deep p-8 md:p-12">
          <Hatch className="right-0 top-0 h-full w-28" />
          <div className="relative">
          <Eyebrow>See it work</Eyebrow>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.6rem,2.8vw,2.2rem)] leading-[1.12] font-bold text-ink">
            Watch the engine stop a losing day
          </h2>
          <p data-reveal className="mt-5 max-w-[420px] text-[15px] leading-[1.7] text-ink-mute">
            Sixty seconds: a limit fills, the alert fires, and the platform locks the next trade — before the
            damage compounds.
          </p>
          <div data-reveal className="mt-7"><LearnMore href="/#demo">Play the demo</LearnMore></div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Consistency + correlation (two cards on blobs) ─────────────────────── */
function GuardCards() {
  const syms = ['BTC', 'ETH', 'SOL', 'AVAX']
  const rho = [
    [1, 0.86, 0.79, 0.74],
    [0.86, 1, 0.82, 0.77],
    [0.79, 0.82, 1, 0.8],
    [0.74, 0.77, 0.8, 1],
  ]
  const shade = (v: number) => {
    const t = Math.max(0, Math.min(1, v))
    const l = (a: number, b: number) => Math.round(a + (b - a) * t)
    return `rgb(${l(238, 18)},${l(240, 20)},${l(243, 26)})`
  }
  return (
    <section
      className="relative px-6 py-24 md:px-10 md:py-32"
      style={{ background: 'var(--color-canvas-deep)', clipPath: 'polygon(0 2.5vw, 100% 0, 100% 100%, 0 calc(100% - 2.5vw))' }}
    >
      <Hatch className="left-8 bottom-16 hidden h-24 w-44 rounded-xl md:block" />
      <FloatShapes />
      <div className="relative mx-auto max-w-[660px] text-center">
        <Eyebrow>Beyond the single trade</Eyebrow>
        <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
          It watches the patterns you can’t feel
        </h2>
      </div>
      <div className="mx-auto mt-14 grid max-w-[960px] gap-6 md:grid-cols-2">
        {/* consistency */}
        <div data-reveal className="rounded-[22px] border border-line bg-surface p-8 elev-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo"><Gauge className="h-4 w-4" strokeWidth={2} /></span>
            <span className="text-[14px] font-bold text-ink">Risk consistency</span>
            <span className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: WARN }}><TrendingUp className="h-3 w-3" strokeWidth={2.5} /> Drifting up</span>
          </div>
          <div className="mt-6 flex items-center gap-6">
            <ScoreRing value={68} accent="indigo" size={110} />
            <p className="flex-1 text-[13px] leading-[1.6] text-ink-mute">
              Are you really risking the same each time? Random sizing quietly poisons every other statistic.
              Every point of average deviation costs 20 — below 60, the warning lights up.
            </p>
          </div>
        </div>
        {/* correlation */}
        <div data-reveal className="rounded-[22px] border border-line bg-surface p-8 elev-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo"><Layers className="h-4 w-4" strokeWidth={2} /></span>
            <span className="text-[14px] font-bold text-ink">Effective bets</span>
            <span className="tnum ml-auto font-display text-[26px] font-bold text-ink"><span data-count="1.8" data-decimals="1">1.8</span></span>
          </div>
          <div className="mt-5 flex items-center gap-5">
            <div className="grid grid-cols-4 gap-1">
              {rho.map((row, i) => row.map((v, j) => (
                <div key={`${i}-${j}`} className="h-8 w-8 rounded-[5px]" style={{ background: shade(v) }} title={`${syms[i]}·${syms[j]} ${v.toFixed(2)}`} />
              )))}
            </div>
            <p className="flex-1 text-[13px] leading-[1.6] text-ink-mute">
              Six open positions that all move together collapse to <strong className="text-ink">1.8</strong>
              &nbsp;independent bets. Your diversification is an illusion — and Orca shows it.
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-mute"><Scale className="h-3.5 w-3.5" strokeWidth={2} /> Leverage</div>
              <div className="tnum mt-1 font-display text-[19px] font-bold text-ink">2.4×</div>
            </div>
            <div className="rounded-xl border border-line px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-mute"><Activity className="h-3.5 w-3.5" strokeWidth={2} /> Top concentration</div>
              <div className="tnum mt-1 font-display text-[19px] font-bold text-ink">41%</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Quality metrics (APPWAY pricing-row → metric cards) ─────────────────── */
function QualityMetrics() {
  const metrics = [
    { k: 'Sharpe', c: '1.62', d: 2, v: '1.62', note: 'return vs. all volatility' },
    { k: 'Sortino', c: '2.10', d: 2, v: '2.10', note: 'punishes only downside' },
    { k: 'Calmar', c: '0.94', d: 2, v: '0.94', note: 'return vs. worst pain' },
    { k: 'Omega', c: '1.70', d: 2, v: '1.70', note: 'all gains ÷ all losses' },
    { k: 'Max DD', c: '12', d: 0, suffix: '%', v: '12%', note: 'deepest drawdown' },
  ]
  return (
    <section className="relative mx-auto max-w-[1160px] px-6 py-20 md:px-10 md:py-24">
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-6 -z-10 mx-auto h-[220px] max-w-[680px] rounded-full opacity-60 blur-3xl" style={{ background: 'radial-gradient(50% 60% at 50% 0%, #ede9fe, transparent 70%)' }} />
      <div className="relative mx-auto max-w-[640px] text-center">
        <Eyebrow>The numbers a fund lives by</Eyebrow>
        <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-bold text-ink">
          Institutional quality metrics — on your own returns
        </h2>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.k} data-reveal className="rounded-2xl border border-line bg-surface p-5 text-center elev-1 transition-all duration-300 hover:-translate-y-1 hover:elev-2">
            <div className="tnum font-display text-[30px] leading-none font-bold text-ink">
              <span data-count={m.c} data-decimals={m.d} data-suffix={m.suffix ?? ''}>{m.v}</span>
            </div>
            <div className="mt-2 text-[13px] font-bold text-indigo">{m.k}</div>
            <div className="mt-1 text-[11px] leading-snug text-ink-faint">{m.note}</div>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-[520px] text-center text-[12px] text-ink-faint">Sample values — Orca computes yours from your live trade history.</p>
    </section>
  )
}

/* ── CTA #2 — newsletter (APPWAY "Subscribe our Newsletter") ────────────── */
function NewsletterBlock() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12 md:px-10 md:py-16">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div data-reveal className="relative order-2 flex justify-center md:order-1">
          <div className="pointer-events-none absolute inset-0 -z-10 mx-auto my-auto h-[70%] w-[70%] rounded-full bg-[#f1e9fe] blur-2xl" />
          <img src="/newsletter.png" alt="Orca weekly email" className="w-full max-w-[360px]" />
        </div>
        <div className="order-1 md:order-2">
          <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-bold text-ink">
            Protect the account — get the risk playbook
          </h2>
          <span className="mt-4 block h-[3px] w-14 rounded-full bg-indigo" />
          <p data-reveal className="mt-5 max-w-[440px] text-[15.5px] leading-[1.7] text-ink-mute">
            One sharp idea on risk, sizing and drawdown every Sunday — the kind you actually finish. No spam,
            unsubscribe in a click.
          </p>
          <form className="mt-7 flex max-w-[440px] flex-col gap-2.5 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
            <span className="relative flex-1">
              <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={2} />
              <input type="email" required placeholder="you@email.com" className="w-full rounded-full border border-line bg-surface py-3.5 pr-5 pl-11 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-indigo/50 focus:ring-4 focus:ring-indigo/10" />
            </span>
            <button type="submit" className="rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-7 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5">
              Subscribe now
            </button>
          </form>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {['Deterministic', 'Never invents a number', 'Read-only & private'].map((p) => (
              <li key={p} className="flex items-center gap-1.5 text-[13px] text-ink-mute"><Check className="h-4 w-4 text-indigo" strokeWidth={2.5} /> {p}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function RiskEngineFeaturePage() {
  return (
    <PageShell darkNav>
      <Hero />
      <WatchGrid />
      <CircuitBreaker />
      <ThinkInR />
      <VideoCTA />
      <GuardCards />
      <QualityMetrics />
      <NewsletterBlock />
    </PageShell>
  )
}
