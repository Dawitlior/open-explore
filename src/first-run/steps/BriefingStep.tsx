import { useEffect } from 'react'
import type { StepProps } from '../first-run.types'
import { COPY } from '../first-run.copy'

export function BriefingStep({ answers, onValidityChange }: StepProps) {
  useEffect(() => { onValidityChange?.(true) }, [onValidityChange])
  const level = answers.experienceLevel ?? 'beginner'
  const b = COPY.onboarding.briefing[level]
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-line bg-canvas-deep/60 p-5">
        <h2 className="font-display text-[18px] font-bold text-ink">{b.title}</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {b.points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
