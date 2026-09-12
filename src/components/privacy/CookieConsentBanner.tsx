/**
 * CookieConsentBanner — brand-styled GDPR/CCPA consent bar. Shows once, at the
 * bottom, until the visitor decides. "Customize" opens the preferences modal via
 * the global 'orca:open-cookie-prefs' event (handled by CookieConsentRoot).
 * All persistence/audit lives in use-cookie-consent — this is presentation only.
 * Wrapped in .orca-marketing so it uses the brand design on any background.
 */
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import '../../marketing/marketing.css';

export function CookieConsentBanner() {
  const { loaded, hasDecided, acceptAll, rejectAll } = useCookieConsent();

  if (!loaded || hasDecided) return null;

  const openPrefs = () => window.dispatchEvent(new Event('orca:open-cookie-prefs'));

  return (
    <div
      className="orca-marketing"
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9998 }}
    >
      <div className="mx-auto mb-3 flex max-w-[720px] flex-col gap-4 rounded-2xl border border-line bg-surface/95 p-5 elev-3 backdrop-blur md:flex-row md:items-center md:gap-5"
        style={{ marginInline: '12px' }}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-soft text-indigo" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="9" cy="12" r="1.1" fill="currentColor" /><circle cx="14" cy="15" r="1.1" fill="currentColor" /><circle cx="15" cy="10" r="1.1" fill="currentColor" />
            </svg>
          </span>
          <p className="text-[13.5px] leading-relaxed text-ink-mute">
            We use cookies to keep Orca running, remember your preferences, and understand usage.
            Essential cookies are always on.{' '}
            <a href="/privacy" className="font-semibold text-indigo underline underline-offset-2">Privacy Policy</a>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:shrink-0 [&>button]:min-h-[44px]">
          <button
            onClick={openPrefs}
            className="rounded-xl border border-line bg-surface px-4 text-[13.5px] font-semibold text-ink transition-colors hover:border-indigo/45"
          >
            Customize
          </button>
          <button
            onClick={() => void rejectAll()}
            className="rounded-xl border border-line bg-surface px-4 text-[13.5px] font-semibold text-ink-mute transition-colors hover:text-ink"
          >
            Reject all
          </button>
          <button
            onClick={() => void acceptAll()}
            className="rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
