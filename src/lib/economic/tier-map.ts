import type { EconomicImpact } from './types';

// Keywords that force a Tier-1 classification regardless of provider score
const T1_KEYWORDS = [
  'cpi', 'core cpi', 'inflation rate',
  'non farm payrolls', 'nonfarm payrolls', 'nfp',
  'fomc', 'federal funds', 'fed interest rate', 'interest rate decision',
  'ecb', 'boe', 'boj', 'snb',
  'gdp', 'unemployment rate',
  'ppi',
];

const T2_KEYWORDS = [
  'pmi', 'retail sales', 'industrial production',
  'consumer confidence', 'jobless claims', 'trade balance',
  'housing starts', 'ism',
];

export function classifyImpact(
  eventName: string,
  providerScore?: number | string | null,
): EconomicImpact {
  const name = (eventName || '').toLowerCase();

  if (T1_KEYWORDS.some((k) => name.includes(k))) return 't1';

  // Finnhub: impact is "low" | "medium" | "high" or numeric 0-3
  if (providerScore != null) {
    const s = String(providerScore).toLowerCase();
    if (s === 'high' || s === '3') return 't1';
    if (s === 'medium' || s === '2') return 't2';
  }

  if (T2_KEYWORDS.some((k) => name.includes(k))) return 't2';
  return 't3';
}
