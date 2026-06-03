// Week grading — verbatim port of the legacy iframe's gradeColors logic.
// Inputs are pre-aggregated so the rule stays trivial to audit.

import type { WeekGrade } from './types';

export interface GradeInput {
  netR: number;
  wins: number;
  losses: number;
  rulesComplianceRatio: number; // 0..1
}

/**
 * Returns A+/A/B/C/D/F based on net R + compliance.
 * Mirrors the standalone app:
 *   netR ≥ +5R & compliance ≥ 0.9 → A+
 *   netR ≥ +3R & compliance ≥ 0.8 → A
 *   netR ≥ +1R & compliance ≥ 0.7 → B
 *   netR ≥  0R                    → C
 *   netR ≥ -2R                    → D
 *   else                          → F
 */
export function gradeWeek({ netR, rulesComplianceRatio }: GradeInput): WeekGrade {
  if (netR >= 5 && rulesComplianceRatio >= 0.9) return 'A+';
  if (netR >= 3 && rulesComplianceRatio >= 0.8) return 'A';
  if (netR >= 1 && rulesComplianceRatio >= 0.7) return 'B';
  if (netR >= 0) return 'C';
  if (netR >= -2) return 'D';
  return 'F';
}

export const GRADE_COLORS: Record<WeekGrade, string> = {
  'A+': '#39FF14',
  'A':  '#7CFC00',
  'B':  '#00BFFF',
  'C':  '#FFD700',
  'D':  '#FF8C00',
  'F':  '#FF3B3B',
};
