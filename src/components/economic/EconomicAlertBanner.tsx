import { useEffect } from 'react';
import { AlertTriangle, Activity, Radio, X } from 'lucide-react';
import { useEconomicRadar } from '@/hooks/use-economic-radar';
import { useLang } from '@/hooks/use-lang';
import { formatISTTime } from '@/lib/economic';
import { playRiskAlert } from '@/lib/apex-sounds';

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

const PHASE_TONE = {
  't-5min': { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-300', icon: AlertTriangle },
  't-1min': { bg: 'bg-rose-500/15',  border: 'border-rose-500/50',  text: 'text-rose-300',  icon: Radio },
  'live':   { bg: 'bg-rose-500/20',  border: 'border-rose-500/60',  text: 'text-rose-200',  icon: Activity },
} as const;

export function EconomicAlertBanner() {
  const { active, dismiss } = useEconomicRadar(true);
  const { lang } = useLang();
  const t = COPY[lang];

  useEffect(() => {
    if (!active) return;
    if (active.phase !== 't-5min') {
      try { playRiskAlert(); } catch { /* noop */ }
    }
    const timeout = window.setTimeout(dismiss, 90_000);
    return () => window.clearTimeout(timeout);
  }, [active, dismiss]);

  if (!active) return null;

  const tone = PHASE_TONE[active.phase];
  const Icon = tone.icon;
  const ev = active.event;

  return (
    <div
      role="alert"
      className={`fixed z-[200] top-4 ${lang === 'he' ? 'left-4' : 'right-4'} w-[360px] max-w-[calc(100vw-2rem)] ${tone.bg} ${tone.border} ${tone.text} border backdrop-blur-md rounded-lg shadow-2xl px-4 py-3 animate-in slide-in-from-top-2 fade-in duration-300`}
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active.phase !== 't-5min' ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider opacity-70 font-mono">
            {t[active.phase]} · {formatISTTime(ev.release_at, lang)} {ev.currency ? `· ${ev.currency}` : ''}
          </div>
          <div className="text-sm font-semibold truncate mt-0.5">{ev.event_name}</div>
          {(ev.actual || ev.forecast) && (
            <div className="text-xs opacity-80 mt-1 font-mono">
              {ev.actual && <span>{t.actual}: <b>{ev.actual}</b></span>}
              {ev.actual && ev.forecast && <span className="opacity-50"> · </span>}
              {ev.forecast && <span>{t.forecast}: {ev.forecast}</span>}
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label={t.dismiss}
          className="p-1 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
