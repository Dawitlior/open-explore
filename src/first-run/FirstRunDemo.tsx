import { useState } from 'react'
import type { Lang, UiStatus, Answers } from './first-run.types'
import { AuthScreen } from './components/AuthScreen'
import { LegalStep } from './components/LegalStep'
import { OnboardingFlow } from './components/OnboardingFlow'
import { CompletionScreen } from './components/CompletionScreen'
import { ORCA_LEGAL } from './first-run.legal'
import { cx } from './components/ui'

/* Real community QR (delivered asset, served from /public). */
const COMMUNITY_QR_SRC = '/orca-community-qr.png'

/* ============================================================================
   FirstRunDemo — DEMO ONLY. Plays the real flow naturally (each screen's own
   CTA advances to the next), with in-memory state and mock callbacks. No auth,
   cloud, routing, storage or network. Not shipped — Lovable wires the real
   screens after handoff.

   The tiny gear button (bottom corner) opens optional QA controls to jump to a
   screen or force a status/offline state. It is collapsed by default and is NOT
   part of the product UI.
   ========================================================================== */

type Screen = 'auth' | 'terms' | 'privacy' | 'onboarding' | 'completion'
const SCREENS: Screen[] = ['auth', 'terms', 'privacy', 'onboarding', 'completion']
const STATUSES: UiStatus[] = ['idle', 'loading', 'error', 'success']

export function FirstRunDemo() {
  const [screen, setScreen] = useState<Screen>('auth')
  const lang = 'en' as Lang // first-run ships English-only; language switching lives inside the platform
  const [status, setStatus] = useState<UiStatus>('idle')
  const [offline, setOffline] = useState(false)
  const [answers, setAnswers] = useState<Answers | null>(null)
  const [devOpen, setDevOpen] = useState(false)

  const childStatus: UiStatus = status === 'loading' ? 'submitting' : status

  return (
    <>
      {screen === 'auth' && (
        <AuthScreen
          lang={lang} status={status} offline={offline}
          onGoogleSignIn={() => { setStatus('idle'); setOffline(false); setScreen('terms') }}
          onOpenLegal={(k) => setScreen(k)}
        />
      )}
      {(screen === 'terms' || screen === 'privacy') && (
        <LegalStep
          lang={lang} kind={screen} title={ORCA_LEGAL[screen].title}
          versionLabel={ORCA_LEGAL[screen].versionLabel}
          progressLabel={screen === 'terms' ? '1 / 2' : '2 / 2'}
          sections={ORCA_LEGAL[screen].sections}
          status={childStatus}
          onAccept={() => setScreen(screen === 'terms' ? 'privacy' : 'onboarding')}
          onBack={() => setScreen(screen === 'terms' ? 'auth' : 'terms')}
        />
      )}
      {screen === 'onboarding' && (
        <OnboardingFlow
          lang={lang} status={childStatus}
          communityQrSrc={COMMUNITY_QR_SRC}
          onSaveStep={() => { /* demo: no-op */ }}
          onComplete={(a) => { setAnswers(a); setScreen('completion') }}
          onBackToStart={() => setScreen('privacy')}
        />
      )}
      {screen === 'completion' && (
        <CompletionScreen lang={lang} fullName={answers?.fullName || undefined} onEnterApp={() => setScreen('auth')} />
      )}

      {/* ── QA preview controls (collapsed; not product UI) ─────────────── */}
      <div dir="ltr" className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {devOpen && (
          <div className="flex max-w-[280px] flex-col gap-2 rounded-2xl border border-line bg-surface/95 p-3 text-[12px] elev-3 backdrop-blur">
            <span className="px-1 text-[10px] font-bold tracking-widest text-ink-faint uppercase">Preview only · not shipped</span>
            <div className="flex flex-wrap gap-1">
              {SCREENS.map((s) => (
                <button key={s} onClick={() => setScreen(s)} className={cx('rounded-full px-2.5 py-1 font-medium capitalize', screen === s ? 'bg-ink text-white' : 'text-ink-mute hover:bg-canvas-deep')}>{s}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => { setStatus(s); setOffline(false) }} className={cx('rounded-full px-2.5 py-1 font-medium', status === s && !offline ? 'bg-indigo text-white' : 'text-ink-mute hover:bg-canvas-deep')}>{s}</button>
              ))}
              <button onClick={() => { setOffline((v) => !v); setStatus('idle') }} className={cx('rounded-full px-2.5 py-1 font-medium', offline ? 'bg-indigo text-white' : 'text-ink-mute hover:bg-canvas-deep')}>offline</button>
            </div>
          </div>
        )}
        <button
          onClick={() => setDevOpen((v) => !v)}
          aria-label="Preview controls"
          title="Preview controls (QA only)"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface/90 text-ink-faint elev-2 backdrop-blur transition-colors hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  )
}
