import type { Trade } from '@/data/trades';
import { getEffectiveR, sumDailyR } from '@/lib/r-multiple';

export interface CoinPerf {
  coin: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: string;
  avgR: number;
}

export interface DirectionData {
  name: string;
  pnl: number;
  trades: number;
  winRate: number;
  avgR: number;
  expectancyR: number;
}

export interface EquityPoint {
  trade: number;
  balance: number;
  pnl: number;
}

export interface MonthlyPerf {
  month: string;
  monthKey: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: number;
  expectancyR: number;
  avgR: number;
  profitFactor: number;
}

export interface RollingMetric {
  tradeId: number;
  expectancyR: number;
  winRate: number;
  sharpe: number;
}

export interface TradingStats {
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  expectancyR: number;
  avgWinR: number;
  avgLossR: number;
  expectancyDollar: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  bestTradeR: number;
  worstTradeR: number;
  currentStreak: number;
  streakType: string;
  maxDrawdown: number;
  equityCurve: EquityPoint[];
  coinPerf: CoinPerf[];
  directionData: DirectionData[];
  orcaScore: number;
  edgeHealth: number;
  regimeFit: number;
  rulesFollowed: number;
  maxConsecLosses: number;
  rDist: { id: number; r: number; winLoss: string }[];
  dayPerf: { day: string; pnl: number; trades: number; avgR: number }[];
  totalTrades: number;
  monthlyPerf: MonthlyPerf[];
  rollingExpectancyR: RollingMetric[];
  strategyExpectancyR: { coin: string; expectancyR: number; trades: number }[];
  maeDistribution: { id: number; mae: number; pnl: number }[];
  mfeDistribution: { id: number; mfe: number; pnl: number }[];
  winRateVsRR: { rr: string; winRate: number; count: number }[];
  timeInTradeDistribution: { bucket: string; count: number; avgR: number }[];
  riskOfRuin: number;
  kellyOptimal: number;
  rollingSharpe: { tradeId: number; sharpe: number }[];
  volatilityAdjustedExpectancy: number;
  edgeDecay: { period: number; expectancyR: number }[];
  drawdownStructure: { start: number; end: number; depth: number; recovery: number }[];
}

const EMPTY_STATS: TradingStats = {
  totalPnl: 0, winRate: 0, profitFactor: 0, expectancyR: 0, avgWinR: 0, avgLossR: 0,
  expectancyDollar: 0, avgWin: 0, avgLoss: 0, bestTrade: 0, worstTrade: 0, bestTradeR: 0, worstTradeR: 0,
  currentStreak: 0, streakType: '', maxDrawdown: 0,
  equityCurve: [{ trade: 0, balance: 200, pnl: 0 }],
  coinPerf: [], directionData: [
    { name: 'Long', pnl: 0, trades: 0, winRate: 0, avgR: 0, expectancyR: 0 },
    { name: 'Short', pnl: 0, trades: 0, winRate: 0, avgR: 0, expectancyR: 0 },
  ],
  orcaScore: 0, edgeHealth: 0, regimeFit: 50, rulesFollowed: 0, maxConsecLosses: 0,
  rDist: [], dayPerf: [], totalTrades: 0, monthlyPerf: [], rollingExpectancyR: [],
  strategyExpectancyR: [], maeDistribution: [], mfeDistribution: [], winRateVsRR: [],
  timeInTradeDistribution: [], riskOfRuin: 0, kellyOptimal: 0, rollingSharpe: [],
  volatilityAdjustedExpectancy: 0, edgeDecay: [], drawdownStructure: [],
};

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && isFinite(v)) return v;
  return fallback;
}

function computeExpectancyR(trades: Trade[]): number {
  if (!trades || trades.length === 0) return 0;
  const wins = trades.filter(t => t && t.winLoss === 'Win');
  const losses = trades.filter(t => t && t.winLoss === 'Loss');
  const winRate = wins.length / trades.length;
  const lossRate = losses.length / trades.length;
  const avgWinR = wins.length > 0 ? wins.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / wins.length : 0;
  const avgLossR = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / losses.length : 0;
  return (winRate * avgWinR) - (lossRate * avgLossR);
}

function buildDailyRSeries(trades: Trade[]): { day: string; trades: Trade[]; r: number; pnl: number }[] {
  const byDay = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = (t.date || '').slice(0, 10) || t.day || String(t.id);
    const arr = byDay.get(key) || [];
    arr.push(t);
    byDay.set(key, arr);
  }
  return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, dayTrades]) => ({
    day,
    trades: dayTrades,
    r: sumDailyR(dayTrades).total,
    pnl: dayTrades.reduce((s, t) => s + safeNum(t.pnl), 0),
  }));
}

export function computeAnalytics(trades: Trade[]): TradingStats {
  // DEFENSIVE: filter out any undefined/null/invalid trades
  if (!Array.isArray(trades)) return { ...EMPTY_STATS };
  const validTrades = trades.filter(t => t && typeof t === 'object' && typeof t.id === 'number');
  if (validTrades.length === 0) return { ...EMPTY_STATS };

  try {
    return _computeAnalyticsInternal(validTrades);
  } catch (err) {
    console.error('computeAnalytics error:', err);
    return { ...EMPTY_STATS };
  }
}

function _computeAnalyticsInternal(trades: Trade[]): TradingStats {
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  const dailyRSeries = buildDailyRSeries(trades);
  const totalPnl = trades.reduce((s, t) => s + safeNum(t.pnl), 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + safeNum(t.pnl), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + safeNum(t.pnl), 0) / losses.length) : 0;
  const grossWin = wins.reduce((s, t) => s + safeNum(t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + safeNum(t.pnl), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 0;

  const avgWinR = wins.length > 0 ? wins.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / wins.length : 0;
  const avgLossR = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / losses.length : 0;
  const expectancyR = computeExpectancyR(trades);
  const expectancyDollar = trades.length > 0 ? totalPnl / trades.length : 0;

  let bestTrade = 0, worstTrade = 0, bestTradeR = 0, worstTradeR = 0;
  if (trades.length > 0) {
    bestTrade = -Infinity; worstTrade = Infinity; bestTradeR = -Infinity; worstTradeR = Infinity;
    for (const t of trades) {
      const p = safeNum(t.pnl), r = getEffectiveR(t);
      if (p > bestTrade) bestTrade = p;
      if (p < worstTrade) worstTrade = p;
      if (r > bestTradeR) bestTradeR = r;
      if (r < worstTradeR) worstTradeR = r;
    }
    if (!isFinite(bestTrade)) bestTrade = 0;
    if (!isFinite(worstTrade)) worstTrade = 0;
    if (!isFinite(bestTradeR)) bestTradeR = 0;
    if (!isFinite(worstTradeR)) worstTradeR = 0;
  }

  let currentStreak = 0, streakType = '';
  for (let i = trades.length - 1; i >= 0; i--) {
    if (i === trades.length - 1) { streakType = trades[i].winLoss || ''; currentStreak = 1; }
    else if (trades[i].winLoss === streakType) currentStreak++;
    else break;
  }

  let peak = 0, maxDD = 0, runningR = 0;
  dailyRSeries.forEach(d => {
    runningR += d.r;
    if (runningR > peak) peak = runningR;
    const dd = peak > 0 ? ((peak - runningR) / Math.max(Math.abs(peak), 1)) * 100 : 0;
    if (Number.isFinite(dd) && dd > maxDD) maxDD = dd;
  });

  const equityCurve: EquityPoint[] = [{ trade: 0, balance: 0, pnl: 0 }];
  let equityR = 0;
  dailyRSeries.forEach((d, i) => {
    equityR += d.r;
    equityCurve.push({ trade: i + 1, balance: +equityR.toFixed(3), pnl: d.pnl });
  });

  // Coin performance
  const coinMap: Record<string, { coin: string; pnl: number; trades: number; wins: number; totalR: number }> = {};
  trades.forEach(t => {
    const c = t.coin || 'UNKNOWN';
    if (!coinMap[c]) coinMap[c] = { coin: c, pnl: 0, trades: 0, wins: 0, totalR: 0 };
    coinMap[c].pnl += safeNum(t.pnl);
    coinMap[c].trades++;
    coinMap[c].totalR += getEffectiveR(t);
    if (t.winLoss === 'Win') coinMap[c].wins++;
  });
  const coinPerf: CoinPerf[] = Object.values(coinMap).map(c => ({
    ...c, winRate: (c.wins / c.trades * 100).toFixed(0), avgR: c.totalR / c.trades
  }));

  // Direction analysis
  const longT = trades.filter(t => t.direction === 'Long');
  const shortT = trades.filter(t => t.direction === 'Short');
  const directionData: DirectionData[] = [
    {
      name: 'Long', pnl: longT.reduce((s, t) => s + safeNum(t.pnl), 0), trades: longT.length,
      winRate: longT.length ? (longT.filter(t => t.winLoss === 'Win').length / longT.length * 100) : 0,
      avgR: longT.length ? longT.reduce((s, t) => s + getEffectiveR(t), 0) / longT.length : 0,
      expectancyR: computeExpectancyR(longT)
    },
    {
      name: 'Short', pnl: shortT.reduce((s, t) => s + safeNum(t.pnl), 0), trades: shortT.length,
      winRate: shortT.length ? (shortT.filter(t => t.winLoss === 'Win').length / shortT.length * 100) : 0,
      avgR: shortT.length ? shortT.reduce((s, t) => s + getEffectiveR(t), 0) / shortT.length : 0,
      expectancyR: computeExpectancyR(shortT)
    }
  ];

  const rulesFollowed = trades.length > 0 ? trades.filter(t => t.rules).length / trades.length * 100 : 0;
  const avgDev = trades.length > 0 ? trades.reduce((s, t) => s + safeNum(t.deviation), 0) / trades.length : 0;
  const riskCons = 1 - (Math.abs(avgDev) / 2);
  const orcaScore = Math.min(100, Math.max(0, (rulesFollowed * 0.4 + winRate * 0.2 + riskCons * 100 * 0.2 + (profitFactor > 1 ? 20 : profitFactor * 20))));

  const recent = trades.slice(-8);
  const recentWR = recent.length > 0 ? recent.filter(t => t.winLoss === 'Win').length / recent.length * 100 : 0;
  const rw = recent.filter(t => t.winLoss === 'Win');
  const rl = recent.filter(t => t.winLoss === 'Loss');
  const recentPF = Math.abs(rl.reduce((s, t) => s + safeNum(t.pnl), 0)) > 0 ? rw.reduce((s, t) => s + safeNum(t.pnl), 0) / Math.abs(rl.reduce((s, t) => s + safeNum(t.pnl), 0)) : 0;
  const edgeHealth = Math.min(100, Math.max(0, recentWR * 0.5 + recentPF * 25));
  const regimeFit = Math.min(100, Math.max(0, 55 + (profitFactor - 1) * 20 + (winRate - 40) * 0.5));

  let maxConsecLosses = 0, curConsec = 0;
  trades.forEach(t => {
    if (t.winLoss === 'Loss') { curConsec++; maxConsecLosses = Math.max(maxConsecLosses, curConsec); }
    else curConsec = 0;
  });

  const rDist = trades.map(t => ({ id: t.id, r: getEffectiveR(t), winLoss: t.winLoss || 'Break Even' }));

  // Day performance
  const dayMap: Record<string, { day: string; pnl: number; trades: number; totalR: number }> = {};
  trades.forEach(t => {
    const d = t.day || 'Unknown';
    if (!dayMap[d]) dayMap[d] = { day: d, pnl: 0, trades: 0, totalR: 0 };
    dayMap[d].pnl += safeNum(t.pnl);
    dayMap[d].trades++;
    dayMap[d].totalR += getEffectiveR(t);
  });
  const dayPerf = Object.values(dayMap).map(d => ({ ...d, avgR: d.totalR / d.trades }));

  // Monthly performance
  const monthMap: Record<string, Trade[]> = {};
  trades.forEach(tr => {
    try {
      const dateStr = tr.date ? tr.date.replace(' ', 'T') : '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = [];
      monthMap[key].push(tr);
    } catch { /* skip */ }
  });
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyPerf: MonthlyPerf[] = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([key, mTrades]) => {
    const mWins = mTrades.filter(t => t.winLoss === 'Win');
    const mLosses = mTrades.filter(t => t.winLoss === 'Loss');
    const mPnl = mTrades.reduce((s, t) => s + safeNum(t.pnl), 0);
    const mGrossWin = mWins.reduce((s, t) => s + safeNum(t.pnl), 0);
    const mGrossLoss = Math.abs(mLosses.reduce((s, t) => s + safeNum(t.pnl), 0));
    const [y, m] = key.split('-').map(Number);
    return {
      month: `${monthNames[m] || 'Unknown'} ${y}`,
      monthKey: key, pnl: mPnl, trades: mTrades.length, wins: mWins.length,
      winRate: mTrades.length > 0 ? (mWins.length / mTrades.length) * 100 : 0,
      expectancyR: computeExpectancyR(mTrades),
      avgR: mTrades.length > 0 ? mTrades.reduce((s, t) => s + getEffectiveR(t), 0) / mTrades.length : 0,
      profitFactor: mGrossLoss > 0 ? mGrossWin / mGrossLoss : 0,
    };
  });

  // Rolling expectancy (window of 10)
  const rollingExpectancyR: RollingMetric[] = [];
  const windowSize = Math.min(10, trades.length);
  for (let i = windowSize - 1; i < trades.length; i++) {
    const window = trades.slice(i - windowSize + 1, i + 1);
    const wWins = window.filter(t => t.winLoss === 'Win');
    const returns = window.map(t => getEffectiveR(t));
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    rollingExpectancyR.push({
      tradeId: trades[i].id,
      expectancyR: computeExpectancyR(window),
      winRate: (wWins.length / window.length) * 100,
      sharpe: std > 0 ? mean / std : 0,
    });
  }

  // Strategy expectancy
  const strategyExpectancyR = Object.entries(coinMap).map(([coin]) => {
    const coinTrades = trades.filter(t => t.coin === coin);
    return { coin, expectancyR: computeExpectancyR(coinTrades), trades: coinTrades.length };
  });

  // MAE/MFE approximation
  const maeDistribution = trades.map(t => ({
    id: t.id, mae: t.winLoss === 'Loss' ? -Math.abs(getEffectiveR(t)) : -safeNum(t.deviation), pnl: safeNum(t.pnl)
  }));
  const mfeDistribution = trades.map(t => ({
    id: t.id, mfe: t.winLoss === 'Win' ? Math.abs(getEffectiveR(t)) : Math.abs(getEffectiveR(t)) * 0.3, pnl: safeNum(t.pnl)
  }));

  // Win rate vs R:R buckets
  const rrBuckets: Record<string, { wins: number; total: number }> = {};
  trades.forEach(t => {
    const rr = Math.abs(getEffectiveR(t));
    const bucket = rr < 1 ? '<1R' : rr < 2 ? '1-2R' : rr < 3 ? '2-3R' : '3R+';
    if (!rrBuckets[bucket]) rrBuckets[bucket] = { wins: 0, total: 0 };
    rrBuckets[bucket].total++;
    if (t.winLoss === 'Win') rrBuckets[bucket].wins++;
  });
  const winRateVsRR = Object.entries(rrBuckets).map(([rr, d]) => ({
    rr, winRate: d.total > 0 ? (d.wins / d.total) * 100 : 0, count: d.total
  }));

  // Leverage-based distribution
  const timeBuckets: Record<string, { count: number; totalR: number }> = {};
  trades.forEach(t => {
    const lev = safeNum(t.leverage, 1);
    const bucket = lev <= 5 ? 'Low Lev' : lev <= 15 ? 'Med Lev' : 'High Lev';
    if (!timeBuckets[bucket]) timeBuckets[bucket] = { count: 0, totalR: 0 };
    timeBuckets[bucket].count++;
    timeBuckets[bucket].totalR += getEffectiveR(t);
  });
  const timeInTradeDistribution = Object.entries(timeBuckets).map(([bucket, d]) => ({
    bucket, count: d.count, avgR: d.count > 0 ? d.totalR / d.count : 0
  }));

  // Risk of ruin — edge-aware in R-space; avoids false 99.9% when Bybit R fields are missing.
  const wr = winRate / 100;
  const edgeRatio = expectancyR > 0 && avgLossR > 0 ? expectancyR / avgLossR : 0;
  const riskOfRuin = edgeRatio > 0 ? Math.max(0, Math.min(99.9, Math.pow((1 - edgeRatio) / (1 + edgeRatio), 10) * 100)) : 99.9;

  // Kelly criterion
  const payoffRatio = avgLossR > 0 ? avgWinR / avgLossR : 0;
  const kellyOptimal = payoffRatio > 0 ? Math.max(0, Math.min(100, (wr - ((1 - wr) / payoffRatio)) * 100)) : 0;

  // Rolling Sharpe
  const rollingSharpe: { tradeId: number; sharpe: number }[] = [];
  for (let i = windowSize - 1; i < trades.length; i++) {
    const window = trades.slice(i - windowSize + 1, i + 1);
    const returns = window.map(t => getEffectiveR(t));
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    rollingSharpe.push({ tradeId: trades[i].id, sharpe: std > 0 ? mean / std : 0 });
  }

  // Volatility-adjusted expectancy
  const allReturns = trades.map(t => getEffectiveR(t));
  const meanR = allReturns.length > 0 ? allReturns.reduce((s, r) => s + r, 0) / allReturns.length : 0;
  const volR = allReturns.length > 1 ? Math.sqrt(allReturns.reduce((s, r) => s + (r - meanR) ** 2, 0) / allReturns.length) : 1;
  const volatilityAdjustedExpectancy = volR > 0 ? expectancyR / volR : 0;

  // Edge decay
  const periodSize = Math.max(3, Math.floor(trades.length / 4));
  const edgeDecay: { period: number; expectancyR: number }[] = [];
  for (let i = 0; i < trades.length; i += periodSize) {
    const slice = trades.slice(i, i + periodSize);
    edgeDecay.push({ period: Math.floor(i / periodSize) + 1, expectancyR: computeExpectancyR(slice) });
  }

  // Drawdown structure in day-aggregated R-space
  const drawdownStructure: { start: number; end: number; depth: number; recovery: number }[] = [];
  let ddPeak = 0, ddStart = -1, ddMax = 0;
  equityCurve.forEach((e, i) => {
    if (e.balance > ddPeak) {
      if (ddStart >= 0 && ddMax > 0.5) {
        drawdownStructure.push({ start: ddStart, end: i, depth: ddMax, recovery: i - ddStart });
      }
      ddPeak = e.balance;
      ddStart = -1;
      ddMax = 0;
    } else {
      const dd = ddPeak > 0 ? ((ddPeak - e.balance) / Math.max(Math.abs(ddPeak), 1)) * 100 : 0;
      if (dd > 0 && ddStart < 0) ddStart = i;
      ddMax = Math.max(ddMax, dd);
    }
  });
  if (ddStart >= 0 && ddMax > 0.5) {
    drawdownStructure.push({ start: ddStart, end: equityCurve.length - 1, depth: ddMax, recovery: equityCurve.length - 1 - ddStart });
  }

  return {
    totalPnl, winRate, profitFactor, expectancyR, avgWinR, avgLossR, expectancyDollar,
    avgWin, avgLoss, bestTrade, worstTrade, bestTradeR, worstTradeR,
    currentStreak, streakType, maxDrawdown: maxDD, equityCurve, coinPerf, directionData,
    orcaScore, edgeHealth, regimeFit, rulesFollowed, maxConsecLosses, rDist,
    dayPerf, totalTrades: trades.length,
    monthlyPerf, rollingExpectancyR, strategyExpectancyR,
    maeDistribution, mfeDistribution, winRateVsRR, timeInTradeDistribution,
    riskOfRuin, kellyOptimal, rollingSharpe, volatilityAdjustedExpectancy, edgeDecay,
    drawdownStructure,
  };
}

export function getCalDays(y: number, m: number): (number | null)[] {
  const f = new Date(y, m, 1).getDay();
  const d = new Date(y, m + 1, 0).getDate();
  const arr: (number | null)[] = [];
  for (let i = 0; i < f; i++) arr.push(null);
  for (let i = 1; i <= d; i++) arr.push(i);
  return arr;
}
