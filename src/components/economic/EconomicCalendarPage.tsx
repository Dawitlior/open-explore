import { useMemo, useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import { useEconomicEvents } from '@/hooks/use-economic-events';
import { useLang } from '@/hooks/use-lang';
import { formatISTTime, computeSurprise, surpriseTone } from '@/lib/economic';
import type { EconomicEvent } from '@/lib/economic';
import { CURRENCY_FLAG } from './MacroEventStrip';

/* ─────────────────────────────────────────────────────────────
 * Pure Signal Economic Radar
 *   • Hard filter: USD + JPY only, T1 (Critical) only
 *   • Mac-OS / Glass-Tech aesthetic
 *   • Left: chronological event feed for selected day
 *   • Right: mini-calendar + live countdown widgets
 * ───────────────────────────────────────────────────────────── */

const COPY = {
  he: {
    title: 'טרמינל מאקרו',
    subtitle: 'כל הדיווחים · כל האזורים · כל הרמות',
    close: 'סגור',
    today: 'היום',
    selected: 'יום נבחר',
    feed: 'אירועים',
    empty: 'אין אירועי מאקרו ביום זה',
    upcoming: 'קאונטדאון לאירוע הבא',
    noUpcoming: 'אין אירועים בטווח הקרוב',
    actual: 'בפועל',
    forecast: 'תחזית',
    previous: 'קודם',
    live: 'משודר',
    inMin: 'בעוד',
    minShort: 'דק׳',
    hourShort: 'שע׳',
    daysShort: 'ימ׳',
    nowLabel: 'עכשיו',
    weekdays: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
  },
  en: {
    title: 'Macro Terminal',
    subtitle: 'All releases · All regions · All tiers',
    close: 'Close',
    today: 'Today',
    selected: 'Selected',
    feed: 'Events',
    empty: 'No macro events on this day',
    upcoming: 'Next Release Countdown',
    noUpcoming: 'No events in the near horizon',

    actual: 'Actual',
    forecast: 'Forecast',
    previous: 'Previous',
    live: 'LIVE',
    inMin: 'in',
    minShort: 'm',
    hourShort: 'h',
    daysShort: 'd',
    nowLabel: 'Now',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
} as const;

// Radar Terminal — unfiltered: every region, every impact tier.
const IST_TZ = 'Asia/Jerusalem';

function istDateKey(d: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(d));
}

function buildMonthGrid(year: number, month: number): Array<{ day: number; key: string; current: boolean }> {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; key: string; current: boolean }> = [];

  // Leading days from prev month
  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevDays - i);
    cells.push({ day: d.getDate(), key: istDateKey(d), current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ day: d, key: istDateKey(dt), current: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const overflow = cells.length - (startOffset + daysInMonth) + 1;
    const dt = new Date(year, month + 1, overflow);
    cells.push({ day: dt.getDate(), key: istDateKey(dt), current: false });
    if (cells.length >= 42) break;
  }
  return cells;
}

function useTick(intervalMs = 1000): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}

function formatCountdown(ms: number, t: (typeof COPY)[keyof typeof COPY]): string {
  if (ms <= 0) return t.live;
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const secs = Math.floor((ms % 60_000) / 1000);
  if (days > 0) return `${days}${t.daysShort} ${hours}${t.hourShort}`;
  if (hours > 0) return `${hours}${t.hourShort} ${mins.toString().padStart(2, '0')}${t.minShort}`;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface Props { onClose: () => void; }

export function EconomicCalendarPage({ onClose }: Props) {
  const { lang } = useLang();
  const isRTL = lang === 'he';
  const t = COPY[lang];

  // 30-day horizon, T1 only — minimal payload reaches the client
  const { events: rawEvents, loading } = useEconomicEvents({ hoursAhead: 30 * 24, impacts: ['t1'] });

  // Defensive client-side filter: USD + JPY only
  const events = useMemo<EconomicEvent[]>(
    () => rawEvents.filter((e) => e.currency && CURRENCY_FILTER.includes(e.currency.toUpperCase() as 'USD' | 'JPY')),
    [rawEvents],
  );

  // Group events by IST day key
  const eventsByDay = useMemo(() => {
    const m = new Map<string, EconomicEvent[]>();
    for (const e of events) {
      const k = istDateKey(e.release_at);
      const list = m.get(k) ?? [];
      list.push(e);
      m.set(k, list);
    }
    for (const list of m.values()) list.sort((a, b) => +new Date(a.release_at) - +new Date(b.release_at));
    return m;
  }, [events]);

  // Calendar navigation state
  const today = new Date();
  const todayKey = istDateKey(today);
  const [cursor, setCursor] = useState<{ y: number; m: number }>({ y: today.getFullYear(), m: today.getMonth() });
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const grid = useMemo(() => buildMonthGrid(cursor.y, cursor.m), [cursor]);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const now = useTick(1000);
  const upcoming = useMemo(
    () => events.filter((e) => +new Date(e.release_at) > now - 60_000).slice(0, 4),
    [events, now],
  );

  const monthLabel = new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
    month: 'long', year: 'numeric',
  }).format(new Date(cursor.y, cursor.m, 1));

  function goPrevMonth() {
    setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  }
  function goNextMonth() {
    setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));
  }
  function goToday() {
    setCursor({ y: today.getFullYear(), m: today.getMonth() });
    setSelectedKey(todayKey);
  }

  const selectedLabel = new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).format(new Date(selectedKey));

  return (
    <div
      role="dialog"
      aria-label={t.title}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[150]"
      style={{
        background: 'radial-gradient(circle at 30% 20%, rgba(0,242,255,0.06), transparent 50%), rgba(4,12,24,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        className="absolute inset-2 md:inset-6 rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(10,22,40,0.85) 0%, rgba(6,15,30,0.88) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,242,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* macOS-style header */}
        <header
          className="flex items-center gap-3 px-5 py-3 border-b"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent)',
          }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 me-1">
            <button
              onClick={onClose}
              aria-label={t.close}
              className="w-3 h-3 rounded-full transition-all"
              style={{ background: '#ff5f57', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.2)' }}
            />
            <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.2)' }} />
            <span className="w-3 h-3 rounded-full" style={{ background: '#28c840', boxShadow: '0 0 0 0.5px rgba(0,0,0,0.2)' }} />
          </div>

          <div className="flex-1 min-w-0 text-center">
            <h1
              className="text-[13px] font-semibold tracking-wide truncate"
              style={{ color: 'rgba(231,243,255,0.92)', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {t.title}
            </h1>
            <div className="text-[10px] uppercase tracking-[0.18em] mt-0.5" style={{ color: 'rgba(0,242,255,0.55)' }}>
              {t.subtitle}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" style={{ color: 'rgba(0,242,255,0.7)' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00f2ff', boxShadow: '0 0 8px #00f2ff' }} />
          </div>

          <button
            onClick={onClose}
            aria-label={t.close}
            className="md:hidden p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 grid gap-4 p-4 md:p-5 overflow-hidden" style={{ gridTemplateColumns: 'minmax(0,1fr)', gridAutoRows: '1fr' }}>
          <div className="grid gap-4 h-full overflow-hidden" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px' }}>

            {/* LEFT — Events feed */}
            <section
              className="rounded-xl flex flex-col overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {selectedKey === todayKey ? t.today : t.selected}
                  </div>
                  <div
                    className="text-sm font-semibold mt-0.5 truncate"
                    style={{ color: 'rgba(231,243,255,0.95)', fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {selectedLabel}
                  </div>
                </div>
                <div
                  className="text-[10px] px-2 py-1 rounded-md font-bold tabular-nums"
                  style={{
                    background: selectedEvents.length > 0 ? 'rgba(244,63,94,0.12)' : 'rgba(255,255,255,0.04)',
                    color: selectedEvents.length > 0 ? '#fda4af' : 'rgba(255,255,255,0.35)',
                    border: `1px solid ${selectedEvents.length > 0 ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {selectedEvents.length} {t.feed}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading && (
                  <div className="text-center py-16 text-white/30 text-xs">…</div>
                )}
                {!loading && selectedEvents.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-16">
                    <AlertCircle className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.18)' }} />
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.empty}</div>
                  </div>
                )}
                {!loading && selectedEvents.map((e) => (
                  <EventRow key={e.id} e={e} lang={lang} now={now} />
                ))}
              </div>
            </section>

            {/* RIGHT — Mini calendar + countdowns */}
            <aside className="flex flex-col gap-4 min-h-0 overflow-hidden">
              {/* Mini calendar */}
              <div
                className="rounded-xl overflow-hidden flex-shrink-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <button onClick={goPrevMonth} className="p-1 rounded text-white/50 hover:text-white hover:bg-white/5">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={goToday}
                    className="text-[11px] font-semibold tracking-wide px-2 py-1 rounded hover:bg-white/5 transition"
                    style={{ color: 'rgba(231,243,255,0.9)', fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {monthLabel}
                  </button>
                  <button onClick={goNextMonth} className="p-1 rounded text-white/50 hover:text-white hover:bg-white/5">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 px-2 pt-2" style={{ gap: 2 }}>
                  {t.weekdays.map((w, i) => (
                    <div key={i} className="text-center text-[9px] font-bold uppercase tracking-wider py-1" style={{ color: 'rgba(255,255,255,0.28)' }}>
                      {w}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 px-2 pb-3" style={{ gap: 2 }}>
                  {grid.map((cell, i) => {
                    const has = (eventsByDay.get(cell.key)?.length ?? 0) > 0;
                    const isToday = cell.key === todayKey;
                    const isSelected = cell.key === selectedKey;
                    return (
                      <button
                        key={`${cell.key}-${i}`}
                        onClick={() => setSelectedKey(cell.key)}
                        className="relative aspect-square flex items-center justify-center text-[11px] rounded-md transition-all"
                        style={{
                          color: isSelected
                            ? '#061326'
                            : isToday
                              ? '#00f2ff'
                              : cell.current
                                ? 'rgba(231,243,255,0.78)'
                                : 'rgba(255,255,255,0.18)',
                          background: isSelected
                            ? 'linear-gradient(180deg, #00f2ff, #00b8c4)'
                            : isToday
                              ? 'rgba(0,242,255,0.08)'
                              : 'transparent',
                          border: isToday && !isSelected ? '1px solid rgba(0,242,255,0.4)' : '1px solid transparent',
                          boxShadow: isSelected
                            ? '0 4px 14px rgba(0,242,255,0.35), inset 0 1px 0 rgba(255,255,255,0.4)'
                            : isToday
                              ? '0 0 12px rgba(0,242,255,0.25)'
                              : 'none',
                          fontWeight: isSelected || isToday ? 700 : 500,
                          fontFamily: "'IBM Plex Mono', monospace",
                          cursor: 'pointer',
                        }}
                      >
                        {cell.day}
                        {has && !isSelected && (
                          <span
                            className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                            style={{ background: '#f43f5e', boxShadow: '0 0 6px rgba(244,63,94,0.7)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Countdown widgets */}
              <div
                className="rounded-xl overflow-hidden flex-1 flex flex-col min-h-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {t.upcoming}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {upcoming.length === 0 && (
                    <div className="text-[11px] text-center py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {t.noUpcoming}
                    </div>
                  )}
                  {upcoming.map((e) => (
                    <CountdownWidget key={e.id} e={e} now={now} t={t} />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Event Row (left column) ───── */

function EventRow({ e, lang, now }: { e: EconomicEvent; lang: 'he' | 'en'; now: number }) {
  const release = +new Date(e.release_at);
  const past = release < now - 60_000;
  const live = !past && release < now + 60_000;
  const surprise = past ? surpriseTone(computeSurprise(e.actual, e.forecast)) : undefined;
  const actualColor =
    surprise === 'positive' ? '#10b981' :
    surprise === 'negative' ? '#f43f5e' :
    'rgba(231,243,255,0.9)';
  const flag = e.currency ? CURRENCY_FLAG[e.currency] : null;

  return (
    <div
      className="grid items-center px-4 py-3 border-b transition hover:bg-white/[0.025]"
      style={{
        gridTemplateColumns: '64px 1fr auto',
        borderColor: 'rgba(255,255,255,0.04)',
        opacity: past ? 0.55 : 1,
      }}
    >
      <div className="flex flex-col items-start gap-0.5">
        <div
          className="text-[12px] font-bold tabular-nums"
          style={{ color: live ? '#00f2ff' : 'rgba(231,243,255,0.85)', fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {formatISTTime(e.release_at, lang)}
        </div>
        <div className="flex items-center gap-1">
          {flag && <span style={{ fontSize: 12 }}>{flag}</span>}
          <span
            className="text-[9px] font-bold tracking-wider"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {e.currency}
          </span>
        </div>
      </div>

      <div className="min-w-0 px-2">
        <div
          className="text-[13px] font-semibold truncate"
          style={{ color: 'rgba(231,243,255,0.95)' }}
          title={e.event_name}
        >
          {e.event_name}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[10px] tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>
            <span className="opacity-60 me-1">F</span>{e.forecast || '—'}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>
            <span className="opacity-60 me-1">P</span>{e.previous || '—'}
          </span>
        </div>
      </div>

      <div className="text-end ps-2">
        <div
          className="text-[14px] font-bold tabular-nums"
          style={{ color: actualColor, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {e.actual || <span className="opacity-30">—</span>}
        </div>
        {live && (
          <div
            className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase animate-pulse"
            style={{ background: 'rgba(0,242,255,0.15)', color: '#00f2ff' }}
          >
            LIVE
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Countdown Widget (right column) ───── */

function CountdownWidget({ e, now, t }: { e: EconomicEvent; now: number; t: (typeof COPY)[keyof typeof COPY] }) {
  const release = +new Date(e.release_at);
  const ms = release - now;
  const imminent = ms > 0 && ms < 15 * 60_000;
  const live = ms <= 60_000 && ms > -60_000;
  const flag = e.currency ? CURRENCY_FLAG[e.currency] : null;

  return (
    <div
      className="rounded-lg px-3 py-2.5 transition"
      style={{
        background: live
          ? 'linear-gradient(135deg, rgba(0,242,255,0.12), rgba(0,242,255,0.04))'
          : imminent
            ? 'linear-gradient(135deg, rgba(244,63,94,0.1), rgba(244,63,94,0.02))'
            : 'rgba(255,255,255,0.025)',
        border: `1px solid ${live ? 'rgba(0,242,255,0.3)' : imminent ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.05)'}`,
        boxShadow: live ? '0 0 16px rgba(0,242,255,0.15)' : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {flag && <span style={{ fontSize: 11 }}>{flag}</span>}
          <span
            className="text-[9px] font-bold tracking-wider"
            style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {e.currency}
          </span>
        </div>
        <div
          className="text-[10px] tabular-nums"
          style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {formatISTTime(e.release_at, 'en')}
        </div>
      </div>
      <div
        className="text-[11px] font-semibold truncate mb-1.5"
        style={{ color: 'rgba(231,243,255,0.92)' }}
        title={e.event_name}
      >
        {e.event_name}
      </div>
      <div
        className="text-[18px] font-bold tabular-nums tracking-tight"
        style={{
          color: live ? '#00f2ff' : imminent ? '#fda4af' : 'rgba(231,243,255,0.85)',
          fontFamily: "'IBM Plex Mono', monospace",
          textShadow: live ? '0 0 12px rgba(0,242,255,0.5)' : 'none',
        }}
      >
        {formatCountdown(ms, t)}
      </div>
    </div>
  );
}
