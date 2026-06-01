/**
 * Mock dataset for the landing-page interactive demo.
 * Deterministic — same numbers on every render so demo charts feel
 * stable while still looking like a real account.
 */

export interface MockTrade {
  i: number;
  date: string;
  coin: string;
  side: 'Long' | 'Short';
  r: number;       // R-multiple result
  pnl: number;     // USD
  balance: number; // running balance
  risk: number;    // USD risk
  win: boolean;
}

const COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ARB', 'LINK'];

// LCG for deterministic randomness — seeded once.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function generateMockTrades(count = 60, seed = 7): MockTrade[] {
  const rnd = makeRng(seed);
  const trades: MockTrade[] = [];
  let balance = 10000;
  const start = new Date();
  start.setDate(start.getDate() - count);

  for (let i = 0; i < count; i++) {
    // bias toward profitable: 58% win, expectancy ~0.35R
    const isWin = rnd() < 0.58;
    let r: number;
    if (isWin) {
      // wins distributed between 0.5 and 3R
      r = 0.5 + rnd() * 2.5;
    } else {
      // losses capped at -1R (discipline)
      r = -(0.6 + rnd() * 0.45);
    }
    const risk = 80 + Math.floor(rnd() * 60);
    const pnl = +(risk * r).toFixed(2);
    balance = +(balance + pnl).toFixed(2);
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    trades.push({
      i: i + 1,
      date: d.toISOString().slice(0, 10),
      coin: COINS[Math.floor(rnd() * COINS.length)],
      side: rnd() > 0.5 ? 'Long' : 'Short',
      r: +r.toFixed(2),
      pnl,
      balance,
      risk,
      win: isWin,
    });
  }
  return trades;
}

export interface MockStats {
  totalTrades: number;
  winRate: number;
  expectancyR: number;
  totalPnl: number;
  profitFactor: number;
  maxDrawdown: number;
  bestR: number;
  worstR: number;
}

export function computeMockStats(trades: MockTrade[]): MockStats {
  if (!trades.length) {
    return { totalTrades: 0, winRate: 0, expectancyR: 0, totalPnl: 0, profitFactor: 0, maxDrawdown: 0, bestR: 0, worstR: 0 };
  }
  const wins = trades.filter(t => t.win);
  const losses = trades.filter(t => !t.win);
  const winRate = (wins.length / trades.length) * 100;
  const expectancyR = trades.reduce((s, t) => s + t.r, 0) / trades.length;
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const gp = wins.reduce((s, t) => s + t.pnl, 0);
  const gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = gl > 0 ? gp / gl : gp > 0 ? 99 : 0;
  let peak = 10000, dd = 0;
  trades.forEach(t => {
    if (t.balance > peak) peak = t.balance;
    const cur = ((peak - t.balance) / peak) * 100;
    if (cur > dd) dd = cur;
  });
  return {
    totalTrades: trades.length,
    winRate: +winRate.toFixed(1),
    expectancyR: +expectancyR.toFixed(2),
    totalPnl: +totalPnl.toFixed(0),
    profitFactor: +profitFactor.toFixed(2),
    maxDrawdown: +dd.toFixed(1),
    bestR: +Math.max(...trades.map(t => t.r)).toFixed(2),
    worstR: +Math.min(...trades.map(t => t.r)).toFixed(2),
  };
}

// Pre-aggregated derivations used by the demo charts.
export function rBuckets(trades: MockTrade[]) {
  const buckets = [
    { label: '< -1R', from: -Infinity, to: -1, n: 0 },
    { label: '-1 → 0', from: -1, to: 0, n: 0 },
    { label: '0 → 1R', from: 0, to: 1, n: 0 },
    { label: '1 → 2R', from: 1, to: 2, n: 0 },
    { label: '2 → 3R', from: 2, to: 3, n: 0 },
    { label: '> 3R', from: 3, to: Infinity, n: 0 },
  ];
  trades.forEach(t => {
    const b = buckets.find(b => t.r >= b.from && t.r < b.to);
    if (b) b.n++;
  });
  return buckets;
}

export function coinPerf(trades: MockTrade[]) {
  const m = new Map<string, number>();
  trades.forEach(t => m.set(t.coin, (m.get(t.coin) || 0) + t.pnl));
  return Array.from(m, ([coin, pnl]) => ({ coin, pnl: +pnl.toFixed(0) }))
    .sort((a, b) => b.pnl - a.pnl);
}

export function drawdownCurve(trades: MockTrade[]) {
  let peak = 10000;
  return trades.map(t => {
    if (t.balance > peak) peak = t.balance;
    const dd = peak > 0 ? -((peak - t.balance) / peak) * 100 : 0;
    return { i: t.i, dd: +dd.toFixed(2) };
  });
}

export function rollingExpectancy(trades: MockTrade[], window = 10) {
  return trades.map((_, i) => {
    const slice = trades.slice(Math.max(0, i - window + 1), i + 1);
    const exp = slice.reduce((s, t) => s + t.r, 0) / slice.length;
    return { i: i + 1, exp: +exp.toFixed(3) };
  });
}

export function disciplineTrend(trades: MockTrade[]) {
  // Discipline = % of trades with loss capped at -1R (mock signal)
  return trades.map((_, i) => {
    const slice = trades.slice(Math.max(0, i - 9), i + 1);
    const disciplined = slice.filter(t => t.win || t.r >= -1.05).length;
    return { i: i + 1, pct: +((disciplined / slice.length) * 100).toFixed(1) };
  });
}
