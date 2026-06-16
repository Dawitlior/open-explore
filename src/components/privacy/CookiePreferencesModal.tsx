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
import { Shield, BarChart3, Settings2, Megaphone, X } from 'lucide-react';

type Props = { open: boolean; onClose: () => void };

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

  const handleSave = async () => { await save(choices); onClose(); };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      dir={isRTL ? 'rtl' : 'ltr'}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100060,
        background: 'rgba(3,8,18,0.78)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'grid', placeItems: 'center', padding: 16,
        animation: 'fadeIn 180ms ease',
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto',
          background: 'linear-gradient(160deg, #0a1628 0%, #061326 100%)',
          border: '1px solid rgba(0,242,255,0.35)',
          borderRadius: 18, padding: '24px 22px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55), 0 0 50px rgba(0,242,255,0.18)',
          color: '#e8eef8',
        }}
      >
        <button
          onClick={onClose}
          aria-label={t('סגור', 'Close')}
          style={{
            position: 'absolute', top: 12, [isRTL ? 'left' : 'right']: 12,
            width: 32, height: 32, borderRadius: 8,
            background: 'transparent', border: '1px solid #2a3a55',
            color: '#cdd6e6', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          } as any}
        >
          <X size={16} />
        </button>

        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#fff' }}>
          {t('העדפות עוגיות', 'Cookie preferences')}
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#90a3c0' }}>
          {t('בחר אילו קטגוריות לאפשר. ניתן לשנות בכל עת.', 'Choose which categories to allow. You can change this anytime.')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cats.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: 12, borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.025)',
              }}>
                <Icon size={18} style={{ color: '#00f2ff', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{t(c.title[0], c.title[1])}</h3>
                    <Switch
                      checked={c.locked ? true : Boolean(choices[c.id])}
                      disabled={c.locked}
                      onCheckedChange={(v) => setChoices(prev => ({ ...prev, [c.id]: v }))}
                      aria-label={t(c.title[0], c.title[1])}
                    />
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#90a3c0', lineHeight: 1.5 }}>
                    {t(c.desc[0], c.desc[1])}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'transparent', border: '1px solid #2a3a55',
              color: '#cdd6e6', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('ביטול', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '10px 22px', borderRadius: 10,
              background: 'linear-gradient(135deg, #00f2ff, #0a8aa8)',
              border: '1px solid #00f2ff',
              color: '#03121f', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(0,242,255,0.30)',
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
