import { useMemo, useState, useEffect } from 'react';
import { X, Filter, AlertCircle, Activity, Circle } from 'lucide-react';
import { useEconomicEvents } from '@/hooks/use-economic-events';
import { useLang } from '@/hooks/use-lang';
import { formatIST, formatISTTime, computeSurprise, surpriseTone } from '@/lib/economic';
import type { EconomicEvent, EconomicImpact } from '@/lib/economic';
import { getSetting, setSetting } from '@/lib/storage';

const COPY = {
  he: {
    title: 'מכ״ם כלכלי',
    subtitle: 'יומן אירועי מאקרו · 14 ימים קדימה',
    close: 'סגור',
    filters: 'מסננים',
    impact: 'דרגת השפעה',
    currency: 'מטבע',
    search: 'חיפוש אירוע…',
    empty: 'אין אירועים בטווח שנבחר',
    actual: 'בפועל',
    forecast: 'תחזית',
    previous: 'קודם',
    today: 'היום',
    tier: { t1: 'קריטי', t2: 'משמעותי', t3: 'רקע' },
    columns: { time: 'שעה (IST)', impact: 'דרגה', currency: 'מטבע', event: 'אירוע', actual: 'בפועל', forecast: 'תחזית', previous: 'קודם' },
  },
  en: {
    title: 'Economic Radar',
    subtitle: 'Macro calendar · 14 days ahead',
    close: 'Close',
    filters: 'Filters',
    impact: 'Impact tier',
    currency: 'Currency',
    search: 'Search event…',
    empty: 'No events in the selected range',
    actual: 'Actual',
    forecast: 'Forecast',
    previous: 'Previous',
    today: 'Today',
    tier: { t1: 'Critical', t2: 'Material', t3: 'Background' },
    columns: { time: 'Time (IST)', impact: 'Tier', currency: 'CCY', event: 'Event', actual: 'Actual', forecast: 'Forecast', previous: 'Previous' },
  },
} as const;

const TIER_STYLE: Record<EconomicImpact, { color: string; label: string; ring: string }> = {
  t1: { color: '#f43f5e', label: 'T1', ring: 'rgba(244,63,94,0.4)' },
  t2: { color: '#f59e0b', label: 'T2', ring: 'rgba(245,158,11,0.35)' },
  t3: { color: '#64748b', label: 'T3', ring: 'rgba(100,116,139,0.25)' },
};

const FILTER_KEY = 'economic_calendar_filters';

interface Filters {
  impacts: EconomicImpact[];
  currency: string;
  search: string;
}

const DEFAULT_FILTERS: Filters = { impacts: ['t1', 't2'], currency: '', search: '' };

function groupByDay(events: EconomicEvent[]) {
  const map = new Map<string, EconomicEvent[]>();
  for (const e of events) {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(e.release_at));
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return Array.from(map.entries());
}

function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

interface Props {
  onClose: () => void;
}

export function EconomicCalendarPage({ onClose }: Props) {
  const { lang } = useLang();
  const isRTL = lang === 'he';
  const t = COPY[lang];

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  // Persist filters
  useEffect(() => {
    let cancelled = false;
    getSetting<Filters>(FILTER_KEY).then((v) => {
      if (!cancelled && v) setFilters({ ...DEFAULT_FILTERS, ...v });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { setSetting(FILTER_KEY, filters).catch(() => {}); }, [filters]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { events, loading } = useEconomicEvents({ hoursAhead: 14 * 24, impacts: filters.impacts });

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const cur = filters.currency.trim().toUpperCase();
    return events.filter((e) => {
      if (cur && !(e.currency || '').toUpperCase().includes(cur)) return false;
      if (q && !e.event_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, filters.currency, filters.search]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);
  const today = todayIST();

  return (
    <div
      role="dialog"
      aria-label={t.title}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[150] backdrop-blur-sm"
      style={{ background: 'rgba(6,19,38,0.85)', fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="absolute inset-2 md:inset-6 rounded-2xl border border-cyan-500/20 bg-[#061326] shadow-[0_0_60px_rgba(0,242,255,0.08)] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-cyan-500/15">
          <Activity className="w-5 h-5 text-cyan-400" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold text-cyan-200 truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {t.title}
            </h1>
            <div className="text-[10px] md:text-xs text-cyan-100/50 truncate">{t.subtitle}</div>
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="px-3 py-1.5 text-xs rounded-md border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 transition flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" /> {t.filters}
          </button>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-md text-cyan-100/70 hover:text-cyan-100 hover:bg-cyan-500/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Filters Drawer */}
        {filtersOpen && (
          <div className="px-4 md:px-6 py-3 border-b border-cyan-500/10 bg-cyan-500/[0.02] flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-cyan-100/50">{t.impact}:</span>
              {(['t1', 't2', 't3'] as EconomicImpact[]).map((tier) => {
                const on = filters.impacts.includes(tier);
                const s = TIER_STYLE[tier];
                return (
                  <button
                    key={tier}
                    onClick={() => setFilters((f) => ({
                      ...f,
                      impacts: on ? f.impacts.filter((x) => x !== tier) : [...f.impacts, tier],
                    }))}
                    className="px-2 py-1 text-[10px] font-bold rounded border transition"
                    style={{
                      borderColor: on ? s.color : 'rgba(100,116,139,0.3)',
                      background: on ? `${s.color}20` : 'transparent',
                      color: on ? s.color : '#64748b',
                    }}
                  >
                    {s.label} · {t.tier[tier]}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder={t.currency}
              value={filters.currency}
              onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value }))}
              className="px-2 py-1 text-xs rounded border border-cyan-500/30 bg-transparent text-cyan-100 placeholder:text-cyan-100/30 w-20 focus:outline-none focus:border-cyan-400/60"
            />
            <input
              type="text"
              placeholder={t.search}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="px-2 py-1 text-xs rounded border border-cyan-500/30 bg-transparent text-cyan-100 placeholder:text-cyan-100/30 flex-1 min-w-[160px] focus:outline-none focus:border-cyan-400/60"
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-2 md:px-6 py-3">
          {loading && (
            <div className="text-center py-12 text-cyan-100/40 text-sm">…</div>
          )}
          {!loading && grouped.length === 0 && (
            <div className="text-center py-16 text-cyan-100/40 text-sm flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 opacity-40" />
              {t.empty}
            </div>
          )}
          {!loading && grouped.map(([day, list]) => {
            const isToday = day === today;
            const dayLabel = new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
              timeZone: 'Asia/Jerusalem',
              weekday: 'long', day: '2-digit', month: 'short',
            }).format(new Date(day));
            return (
              <section key={day} className="mb-4">
                <div
                  className="sticky top-0 z-10 backdrop-blur-md py-1.5 px-3 mb-1 rounded text-xs font-bold tracking-wide"
                  style={{
                    background: isToday ? 'rgba(0,242,255,0.12)' : 'rgba(6,19,38,0.92)',
                    color: isToday ? '#00f2ff' : 'rgba(207,222,236,0.7)',
                    borderInlineStart: isToday ? '3px solid #00f2ff' : '3px solid transparent',
                  }}
                >
                  {dayLabel} {isToday && <span className="ms-2 text-[9px] uppercase opacity-70">· {t.today}</span>}
                </div>

                {isMobile ? (
                  <div className="space-y-1.5">
                    {list.map((e) => <EventCard key={e.id} e={e} expanded={expanded === e.id} onToggle={() => setExpanded(expanded === e.id ? null : e.id)} t={t} lang={lang} />)}
                  </div>
                ) : (
                  <table className="w-full text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    <tbody>
                      {list.map((e) => <EventRow key={e.id} e={e} expanded={expanded === e.id} onToggle={() => setExpanded(expanded === e.id ? null : e.id)} t={t} lang={lang} />)}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ImpactDot({ impact }: { impact: EconomicImpact }) {
  const s = TIER_STYLE[impact];
  return (
    <span className="inline-flex items-center gap-1" style={{ color: s.color }}>
      <Circle className="w-2 h-2 fill-current" />
      <span className="text-[10px] font-bold">{s.label}</span>
    </span>
  );
}

function ValueCell({ value, surprise }: { value: string | null; surprise?: 'positive' | 'negative' | 'inline' | 'unknown' }) {
  if (!value) return <span className="opacity-30">—</span>;
  const tone =
    surprise === 'positive' ? 'text-emerald-400' :
    surprise === 'negative' ? 'text-rose-400' :
    'text-cyan-100';
  return <span className={`font-bold ${tone}`}>{value}</span>;
}

function EventRow({ e, expanded, onToggle, t, lang }: { e: EconomicEvent; expanded: boolean; onToggle: () => void; t: typeof COPY['he']; lang: 'he' | 'en' }) {
  const past = new Date(e.release_at).getTime() < Date.now() - 60_000;
  const surprise = past ? surpriseTone(computeSurprise(e.actual, e.forecast)) : undefined;
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-cyan-500/[0.06] hover:bg-cyan-500/[0.04] cursor-pointer transition"
        style={{ opacity: past ? 0.6 : 1 }}
      >
        <td className="py-2 px-3 text-cyan-100/80 w-20">{formatISTTime(e.release_at, lang)}</td>
        <td className="py-2 px-2 w-14"><ImpactDot impact={e.impact} /></td>
        <td className="py-2 px-2 text-cyan-100/70 w-14">{e.currency || '—'}</td>
        <td className="py-2 px-2 text-cyan-100 font-semibold">{e.event_name}</td>
        <td className="py-2 px-2 text-right w-24"><ValueCell value={e.actual} surprise={surprise} /></td>
        <td className="py-2 px-2 text-right w-24 text-cyan-100/60">{e.forecast || <span className="opacity-30">—</span>}</td>
        <td className="py-2 px-2 text-right w-24 text-cyan-100/40">{e.previous || <span className="opacity-30">—</span>}</td>
      </tr>
      {expanded && (
        <tr><td colSpan={7} className="px-3 py-3 bg-cyan-500/[0.03] text-[11px] text-cyan-100/70 border-b border-cyan-500/10">
          <div className="grid grid-cols-3 gap-4">
            <div><div className="opacity-50 text-[9px] uppercase mb-0.5">{t.actual}</div><ValueCell value={e.actual} surprise={surprise} /></div>
            <div><div className="opacity-50 text-[9px] uppercase mb-0.5">{t.forecast}</div>{e.forecast || '—'}</div>
            <div><div className="opacity-50 text-[9px] uppercase mb-0.5">{t.previous}</div>{e.previous || '—'}</div>
          </div>
          {e.description && <div className="mt-2 opacity-80">{e.description}</div>}
        </td></tr>
      )}
    </>
  );
}

function EventCard({ e, expanded, onToggle, t, lang }: { e: EconomicEvent; expanded: boolean; onToggle: () => void; t: typeof COPY['he']; lang: 'he' | 'en' }) {
  const past = new Date(e.release_at).getTime() < Date.now() - 60_000;
  const surprise = past ? surpriseTone(computeSurprise(e.actual, e.forecast)) : undefined;
  return (
    <button
      onClick={onToggle}
      className="w-full text-start p-3 rounded-lg border border-cyan-500/10 bg-cyan-500/[0.03] hover:bg-cyan-500/[0.06] transition"
      style={{ opacity: past ? 0.6 : 1 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] font-mono text-cyan-100/80">{formatISTTime(e.release_at, lang)}</span>
        <ImpactDot impact={e.impact} />
        {e.currency && <span className="text-[10px] text-cyan-100/50">· {e.currency}</span>}
      </div>
      <div className="text-sm font-semibold text-cyan-100">{e.event_name}</div>
      {(e.actual || e.forecast) && (
        <div className="text-[11px] mt-1 flex gap-3 font-mono">
          <span>{t.actual}: <ValueCell value={e.actual} surprise={surprise} /></span>
          <span className="text-cyan-100/50">{t.forecast}: {e.forecast || '—'}</span>
        </div>
      )}
      {expanded && e.description && <div className="mt-2 text-[11px] text-cyan-100/60">{e.description}</div>}
    </button>
  );
}
