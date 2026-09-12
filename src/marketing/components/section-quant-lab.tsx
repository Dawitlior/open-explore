import { BrowserFrame, CTA, Headline, HoloGlow, Lede, Section, SectionLabel } from './ui/primitives'
import { QuantChartsPanel } from './platform-ui/panels'

export function SectionQuantLab() {
  return (
    <Section id="quant-lab">
      <div className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <div data-reveal>
            <SectionLabel>Quant Lab</SectionLabel>
          </div>
          <div data-reveal className="mt-5">
            <Headline>Data-driven reports.</Headline>
          </div>
          <div data-reveal>
            <Lede className="mt-4">
              Monte Carlo, box plots, risk-reward frontier and more — the quantitative modules that
              expose your real edge.
            </Lede>
          </div>
          <div data-reveal className="mt-7 flex items-center gap-6">
            <div className="flex flex-col">
              <span
                className="tnum font-display text-[36px] leading-none font-extrabold text-indigo"
                data-count="45"
                data-suffix="+"
              >
                45+
              </span>
              <span className="micro mt-2 text-ink-faint">Trades before a verdict</span>
            </div>
            <span className="text-[13px] leading-relaxed text-ink-mute">
              Every stat is computed on your full history —
              <br />
              <span className="text-ink">no verdict under 45 trades.</span>
            </span>
          </div>
          <div data-reveal className="mt-7">
            <CTA href="#pricing">Start free</CTA>
          </div>
        </div>
        <div data-reveal className="relative">
          <HoloGlow className="!inset-[-8%]" opacity={0.26} blur={56} />
          <BrowserFrame url="/quant-lab">
            <QuantChartsPanel />
          </BrowserFrame>
        </div>
      </div>
    </Section>
  )
}
