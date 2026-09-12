import { Wallet, LineChart, Trophy, Layers, ArrowRight, Plug, Zap, Gauge } from 'lucide-react'
import { PageShell } from './page-shell'
import { CTA, HoloGlow, AssetImage } from './ui/primitives'
import {
  FeatureHero,
  FeatureIntro,
  FeatureRow,
  FeatureSectionHead,
  WaveBand,
  ShotFrame,
  Blob,
  BlobIcon,
  Sparkles,
} from './features/blocks'
import { FEATURES } from './features/catalog'

const PORTFOLIOS = [
  { Icon: Wallet, from: '#8b5cf6', to: '#6d28d9', title: 'Crypto, all in one place', desc: 'Every exchange and on-chain wallet tracked under a single portfolio.' },
  { Icon: LineChart, from: '#3a4150', to: '#1a1d24', title: 'Stocks & options', desc: 'Your brokerage account, tagged and scored right beside the rest.' },
  { Icon: Trophy, from: '#fbbf24', to: '#e0a53a', title: 'Prop & funded', desc: 'Keep evaluation and funded accounts separate — rules, limits and all.' },
  { Icon: Layers, from: '#fb7185', to: '#e5484d', title: 'Track them in parallel', desc: 'Switch between portfolios, or see everything combined in one live view.' },
]

/* ============================================================================
   DASHBOARD feature page (/features/dashboard).
   Colored blob hero (herodash) with big white copy → airy, luxury-spaced body
   with varied section shapes, wave breather, and sparkle/blob gap decoration.
   ========================================================================== */

const SCORES = [
  { src: '/score-orca.png', label: 'Orca Score', glow: 'rgba(124,58,237,0.20)' },
  { src: '/score-regime.png', label: 'Regime Fit', glow: 'rgba(224,165,58,0.22)' },
  { src: '/score-risk.png', label: 'Risk Consistency', glow: 'rgba(26,29,36,0.20)' },
  { src: '/score-discipline.png', label: 'Discipline Score', glow: 'rgba(124,58,237,0.18)' },
]

const GRID_SPARKS = [
  { top: '4%', left: '3%', size: 13, delay: '0s' },
  { top: '8%', left: '95%', size: 11, delay: '1.2s' },
  { top: '94%', left: '8%', size: 12, delay: '0.6s' },
  { top: '96%', left: '92%', size: 10, delay: '1.9s' },
]

export function DashboardFeaturePage() {
  const c = FEATURES.dashboard
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
        backdrop="none"
      />

      <FeatureIntro>
        One screen that tells you the truth — <span className="text-indigo">where your edge is, and where it leaks.</span>
      </FeatureIntro>

      {/* Quarterly Performance — standard row (image still placeholder) */}
      <FeatureRow
        eyebrow="Quarterly Performance"
        accent="indigo"
        title={<>See which quarter <span className="text-indigo">quietly bleeds you.</span></>}
        body="A multi-year, quarter-by-quarter grid of your real results. In a single glance you find the season that consistently costs you — and the exact point a good year turned."
        bullets={['Years and quarters side by side', 'Your worst quarter, surfaced instantly', 'Spot where momentum broke']}
        shot="/carousel/analytics.png"
        shotTag="Dashboard · Quarterly view"
      />

      {/* Opportunity Window — floating cluster shape */}
      <section className="relative px-6 py-28 md:px-10 md:py-40">
        <Sparkles points={GRID_SPARKS} color="rgba(26,29,36,0.5)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div data-side="left" className="lg:order-2">
            <span className="micro font-semibold text-teal">Opportunity Window</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-teal" />
            <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold text-ink">
              Trade when you have an edge. <span className="text-teal">Log off when you don’t.</span>
            </h3>
            <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">
              Your performance mapped across every hour of the day and day of the week. Orca shows the
              windows where you genuinely perform — and flags the ones where the data says: close the laptop.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {['Day-and-hour heatmap of your P&L', 'Your real high-edge windows', 'Warnings for your worst hours'].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14.5px] text-ink">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div data-side="right" className="lg:order-1">
            <OpportunityCluster />
          </div>
        </div>
      </section>

      {/* CTA #1 — after section 2 (consolidation angle; sources → one card) */}
      <CloseTheTabsCTA />

      {/* Wave-bounded breather between section shapes — a thesis, not a CTA */}
      <WaveBand
        eyebrow="The whole point"
        title={<>You can’t fix <span className="text-violet">what you can’t see.</span></>}
        sub="Every panel on this dashboard exists to make one thing impossible to ignore — the truth about how you actually trade."
      />

      {/* PnL Distribution — copy + chart on a soft tinted stage with a real chip */}
      <section className="relative px-6 py-28 md:px-10 md:py-40">
        <Sparkles points={GRID_SPARKS} color="rgba(124,58,237,0.5)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div data-side="left">
            <span className="micro font-semibold text-violet">PnL Distribution</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-violet" />
            <h3 className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.15] font-bold text-ink">
              The real shape of your <span className="text-violet">risk and reward.</span>
            </h3>
            <p className="mt-4 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">
              A clear view of how your wins and losses actually spread out — your true Profit Factor,
              and whether your winners outweigh your losers or just outnumber them.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {['Win / loss distribution at a glance', 'Profit Factor, honestly measured', 'Average winner vs average loser'].map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[14.5px] text-ink">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet" />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div data-side="right" className="relative">
            <div
              className="relative rounded-[26px] p-6 md:p-8"
              style={{ background: 'radial-gradient(520px 260px at 70% 0%, rgba(124,58,237,0.12), transparent 62%), #f4effe' }}
            >
              <div className="[perspective:1500px]">
                <div className="transition-transform duration-500 ease-out [transform:rotateY(6deg)_rotateX(3deg)] hover:[transform:rotateY(2deg)_rotateX(1deg)]">
                  <ShotFrame src="/pnl-distribution.png" alt="P&L distribution" chrome={false} glow={0.18} />
                </div>
              </div>
              <div className="float-slow absolute -top-3 -right-3 rounded-2xl border border-line bg-surface px-4 py-3 elev-3">
                <div className="micro text-ink-faint">Best trade</div>
                <div className="tnum mt-0.5 text-[15px] font-bold text-teal">+31R</div>
              </div>
              <div className="float-slower absolute -bottom-3 -left-3 rounded-2xl border border-line bg-surface px-4 py-3 elev-3">
                <div className="micro text-ink-faint">Tail risk</div>
                <div className="tnum mt-0.5 text-[15px] font-bold text-rose">−2R</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multiple Portfolios — editorial blob-icon grid */}
      <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
        <Sparkles points={GRID_SPARKS} color="rgba(26,29,36,0.45)" />
        <div className="mx-auto max-w-[1080px]">
          <FeatureSectionHead
            eyebrow="Multiple Portfolios"
            accent="teal"
            title={<>One account was <span className="text-teal">never enough.</span></>}
            sub="A crypto wallet, a stock account, a funded prop challenge — keep them apart, or watch them together. Open as many portfolios as you trade and track every one in parallel."
          />
          <div className="mt-16 grid grid-cols-1 gap-x-14 gap-y-12 sm:grid-cols-2">
            {PORTFOLIOS.map((p, i) => (
              <div key={p.title} data-side={i % 2 === 0 ? 'left' : 'right'} className="flex items-start gap-5">
                <BlobIcon Icon={p.Icon} from={p.from} to={p.to} />
                <div className="pt-3">
                  <h3 className="font-display text-[19px] font-bold text-ink">{p.title}</h3>
                  <p className="mt-2 max-w-[300px] text-[14px] leading-[1.6] text-ink-mute">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Health & Orca Score — copy + one unified dark console panel */}
      <section className="relative overflow-hidden px-6 py-28 md:px-10 md:py-40">
        <Blob variant="side" morph from="#f43f5e" to="#7c3aed" className="pointer-events-none absolute top-1/2 -left-32 -z-10 h-[560px] w-[560px] -translate-y-1/2 opacity-[0.06]" />
        <Sparkles points={GRID_SPARKS} color="rgba(244,63,94,0.4)" />
        <div className="mx-auto grid max-w-[1160px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div data-side="left">
            <span className="micro font-semibold text-rose">System Health &amp; Orca Score</span>
            <span className="mt-3 block h-[3px] w-9 rounded-full bg-rose" />
            <h3 className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.3rem)] leading-[1.12] font-bold text-ink">
              The critical mind that <span className="text-rose">protects you from yourself.</span>
            </h3>
            <p className="mt-5 max-w-[480px] text-[15.5px] leading-[1.65] text-ink-mute">
              Your trading is measured beyond profit and loss. Discipline, risk consistency and strategy
              fit (Regime Fit) grade you with full objectivity — showing exactly when you’re trading by
              your rules, and when emotion takes the wheel.
            </p>
            <div className="mt-8">
              <CTA href="/signup">Meet your Orca Score</CTA>
            </div>
          </div>

          {/* Unified dark console with the four gauges */}
          <div data-side="right" className="relative">
            <HoloGlow className="!inset-x-[-6%] !inset-y-[-6%]" opacity={0.34} blur={70} />
            <div className="relative rounded-[22px] border border-white/10 bg-[#0b0d12] p-3.5 shadow-[0_40px_80px_-28px_rgba(20,16,50,0.5)]">
              <div className="flex items-center gap-2 px-2 pt-1 pb-3">
                <span className="h-2 w-2 rounded-full bg-teal" />
                <span className="text-[11px] font-semibold tracking-wide text-white/60 uppercase">System Health</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {SCORES.map((s) => (
                  <div key={s.label} className="overflow-hidden rounded-xl">
                    <AssetImage
                      src={s.src}
                      alt={s.label}
                      className="block w-full object-cover"
                      fallback={<div className="flex aspect-[1.66/1] items-center justify-center bg-[#0f131b] text-[12px] text-white/40">{s.label}</div>}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA #2 — after the last section (speed angle; three-step setter) */}
      <SixtySecondsCTA />
    </PageShell>
  )
}

/* ── CTA #1 — the mess of tools collapses into one screen. Angle: consolidation.
   A pile of source chips resolving into a single Orca card — a shape used nowhere
   else on the site. */
const SOURCES = ['MT5', 'Binance', 'Bybit', 'Excel', 'TradingView', 'Screenshots', 'Notes', 'IBKR']
const TILT = ['-6deg', '4deg', '-3deg', '7deg', '-5deg', '3deg', '-2deg', '5deg']
function CloseTheTabsCTA() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[980px]">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_auto_0.9fr]">
          {/* the mess */}
          <div className="flex flex-wrap justify-center gap-2.5 md:justify-start">
            {SOURCES.map((s, i) => (
              <span
                key={s}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] font-semibold text-ink-faint elev-1"
                style={{ transform: `rotate(${TILT[i]})`, opacity: 0.72 }}
              >
                {s}
              </span>
            ))}
          </div>
          {/* arrow */}
          <div className="flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-soft text-indigo">
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </span>
          </div>
          {/* the one card */}
          <div className="relative mx-auto w-full max-w-[280px]">
            <HoloGlow className="!inset-x-[-10%] !inset-y-[-10%]" opacity={0.4} blur={60} />
            <div className="relative rounded-2xl border border-line bg-surface p-4 elev-3">
              <div className="flex items-center gap-2.5">
                <img src="/orca-icon.png" alt="" className="h-8 w-8 rounded-full object-cover" />
                <div>
                  <div className="text-[13px] font-bold text-ink">All accounts</div>
                  <div className="text-[11px] text-ink-faint">1 honest screen</div>
                </div>
                <span className="tnum ml-auto text-[15px] font-bold text-teal">+37.4R</span>
              </div>
              <div className="mt-3 flex items-end gap-1">
                {[10, 16, 12, 20, 15, 24, 18, 27, 22, 30].map((hh, i) => (
                  <span key={i} className="w-full rounded-sm bg-indigo/70" style={{ height: hh }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 data-animate="title" className="font-display text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.1] font-bold text-ink">
            Close the other <span className="text-indigo">twelve tabs.</span>
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[16px] leading-[1.65] text-ink-mute">
            Exchanges, brokers, spreadsheets, screenshots — every account you scatter across a dozen tools,
            pulled into one screen that finally tells the truth.
          </p>
          <div data-reveal className="mt-8"><CTA href="/signup">Bring it all together</CTA></div>
        </div>
      </div>
    </section>
  )
}

/* ── CTA #2 — live in about a minute. Angle: speed of setup. A numbered path —
   distinct closing shape. */
const STEPS = [
  { n: '1', Icon: Plug, t: 'Connect', d: 'Read-only API or a dropped file. 30 seconds.' },
  { n: '2', Icon: Zap, t: 'Auto-sync', d: 'Orca pulls, cleans and tags every trade.' },
  { n: '3', Icon: Gauge, t: 'See your edge', d: 'Your whole account, scored, on one screen.' },
]
function SixtySecondsCTA() {
  return (
    <section className="relative overflow-hidden px-6 pt-8 pb-32 md:px-10">
      <div className="mx-auto max-w-[920px] text-center">
        <span className="micro font-semibold text-indigo">Setup</span>
        <h2 data-animate="title" className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.1] font-bold text-ink">
          Live in about <span className="text-indigo">sixty seconds.</span>
        </h2>
        <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
          {/* connector line */}
          <div aria-hidden className="pointer-events-none absolute left-[16%] right-[16%] top-[34px] hidden h-px bg-line sm:block" />
          {STEPS.map((s) => (
            <div key={s.n} className="relative flex flex-col items-center rounded-2xl border border-line bg-surface p-6 elev-1">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo text-[16px] font-bold text-white">{s.n}</span>
              <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-bold text-ink"><s.Icon className="h-4 w-4 text-indigo" strokeWidth={2} /> {s.t}</span>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-mute">{s.d}</p>
            </div>
          ))}
        </div>
        <div data-reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <CTA href="/signup">Connect an account</CTA>
          <CTA href="/pricing" variant="secondary">Compare plans</CTA>
        </div>
      </div>
    </section>
  )
}

/** Floating-card cluster: a big tilted shot with small stat cards overlapping. */
function OpportunityCluster() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] pt-6 pb-10 [perspective:1700px]">
      <HoloGlow className="!inset-x-[-8%] !inset-y-[-6%]" opacity={0.4} blur={72} />
      <div className="relative transition-transform duration-500 ease-out [transform:rotateY(-9deg)_rotateX(5deg)] hover:[transform:rotateY(-3deg)_rotateX(2deg)]">
        <div className="overflow-hidden rounded-[16px] border border-line bg-surface p-2 elev-3">
          <AssetImage
            src="/opportunity-window.png"
            alt="Opportunity windows by day and hour"
            className="block w-full rounded-[10px] object-cover"
            fallback={<div className="flex aspect-[16/9] items-center justify-center text-[13px] text-ink-faint">Opportunity Window</div>}
          />
        </div>
      </div>

      <div className="float-slow absolute -top-1 -left-3 rounded-2xl border border-line bg-surface px-4 py-3 elev-3">
        <div className="micro text-ink-faint">Best day</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-ink">Tue</span>
          <span className="tnum text-[14px] font-bold text-teal">+44.15R</span>
        </div>
      </div>
      <div className="float-slower absolute -right-3 bottom-3 rounded-2xl border border-line bg-surface px-4 py-3 elev-3">
        <div className="micro text-ink-faint">Worst hour</div>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-ink">18:00</span>
          <span className="tnum text-[14px] font-bold text-rose">−5.00R</span>
        </div>
      </div>
    </div>
  )
}
