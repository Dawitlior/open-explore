import { Check } from 'lucide-react'
import { HoloGlow, SectionHead } from './ui/primitives'

/* ============================================================================
   PRICING — Rareblocks dark card: checklist on the left, the price on the
   right, one bright button. Free during launch; a dark plane on the pale page,
   lifted by the iridescent glow behind it.
   ========================================================================== */

const INCLUDED = [
  'Unlimited trades & full history',
  'Auto journal + broker sync',
  'Quant Lab: Monte Carlo, heatmaps',
  '4-tier risk engine',
  'Trader Mind behavioral report',
  'AI insights & economic radar',
]

export function SectionPricing() {
  return (
    <section id="pricing" className="relative mx-auto w-full max-w-[1200px] px-6 py-20 md:px-10">
      <SectionHead
        label="Pricing"
        title="Everything, free while we launch"
        lede="Every module unlocked, no card required. Lock in launch access before paid tiers arrive."
      />

      <div className="relative mx-auto mt-14 max-w-[860px]">
        <HoloGlow className="!inset-x-[-3%] !inset-y-[-8%]" opacity={0.4} blur={64} />
        <div className="overflow-hidden rounded-[24px] bg-char p-8 shadow-[0_30px_80px_-30px_rgba(17,19,24,0.6)] md:p-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            {/* Checklist */}
            <ul className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              {INCLUDED.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-white/85">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-white" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>

            {/* Price + CTA */}
            <div className="flex flex-col items-start gap-5 md:items-end md:text-right">
              <div>
                <span className="tnum font-display text-[56px] leading-none font-extrabold text-white">
                  $0
                </span>
                <span className="ml-1 text-[15px] text-white/55">/ during launch</span>
              </div>
              <a
                href="#hero"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[14.5px] font-semibold text-char transition-transform duration-300 hover:-translate-y-0.5"
              >
                Claim launch access
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
              <span className="text-[12.5px] text-white/45">API read-only · Bybit &amp; Binance</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
