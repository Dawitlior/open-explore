import { useEffect } from 'react'
import type { StepProps, ColorTheme } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { cx } from '../components/ui'

/* Color-theme picker — same four palettes and technical ids as the product's
   Settings ("platinum" = the Light · Indigo theme). Presentation-only: the
   selection is applied + persisted by the first-run controller (setTheme). */
const PALETTES: { id: ColorTheme; swatch: [string, string, string, string] }[] = [
  { id: 'midnight', swatch: ['#000000', '#0d0d0d', '#00e5ff', '#fafafa'] },
  { id: 'blue', swatch: ['#0B1120', '#1E293B', '#38BDF8', '#E6EEF8'] },
  { id: 'graphite', swatch: ['#0e1013', '#1c2128', '#22c55e', '#ef4444'] },
  { id: 'platinum', swatch: ['#F7F8FC', '#FFFFFF', '#6366F1', '#111827'] },
]

export function PaletteStep({ answers, update, onValidityChange }: StepProps) {
  const t = COPY.onboarding.palette
  const valid = answers.colorTheme !== null
  useEffect(() => { onValidityChange?.(valid) }, [valid, onValidityChange])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Color theme">
        {PALETTES.map(({ id, swatch }) => {
          const selected = answers.colorTheme === id
          return (
            <button
              key={id}
              role="radio"
              aria-checked={selected}
              onClick={() => update({ colorTheme: id })}
              className={cx(
                'relative flex flex-col gap-3 rounded-2xl border p-4 text-start transition-all',
                selected ? 'border-indigo bg-indigo-soft ring-2 ring-indigo/30' : 'border-line bg-surface hover:border-indigo/40',
              )}
            >
              <span className="flex items-start justify-between">
                <span>
                  <span className="block text-[14.5px] font-semibold text-ink">{t[id]}</span>
                  <span className="block text-[12px] text-ink-mute">{t[`${id}Sub` as keyof typeof t]}</span>
                </span>
                {selected && (
                  <svg className="h-5 w-5 shrink-0 text-indigo" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="flex gap-1.5">
                {swatch.map((c, i) => (
                  <span
                    key={i}
                    className="h-9 flex-1 rounded-lg"
                    style={{ background: c, boxShadow: 'inset 0 0 0 1px rgba(15,17,22,0.08)' }}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-[12.5px] leading-relaxed text-ink-faint">{t.hint}</p>
    </div>
  )
}
