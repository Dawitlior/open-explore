/**
 * CookieConsentBanner — a premium, explanatory consent card that slides into the
 * BOTTOM-LEFT (desktop) while the site stays fully visible — never a top blocker.
 * On mobile it sits above the thumb-zone nav. "Customize" opens the prefs modal
 * via the global 'orca:open-cookie-prefs' event. All persistence/audit lives in
 * use-cookie-consent — presentation only. Global brand color utilities, no scope.
 */
import { useEffect, useState } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';

const CARD_SHADOW = '0 6px 14px rgb(17 19 24 / 0.06), 0 40px 80px -30px rgb(17 19 24 / 0.28)';

export function CookieConsentBanner() {
  const { loaded, hasDecided, acceptAll, rejectAll } = useCookieConsent();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (loaded && !hasDecided) {
      const t = setTimeout(() => setShown(true), 400);
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
      className="fixed z-[9998] left-3 right-3 bottom-[calc(96px+env(safe-area-inset-bottom))] sm:left-6 sm:right-auto sm:bottom-6 sm:w-[440px]"
    >
      <div
        style={{
          transform: shown ? 'translateY(0)' : 'translateY(20px)',
          opacity: shown ? 1 : 0,
          transition: 'transform 460ms cubic-bezier(0.22,1,0.36,1), opacity 460ms ease-out',
          boxShadow: CARD_SHADOW,
        }}
        className="rounded-2xl border border-line bg-surface p-5 backdrop-blur sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-soft text-indigo" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="9" cy="12" r="1.1" fill="currentColor" /><circle cx="14" cy="15" r="1.1" fill="currentColor" /><circle cx="15" cy="10" r="1.1" fill="currentColor" />
            </svg>
          </span>
          <h2 className="text-[16px] font-bold text-ink">Your privacy, your call</h2>
        </div>

        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-mute">
          Orca uses cookies to keep you signed in, remember your preferences, and understand how the
          site is used so we can make it better. <span className="font-semibold text-ink-2">Essential cookies are always on</span> —
          everything else is your choice, and we never sell your data.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => void acceptAll()}
            className="flex min-h-[46px] items-center justify-center rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] px-4 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.6)] transition-transform hover:-translate-y-0.5"
          >
            Accept all
          </button>
          <div className="flex gap-2 [&>button]:min-h-[44px] [&>button]:flex-1">
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
          </div>
        </div>

        <a href="/privacy" className="mt-3 block text-[12px] font-semibold text-indigo underline underline-offset-2">
          Read our Privacy Policy
        </a>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
