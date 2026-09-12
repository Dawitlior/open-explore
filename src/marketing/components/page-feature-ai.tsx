import { useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  ArrowRight,
  Star,
  Check,
  Lightbulb,
  Target,
  TrendingUp,
  ShieldCheck,
  Cpu,
  ScanSearch,
  GitBranch,
  MessageSquare,
  Sparkles,
  Activity,
  Lock,
  BarChart3,
  Brain,
  Gauge,
  ChevronDown,
} from 'lucide-react'
import { PageShell } from './page-shell'

/* ============================================================================
   AI INSIGHTS (/features/ai) — a faithful rebuild of the "Sasstech" template
   (ThemeForest) the founder sent: royal-blue accent, lavender hero with a faint
   grid, a ticker sub-nav, a photo/visual card with floating stat cards, a logo
   marquee, an About card-cluster, a dark "Working Roadmap" of numbered circles
   on a wavy line, alternating blue/white stat pills, a varied-tint offerings
   grid, a "Tech Solution" accordion, a "Why Choose Us" tile composition, a dark
   "Work Showcase" carousel, and a dark stats CTA band. Content = Orca's AI
   Insights: transparent on-device math + one controlled LLM coach.
   ========================================================================== */

const BLUE = '#2f54eb'
const NAVY = '#14123a'
const PINK = '#ff2d6f'

/* Hotlink-friendly Pexels CDN photo (unique per slot — no reused screenshots). */
const px = (id: number, w = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`

/* ── shared bits ─────────────────────────────────────────────────────────── */
function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'navy' | 'soft' }) {
  const cls =
    tone === 'navy'
      ? 'bg-[#14123a] text-white'
      : tone === 'soft'
        ? 'bg-[#e7ebfd] text-[#2f54eb]'
        : 'bg-[#2f54eb] text-white'
  return <span className={'inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-bold ' + cls}>{children}</span>
}
function BlueBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-full bg-[#2f54eb] px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_14px_30px_-10px_rgba(47,84,235,0.6)] transition-transform hover:-translate-y-0.5">
      {children}
    </a>
  )
}
function DarkBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-full bg-[#14123a] px-7 py-3.5 text-[14.5px] font-semibold text-white transition-transform hover:-translate-y-0.5">
      {children}
    </a>
  )
}
function Avatars() {
  return (
    <div className="flex -space-x-3">
      {['#c7d2fe', '#fbcfe8', '#bbf7d0'].map((c, i) => (
        <span key={i} className="h-9 w-9 rounded-full border-2 border-surface" style={{ background: `radial-gradient(circle at 35% 30%, #fff2, transparent), ${c}` }} />
      ))}
    </div>
  )
}
function ArrowDisc({ tone = 'blue' }: { tone?: 'blue' | 'pink' | 'green' | 'white' }) {
  const bg = tone === 'pink' ? PINK : tone === 'green' ? '#16a34a' : tone === 'white' ? '#fff' : BLUE
  const fg = tone === 'white' ? BLUE : '#fff'
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: bg, color: fg }}>
      <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
    </span>
  )
}

/* ── Hero ────────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: '#ecebfb' }}>
      {/* faint grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.5]" style={{ backgroundImage: 'linear-gradient(#dcdcf5 1px, transparent 1px), linear-gradient(90deg,#dcdcf5 1px, transparent 1px)', backgroundSize: '54px 54px', maskImage: 'radial-gradient(70% 60% at 70% 40%, #000 0%, transparent 75%)' }} />
      <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-6 pt-32 pb-24 md:px-10 md:pt-36 md:pb-32 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1 data-animate="title" className="font-display text-[clamp(2.4rem,5.2vw,4.1rem)] leading-[1.04] text-ink">
            <span className="font-normal">Insights You Can </span><span className="font-extrabold">Prove</span>
            <br /><span className="font-normal">Not an </span><span className="font-extrabold">AI</span><span className="font-normal"> That </span><span className="font-extrabold">Guesses</span>
          </h1>
          <p data-reveal className="mt-6 max-w-[500px] text-[16px] leading-[1.7] text-ink-mute">
            Every product slaps “AI” on a button. Orca draws a hard line: almost every insight is transparent
            math that runs on your device — no tokens, no network, nothing leaves your browser. Only the coach
            uses a language model, on a tight leash.
          </p>
          <div data-reveal className="mt-9 flex flex-wrap items-center gap-6">
            <BlueBtn href="/signup">Get Started</BlueBtn>
            <div className="flex items-center gap-3">
              <Avatars />
              <div>
                <div className="font-display text-[20px] font-bold text-ink">2.3M+</div>
                <div className="text-[12.5px] text-ink-mute">insights generated</div>
              </div>
            </div>
          </div>
        </div>

        {/* visual card + floating cards */}
        <div data-reveal className="relative">
          <div className="overflow-hidden rounded-[26px] border border-line bg-surface elev-3">
            <img src="/ai-insights.png" alt="Orca deep insights engine" className="w-full" />
          </div>
          {/* on-device badge (top-right) */}
          <div className="absolute -right-3 top-6 rounded-2xl bg-surface px-4 py-3 elev-3">
            <div className="flex items-center gap-1 text-[12px] font-semibold text-ink-mute"><ShieldCheck className="h-4 w-4" style={{ color: '#16a34a' }} strokeWidth={2.2} /> On-device</div>
            <div className="mt-1 flex items-center gap-1 text-[13px] font-bold text-ink">100% private <span className="ml-1 rounded-full bg-[#e9f7ef] px-1.5 py-0.5 text-[10px] font-bold text-[#16a34a]">0 tokens</span></div>
          </div>
          {/* trader DNA card (bottom-left) */}
          <div className="absolute -left-4 bottom-6 w-[220px] rounded-2xl bg-surface p-4 elev-3">
            <div className="text-[11px] font-bold tracking-widest text-ink-faint uppercase">Trader DNA</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-display text-[30px] font-bold text-ink">78</span>
              <span className="mb-1 text-[11px] text-ink-mute">/ 100</span>
            </div>
            <div className="mt-1 flex gap-1.5 text-[10px] text-ink-faint">Edge · Discipline · Consistency</div>
          </div>
          {/* blue square (bottom-right) */}
          <div className="absolute -right-2 bottom-0 flex h-28 w-28 flex-col items-center justify-center rounded-2xl text-white" style={{ background: BLUE }}>
            <span className="font-display text-[34px] font-bold leading-none">5</span>
            <span className="mt-1 text-center text-[11px] leading-tight">Analysis<br />layers</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── About — card cluster + feature rows ────────────────────────────────── */
const ABOUT_ROWS = [
  { Icon: Lightbulb, title: 'Proof, not vibes', body: 'If it claims “you add risk after a loss,” it can point to the exact trades and the formula behind it.' },
  { Icon: Target, title: 'It refuses to guess', body: 'A weak signal is marked inconclusive — a t-test decides what counts, so you don’t chase noise.' },
  { Icon: TrendingUp, title: 'One score that matters', body: 'Trader DNA folds edge, discipline, consistency and behaviour into a single, honest number.' },
]
function About() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* cluster */}
        <div data-reveal className="grid grid-cols-2 gap-4">
          <div className="flex flex-col justify-center rounded-3xl p-6 text-white" style={{ background: BLUE }}>
            <div className="flex items-center gap-1 font-display text-[40px] font-bold"><TrendingUp className="h-7 w-7" strokeWidth={2.5} /> 88%</div>
            <p className="mt-1 text-[13px] text-white/85">of your patterns are invisible without measurement</p>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-surface elev-2">
            <img src={px(5833793)} alt="Trading analytics" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col items-center justify-center rounded-3xl p-6 text-center text-white" style={{ background: NAVY }}>
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full" style={{ background: `conic-gradient(${BLUE} 0 78%, #ffffff22 78% 100%)` }}>
              <span className="flex h-[74px] w-[74px] items-center justify-center rounded-full font-display text-[22px] font-bold" style={{ background: NAVY }}>78</span>
            </div>
            <p className="mt-3 text-[12px] text-white/70">Trader DNA — process, not P&amp;L</p>
          </div>
          <div className="flex flex-col justify-center gap-2.5">
            <span className="w-fit rounded-full px-4 py-2 text-[13px] font-semibold text-white" style={{ background: NAVY }}>Directional bias</span>
            <span className="w-fit rounded-full px-4 py-2 text-[13px] font-semibold text-white" style={{ background: PINK }}>Golden hour</span>
            <span className="w-fit rounded-full px-4 py-2 text-[13px] font-semibold text-white" style={{ background: BLUE }}>Revenge trading</span>
          </div>
        </div>
        {/* copy */}
        <div>
          <Pill tone="soft">About the engine</Pill>
          <h2 data-animate="title" className="mt-5 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.08] text-ink">
            <span className="font-normal">Transparent </span><span className="font-extrabold">Analysis</span><span className="font-normal"> You Can Actually Trust</span>
          </h2>
          <div className="mt-8 flex flex-col gap-7">
            {ABOUT_ROWS.map((r) => (
              <div key={r.title} data-reveal className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: '#e7ebfd', color: BLUE }}><r.Icon className="h-6 w-6" strokeWidth={1.8} /></span>
                <div>
                  <h3 className="text-[17px] font-bold text-ink">{r.title}</h3>
                  <p className="mt-1 max-w-[420px] text-[14px] leading-[1.6] text-ink-mute">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Working Roadmap — dark, numbered circles on a wavy line ─────────────── */
const CIRCLES = [
  { n: '01', label: 'Rules Engine', Icon: BarChart3, tone: BLUE },
  { n: '02', label: 'Deep Detectors', Icon: ScanSearch, tone: '#3b3766' },
  { n: '03', label: 'Trader DNA', Icon: Brain, tone: '#1f8a8a' },
  { n: '04', label: 'Statistical Core', Icon: Activity, tone: '#3b3766' },
  { n: '05', label: 't-test Gate', Icon: Target, tone: '#3b3766' },
  { n: '06', label: 'Orca Coach', Icon: MessageSquare, tone: PINK },
  { n: '07', label: 'Cortex ML', Icon: Cpu, tone: BLUE },
  { n: '08', label: 'Changepoints', Icon: GitBranch, tone: '#1f8a8a' },
]
function Roadmap() {
  return (
    <section className="px-6 py-6 md:px-10">
      <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] px-6 py-14 md:px-12 md:py-16" style={{ background: NAVY }}>
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Pill tone="navy"><span className="text-white/90">What runs under the hood</span></Pill>
            <h2 data-animate="title" className="mt-5 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.05] text-white">Working Roadmap</h2>
            <p className="mt-5 max-w-[420px] text-[15px] leading-[1.65] text-white/70">
              Five layers of analysis, from plain rules to a machine-learning core — most of it deterministic
              and on-device. The order is fixed; the math is reproducible.
            </p>
            <div className="mt-8 flex items-center gap-5">
              <BlueBtn href="/signup">Get Started</BlueBtn>
              <div className="flex items-center gap-2 text-white"><Avatars /><span className="text-[14px] font-semibold">1.5M+</span></div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-6">
            {CIRCLES.map((c) => (
              <div key={c.n} className="flex flex-col items-center text-center">
                <div className="relative flex h-[104px] w-[104px] items-center justify-center rounded-full" style={{ background: c.tone }}>
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold" style={{ color: NAVY }}>{c.n}</span>
                  <c.Icon className="h-8 w-8 text-white" strokeWidth={1.6} />
                </div>
                <span className="mt-2.5 text-[12.5px] font-semibold text-white leading-tight">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Stat pills — alternating blue/white ────────────────────────────────── */
const STATS = [
  { big: '0', sub: 'tokens ever sent from your device', blue: true },
  { big: '15+', sub: 'behavioral detectors running', blue: true },
  { big: '4', sub: 'reliability tiers before a claim', blue: false },
  { big: '99%', sub: 'of insights are on-device math', blue: false },
  { big: '5', sub: 'layers from rules to ML core', blue: true },
  { big: '1', sub: 'controlled LLM — the coach', blue: false },
]
function Stats() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-20">
      <div className="grid gap-5 md:grid-cols-3">
        {STATS.map((s, i) => (
          <div
            key={i}
            data-reveal
            className={'flex items-center gap-4 rounded-full px-8 py-7 ' + (s.blue ? 'text-white' : 'border border-line bg-surface elev-1')}
            style={s.blue ? { background: BLUE } : undefined}
          >
            <span className={'font-display text-[40px] font-bold leading-none ' + (s.blue ? 'text-white' : '')} style={s.blue ? undefined : { color: BLUE }}>{s.big}</span>
            <span className={'text-[13.5px] leading-snug ' + (s.blue ? 'text-white/85' : 'text-ink-mute')}>{s.sub}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Offerings grid — varied tints ──────────────────────────────────────── */
const OFFERS = [
  { eyebrow: 'Layer 1', title: 'Directional & timing bias', tint: '#eef1fe', ec: BLUE, arrow: 'blue' as const, Icon: TrendingUp },
  { eyebrow: 'Layer 2', title: 'Revenge & over-confidence', tint: '#fdeef4', ec: PINK, arrow: 'pink' as const, Icon: Activity },
  { eyebrow: 'Layer 3', title: 'Trader DNA score', tint: '#e9f7ef', ec: '#16a34a', arrow: 'green' as const, Icon: Brain },
  { eyebrow: 'Layer 4', title: 'Cortex machine learning', tint: NAVY, ec: '#fff', arrow: 'white' as const, Icon: Cpu, dark: true },
  { eyebrow: 'Layer 5', title: 'The Orca Coach', tint: '#eef1fe', ec: BLUE, arrow: 'blue' as const, Icon: MessageSquare },
]
function Offerings() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-28">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Pill tone="soft">What it surfaces</Pill>
          <h2 data-animate="title" className="mt-5 max-w-[620px] font-display text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.08] text-ink">
            <span className="font-extrabold">Every Layer</span><span className="font-normal"> of Your Edge, Read for You</span>
          </h2>
        </div>
        <p className="max-w-[320px] text-[14px] leading-[1.6] text-ink-mute">From plain rules to a machine-learning core — each layer adds depth, never noise.</p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {OFFERS.map((o, i) => (
          <div
            key={o.title}
            data-reveal
            className={'flex flex-col justify-between rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 ' + (i === 0 ? 'md:col-span-2' : '') + (o.dark ? ' text-white' : '')}
            style={{ background: o.tint, minHeight: 220 }}
          >
            <div>
              <span className="text-[13px] font-bold" style={{ color: o.ec }}>{o.eyebrow}</span>
              <h3 className={'mt-2 max-w-[280px] font-display text-[22px] font-bold leading-tight ' + (o.dark ? 'text-white' : 'text-ink')}>{o.title}</h3>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <ArrowDisc tone={o.arrow} />
              <o.Icon className={o.dark ? 'h-9 w-9 text-white/70' : 'h-9 w-9'} style={o.dark ? undefined : { color: o.ec, opacity: 0.5 }} strokeWidth={1.6} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Tech Solution — accordion ──────────────────────────────────────────── */
const ACC = [
  { t: 'On-device insight engine', b: 'Rules and statistics in pure TypeScript, running in your browser. Same inputs, same result — zero network, zero tokens.' },
  { t: 'Deep detectors & Trader DNA', b: 'Around fifteen behavioral detectors — revenge, over-confidence, golden hour — fold into one honest Trader DNA score.' },
  { t: 'Statistical core & t-tests', b: 'Every segment is normalized to R and checked with a t-test. Weak signals are marked gray, not sold to you as edge.' },
  { t: 'Orca Coach — the only LLM', b: 'A behavioral mentor that talks through your numbers. It never sees your trades — only your archetype and what you type.' },
]
function TechSolution() {
  const [open, setOpen] = useState(0)
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <Pill tone="soft">Two systems, not one</Pill>
          <h2 data-animate="title" className="mt-5 font-display text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.05] text-ink">
            <span className="font-extrabold">The Complete</span><span className="font-normal"> Engine To Power Your </span><span className="font-extrabold">Insights</span>
          </h2>
          <div className="mt-8 flex flex-col">
            {ACC.map((a, i) => {
              const isOpen = open === i
              return (
                <button key={a.t} onClick={() => setOpen(isOpen ? -1 : i)} className="border-b border-line py-5 text-left">
                  <div className="flex items-center justify-between gap-4">
                    <span className={'font-display text-[19px] font-bold ' + (isOpen ? '' : 'text-ink')} style={isOpen ? { color: BLUE } : undefined}>{a.t}</span>
                    <ChevronDown className={'h-5 w-5 shrink-0 text-ink-faint transition-transform ' + (isOpen ? 'rotate-180' : '')} strokeWidth={2} />
                  </div>
                  {isOpen && <p className="mt-3 max-w-[460px] text-[14px] leading-[1.65] text-ink-mute">{a.b}</p>}
                </button>
              )
            })}
          </div>
        </div>
        <div data-reveal className="relative">
          <div className="overflow-hidden rounded-[26px] border border-line bg-surface elev-3">
            <img src={px(8386437)} alt="AI analysis" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div className="absolute -left-4 bottom-8 rounded-2xl bg-surface px-4 py-3 elev-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-ink"><Lock className="h-4 w-4" style={{ color: '#16a34a' }} strokeWidth={2.2} /> Nothing sent to a server</div>
          </div>
          <div className="absolute -right-3 top-8 rounded-2xl bg-surface px-4 py-3 elev-3">
            <div className="text-[11px] text-ink-faint">Significance</div>
            <div className="mt-0.5 flex items-center gap-1 text-[14px] font-bold text-ink"><Gauge className="h-4 w-4" style={{ color: BLUE }} strokeWidth={2.2} /> p &lt; 0.05</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Why Choose Us — tile composition ───────────────────────────────────── */
const TILES = [Sparkles, Brain, MessageSquare, Cpu]
function WhyChoose() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div data-reveal className="relative">
          <div className="overflow-hidden rounded-[26px] border border-line bg-surface elev-3">
            <img src={px(3184357)} alt="Team using Orca" className="aspect-[4/5] w-full object-cover" />
          </div>
          {[{ t: 0, l: 6 }, { t: 4, l: 62 }, { t: 46, l: 2 }, { t: 58, l: 70 }].map((p, i) => {
            const Icon = TILES[i]
            return (
              <span key={i} className="absolute flex h-16 w-16 items-center justify-center rounded-2xl bg-surface elev-3" style={{ top: `${p.t}%`, left: `${p.l}%` }}>
                <Icon className="h-7 w-7" style={{ color: BLUE }} strokeWidth={1.7} />
              </span>
            )
          })}
        </div>
        <div>
          <Pill>Why trust it</Pill>
          <h2 data-animate="title" className="mt-5 font-display text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.05] text-ink">
            <span className="font-normal">Orca Makes AI You Can </span><span className="font-extrabold">Actually Trust.</span>
          </h2>
          <p data-reveal className="mt-6 max-w-[460px] text-[15px] leading-[1.65] text-ink-mute">
            Because the math is on your device and every claim is testable, an insight is something you can
            verify — not a black box asking for faith.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[['Provable', 'Points to the exact trades & formula.'], ['Private', 'Your trades never leave the browser.']].map(([t, b]) => (
              <div key={t} className="rounded-2xl border border-line bg-canvas-deep/60 p-5">
                <h3 className="text-[15.5px] font-bold text-ink">{t}</h3>
                <p className="mt-1.5 text-[13px] leading-[1.55] text-ink-mute">{b}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-end gap-3">
            <span className="font-display text-[44px] font-bold leading-none" style={{ color: BLUE }}>0</span>
            <span className="mb-1 max-w-[220px] text-[14px] text-ink-mute">trade rows ever sent to a server</span>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Work Showcase — dark carousel ──────────────────────────────────────── */
const SHOW = [
  { eyebrow: 'Insight', title: 'Golden hour: +0.8R after 14:00', tint: '#1f2b5e' },
  { eyebrow: 'Insight', title: 'Revenge trades: −1.9R average', tint: '#0f3d2e', accent: true },
  { eyebrow: 'Insight', title: 'Tuesday “edge” — flagged inconclusive', tint: BLUE },
  { eyebrow: 'Insight', title: 'Trader DNA climbed 61 → 78', tint: '#3a1f5e' },
]
function Showcase() {
  return (
    <section className="px-6 py-6 md:px-10">
      <div className="mx-auto max-w-[1240px] rounded-[28px] px-6 py-16 md:px-12 md:py-20" style={{ background: NAVY }}>
        <div className="text-center">
          <Pill tone="navy"><span className="text-white/90">Work showcase</span></Pill>
          <h2 data-animate="title" className="mx-auto mt-5 max-w-[720px] font-display text-[clamp(1.9rem,3.8vw,2.9rem)] leading-[1.08] text-white">
            <span className="font-normal">Real Insights, </span><span className="font-extrabold">Growth &amp; Efficiency</span>
          </h2>
        </div>
        <div className="mt-12 flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SHOW.map((s) => (
            <div key={s.title} className="flex min-w-[300px] flex-1 flex-col justify-between rounded-3xl p-7" style={{ background: s.tint, minHeight: 300 }}>
              <div className="flex justify-end"><ArrowDisc tone="white" /></div>
              <div>
                <span className="text-[12px] font-bold" style={{ color: s.accent ? '#4ade80' : '#c7d2fe' }}>{s.eyebrow}</span>
                <h3 className="mt-2 font-display text-[20px] font-bold leading-snug text-white">{s.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── "Testimonials" layout — honest principle cards (no fabricated reviews) ─ */
const PRINCIPLES = [
  { title: 'It shows its work', body: 'Every insight links to the trades and the formula that produced it. Nothing is asserted on faith.', Icon: ScanSearch },
  { title: 'It stays on the noise-safe side', body: 'When a pattern isn’t statistically significant, Orca says so and refuses to conclude — protecting you from chasing randomness.', Icon: ShieldCheck },
  { title: 'It keeps your data yours', body: 'The heavy analysis runs on your device. Your trades, P&L and balance never touch a server.', Icon: Lock },
]
function Principles() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-20 md:px-10 md:py-28">
      <div className="text-center">
        <Pill tone="soft">Why it’s different</Pill>
        <h2 data-animate="title" className="mx-auto mt-5 max-w-[640px] font-display text-[clamp(1.9rem,3.8vw,2.9rem)] leading-[1.08] text-ink">
          <span className="font-normal">What Makes Our </span><span className="font-extrabold">AI Honest</span>
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {PRINCIPLES.map((p) => (
          <div key={p.title} data-reveal className="rounded-3xl border border-line bg-surface p-8 elev-1 transition-all duration-300 hover:-translate-y-1 hover:elev-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ background: BLUE }}><p.Icon className="h-6 w-6" strokeWidth={1.8} /></span>
            <div className="mt-5 flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4" style={{ color: '#f4b740' }} fill="#f4b740" strokeWidth={0} />)}</div>
            <h3 className="mt-3 font-display text-[19px] font-bold text-ink">{p.title}</h3>
            <p className="mt-2 text-[14px] leading-[1.65] text-ink-mute">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Blog ────────────────────────────────────────────────────────────────── */
const POSTS = [
  { slug: 'noise-vs-signal-hold', tag: 'Data & Analytics', title: 'Noise vs signal: when a pattern is real', img: px(5833762) },
  { slug: 'hidden-correlation', tag: 'Quant', title: 'The hidden correlation in your portfolio', img: px(32026165) },
]
function Blog() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-16 md:px-10 md:py-20">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <Pill tone="soft">From the journal</Pill>
          <h2 data-animate="title" className="mt-4 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold text-ink">Insights to help you read your own edge</h2>
        </div>
        <BlueBtn href="/resources">Read more</BlueBtn>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {POSTS.map((p) => (
          <a key={p.slug} href={`/resources/${p.slug}`} className="group overflow-hidden rounded-3xl border border-line bg-surface elev-1 transition-all duration-300 hover:-translate-y-1 hover:elev-2">
            <div className="aspect-[16/9] overflow-hidden bg-canvas-deep"><img src={p.img} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
            <div className="p-6">
              <span className="rounded-full bg-canvas-deep px-3 py-1 text-[12px] font-semibold text-ink-mute">{p.tag}</span>
              <h3 className="mt-3 font-display text-[19px] font-bold text-ink">{p.title}</h3>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: BLUE }}>Learn more <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} /></span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

/* ── Dark CTA band ───────────────────────────────────────────────────────── */
function CtaBand() {
  return (
    <section className="px-6 pb-8 md:px-10 md:pb-16">
      <div className="mx-auto max-w-[1240px] overflow-hidden rounded-[28px] px-8 py-14 md:px-14 md:py-16" style={{ background: NAVY }}>
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap gap-10">
              {[['99%', 'insights computed on your device'], ['0', 'trade rows ever leave the browser']].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-[clamp(2.4rem,5vw,3.4rem)] font-bold text-white">{n}</div>
                  <p className="mt-1 max-w-[240px] text-[14px] text-white/60">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 h-px w-full bg-white/10" />
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {['It refuses to conclude on noise', 'One controlled AI coach, rate-limited'].map((t) => (
                <span key={t} className="flex items-center gap-2 text-[14px] text-white/85"><Check className="h-4 w-4" style={{ color: '#4ade80' }} strokeWidth={2.5} /> {t}</span>
              ))}
            </div>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>a]:w-full [&>a]:justify-center sm:[&>a]:w-auto">
              <BlueBtn href="/signup">Start free</BlueBtn>
              <a href="/#demo" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto">See it in action <ArrowRight className="h-4 w-4" strokeWidth={2.2} /></a>
            </div>
          </div>
          <div className="relative hidden justify-center lg:flex">
            <div className="w-[220px] overflow-hidden rounded-[28px] border-4 border-white/10 elev-3"><img src={px(6804422, 600)} alt="Orca on mobile" className="aspect-[9/16] w-full object-cover" /></div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function AiInsightsFeaturePage() {
  return (
    <PageShell>
      <Hero />
      <About />
      <Roadmap />
      <Stats />
      <Offerings />
      <TechSolution />
      <WhyChoose />
      <Showcase />
      <Principles />
      <Blog />
      <CtaBand />
    </PageShell>
  )
}
