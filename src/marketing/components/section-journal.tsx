import { Badge, BrowserFrame, CTA, Headline, HoloGlow, Lede, Section } from './ui/primitives'
import { TradeTablePanel } from './platform-ui/panels'

const BULLETS = [
  'Sync once from Bybit or Binance — trades flow in tagged.',
  'Morning & evening journaling, auto-attached to the day.',
  'Chart screenshots and a full searchable archive.',
]

export function SectionJournal() {
  return (
    <Section id="journal">
      <div className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1fr_0.85fr]">
        {/* screen on the left this time — alternate the rhythm */}
        <div data-reveal className="relative order-2 lg:order-1">
          <HoloGlow className="!inset-[-8%]" opacity={0.26} blur={56} />
          <BrowserFrame url="/journal">
            <TradeTablePanel />
          </BrowserFrame>
        </div>
        <div className="order-1 lg:order-2">
          <div data-reveal>
            <Badge accent="indigo">Trade Journal</Badge>
          </div>
          <div data-reveal className="mt-5">
            <Headline>Every trade, logged automatically.</Headline>
          </div>
          <div data-reveal>
            <Lede className="mt-4">
              Connect your broker once. No more manual logging — trades arrive tagged and ready to
              analyze.
            </Lede>
          </div>
          <ul data-reveal className="mt-6 space-y-3">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[14.5px] text-ink-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo" />
                {b}
              </li>
            ))}
          </ul>
          <div data-reveal className="mt-7">
            <CTA href="#pricing">Start free</CTA>
          </div>
        </div>
      </div>
    </Section>
  )
}
