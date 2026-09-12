import { Target, TrendingUp, ShieldCheck } from 'lucide-react'
import { AssetImage, CTA } from './ui/primitives'

/* ============================================================================
   OUR GOALS — the illustration two-column block. Copy on the left; a product
   illustration / GIF on the right.

   Uses /goals.gif once it exists; until then it shows a clean built fallback
   (soft violet card with the three things Orca is built to fix).
   ========================================================================== */

const GOALS = [
  { Icon: TrendingUp, label: 'Turn scattered trades into a real edge' },
  { Icon: Target, label: 'Replace gut feel with your own numbers' },
  { Icon: ShieldCheck, label: 'Protect capital with disciplined risk' },
]

export function SectionGoals() {
  return (
    <section id="goals" className="relative mx-auto w-full max-w-[1200px] px-6 py-36 md:px-10">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Copy */}
        <div data-side="left">
          <span className="micro inline-flex rounded-full bg-indigo-soft px-3 py-1 text-indigo">
            Our goals
          </span>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.08] font-bold text-ink">
            Built to make you a <span className="text-indigo">consistent, disciplined</span> trader.
          </h2>
          <p className="mt-5 max-w-[460px] text-[16px] leading-[1.6] text-ink-mute">
            Orca is not a signals service. It reads your real history and turns it into feedback —
            the patterns, the leaks, and the fixes — so every month you trade a little more like the
            trader you think you are.
          </p>
          <div className="mt-8">
            <CTA href="/features/trader-mind">
              Read more
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </CTA>
          </div>
        </div>

        {/* Illustration / GIF */}
        <div data-side="right" className="relative">
          <AssetImage
            src="/goals.png"
            alt="Set your trading goals and check them off with Orca"
            className="block w-full"
            fallback={
              <div className="relative overflow-hidden rounded-[24px] border border-line bg-surface p-8 elev-2">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)' }}
                />
                <div className="relative flex flex-col gap-3">
                  {GOALS.map((g) => (
                    <div
                      key={g.label}
                      className="flex items-center gap-4 rounded-2xl border border-line bg-canvas px-5 py-4"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-soft text-indigo">
                        <g.Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="text-[14.5px] font-semibold text-ink">{g.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </div>
      </div>
    </section>
  )
}
