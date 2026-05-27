/**
 * TierGate — wraps a feature/chart. If the user's tier is below `required`,
 * renders an upsell card instead of children. Used to gate Advanced/Ultimate
 * charts without physically removing them from the page.
 */
import { ReactNode } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useEntitlement, type AppTier } from '@/hooks/use-entitlement';
import { useLang } from '@/hooks/use-lang';

interface TierGateProps {
  required: AppTier;
  children: ReactNode;
  /** Optional feature label shown in the lock overlay */
  label?: string;
  /** When true, render nothing instead of an upsell card */
  silent?: boolean;
}

const TIER_LABEL: Record<AppTier, { he: string; en: string }> = {
  standard: { he: 'סטנדרט', en: 'Standard' },
  advanced: { he: 'מתקדם', en: 'Advanced' },
  ultimate: { he: 'אולטימייט', en: 'Ultimate' },
};

export function TierGate({ required, children, label, silent }: TierGateProps) {
  const { allows, loading } = useEntitlement();
  const { lang } = useLang();

  if (loading) return null;
  if (allows(required)) return <>{children}</>;
  if (silent) return null;

  const tierName = TIER_LABEL[required][lang === 'he' ? 'he' : 'en'];
  const title = lang === 'he' ? `נדרש ${tierName}` : `${tierName} required`;
  const body =
    lang === 'he'
      ? label
        ? `"${label}" זמין במנוי ${tierName}.`
        : `תכונה זו זמינה במנוי ${tierName}.`
      : label
        ? `"${label}" is available on the ${tierName} plan.`
        : `This feature is available on the ${tierName} plan.`;
  const cta = lang === 'he' ? 'שדרג עכשיו' : 'Upgrade';

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 text-center min-h-[180px]"
      role="region"
      aria-label={title}
    >
      <div className="absolute top-3 right-3">
        <Sparkles className="h-4 w-4 text-primary/60" />
      </div>
      <Lock className="h-8 w-8 text-primary mb-3" />
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{body}</p>
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('orca:open-upgrade', { detail: { required } }));
        }}
        className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        {cta}
      </button>
    </div>
  );
}
