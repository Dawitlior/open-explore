// WE-1 proof: the badge's previously-duplicated ISO algorithm and the canonical
// isoWeekKey() produce identical YYYY-Www strings across boundary dates.
// If this ever fails, the duplication has been reintroduced somewhere.

import { describe, it, expect } from 'vitest';
import { isoWeekKey } from '../week-key';

// Verbatim copy of the algorithm previously inlined at Index.tsx:580-586.
// Kept here only for the equality proof — must NEVER be reintroduced into app code.
function legacyBadgeWeekKey(now: Date): string {
  const tmp = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${weekNo < 10 ? '0' : ''}${weekNo}`;
}

describe('WE-1 · week-key unification', () => {
  const boundaryDates: string[] = [
    // late Sunday / early Monday
    '2025-06-22T23:30:00', '2025-06-23T00:30:00',
    // mid-week samples
    '2025-06-26T12:00:00', // Thu
    '2025-06-27T12:00:00', // Fri
    '2025-06-28T12:00:00', // Sat
    // ISO year-boundary crossings
    '2024-12-29T12:00:00', '2024-12-30T12:00:00', '2024-12-31T12:00:00',
    '2025-01-01T12:00:00', '2025-01-02T12:00:00', '2025-01-05T12:00:00',
    '2025-12-28T12:00:00', '2025-12-29T12:00:00', '2025-12-31T12:00:00',
    '2026-01-01T12:00:00', '2026-01-04T12:00:00', '2026-01-05T12:00:00',
    // a Saturday that belongs to next ISO week numbering
    '2027-01-02T12:00:00',
  ];

  for (const iso of boundaryDates) {
    it(`agrees on ${iso}`, () => {
      const d = new Date(iso);
      expect(isoWeekKey(d)).toBe(legacyBadgeWeekKey(d));
    });
  }
});
