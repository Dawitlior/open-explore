import { HoloGlow, SectionHead } from './ui/primitives'

/**
 * Honesty band — four non-personal figures about how Orca stays statistically
 * honest (verdict floor, no cherry-picking, behavioral axes, privacy), set in
 * one card that floats over a faint iridescent wash (Rareblocks stat block).
 * Numbers count up on enter via use-premium-motion (data-count).
 */
const STATS = [
  { count: 45, decimals: 0, prefix: '', suffix: '+', label: 'Trades before a verdict' },
  { count: 0, decimals: 0, prefix: '', suffix: '', label: 'Cherry-picked samples' },
  { count: 8, decimals: 0, prefix: '', suffix: '', label: 'Behavioral axes' },
  { count: 100, decimals: 0, prefix: '', suffix: '%', label: 'Your data, private' },
]

export function SectionOutcomeBand() {
  return (
    <section id="results" className="relative mx-auto w-full max-w-[1200px] px-6 py-20 md:px-10">
      <SectionHead
        label="Statistically honest by design"
        title="Numbers you can actually trust"
        lede="Every figure comes straight from your own account — the full history, never a cherry-picked sample. No verdict under 45 trades."
      />

      <div className="relative mx-auto mt-14 max-w-[960px]">
        <HoloGlow className="!inset-x-[-3%] !inset-y-[-10%]" opacity={0.3} blur={60} />
        <div className="card grid grid-cols-2 gap-y-10 px-6 py-12 md:grid-cols-4 md:px-10">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              data-reveal
              className={`flex flex-col items-center text-center ${
                i > 0 ? 'md:border-l md:border-line' : ''
              }`}
            >
              <span
                className="tnum font-display text-[clamp(2rem,4vw,3rem)] leading-none font-extrabold text-ink"
                data-count={s.count}
                data-decimals={s.decimals}
                data-prefix={s.prefix}
                data-suffix={s.suffix}
              >
                {s.prefix}
                {s.count.toFixed(s.decimals)}
                {s.suffix}
              </span>
              <span className="micro mt-3 text-ink-faint">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
