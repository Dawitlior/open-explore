import type { Lang, OnboardingStepId } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { cx } from './ui'

const ORDER: OnboardingStepId[] = ['identity', 'community', 'experience', 'briefing', 'commitment']

export function OnboardingProgress({ current }: { lang: Lang; current: OnboardingStepId }) {
  const idx = ORDER.indexOf(current)
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[12px] font-semibold text-ink-faint">
        <span>{COPY.onboarding.stepOf(idx + 1, ORDER.length)}</span>
        <span className="text-indigo">{COPY.onboarding.labels[current]}</span>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {ORDER.map((s, i) => (
          <span
            key={s}
            className={cx('h-1.5 flex-1 rounded-full transition-colors duration-300', i <= idx ? 'bg-indigo' : 'bg-canvas-deep')}
          />
        ))}
      </div>
    </div>
  )
}

export { ORDER as ONBOARDING_ORDER }
