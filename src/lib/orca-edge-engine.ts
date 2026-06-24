import { EnrichedTrade, median } from './orca-metrics-core';

/* ========================================================================
   EDGE ENGINE — on-device logistic regression.
   chronological split · out-of-sample · self-tuned threshold ·
   counterfactual · CUSUM changepoint. Zero tokens, deterministic.
   ======================================================================== */

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

interface FeatDef { key: string; he: string; en: string; }

function extractFeatures(e: EnrichedTrade[]): { X: number[][]; defs: FeatDef[] } {
  const counts: Record<string, number> = {};
  e.forEach(t => { counts[t.setup] = (counts[t.setup] || 0) + 1; });
  const topSetups = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3).filter(s => s !== 'unknown');
  const medRisk = median(e.map(t => t.risk)) || 1;

  // NOTE: deliberately no day-of-week here — owned by Segment Engine.
  const defs: FeatDef[] = [
    { key: 'london', he: 'מסחר בשעות לונדון', en: 'London session' },
    { key: 'ny', he: 'מסחר בשעות ניו-יורק', en: 'NY session' },
    { key: 'asia', he: 'מסחר בשעות אסיה', en: 'Asia session' },
    { key: 'long', he: 'עסקאות קנייה (לונג)', en: 'Long direction' },
    { key: 'afterLoss', he: 'מסחר מיד אחרי הפסד', en: 'Trading right after a loss' },
    { key: 'tradeNo', he: 'מספר העסקה ביום (סחר יתר)', en: 'Nth trade of the day' },
    { key: 'risk', he: 'גודל הסיכון בעסקה', en: 'Risk size' },
    { key: 'rollWR', he: 'רצף הצלחות אחרון (מומנטום)', en: 'Recent win-rate' },
    ...topSetups.map(s => ({ key: 'setup:' + s, he: 'שימוש בסטאפ ' + s, en: s + ' setup' })),
  ];

  let prevWin: boolean | null = null;
  let dayKey = ''; let dayCount = 0;
  const last10: number[] = [];
  const X = e.map(t => {
    const afterLoss = prevWin === false ? 1 : 0;
    const k = t.date.toISOString().slice(0, 10);
    if (k !== dayKey) { dayKey = k; dayCount = 0; }
    dayCount++;
    const rollWR = last10.length ? last10.reduce((a, b) => a + b, 0) / last10.length : 0.5;
    const row = [
      t.session === 'london' ? 1 : 0, t.session === 'ny' ? 1 : 0, t.session === 'asia' ? 1 : 0,
      t.dir === 'long' ? 1 : 0, afterLoss, dayCount, t.risk / medRisk, rollWR,
      ...topSetups.map(s => (t.setup === s ? 1 : 0)),
    ];
    prevWin = t.win;
    last10.push(t.win ? 1 : 0); if (last10.length > 10) last10.shift();
    return row;
  });
  return { X, defs };
}

function auc(pred: number[], y: number[], idx: number[]): number {
  const pos = idx.filter(i => y[i] === 1).map(i => pred[i]);
  const neg = idx.filter(i => y[i] === 0).map(i => pred[i]);
  if (!pos.length || !neg.length) return 0.5;
  let c = 0; for (const p of pos) for (const n of neg) c += p > n ? 1 : p === n ? 0.5 : 0;
  return c / (pos.length * neg.length);
}

export interface EdgeDriver { key: string; he: string; en: string; coef: number; }
export interface EdgeResult {
  ok: boolean; reason?: string;
  trainAUC: number; testAUC: number; threshold: number;
  allR: number; keptR: number; keptN: number; skipN: number; diff: number; testN: number;
  expAll: number; expKept: number;
  drivers: EdgeDriver[];
  equity: { k: number; all: number; filtered: number }[];
  changepoint: { index: number; dateISO: string; before: number; after: number; shift: number } | null;
}

const EMPTY = (reason: string): EdgeResult => ({
  ok: false, reason, trainAUC: 0.5, testAUC: 0.5, threshold: 0.5,
  allR: 0, keptR: 0, keptN: 0, skipN: 0, diff: 0, testN: 0, expAll: 0, expKept: 0,
  drivers: [], equity: [], changepoint: null,
});

export function runEdgeEngine(e: EnrichedTrade[]): EdgeResult {
  const N = e.length;
  if (N < 30) return EMPTY('need>=30');

  const { X, defs } = extractFeatures(e);
  const y = e.map(t => (t.win ? 1 : 0));
  const R = e.map(t => t.r);
  const P = X[0].length;

  const split = Math.floor(N * 0.7);
  const tr = [...Array(split).keys()];
  const te = [...Array(N - split).keys()].map(i => i + split);
  const hasBoth = (idx: number[]) => idx.some(i => y[i] === 1) && idx.some(i => y[i] === 0);
  if (!hasBoth(tr) || !hasBoth(te)) return EMPTY('class-imbalance');

  // standardize on TRAIN only
  const mean = Array(P).fill(0), std = Array(P).fill(0);
  tr.forEach(i => X[i].forEach((v, j) => (mean[j] += v))); for (let j = 0; j < P; j++) mean[j] /= split;
  tr.forEach(i => X[i].forEach((v, j) => (std[j] += (v - mean[j]) ** 2))); for (let j = 0; j < P; j++) std[j] = Math.sqrt(std[j] / split) || 1;
  const Z = X.map(r => r.map((v, j) => (v - mean[j]) / std[j]));

  // logistic regression · gradient descent · L2
  const w = Array(P).fill(0); let b = 0; const lr = 0.12, lambda = 0.02, epochs = 420;
  for (let ep = 0; ep < epochs; ep++) {
    const gw = Array(P).fill(0); let gb = 0;
    for (const i of tr) {
      const p = sigmoid(Z[i].reduce((a, v, j) => a + v * w[j], 0) + b);
      const err = p - y[i];
      for (let j = 0; j < P; j++) gw[j] += err * Z[i][j];
      gb += err;
    }
    for (let j = 0; j < P; j++) w[j] -= lr * (gw[j] / split + lambda * w[j]);
    b -= lr * (gb / split);
  }

  const pred = Z.map(r => sigmoid(r.reduce((a, v, j) => a + v * w[j], 0) + b));
  const trainAUC = auc(pred, y, tr), testAUC = auc(pred, y, te);

  // self-tuned threshold on TRAIN (maximize R, keep ≥25%)
  const cands = [...new Set(tr.map(i => pred[i]))].sort((a, b) => a - b);
  let best = { t: 0.5, score: -Infinity };
  for (const th of cands) {
    const kept = tr.filter(i => pred[i] >= th);
    if (kept.length < 0.25 * split) continue;
    const sc = kept.reduce((a, i) => a + R[i], 0);
    if (sc > best.score) best = { t: th, score: sc };
  }
  const TH = best.t;

  // counterfactual on TEST (out-of-sample)
  const allR = te.reduce((a, i) => a + R[i], 0);
  const keptTe = te.filter(i => pred[i] >= TH);
  const keptR = keptTe.reduce((a, i) => a + R[i], 0);
  const equity: EdgeResult['equity'] = [];
  let ca = 0, cf = 0;
  te.forEach((i, k) => { ca += R[i]; if (pred[i] >= TH) cf += R[i]; equity.push({ k: k + 1, all: +ca.toFixed(2), filtered: +cf.toFixed(2) }); });

  const drivers: EdgeDriver[] = w.map((c, j) => ({ ...defs[j], coef: c })).sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));

  // CUSUM changepoint on R
  const gm = R.reduce((a, v) => a + v, 0) / N;
  let cum = 0, ext = { v: 0, i: 0 };
  for (let i = 0; i < N; i++) { cum += R[i] - gm; if (Math.abs(cum) > Math.abs(ext.v)) ext = { v: cum, i }; }
  const cp = ext.i;
  const before = R.slice(0, cp + 1), after = R.slice(cp + 1);
  const mb = before.length ? before.reduce((a, v) => a + v, 0) / before.length : 0;
  const ma = after.length ? after.reduce((a, v) => a + v, 0) / after.length : 0;
  const changepoint = (cp > 4 && cp < N - 4)
    ? { index: cp, dateISO: e[cp].date.toISOString(), before: mb, after: ma, shift: ma - mb }
    : null;

  return {
    ok: true, trainAUC, testAUC, threshold: TH,
    allR, keptR, keptN: keptTe.length, skipN: te.length - keptTe.length, diff: allR - keptR, testN: te.length,
    expAll: allR / te.length, expKept: keptR / (keptTe.length || 1),
    drivers, equity, changepoint,
  };
}
