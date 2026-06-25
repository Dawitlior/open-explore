// User-required invariant: under Monday default, userWeekKey === isoWeekKey
// for every date — proving the historical archive (keyed on isoWeekKey)
// lines up byte-exact with the new WE-2 resolver. If this ever fails the
// migration is unsafe; stop and reconcile before shipping.

import { describe, it, expect } from 'vitest';
import { isoWeekKey, userWeekKey } from '../week-key';

describe('userWeekKey(d, 1) === isoWeekKey(d) — Monday-default invariant', () => {
  const dates: Date[] = [];

  // ISO year boundary 2024→2025 (W01 starts Mon 30 Dec 2024).
  for (let day = 30; day <= 31; day++) dates.push(new Date(2024, 11, day));
  for (let day = 1;  day <= 5;  day++) dates.push(new Date(2025, 0,  day));

  // ISO year boundary 2025→2026.
  for (let day = 29; day <= 31; day++) dates.push(new Date(2025, 11, day));
  for (let day = 1;  day <= 4;  day++) dates.push(new Date(2026, 0,  day));

  // Sample one date in every month of 2025 + 2026 covering all DoWs.
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= 28; d++) dates.push(new Date(2025, m, d));
  }
  for (let m = 0; m < 12; m++) {
    for (let d = 1; d <= 28; d++) dates.push(new Date(2026, m, d));
  }

  it.each(dates)('matches on %s', (d) => {
    expect(userWeekKey(d, 1)).toBe(isoWeekKey(d));
  });
});
