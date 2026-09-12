import { BookText, BarChart3, ShieldCheck, BrainCircuit, Waves, Radar } from 'lucide-react'
import { BrowserFrame, Headline, HoloGlow, Lede, Section, SectionLabel } from './ui/primitives'
import { CalendarPanel } from './platform-ui/panels'

const MODULES = [
  { Icon: BookText, label: 'Trade Journal', desc: 'Trades in, tagged, automatically' },
  { Icon: BarChart3, label: 'Analytics', desc: 'Every stat that moves the needle' },
  { Icon: ShieldCheck, label: 'Risk Management', desc: '4-tier capital protection' },
  { Icon: BrainCircuit, label: 'AI Insights', desc: 'Patterns you would never spot' },
  { Icon: Waves, label: 'Trader Mind', desc: 'The behavioral mirror' },
  { Icon: Radar, label: 'Economic Radar', desc: 'Macro events before they hit' },
]

export function SectionPlatform() {
  return (
    <Section id="features">
      <div className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[0.8fr_1fr]">
        <div>
          <div data-reveal>
            <SectionLabel>The platform</SectionLabel>
          </div>
          <div data-reveal className="mt-5">
            <Headline>One system. Every tool.</Headline>
          </div>
          <div data-reveal>
            <Lede className="mt-4">Everything that makes you a better trader — in one place.</Lede>
          </div>
          <div data-reveal className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {MODULES.map((m) => (
              <div key={m.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface ring-1 ring-line">
                  <m.Icon className="h-[16px] w-[16px] text-indigo" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">{m.label}</h3>
                  <p className="text-[12.5px] leading-snug text-ink-mute">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div data-reveal className="relative">
          <HoloGlow className="!inset-[-8%]" opacity={0.26} blur={56} />
          <BrowserFrame url="/calendar">
            <CalendarPanel />
          </BrowserFrame>
        </div>
      </div>
    </Section>
  )
}
