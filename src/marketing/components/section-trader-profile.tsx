import { CTA, Headline, Section, SectionLabel } from './ui/primitives'

const STEPS = [
  { n: '01', title: 'Answer', body: '12 behavioural questions. Three minutes, no wrong answers.' },
  { n: '02', title: 'Cross-check', body: 'The engine measures what you said against your real cadence, hesitations and fills.' },
  { n: '03', title: 'Act', body: 'A personal trader profile + three concrete actions for tomorrow morning.' },
]

export function SectionTraderProfile() {
  return (
    <Section id="trader-mind">
      <div className="py-16">
        <div data-reveal className="max-w-[560px]">
          <SectionLabel accent="violet">Trader Mind</SectionLabel>
          <div className="mt-5">
            <Headline>Three minutes in. Three moves out.</Headline>
          </div>
          <p className="mt-4 text-[16.5px] leading-relaxed text-ink-mute">
            A short behavioural test that surfaces the gap between how you think you trade and how
            you actually do — then hands you a profile and three fixes.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface elev-2 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              data-reveal
              key={s.n}
              className={`p-7 ${i < STEPS.length - 1 ? 'border-b border-line md:border-r md:border-b-0' : ''}`}
            >
              <span className="tnum flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-[13px] font-bold text-[#06171b]">
                {s.n}
              </span>
              <h4 className="font-display mt-4 text-[18px] font-semibold text-ink">{s.title}</h4>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-mute">{s.body}</p>
            </div>
          ))}
        </div>

        <div data-reveal className="mt-8">
          <CTA href="#pricing">Discover your trader profile</CTA>
        </div>
      </div>
    </Section>
  )
}
