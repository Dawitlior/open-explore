/**
 * Decides whether to nudge the trader to recalibrate Oracle Core.
 * Rules:
 *   - Never calibrated → high priority.
 *   - ≥30 trades since last calibration AND ≥14 days old → high priority.
 *   - R-multiple variance shift >25% vs prior baseline → high priority.
 *   - ≥14 days old (regardless of trade count) → soft nudge.
 */
import { useMemo } from 'react';
import { useOracleVector } from './use-oracle-vector';
import type { Trade } from '@/data/trades';
import { getEffectiveR } from '@/lib/r-multiple';

export type RecalibrationLevel = 'none' | 'soft' | 'high';

export interface RecalibrationSignal {
  level: RecalibrationLevel;
  reason: string | null;
  reason_he: string | null;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
}

export function useRecalibrationTrigger(trades: Trade[]): RecalibrationSignal {
  const { blueprint, isCalibrated, ageDays } = useOracleVector();

  return useMemo<RecalibrationSignal>(() => {
    if (!isCalibrated) {
      return {
        level: 'high',
        reason: 'Oracle uncalibrated — your AI coach is running blind.',
        reason_he: 'Oracle לא מכויל — מאמן ה-AI שלך פועל ללא DNA.',
      };
    }
    if (ageDays == null) return { level: 'none', reason: null, reason_he: null };

    const calibratedAt = blueprint ? new Date(blueprint.computed_at).getTime() : 0;
    const newer = trades.filter((t) => {
      const d = (t as { closed_at?: string; data?: { date?: string } }).closed_at
        || (t as { data?: { date?: string } }).data?.date;
      return d ? new Date(d).getTime() > calibratedAt : false;
    });

    if (newer.length >= 30 && ageDays >= 14) {
      return {
        level: 'high',
        reason: `${newer.length} new trades since last calibration. Recalibrate to sharpen your AI coach.`,
        reason_he: `${newer.length} עסקאות חדשות מאז הכיול האחרון. כייל מחדש לדיוק מקסימלי.`,
      };
    }

    // Variance shift check: compare R-variance pre/post calibration
    const pre = trades.filter((t) => {
      const d = (t as { closed_at?: string; data?: { date?: string } }).closed_at
        || (t as { data?: { date?: string } }).data?.date;
      return d ? new Date(d).getTime() <= calibratedAt : false;
    });
    if (pre.length >= 10 && newer.length >= 10) {
      const preR = pre.map((t) => getEffectiveR(t)).filter((v): v is number => v != null);
      const postR = newer.map((t) => getEffectiveR(t)).filter((v): v is number => v != null);
      const preVar = variance(preR);
      const postVar = variance(postR);
      if (preVar > 0 && Math.abs(postVar - preVar) / preVar > 0.25) {
        return {
          level: 'high',
          reason: 'Behavioral pattern shift detected — recalibration recommended.',
          reason_he: 'זוהה שינוי בדפוס ההתנהגות — מומלץ לכייל מחדש.',
        };
      }
    }

    if (ageDays >= 14) {
      return {
        level: 'soft',
        reason: `Your DNA is ${ageDays} days old.`,
        reason_he: `ה-DNA שלך בן ${ageDays} ימים.`,
      };
    }
    return { level: 'none', reason: null, reason_he: null };
  }, [blueprint, isCalibrated, ageDays, trades]);
}
