import { AssetImage, CTA, HoloGlow } from './ui/primitives'
import { DashboardPanel } from './platform-ui/panels'

/* ============================================================================
   PRODUCT SHOWCASE — the Managie-style block: headline + copy + two CTAs + a
   three-stat row on the left; the real dashboard, floating and lifted by the
   iridescent glow, on the right.

   The dashboard uses the real screenshot at /dashboard.png once it exists;
   until then it falls back to the in-app DashboardPanel replica.
   ========================================================================== */

const STATS = [
  { count: 45, decimals: 0, prefix: '', suffix: '+', label: 'Trades before a verdict' },
  { count: 0, decimals: 0, prefix: '', suffix: '', label: 'Cherry-picked samples' },
  { count: 100, decimals: 0, prefix: '', suffix: '%', label: 'Your data, private' },
]

export function SectionShowcase() {
  return (
    <section id="product" className="relative mx-auto w-full max-w-[1200px] px-6 py-36 md:px-10">
      <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[0.68fr_1.32fr]">
        {/* Copy */}
        <div data-side="left">
          <h2
            className="font-display text-[clamp(2rem,4vw,3.1rem)] leading-[1.06] font-bold text-ink"
          >
            Your whole account, <span className="text-indigo">one clear dashboard.</span>
          </h2>
          <p className="mt-5 max-w-[460px] text-[16px] leading-[1.6] text-ink-mute">
            Net R, win rate, expectancy, drawdown, an Orca score for discipline and risk — every
            number that actually moves your edge, live from your own trades.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center [&>a]:w-full [&>a]:justify-center sm:[&>a]:w-auto">
            <CTA href="/signup">Get started</CTA>
            <CTA href="#demo" variant="secondary">
              See demo
            </CTA>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-6 sm:gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span
                  className="tnum font-display text-[clamp(1.25rem,5.4vw,2.1rem)] leading-none font-extrabold text-ink"
                  data-count={s.count}
                  data-decimals={s.decimals}
                  data-prefix={s.prefix}
                  data-suffix={s.suffix}
                >
                  {s.prefix}
                  {s.count.toFixed(s.decimals)}
                  {s.suffix}
                </span>
                <span className="mt-2 text-[13px] leading-snug text-ink-mute">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard in a monitor, with tablet (top) and phone (bottom) floating */}
        <div data-side="right" className="relative">
          <HoloGlow className="!inset-[-6%]" opacity={0.34} blur={72} />

          {/* Monitor */}
          <div className="relative mx-auto w-full max-w-[760px]">
            <div className="overflow-hidden rounded-[18px] border-[8px] border-[#15181f] bg-[#15181f] elev-3">
              <AssetImage
                src="/dashboard.png"
                alt="Orca Investment dashboard — Net R, win rate, Orca score and calendar"
                className="block w-full"
                fallback={
                  <div className="flex justify-center overflow-x-auto bg-[#0f131b] p-4">
                    <DashboardPanel />
                  </div>
                }
              />
            </div>
            {/* stand */}
            <div className="mx-auto h-5 w-20 bg-gradient-to-b from-[#d3d6dd] to-[#b0b4be]" />
            <div className="mx-auto h-2.5 w-52 rounded-b-xl bg-[#a7abb5]" />
          </div>

          {/* Tablet — floating top-right */}
          <img
            src="/tablet.png"
            alt="Orca on tablet"
            className="absolute -top-10 -right-3 z-20 w-[190px] rotate-[-5deg] rounded-xl border border-line elev-3 sm:-right-10 sm:w-[264px]"
          />
          {/* Phone — floating bottom-left */}
          <img
            src="/phone.png"
            alt="Orca on phone"
            className="absolute -bottom-12 -left-3 z-20 w-[118px] rotate-[5deg] rounded-2xl border border-line elev-3 sm:-left-10 sm:w-[164px]"
          />
        </div>
      </div>
    </section>
  )
}
