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

export function generateInsights(stats: TradingStats, trades: Trade[], risk: RiskAssessment, isRTL: boolean): AIInsight[] {
  if (trades.length === 0) return [];
  const insights: AIInsight[] = [];

  // Direction edge
  const longW = stats.directionData.find(d => d.name === 'Long');
  const shortW = stats.directionData.find(d => d.name === 'Short');
  if (longW && shortW) {
    const best = longW.pnl > shortW.pnl ? longW : shortW;
    const dir = best.name;
    insights.push({
      type: 'strength', icon: '💪', severity: 'low',
      title: isRTL ? 'יתרון כיווני' : 'Directional Edge',
      text: isRTL ? `${dir === 'Long' ? 'לונגים' : 'שורטים'} הם היתרון שלך — ${best.winRate.toFixed(0)}% הצלחה, $${best.pnl.toFixed(2)} רווח` : `${dir}s are your edge — ${best.winRate.toFixed(0)}% win rate, $${best.pnl.toFixed(2)} profit`
    });
  }

  // Discipline
  const rulesRate = stats.rulesFollowed;
  if (rulesRate >= 90) {
    insights.push({ type: 'strength', icon: '✅', severity: 'low', title: isRTL ? 'משמעת גבוהה' : 'High Discipline', text: isRTL ? `${rulesRate.toFixed(0)}% עמידה בכללים — משמעת מצוינת` : `${rulesRate.toFixed(0)}% rule adherence — excellent discipline` });
  } else if (rulesRate < 70) {
    insights.push({ type: 'weakness', icon: '⚠️', severity: 'high', title: isRTL ? 'משמעת נמוכה' : 'Low Discipline', text: isRTL ? `רק ${rulesRate.toFixed(0)}% עמידה בכללים — שפר משמעת` : `Only ${rulesRate.toFixed(0)}% rule adherence — improve discipline` });
  }

  // Worst performing coin
  const worstCoin = [...stats.coinPerf].sort((a, b) => a.pnl - b.pnl)[0];
  if (worstCoin && worstCoin.pnl < 0) {
    insights.push({ type: 'weakness', icon: '🔴', severity: 'medium', title: isRTL ? 'מטבע בעייתי' : 'Problematic Coin', text: isRTL ? `${worstCoin.coin}: ${worstCoin.wins}/${worstCoin.trades} ניצחונות, הפסד $${Math.abs(worstCoin.pnl).toFixed(2)} — שקול להימנע` : `${worstCoin.coin}: ${worstCoin.wins}/${worstCoin.trades} wins, -$${Math.abs(worstCoin.pnl).toFixed(2)} — consider avoiding` });
  }

  // Consecutive losses detection
  if (stats.maxConsecLosses >= 3) {
    const lossStreak = stats.maxConsecLosses;
    insights.push({ type: 'alert', icon: '🔥', severity: 'high', title: isRTL ? 'רצף הפסדים' : 'Loss Streak', text: isRTL ? `${lossStreak} הפסדים רצופים זוהו — סימן למסחר יתר או לשוק לא מתאים` : `${lossStreak} consecutive losses detected — possible overtrading or regime mismatch` });
  }

  // Deviation analysis
  const highDevTrades = trades.filter(t => t.deviation > 0.1);
  if (highDevTrades.length > 0) {
    const avgDevLoss = trades.filter(t => t.winLoss === 'Loss').reduce((s, t) => s + t.deviation, 0) / (trades.filter(t => t.winLoss === 'Loss').length || 1);
    const avgDevWin = trades.filter(t => t.winLoss === 'Win').reduce((s, t) => s + t.deviation, 0) / (trades.filter(t => t.winLoss === 'Win').length || 1);
    insights.push({ type: 'alert', icon: '📊', severity: 'medium', title: isRTL ? 'סטייה בביצוע' : 'Execution Deviation', text: isRTL ? `סטייה ממוצעת: ${avgDevLoss.toFixed(3)}R בהפסדים vs ${avgDevWin.toFixed(3)}R בניצחונות` : `Avg deviation: ${avgDevLoss.toFixed(3)}R in losses vs ${avgDevWin.toFixed(3)}R in wins` });
  }

  // Risk warnings from risk engine
  risk.warnings.forEach(w => {
    insights.push({ type: 'alert', icon: '⚡', severity: 'medium', title: isRTL ? 'אזהרת סיכון' : 'Risk Warning', text: w });
  });

  // Momentum detection
  const recent5 = trades.slice(-5);
  const recent5PnL = recent5.reduce((s, t) => s + t.pnl, 0);
  const older = trades.slice(0, -5);
  const olderAvgPnL = older.length > 0 ? older.reduce((s, t) => s + t.pnl, 0) / older.length * 5 : 0;
  if (recent5PnL > olderAvgPnL * 1.5 && recent5PnL > 0) {
    insights.push({ type: 'momentum', icon: '🚀', severity: 'low', title: isRTL ? 'מומנטום חיובי' : 'Positive Momentum', text: isRTL ? `5 עסקאות אחרונות: +$${recent5PnL.toFixed(2)} — ביצועים עולים` : `Last 5 trades: +$${recent5PnL.toFixed(2)} — performance trending up` });
  } else if (recent5PnL < 0 && Math.abs(recent5PnL) > Math.abs(olderAvgPnL)) {
    insights.push({ type: 'momentum', icon: '📉', severity: 'high', title: isRTL ? 'מומנטום שלילי' : 'Negative Momentum', text: isRTL ? `5 עסקאות אחרונות: $${recent5PnL.toFixed(2)} — שקול הפסקה` : `Last 5 trades: $${recent5PnL.toFixed(2)} — consider stepping back` });
  }

  // Leverage recommendation
  const highLevTrades = trades.filter(t => t.leverage >= 25);
  if (highLevTrades.length > 0) {
    const highLevLosses = highLevTrades.filter(t => t.winLoss === 'Loss');
    if (highLevLosses.length > highLevTrades.length * 0.5) {
      insights.push({ type: 'recommendation', icon: '🎯', severity: 'medium', title: isRTL ? 'המלצת מינוף' : 'Leverage Recommendation', text: isRTL ? `מינוף 25x+: ${highLevLosses.length}/${highLevTrades.length} הפסדים — הפחת מינוף` : `25x+ leverage: ${highLevLosses.length}/${highLevTrades.length} losses — reduce leverage` });
    }
  }

  // Profit factor insight
  if (stats.profitFactor > 1.5) {
    insights.push({ type: 'strength', icon: '📈', severity: 'low', title: isRTL ? 'פקטור רווח חזק' : 'Strong Profit Factor', text: isRTL ? `פקטור רווח ${stats.profitFactor.toFixed(2)} — יתרון סטטיסטי ברור` : `Profit factor ${stats.profitFactor.toFixed(2)} — clear statistical edge` });
  } else if (stats.profitFactor < 1 && stats.profitFactor > 0) {
    insights.push({ type: 'weakness', icon: '⚠️', severity: 'high', title: isRTL ? 'פקטור רווח שלילי' : 'Negative Profit Factor', text: isRTL ? `פקטור רווח ${stats.profitFactor.toFixed(2)} — אין יתרון סטטיסטי` : `Profit factor ${stats.profitFactor.toFixed(2)} — no statistical edge` });
  }

  return insights;
}

export function generateSummary(stats: TradingStats, trades: Trade[], isRTL: boolean): string {
  if (trades.length === 0) return isRTL ? 'אין עסקאות לניתוח.' : 'No trades to analyze.';
  
  const wins = trades.filter(t => t.winLoss === 'Win').length;
  const dir = stats.directionData.reduce((best, d) => d.pnl > best.pnl ? d : best, stats.directionData[0]);
  
  if (isRTL) {
    return `ניתוח ${trades.length} עסקאות: ${wins} ניצחונות (${stats.winRate.toFixed(0)}%), פקטור רווח ${stats.profitFactor.toFixed(2)}. ` +
      `יתרון ב-${dir.name === 'Long' ? 'לונגים' : 'שורטים'}. ` +
      `${stats.rulesFollowed.toFixed(0)}% עמידה בכללים. ` +
      `נסיגה מקסימלית ${stats.maxDrawdown.toFixed(1)}%. ` +
      `${stats.maxConsecLosses >= 3 ? 'זהירות: רצף הפסדים ארוך.' : 'ניהול סיכון תקין.'}`;
  }
  return `Analysis of ${trades.length} trades: ${wins} wins (${stats.winRate.toFixed(0)}%), profit factor ${stats.profitFactor.toFixed(2)}. ` +
    `Edge in ${dir.name}s. ` +
    `${stats.rulesFollowed.toFixed(0)}% rule adherence. ` +
    `Max drawdown ${stats.maxDrawdown.toFixed(1)}%. ` +
    `${stats.maxConsecLosses >= 3 ? 'Caution: extended loss streak detected.' : 'Risk management healthy.'}`;
}
