import { getEffectiveR } from "@/lib/r-multiple";
/**
 * 🧠 ORCA · DEEP PSYCHOLOGICAL DIAGNOSTIC ENGINE
 * ────────────────────────────────────────────────────────────────
 * Pure, deterministic, data-only. Zero hallucination.
 * Every claim is tied to an exact metric computed from the trade list.
 *
 * Fully bilingual (he/en) and unit-aware ($/R) — caller passes opts.
 */

import type { Trade } from '@/data/trades';

export type DiagLang = 'he' | 'en';
export interface DiagOpts {
  lang?: DiagLang;
  /** true → values are expressed in money ($), false → R-multiples */
  isMoney?: boolean;
}

export interface DeepDiagnosis {
  /** Localized to opts.lang (defaults he). */
  archetype: string;
  /** Always the English label (for chip / subtitle). */
  archetypeEN: string;
  archetypeBlurb: string;
  /** Localized one-line shock summary. */
  bottomLine: string;
  /** English fallback (always populated, equals bottomLine when lang==='en'). */
  bottomLineEN: string;
  confidence: number;        // 0-100 — how reliable based on sample size
  scores: {
    setupDiscipline: number;
    riskDiscipline: number;
    discipline: number;
    consistency: number;
    emotional: number;
    edge: number;
    patience: number;
    adaptability: number;
    risk: number;
    survivability: number;
    overall: number;
  };
  disciplineParadox: boolean;
  /** Localized headline + supporting metric line for the paradox banner. */
  disciplineParadoxText?: { headline: string; body: string };
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
    avgPnl: number;
  };
}

/* ─── Helpers ─────────────────────────────────────────────────── */

const safe = (n: number, fallback = 0) => (Number.isFinite(n) ? n : fallback);
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/* ─── Main ────────────────────────────────────────────────────── */

export function diagnose(trades: Trade[], opts: DiagOpts = {}): DeepDiagnosis {
  const lang: DiagLang = opts.lang ?? 'he';
  const isMoney = !!opts.isMoney;
  const t = (he: string, en: string) => (lang === 'he' ? he : en);
  /** value formatter — money or R */
  const fmtVal = (n: number) => isMoney
    ? `${n >= 0 ? '+' : ''}$${n.toFixed(2)}`
    : `${n >= 0 ? '+' : ''}${n.toFixed(2)}R`;
  /** unit label, used inline ("/trade") */
  const perTrade = isMoney ? t('$/עסקה', '$/trade') : t('R/עסקה', 'R/trade');

  const n = trades.length;
  const wins = trades.filter(tr => tr.winLoss === 'Win');
  const losses = trades.filter(tr => tr.winLoss === 'Loss');
  const winRate = n ? (wins.length / n) * 100 : 0;

  const expectancyR = n ? trades.reduce((s, tr) => s + getEffectiveR(tr), 0) / n : 0;
  const avgPnl = n ? trades.reduce((s, tr) => s + tr.pnl, 0) / n : 0;
  /** Adaptive headline value — what we show when describing per-trade expectancy. */
  const headlineExp = isMoney ? avgPnl : expectancyR;

  const grossWin = wins.reduce((s, tr) => s + Math.max(0, tr.pnl), 0);
  const grossLoss = Math.abs(losses.reduce((s, tr) => s + Math.min(0, tr.pnl), 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

  const risks = trades.map(tr => Math.abs(tr.risk));
  const avgRisk = risks.reduce((a, b) => a + b, 0) / Math.max(risks.length, 1);
  const riskStd = Math.sqrt(risks.reduce((s, r) => s + (r - avgRisk) ** 2, 0) / Math.max(risks.length, 1));
  const riskCV = avgRisk > 0 ? (riskStd / avgRisk) * 100 : 0;

  const rulesPct = n ? (trades.filter(tr => tr.rules).length / n) * 100 : 100;

  const tradeDays: Record<string, Trade[]> = {};
  trades.forEach(tr => {
    try {
      const d = new Date(tr.date.replace(' ', 'T')).toDateString();
      (tradeDays[d] = tradeDays[d] || []).push(tr);
    } catch { /* skip */ }
  });
  const overtradingDays = Object.values(tradeDays).filter(d => d.length >= 3).length;

  let revengeTrades = 0;
  Object.values(tradeDays).forEach(day => {
    for (let i = 1; i < day.length; i++) {
      if (day[i - 1].winLoss === 'Loss' && Math.abs(day[i].risk) > Math.abs(day[i - 1].risk) * 1.2) revengeTrades++;
    }
  });

  let maxLossStreak = 0, curLoss = 0, maxWinStreak = 0, curWin = 0;
  trades.forEach(tr => {
    if (tr.winLoss === 'Loss') { curLoss++; maxLossStreak = Math.max(maxLossStreak, curLoss); curWin = 0; }
    else if (tr.winLoss === 'Win') { curWin++; maxWinStreak = Math.max(maxWinStreak, curWin); curLoss = 0; }
  });

  let postLossInc = 0, postLossTotal = 0;
  for (let i = 1; i < trades.length; i++) {
    if (trades[i - 1].winLoss === 'Loss') {
      postLossTotal++;
      if (Math.abs(trades[i].risk) > Math.abs(trades[i - 1].risk) * 1.15) postLossInc++;
    }
  }
  const postLossEscalationPct = postLossTotal ? (postLossInc / postLossTotal) * 100 : 0;

  const avgRiskR = n ? trades.reduce((s, tr) => s + Math.abs(getEffectiveR(tr) < 0 ? getEffectiveR(tr) : 0), 0) / n : 0;
  const downside = trades.filter(tr => getEffectiveR(tr) < 0).map(tr => getEffectiveR(tr));
  const ddev = downside.length ? Math.sqrt(downside.reduce((s, x) => s + x * x, 0) / downside.length) : 0;
  const sortino = ddev > 0 ? expectancyR / ddev : 0;

  const highDev = trades.filter(tr => (tr.deviation || 0) > 0.1).length;
  const holdTimeStable = riskCV < 40;

  /* ─── Scores (0-100) ─── */
  const setupDiscipline = clamp(rulesPct);
  const riskDiscipline = clamp(100 - riskCV * 1.1 - postLossEscalationPct * 0.5 - revengeTrades * 8);
  const discipline = Math.round((setupDiscipline + riskDiscipline) / 2);
  const consistency = clamp(100 - riskCV * 1.1);
  const emotional = clamp(100 - (revengeTrades / Math.max(1, n)) * 600 - postLossEscalationPct * 0.4);
  const edge = clamp(50 + expectancyR * 30 + Math.min(30, (profitFactor - 1) * 15));
  const patience = clamp(100 - overtradingDays * 6 - maxLossStreak * 4);
  const adaptability = clamp(60 + sortino * 25 - highDev * 1.5);
  const risk = clamp(100 - riskCV * 0.9 - postLossEscalationPct * 0.5);

  let survivability = 100;
  if (expectancyR < 0) survivability -= Math.min(45, Math.abs(expectancyR) * 120);
  if (profitFactor < 1) survivability -= Math.min(25, (1 - profitFactor) * 50);
  if (riskCV > 50) survivability -= Math.min(25, (riskCV - 50) * 0.35);
  if (revengeTrades > 0) survivability -= Math.min(15, revengeTrades * 4);
  if (postLossEscalationPct > 30) survivability -= Math.min(15, (postLossEscalationPct - 30) * 0.4);
  if (maxLossStreak >= 4) survivability -= Math.min(15, (maxLossStreak - 3) * 4);
  if (overtradingDays >= 3) survivability -= Math.min(10, (overtradingDays - 2) * 2);
  if (expectancyR > 0.1 && profitFactor >= 1.3 && riskCV < 40) survivability += 5;
  survivability = Math.round(clamp(survivability));
  const overall = survivability;

  const disciplineParadox = rulesPct >= 85 && (riskCV > 50 || revengeTrades > 0 || postLossEscalationPct > 30);
  const confidence = clamp(Math.log(Math.max(n, 1) + 1) * 28);

  /* ─── Archetype + Bottom Line ─── */
  const dominant = (() => {
    const arr: [string, number][] = [
      ['process', setupDiscipline + consistency],
      ['emotional', 200 - emotional],
      ['hunter', edge + adaptability],
      ['steady', risk + patience],
    ];
    return arr.sort((a, b) => b[1] - a[1])[0][0];
  })();

  let archetype = '', archetypeEN = '', archetypeBlurb = '';
  let bottomLine = '', bottomLineEN = '';

  if (survivability < 35) {
    archetypeEN = 'Reactive Trader';
    archetype = t('סוחר אימפולסיבי תחת לחץ', archetypeEN);
    archetypeBlurb = t(
      'הנתונים מציגים תבנית הרסנית של פיצוי פסיכולוגי: כניסות בסטאפים נכונים, אבל תגובה רגשית להפסדים דרך עיוות גודל הפוזיציה. החשבון בסיכון שחיקה גבוה.',
      'The data shows a destructive pattern of psychological compensation: clean entries, but emotional reactions to losses through position-size distortion. The account is at high attrition risk.'
    );
    bottomLineEN = `Your account is on an attrition path. ${isMoney ? `Avg ${fmtVal(avgPnl)}/trade` : `Expectancy ${expectancyR.toFixed(2)}R`}, sizing chaos ${riskCV.toFixed(0)}%, max loss streak ${maxLossStreak} — this is a pattern, not noise. Stop and execute the protocol.`;
    bottomLine = t(
      `החשבון שלך בנתיב שחיקה. ${isMoney ? `ממוצע ${fmtVal(avgPnl)} לעסקה` : `תוחלת ${expectancyR.toFixed(2)}R לעסקה`}, כאוס סיזינג ${riskCV.toFixed(0)}%, ורצף הפסדים מקסימלי של ${maxLossStreak} — זה לא רעש, זה דפוס. עצור עכשיו ובצע את הפרוטוקול.`,
      bottomLineEN,
    );
  } else if (survivability < 55) {
    archetypeEN = 'Fragile Edge Trader';
    archetype = t('סוחר עם אדג׳ שביר', archetypeEN);
    archetypeBlurb = t(
      'יש סימני יכולת אבל ההתנהגות תחת לחץ שוחקת את האדג׳. הסיזינג והתגובה הרגשית הם הצוואר הצר.',
      'Signs of ability, but pressure-driven behavior erodes the edge. Sizing and emotional reactions are the bottleneck.'
    );
    bottomLineEN = `You have a potential edge but you're dismantling it: ${riskCV.toFixed(0)}% sizing volatility and ${postLossEscalationPct.toFixed(0)}% post-loss escalation. Fix the behavior — the edge returns.`;
    bottomLine = t(
      `יש לך אדג׳ פוטנציאלי, אבל אתה מפרק אותו במו ידיך: סיזינג עם ${riskCV.toFixed(0)}% תנודתיות ו-${postLossEscalationPct.toFixed(0)}% הסלמה אחרי הפסד. תקן את ההתנהגות — האדג׳ יחזור.`,
      bottomLineEN,
    );
  } else if (dominant === 'process' && survivability >= 75) {
    archetypeEN = 'Process Trader';
    archetype = t('סוחר תהליכי-יציב', archetypeEN);
    archetypeBlurb = t(
      'הביצועים שלך נשענים על תהליך ברור — המשמעת והעקביות גבוהות והרגש לא שולט בהחלטות. הבסיס של סוחרים מקצועיים.',
      'Your performance rests on a clear process — high discipline and consistency, emotions kept out of decisions. The foundation of professional traders.'
    );
    bottomLineEN = `Your resilience is high. ${isMoney ? `Positive average ${fmtVal(avgPnl)}/trade` : 'Positive expectancy'}, controlled sizing, clear execution discipline. Scale is the next step.`;
    bottomLine = t(
      `החוסן שלך גבוה. ${isMoney ? `ממוצע חיובי של ${fmtVal(avgPnl)} לעסקה` : 'תוחלת חיובית'}, סיזינג מבוקר, ומשמעת הוצאה לפועל ברורה. כעת הסקייל הוא הצעד הבא.`,
      bottomLineEN,
    );
  } else if (dominant === 'hunter') {
    archetypeEN = 'Edge Hunter';
    archetype = t('צייד אדג׳', archetypeEN);
    archetypeBlurb = t(
      'אתה יודע לזהות הזדמנויות עם תוחלת חיובית. ההצלחה תלויה ביכולת לשמור על משמעת בין ההזדמנויות.',
      'You spot opportunities with positive expectancy. Success depends on maintaining discipline between them.'
    );
    bottomLineEN = `You have a statistical edge. Survival depends on not trading when there's no signal.`;
    bottomLine = t('יש לך אדג׳ סטטיסטי. ההישרדות תלויה בלבלום את הדחף לסחור כשאין סיגנל.', bottomLineEN);
  } else if (dominant === 'steady') {
    archetypeEN = 'Steady Operator';
    archetype = t('סוחר יציב-שמרני', archetypeEN);
    archetypeBlurb = t(
      'הסיכון מבוקר ויציב. החולשה היא לעיתים פספוס הזדמנויות גדולות מתוך זהירות יתר.',
      'Risk is controlled and stable. The weakness is occasionally missing big opportunities through over-caution.'
    );
    bottomLineEN = `You survive well, but miss upside. Next step: scale ${isMoney ? 'size' : 'R'} when an A+ setup appears.`;
    bottomLine = t(
      `אתה שורד היטב, אבל מפספס את ה-Upside. הצעד הבא הוא להגדיל ${isMoney ? 'גודל' : 'R'} כשהסטאפ A+ מופיע.`,
      bottomLineEN,
    );
  } else {
    archetypeEN = 'Edge with Pressure Sensitivity';
    archetype = t('סוחר עם אדג׳ ורגישות ללחץ', archetypeEN);
    archetypeBlurb = t(
      'יש סימני אדג׳, אך תחת רצפים שליליים אתה נוטה להגיב רגשית. זיקוק התהליך יכפיל את היכולת.',
      'Signs of edge, but under negative streaks you tend to react emotionally. Refining the process doubles the capability.'
    );
    bottomLineEN = `You're profitable at baseline but emotion drives sizing at pressure points. Neutralize the reaction — performance jumps.`;
    bottomLine = t(
      `אתה רווחי בסיס, אבל הרגש מנהל את הסיזינג בצמתי לחץ. נטרל את התגובה — הביצועים יקפצו.`,
      bottomLineEN,
    );
  }

  /* ─── Strengths ─── */
  const strengths: DeepDiagnosis['strengths'] = [];
  if (rulesPct >= 80 && !disciplineParadox) strengths.push({ title: t('משמעת כניסה גבוהה', 'High Entry Discipline'), metric: t(`${rulesPct.toFixed(0)}% מהעסקאות לפי הספר`, `${rulesPct.toFixed(0)}% of trades by the book`), severity: 'good' });
  if (riskCV <= 35) strengths.push({ title: t('גודל סיכון עקבי', 'Consistent Sizing'), metric: `CV ${riskCV.toFixed(0)}% — ${t('סיזינג מבוקר', 'controlled sizing')}`, severity: 'good' });
  if (expectancyR > 0.1) strengths.push({ title: t('תוחלת חיובית מובהקת', 'Clear Positive Expectancy'), metric: `${fmtVal(headlineExp)} ${perTrade}`, severity: 'good' });
  if (profitFactor >= 1.5) strengths.push({ title: t('Profit Factor חזק', 'Strong Profit Factor'), metric: `${profitFactor.toFixed(2)} — ${t('רווח כפול מההפסד', 'profit far above loss')}`, severity: 'good' });
  if (revengeTrades === 0 && n >= 10) strengths.push({ title: t('ללא מסחר נקמה', 'No Revenge Trading'), metric: t('0 הסלמות לאחר הפסד', '0 escalations after a loss'), severity: 'good' });
  if (sortino >= 0.5) strengths.push({ title: t('Sortino גבוה', 'High Sortino'), metric: `${sortino.toFixed(2)} — ${t('תשואה יחסית ללחץ', 'risk-adjusted return')}`, severity: 'good' });
  if (maxWinStreak >= 4) strengths.push({ title: t('יכולת לרכב על מומנטום', 'Rides Momentum'), metric: t(`רצף ניצחונות מקס׳ ${maxWinStreak}`, `Max win streak ${maxWinStreak}`), severity: 'good' });

  /* ─── Risks ─── */
  const risksList: DeepDiagnosis['risks'] = [];
  if (revengeTrades > 0) risksList.push({ title: t('מסחר נקמה זוהה', 'Revenge Trading Detected'), metric: t(`${revengeTrades} מקרים של הגדלת סיכון לאחר הפסד באותו יום`, `${revengeTrades} cases of risk increase after a same-day loss`), severity: 'danger' });
  if (riskCV > 50) risksList.push({ title: t('כאוס בניהול הפוזיציה', 'Position Sizing Chaos'), metric: `CV ${riskCV.toFixed(0)}% — ${t('סיזינג רנדומלי', 'random sizing')}`, severity: 'danger' });
  else if (riskCV > 35) risksList.push({ title: t('סיזינג לא יציב', 'Unstable Sizing'), metric: `CV ${riskCV.toFixed(0)}%`, severity: 'warning' });
  if (rulesPct < 75) risksList.push({ title: t('סטייה מהכללים', 'Rule Deviation'), metric: t(`רק ${rulesPct.toFixed(0)}% עמידה — איכות החלטות יורדת`, `Only ${rulesPct.toFixed(0)}% compliance — decision quality dropping`), severity: rulesPct < 60 ? 'danger' : 'warning' });
  if (postLossEscalationPct > 30) risksList.push({ title: t('הסלמת סיכון לאחר הפסד', 'Post-Loss Risk Escalation'), metric: t(`${postLossEscalationPct.toFixed(0)}% מהעסקאות שאחרי הפסד עם סיכון מוגדל`, `${postLossEscalationPct.toFixed(0)}% of post-loss trades carry increased risk`), severity: 'danger' });
  if (overtradingDays >= 3) risksList.push({ title: t('מסחר יתר', 'Overtrading'), metric: t(`${overtradingDays} ימים עם 3+ עסקאות`, `${overtradingDays} days with 3+ trades`), severity: 'warning' });
  if (maxLossStreak >= 4) risksList.push({ title: t('רצף הפסדים מסוכן', 'Dangerous Loss Streak'), metric: t(`${maxLossStreak} הפסדים רצופים — ללא פרוטוקול עצירה`, `${maxLossStreak} consecutive losses — no stop protocol`), severity: 'danger' });
  if (highDev >= 3) risksList.push({ title: t('סטיית ביצוע גבוהה', 'High Execution Deviation'), metric: t(`${highDev} עסקאות בסטייה מעל 10%`, `${highDev} trades with deviation above 10%`), severity: 'warning' });
  if (profitFactor < 1 && n >= 10) risksList.push({ title: t('אין אדג׳ סטטיסטי כרגע', 'No Statistical Edge Yet'), metric: `PF ${profitFactor.toFixed(2)} — ${t('מפסיד יותר ממה שמרוויח', 'losing more than winning')}`, severity: 'danger' });

  /* ─── Patterns ─── */
  const patterns: DeepDiagnosis['patterns'] = [];
  if (disciplineParadox) patterns.push({
    id: 'discipline-paradox',
    label: t('פרדוקס המשמעת — אשליה של שליטה', 'Discipline Paradox — Illusion of Control'),
    detail: t(
      `אתה ב-${rulesPct.toFixed(0)}% עמידה בכללי הכניסה, ולכן מרגיש שאתה פועל נכון. אבל הנתונים חושפים את האמת: אתה "מעניש" את השוק על הפסדים דרך הגדלת סיכון בלתי-מבוקרת. אתה ממושמע בכניסה — אבל אנרכיסט בניהול הסיכון. זה הפער שמרוקן את החשבון.`,
      `You're at ${rulesPct.toFixed(0)}% compliance on entry rules, so you feel you're doing it right. But the data tells the truth: you "punish" the market for losses through uncontrolled risk increases. You're disciplined on entry — but anarchic on risk. That gap drains the account.`,
    ),
    severity: 'danger',
  });
  if (winRate >= 55 && expectancyR < 0) patterns.push({
    id: 'small-wins-big-losses',
    label: t('דפוס "ניצחונות קטנים, הפסדים גדולים"', 'Pattern: small wins, big losses'),
    detail: t(
      `אחוז ניצחונות גבוה (${winRate.toFixed(0)}%) אך תוחלת שלילית — אתה לוקח רווחים מוקדם מדי וחותך הפסדים מאוחר.`,
      `High win-rate (${winRate.toFixed(0)}%) but negative expectancy — you take profits too early and cut losses too late.`,
    ),
    severity: 'danger',
  });
  if (winRate < 45 && expectancyR > 0.2) patterns.push({
    id: 'asymmetric-edge',
    label: t('אדג׳ א-סימטרי בריא', 'Healthy Asymmetric Edge'),
    detail: t(
      `WR נמוך אך תוחלת ${expectancyR.toFixed(2)}R — אתה מנצח גדול ומפסיד קטן. דפוס של סוחרי מומנטום מקצועיים.`,
      `Low WR but ${expectancyR.toFixed(2)}R expectancy — you win big, lose small. Classic professional momentum pattern.`,
    ),
    severity: 'good',
  });
  if (postLossEscalationPct > 40) patterns.push({
    id: 'emotional-escalation',
    label: t('הסלמה רגשית לאחר הפסד', 'Emotional Escalation After Loss'),
    detail: t(
      `${postLossEscalationPct.toFixed(0)}% מהעסקאות שאחרי הפסד מגיעות עם סיכון מוגדל. דפוס "להחזיר את ההפסד" קלאסי — שורף חשבונות.`,
      `${postLossEscalationPct.toFixed(0)}% of post-loss trades carry increased risk. Classic "get it back" pattern — burns accounts.`,
    ),
    severity: 'danger',
  });
  if (maxWinStreak >= 5 && maxLossStreak <= 2) patterns.push({
    id: 'momentum-rider',
    label: t('יכולת לרכב על מומנטום', 'Momentum Rider'),
    detail: t(
      `רצף ${maxWinStreak} ניצחונות ושמירה על רצפי הפסד קצרים. שליטה רגשית טובה.`,
      `Streak of ${maxWinStreak} wins while keeping loss streaks short. Good emotional control.`,
    ),
    severity: 'good',
  });
  if (overtradingDays >= 5 && winRate < 50) patterns.push({
    id: 'overtrade-bleed',
    label: t('דימום מתדירות יתר', 'Bleeding From Overtrading'),
    detail: t(
      `${overtradingDays} ימי מסחר יתר + WR נמוך = שחיקה מעמלות וריכוז. סנן יותר.`,
      `${overtradingDays} overtrading days + low WR = bleeding from fees and focus loss. Filter harder.`,
    ),
    severity: 'warning',
  });
  if (maxLossStreak >= 6) patterns.push({
    id: 'no-brakes',
    label: t('ריצה לתוך הקיר ללא בלמים', 'Running Into the Wall, No Brakes'),
    detail: t(
      `רצף של ${maxLossStreak} הפסדים מצביע על היעדר מנגנון Kill Switch. ההמשכיות הזו לא בנויה בתוכך — חייב להיות חיצוני.`,
      `A streak of ${maxLossStreak} losses points to no Kill Switch. That brake won't come from within — it must be external.`,
    ),
    severity: 'danger',
  });

  /* ─── Plan ─── */
  const plan: DeepDiagnosis['plan'] = [];

  if (maxLossStreak >= 3 || revengeTrades > 0 || postLossEscalationPct > 30) {
    plan.push({
      step: t(
        'הפעל Kill Switch קשיח: אחרי 3 הפסדים רצופים באותו יום — סגירת פלטפורמה. אין החזרת הפסדים היום.',
        'Enable a hard Kill Switch: after 3 consecutive losses in a day — close the platform. No recovery attempts today.',
      ),
      why: t(
        'מעבר ל-3 הפסדים, היכולת הקוגניטיבית לקרוא שוק צונחת לאפס. זה הגנה על החשבון, לא מגבלה על המסחר.',
        'Past 3 losses, the cognitive ability to read markets collapses. This protects the account, not your trading.',
      ),
      priority: 'critical',
    });
  }
  if (revengeTrades > 0 || postLossEscalationPct > 30) {
    plan.push({
      step: t(
        'אחרי כל הפסד — עצירה כפויה של 20 דקות לפני העסקה הבאה. בלי יוצא מן הכלל.',
        'After every loss — a forced 20-minute pause before the next trade. No exceptions.',
      ),
      why: t(
        'מנטרל את חלון ההסלמה הרגשי. זה החלון שבו נולד מסחר נקמה.',
        'Neutralizes the emotional escalation window where revenge trading is born.',
      ),
      priority: 'critical',
    });
  }
  if (riskCV > 40) {
    plan.push({
      step: t(
        `קבע סיכון קשיח של 0.5% מהחשבון (יחידת R קבועה) ל-20 העסקאות הבאות. אין סטיות.`,
        `Lock risk at 0.5% of account (fixed R unit) for the next 20 trades. No deviations.`,
      ),
      why: t(
        `יוריד את ה-CV מ-${riskCV.toFixed(0)}% מתחת ל-30% ויחשוף את האדג׳ האמיתי שלך — בלי הרעש של סיזינג רנדומלי.`,
        `Will pull CV from ${riskCV.toFixed(0)}% to under 30% and reveal your real edge — without random-sizing noise.`,
      ),
      priority: 'high',
    });
  }
  if (rulesPct < 80) {
    plan.push({
      step: t(
        'לפני כל כניסה — וידוא של 3 תנאי צ׳קליסט מינימום, מוקלדים ביומן.',
        'Before each entry — verify 3 checklist conditions minimum, typed into the journal.',
      ),
      why: t(
        'מעלה את אחוז ההיענות לכללים מעל 85% ומנתק את הכניסה האימפולסיבית.',
        'Pushes rule-compliance above 85% and severs impulsive entries.',
      ),
      priority: 'high',
    });
  }
  if (overtradingDays >= 3) {
    plan.push({
      step: t(
        'מקסימום 2 עסקאות ביום. הגעת ל-2? סגור פלטפורמה, לא משנה מה השוק עושה.',
        'Max 2 trades per day. Hit 2? Close the platform — regardless of what the market does.',
      ),
      why: t(
        'מסחר יתר שוחק מיקוד והחלטות. תקרה היא אכיפה, לא הצעה.',
        'Overtrading erodes focus and decisions. A cap is enforcement, not a suggestion.',
      ),
      priority: 'standard',
    });
  }
  if (expectancyR < 0 && n >= 10) {
    plan.push({
      step: t(
        'הקטן כמות סטאפים — סנן רק A+ למשך שבועיים, תעד כל סטאפ שדילגת עליו.',
        'Cut setup count — only A+ for two weeks, log every setup you skipped.',
      ),
      why: t(
        'איכות מנצחת כמות כשהתוחלת שלילית. הסטטיסטיקה תתקן את עצמה.',
        'Quality beats quantity when expectancy is negative. The statistics will correct themselves.',
      ),
      priority: 'standard',
    });
  }
  if (plan.length === 0) {
    plan.push({
      step: t('המשך לתעד עסקאות נקיות — האדג׳ עובד. הסקייל הוא הצעד הבא.', 'Keep logging clean trades — the edge works. Scale is the next move.'),
      why: t('הצמיחה הבאה היא בסקייל ולא בתיקון.', 'The next growth is in scale, not in fixes.'),
      priority: 'standard',
    });
  }

  /* ─── Fingerprint ─── */
  const fingerprint: DeepDiagnosis['fingerprint'] = [
    revengeTrades === 0 ? { l: t('ללא נקמה', 'No revenge'), c: 'green' } : { l: t(`${revengeTrades} נקמות`, `${revengeTrades} revenge`), c: 'red' },
    overtradingDays === 0 ? { l: t('תדירות בריאה', 'Healthy cadence'), c: 'green' } : { l: t(`${overtradingDays} ימי יתר`, `${overtradingDays} overtrade days`), c: 'orange' },
    rulesPct >= 80
      ? { l: t(`כניסה ${rulesPct.toFixed(0)}%`, `Entry ${rulesPct.toFixed(0)}%`), c: 'cyan' }
      : { l: t(`כניסה ${rulesPct.toFixed(0)}%`, `Entry ${rulesPct.toFixed(0)}%`), c: 'orange' },
    riskCV <= 35
      ? { l: t(`סיזינג ${riskCV.toFixed(0)}%`, `Sizing ${riskCV.toFixed(0)}%`), c: 'green' }
      : { l: t(`סיזינג ${riskCV.toFixed(0)}% כאוס`, `Sizing ${riskCV.toFixed(0)}% chaos`), c: 'red' },
    expectancyR > 0
      ? { l: isMoney ? `${fmtVal(avgPnl)} ${perTrade}` : `+${expectancyR.toFixed(2)}R/${t('עסקה','trade')}`, c: 'cyan' }
      : { l: isMoney ? `${fmtVal(avgPnl)} ${perTrade}` : `${expectancyR.toFixed(2)}R/${t('עסקה','trade')}`, c: 'red' },
    profitFactor >= 1.3
      ? { l: `PF ${profitFactor.toFixed(2)}`, c: 'green' }
      : { l: `PF ${profitFactor.toFixed(2)}`, c: 'orange' },
    maxWinStreak >= 4 ? { l: t(`רצף ${maxWinStreak}W`, `Streak ${maxWinStreak}W`), c: 'purple' } : null,
    maxLossStreak >= 4 ? { l: t(`רצף ${maxLossStreak}L`, `Streak ${maxLossStreak}L`), c: 'red' } : null,
  ].filter(Boolean) as DeepDiagnosis['fingerprint'];

  const disciplineParadoxText = disciplineParadox ? {
    headline: t('⚠ פרדוקס המשמעת — אשליה של שליטה', '⚠ Discipline Paradox — Illusion of Control'),
    body: t(
      'אתה ממושמע בכניסה — אבל אנרכיסט בניהול הסיכון. זה הפער שמרוקן את החשבון.',
      "You're disciplined on entry — but anarchic on risk management. This gap drains the account.",
    ),
  } : undefined;

  return {
    archetype, archetypeEN, archetypeBlurb,
    bottomLine, bottomLineEN,
    confidence: Math.round(confidence),
    scores: {
      setupDiscipline: Math.round(setupDiscipline),
      riskDiscipline: Math.round(riskDiscipline),
      discipline,
      consistency: Math.round(consistency),
      emotional: Math.round(emotional),
      edge: Math.round(edge),
      patience: Math.round(patience),
      adaptability: Math.round(adaptability),
      risk: Math.round(risk),
      survivability,
      overall,
    },
    disciplineParadox,
    disciplineParadoxText,
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
      avgPnl: safe(avgPnl),
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
  totalEdgePnL: number;
  baselinePnL: number;
  enoughData: boolean;
}

const DAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SESSIONS_HE = ['אסיה', 'לונדון', 'ניו-יורק', 'לילה'];
const SESSIONS_EN = ['Asia', 'London', 'New York', 'Night'];

export function findBestEdge(trades: Trade[], opts: DiagOpts = {}): BestOfEdge {
  const lang: DiagLang = opts.lang ?? 'he';
  const t = (he: string, en: string) => (lang === 'he' ? he : en);
  const DAY_NAMES = lang === 'he' ? DAY_NAMES_HE : DAY_NAMES_EN;
  const SESSIONS = lang === 'he' ? SESSIONS_HE : SESSIONS_EN;

  const enoughData = trades.length >= 10;

  const byAsset: Record<string, { pnl: number; n: number; wins: number; r: number }> = {};
  trades.forEach(tr => {
    const k = tr.coin || 'OTHER';
    byAsset[k] = byAsset[k] || { pnl: 0, n: 0, wins: 0, r: 0 };
    byAsset[k].pnl += tr.pnl; byAsset[k].n++; byAsset[k].r += getEffectiveR(tr);
    if (tr.winLoss === 'Win') byAsset[k].wins++;
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

  const byDay: Record<number, { pnl: number; n: number; wins: number; r: number }> = {};
  trades.forEach(tr => {
    try {
      const d = new Date(tr.date.replace(' ', 'T')).getDay();
      byDay[d] = byDay[d] || { pnl: 0, n: 0, wins: 0, r: 0 };
      byDay[d].pnl += tr.pnl; byDay[d].n++; byDay[d].r += getEffectiveR(tr);
      if (tr.winLoss === 'Win') byDay[d].wins++;
    } catch { /* skip */ }
  });
  const dayEntries = Object.entries(byDay).filter(([_, v]) => v.n >= 2);
  const bestDayEntry = dayEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const bestDay = bestDayEntry ? {
    name: DAY_NAMES[Number(bestDayEntry[0])],
    pnl: +bestDayEntry[1].pnl.toFixed(2),
    wr: +(bestDayEntry[1].wins / bestDayEntry[1].n * 100).toFixed(0),
    n: bestDayEntry[1].n,
    avgR: +(bestDayEntry[1].r / bestDayEntry[1].n).toFixed(2),
  } : null;

  const byHour: Record<number, { pnl: number; n: number; wins: number }> = {};
  trades.forEach(tr => {
    try {
      const h = new Date(tr.date.replace(' ', 'T')).getHours();
      byHour[h] = byHour[h] || { pnl: 0, n: 0, wins: 0 };
      byHour[h].pnl += tr.pnl; byHour[h].n++;
      if (tr.winLoss === 'Win') byHour[h].wins++;
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

  const sessions = SESSIONS.map((name, i) => ({ name, from: [0, 7, 13, 20][i], to: [7, 13, 20, 24][i], pnl: 0, n: 0 }));
  trades.forEach(tr => {
    try {
      const h = new Date(tr.date.replace(' ', 'T')).getHours();
      const s = sessions.find(x => h >= x.from && h < x.to);
      if (s) { s.pnl += tr.pnl; s.n++; }
    } catch { /* skip */ }
  });
  const bestSessionEntry = sessions.filter(s => s.n >= 1).sort((a, b) => b.pnl - a.pnl)[0];
  const bestSession = bestSessionEntry ? { name: bestSessionEntry.name, pnl: +bestSessionEntry.pnl.toFixed(2), n: bestSessionEntry.n } : null;

  const bySetup: Record<string, { pnl: number; n: number; wins: number }> = {};
  trades.forEach(tr => {
    const k = `${tr.direction} · ${tr.orderType || 'Market'}`;
    bySetup[k] = bySetup[k] || { pnl: 0, n: 0, wins: 0 };
    bySetup[k].pnl += tr.pnl; bySetup[k].n++;
    if (tr.winLoss === 'Win') bySetup[k].wins++;
  });
  const setupEntries = Object.entries(bySetup).filter(([_, v]) => v.n >= 2);
  const bestSetupEntry = setupEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const bestSetup = bestSetupEntry ? {
    name: bestSetupEntry[0], pnl: +bestSetupEntry[1].pnl.toFixed(2),
    wr: +(bestSetupEntry[1].wins / bestSetupEntry[1].n * 100).toFixed(0), n: bestSetupEntry[1].n,
  } : null;

  const byCalDay: Record<string, { pnl: number; n: number }> = {};
  trades.forEach(tr => {
    try {
      const d = new Date(tr.date.replace(' ', 'T')).toDateString();
      byCalDay[d] = byCalDay[d] || { pnl: 0, n: 0 };
      byCalDay[d].pnl += tr.pnl; byCalDay[d].n++;
    } catch { /* skip */ }
  });
  const calDayEntries = Object.entries(byCalDay).sort((a, b) => b[1].pnl - a[1].pnl)[0];
  const bestStreakDay = calDayEntries ? {
    name: new Date(calDayEntries[0]).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US'),
    pnl: +calDayEntries[1].pnl.toFixed(2),
    n: calDayEntries[1].n,
  } : null;

  const baselinePnL = trades.reduce((s, tr) => s + tr.pnl, 0);
  const totalEdgePnL = bestAsset ? bestAsset.pnl : 0;

  let edgeStatement = '';
  if (bestAsset && bestDay && bestHour) {
    edgeStatement = t(
      `הקומבינציה החזקה ביותר שלך: ${bestAsset.name} ביום ${bestDay.name} סביב ${bestHour.label}.`,
      `Your strongest combination: ${bestAsset.name} on ${bestDay.name} around ${bestHour.label}.`,
    );
  } else if (bestAsset) {
    edgeStatement = t(
      `המוקד הברור שלך: ${bestAsset.name} (${bestAsset.wr}% ניצחונות, +${bestAsset.expR}R לעסקה).`,
      `Your clear focus: ${bestAsset.name} (${bestAsset.wr}% win-rate, +${bestAsset.expR}R per trade).`,
    );
  } else {
    edgeStatement = t('אין עדיין אדג׳ ברור — צבור עוד עסקאות כדי לחשוף אותו.', 'No clear edge yet — log more trades to reveal it.');
  }

  return {
    bestAsset, bestDay, bestHour, bestSession, bestSetup, bestStreakDay, worstAsset,
    edgeStatement, totalEdgePnL: +totalEdgePnL.toFixed(2), baselinePnL: +baselinePnL.toFixed(2),
    enoughData,
  };
}
