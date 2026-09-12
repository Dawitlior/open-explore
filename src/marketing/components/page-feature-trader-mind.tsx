import { useState, type ReactNode } from 'react'
import {
  Brain,
  Play,
  ChevronDown,
  Check,
  Compass,
  MessageCircle,
  ScanFace,
  Sparkles,
  ShieldCheck,
  Clock,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { PageShell } from './page-shell'

/* ============================================================================
   TRADER MIND (/features/trader-mind) — the "Appure" design in a MONOCHROME
   palette (black / charcoal / grey — no violet), with Appure's line-art
   personality: hand-drawn squiggles and arrows, skewed panels behind the
   visuals, and a marker highlight on the accent word. Content: the behavioral
   diagnostic → 8 axes → archetype → a coach calibrated to who you are.
   Two isolated CTAs: the "meet your archetype" band and the trial band.
   ========================================================================== */

const INK = '#0f1116'

/* ── the eight psychological axes ───────────────────────────────────────── */
const AXES = [
  { k: 'Risk', v: 0.72 },
  { k: 'Confidence', v: 0.55 },
  { k: 'Process', v: 0.82 },
  { k: 'Independence', v: 0.6 },
  { k: 'Discipline', v: 0.76 },
  { k: 'Flexibility', v: 0.48 },
  { k: 'Emotion', v: 0.4 },
  { k: 'Patience', v: 0.66 },
]

/* An 8-axis radar in ink line-art — the signature Trader Mind visual. */
function Radar({ size = 300 }: { size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const R = size / 2 - 46
  const pt = (i: number, r: number) => {
    const a = (-90 + i * 45) * (Math.PI / 180)
    return [cx + R * r * Math.cos(a), cy + R * r * Math.sin(a)]
  }
  const ring = (r: number) => AXES.map((_, i) => pt(i, r).join(',')).join(' ')
  const data = AXES.map((ax, i) => pt(i, ax.v).join(',')).join(' ')
  return (
    <svg viewBox={`-52 -8 ${size + 104} ${size + 16}`} className="w-full max-w-[400px]" aria-hidden>
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={ring(r)} fill="none" stroke="#e7e8ec" strokeWidth={1} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#eef0f3" strokeWidth={1} />
      })}
      <polygon points={data} fill="rgba(15,17,22,0.08)" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      {AXES.map((ax, i) => {
        const [x, y] = pt(i, ax.v)
        return <circle key={i} cx={x} cy={y} r={4} fill={INK} />
      })}
      {AXES.map((ax, i) => {
        const [x, y] = pt(i, 1.18)
        const cos = Math.cos((-90 + i * 45) * (Math.PI / 180))
        const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'
        return (
          <text key={ax.k} x={x} y={y + 3} textAnchor={anchor} className="fill-ink-mute" style={{ fontSize: 10.5, fontWeight: 600 }}>
            {ax.k}
          </text>
        )
      })}
    </svg>
  )
}

/* ── Appure line-art accents ────────────────────────────────────────────── */
function Squiggle({ className = '' }: { className?: string }) {
  return (
    <svg className={'pointer-events-none absolute ' + className} width="48" height="14" viewBox="0 0 48 14" fill="none" aria-hidden>
      <path d="M2 8C6 2 10 2 14 8s8 6 12 0 8-6 12 0 6 4 8 2" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
function DecoArrow({ className = '' }: { className?: string }) {
  return (
    <svg className={'pointer-events-none absolute ' + className} width="42" height="36" viewBox="0 0 42 36" fill="none" aria-hidden>
      <path d="M4 4c16 3 26 11 31 26" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M26 27l9 4-1-10" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function Dots({ className = '' }: { className?: string }) {
  return (
    <svg className={'pointer-events-none absolute ' + className} width="46" height="46" viewBox="0 0 46 46" fill={INK} aria-hidden>
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}-${c}`} cx={5 + c * 18} cy={5 + r * 18} r={2.4} />))}
    </svg>
  )
}

/* ── shared bits (monochrome) ───────────────────────────────────────────── */
function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-bold tracking-[0.14em] text-ink-mute uppercase">{children}</span>
}
/** Accent word with a soft black marker highlight. */
function Mark({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span aria-hidden className="absolute inset-x-[-3px] bottom-[0.1em] z-0 h-[0.32em] rounded-sm bg-ink/12" />
    </span>
  )
}
function PrimaryBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="rounded-xl bg-ink px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_12px_28px_-10px_rgba(15,17,22,0.5)] transition-transform hover:-translate-y-0.5">
      {children}
    </a>
  )
}
function GhostBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3.5 text-[14.5px] font-semibold text-ink transition-colors hover:border-ink/40">
      {children}
    </a>
  )
}
function LearnMore({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="group inline-flex items-center gap-2 text-[14px] font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink">
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.25} />
    </a>
  )
}
/* skewed grey slab behind a visual (Appure parallelogram) */
function Slab({ skew = -6 }: { skew?: number }) {
  return <span aria-hidden className="absolute -inset-4 -z-10 rounded-[28px] bg-canvas-deep" style={{ transform: `skewX(${skew}deg)` }} />
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-36 pb-16 md:px-10 md:pt-44 md:pb-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Eyebrow>Trader Mind</Eyebrow>
          <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.6rem,5.6vw,4.4rem)] leading-[1.02] font-bold text-ink">
            Know the trader <Mark>behind the trades</Mark>
          </h1>
          <p data-reveal className="mt-6 max-w-[480px] text-[16.5px] leading-[1.6] text-ink-mute">
            Two traders run the exact same strategy and get opposite results. The difference isn’t the system —
            it’s the mind. Trader Mind maps yours across eight axes, names your archetype, and calibrates your
            coach to who you actually are.
          </p>
          <div data-reveal className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:flex [&>a]:w-full [&>a]:items-center [&>a]:justify-center sm:[&>a]:inline-flex sm:[&>a]:w-auto">
            <PrimaryBtn href="/signup">Take the diagnostic</PrimaryBtn>
            <GhostBtn href="/#demo">
              <Play className="h-4 w-4 fill-ink text-ink" strokeWidth={0} /> Watch how it works
            </GhostBtn>
          </div>
        </div>

        <div data-reveal className="relative flex justify-center">
          <span aria-hidden className="absolute -z-10 h-[380px] w-[380px] rounded-[42%_58%_60%_40%/45%_45%_55%_55%] bg-canvas-deep" />
          <Squiggle className="left-2 top-4 text-ink" />
          <DecoArrow className="right-4 top-0 rotate-[16deg]" />
          <Dots className="-bottom-2 left-0 opacity-70" />
          <Radar />
          {/* floating archetype chip */}
          <div className="absolute right-0 top-24 flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 elev-3 sm:-right-2 sm:top-4 sm:px-4 sm:py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white"><Compass className="h-4 w-4" strokeWidth={2} /></span>
            <span className="text-[13px] leading-tight"><span className="text-ink-faint">Your archetype</span><br /><b className="text-ink">The Strategist</b></span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Eight axes (text left, axis bars right on a grey slab) ───────────────── */
function EightAxes() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>The map</Eyebrow>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-bold text-ink">
            Your mind, measured on <Mark>eight axes</Mark>
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            Not vibes — a structured, branching questionnaire that scores the traits that actually move your
            P&amp;L: how you size, how you wait, how you react to a loss, and how much the crowd moves you.
          </p>
          <div data-reveal className="mt-7"><LearnMore href="/#demo">See the eight axes</LearnMore></div>
        </div>
        <div data-reveal className="relative">
          <Slab skew={-6} />
          <Squiggle className="-right-2 -top-3 text-ink" />
          <Dots className="-bottom-4 -left-3 opacity-70" />
          <div className="rounded-[24px] border border-line bg-surface p-7 elev-3 md:p-8">
            <div className="flex flex-col gap-3.5">
              {AXES.map((ax) => (
                <div key={ax.k} className="grid grid-cols-[100px_minmax(0,1fr)_36px] items-center gap-3">
                  <span className="text-[13px] font-semibold text-ink">{ax.k}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-canvas-deep">
                    <span className="block h-full rounded-full" style={{ width: `${ax.v * 100}%`, background: `linear-gradient(90deg,#6b7180,${INK})` }} />
                  </span>
                  <span className="tnum text-right text-[12px] font-semibold text-ink-mute">{Math.round(ax.v * 100)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── How it works (3 steps + dashed connectors) ─────────────────────────── */
const STEPS = [
  { Icon: ScanFace, title: 'Answer honestly', body: 'A short, branching questionnaire that adapts to you — it goes deep only where your profile is still forming.' },
  { Icon: Compass, title: 'Get your archetype', body: 'A synthesis names your type — Strategist, Spontaneous, Analytical, Competitor — with your eight-axis profile.' },
  { Icon: Sparkles, title: 'Your coach calibrates', body: 'The profile is injected into every Orca Coach chat, so its tone and advice fit who you are — not a template.' },
]
function HowItWorks() {
  return (
    <section className="relative px-6 py-20 md:px-10 md:py-28" style={{ background: 'var(--color-canvas-deep)' }}>
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>How it works</Eyebrow>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1] font-bold text-ink">
          Three steps to a coach that gets you
        </h2>
      </div>
      <div className="relative mx-auto mt-16 grid max-w-[1000px] gap-10 md:grid-cols-3">
        <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-8 hidden h-16 w-full md:block" viewBox="0 0 1000 60" preserveAspectRatio="none">
          <path d="M180,30 C280,-10 380,70 500,30" fill="none" stroke="#c3c7cf" strokeWidth={2} strokeDasharray="5 7" />
          <path d="M500,30 C620,-10 720,70 820,30" fill="none" stroke="#c3c7cf" strokeWidth={2} strokeDasharray="5 7" />
        </svg>
        {STEPS.map((s, i) => (
          <div key={s.title} data-reveal className="relative flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface text-ink elev-2">
              <s.Icon className="h-7 w-7" strokeWidth={1.7} />
            </span>
            <span className="mt-4 text-[12px] font-bold tracking-widest text-ink-faint">STEP {i + 1}</span>
            <h3 className="mt-1 font-display text-[18px] font-bold text-ink">{s.title}</h3>
            <p className="mt-2 max-w-[280px] text-[13.5px] leading-[1.6] text-ink-mute">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Sneak peek: a sample question card + stats ──────────────────────────── */
function SneakPeek() {
  const opts = [
    { tag: 'Planner', on: false },
    { tag: 'Analytical', on: true },
    { tag: 'Spontaneous', on: false },
    { tag: 'Competitive', on: false },
  ]
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>Not a personality quiz</Eyebrow>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-bold text-ink">
            It already knows how you <Mark>actually</Mark> trade
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            Before the first question, Trader Mind reads your real sample size and win rate — so every question
            lands in the context of your trading, not in a vacuum.
          </p>
          <div data-reveal className="mt-8 flex gap-10">
            {[['262', 'question pool'], ['8', 'axes scored'], ['1', 'archetype']].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-[34px] font-bold text-ink">{n}</div>
                <div className="mt-1 text-[13px] text-ink-mute">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div data-reveal className="relative">
          <Slab skew={6} />
          <DecoArrow className="-left-3 -top-2 -scale-x-100 rotate-[8deg]" />
          <Dots className="-bottom-4 -right-3 opacity-70" />
          <div className="rounded-[24px] border border-line bg-surface p-7 elev-3 md:p-8">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold tracking-widest text-ink-faint">QUESTION 14 / 32</span>
              <span className="rounded-full bg-canvas-deep px-2.5 py-0.5 text-[11px] font-bold text-ink">Persona</span>
            </div>
            <h3 className="mt-4 font-display text-[19px] font-bold text-ink">Which sounds most like you before a trade?</h3>
            <div className="mt-5 flex flex-col gap-2.5">
              {opts.map((o) => (
                <div
                  key={o.tag}
                  className={
                    'flex items-center justify-between rounded-xl border px-4 py-3 text-[14px] font-medium transition-colors ' +
                    (o.on ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink')
                  }
                >
                  {o.tag === 'Planner' && 'I map the entry, target and stop first.'}
                  {o.tag === 'Analytical' && 'I want the data to confirm it before I act.'}
                  {o.tag === 'Spontaneous' && 'If it feels right, I take it.'}
                  {o.tag === 'Competitive' && 'I hate missing a move others are catching.'}
                  <span className={'flex h-5 w-5 items-center justify-center rounded-full border ' + (o.on ? 'border-white bg-white text-ink' : 'border-line')}>
                    {o.on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Coach calibration (chat mock on a grey slab) ───────────────────────── */
function CoachCalibration() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div data-reveal className="relative order-2 lg:order-1">
          <Slab skew={-6} />
          <Squiggle className="-left-2 -top-3 text-ink" />
          <div className="rounded-[24px] border border-line bg-surface p-6 elev-3 md:p-7">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white"><Sparkles className="h-4 w-4" strokeWidth={2} /></span>
              <span className="text-[13px] font-bold text-ink">Orca Coach</span>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-canvas-deep px-2.5 py-0.5 text-[11px] font-bold text-ink"><Compass className="h-3 w-3" strokeWidth={2.5} /> Strategist</span>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-canvas-deep px-4 py-2.5 text-[13.5px] text-ink">
                I keep moving my stop. Why?
              </div>
              <div className="mr-auto max-w-[88%] rounded-2xl rounded-tl-sm px-4 py-3 text-[13.5px] leading-[1.55] text-white" style={{ background: 'linear-gradient(150deg,#1a1d24,#0f1116)' }}>
                As a <b>Strategist</b>, your process score is high but your emotion axis spikes on open risk. You
                don’t lack a plan — you override it under heat. Let’s pre-commit the stop before entry, so the
                calm you stays in charge.
              </div>
            </div>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <Eyebrow>The payoff</Eyebrow>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.08] font-bold text-ink">
            A coach that speaks to <Mark>who you are</Mark>
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15.5px] leading-[1.65] text-ink-mute">
            Your profile is saved and injected into every Orca Coach conversation. Same question, different
            trader, different answer — the coach adjusts its tone and advice to your archetype, permanently.
          </p>
          <div data-reveal className="mt-7"><LearnMore href="/features/journal">See it in your journal</LearnMore></div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #1 — "meet your archetype" black band ──────────────────────────── */
function ArchetypeCTA() {
  return (
    <section className="px-6 py-10 md:px-10 md:py-16">
      <div className="relative mx-auto max-w-[1080px] overflow-hidden rounded-[28px] px-8 py-14 text-center md:px-16 md:py-20" style={{ background: 'linear-gradient(135deg,#1a1d24 0%,#0f1116 100%)' }}>
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(600px 260px at 50% -10%, rgba(255,255,255,0.10), transparent 60%)' }} />
        <Squiggle className="left-10 top-8 [&_path]:stroke-white/40" />
        <Dots className="right-10 bottom-8 opacity-30 [&_circle]:fill-white" />
        <div className="relative">
          <h2 data-animate="title" className="mx-auto max-w-[640px] font-display text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.12] font-bold text-white">
            Which trader are you, really?
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[15.5px] leading-[1.6] text-white/70">
            Ten minutes of honest answers, and a coach that finally gets you. Discover your archetype.
          </p>
          <div data-reveal className="mt-9 flex justify-center">
            <a href="/signup" className="rounded-xl bg-white px-8 py-3.5 text-[14.5px] font-semibold text-ink shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5">
              Take the diagnostic
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── More features (3-col with black square icons) ──────────────────────── */
const POWERS = [
  { Icon: Compass, title: 'A personal archetype', body: 'A crisp read on who you are as a trader — your strengths, and the blind spots that cost you.' },
  { Icon: MessageCircle, title: 'Permanent coach context', body: 'Every coaching chat starts already knowing your profile — no re-explaining yourself, ever.' },
  { Icon: ScanFace, title: 'Self vs. reality', body: 'Over time, Orca crosses who you say you are with what your journal shows — and names the gap.' },
]
function Powers() {
  return (
    <section className="mx-auto max-w-[1160px] px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>What it powers</Eyebrow>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.8rem)] leading-[1.1] font-bold text-ink">
          One diagnostic, felt everywhere
        </h2>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {POWERS.map((p) => (
          <div key={p.title} data-reveal className="rounded-2xl border border-line bg-surface p-7 elev-1 transition-all duration-300 hover:-translate-y-1 hover:elev-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white"><p.Icon className="h-6 w-6" strokeWidth={1.8} /></span>
            <h3 className="mt-5 font-display text-[18px] font-bold text-ink">{p.title}</h3>
            <p className="mt-2 text-[14px] leading-[1.65] text-ink-mute">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── FAQ (accordion) ─────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'Is this just a personality test?', a: 'No. It starts from your real trade data — sample size and win rate — and branches based on your answers, so it reads a trader, not a generic person.', Icon: ScanFace },
  { q: 'How long does it take?', a: 'Around ten minutes. The questionnaire is adaptive: it goes deep only where your profile is still forming and skips what it has already settled.', Icon: Clock },
  { q: 'Is my profile private?', a: 'Yes. Your diagnostic is stored to your account only, protected by row-level security — you’re the only one who can see it.', Icon: ShieldCheck },
  { q: 'Does my archetype ever change?', a: 'It can. A profile from a year ago no longer represents you — Orca tracks its age and you can re-take the diagnostic whenever you’ve evolved.', Icon: RefreshCw },
]
function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="mx-auto max-w-[1120px] px-6 py-20 md:px-10 md:py-28">
      <div className="mx-auto max-w-[720px] text-center">
        <Eyebrow>Good to know</Eyebrow>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.1] font-bold text-ink">
          Frequently asked questions
        </h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {FAQS.map((f, i) => {
          const isOpen = open === i
          return (
            <button
              key={f.q}
              onClick={() => setOpen(isOpen ? -1 : i)}
              className={'rounded-2xl border bg-surface p-6 text-left transition-all duration-300 ' + (isOpen ? 'border-ink/30 elev-2' : 'border-line hover:border-ink/20')}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas-deep text-ink"><f.Icon className="h-[18px] w-[18px]" strokeWidth={2} /></span>
                <span className="flex-1 font-display text-[16px] font-bold text-ink">{f.q}</span>
                <ChevronDown className={'h-5 w-5 text-ink-faint transition-transform duration-300 ' + (isOpen ? 'rotate-180' : '')} strokeWidth={2} />
              </div>
              {isOpen && <p className="mt-3 pl-12 text-[14px] leading-[1.65] text-ink-mute">{f.a}</p>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ── CTA #2 — closing trial band ─────────────────────────────────────────── */
function TrialCTA() {
  return (
    <section className="px-6 pb-8 md:px-10 md:pb-16">
      <div className="mx-auto grid max-w-[1120px] items-center gap-8 rounded-[28px] border border-line bg-canvas-deep px-8 py-12 md:grid-cols-2 md:px-14 md:py-16">
        <div>
          <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.08] font-bold text-ink">
            Discover your trading archetype today
          </h2>
          <p data-reveal className="mt-4 max-w-[420px] text-[15px] leading-[1.6] text-ink-mute">
            Free with your account. No credit card, and your profile is yours alone.
          </p>
        </div>
        <div className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap [&>a]:flex [&>a]:w-full [&>a]:items-center [&>a]:justify-center sm:[&>a]:inline-flex sm:[&>a]:w-auto">
            <PrimaryBtn href="/signup">Start free</PrimaryBtn>
            <GhostBtn href="/#demo">
              <Brain className="h-4 w-4 text-ink" strokeWidth={2} /> See it in action
            </GhostBtn>
          </div>
          <span className="flex items-center gap-1.5 text-[13px] text-ink-faint"><Check className="h-4 w-4 text-ink" strokeWidth={2.5} /> No credit card required</span>
        </div>
      </div>
    </section>
  )
}

export function TraderMindFeaturePage() {
  return (
    <PageShell>
      <Hero />
      <EightAxes />
      <HowItWorks />
      <SneakPeek />
      <CoachCalibration />
      <ArchetypeCTA />
      <Powers />
      <Faq />
      <TrialCTA />
    </PageShell>
  )
}
