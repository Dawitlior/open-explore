import type { Trade } from '@/data/trades';

export interface CoinPerf {
  coin: string;
  pnl: number;
  trades: number;
  wins: number;
  winRate: string;
}

export interface DirectionData {
  name: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export interface EquityPoint {
  trade: number;
  balance: number;
  pnl: number;
}

export interface TradingStats {
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
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
  dayPerf: { day: string; pnl: number; trades: number }[];
  totalTrades: number;
}

export function computeAnalytics(trades: Trade[]): TradingStats {
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 0;
  const expectancy = trades.length > 0 ? totalPnl / trades.length : 0;
  const bestTrade = Math.max(...trades.map(t => t.pnl));
  const worstTrade = Math.min(...trades.map(t => t.pnl));

  let currentStreak = 0, streakType = '';
  for (let i = trades.length - 1; i >= 0; i--) {
    if (i === trades.length - 1) { streakType = trades[i].winLoss; currentStreak = 1; }
    else if (trades[i].winLoss === streakType) currentStreak++;
    else break;
  }

  let peak = 200, maxDD = 0;
  trades.forEach(t => {
    if (t.balance > peak) peak = t.balance;
    const dd = ((peak - t.balance) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  });

  const equityCurve: EquityPoint[] = [{ trade: 0, balance: 200, pnl: 0 }];
  trades.forEach((t, i) => equityCurve.push({ trade: i + 1, balance: t.balance, pnl: t.pnl }));

  const coinMap: Record<string, { coin: string; pnl: number; trades: number; wins: number }> = {};
  trades.forEach(t => {
    if (!coinMap[t.coin]) coinMap[t.coin] = { coin: t.coin, pnl: 0, trades: 0, wins: 0 };
    coinMap[t.coin].pnl += t.pnl;
    coinMap[t.coin].trades++;
    if (t.winLoss === 'Win') coinMap[t.coin].wins++;
  });
  const coinPerf: CoinPerf[] = Object.values(coinMap).map(c => ({ ...c, winRate: (c.wins / c.trades * 100).toFixed(0) }));

  const longT = trades.filter(t => t.direction === 'Long');
  const shortT = trades.filter(t => t.direction === 'Short');
  const directionData: DirectionData[] = [
    { name: 'Long', pnl: longT.reduce((s, t) => s + t.pnl, 0), trades: longT.length, winRate: longT.length ? (longT.filter(t => t.winLoss === 'Win').length / longT.length * 100) : 0 },
    { name: 'Short', pnl: shortT.reduce((s, t) => s + t.pnl, 0), trades: shortT.length, winRate: shortT.length ? (shortT.filter(t => t.winLoss === 'Win').length / shortT.length * 100) : 0 }
  ];

  const rulesFollowed = trades.filter(t => t.rules).length / trades.length * 100;
  const avgDev = trades.reduce((s, t) => s + (t.deviation || 0), 0) / trades.length;
  const riskCons = 1 - (Math.abs(avgDev) / 2);
  const orcaScore = Math.min(100, Math.max(0, (rulesFollowed * 0.4 + winRate * 0.2 + riskCons * 100 * 0.2 + (profitFactor > 1 ? 20 : profitFactor * 20))));

  const recent = trades.slice(-8);
  const recentWR = recent.filter(t => t.winLoss === 'Win').length / recent.length * 100;
  const rw = recent.filter(t => t.winLoss === 'Win');
  const rl = recent.filter(t => t.winLoss === 'Loss');
  const recentPF = Math.abs(rl.reduce((s, t) => s + t.pnl, 0)) > 0 ? rw.reduce((s, t) => s + t.pnl, 0) / Math.abs(rl.reduce((s, t) => s + t.pnl, 0)) : 0;
  const edgeHealth = Math.min(100, Math.max(0, recentWR * 0.5 + recentPF * 25));
  const regimeFit = Math.min(100, Math.max(0, 55 + (profitFactor - 1) * 20 + (winRate - 40) * 0.5));

  let maxConsecLosses = 0, curConsec = 0;
  trades.forEach(t => {
    if (t.winLoss === 'Loss') { curConsec++; maxConsecLosses = Math.max(maxConsecLosses, curConsec); }
    else curConsec = 0;
  });

  const rDist = trades.map(t => ({ id: t.id, r: t.returnR, winLoss: t.winLoss }));

  const dayMap: Record<string, { day: string; pnl: number; trades: number }> = {};
  trades.forEach(t => {
    const d = t.day;
    if (!dayMap[d]) dayMap[d] = { day: d, pnl: 0, trades: 0 };
    dayMap[d].pnl += t.pnl;
    dayMap[d].trades++;
  });

  return {
    totalPnl, winRate, profitFactor, expectancy, avgWin, avgLoss, bestTrade, worstTrade,
    currentStreak, streakType, maxDrawdown: maxDD, equityCurve, coinPerf, directionData,
    orcaScore, edgeHealth, regimeFit, rulesFollowed, maxConsecLosses, rDist,
    dayPerf: Object.values(dayMap), totalTrades: trades.length
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
