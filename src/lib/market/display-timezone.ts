/**
 * One source of truth for how the trade dossier renders time.
 *
 * Timestamps are never mutated: candles stay UTC epoch seconds in state and in
 * every request. The timezone is applied at *format* time only.
 *
 * The zone is stored as an IANA name (never a numeric offset — offsets break at
 * DST boundaries) in localStorage, defaulting to the browser's detected zone.
 */
import { useEffect, useState } from 'react';

const KEY = 'orca:displayTimeZone';
const EVT = 'orca:timezone-change';

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch { return 'UTC'; }
}

function isValidZone(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
}

/** Saved profile timezone → browser zone → UTC. */
export function resolveDisplayTimeZone(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && isValidZone(saved)) return saved;
  } catch { /* storage disabled */ }
  const b = browserZone();
  return isValidZone(b) ? b : 'UTC';
}

export function setDisplayTimeZone(tz: string | null) {
  try {
    if (!tz) localStorage.removeItem(KEY);
    else if (isValidZone(tz)) localStorage.setItem(KEY, tz);
  } catch { /* storage disabled */ }
  try { window.dispatchEvent(new CustomEvent(EVT)); } catch { /* noop */ }
}

/** Live-updating zone: changing the profile zone re-renders without a reload. */
export function useDisplayTimeZone(): string {
  const [tz, setTz] = useState(resolveDisplayTimeZone);
  useEffect(() => {
    const sync = () => setTz(resolveDisplayTimeZone());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return tz;
}

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(locale: string, tz: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${locale}|${tz}|${JSON.stringify(opts)}`;
  let f = cache.get(k);
  if (!f) {
    try { f = new Intl.DateTimeFormat(locale, { ...opts, timeZone: tz }); }
    catch { f = new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }); }
    cache.set(k, f);
  }
  return f;
}

/** `14:45` in the resolved zone. `ms` is a real epoch value — untouched. */
export function formatTimeInZone(ms: number, tz: string, locale = 'en-GB'): string {
  return fmt(locale, tz, { hour: '2-digit', minute: '2-digit', hour12: false }).format(ms);
}

/** `14 Aug 14:45` — axis tick marks and crosshair. */
export function formatDateTimeInZone(ms: number, tz: string, locale = 'en-GB', withDate = true): string {
  return fmt(locale, tz, withDate
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
    : { hour: '2-digit', minute: '2-digit', hour12: false }).format(ms);
}

/** `14 Aug` — day-level tick marks. */
export function formatDayInZone(ms: number, tz: string, locale = 'en-GB'): string {
  return fmt(locale, tz, { day: '2-digit', month: 'short' }).format(ms);
}

/** `Friday, August 14 · 14:45` for the dossier header. */
export function formatHeaderInZone(ms: number, tz: string, locale: string): string {
  const d = fmt(locale, tz, { weekday: 'long', month: 'long', day: 'numeric' }).format(ms);
  return `${d} · ${formatTimeInZone(ms, tz, locale)}`;
}

/** `UTC+3` for the active zone at that instant (DST-correct). */
export function zoneOffsetLabel(ms: number, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(ms);
    const name = parts.find(p => p.type === 'timeZoneName')?.value;
    if (name) return name.replace('GMT', 'UTC').replace(/^UTC$/, 'UTC+0');
  } catch { /* fall through */ }
  return 'UTC';
}
