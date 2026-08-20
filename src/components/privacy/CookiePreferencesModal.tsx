/**
 * CookiePreferencesModal — granular category control.
 * Categories: Essential (locked on), Analytics, Functional, Marketing.
 *
 * Premium consent console: aurora edge, glass blur, accent rail on enabled
 * categories, and a true mobile bottom sheet with grabber + safe-area padding.
 *
 * Rendered via a high-z portal (z 100060) so it sits above SettingsHub
 * (z 9999) and any other in-app modals.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent, ConsentChoices, DEFAULT_CHOICES } from '@/hooks/use-cookie-consent';
import { useLang } from '@/hooks/use-lang';
import { Shield, BarChart3, Settings2, Megaphone, X, Lock } from 'lucide-react';
import { SURF, JC } from '@/lib/neon-palette';

type Props = { open: boolean; onClose: () => void };

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export default function CookiePreferencesModal({ open, onClose }: Props) {
  const { consent, save } = useCookieConsent();
  const { t, isRTL } = useLang();
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const isMobile = vw < 640;
  const isTablet = vw >= 640 && vw < 1024;
  const [choices, setChoices] = useState<ConsentChoices>(() => ({
    essential: true,
    analytics: consent?.analytics ?? DEFAULT_CHOICES.analytics,
    functional: consent?.functional ?? DEFAULT_CHOICES.functional,
    marketing: consent?.marketing ?? DEFAULT_CHOICES.marketing,
  }));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const cats: Array<{
    id: keyof ConsentChoices; icon: any; locked?: boolean; title: [string, string]; desc: [string, string];
  }> = [
    { id: 'essential', icon: Shield, locked: true,
      title: ['חיוניות', 'Essential'],
      desc: ['נדרשות לפעולת הפלטפורמה: התחברות, אבטחה, שמירת מצב.', 'Required for platform operation: login, security, state persistence.'] },
    { id: 'analytics', icon: BarChart3,
      title: ['אנליטיקה', 'Analytics'],
      desc: ['מדידת ביצועים ושימוש כדי לשפר את הפלטפורמה.', 'Performance and usage measurement to improve the platform.'] },
    { id: 'functional', icon: Settings2,
      title: ['פונקציונליות מורחבת', 'Functional'],
      desc: ['העדפות UI, שפה, ערכת נושא נשמרות בין סשנים.', 'UI preferences, language, and theme persist across sessions.'] },
    { id: 'marketing', icon: Megaphone,
      title: ['שיווק', 'Marketing'],
      desc: ['התאמת תוכן ומודעות (אם וכאשר נשתמש).', 'Content/ad personalization (if/when used).'] },
  ];

  const enabledCount = cats.filter(c => (c.locked ? true : Boolean(choices[c.id]))).length;
  const handleSave = async () => { await save(choices); onClose(); };
  const setAll = (v: boolean) =>
    setChoices({ essential: true, analytics: v, functional: v, marketing: v });

  const ghostBtn: React.CSSProperties = {
    padding: isMobile || isTablet ? '13px 20px' : '11px 20px',
    minHeight: isMobile || isTablet ? 44 : undefined,
    borderRadius: 12,
    background: SURF.card,
    border: `1px solid ${SURF.border}`,
    color: SURF.text2,
    fontFamily: 'inherit',
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    transition: 'border-color .2s ease, color .2s ease, background .2s ease, transform .12s ease',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('העדפות עוגיות', 'Cookie preferences')}
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100060,
        background: SURF.scrim,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
        animation: 'orca-cp-fade 220ms ease both',
        fontFamily: "'Poppins', 'Heebo', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes orca-cp-fade { from { opacity:0; } to { opacity:1; } }
        @keyframes orca-cp-pop { from { opacity:0; transform: translateY(16px) scale(.985); filter: blur(6px); } to { opacity:1; transform:none; filter:none; } }
        @keyframes orca-cp-sheet { from { opacity:0; transform: translateY(40px); } to { opacity:1; transform:none; } }
        @keyframes orca-cp-halo { 0%,100% { opacity:.45; } 50% { opacity:.9; } }
        .orca-cp-row { transition: border-color .2s ease, background .2s ease, box-shadow .2s ease; }
        .orca-cp-row:hover { border-color: ${SURF.borderStrong}; background: ${SURF.card2}; }
        .orca-cp-ghost:hover { border-color: ${SURF.borderStrong} !important; color: ${SURF.text1} !important; background: ${SURF.card2} !important; transform: translateY(-1px); }
        .orca-cp-primary { transition: box-shadow .22s ease, transform .12s ease, filter .2s ease; }
        .orca-cp-primary:hover { filter: saturate(1.06) brightness(1.05); transform: translateY(-1px); }
        .orca-cp-scroll::-webkit-scrollbar { width: 6px; }
        .orca-cp-scroll::-webkit-scrollbar-thumb { background: ${SURF.border}; border-radius: 999px; }
        @media (prefers-reduced-motion: reduce) {
          .orca-cp-shell { animation: none !important; }
        }
      `}</style>

      <div
        className="orca-cp-shell"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '100%' : 580,
          maxHeight: isMobile ? '92dvh' : '88vh',
          display: 'flex', flexDirection: 'column',
          background: SURF.panelGradient,
          border: `1px solid ${SURF.border}`,
          borderRadius: isMobile ? '22px 22px 0 0' : 20,
          boxShadow: isMobile
            ? '0 -18px 60px rgba(0,0,0,0.45)'
            : `${SURF.shadow}, 0 0 0 1px rgba(255,255,255,0.02) inset`,
          backdropFilter: 'blur(26px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(26px) saturate(1.2)',
          color: SURF.text1,
          overflow: 'hidden',
          paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined,
          animation: isMobile
            ? 'orca-cp-sheet 340ms cubic-bezier(0.22,1,0.36,1) both'
            : 'orca-cp-pop 340ms cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* aurora edge */}
        <div aria-hidden style={{
          position: 'absolute', top: 0, insetInline: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${JC.blue}, ${JC.purple}, ${JC.blue}, transparent)`,
          animation: 'orca-cp-halo 4.5s ease-in-out infinite',
        }} />

        {isMobile && (
          <div aria-hidden style={{
            width: 38, height: 4, borderRadius: 999,
            background: SURF.borderStrong, margin: '10px auto 0', flexShrink: 0,
          }} />
        )}

        {/* Header */}
        <div style={{
          padding: isMobile ? '14px 18px 14px' : '22px 24px 18px',
          borderBottom: `1px solid ${SURF.border}`,
          display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0,
        }}>
          {!isMobile && (
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              display: 'grid', placeItems: 'center',
              background: `linear-gradient(150deg, ${JC.blue}22, transparent 70%), ${SURF.card2}`,
              border: `1px solid ${SURF.borderStrong}`,
              color: JC.blue,
              boxShadow: `0 0 26px -10px ${JC.blue}`,
            }}>
              <Shield size={19} aria-hidden="true" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.26em',
              textTransform: 'uppercase', color: SURF.text3, marginBottom: 6,
            }}>
              {t('בקרת פרטיות', 'Privacy control')}
            </div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 18.5, fontWeight: 700, letterSpacing: '-0.02em', color: SURF.text1 }}>
              {t('העדפות עוגיות', 'Cookie preferences')}
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.6, color: SURF.text2 }}>
              {t('בחר אילו קטגוריות לאפשר. ניתן לשנות בכל עת.', 'Choose which categories to allow. You can change this anytime.')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('סגור', 'Close')}
            className="orca-cp-ghost"
            style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: 'transparent', border: `1px solid ${SURF.border}`,
              color: SURF.text3, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Quick actions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, padding: isMobile ? '10px 18px' : '10px 24px',
          borderBottom: `1px solid ${SURF.border}`,
          background: SURF.card2, flexShrink: 0,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: SURF.text3, textTransform: 'uppercase' }}>
            {enabledCount}/{cats.length} {t('פעילות', 'enabled')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setAll(false)} className="orca-cp-ghost"
              style={{ ...ghostBtn, padding: '6px 12px', fontSize: 11, borderRadius: 999 }}>
              {t('בטל הכל', 'Disable all')}
            </button>
            <button type="button" onClick={() => setAll(true)} className="orca-cp-ghost"
              style={{ ...ghostBtn, padding: '6px 12px', fontSize: 11, borderRadius: 999 }}>
              {t('אפשר הכל', 'Enable all')}
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="orca-cp-scroll" style={{
          flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          padding: isMobile ? 14 : 16,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {cats.map(c => {
            const Icon = c.icon;
            const on = c.locked ? true : Boolean(choices[c.id]);
            const active = on && !c.locked;
            return (
              <div key={c.id} className="orca-cp-row" style={{
                position: 'relative',
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: 14, paddingInlineStart: 18,
                borderRadius: 14,
                border: `1px solid ${active ? SURF.borderStrong : SURF.border}`,
                background: SURF.card,
                overflow: 'hidden',
                boxShadow: active ? `0 10px 26px -20px ${JC.blue}` : 'none',
              }}>
                {/* accent rail */}
                <div aria-hidden style={{
                  position: 'absolute', insetBlock: 0, insetInlineStart: 0, width: 3,
                  background: active
                    ? `linear-gradient(180deg, ${JC.blue}, ${JC.purple})`
                    : 'transparent',
                  transition: 'background .2s ease',
                }} />
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  background: SURF.card2, border: `1px solid ${SURF.border}`,
                  color: on ? JC.blue : SURF.text3,
                }}>
                  <Icon size={16} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <h3 style={{
                      margin: 0, fontSize: 13.5, fontWeight: 600, color: SURF.text1,
                      display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap',
                    }}>
                      {t(c.title[0], c.title[1])}
                      {c.locked && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em',
                          textTransform: 'uppercase', color: SURF.text3,
                          border: `1px solid ${SURF.border}`, borderRadius: 999,
                          padding: '2px 7px',
                        }}>
                          <Lock size={9} /> {t('קבוע', 'Always on')}
                        </span>
                      )}
                    </h3>
                    <Switch
                      checked={on}
                      disabled={c.locked}
                      onCheckedChange={(v) => setChoices(prev => ({ ...prev, [c.id]: v }))}
                      aria-label={t(c.title[0], c.title[1])}
                    />
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: SURF.text2, lineHeight: 1.6 }}>
                    {t(c.desc[0], c.desc[1])}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? '14px 18px 18px' : '16px 22px',
          borderTop: `1px solid ${SURF.border}`,
          background: SURF.card2,
          display: 'flex', gap: 10, flexShrink: 0,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          justifyContent: 'flex-end', alignItems: 'center',
        }}>
          <button type="button" onClick={onClose} className="orca-cp-ghost"
            style={{ ...ghostBtn, width: isMobile ? '100%' : undefined }}>
            {t('ביטול', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="orca-cp-primary"
            style={{
              padding: isMobile ? '14px 24px' : '12px 26px',
              borderRadius: 12,
              background: `linear-gradient(135deg, ${JC.blue}, ${JC.purpleDeep})`,
              border: 'none',
              color: '#FFFFFF',
              fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', cursor: 'pointer',
              width: isMobile ? '100%' : undefined,
              boxShadow: `0 12px 30px -12px ${JC.blue}, 0 1px 0 rgba(255,255,255,0.18) inset`,
            }}
          >
            {t('שמור העדפות', 'Save preferences')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
