// ISO-week helpers + Friday-lock rule for close-week.
// Pure, dependency-free. Unit-testable.

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

/** Friday (local) of the week containing `d`. Used as `weekEndingISO`. */
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

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Parse a trade row's date field (YYYY-MM-DD or YYYY-MM-DD HH:mm). */
export function parseTradeDate(s: string | undefined): Date | null {
  if (!s) return null;
  const t = Date.parse(s.length <= 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  return Number.isFinite(t) ? new Date(t) : null;
}
