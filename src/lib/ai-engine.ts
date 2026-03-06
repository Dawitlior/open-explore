import type { Trade } from '@/data/trades';
import type { TradingStats } from '@/lib/trading-analytics';
import type { RiskAssessment } from '@/lib/risk-engine';

export interface AIInsight {
  type: 'strength' | 'weakness' | 'alert' | 'recommendation' | 'momentum';
  icon: string;
  title: string;
  text: string;
  severity: 'low' | 'medium' | 'high';
}

// Randomized phrasing pools for variety
const PHRASES = {
  dirEdge: {
    en: [
      (dir: string, wr: string, pnl: string) => `${dir}s are your edge — ${wr}% win rate, $${pnl} profit`,
      (dir: string, wr: string, pnl: string) => `Your ${dir} trades dominate with ${wr}% accuracy and $${pnl} gains`,
      (dir: string, wr: string, pnl: string) => `Clear directional bias: ${dir}s at ${wr}% WR producing $${pnl}`,
    ],
    he: [
      (dir: string, wr: string, pnl: string) => `${dir === 'Long' ? 'לונגים' : 'שורטים'} הם היתרון שלך — ${wr}% הצלחה, $${pnl} רווח`,
      (dir: string, wr: string, pnl: string) => `עסקאות ${dir === 'Long' ? 'לונג' : 'שורט'} שולטות עם ${wr}% דיוק ו-$${pnl} רווח`,
    ],
  },
  highDisc: {
    en: [
      (r: string) => `${r}% rule adherence — excellent discipline`,
      (r: string) => `Outstanding discipline at ${r}% compliance. Keep this up.`,
      (r: string) => `Your ${r}% rule-following rate shows strong mental game`,
    ],
    he: [
      (r: string) => `${r}% עמידה בכללים — משמעת מצוינת`,
      (r: string) => `משמעת יוצאת דופן: ${r}% עמידה בכללים`,
    ],
  },
  lowDisc: {
    en: [
      (r: string) => `Only ${r}% rule adherence — this is your biggest leak`,
      (r: string) => `Discipline breakdown: ${r}% compliance. Rules exist for a reason.`,
      (r: string) => `${r}% rule adherence is hurting your edge. Prioritize execution quality.`,
    ],
    he: [
      (r: string) => `רק ${r}% עמידה בכללים — זה הבעיה המרכזית`,
      (r: string) => `משמעת נמוכה: ${r}% — שפר את ביצוע הכללים`,
    ],
  },
  lossStreak: {
    en: [
      (n: string) => `${n} consecutive losses detected — consider reducing size or stepping back`,
      (n: string) => `Loss streak of ${n} trades. This signals possible overtrading or regime shift.`,
      (n: string) => `${n} losses in a row — your mental capital is depleting. Take a break.`,
    ],
    he: [
      (n: string) => `${n} הפסדים רצופים — שקול להקטין גודל או לקחת הפסקה`,
      (n: string) => `רצף של ${n} הפסדים. ייתכן מסחר יתר או שינוי משטר.`,
    ],
  },
  posMom: {
    en: [
      (pnl: string) => `Last 5 trades: +$${pnl} — you're in the zone. Protect these gains.`,
      (pnl: string) => `Performance trending up: +$${pnl} over recent trades. Ride the momentum.`,
      (pnl: string) => `Strong recent performance at +$${pnl}. Stay disciplined, don't over-leverage.`,
    ],
    he: [
      (pnl: string) => `5 עסקאות אחרונות: +$${pnl} — ביצועים עולים`,
      (pnl: string) => `מומנטום חיובי: +$${pnl} בעסקאות אחרונות. שמור על משמעת.`,
    ],
  },
  negMom: {
    en: [
      (pnl: string) => `Last 5 trades: $${pnl} — consider stepping back to reassess`,
      (pnl: string) => `Negative momentum at $${pnl}. Your recent execution may not fit the current regime.`,
      (pnl: string) => `Downtrend in performance: $${pnl}. Reduce size and focus on A+ setups only.`,
    ],
    he: [
      (pnl: string) => `5 עסקאות אחרונות: $${pnl} — שקול הפסקה`,
      (pnl: string) => `מומנטום שלילי: $${pnl}. צמצם גודל ובדוק התאמת אסטרטגיה.`,
    ],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateInsights(stats: TradingStats, trades: Trade[], risk: RiskAssessment, isRTL: boolean): AIInsight[] {
  if (trades.length === 0) return [];
  const allInsights: AIInsight[] = [];
  const lang = isRTL ? 'he' : 'en';

  // Direction edge
  const longW = stats.directionData.find(d => d.name === 'Long');
  const shortW = stats.directionData.find(d => d.name === 'Short');
  if (longW && shortW && (longW.pnl !== 0 || shortW.pnl !== 0)) {
    const best = longW.pnl > shortW.pnl ? longW : shortW;
    allInsights.push({
      type: 'strength', icon: '💪', severity: 'low',
      title: isRTL ? 'יתרון כיווני' : 'Directional Edge',
      text: pick(PHRASES.dirEdge[lang])(best.name, best.winRate.toFixed(0), best.pnl.toFixed(2))
    });
  }

  // Discipline
  const rulesRate = stats.rulesFollowed;
  if (rulesRate >= 90) {
    allInsights.push({ type: 'strength', icon: '✅', severity: 'low', title: isRTL ? 'משמעת גבוהה' : 'High Discipline', text: pick(PHRASES.highDisc[lang])(rulesRate.toFixed(0)) });
  } else if (rulesRate < 70) {
    allInsights.push({ type: 'weakness', icon: '⚠️', severity: 'high', title: isRTL ? 'משמעת נמוכה' : 'Low Discipline', text: pick(PHRASES.lowDisc[lang])(rulesRate.toFixed(0)) });
  }

  // Worst performing coin
  const worstCoin = [...stats.coinPerf].sort((a, b) => a.pnl - b.pnl)[0];
  if (worstCoin && worstCoin.pnl < 0) {
    const coinTexts = [
      `${worstCoin.coin}: ${worstCoin.wins}/${worstCoin.trades} wins, -$${Math.abs(worstCoin.pnl).toFixed(2)} — consider avoiding`,
      `${worstCoin.coin} is bleeding your account: -$${Math.abs(worstCoin.pnl).toFixed(2)} across ${worstCoin.trades} trades`,
      `Remove ${worstCoin.coin} from your watchlist? ${worstCoin.wins}/${worstCoin.trades} WR with -$${Math.abs(worstCoin.pnl).toFixed(2)} P&L`,
    ];
    allInsights.push({ type: 'weakness', icon: '🔴', severity: 'medium', title: isRTL ? 'מטבע בעייתי' : 'Problematic Coin', text: isRTL ? `${worstCoin.coin}: ${worstCoin.wins}/${worstCoin.trades} ניצחונות, הפסד $${Math.abs(worstCoin.pnl).toFixed(2)}` : pick(coinTexts) });
  }

  // Best performing coin
  const bestCoin = [...stats.coinPerf].sort((a, b) => b.pnl - a.pnl)[0];
  if (bestCoin && bestCoin.pnl > 0) {
    allInsights.push({ type: 'strength', icon: '🏆', severity: 'low', title: isRTL ? 'נכס מוביל' : 'Top Performer', text: isRTL ? `${bestCoin.coin}: ${bestCoin.wins}/${bestCoin.trades} ניצחונות, רווח $${bestCoin.pnl.toFixed(2)}. המשך להתמקד בו.` : `${bestCoin.coin}: ${bestCoin.wins}/${bestCoin.trades} wins, +$${bestCoin.pnl.toFixed(2)} profit. Keep focusing here.` });
  }

  // Consecutive losses
  if (stats.maxConsecLosses >= 3) {
    allInsights.push({ type: 'alert', icon: '🔥', severity: 'high', title: isRTL ? 'רצף הפסדים' : 'Loss Streak', text: pick(PHRASES.lossStreak[lang])(String(stats.maxConsecLosses)) });
  }

  // Deviation analysis
  const highDevTrades = trades.filter(t => t.deviation > 0.1);
  if (highDevTrades.length > 0) {
    const avgDevLoss = trades.filter(t => t.winLoss === 'Loss').reduce((s, t) => s + t.deviation, 0) / (trades.filter(t => t.winLoss === 'Loss').length || 1);
    const avgDevWin = trades.filter(t => t.winLoss === 'Win').reduce((s, t) => s + t.deviation, 0) / (trades.filter(t => t.winLoss === 'Win').length || 1);
    const devTexts = [
      `Avg deviation: ${avgDevLoss.toFixed(3)}R in losses vs ${avgDevWin.toFixed(3)}R in wins`,
      `Your losing trades deviate ${avgDevLoss.toFixed(3)}R from plan. Winners: ${avgDevWin.toFixed(3)}R. Tighten execution.`,
      `Execution slip: losses deviate ${avgDevLoss.toFixed(3)}R, wins ${avgDevWin.toFixed(3)}R. The gap reveals your discipline leak.`,
    ];
    allInsights.push({ type: 'alert', icon: '📊', severity: 'medium', title: isRTL ? 'סטייה בביצוע' : 'Execution Deviation', text: isRTL ? `סטייה ממוצעת: ${avgDevLoss.toFixed(3)}R בהפסדים vs ${avgDevWin.toFixed(3)}R בניצחונות` : pick(devTexts) });
  }

  // Risk warnings
  risk.warnings.forEach(w => {
    allInsights.push({ type: 'alert', icon: '⚡', severity: 'medium', title: isRTL ? 'אזהרת סיכון' : 'Risk Warning', text: w });
  });

  // Momentum
  const recent5 = trades.slice(-5);
  const recent5PnL = recent5.reduce((s, t) => s + t.pnl, 0);
  const older = trades.slice(0, -5);
  const olderAvgPnL = older.length > 0 ? older.reduce((s, t) => s + t.pnl, 0) / older.length * 5 : 0;
  if (recent5PnL > olderAvgPnL * 1.5 && recent5PnL > 0) {
    allInsights.push({ type: 'momentum', icon: '🚀', severity: 'low', title: isRTL ? 'מומנטום חיובי' : 'Positive Momentum', text: pick(PHRASES.posMom[lang])(recent5PnL.toFixed(2)) });
  } else if (recent5PnL < 0 && Math.abs(recent5PnL) > Math.abs(olderAvgPnL)) {
    allInsights.push({ type: 'momentum', icon: '📉', severity: 'high', title: isRTL ? 'מומנטום שלילי' : 'Negative Momentum', text: pick(PHRASES.negMom[lang])(recent5PnL.toFixed(2)) });
  }

  // Leverage recommendation
  const highLevTrades = trades.filter(t => t.leverage >= 25);
  if (highLevTrades.length > 0) {
    const highLevLosses = highLevTrades.filter(t => t.winLoss === 'Loss');
    if (highLevLosses.length > highLevTrades.length * 0.5) {
      const levTexts = [
        `25x+ leverage: ${highLevLosses.length}/${highLevTrades.length} losses — reduce leverage`,
        `High leverage is costing you: ${highLevLosses.length} of ${highLevTrades.length} high-lev trades lost. Scale down.`,
        `${((highLevLosses.length/highLevTrades.length)*100).toFixed(0)}% loss rate on 25x+ trades. Your edge doesn't support this leverage.`,
      ];
      allInsights.push({ type: 'recommendation', icon: '🎯', severity: 'medium', title: isRTL ? 'המלצת מינוף' : 'Leverage Recommendation', text: isRTL ? `מינוף 25x+: ${highLevLosses.length}/${highLevTrades.length} הפסדים — הפחת מינוף` : pick(levTexts) });
    }
  }

  // Profit factor
  if (stats.profitFactor > 1.5) {
    const pfTexts = [
      `Profit factor ${stats.profitFactor.toFixed(2)} — clear statistical edge`,
      `Your PF of ${stats.profitFactor.toFixed(2)} means you earn $${stats.profitFactor.toFixed(2)} for every $1 lost. Strong.`,
      `At ${stats.profitFactor.toFixed(2)} profit factor, your system has a quantifiable edge. Protect it.`,
    ];
    allInsights.push({ type: 'strength', icon: '📈', severity: 'low', title: isRTL ? 'פקטור רווח חזק' : 'Strong Profit Factor', text: isRTL ? `פקטור רווח ${stats.profitFactor.toFixed(2)} — יתרון סטטיסטי ברור` : pick(pfTexts) });
  } else if (stats.profitFactor < 1 && stats.profitFactor > 0) {
    allInsights.push({ type: 'weakness', icon: '⚠️', severity: 'high', title: isRTL ? 'פקטור רווח שלילי' : 'Negative Profit Factor', text: isRTL ? `פקטור רווח ${stats.profitFactor.toFixed(2)} — אין יתרון סטטיסטי` : `Profit factor ${stats.profitFactor.toFixed(2)} — you're losing more than you gain. Review your system.` });
  }

  // Best day of week
  if (stats.dayPerf.length > 0) {
    const bestDay = [...stats.dayPerf].sort((a, b) => b.pnl - a.pnl)[0];
    const worstDay = [...stats.dayPerf].sort((a, b) => a.pnl - b.pnl)[0];
    if (bestDay.pnl > 0 && worstDay.pnl < 0) {
      allInsights.push({
        type: 'recommendation', icon: '📅', severity: 'low',
        title: isRTL ? 'תובנת ימים' : 'Day Pattern',
        text: isRTL
          ? `${bestDay.day} הוא היום הטוב שלך (+$${bestDay.pnl.toFixed(2)}), ${worstDay.day} הגרוע (-$${Math.abs(worstDay.pnl).toFixed(2)})`
          : `Best day: ${bestDay.day} (+$${bestDay.pnl.toFixed(2)}). Worst: ${worstDay.day} (-$${Math.abs(worstDay.pnl).toFixed(2)}). Consider skipping weak days.`
      });
    }
  }

  // ═══ NEW DYNAMIC INSIGHT TYPES ═══

  // Overtrading detection
  const tradeDays: Record<string, Trade[]> = {};
  trades.forEach(tr => { const d = new Date(tr.date.replace(' ', 'T')).toDateString(); if (!tradeDays[d]) tradeDays[d] = []; tradeDays[d].push(tr); });
  const overtradingDays = Object.entries(tradeDays).filter(([, trs]) => trs.length >= 4);
  if (overtradingDays.length > 0) {
    const otTexts = isRTL ? [
      `${overtradingDays.length} ימים עם 4+ עסקאות. מסחר יתר מוביל להחלטות נמוכות. שקול להגביל ל-2-3 עסקאות ביום.`,
      `זוהו ${overtradingDays.length} ימי מסחר יתר. תדירות גבוהה לא מעידה על רווחיות — היא מעידה על חוסר סבלנות.`,
    ] : [
      `${overtradingDays.length} days with 4+ trades. Overtrading leads to lower-quality decisions. Consider limiting to 2-3 trades/day.`,
      `Detected ${overtradingDays.length} overtrading days. High frequency doesn't mean profitability — it signals impatience.`,
      `You traded 4+ times on ${overtradingDays.length} days. Correlate these with P&L — most overtrading days are losing days.`,
    ];
    allInsights.push({ type: 'alert', icon: '⚡', severity: 'high', title: isRTL ? 'זיהוי מסחר יתר' : 'Overtrading Pattern', text: pick(otTexts) });
  }

  // Revenge trading detection
  let revengeTrades = 0;
  Object.values(tradeDays).forEach(dayTrades => {
    for (let i = 1; i < dayTrades.length; i++) {
      if (dayTrades[i-1].winLoss === 'Loss' && dayTrades[i].risk > dayTrades[i-1].risk * 1.2) revengeTrades++;
    }
  });
  if (revengeTrades > 0) {
    const revTexts = isRTL ? [
      `${revengeTrades} מקרי מסחר נקמה — הגדלת סיכון אחרי הפסד. דפוס רגשי מסוכן שחייב להיעצר.`,
      `זוהו ${revengeTrades} עסקאות נקמה. אחרי הפסד, הסיכון צריך להישאר זהה או להקטין — לא להגדיל.`,
    ] : [
      `${revengeTrades} revenge trades detected — risk increased after losses. This emotional pattern must stop.`,
      `${revengeTrades} instances of post-loss risk escalation. Your subconscious is trying to "win it back" — this never works.`,
      `Revenge trading alert: ${revengeTrades} times you increased risk after a loss. This is your biggest behavioral leak.`,
    ];
    allInsights.push({ type: 'alert', icon: '🔥', severity: 'high', title: isRTL ? 'מסחר נקמה' : 'Revenge Trading', text: pick(revTexts) });
  }

  // Emotional trading detection (high deviation on losses)
  const emotionalLosses = trades.filter(t => t.winLoss === 'Loss' && t.deviation > 0.15);
  if (emotionalLosses.length > 2) {
    allInsights.push({ type: 'weakness', icon: '😤', severity: 'medium', title: isRTL ? 'מסחר רגשי' : 'Emotional Trading', text: isRTL ? `${emotionalLosses.length} הפסדים עם סטייה גבוהה (>0.15R). כשאתה סוטה מהתוכנית בהפסד — הרגש שולט.` : `${emotionalLosses.length} losses with high deviation (>0.15R). When you deviate from plan on losses — emotion is driving.` });
  }

  // Win streak opportunity
  if (stats.currentStreak >= 3 && stats.streakType === 'Win') {
    const streakTexts = isRTL ? [
      `רצף של ${stats.currentStreak} ניצחונות! אתה באזור — שמור על גודל עקבי, אל תגדיל מתוך ביטחון יתר.`,
      `${stats.currentStreak} ניצחונות רצופים. ביצועים מצוינים — אבל רצפים לא נמשכים לנצח. שמור על משמעת.`,
    ] : [
      `${stats.currentStreak}-trade win streak! You're in the zone — maintain consistent sizing, don't let confidence inflate risk.`,
      `${stats.currentStreak} consecutive wins. Great performance — but streaks don't last forever. Stay disciplined.`,
    ];
    allInsights.push({ type: 'strength', icon: '🏆', severity: 'low', title: isRTL ? 'רצף ניצחונות' : 'Win Streak', text: pick(streakTexts) });
  }

  // Risk sizing analysis
  const risks = trades.map(t => t.risk);
  const avgRisk = risks.reduce((a,b) => a+b, 0) / risks.length;
  const riskStd = Math.sqrt(risks.reduce((s, r) => s + (r - avgRisk) ** 2, 0) / risks.length);
  const riskCV = avgRisk > 0 ? (riskStd / avgRisk) * 100 : 0;
  if (riskCV > 60) {
    allInsights.push({ type: 'weakness', icon: '📐', severity: 'high', title: isRTL ? 'חוסר עקביות בגודל סיכון' : 'Risk Size Chaos', text: isRTL ? `מקדם השונות של הסיכון: ${riskCV.toFixed(0)}%. סיכון שמשתנה באופן דרמטי מעיד על קבלת החלטות רגשית.` : `Risk CV at ${riskCV.toFixed(0)}%. Dramatically varying risk sizes indicate emotional decision-making rather than systematic trading.` });
  }

  // Session time analysis
  const morningTrades = trades.filter(t => { const h = new Date(t.date.replace(' ', 'T')).getHours(); return h >= 6 && h < 12; });
  const eveningTrades = trades.filter(t => { const h = new Date(t.date.replace(' ', 'T')).getHours(); return h >= 18 || h < 6; });
  if (morningTrades.length > 3 && eveningTrades.length > 3) {
    const morningPnl = morningTrades.reduce((s, t) => s + t.pnl, 0);
    const eveningPnl = eveningTrades.reduce((s, t) => s + t.pnl, 0);
    if (Math.abs(morningPnl - eveningPnl) > 5) {
      const better = morningPnl > eveningPnl ? (isRTL ? 'בוקר' : 'morning') : (isRTL ? 'ערב' : 'evening');
      allInsights.push({ type: 'recommendation', icon: '🕐', severity: 'low', title: isRTL ? 'תובנת זמנים' : 'Session Timing', text: isRTL ? `הביצועים שלך טובים יותר ב${better}. שקול להתמקד בשעות אלו.` : `You perform better in the ${better}. Consider focusing your trading during these hours.` });
    }
  }

  // Shuffle and return a varied subset each time
  const shuffled = allInsights.sort(() => Math.random() - 0.5);
  // Always include at least one of each type if available
  const types = ['strength', 'weakness', 'alert', 'recommendation', 'momentum'] as const;
  const result: AIInsight[] = [];
  for (const type of types) {
    const ofType = shuffled.find(i => i.type === type && !result.includes(i));
    if (ofType) result.push(ofType);
  }
  // Fill remaining slots with random insights
  for (const ins of shuffled) {
    if (result.length >= 7) break;
    if (!result.includes(ins)) result.push(ins);
  }

  return result.sort(() => Math.random() - 0.5);
}

// ════════════════════════════════════════════════════════
// DAY-SPECIFIC AI ANALYSIS — fully dynamic per calendar day
// ════════════════════════════════════════════════════════
export function generateDayInsights(dayTrades: Trade[], isRTL: boolean): AIInsight[] {
  if (dayTrades.length === 0) return [];
  const insights: AIInsight[] = [];

  const totalPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
  const totalR = dayTrades.reduce((s, t) => s + t.returnR, 0);
  const wins = dayTrades.filter(t => t.winLoss === 'Win');
  const losses = dayTrades.filter(t => t.winLoss === 'Loss');
  const winRate = dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0;
  const rulesFollowed = dayTrades.filter(t => t.rules).length;
  const rulesPct = dayTrades.length > 0 ? (rulesFollowed / dayTrades.length) * 100 : 0;
  const highDev = dayTrades.filter(t => t.deviation > 0.1);
  const coins = [...new Set(dayTrades.map(t => t.coin))];
  const directions = dayTrades.map(t => t.direction);
  const longCount = directions.filter(d => d === 'Long').length;
  const shortCount = directions.filter(d => d === 'Short').length;

  // 1. Overall day assessment
  if (losses.length === dayTrades.length) {
    const allLossTexts = isRTL ? [
      `כל ${dayTrades.length} העסקאות ביום זה הסתיימו בהפסד. סה"כ ${totalR.toFixed(2)}R. יום קשה שדורש הפקת לקחים.`,
      `יום של הפסד מלא: ${dayTrades.length} עסקאות, ${totalR.toFixed(2)}R. בדוק אם נכנסת למצב Tilt.`,
    ] : [
      `All ${dayTrades.length} trades ended in loss. Total: ${totalR.toFixed(2)}R. A tough day requiring review.`,
      `Complete loss day: ${dayTrades.length} trades, ${totalR.toFixed(2)}R. Check if you entered Tilt mode.`,
      `${dayTrades.length}/${dayTrades.length} losses for ${totalR.toFixed(2)}R. This pattern suggests regime mismatch or emotional trading.`,
    ];
    insights.push({ type: 'alert', icon: '🔴', severity: 'high', title: isRTL ? 'יום הפסד מלא' : 'Full Loss Day', text: pick(allLossTexts) });
  } else if (wins.length === dayTrades.length) {
    const allWinTexts = isRTL ? [
      `יום מושלם: ${dayTrades.length} עסקאות, כולן ניצחונות! +${totalR.toFixed(2)}R. שמור על הגישה הזו.`,
    ] : [
      `Perfect day: ${dayTrades.length}/${dayTrades.length} wins for +${totalR.toFixed(2)}R. Your execution was flawless.`,
      `Clean sweep: all ${dayTrades.length} trades won, netting +${totalR.toFixed(2)}R. Don't let this breed overconfidence.`,
    ];
    insights.push({ type: 'strength', icon: '🏆', severity: 'low', title: isRTL ? 'יום מושלם' : 'Perfect Day', text: pick(allWinTexts) });
  } else {
    const mixedTexts = isRTL ? [
      `${wins.length}/${dayTrades.length} ניצחונות (${winRate.toFixed(0)}%). סה"כ ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R.`,
    ] : [
      `${wins.length}/${dayTrades.length} wins (${winRate.toFixed(0)}% WR). Net result: ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R.`,
      `Mixed day: ${winRate.toFixed(0)}% win rate across ${dayTrades.length} trades. ${totalR >= 0 ? 'Positive outcome.' : 'Negative outcome — review losing setups.'}`,
    ];
    insights.push({ type: totalPnl >= 0 ? 'strength' : 'weakness', icon: totalPnl >= 0 ? '📊' : '📉', severity: totalPnl >= 0 ? 'low' : 'medium', title: isRTL ? 'סיכום יום' : 'Day Summary', text: pick(mixedTexts) });
  }

  // 2. Overtrading check
  if (dayTrades.length >= 4) {
    const otTexts = isRTL ? [
      `${dayTrades.length} עסקאות ביום אחד — סימן למסחר יתר. האם כל עסקה הייתה A+ setup?`,
      `${dayTrades.length} עסקאות. כמות גבוהה מעידה על חוסר סבלנות או רדיפה אחרי הפסדים.`,
    ] : [
      `${dayTrades.length} trades in one day — classic overtrading signal. Were all of these A+ setups?`,
      `${dayTrades.length} trades executed. High frequency often correlates with lower quality decisions.`,
    ];
    insights.push({ type: 'alert', icon: '⚡', severity: 'high', title: isRTL ? 'מסחר יתר' : 'Overtrading', text: pick(otTexts) });
  } else if (dayTrades.length === 3) {
    insights.push({ type: 'alert', icon: '⚡', severity: 'medium', title: isRTL ? 'מסחר יתר אפשרי' : 'Possible Overtrading', text: isRTL ? '3 עסקאות ביום — על הגבול. ודא שכל אחת התבססה על תוכנית.' : '3 trades in a single day — borderline. Ensure each was plan-based, not reactive.' });
  }

  // 3. Risk sizing analysis
  const risks = dayTrades.map(t => t.risk);
  const avgRisk = risks.reduce((s, r) => s + r, 0) / risks.length;
  const maxRisk = Math.max(...risks);
  const minRisk = Math.min(...risks);
  if (maxRisk > avgRisk * 2 && dayTrades.length > 1) {
    insights.push({
      type: 'alert', icon: '⚠️', severity: 'high',
      title: isRTL ? 'סיכון לא עקבי' : 'Inconsistent Risk Sizing',
      text: isRTL
        ? `טווח סיכון: $${minRisk.toFixed(2)} — $${maxRisk.toFixed(2)}. סטייה גדולה בגודל הפוזיציה.`
        : `Risk range: $${minRisk.toFixed(2)} to $${maxRisk.toFixed(2)}. Large variance in position sizing suggests emotional adjustments.`,
    });
  }

  // 4. Direction bias
  if (dayTrades.length >= 2) {
    if (longCount > 0 && shortCount === 0) {
      const longPnl = dayTrades.filter(t => t.direction === 'Long').reduce((s, t) => s + t.returnR, 0);
      insights.push({ type: 'recommendation', icon: '↑', severity: 'low', title: isRTL ? 'הטיה כיוונית' : 'Directional Bias', text: isRTL ? `כל העסקאות לונג (${longCount}). תוצאה: ${longPnl >= 0 ? '+' : ''}${longPnl.toFixed(2)}R.` : `All ${longCount} trades were Long. Result: ${longPnl >= 0 ? '+' : ''}${longPnl.toFixed(2)}R. ${longPnl < 0 ? 'Consider if market was actually bearish.' : ''}` });
    } else if (shortCount > 0 && longCount === 0) {
      const shortPnl = dayTrades.filter(t => t.direction === 'Short').reduce((s, t) => s + t.returnR, 0);
      insights.push({ type: 'recommendation', icon: '↓', severity: 'low', title: isRTL ? 'הטיה כיוונית' : 'Directional Bias', text: isRTL ? `כל העסקאות שורט (${shortCount}). תוצאה: ${shortPnl >= 0 ? '+' : ''}${shortPnl.toFixed(2)}R.` : `All ${shortCount} trades were Short. Result: ${shortPnl >= 0 ? '+' : ''}${shortPnl.toFixed(2)}R.` });
    }
  }

  // 5. Discipline check
  if (rulesPct < 100 && dayTrades.length > 0) {
    const brokenCount = dayTrades.length - rulesFollowed;
    insights.push({
      type: 'weakness', icon: '📋', severity: rulesPct < 50 ? 'high' : 'medium',
      title: isRTL ? 'הפרת כללים' : 'Rule Violations',
      text: isRTL
        ? `${brokenCount} מתוך ${dayTrades.length} עסקאות לא עמדו בכללים (${rulesPct.toFixed(0)}%). ${losses.filter(t => !t.rules).length > 0 ? 'ההפסדים שלא עמדו בכללים הם הכי יקרים.' : ''}`
        : `${brokenCount} of ${dayTrades.length} trades broke rules (${rulesPct.toFixed(0)}%). ${losses.filter(t => !t.rules).length > 0 ? 'Rule-breaking losses are your most expensive.' : ''}`,
    });
  } else if (rulesPct === 100 && dayTrades.length > 0) {
    insights.push({ type: 'strength', icon: '✅', severity: 'low', title: isRTL ? 'משמעת מלאה' : 'Full Discipline', text: isRTL ? 'כל העסקאות היום עמדו בכללים. ביצוע מקצועי.' : `All ${dayTrades.length} trades followed rules. Professional execution regardless of outcome.` });
  }

  // 6. Deviation analysis
  if (highDev.length > 0) {
    const avgDev = highDev.reduce((s, t) => s + t.deviation, 0) / highDev.length;
    insights.push({
      type: 'alert', icon: '🎯', severity: 'medium',
      title: isRTL ? 'סטייה מתוכנית' : 'Plan Deviation',
      text: isRTL
        ? `${highDev.length} עסקאות עם סטייה > 0.1R. סטייה ממוצעת: ${avgDev.toFixed(3)}R. ביצוע לא מדויק.`
        : `${highDev.length} trade${highDev.length > 1 ? 's' : ''} deviated > 0.1R from plan. Avg deviation: ${avgDev.toFixed(3)}R. Tighten your execution.`,
    });
  }

  // 7. Revenge trading detection (losses followed by more trades)
  if (losses.length >= 2 && dayTrades.length >= 3) {
    let consecutiveLosses = 0;
    let maxConsec = 0;
    for (const t of dayTrades) {
      if (t.winLoss === 'Loss') { consecutiveLosses++; maxConsec = Math.max(maxConsec, consecutiveLosses); }
      else consecutiveLosses = 0;
    }
    if (maxConsec >= 2 && dayTrades.indexOf(dayTrades[dayTrades.length - 1]) > dayTrades.indexOf(losses[losses.length - 1])) {
      insights.push({
        type: 'alert', icon: '🔥', severity: 'high',
        title: isRTL ? 'חשד ל-Revenge Trading' : 'Revenge Trading Suspected',
        text: isRTL
          ? `${maxConsec} הפסדים רצופים ואז המשכת לסחור. דפוס קלאסי של Revenge Trading.`
          : `${maxConsec} consecutive losses followed by more trading. Classic revenge trading pattern.`,
      });
    }
  }

  // 8. Asset diversification for the day
  if (coins.length === 1 && dayTrades.length >= 3) {
    insights.push({
      type: 'recommendation', icon: '🎰', severity: 'medium',
      title: isRTL ? 'ריכוז במטבע אחד' : 'Single Asset Concentration',
      text: isRTL
        ? `כל ${dayTrades.length} העסקאות ב-${coins[0]}. ריכוז גבוה מגביר סיכון. שקול פיזור.`
        : `All ${dayTrades.length} trades in ${coins[0]}. High concentration increases correlated risk.`,
    });
  }

  // 9. R-quality assessment
  const avgR = totalR / dayTrades.length;
  if (wins.length > 0) {
    const avgWinR = wins.reduce((s, t) => s + t.returnR, 0) / wins.length;
    const avgLossR = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.returnR), 0) / losses.length : 0;
    if (avgWinR < 1 && wins.length > 0) {
      insights.push({
        type: 'weakness', icon: '📐', severity: 'medium',
        title: isRTL ? 'ניצחונות קטנים' : 'Small Wins',
        text: isRTL
          ? `ממוצע ניצחון: ${avgWinR.toFixed(2)}R. הניצחונות שלך קטנים מדי — צריך לפחות 1.5R כדי לפצות על הפסדים.`
          : `Avg win: ${avgWinR.toFixed(2)}R. Your wins are too small. Aim for 1.5R+ to compensate for losses (avg loss: ${avgLossR.toFixed(2)}R).`,
      });
    } else if (avgWinR >= 2) {
      insights.push({
        type: 'strength', icon: '💎', severity: 'low',
        title: isRTL ? 'ניצחונות איכותיים' : 'Quality Wins',
        text: isRTL
          ? `ממוצע ניצחון: ${avgWinR.toFixed(2)}R. ניצחונות גדולים ואיכותיים.`
          : `Avg win: ${avgWinR.toFixed(2)}R. High-quality wins that build your account efficiently.`,
      });
    }
  }

  return insights;
}

export function generateDaySummary(dayTrades: Trade[], isRTL: boolean): string {
  if (dayTrades.length === 0) return isRTL ? 'אין עסקאות ביום זה.' : 'No trades on this day.';

  const totalPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
  const totalR = dayTrades.reduce((s, t) => s + t.returnR, 0);
  const wins = dayTrades.filter(t => t.winLoss === 'Win').length;
  const rulesPct = (dayTrades.filter(t => t.rules).length / dayTrades.length * 100).toFixed(0);
  const coins = [...new Set(dayTrades.map(t => t.coin))].join(', ');

  if (isRTL) {
    return `ניתוח ${dayTrades.length} עסקאות ביום זה: ${wins} ניצחונות, ` +
      `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R ($${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}). ` +
      `משמעת: ${rulesPct}%. מטבעות: ${coins}.`;
  }

  const variants = [
    () => `Day analysis: ${dayTrades.length} trades on ${coins}. ${wins} wins for ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R ($${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}). Discipline: ${rulesPct}%.`,
    () => `${dayTrades.length} executions across ${coins}. Win rate: ${(wins/dayTrades.length*100).toFixed(0)}%. R-result: ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R. Rule adherence: ${rulesPct}%.`,
    () => `Session report: ${wins}/${dayTrades.length} winning trades. Net: ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R. ${Number(rulesPct) >= 80 ? 'Disciplined execution.' : 'Discipline needs attention.'}`,
  ];
  return pick(variants)();
}

export function generateSummary(stats: TradingStats, trades: Trade[], isRTL: boolean): string {
  if (trades.length === 0) return isRTL ? 'אין עסקאות לניתוח.' : 'No trades to analyze.';
  
  const wins = trades.filter(t => t.winLoss === 'Win').length;
  const dir = stats.directionData.length > 0
    ? stats.directionData.reduce((best, d) => d.pnl > best.pnl ? d : best, stats.directionData[0])
    : { name: 'Long', pnl: 0 };
  
  const summaryVariants = [
    () => `Analysis of ${trades.length} trades: ${wins} wins (${stats.winRate.toFixed(0)}%), profit factor ${stats.profitFactor.toFixed(2)}. Edge in ${dir.name}s. ${stats.rulesFollowed.toFixed(0)}% rule adherence. Max drawdown ${stats.maxDrawdown.toFixed(1)}%. ${stats.maxConsecLosses >= 3 ? 'Caution: extended loss streak detected.' : 'Risk management healthy.'}`,
    () => `${trades.length} trades analyzed — ${stats.winRate.toFixed(0)}% win rate with ${stats.profitFactor.toFixed(2)} PF. Your ${dir.name} bias is working. Discipline at ${stats.rulesFollowed.toFixed(0)}%. ${stats.maxDrawdown > 5 ? `Watch the ${stats.maxDrawdown.toFixed(1)}% drawdown.` : 'Drawdown under control.'}`,
    () => `Performance snapshot: ${wins}/${trades.length} winning trades. Expectancy ${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(2)}R per trade. ${stats.rulesFollowed >= 80 ? 'Strong discipline.' : 'Discipline needs work.'} ${stats.maxConsecLosses >= 3 ? 'Loss streaks are a concern.' : 'Consistency looks solid.'}`,
  ];

  if (isRTL) {
    return `ניתוח ${trades.length} עסקאות: ${wins} ניצחונות (${stats.winRate.toFixed(0)}%), פקטור רווח ${stats.profitFactor.toFixed(2)}. ` +
      `יתרון ב-${dir.name === 'Long' ? 'לונגים' : 'שורטים'}. ` +
      `${stats.rulesFollowed.toFixed(0)}% עמידה בכללים. ` +
      `נסיגה מקסימלית ${stats.maxDrawdown.toFixed(1)}%. ` +
      `${stats.maxConsecLosses >= 3 ? 'זהירות: רצף הפסדים ארוך.' : 'ניהול סיכון תקין.'}`;
  }
  return pick(summaryVariants)();
}
