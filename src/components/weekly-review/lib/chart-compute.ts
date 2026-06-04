// Pure compute functions for the 27 dashboard charts.
// All functions are dual-unit aware via `getTradeValue(t, unit)`.
// Inputs come from live `Trade[]` from the trading journal.

import type { Trade } from '@/data/trades';
import { parseTradeDate, monthKeyOf, isoWeekKey } from './week-key';
import { getSetupName } from './setup-breakdown';

export type Unit = 'R' | 'USD';

// ─── Value helpers ─────────────────────────────────────────────
export function getTradeValue(t: Trade, unit: Unit): number {
  return unit === 'USD' ? (Number(t.pnl) || 0) : (Number(t.returnR) || 0);
}
export function fmtValue(v: number, unit: Unit): string {
  const n = Number.isFinite(v) ? v : 0;
  if (unit === 'R') return `${n >= 0 ? '+' : ''}${n.toFixed(2)}R`;
  const abs = Math.abs(n);
  const s = abs >= 1000 ? abs.toLocaleString(undefined, { maximumFractionDigits: 0 }) : abs.toFixed(2);
  return `${n < 0 ? '-' : n > 0 ? '+' : ''}$${s}`;
}
export function fmtShort(v: number, unit: Unit): string {
  const n = Number.isFinite(v) ? v : 0;
  if (unit === 'R') return `${n.toFixed(1)}R`;
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${n < 0 ? '-' : ''}$${abs.toFixed(0)}`;
}
const isWin = (t: Trade) => t.winLoss === 'Win' || (Number(t.returnR) || 0) > 0;
const isLoss = (t: Trade) => t.winLoss === 'Loss' || (Number(t.returnR) || 0) < 0;

// ─── 5.A.1 Quant Metrics ───────────────────────────────────────
export interface QuantMetrics {
  profitFactor: string; expectancy: number; sharpe: number;
  maxDrawdown: number; maxRecovery: number;
  avgWinner: number; avgLoser: number;
  winRate: number; totalTrades: number;
}
export function computeQuantMetrics(trades: Trade[], unit: Unit): QuantMetrics | null {
  if (!trades.length) return null;
  const v = trades.map(t => getTradeValue(t, unit));
  const wins = trades.filter(isWin);
  const losses = trades.filter(isLoss);
  const grossWin = wins.reduce((s, t) => s + getTradeValue(t, unit), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + getTradeValue(t, unit), 0));
  const pf = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
  const exp = v.reduce((s, x) => s + x, 0) / v.length;
  const variance = v.reduce((s, x) => s + (x - exp) ** 2, 0) / v.length;
  const stdev = Math.sqrt(variance);
  const sharpe = stdev > 0 ? exp / stdev : 0;
  let cum = 0, peak = 0, maxDD = 0, maxRec = 0, trough = 0;
  v.forEach(x => {
    cum += x;
    if (cum > peak) { peak = cum; maxRec = Math.max(maxRec, peak - trough); }
    const dd = peak - cum;
    if (dd > maxDD) { maxDD = dd; trough = cum; }
  });
  return {
    profitFactor: pf === Infinity ? '∞' : pf.toFixed(2),
    expectancy: exp, sharpe,
    maxDrawdown: -maxDD, maxRecovery: maxRec,
    avgWinner: wins.length ? grossWin / wins.length : 0,
    avgLoser: losses.length ? grossLoss / losses.length : 0,
    winRate: wins.length / Math.max(1, wins.length + losses.length),
    totalTrades: trades.length,
  };
}

// ─── 5.A.2 Equity curve ────────────────────────────────────────
export interface EqPoint { idx: number; cum: number; drawdown: number; asset: string; value: number; isBest: boolean; isWorst: boolean; }
export function computeEquityCurve(trades: Trade[], unit: Unit): EqPoint[] {
  let cum = 0, peak = 0, bi = 0, wi = 0, bv = -Infinity, wv = Infinity;
  const arr = trades.map((t, i) => {
    const v = getTradeValue(t, unit);
    cum += v;
    if (cum > peak) peak = cum;
    if (v > bv) { bv = v; bi = i; }
    if (v < wv) { wv = v; wi = i; }
    return { idx: i + 1, cum: +cum.toFixed(2), drawdown: +(cum - peak).toFixed(2), asset: t.coin || '—', value: v };
  });
  return arr.map((p, i) => ({ ...p, isBest: i === bi, isWorst: i === wi }));
}

// ─── 5.A.3 Distribution ────────────────────────────────────────
export interface DistBucket { range: string; count: number; key: number; sign: 'pos' | 'neg' | 'zero'; }
export function computeDistribution(trades: Trade[], unit: Unit): DistBucket[] {
  if (!trades.length) return [];
  const values = trades.map(t => getTradeValue(t, unit));
  let bucketSize: number;
  if (unit === 'R') bucketSize = 0.5;
  else {
    const range = Math.max(...values) - Math.min(...values);
    const nice = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
    bucketSize = nice.find(b => b >= range / 12) ?? 10000;
  }
  const buckets = new Map<number, number>();
  for (const v of values) {
    const k = Math.round(v / bucketSize) * bucketSize;
    buckets.set(k, (buckets.get(k) || 0) + 1);
  }
  return Array.from(buckets.entries())
    .map(([key, count]) => ({
      key, count,
      range: unit === 'R' ? `${key >= 0 ? '+' : ''}${key}R` : `${key < 0 ? '-' : ''}$${Math.abs(key).toFixed(0)}`,
      sign: key > 0 ? 'pos' : key < 0 ? 'neg' : 'zero',
    }) as DistBucket)
    .sort((a, b) => a.key - b.key);
}

// ─── 5.A.4 Setup Dominance + 5.A.5 Profit by setup ──────────────
export interface SetupRow { name: string; netValue: number; winRate: number; count: number; }
export function computeSetupDominance(trades: Trade[], unit: Unit): SetupRow[] {
  const m = new Map<string, { wins: number; total: number; net: number }>();
  for (const t of trades) {
    const n = getSetupName(t);
    const e = m.get(n) || { wins: 0, total: 0, net: 0 };
    e.total++; if (isWin(t)) e.wins++; e.net += getTradeValue(t, unit);
    m.set(n, e);
  }
  return Array.from(m.entries())
    .map(([name, d]) => ({ name, netValue: +d.net.toFixed(2), winRate: +((d.wins / d.total) * 100).toFixed(1), count: d.total }))
    .sort((a, b) => b.netValue - a.netValue);
}
export function computeProfitBySetup(trades: Trade[], unit: Unit) {
  return computeSetupDominance(trades, unit).filter(s => s.netValue > 0).map(s => ({ name: s.name, value: s.netValue }));
}

// ─── 5.A.6 Asset breakdown ─────────────────────────────────────
export interface AssetRow { asset: string; trades: number; netValue: number; winRate: number; }
export function computeAssetBreakdown(trades: Trade[], unit: Unit): AssetRow[] {
  const m = new Map<string, { trades: number; wins: number; net: number }>();
  for (const t of trades) {
    const k = t.coin || '—';
    const e = m.get(k) || { trades: 0, wins: 0, net: 0 };
    e.trades++; if (isWin(t)) e.wins++; e.net += getTradeValue(t, unit);
    m.set(k, e);
  }
  return Array.from(m.entries())
    .map(([asset, d]) => ({ asset, trades: d.trades, netValue: +d.net.toFixed(2), winRate: +((d.wins / d.trades) * 100).toFixed(1) }))
    .sort((a, b) => b.netValue - a.netValue);
}

// ─── 5.A.7 Psych correlation ───────────────────────────────────
export interface PsychRow { emotion: string; netValue: number; count: number; }
export function computePsychCorrelation(trades: Trade[], unit: Unit): PsychRow[] {
  const m = new Map<string, { net: number; count: number }>();
  for (const t of trades) {
    // Look for emotion tag in comments e.g. "Emotion:Calm"
    const tag = /Emotion:([A-Za-z\u0590-\u05FF]+)/i.exec(t.comments || '')?.[1];
    if (!tag) continue;
    const e = m.get(tag) || { net: 0, count: 0 };
    e.net += getTradeValue(t, unit); e.count++;
    m.set(tag, e);
  }
  return Array.from(m.entries())
    .map(([emotion, d]) => ({ emotion, netValue: +d.net.toFixed(2), count: d.count }))
    .sort((a, b) => b.netValue - a.netValue);
}

// ─── 5.A.8 Time/Day heatmap ────────────────────────────────────
export interface HeatmapData { cells: Record<string, { count: number; net: number }>; maxAbs: number; }
export function computeHeatmap(trades: Trade[], unit: Unit): HeatmapData {
  const cells: Record<string, { count: number; net: number }> = {};
  let maxAbs = 0;
  for (const t of trades) {
    const d = parseTradeDate(t.date);
    if (!d) continue;
    const hour = d.getHours();
    const dayIdx = d.getDay();
    const key = `${dayIdx}-${hour}`;
    if (!cells[key]) cells[key] = { count: 0, net: 0 };
    cells[key].count++;
    cells[key].net += getTradeValue(t, unit);
    maxAbs = Math.max(maxAbs, Math.abs(cells[key].net));
  }
  return { cells, maxAbs };
}

// ─── 5.A.9 Month-over-Month ────────────────────────────────────
export interface MoMRow { label: string; current: number; previous: number; delta: number; }
export function computeMoM(trades: Trade[], anchor: Date, unit: Unit): MoMRow[] {
  const curMk = monthKeyOf(anchor);
  const prev = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const prevMk = monthKeyOf(prev);
  const sliceMk = (mk: string) => trades.filter(t => { const d = parseTradeDate(t.date); return d && monthKeyOf(d) === mk; });
  const cur = sliceMk(curMk);
  const pre = sliceMk(prevMk);
  const net = (arr: Trade[]) => arr.reduce((s, t) => s + getTradeValue(t, unit), 0);
  const wins = (arr: Trade[]) => arr.filter(isWin).length;
  const wr = (arr: Trade[]) => arr.length ? wins(arr) / arr.length * 100 : 0;
  const rows = (l: string, c: number, p: number) => ({ label: l, current: +c.toFixed(2), previous: +p.toFixed(2), delta: +(c - p).toFixed(2) });
  return [
    rows('Net', net(cur), net(pre)),
    rows('Trades', cur.length, pre.length),
    rows('Win Rate %', wr(cur), wr(pre)),
    rows('Wins', wins(cur), wins(pre)),
  ];
}

// ─── 5.A.10 Compliance score ───────────────────────────────────
export function computeCompliance(trades: Trade[]): { score: number; total: number; pct: number } {
  if (!trades.length) return { score: 0, total: 0, pct: 0 };
  const followed = trades.filter(t => t.rules).length;
  return { score: followed, total: trades.length, pct: followed / trades.length };
}

// ─── 5.A.11 Best/Worst week (within trades slice) ──────────────
export function computeBestWorstWeek(trades: Trade[], unit: Unit) {
  const m = new Map<string, { weekKey: string; net: number; trades: number }>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const wk = isoWeekKey(d);
    const e = m.get(wk) || { weekKey: wk, net: 0, trades: 0 };
    e.net += getTradeValue(t, unit); e.trades++;
    m.set(wk, e);
  }
  const arr = Array.from(m.values());
  if (!arr.length) return { best: null, worst: null };
  return {
    best: arr.reduce((a, b) => b.net > a.net ? b : a),
    worst: arr.reduce((a, b) => b.net < a.net ? b : a),
  };
}

// ─── 5.B.2 Trader DNA radar (smarter normalization) ────────────
export interface DnaPoint { metric: string; value: number; fullMark: 100; }
export function computeTraderDNA(trades: Trade[], unit: Unit, defaultRiskUSD = 100): DnaPoint[] {
  if (!trades.length) return [
    'Consistency','Discipline','Win Rate','Profitability','Volume','Risk Mgmt',
  ].map(m => ({ metric: m, value: 0, fullMark: 100 as 100 }));

  // weekly buckets
  const wm = new Map<string, number>();
  let violations = 0;
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const wk = isoWeekKey(d);
    wm.set(wk, (wm.get(wk) || 0) + getTradeValue(t, unit));
    if (!t.rules) violations++;
  }
  const weeks = Array.from(wm.values());
  const mean = weeks.reduce((s, v) => s + v, 0) / Math.max(1, weeks.length);
  const variance = weeks.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, weeks.length);
  const stdev = Math.sqrt(variance);
  const conScale = unit === 'R' ? 20 : 20 / defaultRiskUSD;
  const consistency = Math.max(0, Math.min(100, 100 - stdev * conScale));

  const avgViolations = violations / Math.max(1, weeks.length);
  const discipline = Math.max(0, 100 - avgViolations * 12);

  const wins = trades.filter(isWin).length;
  const losses = trades.filter(isLoss).length;
  const winRate = (wins / Math.max(1, wins + losses)) * 100;

  const net = trades.reduce((s, t) => s + getTradeValue(t, unit), 0);
  const threshold = unit === 'R' ? 10 : defaultRiskUSD * 10;
  const profitability = Math.min(100, Math.max(0, (net / threshold + 1) * 50));

  const volume = Math.min(100, trades.length * 2);

  const goodWeekThreshold = unit === 'R' ? -2 : -2 * defaultRiskUSD;
  const good = weeks.filter(v => v >= goodWeekThreshold).length;
  const riskMgmt = (good / Math.max(1, weeks.length)) * 100;

  return [
    { metric: 'Consistency',    value: Math.round(consistency),   fullMark: 100 },
    { metric: 'Discipline',     value: Math.round(discipline),    fullMark: 100 },
    { metric: 'Win Rate',       value: Math.round(winRate),       fullMark: 100 },
    { metric: 'Profitability',  value: Math.round(profitability), fullMark: 100 },
    { metric: 'Volume',         value: Math.round(volume),        fullMark: 100 },
    { metric: 'Risk Mgmt',      value: Math.round(riskMgmt),      fullMark: 100 },
  ];
}

// ─── 5.B.5 Momentum ────────────────────────────────────────────
export interface MomentumPoint { week: string; value: number; rollingAvg: number; }
export function computeMomentum(trades: Trade[], unit: Unit): MomentumPoint[] {
  const m = new Map<string, number>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const wk = isoWeekKey(d);
    m.set(wk, (m.get(wk) || 0) + getTradeValue(t, unit));
  }
  const weeks = Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return weeks.map(([wk, v], i) => {
    const win = weeks.slice(Math.max(0, i - 3), i + 1).map(([, vv]) => vv);
    const avg = win.reduce((s, x) => s + x, 0) / win.length;
    return { week: wk, value: +v.toFixed(2), rollingAvg: +avg.toFixed(2) };
  });
}

// ─── 5.B.6 Setup evolution ─────────────────────────────────────
export function computeSetupEvolution(trades: Trade[], unit: Unit) {
  const months = new Map<string, Map<string, number>>();
  const names = new Set<string>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const mk = monthKeyOf(d);
    const sn = getSetupName(t);
    names.add(sn);
    if (!months.has(mk)) months.set(mk, new Map());
    const im = months.get(mk)!;
    im.set(sn, (im.get(sn) || 0) + getTradeValue(t, unit));
  }
  const setupNames = Array.from(names);
  const rows = Array.from(months.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mk, im]) => {
      const row: Record<string, number | string> = { month: mk };
      for (const n of setupNames) row[n] = +((im.get(n) || 0)).toFixed(2);
      return row;
    });
  return { rows, setupNames };
}

// ─── 5.B.7/8 Win rate & PF trend (monthly) ─────────────────────
export interface TrendRow { month: string; winRate: number; pf: number; }
export function computeMonthlyTrends(trades: Trade[]): TrendRow[] {
  const m = new Map<string, { w: number; l: number; gw: number; gl: number }>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const r = Number(t.returnR) || 0;
    const mk = monthKeyOf(d);
    const e = m.get(mk) || { w: 0, l: 0, gw: 0, gl: 0 };
    if (r > 0) { e.w++; e.gw += r; } else if (r < 0) { e.l++; e.gl += Math.abs(r); }
    m.set(mk, e);
  }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mk, e]) => ({
      month: mk,
      winRate: +(e.w / Math.max(1, e.w + e.l) * 100).toFixed(1),
      pf: e.gl > 0 ? +(e.gw / e.gl).toFixed(2) : (e.gw > 0 ? 999 : 0),
    }));
}

// ─── 5.B.9 Highlights ──────────────────────────────────────────
export function computeHighlights(trades: Trade[], unit: Unit) {
  // best/worst month
  const m = new Map<string, number>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const mk = monthKeyOf(d);
    m.set(mk, (m.get(mk) || 0) + getTradeValue(t, unit));
  }
  const months = Array.from(m.entries());
  const best = months.length ? months.reduce((a, b) => b[1] > a[1] ? b : a) : null;
  const worst = months.length ? months.reduce((a, b) => b[1] < a[1] ? b : a) : null;
  const setups = computeSetupDominance(trades, unit);
  const bestSetup = setups[0] || null;
  const assets = computeAssetBreakdown(trades, unit);
  const mostActive = assets.sort((a, b) => b.trades - a.trades)[0] || null;
  return { best, worst, bestSetup, mostActive };
}

// ─── 5.C.1 Daily PnL calendar (GitHub-style) ───────────────────
export interface DayCell { date: string; value: number; trades: number; }
export interface CalWeek { days: (DayCell | null)[]; monthLabel?: string; }
export function computeDailyCalendar(trades: Trade[], unit: Unit): { weeks: CalWeek[]; threshold: number } {
  const dm = new Map<string, { value: number; trades: number }>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const key = d.toISOString().slice(0, 10);
    const e = dm.get(key) || { value: 0, trades: 0 };
    e.value += getTradeValue(t, unit); e.trades++;
    dm.set(key, e);
  }
  if (!dm.size) return { weeks: [], threshold: 1 };
  const dates = Array.from(dm.keys()).map(s => new Date(s));
  const minD = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxD = new Date(Math.max(...dates.map(d => d.getTime())));
  const start = new Date(minD); start.setDate(start.getDate() - start.getDay());
  const end = new Date(maxD); end.setDate(end.getDate() + (6 - end.getDay()));
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weeks: CalWeek[] = [];
  const cur = new Date(start);
  let lastMonth = -1;
  while (cur <= end) {
    const w: (DayCell | null)[] = [];
    let monthLabel: string | undefined;
    for (let i = 0; i < 7; i++) {
      const key = cur.toISOString().slice(0, 10);
      const v = dm.get(key);
      w.push(v ? { date: key, value: v.value, trades: v.trades } : null);
      if (cur.getMonth() !== lastMonth && cur.getDate() <= 7) {
        monthLabel = MONTHS[cur.getMonth()]; lastMonth = cur.getMonth();
      }
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push({ days: w, monthLabel });
  }
  const values = Array.from(dm.values()).map(v => Math.abs(v.value));
  const threshold = Math.max(1, ...values);
  return { weeks, threshold };
}

// ─── 5.C.2 Annual equity + drawdown ────────────────────────────
export function computeAnnualEquity(trades: Trade[], unit: Unit) {
  let cum = 0, peak = 0;
  return trades.map((t, i) => {
    const v = getTradeValue(t, unit);
    cum += v; if (cum > peak) peak = cum;
    return { idx: i + 1, date: t.date, equity: +cum.toFixed(2), drawdown: +(cum - peak).toFixed(2) };
  });
}

// ─── 5.C.3 Monthly box plot data ───────────────────────────────
export interface BoxRow { month: string; min: number; q1: number; median: number; q3: number; max: number; n: number; }
function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base] + (sorted[base + 1] !== undefined ? rest * (sorted[base + 1] - sorted[base]) : 0);
}
export function computeMonthlyBox(trades: Trade[], unit: Unit): BoxRow[] {
  const m = new Map<string, number[]>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const mk = monthKeyOf(d);
    if (!m.has(mk)) m.set(mk, []);
    m.get(mk)!.push(getTradeValue(t, unit));
  }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, arr]) => {
    const s = [...arr].sort((a, b) => a - b);
    return { month, min: s[0], q1: quantile(s, 0.25), median: quantile(s, 0.5), q3: quantile(s, 0.75), max: s[s.length - 1], n: s.length };
  });
}

// ─── 5.C.4 MAE vs MFE (no field → empty graceful) ──────────────
export interface MaeMfePoint { mae: number; mfe: number; result: number; asset: string; isWin: boolean; }
export function computeMaeMfe(trades: Trade[]): MaeMfePoint[] {
  // Trade type has no MAE/MFE — we synthesize a proxy from returnR vs risk for shape only.
  // Real data lights up automatically once mae/mfe fields are added.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return trades.map(t => ({
    mae: Math.abs(Number((t as any).mae ?? 0)),
    mfe: Math.abs(Number((t as any).mfe ?? 0)),
    result: Number(t.returnR) || 0,
    asset: t.coin || '—',
    isWin: isWin(t),
  })).filter(p => p.mae > 0 || p.mfe > 0);
}

// ─── 5.C.5 Holding time vs R ───────────────────────────────────
export interface HoldPoint { hours: number; r: number; isWin: boolean; asset: string; }
export function computeHoldingTime(trades: Trade[]): HoldPoint[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return trades.map(t => {
    const a = t as any;
    const hours = Number(a.holdingHours ?? a.duration ?? 0);
    return { hours, r: Number(t.returnR) || 0, isWin: isWin(t), asset: t.coin || '—' };
  }).filter(p => p.hours > 0);
}

// ─── 5.C.6 Asset correlation matrix ────────────────────────────
export function computeAssetCorrelation(trades: Trade[], unit: Unit) {
  const byAssetDay = new Map<string, Map<string, number>>(); // asset → day → net
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const day = d.toISOString().slice(0, 10);
    const a = t.coin || '—';
    if (!byAssetDay.has(a)) byAssetDay.set(a, new Map());
    const im = byAssetDay.get(a)!;
    im.set(day, (im.get(day) || 0) + getTradeValue(t, unit));
  }
  const assets = Array.from(byAssetDay.keys()).slice(0, 12);
  const days = Array.from(new Set(Array.from(byAssetDay.values()).flatMap(m => Array.from(m.keys())))).sort();
  const series: Record<string, number[]> = {};
  for (const a of assets) series[a] = days.map(d => byAssetDay.get(a)!.get(d) || 0);
  const corr = (x: number[], y: number[]) => {
    const n = x.length; if (!n) return 0;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
    const d = Math.sqrt(dx * dy);
    return d > 0 ? num / d : 0;
  };
  const matrix = assets.map(a => assets.map(b => +corr(series[a], series[b]).toFixed(2)));
  return { assets, matrix };
}

// ─── 5.C.7 Asset treemap ───────────────────────────────────────
export function computeTreemap(trades: Trade[], unit: Unit) {
  return computeAssetBreakdown(trades, unit).map(a => ({
    name: a.asset, size: Math.abs(a.netValue), value: a.netValue, count: a.trades, wr: a.winRate,
  })).filter(a => a.size > 0);
}

// ─── 5.C.8 Monte Carlo simulation ──────────────────────────────
export interface McLine { idx: number; p5: number; p25: number; median: number; p75: number; p95: number; }
export function computeMonteCarlo(trades: Trade[], unit: Unit, runs = 200, length?: number): McLine[] {
  if (!trades.length) return [];
  const values = trades.map(t => getTradeValue(t, unit));
  const L = length || values.length;
  const sims: number[][] = [];
  for (let r = 0; r < runs; r++) {
    let cum = 0; const arr: number[] = [];
    for (let i = 0; i < L; i++) {
      cum += values[Math.floor(Math.random() * values.length)];
      arr.push(cum);
    }
    sims.push(arr);
  }
  const out: McLine[] = [];
  for (let i = 0; i < L; i++) {
    const col = sims.map(s => s[i]).sort((a, b) => a - b);
    out.push({
      idx: i + 1,
      p5: col[Math.floor(col.length * 0.05)],
      p25: col[Math.floor(col.length * 0.25)],
      median: col[Math.floor(col.length * 0.5)],
      p75: col[Math.floor(col.length * 0.75)],
      p95: col[Math.floor(col.length * 0.95)],
    });
  }
  return out;
}

// ─── 5.C.9 Rolling edge decay ──────────────────────────────────
export function computeRollingEdge(trades: Trade[], unit: Unit, window = 20) {
  const values = trades.map(t => getTradeValue(t, unit));
  const out: { idx: number; expectancy: number }[] = [];
  for (let i = window - 1; i < values.length; i++) {
    const slice = values.slice(i - window + 1, i + 1);
    const exp = slice.reduce((s, v) => s + v, 0) / slice.length;
    out.push({ idx: i + 1, expectancy: +exp.toFixed(3) });
  }
  return out;
}

// ─── 5.C.10 Expectancy evolution (monthly) ─────────────────────
export function computeExpectancyEvolution(trades: Trade[], unit: Unit) {
  const m = new Map<string, number[]>();
  for (const t of trades) {
    const d = parseTradeDate(t.date); if (!d) continue;
    const mk = monthKeyOf(d);
    if (!m.has(mk)) m.set(mk, []);
    m.get(mk)!.push(getTradeValue(t, unit));
  }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([month, arr]) => ({
    month,
    expectancy: +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(3),
    trades: arr.length,
  }));
}
