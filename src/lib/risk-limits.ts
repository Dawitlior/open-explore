import { getEffectiveR } from "@/lib/r-multiple";
import type { Trade } from '@/data/trades';

export interface RiskLimits {
  trade: number;   // -1R
  day: number;     // -2R
  week: number;    // -5R
  month: number;   // -10R
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  trade: -1,
  day: -2,
  week: -5,
  month: -10,
};

export interface RiskLimitStatus {
  dailyNegR: number;
  weeklyNegR: number;
  monthlyNegR: number;
  dailyBreached: boolean;
  weeklyBreached: boolean;
  monthlyBreached: boolean;
  breachedLevel: 'none' | 'daily' | 'weekly' | 'monthly';
  message: string;
  messageHe: string;
}

/**
 * Calculate cumulative negative R for a given set of trades.
 * Only negative R values count. Positive trades do NOT offset.
 * Break-even (0R) does not count.
 */
function sumNegativeR(trades: Trade[]): number {
  return trades
    .filter(t => getEffectiveR(t) < -0.001) // only negative R
    .reduce((sum, t) => sum + getEffectiveR(t), 0); // returnR is already negative
}

/**
 * Check risk limits against trades for a specific date context.
 */
export function checkRiskLimits(
  trades: Trade[],
  referenceDate: Date = new Date(),
  limits: RiskLimits = DEFAULT_RISK_LIMITS
): RiskLimitStatus {
  const refDateStr = referenceDate.toDateString();
  
  // Daily: same calendar day
  const dailyTrades = trades.filter(t => new Date(t.date).toDateString() === refDateStr);
  const dailyNegR = sumNegativeR(dailyTrades);

  // Weekly: same ISO week
  const refDay = referenceDate.getDay();
  const weekStart = new Date(referenceDate);
  weekStart.setDate(referenceDate.getDate() - refDay);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weeklyTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d >= weekStart && d < weekEnd;
  });
  const weeklyNegR = sumNegativeR(weeklyTrades);

  // Monthly: same calendar month
  const monthlyTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === referenceDate.getMonth() && d.getFullYear() === referenceDate.getFullYear();
  });
  const monthlyNegR = sumNegativeR(monthlyTrades);

  const dailyBreached = dailyNegR <= limits.day;
  const weeklyBreached = weeklyNegR <= limits.week;
  const monthlyBreached = monthlyNegR <= limits.month;

  let breachedLevel: RiskLimitStatus['breachedLevel'] = 'none';
  let message = '';
  let messageHe = '';

  if (monthlyBreached) {
    breachedLevel = 'monthly';
    message = `You have reached your monthly loss limit (${limits.month}R). A deeper performance review is recommended.`;
    messageHe = `הגעת למגבלת ההפסד החודשית (${limits.month}R). מומלץ לבצע סקירת ביצועים מעמיקה.`;
  } else if (weeklyBreached) {
    breachedLevel = 'weekly';
    message = `You have reached your weekly loss limit (${limits.week}R). Consider stopping trading and reviewing your strategy.`;
    messageHe = `הגעת למגבלת ההפסד השבועית (${limits.week}R). שקול להפסיק לסחור ולבדוק את האסטרטגיה שלך.`;
  } else if (dailyBreached) {
    breachedLevel = 'daily';
    message = `You have reached your daily loss limit (${limits.day}R). It is recommended to stop trading for today.`;
    messageHe = `הגעת למגבלת ההפסד היומית (${limits.day}R). מומלץ להפסיק לסחור היום.`;
  }

  return { dailyNegR, weeklyNegR, monthlyNegR, dailyBreached, weeklyBreached, monthlyBreached, breachedLevel, message, messageHe };
}

/**
 * Get risk limit status for calendar day coloring.
 */
export function getDayRiskColor(trades: Trade[], day: number, month: number, year: number): 'green' | 'red' | 'darkred' | 'neutral' {
  const dayTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
  });
  if (dayTrades.length === 0) return 'neutral';

  const totalPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
  const negR = sumNegativeR(dayTrades);

  if (negR <= DEFAULT_RISK_LIMITS.day) return 'darkred'; // risk limit exceeded
  if (totalPnl < 0) return 'red';
  return 'green';
}

/**
 * Check if a week's trades have breached the weekly limit.
 */
export function isWeekBreached(trades: Trade[], weekStart: Date): boolean {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d >= weekStart && d < weekEnd;
  });
  return sumNegativeR(weekTrades) <= DEFAULT_RISK_LIMITS.week;
}
