import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSettings, type ThemeId } from '@/hooks/use-settings'
import { useUserPreferences } from '@/hooks/use-user-preferences'
import { scopedStorage } from '@/lib/scoped-storage'
import { LegalStep } from './components/LegalStep'
import { OnboardingFlow } from './components/OnboardingFlow'
import { ORCA_LEGAL } from './first-run.legal'
import type { Answers, Lang, UiStatus } from './first-run.types'
import { readLegalStatus, acceptLegal, isOnboardingDone, persistOnboardingLocal } from './wiring'
import '../marketing/marketing.css'

/* ============================================================================
   FIRST-RUN GATE — global post-auth overlay that replaces the product's old
   LegalGate + OnboardingWizard + RiskOnboardingWizard. Once a user is signed in
   it blocks the app until Terms + Privacy are signed and onboarding is complete,
   writing to the exact same backend the old flow used. Rendered in App, after
   AuthProvider. Renders nothing when signed-out or already onboarded.
   Flow is English-only (platform switches language inside the product later).
   ========================================================================== */

const LANG: Lang = 'en'
const COMMUNITY_QR_SRC = '/orca-community-qr.png'

type Stage = 'checking' | 'terms' | 'privacy' | 'onboarding' | 'done'

export function FirstRunGate() {
  const { user, loading } = useAuth()
  const { setTheme } = useSettings()
  const { update } = useUserPreferences()
  const [stage, setStage] = useState<Stage>('checking')
  const [status, setStatus] = useState<UiStatus>('idle')

  // Resolve the initial stage from legal status + onboarding flag.
  useEffect(() => {
    let alive = true
    if (loading) return
    if (!user?.id) { setStage('checking'); return }
    ;(async () => {
      const legal = await readLegalStatus(user.id)
      if (!alive) return
      if (!legal.terms) setStage('terms')
      else if (!legal.privacy) setStage('privacy')
      else if (!isOnboardingDone()) setStage('onboarding')
      else setStage('done')
    })()
    return () => { alive = false }
  }, [user?.id, loading])

  if (loading || !user?.id || stage === 'checking' || stage === 'done') return null

  const acceptCurrentLegal = async (kind: 'terms' | 'privacy') => {
    setStatus('submitting')
    try {
      await acceptLegal(user.id, kind, ORCA_LEGAL[kind].versionLabel)
      setStatus('idle')
      if (kind === 'terms') setStage('privacy')
      else setStage(isOnboardingDone() ? 'done' : 'onboarding')
    } catch {
      setStatus('error')
    }
  }

  const completeOnboarding = async (answers: Answers) => {
    setStatus('submitting')
    try {
      if (answers.colorTheme) setTheme(answers.colorTheme as ThemeId)
      await update({
        ...(answers.colorTheme ? { theme: answers.colorTheme } : {}),
        ...(answers.risk.perTrade != null ? { risk_per_trade_default: answers.risk.perTrade } : {}),
        ...(answers.risk.daily != null ? { daily_risk_limit: answers.risk.daily } : {}),
        ...(answers.risk.weekly != null ? { weekly_risk_limit: answers.risk.weekly } : {}),
        ...(answers.risk.monthly != null ? { monthly_risk_limit: answers.risk.monthly } : {}),
      })
      persistOnboardingLocal(answers)
      try { void scopedStorage.setItem('orca-risk-onboarding-done', '1') } catch { /* noop */ }
      setStatus('idle')
      setStage('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="orca-marketing" style={{ position: 'fixed', inset: 0, zIndex: 100000, overflowY: 'auto' }}>
      {(stage === 'terms' || stage === 'privacy') && (
        <LegalStep
          lang={LANG}
          kind={stage}
          title={ORCA_LEGAL[stage].title}
          versionLabel={ORCA_LEGAL[stage].versionLabel}
          progressLabel={stage === 'terms' ? '1 / 2' : '2 / 2'}
          sections={ORCA_LEGAL[stage].sections}
          status={status}
          onAccept={() => void acceptCurrentLegal(stage)}
        />
      )}
      {stage === 'onboarding' && (
        <OnboardingFlow
          lang={LANG}
          status={status}
          communityQrSrc={COMMUNITY_QR_SRC}
          onSaveStep={() => { /* per-step persistence happens at completion */ }}
          onComplete={(a) => void completeOnboarding(a)}
        />
      )}
    </div>
  )
}

export default FirstRunGate
