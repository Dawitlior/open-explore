// Close-days are decoupled from week-start. Default [5,6] reproduces the
// legacy isCloseWeekAllowed() byte-exact for every day-of-week.

import { describe, it, expect } from 'vitest';
import { isCloseWeekAllowed, DEFAULT_CLOSE_DAYS } from '../week-key';

describe('isCloseWeekAllowed default [5,6] matches legacy Fri/Sat behavior', () => {
  // Sun 8 Jun 2025 .. Sat 14 Jun 2025
  const week: { dow: number; allowed: boolean }[] = [
    { dow: 0, allowed: false }, // Sun
    { dow: 1, allowed: false }, // Mon
    { dow: 2, allowed: false }, // Tue
    { dow: 3, allowed: false }, // Wed
    { dow: 4, allowed: false }, // Thu
    { dow: 5, allowed: true  }, // Fri
    { dow: 6, allowed: true  }, // Sat
  ];
  week.forEach(({ dow, allowed }) => {
    it(`dow=${dow} → ${allowed ? 'allowed' : 'blocked'}`, () => {
      const d = new Date(2025, 5, 8 + dow);
      expect(d.getDay()).toBe(dow);
      expect(isCloseWeekAllowed(d)).toBe(allowed);
    });
  });

  it('default array is [5,6]', () => {
    expect(Array.from(DEFAULT_CLOSE_DAYS)).toEqual([5, 6]);
  });

  it('respects custom close-days', () => {
    const sun = new Date(2025, 5, 8); // Sun
    expect(isCloseWeekAllowed(sun, [0])).toBe(true);
    expect(isCloseWeekAllowed(sun, [5, 6])).toBe(false);
  });
});
