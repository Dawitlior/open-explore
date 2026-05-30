/**
 * UpgradeModal — listens for 'orca:open-upgrade' and presents the
 * 3-tier pricing comparison (Standard / Advanced / Ultimate).
 *
 * Bilingual (HE/EN). Pre-launch CTA is wired to a no-op stub that
 * dispatches 'orca:start-trial' — payment flow lands in a later phase.
 */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, Sparkles, Crown, Zap, X } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';
import { useEntitlement, type AppTier } from '@/hooks/use-entitlement';
import { cn } from '@/lib/utils';

interface TierDef {
  id: AppTier;
  icon: typeof Zap;
  name: { he: string; en: string };
  tagline: { he: string; en: string };
  price: { he: string; en: string };
  features: { he: string; en: string }[];
  accent: string;
  ring: string;
}

const TIERS: TierDef[] = [
  {
    id: 'standard',
    icon: Zap,
    name: { he: 'סטנדרט', en: 'Standard' },
    tagline: { he: 'הבסיס למסחר ממושמע', en: 'The disciplined-trading baseline' },
    price: { he: 'חינם', en: 'Free' },
    accent: 'text-muted-foreground',
    ring: 'border-border',
    features: [
      { he: 'יומן מסחר מלא', en: 'Full trade journal' },
      { he: 'חישובי R-Multiple', en: 'R-Multiple calculations' },
      { he: 'מגבלות סיכון 4 שכבות', en: '4-tier risk limits' },
      { he: 'לוח שנה כלכלי בסיסי', en: 'Basic economic calendar' },
      { he: 'תובנות AI שבועיות', en: 'Weekly AI insights' },
    ],
  },
  {
    id: 'advanced',
    icon: Sparkles,
    name: { he: 'מתקדם', en: 'Advanced' },
    tagline: { he: 'אנליטיקה ברמת פרו', en: 'Pro-grade analytics' },
    price: { he: '₪49/חודש', en: '$14/mo' },
    accent: 'text-primary',
    ring: 'border-primary/50 ring-2 ring-primary/20',
    features: [
      { he: 'כל יתרונות סטנדרט', en: 'Everything in Standard' },
      { he: 'מפת חום ביצועי סשן', en: 'Session performance heatmap' },
      { he: 'התפלגות רצפי הצלחה/הפסד', en: 'Streak distribution' },
      { he: 'משך עסקה מול R', en: 'Trade duration vs R' },
      { he: 'ניתוח שחיקת עמלות', en: 'Fee drag impact' },
      { he: 'מצב Dual R/$ בכל הגרפים', en: 'Dual R/$ mode everywhere' },
    ],
  },
  {
    id: 'ultimate',
    icon: Crown,
    name: { he: 'אולטימייט', en: 'Ultimate' },
    tagline: { he: 'מנוע כמותי מלא', en: 'Full quant engine' },
    price: { he: '₪129/חודש', en: '$39/mo' },
    accent: 'text-accent',
    ring: 'border-accent/50 ring-2 ring-accent/20',
    features: [
      { he: 'כל יתרונות מתקדם', en: 'Everything in Advanced' },
      { he: 'אוטוקורלציה Lag-1', en: 'Lag-1 autocorrelation' },
      { he: 'התפלגות זמן בין עסקאות', en: 'Inter-trade interval analysis' },
      { he: 'קלי אופטימלי (Full/Half)', en: 'Optimal Kelly sizing' },
      { he: 'יחס MAR מצטבר', en: 'Cumulative MAR ratio' },
      { he: 'מבנה Drawdown מלא', en: 'Full drawdown structure' },
      { he: 'יעילות הון מתגלגלת', en: 'Rolling capital efficiency' },
    ],
  },
];

export function UpgradeModal() {
  const { lang } = useLang();
  const { tier: currentTier } = useEntitlement();
  const [open, setOpen] = useState(false);
  const [required, setRequired] = useState<AppTier>('advanced');

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail as { required?: AppTier } | undefined;
      if (detail?.required) setRequired(detail.required);
      setOpen(true);
    };
    window.addEventListener('orca:open-upgrade', onOpen);
    return () => window.removeEventListener('orca:open-upgrade', onOpen);
  }, []);

  const isHe = lang === 'he';
  const title = isHe ? 'בחר/י את התוכנית שלך' : 'Choose your plan';
  const subtitle = isHe
    ? '7 ימי ניסיון חינם בגישת Advanced — ללא חיוב, ניתן לבטל בכל עת'
    : '7-day free trial with Advanced access — no charge, cancel anytime';

  const startTrial = (tier: AppTier) => {
    window.dispatchEvent(new CustomEvent('orca:start-trial', { detail: { tier } }));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">{title}</DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {TIERS.map((t) => {
            const Icon = t.icon;
            const isCurrent = currentTier === t.id;
            const isRecommended = t.id === required && !isCurrent;
            return (
              <div
                key={t.id}
                className={cn(
                  'relative flex flex-col rounded-xl border p-5 bg-card/50 backdrop-blur-sm transition-all',
                  t.ring,
                  isRecommended && 'scale-[1.02]',
                )}
              >
                {isRecommended && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide">
                    {isHe ? 'מומלץ' : 'Recommended'}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-semibold uppercase tracking-wide border border-border">
                    {isHe ? 'התוכנית הנוכחית' : 'Current plan'}
                  </div>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('h-5 w-5', t.accent)} />
                  <h3 className="text-lg font-bold">{t.name[isHe ? 'he' : 'en']}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t.tagline[isHe ? 'he' : 'en']}
                </p>
                <div className="text-2xl font-bold mb-4">
                  {t.price[isHe ? 'he' : 'en']}
                </div>

                <ul className="flex-1 space-y-2 mb-5">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                      <Check className={cn('h-3.5 w-3.5 mt-0.5 flex-shrink-0', t.accent)} />
                      <span>{f[isHe ? 'he' : 'en']}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => startTrial(t.id)}
                  className={cn(
                    'w-full py-2 rounded-md text-sm font-medium transition-colors',
                    isCurrent
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : t.id === 'standard'
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        : t.id === 'advanced'
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-accent text-accent-foreground hover:bg-accent/90',
                  )}
                >
                  {isCurrent
                    ? (isHe ? 'התוכנית הפעילה' : 'Current plan')
                    : t.id === 'standard'
                      ? (isHe ? 'המשך/י בחינם' : 'Stay on Free')
                      : (isHe ? 'התחל/י ניסיון 7 ימים' : 'Start 7-day trial')}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4">
          {isHe
            ? 'אין צורך בפרטי אשראי עד תום תקופת הניסיון · ביטול בקליק'
            : 'No credit card required until trial ends · Cancel in one click'}
        </p>
      </DialogContent>
    </Dialog>
  );
}
