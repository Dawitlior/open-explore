import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import type { RiskAssessment } from '@/lib/risk-engine';
import { GlassCard, MetricCard, ScoreGauge, TradingBadge } from './TradingUI';
import { useIsMobile } from '@/hooks/use-mobile';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface WeeklyReviewData {
  weekKey: string;
  completedAt?: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  performance?: WeeklyPerformance;
  checklist: Record<string, boolean>;
  responses: Record<string, string>;
  lessons: Record<string, string>;
  nextWeekPlan: Record<string, string>;
  tradeImages: { label: string; url: string }[];
  riskExplanations: string[];
  weekProfile?: string;
}

interface WeeklyPerformance {
  totalTrades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRate: number;
  totalR: number;
  avgR: number;
  bestTrade: number;
  worstTrade: number;
  avgRisk: number;
  maxDrawdown: number;
  rulesFollowed: number;
  avgDeviation: number;
}

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
  stats: TradingStats;
  riskData: RiskAssessment;
}

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function getWeekKey(d: Date): string {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Determine the review status based on day and completion */
function getReviewAvailability(weekKey: string): 'locked' | 'available' {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat

  // Check if this week's review was already completed
  const saved = loadReviewRaw(weekKey);
  if (saved?.completedAt) {
    // Lock until next Friday: completed reviews stay locked
    // The review is for THIS week, so once done it's locked until a new weekKey
    return 'locked';
  }

  // Available on Friday (5), Saturday (6), Sunday (0)
  return (day === 5 || day === 6 || day === 0) ? 'available' : 'locked';
}

function getNextFridayDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = (5 - day + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getWeekTrades(trades: Trade[]): Trade[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return trades.filter(t => {
    const d = new Date(t.date.replace(' ', 'T'));
    return !isNaN(d.getTime()) && d >= monday;
  });
}

function computeWeeklyPerf(weekTrades: Trade[]): WeeklyPerformance {
  if (weekTrades.length === 0) return { totalTrades: 0, wins: 0, losses: 0, breakEven: 0, winRate: 0, totalR: 0, avgR: 0, bestTrade: 0, worstTrade: 0, avgRisk: 0, maxDrawdown: 0, rulesFollowed: 0, avgDeviation: 0 };
  const wins = weekTrades.filter(t => t.winLoss === 'Win').length;
  const losses = weekTrades.filter(t => t.winLoss === 'Loss').length;
  const be = weekTrades.filter(t => t.winLoss === 'Break Even').length;
  const totalR = weekTrades.reduce((s, t) => s + t.returnR, 0);
  const pnls = weekTrades.map(t => t.pnl);
  let dd = 0, peak = 0, runPnl = 0;
  weekTrades.forEach(t => { runPnl += t.pnl; if (runPnl > peak) peak = runPnl; dd = Math.max(dd, peak - runPnl); });
  const rulesFollowed = weekTrades.filter(t => t.rules).length;
  return {
    totalTrades: weekTrades.length, wins, losses, breakEven: be,
    winRate: (wins / weekTrades.length) * 100,
    totalR, avgR: totalR / weekTrades.length,
    bestTrade: pnls.reduce((a, b) => b > a ? b : a, -Infinity), worstTrade: pnls.reduce((a, b) => b < a ? b : a, Infinity),
    avgRisk: weekTrades.reduce((s, t) => s + t.risk, 0) / weekTrades.length,
    maxDrawdown: dd,
    rulesFollowed: (rulesFollowed / weekTrades.length) * 100,
    avgDeviation: weekTrades.reduce((s, t) => s + t.deviation, 0) / weekTrades.length,
  };
}

function getWeekProfile(perf: WeeklyPerformance, checklist: Record<string, boolean>): string {
  if (perf.totalTrades === 0) return 'No-Activity Week';
  const disciplineRate = perf.rulesFollowed;
  const profitable = perf.totalR > 0;
  const highWR = perf.winRate > 55;
  const lowDev = perf.avgDeviation < 0.08;

  if (disciplineRate > 85 && profitable && lowDev) return 'High-Discipline Profitable Week';
  if (disciplineRate > 85 && !profitable) return 'Disciplined but Unlucky Week';
  if (!profitable && perf.avgDeviation > 0.15) return 'Emotionally Pressured Week';
  if (profitable && disciplineRate < 60) return 'Profitable but Sloppy Week';
  if (perf.totalTrades > 15) return 'Overtrading Week';
  if (perf.losses > perf.wins && perf.maxDrawdown > perf.avgRisk * 3) return 'Drawdown Recovery Week';
  if (highWR && profitable) return 'Controlled Execution Week';
  if (perf.totalTrades < 3) return 'Low-Opportunity Week';
  return 'Mixed Performance Week';
}

// ═══════════════════════════════════════════════════
// CHECKLIST DEFINITIONS
// ═══════════════════════════════════════════════════

interface ChecklistItem { id: string; en: string; he: string; category: string; }

const STATIC_CHECKLIST: ChecklistItem[] = [
  { id: 'd1', category: 'Discipline', en: 'I followed my trading plan consistently', he: 'עקבתי אחרי תוכנית המסחר שלי בעקביות' },
  { id: 'd2', category: 'Discipline', en: 'I did not add to losing positions', he: 'לא הוספתי לפוזיציות מפסידות' },
  { id: 'd3', category: 'Discipline', en: 'I respected my stop losses without moving them', he: 'כיבדתי את הסטופים שלי בלי להזיז אותם' },
  { id: 'd4', category: 'Discipline', en: 'I waited for valid setups before entering', he: 'חיכיתי לסטאפים תקינים לפני כניסה' },
  { id: 'd5', category: 'Discipline', en: 'I did not revenge trade after losses', he: 'לא ביצעתי מסחר נקמה אחרי הפסדים' },
  { id: 'r1', category: 'Risk', en: 'My position sizing stayed within plan limits', he: 'גודל הפוזיציות שלי נשאר בגבולות התוכנית' },
  { id: 'r2', category: 'Risk', en: 'I did not exceed my daily risk limit', he: 'לא חרגתי ממגבלת הסיכון היומית' },
  { id: 'r3', category: 'Risk', en: 'Risk per trade remained consistent', he: 'הסיכון לעסקה נשאר עקבי' },
  { id: 'r4', category: 'Risk', en: 'I reduced size after consecutive losses', he: 'הקטנתי גודל אחרי הפסדים רצופים' },
  { id: 'r5', category: 'Risk', en: 'I did not increase risk based on emotion', he: 'לא הגדלתי סיכון מתוך רגש' },
  { id: 's1', category: 'Strategy', en: 'I only traded setups from my playbook', he: 'סחרתי רק סטאפים מהפלייבוק שלי' },
  { id: 's2', category: 'Strategy', en: 'I avoided FOMO entries', he: 'נמנעתי מכניסות FOMO' },
  { id: 's3', category: 'Strategy', en: 'My entries were at valid technical levels', he: 'הכניסות שלי היו ברמות טכניות תקפות' },
  { id: 's4', category: 'Strategy', en: 'I adapted to current market conditions', he: 'התאמתי את עצמי לתנאי שוק נוכחיים' },
  { id: 'e1', category: 'Execution', en: 'My entry timing was clean', he: 'תזמון הכניסה שלי היה נקי' },
  { id: 'e2', category: 'Execution', en: 'I managed exits well (not too early/late)', he: 'ניהלתי יציאות היטב (לא מוקדם/מאוחר מדי)' },
  { id: 'e3', category: 'Execution', en: 'I let winners run to target', he: 'נתתי לרווחיות לרוץ ליעד' },
  { id: 'e4', category: 'Execution', en: 'I cut losers quickly', he: 'חתכתי מפסידות מהר' },
  { id: 'p1', category: 'Psychology', en: 'I maintained emotional control throughout the week', he: 'שמרתי על שליטה רגשית לאורך השבוע' },
  { id: 'p2', category: 'Psychology', en: 'I did not trade while frustrated or anxious', he: 'לא סחרתי כשהייתי מתוסכל או חרד' },
  { id: 'p3', category: 'Psychology', en: 'I accepted losses without emotional reaction', he: 'קיבלתי הפסדים בלי תגובה רגשית' },
  { id: 'p4', category: 'Psychology', en: 'I took breaks when I felt tilted', he: 'לקחתי הפסקות כשהרגשתי tilt' },
  { id: 'pr1', category: 'Process', en: 'I journaled every trade this week', he: 'תיעדתי כל עסקה השבוע' },
  { id: 'pr2', category: 'Process', en: 'I reviewed my trades before the next session', he: 'סקרתי את העסקאות שלי לפני הסשן הבא' },
  { id: 'pr3', category: 'Process', en: 'I had a pre-market routine each day', he: 'הייתה לי שגרת pre-market כל יום' },
  { id: 'c1', category: 'Consistency', en: 'My trading was consistent with my overall goals', he: 'המסחר שלי היה עקבי עם המטרות הכלליות' },
  { id: 'c2', category: 'Consistency', en: 'I stuck to my weekly trade limit', he: 'דבקתי במגבלת העסקאות השבועית' },
];

// ═══════════════════════════════════════════════════
// REVIEW SECTIONS
// ═══════════════════════════════════════════════════

const RESPONSE_SECTIONS = [
  {
    id: 'behavioral', titleEn: 'Behavioral Review', titleHe: 'סקירה התנהגותית', icon: '🧠',
    questions: [
      { id: 'beh_rules', en: 'Were your trading rules followed consistently this week?', he: 'האם כללי המסחר שלך נשמרו בעקביות השבוע?' },
      { id: 'beh_emotion', en: 'Did emotional reactions affect any trading decisions?', he: 'האם תגובות רגשיות השפיעו על החלטות מסחר?' },
      { id: 'beh_overtrade', en: 'Did you overtrade at any point? What triggered it?', he: 'האם ביצעת מסחר יתר בשלב כלשהו? מה גרם לזה?' },
    ]
  },
  {
    id: 'risk', titleEn: 'Risk Review', titleHe: 'סקירת סיכונים', icon: '🛡️',
    questions: [
      { id: 'risk_stable', en: 'Was your position sizing stable throughout the week?', he: 'האם גודל הפוזיציות שלך היה יציב לאורך השבוע?' },
      { id: 'risk_afterloss', en: 'Did you change risk after losses? Why?', he: 'האם שינית סיכון אחרי הפסדים? למה?' },
      { id: 'risk_quality', en: 'Did risk match setup quality?', he: 'האם הסיכון התאים לאיכות הסטאפ?' },
    ]
  },
  {
    id: 'strategy', titleEn: 'Strategy Review', titleHe: 'סקירת אסטרטגיה', icon: '📐',
    questions: [
      { id: 'strat_valid', en: 'Did you only take valid setups from your playbook?', he: 'האם לקחת רק סטאפים תקפים מהפלייבוק?' },
      { id: 'strat_best', en: 'Which setup type performed best this week?', he: 'איזה סוג סטאפ ביצע הכי טוב השבוע?' },
      { id: 'strat_worst', en: 'Which setup caused the most trouble?', he: 'איזה סטאפ גרם הכי הרבה בעיות?' },
    ]
  },
  {
    id: 'execution', titleEn: 'Execution Review', titleHe: 'סקירת ביצוע', icon: '🎯',
    questions: [
      { id: 'exec_entry', en: 'How was your entry quality this week?', he: 'איך הייתה איכות הכניסה שלך השבוע?' },
      { id: 'exec_exit', en: 'Did you exit at the right time or too early/late?', he: 'האם יצאת בזמן הנכון או מוקדם/מאוחר מדי?' },
      { id: 'exec_improve', en: 'Did execution improve or decline through the week?', he: 'האם הביצוע השתפר או ירד לאורך השבוע?' },
    ]
  },
  {
    id: 'psychology', titleEn: 'Psychological Review', titleHe: 'סקירה פסיכולוגית', icon: '💭',
    questions: [
      { id: 'psych_control', en: 'Rate your emotional control this week (1-10) and explain', he: 'דרג את השליטה הרגשית שלך השבוע (1-10) והסבר' },
      { id: 'psych_confidence', en: 'How was your confidence level? Did it change?', he: 'איך היה רמת הביטחון שלך? האם היא השתנתה?' },
      { id: 'psych_reactions', en: 'How did you react to losses and missed trades?', he: 'איך הגבת להפסדים ולעסקאות שפספסת?' },
    ]
  },
];

const LESSON_FIELDS = [
  { id: 'biggest_mistake', en: 'Biggest mistake of the week', he: 'הטעות הגדולה ביותר השבוע' },
  { id: 'biggest_improvement', en: 'Biggest improvement of the week', he: 'השיפור הגדול ביותר השבוע' },
  { id: 'stop_doing', en: 'One behavior to STOP', he: 'התנהגות אחת להפסיק' },
  { id: 'continue_doing', en: 'One behavior to CONTINUE', he: 'התנהגות אחת להמשיך' },
  { id: 'improve_next', en: 'One thing to improve next week', he: 'דבר אחד לשפר בשבוע הבא' },
  { id: 'understand_better', en: 'One thing I now understand better', he: 'דבר אחד שעכשיו אני מבין טוב יותר' },
  { id: 'visible_weakness', en: 'One weakness that became visible', he: 'חולשה אחת שהתגלתה' },
  { id: 'clear_strength', en: 'One strength that became clear', he: 'חוזקה אחת שהתבהרה' },
];

const NEXT_WEEK_FIELDS = [
  { id: 'focus', en: 'Main focus for next week', he: 'המיקוד העיקרי לשבוע הבא' },
  { id: 'risk_rule', en: 'Risk rule for next week', he: 'כלל סיכון לשבוע הבא' },
  { id: 'setup_priority', en: 'Setup priority for next week', he: 'עדיפות סטאפ לשבוע הבא' },
  { id: 'behavioral_correction', en: 'Behavioral correction to make', he: 'תיקון התנהגותי לביצוע' },
  { id: 'execution_target', en: 'Execution improvement target', he: 'יעד שיפור ביצוע' },
  { id: 'psych_objective', en: 'Psychological objective', he: 'מטרה פסיכולוגית' },
];

const NO_TRADES_QUESTIONS = [
  { id: 'nt_why', en: 'Why were there no trades this week?', he: 'למה לא היו עסקאות השבוע?' },
  { id: 'nt_intentional', en: 'Was staying out intentional and aligned with your plan?', he: 'האם ההימנעות הייתה מכוונת ותואמת לתוכנית?' },
  { id: 'nt_market', en: 'Did the market provide valid opportunities you passed on?', he: 'האם השוק סיפק הזדמנויות שפיספסת?' },
  { id: 'nt_hesitation', en: 'Were you hesitant, distracted, or undisciplined?', he: 'האם היית מהסס, מוסח או לא ממושמע?' },
  { id: 'nt_correct', en: 'Was staying out the correct decision?', he: 'האם הישארות בחוץ הייתה ההחלטה הנכונה?' },
];

const TRADE_IMAGE_LABELS = [
  { id: 'best', en: 'Best Trade of the Week', he: 'העסקה הטובה ביותר השבוע' },
  { id: 'worst', en: 'Worst Trade of the Week', he: 'העסקה הגרועה ביותר השבוע' },
  { id: 'emotional', en: 'Most Emotional Trade', he: 'העסקה הכי רגשית' },
  { id: 'educational', en: 'Most Educational Trade', he: 'העסקה הכי לימודית' },
  { id: 'clean', en: 'Most Technically Clean Trade', he: 'העסקה הכי נקייה טכנית' },
  { id: 'missed', en: 'Biggest Missed Opportunity', he: 'ההזדמנות הגדולה ביותר שפוספסה' },
];

// ═══════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════

function loadReviewRaw(weekKey: string): WeeklyReviewData | null {
  try {
    const raw = localStorage.getItem(`orca-weekly-${weekKey}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function loadReview(weekKey: string): WeeklyReviewData {
  const raw = loadReviewRaw(weekKey);
  if (raw) return raw;
  return { weekKey, status: 'available', checklist: {}, responses: {}, lessons: {}, nextWeekPlan: {}, tradeImages: [], riskExplanations: [] };
}

function saveReview(data: WeeklyReviewData) {
  localStorage.setItem(`orca-weekly-${data.weekKey}`, JSON.stringify(data));
  try {
    const idx = JSON.parse(localStorage.getItem('orca-weekly-index') || '[]') as string[];
    if (!idx.includes(data.weekKey)) { idx.push(data.weekKey); localStorage.setItem('orca-weekly-index', JSON.stringify(idx)); }
  } catch { /* ignore */ }
}

function getArchivedWeeks(): string[] {
  try { return JSON.parse(localStorage.getItem('orca-weekly-index') || '[]'); } catch { return []; }
}

// ═══════════════════════════════════════════════════
// AI WEEKLY ANALYSIS ENGINE
// ═══════════════════════════════════════════════════

interface AIWeeklyAnalysis {
  profile: string;
  narrative: string;
  strengths: string[];
  weaknesses: string[];
  patterns: string[];
  takeaways: { label: string; text: string }[];
}

function generateAIAnalysis(
  perf: WeeklyPerformance,
  weekTrades: Trade[],
  review: WeeklyReviewData,
  stats: TradingStats,
  riskData: RiskAssessment,
  isRTL: boolean
): AIWeeklyAnalysis {
  const profile = getWeekProfile(perf, review.checklist);
  const parts: string[] = [];

  let riskEscalated = false;
  let postLossRiskUp = 0;

  if (weekTrades.length >= 3) {
    const firstHalf = weekTrades.slice(0, Math.floor(weekTrades.length / 2));
    const secondHalf = weekTrades.slice(Math.floor(weekTrades.length / 2));
    const avgRiskFirst = firstHalf.reduce((s, t) => s + t.risk, 0) / firstHalf.length;
    const avgRiskSecond = secondHalf.reduce((s, t) => s + t.risk, 0) / secondHalf.length;
    riskEscalated = avgRiskSecond > avgRiskFirst * 1.3;
  }

  const lossIndices = weekTrades.map((t, i) => t.winLoss === 'Loss' ? i : -1).filter(i => i >= 0);
  postLossRiskUp = lossIndices.filter(i => i < weekTrades.length - 1 && weekTrades[i + 1].risk > weekTrades[i].risk * 1.2).length;

  const checklistEntries = Object.entries(review.checklist);
  const checklistPct = checklistEntries.length > 0 ? Math.round((checklistEntries.filter(([, v]) => v).length / checklistEntries.length) * 100) : 0;

  if (perf.totalTrades === 0) {
    parts.push(isRTL
      ? 'שבוע ללא פעילות מסחרית. חשוב לנתח אם הימנעות ממסחר הייתה החלטה מושכלת או הימנעות רגשית.'
      : 'A week with no trading activity. Important to analyze whether staying out was a deliberate decision or emotional avoidance.'
    );
  } else {
    if (perf.totalR > 0 && perf.rulesFollowed >= 70) {
      parts.push(isRTL ? `שבוע חיובי עם ${perf.totalR.toFixed(1)}R ומשמעת של ${perf.rulesFollowed.toFixed(0)}%.` : `A positive week at ${perf.totalR.toFixed(1)}R with ${perf.rulesFollowed.toFixed(0)}% discipline.`);
    } else if (perf.totalR > 0 && perf.rulesFollowed < 60) {
      parts.push(isRTL ? `שבוע רווחי (${perf.totalR.toFixed(1)}R) אך עם משמעת נמוכה (${perf.rulesFollowed.toFixed(0)}%).` : `Profitable week (${perf.totalR.toFixed(1)}R) but with low discipline (${perf.rulesFollowed.toFixed(0)}%).`);
    } else if (perf.totalR < 0 && perf.rulesFollowed >= 70) {
      parts.push(isRTL ? `שבוע מפסיד (${perf.totalR.toFixed(1)}R) למרות משמעת גבוהה. התהליך היה נכון.` : `Losing week (${perf.totalR.toFixed(1)}R) despite high discipline. Process was sound.`);
    } else {
      parts.push(isRTL ? `שבוע מאתגר עם ${perf.totalR.toFixed(1)}R ומשמעת של ${perf.rulesFollowed.toFixed(0)}%.` : `Challenging week at ${perf.totalR.toFixed(1)}R with ${perf.rulesFollowed.toFixed(0)}% discipline.`);
    }

    if (riskEscalated) parts.push(isRTL ? 'הסיכון עלה משמעותית מהחצי הראשון לשני של השבוע.' : 'Risk escalated from first to second half of the week.');
    if (postLossRiskUp > 0) parts.push(isRTL ? `זוהו ${postLossRiskUp} מקרים של הגדלת סיכון אחרי הפסד.` : `${postLossRiskUp} instances of risk increase after losses detected.`);
    if (perf.avgDeviation > 0.12) parts.push(isRTL ? 'סטייה ממוצעת גבוהה — פער בין תכנון לביצוע.' : 'High average deviation — gap between planning and execution.');
    if (perf.maxDrawdown > perf.avgRisk * 4) parts.push(isRTL ? `נסיגה גדולה של $${perf.maxDrawdown.toFixed(2)} יצרה לחץ.` : `Significant drawdown of $${perf.maxDrawdown.toFixed(2)} created pressure.`);
  }

  const strengths: string[] = [];
  if (perf.rulesFollowed >= 70) strengths.push(isRTL ? 'משמעת ועמידה בכללים' : 'Discipline and rule adherence');
  if (perf.winRate >= 50 && perf.totalTrades >= 3) strengths.push(isRTL ? 'בחירת סטאפים איכותית' : 'Quality setup selection');
  if (perf.avgDeviation < 0.08 && perf.totalTrades > 0) strengths.push(isRTL ? 'ביצוע מדויק ועקבי' : 'Precise and consistent execution');
  if (perf.totalR > 0) strengths.push(isRTL ? 'שבוע רווחי' : 'Profitable week');
  if (checklistPct >= 75) strengths.push(isRTL ? 'מודעות עצמית גבוהה' : 'High self-awareness');

  const weaknesses: string[] = [];
  if (perf.rulesFollowed < 60 && perf.totalTrades > 0) weaknesses.push(isRTL ? 'עמידה נמוכה בכללים' : 'Low rule adherence');
  if (postLossRiskUp > 0) weaknesses.push(isRTL ? 'מסחר נקמה אחרי הפסדים' : 'Revenge trading after losses');
  if (riskEscalated) weaknesses.push(isRTL ? 'הסלמת סיכון לא מתוכננת' : 'Unplanned risk escalation');
  if (perf.avgDeviation > 0.12 && perf.totalTrades > 0) weaknesses.push(isRTL ? 'סטייה גבוהה מתכנון' : 'High deviation from plan');
  if (perf.totalTrades > 15) weaknesses.push(isRTL ? 'מסחר יתר' : 'Overtrading');

  const patterns: string[] = [];
  if (postLossRiskUp > 1) patterns.push(isRTL ? 'הגדלת סיכון חוזרת אחרי הפסדים' : 'Recurring risk increase after losses');
  if (riskEscalated) patterns.push(isRTL ? 'העלאת סיכון לקראת סוף השבוע' : 'Risk increase toward end of week');
  if (perf.winRate > 60 && perf.avgR < 0.5 && perf.totalTrades >= 5) {
    patterns.push(isRTL ? 'אחוז הצלחה גבוה אך R ממוצע נמוך — יציאות מוקדמות' : 'High win rate but low avg R — cutting winners short');
  }

  const takeaways: { label: string; text: string }[] = [];
  if (postLossRiskUp > 0) {
    takeaways.push({ label: isRTL ? '🧠 התנהגות' : '🧠 Behavioral', text: isRTL ? 'אחרי הפסד, הסיכון נשאר זהה או יורד. אף פעם לא עולה.' : 'After a loss, risk stays the same or decreases. Never increases.' });
  } else {
    takeaways.push({ label: isRTL ? '🧠 התנהגות' : '🧠 Behavioral', text: isRTL ? 'המשך לשמור על המשמעת הנוכחית.' : 'Maintain your current discipline.' });
  }
  if (perf.avgDeviation > 0.1 && perf.totalTrades > 0) {
    takeaways.push({ label: isRTL ? '🎯 ביצוע' : '🎯 Execution', text: isRTL ? 'צמצם את הפער בין תכנון לביצוע.' : 'Close the gap between planning and execution.' });
  } else {
    takeaways.push({ label: isRTL ? '🎯 ביצוע' : '🎯 Execution', text: isRTL ? 'התמקד בשיפור תזמון יציאות.' : 'Focus on improving exit timing next week.' });
  }
  if (riskEscalated || postLossRiskUp > 0) {
    takeaways.push({ label: isRTL ? '🛡️ סיכון' : '🛡️ Risk', text: isRTL ? 'נעל את גודל הפוזיציה.' : 'Lock your position size.' });
  } else {
    takeaways.push({ label: isRTL ? '🛡️ סיכון' : '🛡️ Risk', text: isRTL ? 'ניהול הסיכונים היה עקבי. שמור על הקצב.' : 'Risk management was consistent. Maintain this rhythm.' });
  }
  if (perf.totalTrades > 0) {
    takeaways.push({ label: isRTL ? '📐 אסטרטגיה' : '📐 Strategy', text: isRTL ? 'סקור את הסטאפים שעבדו והתמקד בהם.' : 'Review which setups worked and double down on them.' });
  }

  return { profile, narrative: parts.join(' '), strengths, weaknesses, patterns, takeaways };
}

// ═══════════════════════════════════════════════════
// COMPLETED VIEW COMPONENT
// ═══════════════════════════════════════════════════

interface CompletedViewProps {
  T: TradingTheme;
  isRTL: boolean;
  isMobile: boolean;
  displayReview: WeeklyReviewData;
  perf: WeeklyPerformance;
  weekTrades: Trade[];
  stats: TradingStats;
  riskData: RiskAssessment;
  weekKey: string;
  viewingArchive: string | null;
  setViewingArchive: (v: string | null) => void;
  archivedWeeks: string[];
  onStartNewCycle: () => void;
}

const CompletedView = ({ T, isRTL, isMobile, displayReview, perf, weekTrades, stats, riskData, weekKey, viewingArchive, setViewingArchive, archivedWeeks, onStartNewCycle }: CompletedViewProps) => {
  const [analysis, setAnalysis] = useState<AIWeeklyAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const dp = displayReview.performance || perf;

  const handleAnalyze = useCallback(() => {
    setAnalyzing(true);
    setTimeout(() => {
      const result = generateAIAnalysis(dp, weekTrades, displayReview, stats, riskData, isRTL);
      setAnalysis(result);
      setAnalyzing(false);
    }, 1800);
  }, [dp, weekTrades, displayReview, stats, riskData, isRTL]);

  // Calculate time until next review
  const nextFriday = getNextFridayDate();
  const now = new Date();
  const daysUntilNext = Math.ceil((nextFriday.getTime() - now.getTime()) / 86400000);
  const isCurrentWeek = displayReview.weekKey === weekKey;

  return (
    <div>
      {viewingArchive && (
        <button onClick={() => { setViewingArchive(null); setAnalysis(null); }} style={{ marginBottom: 16, padding: '8px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }}>
          ← {isRTL ? 'חזרה' : 'Back'}
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <div style={{ fontSize: 36, marginBottom: 8, filter: 'drop-shadow(0 0 8px rgba(0,255,163,0.3))' }}>✅</div>
        <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
          {isRTL ? 'הסקירה השבועית הושלמה' : 'Weekly Review Completed'} — {displayReview.weekKey}
        </div>
        {displayReview.completedAt && (
          <div style={{ fontSize: 10, color: T.text.muted }}>
            {isRTL ? 'הושלם:' : 'Completed:'} {new Date(displayReview.completedAt).toLocaleDateString()}
          </div>
        )}
        {/* Next cycle indicator */}
        {isCurrentWeek && daysUntilNext > 0 && (
          <div style={{ marginTop: 12, padding: '8px 20px', background: `${T.accent.blue}08`, border: `1px solid ${T.accent.blue}15`, borderRadius: T.radius.lg, display: 'inline-block' }}>
            <div style={{ fontSize: 11, color: T.accent.blue, fontWeight: 600 }}>
              {isRTL ? `הסקירה הבאה תיפתח בעוד ${daysUntilNext} ימים` : `Next review unlocks in ${daysUntilNext} days`}
            </div>
          </div>
        )}
      </div>

      {/* ANALYZE BUTTON */}
      {!analysis && !analyzing && (
        <div style={{ textAlign: 'center', padding: isMobile ? '30px 16px' : '40px 20px' }}>
          <div style={{ fontSize: 13, color: T.text.secondary, marginBottom: 24, maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.7 }}>
            {isRTL
              ? 'הסקירה השבועית נשמרה. לחץ למטה כדי לקבל ניתוח אינטליגנטי של השבוע שלך.'
              : 'Your weekly review has been saved. Click below to generate an intelligent analysis of your trading week.'}
          </div>
          <button
            onClick={handleAnalyze}
            style={{
              padding: isMobile ? '14px 36px' : '16px 48px',
              background: `linear-gradient(135deg, #FFD700, #FFA500)`,
              border: 'none',
              borderRadius: T.radius.lg,
              color: '#000',
              fontWeight: 800,
              fontSize: isMobile ? 14 : 15,
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(255,215,0,0.2), 0 4px 15px rgba(0,0,0,0.3)',
              transition: 'all 0.3s',
              fontFamily: "'JetBrains Mono', monospace",
              width: isMobile ? '100%' : 'auto',
            }}
          >
            {isRTL ? '🔍 נתח את השבוע שלי' : '🔍 Analyze My Week'}
          </button>
        </div>
      )}

      {/* ANALYZING STATE */}
      {analyzing && (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>🧠</div>
          <div style={{ fontSize: 14, color: T.text.secondary, fontFamily: "'JetBrains Mono', monospace" }}>
            {isRTL ? 'מנתח את השבוע שלך...' : 'Analyzing your week...'}
          </div>
          <div style={{ marginTop: 12, width: 200, height: 3, background: T.bg.tertiary, borderRadius: 2, margin: '12px auto 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: `linear-gradient(90deg, #FFD700, #FFA500)`, borderRadius: 2, animation: 'pulse 1s infinite', width: '60%' }} />
          </div>
        </div>
      )}

      {/* AI ANALYSIS RESULT */}
      {analysis && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <TradingBadge color="#FFD700">{analysis.profile}</TradingBadge>
          </div>

          <GlassCard T={T} style={{ marginBottom: 20, borderInlineStart: `3px solid #FFD700` }} glow="rgba(255,215,0,0.06)">
            <div style={{ fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, fontWeight: 700 }}>
              {isRTL ? 'ניתוח שבועי' : 'Weekly Analysis'}
            </div>
            <div style={{ fontSize: 13, color: T.text.primary, lineHeight: 1.9 }}>
              {analysis.narrative}
            </div>
          </GlassCard>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (analysis.strengths.length > 0 && analysis.weaknesses.length > 0 ? '1fr 1fr' : '1fr'), gap: 14, marginBottom: 20 }}>
            {analysis.strengths.length > 0 && (
              <GlassCard T={T} glow="rgba(0,255,163,0.04)">
                <div style={{ fontSize: 10, color: '#00FFA3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
                  {isRTL ? 'חוזקות' : 'Strengths'}
                </div>
                {analysis.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.text.secondary, marginBottom: 6, paddingInlineStart: 10, borderInlineStart: '2px solid #00FFA320', lineHeight: 1.6 }}>
                    {s}
                  </div>
                ))}
              </GlassCard>
            )}
            {analysis.weaknesses.length > 0 && (
              <GlassCard T={T} glow="rgba(255,77,77,0.04)">
                <div style={{ fontSize: 10, color: '#FF4D4D', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
                  {isRTL ? 'חולשות' : 'Weaknesses'}
                </div>
                {analysis.weaknesses.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.text.secondary, marginBottom: 6, paddingInlineStart: 10, borderInlineStart: '2px solid #FF4D4D20', lineHeight: 1.6 }}>
                    {w}
                  </div>
                ))}
              </GlassCard>
            )}
          </div>

          {analysis.patterns.length > 0 && (
            <GlassCard T={T} style={{ marginBottom: 20 }} glow="rgba(90,169,255,0.04)">
              <div style={{ fontSize: 10, color: '#5AA9FF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 }}>
                {isRTL ? 'דפוסים שזוהו' : 'Identified Patterns'}
              </div>
              {analysis.patterns.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: T.text.secondary, marginBottom: 6, paddingInlineStart: 10, borderInlineStart: '2px solid #5AA9FF20', lineHeight: 1.6 }}>
                  ⚡ {p}
                </div>
              ))}
            </GlassCard>
          )}

          <GlassCard T={T} style={{ marginBottom: 20, borderInlineStart: `3px solid #FFD700` }} glow="rgba(255,215,0,0.04)">
            <div style={{ fontSize: 10, color: '#FFD700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontWeight: 700 }}>
              {isRTL ? 'מסקנות לשבוע הבא' : 'Actionable Takeaways'}
            </div>
            {analysis.takeaways.map((t, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text.primary, marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.7 }}>{t.text}</div>
              </div>
            ))}
          </GlassCard>

          {dp.totalTrades > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20, opacity: 0.6 }}>
              <div style={{ fontSize: 10, color: T.text.muted }}>{dp.totalTrades} {isRTL ? 'עסקאות' : 'trades'}</div>
              <div style={{ fontSize: 10, color: T.text.muted }}>•</div>
              <div style={{ fontSize: 10, color: dp.winRate >= 50 ? '#00FFA3' : '#FF4D4D' }}>{dp.winRate.toFixed(0)}% WR</div>
              <div style={{ fontSize: 10, color: T.text.muted }}>•</div>
              <div style={{ fontSize: 10, color: dp.totalR >= 0 ? '#00FFA3' : '#FF4D4D' }}>{dp.totalR.toFixed(1)}R</div>
              <div style={{ fontSize: 10, color: T.text.muted }}>•</div>
              <div style={{ fontSize: 10, color: T.text.muted }}>{dp.rulesFollowed.toFixed(0)}% {isRTL ? 'משמעת' : 'discipline'}</div>
            </div>
          )}
        </div>
      )}

      {/* Archives */}
      {!viewingArchive && archivedWeeks.filter(w => w !== weekKey).length > 0 && (
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${T.border.subtle}` }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            {isRTL ? 'ארכיון סקירות' : 'Review Archive'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {archivedWeeks.filter(w => w !== weekKey).map(wk => (
              <button key={wk} onClick={() => { setViewingArchive(wk); setAnalysis(null); }} style={{ padding: '6px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.2s' }}>
                {wk}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

export const WeeklyReviewPage = ({ T, isRTL, trades, stats, riskData }: Props) => {
  const isMobile = useIsMobile();
  const weekKey = getWeekKey(new Date());
  const weekTrades = useMemo(() => getWeekTrades(trades), [trades]);
  const perf = useMemo(() => computeWeeklyPerf(weekTrades), [weekTrades]);

  const [review, setReview] = useState<WeeklyReviewData>(() => {
    const loaded = loadReview(weekKey);
    const availability = getReviewAvailability(weekKey);
    if (loaded.completedAt) return { ...loaded, status: 'completed' };
    if (availability === 'locked') return { ...loaded, status: 'locked' };
    return { ...loaded, status: 'in_progress' };
  });

  const [activeSection, setActiveSection] = useState(0);
  const [viewingArchive, setViewingArchive] = useState<string | null>(null);
  const [archivedWeeks] = useState(() => getArchivedWeeks());

  const archiveReview = viewingArchive ? loadReview(viewingArchive) : null;
  const displayReview = archiveReview || review;
  const isCompleted = displayReview.status === 'completed';
  const isLocked = review.status === 'locked' && !viewingArchive && !review.completedAt;

  // Smart "start new cycle" — reset for current week if user wants fresh start
  const handleStartNewCycle = useCallback(() => {
    // This is a no-op since the cycle auto-resets with the new weekKey
  }, []);

  // Dynamic checklist items
  const dynamicChecklist = useMemo(() => {
    const items: ChecklistItem[] = [];
    const lossIndices = weekTrades.map((t, i) => t.winLoss === 'Loss' ? i : -1).filter(i => i >= 0);
    const postLossRiskUp = lossIndices.some(i => i < weekTrades.length - 1 && weekTrades[i + 1].risk > weekTrades[i].risk * 1.2);
    if (postLossRiskUp) items.push({ id: 'dyn_revenge', category: 'Discipline', en: 'I acknowledge that risk increased after a loss this week', he: 'אני מכיר בכך שהסיכון עלה אחרי הפסד השבוע' });
    if (weekTrades.length > 15) items.push({ id: 'dyn_overtrade', category: 'Process', en: 'I recognize I may have overtraded this week', he: 'אני מכיר בכך שאולי ביצעתי מסחר יתר השבוע' });
    let mxConsec = 0, c = 0;
    weekTrades.forEach(t => { if (t.winLoss === 'Loss') { c++; mxConsec = Math.max(mxConsec, c); } else c = 0; });
    if (mxConsec >= 3) items.push({ id: 'dyn_streak', category: 'Psychology', en: `I had ${mxConsec} consecutive losses — I reflected on how I handled them`, he: `היו לי ${mxConsec} הפסדים רצופים — חשבתי איך התמודדתי איתם` });
    if (perf.rulesFollowed < 60 && weekTrades.length > 3) items.push({ id: 'dyn_rules', category: 'Discipline', en: 'I understand my rules adherence was below 60% this week', he: 'אני מבין שהעמידה בכללים שלי הייתה מתחת ל-60% השבוע' });
    return items;
  }, [weekTrades, perf]);

  const allChecklist = [...STATIC_CHECKLIST, ...dynamicChecklist];
  const checklistCategories = [...new Set(allChecklist.map(c => c.category))];

  const updateReview = useCallback((updater: (prev: WeeklyReviewData) => WeeklyReviewData) => {
    setReview(prev => {
      const next = updater(prev);
      saveReview(next);
      return next;
    });
  }, []);

  const handleChecklistToggle = useCallback((id: string) => {
    updateReview(prev => ({ ...prev, checklist: { ...prev.checklist, [id]: !prev.checklist[id] } }));
  }, [updateReview]);

  const handleResponseChange = useCallback((id: string, value: string) => {
    updateReview(prev => ({ ...prev, responses: { ...prev.responses, [id]: value } }));
  }, [updateReview]);

  const handleLessonChange = useCallback((id: string, value: string) => {
    updateReview(prev => ({ ...prev, lessons: { ...prev.lessons, [id]: value } }));
  }, [updateReview]);

  const handleNextWeekChange = useCallback((id: string, value: string) => {
    updateReview(prev => ({ ...prev, nextWeekPlan: { ...prev.nextWeekPlan, [id]: value } }));
  }, [updateReview]);

  const handleImageUpload = useCallback((label: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        updateReview(prev => ({
          ...prev,
          tradeImages: [...prev.tradeImages.filter(i => i.label !== label), { label, url }]
        }));
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [updateReview]);

  const handleSubmit = useCallback(() => {
    const profile = getWeekProfile(perf, review.checklist);
    updateReview(prev => ({
      ...prev,
      status: 'completed',
      completedAt: new Date().toISOString(),
      performance: perf,
      weekProfile: profile,
    }));
  }, [perf, review.checklist, updateReview]);

  const weekProfile = useMemo(() => getWeekProfile(perf, review.checklist), [perf, review.checklist]);

  const checklistDone = allChecklist.filter(c => review.checklist[c.id]).length;
  const checklistTotal = allChecklist.length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const textareaStyle = {
    width: '100%', padding: isMobile ? '12px' : '10px 12px',
    background: T.bg.tertiary, border: `1px solid ${T.border.medium}`,
    borderRadius: T.radius.md, color: T.text.primary,
    fontSize: isMobile ? 14 : 12, fontFamily: "'Inter', sans-serif",
    outline: 'none', minHeight: isMobile ? 80 : 60, resize: 'vertical' as const,
    transition: 'border-color 0.2s',
  };
  const labelStyle = {
    fontSize: isMobile ? 11 : 10, color: T.text.secondary,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    marginBottom: 6, display: 'block', fontWeight: 600 as const,
  };

  const sections = perf.totalTrades === 0
    ? [
        { id: 'overview', label: isRTL ? 'סקירה' : 'Overview', icon: '📊' },
        { id: 'no-trades', label: isRTL ? 'ללא עסקאות' : 'No Trades', icon: '⏸️' },
        { id: 'lessons', label: isRTL ? 'לקחים' : 'Lessons', icon: '💡' },
        { id: 'next-week', label: isRTL ? 'הבא' : 'Next Week', icon: '🎯' },
      ]
    : [
        { id: 'overview', label: isRTL ? 'סקירה' : 'Overview', icon: '📊' },
        { id: 'checklist', label: isRTL ? 'צ\'קליסט' : 'Checklist', icon: '✅' },
        { id: 'review', label: isRTL ? 'סקירות' : 'Reviews', icon: '📝' },
        { id: 'images', label: isRTL ? 'תמונות' : 'Images', icon: '📸' },
        { id: 'lessons', label: isRTL ? 'לקחים' : 'Lessons', icon: '💡' },
        { id: 'next-week', label: isRTL ? 'הבא' : 'Next Week', icon: '🎯' },
      ];

  // ═══════════════════════════════════════════════════
  // LOCKED STATE — Smart lifecycle
  // ═══════════════════════════════════════════════════

  if (isLocked && !viewingArchive) {
    const now = new Date();
    const nextFriday = getNextFridayDate();
    const daysUntilFriday = Math.ceil((nextFriday.getTime() - now.getTime()) / 86400000);
    const hoursUntil = Math.ceil((nextFriday.getTime() - now.getTime()) / 3600000);

    return (
      <div style={{ padding: isMobile ? 20 : 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: 56, marginBottom: 16, filter: 'drop-shadow(0 0 12px rgba(90,169,255,0.2))' }}>🔒</div>
          <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
            {isRTL ? 'הסקירה השבועית ננעלה' : 'Weekly Review Locked'}
          </div>
          <div style={{ fontSize: isMobile ? 13 : 14, color: T.text.secondary, marginBottom: 20, lineHeight: 1.8, maxWidth: 480, margin: '0 auto 20px' }}>
            {isRTL
              ? `הסקירה השבועית זמינה ביום שישי. נותרו ${daysUntilFriday} ימים.`
              : `The Weekly Review becomes available on Friday. ${daysUntilFriday} day${daysUntilFriday !== 1 ? 's' : ''} remaining.`}
          </div>

          {/* Countdown visual */}
          <div style={{ display: 'inline-flex', gap: 12, padding: '16px 28px', background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl, marginBottom: 24 }}>
            {['M', 'T', 'W', 'T', 'F'].map((d, i) => {
              const dayIndex = i + 1; // Mon=1, Fri=5
              const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Adjust Sun=7
              const isPast = dayIndex < currentDay;
              const isCurrent = dayIndex === currentDay;
              const isFriday = dayIndex === 5;
              return (
                <div key={d} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  background: isFriday ? '#FFD70015' : isPast ? `${T.accent.cyan}10` : isCurrent ? `${T.accent.blue}15` : T.bg.tertiary,
                  color: isFriday ? '#FFD700' : isPast ? T.accent.cyan : isCurrent ? T.accent.blue : T.text.muted,
                  border: `1px solid ${isFriday ? '#FFD70030' : isCurrent ? `${T.accent.blue}30` : 'transparent'}`,
                  transition: 'all 0.2s',
                }}>
                  {d}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 12, color: T.text.muted, textAlign: 'center', marginBottom: 30 }}>
          {isRTL ? 'המשך לסחור ולתעד — הסקירה תחכה לך ביום שישי.' : 'Keep trading and documenting — the review awaits on Friday.'}
        </div>

        {weekTrades.length > 0 && (
          <GlassCard T={T} style={{ maxWidth: 420, margin: '0 auto', textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {isRTL ? 'עדכון ביניים' : 'Mid-Week Snapshot'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{perf.totalTrades}</div><div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>{isRTL ? 'עסקאות' : 'Trades'}</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: perf.winRate >= 50 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{perf.winRate.toFixed(0)}%</div><div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>WR</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: perf.totalR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{perf.totalR.toFixed(1)}R</div><div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>{isRTL ? 'סה"כ R' : 'Total R'}</div></div>
            </div>
          </GlassCard>
        )}

        {archivedWeeks.length > 0 && (
          <div style={{ marginTop: 30, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'סקירות שהושלמו' : 'Completed Reviews'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {archivedWeeks.map(wk => (
                <button key={wk} onClick={() => setViewingArchive(wk)} style={{ padding: '6px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.2s' }}>
                  {wk}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // COMPLETED STATE
  // ═══════════════════════════════════════════════════

  if (isCompleted) {
    return (
      <CompletedView
        T={T} isRTL={isRTL} isMobile={isMobile}
        displayReview={displayReview} perf={perf} weekTrades={weekTrades}
        stats={stats} riskData={riskData} weekKey={weekKey}
        viewingArchive={viewingArchive} setViewingArchive={setViewingArchive}
        archivedWeeks={archivedWeeks} onStartNewCycle={handleStartNewCycle}
      />
    );
  }

  // ═══════════════════════════════════════════════════
  // ACTIVE REVIEW — PROGRESS BAR
  // ═══════════════════════════════════════════════════

  const totalSections = sections.length;
  const progressPct = Math.round(((activeSection + 1) / totalSections) * 100);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 14 : 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: isMobile ? 22 : 28 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
              {isRTL ? 'סקירה שבועית' : 'Weekly Review'} — {weekKey}
            </div>
            <TradingBadge color={T.accent.orange}>{weekProfile}</TradingBadge>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: T.text.muted }}>{isRTL ? 'התקדמות' : 'Progress'}</span>
            <span style={{ fontSize: 10, color: T.accent.cyan, fontWeight: 700 }}>{progressPct}%</span>
          </div>
          <div style={{ height: 4, background: T.bg.tertiary, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${T.accent.cyan}, ${T.accent.teal})`, borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: isMobile ? 10 : 16, flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'עסקאות:' : 'Trades:'} <span style={{ color: T.text.primary, fontWeight: 700 }}>{perf.totalTrades}</span></div>
          <div style={{ fontSize: 11, color: T.text.muted }}>WR: <span style={{ color: perf.winRate >= 50 ? T.accent.green : T.accent.red, fontWeight: 700 }}>{perf.winRate.toFixed(0)}%</span></div>
          <div style={{ fontSize: 11, color: T.text.muted }}>R: <span style={{ color: perf.totalR >= 0 ? T.accent.green : T.accent.red, fontWeight: 700 }}>{perf.totalR.toFixed(1)}</span></div>
          <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'צ\'קליסט:' : 'Checklist:'} <span style={{ color: T.accent.cyan, fontWeight: 700 }}>{checklistPct}%</span></div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: isMobile ? 6 : 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 6, WebkitOverflowScrolling: 'touch' }}>
        {sections.map((sec, i) => (
          <button key={sec.id} onClick={() => setActiveSection(i)} style={{
            padding: isMobile ? '10px 14px' : '8px 14px',
            background: activeSection === i ? `${T.accent.cyan}12` : T.bg.tertiary,
            border: `1px solid ${activeSection === i ? `${T.accent.cyan}40` : T.border.subtle}`,
            borderRadius: T.radius.md,
            color: activeSection === i ? T.accent.cyan : T.text.secondary,
            cursor: 'pointer', fontSize: isMobile ? 12 : 11, fontWeight: activeSection === i ? 700 : 400,
            whiteSpace: 'nowrap', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6,
            flexShrink: 0,
          }}>
            <span>{sec.icon}</span> <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ SECTION: OVERVIEW ═══ */}
      {sections[activeSection]?.id === 'overview' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            <MetricCard T={T} label={isRTL ? 'עסקאות' : 'Trades'} value={String(perf.totalTrades)} color={T.text.primary} />
            <MetricCard T={T} label="Win Rate" value={perf.winRate.toFixed(0)} suffix="%" color={perf.winRate >= 50 ? T.accent.green : T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'סה"כ R' : 'Total R'} value={perf.totalR.toFixed(1)} suffix="R" color={perf.totalR >= 0 ? T.accent.green : T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'ממוצע R' : 'Avg R'} value={perf.avgR.toFixed(2)} suffix="R" color={perf.avgR >= 0 ? T.accent.green : T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'עסקה טובה' : 'Best'} value={`$${perf.bestTrade.toFixed(2)}`} color={T.accent.green} />
            <MetricCard T={T} label={isRTL ? 'עסקה גרועה' : 'Worst'} value={`$${perf.worstTrade.toFixed(2)}`} color={T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'משמעת' : 'Discipline'} value={perf.rulesFollowed.toFixed(0)} suffix="%" color={perf.rulesFollowed >= 70 ? T.accent.green : T.accent.orange} />
            <MetricCard T={T} label={isRTL ? 'נסיגה' : 'Max DD'} value={`$${perf.maxDrawdown.toFixed(2)}`} color={T.accent.red} />
          </div>

          <GlassCard T={T} glow={`${T.accent.purple}08`} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {isRTL ? 'פרופיל שבועי' : 'Weekly Profile'}
            </div>
            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace" }}>
              {weekProfile}
            </div>
          </GlassCard>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setActiveSection(1)} style={{ padding: '8px 20px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 700, cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }}>
              {isRTL ? 'המשך →' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ SECTION: NO TRADES ═══ */}
      {sections[activeSection]?.id === 'no-trades' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <GlassCard T={T} style={{ marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⏸️</div>
            <div style={{ fontSize: 13, color: T.text.secondary }}>
              {isRTL ? 'לא היו עסקאות השבוע. זה עדיין נתון חשוב.' : 'No trades this week. This is still meaningful data.'}
            </div>
          </GlassCard>
          {NO_TRADES_QUESTIONS.map(q => (
            <div key={q.id} style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{isRTL ? q.he : q.en}</label>
              <textarea
                value={review.responses[q.id] || ''}
                onChange={e => handleResponseChange(q.id, e.target.value)}
                style={textareaStyle}
                placeholder={isRTL ? 'כתוב את תשובתך...' : 'Write your answer...'}
              />
            </div>
          ))}
        </div>
      )}

      {/* ═══ SECTION: CHECKLIST ═══ */}
      {sections[activeSection]?.id === 'checklist' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: T.text.muted }}>{checklistDone}/{checklistTotal}</span>
              <span style={{ fontSize: 10, color: T.accent.cyan, fontWeight: 700 }}>{checklistPct}%</span>
            </div>
            <div style={{ height: 6, background: T.bg.tertiary, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${checklistPct}%`, background: `linear-gradient(90deg, ${T.accent.cyan}, ${T.accent.teal})`, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {checklistCategories.map(cat => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.cyan, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {cat}
              </div>
              {allChecklist.filter(c => c.category === cat).map(item => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: isMobile ? '10px 10px' : '8px 10px', background: review.checklist[item.id] ? `${T.accent.cyan}06` : 'transparent', borderRadius: T.radius.sm, cursor: 'pointer', marginBottom: 2, transition: 'background 0.2s' }}>
                  <input
                    type="checkbox"
                    checked={!!review.checklist[item.id]}
                    onChange={() => handleChecklistToggle(item.id)}
                    style={{ marginTop: 2, accentColor: T.accent.cyan, width: isMobile ? 18 : 14, height: isMobile ? 18 : 14 }}
                  />
                  <span style={{ fontSize: isMobile ? 13 : 12, color: review.checklist[item.id] ? T.text.primary : T.text.secondary, lineHeight: 1.5 }}>
                    {isRTL ? item.he : item.en}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ═══ SECTION: REVIEWS ═══ */}
      {sections[activeSection]?.id === 'review' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {RESPONSE_SECTIONS.map(sec => (
            <GlassCard T={T} key={sec.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 700, color: T.text.primary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{sec.icon}</span>
                <span>{isRTL ? sec.titleHe : sec.titleEn}</span>
              </div>
              {sec.questions.map(q => (
                <div key={q.id} style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>{isRTL ? q.he : q.en}</label>
                  <textarea
                    value={review.responses[q.id] || ''}
                    onChange={e => handleResponseChange(q.id, e.target.value)}
                    style={textareaStyle}
                    placeholder={isRTL ? 'כתוב את תשובתך...' : 'Write your answer...'}
                  />
                </div>
              ))}
            </GlassCard>
          ))}
        </div>
      )}

      {/* ═══ SECTION: TRADE IMAGES ═══ */}
      {sections[activeSection]?.id === 'images' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16 }}>
            {isRTL ? 'צרף צילומי מסך של עסקאות מפתח מהשבוע' : 'Attach screenshots of key trades from the week'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {TRADE_IMAGE_LABELS.map(img => {
              const existing = review.tradeImages.find(i => i.label === (isRTL ? img.he : img.en));
              return (
                <GlassCard T={T} key={img.id} style={{ textAlign: 'center', padding: isMobile ? 12 : 20 }}>
                  <div style={{ fontSize: isMobile ? 9 : 10, color: T.accent.cyan, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>{isRTL ? img.he : img.en}</div>
                  {existing ? (
                    <img src={existing.url} alt={isRTL ? img.he : img.en} style={{ width: '100%', borderRadius: T.radius.sm, marginBottom: 6 }} />
                  ) : (
                    <div style={{ height: isMobile ? 70 : 100, background: T.bg.tertiary, borderRadius: T.radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, border: `1px dashed ${T.border.medium}` }}>
                      <span style={{ fontSize: 24, opacity: 0.3 }}>📸</span>
                    </div>
                  )}
                  <button onClick={() => handleImageUpload(isRTL ? img.he : img.en)} style={{ padding: '6px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.sm, color: T.text.secondary, cursor: 'pointer', fontSize: isMobile ? 11 : 10, width: '100%', transition: 'all 0.2s' }}>
                    {existing ? (isRTL ? 'החלף' : 'Replace') : (isRTL ? 'העלה' : 'Upload')}
                  </button>
                </GlassCard>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SECTION: LESSONS ═══ */}
      {sections[activeSection]?.id === 'lessons' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16, lineHeight: 1.6 }}>
            {isRTL ? 'הפק לקחים אמיתיים מהשבוע — לא רק נתונים.' : 'Extract real lessons from the week — not just data.'}
          </div>
          {LESSON_FIELDS.map(f => (
            <div key={f.id} style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{isRTL ? f.he : f.en}</label>
              <textarea
                value={review.lessons[f.id] || ''}
                onChange={e => handleLessonChange(f.id, e.target.value)}
                style={textareaStyle}
                placeholder={isRTL ? 'כתוב את הלקח...' : 'Write your lesson...'}
              />
            </div>
          ))}
        </div>
      )}

      {/* ═══ SECTION: NEXT WEEK ═══ */}
      {sections[activeSection]?.id === 'next-week' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16, lineHeight: 1.6 }}>
            {isRTL ? 'תכנן את השבוע הבא בכוונה ברורה.' : 'Plan next week with clear intention.'}
          </div>
          {NEXT_WEEK_FIELDS.map(f => (
            <div key={f.id} style={{ marginBottom: 18 }}>
              <label style={labelStyle}>{isRTL ? f.he : f.en}</label>
              <textarea
                value={review.nextWeekPlan[f.id] || ''}
                onChange={e => handleNextWeekChange(f.id, e.target.value)}
                style={textareaStyle}
                placeholder={isRTL ? 'כתוב את התוכנית...' : 'Write your plan...'}
              />
            </div>
          ))}

          <div style={{ marginTop: 30, textAlign: 'center' }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: isMobile ? '14px 30px' : '14px 40px',
                background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                border: 'none',
                borderRadius: T.radius.lg,
                color: T.bg.primary,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: `0 0 20px ${T.accent.cyan}25`,
                fontFamily: "'JetBrains Mono', monospace",
                width: isMobile ? '100%' : 'auto',
                transition: 'all 0.3s',
              }}
            >
              {isRTL ? '📋 שלח סקירה שבועית' : '📋 Submit Weekly Review'}
            </button>
            <div style={{ fontSize: 10, color: T.text.muted, marginTop: 8 }}>
              {isRTL ? 'לאחר השליחה, הסקירה תיסגר ותישמר לארכיון עד יום שישי הבא.' : 'Once submitted, this review will be locked and archived until next Friday.'}
            </div>
          </div>
        </div>
      )}

      {/* Section navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        {activeSection > 0 ? (
          <button onClick={() => setActiveSection(activeSection - 1)} style={{ padding: '8px 18px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12, transition: 'all 0.2s' }}>
            ← {isRTL ? 'הקודם' : 'Previous'}
          </button>
        ) : <div />}
        {activeSection < sections.length - 1 && (
          <button onClick={() => setActiveSection(activeSection + 1)} style={{ padding: '8px 18px', background: `${T.accent.cyan}10`, border: `1px solid ${T.accent.cyan}30`, borderRadius: T.radius.md, color: T.accent.cyan, cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}>
            {isRTL ? 'הבא' : 'Next'} →
          </button>
        )}
      </div>
    </div>
  );
};
