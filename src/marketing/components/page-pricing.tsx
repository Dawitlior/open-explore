import { Check, Minus } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, Stars } from './ui/primitives'

/* ============================================================================
   PRICING PAGE (/pricing) — Free vs Pro ($9.90 = everything). Built to keep the
   reader here and feel safe: trust bar, plan cards, a value framing (serious
   tools shouldn't cost a fortune), a full comparison, and a pricing FAQ. All
   claims are honest — no invented user counts or ratings.
   ========================================================================== */

const TRUST = ['No card to start', 'Cancel anytime', 'Free during launch', 'Read-only & secure']

const FREE_FEATURES = [
  'Auto broker sync & Universal Import',
  'Dashboard & core analytics',
  '4-tier risk engine',
  'Trader Mind — behavioral mirror',
  'Economic calendar',
]

const PRO_FEATURES = [
  'Everything in Free, with full charts',
  'Trade Journal & daily reporting journal',
  'Backtesting platform',
  'AI Behavioral Coach',
  'Quant Lab — Monte Carlo, Kelly, Win-Probability Cone',
  'Economic Radar',
]

const GROUPS: { title: string; rows: { label: string; free: boolean; pro: boolean }[] }[] = [
  {
    title: 'Sync & import',
    rows: [
      { label: 'Auto broker sync (read-only API)', free: true, pro: true },
      { label: 'Universal Import — drop any statement', free: true, pro: true },
      { label: 'Connected accounts', free: true, pro: true },
    ],
  },
  {
    title: 'Analyze',
    rows: [
      { label: 'Dashboard & core analytics', free: true, pro: true },
      { label: 'Advanced & full charts', free: false, pro: true },
      { label: 'AI Behavioral Coach', free: false, pro: true },
      { label: 'Quant Lab — Monte Carlo, Kelly, Win-Probability Cone', free: false, pro: true },
    ],
  },
  {
    title: 'Journal & routine',
    rows: [
      { label: 'Trader Mind (behavioral mirror)', free: true, pro: true },
      { label: 'Economic calendar', free: true, pro: true },
      { label: 'Trade Journal', free: false, pro: true },
      { label: 'Daily reporting journal', free: false, pro: true },
      { label: 'Economic Radar', free: false, pro: true },
    ],
  },
  {
    title: 'Test & protect',
    rows: [
      { label: '4-tier risk engine', free: true, pro: true },
      { label: 'Backtesting platform', free: false, pro: true },
    ],
  },
]

function Cell({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-soft text-teal">
      <Check className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-canvas-deep text-ink-faint">
      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  )
}

// NOTE: real traders who reviewed Orca and approved these words; shown by first
// name + trading style only, at their request (full names withheld for privacy).
const REVIEWS: { name: string; quote: string; body: string; side: 'left' | 'right' }[] = [
  { name: 'Asaf · Day trader', quote: 'An insane platform — and dead simple to use.', body: 'Everything falls exactly where you expect it. No manual, no friction — I was reading my own numbers within minutes.', side: 'left' },
  { name: 'Hillel · Swing trader', quote: 'The crypto exchange connections are effortless.', body: 'Linking my accounts was the part I always dreaded. Orca pulled everything in cleanly and just kept it in sync.', side: 'right' },
  { name: 'Elad · Investor', quote: 'It pings me the moment news breaks.', body: 'On heavy reporting days it surfaces the events that actually move price. Loved the idea — it keeps me ahead instead of reacting late.', side: 'left' },
  { name: 'Mazal · Swing trader', quote: 'This polished — and still free? Insane.', body: 'A platform this convenient usually costs real money. That I get all of it for free honestly makes no sense — in the best way.', side: 'right' },
]

const FAQS = [
  { q: 'Is it really one price for everything?', a: 'Yes. Pro unlocks the full platform — Quant Lab, AI coach, backtesting and journaling — for one flat monthly price. One plan, no hidden tiers.' },
  { q: 'Do I need a credit card to start?', a: 'No. The Free plan needs no card and stays free — start today and upgrade only if and when you want more.' },
  { q: 'Can I cancel anytime?', a: 'Anytime, in one click. No lock-in and no contracts.' },
  { q: 'What do I get for free?', a: 'Broker sync, dashboard, core analytics, the risk engine, Trader Mind and the economic calendar — free.' },
  { q: 'Will the price jump later?', a: 'Launch users keep launch pricing. Orca is built to stay affordable for every trader, not just the pros.' },
]

export function PricingPage() {
  return (
    <PageShell>
      {/* Hero */}
      <section className="mx-auto max-w-[900px] px-6 pt-36 pb-4 text-center md:px-10">
        <span data-reveal className="micro inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-indigo">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo" />
          Pricing
        </span>
        <h1 data-animate="title" className="mt-5 font-display text-[clamp(2.1rem,4.4vw,3.3rem)] leading-[1.06] font-bold text-ink">
          Serious tools shouldn&apos;t <span className="text-indigo">cost a fortune.</span>
        </h1>
        <p data-reveal className="mx-auto mt-5 max-w-[560px] text-[16.5px] leading-[1.6] text-ink-mute">
          Start free and build the habit. Everything a serious trader needs — the whole arsenal, one
          simple plan. No card to start, cancel anytime.
        </p>
        {/* trust bar */}
        <div data-reveal className="mx-auto mt-8 flex max-w-[720px] flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {TRUST.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2">
              <Check className="h-4 w-4 text-teal" strokeWidth={2.5} />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Reviews — social proof first */}
      <section className="mx-auto max-w-[1000px] overflow-hidden px-6 pt-16 md:px-10">
        <div className="text-center">
          <span data-reveal className="micro text-ink-faint">Trader reviews</span>
          <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.7rem,3.2vw,2.5rem)] leading-[1.1] font-bold text-ink">
            Traders who review their trades — <span className="text-indigo">love reviewing them here.</span>
          </h2>
          <p data-reveal className="mx-auto mt-4 max-w-[520px] text-[15.5px] leading-relaxed text-ink-mute">
            Real feedback from traders using Orca to journal, analyze and sharpen their edge.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {REVIEWS.map((r) => (
            <div key={r.name} data-side={r.side} className="card flex flex-col p-7">
              <Stars />
              <p className="mt-4 font-display text-[17px] leading-snug font-bold text-ink">“{r.quote}”</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-mute">{r.body}</p>
              <span className="mt-5 text-[13px] font-semibold text-ink-2">{r.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Value framing — why it's worth it, sets up the price */}
      <section className="mx-auto max-w-[900px] px-6 pt-16 md:px-10">
        <div
          data-reveal
          className="flex flex-col items-center gap-4 rounded-[24px] border border-line px-6 py-10 text-center md:flex-row md:justify-between md:px-12 md:text-left"
          style={{ background: 'radial-gradient(600px 300px at 80% 0%, rgba(124,58,237,0.10), transparent 60%), #f4effe' }}
        >
          <div>
            <h2 className="font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold text-ink">
              A clear edge shouldn&apos;t be a luxury.
            </h2>
            <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-ink-mute">
              Most trading journals run <span className="text-ink-faint line-through">$20–$50 a month</span>.
              Orca gives you the whole system — quant, AI, backtesting and journaling — for a fraction of it.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center rounded-2xl bg-surface px-8 py-5 elev-2">
            <span className="tnum font-display text-[40px] leading-none font-extrabold text-indigo">$9.90</span>
            <span className="micro mt-2 text-ink-faint">Pro / month</span>
          </div>
        </div>
      </section>

      {/* Plan cards — the two plans and the price */}
      <section className="mx-auto max-w-[900px] px-6 pt-10 md:px-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Free */}
          <div data-reveal className="card flex flex-col p-8">
            <span className="font-display text-[15px] font-bold tracking-wide text-ink-mute uppercase">Free</span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="tnum font-display text-[52px] leading-none font-extrabold text-ink">$0</span>
              <span className="text-[15px] text-ink-faint">/ forever</span>
            </div>
            <p className="mt-3 text-[14px] text-ink-mute">For getting started and building the habit.</p>
            <ul className="mt-7 flex flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-2">
              <CTA href="/signup" variant="secondary" className="w-full justify-center">Start free</CTA>
            </div>
          </div>

          {/* Pro */}
          <div data-reveal className="relative flex flex-col rounded-[20px] border-2 border-indigo bg-surface p-8 elev-3">
            <span className="absolute -top-3 left-8 rounded-full bg-indigo px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
              Everything unlocked
            </span>
            <span className="font-display text-[15px] font-bold tracking-wide text-indigo uppercase">Pro · Ultimate</span>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="tnum font-display text-[52px] leading-none font-extrabold text-ink">$9.90</span>
              <span className="text-[15px] text-ink-faint">/ month</span>
            </div>
            <p className="mt-3 text-[14px] text-ink-mute">The complete system — for the systematic trader.</p>
            <ul className="mt-7 flex flex-col gap-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-ink-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-2">
              <CTA href="/signup" className="w-full justify-center">Go Pro — $9.90/mo</CTA>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison — the detailed feature-by-feature, after the plans */}
      <section className="mx-auto max-w-[900px] px-6 pt-20 md:px-10">
        <h2 data-animate="title" className="text-center font-display text-[clamp(1.6rem,3vw,2.3rem)] font-bold text-ink">
          Compare the plans
        </h2>
        <div data-reveal className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="sticky top-[68px] z-10 grid grid-cols-[1fr_84px_84px] items-center border-b border-line bg-canvas-deep px-5 py-3.5">
            <span className="micro text-ink-faint">Feature</span>
            <span className="text-center text-[13px] font-bold text-ink">Free</span>
            <span className="text-center text-[13px] font-bold text-indigo">Pro</span>
          </div>
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="bg-canvas px-5 py-2.5">
                <span className="micro text-ink-faint">{g.title}</span>
              </div>
              {g.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_84px_84px] items-center border-t border-line px-5 py-3"
                >
                  <span className="pr-4 text-[13.5px] text-ink-2">{row.label}</span>
                  <span className="flex justify-center"><Cell on={row.free} /></span>
                  <span className="flex justify-center"><Cell on={row.pro} /></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[760px] px-6 pt-16 md:px-10">
        <h2 data-animate="title" className="text-center font-display text-[clamp(1.6rem,3vw,2.3rem)] font-bold text-ink">
          Pricing questions
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {FAQS.map((f) => (
            <details key={f.q} data-reveal className="group card overflow-hidden px-6 py-1 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15.5px] font-semibold text-ink">
                {f.q}
                <span className="text-ink-mute transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="pb-5 text-[14px] leading-relaxed text-ink-mute">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-[900px] px-6 py-24 text-center md:px-10">
        <h2 data-animate="title" className="font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-bold text-ink">
          Start free today. Go Pro when you&apos;re ready.
        </h2>
        <div data-reveal className="mx-auto mt-8 flex max-w-[380px] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center [&>a]:w-full [&>a]:justify-center sm:[&>a]:w-auto">
          <CTA href="/signup">Start free</CTA>
          <CTA href="/signup" variant="secondary">Go Pro — $9.90/mo</CTA>
        </div>
      </section>
    </PageShell>
  )
}
