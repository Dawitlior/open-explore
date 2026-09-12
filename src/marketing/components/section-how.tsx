import { SectionHead, HoloGlow } from './ui/primitives'

/* ============================================================================
   HOW IT WORKS — three numbered steps on soft cards, floating over a faint
   iridescent wash (Rareblocks). Black number chips, tight copy.
   ========================================================================== */

const STEPS = [
  {
    n: 1,
    title: 'Connect your broker',
    desc: 'Read-only API key to Bybit or Binance. Sixty seconds, no funds ever touched.',
  },
  {
    n: 2,
    title: 'We sync every trade',
    desc: 'Your full history imports and gets tagged automatically — no manual logging.',
  },
  {
    n: 3,
    title: 'Get your three fixes',
    desc: 'See the gap between your story and the data, plus concrete moves for tomorrow.',
  },
]

export function SectionHow() {
  return (
    <section id="how" className="relative mx-auto w-full max-w-[1200px] px-6 py-20 md:px-10">
      <SectionHead
        label="How it works"
        title="A clear path from broker to real edge"
        lede="No spreadsheets, no setup marathon. Three steps and your account starts telling you the truth."
      />

      <div className="relative mx-auto mt-14 max-w-[1040px]">
        <HoloGlow className="!inset-x-[-2%] !inset-y-[6%]" opacity={0.22} blur={60} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              data-reveal
              className="card p-7 transition-all duration-500 hover:-translate-y-1 hover:elev-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-char text-[14px] font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-6 font-display text-[19px] font-bold text-ink">{s.title}</h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-mute">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
