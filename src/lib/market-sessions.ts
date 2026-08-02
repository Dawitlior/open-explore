/**
 * Market sessions (Asia / London / New York).
 *
 * Trades are bucketed into the FX/crypto "big three" sessions by their
 * execution time (UTC). A day can carry several sessions; overlaps are
 * intentional (London/NY overlap 12:00–16:00 UTC).
 *
 * Windows are UTC hours, [start, end):
 *   Asia    23:00 → 08:00  (Tokyo/Sydney, wraps midnight)
 *   London  07:00 → 16:00
 *   NY      12:00 → 21:00
 */
import type { Trade } from '@/data/trades';

export type SessionId = 'asia' | 'london' | 'ny';

export interface SessionDef {
  id: SessionId;
  short: string;
  labelEn: string;
  labelHe: string;
  /** UTC hour range [start, end) — wraps midnight when start > end. */
  startUtc: number;
  endUtc: number;
  /** Hue used for the marker; kept theme-neutral (works on light + dark). */
  color: string;
}

export const SESSIONS: SessionDef[] = [
  { id: 'asia', short: 'AS', labelEn: 'Asia', labelHe: 'אסיה', startUtc: 23, endUtc: 8, color: '#F0B429' },
  { id: 'london', short: 'LDN', labelEn: 'London', labelHe: 'לונדון', startUtc: 7, endUtc: 16, color: '#4C8DFF' },
  { id: 'ny', short: 'NY', labelEn: 'New York', labelHe: 'ניו יורק', startUtc: 12, endUtc: 21, color: '#3DDC97' },
];

export const SESSION_BY_ID: Record<SessionId, SessionDef> =
  SESSIONS.reduce((acc, s) => { acc[s.id] = s; return acc; }, {} as Record<SessionId, SessionDef>);

function inWindow(hour: number, s: SessionDef): boolean {
  return s.startUtc <= s.endUtc
    ? hour >= s.startUtc && hour < s.endUtc
    : hour >= s.startUtc || hour < s.endUtc;
}

/** Best-effort timestamp for a trade — prefers the entry/open time. */
function tradeTime(tr: Trade): Date | null {
  const raw =
    (tr as any).entryTime || (tr as any).openTime || (tr as any).opened_at ||
    (tr as any).exitTime || (tr as any).closed_at || tr.date;
  if (!raw) return null;
  const d = new Date(String(raw).replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/** Sessions touched by a single trade (a trade can sit in an overlap). */
export function sessionsForTrade(tr: Trade): SessionId[] {
  const d = tradeTime(tr);
  if (!d) return [];
  // Skip date-only values (midnight UTC with no time component) — they carry
  // no session information and would falsely light up Asia.
  const raw = String((tr as any).entryTime || (tr as any).openTime || (tr as any).opened_at || tr.date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return [];
  const h = d.getUTCHours();
  return SESSIONS.filter(s => inWindow(h, s)).map(s => s.id);
}

export interface DaySessionStat {
  sessions: Set<SessionId>;
  counts: Record<SessionId, number>;
}

const emptyCounts = (): Record<SessionId, number> => ({ asia: 0, london: 0, ny: 0 });

/** Aggregate the sessions active for a set of same-day trades. */
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

/**
 * Build a day-of-month → session stat map for one calendar month.
 * `getDate` lets callers reuse whichever date parser they already have.
 */
export function buildMonthSessionMap(
  trades: Trade[],
  year: number,
  month: number,
  parse: (tr: Trade) => Date | null,
): Map<number, DaySessionStat> {
  const map = new Map<number, DaySessionStat>();
  for (const tr of trades) {
    const d = parse(tr);
    if (!d || d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = d.getDate();
    let entry = map.get(key);
    if (!entry) { entry = { sessions: new Set(), counts: emptyCounts() }; map.set(key, entry); }
    for (const id of sessionsForTrade(tr)) {
      entry.counts[id] += 1;
      entry.sessions.add(id);
    }
  }
  return map;
}
