/**
 * Performance page channels.
 *
 * One core channel (the page itself) plus three sub-channels, mirroring the
 * Dashboard pattern. Shared between the sidebar (Index.tsx) and the
 * performance deck (AdvancedAnalyticsPage.tsx).
 */
export type PerfChannelId = 'core' | 'risk' | 'dynamics' | 'temporal';

export interface PerfChannelDef {
  id: PerfChannelId;
  he: string;
  en: string;
  short?: { he: string; en: string };
  icon: string;
}

export const PERF_HOME: PerfChannelDef = {
  id: 'core',
  he: 'ליבת הביצועים',
  en: 'Core Performance & Equity',
  short: { he: 'ליבה', en: 'Core' },
  icon: '▲',
};

export const PERF_CHANNELS: PerfChannelDef[] = [
  {
    id: 'risk',
    he: 'סיכון וניהול הון',
    en: 'Risk & Capital',
    short: { he: 'סיכון והון', en: 'Risk & Capital' },
    icon: '⚖',
  },
  {
    id: 'dynamics',
    he: 'דינמיקת עסקאות',
    en: 'Trade Dynamics',
    short: { he: 'דינמיקה', en: 'Dynamics' },
    icon: '⇄',
  },
  {
    id: 'temporal',
    he: 'זמנים וסשנים',
    en: 'Time & Sessions',
    short: { he: 'זמנים', en: 'Sessions' },
    icon: '◷',
  },
];

export const ALL_PERF_CHANNELS: PerfChannelDef[] = [PERF_HOME, ...PERF_CHANNELS];

/**
 * Registry chart ids per channel. Ids absent from every list stay visible on
 * the core channel so nothing silently disappears.
 */
export const PERF_CHANNEL_CHARTS: Record<PerfChannelId, string[]> = {
  core: ['equityCurve', 'rDistribution', 'monthlyPerformance', 'cumWinLossRatio', 'tsPerfMatrix'],
  risk: ['edgeDecay', 'kellyOptimal', 'capitalEfficiency', 'cumulativeMAR'],
  dynamics: [
    'directionAnalysis', 'strategyExpectancy', 'lag1Autocorr', 'interTradeInterval',
    'drawdownStructure', 'lossStreakPressure', 'deviationDistribution',
  ],
  temporal: ['performanceByDay', 'rollingSharpe'],
};

export function chartInPerfChannel(id: string, channel: PerfChannelId): boolean {
  const owned = Object.values(PERF_CHANNEL_CHARTS).some(list => list.includes(id));
  if (!owned) return channel === 'core';
  return PERF_CHANNEL_CHARTS[channel].includes(id);
}
