import { SectionHead } from './ui/primitives'

/* ============================================================================
   PROOF — instead of fake pre-launch testimonials, the behavioral mirror: what
   a trader says about their trading vs what the account actually shows.
   Three cards, the delta called out. Honest social proof.
   ========================================================================== */

const MIRROR = [
  { said: 'I always respect my stop', data: 'Stop moved on 31% of losers', delta: '+31%', bad: true },
  { said: 'I trade the London open', data: '68% of P&L lands in the NY AM', delta: '68%', bad: false },
  { said: 'I size consistently', data: 'Risk doubles right after a loss', delta: '2.0×', bad: true },
]

export function SectionProof() {
  return (
    <section id="proof" className="relative mx-auto w-full max-w-[1200px] px-6 py-20 md:px-10">
      <SectionHead
        label="Receipts, not testimonials"
        title="What the data said about my own trading"
        lede="Every trader has a story they tell themselves. Here is the gap Orca found in mine — pulled straight from the account, not a survey."
      />

      <div className="mx-auto mt-14 grid max-w-[1000px] grid-cols-1 gap-5 md:grid-cols-3">
        {MIRROR.map((m) => (
          <div key={m.said} data-reveal className="card flex flex-col gap-5 p-7">
            <span className="micro text-ink-faint">What I said</span>
            <p className="text-[16px] leading-snug text-ink-mute italic">“{m.said}”</p>
            <div className="mt-auto flex items-center justify-between border-t border-line pt-5">
              <div>
                <span className="micro text-ink-faint">The data</span>
                <p className="mt-1.5 text-[14.5px] leading-snug font-semibold text-ink">{m.data}</p>
              </div>
              <span
                className={`tnum shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-bold ${
                  m.bad ? 'bg-rose-soft text-rose' : 'bg-teal-soft text-teal'
                }`}
              >
                {m.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
