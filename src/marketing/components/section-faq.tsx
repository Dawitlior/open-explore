import { Plus } from 'lucide-react'
import { SectionHead } from './ui/primitives'

/* ============================================================================
   FAQ — native <details> accordion, styled as soft cards. No JS state; the
   marker rotates via the [open] pseudo-class.
   ========================================================================== */

const FAQS = [
  {
    q: 'Is my money safe? What can Orca actually access?',
    a: 'Orca connects with a read-only API key. It can see your trade history — never move, withdraw, or trade your funds. You can revoke the key from your exchange at any time.',
  },
  {
    q: 'Which exchanges are supported?',
    a: 'Bybit and Binance today, with more exchanges on the way. Connect once and your full history imports automatically.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes — every module is unlocked and free during launch, no card required. Paid tiers will come later; launch users keep their access.',
  },
  {
    q: 'Do I have to log trades manually?',
    a: 'No. Trades sync from your broker and get tagged automatically. You add context (screenshots, notes) only if you want to.',
  },
  {
    q: 'How many trades before the insights mean anything?',
    a: 'Orca shows no verdict under 45 trades — statistics need a sample. The more history you connect, the sharper every report gets.',
  },
  {
    q: 'Can I export my data?',
    a: 'Always. Your trades and reports are yours — export them whenever you like.',
  },
]

export function SectionFaq() {
  return (
    <section id="faq" className="relative mx-auto w-full max-w-[1200px] px-6 py-36 md:px-10">
      <SectionHead label="FAQ" title="Frequently asked questions" />

      <div className="mx-auto mt-12 flex max-w-[760px] flex-col gap-3">
        {FAQS.map((f) => (
          <details
            key={f.q}
            data-reveal
            className="group card overflow-hidden px-6 py-1 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-semibold text-ink">
              {f.q}
              <Plus className="h-5 w-5 shrink-0 text-ink-mute transition-transform duration-300 group-open:rotate-45" strokeWidth={2} />
            </summary>
            <p className="pb-5 text-[14.5px] leading-relaxed text-ink-mute">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
