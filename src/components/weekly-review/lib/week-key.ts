// ISO-week helpers + close-week rule (Wave-2 WE-2).
// Pure, dependency-free. Unit-testable.
//
// WE-2 single-source-of-truth: the week window AND the week key derive from
// the SAME boundary for every startDow. There is no carve-out: under Monday
// default the slice is Mon..Sun, the key is anchored on the Thursday of that
// span (so userWeekKey(d, 1) === isoWeekKey(d) for every date — proven in
// weekkey-default-equivalence.test.ts).
//
// Historical archive entries are NOT recomputed — they are frozen in
// `schemaSnapshot` + `values` on WeekRecord (Wave-1). Nothing here pins.

export function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }

/** Returns ISO week-numbering year + week as "YYYY-Www". */
export function isoWeekKey(d: Date): string {
  // Algorithm: Thursday of the same ISO week determines the year.
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${pad2(weekNo)}`;
}

/** Friday (local) of the week containing `d`. Used as `weekEndingISO` in
 *  legacy code-paths that pre-date WE-2. */
export function fridayOf(d: Date): Date {
  const out = new Date(d);
  const dow = out.getDay(); // 0=Sun … 5=Fri
  const diff = 5 - dow;     // negative on Sat
  out.setDate(out.getDate() + diff);
  out.setHours(23, 59, 59, 999);
  return out;
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function isFriday(d: Date = new Date()): boolean {
  return d.getDay() === 5;
}

// ── WE-2 user-week resolver ────────────────────────────────────────────────

/** Start-of-day for the most-recent occurrence of `startDow` (0=Sun..6=Sat) at or before `d`. */
export function startOfUserWeek(d: Date, startDow = 1): Date {
  const out = new Date(d);
  const dow = out.getDay();
  const diff = (dow - startDow + 7) % 7;
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** End of the user's 7-day week (start + 6 days, 23:59:59.999). */
export function endOfUserWeek(d: Date, startDow = 1): Date {
  const start = startOfUserWeek(d, startDow);
  const out = new Date(start);
  out.setDate(out.getDate() + 6);
  out.setHours(23, 59, 59, 999);
  return out;
}

/**
 * Stable "YYYY-Www" key for the user's week containing `d`.
 *
 * Anchored on `start + 3` (the user's "Thursday-equivalent"). For Monday
 * default (startDow=1) this is the canonical ISO Thursday → identical to
 * `isoWeekKey(d)` for every date (locked by weekkey-default-equivalence test).
 */
export function userWeekKey(d: Date, startDow = 1): string {
  const start = startOfUserWeek(d, startDow);
  const anchor = new Date(start);
  anchor.setDate(anchor.getDate() + 3);
  return isoWeekKey(anchor);
}

// ── Close-week rule (decoupled from week-start) ────────────────────────────

/** Default close-days: Friday + Saturday. Reproduces today's byte-exact behavior. */
export const DEFAULT_CLOSE_DAYS: readonly number[] = [5, 6];

/**
 * Close-week is allowed when `d.getDay()` ∈ closeDays. Decoupled from the
 * week-start setting — a Monday-default user with default closeDays sees
 * the same Fri/Sat window they always had. Users who change the week-start
 * configure close-days explicitly (WE-2 picker).
 */
export function isCloseWeekAllowed(
  d: Date = new Date(),
  closeDays: readonly number[] = DEFAULT_CLOSE_DAYS,
): boolean {
  return closeDays.includes(d.getDay());
}

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Parse a trade row's date field (YYYY-MM-DD or YYYY-MM-DD HH:mm). */
export function parseTradeDate(s: string | undefined): Date | null {
  if (!s) return null;
  const t = Date.parse(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  return Number.isFinite(t) ? new Date(t) : null;
}

/** Returns true when a week-start (or close-days) change would re-key the user's current draft. */
export function wouldRekey(beforeKey: string, afterKey: string): boolean {
  return beforeKey !== afterKey;
}
