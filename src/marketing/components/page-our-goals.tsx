import { Link } from 'react-router-dom'
import { Play, ChevronRight, ShieldCheck, Lock, Target, LineChart, Mail, ArrowRight } from 'lucide-react'
import { PageShell } from './page-shell'

/* ============================================================================
   OUR GOALS (/our-goals) — Orca's "About" page, built to the APPWAY reference
   the founder chose: a gradient blob hero with a wavy cut, a goals story beside
   a flat illustration, a video-demo panel, a ring of guiding principles (the
   reference's "funfacts" reframed as principles — no invented statistics), a
   newsletter capture and an exchange-logo strip. Rendered in Orca's official
   violet/indigo palette so it reads exactly like the reference and on-brand.
   Two isolated, dramatically different CTAs: the demo panel and the newsletter.
   ========================================================================== */

/* ── Hero — the signature gradient blob with a wavy bottom cut ───────────── */
function GoalsHero() {
  return (
    <section className="relative">
      <div
        className="relative overflow-hidden pt-32 pb-40 md:pt-40 md:pb-52"
        style={{
          background:
            'radial-gradient(1200px 520px at 82% -10%, #8b5cf6 0%, transparent 55%),' +
            'radial-gradient(900px 620px at 0% 120%, #4c1d95 0%, transparent 60%),' +
            'linear-gradient(135deg, #6d28d9 0%, #5b21b6 55%, #4c1d95 100%)',
        }}
      >
        {/* big soft blob lumps for organic depth */}
        <span aria-hidden className="absolute -top-24 -left-24 h-[380px] w-[380px] rounded-full bg-white/10 blur-2xl" />
        <span aria-hidden className="absolute top-10 right-[-80px] h-[300px] w-[300px] rounded-[46%_54%_57%_43%/48%_40%_60%_52%] bg-[#7c3aed]/40 blur-xl" />

        {/* floating decorative shapes */}
        <span aria-hidden className="absolute left-[46%] top-20 h-4 w-4 rounded-[3px] border-2 border-white/25" />
        <span aria-hidden className="absolute left-[54%] top-1/2 text-2xl font-light text-white/25">+</span>
        <span aria-hidden className="absolute right-[16%] top-24 h-0 w-0 border-x-[9px] border-b-[15px] border-x-transparent border-b-white/20" />
        {/* the magenta→violet accent orb, echoing the reference */}
        <span
          aria-hidden
          className="absolute left-[58%] bottom-16 h-28 w-28 rounded-full opacity-90 blur-[1px]"
          style={{ background: 'linear-gradient(180deg, #a855f7, #ec4899)' }}
        />

        <div className="relative mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-6 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <h1 data-animate="title" className="font-display text-[clamp(2.6rem,6vw,4.2rem)] leading-[1.02] font-bold text-white">
              Our Goals
            </h1>
            <span className="mt-4 block h-[3px] w-16 rounded-full bg-white/70" />
            <p data-reveal className="mt-5 max-w-[440px] text-[16px] leading-[1.6] text-white/80">
              Why Orca exists, what we refuse to compromise on, and the kind of trader we’re building it for.
            </p>
          </div>
          <nav data-reveal className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] font-semibold text-white backdrop-blur-sm">
            Our Goals
            <ChevronRight className="h-4 w-4 text-white/60" strokeWidth={2.5} />
            <Link to="/" className="text-white/70 transition-colors hover:text-white">Home</Link>
          </nav>
        </div>
      </div>

      {/* wavy cut into the page canvas */}
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden className="-mt-px block h-[70px] w-full md:h-[110px]" style={{ fill: 'var(--color-canvas)' }}>
        <path d="M0,64 C240,10 480,110 720,74 C960,38 1200,4 1440,52 L1440,120 L0,120 Z" />
      </svg>
    </section>
  )
}

/* ── The goals story, beside a flat illustration ────────────────────────── */
function GoalsStory() {
  return (
    <section id="story" className="mx-auto max-w-[1200px] px-6 pb-8 md:px-10">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <h2 data-animate="title" className="font-display text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.08] font-bold text-ink">
            Why we built Orca
          </h2>
          <span className="mt-4 block h-[3px] w-14 rounded-full bg-indigo" />
          <div data-reveal className="mt-7 space-y-5 text-[15.5px] leading-[1.75] text-ink-mute">
            <p>
              Most traders don’t lose because they lack ideas — they lose because their edge is invisible to
              them. The wins and the mistakes blur together, the spreadsheet rots, and the same errors repeat
              for years. Our goal is simple: make your own trading legible to you, automatically.
            </p>
            <p>
              So we built a journal that writes itself. Connect read-only, drop any statement, and Orca
              reconstructs every trade, scores the <em>decision</em> — not just the P&amp;L — and surfaces the
              patterns you’d never catch by eye. No signals. No advice. Just the truth of what you actually do,
              turned into one better decision at a time.
            </p>
          </div>
          <div className="mt-8">
            <p className="font-display text-[18px] italic tracking-tight text-indigo">The Orca founding team</p>
            <p className="mt-1 text-[13px] text-ink-faint">Built from a trader, to a trader.</p>
          </div>
        </div>

        <div data-reveal className="relative flex justify-center">
          <div className="pointer-events-none absolute inset-0 -z-10 mx-auto my-auto h-[76%] w-[76%] rounded-full bg-[#f1e9fe] blur-2xl" />
          <img src="/goals-team.gif" alt="The Orca team building the product around a live dashboard" className="w-full max-w-[520px]" />
        </div>
      </div>
    </section>
  )
}

/* ── CTA #1 — the video-demo panel (watch it work) ──────────────────────── */
function DemoPanel() {
  return (
    <section className="mx-auto mt-16 max-w-[1200px] px-6 md:mt-24 md:px-10">
      <div className="grid overflow-hidden rounded-[28px] md:grid-cols-2">
        {/* screenshot + play */}
        <a
          href="/#demo"
          className="group relative flex min-h-[300px] items-center justify-center overflow-hidden p-6"
          style={{ background: 'linear-gradient(150deg, #6d28d9, #4c1d95)' }}
          aria-label="Watch the Orca demo"
        >
          <img src="/dashboard.png" alt="Orca dashboard" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-indigo shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-105">
            <span className="absolute inset-0 rounded-full bg-white/60 animate-ping" style={{ animationDuration: '2.4s' }} />
            <Play className="relative ml-1 h-8 w-8 fill-current" strokeWidth={0} />
          </span>
        </a>
        {/* copy card */}
        <div className="flex flex-col justify-center bg-canvas-deep p-8 md:p-12">
          <h2 className="font-display text-[clamp(1.6rem,2.8vw,2.2rem)] leading-[1.1] font-bold text-ink">See Orca in action</h2>
          <span className="mt-4 block h-[3px] w-12 rounded-full bg-indigo" />
          <p className="mt-5 max-w-[420px] text-[15px] leading-[1.7] text-ink-mute">
            A sixty-second tour: connect an account, watch the trades reconstruct themselves, and see the first
            insight land — before you’ve typed a single row.
          </p>
          <a href="/#demo" className="group mt-7 inline-flex w-fit items-center gap-2 text-[14.5px] font-semibold text-indigo">
            Watch the demo
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
          </a>
        </div>
      </div>
    </section>
  )
}

/* ── The principles (reference "funfacts", reframed — no invented numbers) ── */
const PRINCIPLES = [
  { Icon: ShieldCheck, title: 'Honest by design', note: 'Never inflate, never invent a number.', color: '#7c3aed' },
  { Icon: Lock, title: 'Your data stays yours', note: 'Read-only, private, never sold.', color: '#8b5cf6' },
  { Icon: Target, title: 'Process over profit', note: 'We score the decision, not the luck.', color: '#5b21b6' },
  { Icon: LineChart, title: 'Grounded in reality', note: 'Built on a real trading account.', color: '#6d28d9' },
]

function Principles() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[620px] text-center">
        <h2 data-animate="title" className="font-display text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.1] font-bold text-ink">
          The principles we build on
        </h2>
        <span className="mx-auto mt-4 block h-[3px] w-14 rounded-full bg-indigo" />
        <p data-reveal className="mx-auto mt-5 text-[15.5px] leading-[1.6] text-ink-mute">
          Four commitments that don’t bend — not for a feature, not for a metric, not for growth.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
        {PRINCIPLES.map((p) => (
          <div key={p.title} data-reveal className="flex flex-col items-center text-center">
            <div
              className="flex h-[132px] w-[132px] items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle at 30% 25%, #ffffff, #eef0f4)',
                boxShadow: '9px 9px 20px rgba(20,18,40,0.08), -9px -9px 20px rgba(255,255,255,0.95)',
              }}
            >
              <p.Icon className="h-11 w-11" strokeWidth={1.5} style={{ color: p.color }} />
            </div>
            <h3 className="mt-6 font-display text-[16.5px] font-bold text-ink">{p.title}</h3>
            <p className="mt-1.5 max-w-[190px] text-[13px] leading-snug text-ink-mute">{p.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── CTA #2 — newsletter capture, beside an illustration ─────────────────── */
function NewsletterBlock() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-8 md:px-10">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div data-reveal className="relative order-2 flex justify-center md:order-1">
          <div className="pointer-events-none absolute inset-0 -z-10 mx-auto my-auto h-[70%] w-[70%] rounded-full bg-[#f1e9fe] blur-2xl" />
          <img src="/newsletter.png" alt="Orca weekly email illustration" className="w-full max-w-[380px]" />
        </div>
        <div className="order-1 md:order-2">
          <h2 data-animate="title" className="font-display text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.1] font-bold text-ink">
            One sharp idea, every Sunday
          </h2>
          <span className="mt-4 block h-[3px] w-14 rounded-full bg-indigo" />
          <p data-reveal className="mt-5 max-w-[440px] text-[15.5px] leading-[1.7] text-ink-mute">
            A single, well-argued piece on trading psychology, data and risk — the kind you actually finish.
            No spam, no fluff, unsubscribe in a click.
          </p>
          <form className="mt-7 flex max-w-[440px] flex-col gap-2.5 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
            <span className="relative flex-1">
              <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={2} />
              <input
                type="email"
                required
                placeholder="you@email.com"
                className="w-full rounded-full border border-line bg-surface py-3.5 pr-5 pl-11 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-indigo/50 focus:ring-4 focus:ring-indigo/10"
              />
            </span>
            <button type="submit" className="rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-7 py-3.5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5">
              Subscribe now
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

/* ── Exchange-logo strip ─────────────────────────────────────────────────── */
const LOGOS = ['binance', 'bybit', 'coinbase', 'kraken', 'mexc', 'gateio', 'ibkr', 'cryptocom']

function LogoStrip() {
  return (
    <section className="mt-16 border-t border-line bg-surface/60 py-14 md:mt-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10">
        <p className="text-center text-[13px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
          Works with every exchange you already use
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {LOGOS.map((l) => (
            <img
              key={l}
              src={`/logos/${l}.png`}
              alt={l}
              className="h-8 w-auto max-w-[120px] object-contain opacity-55 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function OurGoalsPage() {
  return (
    <PageShell darkNav>
      <GoalsHero />
      <GoalsStory />
      <DemoPanel />
      <Principles />
      <NewsletterBlock />
      <LogoStrip />
    </PageShell>
  )
}
