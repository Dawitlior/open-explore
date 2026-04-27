/**
 * 🧠 DEEP AI INSIGHTS ENGINE
 * ────────────────────────────────────────────────────────────────
 * Detects hidden patterns across 13+ behavioural & statistical
 * dimensions that a trader would rarely spot unaided.
 *
 * Every insight carries:
 *   • finding   — what was discovered
 *   • evidence  — statistical proof
 *   • action    — concrete recommendation
 *   • confidence — 0..1 reliability score
 *   • severity  — critical | warning | strength | insight
 *   • category  — behavioural | statistical | edge | timing | risk
 */

import type { Trade } from '@/data/trades';

export type DeepSeverity = 'critical' | 'warning' | 'strength' | 'insight';
export type DeepCategory = 'behavioural' | 'statistical' | 'edge' | 'timing' | 'risk';

export interface DeepInsight {
  id: string;
  icon: string;
  title: string;
  finding: string;
  evidence: string;
  action: string;
  confidence: number; // 0..1
  severity: DeepSeverity;
  category: DeepCategory;
  metric?: { label: string; value: string }[];
}

export interface TraderDNA {
  edge: number;        // 0..100
  discipline: number;  // 0..100
  consistency: number; // 0..100
  behaviour: number;   // 0..100
  overall: number;     // 0..100
}

export interface DeepAnalysis {
  insights: DeepInsight[];
  dna: TraderDNA;
  meta: {
    sampleSize: number;
    spanDays: number;
    confidenceFloor: number;
  };
}

/* ──────────────────────────────────────────────────────────────── */
/* Helpers                                                          */
/* ──────────────────────────────────────────────────────────────── */

const std = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
};

const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

const dayKey = (d: string): string => {
  try { return new Date(d.replace(' ', 'T')).toDateString(); } catch { return d; }
};

const hourOf = (d: string): number => {
  try { return new Date(d.replace(' ', 'T')).getHours(); } catch { return -1; }
};

const dowOf = (d: string): number => {
  try { return new Date(d.replace(' ', 'T')).getDay(); } catch { return -1; }
};

const HEB_DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/* ──────────────────────────────────────────────────────────────── */
/* DNA SCORING                                                      */
/* ──────────────────────────────────────────────────────────────── */

function computeDNA(trades: Trade[]): TraderDNA {
  if (!trades.length) return { edge: 0, discipline: 0, consistency: 0, behaviour: 0, overall: 0 };

  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  const totalR = trades.reduce((s, t) => s + t.returnR, 0);
  const expR = totalR / trades.length;

  // EDGE: expectancy + profit factor + win rate composite
  const grossW = wins.reduce((s, t) => s + Math.abs(t.returnR), 0);
  const grossL = losses.reduce((s, t) => s + Math.abs(t.returnR), 0) || 1;
  const pf = grossW / grossL;
  const wr = (wins.length / trades.length) * 100;
  const edgeRaw = (Math.min(expR + 0.5, 1.5) / 1.5) * 50 + Math.min(pf / 3, 1) * 30 + Math.min(wr / 70, 1) * 20;
  const edge = Math.max(0, Math.min(100, edgeRaw));

  // DISCIPLINE: rules followed + low deviation
  const ruleRate = (trades.filter(t => t.rules).length / trades.length) * 100;
  const avgDev = mean(trades.map(t => Math.abs(t.deviation)));
  const devPenalty = Math.min(avgDev * 100, 40);
  const discipline = Math.max(0, Math.min(100, ruleRate - devPenalty));

  // CONSISTENCY: low variance of risk + low variance of R
  const riskCV = mean(trades.map(t => t.risk)) > 0
    ? std(trades.map(t => t.risk)) / mean(trades.map(t => t.risk))
    : 0;
  const rStd = std(trades.map(t => t.returnR));
  const consistency = Math.max(0, Math.min(100, 100 - riskCV * 80 - rStd * 10));

  // BEHAVIOUR: revenge trades, overtrading, post-loss escalation
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

  return {
    edge: Math.round(edge),
    discipline: Math.round(discipline),
    consistency: Math.round(consistency),
    behaviour: Math.round(behaviour),
    overall,
  };
}

/* ──────────────────────────────────────────────────────────────── */
/* PATTERN DETECTORS                                                */
/* ──────────────────────────────────────────────────────────────── */

function detectRevengeTrading(trades: Trade[]): DeepInsight | null {
  const days: Record<string, Trade[]> = {};
  trades.forEach(t => { (days[dayKey(t.date)] ||= []).push(t); });
  let revenge = 0, totalAfterLoss = 0, revengePnL = 0;
  Object.values(days).forEach(arr => {
    for (let i = 1; i < arr.length; i++) {
      if (arr[i - 1].winLoss === 'Loss') {
        totalAfterLoss++;
        if (arr[i].risk > arr[i - 1].risk * 1.2) {
          revenge++;
          revengePnL += arr[i].pnl;
        }
      }
    }
  });
  if (revenge < 2) return null;
  const ratio = totalAfterLoss > 0 ? (revenge / totalAfterLoss) * 100 : 0;
  return {
    id: 'revenge',
    icon: '🔥',
    title: 'מסחר נקמה',
    finding: `זוהו ${revenge} מקרי מסחר נקמה — הגדלת סיכון >20% מיד לאחר הפסד.`,
    evidence: `${ratio.toFixed(0)}% מהעסקאות לאחר הפסד היו עם סיכון מוגבר. רווח/הפסד מצטבר מעסקאות אלו: ${revengePnL >= 0 ? '+' : ''}$${revengePnL.toFixed(2)}.`,
    action: 'הגדר חוק נוקשה: לאחר הפסד — סיכון זהה או נמוך ב-25%, ולא לפני הפסקה של 15 דקות.',
    confidence: Math.min(0.95, 0.6 + revenge * 0.05),
    severity: 'critical',
    category: 'behavioural',
    metric: [
      { label: 'אירועים', value: String(revenge) },
      { label: 'יחס', value: `${ratio.toFixed(0)}%` },
      { label: 'P&L', value: `${revengePnL >= 0 ? '+' : ''}$${revengePnL.toFixed(2)}` },
    ],
  };
}

function detectOverconfidenceAfterWin(trades: Trade[]): DeepInsight | null {
  let cases = 0, postWinLossSum = 0, postWinTotal = 0;
  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].winLoss === 'Win') {
      postWinTotal++;
      if (trades[i].risk > trades[i - 1].risk * 1.3) {
        cases++;
        postWinLossSum += trades[i].pnl;
      }
    }
  }
  if (cases < 3) return null;
  const ratio = postWinTotal > 0 ? (cases / postWinTotal) * 100 : 0;
  return {
    id: 'overconfidence',
    icon: '🎢',
    title: 'יתר ביטחון אחרי ניצחון',
    finding: `${cases} פעמים הגדלת סיכון משמעותית מיד לאחר ניצחון.`,
    evidence: `${ratio.toFixed(0)}% מהעסקאות אחרי ניצחון היו בסיכון מוגבר ב-30%+. P&L מצטבר: ${postWinLossSum >= 0 ? '+' : ''}$${postWinLossSum.toFixed(2)}.`,
    action: 'הוסף בדיקה לפני עסקה: "האם הסיכון הזה היה אותו דבר אילו העסקה הקודמת הייתה הפסד?"',
    confidence: Math.min(0.9, 0.55 + cases * 0.04),
    severity: 'warning',
    category: 'behavioural',
    metric: [
      { label: 'אירועים', value: String(cases) },
      { label: 'יחס', value: `${ratio.toFixed(0)}%` },
    ],
  };
}

function detectGoldenHour(trades: Trade[]): DeepInsight | null {
  if (trades.length < 10) return null;
  const byHour: Record<number, Trade[]> = {};
  trades.forEach(t => {
    const h = hourOf(t.date);
    if (h >= 0) (byHour[h] ||= []).push(t);
  });
  const stats = Object.entries(byHour)
    .filter(([, arr]) => arr.length >= 3)
    .map(([h, arr]) => {
      const r = arr.reduce((s, t) => s + t.returnR, 0) / arr.length;
      const wr = arr.filter(t => t.winLoss === 'Win').length / arr.length;
      return { hour: Number(h), avgR: r, wr, n: arr.length };
    })
    .sort((a, b) => b.avgR - a.avgR);
  if (!stats.length) return null;
  const best = stats[0];
  if (best.avgR <= 0.2) return null;
  return {
    id: 'golden-hour',
    icon: '⏰',
    title: 'שעת הזהב שלך',
    finding: `שעה ${String(best.hour).padStart(2, '0')}:00 היא הרווחית ביותר — ממוצע ${best.avgR.toFixed(2)}R לעסקה.`,
    evidence: `${best.n} עסקאות בשעה זו, ${(best.wr * 100).toFixed(0)}% הצלחה. סטטיסטית גבוה מהממוצע.`,
    action: `נסה להגביל את עיקר הפעילות לחלון של ${String(best.hour).padStart(2, '0')}:00–${String((best.hour + 2) % 24).padStart(2, '0')}:00.`,
    confidence: Math.min(0.85, 0.5 + best.n * 0.03),
    severity: 'strength',
    category: 'timing',
    metric: [
      { label: 'שעה', value: `${String(best.hour).padStart(2, '0')}:00` },
      { label: 'ממוצע R', value: `${best.avgR.toFixed(2)}` },
      { label: 'WR', value: `${(best.wr * 100).toFixed(0)}%` },
    ],
  };
}

function detectDeathHour(trades: Trade[]): DeepInsight | null {
  if (trades.length < 10) return null;
  const byHour: Record<number, Trade[]> = {};
  trades.forEach(t => {
    const h = hourOf(t.date);
    if (h >= 0) (byHour[h] ||= []).push(t);
  });
  const stats = Object.entries(byHour)
    .filter(([, arr]) => arr.length >= 3)
    .map(([h, arr]) => ({
      hour: Number(h),
      avgR: arr.reduce((s, t) => s + t.returnR, 0) / arr.length,
      n: arr.length,
    }))
    .sort((a, b) => a.avgR - b.avgR);
  if (!stats.length || stats[0].avgR > -0.1) return null;
  const worst = stats[0];
  return {
    id: 'death-hour',
    icon: '🌑',
    title: 'שעה מסוכנת',
    finding: `שעה ${String(worst.hour).padStart(2, '0')}:00 גובה ממך מחיר — ממוצע ${worst.avgR.toFixed(2)}R לעסקה.`,
    evidence: `${worst.n} עסקאות בשעה זו עם ממוצע שלילי. סביר שאתה עייף או חסר ריכוז.`,
    action: `הימנע ממסחר בין ${String(worst.hour).padStart(2, '0')}:00 ל-${String((worst.hour + 1) % 24).padStart(2, '0')}:00, או הקטן סיכון ב-50%.`,
    confidence: Math.min(0.85, 0.5 + worst.n * 0.03),
    severity: 'warning',
    category: 'timing',
    metric: [
      { label: 'שעה', value: `${String(worst.hour).padStart(2, '0')}:00` },
      { label: 'ממוצע R', value: `${worst.avgR.toFixed(2)}` },
    ],
  };
}

function detectGoldenDay(trades: Trade[]): DeepInsight | null {
  if (trades.length < 7) return null;
  const byDow: Record<number, Trade[]> = {};
  trades.forEach(t => {
    const d = dowOf(t.date);
    if (d >= 0) (byDow[d] ||= []).push(t);
  });
  const stats = Object.entries(byDow)
    .filter(([, arr]) => arr.length >= 2)
    .map(([d, arr]) => ({
      day: Number(d),
      avgR: arr.reduce((s, t) => s + t.returnR, 0) / arr.length,
      n: arr.length,
    }))
    .sort((a, b) => b.avgR - a.avgR);
  if (!stats.length || stats[0].avgR <= 0.15) return null;
  const best = stats[0];
  return {
    id: 'golden-day',
    icon: '📅',
    title: 'יום השבוע הרווחי',
    finding: `יום ${HEB_DOW[best.day]} הוא היום הטוב ביותר — ממוצע ${best.avgR.toFixed(2)}R לעסקה.`,
    evidence: `${best.n} עסקאות בימי ${HEB_DOW[best.day]}, ביצועים עקביים מעל הממוצע.`,
    action: `הגדל הקצאת תשומת לב לימי ${HEB_DOW[best.day]} — לפעמים גם הגדלת גודל ב-20%.`,
    confidence: Math.min(0.8, 0.45 + best.n * 0.04),
    severity: 'strength',
    category: 'timing',
    metric: [
      { label: 'יום', value: HEB_DOW[best.day] },
      { label: 'ממוצע R', value: `${best.avgR.toFixed(2)}` },
    ],
  };
}

function detectKellyMismatch(trades: Trade[]): DeepInsight | null {
  if (trades.length < 10) return null;
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  if (!wins.length || !losses.length) return null;
  const wr = wins.length / trades.length;
  const avgW = mean(wins.map(t => Math.abs(t.returnR)));
  const avgL = mean(losses.map(t => Math.abs(t.returnR)));
  if (avgL <= 0) return null;
  const b = avgW / avgL;
  const kellyOptimal = Math.max(0, wr - (1 - wr) / b);
  const kellyOptPct = kellyOptimal * 100;
  const actualPct = mean(trades.map(t => t.riskPct));
  const diff = actualPct - kellyOptPct;
  if (Math.abs(diff) < 0.5) return null;
  const tooMuch = diff > 0;
  return {
    id: 'kelly',
    icon: '⚖️',
    title: tooMuch ? 'סיכון יתר על קלי' : 'סיכון נמוך מקלי',
    finding: tooMuch
      ? `אתה מסכן ${actualPct.toFixed(2)}% בעוד שקלי האופטימלי הוא ${kellyOptPct.toFixed(2)}%.`
      : `אתה מסכן רק ${actualPct.toFixed(2)}% למרות שיש לך מקום ל-${kellyOptPct.toFixed(2)}% (קלי).`,
    evidence: `מבוסס על WR=${(wr * 100).toFixed(0)}%, יחס תשלום b=${b.toFixed(2)}. סטייה: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%.`,
    action: tooMuch
      ? 'הקטן סיכון לכ-50% מקלי האופטימלי (כלל "Half Kelly") כדי להגן מפני נסיגות.'
      : 'אתה מקטין את האדג\' שלך. שקול להעלות סיכון בהדרגה לכיוון Half-Kelly.',
    confidence: 0.75,
    severity: tooMuch ? 'warning' : 'insight',
    category: 'risk',
    metric: [
      { label: 'נוכחי', value: `${actualPct.toFixed(2)}%` },
      { label: 'קלי', value: `${kellyOptPct.toFixed(2)}%` },
      { label: 'Half-Kelly', value: `${(kellyOptPct / 2).toFixed(2)}%` },
    ],
  };
}

function detectDeviationCost(trades: Trade[]): DeepInsight | null {
  if (trades.length < 5) return null;
  const followed = trades.filter(t => t.rules);
  const broken = trades.filter(t => !t.rules);
  if (!broken.length || !followed.length) return null;
  const followedExp = mean(followed.map(t => t.returnR));
  const brokenExp = mean(broken.map(t => t.returnR));
  const cost = followedExp - brokenExp;
  if (cost <= 0.1) return null;
  const lostR = cost * broken.length;
  return {
    id: 'deviation-cost',
    icon: '💸',
    title: 'מחיר הסטייה מהכללים',
    finding: `כשאתה שובר את הכללים, התוחלת שלך נופלת מ-${followedExp.toFixed(2)}R ל-${brokenExp.toFixed(2)}R לעסקה.`,
    evidence: `${broken.length} עסקאות מחוץ לכללים עלו לך כ-${lostR.toFixed(2)}R. הפרש תוחלת: ${cost.toFixed(2)}R.`,
    action: 'כל עסקה מחוץ לתוכנית — וטו אוטומטי. הגדר Kill-Switch בכלי המסחר.',
    confidence: 0.85,
    severity: 'critical',
    category: 'edge',
    metric: [
      { label: 'תוחלת בכללים', value: `${followedExp.toFixed(2)}R` },
      { label: 'תוחלת מחוץ', value: `${brokenExp.toFixed(2)}R` },
      { label: 'הפסד מצטבר', value: `${lostR.toFixed(2)}R` },
    ],
  };
}

function detectDirectionalBias(trades: Trade[]): DeepInsight | null {
  const longs = trades.filter(t => t.direction === 'Long');
  const shorts = trades.filter(t => t.direction === 'Short');
  if (longs.length < 4 || shorts.length < 4) return null;
  const longExp = mean(longs.map(t => t.returnR));
  const shortExp = mean(shorts.map(t => t.returnR));
  const diff = Math.abs(longExp - shortExp);
  if (diff < 0.3) return null;
  const better = longExp > shortExp ? 'לונג' : 'שורט';
  const worse = longExp > shortExp ? 'שורט' : 'לונג';
  return {
    id: 'directional-bias',
    icon: '🧭',
    title: 'הטיה כיוונית',
    finding: `יש לך אדג' ברור ב${better} (${Math.max(longExp, shortExp).toFixed(2)}R) לעומת ${worse} (${Math.min(longExp, shortExp).toFixed(2)}R).`,
    evidence: `הפרש תוחלת של ${diff.toFixed(2)}R לעסקה. ${better}: ${longExp > shortExp ? longs.length : shorts.length} עסקאות.`,
    action: `התמקד ב${better} — או חזק את אסטרטגיית ה${worse} עם backtest נפרד לפני חזרה למסחר חי.`,
    confidence: Math.min(0.85, 0.6 + diff * 0.3),
    severity: 'insight',
    category: 'edge',
    metric: [
      { label: 'לונג', value: `${longExp.toFixed(2)}R` },
      { label: 'שורט', value: `${shortExp.toFixed(2)}R` },
    ],
  };
}

function detectLeadingSetup(trades: Trade[]): DeepInsight | null {
  if (trades.length < 6) return null;
  const byCoin: Record<string, Trade[]> = {};
  trades.forEach(t => { (byCoin[t.coin] ||= []).push(t); });
  const ranked = Object.entries(byCoin)
    .filter(([, arr]) => arr.length >= 3)
    .map(([c, arr]) => ({
      coin: c,
      n: arr.length,
      exp: mean(arr.map(t => t.returnR)),
      wr: arr.filter(t => t.winLoss === 'Win').length / arr.length,
      pnl: arr.reduce((s, t) => s + t.pnl, 0),
    }))
    .sort((a, b) => b.exp - a.exp);
  if (!ranked.length || ranked[0].exp <= 0.3) return null;
  const top = ranked[0];
  return {
    id: 'leading-setup',
    icon: '🏆',
    title: 'הסטאפ המוביל',
    finding: `${top.coin} הוא הנכס הרווחי ביותר — תוחלת ${top.exp.toFixed(2)}R לעסקה.`,
    evidence: `${top.n} עסקאות, ${(top.wr * 100).toFixed(0)}% הצלחה, ${top.pnl >= 0 ? '+' : ''}$${top.pnl.toFixed(2)} מצטבר.`,
    action: `העמק את הניתוח של ${top.coin}: מה גורם להצלחה? נסה להעלות גודל ב-20% או להגביר תדירות.`,
    confidence: Math.min(0.85, 0.55 + top.n * 0.04),
    severity: 'strength',
    category: 'edge',
    metric: [
      { label: 'נכס', value: top.coin },
      { label: 'תוחלת', value: `${top.exp.toFixed(2)}R` },
      { label: 'P&L', value: `$${top.pnl.toFixed(2)}` },
    ],
  };
}

function detectOvertrading(trades: Trade[]): DeepInsight | null {
  const days: Record<string, Trade[]> = {};
  trades.forEach(t => { (days[dayKey(t.date)] ||= []).push(t); });
  const dayList = Object.values(days);
  if (dayList.length < 3) return null;
  const overtradeDays = dayList.filter(arr => arr.length >= 4);
  if (!overtradeDays.length) return null;
  const otPnL = overtradeDays.reduce((s, arr) => s + arr.reduce((a, t) => a + t.pnl, 0), 0);
  const normalDays = dayList.filter(arr => arr.length < 4);
  const normalAvg = normalDays.length
    ? normalDays.reduce((s, arr) => s + arr.reduce((a, t) => a + t.pnl, 0), 0) / normalDays.length
    : 0;
  const otAvg = otPnL / overtradeDays.length;
  return {
    id: 'overtrading',
    icon: '⚡',
    title: 'דפוס מסחר יתר',
    finding: `${overtradeDays.length} ימים עם 4+ עסקאות. ממוצע יומי במסחר יתר: ${otAvg >= 0 ? '+' : ''}$${otAvg.toFixed(2)}.`,
    evidence: `ימים רגילים: ממוצע ${normalAvg >= 0 ? '+' : ''}$${normalAvg.toFixed(2)}. הפרש: ${(otAvg - normalAvg).toFixed(2)}$.`,
    action: 'הגדר תקרה של 3 עסקאות ביום. אם הגעת ל-3 — סגור פלטפורמה ל-2 שעות.',
    confidence: 0.8,
    severity: otAvg < normalAvg ? 'critical' : 'warning',
    category: 'behavioural',
    metric: [
      { label: 'ימי יתר', value: String(overtradeDays.length) },
      { label: 'ממוצע יתר', value: `$${otAvg.toFixed(2)}` },
      { label: 'ממוצע רגיל', value: `$${normalAvg.toFixed(2)}` },
    ],
  };
}

function detectRecoveryPattern(trades: Trade[]): DeepInsight | null {
  if (trades.length < 8) return null;
  // After a 2+ loss streak, what happens?
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
    id: 'recovery',
    icon: '🌅',
    title: 'דפוס התאוששות',
    finding: `אחרי רצף הפסדים, ${recRate.toFixed(0)}% מהמקרים אתה מתאושש מיד.`,
    evidence: `נמדדו ${streakEnds} סיומי רצף, ${recovered} התאוששויות, ${deepened} העמקות.`,
    action: recRate >= 60
      ? 'יש לך עמידות מנטלית טובה. שמור על מתודיקה — אל תגדיל סיכון בהתאוששות.'
      : 'הוסף הפסקה חובה של 30 דק\' אחרי 2 הפסדים רצופים. סבירות גבוהה להעמיק את הנפילה.',
    confidence: Math.min(0.8, 0.5 + streakEnds * 0.06),
    severity: recRate >= 60 ? 'strength' : 'warning',
    category: 'behavioural',
    metric: [
      { label: 'שיעור התאוששות', value: `${recRate.toFixed(0)}%` },
      { label: 'מקרים', value: String(streakEnds) },
    ],
  };
}

function detectMomentum(trades: Trade[]): DeepInsight | null {
  if (trades.length < 10) return null;
  const recent = trades.slice(-5);
  const earlier = trades.slice(-10, -5);
  const recentExp = mean(recent.map(t => t.returnR));
  const earlierExp = mean(earlier.map(t => t.returnR));
  const delta = recentExp - earlierExp;
  if (Math.abs(delta) < 0.3) return null;
  const up = delta > 0;
  return {
    id: 'momentum',
    icon: up ? '🚀' : '📉',
    title: up ? 'מומנטום עולה' : 'מומנטום יורד',
    finding: up
      ? `5 עסקאות אחרונות (${recentExp.toFixed(2)}R) חזקות משמעותית מ-5 לפניהן (${earlierExp.toFixed(2)}R).`
      : `5 עסקאות אחרונות (${recentExp.toFixed(2)}R) חלשות משמעותית מ-5 לפניהן (${earlierExp.toFixed(2)}R).`,
    evidence: `הפרש תוחלת: ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}R לעסקה.`,
    action: up
      ? 'אתה ב-Flow. אל תפר את הריטואל — אותו גודל, אותם זמנים, אותם סטאפים.'
      : 'הקטן סיכון ב-50% עד שתחזיר 3 ניצחונות רצופים, או צא להפסקה של יום.',
    confidence: 0.75,
    severity: up ? 'strength' : 'warning',
    category: 'statistical',
    metric: [
      { label: 'אחרונות', value: `${recentExp.toFixed(2)}R` },
      { label: 'קודמות', value: `${earlierExp.toFixed(2)}R` },
    ],
  };
}

function detectInconsistentReturns(trades: Trade[]): DeepInsight | null {
  if (trades.length < 8) return null;
  const wins = trades.filter(t => t.winLoss === 'Win');
  if (wins.length < 4) return null;
  const winRs = wins.map(t => t.returnR);
  const m = mean(winRs);
  const s = std(winRs);
  const cv = m > 0 ? (s / m) * 100 : 0;
  if (cv < 60) return null;
  return {
    id: 'inconsistent-wins',
    icon: '🌪️',
    title: 'חוסר עקביות ברווחים',
    finding: `הניצחונות שלך מאוד לא עקביים — מקדם השונות הוא ${cv.toFixed(0)}%.`,
    evidence: `ממוצע רווח: ${m.toFixed(2)}R, סטיית תקן: ${s.toFixed(2)}R. CV>60% מסמן תוצאות אקראיות.`,
    action: 'בדוק האם אתה מחזיק עסקאות טוב מדי זמן רב או מוקדם מדי. הגדר יעדי R קבועים.',
    confidence: 0.7,
    severity: 'insight',
    category: 'statistical',
    metric: [
      { label: 'CV', value: `${cv.toFixed(0)}%` },
      { label: 'σ', value: `${s.toFixed(2)}R` },
    ],
  };
}

function detectRiskInconsistency(trades: Trade[]): DeepInsight | null {
  if (trades.length < 5) return null;
  const risks = trades.map(t => t.risk).filter(r => r > 0);
  if (risks.length < 5) return null;
  const m = mean(risks);
  const s = std(risks);
  const cv = m > 0 ? (s / m) * 100 : 0;
  if (cv < 50) return null;
  return {
    id: 'risk-inconsistency',
    icon: '🎲',
    title: 'חוסר עקביות בסיכון',
    finding: `הסיכון שלך משתנה משמעותית בין עסקאות (CV=${cv.toFixed(0)}%).`,
    evidence: `סיכון ממוצע: $${m.toFixed(2)}, סטיית תקן: $${s.toFixed(2)}. עקביות נמוכה פוגעת בתוחלת לטווח ארוך.`,
    action: 'קבע סיכון קבוע (כגון 1% מההון) לכל עסקה. שינוי בגודל = שינוי בתוחלת.',
    confidence: 0.8,
    severity: 'warning',
    category: 'risk',
    metric: [
      { label: 'CV סיכון', value: `${cv.toFixed(0)}%` },
      { label: 'ממוצע', value: `$${m.toFixed(2)}` },
    ],
  };
}

function detectFridayEffect(trades: Trade[]): DeepInsight | null {
  if (trades.length < 10) return null;
  const fri = trades.filter(t => dowOf(t.date) === 5);
  if (fri.length < 3) return null;
  const friExp = mean(fri.map(t => t.returnR));
  const restExp = mean(trades.filter(t => dowOf(t.date) !== 5).map(t => t.returnR));
  const diff = friExp - restExp;
  if (Math.abs(diff) < 0.3) return null;
  return {
    id: 'friday-effect',
    icon: '🌴',
    title: diff > 0 ? 'אפקט יום שישי חיובי' : 'אפקט יום שישי שלילי',
    finding: diff > 0
      ? `ימי שישי שלך טובים במיוחד — ${friExp.toFixed(2)}R לעומת ${restExp.toFixed(2)}R בשאר השבוע.`
      : `ימי שישי גרועים — ${friExp.toFixed(2)}R מול ${restExp.toFixed(2)}R בשאר. אולי עייפות סוף שבוע.`,
    evidence: `${fri.length} עסקאות בימי שישי. הפרש משמעותי של ${Math.abs(diff).toFixed(2)}R.`,
    action: diff > 0
      ? 'נצל את העובדה — הקצה זמן רב יותר לימי שישי.'
      : 'שקול להפסיק מסחר ביום שישי או להוריד סיכון ב-50%.',
    confidence: 0.7,
    severity: diff > 0 ? 'strength' : 'warning',
    category: 'timing',
    metric: [
      { label: 'שישי', value: `${friExp.toFixed(2)}R` },
      { label: 'שאר', value: `${restExp.toFixed(2)}R` },
    ],
  };
}

/* ──────────────────────────────────────────────────────────────── */
/* MAIN API                                                         */
/* ──────────────────────────────────────────────────────────────── */

export function analyzeDeep(trades: Trade[]): DeepAnalysis {
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
    .map(fn => fn(trades))
    .filter((x): x is DeepInsight => x !== null)
    // sort: critical → warning → strength → insight, then by confidence
    .sort((a, b) => {
      const order: Record<DeepSeverity, number> = { critical: 0, warning: 1, strength: 2, insight: 3 };
      const so = order[a.severity] - order[b.severity];
      return so !== 0 ? so : b.confidence - a.confidence;
    });

  // span
  let spanDays = 0;
  if (trades.length > 1) {
    try {
      const first = new Date(trades[0].date.replace(' ', 'T')).getTime();
      const last = new Date(trades[trades.length - 1].date.replace(' ', 'T')).getTime();
      spanDays = Math.max(1, Math.round((last - first) / 86400000));
    } catch { /* ignore */ }
  }

  return {
    insights,
    dna,
    meta: {
      sampleSize: trades.length,
      spanDays,
      confidenceFloor: trades.length < 10 ? 0.4 : trades.length < 25 ? 0.55 : 0.7,
    },
  };
}
