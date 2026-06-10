import { getEffectiveR } from "@/lib/r-multiple";
/**
 * 🧠 DEEP AI INSIGHTS ENGINE — bilingual & $/R-aware
 * ────────────────────────────────────────────────────────────────
 * Detects hidden patterns across behavioral & statistical dimensions
 * and renders every insight in the caller's language and value unit.
 */

import type { Trade } from '@/data/trades';

export type DeepSeverity = 'critical' | 'warning' | 'strength' | 'insight';
export type DeepCategory = 'behavioural' | 'statistical' | 'edge' | 'timing' | 'risk';
export type InsightLang = 'he' | 'en';

export interface InsightOpts {
  lang?: InsightLang;
  /** true → values rendered as $, false → R-multiples */
  isMoney?: boolean;
}

export interface DeepInsight {
  id: string;
  icon: string;
  title: string;
  finding: string;
  evidence: string;
  action: string;
  confidence: number;
  severity: DeepSeverity;
  category: DeepCategory;
  metric?: { label: string; value: string }[];
}

export interface TraderDNA {
  edge: number;
  discipline: number;
  consistency: number;
  behaviour: number;
  overall: number;
}

export interface DeepAnalysis {
  insights: DeepInsight[];
  dna: TraderDNA;
  meta: { sampleSize: number; spanDays: number; confidenceFloor: number };
}

/* ─── Helpers ─────────────────────────────────────────────────── */

const std = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
};
const mean = (xs: number[]): number => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

const dayKey = (d: string): string => { try { return new Date(d.replace(' ', 'T')).toDateString(); } catch { return d; } };
const hourOf = (d: string): number => { try { return new Date(d.replace(' ', 'T')).getHours(); } catch { return -1; } };
const dowOf  = (d: string): number => { try { return new Date(d.replace(' ', 'T')).getDay(); } catch { return -1; } };

const HEB_DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const ENG_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Ctx {
  lang: InsightLang;
  isMoney: boolean;
  t: (he: string, en: string) => string;
  fmtMoney: (n: number) => string;
  /** Headline value formatter — money or R, with sign. */
  fmtVal: (n: number) => string;
  /** Suffix: "$/trade" or "R/trade" localized. */
  perTrade: string;
}
const mkCtx = (opts: InsightOpts = {}): Ctx => {
  const lang: InsightLang = opts.lang ?? 'he';
  const isMoney = !!opts.isMoney;
  const t = (he: string, en: string) => (lang === 'he' ? he : en);
  const fmtMoney = (n: number) => `${n >= 0 ? '+' : ''}$${n.toFixed(2)}`;
  const fmtR = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}R`;
  const fmtVal = isMoney ? fmtMoney : fmtR;
  const perTrade = isMoney ? t('$/עסקה', '$/trade') : t('R/עסקה', 'R/trade');
  return { lang, isMoney, t, fmtMoney, fmtVal, perTrade };
};

/* ─── DNA SCORING ─────────────────────────────────────────────── */

function computeDNA(trades: Trade[]): TraderDNA {
  if (!trades.length) return { edge: 0, discipline: 0, consistency: 0, behaviour: 0, overall: 0 };
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  const totalR = trades.reduce((s, t) => s + getEffectiveR(t), 0);
  const expR = totalR / trades.length;
  const grossW = wins.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0);
  const grossL = losses.reduce((s, t) => s + Math.abs(getEffectiveR(t)), 0) || 1;
  const pf = grossW / grossL;
  const wr = (wins.length / trades.length) * 100;
  const edgeRaw = (Math.min(expR + 0.5, 1.5) / 1.5) * 50 + Math.min(pf / 3, 1) * 30 + Math.min(wr / 70, 1) * 20;
  const edge = Math.max(0, Math.min(100, edgeRaw));
  const ruleRate = (trades.filter(t => t.rules).length / trades.length) * 100;
  const avgDev = mean(trades.map(t => Math.abs(t.deviation)));
  const devPenalty = Math.min(avgDev * 100, 40);
  const discipline = Math.max(0, Math.min(100, ruleRate - devPenalty));
  const riskCV = mean(trades.map(t => t.risk)) > 0 ? std(trades.map(t => t.risk)) / mean(trades.map(t => t.risk)) : 0;
  const rStd = std(trades.map(t => getEffectiveR(t)));
  const consistency = Math.max(0, Math.min(100, 100 - riskCV * 80 - rStd * 10));
  const days: Record<string, Trade[]> = {};
  trades.forEach(t => { (days[dayKey(t.date)] ||= []).push(t); });
  let revenge = 0, escalation = 0, overtradeDays = 0;
  Object.values(days).forEach(arr => {
    if (arr.length >= 4) overtradeDays++;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1].winLoss === 'Loss' && arr[i].risk > arr[i - 1].risk * 1.2) revenge++;
      if (arr[i - 1].winLoss === 'Loss' && arr[i].risk > arr[i - 1].risk) escalation++;
    }
  });
  const behaviourPenalty = revenge * 5 + escalation * 2 + overtradeDays * 3;
  const behaviour = Math.max(0, Math.min(100, 100 - behaviourPenalty));
  const overall = Math.round(edge * 0.35 + discipline * 0.25 + consistency * 0.2 + behaviour * 0.2);
  return { edge: Math.round(edge), discipline: Math.round(discipline), consistency: Math.round(consistency), behaviour: Math.round(behaviour), overall };
}

/* ─── PATTERN DETECTORS ───────────────────────────────────────── */

function detectRevengeTrading(trades: Trade[], c: Ctx): DeepInsight | null {
  const days: Record<string, Trade[]> = {};
  trades.forEach(t => { (days[dayKey(t.date)] ||= []).push(t); });
  let revenge = 0, totalAfterLoss = 0, revengePnL = 0;
  Object.values(days).forEach(arr => {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1].winLoss === 'Loss') {
        totalAfterLoss++;
        if (arr[i].risk > arr[i - 1].risk * 1.2) { revenge++; revengePnL += arr[i].pnl; }
      }
    }
  });
  if (revenge < 2) return null;
  const ratio = totalAfterLoss > 0 ? (revenge / totalAfterLoss) * 100 : 0;
  return {
    id: 'revenge', icon: '🔥',
    title: c.t('מסחר נקמה', 'Revenge Trading'),
    finding: c.t(
      `זוהו ${revenge} מקרי מסחר נקמה — הגדלת סיכון >20% מיד לאחר הפסד.`,
      `${revenge} revenge-trade cases detected — risk increased >20% right after a loss.`,
    ),
    evidence: c.t(
      `${ratio.toFixed(0)}% מהעסקאות לאחר הפסד היו עם סיכון מוגבר. רווח/הפסד מצטבר מעסקאות אלו: ${c.fmtMoney(revengePnL)}.`,
      `${ratio.toFixed(0)}% of post-loss trades carried elevated risk. Cumulative P&L from these: ${c.fmtMoney(revengePnL)}.`,
    ),
    action: c.t(
      'הגדר חוק נוקשה: לאחר הפסד — סיכון זהה או נמוך ב-25%, ולא לפני הפסקה של 15 דקות.',
      'Set a hard rule: after a loss — same risk or 25% smaller, and not before a 15-minute break.',
    ),
    confidence: Math.min(0.95, 0.6 + revenge * 0.05),
    severity: 'critical', category: 'behavioural',
    metric: [
      { label: c.t('אירועים', 'Events'), value: String(revenge) },
      { label: c.t('יחס', 'Ratio'), value: `${ratio.toFixed(0)}%` },
      { label: 'P&L', value: c.fmtMoney(revengePnL) },
    ],
  };
}

function detectOverconfidenceAfterWin(trades: Trade[], c: Ctx): DeepInsight | null {
  let cases = 0, postWinLossSum = 0, postWinTotal = 0;
  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].winLoss === 'Win') {
      postWinTotal++;
      if (trades[i].risk > trades[i - 1].risk * 1.3) { cases++; postWinLossSum += trades[i].pnl; }
    }
  }
  if (cases < 3) return null;
  const ratio = postWinTotal > 0 ? (cases / postWinTotal) * 100 : 0;
  return {
    id: 'overconfidence', icon: '🎢',
    title: c.t('יתר ביטחון אחרי ניצחון', 'Overconfidence After a Win'),
    finding: c.t(
      `${cases} פעמים הגדלת סיכון משמעותית מיד לאחר ניצחון.`,
      `${cases} significant risk increases immediately after a win.`,
    ),
    evidence: c.t(
      `${ratio.toFixed(0)}% מהעסקאות אחרי ניצחון היו בסיכון מוגבר ב-30%+. P&L מצטבר: ${c.fmtMoney(postWinLossSum)}.`,
      `${ratio.toFixed(0)}% of post-win trades had risk raised 30%+. Cumulative P&L: ${c.fmtMoney(postWinLossSum)}.`,
    ),
    action: c.t(
      'הוסף בדיקה לפני עסקה: "האם הסיכון הזה היה אותו דבר אילו העסקה הקודמת הייתה הפסד?"',
      'Add a pre-trade check: "Would this risk be identical if the previous trade had been a loss?"',
    ),
    confidence: Math.min(0.9, 0.55 + cases * 0.04),
    severity: 'warning', category: 'behavioural',
    metric: [
      { label: c.t('אירועים', 'Events'), value: String(cases) },
      { label: c.t('יחס', 'Ratio'), value: `${ratio.toFixed(0)}%` },
    ],
  };
}

function detectGoldenHour(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 10) return null;
  const byHour: Record<number, Trade[]> = {};
  trades.forEach(t => { const h = hourOf(t.date); if (h >= 0) (byHour[h] ||= []).push(t); });
  const stats = Object.entries(byHour).filter(([, arr]) => arr.length >= 3).map(([h, arr]) => {
    const r = arr.reduce((s, t) => s + getEffectiveR(t), 0) / arr.length;
    const pnl = arr.reduce((s, t) => s + t.pnl, 0) / arr.length;
    const wr = arr.filter(t => t.winLoss === 'Win').length / arr.length;
    return { hour: Number(h), avgR: r, avgPnl: pnl, wr, n: arr.length };
  }).sort((a, b) => (c.isMoney ? b.avgPnl - a.avgPnl : b.avgR - a.avgR));
  if (!stats.length) return null;
  const best = stats[0];
  if ((c.isMoney ? best.avgPnl : best.avgR) <= (c.isMoney ? 1 : 0.2)) return null;
  const valStr = c.isMoney ? c.fmtMoney(best.avgPnl) : `${best.avgR.toFixed(2)}R`;
  return {
    id: 'golden-hour', icon: '⏰',
    title: c.t('שעת הזהב שלך', 'Your Golden Hour'),
    finding: c.t(
      `שעה ${String(best.hour).padStart(2, '0')}:00 היא הרווחית ביותר — ממוצע ${valStr} לעסקה.`,
      `Hour ${String(best.hour).padStart(2, '0')}:00 is the most profitable — average ${valStr} per trade.`,
    ),
    evidence: c.t(
      `${best.n} עסקאות בשעה זו, ${(best.wr * 100).toFixed(0)}% הצלחה. סטטיסטית גבוה מהממוצע.`,
      `${best.n} trades at this hour, ${(best.wr * 100).toFixed(0)}% win-rate. Statistically above average.`,
    ),
    action: c.t(
      `נסה להגביל את עיקר הפעילות לחלון של ${String(best.hour).padStart(2, '0')}:00–${String((best.hour + 2) % 24).padStart(2, '0')}:00.`,
      `Try to concentrate most activity in the ${String(best.hour).padStart(2, '0')}:00–${String((best.hour + 2) % 24).padStart(2, '0')}:00 window.`,
    ),
    confidence: Math.min(0.85, 0.5 + best.n * 0.03),
    severity: 'strength', category: 'timing',
    metric: [
      { label: c.t('שעה', 'Hour'), value: `${String(best.hour).padStart(2, '0')}:00` },
      { label: c.isMoney ? c.t('ממוצע $', 'Avg $') : c.t('ממוצע R', 'Avg R'), value: valStr },
      { label: 'WR', value: `${(best.wr * 100).toFixed(0)}%` },
    ],
  };
}

function detectDeathHour(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 10) return null;
  const byHour: Record<number, Trade[]> = {};
  trades.forEach(t => { const h = hourOf(t.date); if (h >= 0) (byHour[h] ||= []).push(t); });
  const stats = Object.entries(byHour).filter(([, arr]) => arr.length >= 3).map(([h, arr]) => ({
    hour: Number(h),
    avgR: arr.reduce((s, t) => s + getEffectiveR(t), 0) / arr.length,
    avgPnl: arr.reduce((s, t) => s + t.pnl, 0) / arr.length,
    n: arr.length,
  })).sort((a, b) => (c.isMoney ? a.avgPnl - b.avgPnl : a.avgR - b.avgR));
  if (!stats.length) return null;
  const worst = stats[0];
  if ((c.isMoney ? worst.avgPnl : worst.avgR) > (c.isMoney ? -1 : -0.1)) return null;
  const valStr = c.isMoney ? c.fmtMoney(worst.avgPnl) : `${worst.avgR.toFixed(2)}R`;
  return {
    id: 'death-hour', icon: '🌑',
    title: c.t('שעה מסוכנת', 'Danger Hour'),
    finding: c.t(
      `שעה ${String(worst.hour).padStart(2, '0')}:00 גובה ממך מחיר — ממוצע ${valStr} לעסקה.`,
      `Hour ${String(worst.hour).padStart(2, '0')}:00 is costing you — average ${valStr} per trade.`,
    ),
    evidence: c.t(
      `${worst.n} עסקאות בשעה זו עם ממוצע שלילי. סביר שאתה עייף או חסר ריכוז.`,
      `${worst.n} trades at this hour with negative average. Likely fatigue or low focus.`,
    ),
    action: c.t(
      `הימנע ממסחר בין ${String(worst.hour).padStart(2, '0')}:00 ל-${String((worst.hour + 1) % 24).padStart(2, '0')}:00, או הקטן סיכון ב-50%.`,
      `Avoid trading between ${String(worst.hour).padStart(2, '0')}:00 and ${String((worst.hour + 1) % 24).padStart(2, '0')}:00, or cut risk by 50%.`,
    ),
    confidence: Math.min(0.85, 0.5 + worst.n * 0.03),
    severity: 'warning', category: 'timing',
    metric: [
      { label: c.t('שעה', 'Hour'), value: `${String(worst.hour).padStart(2, '0')}:00` },
      { label: c.isMoney ? c.t('ממוצע $', 'Avg $') : c.t('ממוצע R', 'Avg R'), value: valStr },
    ],
  };
}

function detectGoldenDay(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 7) return null;
  const DOW = c.lang === 'he' ? HEB_DOW : ENG_DOW;
  const byDow: Record<number, Trade[]> = {};
  trades.forEach(t => { const d = dowOf(t.date); if (d >= 0) (byDow[d] ||= []).push(t); });
  const stats = Object.entries(byDow).filter(([, arr]) => arr.length >= 2).map(([d, arr]) => ({
    day: Number(d),
    avgR: arr.reduce((s, t) => s + getEffectiveR(t), 0) / arr.length,
    avgPnl: arr.reduce((s, t) => s + t.pnl, 0) / arr.length,
    n: arr.length,
  })).sort((a, b) => (c.isMoney ? b.avgPnl - a.avgPnl : b.avgR - a.avgR));
  if (!stats.length) return null;
  const best = stats[0];
  if ((c.isMoney ? best.avgPnl : best.avgR) <= (c.isMoney ? 1 : 0.15)) return null;
  const valStr = c.isMoney ? c.fmtMoney(best.avgPnl) : `${best.avgR.toFixed(2)}R`;
  return {
    id: 'golden-day', icon: '📅',
    title: c.t('יום השבוע הרווחי', 'Most Profitable Weekday'),
    finding: c.t(
      `יום ${DOW[best.day]} הוא היום הטוב ביותר — ממוצע ${valStr} לעסקה.`,
      `${DOW[best.day]} is the best day — average ${valStr} per trade.`,
    ),
    evidence: c.t(
      `${best.n} עסקאות בימי ${DOW[best.day]}, ביצועים עקביים מעל הממוצע.`,
      `${best.n} trades on ${DOW[best.day]}s, consistently above-average performance.`,
    ),
    action: c.t(
      `הגדל הקצאת תשומת לב לימי ${DOW[best.day]} — לפעמים גם הגדלת גודל ב-20%.`,
      `Allocate more focus to ${DOW[best.day]}s — sometimes a 20% size increase too.`,
    ),
    confidence: Math.min(0.8, 0.45 + best.n * 0.04),
    severity: 'strength', category: 'timing',
    metric: [
      { label: c.t('יום', 'Day'), value: DOW[best.day] },
      { label: c.isMoney ? c.t('ממוצע $', 'Avg $') : c.t('ממוצע R', 'Avg R'), value: valStr },
    ],
  };
}

function detectKellyMismatch(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 10) return null;
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  if (!wins.length || !losses.length) return null;
  const wr = wins.length / trades.length;
  const avgW = mean(wins.map(t => Math.abs(getEffectiveR(t))));
  const avgL = mean(losses.map(t => Math.abs(getEffectiveR(t))));
  if (avgL <= 0) return null;
  const b = avgW / avgL;
  const kellyOptimal = Math.max(0, wr - (1 - wr) / b);
  const kellyOptPct = kellyOptimal * 100;
  const actualPct = mean(trades.map(t => t.riskPct));
  const diff = actualPct - kellyOptPct;
  if (Math.abs(diff) < 0.5) return null;
  const tooMuch = diff > 0;
  return {
    id: 'kelly', icon: '⚖️',
    title: tooMuch
      ? c.t('סיכון יתר על קלי', 'Overshooting Kelly')
      : c.t('סיכון נמוך מקלי', 'Under-sizing vs Kelly'),
    finding: tooMuch
      ? c.t(
          `אתה מסכן ${actualPct.toFixed(2)}% בעוד שקלי האופטימלי הוא ${kellyOptPct.toFixed(2)}%.`,
          `You're risking ${actualPct.toFixed(2)}% while optimal Kelly is ${kellyOptPct.toFixed(2)}%.`,
        )
      : c.t(
          `אתה מסכן רק ${actualPct.toFixed(2)}% למרות שיש לך מקום ל-${kellyOptPct.toFixed(2)}% (קלי).`,
          `You're risking only ${actualPct.toFixed(2)}% while Kelly allows ${kellyOptPct.toFixed(2)}%.`,
        ),
    evidence: c.t(
      `מבוסס על WR=${(wr * 100).toFixed(0)}%, יחס תשלום b=${b.toFixed(2)}. סטייה: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%.`,
      `Based on WR=${(wr * 100).toFixed(0)}%, payoff b=${b.toFixed(2)}. Deviation: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%.`,
    ),
    action: tooMuch
      ? c.t('הקטן סיכון לכ-50% מקלי האופטימלי (כלל "Half Kelly") כדי להגן מפני נסיגות.', 'Cut risk to ~50% of optimal Kelly ("Half Kelly") to protect against drawdowns.')
      : c.t('אתה מקטין את האדג\' שלך. שקול להעלות סיכון בהדרגה לכיוון Half-Kelly.', "You're shrinking your edge. Gradually scale risk toward Half-Kelly."),
    confidence: 0.75,
    severity: tooMuch ? 'warning' : 'insight',
    category: 'risk',
    metric: [
      { label: c.t('נוכחי', 'Current'), value: `${actualPct.toFixed(2)}%` },
      { label: c.t('קלי', 'Kelly'), value: `${kellyOptPct.toFixed(2)}%` },
      { label: 'Half-Kelly', value: `${(kellyOptPct / 2).toFixed(2)}%` },
    ],
  };
}

function detectDeviationCost(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 5) return null;
  const followed = trades.filter(t => t.rules);
  const broken = trades.filter(t => !t.rules);
  if (!broken.length || !followed.length) return null;
  const followedExp = mean(followed.map(t => getEffectiveR(t)));
  const brokenExp = mean(broken.map(t => getEffectiveR(t)));
  const followedPnl = mean(followed.map(t => t.pnl));
  const brokenPnl = mean(broken.map(t => t.pnl));
  const costR = followedExp - brokenExp;
  const costMoney = followedPnl - brokenPnl;
  if (costR <= 0.1) return null;
  const lostR = costR * broken.length;
  const lostMoney = costMoney * broken.length;
  const valIn = c.isMoney ? c.fmtMoney(followedPnl) : `${followedExp.toFixed(2)}R`;
  const valOut = c.isMoney ? c.fmtMoney(brokenPnl) : `${brokenExp.toFixed(2)}R`;
  const lostStr = c.isMoney ? c.fmtMoney(lostMoney) : `${lostR.toFixed(2)}R`;
  const diffStr = c.isMoney ? c.fmtMoney(costMoney) : `${costR.toFixed(2)}R`;
  return {
    id: 'deviation-cost', icon: '💸',
    title: c.t('מחיר הסטייה מהכללים', 'Cost of Deviating From Rules'),
    finding: c.t(
      `כשאתה שובר את הכללים, התוחלת שלך נופלת מ-${valIn} ל-${valOut} לעסקה.`,
      `When you break the rules, your average per trade falls from ${valIn} to ${valOut}.`,
    ),
    evidence: c.t(
      `${broken.length} עסקאות מחוץ לכללים עלו לך ${lostStr}. הפרש תוחלת: ${diffStr}.`,
      `${broken.length} out-of-rules trades cost you ${lostStr}. Expectancy gap: ${diffStr}.`,
    ),
    action: c.t(
      'כל עסקה מחוץ לתוכנית — וטו אוטומטי. הגדר Kill-Switch בכלי המסחר.',
      'Every off-plan trade — automatic veto. Set a Kill-Switch in the trading tool.',
    ),
    confidence: 0.85,
    severity: 'critical', category: 'edge',
    metric: [
      { label: c.t('בכללים', 'In-rules'), value: valIn },
      { label: c.t('מחוץ', 'Out'), value: valOut },
      { label: c.t('הפסד מצטבר', 'Cumulative loss'), value: lostStr },
    ],
  };
}

function detectDirectionalBias(trades: Trade[], c: Ctx): DeepInsight | null {
  const longs = trades.filter(t => t.direction === 'Long');
  const shorts = trades.filter(t => t.direction === 'Short');
  if (longs.length < 4 || shorts.length < 4) return null;
  const longExp = mean(longs.map(t => getEffectiveR(t)));
  const shortExp = mean(shorts.map(t => getEffectiveR(t)));
  const longPnl = mean(longs.map(t => t.pnl));
  const shortPnl = mean(shorts.map(t => t.pnl));
  const diff = Math.abs(longExp - shortExp);
  if (diff < 0.3) return null;
  const longBetter = (c.isMoney ? longPnl > shortPnl : longExp > shortExp);
  const better = longBetter ? c.t('לונג', 'Long') : c.t('שורט', 'Short');
  const worse  = longBetter ? c.t('שורט', 'Short') : c.t('לונג', 'Long');
  const valHi = c.isMoney ? c.fmtMoney(Math.max(longPnl, shortPnl)) : `${Math.max(longExp, shortExp).toFixed(2)}R`;
  const valLo = c.isMoney ? c.fmtMoney(Math.min(longPnl, shortPnl)) : `${Math.min(longExp, shortExp).toFixed(2)}R`;
  const diffStr = c.isMoney ? c.fmtMoney(Math.abs(longPnl - shortPnl)) : `${diff.toFixed(2)}R`;
  return {
    id: 'directional-bias', icon: '🧭',
    title: c.t('הטיה כיוונית', 'Directional Bias'),
    finding: c.t(
      `יש לך אדג' ברור ב${better} (${valHi}) לעומת ${worse} (${valLo}).`,
      `You have a clear edge on ${better} (${valHi}) vs ${worse} (${valLo}).`,
    ),
    evidence: c.t(
      `הפרש של ${diffStr} לעסקה. ${better}: ${longBetter ? longs.length : shorts.length} עסקאות.`,
      `Per-trade gap of ${diffStr}. ${better}: ${longBetter ? longs.length : shorts.length} trades.`,
    ),
    action: c.t(
      `התמקד ב${better} — או חזק את אסטרטגיית ה${worse} עם backtest נפרד לפני חזרה למסחר חי.`,
      `Focus on ${better} — or strengthen the ${worse} strategy with a separate backtest before going live again.`,
    ),
    confidence: Math.min(0.85, 0.6 + diff * 0.3),
    severity: 'insight', category: 'edge',
    metric: [
      { label: c.t('לונג', 'Long'), value: c.isMoney ? c.fmtMoney(longPnl) : `${longExp.toFixed(2)}R` },
      { label: c.t('שורט', 'Short'), value: c.isMoney ? c.fmtMoney(shortPnl) : `${shortExp.toFixed(2)}R` },
    ],
  };
}

function detectLeadingSetup(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 6) return null;
  const byCoin: Record<string, Trade[]> = {};
  trades.forEach(t => { (byCoin[t.coin] ||= []).push(t); });
  const ranked = Object.entries(byCoin).filter(([, arr]) => arr.length >= 3).map(([coin, arr]) => ({
    coin, n: arr.length,
    exp: mean(arr.map(t => getEffectiveR(t))),
    avgPnl: mean(arr.map(t => t.pnl)),
    wr: arr.filter(t => t.winLoss === 'Win').length / arr.length,
    pnl: arr.reduce((s, t) => s + t.pnl, 0),
  })).sort((a, b) => (c.isMoney ? b.avgPnl - a.avgPnl : b.exp - a.exp));
  if (!ranked.length) return null;
  const top = ranked[0];
  if ((c.isMoney ? top.avgPnl : top.exp) <= (c.isMoney ? 1 : 0.3)) return null;
  const valStr = c.isMoney ? c.fmtMoney(top.avgPnl) : `${top.exp.toFixed(2)}R`;
  return {
    id: 'leading-setup', icon: '🏆',
    title: c.t('הסטאפ המוביל', 'Leading Setup'),
    finding: c.t(
      `${top.coin} הוא הנכס הרווחי ביותר — ממוצע ${valStr} לעסקה.`,
      `${top.coin} is your most profitable instrument — average ${valStr} per trade.`,
    ),
    evidence: c.t(
      `${top.n} עסקאות, ${(top.wr * 100).toFixed(0)}% הצלחה, ${c.fmtMoney(top.pnl)} מצטבר.`,
      `${top.n} trades, ${(top.wr * 100).toFixed(0)}% win-rate, ${c.fmtMoney(top.pnl)} cumulative.`,
    ),
    action: c.t(
      `העמק את הניתוח של ${top.coin}: מה גורם להצלחה? נסה להעלות גודל ב-20% או להגביר תדירות.`,
      `Dig into ${top.coin}: what's driving the success? Try a 20% size bump or higher frequency.`,
    ),
    confidence: Math.min(0.85, 0.55 + top.n * 0.04),
    severity: 'strength', category: 'edge',
    metric: [
      { label: c.t('נכס', 'Asset'), value: top.coin },
      { label: c.isMoney ? c.t('ממוצע $', 'Avg $') : c.t('תוחלת', 'Expectancy'), value: valStr },
      { label: 'P&L', value: c.fmtMoney(top.pnl) },
    ],
  };
}

function detectOvertrading(trades: Trade[], c: Ctx): DeepInsight | null {
  const days: Record<string, Trade[]> = {};
  trades.forEach(t => { (days[dayKey(t.date)] ||= []).push(t); });
  const dayList = Object.values(days);
  if (dayList.length < 3) return null;
  const overtradeDays = dayList.filter(arr => arr.length >= 4);
  if (!overtradeDays.length) return null;
  const otPnL = overtradeDays.reduce((s, arr) => s + arr.reduce((a, t) => a + t.pnl, 0), 0);
  const normalDays = dayList.filter(arr => arr.length < 4);
  const normalAvg = normalDays.length ? normalDays.reduce((s, arr) => s + arr.reduce((a, t) => a + t.pnl, 0), 0) / normalDays.length : 0;
  const otAvg = otPnL / overtradeDays.length;
  return {
    id: 'overtrading', icon: '⚡',
    title: c.t('דפוס מסחר יתר', 'Overtrading Pattern'),
    finding: c.t(
      `${overtradeDays.length} ימים עם 4+ עסקאות. ממוצע יומי במסחר יתר: ${c.fmtMoney(otAvg)}.`,
      `${overtradeDays.length} days with 4+ trades. Daily avg during overtrading: ${c.fmtMoney(otAvg)}.`,
    ),
    evidence: c.t(
      `ימים רגילים: ממוצע ${c.fmtMoney(normalAvg)}. הפרש: ${c.fmtMoney(otAvg - normalAvg)}.`,
      `Normal days: average ${c.fmtMoney(normalAvg)}. Gap: ${c.fmtMoney(otAvg - normalAvg)}.`,
    ),
    action: c.t(
      'הגדר תקרה של 3 עסקאות ביום. אם הגעת ל-3 — סגור פלטפורמה ל-2 שעות.',
      'Set a cap of 3 trades/day. If you hit 3 — close the platform for 2 hours.',
    ),
    confidence: 0.8,
    severity: otAvg < normalAvg ? 'critical' : 'warning',
    category: 'behavioural',
    metric: [
      { label: c.t('ימי יתר', 'Overtrading days'), value: String(overtradeDays.length) },
      { label: c.t('ממוצע יתר', 'OT avg'), value: c.fmtMoney(otAvg) },
      { label: c.t('ממוצע רגיל', 'Normal avg'), value: c.fmtMoney(normalAvg) },
    ],
  };
}

function detectRecoveryPattern(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 8) return null;
  let streakEnds = 0, recovered = 0, deepened = 0;
  let streak = 0;
  for (let i = 0; i < trades.length; i++) {
    if (trades[i].winLoss === 'Loss') streak++;
    else {
      if (streak >= 2 && i + 1 < trades.length) {
        streakEnds++;
        if (trades[i + 1].winLoss === 'Win') recovered++;
        else if (trades[i + 1].winLoss === 'Loss') deepened++;
      }
      streak = 0;
    }
  }
  if (streakEnds < 2) return null;
  const recRate = (recovered / streakEnds) * 100;
  return {
    id: 'recovery', icon: '🌅',
    title: c.t('דפוס התאוששות', 'Recovery Pattern'),
    finding: c.t(
      `אחרי רצף הפסדים, ${recRate.toFixed(0)}% מהמקרים אתה מתאושש מיד.`,
      `After a loss streak you recover immediately ${recRate.toFixed(0)}% of the time.`,
    ),
    evidence: c.t(
      `נמדדו ${streakEnds} סיומי רצף, ${recovered} התאוששויות, ${deepened} העמקות.`,
      `${streakEnds} streak-endings measured, ${recovered} recoveries, ${deepened} deepenings.`,
    ),
    action: recRate >= 60
      ? c.t('יש לך עמידות מנטלית טובה. שמור על מתודיקה — אל תגדיל סיכון בהתאוששות.', 'Good mental resilience. Stay methodical — do not increase risk during recovery.')
      : c.t('הוסף הפסקה חובה של 30 דק\' אחרי 2 הפסדים רצופים. סבירות גבוהה להעמיק את הנפילה.', "Add a mandatory 30-min break after 2 consecutive losses. High odds of deepening the drawdown."),
    confidence: Math.min(0.8, 0.5 + streakEnds * 0.06),
    severity: recRate >= 60 ? 'strength' : 'warning',
    category: 'behavioural',
    metric: [
      { label: c.t('שיעור התאוששות', 'Recovery rate'), value: `${recRate.toFixed(0)}%` },
      { label: c.t('מקרים', 'Cases'), value: String(streakEnds) },
    ],
  };
}

function detectMomentum(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 10) return null;
  const recent = trades.slice(-5);
  const earlier = trades.slice(-10, -5);
  const recentR = mean(recent.map(t => getEffectiveR(t)));
  const earlierR = mean(earlier.map(t => getEffectiveR(t)));
  const recentPnl = mean(recent.map(t => t.pnl));
  const earlierPnl = mean(earlier.map(t => t.pnl));
  const deltaR = recentR - earlierR;
  if (Math.abs(deltaR) < 0.3) return null;
  const up = deltaR > 0;
  const recentStr = c.isMoney ? c.fmtMoney(recentPnl) : `${recentR.toFixed(2)}R`;
  const earlierStr = c.isMoney ? c.fmtMoney(earlierPnl) : `${earlierR.toFixed(2)}R`;
  const deltaStr = c.isMoney ? c.fmtMoney(recentPnl - earlierPnl) : `${deltaR >= 0 ? '+' : ''}${deltaR.toFixed(2)}R`;
  return {
    id: 'momentum', icon: up ? '🚀' : '📉',
    title: up ? c.t('מומנטום עולה', 'Rising Momentum') : c.t('מומנטום יורד', 'Falling Momentum'),
    finding: up
      ? c.t(
          `5 עסקאות אחרונות (${recentStr}) חזקות משמעותית מ-5 לפניהן (${earlierStr}).`,
          `Last 5 trades (${recentStr}) significantly stronger than the prior 5 (${earlierStr}).`,
        )
      : c.t(
          `5 עסקאות אחרונות (${recentStr}) חלשות משמעותית מ-5 לפניהן (${earlierStr}).`,
          `Last 5 trades (${recentStr}) significantly weaker than the prior 5 (${earlierStr}).`,
        ),
    evidence: c.t(`הפרש לעסקה: ${deltaStr}.`, `Per-trade gap: ${deltaStr}.`),
    action: up
      ? c.t('אתה ב-Flow. אל תפר את הריטואל — אותו גודל, אותם זמנים, אותם סטאפים.', "You're in flow. Don't break the ritual — same size, same hours, same setups.")
      : c.t('הקטן סיכון ב-50% עד שתחזיר 3 ניצחונות רצופים, או צא להפסקה של יום.', 'Cut risk by 50% until you string 3 wins in a row, or take a day off.'),
    confidence: 0.75,
    severity: up ? 'strength' : 'warning',
    category: 'statistical',
    metric: [
      { label: c.t('אחרונות', 'Recent'), value: recentStr },
      { label: c.t('קודמות', 'Prior'), value: earlierStr },
    ],
  };
}

function detectInconsistentReturns(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 8) return null;
  const wins = trades.filter(t => t.winLoss === 'Win');
  if (wins.length < 4) return null;
  const winRs = wins.map(t => getEffectiveR(t));
  const m = mean(winRs);
  const s = std(winRs);
  const cv = m > 0 ? (s / m) * 100 : 0;
  if (cv < 60) return null;
  return {
    id: 'inconsistent-wins', icon: '🌪️',
    title: c.t('חוסר עקביות ברווחים', 'Inconsistent Wins'),
    finding: c.t(
      `הניצחונות שלך מאוד לא עקביים — מקדם השונות הוא ${cv.toFixed(0)}%.`,
      `Your wins are highly inconsistent — coefficient of variation is ${cv.toFixed(0)}%.`,
    ),
    evidence: c.t(
      `ממוצע רווח: ${m.toFixed(2)}R, סטיית תקן: ${s.toFixed(2)}R. CV>60% מסמן תוצאות אקראיות.`,
      `Avg win: ${m.toFixed(2)}R, std dev: ${s.toFixed(2)}R. CV>60% indicates random outcomes.`,
    ),
    action: c.t(
      'בדוק האם אתה מחזיק עסקאות טוב מדי זמן רב או מוקדם מדי. הגדר יעדי R קבועים.',
      'Check whether you hold winners too long or too short. Set fixed R targets.',
    ),
    confidence: 0.7,
    severity: 'insight', category: 'statistical',
    metric: [
      { label: 'CV', value: `${cv.toFixed(0)}%` },
      { label: 'σ', value: `${s.toFixed(2)}R` },
    ],
  };
}

function detectRiskInconsistency(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 5) return null;
  const risks = trades.map(t => t.risk).filter(r => r > 0);
  if (risks.length < 5) return null;
  const m = mean(risks);
  const s = std(risks);
  const cv = m > 0 ? (s / m) * 100 : 0;
  if (cv < 50) return null;
  return {
    id: 'risk-inconsistency', icon: '🎲',
    title: c.t('חוסר עקביות בסיכון', 'Risk Inconsistency'),
    finding: c.t(
      `הסיכון שלך משתנה משמעותית בין עסקאות (CV=${cv.toFixed(0)}%).`,
      `Your risk varies significantly across trades (CV=${cv.toFixed(0)}%).`,
    ),
    evidence: c.t(
      `סיכון ממוצע: $${m.toFixed(2)}, סטיית תקן: $${s.toFixed(2)}. עקביות נמוכה פוגעת בתוחלת לטווח ארוך.`,
      `Avg risk: $${m.toFixed(2)}, std dev: $${s.toFixed(2)}. Low consistency hurts long-term expectancy.`,
    ),
    action: c.t(
      'קבע סיכון קבוע (כגון 1% מההון) לכל עסקה. שינוי בגודל = שינוי בתוחלת.',
      'Fix risk (e.g., 1% of capital) per trade. A size change = an expectancy change.',
    ),
    confidence: 0.8,
    severity: 'warning', category: 'risk',
    metric: [
      { label: c.t('CV סיכון', 'Risk CV'), value: `${cv.toFixed(0)}%` },
      { label: c.t('ממוצע', 'Average'), value: `$${m.toFixed(2)}` },
    ],
  };
}

function detectFridayEffect(trades: Trade[], c: Ctx): DeepInsight | null {
  if (trades.length < 10) return null;
  const fri = trades.filter(t => dowOf(t.date) === 5);
  if (fri.length < 3) return null;
  const friR = mean(fri.map(t => getEffectiveR(t)));
  const restR = mean(trades.filter(t => dowOf(t.date) !== 5).map(t => getEffectiveR(t)));
  const friPnl = mean(fri.map(t => t.pnl));
  const restPnl = mean(trades.filter(t => dowOf(t.date) !== 5).map(t => t.pnl));
  const diffR = friR - restR;
  if (Math.abs(diffR) < 0.3) return null;
  const positive = diffR > 0;
  const friStr = c.isMoney ? c.fmtMoney(friPnl) : `${friR.toFixed(2)}R`;
  const restStr = c.isMoney ? c.fmtMoney(restPnl) : `${restR.toFixed(2)}R`;
  const diffStr = c.isMoney ? c.fmtMoney(Math.abs(friPnl - restPnl)) : `${Math.abs(diffR).toFixed(2)}R`;
  return {
    id: 'friday-effect', icon: '🌴',
    title: positive ? c.t('אפקט יום שישי חיובי', 'Positive Friday Effect') : c.t('אפקט יום שישי שלילי', 'Negative Friday Effect'),
    finding: positive
      ? c.t(
          `ימי שישי שלך טובים במיוחד — ${friStr} לעומת ${restStr} בשאר השבוע.`,
          `Your Fridays are unusually strong — ${friStr} vs ${restStr} on other days.`,
        )
      : c.t(
          `ימי שישי גרועים — ${friStr} מול ${restStr} בשאר. אולי עייפות סוף שבוע.`,
          `Fridays are weak — ${friStr} vs ${restStr} elsewhere. Possibly end-of-week fatigue.`,
        ),
    evidence: c.t(
      `${fri.length} עסקאות בימי שישי. הפרש משמעותי של ${diffStr}.`,
      `${fri.length} Friday trades. Significant gap of ${diffStr}.`,
    ),
    action: positive
      ? c.t('נצל את העובדה — הקצה זמן רב יותר לימי שישי.', 'Exploit it — allocate more time to Fridays.')
      : c.t('שקול להפסיק מסחר ביום שישי או להוריד סיכון ב-50%.', 'Consider skipping Friday trading or cutting risk by 50%.'),
    confidence: 0.7,
    severity: positive ? 'strength' : 'warning',
    category: 'timing',
    metric: [
      { label: c.t('שישי', 'Fri'), value: friStr },
      { label: c.t('שאר', 'Rest'), value: restStr },
    ],
  };
}

/* ─── MAIN API ────────────────────────────────────────────────── */

export function analyzeDeep(trades: Trade[], opts: InsightOpts = {}): DeepAnalysis {
  const c = mkCtx(opts);
  const dna = computeDNA(trades);
  const detectors = [
    detectRevengeTrading,
    detectOverconfidenceAfterWin,
    detectGoldenHour,
    detectDeathHour,
    detectGoldenDay,
    detectKellyMismatch,
    detectDeviationCost,
    detectDirectionalBias,
    detectLeadingSetup,
    detectOvertrading,
    detectRecoveryPattern,
    detectMomentum,
    detectInconsistentReturns,
    detectRiskInconsistency,
    detectFridayEffect,
  ];
  const insights = detectors
    .map(fn => fn(trades, c))
    .filter((x): x is DeepInsight => x !== null)
    .sort((a, b) => {
      const order: Record<DeepSeverity, number> = { critical: 0, warning: 1, strength: 2, insight: 3 };
      const so = order[a.severity] - order[b.severity];
      return so !== 0 ? so : b.confidence - a.confidence;
    });

  let spanDays = 0;
  if (trades.length > 1) {
    try {
      const first = new Date(trades[0].date.replace(' ', 'T')).getTime();
      const last  = new Date(trades[trades.length - 1].date.replace(' ', 'T')).getTime();
      spanDays = Math.max(1, Math.round((last - first) / 86400000));
    } catch { /* ignore */ }
  }

  return {
    insights, dna,
    meta: {
      sampleSize: trades.length,
      spanDays,
      confidenceFloor: trades.length < 10 ? 0.4 : trades.length < 25 ? 0.55 : 0.7,
    },
  };
}
