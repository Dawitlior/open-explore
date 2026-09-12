import { CTA, HoloGlow } from './ui/primitives'

/* Final CTA — the closing band. Centered, lifted by the iridescent glow. */
export function SectionCta() {
  return (
    <section id="cta" className="relative mx-auto w-full max-w-[1200px] px-6 py-36 md:px-10">
      <div className="relative mx-auto max-w-[820px] text-center">
        <HoloGlow className="!inset-x-[-6%] !inset-y-[-20%]" opacity={0.42} blur={72} />
        <span data-reveal className="micro text-ink-faint">Built from a trader, to a trader</span>
        <h3
          data-animate="title"
          className="font-display mx-auto mt-5 max-w-[720px] text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05] font-bold text-ink"
        >
          See the gap between your story and your data — for free.
        </h3>
        <p data-reveal className="mx-auto mt-5 max-w-[500px] text-[16px] leading-relaxed text-ink-mute">
          Connect your broker once and start free — Orca does the rest. Every trade, every stat, one better
          decision tomorrow. Free to start, no credit card, ever.
        </p>
        <div data-reveal className="mx-auto mt-9 flex max-w-[380px] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
          <CTA href="/signup" className="w-full justify-center sm:w-auto">Start free</CTA>
          <CTA href="#faq" variant="secondary" className="w-full justify-center sm:w-auto">
            Read the FAQ
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </CTA>
        </div>
      </div>
    </section>
  )
}
