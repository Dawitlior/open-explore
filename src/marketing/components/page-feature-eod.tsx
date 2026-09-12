import {
  Check,
  ArrowRight,
  Trophy,
  BookOpen,
  AlertTriangle,
  Wrench,
  Star,
  CalendarDays,
  CalendarRange,
  CalendarClock,
} from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'
import { FeatureHero, FeatureIntro, Blob } from './features/blocks'
import { FEATURES } from './features/catalog'

/* ============================================================================
   END OF DAY REVIEW (/features/eod) — the complement to Market Morning
   Analysis. A warm dusk-orange page, each section a deliberately different
   shape: mirrored hero, laptop+phone cluster, a browser mockup, a score
   ribbon, a four-quadrant matrix, and a row of guardrail meters.
   ========================================================================== */

const QUADRANTS = [
  { Icon: Trophy, label: 'Wins', tint: '#d99a3e', bg: 'rgba(217,154,62,0.10)', lines: ['Perfect trade — precise entry, logical SL, TP hit.', 'Morning plan executed 100%.'] },
  { Icon: BookOpen, label: 'Lessons', tint: '#c2703d', bg: 'rgba(194,112,61,0.10)', lines: ['Patience is the real edge — not the analysis.', 'One good trade beats five mediocre ones.'] },
  { Icon: AlertTriangle, label: 'Mistakes', tint: '#b0564e', bg: 'rgba(176,86,78,0.10)', lines: ['Could have exited at $20.5 — held 20 min too long.', 'Wider trailing stop next time?'] },
  { Icon: Wrench, label: 'Solutions', tint: '#8a6a6e', bg: 'rgba(138,106,110,0.12)', lines: ['Trail 1.5% instead of 1% on breakout trades.', 'Keep quality over quantity — it works.'] },
]

const RISK = [
  { Icon: CalendarDays, label: 'Daily', used: '0.0R', limit: '−2R', pct: 0 },
  { Icon: CalendarRange, label: 'Weekly', used: '0.0R', limit: '−5R', pct: 0 },
  { Icon: CalendarClock, label: 'Monthly', used: '0.0R', limit: '−10R', pct: 0 },
]

/* ── Execution Review — a browser-window mockup (Cloudly-style) ───────────── */
function BrowserMockup() {
  return (
    <div className="relative">
      <HoloGlow className="!inset-x-[-6%] !inset-y-[-8%]" opacity={0.3} blur={70} />
      <div className="relative overflow-hidden rounded-[22px] border-[3px] border-[#2b2233] bg-surface p-5 shadow-[0_36px_70px_-26px_rgba(43,34,51,0.5)]">
        {/* window controls */}
        <div className="mb-4 flex items-center justify-end gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-canvas-deep" />
          <span className="h-1.5 w-6 rounded-full bg-canvas-deep" />
          <span className="h-1.5 w-6 rounded-full bg-canvas-deep" />
        </div>

        <div className="grid grid-cols-2 items-center gap-5">
          {/* skeleton content */}
          <div className="flex flex-col gap-3">
            <span className="h-3 w-14 rounded bg-[#eadfce]" />
            <span className="h-5 w-32 rounded bg-canvas-deep" />
            <span className="h-3 w-28 rounded bg-canvas-deep" />
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="h-2 w-full rounded bg-[#eef0f3]" />
              <span className="h-2 w-11/12 rounded bg-[#eef0f3]" />
              <span className="h-2 w-4/5 rounded bg-[#eef0f3]" />
            </div>
            <span className="mt-2 h-7 w-24 rounded-lg" style={{ background: 'linear-gradient(90deg,#e2a878,#c2703d)' }} />
          </div>

          {/* illustration on a warm blob */}
          <div className="relative flex items-center justify-center">
            <span
              className="absolute inset-2 -z-0 rounded-full opacity-90"
              style={{ background: 'radial-gradient(70% 70% at 50% 45%, rgba(226,168,120,0.35), transparent 72%)' }}
            />
            <img src="/writing-room.gif" alt="Reviewing the day" className="relative w-[92%] max-w-[300px]" />
          </div>
        </div>

        {/* bottom mini-feature row */}
        <div className="mt-5 grid grid-cols-3 gap-6 border-t border-line pt-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="h-9 w-9 rounded-full" style={{ background: 'rgba(226,168,120,0.22)' }} />
              <span className="h-2 w-14 rounded bg-[#eef0f3]" />
              <span className="h-2 w-10 rounded bg-[#eef0f3]" />
            </div>
          ))}
        </div>
      </div>

      {/* floating stat chip */}
      <div className="float-slow absolute -top-4 -left-4 rounded-2xl border border-line bg-surface px-4 py-2.5 elev-3">
        <div className="micro text-ink-faint">Execution</div>
        <div className="tnum text-[15px] font-bold" style={{ color: '#c2703d' }}>100%</div>
      </div>
    </div>
  )
}

function ExecutionReviewSection() {
  return (
    <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
      <Blob variant="hero" morph from="#e2a878" to="#6b5a5e" className="pointer-events-none absolute top-1/2 -left-40 -z-10 h-[560px] w-[560px] -translate-y-1/2 opacity-[0.08]" />
      <div className="mx-auto grid max-w-[1200px] items-center gap-16 lg:grid-cols-2 lg:gap-20">
        <div data-side="left">
          <span data-reveal className="micro inline-flex items-center gap-2 font-semibold text-amber">
            <span className="h-px w-6 bg-amber" /> Execution Review
          </span>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.08] font-bold text-ink">
            Get better at the part <span className="text-amber">you actually control.</span>
          </h2>
          <p data-reveal className="mt-6 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
            Price does what it wants — your execution is yours. The review is where you look back at how
            you actually traded the day and write it down: the wins to repeat, the lessons that stuck,
            the mistakes to kill, and the fix worth carrying into tomorrow.
          </p>
          <div data-reveal className="mt-8 flex flex-wrap gap-x-10 gap-y-6">
            <div>
              <div className="font-display text-[34px] leading-none font-bold text-ink"><span data-count="100" data-suffix="%">0%</span></div>
              <div className="mt-1.5 text-[13px] text-ink-mute">Plan executed</div>
            </div>
            <div>
              <div className="font-display text-[34px] leading-none font-bold text-ink"><span data-count="3.5" data-decimals="1" data-prefix="+" data-suffix="R">+0.0R</span></div>
              <div className="mt-1.5 text-[13px] text-ink-mute">Session result</div>
            </div>
            <div>
              <div className="font-display text-[34px] leading-none font-bold text-ink"><span data-count="4">0</span></div>
              <div className="mt-1.5 text-[13px] text-ink-mute">Clear takeaways</div>
            </div>
          </div>
          <a
            href="/#demo"
            data-reveal
            className="group mt-9 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-white shadow-[0_10px_26px_-8px_rgba(194,112,61,0.55)] transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(90deg,#e2a878,#c2703d)' }}
          >
            See a full review
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.25} />
          </a>
        </div>
        <div data-side="right"><BrowserMockup /></div>
      </div>
    </section>
  )
}

/* ── Session Score — a wide 1–10 ribbon ──────────────────────────────────── */
function SessionScoreSection() {
  const score = 9
  return (
    <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
      <div
        className="mx-auto max-w-[1040px] rounded-[36px] border border-line px-6 py-16 text-center md:px-14"
        style={{ background: 'radial-gradient(700px 300px at 50% 0%, rgba(226,168,120,0.16), transparent 62%), #fbf5ee' }}
      >
        <span data-reveal className="micro inline-flex items-center gap-2 font-semibold text-amber">
          <Star className="h-3.5 w-3.5" strokeWidth={2} /> Session Score
        </span>
        <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-bold text-ink">
          Rate the day <span className="text-amber">one to ten.</span>
        </h2>
        <p data-reveal className="mx-auto mt-5 max-w-[520px] text-[15.5px] leading-[1.65] text-ink-mute">
          One honest number turns a vague feeling into a track record. Over weeks, your scores draw the
          line between the days you should scale and the days you should sit out.
        </p>

        {/* the ribbon */}
        <div data-reveal className="mx-auto mt-12 max-w-[720px]">
          <div className="flex items-end justify-between gap-1.5 sm:gap-2.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const active = n === score
              const hue = 8 + (n - 1) * 12 // red→green across 1..10
              return (
                <div key={n} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={'w-full rounded-lg transition-all ' + (active ? 'ring-2 ring-ink/70 ring-offset-2' : '')}
                    style={{ height: active ? 56 : 34, background: `hsl(${hue} 62% ${active ? 52 : 66}%)` }}
                  />
                  <span className={'text-[12px] font-semibold ' + (active ? 'text-ink' : 'text-ink-faint')}>{n}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-7 flex items-baseline justify-center gap-2">
            <span className="font-display text-[52px] leading-none font-bold text-ink">{score}</span>
            <span className="text-[18px] font-semibold text-ink-faint">/ 10 — exemplary day</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Wins · Lessons · Mistakes · Solutions — a four-quadrant matrix ───────── */
function QuadrantSection() {
  return (
    <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
      <Blob variant="hero" morph from="#d99a3e" to="#8a6a6e" className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-[560px] w-[560px] -translate-y-1/2 opacity-[0.08]" />
      <div className="mx-auto max-w-[1080px]">
        <div className="mx-auto max-w-[620px] text-center">
          <span data-reveal className="micro font-semibold text-amber">The four lenses</span>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-bold text-ink">
            One session, <span className="text-amber">four clear takeaways.</span>
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[15.5px] leading-[1.65] text-ink-mute">
            Every day gets pulled apart the same way — so the signal compounds instead of blurring together.
          </p>
        </div>

        {/* quadrant grid meeting at a centre */}
        <div className="relative mt-14">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {QUADRANTS.map((q) => (
              <div
                key={q.label}
                data-reveal
                className="rounded-[22px] border border-line p-6 transition-transform duration-300 hover:-translate-y-1"
                style={{ background: q.bg }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface elev-1" style={{ color: q.tint }}>
                    <q.Icon className="h-5 w-5" strokeWidth={1.85} />
                  </span>
                  <span className="font-display text-[18px] font-bold text-ink">{q.label}</span>
                </div>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {q.lines.map((l) => (
                    <li key={l} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-mute">
                      <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: q.tint }} />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* centre badge where the quadrants meet */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface elev-3 sm:flex">
            <Star className="h-6 w-6 text-amber" strokeWidth={1.75} />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Risk Control — a row of guardrail meters ────────────────────────────── */
function RiskControlSection() {
  return (
    <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
      <div
        className="mx-auto max-w-[1120px] rounded-[36px] border border-line px-6 py-14 md:px-14"
        style={{ background: 'radial-gradient(700px 280px at 50% 0%, rgba(107,90,94,0.10), transparent 60%), #f7f3f0' }}
      >
        <div className="mx-auto max-w-[620px] text-center">
          <span data-reveal className="micro font-semibold" style={{ color: '#8a6a6e' }}>Risk Control</span>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.2vw,2.6rem)] font-bold text-ink">
            Guardrails you set <span style={{ color: '#8a6a6e' }}>while you’re calm.</span>
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[15.5px] leading-[1.65] text-ink-mute">
            Daily, weekly and monthly loss limits — reviewed at the close, long before the heat of a bad
            streak can talk you past them.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {RISK.map((r) => (
            <div key={r.label} data-reveal className="rounded-2xl border border-line bg-surface p-6 elev-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
                  <r.Icon className="h-4 w-4" strokeWidth={2} style={{ color: '#8a6a6e' }} />
                  {r.label}
                </span>
                <span className="rounded-md bg-teal-soft px-2 py-0.5 text-[11px] font-bold text-teal">Safe</span>
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="tnum font-display text-[28px] font-bold text-teal">{r.used}</span>
                <span className="text-[13px] font-semibold text-ink-faint">of {r.limit} limit</span>
              </div>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-canvas-deep">
                <div className="h-full rounded-full bg-teal" style={{ width: `${r.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function EodReviewPage() {
  const c = FEATURES.eod
  return (
    <PageShell>
      {/* Mirrored hero — muted dusk-orange blob + shot on the left, copy on the right */}
      <FeatureHero
        flip
        eyebrow={c.eyebrow}
        Icon={c.Icon}
        accent={c.accent}
        title={c.title}
        titleAccent={c.titleAccent}
        sub={c.sub}
        shot={c.shot}
        blobFrom="#e2a878"
        blobTo="#6b5a5e"
      />

      {/* Why end-of-day review — cluster left (laptop + phone), copy right */}
      <section className="relative overflow-hidden px-6 py-32 md:px-10 md:py-48">
        <div className="mx-auto grid max-w-[1240px] items-center gap-20 lg:grid-cols-2 lg:gap-24">
          <div data-side="left" className="relative mx-auto w-full max-w-[560px] lg:order-1">
            <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.34} blur={72} />
            <Blob variant="hero" morph from="#e2a878" to="#c2703d" className="pointer-events-none absolute -top-[16%] -right-[16%] -z-10 h-[440px] w-[440px] opacity-20" />
            <Blob variant="side" morph from="#d99a3e" to="#6b5a5e" className="pointer-events-none absolute -bottom-[12%] -left-[12%] -z-10 h-[320px] w-[320px] opacity-[0.14]" />

            <div className="[perspective:1600px]">
              <div className="transition-transform duration-500 ease-out [transform:rotateY(6deg)_rotateX(3deg)] hover:[transform:rotateY(2deg)_rotateX(1deg)]">
                <div className="rounded-t-[14px] border border-line bg-surface p-2 elev-3">
                  <img src="/eod-review.png" alt="End of day review" className="block w-full rounded-md object-cover" />
                </div>
                <div className="mx-auto h-3 w-[106%] -translate-x-[2.8%] rounded-b-[12px] bg-gradient-to-b from-[#d7d9e2] to-[#a9adbd] shadow-[0_12px_20px_-10px_rgba(20,16,50,0.5)]">
                  <div className="mx-auto h-1 w-[16%] rounded-b bg-[#8b8fa0]" />
                </div>
              </div>
            </div>

            <div className="float-slow absolute -right-4 -bottom-8 w-[30%] max-w-[132px] overflow-hidden rounded-[22px] border-[5px] border-[#0b0d12] bg-[#0b0d12] shadow-[0_24px_44px_-14px_rgba(20,16,50,0.5)]">
              <img src="/eod-summary.png" alt="End of day summary on mobile" className="block aspect-[9/17] w-full object-cover object-top" />
            </div>

            <div className="float-slower absolute -top-4 -left-3 rounded-2xl border border-line bg-surface px-4 py-2.5 elev-3">
              <div className="micro text-ink-faint">Session</div>
              <div className="tnum text-[15px] font-bold text-teal">+3.5R</div>
            </div>
          </div>

          <div className="lg:order-2">
            <h2 data-animate="title" className="font-display text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.08] font-bold text-ink">
              The day isn’t done <br className="hidden sm:block" />when the market closes.
            </h2>
            <span data-reveal className="mt-6 block h-[3px] w-24 rounded-full" style={{ background: 'linear-gradient(90deg,#e2a878,#c2703d)' }} />
            <p data-reveal className="mt-7 max-w-[500px] text-[17px] leading-[1.6] font-semibold text-amber">
              Ten honest minutes now save you the same mistake tomorrow.
            </p>
            <p data-reveal className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Morning analysis sets the plan; the end-of-day review closes the loop. Pull up the day
              exactly as it happened — every trade synced, your P&amp;L, your win rate — with nothing to
              hide behind.
            </p>
            <p data-reveal className="mt-4 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Then you review the execution: what you did well, where you slipped, and the one
              adjustment worth carrying forward. Score the session 1–10 so the pattern becomes visible
              over weeks, not guessed at.
            </p>
            <p data-reveal className="mt-4 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              It’s the difference between trading 500 times and trading the same day 500 times — the
              review is where the learning actually happens.
            </p>
            <ul className="mt-7 flex flex-col gap-3">
              {['Every trade, P&L and win rate — synced automatically', 'Score the session and capture the one lesson'].map((b) => (
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
              See a full review
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: 'linear-gradient(135deg,#e2a878,#c2703d)' }}>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.25} />
              </span>
            </a>
          </div>
        </div>
      </section>

      <FeatureIntro>
        Ten minutes at the close — <span className="text-amber">and tomorrow starts a step ahead.</span>
      </FeatureIntro>

      {/* The elements — each a distinct shape */}
      <ExecutionReviewSection />

      {/* CTA #1 — after section 2 (compounding angle; the review loop) */}
      <ReviewLoopCTA />

      <SessionScoreSection />
      <QuadrantSection />
      <RiskControlSection />

      {/* CTA #2 — after the last section (carry-forward angle; today → tomorrow) */}
      <CarryForwardCTA />
    </PageShell>
  )
}

/* ── CTA #1 — the review loop. Angle: the review is what turns 500 trades into
   500 lessons. A four-step cycle nobody else on the site uses. */
const LOOP = [
  { t: 'Plan', a: -90 },
  { t: 'Trade', a: 0 },
  { t: 'Review', a: 90 },
  { t: 'Adjust', a: 180 },
]
function ReviewLoopCTA() {
  const R = 78
  const cx = 110
  const cy = 110
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto grid max-w-[1040px] items-center gap-14 md:grid-cols-[300px_1fr] md:gap-16">
        {/* the loop */}
        <div className="relative mx-auto h-[220px] w-[220px]">
          <svg viewBox="0 0 220 220" className="h-full w-full">
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#eadfd2" strokeWidth={2} strokeDasharray="4 6" />
            {/* flow arc */}
            <path d={`M ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx} ${cy - R}`} fill="none" stroke="#e0a53a" strokeWidth={2.5} strokeLinecap="round" className="road-flow" strokeDasharray="10 14" />
            {LOOP.map((n) => {
              const rad = (n.a * Math.PI) / 180
              const x = cx + Math.cos(rad) * R
              const y = cy + Math.sin(rad) * R
              return (
                <g key={n.t}>
                  <circle cx={x} cy={y} r={15} fill="#fff" stroke="#e0a53a" strokeWidth={2} />
                  <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#b4801f" fontFamily="ui-sans-serif, system-ui">{n.t}</text>
                </g>
              )
            })}
            <text x={cx} y={cy - 2} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f1116">Every</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f1116">session</text>
          </svg>
        </div>
        <div>
          <span className="micro inline-flex items-center gap-2 font-semibold text-amber">
            <BookOpen className="h-3.5 w-3.5" strokeWidth={2} /> The compounding loop
          </span>
          <h2 className="mt-4 font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.1] font-bold text-ink">
            Trade the same day <span className="text-amber">500 times.</span>
          </h2>
          <p className="mt-5 max-w-[460px] text-[16px] leading-[1.65] text-ink-mute">
            Without the review, 500 trades is just 500 trades. With it, each one feeds the next — plan, trade,
            review, adjust — until the loop itself becomes your edge.
          </p>
          <div className="mt-8"><CTA href="/signup">Close today’s loop</CTA></div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #2 — carry-forward. Angle: today's one lesson becomes tomorrow's plan.
   Two day-cards with the lesson crossing over — distinct closing shape. */
function CarryForwardCTA() {
  return (
    <section className="relative overflow-hidden px-6 pt-8 pb-32 md:px-10">
      <div className="mx-auto max-w-[860px] text-center">
        <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-bold text-ink">
          Today’s lesson is <span className="text-amber">tomorrow’s edge.</span>
        </h2>
        <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[16px] leading-[1.65] text-ink-mute">
          End the day by capturing the one adjustment that matters — and Orca hands it back to you at
          tomorrow’s open, before you place a single trade.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3 sm:gap-5">
          {/* today */}
          <div className="w-[172px] rounded-2xl border border-line bg-surface p-4 text-left elev-2">
            <div className="micro text-ink-faint">Today · close</div>
            <div className="mt-2 flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber text-white"><BookOpen className="h-3 w-3" strokeWidth={2.5} /></span>
              <span className="text-[12.5px] font-semibold leading-snug text-ink">“Cut winners too early — hold to the level next time.”</span>
            </div>
          </div>
          <ArrowRight className="h-6 w-6 shrink-0 text-amber" strokeWidth={2.5} />
          {/* tomorrow */}
          <div className="w-[172px] rounded-2xl border border-amber/40 bg-amber-soft/50 p-4 text-left elev-2">
            <div className="micro text-amber">Tomorrow · open</div>
            <div className="mt-2 flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal text-white"><Check className="h-3 w-3" strokeWidth={3} /></span>
              <span className="text-[12.5px] font-semibold leading-snug text-ink">Today’s lesson, pinned to your plan.</span>
            </div>
          </div>
        </div>
        <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <CTA href="/signup">Keep the lesson</CTA>
          <CTA href="/pricing" variant="secondary">Compare plans</CTA>
        </div>
      </div>
    </section>
  )
}
