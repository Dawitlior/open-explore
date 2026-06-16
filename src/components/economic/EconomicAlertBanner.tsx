import { useEffect } from 'react';
import { AlertTriangle, Activity, Radio, X } from 'lucide-react';
import { useEconomicRadar } from '@/hooks/use-economic-radar';
import { useLang } from '@/hooks/use-lang';
import { formatISTTime } from '@/lib/economic';

/**
 * Orca-native macro alert banner.
 * - Uses semantic theme tokens (works in every theme: Midnight/Snow/etc.)
 * - Audio disabled (Phase 1 mandate). Silent visual pulse on the phase chip.
 */

const COPY = {
  he: {
    't-5min': 'אירוע מאקרו בעוד 5 דק׳',
    't-1min': 'אירוע מאקרו בעוד דקה',
    'live':   'אירוע מאקרו שודר כעת',
    dismiss:  'סגור',
    actual:   'בפועל',
    forecast: 'תחזית',
  },
  en: {
    't-5min': 'Macro event in 5 min',
    't-1min': 'Macro event in 1 min',
    'live':   'Macro event live now',
    dismiss:  'Dismiss',
    actual:   'Actual',
    forecast: 'Forecast',
  },
} as const;

const PHASE_ICON = {
  't-5min': AlertTriangle,
  't-1min': Radio,
  'live':   Activity,
} as const;

export function EconomicAlertBanner() {
  const { active, dismiss } = useEconomicRadar(true);
  const { lang } = useLang();
  const t = COPY[lang];

  useEffect(() => {
    if (!active) return;
    // Audio disabled — visual-only alert.
    const timeout = window.setTimeout(dismiss, 90_000);
    return () => window.clearTimeout(timeout);
  }, [active, dismiss]);

  if (!active) return null;

  const Icon = PHASE_ICON[active.phase];
  const ev = active.event;
  const isLive = active.phase !== 't-5min';

  return (
    <div
      role="alert"
      className={[
        'fixed z-[200] top-4 w-[360px] max-w-[calc(100vw-2rem)]',
        lang === 'he' ? 'left-4' : 'right-4',
        'bg-card text-foreground border border-border rounded-lg shadow-2xl',
        'px-4 py-3 animate-in slide-in-from-top-2 fade-in duration-300',
        'font-sans',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border',
            isLive
              ? 'border-destructive/40 bg-destructive/10 text-destructive animate-pulse'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-400',
          ].join(' ')}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
            {t[active.phase]} · {formatISTTime(ev.release_at, lang)}
            {ev.currency ? ` · ${ev.currency}` : ''}
          </div>
          <div className="text-sm font-semibold truncate mt-0.5 text-foreground">
            {ev.event_name}
          </div>
          {(ev.actual || ev.forecast) && (
            <div className="text-xs mt-1 font-mono text-muted-foreground tabular-nums">
              {ev.actual && <span>{t.actual}: <b className="text-foreground">{ev.actual}</b></span>}
              {ev.actual && ev.forecast && <span className="opacity-50"> · </span>}
              {ev.forecast && <span>{t.forecast}: {ev.forecast}</span>}
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label={t.dismiss}
          title={t.dismiss}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background/60 text-foreground/80 hover:text-foreground hover:bg-muted hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
