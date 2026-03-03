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
  const insights: AIInsight[] = [];
  const lang = isRTL ? 'he' : 'en';

  // Direction edge
  const longW = stats.directionData.find(d => d.name === 'Long');
  const shortW = stats.directionData.find(d => d.name === 'Short');
  if (longW && shortW && (longW.pnl !== 0 || shortW.pnl !== 0)) {
    const best = longW.pnl > shortW.pnl ? longW : shortW;
    insights.push({
      type: 'strength', icon: '💪', severity: 'low',
      title: isRTL ? 'יתרון כיווני' : 'Directional Edge',
      text: pick(PHRASES.dirEdge[lang])(best.name, best.winRate.toFixed(0), best.pnl.toFixed(2))
    });
  }

  // Discipline
  const rulesRate = stats.rulesFollowed;
  if (rulesRate >= 90) {
    insights.push({ type: 'strength', icon: '✅', severity: 'low', title: isRTL ? 'משמעת גבוהה' : 'High Discipline', text: pick(PHRASES.highDisc[lang])(rulesRate.toFixed(0)) });
  } else if (rulesRate < 70) {
    insights.push({ type: 'weakness', icon: '⚠️', severity: 'high', title: isRTL ? 'משמעת נמוכה' : 'Low Discipline', text: pick(PHRASES.lowDisc[lang])(rulesRate.toFixed(0)) });
  }

  // Worst performing coin
  const worstCoin = [...stats.coinPerf].sort((a, b) => a.pnl - b.pnl)[0];
  if (worstCoin && worstCoin.pnl < 0) {
    const coinTexts = [
      `${worstCoin.coin}: ${worstCoin.wins}/${worstCoin.trades} wins, -$${Math.abs(worstCoin.pnl).toFixed(2)} — consider avoiding`,
      `${worstCoin.coin} is bleeding your account: -$${Math.abs(worstCoin.pnl).toFixed(2)} across ${worstCoin.trades} trades`,
      `Remove ${worstCoin.coin} from your watchlist? ${worstCoin.wins}/${worstCoin.trades} WR with -$${Math.abs(worstCoin.pnl).toFixed(2)} P&L`,
    ];
    insights.push({ type: 'weakness', icon: '🔴', severity: 'medium', title: isRTL ? 'מטבע בעייתי' : 'Problematic Coin', text: isRTL ? `${worstCoin.coin}: ${worstCoin.wins}/${worstCoin.trades} ניצחונות, הפסד $${Math.abs(worstCoin.pnl).toFixed(2)}` : pick(coinTexts) });
  }

  // Consecutive losses
  if (stats.maxConsecLosses >= 3) {
    insights.push({ type: 'alert', icon: '🔥', severity: 'high', title: isRTL ? 'רצף הפסדים' : 'Loss Streak', text: pick(PHRASES.lossStreak[lang])(String(stats.maxConsecLosses)) });
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
    insights.push({ type: 'alert', icon: '📊', severity: 'medium', title: isRTL ? 'סטייה בביצוע' : 'Execution Deviation', text: isRTL ? `סטייה ממוצעת: ${avgDevLoss.toFixed(3)}R בהפסדים vs ${avgDevWin.toFixed(3)}R בניצחונות` : pick(devTexts) });
  }

  // Risk warnings
  risk.warnings.forEach(w => {
    insights.push({ type: 'alert', icon: '⚡', severity: 'medium', title: isRTL ? 'אזהרת סיכון' : 'Risk Warning', text: w });
  });

  // Momentum
  const recent5 = trades.slice(-5);
  const recent5PnL = recent5.reduce((s, t) => s + t.pnl, 0);
  const older = trades.slice(0, -5);
  const olderAvgPnL = older.length > 0 ? older.reduce((s, t) => s + t.pnl, 0) / older.length * 5 : 0;
  if (recent5PnL > olderAvgPnL * 1.5 && recent5PnL > 0) {
    insights.push({ type: 'momentum', icon: '🚀', severity: 'low', title: isRTL ? 'מומנטום חיובי' : 'Positive Momentum', text: pick(PHRASES.posMom[lang])(recent5PnL.toFixed(2)) });
  } else if (recent5PnL < 0 && Math.abs(recent5PnL) > Math.abs(olderAvgPnL)) {
    insights.push({ type: 'momentum', icon: '📉', severity: 'high', title: isRTL ? 'מומנטום שלילי' : 'Negative Momentum', text: pick(PHRASES.negMom[lang])(recent5PnL.toFixed(2)) });
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
      insights.push({ type: 'recommendation', icon: '🎯', severity: 'medium', title: isRTL ? 'המלצת מינוף' : 'Leverage Recommendation', text: isRTL ? `מינוף 25x+: ${highLevLosses.length}/${highLevTrades.length} הפסדים — הפחת מינוף` : pick(levTexts) });
    }
  }

  // Profit factor
  if (stats.profitFactor > 1.5) {
    const pfTexts = [
      `Profit factor ${stats.profitFactor.toFixed(2)} — clear statistical edge`,
      `Your PF of ${stats.profitFactor.toFixed(2)} means you earn $${stats.profitFactor.toFixed(2)} for every $1 lost. Strong.`,
      `At ${stats.profitFactor.toFixed(2)} profit factor, your system has a quantifiable edge. Protect it.`,
    ];
    insights.push({ type: 'strength', icon: '📈', severity: 'low', title: isRTL ? 'פקטור רווח חזק' : 'Strong Profit Factor', text: isRTL ? `פקטור רווח ${stats.profitFactor.toFixed(2)} — יתרון סטטיסטי ברור` : pick(pfTexts) });
  } else if (stats.profitFactor < 1 && stats.profitFactor > 0) {
    insights.push({ type: 'weakness', icon: '⚠️', severity: 'high', title: isRTL ? 'פקטור רווח שלילי' : 'Negative Profit Factor', text: isRTL ? `פקטור רווח ${stats.profitFactor.toFixed(2)} — אין יתרון סטטיסטי` : `Profit factor ${stats.profitFactor.toFixed(2)} — you're losing more than you gain. Review your system.` });
  }

  // Best day of week (bonus insight with variety)
  if (stats.dayPerf.length > 0) {
    const bestDay = [...stats.dayPerf].sort((a, b) => b.pnl - a.pnl)[0];
    const worstDay = [...stats.dayPerf].sort((a, b) => a.pnl - b.pnl)[0];
    if (bestDay.pnl > 0 && worstDay.pnl < 0) {
      insights.push({
        type: 'recommendation', icon: '📅', severity: 'low',
        title: isRTL ? 'תובנת ימים' : 'Day Pattern',
        text: isRTL
          ? `${bestDay.day} הוא היום הטוב שלך (+$${bestDay.pnl.toFixed(2)}), ${worstDay.day} הגרוע (-$${Math.abs(worstDay.pnl).toFixed(2)})`
          : `Best day: ${bestDay.day} (+$${bestDay.pnl.toFixed(2)}). Worst: ${worstDay.day} (-$${Math.abs(worstDay.pnl).toFixed(2)}). Consider skipping weak days.`
      });
    }
  }

  return insights;
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
