import { useEffect } from 'react'
import type { StepProps, ExperienceLevel } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { cx } from '../components/ui'

const LEVELS: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced']

export function ExperienceStep({ answers, update, onValidityChange }: StepProps) {
  const t = COPY.onboarding.experience
  const valid = answers.experienceLevel !== null
  useEffect(() => { onValidityChange?.(valid) }, [valid, onValidityChange])

  return (
    <div className="flex flex-col gap-3" role="radiogroup">
      {LEVELS.map((lvl) => {
        const selected = answers.experienceLevel === lvl
        return (
          <button
            key={lvl}
            role="radio"
            aria-checked={selected}
            onClick={() => update({ experienceLevel: lvl })}
            className={cx(
              'flex min-h-[64px] items-center gap-3 rounded-xl border p-4 text-start transition-all',
              selected ? 'border-indigo bg-indigo-soft' : 'border-line bg-surface hover:border-indigo/40',
            )}
          >
            <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-indigo bg-indigo' : 'border-line')}>
              {selected && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            <span>
              <span className="block text-[14.5px] font-semibold text-ink">{t[lvl]}</span>
              <span className="block text-[12.5px] text-ink-mute">{t[`${lvl}Sub` as keyof typeof t]}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
