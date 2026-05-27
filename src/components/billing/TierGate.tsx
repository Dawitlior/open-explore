/**
 * TierGate — wraps a feature/chart.
 *
 * Two modes (controlled by ENFORCE_TIER_GATES):
 *
 *  • Soft mode (current — pre-launch):
 *    Always renders children. If user's tier is below `required`, a small
 *    lock badge is overlaid in the top-right so we can preview the gating
 *    UX without actually blocking access.
 *
 *  • Hard mode (launch day):
 *    If user's tier is below `required`, renders an upsell card INSTEAD
 *    of children. Set ENFORCE_TIER_GATES=true in billing-flags.ts.
 */
import { ReactNode } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useEntitlement, type AppTier } from '@/hooks/use-entitlement';
import { useLang } from '@/hooks/use-lang';
import { ENFORCE_TIER_GATES } from '@/lib/billing-flags';

interface TierGateProps {
  required: AppTier;
  children: ReactNode;
  label?: string;
  /** When true, render nothing in hard mode instead of the upsell card */
  silent?: boolean;
}

const TIER_LABEL: Record<AppTier, { he: string; en: string }> = {
  standard: { he: 'סטנדרט', en: 'Standard' },
  advanced: { he: 'מתקדם', en: 'Advanced' },
  ultimate: { he: 'אולטימייט', en: 'Ultimate' },
};

const TIER_BADGE_COLOR: Record<AppTier, string> = {
  standard: 'bg-muted/80 text-muted-foreground border-border',
  advanced: 'bg-primary/15 text-primary border-primary/30',
  ultimate: 'bg-accent/15 text-accent border-accent/30',
};

export function TierGate({ required, children, label, silent }: TierGateProps) {
  const { allows, loading } = useEntitlement();
  const { lang } = useLang();

  if (loading) return <>{children}</>;
  const hasAccess = allows(required) || required === 'standard';

  // SOFT MODE — render children always, overlay a lock badge if locked
  if (!ENFORCE_TIER_GATES) {
    if (hasAccess) return <>{children}</>;
    const tierName = TIER_LABEL[required][lang === 'he' ? 'he' : 'en'];
    const tip =
      lang === 'he'
        ? `נדרש ${tierName} (תצוגה מקדימה — לא חסום)`
        : `${tierName} required (preview mode — not blocked)`;
    return (
      <div className="relative">
        {children}
        <div
          className={`pointer-events-none absolute top-2 ${lang === 'he' ? 'left-2' : 'right-2'} z-20 flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm ${TIER_BADGE_COLOR[required]}`}
          title={tip}
          aria-label={tip}
        >
          <Lock className="h-3 w-3" />
          <span className="uppercase tracking-wide">{tierName}</span>
        </div>
      </div>
    );
  }

  // HARD MODE — block & upsell
  if (hasAccess) return <>{children}</>;
  if (silent) return null;

  const tierName = TIER_LABEL[required][lang === 'he' ? 'he' : 'en'];
  const title = lang === 'he' ? `נדרש ${tierName}` : `${tierName} required`;
  const body =
    lang === 'he'
      ? label ? `"${label}" זמין במנוי ${tierName}.` : `תכונה זו זמינה במנוי ${tierName}.`
      : label ? `"${label}" is available on the ${tierName} plan.` : `This feature is available on the ${tierName} plan.`;
  const cta = lang === 'he' ? 'שדרג עכשיו' : 'Upgrade';

  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 text-center min-h-[180px]"
      role="region"
      aria-label={title}
    >
      <div className="absolute top-3 right-3"><Sparkles className="h-4 w-4 text-primary/60" /></div>
      <Lock className="h-8 w-8 text-primary mb-3" />
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{body}</p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('orca:open-upgrade', { detail: { required } }))}
        className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
      >
        {cta}
      </button>
    </div>
  );
}
