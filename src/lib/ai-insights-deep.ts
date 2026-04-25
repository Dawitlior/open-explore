// AI Deep Insights Engine — Hebrew-only, non-obvious behavioral & statistical discoveries.
// Every insight is something a trader cannot see at a glance from a single chart.
import type { Trade } from '@/data/trades';

export type InsightSeverity = 'critical' | 'warning' | 'positive' | 'neutral';
export type InsightCategory = 'behavior' | 'edge' | 'risk' | 'timing' | 'discipline' | 'pattern';

export interface DeepInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;          // Hebrew
  finding: string;        // The discovery in Hebrew
  evidence: string;       // Statistical evidence in Hebrew
  recommendation: string; // Concrete action in Hebrew
  metric?: { label: string; value: string; delta?: string };
  confidence: number;     // 0-100
}

// ─── Helpers ────────────────────────────────────────────────────
const dayHe = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const safeDate = (s: string): Date | null => { try { const d = new Date(s.replace(' ','T')); return isFinite(d.getTime()) ? d : null; } catch { return null; } };
const expectancy = (ts: Trade[]) => { if (!ts.length) return 0; return ts.reduce((s,t)=>s+t.returnR,0)/ts.length; };
const winRate = (ts: Trade[]) => { if (!ts.length) return 0; return ts.filter(t=>t.winLoss==='Win').length/ts.length*100; };
const round = (n: number, d=2) => Math.round(n*Math.pow(10,d))/Math.pow(10,d);

// ─── Insight generators ────────────────────────────────────────
function findRevengeTrading(trades: Trade[]): DeepInsight | null {
  // Trade taken within ~2 hours after a loss with risk increased ≥30%
  let revengeCount = 0; let revengeLoss = 0; let revengePnl = 0;
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i-1], cur = trades[i];
    if (prev.winLoss !== 'Loss') continue;
    const d1 = safeDate(prev.date), d2 = safeDate(cur.date);
    if (!d1 || !d2) continue;
    const minutes = (d2.getTime()-d1.getTime())/60000;
    if (minutes < 0 || minutes > 120) continue;
    if (cur.risk > prev.risk * 1.3) {
      revengeCount++;
      revengePnl += cur.pnl;
      if (cur.winLoss === 'Loss') revengeLoss++;
    }
  }
  if (revengeCount < 2) return null;
  const lossRate = revengeLoss/revengeCount*100;
  return {
    id: 'revenge', category: 'behavior',
    severity: lossRate >= 60 ? 'critical' : 'warning',
    title: 'דפוס "מסחר נקמה" זוהה',
    finding: `זוהו ${revengeCount} מקרים בהם הגדלת סיכון בלמעלה מ-30% תוך פחות משעתיים אחרי הפסד.`,
    evidence: `אחוז הפסד בעסקאות נקמה: ${round(lossRate,0)}% (לעומת ממוצע כללי). תרומה לרווח/הפסד: ${revengePnl>=0?'+':''}$${round(revengePnl,2)}.`,
    recommendation: 'אכוף "חלון צינון" של שעתיים אחרי הפסד או הקטן את הסיכון אוטומטית ב-50% עד הטרייד החיובי הבא.',
    metric: { label: 'עסקאות נקמה', value: String(revengeCount), delta: `${round(lossRate,0)}% הפסד` },
    confidence: Math.min(95, 50 + revengeCount*8),
  };
}

function findOverconfidenceAfterWin(trades: Trade[]): DeepInsight | null {
  let count = 0; let losses = 0; let pnl = 0;
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i-1], cur = trades[i];
    if (prev.winLoss !== 'Win' || prev.returnR < 1.5) continue;
    if (cur.risk > prev.risk * 1.5) {
      count++; pnl += cur.pnl;
      if (cur.winLoss === 'Loss') losses++;
    }
  }
  if (count < 2) return null;
  const lossRate = losses/count*100;
  return {
    id: 'overconfidence', category: 'behavior',
    severity: lossRate >= 50 ? 'warning' : 'neutral',
    title: 'יתר ביטחון אחרי ניצחון גדול',
    finding: `${count} פעמים הגדלת את הסיכון משמעותית אחרי רווח של 1.5R+, מה שהוביל ל-${round(lossRate,0)}% הפסדים.`,
    evidence: `סך תרומה לתיק: ${pnl>=0?'+':''}$${round(pnl,2)}. הסיכון הוגדל בממוצע פי 1.5+ מהעסקה הקודמת.`,
    recommendation: 'אחרי כל ניצחון גדול - שמור על אותו גודל פוזיציה. יתר ביטחון הוא הרסן השקט של הסטטיסטיקה.',
    metric: { label: 'אירועים', value: String(count) },
    confidence: Math.min(90, 45 + count*7),
  };
}

function findDayOfWeekEdge(trades: Trade[]): DeepInsight | null {
  if (trades.length < 15) return null;
  const byDay: Record<number, Trade[]> = {};
  trades.forEach(t => { const d = safeDate(t.date); if (!d) return; const k = d.getDay(); (byDay[k] ||= []).push(t); });
  const stats = Object.entries(byDay).map(([k,ts]) => ({ day: +k, exp: expectancy(ts), wr: winRate(ts), n: ts.length, pnl: ts.reduce((s,t)=>s+t.pnl,0) }));
  if (stats.length < 3) return null;
  const best = stats.reduce((a,b)=>b.exp>a.exp?b:a);
  const worst = stats.reduce((a,b)=>b.exp<a.exp?b:a);
  if (best.day === worst.day || worst.exp >= -0.05) return null;
  const delta = best.exp - worst.exp;
  if (delta < 0.5) return null;
  return {
    id: 'day-edge', category: 'edge',
    severity: 'positive',
    title: `יום ${dayHe[best.day]} הוא היום הכי רווחי שלך`,
    finding: `הביצועים שלך ביום ${dayHe[best.day]} עולים פי ${round(best.exp/Math.max(0.01,Math.abs(worst.exp)),1)} על יום ${dayHe[worst.day]}.`,
    evidence: `יום ${dayHe[best.day]}: תוחלת ${best.exp>=0?'+':''}${round(best.exp,2)}R, אחוז הצלחה ${round(best.wr,0)}% (${best.n} עסקאות, ${best.pnl>=0?'+':''}$${round(best.pnl,2)}). יום ${dayHe[worst.day]}: תוחלת ${round(worst.exp,2)}R.`,
    recommendation: `שקול להגדיל סיכון ביום ${dayHe[best.day]} ולהימנע ממסחר ביום ${dayHe[worst.day]} - או לפחות לחתוך סיכון ב-50%.`,
    metric: { label: `${dayHe[best.day]} EV`, value: `${best.exp>=0?'+':''}${round(best.exp,2)}R`, delta: `${dayHe[worst.day]}: ${round(worst.exp,2)}R` },
    confidence: Math.min(90, 40 + best.n*3),
  };
}

function findTimeOfDayEdge(trades: Trade[]): DeepInsight | null {
  if (trades.length < 20) return null;
  const buckets: Record<string, Trade[]> = { 'בוקר (06-12)':[], 'צהריים (12-16)':[], 'אחה"צ (16-20)':[], 'לילה (20-06)':[] };
  trades.forEach(t => { const d = safeDate(t.date); if (!d) return; const h = d.getHours();
    if (h>=6&&h<12) buckets['בוקר (06-12)'].push(t);
    else if (h>=12&&h<16) buckets['צהריים (12-16)'].push(t);
    else if (h>=16&&h<20) buckets['אחה"צ (16-20)'].push(t);
    else buckets['לילה (20-06)'].push(t);
  });
  const stats = Object.entries(buckets).filter(([,ts])=>ts.length>=3).map(([k,ts])=>({k,exp:expectancy(ts),wr:winRate(ts),n:ts.length}));
  if (stats.length < 2) return null;
  const best = stats.reduce((a,b)=>b.exp>a.exp?b:a);
  const worst = stats.reduce((a,b)=>b.exp<a.exp?b:a);
  if (best.exp - worst.exp < 0.4) return null;
  return {
    id: 'time-edge', category: 'timing',
    severity: worst.exp < -0.3 ? 'warning' : 'positive',
    title: `החלון הכי חזק שלך: ${best.k}`,
    finding: `אתה מבצע משמעותית טוב יותר ב${best.k} לעומת ${worst.k}.`,
    evidence: `${best.k}: תוחלת ${best.exp>=0?'+':''}${round(best.exp,2)}R, ${round(best.wr,0)}% הצלחה (${best.n} עסקאות). ${worst.k}: תוחלת ${round(worst.exp,2)}R, ${round(worst.wr,0)}% הצלחה (${worst.n} עסקאות).`,
    recommendation: worst.exp<-0.3 ? `הימנע ממסחר ב${worst.k} - שם אתה שורף הון. רכז כוח ב${best.k}.` : `נצל את ${best.k} כחלון העיקרי שלך.`,
    metric: { label: 'חלון אופטימלי', value: best.k, delta: `${best.exp>=0?'+':''}${round(best.exp,2)}R` },
    confidence: Math.min(88, 40 + Math.min(best.n,worst.n)*4),
  };
}

function findKellyMisalignment(trades: Trade[]): DeepInsight | null {
  if (trades.length < 10) return null;
  const wins = trades.filter(t=>t.winLoss==='Win'); const losses = trades.filter(t=>t.winLoss==='Loss');
  if (!wins.length || !losses.length) return null;
  const wr = wins.length/(wins.length+losses.length);
  const aw = wins.reduce((s,t)=>s+Math.abs(t.returnR),0)/wins.length;
  const al = losses.reduce((s,t)=>s+Math.abs(t.returnR),0)/losses.length;
  const b = aw/al;
  const kelly = Math.max(0, (wr*b - (1-wr)) / b) * 100;
  const avgRiskPct = trades.reduce((s,t)=>s+(t.riskPct||0),0)/trades.length;
  if (kelly <= 0) return null;
  const halfKelly = kelly/2;
  const diff = avgRiskPct - halfKelly;
  if (Math.abs(diff) < 0.3) return null;
  const overSizing = diff > 0;
  return {
    id: 'kelly', category: 'risk',
    severity: overSizing && diff > 1 ? 'critical' : 'warning',
    title: overSizing ? 'אתה לוקח סיכון גבוה מהאופטימום' : 'אתה לוקח סיכון נמוך מדי - מפסיד תשואה',
    finding: overSizing
      ? `הסיכון הממוצע שלך (${round(avgRiskPct,2)}%) גבוה ב-${round(diff,2)}% מקלי-חצי האופטימלי. אתה חשוף לרצף הפסדים שיכול לפגוע קשות.`
      : `הסיכון הממוצע שלך (${round(avgRiskPct,2)}%) נמוך משמעותית מהאופטימום. עם האדג' הנוכחי, אתה משאיר תשואה על השולחן.`,
    evidence: `קלי מלא: ${round(kelly,2)}%. קלי-חצי (מומלץ): ${round(halfKelly,2)}%. סיכון ממוצע בפועל: ${round(avgRiskPct,2)}%.`,
    recommendation: overSizing ? `כייל את הסיכון ל-${round(halfKelly,2)}% לעסקה. זה יחתוך את התנודתיות בחצי בלי לפגוע בתוחלת.` : `הגדל סיכון בהדרגה ל-${round(halfKelly,2)}% - זה יכפיל את קצב הצמיחה של ההון.`,
    metric: { label: 'קלי אופטימלי', value: `${round(halfKelly,2)}%`, delta: `בפועל: ${round(avgRiskPct,2)}%` },
    confidence: Math.min(90, 50 + trades.length),
  };
}

function findRuleBreakingCost(trades: Trade[]): DeepInsight | null {
  const followed = trades.filter(t=>t.rules); const broken = trades.filter(t=>!t.rules);
  if (broken.length < 3 || followed.length < 3) return null;
  const expF = expectancy(followed); const expB = expectancy(broken);
  const wrF = winRate(followed); const wrB = winRate(broken);
  const pnlB = broken.reduce((s,t)=>s+t.pnl,0);
  const delta = expF - expB;
  if (Math.abs(delta) < 0.2) return null;
  return {
    id: 'discipline', category: 'discipline',
    severity: expB < expF && pnlB < 0 ? 'critical' : 'warning',
    title: 'עלות סטייה מהכללים מדידה',
    finding: `כשאתה דבק בכללים: תוחלת ${expF>=0?'+':''}${round(expF,2)}R. כשאתה סוטה: ${round(expB,2)}R. הפער: ${round(delta,2)}R לעסקה.`,
    evidence: `${broken.length} עסקאות עם סטייה תרמו ${pnlB>=0?'+':''}$${round(pnlB,2)} (${round(wrB,0)}% הצלחה) לעומת ${round(wrF,0)}% כשנצמדת לתכנית.`,
    recommendation: pnlB < 0 ? `כל עסקה מחוץ לתכנית עלתה לך כסף. החזר משמעת - זה הרווח הכי קל שיש.` : `אפילו אם זה הצליח לפעמים, סטייה היא וריאנס לא ממוסד. הישאר בתכנית.`,
    metric: { label: 'עלות סטייה', value: `${round(delta,2)}R/עסקה`, delta: `${broken.length} סטיות` },
    confidence: Math.min(90, 40 + Math.min(followed.length, broken.length)*5),
  };
}

function findDirectionBias(trades: Trade[]): DeepInsight | null {
  const longs = trades.filter(t=>t.direction==='Long'); const shorts = trades.filter(t=>t.direction==='Short');
  if (longs.length < 5 || shorts.length < 5) return null;
  const expL = expectancy(longs); const expS = expectancy(shorts);
  const delta = expL - expS;
  if (Math.abs(delta) < 0.3) return null;
  const winner = delta > 0 ? 'לונג' : 'שורט'; const loser = delta > 0 ? 'שורט' : 'לונג';
  const winnerExp = delta > 0 ? expL : expS; const loserExp = delta > 0 ? expS : expL;
  return {
    id: 'bias', category: 'edge',
    severity: loserExp < -0.3 ? 'warning' : 'positive',
    title: `יש לך אדג' ברור ב${winner}`,
    finding: `התוחלת ב${winner} עומדת על ${winnerExp>=0?'+':''}${round(winnerExp,2)}R לעומת ${round(loserExp,2)}R ב${loser}.`,
    evidence: `${winner}: ${delta>0?longs.length:shorts.length} עסקאות, אחוז הצלחה ${round(winRate(delta>0?longs:shorts),0)}%. ${loser}: ${delta>0?shorts.length:longs.length} עסקאות, אחוז הצלחה ${round(winRate(delta>0?shorts:longs),0)}%.`,
    recommendation: loserExp < -0.3 ? `שקול להפסיק זמנית עסקאות ${loser} ולחקור למה הן לא עובדות לך.` : `נצל את האדג' ב${winner} - בנה סטאפים נוספים סביב הכיוון הזה.`,
    metric: { label: 'פער כיוון', value: `${round(Math.abs(delta),2)}R`, delta: `${winner} > ${loser}` },
    confidence: Math.min(85, 40 + Math.min(longs.length,shorts.length)*4),
  };
}

function findBestSetup(trades: Trade[]): DeepInsight | null {
  const map: Record<string, Trade[]> = {};
  trades.forEach(t => (map[t.coin] ||= []).push(t));
  const stats = Object.entries(map).filter(([,ts])=>ts.length>=3).map(([c,ts])=>({c,exp:expectancy(ts),wr:winRate(ts),n:ts.length,pnl:ts.reduce((s,t)=>s+t.pnl,0)}));
  if (stats.length < 2) return null;
  const best = stats.reduce((a,b)=>b.exp>a.exp?b:a);
  const worst = stats.reduce((a,b)=>b.exp<a.exp?b:a);
  if (best.c === worst.c) return null;
  return {
    id: 'best-setup', category: 'edge', severity: 'positive',
    title: `הסטאפ הכי רווחי: ${best.c}`,
    finding: `${best.c} מייצר ${best.exp>=0?'+':''}${round(best.exp,2)}R בממוצע, פי ${round(Math.abs(best.exp/Math.max(0.01,Math.abs(worst.exp))),1)} מ-${worst.c}.`,
    evidence: `${best.c}: ${best.n} עסקאות, ${round(best.wr,0)}% הצלחה, ${best.pnl>=0?'+':''}$${round(best.pnl,2)}. ${worst.c}: ${worst.n} עסקאות, ${round(worst.wr,0)}% הצלחה.`,
    recommendation: `הקצה יותר זמן מחקר ל-${best.c}. ${worst.exp<0 ? `שקול להוריד או להקפיא את ${worst.c} - הוא שוחק תוחלת.` : ''}`,
    metric: { label: 'סטאפ מוביל', value: best.c, delta: `${best.exp>=0?'+':''}${round(best.exp,2)}R` },
    confidence: Math.min(85, 40 + best.n*5),
  };
}

function findClusterRisk(trades: Trade[]): DeepInsight | null {
  // Days with 4+ trades — overtrading risk
  const byDay: Record<string, Trade[]> = {};
  trades.forEach(t => { const d = safeDate(t.date); if (!d) return; const k = d.toISOString().slice(0,10); (byDay[k] ||= []).push(t); });
  const heavyDays = Object.entries(byDay).filter(([,ts])=>ts.length>=4);
  if (heavyDays.length < 2) return null;
  const heavyTrades = heavyDays.flatMap(([,ts])=>ts);
  const normalTrades = Object.entries(byDay).filter(([,ts])=>ts.length<4).flatMap(([,ts])=>ts);
  if (!normalTrades.length) return null;
  const expHeavy = expectancy(heavyTrades); const expNorm = expectancy(normalTrades);
  const delta = expNorm - expHeavy;
  if (delta < 0.2) return null;
  return {
    id: 'overtrading', category: 'behavior',
    severity: expHeavy < -0.2 ? 'critical' : 'warning',
    title: 'מסחר יתר מזיק לתוחלת',
    finding: `בימים עם 4+ עסקאות התוחלת נופלת ל-${round(expHeavy,2)}R, לעומת ${round(expNorm,2)}R בימים רגילים.`,
    evidence: `זוהו ${heavyDays.length} ימי מסחר יתר (סה"כ ${heavyTrades.length} עסקאות). פער תוחלת: ${round(delta,2)}R לעסקה.`,
    recommendation: 'הצב מגבלה קשיחה של 3 עסקאות ביום. עסקה רביעית = סגירת פלטפורמה.',
    metric: { label: 'ימי-יתר', value: String(heavyDays.length), delta: `${round(delta,2)}R פער` },
    confidence: Math.min(85, 50 + heavyDays.length*5),
  };
}

function findRecoveryPattern(trades: Trade[]): DeepInsight | null {
  // After 2+ consecutive losses, how do you bounce back?
  const recoveries: Trade[] = [];
  let lossStreak = 0;
  for (const t of trades) {
    if (t.winLoss === 'Loss') { lossStreak++; }
    else { if (lossStreak >= 2) recoveries.push(t); lossStreak = 0; }
  }
  if (recoveries.length < 3) return null;
  const recExp = expectancy(recoveries); const recWr = winRate(recoveries);
  const overall = expectancy(trades);
  const delta = recExp - overall;
  if (Math.abs(delta) < 0.2) return null;
  return {
    id: 'recovery', category: 'pattern',
    severity: recExp >= overall ? 'positive' : 'warning',
    title: recExp >= overall ? 'עמידות אחרי הפסדים - חוזק נדיר' : 'קושי להתאושש מרצף הפסדים',
    finding: recExp >= overall
      ? `אחרי 2+ הפסדים רצופים, התוחלת שלך עולה ל-${round(recExp,2)}R - מעל הממוצע הכללי (${round(overall,2)}R).`
      : `אחרי 2+ הפסדים רצופים, התוחלת שלך נופלת ל-${round(recExp,2)}R - מתחת לממוצע (${round(overall,2)}R).`,
    evidence: `${recoveries.length} עסקאות התאוששות. אחוז הצלחה אחרי רצף הפסדים: ${round(recWr,0)}%.`,
    recommendation: recExp >= overall ? 'המשמעת שלך אחרי הפסדים יוצאת דופן. שמור על זה.' : 'אחרי 2 הפסדים רצופים - הקטן סיכון ב-50% או צא מהמסך לחצי שעה.',
    confidence: Math.min(80, 40 + recoveries.length*5),
  };
}

function findRiskRewardConsistency(trades: Trade[]): DeepInsight | null {
  if (trades.length < 10) return null;
  const wins = trades.filter(t=>t.winLoss==='Win');
  if (wins.length < 5) return null;
  const avgWin = wins.reduce((s,t)=>s+Math.abs(t.returnR),0)/wins.length;
  const variance = wins.reduce((s,t)=>s+Math.pow(Math.abs(t.returnR)-avgWin,2),0)/wins.length;
  const std = Math.sqrt(variance);
  const cv = std/avgWin;
  if (cv < 0.6) return null;
  return {
    id: 'rr-consistency', category: 'discipline',
    severity: cv > 1 ? 'warning' : 'neutral',
    title: 'חוסר עקביות בלקיחת רווחים',
    finding: `סטיית התקן ברווחים שלך גבוהה (${round(std,2)}R על ממוצע ${round(avgWin,2)}R). זה מצביע על קושי לסגור עסקאות בנקודה עקבית.`,
    evidence: `מקדם וריאציה: ${round(cv,2)}. ערך מעל 0.6 מצביע על "סגירות אקראיות" - לפעמים מוקדם מדי, לפעמים מאוחר מדי.`,
    recommendation: 'הגדר יחסי R-R קבועים לפני הכניסה (למשל 2R) ועקוב 30 עסקאות. עקביות > רווחיות בודדת.',
    metric: { label: 'CV רווחים', value: round(cv,2).toString() },
    confidence: 70,
  };
}

function findHotStreak(trades: Trade[]): DeepInsight | null {
  if (trades.length < 8) return null;
  const last10 = trades.slice(-10);
  const prev = trades.slice(-20,-10);
  if (prev.length < 5) return null;
  const expL = expectancy(last10); const expP = expectancy(prev);
  const delta = expL - expP;
  if (Math.abs(delta) < 0.4) return null;
  const heating = delta > 0;
  return {
    id: 'momentum', category: 'pattern',
    severity: heating ? 'positive' : 'warning',
    title: heating ? 'אתה במגמה חיובית' : 'התקררות בביצועים',
    finding: heating
      ? `10 העסקאות האחרונות מציגות תוחלת ${round(expL,2)}R - שיפור של ${round(delta,2)}R לעומת 10 הקודמות.`
      : `10 העסקאות האחרונות נופלות ל-${round(expL,2)}R - ירידה של ${round(Math.abs(delta),2)}R לעומת התקופה הקודמת.`,
    evidence: `תוחלת קודמת: ${round(expP,2)}R. נוכחית: ${round(expL,2)}R. שינוי: ${delta>=0?'+':''}${round(delta,2)}R.`,
    recommendation: heating ? 'משהו עובד. אל תשנה כלום עכשיו - תעד מה שונה.' : 'עצור. בדוק 10 עסקאות אחרונות. סביר שהפרת חוק שלא שמת לב אליו.',
    metric: { label: 'מומנטום', value: `${delta>=0?'+':''}${round(delta,2)}R` },
    confidence: 75,
  };
}

function findBestMonth(trades: Trade[]): DeepInsight | null {
  const map: Record<string, Trade[]> = {};
  trades.forEach(t => { const d = safeDate(t.date); if (!d) return; const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; (map[k] ||= []).push(t); });
  if (Object.keys(map).length < 2) return null;
  const monthsHe = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
  const stats = Object.entries(map).map(([k,ts])=>({k,exp:expectancy(ts),pnl:ts.reduce((s,t)=>s+t.pnl,0),n:ts.length}));
  const best = stats.reduce((a,b)=>b.pnl>a.pnl?b:a);
  const [y,m] = best.k.split('-');
  return {
    id: 'best-month', category: 'pattern', severity: 'neutral',
    title: `החודש הכי חזק: ${monthsHe[+m-1]} ${y}`,
    finding: `הרווחת ${best.pnl>=0?'+':''}$${round(best.pnl,2)} עם תוחלת של ${round(best.exp,2)}R על פני ${best.n} עסקאות.`,
    evidence: `נתח מה היה שונה - שעות, סטאפים, מצב רוח, נפח שוק. שכפול תנאים = שכפול תוצאות.`,
    recommendation: 'חזור ליומן של החודש הזה. כתוב 3 דברים שהיו שונים. שלב אותם בשגרה הנוכחית.',
    confidence: 80,
  };
}

// ─── Main ──────────────────────────────────────────────────────
export function generateDeepInsights(trades: Trade[]): DeepInsight[] {
  if (!trades || trades.length < 5) return [];
  const generators = [
    findRevengeTrading, findOverconfidenceAfterWin, findDayOfWeekEdge, findTimeOfDayEdge,
    findKellyMisalignment, findRuleBreakingCost, findDirectionBias, findBestSetup,
    findClusterRisk, findRecoveryPattern, findRiskRewardConsistency, findHotStreak, findBestMonth,
  ];
  const insights: DeepInsight[] = [];
  for (const g of generators) {
    try { const r = g(trades); if (r) insights.push(r); } catch (e) { console.warn('insight failed', e); }
  }
  // Sort: critical → warning → positive → neutral, then by confidence
  const order: Record<InsightSeverity, number> = { critical: 0, warning: 1, positive: 2, neutral: 3 };
  return insights.sort((a,b) => order[a.severity]-order[b.severity] || b.confidence-a.confidence);
}

// ─── Aggregated stats for visualizations ───────────────────────
export interface InsightVisuals {
  performanceByDay: Array<{ day: string; exp: number; wr: number; n: number; pnl: number }>;
  performanceByHour: Array<{ hour: string; exp: number; n: number }>;
  riskVsReturn: Array<{ risk: number; r: number; result: 'Win'|'Loss'|'BE'; size: number }>;
  consistencyScore: number; // 0-100
  edgeScore: number; // 0-100
  disciplineScore: number; // 0-100
  behaviorScore: number; // 0-100
  monthlyEvolution: Array<{ month: string; exp: number; pnl: number; trades: number }>;
  setupRanking: Array<{ name: string; exp: number; n: number; pnl: number }>;
}

export function buildInsightVisuals(trades: Trade[]): InsightVisuals {
  const dayHe2 = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const monthsHe = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

  // by day
  const byDay: Record<number, Trade[]> = {};
  trades.forEach(t => { const d = safeDate(t.date); if (!d) return; (byDay[d.getDay()] ||= []).push(t); });
  const performanceByDay = Array.from({length:7},(_,i)=>({ day: dayHe2[i], exp: byDay[i]?expectancy(byDay[i]):0, wr: byDay[i]?winRate(byDay[i]):0, n: byDay[i]?.length||0, pnl: byDay[i]?byDay[i].reduce((s,t)=>s+t.pnl,0):0 }));

  // by hour
  const byHour: Record<number, Trade[]> = {};
  trades.forEach(t => { const d = safeDate(t.date); if (!d) return; (byHour[d.getHours()] ||= []).push(t); });
  const performanceByHour = Array.from({length:24},(_,i)=>({ hour: `${String(i).padStart(2,'0')}:00`, exp: byHour[i]?expectancy(byHour[i]):0, n: byHour[i]?.length||0 }));

  // risk vs return scatter
  const riskVsReturn = trades.map(t => ({ risk: t.riskPct||0, r: t.returnR, result: (t.winLoss==='Win'?'Win':t.winLoss==='Loss'?'Loss':'BE') as 'Win'|'Loss'|'BE', size: Math.max(20, Math.min(80, (t.risk||100)/10)) }));

  // scores
  const followed = trades.filter(t=>t.rules).length;
  const disciplineScore = Math.round(followed/Math.max(1,trades.length)*100);
  const exp = expectancy(trades);
  const edgeScore = Math.max(0, Math.min(100, 50 + exp*40));
  const wins = trades.filter(t=>t.winLoss==='Win');
  const winsExp = wins.length ? wins.reduce((s,t)=>s+Math.abs(t.returnR),0)/wins.length : 0;
  const std = wins.length ? Math.sqrt(wins.reduce((s,t)=>s+Math.pow(Math.abs(t.returnR)-winsExp,2),0)/wins.length) : 0;
  const cv = winsExp ? std/winsExp : 1;
  const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - cv*60)));
  // behavior: ratio of trades NOT taken in revenge / overconfidence proxy = use rules adherence as proxy + win rate stability
  const behaviorScore = Math.round((disciplineScore*0.5 + consistencyScore*0.5));

  // monthly evolution
  const byMonth: Record<string, Trade[]> = {};
  trades.forEach(t => { const d = safeDate(t.date); if (!d) return; const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; (byMonth[k] ||= []).push(t); });
  const monthlyEvolution = Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b)).map(([k,ts])=>{
    const [y,m] = k.split('-');
    return { month: `${monthsHe[+m-1]} ${y.slice(2)}`, exp: round(expectancy(ts),2), pnl: round(ts.reduce((s,t)=>s+t.pnl,0),2), trades: ts.length };
  });

  // setup ranking
  const bySetup: Record<string, Trade[]> = {};
  trades.forEach(t => (bySetup[t.coin] ||= []).push(t));
  const setupRanking = Object.entries(bySetup).map(([name,ts])=>({name, exp: round(expectancy(ts),2), n: ts.length, pnl: round(ts.reduce((s,t)=>s+t.pnl,0),2)})).sort((a,b)=>b.exp-a.exp);

  return { performanceByDay, performanceByHour, riskVsReturn, consistencyScore, edgeScore, disciplineScore, behaviorScore, monthlyEvolution, setupRanking };
}
