/**
 * CookieConsentBanner — bottom banner shown until the user makes a choice.
 * RTL/LTR + theme-aware. Lazy-loaded via requestIdleCallback to protect LCP.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { useLang } from '@/hooks/use-lang';
import { Cookie, X } from 'lucide-react';

const CookiePreferencesModal = lazy(() => import('./CookiePreferencesModal'));

export function CookieConsentBanner() {
  const { hasDecided, loaded, acceptAll, rejectAll } = useCookieConsent();
  const { t, isRTL } = useLang();
  const [openPrefs, setOpenPrefs] = useState(false);
  const [idleReady, setIdleReady] = useState(false);

  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) ric(() => setIdleReady(true), { timeout: 2500 });
    else setTimeout(() => setIdleReady(true), 1500);
  }, []);

  if (!loaded || !idleReady || hasDecided) return null;

  return (
    <>
      <div
        role="region"
        aria-label={t('הסכמת עוגיות', 'Cookie consent')}
        dir={isRTL ? 'rtl' : 'ltr'}
        className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4 animate-in slide-in-from-bottom-4 duration-500"
      >
        <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground mb-1">
                {t('אנחנו משתמשים בעוגיות', 'We use cookies')}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  'אנו אוספים נתונים חיוניים להפעלת הפלטפורמה. ניתן לבחור אילו עוגיות נוספות לאפשר. ההסכמה ניתנת לשינוי בכל עת בהגדרות.',
                  'We collect essential data to run the platform. You can choose which additional cookies to allow. Consent can be updated anytime in Settings.'
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={acceptAll}
                  className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                  {t('קבל הכל', 'Accept all')}
                </button>
                <button
                  type="button"
                  onClick={rejectAll}
                  className="px-4 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-foreground hover:bg-muted transition"
                >
                  {t('רק חיוניות', 'Essential only')}
                </button>
                <button
                  type="button"
                  onClick={() => setOpenPrefs(true)}
                  className="px-4 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition"
                >
                  {t('התאמה אישית', 'Customize')}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={rejectAll}
              aria-label={t('סגור', 'Close')}
              className="shrink-0 p-1.5 rounded-md text-foreground/80 hover:text-foreground hover:bg-muted transition"
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
      {openPrefs && (
        <Suspense fallback={null}>
          <CookiePreferencesModal open={openPrefs} onClose={() => setOpenPrefs(false)} />
        </Suspense>
      )}
    </>
  );
}

export default CookieConsentBanner;
