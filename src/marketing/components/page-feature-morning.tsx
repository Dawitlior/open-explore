import type { ReactNode } from 'react'
import { BrainCircuit, Check, ArrowRight, Crosshair, Eye, HeartPulse, Moon, Gauge, BarChart3, Brain, Sunrise } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'
import { FeatureHero, FeatureIntro, FeatureSectionHead, WaveBand, Sparkles, Blob } from './features/blocks'
import { FEATURES } from './features/catalog'

/* ============================================================================
   MARKET MORNING ANALYSIS (/features/morning) — the Routine pre-market briefing.
   Hero → why it matters → the elements: mindset, daily goals, bias/structure/
   mental state, key levels & setups, emotional score.
   ========================================================================== */

const PSYCH_CHECK = [
  { q: 'Did I sleep well?', a: 'No', bad: true },
  { q: 'Am I feeling pressure?', a: 'No', bad: false },
  { q: 'Am I seeking excitement?', a: 'No', bad: false },
  { q: 'Am I trying to recover losses?', a: 'No', bad: false },
]

const BIAS =['Bullish', 'Bearish', 'Neutral', 'Expansion', 'Contraction']
const STRUCTURE = ['Markup', 'Markdown', 'Accumulation', 'Distribution', 'Range']
const MENTAL = ['Focused', 'Calm', 'Confident', 'Sharp', 'Impulsive', 'Hesitant', 'Tired']

const LEVELS = [
  { sym: 'BTC', r: '100,000 / 100,800', s: '98,500 / 97,200' },
  { sym: 'ETH', r: '3,500 / 3,600', s: '3,350 / 3,250' },
  { sym: 'SOL', r: '160 / 165', s: '152 / 148' },
]

const SETUPS = [
  'BTC — short rejection at 100K, bearish engulfing on 1H, target 98,500. RR 1:2.5',
  'SOL — long pullback to 152 with bullish reversal, target 162. RR 1:2',
]

const GRID_SPARKS = [
  { top: '6%', left: '4%', size: 13, delay: '0s' },
  { top: '10%', left: '94%', size: 10, delay: '1.1s' },
  { top: '92%', left: '9%', size: 12, delay: '0.7s' },
  { top: '95%', left: '90%', size: 11, delay: '1.8s' },
]

/* ── small building blocks ───────────────────────────────────────────────── */

function OptionChips({ items, active }: { items: string[]; active: string }) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className={
            'rounded-full px-2.5 py-1 text-[11px] font-semibold ' +
            (it === active ? 'bg-amber text-white shadow-sm' : 'border border-line bg-canvas text-ink-faint')
          }
        >
          {it}
        </span>
      ))}
    </div>
  )
}

/* Bias — a half-gauge with the needle pointing to the selected zone (Neutral = up). */
function BiasGauge() {
  return (
    <svg viewBox="0 0 140 84" className="mx-auto h-[84px] w-[150px]">
      <path d="M14 74 A56 56 0 0 1 126 74" fill="none" stroke="#e8484d" strokeWidth="9" strokeLinecap="round" opacity="0.35" />
      <path d="M45 34 A56 56 0 0 1 95 34" fill="none" stroke="#e0a53a" strokeWidth="9" strokeLinecap="round" />
      <path d="M95 34 A56 56 0 0 1 126 74" fill="none" stroke="#1a1d24" strokeWidth="9" strokeLinecap="round" opacity="0.35" />
      <line x1="70" y1="74" x2="70" y2="26" stroke="#111318" strokeWidth="4" strokeLinecap="round" />
      <circle cx="70" cy="74" r="6" fill="#111318" />
    </svg>
  )
}

/* Structure — a channel with price bouncing between support & resistance (Range). */
function RangeGlyph() {
  return (
    <svg viewBox="0 0 150 84" className="mx-auto h-[84px] w-[160px]">
      <line x1="8" y1="18" x2="142" y2="18" stroke="#c9ccd6" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="8" y1="66" x2="142" y2="66" stroke="#c9ccd6" strokeWidth="2" strokeDasharray="4 4" />
      <polyline
        points="10,60 30,22 52,64 74,20 96,62 118,24 140,60"
        fill="none"
        stroke="#e0a53a"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* Mental state — an energy meter reading low (Tired). */
function EnergyMeter() {
  return (
    <div className="flex h-[84px] flex-col items-center justify-center gap-3">
      <Moon className="h-8 w-8 text-amber" strokeWidth={1.75} />
      <div className="h-2.5 w-[130px] overflow-hidden rounded-full bg-canvas-deep">
        <div className="h-full rounded-full bg-amber" style={{ width: '38%' }} />
      </div>
      <span className="text-[10.5px] font-semibold text-ink-faint">Energy · 38%</span>
    </div>
  )
}

function SelectorCard({
  label,
  Icon,
  visual,
  value,
  items,
  active,
}: {
  label: string
  Icon: typeof Moon
  visual: ReactNode
  value: string
  items: string[]
  active: string
}) {
  return (
    <div data-reveal className="rounded-3xl border border-line bg-surface p-6 elev-2 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-soft text-amber">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="micro text-ink-faint">{label}</span>
      </div>
      <div className="mt-5 mb-4 flex items-center justify-center">{visual}</div>
      <div className="text-center">
        <span className="micro text-ink-faint">Selected</span>
        <div className="font-display text-[22px] font-bold text-ink">{value}</div>
      </div>
      <OptionChips items={items} active={active} />
    </div>
  )
}

function MindsetVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]">
      <HoloGlow className="!inset-x-[-6%] !inset-y-[-6%]" opacity={0.34} blur={70} />
      <div
        className="relative overflow-hidden rounded-[28px] border border-line p-6"
        style={{ background: 'radial-gradient(440px 250px at 50% 12%, rgba(124,58,237,0.14), transparent 62%), #f4effe' }}
      >
        <img src="/mindset.gif" alt="Morning mindset" className="mx-auto block w-[76%] max-w-[340px]" />
      </div>
      <div className="float-slow absolute -top-5 -right-4 w-[236px] rounded-2xl border border-line bg-surface p-4 elev-3">
        <div className="mb-2.5 flex items-center gap-1.5">
          <BrainCircuit className="h-3.5 w-3.5 text-violet" strokeWidth={2} />
          <span className="micro text-ink-faint">Psychology check</span>
        </div>
        <div className="flex flex-col gap-2">
          {PSYCH_CHECK.map((r) => (
            <div key={r.q} className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] leading-tight text-ink-mute">{r.q}</span>
              <span className={'rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ' + (r.bad ? 'bg-rose-soft text-rose' : 'bg-teal-soft text-teal')}>
                {r.a}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MorningAnalysisPage() {
  const c = FEATURES.morning
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
        backdrop={['wave', 'scene']}
      />

      {/* Why morning analysis — editorial block (text right, cluster left) */}
      <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
        <div className="mx-auto grid max-w-[1200px] items-center gap-16 lg:grid-cols-2 lg:gap-12">
          {/* Layered visual cluster (left) */}
          <div data-side="left" className="relative mx-auto w-full max-w-[560px] lg:order-1">
            <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.34} blur={72} />
            <Blob variant="hero" morph from="#fbbf24" to="#b45309" className="pointer-events-none absolute -top-[16%] -left-[16%] -z-10 h-[440px] w-[440px] opacity-20" />
            <Blob variant="side" morph from="#a78bfa" to="#6d28d9" className="pointer-events-none absolute -right-[12%] -bottom-[12%] -z-10 h-[320px] w-[320px] opacity-[0.14]" />
            <div className="[perspective:1600px]">
              <div className="transition-transform duration-500 ease-out [transform:rotateY(6deg)_rotateX(3deg)] hover:[transform:rotateY(2deg)_rotateX(1deg)]">
                <div className="overflow-hidden rounded-[16px] border border-line bg-surface p-2 elev-3">
                  <img src="/morning-analysis.png" alt="Market morning analysis" className="block w-full rounded-[10px] object-cover" />
                </div>
              </div>
            </div>
            <div className="float-slower absolute -top-4 -left-3 rounded-2xl border border-line bg-surface px-4 py-2.5 elev-3">
              <div className="micro text-ink-faint">Emotion</div>
              <div className="tnum text-[15px] font-bold text-amber">6 / 10</div>
            </div>
          </div>

          {/* Copy (right) */}
          <div className="lg:order-2">
            <h2 data-animate="title" className="font-display text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.08] font-bold text-ink">
              The market opens once. <br className="hidden sm:block" />Meet it ready.
            </h2>
            <span data-reveal className="mt-6 block h-[3px] w-24 rounded-full bg-gradient-to-r from-amber to-rose" />
            <p data-reveal className="mt-7 max-w-[500px] text-[17px] leading-[1.6] font-semibold text-amber">
              Before the first trade, get clear on yesterday, today, and yourself.
            </p>
            <p data-reveal className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              The open is the one moment the market resets — and it’s the first thing you should meet
              with a plan. Morning analysis walks you through what happened yesterday, what you’re seeing
              right now, and where the key levels sit.
            </p>
            <p data-reveal className="mt-4 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Then it turns inward. Are you calm, or still carrying yesterday’s loss? Did you sleep
              enough? Are you emotionally loaded? Naming your state — honestly — is what separates a
              disciplined session from a reactive one.
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {['Recap yesterday, read today, mark your levels', 'Check in with how you actually feel'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] font-semibold text-ink">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <a
              href="/#demo"
              data-reveal
              className="group mt-9 inline-flex items-center gap-3 rounded-full border border-line bg-surface py-1.5 pr-1.5 pl-6 text-[14px] font-semibold text-ink elev-1 transition-all hover:-translate-y-0.5 hover:elev-3"
            >
              See it in action
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber to-rose text-white">
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.25} />
              </span>
            </a>
          </div>
        </div>
      </section>

      <FeatureIntro>
        Five checks, two minutes — <span className="text-amber">and you meet the open with a plan.</span>
      </FeatureIntro>

      {/* 1 — Morning Mindset */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <Sparkles points={GRID_SPARKS} color="rgba(124,58,237,0.45)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div data-side="left">
            <span className="micro font-semibold text-violet">01 · Morning Mindset</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-violet" />
            <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold text-ink">
              Trade the day you’re <span className="text-violet">actually having.</span>
            </h3>
            <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">
              A two-minute check-in on how you slept, the pressure you carry and the state you’re in —
              turned into a clear call: trade full size, size down, or sit this one out.
            </p>
          </div>
          <div data-side="right"><MindsetVisual /></div>
        </div>
      </section>

      {/* 2 — Daily Goals / Commitment */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <Blob variant="side" morph from="#3a4150" to="#171a21" className="pointer-events-none absolute top-1/2 -left-32 -z-10 h-[520px] w-[520px] -translate-y-1/2 opacity-[0.06]" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div data-side="left" className="lg:order-2">
            <span className="micro font-semibold text-teal">02 · Daily Goals</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-teal" />
            <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold text-ink">
              Sign a contract <span className="text-teal">with yourself.</span>
            </h3>
            <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">
              Pick the promises that matter today and commit to them before the first candle. It’s a
              small ritual that quietly keeps you honest when the market gets loud.
            </p>
          </div>
          <div data-side="right" className="relative mx-auto w-full max-w-[480px] lg:order-1">
            <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.32} blur={70} />
            {/* layered blob backgrounds */}
            <Blob variant="hero" morph from="#3a4150" to="#171a21" className="pointer-events-none absolute -top-[14%] -left-[14%] -z-10 h-[420px] w-[420px] opacity-20" />
            <Blob variant="side" morph from="#a78bfa" to="#6d28d9" className="pointer-events-none absolute -right-[10%] -bottom-[10%] -z-10 h-[300px] w-[300px] opacity-[0.14]" />

            {/* checklist illustration on a soft stage */}
            <div
              className="relative overflow-hidden rounded-[28px] border border-line p-8"
              style={{ background: 'radial-gradient(440px 240px at 50% 10%, rgba(26,29,36,0.12), transparent 62%), #f4effe' }}
            >
              <img src="/goals-checklist.gif" alt="Daily goals checklist" className="mx-auto block w-[68%] max-w-[300px]" />
            </div>

            {/* floating commitment chips */}
            <div className="float-slow absolute -top-4 -right-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-teal elev-3">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Follow the plan
            </div>
            <div className="float-slower absolute top-[46%] -left-5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-[12.5px] font-semibold text-teal elev-3">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Max 3 trades
            </div>
            <div className="float-slow absolute -bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-teal px-4 py-2 text-[12px] font-bold tracking-wide text-white uppercase elev-3">
              <Check className="h-3.5 w-3.5" strokeWidth={3} /> Committed
            </div>
          </div>
        </div>
      </section>

      {/* CTA #1 — after section 2 (readiness angle; pre-flight checklist) */}
      <PreflightChecklistCTA />

      <WaveBand
        title={<>Read the room. <span className="text-violet">Then read yourself.</span></>}
        sub="A morning routine only works when it covers both the chart and the trader behind it."
      />

      {/* 3 — Bias + Structure + Mental State */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <Sparkles points={GRID_SPARKS} color="rgba(224,165,58,0.45)" />
        <div className="mx-auto max-w-[900px]">
          <FeatureSectionHead
            eyebrow="03 · Bias · Structure · Mental State"
            accent="amber"
            title={<>Name the market, <span className="text-amber">and your mind.</span></>}
            sub="One tap each. Your directional bias, the market structure you’re in, and the mental state you’re bringing — logged before you trade, so patterns surface over time."
          />
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            <SelectorCard label="Market bias" Icon={Gauge} visual={<BiasGauge />} value="Neutral" items={BIAS} active="Neutral" />
            <SelectorCard label="Market structure" Icon={BarChart3} visual={<RangeGlyph />} value="Range" items={STRUCTURE} active="Range" />
            <SelectorCard label="Mental state" Icon={Brain} visual={<EnergyMeter />} value="Tired" items={MENTAL} active="Tired" />
          </div>
        </div>
      </section>

      {/* 4 — Key Levels & Setups Watching */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <Blob variant="side" morph from="#7c3aed" to="#4c1d95" className="pointer-events-none absolute top-1/2 -right-32 -z-10 h-[520px] w-[520px] -translate-y-1/2 opacity-[0.06]" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div data-side="left">
            <span className="micro font-semibold text-indigo">04 · Key Levels &amp; Setups</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-indigo" />
            <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold text-ink">
              Decide where you’ll act — <span className="text-indigo">before price gets there.</span>
            </h3>
            <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">
              Mark your resistance and support, then write the exact setups you’re hunting with their
              risk-reward. When the level hits, you execute a plan instead of a reaction.
            </p>
          </div>
          <div data-side="right" className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-surface p-5 elev-2">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-soft text-indigo"><Crosshair className="h-4 w-4" strokeWidth={2} /></span>
                <span className="micro text-ink-faint">Key levels</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {LEVELS.map((l) => (
                  <div key={l.sym} className="flex items-center gap-3 text-[13px]">
                    <span className="w-10 shrink-0 font-bold text-ink">{l.sym}</span>
                    <span className="tnum text-teal">R {l.r}</span>
                    <span className="text-ink-faint">·</span>
                    <span className="tnum text-rose">S {l.s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-5 elev-2">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-soft text-violet"><Eye className="h-4 w-4" strokeWidth={2} /></span>
                <span className="micro text-ink-faint">Setups watching</span>
              </div>
              <ul className="flex flex-col gap-2.5">
                {SETUPS.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-mute">
                    <span className="font-bold text-indigo">{i + 1}.</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Emotional Score */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
        <Sparkles points={GRID_SPARKS} color="rgba(229,72,77,0.4)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-16">
          <div data-side="left" className="lg:order-2">
            <span className="micro font-semibold text-rose">05 · Emotional Score</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-rose" />
            <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold text-ink">
              Put a number on <span className="text-rose">how you feel.</span>
            </h3>
            <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">
              One honest score, 1 to 10. Over weeks it becomes data — you’ll see how your emotional
              state tracks your results, and learn the readings where you should trade lighter.
            </p>
          </div>
          <div data-side="right" className="lg:order-1">
            <div className="relative mx-auto max-w-[440px] rounded-3xl border border-line bg-surface p-8 elev-3">
              <HoloGlow className="!inset-x-[-6%] !inset-y-[-6%]" opacity={0.3} blur={64} />
              <div className="relative flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-soft text-rose"><HeartPulse className="h-5 w-5" strokeWidth={2} /></span>
                <span className="micro text-ink-faint">Today’s emotional score</span>
              </div>
              <div className="relative mt-6 flex items-end gap-3">
                <span className="font-display text-[64px] leading-none font-bold text-ink">6</span>
                <span className="mb-2 text-[18px] font-semibold text-ink-faint">/ 10</span>
              </div>
              {/* scale */}
              <div className="relative mt-6">
                <div className="h-2.5 w-full rounded-full" style={{ background: 'linear-gradient(90deg,#e5484d,#e0a53a 55%,#1a1d24)' }} />
                <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-surface bg-ink shadow" style={{ left: '60%' }} />
                <div className="mt-2 flex justify-between text-[10.5px] font-semibold text-ink-faint">
                  <span>1 · Overloaded</span>
                  <span>10 · Clear</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA #2 — after the last section (discipline angle; before the bell) */}
      <BeforeTheBellCTA />
    </PageShell>
  )
}

/* ── CTA #1 — a pre-flight checklist that clears you for the open. Angle: sit
   down already prepared. A cockpit-style checklist with a CLEARED stamp — a
   shape used nowhere else on the site. */
const PREFLIGHT = ['Yesterday reviewed', 'Bias & structure set', 'Key levels marked', 'Risk capped at 2R', 'Mind clear, plan in hand']
function PreflightChecklistCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto grid max-w-[1100px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div data-side="left">
          <span className="micro inline-flex items-center gap-2 font-semibold text-amber">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Your pre-open ritual
          </span>
          <h2 className="mt-4 font-display text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.1] font-bold text-ink">
            Sit down <span className="text-amber">already ready.</span>
          </h2>
          <p className="mt-5 max-w-[440px] text-[16px] leading-[1.65] text-ink-mute">
            Orca walks you through the same short pre-market routine every day — so by the time the market
            opens, your bias, levels, risk and head are all settled. No scrambling at the bell.
          </p>
          <div className="mt-8"><CTA href="/signup">Build my routine</CTA></div>
        </div>

        {/* checklist card with a CLEARED stamp */}
        <div data-side="right" className="relative mx-auto w-full max-w-[400px]">
          <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[24px] bg-amber-soft/70 blur-xl" />
          <div className="relative rounded-[18px] border border-line bg-surface p-6 elev-3">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <Sunrise className="h-4 w-4 text-amber" strokeWidth={2} />
              <span className="text-[13px] font-bold text-ink">Pre-market checklist</span>
              <span className="tnum ml-auto text-[11px] text-ink-faint">09:12</span>
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {PREFLIGHT.map((p, i) => (
                <li key={p} className="pop-in flex items-center gap-3 text-[14px] text-ink" style={{ animationDelay: `${i * 0.18}s` }}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-lg border-2 border-teal/60 px-4 py-1.5 text-[12px] font-bold tracking-[0.14em] text-teal uppercase [transform:rotate(-4deg)]">
                <Check className="h-3.5 w-3.5" strokeWidth={3} /> Cleared for the open
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #2 — the bell. Angle: the day is decided before it starts. A calm amber
   sunrise emblem over a horizon, centered — distinct closing shape. */
function BeforeTheBellCTA() {
  return (
    <section className="relative overflow-hidden px-6 pt-8 pb-32 text-center md:px-10">
      <div className="mx-auto max-w-[620px]">
        <div className="relative mx-auto mb-8 h-[92px] w-[220px]">
          <svg viewBox="0 0 220 92" className="h-full w-full">
            <defs>
              <linearGradient id="msun" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4c56b" />
                <stop offset="1" stopColor="#e0a53a" />
              </linearGradient>
            </defs>
            {/* rays */}
            {Array.from({ length: 7 }, (_, i) => {
              const a = (-90 + (i - 3) * 26) * (Math.PI / 180)
              return <line key={i} x1={110} y1={70} x2={110 + Math.cos(a) * 46} y2={70 + Math.sin(a) * 46} stroke="#eabf72" strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
            })}
            <path d="M74 70a36 36 0 0 1 72 0Z" fill="url(#msun)" />
            <line x1={20} y1={70} x2={200} y2={70} stroke="#e7e8ec" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>
        <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
          The day is won <span className="text-amber">before the bell.</span>
        </h2>
        <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[16px] leading-[1.65] text-ink-mute">
          The traders who last don’t improvise at the open — they arrive with a plan. Make the ten quiet
          minutes before the market moves your sharpest edge.
        </p>
        <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <CTA href="/signup">Start tomorrow right</CTA>
          <CTA href="/pricing" variant="secondary">Compare plans</CTA>
        </div>
      </div>
    </section>
  )
}
