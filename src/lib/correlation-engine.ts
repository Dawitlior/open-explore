import type { Trade } from '@/data/trades';
import type { MorningRitual, EODReview } from '@/hooks/use-journal-mode';

export interface CorrelationResult {
  emotionalAlpha: {
    tiredLossR: number;
    stressedLossR: number;
    calmGainR: number;
    description: string;
  };
  disciplineCorrelation: {
    withRitualAvgR: number;
    withoutRitualAvgR: number;
    ritualImpact: number; // percentage improvement
    description: string;
  };
  leakDetection: {
    worstAsset: { name: string; avgDeviation: number; lossR: number };
    worstDay: { name: string; avgR: number; tradeCount: number };
    highDeviationTrades: number;
    description: string;
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function calculateCorrelations(
  trades: Trade[],
  morningRituals: MorningRitual[],
  eodReviews: EODReview[]
): CorrelationResult {
  // Build ritual lookup by date
  const ritualDates = new Set(morningRituals.filter(r => r.completed).map(r => r.date));
  const eodByDate = new Map(eodReviews.filter(r => r.completed).map(r => [r.date, r]));
  const ritualByDate = new Map(morningRituals.filter(r => r.completed).map(r => [r.date, r]));

  // Group trades by date
  const tradesByDate = new Map<string, Trade[]>();
  trades.forEach(tr => {
    const dateKey = tr.date?.slice(0, 10);
    if (!dateKey) return;
    if (!tradesByDate.has(dateKey)) tradesByDate.set(dateKey, []);
    tradesByDate.get(dateKey)!.push(tr);
  });

  // ═══ EMOTIONAL ALPHA ═══
  // Analyze R when energy is low vs high
  let tiredR: number[] = [];
  let stressedR: number[] = [];
  let calmR: number[] = [];

  tradesByDate.forEach((dayTrades, dateKey) => {
    const ritual = ritualByDate.get(dateKey);
    const eod = eodByDate.get(dateKey);
    const avgR = dayTrades.reduce((s, t) => s + t.returnR, 0) / dayTrades.length;

    if (ritual) {
      if (ritual.energy <= 3) tiredR.push(avgR);
      if (ritual.mood <= 2) stressedR.push(avgR);
      if (ritual.energy >= 7 && ritual.mood >= 4) calmR.push(avgR);
    }
    if (eod && eod.tiltLevel >= 4) stressedR.push(avgR);
  });

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const emotionalAlpha = {
    tiredLossR: avg(tiredR),
    stressedLossR: avg(stressedR),
    calmGainR: avg(calmR),
    description: tiredR.length > 0
      ? `When tired (energy ≤ 3), average R is ${avg(tiredR).toFixed(2)}. When calm & energized, average R is ${avg(calmR).toFixed(2)}.`
      : 'Not enough data yet. Complete morning rituals to track emotional impact.',
  };

  // ═══ DISCIPLINE CORRELATION ═══
  let withRitualRs: number[] = [];
  let withoutRitualRs: number[] = [];

  tradesByDate.forEach((dayTrades, dateKey) => {
    const dayAvgR = dayTrades.reduce((s, t) => s + t.returnR, 0) / dayTrades.length;
    if (ritualDates.has(dateKey)) {
      withRitualRs.push(dayAvgR);
    } else {
      withoutRitualRs.push(dayAvgR);
    }
  });

  const withRitualAvg = avg(withRitualRs);
  const withoutRitualAvg = avg(withoutRitualRs);
  const ritualImpact = withoutRitualAvg !== 0
    ? ((withRitualAvg - withoutRitualAvg) / Math.abs(withoutRitualAvg)) * 100
    : 0;

  const disciplineCorrelation = {
    withRitualAvgR: withRitualAvg,
    withoutRitualAvgR: withoutRitualAvg,
    ritualImpact,
    description: withRitualRs.length > 0
      ? `Days with morning ritual: ${withRitualAvg.toFixed(2)}R avg. Without: ${withoutRitualAvg.toFixed(2)}R avg. Impact: ${ritualImpact > 0 ? '+' : ''}${ritualImpact.toFixed(0)}%.`
      : 'Complete morning rituals on trading days to measure discipline impact.',
  };

  // ═══ LEAK DETECTION ═══
  // By asset
  const assetMap: Record<string, { totalDev: number; totalR: number; count: number }> = {};
  trades.forEach(tr => {
    if (!assetMap[tr.coin]) assetMap[tr.coin] = { totalDev: 0, totalR: 0, count: 0 };
    assetMap[tr.coin].totalDev += tr.deviation;
    assetMap[tr.coin].totalR += tr.returnR;
    assetMap[tr.coin].count++;
  });

  const worstAssetEntry = Object.entries(assetMap)
    .map(([name, d]) => ({ name, avgDeviation: d.totalDev / d.count, lossR: d.totalR }))
    .sort((a, b) => a.lossR - b.lossR)[0];

  // By day of week
  const dayMap: Record<number, { totalR: number; count: number }> = {};
  trades.forEach(tr => {
    const d = new Date(tr.date?.replace(' ', 'T'));
    if (isNaN(d.getTime())) return;
    const day = d.getDay();
    if (!dayMap[day]) dayMap[day] = { totalR: 0, count: 0 };
    dayMap[day].totalR += tr.returnR;
    dayMap[day].count++;
  });

  const worstDayEntry = Object.entries(dayMap)
    .map(([day, d]) => ({ name: DAY_NAMES[+day], avgR: d.totalR / d.count, tradeCount: d.count }))
    .sort((a, b) => a.avgR - b.avgR)[0];

  const highDevTrades = trades.filter(t => t.deviation > 0.1).length;

  const leakDetection = {
    worstAsset: worstAssetEntry || { name: 'N/A', avgDeviation: 0, lossR: 0 },
    worstDay: worstDayEntry || { name: 'N/A', avgR: 0, tradeCount: 0 },
    highDeviationTrades: highDevTrades,
    description: worstAssetEntry
      ? `Biggest leak: ${worstAssetEntry.name} (${worstAssetEntry.lossR.toFixed(1)}R total). Worst day: ${worstDayEntry?.name || 'N/A'} (${worstDayEntry?.avgR.toFixed(2) || 0}R avg).`
      : 'Add trades to detect performance leaks.',
  };

  return { emotionalAlpha, disciplineCorrelation, leakDetection };
}
