import { useMemo, useRef, useState } from 'react'
import type { OnboardingFlowProps, OnboardingStepId, Answers } from '../first-run.types'
import { EMPTY_ANSWERS } from '../first-run.types'
import { Button, ScreenShell, StatusBanner, cx } from './ui'
import { OnboardingProgress, ONBOARDING_ORDER } from './OnboardingProgress'
import { COPY } from '../first-run.copy'
import { IdentityStep } from '../steps/IdentityStep'
import { CommunityStep } from '../steps/CommunityStep'
import { ExperienceStep } from '../steps/ExperienceStep'
import { PaletteStep } from '../steps/PaletteStep'
import { RiskMatrixStep } from '../steps/RiskMatrixStep'
import { BriefingStep } from '../steps/BriefingStep'
import { CommitmentStep } from '../steps/CommitmentStep'

export function OnboardingFlow({
  lang, status, errorMessage, initialStep, initialAnswers, communityQrSrc, onSaveStep, onComplete, onBackToStart,
}: OnboardingFlowProps) {
  const [answers, setAnswers] = useState<Answers>({ ...EMPTY_ANSWERS, ...initialAnswers })
  const [idx, setIdx] = useState(Math.max(0, initialStep ? ONBOARDING_ORDER.indexOf(initialStep) : 0))
  const [valid, setValid] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const step: OnboardingStepId = ONBOARDING_ORDER[idx]
  const head = COPY.onboarding.heads[step]
  const c = COPY.onboarding.common
  const isLast = idx === ONBOARDING_ORDER.length - 1
  const submitting = status === 'submitting' || status === 'loading'

  const update = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }))

  const stepEl = useMemo(() => {
    const p = { lang, answers, update, onValidityChange: setValid, communityQrSrc }
    switch (step) {
      case 'identity': return <IdentityStep {...p} />
      case 'community': return <CommunityStep {...p} />
      case 'experience': return <ExperienceStep {...p} />
      case 'palette': return <PaletteStep {...p} />
      case 'riskMatrix': return <RiskMatrixStep {...p} />
      case 'briefing': return <BriefingStep {...p} />
      case 'commitment': return <CommitmentStep {...p} />
    }
  }, [step, lang, answers, communityQrSrc])

  const goNext = () => {
    if (!valid || submitting) return
    onSaveStep(step, answers)
    if (isLast) { onComplete(answers); return }
    setIdx((i) => Math.min(i + 1, ONBOARDING_ORDER.length - 1))
    setValid(false)
    requestAnimationFrame(() => headingRef.current?.focus())
  }
  const goBack = () => {
    if (idx === 0) { onBackToStart?.(); return }
    setIdx((i) => Math.max(i - 1, 0))
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  return (
    <ScreenShell
      lang={lang}
      headingRef={headingRef}
      title={head.t}
      subtitle={head.s}
      footer={
        <div className={cx('flex items-center justify-between gap-3')}>
          <Button variant="ghost" onClick={goBack}>{c.back}</Button>
          <Button onClick={goNext} disabled={!valid} loading={submitting}>
            {submitting ? c.saving : isLast ? c.finish : c.next}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <OnboardingProgress lang={lang} current={step} />
        {status === 'error' && <StatusBanner tone="error">{errorMessage ?? c.saveErr}</StatusBanner>}
        <div>{stepEl}</div>
      </div>
    </ScreenShell>
  )
}
