/**
 * CookieConsentBanner — premium consent dock.
 *
 * Desktop: a floating, centered glass dock with an aurora edge, mono kicker
 * and a light sheen sweep. Mobile: an elevated bottom sheet with a grabber
 * and full-width stacked actions (thumb-reachable).
 *
 * Lazy-mounted via requestIdleCallback to protect LCP.
 */
import { useEffect, useState, lazy, Suspense } from 'react';
import { useCookieConsent } from '@/hooks/use-cookie-consent';
import { useLang } from '@/hooks/use-lang';
import { Cookie, X, ShieldCheck } from 'lucide-react';
import { SURF, JC } from '@/lib/neon-palette';

const CookiePreferencesModal = lazy(() => import('./CookiePreferencesModal'));

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export function CookieConsentBanner() {
  const { hasDecided, loaded, acceptAll, rejectAll } = useCookieConsent();
  const { t, isRTL } = useLang();
  const [openPrefs, setOpenPrefs] = useState(false);
  const [idleReady, setIdleReady] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) ric(() => setIdleReady(true), { timeout: 2500 });
    else setTimeout(() => setIdleReady(true), 1500);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!loaded || !idleReady || hasDecided) return null;

  const ghostBtn: React.CSSProperties = {
    padding: isMobile ? '13px 18px' : '11px 18px',
    borderRadius: 12,
    background: SURF.card,
    border: `1px solid ${SURF.border}`,
    color: SURF.text2,
    fontFamily: 'inherit',
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    flex: isMobile ? 1 : undefined,
    transition: 'border-color .2s ease, color .2s ease, background .2s ease, transform .12s ease',
  };

  return (
    <>
      <style>{`
        @keyframes orca-cc-in {
          from { opacity: 0; transform: translateY(26px) scale(.985); filter: blur(6px); }
          to   { opacity: 1; transform: none; filter: none; }
        }
        @keyframes orca-cc-sheen {
          0%   { transform: translateX(-140%); }
          100% { transform: translateX(140%); }
        }
        @keyframes orca-cc-halo {
          0%, 100% { opacity: .45; }
          50%      { opacity: .9; }
        }
        .orca-cc-ghost:hover {
          border-color: ${SURF.borderStrong} !important;
          color: ${SURF.text1} !important;
          background: ${SURF.card2} !important;
          transform: translateY(-1px);
        }
        .orca-cc-primary {
          transition: box-shadow .22s ease, transform .12s ease, filter .2s ease;
        }
        .orca-cc-primary:hover { transform: translateY(-1px); filter: saturate(1.06) brightness(1.04); }
        .orca-cc-x:hover { color: ${SURF.text1} !important; background: ${SURF.card2} !important; }
        @media (prefers-reduced-motion: reduce) {
          .orca-cc-shell { animation: none !important; }
          .orca-cc-sheen { display: none !important; }
        }
      `}</style>

      <div
        role="region"
        aria-label={t('הסכמת עוגיות', 'Cookie consent')}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 100,
          padding: isMobile ? 0 : 'clamp(14px, 2vw, 26px)',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          fontFamily: "'Poppins', 'Heebo', system-ui, sans-serif",
        }}
      >
        <div
          className="orca-cc-shell"
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            width: '100%',
            maxWidth: isMobile ? '100%' : 720,
            background: SURF.panelGradient,
            border: `1px solid ${SURF.border}`,
            borderRadius: isMobile ? '22px 22px 0 0' : 20,
            boxShadow: isMobile
              ? '0 -18px 60px rgba(0,0,0,0.42)'
              : `${SURF.shadow}, 0 0 0 1px rgba(255,255,255,0.02) inset`,
            backdropFilter: 'blur(26px) saturate(1.2)',
            WebkitBackdropFilter: 'blur(26px) saturate(1.2)',
            overflow: 'hidden',
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined,
            animation: 'orca-cc-in 520ms cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          {/* aurora edge */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              insetInline: 0,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${JC.blue}, ${JC.purple}, ${JC.blue}, transparent)`,
              animation: 'orca-cc-halo 4.5s ease-in-out infinite',
            }}
          />
          {/* sheen sweep */}
          <div
            aria-hidden
            className="orca-cc-sheen"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)',
              animation: 'orca-cc-sheen 5.5s ease-in-out 1.2s infinite',
            }}
          />

          {isMobile && (
            <div
              aria-hidden
              style={{
                width: 38,
                height: 4,
                borderRadius: 999,
                background: SURF.borderStrong,
                margin: '10px auto 0',
              }}
            />
          )}

          <div
            style={{
              position: 'relative',
              padding: isMobile ? '16px 18px 18px' : 'clamp(20px, 2.4vw, 26px)',
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
            }}
          >
            {!isMobile && (
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  background: `linear-gradient(150deg, ${JC.blue}22, transparent 70%), ${SURF.card2}`,
                  border: `1px solid ${SURF.borderStrong}`,
                  color: JC.blue,
                  boxShadow: `0 0 26px -10px ${JC.blue}`,
                }}
              >
                <Cookie size={20} aria-hidden="true" />
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: MONO,
                  fontSize: 9.5,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: SURF.text3,
                  marginBottom: 8,
                }}
              >
                <ShieldCheck size={11} aria-hidden="true" style={{ color: JC.green }} />
                {t('פרטיות', 'Privacy')}
              </div>

              <h2
                style={{
                  margin: '0 0 7px',
                  fontSize: isMobile ? 17 : 18.5,
                  fontWeight: 700,
                  color: SURF.text1,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                }}
              >
                {t('אנחנו מכבדים את הפרטיות שלך', 'We respect your privacy')}
              </h2>

              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: SURF.text2,
                  maxWidth: 540,
                }}
              >
                {t(
                  'עוגיות חיוניות מפעילות את הפלטפורמה. כל השאר — בשליטה מלאה שלך, וניתן לשנות בכל רגע בהגדרות.',
                  'Essential cookies keep the platform running. Everything else is fully under your control and can be changed anytime in Settings.',
                )}
              </p>

              <div
                style={{
                  marginTop: 18,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  flexDirection: isMobile ? 'column' : 'row',
                }}
              >
                <button
                  type="button"
                  className="orca-cc-primary"
                  onClick={acceptAll}
                  style={{
                    padding: isMobile ? '14px 22px' : '12px 26px',
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${JC.blue}, ${JC.purpleDeep})`,
                    border: 'none',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    cursor: 'pointer',
                    width: isMobile ? '100%' : undefined,
                    boxShadow: `0 12px 30px -12px ${JC.blue}, 0 1px 0 rgba(255,255,255,0.18) inset`,
                  }}
                >
                  {t('אשר הכל', 'Accept all')}
                </button>

                <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : undefined }}>
                  <button type="button" className="orca-cc-ghost" onClick={rejectAll} style={ghostBtn}>
                    {t('רק חיוניות', 'Essential only')}
                  </button>
                  <button
                    type="button"
                    className="orca-cc-ghost"
                    onClick={() => setOpenPrefs(true)}
                    style={ghostBtn}
                  >
                    {t('התאמה אישית', 'Customize')}
                  </button>
                </div>
              </div>
            </div>

            {!isMobile && (
              <button
                type="button"
                className="orca-cc-x"
                onClick={rejectAll}
                aria-label={t('סגור', 'Close')}
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: 'transparent',
                  border: `1px solid ${SURF.border}`,
                  color: SURF.text3,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'color .18s ease, background .18s ease',
                }}
              >
                <X size={15} />
              </button>
            )}
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
