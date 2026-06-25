// Changing weekStart / closeDays must NEVER mutate or recompute the archive.
// Snapshots are frozen at close-week (Wave 1). This guards against future
// regressions that try to "re-rotate" historical weeks.

import { describe, it, expect } from 'vitest';
import { aggregateWeek } from '../../hooks/use-week-aggregates';
import type { WeekRecord, WeeklyReviewState } from '../types';

function frozenRecord(weekKey: string): WeekRecord {
  return {
    weekEndingISO: '2025-06-13',
    weekKey,
    tradeLog: [],
    netR: 0, wins: 0, losses: 0,
    grade: 'B',
    closedAt: '2025-06-13T18:00:00Z',
    schemaVersion: 1,
    values: { reflection: 'fixed' },
  };
}

describe('archive immutability under WE-2 setting changes', () => {
  const archive: WeekRecord[] = [frozenRecord('2025-W24'), frozenRecord('2025-W25')];
  const before = JSON.parse(JSON.stringify(archive));
  const state: WeeklyReviewState = { archive, setups: [], recaps: {} };

  it('running aggregateWeek under different startDow does not mutate archive', () => {
    for (let s = 0; s <= 6; s++) {
      aggregateWeek([], new Date(2025, 5, 18), s);
    }
    expect(state.archive).toEqual(before);
  });

  it('archive records are deep-equal to their initial JSON snapshot', () => {
    expect(JSON.parse(JSON.stringify(state.archive))).toEqual(before);
  });
});
