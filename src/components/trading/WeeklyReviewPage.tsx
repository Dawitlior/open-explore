import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import type { RiskAssessment } from '@/lib/risk-engine';
import { GlassCard, MetricCard, ScoreGauge, TradingBadge } from './TradingUI';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════

interface WeeklyReviewData {
  weekKey: string; // e.g. "2026-W11"
  completedAt?: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  // Performance snapshot
  performance?: WeeklyPerformance;
  // Checklist answers
  checklist: Record<string, boolean>;
  // Text responses
  responses: Record<string, string>;
  // Lessons
  lessons: Record<string, string>;
  // Next week plan
  nextWeekPlan: Record<string, string>;
  // Trade images
  tradeImages: { label: string; url: string }[];
  // Risk explanations
  riskExplanations: string[];
  // Weekly profile
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

function isFriday(): boolean {
  return new Date().getDay() === 5;
}

function isFridayOrWeekend(): boolean {
  const day = new Date().getDay();
  return day === 5 || day === 6 || day === 0;
}

function getWeekTrades(trades: Trade[]): Trade[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Start of this week (Monday)
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
    winRate: weekTrades.length > 0 ? (wins / weekTrades.length) * 100 : 0,
    totalR, avgR: totalR / weekTrades.length,
    bestTrade: Math.max(...pnls), worstTrade: Math.min(...pnls),
    avgRisk: weekTrades.reduce((s, t) => s + t.risk, 0) / weekTrades.length,
    maxDrawdown: dd,
    rulesFollowed: weekTrades.length > 0 ? (rulesFollowed / weekTrades.length) * 100 : 0,
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
  // Discipline
  { id: 'd1', category: 'Discipline', en: 'I followed my trading plan consistently', he: 'עקבתי אחרי תוכנית המסחר שלי בעקביות' },
  { id: 'd2', category: 'Discipline', en: 'I did not add to losing positions', he: 'לא הוספתי לפוזיציות מפסידות' },
  { id: 'd3', category: 'Discipline', en: 'I respected my stop losses without moving them', he: 'כיבדתי את הסטופים שלי בלי להזיז אותם' },
  { id: 'd4', category: 'Discipline', en: 'I waited for valid setups before entering', he: 'חיכיתי לסטאפים תקינים לפני כניסה' },
  { id: 'd5', category: 'Discipline', en: 'I did not revenge trade after losses', he: 'לא ביצעתי מסחר נקמה אחרי הפסדים' },
  // Risk
  { id: 'r1', category: 'Risk', en: 'My position sizing stayed within plan limits', he: 'גודל הפוזיציות שלי נשאר בגבולות התוכנית' },
  { id: 'r2', category: 'Risk', en: 'I did not exceed my daily risk limit', he: 'לא חרגתי ממגבלת הסיכון היומית' },
  { id: 'r3', category: 'Risk', en: 'Risk per trade remained consistent', he: 'הסיכון לעסקה נשאר עקבי' },
  { id: 'r4', category: 'Risk', en: 'I reduced size after consecutive losses', he: 'הקטנתי גודל אחרי הפסדים רצופים' },
  { id: 'r5', category: 'Risk', en: 'I did not increase risk based on emotion', he: 'לא הגדלתי סיכון מתוך רגש' },
  // Strategy
  { id: 's1', category: 'Strategy', en: 'I only traded setups from my playbook', he: 'סחרתי רק סטאפים מהפלייבוק שלי' },
  { id: 's2', category: 'Strategy', en: 'I avoided FOMO entries', he: 'נמנעתי מכניסות FOMO' },
  { id: 's3', category: 'Strategy', en: 'My entries were at valid technical levels', he: 'הכניסות שלי היו ברמות טכניות תקפות' },
  { id: 's4', category: 'Strategy', en: 'I adapted to current market conditions', he: 'התאמתי את עצמי לתנאי שוק נוכחיים' },
  // Execution
  { id: 'e1', category: 'Execution', en: 'My entry timing was clean', he: 'תזמון הכניסה שלי היה נקי' },
  { id: 'e2', category: 'Execution', en: 'I managed exits well (not too early/late)', he: 'ניהלתי יציאות היטב (לא מוקדם/מאוחר מדי)' },
  { id: 'e3', category: 'Execution', en: 'I let winners run to target', he: 'נתתי לרווחיות לרוץ ליעד' },
  { id: 'e4', category: 'Execution', en: 'I cut losers quickly', he: 'חתכתי מפסידות מהר' },
  // Psychology
  { id: 'p1', category: 'Psychology', en: 'I maintained emotional control throughout the week', he: 'שמרתי על שליטה רגשית לאורך השבוע' },
  { id: 'p2', category: 'Psychology', en: 'I did not trade while frustrated or anxious', he: 'לא סחרתי כשהייתי מתוסכל או חרד' },
  { id: 'p3', category: 'Psychology', en: 'I accepted losses without emotional reaction', he: 'קיבלתי הפסדים בלי תגובה רגשית' },
  { id: 'p4', category: 'Psychology', en: 'I took breaks when I felt tilted', he: 'לקחתי הפסקות כשהרגשתי tilt' },
  // Process
  { id: 'pr1', category: 'Process', en: 'I journaled every trade this week', he: 'תיעדתי כל עסקה השבוע' },
  { id: 'pr2', category: 'Process', en: 'I reviewed my trades before the next session', he: 'סקרתי את העסקאות שלי לפני הסשן הבא' },
  { id: 'pr3', category: 'Process', en: 'I had a pre-market routine each day', he: 'הייתה לי שגרת pre-market כל יום' },
  // Consistency
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

function loadReview(weekKey: string): WeeklyReviewData {
  try {
    const raw = localStorage.getItem(`orca-weekly-${weekKey}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { weekKey, status: 'available', checklist: {}, responses: {}, lessons: {}, nextWeekPlan: {}, tradeImages: [], riskExplanations: [] };
}

function saveReview(data: WeeklyReviewData) {
  localStorage.setItem(`orca-weekly-${data.weekKey}`, JSON.stringify(data));
  // Also save to archive index
  try {
    const idx = JSON.parse(localStorage.getItem('orca-weekly-index') || '[]') as string[];
    if (!idx.includes(data.weekKey)) { idx.push(data.weekKey); localStorage.setItem('orca-weekly-index', JSON.stringify(idx)); }
  } catch { /* ignore */ }
}

function getArchivedWeeks(): string[] {
  try { return JSON.parse(localStorage.getItem('orca-weekly-index') || '[]'); } catch { return []; }
}

// ═══════════════════════════════════════════════════
// INSIGHT GENERATION
// ═══════════════════════════════════════════════════

function generateWeeklyInsights(perf: WeeklyPerformance, weekTrades: Trade[], review: WeeklyReviewData, isRTL: boolean): string[] {
  const insights: string[] = [];
  if (perf.totalTrades === 0) {
    insights.push(isRTL ? 'שבוע ללא פעילות — חשוב לנתח אם זו הייתה החלטה מושכלת או הימנעות' : 'No-activity week — important to analyze whether this was a deliberate decision or avoidance');
    return insights;
  }

  // Performance quality vs process quality
  if (perf.totalR > 0 && perf.rulesFollowed < 60) {
    insights.push(isRTL ? '⚠️ רווחי אבל מרושל — התוצאות חיוביות אבל המשמעת נמוכה. זה לא בר-קיימא.' : '⚠️ Profitable but sloppy — results are positive but discipline is low. This is not sustainable.');
  }
  if (perf.totalR < 0 && perf.rulesFollowed > 80) {
    insights.push(isRTL ? '✅ תהליך טוב, תוצאות גרועות — המשמעת גבוהה למרות הפסדים. המשך לסמוך על התהליך.' : '✅ Good process, bad results — discipline stayed high despite losses. Keep trusting the process.');
  }

  // Risk escalation
  if (weekTrades.length >= 3) {
    const firstHalf = weekTrades.slice(0, Math.floor(weekTrades.length / 2));
    const secondHalf = weekTrades.slice(Math.floor(weekTrades.length / 2));
    const avgRiskFirst = firstHalf.reduce((s, t) => s + t.risk, 0) / firstHalf.length;
    const avgRiskSecond = secondHalf.reduce((s, t) => s + t.risk, 0) / secondHalf.length;
    if (avgRiskSecond > avgRiskFirst * 1.3) {
      insights.push(isRTL ? '📈 סיכון עלה לאורך השבוע — הגודל הממוצע עלה ב-30%+ מהחצי הראשון לשני' : '📈 Risk escalated through the week — average size increased 30%+ from first to second half');
    }
  }

  // Post-loss behavior
  const lossIndices = weekTrades.map((t, i) => t.winLoss === 'Loss' ? i : -1).filter(i => i >= 0);
  const postLossRiskUp = lossIndices.filter(i => i < weekTrades.length - 1 && weekTrades[i + 1].risk > weekTrades[i].risk * 1.2).length;
  if (postLossRiskUp > 0) {
    insights.push(isRTL ? `💥 נמצאו ${postLossRiskUp} מקרים שבהם הסיכון עלה אחרי הפסד — סימן אפשרי למסחר נקמה` : `💥 Found ${postLossRiskUp} instances where risk increased after a loss — possible revenge trading signal`);
  }

  // Win rate interpretation
  if (perf.winRate > 65) {
    insights.push(isRTL ? '🎯 אחוז הצלחה גבוה מ-65% — ודא שזה לא בגלל יציאות מוקדמות מרווחיות' : '🎯 Win rate above 65% — ensure this isn\'t because you\'re exiting winners too early');
  }
  if (perf.winRate < 35 && perf.totalTrades > 5) {
    insights.push(isRTL ? '🔴 אחוז הצלחה מתחת ל-35% — בדוק את איכות הסטאפים ותזמון הכניסה' : '🔴 Win rate below 35% — review setup quality and entry timing');
  }

  // Overtrading
  if (perf.totalTrades > 20) {
    insights.push(isRTL ? '⚡ מעל 20 עסקאות — שקול אם חלקן היו אימפולסיביות' : '⚡ Over 20 trades this week — consider whether some were impulsive');
  }

  // Deviation
  if (perf.avgDeviation > 0.12) {
    insights.push(isRTL ? '📊 סטייה ממוצעת גבוהה — הביצוע לא עקבי עם התכנון' : '📊 High average deviation — execution is not consistent with planning');
  }

  // Drawdown
  if (perf.maxDrawdown > perf.avgRisk * 4) {
    insights.push(isRTL ? '📉 נסיגה מקסימלית גדולה מ-4R — לחץ פסיכולוגי משמעותי סביר' : '📉 Max drawdown exceeded 4R — significant psychological pressure likely');
  }

  return insights;
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════

export const WeeklyReviewPage = ({ T, isRTL, trades, stats, riskData }: Props) => {
  const weekKey = getWeekKey(new Date());
  const fridayActive = isFridayOrWeekend();
  const weekTrades = useMemo(() => getWeekTrades(trades), [trades]);
  const perf = useMemo(() => computeWeeklyPerf(weekTrades), [weekTrades]);

  const [review, setReview] = useState<WeeklyReviewData>(() => {
    const loaded = loadReview(weekKey);
    if (loaded.completedAt) return { ...loaded, status: 'completed' };
    if (!fridayActive) return { ...loaded, status: 'locked' };
    return { ...loaded, status: loaded.status === 'completed' ? 'completed' : 'in_progress' };
  });

  const [activeSection, setActiveSection] = useState(0);
  const [viewingArchive, setViewingArchive] = useState<string | null>(null);
  const [archivedWeeks] = useState(() => getArchivedWeeks());

  const archiveReview = viewingArchive ? loadReview(viewingArchive) : null;
  const displayReview = archiveReview || review;
  const isCompleted = displayReview.status === 'completed';
  const isLocked = displayReview.status === 'locked' && !viewingArchive;

  // Dynamic checklist items based on week data
  const dynamicChecklist = useMemo(() => {
    const items: ChecklistItem[] = [];
    // If risk increased after losses
    const lossIndices = weekTrades.map((t, i) => t.winLoss === 'Loss' ? i : -1).filter(i => i >= 0);
    const postLossRiskUp = lossIndices.some(i => i < weekTrades.length - 1 && weekTrades[i + 1].risk > weekTrades[i].risk * 1.2);
    if (postLossRiskUp) {
      items.push({ id: 'dyn_revenge', category: 'Discipline', en: 'I acknowledge that risk increased after a loss this week', he: 'אני מכיר בכך שהסיכון עלה אחרי הפסד השבוע' });
    }
    // Overtrading
    if (weekTrades.length > 15) {
      items.push({ id: 'dyn_overtrade', category: 'Process', en: 'I recognize I may have overtraded this week', he: 'אני מכיר בכך שאולי ביצעתי מסחר יתר השבוع' });
    }
    // Consecutive losses
    let maxConsec = 0, consec = 0;
    weekTrades.forEach(t => { if (t.winLoss === 'Loss') { consec++; maxConsec = Math.max(maxConsec, consec); } else consec = 0; });
    if (maxConsec >= 3) {
      items.push({ id: 'dyn_streak', category: 'Psychology', en: `I had ${maxConsec} consecutive losses — I reflected on how I handled them`, he: `היו לי ${maxConsec} הפסדים רצופים — חשבתי איך התמודדתי איתם` });
    }
    // Low rules adherence
    if (perf.rulesFollowed < 60 && weekTrades.length > 3) {
      items.push({ id: 'dyn_rules', category: 'Discipline', en: 'I understand my rules adherence was below 60% this week', he: 'אני מבין שהעמידה בכללים שלי הייתה מתחת ל-60% השבוע' });
    }
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

  const insights = useMemo(() => generateWeeklyInsights(perf, weekTrades, review, isRTL), [perf, weekTrades, review, isRTL]);

  const weekProfile = useMemo(() => getWeekProfile(perf, review.checklist), [perf, review.checklist]);

  // Checklist completion %
  const checklistDone = allChecklist.filter(c => review.checklist[c.id]).length;
  const checklistTotal = allChecklist.length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const sectionStyle = { marginBottom: 24 };
  const labelStyle = { fontSize: 9, color: T.text.dim, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6, display: 'block' };
  const textareaStyle = { width: '100%', padding: '10px 12px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.primary, fontSize: 12, fontFamily: "'Inter', sans-serif", outline: 'none', minHeight: 60, resize: 'vertical' as const };

  // ═══════════════════════════════════════════════════
  // SECTIONS NAVIGATION
  // ═══════════════════════════════════════════════════

  const sections = perf.totalTrades === 0
    ? [
        { id: 'overview', label: isRTL ? 'סקירה' : 'Overview', icon: '📊' },
        { id: 'no-trades', label: isRTL ? 'שבוע ללא עסקאות' : 'No-Trade Week', icon: '⏸️' },
        { id: 'lessons', label: isRTL ? 'לקחים' : 'Lessons', icon: '💡' },
        { id: 'next-week', label: isRTL ? 'שבוע הבא' : 'Next Week', icon: '🎯' },
      ]
    : [
        { id: 'overview', label: isRTL ? 'סקירה' : 'Overview', icon: '📊' },
        { id: 'checklist', label: isRTL ? 'צ\'קליסט' : 'Checklist', icon: '✅' },
        { id: 'review', label: isRTL ? 'סקירות' : 'Reviews', icon: '📝' },
        { id: 'images', label: isRTL ? 'תמונות' : 'Trade Images', icon: '📸' },
        { id: 'lessons', label: isRTL ? 'לקחים' : 'Lessons', icon: '💡' },
        { id: 'next-week', label: isRTL ? 'שבוע הבא' : 'Next Week', icon: '🎯' },
      ];

  // ═══════════════════════════════════════════════════
  // LOCKED STATE
  // ═══════════════════════════════════════════════════

  if (isLocked && !viewingArchive) {
    const now = new Date();
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>
          {isRTL ? 'הסקירה השבועית ננעלה' : 'Weekly Review Locked'}
        </div>
        <div style={{ fontSize: 14, color: T.text.secondary, marginBottom: 24, lineHeight: 1.8 }}>
          {isRTL
            ? `הסקירה השבועית זמינה ביום שישי. נותרו ${daysUntilFriday} ימים.`
            : `The Weekly Review becomes available on Friday. ${daysUntilFriday} days remaining.`}
        </div>
        <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 30 }}>
          {isRTL ? 'המשך לסחור, להתמקד ולתעד — הסקירה תחכה לך ביום שישי.' : 'Keep trading, stay focused, document — the review will be waiting for you on Friday.'}
        </div>
        {/* Quick week stats */}
        {weekTrades.length > 0 && (
          <GlassCard T={T} style={{ maxWidth: 400, margin: '0 auto', textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'עדכון ביניים' : 'Mid-Week Snapshot'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><div style={{ fontSize: 18, fontWeight: 700, color: T.accent.cyan }}>{perf.totalTrades}</div><div style={{ fontSize: 9, color: T.text.muted }}>{isRTL ? 'עסקאות' : 'Trades'}</div></div>
              <div><div style={{ fontSize: 18, fontWeight: 700, color: perf.winRate >= 50 ? T.accent.green : T.accent.red }}>{perf.winRate.toFixed(0)}%</div><div style={{ fontSize: 9, color: T.text.muted }}>WR</div></div>
              <div><div style={{ fontSize: 18, fontWeight: 700, color: perf.totalR >= 0 ? T.accent.green : T.accent.red }}>{perf.totalR.toFixed(1)}R</div><div style={{ fontSize: 9, color: T.text.muted }}>{isRTL ? 'סה"כ R' : 'Total R'}</div></div>
            </div>
          </GlassCard>
        )}
        {/* Archived reviews */}
        {archivedWeeks.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'סקירות שהושלמו' : 'Completed Reviews'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {archivedWeeks.map(wk => (
                <button key={wk} onClick={() => setViewingArchive(wk)} style={{ padding: '6px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
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
    const dp = displayReview.performance || perf;
    const di = generateWeeklyInsights(dp, weekTrades, displayReview, isRTL);
    return (
      <div>
        {viewingArchive && (
          <button onClick={() => setViewingArchive(null)} style={{ marginBottom: 16, padding: '6px 16px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 11 }}>
            ← {isRTL ? 'חזרה' : 'Back'}
          </button>
        )}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
            {isRTL ? 'סיכום שבועי' : 'Weekly Summary'} — {displayReview.weekKey}
          </div>
          {displayReview.weekProfile && (
            <TradingBadge color={T.accent.cyan}>{displayReview.weekProfile}</TradingBadge>
          )}
          {displayReview.completedAt && (
            <div style={{ fontSize: 10, color: T.text.dim, marginTop: 6 }}>
              {isRTL ? 'הושלם:' : 'Completed:'} {new Date(displayReview.completedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Performance metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
          <MetricCard T={T} label={isRTL ? 'עסקאות' : 'Trades'} value={String(dp.totalTrades)} color={T.text.primary} />
          <MetricCard T={T} label="Win Rate" value={dp.winRate.toFixed(0)} suffix="%" color={dp.winRate >= 50 ? T.accent.green : T.accent.red} />
          <MetricCard T={T} label={isRTL ? 'סה"כ R' : 'Total R'} value={dp.totalR.toFixed(1)} suffix="R" color={dp.totalR >= 0 ? T.accent.green : T.accent.red} />
          <MetricCard T={T} label={isRTL ? 'ממוצע R' : 'Avg R'} value={dp.avgR.toFixed(2)} suffix="R" color={dp.avgR >= 0 ? T.accent.green : T.accent.red} />
          <MetricCard T={T} label={isRTL ? 'משמעת' : 'Discipline'} value={dp.rulesFollowed.toFixed(0)} suffix="%" color={dp.rulesFollowed >= 70 ? T.accent.green : T.accent.orange} />
        </div>

        {/* Insights */}
        {di.length > 0 && (
          <GlassCard T={T} style={{ marginBottom: 20 }} glow={`${T.accent.cyan}10`}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'תובנות שבועיות' : 'Weekly Insights'}
            </div>
            {di.map((ins, i) => (
              <div key={i} style={{ fontSize: 12, color: T.text.secondary, marginBottom: 8, lineHeight: 1.7, paddingInlineStart: 8, borderInlineStart: `2px solid ${T.accent.cyan}30` }}>
                {ins}
              </div>
            ))}
          </GlassCard>
        )}

        {/* Checklist summary */}
        <GlassCard T={T} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            {isRTL ? 'צ\'קליסט' : 'Checklist'} — {Object.values(displayReview.checklist).filter(Boolean).length}/{allChecklist.length}
          </div>
          <div style={{ height: 6, background: T.bg.tertiary, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(Object.values(displayReview.checklist).filter(Boolean).length / allChecklist.length) * 100}%`, background: `linear-gradient(90deg, ${T.accent.cyan}, ${T.accent.teal})`, borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </GlassCard>

        {/* Lessons */}
        {Object.keys(displayReview.lessons).length > 0 && (
          <GlassCard T={T} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'לקחים שהופקו' : 'Extracted Lessons'}
            </div>
            {LESSON_FIELDS.filter(f => displayReview.lessons[f.id]).map(f => (
              <div key={f.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T.accent.cyan, fontWeight: 600, marginBottom: 3 }}>{isRTL ? f.he : f.en}</div>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6 }}>{displayReview.lessons[f.id]}</div>
              </div>
            ))}
          </GlassCard>
        )}

        {/* Next week plan */}
        {Object.keys(displayReview.nextWeekPlan).length > 0 && (
          <GlassCard T={T} style={{ marginBottom: 20 }} glow={`${T.accent.green}10`}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'תוכנית שבוע הבא' : 'Next Week Plan'}
            </div>
            {NEXT_WEEK_FIELDS.filter(f => displayReview.nextWeekPlan[f.id]).map(f => (
              <div key={f.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: T.accent.green, fontWeight: 600, marginBottom: 3 }}>{isRTL ? f.he : f.en}</div>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6 }}>{displayReview.nextWeekPlan[f.id]}</div>
              </div>
            ))}
          </GlassCard>
        )}

        {/* Responses summary */}
        {Object.keys(displayReview.responses).length > 0 && (
          <GlassCard T={T} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'תשובות מפורטות' : 'Detailed Responses'}
            </div>
            {RESPONSE_SECTIONS.map(sec => {
              const answered = sec.questions.filter(q => displayReview.responses[q.id]);
              if (answered.length === 0) return null;
              return (
                <div key={sec.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text.primary, marginBottom: 6 }}>{sec.icon} {isRTL ? sec.titleHe : sec.titleEn}</div>
                  {answered.map(q => (
                    <div key={q.id} style={{ marginBottom: 8, paddingInlineStart: 12 }}>
                      <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 2 }}>{isRTL ? q.he : q.en}</div>
                      <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6 }}>{displayReview.responses[q.id]}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </GlassCard>
        )}

        {/* Trade images */}
        {displayReview.tradeImages.length > 0 && (
          <GlassCard T={T} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'תמונות עסקאות' : 'Trade Images'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {displayReview.tradeImages.map((img, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: T.accent.cyan, marginBottom: 4 }}>{img.label}</div>
                  <img src={img.url} alt={img.label} style={{ width: '100%', borderRadius: T.radius.md, border: `1px solid ${T.border.medium}` }} />
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Archives */}
        {!viewingArchive && archivedWeeks.filter(w => w !== weekKey).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              {isRTL ? 'ארכיון סקירות' : 'Review Archive'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {archivedWeeks.filter(w => w !== weekKey).map(wk => (
                <button key={wk} onClick={() => setViewingArchive(wk)} style={{ padding: '6px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
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
  // ACTIVE REVIEW (IN PROGRESS)
  // ═══════════════════════════════════════════════════

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 28 }}>📋</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
              {isRTL ? 'סקירה שבועית' : 'Weekly Review'} — {weekKey}
            </div>
            <TradingBadge color={T.accent.orange}>{weekProfile}</TradingBadge>
          </div>
        </div>
        {/* Quick stats bar */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'עסקאות:' : 'Trades:'} <span style={{ color: T.text.primary, fontWeight: 700 }}>{perf.totalTrades}</span></div>
          <div style={{ fontSize: 11, color: T.text.muted }}>WR: <span style={{ color: perf.winRate >= 50 ? T.accent.green : T.accent.red, fontWeight: 700 }}>{perf.winRate.toFixed(0)}%</span></div>
          <div style={{ fontSize: 11, color: T.text.muted }}>R: <span style={{ color: perf.totalR >= 0 ? T.accent.green : T.accent.red, fontWeight: 700 }}>{perf.totalR.toFixed(1)}</span></div>
          <div style={{ fontSize: 11, color: T.text.muted }}>{isRTL ? 'צ\'קליסט:' : 'Checklist:'} <span style={{ color: T.accent.cyan, fontWeight: 700 }}>{checklistPct}%</span></div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {sections.map((sec, i) => (
          <button key={sec.id} onClick={() => setActiveSection(i)} style={{
            padding: '8px 14px', background: activeSection === i ? `${T.accent.cyan}15` : T.bg.tertiary,
            border: `1px solid ${activeSection === i ? T.accent.cyan : T.border.subtle}`,
            borderRadius: T.radius.md, color: activeSection === i ? T.accent.cyan : T.text.secondary,
            cursor: 'pointer', fontSize: 11, fontWeight: activeSection === i ? 700 : 400,
            whiteSpace: 'nowrap', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{sec.icon}</span> <span>{sec.label}</span>
          </button>
        ))}
      </div>

      {/* Insights bar */}
      {insights.length > 0 && activeSection === 0 && (
        <GlassCard T={T} style={{ marginBottom: 20, borderInlineStart: `3px solid ${T.accent.cyan}` }} glow={`${T.accent.cyan}08`}>
          <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            {isRTL ? 'תובנות אוטומטיות' : 'Automated Insights'}
          </div>
          {insights.map((ins, i) => (
            <div key={i} style={{ fontSize: 12, color: T.text.secondary, marginBottom: 6, lineHeight: 1.7 }}>{ins}</div>
          ))}
        </GlassCard>
      )}

      {/* ═══ SECTION: OVERVIEW ═══ */}
      {sections[activeSection]?.id === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            <MetricCard T={T} label={isRTL ? 'עסקאות' : 'Trades'} value={String(perf.totalTrades)} color={T.text.primary} />
            <MetricCard T={T} label="Win Rate" value={perf.winRate.toFixed(0)} suffix="%" color={perf.winRate >= 50 ? T.accent.green : T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'סה"כ R' : 'Total R'} value={perf.totalR.toFixed(1)} suffix="R" color={perf.totalR >= 0 ? T.accent.green : T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'ממוצע R' : 'Avg R'} value={perf.avgR.toFixed(2)} suffix="R" color={perf.avgR >= 0 ? T.accent.green : T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'עסקה טובה' : 'Best Trade'} value={`$${perf.bestTrade.toFixed(2)}`} color={T.accent.green} />
            <MetricCard T={T} label={isRTL ? 'עסקה גרועה' : 'Worst Trade'} value={`$${perf.worstTrade.toFixed(2)}`} color={T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'סיכון ממוצע' : 'Avg Risk'} value={`$${perf.avgRisk.toFixed(2)}`} color={T.accent.orange} />
            <MetricCard T={T} label={isRTL ? 'משמעת' : 'Discipline'} value={perf.rulesFollowed.toFixed(0)} suffix="%" color={perf.rulesFollowed >= 70 ? T.accent.green : T.accent.orange} />
            <MetricCard T={T} label={isRTL ? 'נסיגה מקס' : 'Max DD'} value={`$${perf.maxDrawdown.toFixed(2)}`} color={T.accent.red} />
            <MetricCard T={T} label={isRTL ? 'סטייה' : 'Avg Deviation'} value={perf.avgDeviation.toFixed(3)} color={perf.avgDeviation > 0.1 ? T.accent.red : T.accent.green} />
          </div>

          {/* Week profile card */}
          <GlassCard T={T} glow={`${T.accent.purple}10`} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {isRTL ? 'פרופיל שבועי' : 'Weekly Profile'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace" }}>
              {weekProfile}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ═══ SECTION: NO TRADES ═══ */}
      {sections[activeSection]?.id === 'no-trades' && (
        <div>
          <GlassCard T={T} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>⏸️</div>
            <div style={{ fontSize: 14, color: T.text.secondary, textAlign: 'center', marginBottom: 20 }}>
              {isRTL ? 'לא היו עסקאות השבוע. זה עדיין נתון חשוב.' : 'No trades this week. This is still meaningful data.'}
            </div>
          </GlassCard>
          {NO_TRADES_QUESTIONS.map(q => (
            <div key={q.id} style={sectionStyle}>
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
        <div>
          {/* Progress bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: T.text.muted }}>{checklistDone}/{checklistTotal}</span>
              <span style={{ fontSize: 10, color: T.accent.cyan, fontWeight: 700 }}>{checklistPct}%</span>
            </div>
            <div style={{ height: 6, background: T.bg.tertiary, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${checklistPct}%`, background: `linear-gradient(90deg, ${T.accent.cyan}, ${T.accent.teal})`, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>

          {checklistCategories.map(cat => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.cyan, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {cat}
              </div>
              {allChecklist.filter(c => c.category === cat).map(item => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: review.checklist[item.id] ? `${T.accent.cyan}08` : 'transparent', borderRadius: T.radius.sm, cursor: 'pointer', marginBottom: 2, transition: 'background 0.15s' }}>
                  <input
                    type="checkbox"
                    checked={!!review.checklist[item.id]}
                    onChange={() => handleChecklistToggle(item.id)}
                    style={{ marginTop: 2, accentColor: T.accent.cyan }}
                  />
                  <span style={{ fontSize: 12, color: review.checklist[item.id] ? T.text.primary : T.text.secondary, lineHeight: 1.5 }}>
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
        <div>
          {RESPONSE_SECTIONS.map(sec => (
            <GlassCard T={T} key={sec.id} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
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
        <div>
          <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16 }}>
            {isRTL ? 'צרף צילומי מסך של עסקאות מפתח מהשבוע' : 'Attach screenshots of key trades from the week'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {TRADE_IMAGE_LABELS.map(img => {
              const existing = review.tradeImages.find(i => i.label === (isRTL ? img.he : img.en));
              return (
                <GlassCard T={T} key={img.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: T.accent.cyan, fontWeight: 600, marginBottom: 8 }}>{isRTL ? img.he : img.en}</div>
                  {existing ? (
                    <img src={existing.url} alt={isRTL ? img.he : img.en} style={{ width: '100%', borderRadius: T.radius.sm, marginBottom: 6 }} />
                  ) : (
                    <div style={{ height: 100, background: T.bg.tertiary, borderRadius: T.radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, border: `1px dashed ${T.border.medium}` }}>
                      <span style={{ fontSize: 24, opacity: 0.3 }}>📸</span>
                    </div>
                  )}
                  <button onClick={() => handleImageUpload(isRTL ? img.he : img.en)} style={{ padding: '4px 12px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.sm, color: T.text.secondary, cursor: 'pointer', fontSize: 10 }}>
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
        <div>
          <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16 }}>
            {isRTL ? 'הפק לקחים אמיתיים מהשבוע — לא רק נתונים.' : 'Extract real lessons from the week — not just data.'}
          </div>
          {LESSON_FIELDS.map(f => (
            <div key={f.id} style={sectionStyle}>
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
        <div>
          <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16 }}>
            {isRTL ? 'תכנן את השבוע הבא בכוונה ברורה.' : 'Plan next week with clear intention.'}
          </div>
          {NEXT_WEEK_FIELDS.map(f => (
            <div key={f.id} style={sectionStyle}>
              <label style={labelStyle}>{isRTL ? f.he : f.en}</label>
              <textarea
                value={review.nextWeekPlan[f.id] || ''}
                onChange={e => handleNextWeekChange(f.id, e.target.value)}
                style={textareaStyle}
                placeholder={isRTL ? 'כתוב את התוכנית...' : 'Write your plan...'}
              />
            </div>
          ))}

          {/* Submit button — only on last section */}
          <div style={{ marginTop: 30, textAlign: 'center' }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: '14px 40px',
                background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                border: 'none',
                borderRadius: T.radius.lg,
                color: T.bg.primary,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: `0 0 20px ${T.accent.cyan}30`,
                transition: 'all 0.3s',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {isRTL ? '📋 שלח סקירה שבועית' : '📋 Submit Weekly Review'}
            </button>
            <div style={{ fontSize: 10, color: T.text.dim, marginTop: 8 }}>
              {isRTL ? 'לאחר השליחה, הסקירה תיסגר ותישמר לארכיון.' : 'Once submitted, this review will be closed and archived.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
