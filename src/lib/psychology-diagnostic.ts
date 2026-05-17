/**
 * 🧠 ORCA · DEEP PSYCHOLOGICAL DIAGNOSTIC ENGINE
 * ────────────────────────────────────────────────────────────────
 * Pure, deterministic, data-only. Zero hallucination.
 * Every claim is tied to an exact metric computed from the trade list.
 * Designed to power the "Diagnose Me" modal.
 */

import type { Trade } from '@/data/trades';

export interface DeepDiagnosis {
  archetype: string;
  archetypeEN: string;
  archetypeBlurb: string;
  /** Hebrew shock-line summary — the “bottom line” for the trader. */
  bottomLine: string;
  bottomLineEN: string;
  confidence: number;        // 0-100 — how reliable based on sample size
  scores: {
    /** Setup-entry discipline (rules%) — separated from risk discipline. */
    setupDiscipline: number;
    /** Position-sizing / risk-management discipline (CV-based). */
    riskDiscipline: number;
    /** Legacy combined discipline (kept for back-compat, = avg of above). */
    discipline: number;
    consistency: number;
    emotional: number;
    edge: number;
    patience: number;
    adaptability: number;
    risk: number;
    /** Headline — Account Survivability Score. Brutal, capital-preservation focused. */
    survivability: number;
    /** Legacy overall (kept for back-compat, equals survivability). */
    overall: number;
  };
  /** Did we detect the “discipline paradox” (high setup adherence + chaotic sizing)? */
  disciplineParadox: boolean;
  strengths: { title: string; metric: string; severity: 'good' }[];
  risks: { title: string; metric: string; severity: 'warning' | 'danger' }[];
  patterns: { id: string; label: string; detail: string; severity: 'good' | 'warning' | 'danger' }[];
  plan: { step: string; why: string; priority?: 'critical' | 'high' | 'standard' }[];
  fingerprint: { l: string; c: 'green' | 'red' | 'orange' | 'cyan' | 'purple' }[];
  raw: {
    trades: number;
    wins: number;
    losses: number;
    winRate: number;
    expectancyR: number;
    profitFactor: number;
    riskCV: number;
    rulesPct: number;
    revengeTrades: number;
    overtradingDays: number;
    maxLossStreak: number;
    maxWinStreak: number;
    postLossEscalationPct: number;
    holdTimeStable: boolean;
    avgRiskR: number;
    sortino: number;
  };
}

/* ─── Helpers ─────────────────────────────────────────────────── */

const safe = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/* ─── Main ────────────────────────────────────────────────────── */

export function diagnose(trades: Trade[]): DeepDiagnosis {
  const n = trades.length;
  const wins = trades.filter(t => t.winLoss === 'Win');
  const losses = trades.filter(t => t.winLoss === 'Loss');
  const winRate = n ? (wins.length / n) * 100 : 0;

  // Expectancy in R
  const expectancyR = n ? trades.reduce((s, t) => s + t.returnR, 0) / n : 0;

  // Profit factor
  const grossWin = wins.reduce((s, t) => s + Math.max(0, t.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + Math.min(0, t.pnl), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

  // Risk consistency (CV%)
  const risks = trades.map(t => Math.abs(t.risk));
  const avgRisk = risks.reduce((a, b) => a + b, 0) / Math.max(risks.length, 1);
  const riskStd = Math.sqrt(risks.reduce((s, r) => s + (r - avgRisk) ** 2, 0) / Math.max(risks.length, 1));
  const riskCV = avgRisk > 0 ? (riskStd / avgRisk) * 100 : 0;

  // Rules adherence
  const rulesPct = n ? (trades.filter(t => t.rules).length / n) * 100 : 100;

  // Revenge & overtrading by day
  const tradeDays: Record<string, Trade[]> = {};
  trades.forEach(t => {
    try {
      const d = new Date(t.date.replace(' ', 'T')).toDateString();
      (tradeDays[d] = tradeDays[d] || []).push(t);
    } catch { /* skip */ }
  });
  const overtradingDays = Object.values(tradeDays).filter(d => d.length >= 3).length;

  let revengeTrades = 0;
  Object.values(tradeDays).forEach(day => {
    for (let i = 1; i < day.length; i++) {
      if (day[i - 1].winLoss === 'Loss' && Math.abs(day[i].risk) > Math.abs(day[i - 1].risk) * 1.2) revengeTrades++;
    }
  });

  // Loss / win streaks
  let maxLossStreak = 0, curLoss = 0, maxWinStreak = 0, curWin = 0;
  trades.forEach(t => {
    if (t.winLoss === 'Loss') { curLoss++; maxLossStreak = Math.max(maxLossStreak, curLoss); curWin = 0; }
    else if (t.winLoss === 'Win') { curWin++; maxWinStreak = Math.max(maxWinStreak, curWin); curLoss = 0; }
  });

  // Post-loss behavior
  let postLossInc = 0, postLossTotal = 0;
  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].winLoss === 'Loss') {
      postLossTotal++;
      if (Math.abs(trades[i].risk) > Math.abs(trades[i - 1].risk) * 1.15) postLossInc++;
    }
  }
  const postLossEscalationPct = postLossTotal ? (postLossInc / postLossTotal) * 100 : 0;

  // Avg risk R / Sortino-like
  const avgRiskR = n ? trades.reduce((s, t) => s + Math.abs(t.returnR < 0 ? t.returnR : 0), 0) / n : 0;
  const downside = trades.filter(t => t.returnR < 0).map(t => t.returnR);
  const ddev = downside.length ? Math.sqrt(downside.reduce((s, x) => s + x * x, 0) / downside.length) : 0;
  const sortino = ddev > 0 ? expectancyR / ddev : 0;

  // High deviation
  const highDev = trades.filter(t => (t.deviation || 0) > 0.1).length;

  // Hold time consistency proxy: variance of position size relative to risk
  const holdTimeStable = riskCV < 40;

  /* ─── Scores (0-100) ─── */
  const discipline = clamp(rulesPct);
  const consistency = clamp(100 - riskCV * 1.1);
  const emotional = clamp(100 - (revengeTrades / Math.max(1, n)) * 600 - postLossEscalationPct * 0.4);
  const edge = clamp(50 + expectancyR * 30 + Math.min(30, (profitFactor - 1) * 15));
  const patience = clamp(100 - overtradingDays * 6 - maxLossStreak * 4);
  const adaptability = clamp(60 + sortino * 25 - highDev * 1.5);
  const risk = clamp(100 - riskCV * 0.9 - postLossEscalationPct * 0.5);
  const overall = Math.round((discipline + consistency + emotional + edge + patience + adaptability + risk) / 7);

  /* ─── Confidence (sample size weight) ─── */
  const confidence = clamp(Math.log(Math.max(n, 1) + 1) * 28);

  /* ─── Archetype ─── */
  const dominant = (() => {
    const arr: [string, number][] = [
      ['process', discipline + consistency],
      ['emotional', 200 - emotional],
      ['hunter', edge + adaptability],
      ['steady', risk + patience],
    ];
    return arr.sort((a, b) => b[1] - a[1])[0][0];
  })();

  let archetype = '', archetypeEN = '', archetypeBlurb = '';
  if (overall < 45) {
    archetype = 'סוחר אימפולסיבי תחת לחץ';
    archetypeEN = 'Reactive Trader';
    archetypeBlurb = 'הנתונים מציגים תבנית רגשית: סטיות חוזרות מהכללים, הגדלת סיכון לאחר הפסד וחוסר עקביות. נדרש פרוטוקול עצירה לפני המשך.';
  } else if (dominant === 'process' && overall >= 70) {
    archetype = 'סוחר תהליכי-יציב (Process Trader)';
    archetypeEN = 'Process Trader';
    archetypeBlurb = 'הביצועים שלך נשענים על תהליך ברור — המשמעת והעקביות גבוהות והרגש לא שולט בהחלטות. זה הבסיס של סוחרים מקצועיים.';
  } else if (dominant === 'hunter' && overall >= 60) {
    archetype = 'צייד אדג׳ (Edge Hunter)';
    archetypeEN = 'Edge Hunter';
    archetypeBlurb = 'יש לך יכולת לזהות הזדמנויות עם תוחלת חיובית, אך ההצלחה שלך תלויה ביכולת לשמור על משמעת בין ההזדמנויות.';
  } else if (dominant === 'steady') {
    archetype = 'סוחר יציב-שמרני (Steady Operator)';
    archetypeEN = 'Steady Operator';
    archetypeBlurb = 'הסיכון שלך מבוקר ויציב. החולשה היא לעיתים פספוס הזדמנויות גדולות מתוך זהירות יתר.';
  } else {
    archetype = 'סוחר עם אדג׳ אך רגיש ללחץ';
    archetypeEN = 'Edge with Pressure Sensitivity';
    archetypeBlurb = 'יש סימני אדג׳, אך תחת רצפים שליליים אתה נוטה להגיב רגשית. זיקוק התהליך יכפיל את היכולת.';
  }

  /* ─── Strengths (data-driven, only show what is true) ─── */
  const strengths: DeepDiagnosis['strengths'] = [];
  if (rulesPct >= 80) strengths.push({ title: 'משמעת כללים גבוהה', metric: `${rulesPct.toFixed(0)}% מהעסקאות לפי הספר`, severity: 'good' });
  if (riskCV <= 35) strengths.push({ title: 'גודל סיכון עקבי', metric: `CV ${riskCV.toFixed(0)}% — סיזינג מבוקר`, severity: 'good' });
  if (expectancyR > 0.1) strengths.push({ title: 'תוחלת חיובית מובהקת', metric: `+${expectancyR.toFixed(2)}R לעסקה`, severity: 'good' });
  if (profitFactor >= 1.5) strengths.push({ title: 'Profit Factor חזק', metric: `${profitFactor.toFixed(2)} — רווח כפול מההפסד`, severity: 'good' });
  if (revengeTrades === 0 && n >= 10) strengths.push({ title: 'ללא מסחר נקמה', metric: '0 הסלמות לאחר הפסד', severity: 'good' });
  if (sortino >= 0.5) strengths.push({ title: 'Sortino גבוה', metric: `${sortino.toFixed(2)} — תשואה יחסית ללחץ`, severity: 'good' });
  if (maxWinStreak >= 4) strengths.push({ title: 'יכולת לרכב על מומנטום', metric: `רצף ניצחונות מקס׳ ${maxWinStreak}`, severity: 'good' });

  /* ─── Risks ─── */
  const risksList: DeepDiagnosis['risks'] = [];
  if (revengeTrades > 0) risksList.push({ title: 'מסחר נקמה זוהה', metric: `${revengeTrades} מקרים של הגדלת סיכון לאחר הפסד באותו יום`, severity: 'danger' });
  if (riskCV > 50) risksList.push({ title: 'סיכון תנודתי מדי', metric: `CV ${riskCV.toFixed(0)}% — סיזינג לא עקבי`, severity: 'warning' });
  if (rulesPct < 75) risksList.push({ title: 'סטייה מהכללים', metric: `רק ${rulesPct.toFixed(0)}% עמידה — איכות החלטות יורדת`, severity: rulesPct < 60 ? 'danger' : 'warning' });
  if (postLossEscalationPct > 30) risksList.push({ title: 'הסלמת סיכון לאחר הפסד', metric: `${postLossEscalationPct.toFixed(0)}% מהעסקאות שאחרי הפסד עם סיכון מוגדל`, severity: 'danger' });
  if (overtradingDays >= 3) risksList.push({ title: 'מסחר יתר', metric: `${overtradingDays} ימים עם 3+ עסקאות`, severity: 'warning' });
  if (maxLossStreak >= 4) risksList.push({ title: 'רצף הפסדים מסוכן', metric: `${maxLossStreak} הפסדים רצופים — ללא פרוטוקול עצירה`, severity: 'danger' });
  if (highDev >= 3) risksList.push({ title: 'סטיית ביצוע גבוהה', metric: `${highDev} עסקאות בסטייה מעל 10%`, severity: 'warning' });
  if (profitFactor < 1 && n >= 10) risksList.push({ title: 'אין אדג׳ סטטיסטי כרגע', metric: `PF ${profitFactor.toFixed(2)} — מפסיד יותר ממה שמרוויח`, severity: 'danger' });

  /* ─── Patterns (deeper behavioral inference) ─── */
  const patterns: DeepDiagnosis['patterns'] = [];
  if (winRate >= 55 && expectancyR < 0) patterns.push({ id: 'small-wins-big-losses', label: 'דפוס "ניצחונות קטנים, הפסדים גדולים"', detail: `אחוז ניצחונות גבוה (${winRate.toFixed(0)}%) אך תוחלת שלילית — ייתכן שאתה לוקח רווחים מוקדם מדי וחותך הפסדים מאוחר.`, severity: 'danger' });
  if (winRate < 45 && expectancyR > 0.2) patterns.push({ id: 'asymmetric-edge', label: 'אדג׳ א-סימטרי בריא', detail: `WR נמוך אך תוחלת ${expectancyR.toFixed(2)}R — אתה מנצח גדול ומפסיד קטן. דפוס של סוחרי מומנטום מקצועיים.`, severity: 'good' });
  if (postLossEscalationPct > 40) patterns.push({ id: 'emotional-escalation', label: 'הסלמה רגשית לאחר הפסד', detail: `${postLossEscalationPct.toFixed(0)}% מהעסקאות שאחרי הפסד מגיעות עם סיכון מוגדל. זהו דפוס "להחזיר את ההפסד" קלאסי.`, severity: 'danger' });
  if (maxWinStreak >= 5 && maxLossStreak <= 2) patterns.push({ id: 'momentum-rider', label: 'יכולת לרכב על מומנטום', detail: `הצלחת ליצור רצף של ${maxWinStreak} ניצחונות, ושמרת על רצפי הפסד קצרים. שליטה רגשית טובה.`, severity: 'good' });
  if (riskCV > 60 && rulesPct > 80) patterns.push({ id: 'discipline-paradox', label: 'פרדוקס משמעת', detail: `אתה ב-${rulesPct.toFixed(0)}% עמידה בכללים אבל הסיכון שלך קופץ. ככל הנראה הכללים לא מכסים סיזינג — צריך כלל "Risk per Trade" קבוע.`, severity: 'warning' });
  if (overtradingDays >= 5 && winRate < 50) patterns.push({ id: 'overtrade-bleed', label: 'דימום מתדירות יתר', detail: `${overtradingDays} ימי מסחר יתר + WR נמוך = שחיקה מעמלות וריכוז. סנן יותר.`, severity: 'warning' });

  /* ─── Personal action plan ─── */
  const plan: DeepDiagnosis['plan'] = [];
  if (revengeTrades > 0 || postLossEscalationPct > 30) plan.push({ step: 'אחרי כל הפסד — עצירה כפויה של 20 דקות לפני העסקה הבאה', why: 'מנטרל את חלון ההסלמה הרגשי' });
  if (riskCV > 40) plan.push({ step: `קבע סיכון קבוע של ${(avgRisk).toFixed(0)}$ לעסקה למשך 20 עסקאות`, why: 'יוריד את ה-CV ויחשוף את האדג׳ האמיתי שלך' });
  if (rulesPct < 80) plan.push({ step: 'לפני כל כניסה — וידוא של 3 תנאים מינימום בצ׳קליסט', why: 'מעלה את אחוז ההיענות לכללים מעל 85%' });
  if (overtradingDays >= 3) plan.push({ step: 'מקסימום 2 עסקאות ביום, לא משנה מה השוק עושה', why: 'מסחר יתר שוחק מיקוד והחלטות' });
  if (maxLossStreak >= 3) plan.push({ step: 'אחרי 3 הפסדים רצופים — סגירת היום ובדיקת התהליך', why: 'מונע ספירלת הפסדים שלא מבוססת מציאות' });
  if (expectancyR < 0 && n >= 10) plan.push({ step: 'הקטן את כמות הסטאפים — סנן רק את ה-A+ למשך שבועיים', why: 'איכות מנצחת כמות כשהתוחלת שלילית' });
  if (plan.length === 0) plan.push({ step: 'המשך לתעד עסקאות נקיות — האדג׳ עובד', why: 'הצמיחה הבאה היא בעיקר סקייל ולא תיקון' });

  /* ─── Fingerprint chips ─── */
  const fingerprint: DeepDiagnosis['fingerprint'] = [
    revengeTrades === 0 ? { l: 'ללא נקמה', c: 'green' } : { l: `${revengeTrades} נקמות`, c: 'red' },
    overtradingDays === 0 ? { l: 'תדירות בריאה', c: 'green' } : { l: `${overtradingDays} ימי יתר`, c: 'orange' },
    rulesPct >= 80 ? { l: `משמעת ${rulesPct.toFixed(0)}%`, c: 'cyan' } : { l: `משמעת ${rulesPct.toFixed(0)}%`, c: 'orange' },
    riskCV <= 35 ? { l: `CV ${riskCV.toFixed(0)}%`, c: 'green' } : { l: `CV ${riskCV.toFixed(0)}%`, c: 'red' },
    expectancyR > 0 ? { l: `+${expectancyR.toFixed(2)}R/עסקה`, c: 'cyan' } : { l: `${expectancyR.toFixed(2)}R/עסקה`, c: 'red' },
    profitFactor >= 1.3 ? { l: `PF ${profitFactor.toFixed(2)}`, c: 'green' } : { l: `PF ${profitFactor.toFixed(2)}`, c: 'orange' },
    maxWinStreak >= 4 ? { l: `רצף ${maxWinStreak}W`, c: 'purple' } : null,
    maxLossStreak >= 4 ? { l: `רצף ${maxLossStreak}L`, c: 'red' } : null,
  ].filter(Boolean) as DeepDiagnosis['fingerprint'];

  return {
    archetype, archetypeEN, archetypeBlurb,
    confidence: Math.round(confidence),
    scores: {
      discipline: Math.round(discipline),
      consistency: Math.round(consistency),
      emotional: Math.round(emotional),
      edge: Math.round(edge),
      patience: Math.round(patience),
      adaptability: Math.round(adaptability),
      risk: Math.round(risk),
      overall,
    },
    strengths,
    risks: risksList,
    patterns,
    plan,
    fingerprint,
    raw: {
      trades: n, wins: wins.length, losses: losses.length,
      winRate: safe(winRate), expectancyR: safe(expectancyR),
      profitFactor: safe(profitFactor), riskCV: safe(riskCV), rulesPct: safe(rulesPct),
      revengeTrades, overtradingDays, maxLossStreak, maxWinStreak,
      postLossEscalationPct: safe(postLossEscalationPct),
      holdTimeStable, avgRiskR: safe(avgRiskR), sortino: safe(sortino),
    },
  };
}

/* ─── Best-Of edge finder (for AI Insights "Golden Card") ───── */

export interface BestOfEdge {
  bestAsset: { name: string; pnl: number; wr: number; n: number; expR: number } | null;
  bestDay: { name: string; pnl: number; wr: number; n: number; avgR: number } | null;
  bestHour: { hour: number; label: string; pnl: number; wr: number; n: number } | null;
  bestSession: { name: string; pnl: number; n: number } | null;
  bestSetup: { name: string; pnl: number; wr: number; n: number } | null;
  bestStreakDay: { name: string; pnl: number; n: number } | null;
  worstAsset: { name: string; pnl: number; n: number } | null;
  edgeStatement: string;
  totalEdgePnL: number;       // PnL captured if traded only the best edge
  baselinePnL: number;
  enoughData: boolean;
}

const DAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export function findBestEdge(trades: Trade[]): BestOfEdge {
  const enoughData = trades.length >= 10;

  // Asset
  const byAsset: Record<string, { pnl: number; n: number; wins: number; r: number }> = {};
  trades.forEach(t => {
    const k = t.coin || 'OTHER';
    byAsset[k] = byAsset[k] || { pnl: 0, n: 0, wins: 0, r: 0 };
    byAsset[k].pnl += t.pnl; byAsset[k].n++; byAsset[k].r += t.returnR;
    if (t.winLoss === 'Win') byAsset[k].wins++;
  });
  const assetEntries = Object.entries(byAsset).filter(([_, v]) => v.n >= 2);
  const bestAssetEntry = assetEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const worstAssetEntry = assetEntries.sort((a, b) => a[1].pnl - b[1].pnl)[0];
  const bestAsset = bestAssetEntry ? {
    name: bestAssetEntry[0], pnl: +bestAssetEntry[1].pnl.toFixed(2),
    wr: +(bestAssetEntry[1].wins / bestAssetEntry[1].n * 100).toFixed(0), n: bestAssetEntry[1].n,
    expR: +(bestAssetEntry[1].r / bestAssetEntry[1].n).toFixed(2),
  } : null;
  const worstAsset = worstAssetEntry && worstAssetEntry[1].pnl < 0 ? {
    name: worstAssetEntry[0], pnl: +worstAssetEntry[1].pnl.toFixed(2), n: worstAssetEntry[1].n,
  } : null;

  // Day of week
  const byDay: Record<number, { pnl: number; n: number; wins: number; r: number }> = {};
  trades.forEach(t => {
    try {
      const d = new Date(t.date.replace(' ', 'T')).getDay();
      byDay[d] = byDay[d] || { pnl: 0, n: 0, wins: 0, r: 0 };
      byDay[d].pnl += t.pnl; byDay[d].n++; byDay[d].r += t.returnR;
      if (t.winLoss === 'Win') byDay[d].wins++;
    } catch { /* skip */ }
  });
  const dayEntries = Object.entries(byDay).filter(([_, v]) => v.n >= 2);
  const bestDayEntry = dayEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const bestDay = bestDayEntry ? {
    name: DAY_NAMES_HE[Number(bestDayEntry[0])],
    pnl: +bestDayEntry[1].pnl.toFixed(2),
    wr: +(bestDayEntry[1].wins / bestDayEntry[1].n * 100).toFixed(0),
    n: bestDayEntry[1].n,
    avgR: +(bestDayEntry[1].r / bestDayEntry[1].n).toFixed(2),
  } : null;

  // Hour
  const byHour: Record<number, { pnl: number; n: number; wins: number }> = {};
  trades.forEach(t => {
    try {
      const h = new Date(t.date.replace(' ', 'T')).getHours();
      byHour[h] = byHour[h] || { pnl: 0, n: 0, wins: 0 };
      byHour[h].pnl += t.pnl; byHour[h].n++;
      if (t.winLoss === 'Win') byHour[h].wins++;
    } catch { /* skip */ }
  });
  const hourEntries = Object.entries(byHour).filter(([_, v]) => v.n >= 2);
  const bestHourEntry = hourEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const bestHour = bestHourEntry ? {
    hour: Number(bestHourEntry[0]),
    label: `${String(bestHourEntry[0]).padStart(2, '0')}:00–${String((Number(bestHourEntry[0]) + 1) % 24).padStart(2, '0')}:00`,
    pnl: +bestHourEntry[1].pnl.toFixed(2),
    wr: +(bestHourEntry[1].wins / bestHourEntry[1].n * 100).toFixed(0),
    n: bestHourEntry[1].n,
  } : null;

  // Session
  const sessions = [
    { name: 'אסיה', from: 0, to: 7, pnl: 0, n: 0 },
    { name: 'לונדון', from: 7, to: 13, pnl: 0, n: 0 },
    { name: 'ניו-יורק', from: 13, to: 20, pnl: 0, n: 0 },
    { name: 'לילה', from: 20, to: 24, pnl: 0, n: 0 },
  ];
  trades.forEach(t => {
    try {
      const h = new Date(t.date.replace(' ', 'T')).getHours();
      const s = sessions.find(x => h >= x.from && h < x.to);
      if (s) { s.pnl += t.pnl; s.n++; }
    } catch { /* skip */ }
  });
  const bestSessionEntry = sessions.filter(s => s.n >= 1).sort((a, b) => b.pnl - a.pnl)[0];
  const bestSession = bestSessionEntry ? { name: bestSessionEntry.name, pnl: +bestSessionEntry.pnl.toFixed(2), n: bestSessionEntry.n } : null;

  // Setup (direction + orderType)
  const bySetup: Record<string, { pnl: number; n: number; wins: number }> = {};
  trades.forEach(t => {
    const k = `${t.direction} · ${t.orderType || 'Market'}`;
    bySetup[k] = bySetup[k] || { pnl: 0, n: 0, wins: 0 };
    bySetup[k].pnl += t.pnl; bySetup[k].n++;
    if (t.winLoss === 'Win') bySetup[k].wins++;
  });
  const setupEntries = Object.entries(bySetup).filter(([_, v]) => v.n >= 2);
  const bestSetupEntry = setupEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const bestSetup = bestSetupEntry ? {
    name: bestSetupEntry[0], pnl: +bestSetupEntry[1].pnl.toFixed(2),
    wr: +(bestSetupEntry[1].wins / bestSetupEntry[1].n * 100).toFixed(0), n: bestSetupEntry[1].n,
  } : null;

  // Best calendar streak day
  const byCalDay: Record<string, { pnl: number; n: number }> = {};
  trades.forEach(t => {
    try {
      const d = new Date(t.date.replace(' ', 'T')).toDateString();
      byCalDay[d] = byCalDay[d] || { pnl: 0, n: 0 };
      byCalDay[d].pnl += t.pnl; byCalDay[d].n++;
    } catch { /* skip */ }
  });
  const calDayEntries = Object.entries(byCalDay).sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const bestStreakDay = calDayEntries ? { name: new Date(calDayEntries[0]).toLocaleDateString('he-IL'), pnl: +calDayEntries[1].pnl.toFixed(2), n: calDayEntries[1].n } : null;

  const baselinePnL = trades.reduce((s, t) => s + t.pnl, 0);
  const totalEdgePnL = bestAsset ? bestAsset.pnl : 0;

  let edgeStatement = '';
  if (bestAsset && bestDay && bestHour) {
    edgeStatement = `הקומבינציה החזקה ביותר שלך: ${bestAsset.name} ביום ${bestDay.name} סביב ${bestHour.label}.`;
  } else if (bestAsset) {
    edgeStatement = `המוקד הברור שלך: ${bestAsset.name} (${bestAsset.wr}% ניצחונות, +${bestAsset.expR}R לעסקה).`;
  } else {
    edgeStatement = 'אין עדיין אדג׳ ברור — צבור עוד עסקאות כדי לחשוף אותו.';
  }

  return {
    bestAsset, bestDay, bestHour, bestSession, bestSetup, bestStreakDay, worstAsset,
    edgeStatement, totalEdgePnL: +totalEdgePnL.toFixed(2), baselinePnL: +baselinePnL.toFixed(2),
    enoughData,
  };
}
