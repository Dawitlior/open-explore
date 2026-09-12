/**
 * PlanCountdown — shows a discreet pill when a paid plan is winding down.
 *
 * Appears only when the trader cancelled (or Stripe scheduled a cancellation)
 * and the paid period is still running: "Pro active for N more days".
 * When the period ends, `current_entitlement` in the database already returns
 * the free plan, so access drops automatically — no cron job required.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSubscription } from '@/hooks/use-subscription';

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.ceil(ms / 86_400_000);
}

export function PlanCountdown({ isRTL = true }: { isRTL?: boolean }) {
  const { cancelAtPeriodEnd, currentPeriodEnd, subscribed, openPortal } = useSubscription();
  const [, force] = useState(0);

  // Refresh the label once an hour so the number stays honest.
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 3_600_000);
    return () => window.clearInterval(id);
  }, []);

  const left = useMemo(() => daysLeft(currentPeriodEnd), [currentPeriodEnd]);
  const winding = cancelAtPeriodEnd && subscribed && left !== null;
  if (!winding) return null;

  const label = isRTL
    ? `Orca Pro פעיל עוד ${left} ימים`
    : `Orca Pro active for ${left} more days`;

  return (
    <button
      type="button"
      onClick={() => { void openPortal(); }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-border/70 bg-card/90 px-4 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur transition-colors hover:bg-accent/40"
    >
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
      {label}
    </button>
  );
}
