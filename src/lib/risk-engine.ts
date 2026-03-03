import type { Trade } from '@/data/trades';

export interface RiskAssessment {
  riskConsistencyScore: number;
  avgRiskPct: number;
  riskDrift: number;
  riskGrowthEvolution: { tradeId: number; risk: number; pctOfAccount: number; drift: number }[];
  warnings: string[];
  isScalingUp: boolean;
  dollarRiskTrend: 'increasing' | 'stable' | 'decreasing';
  riskAllocation: { coin: string; totalRisk: number; pct: number }[];
}

export function assessRisk(trades: Trade[], startBalance: number = 200): RiskAssessment {
  if (!trades || trades.length === 0 || !trades[0]) {
    return { riskConsistencyScore: 100, avgRiskPct: 0, riskDrift: 0, riskGrowthEvolution: [], warnings: [], isScalingUp: false, dollarRiskTrend: 'stable', riskAllocation: [] };
  }

  const baselineRisk = trades[0].risk;
  const baselinePct = trades[0].riskPct;
  
  const evolution = trades.map(t => {
    const acctAtTrade = t.balance - t.pnl; // balance before this trade
    const actualPct = acctAtTrade > 0 ? (t.risk / acctAtTrade) * 100 : 0;
    const drift = Math.abs(actualPct - baselinePct);
    return { tradeId: t.id, risk: t.risk, pctOfAccount: actualPct, drift };
  });

  const avgDrift = evolution.reduce((s, e) => s + e.drift, 0) / evolution.length;
  const riskConsistencyScore = Math.max(0, Math.min(100, 100 - avgDrift * 20));
  const avgRiskPct = evolution.reduce((s, e) => s + e.pctOfAccount, 0) / evolution.length;

  // Dollar risk trend
  const firstHalf = trades.slice(0, Math.floor(trades.length / 2));
  const secondHalf = trades.slice(Math.floor(trades.length / 2));
  const avgFirst = firstHalf.reduce((s, t) => s + t.risk, 0) / (firstHalf.length || 1);
  const avgSecond = secondHalf.reduce((s, t) => s + t.risk, 0) / (secondHalf.length || 1);
  const dollarRiskTrend = avgSecond > avgFirst * 1.15 ? 'increasing' : avgSecond < avgFirst * 0.85 ? 'decreasing' : 'stable';
  const isScalingUp = dollarRiskTrend === 'increasing';

  // Risk allocation by coin
  const coinRisk: Record<string, number> = {};
  trades.forEach(t => { coinRisk[t.coin] = (coinRisk[t.coin] || 0) + t.risk; });
  const totalRisk = Object.values(coinRisk).reduce((s, v) => s + v, 0);
  const riskAllocation = Object.entries(coinRisk).map(([coin, risk]) => ({
    coin, totalRisk: risk, pct: totalRisk > 0 ? (risk / totalRisk) * 100 : 0
  })).sort((a, b) => b.totalRisk - a.totalRisk);

  // Warnings
  const warnings: string[] = [];
  if (riskConsistencyScore < 60) warnings.push('Risk consistency below 60% — sizing is erratic');
  if (isScalingUp) warnings.push('Dollar risk is increasing — ensure % remains constant');
  const highDevTrades = trades.filter(t => t.deviation > 0.1);
  if (highDevTrades.length > 2) warnings.push(`${highDevTrades.length} trades with >0.1R deviation — tighten execution`);
  const maxRisk = Math.max(...trades.map(t => t.risk));
  if (maxRisk > baselineRisk * 2) warnings.push(`Max risk ($${maxRisk}) is ${(maxRisk/baselineRisk).toFixed(1)}x baseline — review sizing`);
  const recentLosses = trades.slice(-5).filter(t => t.winLoss === 'Loss').length;
  if (recentLosses >= 3) warnings.push('3+ losses in last 5 trades — consider reducing size');

  return {
    riskConsistencyScore, avgRiskPct, riskDrift: avgDrift,
    riskGrowthEvolution: evolution, warnings, isScalingUp, dollarRiskTrend, riskAllocation
  };
}

export interface TradeRiskInput {
  dollarRisk: number;
  pctRisk: number;
  isScalingUp: boolean;
  accountBalance: number;
}

export interface RiskValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  actualPct: number;
  maxSuggestedRisk: number;
}

export function validateTradeRisk(input: TradeRiskInput, baselinePct: number = 1): RiskValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const actualPct = (input.dollarRisk / input.accountBalance) * 100;
  const maxSuggestedRisk = input.accountBalance * (baselinePct / 100);

  if (input.dollarRisk <= 0) errors.push('Dollar risk must be positive');
  if (actualPct > baselinePct * 2) errors.push(`Risk ${actualPct.toFixed(1)}% exceeds 2x baseline (${baselinePct}%)`);
  if (actualPct > baselinePct * 1.5) warnings.push(`Risk ${actualPct.toFixed(1)}% is 1.5x+ baseline`);
  if (input.isScalingUp && actualPct > baselinePct) warnings.push('Scaling up detected — ensure this is intentional');

  return { valid: errors.length === 0, errors, warnings, actualPct, maxSuggestedRisk };
}
