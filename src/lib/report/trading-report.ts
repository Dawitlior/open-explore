/**
 * Trading Report engine — MT5-style account statement for ORCA Investment.
 *
 * Produces a fully self-contained HTML document (no external assets, logo is
 * inlined as a data-URI) containing:
 *   Header · Deals · Positions · Working Orders · Summary · Details
 * plus inline SVG charts (balance curve, monthly P/L, win-loss split) and the
 * ORCA seal / stamp.
 *
 * Everything here is pure — no React, no DOM — so it can be unit-tested and
 * reused by any surface (journal menu, performance page, scheduled export).
 */
import type { Trade } from '@/data/trades';
import { getEffectiveR } from '@/lib/r-multiple';

export interface ReportPosition {
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  unrealized_pnl: number;
  stop_loss?: number | null;
  leverage?: number | null;
  account_label?: string | null;
}

export interface ReportMeta {
  brand: string;
  accountName: string;
  /** Owner email — the only identity shown on the statement. */
  ownerEmail: string;
  currency: string;
  initialDeposit: number;
  isRTL: boolean;
  logoDataUrl?: string;
  positions?: ReportPosition[];
  /** Optional AI-written executive summary (markdown-lite: plain paragraphs). */
  aiSummary?: string | null;
}

export interface ReportStats {
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  profitFactor: number;
  expectedPayoff: number;
  balanceDDAbsolute: number;
  balanceDDMaximal: number;
  balanceDDMaximalPct: number;
  balanceDDRelativePct: number;
  balanceDDRelativeMoney: number;
  totalTrades: number;
  shortTrades: number;
  shortWonPct: number;
  longTrades: number;
  longWonPct: number;
  profitTrades: number;
  profitTradesPct: number;
  lossTrades: number;
  lossTradesPct: number;
  largestProfit: number;
  largestLoss: number;
  averageProfit: number;
  averageLoss: number;
  maxConsecWins: number;
  maxConsecWinsMoney: number;
  maxConsecLosses: number;
  maxConsecLossesMoney: number;
  maxConsecProfit: number;
  maxConsecProfitCount: number;
  maxConsecLossMoney: number;
  maxConsecLossCount: number;
  avgConsecWins: number;
  avgConsecLosses: number;
  balance: number;
  equity: number;
  floatingPL: number;
  totalR: number;
  expectancyR: number;
  winRate: number;
  balanceCurve: number[];
}

const n = (v: unknown): number => (typeof v === 'number' && isFinite(v) ? v : 0);

const chronological = (trades: Trade[]): Trade[] =>
  [...trades].filter(Boolean).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || a.id - b.id);

/** Streak accumulator over the sign of each deal result. */
function streaks(results: number[]) {
  const win: { len: number; sum: number }[] = [];
  const loss: { len: number; sum: number }[] = [];
  let curLen = 0, curSum = 0, curSign = 0;
  const flush = () => {
    if (!curLen) return;
    (curSign > 0 ? win : loss).push({ len: curLen, sum: curSum });
    curLen = 0; curSum = 0;
  };
  for (const r of results) {
    const sign = r > 0 ? 1 : r < 0 ? -1 : 0;
    if (sign === 0) continue;
    if (sign !== curSign) { flush(); curSign = sign; }
    curLen++; curSum += r;
  }
  flush();
  return { win, loss };
}

export function computeReportStats(trades: Trade[], initialDeposit: number, positions: ReportPosition[] = []): ReportStats {
  const list = chronological(trades);
  const results = list.map(t => n(t.pnl));

  const wins = results.filter(r => r > 0);
  const losses = results.filter(r => r < 0);
  const grossProfit = wins.reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));
  const netProfit = grossProfit - grossLoss;

  // ── Balance curve & drawdowns ───────────────────────────────────────────
  const balanceCurve: number[] = [initialDeposit];
  let bal = initialDeposit;
  for (const r of results) { bal += r; balanceCurve.push(bal); }

  const minBalance = Math.min(...balanceCurve);
  const balanceDDAbsolute = Math.max(0, initialDeposit - minBalance);

  let peak = balanceCurve[0];
  let ddMax = 0, ddMaxPct = 0, ddRelPct = 0, ddRelMoney = 0;
  for (const b of balanceCurve) {
    if (b > peak) peak = b;
    const drop = peak - b;
    const dropPct = peak !== 0 ? (drop / Math.abs(peak)) * 100 : 0;
    if (drop > ddMax) { ddMax = drop; ddMaxPct = dropPct; }
    if (dropPct > ddRelPct) { ddRelPct = dropPct; ddRelMoney = drop; }
  }

  const longs = list.filter(t => t.direction === 'Long');
  const shorts = list.filter(t => t.direction === 'Short');
  const wonPct = (arr: Trade[]) => (arr.length ? (arr.filter(t => n(t.pnl) > 0).length / arr.length) * 100 : 0);

  const st = streaks(results);
  const maxByLen = (a: { len: number; sum: number }[]) => a.reduce((m, x) => (x.len > m.len ? x : m), { len: 0, sum: 0 });
  const maxByProfit = (a: { len: number; sum: number }[]) =>
    a.reduce((m, x) => (Math.abs(x.sum) > Math.abs(m.sum) ? x : m), { len: 0, sum: 0 });
  const avgLen = (a: { len: number; sum: number }[]) => (a.length ? a.reduce((s, x) => s + x.len, 0) / a.length : 0);

  const bestWinStreak = maxByLen(st.win);
  const worstLossStreak = maxByLen(st.loss);
  const bestProfitStreak = maxByProfit(st.win);
  const worstLossMoney = maxByProfit(st.loss);

  const floatingPL = positions.reduce((s, p) => s + n(p.unrealized_pnl), 0);
  const balance = initialDeposit + netProfit;
  const totalR = list.reduce((s, t) => s + getEffectiveR(t), 0);
  const winsR = list.filter(t => t.winLoss === 'Win');
  const lossR = list.filter(t => t.winLoss === 'Loss');
  const avgWinR = winsR.length ? winsR.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / winsR.length : 0;
  const avgLossR = lossR.length ? lossR.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) / lossR.length : 0;
  const wr = list.length ? winsR.length / list.length : 0;

  return {
    grossProfit, grossLoss, netProfit,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0),
    expectedPayoff: list.length ? netProfit / list.length : 0,
    balanceDDAbsolute,
    balanceDDMaximal: ddMax,
    balanceDDMaximalPct: ddMaxPct,
    balanceDDRelativePct: ddRelPct,
    balanceDDRelativeMoney: ddRelMoney,
    totalTrades: list.length,
    shortTrades: shorts.length,
    shortWonPct: wonPct(shorts),
    longTrades: longs.length,
    longWonPct: wonPct(longs),
    profitTrades: wins.length,
    profitTradesPct: list.length ? (wins.length / list.length) * 100 : 0,
    lossTrades: losses.length,
    lossTradesPct: list.length ? (losses.length / list.length) * 100 : 0,
    largestProfit: wins.length ? Math.max(...wins) : 0,
    largestLoss: losses.length ? Math.min(...losses) : 0,
    averageProfit: wins.length ? grossProfit / wins.length : 0,
    averageLoss: losses.length ? -grossLoss / losses.length : 0,
    maxConsecWins: bestWinStreak.len,
    maxConsecWinsMoney: bestWinStreak.sum,
    maxConsecLosses: worstLossStreak.len,
    maxConsecLossesMoney: worstLossStreak.sum,
    maxConsecProfit: bestProfitStreak.sum,
    maxConsecProfitCount: bestProfitStreak.len,
    maxConsecLossMoney: worstLossMoney.sum,
    maxConsecLossCount: worstLossMoney.len,
    avgConsecWins: avgLen(st.win),
    avgConsecLosses: avgLen(st.loss),
    balance,
    equity: balance + floatingPL,
    floatingPL,
    totalR,
    expectancyR: wr * avgWinR - (1 - wr) * avgLossR,
    winRate: wr * 100,
    balanceCurve,
  };
}

/* ────────────────────────── rendering helpers ────────────────────────── */

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const money = (v: number, cur: string) =>
  `${v < 0 ? '-' : ''}${cur === 'USD' ? '$' : ''}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cur === 'USD' ? '' : ' ' + cur}`;

const num = (v: number, d = 2) => (isFinite(v) ? v.toFixed(d) : '—');
const pct = (v: number) => `${num(v, 2)}%`;

function balanceChartSvg(curve: number[], w = 980, h = 260): string {
  if (curve.length < 2) return '<div class="empty">No balance history yet</div>';
  const min = Math.min(...curve), max = Math.max(...curve);
  const pad = (max - min) * 0.08 || Math.abs(max) * 0.08 || 1;
  const lo = min - pad, hi = max + pad;
  const x = (i: number) => (i / (curve.length - 1)) * (w - 70) + 55;
  const y = (v: number) => h - 30 - ((v - lo) / (hi - lo)) * (h - 55);
  const line = curve.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(curve.length - 1).toFixed(1)},${h - 30} L${x(0).toFixed(1)},${h - 30} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const v = lo + (hi - lo) * (1 - f);
    const yy = 25 + f * (h - 55);
    return `<line x1="55" y1="${yy}" x2="${w - 15}" y2="${yy}" class="grid"/>
      <text x="48" y="${yy + 3}" class="axis" text-anchor="end">${v.toFixed(0)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Balance curve">
    <defs><linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4af37" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#d4af37" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#bal)"/>
    <path d="${line}" fill="none" stroke="#d4af37" stroke-width="2"/>
    <text x="${w / 2}" y="${h - 8}" class="axis" text-anchor="middle">Deals</text>
  </svg>`;
}

function monthlyBarsSvg(list: Trade[], w = 980, h = 200): string {
  const map = new Map<string, number>();
  for (const t of list) {
    const k = String(t.date || '').slice(0, 7);
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + n(t.pnl));
  }
  const rows = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (!rows.length) return '<div class="empty">No monthly data</div>';
  const maxAbs = Math.max(...rows.map(([, v]) => Math.abs(v))) || 1;
  const bw = Math.min(48, (w - 70) / rows.length - 8);
  const zero = h / 2;
  const bars = rows.map(([k, v], i) => {
    const cx = 55 + (i + 0.5) * ((w - 70) / rows.length);
    const bh = (Math.abs(v) / maxAbs) * (h / 2 - 26);
    const yTop = v >= 0 ? zero - bh : zero;
    return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, bh).toFixed(1)}"
      fill="${v >= 0 ? '#26a69a' : '#ef5350'}" rx="2"/>
      <text x="${cx.toFixed(1)}" y="${h - 6}" class="axis" text-anchor="middle">${esc(k.slice(2))}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="Monthly P/L">
    <line x1="55" y1="${zero}" x2="${w - 15}" y2="${zero}" class="grid"/>${bars}</svg>`;
}

function donutSvg(winsCount: number, lossCount: number): string {
  const total = winsCount + lossCount || 1;
  const wFrac = winsCount / total;
  const c = 2 * Math.PI * 54;
  return `<svg viewBox="0 0 140 140" class="donut" role="img" aria-label="Win / loss split">
    <circle cx="70" cy="70" r="54" fill="none" stroke="#ef5350" stroke-width="16"/>
    <circle cx="70" cy="70" r="54" fill="none" stroke="#26a69a" stroke-width="16"
      stroke-dasharray="${(c * wFrac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 70 70)"/>
    <text x="70" y="66" text-anchor="middle" class="donut-v">${(wFrac * 100).toFixed(0)}%</text>
    <text x="70" y="86" text-anchor="middle" class="donut-l">WIN RATE</text>
  </svg>`;
}

function stampSvg(dateLabel: string): string {
  return `<svg viewBox="0 0 190 190" class="stamp" role="img" aria-label="ORCA verified stamp">
    <circle cx="95" cy="95" r="88" fill="none" stroke="#d4af37" stroke-width="2.5" opacity="0.85"/>
    <circle cx="95" cy="95" r="78" fill="none" stroke="#d4af37" stroke-width="1" opacity="0.5"/>
    <path id="stamparc" d="M95,25 a70,70 0 1,1 -0.1,0" fill="none"/>
    <text class="stamp-arc"><textPath href="#stamparc" startOffset="50%" text-anchor="middle">
      ORCA INVESTMENT · VERIFIED TRADING STATEMENT ·
    </textPath></text>
    <text x="95" y="92" text-anchor="middle" class="stamp-main">ORCA</text>
    <text x="95" y="112" text-anchor="middle" class="stamp-sub">OFFICIAL RECORD</text>
    <text x="95" y="132" text-anchor="middle" class="stamp-date">${esc(dateLabel)}</text>
  </svg>`;
}

function row(label: string, value: string, accent?: 'pos' | 'neg'): string {
  return `<div class="kv"><span>${esc(label)}</span><b class="${accent ?? ''}">${value}</b></div>`;
}

/* ────────────────────────────── document ────────────────────────────── */

export function buildTradingReportHtml(trades: Trade[], meta: ReportMeta): string {
  const list = chronological(trades);
  const positions = meta.positions ?? [];
  const s = computeReportStats(list, meta.initialDeposit, positions);
  const cur = meta.currency || 'USD';
  const now = new Date();
  const generated = now.toISOString().slice(0, 16).replace('T', ' ');
  const m = (v: number) => money(v, cur);
  const sign = (v: number) => (v > 0 ? 'pos' : v < 0 ? 'neg' : undefined);

  const firstDate = String(list[0]?.date || '').slice(0, 10);
  const lastDate = String(list[list.length - 1]?.date || '').slice(0, 10);
  const periodLabel = firstDate && lastDate ? `${firstDate} → ${lastDate}` : '—';

  /* ── Grouped analytics used by the extended pages ───────────────────── */
  type Bucket = { trades: number; wins: number; pnl: number; r: number };
  const groupBy = (keyOf: (t: Trade) => string) => {
    const map = new Map<string, Bucket>();
    for (const t of list) {
      const k = keyOf(t) || '—';
      const e = map.get(k) || { trades: 0, wins: 0, pnl: 0, r: 0 };
      e.trades++; e.pnl += n(t.pnl); e.r += getEffectiveR(t);
      if (t.winLoss === 'Win') e.wins++;
      map.set(k, e);
    }
    return map;
  };
  const bucketRows = (map: Map<string, Bucket>, sortKey = false) => {
    const entries = [...map.entries()];
    entries.sort(sortKey ? (a, b) => a[0].localeCompare(b[0]) : (a, b) => b[1].pnl - a[1].pnl);
    return entries.map(([k, v]) => `
      <tr><td>${esc(k)}</td><td>${v.trades}</td>
        <td>${num((v.wins / Math.max(1, v.trades)) * 100, 1)}%</td>
        <td class="${sign(v.r) ?? ''}">${num(v.r, 2)}R</td>
        <td class="${sign(v.pnl) ?? ''}">${m(v.pnl)}</td>
        <td class="${sign(v.pnl / Math.max(1, v.trades)) ?? ''}">${m(v.pnl / Math.max(1, v.trades))}</td>
      </tr>`).join('') || `<tr><td colspan="6" class="empty-cell">No deals</td></tr>`;
  };

  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dirRows = bucketRows(groupBy(t => String(t.direction || '—')));
  const dowRows = bucketRows(groupBy(t => {
    const d = new Date(String(t.date || ''));
    return isNaN(d.getTime()) ? '—' : DOW[d.getDay()];
  }));
  const monthRows = bucketRows(groupBy(t => String(t.date || '').slice(0, 7)), true);
  const setupRows = bucketRows(groupBy(t => String((t as unknown as { setup?: string }).setup || t.orderType || '—')));

  const ranked = [...list].sort((a, b) => n(b.pnl) - n(a.pnl));
  const extremeRow = (t: Trade) => `
    <tr><td>${esc(String(t.date || '').slice(0, 16).replace('T', ' '))}</td>
      <td>${esc(t.coin)}</td>
      <td class="${t.direction === 'Long' ? 'pos' : 'neg'}">${esc(t.direction)}</td>
      <td class="${sign(getEffectiveR(t)) ?? ''}">${num(getEffectiveR(t), 2)}R</td>
      <td class="${sign(n(t.pnl)) ?? ''}">${m(n(t.pnl))}</td>
      <td>${t.rules ? '✔' : '✘'}</td></tr>`;
  const bestRows = ranked.slice(0, 5).map(extremeRow).join('') || `<tr><td colspan="6" class="empty-cell">—</td></tr>`;
  const worstRows = ranked.slice(-5).reverse().map(extremeRow).join('') || `<tr><td colspan="6" class="empty-cell">—</td></tr>`;

  const withRules = list.filter(t => t.rules);
  const brokeRules = list.filter(t => !t.rules);
  const avgOf = (arr: Trade[]) => (arr.length ? arr.reduce((x, t) => x + n(t.pnl), 0) / arr.length : 0);
  const rSum = (arr: Trade[]) => arr.reduce((x, t) => x + getEffectiveR(t), 0);
  const winPct = (arr: Trade[]) => (arr.length ? (arr.filter(t => t.winLoss === 'Win').length / arr.length) * 100 : 0);

  /* R-multiple distribution buckets. */
  const R_BUCKETS: Array<[string, (r: number) => boolean]> = [
    ['≤ -2R', r => r <= -2],
    ['-2R…-1R', r => r > -2 && r <= -1],
    ['-1R…0R', r => r > -1 && r < 0],
    ['0R…1R', r => r >= 0 && r < 1],
    ['1R…2R', r => r >= 1 && r < 2],
    ['2R…3R', r => r >= 2 && r < 3],
    ['≥ 3R', r => r >= 3],
  ];
  const rDist = R_BUCKETS.map(([label, test]) => {
    const hits = list.filter(t => test(getEffectiveR(t)));
    return { label, count: hits.length, pnl: hits.reduce((x, t) => x + n(t.pnl), 0) };
  });
  const rMax = Math.max(1, ...rDist.map(b => b.count));
  const rDistRows = rDist.map(b => `
    <tr><td>${esc(b.label)}</td><td>${b.count}</td>
      <td>${num((b.count / Math.max(1, list.length)) * 100, 1)}%</td>
      <td><span style="display:inline-block;height:8px;border-radius:4px;width:${((b.count / rMax) * 100).toFixed(1)}%;
        background:${b.label.startsWith('≤') || b.label.startsWith('-') ? '#ef5350' : '#26a69a'}"></span></td>
      <td class="${sign(b.pnl) ?? ''}">${m(b.pnl)}</td></tr>`).join('');


  const dealsRows = list.map((t, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(String(t.date || '').replace('T', ' '))}</td>
      <td>${esc(t.coin)}</td>
      <td class="${t.direction === 'Long' ? 'pos' : 'neg'}">${esc(t.direction)}</td>
      <td>${esc(t.orderType || '—')}</td>
      <td>${num(n(t.entry), 4)}</td>
      <td>${t.stopLoss == null ? '—' : num(n(t.stopLoss), 4)}</td>
      <td>${num(n(t.exit), 4)}</td>
      <td>${num(n(t.positionSize), 2)}</td>
      <td class="${sign(getEffectiveR(t)) ?? ''}">${num(getEffectiveR(t), 2)}R</td>
      <td class="${sign(n(t.pnl)) ?? ''}">${m(n(t.pnl))}</td>
      <td>${t.rules ? '✔' : '✘'}</td>
    </tr>`).join('');

  const positionRows = positions.length
    ? positions.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(p.symbol)}</td>
        <td class="${String(p.side).toLowerCase().startsWith('l') ? 'pos' : 'neg'}">${esc(p.side)}</td>
        <td>${num(n(p.size), 4)}</td>
        <td>${num(n(p.entry_price), 4)}</td>
        <td>${p.stop_loss == null ? '—' : num(n(p.stop_loss), 4)}</td>
        <td>${p.leverage ? `${num(n(p.leverage), 1)}x` : '—'}</td>
        <td class="${sign(n(p.unrealized_pnl)) ?? ''}">${m(n(p.unrealized_pnl))}</td>
      </tr>`).join('')
    : `<tr><td colspan="8" class="empty-cell">No open positions</td></tr>`;

  const bySymbol = new Map<string, { trades: number; wins: number; pnl: number; r: number }>();
  for (const t of list) {
    const k = t.coin || 'UNKNOWN';
    const e = bySymbol.get(k) || { trades: 0, wins: 0, pnl: 0, r: 0 };
    e.trades++; e.pnl += n(t.pnl); e.r += getEffectiveR(t);
    if (t.winLoss === 'Win') e.wins++;
    bySymbol.set(k, e);
  }
  const symbolRows = [...bySymbol.entries()].sort((a, b) => b[1].pnl - a[1].pnl).map(([k, v]) => `
    <tr>
      <td>${esc(k)}</td><td>${v.trades}</td><td>${num((v.wins / v.trades) * 100, 1)}%</td>
      <td class="${sign(v.r) ?? ''}">${num(v.r, 2)}R</td>
      <td class="${sign(v.pnl) ?? ''}">${m(v.pnl)}</td>
    </tr>`).join('') || `<tr><td colspan="5" class="empty-cell">No deals</td></tr>`;

  const logo = meta.logoDataUrl
    ? `<img src="${meta.logoDataUrl}" alt="ORCA Investment" class="logo"/>`
    : `<div class="logo-fallback">ORCA</div>`;

  const aiBlock = meta.aiSummary
    ? `<section class="block">
        <h2>Executive Summary <span class="tag">AI</span></h2>
        <div class="ai">${meta.aiSummary.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('')}</div>
      </section>`
    : '';

  return `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ORCA Trading Report — ${esc(meta.accountName)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  :root { --gold:#d4af37; --bg:#070b12; --card:#0d1320; --line:rgba(255,255,255,.08); --txt:#e7edf7; --dim:#8b9bb4; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--txt);
    font-family:'Poppins',-apple-system,'Segoe UI',sans-serif; font-size:12px; }
  .wrap { max-width:1180px; margin:0 auto; padding:28px 22px 60px; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:24px;
    border-bottom:1px solid var(--line); padding-bottom:18px; margin-bottom:22px; }
  .logo { width:76px; height:76px; object-fit:contain; filter:drop-shadow(0 6px 18px rgba(212,175,55,.35)); }
  .logo-fallback { width:76px;height:76px;display:grid;place-items:center;border:2px solid var(--gold);
    border-radius:16px;color:var(--gold);font-weight:800;letter-spacing:.12em; }
  .brand { display:flex; gap:16px; align-items:center; }
  .brand h1 { margin:0; font-size:22px; letter-spacing:.02em; }
  .brand .sub { color:var(--gold); font-size:10px; letter-spacing:.28em; text-transform:uppercase; margin-top:4px; }
  .meta { text-align:right; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:11px; color:var(--dim); line-height:1.9; }
  .meta b { color:var(--txt); }
  .block { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px; margin-bottom:18px; }
  h2 { margin:0 0 14px; font-size:13px; letter-spacing:.16em; text-transform:uppercase; color:var(--gold); }
  .tag { font-size:9px; background:rgba(212,175,55,.16); border:1px solid rgba(212,175,55,.4);
    color:var(--gold); padding:2px 6px; border-radius:999px; letter-spacing:.1em; margin-inline-start:6px; }
  table { width:100%; border-collapse:collapse; font-family:'IBM Plex Mono',ui-monospace,monospace; font-size:10.5px; }
  th { text-align:left; color:var(--dim); font-weight:600; text-transform:uppercase; letter-spacing:.08em;
    font-size:9px; padding:8px 6px; border-bottom:1px solid var(--line); }
  td { padding:6px; border-bottom:1px solid rgba(255,255,255,.04); white-space:nowrap; }
  tr:nth-child(even) td { background:rgba(255,255,255,.015); }
  .pos { color:#26a69a; } .neg { color:#ef5350; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px 26px; }
  .kv { display:flex; justify-content:space-between; gap:12px; padding:6px 0;
    border-bottom:1px dashed rgba(255,255,255,.06); font-size:11px; color:var(--dim); }
  .kv b { color:var(--txt); font-family:'IBM Plex Mono',ui-monospace,monospace; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:6px; }
  .kpi { background:rgba(255,255,255,.03); border:1px solid var(--line); border-radius:12px; padding:12px 14px; }
  .kpi span { display:block; font-size:9px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); }
  .kpi b { display:block; margin-top:6px; font-size:19px; font-family:'IBM Plex Mono',ui-monospace,monospace; }
  .chart { width:100%; height:auto; } .grid { stroke:rgba(255,255,255,.07); stroke-width:1; }
  .axis { fill:var(--dim); font-size:9px; font-family:'IBM Plex Mono',monospace; }
  .donut { width:140px; height:140px; }
  .donut-v { fill:var(--txt); font-size:22px; font-weight:700; }
  .donut-l { fill:var(--dim); font-size:8px; letter-spacing:.16em; }
  .stamp { width:150px; height:150px; opacity:.95; }
  .stamp-arc { fill:var(--gold); font-size:11px; letter-spacing:.18em; }
  .stamp-main { fill:var(--gold); font-size:30px; font-weight:800; letter-spacing:.14em; }
  .stamp-sub { fill:var(--dim); font-size:9px; letter-spacing:.24em; }
  .stamp-date { fill:var(--dim); font-size:9px; font-family:'IBM Plex Mono',monospace; }
  .footer { display:flex; justify-content:space-between; align-items:center; gap:20px;
    border-top:1px solid var(--line); padding-top:16px; color:var(--dim); font-size:10px; }
  .ai p { margin:0 0 10px; line-height:1.7; color:#cfe0f5; }
  .empty, .empty-cell { color:var(--dim); text-align:center; padding:18px; font-size:11px; }
  .scroll { max-height:520px; overflow:auto; }
  .block { break-inside:avoid; page-break-inside:avoid; }
  .page { break-before:page; page-break-before:always; }
  .plabel { font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.22em;
    text-transform:uppercase; color:var(--dim); margin:0 0 10px; }
  .note { font-size:10.5px; color:var(--dim); line-height:1.7; margin-top:10px; }
  @media print { body { background:#fff; color:#111; } .block { background:#fff; border-color:#ddd; }
    .kpi { background:#fafafa; } .scroll { max-height:none; } h2 { color:#8a6d12; }
    .kv { color:#555; } .kv b, .meta b { color:#111; } .meta, .axis, .footer { color:#666; } }
</style></head>
<body><div class="wrap">
  <header>
    <div class="brand">${logo}
      <div><h1>${esc(meta.brand)}</h1><div class="sub">Trading Report · Account Statement</div></div>
    </div>
    <div class="meta">
      Account: <b>${esc(meta.accountName)}</b><br/>
      Email: <b>${esc(meta.ownerEmail)}</b><br/>
      Currency: <b>${esc(cur)}</b><br/>
      Period: <b>${esc(periodLabel)}</b><br/>
      Generated: <b>${esc(generated)} UTC</b>
    </div>
  </header>


  <div class="kpis">
    <div class="kpi"><span>Total Net Profit</span><b class="${sign(s.netProfit) ?? ''}">${m(s.netProfit)}</b></div>
    <div class="kpi"><span>Profit Factor</span><b>${isFinite(s.profitFactor) ? num(s.profitFactor) : '∞'}</b></div>
    <div class="kpi"><span>Expectancy</span><b class="${sign(s.expectancyR) ?? ''}">${num(s.expectancyR)}R</b></div>
    <div class="kpi"><span>Max Balance Drawdown</span><b class="neg">${m(s.balanceDDMaximal)} (${pct(s.balanceDDMaximalPct)})</b></div>
  </div>

  ${aiBlock}

  <section class="block">
    <h2>Details — Balance</h2>
    ${balanceChartSvg(s.balanceCurve)}
    <div class="grid2" style="margin-top:16px">
      <div>
        ${row('Gross Profit', m(s.grossProfit), 'pos')}
        ${row('Gross Loss', m(-s.grossLoss), 'neg')}
        ${row('Total Net Profit', m(s.netProfit), sign(s.netProfit))}
        ${row('Profit Factor', isFinite(s.profitFactor) ? num(s.profitFactor) : '∞')}
        ${row('Expected Payoff', m(s.expectedPayoff), sign(s.expectedPayoff))}
        ${row('Balance Drawdown Absolute', m(s.balanceDDAbsolute))}
        ${row('Balance Drawdown Maximal', `${m(s.balanceDDMaximal)} (${pct(s.balanceDDMaximalPct)})`)}
        ${row('Balance Drawdown Relative', `${pct(s.balanceDDRelativePct)} (${m(s.balanceDDRelativeMoney)})`)}
        ${row('Total R', `${num(s.totalR)}R`, sign(s.totalR))}
      </div>
      <div>
        ${row('Total Trades', String(s.totalTrades))}
        ${row('Short Trades (won %)', `${s.shortTrades} (${pct(s.shortWonPct)})`)}
        ${row('Long Trades (won %)', `${s.longTrades} (${pct(s.longWonPct)})`)}
        ${row('Profit Trades (% of total)', `${s.profitTrades} (${pct(s.profitTradesPct)})`, 'pos')}
        ${row('Loss Trades (% of total)', `${s.lossTrades} (${pct(s.lossTradesPct)})`, 'neg')}
        ${row('Largest profit trade', m(s.largestProfit), 'pos')}
        ${row('Largest loss trade', m(s.largestLoss), 'neg')}
        ${row('Average profit trade', m(s.averageProfit), 'pos')}
        ${row('Average loss trade', m(s.averageLoss), 'neg')}
      </div>
    </div>
    <div class="grid3" style="margin-top:14px">
      ${row('Maximum consecutive wins ($)', `${s.maxConsecWins} (${m(s.maxConsecWinsMoney)})`)}
      ${row('Maximum consecutive losses ($)', `${s.maxConsecLosses} (${m(s.maxConsecLossesMoney)})`)}
      ${row('Maximal consecutive profit (count)', `${m(s.maxConsecProfit)} (${s.maxConsecProfitCount})`)}
      ${row('Maximal consecutive loss (count)', `${m(s.maxConsecLossMoney)} (${s.maxConsecLossCount})`)}
      ${row('Average consecutive wins', num(s.avgConsecWins, 1))}
      ${row('Average consecutive losses', num(s.avgConsecLosses, 1))}
    </div>
  </section>

  <div class="grid2">
    <section class="block"><h2>Monthly Result</h2>${monthlyBarsSvg(list)}</section>
    <section class="block"><h2>Win / Loss Split</h2>
      <div style="display:flex; align-items:center; gap:22px">
        ${donutSvg(s.profitTrades, s.lossTrades)}
        <div style="flex:1">
          ${row('Win rate', pct(s.winRate))}
          ${row('Profit trades', String(s.profitTrades), 'pos')}
          ${row('Loss trades', String(s.lossTrades), 'neg')}
          ${row('Expectancy (R)', `${num(s.expectancyR)}R`, sign(s.expectancyR))}
        </div>
      </div>
    </section>
  </div>

  <section class="block">
    <h2>Summary</h2>
    <div class="grid3">
      ${row('Balance', m(s.balance))}
      ${row('Equity', m(s.equity))}
      ${row('Floating P/L', m(s.floatingPL), sign(s.floatingPL))}
      ${row('Initial Deposit', m(meta.initialDeposit))}
      ${row('Closed P/L', m(s.netProfit), sign(s.netProfit))}
      ${row('Open Positions', String(positions.length))}
    </div>
  </section>

  <section class="block">
    <h2>Positions</h2>
    <table><thead><tr>
      <th>#</th><th>Symbol</th><th>Side</th><th>Volume</th><th>Entry</th><th>S/L</th><th>Leverage</th><th>Profit</th>
    </tr></thead><tbody>${positionRows}</tbody></table>
    <div class="kv" style="margin-top:10px"><span>Floating P/L</span>
      <b class="${sign(s.floatingPL) ?? ''}">${m(s.floatingPL)}</b></div>
  </section>

  <section class="block">
    <h2>Symbols</h2>
    <table><thead><tr><th>Symbol</th><th>Deals</th><th>Win %</th><th>Total R</th><th>Profit</th></tr></thead>
    <tbody>${symbolRows}</tbody></table>
  </section>

  <section class="block">
    <h2>Deals</h2>
    <div class="scroll"><table><thead><tr>
      <th>#</th><th>Time</th><th>Symbol</th><th>Type</th><th>Order</th><th>Entry</th><th>S/L</th>
      <th>Exit</th><th>Volume</th><th>R</th><th>Profit</th><th>Rules</th>
    </tr></thead><tbody>${dealsRows || `<tr><td colspan="12" class="empty-cell">No deals</td></tr>`}</tbody></table></div>
    <div class="kv" style="margin-top:10px"><span>Closed P/L</span>
      <b class="${sign(s.netProfit) ?? ''}">${m(s.netProfit)}</b></div>
  </section>

  <div class="footer">
    <div>
      <div><b>${esc(meta.brand)}</b> — generated automatically from the trader's own journal.</div>
      <div style="margin-top:4px">This statement is informational only and is not investment advice.</div>
    </div>
    ${stampSvg(now.toISOString().slice(0, 10))}
  </div>
</div></body></html>`;
}

/** Fetches the ORCA logo and returns it as a data-URI so the report is standalone. */
export async function loadLogoDataUrl(src = '/orca-logo.png'): Promise<string | undefined> {
  try {
    const res = await fetch(src);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
