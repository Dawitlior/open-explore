import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { AuthScreen } from './components/AuthScreen'
import { signInWithGoogle } from './wiring'
import type { Lang, UiStatus, LegalKind } from './first-run.types'
import '../marketing/marketing.css'

/* ============================================================================
   AUTH PAGE — public route (/auth, /login, /signup). Wraps the presentation-only
   AuthScreen with the product's real Google OAuth. Once signed in, the browser
   either navigates away (OAuth redirect) or the session lands and we send the
   user to /app, where <FirstRunGate> takes over (legal + onboarding).
   ========================================================================== */

const LANG: Lang = 'en'

export function AuthPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<UiStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  // Already authenticated → straight to the app.
  if (!loading && user) return <Navigate to="/app" replace />

  const onGoogleSignIn = async () => {
    setStatus('loading')
    setErrorMessage(undefined)
    try {
      await signInWithGoogle()
      // If we didn't navigate away (Lovable host sets session in place), go to app.
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : undefined)
    }
  }

  const onOpenLegal = (kind: LegalKind) => navigate(kind === 'terms' ? '/terms' : '/privacy')

  return (
    <div className="orca-marketing">
      <AuthScreen
        lang={LANG}
        status={status}
        errorMessage={errorMessage}
        onGoogleSignIn={() => void onGoogleSignIn()}
        onOpenLegal={onOpenLegal}
      />
    </div>
  )
}

export default AuthPage
