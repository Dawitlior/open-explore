import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Search } from 'lucide-react';
import { useEconomicEvents } from '@/hooks/use-economic-events';
import { useLang } from '@/hooks/use-lang';
import { formatISTTime, computeSurprise, surpriseTone } from '@/lib/economic';
import type { EconomicEvent, EconomicImpact } from '@/lib/economic';
import { CURRENCY_FLAG, MACRO_TIER_COLOR } from './MacroEventStrip';

/* ─────────────────────────────────────────────────────────────
 * Economic Calendar — Professional Table View
 *   Inspired by Investing.com / TradingEconomics
 *   Adapted to Orca dark UI (#061326 / Poppins)
 *   • Full unfiltered macro feed (all regions, all tiers)
 *   • Filters: impact tier + currency
 *   • Date strip navigator (yesterday / today / tomorrow / week)
 *   • Standard table: Time | Cur | Imp | Event | Actual | Fcst | Prev
 * ───────────────────────────────────────────────────────────── */

const COPY = {
  he: {
    title: 'יומן כלכלי',
    subtitle: 'כל הדיווחים · כל האזורים · כל הרמות',
    close: 'סגור',
    today: 'היום',
    yesterday: 'אתמול',
    tomorrow: 'מחר',
    thisWeek: 'השבוע',
    nextWeek: 'שבוע הבא',
    search: 'חיפוש אירוע…',
    impact: 'השפעה',
    all: 'הכל',
    high: 'גבוהה',
    medium: 'בינונית',
    low: 'נמוכה',
    currency: 'מטבע',
    time: 'שעה',
    cur: 'מטבע',
    imp: 'השפעה',
    event: 'אירוע',
    actual: 'בפועל',
    forecast: 'תחזית',
    previous: 'קודם',
    empty: 'אין אירועים תואמים לסינון',
    live: 'משודר',
    results: 'תוצאות',
  },
  en: {
    title: 'Economic Calendar',
    subtitle: 'All releases · All regions · All tiers',
    close: 'Close',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    nextWeek: 'Next Week',
    search: 'Search event…',
    impact: 'Impact',
    all: 'All',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    currency: 'Currency',
    time: 'Time',
    cur: 'Cur.',
    imp: 'Imp.',
    event: 'Event',
    actual: 'Actual',
    forecast: 'Forecast',
    previous: 'Previous',
    empty: 'No events match the current filters',
    live: 'LIVE',
    results: 'results',
  },
} as const;

const IST_TZ = 'Asia/Jerusalem';

function istDateKey(d: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(d));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

type RangeKey = 'yesterday' | 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek';

function rangeKeys(range: RangeKey, base: Date): string[] {
  const keys: string[] = [];
  if (range === 'today') keys.push(istDateKey(base));
  else if (range === 'yesterday') keys.push(istDateKey(addDays(base, -1)));
  else if (range === 'tomorrow') keys.push(istDateKey(addDays(base, 1)));
  else if (range === 'thisWeek') {
    const dow = base.getDay();
    const start = addDays(base, -dow);
    for (let i = 0; i < 7; i++) keys.push(istDateKey(addDays(start, i)));
  } else if (range === 'nextWeek') {
    const dow = base.getDay();
    const start = addDays(base, 7 - dow);
    for (let i = 0; i < 7; i++) keys.push(istDateKey(addDays(start, i)));
  }
  return keys;
}

interface Props { onClose: () => void; }

const IMPACT_FILTERS: Array<{ key: 'all' | EconomicImpact; copyKey: 'all' | 'high' | 'medium' | 'low' }> = [
  { key: 'all', copyKey: 'all' },
  { key: 't1', copyKey: 'high' },
  { key: 't2', copyKey: 'medium' },
  { key: 't3', copyKey: 'low' },
];

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF'];

export function EconomicCalendarPage({ onClose }: Props) {
  const { lang } = useLang();
  const isRTL = lang === 'he';
  const t = COPY[lang];

  const { events: rawEvents, loading } = useEconomicEvents({ hoursAhead: 30 * 24 });

  const [range, setRange] = useState<RangeKey>('today');
  const [impactFilter, setImpactFilter] = useState<'all' | EconomicImpact>('all');
  const [currencyFilter, setCurrencyFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const today = new Date();
  const activeKeys = useMemo(() => new Set(rangeKeys(range, today)), [range, today.toDateString()]);

  const allCurrencies = useMemo(() => {
    const s = new Set<string>();
    rawEvents.forEach(e => e.currency && s.add(e.currency));
    return Array.from(s).sort();
  }, [rawEvents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rawEvents.filter(e => {
      if (!activeKeys.has(istDateKey(e.release_at))) return false;
      if (impactFilter !== 'all' && e.impact !== impactFilter) return false;
      if (currencyFilter.size > 0 && (!e.currency || !currencyFilter.has(e.currency))) return false;
      if (q && !e.event_name.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => +new Date(a.release_at) - +new Date(b.release_at));
  }, [rawEvents, activeKeys, impactFilter, currencyFilter, search]);

  // Group by day for headers
  const grouped = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>();
    for (const e of filtered) {
      const k = istDateKey(e.release_at);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  function toggleCurrency(c: string) {
    setCurrencyFilter(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  }

  // Orca palette
  const BG = '#061326';
  const PANEL = '#0a1d36';
  const BORDER = 'rgba(255,255,255,0.08)';
  const BORDER_SOFT = 'rgba(255,255,255,0.05)';
  const TEXT = 'rgba(231,243,255,0.95)';
  const TEXT_MUTED = 'rgba(255,255,255,0.55)';
  const TEXT_DIM = 'rgba(255,255,255,0.35)';
  const ACCENT = '#00f2ff';

  return (
    <div
      role="region"
      aria-label={t.title}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        background: BG,
        border: `1px solid ${BORDER}`,
        fontFamily: "'Poppins', sans-serif",
        minHeight: 'calc(100vh - 140px)',
      }}
    >
      {/* Page Header */}
      <header
        className="flex items-center gap-3 px-4 md:px-6 py-4 border-b"
        style={{ borderColor: BORDER, background: PANEL }}
      >
        <CalendarIcon className="w-5 h-5" style={{ color: ACCENT }} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-semibold leading-tight" style={{ color: TEXT }}>
            {t.title}
          </h1>
          <div className="text-[11px] mt-0.5" style={{ color: TEXT_DIM }}>
            {t.subtitle}
          </div>
        </div>

        <div className="text-[11px] tabular-nums px-2.5 py-1 rounded-md" style={{
          background: 'rgba(0,242,255,0.08)',
          color: ACCENT,
          border: `1px solid rgba(0,242,255,0.18)`,
        }}>
          {filtered.length} {t.results}
        </div>
      </header>



        {/* Toolbar: range + search */}
        <div
          className="flex flex-wrap items-center gap-2 px-5 py-3 border-b"
          style={{ borderColor: BORDER_SOFT, background: 'rgba(255,255,255,0.015)' }}
        >
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {(['yesterday', 'today', 'tomorrow', 'thisWeek', 'nextWeek'] as RangeKey[]).map((r, i, arr) => {
              const active = range === r;
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-3 py-1.5 text-[12px] font-medium transition"
                  style={{
                    background: active ? ACCENT : 'transparent',
                    color: active ? '#061326' : TEXT_MUTED,
                    borderInlineEnd: i < arr.length - 1 ? `1px solid ${BORDER_SOFT}` : 'none',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {t[r]}
                </button>
              );
            })}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg min-w-[200px]"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
          >
            <Search className="w-3.5 h-3.5" style={{ color: TEXT_DIM }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="bg-transparent outline-none text-[12px] flex-1 min-w-0"
              style={{ color: TEXT }}
            />
          </div>
        </div>

        {/* Filters row */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 border-b"
          style={{ borderColor: BORDER_SOFT }}
        >
          {/* Impact */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{t.impact}:</span>
            {IMPACT_FILTERS.map(({ key, copyKey }) => {
              const active = impactFilter === key;
              const dotColor = key === 'all' ? TEXT_MUTED : MACRO_TIER_COLOR[key as EconomicImpact];
              return (
                <button
                  key={key}
                  onClick={() => setImpactFilter(key)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition"
                  style={{
                    background: active ? 'rgba(0,242,255,0.1)' : 'transparent',
                    color: active ? ACCENT : TEXT_MUTED,
                    border: `1px solid ${active ? 'rgba(0,242,255,0.3)' : BORDER}`,
                  }}
                >
                  {key !== 'all' && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
                  )}
                  {t[copyKey]}
                </button>
              );
            })}
          </div>

          {/* Currency */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: TEXT_DIM }}>{t.currency}:</span>
            {COMMON_CURRENCIES.filter(c => allCurrencies.includes(c) || c === 'USD').map(c => {
              const active = currencyFilter.has(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCurrency(c)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition"
                  style={{
                    background: active ? 'rgba(0,242,255,0.1)' : 'transparent',
                    color: active ? ACCENT : TEXT_MUTED,
                    border: `1px solid ${active ? 'rgba(0,242,255,0.3)' : BORDER}`,
                  }}
                >
                  <span>{CURRENCY_FLAG[c] ?? '🏳'}</span>
                  {c}
                </button>
              );
            })}
            {currencyFilter.size > 0 && (
              <button
                onClick={() => setCurrencyFilter(new Set())}
                className="text-[10px] underline opacity-60 hover:opacity-100"
                style={{ color: TEXT_MUTED }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          {loading && (
            <div className="text-center py-20 text-[12px]" style={{ color: TEXT_DIM }}>…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 text-[12px]" style={{ color: TEXT_DIM }}>{t.empty}</div>
          )}
          {!loading && filtered.length > 0 && (
            <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
              <thead
                className="sticky top-0 z-10"
                style={{ background: PANEL, boxShadow: `0 1px 0 ${BORDER}` }}
              >
                <tr style={{ color: TEXT_DIM }}>
                  <th className="text-start px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold w-[80px]">{t.time}</th>
                  <th className="text-start px-2 py-2.5 text-[10px] uppercase tracking-wider font-semibold w-[80px]">{t.cur}</th>
                  <th className="text-start px-2 py-2.5 text-[10px] uppercase tracking-wider font-semibold w-[60px]">{t.imp}</th>
                  <th className="text-start px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold">{t.event}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold w-[100px]">{t.actual}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold w-[100px]">{t.forecast}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold w-[100px]">{t.previous}</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([dayKey, dayEvents]) => {
                  const dayLabel = new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                  }).format(new Date(dayKey));
                  return (
                    <>
                      <tr key={`hdr-${dayKey}`}>
                        <td colSpan={7} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider"
                          style={{
                            background: 'rgba(255,255,255,0.025)',
                            color: TEXT_MUTED,
                            borderTop: `1px solid ${BORDER_SOFT}`,
                            borderBottom: `1px solid ${BORDER_SOFT}`,
                          }}
                        >
                          {dayLabel}
                        </td>
                      </tr>
                      {dayEvents.map(e => (
                        <EventRow key={e.id} e={e} lang={lang} />
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}

/* ───── Standard table row ───── */

function EventRow({ e, lang }: { e: EconomicEvent; lang: 'he' | 'en' }) {
  const surprise = e.actual ? surpriseTone(computeSurprise(e.actual, e.forecast)) : undefined;
  const actualColor =
    surprise === 'positive' ? '#10b981' :
    surprise === 'negative' ? '#f43f5e' :
    'rgba(231,243,255,0.95)';
  const flag = e.currency ? CURRENCY_FLAG[e.currency] : null;
  const tierColor = MACRO_TIER_COLOR[e.impact] ?? MACRO_TIER_COLOR.t3;
  const dots = e.impact === 't1' ? 3 : e.impact === 't2' ? 2 : 1;

  return (
    <tr
      className="transition hover:bg-white/[0.03]"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <td className="px-4 py-2.5 tabular-nums text-[12px] font-medium" style={{ color: 'rgba(231,243,255,0.85)' }}>
        {formatISTTime(e.release_at, lang)}
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-1.5">
          {flag && <span style={{ fontSize: 13 }}>{flag}</span>}
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(231,243,255,0.75)' }}>
            {e.currency}
          </span>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex gap-0.5" aria-label={`impact ${e.impact}`}>
          {[1, 2, 3].map(i => (
            <span
              key={i}
              className="w-1.5 h-3 rounded-sm"
              style={{
                background: i <= dots ? tierColor : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      </td>
      <td className="px-3 py-2.5 text-[12px]" style={{ color: 'rgba(231,243,255,0.92)' }}>
        {e.event_name}
      </td>
      <td className="px-3 py-2.5 text-end tabular-nums text-[12px] font-semibold" style={{ color: actualColor }}>
        {e.actual || <span className="opacity-30">—</span>}
      </td>
      <td className="px-3 py-2.5 text-end tabular-nums text-[12px]" style={{ color: 'rgba(231,243,255,0.6)' }}>
        {e.forecast || <span className="opacity-30">—</span>}
      </td>
      <td className="px-3 py-2.5 text-end tabular-nums text-[12px]" style={{ color: 'rgba(231,243,255,0.45)' }}>
        {e.previous || <span className="opacity-30">—</span>}
      </td>
    </tr>
  );
}
