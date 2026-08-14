/**
 * CookiePreferencesModal — granular category control.
 * Categories: Essential (locked on), Analytics, Functional, Marketing.
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
  const [choices, setChoices] = useState<ConsentChoices>(() => ({
    essential: true,
    analytics: consent?.analytics ?? DEFAULT_CHOICES.analytics,
    functional: consent?.functional ?? DEFAULT_CHOICES.functional,
    marketing: consent?.marketing ?? DEFAULT_CHOICES.marketing,
  }));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    padding: '11px 20px', borderRadius: 8,
    background: 'transparent', border: `1px solid ${SURF.border}`,
    color: SURF.text2, fontFamily: 'inherit',
    fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer',
    transition: 'border-color .18s ease, color .18s ease, background .18s ease',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100060,
        background: SURF.scrim,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'grid', placeItems: 'center', padding: 16,
        animation: 'orca-cp-fade 200ms ease both',
        fontFamily: "'Poppins', 'Heebo', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes orca-cp-fade { from { opacity:0; } to { opacity:1; } }
        @keyframes orca-cp-pop { from { opacity:0; transform: translateY(14px) scale(.985); } to { opacity:1; transform:none; } }
        .orca-cp-row { transition: border-color .18s ease, background .18s ease; }
        .orca-cp-row:hover { border-color: ${SURF.borderStrong}; background: ${SURF.card2}; }
        .orca-cp-ghost:hover { border-color: ${SURF.borderStrong} !important; color: ${SURF.text1} !important; background: ${SURF.card2} !important; }
        .orca-cp-primary { transition: filter .18s ease, transform .12s ease; }
        .orca-cp-primary:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .orca-cp-scroll::-webkit-scrollbar { width: 6px; }
        .orca-cp-scroll::-webkit-scrollbar-thumb { background: ${SURF.border}; border-radius: 999px; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 560, maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          background: SURF.panelGradient,
          border: `1px solid ${SURF.border}`,
          borderRadius: 16,
          boxShadow: SURF.shadow,
          color: SURF.text1,
          overflow: 'hidden',
          animation: 'orca-cp-pop 300ms cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        <div aria-hidden style={{
          position: 'absolute', top: 0, insetInline: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${JC.blue}, transparent)`, opacity: 0.7,
        }} />

        {/* Header */}
        <div style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${SURF.border}`,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.26em',
              textTransform: 'uppercase', color: SURF.text3, marginBottom: 6,
            }}>
              {t('בקרת פרטיות', 'Privacy control')}
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: SURF.text1 }}>
              {t('העדפות עוגיות', 'Cookie preferences')}
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.55, color: SURF.text2 }}>
              {t('בחר אילו קטגוריות לאפשר. ניתן לשנות בכל עת.', 'Choose which categories to allow. You can change this anytime.')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('סגור', 'Close')}
            className="orca-cp-ghost"
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
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
          gap: 10, padding: '10px 22px',
          borderBottom: `1px solid ${SURF.border}`,
          background: SURF.card2,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: SURF.text3, textTransform: 'uppercase' }}>
            {enabledCount}/{cats.length} {t('פעילות', 'enabled')}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setAll(false)} className="orca-cp-ghost"
              style={{ ...ghostBtn, padding: '6px 12px', fontSize: 11 }}>
              {t('בטל הכל', 'Disable all')}
            </button>
            <button type="button" onClick={() => setAll(true)} className="orca-cp-ghost"
              style={{ ...ghostBtn, padding: '6px 12px', fontSize: 11 }}>
              {t('אפשר הכל', 'Enable all')}
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="orca-cp-scroll" style={{
          flex: 1, overflowY: 'auto', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {cats.map(c => {
            const Icon = c.icon;
            const on = c.locked ? true : Boolean(choices[c.id]);
            return (
              <div key={c.id} className="orca-cp-row" style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: 14, borderRadius: 12,
                border: `1px solid ${on && !c.locked ? SURF.borderStrong : SURF.border}`,
                background: SURF.card,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
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
                      display: 'flex', alignItems: 'center', gap: 7,
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
                  <p style={{ margin: '5px 0 0', fontSize: 12, color: SURF.text2, lineHeight: 1.55 }}>
                    {t(c.desc[0], c.desc[1])}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: `1px solid ${SURF.border}`,
          background: SURF.card2,
          display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center',
        }}>
          <button type="button" onClick={onClose} className="orca-cp-ghost" style={ghostBtn}>
            {t('ביטול', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="orca-cp-primary"
            style={{
              padding: '11px 24px', borderRadius: 8,
              background: JC.blue, border: `1px solid ${JC.blue}`,
              color: JC.onAccent, fontFamily: 'inherit',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
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
