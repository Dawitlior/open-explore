import { useMemo, useState, useEffect } from 'react';
import { X, Filter, AlertCircle, Activity, Search } from 'lucide-react';
import { useEconomicEvents } from '@/hooks/use-economic-events';
import { useLang } from '@/hooks/use-lang';
import { formatISTTime, computeSurprise, surpriseTone } from '@/lib/economic';
import type { EconomicEvent, EconomicImpact } from '@/lib/economic';
import { getSetting, setSetting } from '@/lib/storage';
import { CURRENCY_FLAG, MACRO_TIER_COLOR } from './MacroEventStrip';

const COPY = {
  he: {
    title: 'מכ״ם כלכלי',
    subtitle: 'יומן אירועי מאקרו · ForexFactory-style',
    close: 'סגור',
    impact: 'דרגה',
    currency: 'מטבע',
    search: 'חיפוש…',
    empty: 'אין אירועים תואמים',
    actual: 'בפועל',
    forecast: 'תחזית',
    previous: 'קודם',
    today: 'היום',
    week: { prev: 'שבוע שעבר', now: 'שבוע נוכחי', next: 'שבוע הבא' },
    tier: { t1: 'קריטי', t2: 'משמעותי', t3: 'רקע' },
    columns: { time: 'זמן', currency: 'מטבע', impact: 'השפעה', event: 'אירוע', actual: 'בפועל', forecast: 'תחזית', previous: 'קודם' },
    all: 'הכל',
  },
  en: {
    title: 'Economic Radar',
    subtitle: 'Macro calendar · ForexFactory-style',
    close: 'Close',
    impact: 'Tier',
    currency: 'Currency',
    search: 'Search…',
    empty: 'No matching events',
    actual: 'Actual',
    forecast: 'Forecast',
    previous: 'Previous',
    today: 'Today',
    week: { prev: 'Last week', now: 'This week', next: 'Next week' },
    tier: { t1: 'Critical', t2: 'Material', t3: 'Background' },
    columns: { time: 'Time', currency: 'CCY', impact: 'Impact', event: 'Event', actual: 'Actual', forecast: 'Forecast', previous: 'Previous' },
    all: 'All',
  },
} as const;

const MAJOR_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CAD', 'CHF', 'NZD'] as const;
const FILTER_KEY = 'economic_calendar_filters';

type WeekTab = 'prev' | 'now' | 'next';

interface Filters {
  impacts: EconomicImpact[];
  currencies: string[]; // empty = all
  search: string;
}

const DEFAULT_FILTERS: Filters = { impacts: ['t1', 't2', 't3'], currencies: [], search: '' };

/** Returns [Mon 00:00, Sun 23:59:59.999] of week relative to today, in local time. */
function weekRange(offsetWeeks: number): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0..6 (Sun..Sat)
  const diffToMonday = (day + 6) % 7; // Mon=0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday + offsetWeeks * 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface Props {
  onClose: () => void;
}

export function EconomicCalendarPage({ onClose }: Props) {
  const { lang } = useLang();
  const isRTL = lang === 'he';
  const t = COPY[lang];

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [week, setWeek] = useState<WeekTab>('now');
  const [searchOpen, setSearchOpen] = useState(false);

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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Window: -14d to +14d covers prev/now/next week with margin
  const { events, loading } = useEconomicEvents({ hoursAhead: 14 * 24, impacts: filters.impacts });

  const { start: weekStart, end: weekEnd } = useMemo(() => weekRange(week === 'prev' ? -1 : week === 'next' ? 1 : 0), [week]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const curs = new Set(filters.currencies.map((c) => c.toUpperCase()));
    return events.filter((e) => {
      const ts = new Date(e.release_at).getTime();
      if (ts < weekStart.getTime() || ts > weekEnd.getTime()) return false;
      if (curs.size > 0 && !curs.has((e.currency || '').toUpperCase())) return false;
      if (q && !e.event_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, weekStart, weekEnd, filters.currencies, filters.search]);

  const grouped = useMemo(() => {
    const m = new Map<string, EconomicEvent[]>();
    for (const e of filtered) m.set(dayKey(new Date(e.release_at)), [...(m.get(dayKey(new Date(e.release_at))) ?? []), e]);
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const today = new Date();

  function toggleCurrency(c: string) {
    setFilters((f) => ({
      ...f,
      currencies: f.currencies.includes(c) ? f.currencies.filter((x) => x !== c) : [...f.currencies, c],
    }));
  }

  function toggleImpact(i: EconomicImpact) {
    setFilters((f) => ({
      ...f,
      impacts: f.impacts.includes(i) ? f.impacts.filter((x) => x !== i) : [...f.impacts, i],
    }));
  }

  return (
    <div
      role="dialog"
      aria-label={t.title}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[150] backdrop-blur-sm"
      style={{ background: 'rgba(6,19,38,0.92)', fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="absolute inset-2 md:inset-6 rounded-2xl border border-cyan-500/20 bg-[#061326] shadow-[0_0_80px_rgba(0,242,255,0.1)] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-cyan-500/15 bg-gradient-to-b from-cyan-500/[0.04] to-transparent">
          <div className="relative">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-lg font-bold text-cyan-100 truncate tracking-tight" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {t.title}
            </h1>
            <div className="text-[10px] md:text-xs text-cyan-100/40 truncate uppercase tracking-wider">{t.subtitle}</div>
          </div>
          <button
            onClick={() => setSearchOpen((v) => !v)}
            className="p-2 rounded-md text-cyan-100/60 hover:text-cyan-100 hover:bg-cyan-500/10 transition"
            aria-label={t.search}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-md text-cyan-100/60 hover:text-cyan-100 hover:bg-cyan-500/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Currency + Impact filter row */}
        <div className="px-3 md:px-6 py-3 border-b border-cyan-500/10 flex flex-wrap items-center gap-2 md:gap-3 bg-cyan-500/[0.015]">
          {/* Currency chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilters((f) => ({ ...f, currencies: [] }))}
              className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border transition"
              style={{
                borderColor: filters.currencies.length === 0 ? '#00f2ff' : 'rgba(100,116,139,0.25)',
                background: filters.currencies.length === 0 ? 'rgba(0,242,255,0.1)' : 'transparent',
                color: filters.currencies.length === 0 ? '#00f2ff' : 'rgba(207,222,236,0.5)',
              }}
            >
              {t.all}
            </button>
            {MAJOR_CURRENCIES.map((c) => {
              const on = filters.currencies.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCurrency(c)}
                  className="px-2.5 py-1.5 text-[11px] font-bold rounded-md border transition flex items-center gap-1.5"
                  style={{
                    borderColor: on ? '#00f2ff' : 'rgba(100,116,139,0.25)',
                    background: on ? 'rgba(0,242,255,0.08)' : 'transparent',
                    color: on ? '#cffeff' : 'rgba(207,222,236,0.65)',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <span style={{ fontSize: 13 }}>{CURRENCY_FLAG[c] ?? '🏳️'}</span>
                  {c}
                </button>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* Impact toggles */}
          <div className="flex items-center gap-1">
            {(['t1', 't2', 't3'] as EconomicImpact[]).map((i) => {
              const on = filters.impacts.includes(i);
              const color = MACRO_TIER_COLOR[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleImpact(i)}
                  title={t.tier[i]}
                  className="w-7 h-7 rounded-md border transition flex items-center justify-center"
                  style={{
                    borderColor: on ? color : 'rgba(100,116,139,0.25)',
                    background: on ? `${color}22` : 'transparent',
                  }}
                >
                  <span style={{ width: 12, height: 8, borderRadius: 1, background: on ? color : 'rgba(100,116,139,0.4)', display: 'inline-block', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 35% 100%, 35% 70%, 0 70%)' }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Search drawer */}
        {searchOpen && (
          <div className="px-4 md:px-6 py-2.5 border-b border-cyan-500/10 bg-cyan-500/[0.03]">
            <input
              autoFocus
              type="text"
              placeholder={t.search}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full px-3 py-1.5 text-sm rounded border border-cyan-500/30 bg-transparent text-cyan-100 placeholder:text-cyan-100/30 focus:outline-none focus:border-cyan-400/60"
            />
          </div>
        )}

        {/* Week tabs */}
        <div className="flex items-center justify-center px-4 md:px-6 py-3 border-b border-cyan-500/10">
          <div className="inline-flex rounded-lg border border-cyan-500/20 bg-[#0a1c33] p-0.5">
            {(['prev', 'now', 'next'] as WeekTab[]).map((w) => (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className="px-5 py-1.5 text-xs font-bold rounded-md transition"
                style={{
                  background: week === w ? '#0d2542' : 'transparent',
                  color: week === w ? '#00f2ff' : 'rgba(207,222,236,0.55)',
                  boxShadow: week === w ? 'inset 0 0 0 1px rgba(0,242,255,0.3)' : 'none',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {t.week[w]}
              </button>
            ))}
          </div>
        </div>

        {/* Body — table */}
        <div className="flex-1 overflow-y-auto">
          {/* Column headers (sticky) */}
          <div
            className="sticky top-0 z-20 backdrop-blur-md grid items-center text-[10px] uppercase tracking-wider font-bold text-cyan-100/40 border-b border-cyan-500/10"
            style={{
              gridTemplateColumns: '90px 90px 90px 1fr 110px 110px 110px',
              background: 'rgba(6,19,38,0.94)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            <div className="px-3 py-2.5 text-end">{t.columns.time}</div>
            <div className="px-3 py-2.5">{t.columns.currency}</div>
            <div className="px-3 py-2.5">{t.columns.impact}</div>
            <div className="px-3 py-2.5">{t.columns.event}</div>
            <div className="px-3 py-2.5 text-end">{t.columns.actual}</div>
            <div className="px-3 py-2.5 text-end">{t.columns.forecast}</div>
            <div className="px-3 py-2.5 text-end">{t.columns.previous}</div>
          </div>

          {loading && (
            <div className="text-center py-16 text-cyan-100/40 text-sm">…</div>
          )}
          {!loading && grouped.length === 0 && (
            <div className="text-center py-20 text-cyan-100/40 text-sm flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 opacity-40" />
              {t.empty}
            </div>
          )}

          {!loading && grouped.map(([day, list]) => {
            const dayDate = new Date(day);
            const isToday = isSameDay(dayDate, today);
            const dayLabel = new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
            }).format(dayDate);
            return (
              <div key={day}>
                {/* Day separator row */}
                <div
                  className="grid items-center text-xs font-bold text-cyan-100/70 border-y border-cyan-500/10"
                  style={{
                    gridTemplateColumns: '1fr',
                    background: isToday ? 'linear-gradient(90deg, rgba(0,242,255,0.12), rgba(0,242,255,0.02))' : 'rgba(13,37,66,0.55)',
                    borderInlineStart: isToday ? '3px solid #00f2ff' : '3px solid transparent',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  <div className="px-4 py-2 flex items-center gap-2">
                    <span style={{ color: isToday ? '#00f2ff' : 'rgba(207,222,236,0.75)' }}>{dayLabel}</span>
                    {isToday && (
                      <span className="ms-1 px-1.5 py-0.5 text-[9px] uppercase tracking-wider rounded bg-cyan-400/15 text-cyan-300">
                        {t.today}
                      </span>
                    )}
                    <span className="ms-auto text-[10px] opacity-50">{list.length}</span>
                  </div>
                </div>
                {list.map((e) => (
                  <EventRow key={e.id} e={e} lang={lang} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ImpactBars({ impact }: { impact: EconomicImpact }) {
  // Mimic ForexFactory's 3-bar impact icon
  const color = MACRO_TIER_COLOR[impact];
  const filled = impact === 't1' ? 3 : impact === 't2' ? 2 : 1;
  return (
    <div className="inline-flex items-end gap-0.5" aria-label={impact.toUpperCase()}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5 + i * 3,
            background: i <= filled ? color : 'rgba(100,116,139,0.25)',
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function EventRow({ e, lang }: { e: EconomicEvent; lang: 'he' | 'en' }) {
  const past = new Date(e.release_at).getTime() < Date.now() - 60_000;
  const surprise = past ? surpriseTone(computeSurprise(e.actual, e.forecast)) : undefined;
  const actualColor =
    surprise === 'positive' ? '#10b981' :
    surprise === 'negative' ? '#f43f5e' :
    '#e0f2fe';
  const flag = e.currency ? CURRENCY_FLAG[e.currency] : null;

  return (
    <div
      className="grid items-center text-[12px] border-b border-cyan-500/[0.05] hover:bg-cyan-500/[0.04] transition"
      style={{
        gridTemplateColumns: '90px 90px 90px 1fr 110px 110px 110px',
        opacity: past ? 0.45 : 1,
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div className="px-3 py-2.5 text-end text-cyan-100/70 tabular-nums">{formatISTTime(e.release_at, lang)}</div>
      <div className="px-3 py-2.5 flex items-center gap-1.5">
        {flag && <span style={{ fontSize: 14 }}>{flag}</span>}
        <span className="text-cyan-100/85 font-bold text-[11px]">{e.currency || '—'}</span>
      </div>
      <div className="px-3 py-2.5"><ImpactBars impact={e.impact} /></div>
      <div className="px-3 py-2.5 text-cyan-50 font-semibold truncate" style={{ fontFamily: "'Poppins', sans-serif" }} title={e.event_name}>
        {e.event_name}
      </div>
      <div className="px-3 py-2.5 text-end font-bold tabular-nums" style={{ color: actualColor }}>
        {e.actual || <span className="opacity-30">—</span>}
      </div>
      <div className="px-3 py-2.5 text-end text-cyan-100/55 tabular-nums">{e.forecast || <span className="opacity-30">—</span>}</div>
      <div className="px-3 py-2.5 text-end text-cyan-100/35 tabular-nums">{e.previous || <span className="opacity-30">—</span>}</div>
    </div>
  );
}
