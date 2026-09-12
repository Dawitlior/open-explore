import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Check } from 'lucide-react'
import { HoloGlow } from './ui/primitives'

/* ============================================================================
   AUTH (/login · /signup) — a classic, clean, single-screen auth page in the
   landing palette (cool light, violet accent). Google-only sign-in. UI only —
   the button is a stub; no auth logic is wired yet.
   ========================================================================== */

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isLogin = mode === 'login'
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-canvas">
      {/* soft brand glow */}
      <HoloGlow className="!inset-x-[20%] !top-[-6%] !bottom-auto !h-[340px]" opacity={0.26} blur={100} />

      {/* top bar */}
      <div className="relative mx-auto flex max-w-[1100px] items-center justify-between px-6 py-6 md:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/orca-icon.png" alt="Orca Investment" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">Orca Investment</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-mute transition-colors hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to site
        </Link>
      </div>

      {/* centered card */}
      <div className="relative flex min-h-[calc(100vh-84px)] items-start justify-center px-6 pb-20 pt-6 md:items-center md:pt-0">
        <div className="w-full max-w-[420px]">
          <div className="rounded-3xl border border-line bg-surface p-8 elev-3 md:p-10">
            <div className="text-center">
              <h1 className="font-display text-[clamp(1.6rem,3vw,2rem)] font-bold tracking-[-0.02em] text-ink">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-mute">
                {isLogin ? 'Log in to your Orca trading journal.' : 'Start your free, automated trading journal.'}
              </p>
            </div>

            {/* Google button */}
            <button
              type="button"
              className="group mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-line bg-surface px-6 py-3.5 text-[15px] font-semibold text-ink transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo/40 hover:elev-2"
            >
              <GoogleG />
              {isLogin ? 'Continue with Google' : 'Sign up with Google'}
            </button>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-[12.5px] text-ink-faint">
              <ShieldCheck className="h-3.5 w-3.5 text-teal" strokeWidth={2} />
              No passwords. One-click, secure sign-in.
            </p>

            {/* signup-only reassurance */}
            {!isLogin && (
              <ul className="mt-7 flex flex-col gap-2.5 border-t border-line pt-6">
                {['Free forever plan — no card required', 'Read-only connection, funds never touched', 'Your data, exportable or deletable anytime'].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[13.5px] text-ink-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
                    {b}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-7 text-center text-[11.5px] leading-relaxed text-ink-faint">
              By continuing you agree to Orca’s{' '}
              <Link to="/terms" state={{ from: `/${mode}` }} className="font-medium text-ink-mute underline underline-offset-2 hover:text-indigo">Terms</Link> and{' '}
              <Link to="/privacy" state={{ from: `/${mode}` }} className="font-medium text-ink-mute underline underline-offset-2 hover:text-indigo">Privacy Policy</Link>.
            </p>
          </div>

          {/* switch mode */}
          <p className="mt-6 text-center text-[14px] text-ink-mute">
            {isLogin ? 'New to Orca?' : 'Already have an account?'}{' '}
            <Link to={isLogin ? '/signup' : '/login'} className="font-semibold text-indigo transition-colors hover:text-indigo-deep">
              {isLogin ? 'Create an account' : 'Log in'}
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export function LoginPage() {
  return <AuthPage mode="login" />
}
export function SignupPage() {
  return <AuthPage mode="signup" />
}
