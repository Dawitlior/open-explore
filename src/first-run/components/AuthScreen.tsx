import type { AuthScreenProps } from '../first-run.types'
import { COPY } from '../first-run.copy'
import { Brand, ScreenShell, Spinner, StatusBanner, cx } from './ui'

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.9-9.9 6.9-17.4z" />
      <path fill="#FBBC05" d="M10.3 28.3a14.5 14.5 0 0 1 0-8.6l-7.8-6.1a24 24 0 0 0 0 20.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.4 0-11.8-3.8-13.7-9.3l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

export function AuthScreen({ lang, status, errorMessage, offline, onGoogleSignIn, onBack, onOpenLegal }: AuthScreenProps) {
  const t = COPY.auth
  const busy = status === 'loading' || status === 'submitting'
  const showError = status === 'error' || offline

  return (
    <ScreenShell
      lang={lang}
      title={<span className="flex flex-col gap-4"><Brand /><span>{t.title}</span></span>}
      subtitle={t.sub}
      footer={
        <div className="flex items-center justify-between text-[13px] text-ink-mute">
          {onBack ? <button onClick={onBack} className="rounded px-1 py-1 font-medium hover:text-ink">{t.back}</button> : <span />}
          <span className="flex items-center gap-3">
            <button onClick={() => onOpenLegal?.('terms')} className="hover:text-ink hover:underline">{t.terms}</button>
            <button onClick={() => onOpenLegal?.('privacy')} className="hover:text-ink hover:underline">{t.privacy}</button>
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* reserved slot so an error never shifts the button below */}
        <div className="min-h-[0px]" aria-live="assertive">
          {showError && (
            <StatusBanner tone="error" onRetry={onGoogleSignIn} retryLabel={t.retry}>
              {offline ? t.offline : (errorMessage ?? t.error)}
            </StatusBanner>
          )}
        </div>

        <button
          onClick={onGoogleSignIn}
          disabled={busy}
          aria-busy={busy || undefined}
          className={cx(
            'flex min-h-[52px] w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface px-6 text-[15px] font-semibold text-ink transition-all',
            'hover:border-indigo/45 hover:elev-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo/25',
            'disabled:cursor-not-allowed disabled:opacity-70',
          )}
        >
          {busy ? <Spinner className="h-5 w-5 text-indigo" /> : <GoogleG />}
          {busy ? t.connecting : t.google}
        </button>

        <p className="text-center text-[12px] leading-relaxed text-ink-faint">{t.legal}</p>
      </div>
    </ScreenShell>
  )
}
