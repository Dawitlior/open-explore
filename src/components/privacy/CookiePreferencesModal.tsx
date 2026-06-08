/**
 * CookiePreferencesModal — granular category control.
 * Categories: Essential (locked on), Analytics, Functional, Marketing.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent, ConsentChoices, DEFAULT_CHOICES } from '@/hooks/use-cookie-consent';
import { useLang } from '@/hooks/use-lang';
import { Shield, BarChart3, Settings2, Megaphone } from 'lucide-react';

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('העדפות עוגיות', 'Cookie preferences')}</DialogTitle>
          <DialogDescription>
            {t('בחר אילו קטגוריות לאפשר. ניתן לשנות בכל עת.', 'Choose which categories to allow. You can change this anytime.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {cats.map(c => {
            const Icon = c.icon;
            return (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50">
                <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{t(c.title[0], c.title[1])}</h3>
                    <Switch
                      checked={c.locked ? true : Boolean(choices[c.id])}
                      disabled={c.locked}
                      onCheckedChange={(v) => setChoices(prev => ({ ...prev, [c.id]: v }))}
                      aria-label={t(c.title[0], c.title[1])}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t(c.desc[0], c.desc[1])}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-border bg-background text-foreground hover:bg-muted transition"
          >
            {t('ביטול', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            {t('שמור העדפות', 'Save preferences')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
