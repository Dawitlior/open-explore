// Wave-0 grade parity fixtures.
//
// Per Wave-0 sign-off: thresholds are NOT hardcoded from the (confirmed-
// unreliable) technical report. Instead we use `gradeWeek` itself as the
// oracle over a netR × execScore matrix, then assert two structural
// invariants that the schema-renderer's `score` block must preserve once
// it ships:
//   1. Monotonicity in netR at fixed execScore (worse netR never improves
//      the grade).
//   2. wins / losses are DEAD INPUTS — mutating them cannot change the
//      resulting grade for any fixture row.

import { describe, it, expect } from 'vitest';
import { gradeWeek, type GradeInput } from '../grading';

const NET_R = [-3, -2, -1, 0, 0.5, 1, 2, 3, 4, 5, 6];
const EXEC_SCORE = [0, 50, 70, 80, 90, 100];

const GRADE_ORDER = ['F', 'D', 'C', 'B', 'A', 'A+'] as const;
const rank = (g: ReturnType<typeof gradeWeek>) => GRADE_ORDER.indexOf(g);

describe('CWR · Wave-0 grade parity', () => {
  it('produces a stable grade for every (netR, execScore) cell', () => {
    // Snapshot the matrix — guards against accidental gradeWeek edits.
    const snapshot: string[] = [];
    for (const execScore of EXEC_SCORE) {
      for (const netR of NET_R) {
        const g = gradeWeek({ netR, wins: 0, losses: 0, rulesComplianceRatio: execScore / 100 });
        snapshot.push(`netR=${netR} exec=${execScore} → ${g}`);
      }
    }
    expect(snapshot).toMatchInlineSnapshot(`
      [
        "netR=-3 exec=0 → F",
        "netR=-2 exec=0 → D",
        "netR=-1 exec=0 → D",
        "netR=0 exec=0 → C",
        "netR=0.5 exec=0 → C",
        "netR=1 exec=0 → C",
        "netR=2 exec=0 → C",
        "netR=3 exec=0 → C",
        "netR=4 exec=0 → C",
        "netR=5 exec=0 → C",
        "netR=6 exec=0 → C",
        "netR=-3 exec=50 → F",
        "netR=-2 exec=50 → D",
        "netR=-1 exec=50 → D",
        "netR=0 exec=50 → C",
        "netR=0.5 exec=50 → C",
        "netR=1 exec=50 → C",
        "netR=2 exec=50 → C",
        "netR=3 exec=50 → C",
        "netR=4 exec=50 → C",
        "netR=5 exec=50 → C",
        "netR=6 exec=50 → C",
        "netR=-3 exec=70 → F",
        "netR=-2 exec=70 → D",
        "netR=-1 exec=70 → D",
        "netR=0 exec=70 → C",
        "netR=0.5 exec=70 → C",
        "netR=1 exec=70 → B",
        "netR=2 exec=70 → B",
        "netR=3 exec=70 → B",
        "netR=4 exec=70 → B",
        "netR=5 exec=70 → B",
        "netR=6 exec=70 → B",
        "netR=-3 exec=80 → F",
        "netR=-2 exec=80 → D",
        "netR=-1 exec=80 → D",
        "netR=0 exec=80 → C",
        "netR=0.5 exec=80 → C",
        "netR=1 exec=80 → B",
        "netR=2 exec=80 → B",
        "netR=3 exec=80 → A",
        "netR=4 exec=80 → A",
        "netR=5 exec=80 → A",
        "netR=6 exec=80 → A",
        "netR=-3 exec=90 → F",
        "netR=-2 exec=90 → D",
        "netR=-1 exec=90 → D",
        "netR=0 exec=90 → C",
        "netR=0.5 exec=90 → C",
        "netR=1 exec=90 → B",
        "netR=2 exec=90 → B",
        "netR=3 exec=90 → A",
        "netR=4 exec=90 → A",
        "netR=5 exec=90 → A+",
        "netR=6 exec=90 → A+",
        "netR=-3 exec=100 → F",
        "netR=-2 exec=100 → D",
        "netR=-1 exec=100 → D",
        "netR=0 exec=100 → C",
        "netR=0.5 exec=100 → C",
        "netR=1 exec=100 → B",
        "netR=2 exec=100 → B",
        "netR=3 exec=100 → A",
        "netR=4 exec=100 → A",
        "netR=5 exec=100 → A+",
        "netR=6 exec=100 → A+",
      ]
    `);
  });

  it('is monotonic in netR at every execScore', () => {
    for (const execScore of EXEC_SCORE) {
      let prevRank = -Infinity;
      for (const netR of NET_R) {
        const r = rank(gradeWeek({ netR, wins: 0, losses: 0, rulesComplianceRatio: execScore / 100 }));
        expect(r).toBeGreaterThanOrEqual(prevRank);
        prevRank = r;
      }
    }
  });

  it('treats wins/losses as DEAD INPUTS — mutating them never changes the grade', () => {
    const winsLossesPairs: [number, number][] = [
      [0, 0], [1, 0], [0, 1], [3, 2], [10, 5], [999, 999],
    ];
    for (const execScore of EXEC_SCORE) {
      for (const netR of NET_R) {
        const grades = new Set(
          winsLossesPairs.map(([wins, losses]) =>
            gradeWeek({ netR, wins, losses, rulesComplianceRatio: execScore / 100 } as GradeInput)
          ),
        );
        expect(grades.size).toBe(1);
      }
    }
  });
});
