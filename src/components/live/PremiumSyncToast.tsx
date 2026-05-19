/**
 * PremiumSyncToast — Glassmorphic sonner toast for "Trade → Journal" events.
 * Cyan accent bar, mono numerics, grain texture, auto-dismiss.
 */

import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SyncToastPayload {
  symbol: string;
  pnl: number;
  added: number;
}

export function showSyncToast(p: SyncToastPayload) {
  toast.custom((id) => (
    <div
      className={cn(
        'orca-glass orca-grain relative overflow-hidden rounded-[var(--radius)]',
        'flex items-stretch gap-3 pr-4 pl-0 py-3 min-w-[280px]',
        'shadow-[0_8px_24px_-8px_rgba(0,255,255,0.15)]',
      )}
    >
      <div className="w-1 bg-gradient-to-b from-cyan-400 via-cyan-300 to-cyan-500/40 rounded-r-full" />
      <div className="flex flex-col gap-1 flex-1 py-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/90 font-semibold">
            Trade synced → Journal
          </span>
          <button
            onClick={() => toast.dismiss(id)}
            className="text-muted-foreground/60 hover:text-foreground text-xs leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <div className="flex items-baseline justify-between gap-4 font-mono">
          <span className="text-sm font-semibold text-foreground">{p.symbol}</span>
          <span className={cn(
            'text-sm font-semibold tabular-nums',
            p.pnl > 0 ? 'text-emerald-400' : p.pnl < 0 ? 'text-rose-400' : 'text-muted-foreground',
          )}>
            {p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(2)} USDT
          </span>
        </div>
        {p.added > 1 && (
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            +{p.added} trades appended
          </span>
        )}
      </div>
    </div>
  ), { duration: 4000 });
}
