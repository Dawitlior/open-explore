import { EnrichedTrade, median } from './orca-metrics-core';

/* ============================================================================
   ORCA · CORTEX v3 — adaptive edge engine.
   Walk-forward spine · time-decay memory (learned half-life) · brain ladder
   (logistic default, GBM behind a proof gate) · self-tuned thresholds ·
   out-of-sample counterfactual · multi-changepoint · rule discovery ·
   self-aware drift. Deterministic, on-device, zero tokens.
   Public API: runEdgeEngine(e) — superset of v2's EdgeResult.
   ============================================================================ */

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/* ----------------------------- features ---------------------------------- */

interface FeatDef { key: string; he: string; en: string; kind: 'bin' | 'num'; }

function extractFeatures(e: EnrichedTrade[]): { X: number[][]; defs: FeatDef[] } {
  const counts: Record<string, number> = {};
  e.forEach(t => { counts[t.setup] = (counts[t.setup] || 0) + 1; });
  const topSetups = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3).filter(s => s !== 'unknown');
  const medRisk = median(e.map(t => t.risk)) || 1;

  // NOTE: intentionally NO day-of-week — that axis is owned by the Segment Engine.
  const defs: FeatDef[] = [
    { key: 'london', he: 'סשן לונדון', en: 'London session', kind: 'bin' },
    { key: 'ny', he: 'סשן NY', en: 'NY session', kind: 'bin' },
    { key: 'asia', he: 'סשן אסיה', en: 'Asia session', kind: 'bin' },
    { key: 'long', he: 'כיוון Long', en: 'Long direction', kind: 'bin' },
    { key: 'afterLoss', he: 'מסחר אחרי הפסד', en: 'Trading after a loss', kind: 'bin' },
    { key: 'tradeNo', he: 'מס׳ עסקה ביום', en: 'Nth trade of day', kind: 'num' },
    { key: 'risk', he: 'גודל סיכון (יחסית לחציון)', en: 'Risk size (vs median)', kind: 'num' },
    { key: 'rollWR', he: 'win-rate אחרון', en: 'Recent win-rate', kind: 'num' },
    ...topSetups.map(s => ({ key: 'setup:' + s, he: 'סטאפ ' + s, en: s + ' setup', kind: 'bin' as const })),
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

/* ------------------------------ math core -------------------------------- */

function aucOf(pred: number[], y: number[], idx: number[]): number {
  const pos = idx.filter(i => y[i] === 1).map(i => pred[i]);
  const neg = idx.filter(i => y[i] === 0).map(i => pred[i]);
  if (!pos.length || !neg.length) return 0.5;
  let c = 0; for (const p of pos) for (const n of neg) c += p > n ? 1 : p === n ? 0.5 : 0;
  return c / (pos.length * neg.length);
}

const decayW = (idx: number[], anchor: number, hl: number): number[] =>
  idx.map(i => (hl === Infinity ? 1 : Math.pow(0.5, (anchor - 1 - i) / hl)));

interface Brain { predict: (x: number[]) => number; coefs?: number[]; importance?: number[]; }

/** Weighted L2 logistic regression via full-batch gradient descent. */
function trainLogit(X: number[][], Y: number[], idx: number[], wgt: number[]): Brain {
  const P = X[0].length;
  const sw = wgt.reduce((a, b) => a + b, 0) || 1;
  const mean = Array(P).fill(0), std = Array(P).fill(0);
  idx.forEach((i, k) => X[i].forEach((v, j) => { mean[j] += wgt[k] * v; }));
  for (let j = 0; j < P; j++) mean[j] /= sw;
  idx.forEach((i, k) => X[i].forEach((v, j) => { std[j] += wgt[k] * (v - mean[j]) ** 2; }));
  for (let j = 0; j < P; j++) std[j] = Math.sqrt(std[j] / sw) || 1;
  const zi = (x: number[]) => x.map((v, j) => (v - mean[j]) / std[j]);

  const w = Array(P).fill(0); let b = 0;
  for (let ep = 0; ep < 300; ep++) {
    const gw = Array(P).fill(0); let gb = 0;
    idx.forEach((i, k) => {
      const z = zi(X[i]);
      const p = sigmoid(z.reduce((a, v, j) => a + v * w[j], 0) + b);
      const err = wgt[k] * (p - Y[i]);
      for (let j = 0; j < P; j++) gw[j] += err * z[j];
      gb += err;
    });
    for (let j = 0; j < P; j++) w[j] -= 0.15 * (gw[j] / sw + 0.02 * w[j]);
    b -= 0.15 * (gb / sw);
  }
  return { predict: (x: number[]) => sigmoid(zi(x).reduce((a, v, j) => a + v * w[j], 0) + b), coefs: w.slice() };
}

/** Small XGBoost-style GBM (depth-3, logloss, weighted). Interactions brain. */
function trainGBM(X: number[][], Y: number[], idx: number[], wgt: number[],
  opt = { trees: 80, depth: 3, lr: 0.12, lam: 1.0, minN: 14, bins: 12 }): Brain {
  const P = X[0].length;
  const sw = wgt.reduce((a, b) => a + b, 0) || 1;
  const p0 = Math.min(1 - 1e-4, Math.max(1e-4, idx.reduce((a, i, k) => a + wgt[k] * Y[i], 0) / sw));
  const base = Math.log(p0 / (1 - p0));
  const F = new Map<number, number>(idx.map(i => [i, base]));

  const cands: number[][] = [];
  for (let j = 0; j < P; j++) {
    const vs = [...new Set(idx.map(i => X[i][j]))].sort((a, b) => a - b);
    const c: number[] = [];
    for (let q = 1; q < opt.bins; q++) {
      const v = vs[Math.floor((q * vs.length) / opt.bins)];
      if (v > vs[0] && !c.includes(v)) c.push(v);
    }
    cands.push(c);
  }

  type Node = { leaf?: number; j?: number; thr?: number; gain?: number; left?: Node; right?: Node };
  const applyT = (n: Node, x: number[]): number =>
    n.leaf !== undefined ? n.leaf : applyT(x[(n.j as number)] < (n.thr as number) ? (n.left as Node) : (n.right as Node), x);

  const forest: Node[] = [];
  const build = (sub: number[], g: Map<number, number>, h: Map<number, number>, d: number): Node => {
    const G = sub.reduce((a, s) => a + (g.get(s) as number), 0);
    const H = sub.reduce((a, s) => a + (h.get(s) as number), 0);
    if (d >= opt.depth || sub.length < 2 * opt.minN) return { leaf: -G / (H + opt.lam) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let best: any = { gain: 1e-6 };
    for (let j = 0; j < P; j++) for (const thr of cands[j]) {
      let GL = 0, HL = 0, nl = 0;
      for (const s of sub) if (X[s][j] < thr) { GL += g.get(s) as number; HL += h.get(s) as number; nl++; }
      const nr = sub.length - nl; if (nl < opt.minN || nr < opt.minN) continue;
      const GR = G - GL, HR = H - HL;
      const gain = (GL * GL) / (HL + opt.lam) + (GR * GR) / (HR + opt.lam) - (G * G) / (H + opt.lam);
      if (gain > best.gain) best = { gain, j, thr };
    }
    if (best.j === undefined) return { leaf: -G / (H + opt.lam) };
    return {
      j: best.j, thr: best.thr, gain: best.gain,
      left: build(sub.filter(s => X[s][best.j] < best.thr), g, h, d + 1),
      right: build(sub.filter(s => X[s][best.j] >= best.thr), g, h, d + 1),
    };
  };

  for (let m = 0; m < opt.trees; m++) {
    const g = new Map<number, number>(), h = new Map<number, number>();
    idx.forEach((i, k) => {
      const p = sigmoid(F.get(i) as number);
      g.set(i, wgt[k] * (p - Y[i]));
      h.set(i, Math.max(1e-6, wgt[k] * p * (1 - p)));
    });
    const tr = build(idx, g, h, 0);
    forest.push(tr);
    for (const i of idx) F.set(i, (F.get(i) as number) + opt.lr * applyT(tr, X[i]));
  }

  const importance = Array(P).fill(0);
  const walk = (n: Node) => { if (n.leaf !== undefined) return; importance[n.j as number] += n.gain as number; walk(n.left as Node); walk(n.right as Node); };
  forest.forEach(walk);

  return { predict: (x: number[]) => sigmoid(base + forest.reduce((a, tr) => a + opt.lr * applyT(tr, x), 0)), importance };
}

/** Threshold tuned on TRAIN only: maximize total R of kept set, keep ≥25%. */
function tuneTH(brain: Brain, X: number[][], R: number[], idx: number[]): number {
  const c = [...new Set(idx.map(i => brain.predict(X[i])))].sort((a, b) => a - b);
  let best = { t: 0.5, s: -Infinity };
  for (const th of c) {
    const kept = idx.filter(i => brain.predict(X[i]) >= th);
    if (kept.length < 0.25 * idx.length) continue;
    const s = kept.reduce((a, i) => a + R[i], 0);
    if (s > best.s) best = { t: th, s };
  }
  return best.t;
}

/* ------------------------------- types ----------------------------------- */

export interface EdgeDriver { key: string; he: string; en: string; coef: number; }
export interface CortexRule {
  kind: 'good' | 'bad';
  condsHe: string[]; condsEn: string[];
  winRate: number; expectancy: number; n: number;
}
export interface CortexFold { start: number; brain: 'logit' | 'gbm'; halfLife: number | null; aucOOS: number; }
export interface CortexChangepoint { index: number; dateISO: string; before: number; after: number; shift: number; t: number; }

export interface EdgeResult {
  ok: boolean; reason?: string;
  mode: 'walkforward' | 'simple';
  trainAUC: number; testAUC: number; threshold: number;
  allR: number; keptR: number; keptN: number; skipN: number; diff: number; testN: number;
  expAll: number; expKept: number;
  drivers: EdgeDriver[];
  equity: { k: number; all: number; filtered: number }[];
  changepoint: { index: number; dateISO: string; before: number; after: number; shift: number } | null; // legacy (strongest)
  // v3 additions
  folds: CortexFold[];
  rules: CortexRule[];
  changepoints: CortexChangepoint[];
  halfLife: number | null;            // learned memory half-life (null = stable / ∞)
  windowSize: number;
  drift: { earlyAUC: number; lateAUC: number; decaying: boolean } | null;
}

const EMPTY = (reason: string): EdgeResult => ({
  ok: false, reason, mode: 'simple', trainAUC: 0.5, testAUC: 0.5, threshold: 0.5,
  allR: 0, keptR: 0, keptN: 0, skipN: 0, diff: 0, testN: 0, expAll: 0, expKept: 0,
  drivers: [], equity: [], changepoint: null,
  folds: [], rules: [], changepoints: [], halfLife: null, windowSize: 0, drift: null,
});

/* --------------------------- rule discovery ------------------------------ */

function renderCond(defs: FeatDef[], j: number, thr: number, side: 'lt' | 'ge'): { he: string; en: string } {
  const d = defs[j];
  if (d.kind === 'bin') {
    return side === 'ge'
      ? { he: `${d.he}: כן`, en: `${d.en}: yes` }
      : { he: `${d.he}: לא`, en: `${d.en}: no` };
  }
  if (d.key === 'tradeNo') {
    const k = Math.ceil(thr);
    return side === 'ge' ? { he: `${d.he} ≥ ${k}`, en: `${d.en} ≥ ${k}` } : { he: `${d.he} ≤ ${k - 1}`, en: `${d.en} ≤ ${k - 1}` };
  }
  if (d.key === 'rollWR') {
    const p = `${Math.round(thr * 100)}%`;
    return { he: `${d.he} ${side === 'ge' ? '≥' : '<'} ${p}`, en: `${d.en} ${side === 'ge' ? '≥' : '<'} ${p}` };
  }
  const v = `×${thr.toFixed(2)}`;
  return { he: `${d.he} ${side === 'ge' ? '≥' : '<'} ${v}`, en: `${d.en} ${side === 'ge' ? '≥' : '<'} ${v}` };
}

/** Distill the current brain into readable rules via a depth-3 surrogate tree. */
function discoverRules(brain: Brain, X: number[][], Y: number[], R: number[],
  win: number[], defs: FeatDef[]): CortexRule[] {
  if (win.length < 160) return [];
  const tgt = new Map<number, number>(win.map(i => [i, brain.predict(X[i])]));
  const minLeaf = Math.max(18, Math.floor(win.length * 0.06));

  type SNode = { leaf?: number; n?: number; idx?: number[]; j?: number; thr?: number; left?: SNode; right?: SNode };
  const sse = (ss: number[]) => {
    const m = ss.reduce((a, s) => a + (tgt.get(s) as number), 0) / ss.length;
    return ss.reduce((a, s) => a + ((tgt.get(s) as number) - m) ** 2, 0);
  };
  const build = (sub: number[], d: number): SNode => {
    const m = sub.reduce((a, s) => a + (tgt.get(s) as number), 0) / sub.length;
    if (d >= 3 || sub.length < 2 * minLeaf) return { leaf: m, n: sub.length, idx: sub };
    const tot = sse(sub);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let best: any = { gain: 1e-9 };
    for (let j = 0; j < defs.length; j++) {
      const vs = [...new Set(sub.map(s => X[s][j]))].sort((a, b) => a - b);
      for (let q = 1; q < 8; q++) {
        const thr = vs[Math.floor((q * vs.length) / 8)]; if (thr <= vs[0]) continue;
        const L = sub.filter(s => X[s][j] < thr), Rt = sub.filter(s => X[s][j] >= thr);
        if (L.length < minLeaf || Rt.length < minLeaf) continue;
        const gain = tot - sse(L) - sse(Rt);
        if (gain > best.gain) best = { gain, j, thr };
      }
    }
    if (best.j === undefined) return { leaf: m, n: sub.length, idx: sub };
    return { j: best.j, thr: best.thr, left: build(sub.filter(s => X[s][best.j] < best.thr), d + 1), right: build(sub.filter(s => X[s][best.j] >= best.thr), d + 1) };
  };

  const leaves: { p: number; n: number; idx: number[]; condsHe: string[]; condsEn: string[] }[] = [];
  const collect = (n: SNode, he: string[], en: string[]) => {
    if (n.leaf !== undefined) { leaves.push({ p: n.leaf, n: n.n as number, idx: n.idx as number[], condsHe: he, condsEn: en }); return; }
    const lt = renderCond(defs, n.j as number, n.thr as number, 'lt');
    const ge = renderCond(defs, n.j as number, n.thr as number, 'ge');
    collect(n.left as SNode, [...he, lt.he], [...en, lt.en]);
    collect(n.right as SNode, [...he, ge.he], [...en, ge.en]);
  };
  collect(build(win, 0), [], []);
  if (leaves.length < 2) return [];
  leaves.sort((a, b) => a.p - b.p);

  const toRule = (l: (typeof leaves)[number], kind: 'good' | 'bad'): CortexRule => {
    const wr = l.idx.filter(i => Y[i] === 1).length / l.idx.length;
    const exp = l.idx.reduce((a, i) => a + R[i], 0) / l.idx.length;
    return { kind, condsHe: l.condsHe, condsEn: l.condsEn, winRate: wr, expectancy: exp, n: l.n };
  };
  const rules: CortexRule[] = [];
  rules.push(toRule(leaves[0], 'bad'));
  if (leaves.length > 3) rules.push(toRule(leaves[1], 'bad'));
  rules.push(toRule(leaves[leaves.length - 1], 'good'));
  if (leaves.length > 3) rules.push(toRule(leaves[leaves.length - 2], 'good'));
  // keep only rules that actually differ from baseline meaningfully
  return rules.filter(r => (r.kind === 'bad' ? r.expectancy < 0 : r.expectancy > 0));
}

/* --------------------------- changepoints -------------------------------- */

function findChangepoints(e: EnrichedTrade[], R: number[]): CortexChangepoint[] {
  const N = R.length;
  const minSeg = Math.max(50, Math.floor(N / 8));
  const out: CortexChangepoint[] = [];
  const cpFind = (lo: number, hi: number): number => {
    const seg = R.slice(lo, hi); const m = seg.reduce((a, b) => a + b, 0) / seg.length;
    let cum = 0, ext = { v: 0, i: lo };
    for (let i = lo; i < hi; i++) { cum += R[i] - m; if (Math.abs(cum) > Math.abs(ext.v)) ext = { v: cum, i }; }
    return ext.i;
  };
  const tstat = (lo: number, cp: number, hi: number): number => {
    const A = R.slice(lo, cp + 1), B = R.slice(cp + 1, hi);
    if (A.length < 2 || B.length < 2) return 0;
    const ma = A.reduce((a, b) => a + b, 0) / A.length, mb = B.reduce((a, b) => a + b, 0) / B.length;
    const va = A.reduce((a, b) => a + (b - ma) ** 2, 0) / (A.length - 1);
    const vb = B.reduce((a, b) => a + (b - mb) ** 2, 0) / (B.length - 1);
    const den = Math.sqrt(va / A.length + vb / B.length);
    return den > 0 ? Math.abs(ma - mb) / den : 0;
  };
  const rec = (lo: number, hi: number) => {
    if (hi - lo < 2 * minSeg) return;
    const cp = cpFind(lo, hi);
    if (cp - lo < minSeg || hi - cp < minSeg) return;
    const t = tstat(lo, cp, hi);
    if (t < 2.1) return;
    const A = R.slice(lo, cp + 1), B = R.slice(cp + 1, hi);
    out.push({
      index: cp, dateISO: e[cp].date.toISOString(),
      before: A.reduce((a, b) => a + b, 0) / A.length,
      after: B.reduce((a, b) => a + b, 0) / B.length,
      shift: B.reduce((a, b) => a + b, 0) / B.length - A.reduce((a, b) => a + b, 0) / A.length,
      t,
    });
    rec(lo, cp); rec(cp, hi);
  };
  rec(0, N);
  return out.sort((a, b) => b.t - a.t).slice(0, 3).sort((a, b) => a.index - b.index);
}

/* ------------------------------ CORTEX ----------------------------------- */

const HL_GRID = [80, 160, 320, Infinity];
const GBM_MIN_WINDOW = 500;   // interactions brain unlocks only with real data volume
const GBM_MARGIN = 0.02;      // ...and only if it PROVES itself on inner validation

export function runEdgeEngine(e: EnrichedTrade[]): EdgeResult {
  const N = e.length;
  if (N < 30) return EMPTY('need>=30');

  const { X, defs } = extractFeatures(e);
  const Y = e.map(t => (t.win ? 1 : 0));
  const R = e.map(t => t.r);
  const hasBoth = (idx: number[]) => idx.some(i => Y[i] === 1) && idx.some(i => Y[i] === 0);

  /* ---- sizing: how the engine adapts its own protocol to data volume ---- */
  const mode: 'walkforward' | 'simple' = N >= 160 ? 'walkforward' : 'simple';
  const W = mode === 'simple' ? Math.floor(N * 0.7) : Math.min(400, Math.max(120, Math.floor(N * 0.55)));
  const step = mode === 'simple' ? N - W : Math.max(40, Math.floor(W / 4));
  const maxFolds = mode === 'simple' ? 1 : Math.min(5, Math.floor((N - W) / step));
  const firstStart = N - maxFolds * step;

  /* ---- per-fold: tune (brain, half-life) on inner val, retrain, predict ---- */
  const pred = new Array<number>(N).fill(NaN);
  const folds: CortexFold[] = [];
  const trainAUCs: number[] = [];
  const keptFlags = new Set<number>();
  let keptR = 0, keptN = 0, lastTH = 0.5, lastBrain: Brain | null = null, lastWin: number[] = [];
  const hlChosen: number[] = [];

  for (let f = 0; f < maxFolds; f++) {
    const s = firstStart + f * step;
    const win = Array.from({ length: W }, (_, i) => i + s - W);
    if (!hasBoth(win)) continue;
    const cut = Math.floor(win.length * 0.7);
    const innerT = win.slice(0, cut), innerV = win.slice(cut);
    const grid = HL_GRID.filter(h => h === Infinity || h <= W);

    let best: { score: number; mk: 'logit' | 'gbm'; hl: number } = { score: -1, mk: 'logit', hl: Infinity };
    const evalCfg = (mk: 'logit' | 'gbm', hl: number) => {
      const wgt = decayW(innerT, innerT[innerT.length - 1] + 1, hl);
      const brain = mk === 'logit' ? trainLogit(X, Y, innerT, wgt) : trainGBM(X, Y, innerT, wgt);
      const pv = new Array<number>(N);
      innerV.forEach(i => { pv[i] = brain.predict(X[i]); });
      return aucOf(pv, Y, innerV);
    };
    for (const hl of grid) {
      const aL = evalCfg('logit', hl);
      if (aL > best.score) best = { score: aL, mk: 'logit', hl };
    }
    if (W >= GBM_MIN_WINDOW) {
      for (const hl of grid) {
        const aG = evalCfg('gbm', hl);
        if (aG > best.score + GBM_MARGIN) best = { score: aG, mk: 'gbm', hl }; // proof gate
      }
    }

    const wgt = decayW(win, s, best.hl);
    const brain = best.mk === 'logit' ? trainLogit(X, Y, win, wgt) : trainGBM(X, Y, win, wgt);
    const fold = Array.from({ length: Math.min(step, N - s) }, (_, i) => i + s);
    fold.forEach(i => { pred[i] = brain.predict(X[i]); });

    const th = tuneTH(brain, X, R, win);
    const kept = fold.filter(i => brain.predict(X[i]) >= th);
    kept.forEach(i => keptFlags.add(i));
    keptR += kept.reduce((a, i) => a + R[i], 0);
    keptN += kept.length;

    const trPred = new Array<number>(N);
    win.forEach(i => { trPred[i] = brain.predict(X[i]); });
    trainAUCs.push(aucOf(trPred, Y, win));

    folds.push({ start: s, brain: best.mk, halfLife: best.hl === Infinity ? null : best.hl, aucOOS: aucOf(pred, Y, fold) });
    hlChosen.push(best.hl);
    lastTH = th; lastBrain = brain; lastWin = win;
  }

  if (!folds.length || !lastBrain) return EMPTY('class-imbalance');

  /* ---- aggregate out-of-sample results ---- */
  const evalIdx: number[] = [];
  for (let i = firstStart; i < N; i++) if (!isNaN(pred[i])) evalIdx.push(i);
  const testAUC = aucOf(pred, Y, evalIdx);
  const trainAUC = trainAUCs.reduce((a, b) => a + b, 0) / trainAUCs.length;

  const allR = evalIdx.reduce((a, i) => a + R[i], 0);
  const equity: EdgeResult['equity'] = [];
  let ca = 0, cf = 0, k = 0;
  evalIdx.forEach(i => {
    ca += R[i];
    if (keptFlags.has(i)) cf += R[i];
    equity.push({ k: ++k, all: +ca.toFixed(2), filtered: +cf.toFixed(2) });
  });

  /* ---- drivers from the CURRENT brain (last fold) ---- */
  let drivers: EdgeDriver[] = [];
  if (lastBrain.coefs) {
    drivers = lastBrain.coefs.map((c, j) => ({ ...defs[j], coef: c }));
  } else if (lastBrain.importance) {
    const mx = Math.max(...lastBrain.importance, 1e-9);
    drivers = lastBrain.importance.map((v, j) => ({ ...defs[j], coef: v / mx }));
  }
  drivers.sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef));

  /* ---- rules, changepoints, drift ---- */
  const rules = discoverRules(lastBrain, X, Y, R, lastWin, defs);
  const changepoints = findChangepoints(e, R);
  const strongest = changepoints.length
    ? changepoints.reduce((a, b) => (b.t > a.t ? b : a))
    : null;

  let drift: EdgeResult['drift'] = null;
  if (folds.length >= 2) {
    const half = Math.floor(folds.length / 2);
    const early = folds.slice(0, half).reduce((a, f) => a + f.aucOOS, 0) / half;
    const late = folds.slice(half).reduce((a, f) => a + f.aucOOS, 0) / (folds.length - half);
    drift = { earlyAUC: early, lateAUC: late, decaying: late < early - 0.05 };
  }

  const hlMode = (() => {
    const cnt = new Map<number, number>();
    hlChosen.forEach(h => cnt.set(h, (cnt.get(h) || 0) + 1));
    let best: number = Infinity, c = -1;
    cnt.forEach((v, kk) => { if (v > c) { c = v; best = kk; } });
    return best === Infinity ? null : best;
  })();

  return {
    ok: true, mode, trainAUC, testAUC, threshold: lastTH,
    allR, keptR, keptN, skipN: evalIdx.length - keptN, diff: allR - keptR, testN: evalIdx.length,
    expAll: allR / (evalIdx.length || 1), expKept: keptR / (keptN || 1),
    drivers, equity,
    changepoint: strongest ? { index: strongest.index, dateISO: strongest.dateISO, before: strongest.before, after: strongest.after, shift: strongest.shift } : null,
    folds, rules, changepoints, halfLife: hlMode, windowSize: W, drift,
  };
}
