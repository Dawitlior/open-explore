import { useEffect } from 'react'
import type { StepProps } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { cx } from '../components/ui'

export function CommitmentStep({ answers, update, onValidityChange }: StepProps) {
  const t = COPY.onboarding.commitment
  const valid = answers.commitmentAccepted
  useEffect(() => { onValidityChange?.(valid) }, [valid, onValidityChange])
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-line bg-canvas-deep/60 p-5">
        <h2 className="font-display text-[17px] font-bold text-ink">{t.title}</h2>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{t.body}</p>
      </div>
      <label className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors', answers.commitmentAccepted ? 'border-indigo bg-indigo-soft' : 'border-line bg-surface hover:border-indigo/40')}>
        <input
          type="checkbox"
          checked={answers.commitmentAccepted}
          onChange={(e) => update({ commitmentAccepted: e.target.checked })}
          className="mt-0.5 h-5 w-5 shrink-0 accent-indigo"
        />
        <span className="text-[14px] font-medium text-ink">{t.checkbox}</span>
      </label>
    </div>
  )
}
