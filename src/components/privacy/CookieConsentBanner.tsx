/**
 * CookieConsentBanner — floating glass console shown until the user decides.
 * Terminal-grade dark glass, hairline borders, RTL/LTR + scheme aware.
 * Lazy-loaded via requestIdleCallback to protect LCP.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { useLang } from '@/hooks/use-lang';
import { Cookie, X } from 'lucide-react';
import { SURF, JC } from '@/lib/neon-palette';

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

  const mono = "'IBM Plex Mono', ui-monospace, monospace";

  const ghostBtn: React.CSSProperties = {
    padding: '10px 18px', borderRadius: 8,
    background: 'transparent',
    border: `1px solid ${SURF.border}`,
    color: SURF.text2,
    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
    letterSpacing: '0.04em', cursor: 'pointer',
    transition: 'border-color .18s ease, color .18s ease, background .18s ease',
  };

  return (
    <>
      <style>{`
        @keyframes orca-cc-in { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform:none; } }
        .orca-cc-ghost:hover { border-color: ${SURF.borderStrong} !important; color: ${SURF.text1} !important; background: ${SURF.card2} !important; }
        .orca-cc-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .orca-cc-primary { transition: filter .18s ease, transform .12s ease; }
        .orca-cc-x:hover { color: ${SURF.text1} !important; background: ${SURF.card2} !important; }
      `}</style>

      <div
        role="region"
        aria-label={t('הסכמת עוגיות', 'Cookie consent')}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed', insetInline: 0, bottom: 0, zIndex: 100,
          padding: 'clamp(12px, 2vw, 20px)',
          display: 'flex', justifyContent: 'center',
          pointerEvents: 'none',
          fontFamily: "'Poppins', 'Heebo', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            width: '100%', maxWidth: 780,
            background: SURF.panelGradient,
            border: `1px solid ${SURF.border}`,
            borderRadius: 14,
            boxShadow: SURF.shadow,
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            overflow: 'hidden',
            animation: 'orca-cc-in 420ms cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          {/* accent hairline */}
          <div aria-hidden style={{
            position: 'absolute', top: 0, insetInline: 0, height: 1,
            background: `linear-gradient(90deg, transparent, ${JC.blue}, transparent)`,
            opacity: 0.7,
          }} />

          <div style={{ padding: 'clamp(16px, 2.4vw, 22px)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              display: 'grid', placeItems: 'center',
              background: SURF.card2, border: `1px solid ${SURF.border}`,
              color: JC.blue,
            }}>
              <Cookie size={18} aria-hidden="true" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: mono, fontSize: 9.5, letterSpacing: '0.26em',
                textTransform: 'uppercase', color: SURF.text3, marginBottom: 6,
              }}>
                {t('פרטיות', 'Privacy')}
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: SURF.text1, letterSpacing: '-0.01em' }}>
                {t('אנחנו משתמשים בעוגיות', 'We use cookies')}
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: SURF.text2, maxWidth: 560 }}>
                {t(
                  'אנו אוספים נתונים חיוניים להפעלת הפלטפורמה. ניתן לבחור אילו עוגיות נוספות לאפשר. ההסכמה ניתנת לשינוי בכל עת בהגדרות.',
                  'We collect essential data to run the platform. You can choose which additional cookies to allow. Consent can be updated anytime in Settings.'
                )}
              </p>

              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  className="orca-cc-primary"
                  onClick={acceptAll}
                  style={{
                    padding: '10px 22px', borderRadius: 8,
                    background: JC.blue, border: `1px solid ${JC.blue}`,
                    color: JC.onAccent, fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                  }}
                >
                  {t('קבל הכל', 'Accept all')}
                </button>
                <button type="button" className="orca-cc-ghost" onClick={rejectAll} style={ghostBtn}>
                  {t('רק חיוניות', 'Essential only')}
                </button>
                <button type="button" className="orca-cc-ghost" onClick={() => setOpenPrefs(true)} style={ghostBtn}>
                  {t('התאמה אישית', 'Customize')}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="orca-cc-x"
              onClick={rejectAll}
              aria-label={t('סגור', 'Close')}
              style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                background: 'transparent', border: `1px solid ${SURF.border}`,
                color: SURF.text3, cursor: 'pointer',
                display: 'grid', placeItems: 'center',
                transition: 'color .18s ease, background .18s ease',
              }}
            >
              <X size={15} />
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
