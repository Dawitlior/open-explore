import { Newspaper, Bell, Zap, Check, ArrowRight, Trophy, ShieldCheck, Gem, BrainCircuit, PenLine, CalendarCheck } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow } from './ui/primitives'
import { FeatureHero, FeatureIntro, ShotFrame, Blob, Sparkles } from './features/blocks'
import { FEATURES } from './features/catalog'

/* ============================================================================
   TRADE JOURNAL (/features/journal) — an advanced calendar, not a spreadsheet.
   News events land in the calendar, alerts fire the moment they break, every
   trade replays on the chart, and Orca's AI reads the day for you.
   ========================================================================== */

const GRID_SPARKS = [
  { top: '8%', left: '5%', size: 12, delay: '0s' },
  { top: '12%', left: '93%', size: 10, delay: '1.1s' },
  { top: '90%', left: '8%', size: 11, delay: '0.7s' },
  { top: '94%', left: '91%', size: 12, delay: '1.7s' },
]

const AI_CARDS = [
  { Icon: Trophy, tint: '#e0a53a', title: 'Perfect Day', body: '1/1 wins for +15.57R. Your execution was flawless.' },
  { Icon: ShieldCheck, tint: '#1a1d24', title: 'Full Discipline', body: 'All trades followed your rules — professional execution regardless of outcome.' },
  { Icon: Gem, tint: '#1a1d24', title: 'Quality Wins', body: 'Avg win 15.57R — high-quality wins that build the account efficiently.' },
]

/* News events inside a calendar day. */
function NewsCalendar() {
  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.32} blur={70} />
      <Blob variant="side" morph from="#a78bfa" to="#6d28d9" className="pointer-events-none absolute -bottom-[12%] -right-[10%] -z-10 h-[300px] w-[300px] opacity-[0.14]" />
      <div className="relative rounded-3xl border border-line bg-surface p-5 elev-3">
        {/* mini week strip */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { d: 'Wed 17', pnl: '−1.0R', win: false, news: null },
            { d: 'Thu 18', pnl: '−1.0R', win: false, news: 'high' },
            { d: 'Fri 19', pnl: '+15.6R', win: true, news: null },
            { d: 'Mon 22', pnl: '−1.0R', win: false, news: 'med' },
          ].map((c) => (
            <div key={c.d} className={'relative rounded-xl border p-3 ' + (c.win ? 'border-teal/30 bg-teal-soft/60' : 'border-rose/25 bg-rose-soft/50')}>
              <div className="text-[10.5px] font-semibold text-ink-mute">{c.d}</div>
              <div className={'tnum mt-1 text-[13px] font-bold ' + (c.win ? 'text-teal' : 'text-rose')}>{c.pnl}</div>
              {c.news && (
                <span className={'absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white ' + (c.news === 'high' ? 'bg-rose' : 'bg-amber')}>
                  <Newspaper className="h-2.5 w-2.5" strokeWidth={2.5} />
                </span>
              )}
            </div>
          ))}
        </div>
        {/* news detail for the flagged day */}
        <div className="mt-4 rounded-xl border border-line bg-canvas p-3.5">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-rose px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">High impact</span>
            <span className="text-[12px] font-bold text-ink">Thu 18 · US CPI</span>
            <span className="ml-auto text-[11px] text-ink-faint">15:30</span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-ink-mute">
            Your −1.0R day lined up with the CPI release — the pattern is right there in the calendar.
          </p>
        </div>
      </div>
    </div>
  )
}

/* Real-time alerts stack. */
function AlertStack() {
  const alerts = [
    { impact: 'high', title: 'US CPI', when: 'in 5 min', Icon: Zap },
    { impact: 'med', title: 'FOMC minutes', when: 'at 21:00', Icon: Bell },
    { impact: 'high', title: 'NFP', when: 'tomorrow 15:30', Icon: Bell },
  ]
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.3} blur={66} />
      <div className="relative flex flex-col gap-3">
        {alerts.map((a, i) => (
          <div
            key={a.title}
            className={'flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 elev-3 ' + (i === 0 ? 'float-slow' : i === 1 ? 'float-slower' : 'float-slow')}
          >
            <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (a.impact === 'high' ? 'bg-rose-soft text-rose' : 'bg-amber-soft text-amber')}>
              <a.Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ' + (a.impact === 'high' ? 'bg-rose text-white' : 'bg-amber text-white')}>
                  {a.impact === 'high' ? 'High' : 'Med'}
                </span>
                <span className="text-[13.5px] font-bold text-ink">{a.title}</span>
              </div>
              <div className="mt-0.5 text-[12px] text-ink-mute">Starts {a.when}</div>
            </div>
            <span className="ml-auto text-[11px] font-semibold text-indigo">Notify</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function JournalFeaturePage() {
  const c = FEATURES.journal
  return (
    <PageShell>
      <FeatureHero
        eyebrow={c.eyebrow}
        Icon={c.Icon}
        accent={c.accent}
        title="Not a journal — an advanced calendar."
        titleAccent=""
        sub="Every trade lands on the day it happened, with the news that moved the market and the AI read on how you handled it. Your whole edge, on one calendar."
        shot="/journal-calendar.png"
        backdrop="none"
      />

      <FeatureIntro>
        Your trades, the news, and the AI read — <span className="text-ink">all on one calendar.</span>
      </FeatureIntro>

      {/* 1 — The calendar : full-width centered showcase (copy over a wide shot) */}
      <section className="relative overflow-hidden px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <span className="micro inline-flex items-center gap-2 font-semibold text-ink">
            <CalendarCheck className="h-3.5 w-3.5" strokeWidth={2} /> The calendar
          </span>
          <h3 className="mt-4 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
            Your whole month, at a glance.
          </h3>
          <p className="mx-auto mt-5 max-w-[560px] text-[16px] leading-[1.7] text-ink-mute">
            Green days, red days, R per day, trades per day, weekly summaries down the side. In one screen
            you see your rhythm — the streaks, the patterns, the weeks that carried you.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['P&L and R per day', 'Weekly & monthly roll-ups', 'Long vs short, win rate, drawdown'].map((b) => (
              <span key={b} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2">{b}</span>
            ))}
          </div>
        </div>
        <div data-reveal className="mx-auto mt-12 max-w-[1080px]">
          <ShotFrame src="/journal-calendar.png" alt="Trade Journal calendar" tag="Trade Journal · Calendar" glow={0.14} />
        </div>
      </section>

      {/* 2 — News in the calendar : a tinted rounded band, centered */}
      <section className="relative overflow-hidden px-6 py-10 md:px-10 md:py-16">
        <div className="mx-auto max-w-[1160px] overflow-hidden rounded-[34px] bg-canvas-deep px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto max-w-[640px] text-center">
            <span className="micro inline-flex items-center gap-2 font-semibold text-ink">
              <Newspaper className="h-3.5 w-3.5" strokeWidth={2} /> News in your calendar
            </span>
            <h3 className="mt-4 font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.12] font-bold text-ink">
              See if the news moved your P&amp;L.
            </h3>
            <p className="mx-auto mt-5 max-w-[540px] text-[15.5px] leading-[1.7] text-ink-mute">
              Every high-impact release lands right on the day it happened. Now the red day that felt random
              has a reason next to it — and you can finally tell whether your results track the news or your
              own decisions.
            </p>
          </div>
          <div data-reveal className="mx-auto mt-10 max-w-[480px]"><NewsCalendar /></div>
          <div className="mx-auto mt-10 grid max-w-[760px] gap-4 sm:grid-cols-3">
            {['High / medium impact events on each day', 'Spot the link between news and your win rate', 'Stop blaming variance for a CPI-day loss'].map((b) => (
              <div key={b} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-ink shadow-sm"><Check className="h-3 w-3" strokeWidth={3} /></span>
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA #1 — after section 2 (effort angle; self-writing notebook) */}
      <WritesItselfCTA />

      {/* 3 — Real-time alerts : two-col (visual left) */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-36">
        <Blob variant="hero" morph from="#a78bfa" to="#6d28d9" className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-[540px] w-[540px] -translate-y-1/2 opacity-[0.07]" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-side="left" className="lg:order-2">
            <span className="micro inline-flex items-center gap-2 font-semibold text-ink">
              <Bell className="h-3.5 w-3.5" strokeWidth={2} /> Real-time alerts
            </span>
            <h3 className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.13] font-bold text-ink">
              Know the moment news breaks.
            </h3>
            <p className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Orca pings the platform the instant a high-impact event is about to hit — so you’re never
              caught in a position when the market’s about to move. Tighten up, stand aside, or trade it
              on purpose.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {['A heads-up minutes before each release', 'High and medium impact, filtered to your markets', 'Never blindsided by a scheduled event again'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14.5px] text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-ink"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div data-side="right" className="lg:order-1"><AlertStack /></div>
        </div>
      </section>

      {/* 4 — Trade replay : two-col, visual RIGHT (order flipped from before) */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-36">
        <Sparkles points={GRID_SPARKS} color="rgba(124,58,237,0.28)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-side="left">
            <span className="micro font-semibold text-ink">Trade replay</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-ink" />
            <h3 className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.13] font-bold text-ink">
              Replay every trade on the chart.
            </h3>
            <p className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Open any day and watch the trade exactly as it played out — entry, stop and exit drawn on a
              live TradingView chart, with your risk and reward zones shaded in. See what actually happened,
              not what you remember.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {['Entry, stop and exit on the real chart', 'Risk / reward zones, every timeframe', 'Jump straight to entry, stop or exit'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14.5px] text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-canvas-deep text-ink"><Check className="h-3 w-3" strokeWidth={3} /></span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div data-side="right"><ShotCard src="/journal-replay.png" alt="Trade replay on the chart" /></div>
        </div>
      </section>

      {/* 5 — AI Day Analysis */}
      <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-36">
        <Sparkles points={GRID_SPARKS} color="rgba(124,58,237,0.28)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div data-side="left">
            <span className="micro inline-flex items-center gap-2 font-semibold text-ink">
              <BrainCircuit className="h-3.5 w-3.5" strokeWidth={2} /> AI Day Analysis
            </span>
            <h3 className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.13] font-bold text-ink">
              Orca reads the day for you.
            </h3>
            <p className="mt-5 max-w-[500px] text-[15.5px] leading-[1.7] text-ink-mute">
              Every day gets a plain-language read from Orca’s AI — what you did well, where discipline
              held, and the one thing worth repeating tomorrow. Coaching on your own trades, automatically.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              {AI_CARDS.map((a) => (
                <div key={a.title} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 elev-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: a.tint + '1f', color: a.tint }}>
                    <a.Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-bold text-ink">{a.title}</div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-ink-mute">{a.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div data-side="right"><ShotCard src="/journal-ai.png" alt="AI day analysis" /></div>
        </div>
      </section>

      {/* CTA #2 — after the last section (future-payoff angle; heatmap) */}
      <MonthFromNowCTA />
    </PageShell>
  )
}

/* ── CTA #1 — a lined notebook page that fills itself in. Angle: zero effort.
   Nothing else on the site is a sheet of ruled paper writing its own entries. */
const ENTRIES = [
  { t: '08:32', pair: 'EURUSD', r: '+2.4R', win: true },
  { t: '10:15', pair: 'US100', r: '−1.0R', win: false },
  { t: '11:48', pair: 'XAUUSD', r: '+3.1R', win: true },
  { t: '14:05', pair: 'GBPJPY', r: '+1.7R', win: true },
]
function WritesItselfCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[640px] text-center">
        <span className="micro inline-flex items-center justify-center gap-2 font-semibold text-ink">
          <PenLine className="h-3.5 w-3.5" strokeWidth={2} /> Zero admin
        </span>
        <h2 className="mt-4 font-display text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.1] font-bold text-ink">
          You’ll never write a journal entry again.
        </h2>
        <p className="mx-auto mt-5 max-w-[480px] text-[16px] leading-[1.65] text-ink-mute">
          No spreadsheet at midnight, no forgotten trades, no copy-paste. The moment a position closes it’s
          already logged, tagged and scored. You just read it back.
        </p>
      </div>

      {/* ruled notebook page — centered below the copy */}
      <div className="relative mx-auto mt-12 w-full max-w-[460px]">
          <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[22px] bg-violet-soft/60 blur-xl" />
          <div className="relative overflow-hidden rounded-[18px] border border-line bg-surface elev-3 [transform:rotate(-1.4deg)]">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3">
              <PenLine className="h-4 w-4 text-ink" strokeWidth={2} />
              <span className="text-[12.5px] font-bold text-ink">September · auto-logged</span>
              <span className="ml-auto text-[11px] text-ink-faint">4 trades</span>
            </div>
            <div className="relative px-5 py-2" style={{ backgroundImage: 'repeating-linear-gradient(#ffffff, #ffffff 39px, #eef0f3 40px)' }}>
              <span className="pointer-events-none absolute inset-y-0 left-11 w-px bg-rose/30" />
              {ENTRIES.map((e, i) => (
                <div key={e.pair} className="feed-in flex h-10 items-center gap-3" style={{ animationDelay: `${i * 0.28}s` }}>
                  <span className="tnum w-10 shrink-0 text-[11px] font-semibold text-ink-faint">{e.t}</span>
                  <span className="text-[13px] font-bold text-ink">{e.pair}</span>
                  <span className={'tnum ml-auto text-[13px] font-bold ' + (e.win ? 'text-teal' : 'text-rose')}>{e.r}</span>
                  <span className={'flex h-4 w-4 items-center justify-center rounded-full ' + (e.win ? 'bg-teal-soft text-teal' : 'bg-rose-soft text-rose')}>
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      <div className="mt-10 text-center"><CTA href="/signup">Let it write itself</CTA></div>
    </section>
  )
}

/* ── CTA #2 — a clean day × hour P&L heatmap, in the site's own light palette,
   dropped straight onto the page (no dark panel). Your winning and losing hours,
   the way the real "opportunity window" report shows them. */
// -3..+3 Loss→Profit ramp, tuned for the light canvas (rose → soft gray → teal).
const HEAT_RAMP = ['#e5484d', '#f07f82', '#f8c3c4', '#eef0f4', '#c7ccd6', '#6b7280', '#2b3038']
const HEAT_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const HEAT = { cell: 24, gap: 3, lx: 30, ty: 22 }
// deterministic level per (day, hour): organic scatter, greener midday, redder off-hours
function hmLevel(day: number, hour: number) {
  let lv = ((hour * 7 + day * 13 + ((hour * day * 5) % 11)) % 7) - 3
  if (hour >= 9 && hour <= 16) lv += 1
  if (hour < 5 || hour > 21) lv -= 1
  return Math.max(-3, Math.min(3, lv))
}

function MonthFromNowCTA() {
  return (
    <section className="relative overflow-hidden px-6 pt-8 pb-32 text-center md:px-10">
      <div className="mx-auto max-w-[640px]">
        {/* clean day × hour P&L heatmap — light, embedded straight on the page */}
        <div className="relative mx-auto w-full max-w-[760px]">
          <svg viewBox="0 0 690 214" className="w-full overflow-visible">
            {/* hour labels */}
            {Array.from({ length: 24 }, (_, h) => (
              <text key={`h${h}`} x={HEAT.lx + h * (HEAT.cell + HEAT.gap) + HEAT.cell / 2} y={12} textAnchor="middle" fontSize="9.5" fill="#9aa0ac" fontFamily="ui-monospace, monospace">
                {String(h).padStart(2, '0')}
              </text>
            ))}
            {/* rows */}
            {HEAT_DAYS.map((d, row) => (
              <g key={d}>
                <text x={HEAT.lx - 9} y={HEAT.ty + row * (HEAT.cell + HEAT.gap) + HEAT.cell / 2 + 3.5} textAnchor="end" fontSize="11" fill="#6b7180" fontFamily="ui-monospace, monospace">{d}</text>
                {Array.from({ length: 24 }, (_, col) => {
                  const lv = hmLevel(row, col)
                  return (
                    <rect
                      key={col}
                      x={HEAT.lx + col * (HEAT.cell + HEAT.gap)}
                      y={HEAT.ty + row * (HEAT.cell + HEAT.gap)}
                      width={HEAT.cell}
                      height={HEAT.cell}
                      rx={5}
                      fill={HEAT_RAMP[lv + 3]}
                      className="pop-in"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${(row + col) * 0.012}s` }}
                    />
                  )
                })}
              </g>
            ))}
          </svg>
          {/* Loss → Profit legend */}
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className="text-[12px] font-medium text-ink-mute">Loss</span>
            <div className="flex gap-1">
              {HEAT_RAMP.map((c, i) => (
                <span key={i} className="h-3.5 w-4 rounded-[3px]" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[12px] font-medium text-ink-mute">Profit</span>
          </div>
        </div>

        <h2 data-animate="title" className="mt-6 font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.1] font-bold text-ink">
          In 30 days, you’ll see <span className="text-ink">exactly when you win.</span>
        </h2>
        <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[16px] leading-[1.65] text-ink-mute">
          Every trade mapped by day and hour, until your most — and least — profitable windows are
          impossible to miss. Trade the green, avoid the red.
        </p>
        <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <CTA href="/signup"><CalendarCheck className="h-4 w-4" strokeWidth={2.25} /> Start your first green day</CTA>
          <CTA href="/pricing" variant="secondary">Compare plans</CTA>
        </div>
      </div>
    </section>
  )
}

/* framed product shot */
function ShotCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-8%]" opacity={0.32} blur={72} />
      <div className="[perspective:1600px]">
        <div className="overflow-hidden rounded-[16px] border border-line bg-surface p-2 elev-3 transition-transform duration-500 ease-out [transform:rotateY(-6deg)_rotateX(3deg)] hover:[transform:rotateY(-2deg)_rotateX(1deg)]">
          <img src={src} alt={alt} className="block w-full rounded-[10px] object-cover" />
        </div>
      </div>
    </div>
  )
}
