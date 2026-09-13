/**
 * CookieConsentBanner — a compact brand card that slides into the BOTTOM-LEFT
 * (desktop) while the site stays fully visible — never a blocking top bar. On
 * mobile it sits just above the thumb-zone nav. "Customize" opens the prefs
 * modal via the global 'orca:open-cookie-prefs' event. All persistence/audit
 * lives in use-cookie-consent — presentation only. Uses global brand color
 * utilities (from the Tailwind config), so no page-scoping ground is needed.
 */
import { useEffect, useState } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';

const CARD_SHADOW = '0 4px 10px rgb(17 19 24 / 0.06), 0 30px 64px -26px rgb(17 19 24 / 0.22)';

export function CookieConsentBanner() {
  const { loaded, hasDecided, acceptAll, rejectAll } = useCookieConsent();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (loaded && !hasDecided) {
      const t = setTimeout(() => setShown(true), 350);
      return () => clearTimeout(t);
    }
    setShown(false);
  }, [loaded, hasDecided]);

  if (!loaded || hasDecided) return null;

  const openPrefs = () => window.dispatchEvent(new Event('orca:open-cookie-prefs'));

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed z-[9998] left-3 right-3 bottom-[calc(96px+env(safe-area-inset-bottom))] sm:left-5 sm:right-auto sm:bottom-5 sm:w-[380px]"
    >
      <div
        style={{
          transform: shown ? 'translateY(0)' : 'translateY(18px)',
          opacity: shown ? 1 : 0,
          transition: 'transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 420ms ease-out',
          boxShadow: CARD_SHADOW,
        }}
        className="rounded-2xl border border-line bg-surface/95 p-4 backdrop-blur"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-soft text-indigo" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="9" cy="12" r="1.1" fill="currentColor" /><circle cx="14" cy="15" r="1.1" fill="currentColor" /><circle cx="15" cy="10" r="1.1" fill="currentColor" />
            </svg>
          </span>
          <p className="text-[13px] leading-relaxed text-ink-mute">
            We use cookies to run Orca and remember your preferences.{' '}
            <a href="/privacy" className="font-semibold text-indigo underline underline-offset-2">Privacy</a>
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2 [&>button]:min-h-[40px]">
          <button
            onClick={() => void acceptAll()}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5"
          >
            Accept all
          </button>
          <button
            onClick={openPrefs}
            className="rounded-xl border border-line bg-surface px-4 text-[13px] font-semibold text-ink transition-colors hover:border-indigo/45"
          >
            Customize
          </button>
          <button
            onClick={() => void rejectAll()}
            className="rounded-xl px-3 text-[13px] font-semibold text-ink-mute transition-colors hover:text-ink"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
