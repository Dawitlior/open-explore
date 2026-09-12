import { BookText, BarChart3, ShieldCheck, Waves } from 'lucide-react'
import { AssetImage, Card, IconTile, type Accent } from './ui/primitives'
import { FeatureCarousel } from './feature-carousel'

/* ============================================================================
   WHAT'S INSIDE — the SEO-PowerSuite-style block: heading + divider + copy +
   SEE MORE button + illustration on the left; a staggered 2×2 grid of feature
   cards on the right. Converted to Orca's four core tools.
   ========================================================================== */

type Tool = { Icon: typeof BookText; accent: Accent; title: string; desc: string }

const TOOLS: Tool[] = [
  {
    Icon: BookText,
    accent: 'violet',
    title: 'Trade Journal',
    desc: 'Every trade syncs from your broker and gets tagged automatically — no manual logging, ever.',
  },
  {
    Icon: BarChart3,
    accent: 'teal',
    title: 'Quant Lab',
    desc: 'Monte Carlo, heatmaps and expectancy — the stats that expose your real, provable edge.',
  },
  {
    Icon: ShieldCheck,
    accent: 'amber',
    title: 'Risk Engine',
    desc: 'A four-tier engine that caps risk per trade, day, week and month before damage compounds.',
  },
  {
    Icon: Waves,
    accent: 'rose',
    title: 'Trader Mind',
    desc: 'The behavioral mirror — what you say about your trading vs what the data actually shows.',
  },
]

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Card accent={tool.accent} className="p-7">
      <IconTile accent={tool.accent}>
        <tool.Icon className="h-5 w-5" strokeWidth={1.75} />
      </IconTile>
      <h3 className="mt-6 font-display text-[19px] font-bold text-ink">{tool.title}</h3>
      <p className="mt-2.5 text-[14px] leading-relaxed text-ink-mute">{tool.desc}</p>
    </Card>
  )
}

export function SectionInside() {
  return (
    <section id="inside" className="relative mx-auto w-full max-w-[1200px] px-6 py-36 md:px-10">
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left — copy + illustration */}
        <div data-side="left">
          <h2 className="font-display text-[clamp(1.9rem,3.8vw,3rem)] leading-[1.06] font-bold text-ink">
            What&apos;s inside Orca?
          </h2>

          <div className="mt-6 flex items-center gap-1.5">
            <span className="h-1 w-10 rounded-full bg-indigo" />
            <span className="h-1 w-16 rounded-full bg-line" />
          </div>

          <p className="mt-6 max-w-[420px] text-[16px] leading-[1.65] text-ink-mute">
            Orca turns your raw broker history into a full trading system: an automatic journal, deep
            analytics, a disciplined risk engine, and a behavioral mirror. Four tools, one account.
          </p>

          <div className="mt-8">
            <a
              href="/features/dashboard"
              className="group inline-flex items-center gap-3 rounded-full border border-indigo/40 py-1.5 pr-1.5 pl-6 text-[12px] font-bold tracking-[0.14em] text-indigo uppercase transition-colors hover:border-indigo"
            >
              See more
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo text-white transition-transform duration-300 group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </div>

          <div className="mt-12">
            <AssetImage
              src="/inside.png"
              alt="Turning trades into a rising, data-driven edge"
              className="block w-full max-w-[440px]"
              fallback={
                <div className="flex h-[280px] max-w-[440px] items-center justify-center rounded-2xl border border-line bg-canvas-deep text-[13px] text-ink-faint">
                  Illustration
                </div>
              }
            />
          </div>
        </div>

        {/* Right — staggered 2×2 cards */}
        <div data-side="right" className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-6">
            {[TOOLS[0], TOOLS[2]].map((t) => (
              <div key={t.title}>
                <ToolCard tool={t} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-6 sm:mt-14">
            {[TOOLS[1], TOOLS[3]].map((t) => (
              <div key={t.title}>
                <ToolCard tool={t} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coverflow — tools for the full review loop */}
      <div className="mt-28 text-center">
        <h3
          data-animate="title"
          className="font-display text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.08] font-bold text-ink"
        >
          Tools for the full review loop
        </h3>
        <p data-reveal className="mx-auto mt-4 max-w-[520px] text-[16px] leading-[1.6] text-ink-mute">
          Journal, analyze, test, and act — without ever leaving Orca.
        </p>
      </div>
      <FeatureCarousel />
    </section>
  )
}
