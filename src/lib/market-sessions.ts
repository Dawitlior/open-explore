/**
 * Market sessions (Asia / London / New York) — read-time attribution.
 *
 * Rules (see the calendar spec):
 *  • A trade belongs to the session(s) that were open at its ENTRY instant.
 *  • Sessions are a property of the market, never of the viewer. Windows are
 *    evaluated against each market's own IANA timezone (Asia/Tokyo,
 *    Europe/London, America/New_York) so DST boundaries move correctly and a
 *    trade shows the same label in Tel Aviv and in New York.
 *  • Nothing here is persisted: attribution is derived on read.
 *
 * Canonical windows, expressed in each market's LOCAL time (08:00–17:00 local):
 *   Asia/Tokyo        08:00 → 17:00 JST  (no DST) → 23:00–08:00 UTC year-round
 *   Europe/London     08:00 → 17:00      → 07:00–16:00 UTC (BST) / 08:00–17:00 UTC (GMT)
 *   America/New_York  08:00 → 17:00      → 12:00–21:00 UTC (EDT) / 13:00–22:00 UTC (EST)
 * London/NY overlap: 12:00–16:00 UTC (summer) / 13:00–17:00 UTC (winter).
 */
import type { Trade } from '@/data/trades';

export type SessionId = 'asia' | 'london' | 'ny';

export interface SessionDef {
  id: SessionId;
  short: string;
  labelEn: string;
  labelHe: string;
  /** IANA timezone the window is evaluated in. */
  tz: string;
  /** Market-local hour range [start, end) — wraps midnight when start > end. */
  startLocal: number;
  endLocal: number;
}

export const SESSIONS: SessionDef[] = [
  { id: 'asia', short: 'AS', labelEn: 'Asia', labelHe: 'אסיה', tz: 'Asia/Tokyo', startLocal: 8, endLocal: 17 },
  { id: 'london', short: 'LDN', labelEn: 'London', labelHe: 'לונדון', tz: 'Europe/London', startLocal: 8, endLocal: 17 },
  { id: 'ny', short: 'NY', labelEn: 'New York', labelHe: 'ניו יורק', tz: 'America/New_York', startLocal: 8, endLocal: 17 },
];

export const SESSION_BY_ID: Record<SessionId, SessionDef> =
  SESSIONS.reduce((acc, s) => { acc[s.id] = s; return acc; }, {} as Record<SessionId, SessionDef>);

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function hourIn(tz: string, at: Date): number {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false });
    fmtCache.set(tz, f);
  }
  return parseInt(f.format(at), 10) % 24;
}

function inWindow(hour: number, s: SessionDef): boolean {
  return s.startLocal <= s.endLocal
    ? hour >= s.startLocal && hour < s.endLocal
    : hour >= s.startLocal || hour < s.endLocal;
}

/**
 * Entry instant of a trade, as an absolute UTC point.
 * Naive strings (no offset) are read as UTC so every viewer resolves the same
 * instant — local parsing would give each timezone a different session.
 */
export function tradeEntryInstant(tr: Trade): Date | null {
  const raw = String(
    (tr as any).entryTime || (tr as any).openTime || (tr as any).opened_at || tr.date || '',
  ).trim();
  if (!raw) return null;
  // Date-only values carry no session information.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const iso = raw.replace(' ', 'T');
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Sessions open at a trade's entry instant (a trade can sit in an overlap). */
export function sessionsForTrade(tr: Trade): SessionId[] {
  const at = tradeEntryInstant(tr);
  if (!at) return [];
  return SESSIONS.filter(s => inWindow(hourIn(s.tz, at), s)).map(s => s.id);
}

export function sessionShorts(tr: Trade): string[] {
  return sessionsForTrade(tr).map(id => SESSION_BY_ID[id].short);
}

export interface DaySessionStat {
  sessions: Set<SessionId>;
  counts: Record<SessionId, number>;
}

const emptyCounts = (): Record<SessionId, number> => ({ asia: 0, london: 0, ny: 0 });

/** Aggregate the sessions active for a set of same-day trades (each once). */
export function sessionsForDay(dayTrades: Trade[]): DaySessionStat {
  const counts = emptyCounts();
  const sessions = new Set<SessionId>();
  for (const tr of dayTrades) {
    for (const id of sessionsForTrade(tr)) {
      counts[id] += 1;
      sessions.add(id);
    }
  }
  return { sessions, counts };
}
