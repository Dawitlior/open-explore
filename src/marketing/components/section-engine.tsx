import { Check } from 'lucide-react'
import { AssetImage, CTA } from './ui/primitives'

/* ============================================================================
   ENGINE — the follow-up to Integrations: you don't have to connect an API.
   Copy + green-check list on the left, the laptop illustration on the right,
   and the abstract banner sliding in from the side behind it.
   ========================================================================== */

const CHECKS = [
  'Drop any statement — CSV, XLSX or PDF',
  "Auto-detects your broker's format",
  'Every trade parsed, tagged and scored',
  'No API key, no setup — just upload',
]

export function SectionEngine() {
  return (
    <section id="engine" className="relative mx-auto w-full max-w-[1200px] px-6 py-36 md:px-10">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1fr]">
        {/* Copy + checks */}
        <div data-side="left">
          <span className="micro inline-flex rounded-full bg-indigo-soft px-3 py-1 text-indigo">
            Universal Import
          </span>
          <h2 className="mt-5 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.1] font-bold text-ink">
            Don&apos;t want to connect your broker?{' '}
            <span className="text-indigo">No need.</span>
          </h2>
          <p className="mt-5 max-w-[440px] text-[16px] leading-[1.6] text-ink-mute">
            Meet Orca&apos;s powerful import engine — drop your statement files and it reads them all,
            no connection required.
          </p>

          <ul className="mt-7 flex flex-col gap-3.5">
            {CHECKS.map((c) => (
              <li key={c} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-[15px] font-medium text-ink-2">{c}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <CTA href="/features/universal-import">
              Try Universal Import
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </CTA>
          </div>
        </div>

        {/* Laptop illustration */}
        <div data-side="right" className="relative">
          <AssetImage
            src="/search.png"
            alt="Upload any broker statement and Orca reads it"
            className="mx-auto block w-full max-w-[500px]"
            fallback={<div className="h-[320px] w-full" />}
          />
        </div>
      </div>
    </section>
  )
}
