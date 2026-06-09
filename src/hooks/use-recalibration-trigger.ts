/**
 * Decides whether to nudge the trader to recalibrate via Trader Mind.
 * Returns a banner-ready signal or null when no nudge is needed.
 */
import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import { useTraderMind } from './use-trader-mind';

export type RecalSignal = {
  severity: 'info' | 'warn';
  reason: string;
  reason_he: string;
} | null;

export function useRecalibrationTrigger(_trades: Trade[]): RecalSignal {
  const { isCalibrated, ageDays } = useTraderMind();
  return useMemo<RecalSignal>(() => {
    if (!isCalibrated) {
      return {
        severity: 'info',
        reason: 'Trader Mind not yet completed — your AI coach is running blind.',
        reason_he: 'עוד לא השלמת את תודעת הסוחר — מאמן ה-AI עובד בלי פרופיל אישי.',
      };
    }
    if (ageDays != null && ageDays > 45) {
      return {
        severity: 'warn',
        reason: `Trader Mind is ${ageDays} days old — recalibrate to refresh your blueprint.`,
        reason_he: `תודעת הסוחר בת ${ageDays} ימים — שווה לעבור כיול מחדש.`,
      };
    }
    return null;
  }, [isCalibrated, ageDays]);
}
