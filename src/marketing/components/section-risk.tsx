import { BrowserFrame, Headline, HoloGlow, Lede, ScoreRing, Section, SectionLabel } from './ui/primitives'
import { RiskPanel } from './platform-ui/panels'

const TIERS = [
  { label: '-1R', scope: 'Trade' },
  { label: '-2R', scope: 'Daily' },
  { label: '-5R', scope: 'Weekly' },
  { label: '-10R', scope: 'Monthly' },
]

export function SectionRisk() {
  return (
    <Section id="edge-risk">
      <div className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1fr_0.85fr]">
        <div data-reveal className="relative order-2 lg:order-1">
          <HoloGlow className="!inset-[-8%]" opacity={0.26} blur={56} />
          <BrowserFrame url="/risk">
            <RiskPanel />
          </BrowserFrame>
        </div>
        <div className="order-1 lg:order-2">
          <div data-reveal>
            <SectionLabel>Edge &amp; Risk</SectionLabel>
          </div>
          <div data-reveal className="mt-5">
            <Headline>Do you have a profitable edge?</Headline>
          </div>
          <div data-reveal>
            <Lede className="mt-4">
              An ORCA score of discipline, risk consistency and regime adaptation — plus a 4-tier
              engine that stops the damage before it compounds.
            </Lede>
          </div>
          <div data-reveal className="mt-7 flex flex-wrap items-center gap-8">
            <ScoreRing value={86} label="Orca score" accent="indigo" size={96} />
            <div className="grid grid-cols-2 gap-3">
              {TIERS.map((t) => (
                <div key={t.label} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <span className="tnum text-[18px] font-bold text-indigo">{t.label}</span>
                  <span className="micro mt-1 block text-ink-faint">{t.scope}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
