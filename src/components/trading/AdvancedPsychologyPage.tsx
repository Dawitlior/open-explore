import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import { GlassCard, ScoreGauge, TradingBadge } from './TradingUI';
import { ChartWrapper, EXPLANATIONS } from './ChartWrapper';
import { LazyChart } from './LazyChart';
import type { ChartExplanation } from './ChartWrapper';

type OperatingMode = 'live' | 'review' | 'research' | 'beginner';

interface AdvancedPsychologyPageProps {
  T: TradingTheme;
  isRTL: boolean;
  isAlpha: boolean;
  operatingMode?: OperatingMode;
  trades: Trade[];
  stats: TradingStats;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
}

// ─── Section header (matches Risk page) ──────────────────────────
const SectionHeader = ({ T, label, accent, isRTL }: { T: TradingTheme; label: string; accent?: string; isRTL: boolean }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 9, color: accent || T.accent.cyan,
    textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    margin: '20px 0 12px',
  }}>
    <span style={{ width: 6, height: 6, borderRadius: 1, background: accent || T.accent.cyan, boxShadow: `0 0 10px ${accent || T.accent.cyan}` }} />
    <span style={{ width: 24, height: 1, background: `${accent || T.accent.cyan}50` }} />
    {label}
    <span style={{ flex: 1, height: 1, background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${accent || T.accent.cyan}30, transparent)` }} />
  </div>
);

export const AdvancedPsychologyPage = ({ T, isRTL, isAlpha, operatingMode = 'live', trades, stats, onExplainClick }: AdvancedPsychologyPageProps) => {
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const MIN_DIAG_TRADES = 8;
  const enoughForDiag = trades.length >= MIN_DIAG_TRADES;
  const startDiagnosis = () => {
    if (!enoughForDiag) { setDiagnosisOpen(true); return; } // popup will show insufficient-data state
    setDiagLoading(true);
    setTimeout(() => { setDiagLoading(false); setDiagnosisOpen(true); }, 1500);
  };
  // ─── Composition matrix: Standard/Alpha × Beginner/Live/Review/Research ───
  const isBeginner = operatingMode === 'beginner';
  const isLive     = operatingMode === 'live';
  const isReview   = operatingMode === 'review';
  const isResearch = operatingMode === 'research';

  // What sections each mode shows
  const showRadar          = isAlpha || isReview || isResearch;
  const showHeatmap        = isAlpha || isResearch;
  const showSignals        = true; // everyone sees behavioral signals (truncated for beginner)
  const maxSignals         = isBeginner ? 3 : isAlpha ? 99 : 6;
  const showPostLoss       = !isBeginner && (isAlpha || isReview);
  const showDisciplineTL   = !isBeginner && (isAlpha || isReview || isResearch);
  const showLossPressure   = isAlpha || isReview || isResearch;
  const showAlphaDeviation = isAlpha && (isLive || isReview || isResearch);

  // Mode banner meta
  const modeMeta = (() => {
    const map: Record<OperatingMode, { he: string; en: string; sub: { he: string; en: string }; color: string }> = {
      beginner: { he: 'מתחיל', en: 'Beginner', sub: { he: 'תצוגה מפושטת — אותות פסיכולוגיים בסיסיים בלבד', en: 'Simplified — core psychology signals only' }, color: T.accent.cyan },
      live:     { he: 'חי',     en: 'Live',    sub: { he: 'מצב חי — אינדקס בריאות + Tilt בזמן אמת',         en: 'Live — health index + real-time tilt' }, color: T.accent.green },
      review:   { he: 'סקירה',  en: 'Review',  sub: { he: 'סקירה רטרוספקטיבית של דפוסים והתנהגות לאחר הפסד', en: 'Retrospective of patterns & post-loss behavior' }, color: T.accent.blue },
      research: { he: 'מחקר',   en: 'Research',sub: { he: 'מחקר עומק — מגמות, לחץ ושכבות אלפא',              en: 'Deep research — trends, pressure & alpha layers' }, color: T.accent.purple },
    };
    return map[operatingMode];
  })();

  const tt = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.primary, fontSize: 12, boxShadow: T.shadow.elevated, padding: '8px 12px' };

  // Overtrading detection
  const tradeDays: Record<string, Trade[]> = {};
  trades.forEach(tr => { const d = new Date(tr.date.replace(' ', 'T')).toDateString(); if (!tradeDays[d]) tradeDays[d] = []; tradeDays[d].push(tr); });
  const overtradingDays = Object.entries(tradeDays).filter(([, trs]) => trs.length >= 3);

  // Revenge trading
  let revengeTrades = 0;
  Object.values(tradeDays).forEach(dayTrades => {
    for (let i = 1; i < dayTrades.length; i++) {
      if (dayTrades[i - 1].winLoss === 'Loss' && dayTrades[i].risk > dayTrades[i - 1].risk * 1.2) revengeTrades++;
    }
  });

  // Risk consistency (CV)
  const risks = trades.map(tr => tr.risk);
  const avgRisk = risks.reduce((a, b) => a + b, 0) / (risks.length || 1);
  const riskStd = Math.sqrt(risks.reduce((s, r) => s + (r - avgRisk) ** 2, 0) / (risks.length || 1));
  const riskCV = avgRisk > 0 ? (riskStd / avgRisk) * 100 : 0;

  // Rule compliance
  const rulesPct = trades.length ? (trades.filter(tr => tr.rules).length / trades.length) * 100 : 100;
  const rulesBreached = trades.filter(tr => !tr.rules);

  // Loss streaks
  let maxStreak = 0, curStreak = 0;
  trades.forEach(tr => { if (tr.winLoss === 'Loss') { curStreak++; maxStreak = Math.max(maxStreak, curStreak); } else curStreak = 0; });

  // Current streak (live)
  const currentStreak = useMemo(() => {
    let count = 0;
    let type: 'Win' | 'Loss' | null = null;
    for (let i = trades.length - 1; i >= 0; i--) {
      const t = trades[i].winLoss;
      if (t === 'Break Even') break;
      if (type === null) { type = t as 'Win' | 'Loss'; count = 1; }
      else if (t === type) count++;
      else break;
    }
    return { count, type };
  }, [trades]);

  // High deviation trades
  const highDevTrades = trades.filter(tr => tr.deviation > 0.1);

  // Discipline over time (rolling window)
  const disciplineTimeline = useMemo(() => {
    if (trades.length < 5) return [];
    const window = Math.min(5, trades.length);
    const result: Array<{ id: number; discipline: number; riskConsistency: number }> = [];
    for (let i = window - 1; i < trades.length; i++) {
      const slice = trades.slice(i - window + 1, i + 1);
      const disc = (slice.filter(t => t.rules).length / slice.length) * 100;
      const sliceRisks = slice.map(t => t.riskPct);
      const sliceAvg = sliceRisks.reduce((a, b) => a + b, 0) / sliceRisks.length;
      const sliceStd = Math.sqrt(sliceRisks.reduce((s, r) => s + (r - sliceAvg) ** 2, 0) / sliceRisks.length);
      const consistency = sliceAvg > 0 ? Math.max(0, 100 - (sliceStd / sliceAvg) * 100) : 100;
      result.push({ id: trades[i].id, discipline: disc, riskConsistency: consistency });
    }
    return result;
  }, [trades]);

  // Loss pressure analysis
  const lossPressure = useMemo(() => {
    const result: Array<{ id: number; pressure: number; consecLosses: number }> = [];
    let consec = 0;
    trades.forEach(t => {
      if (t.winLoss === 'Loss') consec++;
      else consec = 0;
      result.push({ id: t.id, pressure: Math.min(100, consec * 25), consecLosses: consec });
    });
    return result;
  }, [trades]);

  // Post-loss behavior
  const postLossBehavior = useMemo(() => {
    let riskIncAfterLoss = 0, riskDecAfterLoss = 0, sameAfterLoss = 0, rulesAfterLoss = 0, totalAfterLoss = 0;
    for (let i = 1; i < trades.length; i++) {
      if (trades[i - 1].winLoss === 'Loss') {
        totalAfterLoss++;
        const change = trades[i].risk / trades[i - 1].risk;
        if (change > 1.15) riskIncAfterLoss++;
        else if (change < 0.85) riskDecAfterLoss++;
        else sameAfterLoss++;
        if (trades[i].rules) rulesAfterLoss++;
      }
    }
    return { riskIncAfterLoss, riskDecAfterLoss, sameAfterLoss, rulesAfterLoss, totalAfterLoss };
  }, [trades]);

  // ─── Day-of-week performance heatmap ───────────────────────────
  const dayOfWeekStats = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysHe = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
    const buckets: Record<number, { trades: Trade[]; pnl: number; r: number }> = {};
    trades.forEach(t => {
      const d = new Date(t.date.replace(' ', 'T'));
      if (isNaN(d.getTime())) return;
      const dow = d.getDay();
      if (!buckets[dow]) buckets[dow] = { trades: [], pnl: 0, r: 0 };
      buckets[dow].trades.push(t);
      buckets[dow].pnl += t.pnl;
      buckets[dow].r += t.returnR;
    });
    return days.map((d, i) => ({
      day: isRTL ? daysHe[i] : d,
      count: buckets[i]?.trades.length || 0,
      pnl: buckets[i]?.pnl || 0,
      avgR: buckets[i] && buckets[i].trades.length ? buckets[i].r / buckets[i].trades.length : 0,
      winRate: buckets[i] && buckets[i].trades.length ? (buckets[i].trades.filter(t => t.winLoss === 'Win').length / buckets[i].trades.length) * 100 : 0,
    }));
  }, [trades, isRTL]);

  // ─── Tilt/Volatility detection (P&L variance per session) ──────
  const tiltScore = useMemo(() => {
    if (trades.length < 5) return { score: 0, status: 'insufficient', detail: '' };
    const pnls = trades.map(t => t.pnl);
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / pnls.length;
    const std = Math.sqrt(variance);
    const cv = Math.abs(mean) > 0.01 ? Math.abs(std / mean) : std;
    // tilt = high CV + recent loss streak + revenge signals
    const recentLosses = trades.slice(-5).filter(t => t.winLoss === 'Loss').length;
    const recentRevenge = revengeTrades > 0 ? Math.min(20, revengeTrades * 5) : 0;
    const score = Math.min(100, cv * 8 + recentLosses * 10 + recentRevenge);
    const status = score < 30 ? 'calm' : score < 60 ? 'elevated' : 'tilted';
    return { score, status, detail: `CV ${cv.toFixed(1)} · ${recentLosses}L/5 · ${revengeTrades} revenge` };
  }, [trades, revengeTrades]);

  // ─── Mental Capital (momentum + recovery) ─────────────────────
  const mentalCapital = useMemo(() => {
    if (trades.length === 0) return 100;
    const recent = trades.slice(-10);
    const winPct = (recent.filter(t => t.winLoss === 'Win').length / recent.length) * 100;
    const rulesAdherence = (recent.filter(t => t.rules).length / recent.length) * 100;
    const streakBonus = currentStreak.type === 'Win' ? Math.min(20, currentStreak.count * 5) : -Math.min(30, currentStreak.count * 8);
    return Math.max(0, Math.min(100, winPct * 0.5 + rulesAdherence * 0.5 + streakBonus));
  }, [trades, currentStreak]);

  // ─── Behavioral Health Index (composite) ──────────────────────
  const behavioralHealth = useMemo(() => {
    const discipline = stats.rulesFollowed;
    const consistency = Math.max(0, 100 - riskCV);
    const emotional = Math.max(0, 100 - (revengeTrades / Math.max(1, trades.length)) * 500);
    const tiltInverse = 100 - tiltScore.score;
    return (discipline * 0.3 + consistency * 0.25 + emotional * 0.25 + tiltInverse * 0.2);
  }, [stats, riskCV, revengeTrades, trades, tiltScore]);

  // ─── Radar chart data ─────────────────────────────────────────
  const radarData = useMemo(() => [
    { axis: isRTL ? 'משמעת' : 'Discipline', value: stats.rulesFollowed },
    { axis: isRTL ? 'עקביות' : 'Consistency', value: Math.max(0, 100 - riskCV) },
    { axis: isRTL ? 'רגשי' : 'Emotional', value: Math.max(0, 100 - (revengeTrades / Math.max(1, trades.length)) * 500) },
    { axis: isRTL ? 'הון מנטלי' : 'Mental Cap', value: mentalCapital },
    { axis: isRTL ? 'יציבות' : 'Stability', value: 100 - tiltScore.score },
    { axis: isRTL ? 'Orca' : 'Orca', value: stats.orcaScore },
  ], [stats, riskCV, revengeTrades, trades, mentalCapital, tiltScore, isRTL]);

  type Signal = { icon: string; title: string; detail: string; severity: 'good' | 'warning' | 'danger' };
  const signals: Signal[] = [];

  if (overtradingDays.length > 0) {
    signals.push({ icon: '⚡', title: isRTL ? 'מסחר יתר' : 'Overtrading Detected', detail: isRTL ? `${overtradingDays.length} ימים עם 3+ עסקאות. מסחר יתר פוגע בקבלת החלטות.` : `${overtradingDays.length} days with 3+ trades. Overtrading impairs decision-making.`, severity: 'warning' });
  } else {
    signals.push({ icon: '✅', title: isRTL ? 'תדירות מסחר תקינה' : 'Healthy Trade Frequency', detail: isRTL ? 'לא זוהה מסחר יתר.' : 'No overtrading detected.', severity: 'good' });
  }
  if (revengeTrades > 0) {
    signals.push({ icon: '🔥', title: isRTL ? 'מסחר נקמה' : 'Revenge Trading Detected', detail: isRTL ? `${revengeTrades} עסקאות עם הגדלת סיכון לאחר הפסד באותו יום.` : `${revengeTrades} trades with risk increase after same-day loss.`, severity: 'danger' });
  } else {
    signals.push({ icon: '✅', title: isRTL ? 'אין מסחר נקמה' : 'No Revenge Trading', detail: isRTL ? 'לא זוהה הגדלת סיכון לאחר הפסד.' : 'No risk increase after same-day losses.', severity: 'good' });
  }
  if (riskCV > 50) {
    signals.push({ icon: '📊', title: isRTL ? 'חוסר עקביות בסיכון' : 'Risk Inconsistency', detail: isRTL ? `CV=${riskCV.toFixed(0)}%. סיכון לא עקבי.` : `CV=${riskCV.toFixed(0)}%. Inconsistent risk sizing.`, severity: 'warning' });
  } else {
    signals.push({ icon: '✅', title: isRTL ? 'עקביות סיכון טובה' : 'Good Risk Consistency', detail: isRTL ? `CV=${riskCV.toFixed(0)}%.` : `CV=${riskCV.toFixed(0)}%. Consistent sizing.`, severity: 'good' });
  }
  if (rulesPct < 80) {
    signals.push({ icon: '⚠️', title: isRTL ? 'סטייה מכללים' : 'Rules Deviation', detail: isRTL ? `${rulesPct.toFixed(0)}% עמידה בכללים. ${rulesBreached.length} חריגות.` : `${rulesPct.toFixed(0)}% compliance. ${rulesBreached.length} deviations.`, severity: 'danger' });
  } else {
    signals.push({ icon: '✅', title: isRTL ? 'משמעת כללים גבוהה' : 'High Rule Compliance', detail: isRTL ? `${rulesPct.toFixed(0)}% עמידה.` : `${rulesPct.toFixed(0)}% compliance.`, severity: 'good' });
  }
  if (maxStreak >= 3) {
    signals.push({ icon: '🔴', title: isRTL ? 'רצף הפסדים' : 'Loss Streak', detail: isRTL ? `${maxStreak} הפסדים רצופים. צינון מומלץ.` : `${maxStreak} consecutive losses. Cool-off recommended.`, severity: maxStreak >= 4 ? 'danger' : 'warning' });
  }
  if (highDevTrades.length > 0) {
    signals.push({ icon: '📐', title: isRTL ? 'סטייה גבוהה' : 'High Deviation', detail: isRTL ? `${highDevTrades.length} עסקאות עם סטייה > 0.1R.` : `${highDevTrades.length} trades with deviation > 0.1R.`, severity: 'warning' });
  }
  if (postLossBehavior.totalAfterLoss > 0) {
    const incPct = (postLossBehavior.riskIncAfterLoss / postLossBehavior.totalAfterLoss) * 100;
    if (incPct > 30) {
      signals.push({ icon: '💢', severity: 'danger', title: isRTL ? 'דפוס הסלמה לאחר הפסד' : 'Post-Loss Escalation Pattern', detail: isRTL ? `${incPct.toFixed(0)}% מהעסקאות לאחר הפסד כללו הגדלת סיכון. זהו דפוס רגשי מסוכן.` : `${incPct.toFixed(0)}% of post-loss trades had increased risk. This is a dangerous emotional pattern.` });
    }
  }

  const severityColor = (s: Signal['severity']) => s === 'good' ? T.accent.green : s === 'warning' ? T.accent.orange : T.accent.red;
  const healthColor = behavioralHealth >= 75 ? T.accent.green : behavioralHealth >= 50 ? T.accent.orange : T.accent.red;
  const tiltColor = tiltScore.status === 'calm' ? T.accent.green : tiltScore.status === 'elevated' ? T.accent.orange : T.accent.red;
  const tiltLabel = tiltScore.status === 'calm' ? (isRTL ? 'רגוע' : 'CALM') : tiltScore.status === 'elevated' ? (isRTL ? 'מוגבר' : 'ELEVATED') : (isRTL ? 'מוטה' : 'TILTED');

  const diagnosis = useMemo(() => {
    const strengths = [
      rulesPct >= 80 ? 'משמעת הכללים שלך היא נכס מרכזי — אתה יודע לעבוד לפי תהליך ולא רק לפי תחושה.' : '',
      riskCV <= 35 ? 'ניהול הסיכון שלך עקבי יחסית, וזה מייצר בסיס יציב לצמיחה.' : '',
      stats.expectancyR > 0 ? `התוחלת שלך חיובית (${stats.expectancyR.toFixed(2)}R), כלומר קיימת עדות לאדג׳ אמיתי.` : '',
    ].filter(Boolean);
    const risksList = [
      revengeTrades > 0 ? `זוהה דפוס נקמה ב-${revengeTrades} עסקאות — אחרי הפסד המערכת מזהה נטייה להחזיר מהר מדי.` : '',
      riskCV > 50 ? `הסיכון שלך תנודתי מדי (CV ${riskCV.toFixed(0)}%). זה גורם לתוצאות להיות תלויות ברגש ולא בתהליך.` : '',
      highDevTrades.length > 0 ? `${highDevTrades.length} עסקאות עם סטייה חריגה מעל 10%. זו נקודת בקרת איכות קריטית.` : '',
      maxStreak >= 3 ? `רצף הפסדים מקסימלי של ${maxStreak} מחייב פרוטוקול עצירה לפני המשך פעילות.` : '',
    ].filter(Boolean);
    const plan = risksList.length
      ? ['אחרי הפסד: עצירה של 20 דקות לפני העסקה הבאה.', 'הגבלת סיכון קבועה עד שה-CV יורד מתחת ל-35%.', 'לסמן מראש תנאי כניסה/יציאה ולהשוות מול הסטייה בפועל.']
      : ['להעלות איכות דרך סינון סטאפים חלשים.', 'לבחון איזה יום ושעה מייצרים את התוחלת הטובה ביותר.', 'להמשיך לתעד רגש לפני ואחרי עסקה כדי למנוע הידרדרות סמויה.'];
    const archetype = behavioralHealth >= 75 ? 'סוחר תהליכי יציב' : behavioralHealth >= 50 ? 'סוחר עם אדג׳ אך רגיש ללחץ' : 'סוחר אימפולסיבי תחת לחץ';
    return { archetype, strengths, risksList, plan };
  }, [rulesPct, riskCV, stats.expectancyR, revengeTrades, highDevTrades.length, maxStreak, behavioralHealth]);

  // Heatmap color helper
  const heatColor = (r: number) => {
    if (r > 1) return T.accent.green;
    if (r > 0) return `${T.accent.green}80`;
    if (r === 0) return `${T.text.muted}40`;
    if (r > -1) return `${T.accent.red}80`;
    return T.accent.red;
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          HERO — Behavioral Health Index
          ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${T.bg.card}, ${T.bg.tertiary})`,
        border: `1px solid ${T.border.medium}`,
        borderRadius: 16,
        padding: 20,
        marginBottom: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, [isRTL ? 'left' : 'right']: -40,
          width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${healthColor}25, transparent 70%)`,
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
              {isRTL ? '◆ אינדקס בריאות התנהגותית' : '◆ BEHAVIORAL HEALTH INDEX'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 200, color: T.text.primary, letterSpacing: '-0.02em' }}>
              {isRTL ? `אבחון פסיכולוגי על ${trades.length} עסקאות` : `Psychology Diagnosis · ${trades.length} trades`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>{isRTL ? 'הון מנטלי' : 'Mental Cap'}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: mentalCapital >= 60 ? T.accent.green : T.accent.orange, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                {mentalCapital.toFixed(0)}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>Tilt</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: tiltColor, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.16em' }}>{tiltLabel}</div>
              <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>{tiltScore.detail}</div>
            </div>
            <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
              <div style={{ fontSize: 56, fontWeight: 700, color: healthColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, textShadow: `0 0 30px ${healthColor}60` }}>
                {behavioralHealth.toFixed(0)}
              </div>
              <div style={{ fontSize: 10, color: healthColor, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em', marginTop: 2 }}>
                {behavioralHealth >= 75 ? (isRTL ? 'בריא' : 'HEALTHY') : behavioralHealth >= 50 ? (isRTL ? 'מתון' : 'MODERATE') : (isRTL ? 'קריטי' : 'CRITICAL')}
              </div>
            </div>
          </div>
        </div>

        {/* Current streak indicator */}
        {currentStreak.count > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            background: currentStreak.type === 'Win' ? `${T.accent.green}15` : `${T.accent.red}15`,
            border: `1px solid ${currentStreak.type === 'Win' ? T.accent.green : T.accent.red}30`,
            borderRadius: 8,
            position: 'relative',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: currentStreak.type === 'Win' ? T.accent.green : T.accent.red, boxShadow: `0 0 8px ${currentStreak.type === 'Win' ? T.accent.green : T.accent.red}`, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: T.text.secondary, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
              {isRTL ? 'רצף נוכחי:' : 'CURRENT STREAK:'}{' '}
              <span style={{ color: currentStreak.type === 'Win' ? T.accent.green : T.accent.red, fontWeight: 700 }}>
                {currentStreak.count}{currentStreak.type === 'Win' ? (isRTL ? ' ניצחונות' : 'W') : (isRTL ? ' הפסדים' : 'L')}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ═══ MODE BANNER ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', marginTop: 8, marginBottom: 4,
        background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${modeMeta.color}14, transparent)`,
        border: `1px solid ${modeMeta.color}30`,
        borderInlineStart: `3px solid ${modeMeta.color}`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 9, padding: '3px 8px', background: `${modeMeta.color}25`, color: modeMeta.color, borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.16em', fontWeight: 700 }}>
          {(isAlpha ? (isRTL ? 'אלפא · ' : 'ALPHA · ') : (isRTL ? 'סטנדרט · ' : 'STANDARD · ')) + (isRTL ? modeMeta.he : modeMeta.en).toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: T.text.secondary, flex: 1 }}>{isRTL ? modeMeta.sub.he : modeMeta.sub.en}</div>
        <button onClick={() => setDiagnosisOpen(true)} style={{ padding: '9px 16px', borderRadius: 10, border: `1px solid ${T.accent.cyan}55`, background: `linear-gradient(135deg, ${T.accent.cyan}22, ${T.accent.purple}18)`, color: T.accent.cyan, fontSize: 12, fontWeight: 800, cursor: 'pointer', boxShadow: `0 0 22px ${T.accent.cyan}18` }}>
          {isRTL ? 'אבחן אותי' : 'Diagnose Me'}
        </button>
      </div>

      {/* ═══ RADAR + GAUGES — hidden in Beginner ═══ */}
      {showRadar && (<>
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'פרופיל התנהגותי' : 'BEHAVIORAL PROFILE'} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <GlassCard T={T} style={{ flex: 1, minWidth: 280, padding: 12 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            {isRTL ? 'מטריצת ביצוע' : 'Performance Matrix'}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={T.border.subtle} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: T.text.secondary, fontSize: 10 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: T.text.muted, fontSize: 8 }} />
              <Radar dataKey="value" stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={tt} cursor={false} formatter={(v: number) => `${v.toFixed(0)}/100`} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <ScoreGauge T={T} score={stats.rulesFollowed} label={isRTL ? 'משמעת' : 'Discipline'} color={T.accent.green} description={isRTL ? 'אחוז עמידה בכללים' : 'Rule compliance %'} />
            <ScoreGauge T={T} score={Math.max(0, 100 - riskCV)} label={isRTL ? 'עקביות' : 'Consistency'} color={T.accent.orange} description={isRTL ? 'אחידות גודל סיכון' : 'How uniform risk sizing is'} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ScoreGauge T={T} score={stats.orcaScore} label={isRTL ? 'ציון Orca' : 'Orca Score'} color={T.accent.cyan} description={isRTL ? 'ציון משולב' : 'Combined score'} />
            <ScoreGauge T={T} score={Math.max(0, 100 - (revengeTrades / Math.max(1, trades.length)) * 500)} label={isRTL ? 'רגשי' : 'Emotional'} color={T.accent.purple} description={isRTL ? 'היעדר אימפולסיביות' : 'Absence of impulsivity'} />
          </div>
        </div>
      </div>
      </>)}

      {/* ═══ DAY-OF-WEEK PERFORMANCE HEATMAP — hidden in Beginner ═══ */}
      {showHeatmap && (<>
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'מפת חום שבועית' : 'WEEKLY HEATMAP'} />
      <GlassCard T={T} style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {isRTL ? 'ביצוע לפי יום בשבוע — מה הימים הטובים שלך?' : 'Performance by day of week — when are you sharpest?'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {dayOfWeekStats.map((d, i) => {
            const intensity = Math.min(1, Math.abs(d.avgR) / 1.5);
            const bg = d.count === 0 ? T.bg.tertiary : heatColor(d.avgR);
            return (
              <div key={i} style={{
                padding: 12, borderRadius: 10,
                background: d.count > 0 ? `${bg}${Math.round(intensity * 60 + 15).toString(16).padStart(2, '0')}` : T.bg.tertiary,
                border: `1px solid ${d.count > 0 ? bg : T.border.subtle}40`,
                textAlign: 'center', position: 'relative',
                transition: 'all 0.3s',
              }}>
                <div style={{ fontSize: 11, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{d.day}</div>
                {d.count > 0 ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 700, color: d.avgR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                      {d.avgR >= 0 ? '+' : ''}{d.avgR.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 8, color: T.text.muted, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>R · {d.count}T</div>
                    <div style={{ fontSize: 8, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{d.winRate.toFixed(0)}% WR</div>
                  </>
                ) : (
                  <div style={{ fontSize: 16, color: T.text.muted, opacity: 0.4 }}>—</div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
      </>)}

      {/* ═══ BEHAVIORAL SIGNALS — truncated for Beginner ═══ */}
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'אותות התנהגותיים' : 'BEHAVIORAL SIGNALS'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 8, marginBottom: 4 }}>
        {signals.slice(0, maxSignals).map((sig, i) => (
          <GlassCard T={T} key={i} style={{ borderInlineStart: `3px solid ${severityColor(sig.severity)}`, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>{sig.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: severityColor(sig.severity), flex: 1 }}>{sig.title}</span>
              <TradingBadge color={severityColor(sig.severity)}>
                {sig.severity === 'good' ? (isRTL ? 'תקין' : 'OK') : sig.severity === 'warning' ? (isRTL ? 'אזהרה' : 'Warning') : (isRTL ? 'קריטי' : 'Critical')}
              </TradingBadge>
            </div>
            <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6 }}>{sig.detail}</div>
          </GlassCard>
        ))}
      </div>

      {/* ═══ POST-LOSS BEHAVIOR — Review/Alpha ═══ */}
      {showPostLoss && postLossBehavior.totalAfterLoss > 0 && (
        <>
          <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'התנהגות לאחר הפסד' : 'POST-LOSS BEHAVIOR'} />
          <GlassCard T={T} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { l: isRTL ? 'הגדלת סיכון' : 'Risk Increase', v: postLossBehavior.riskIncAfterLoss, pct: (postLossBehavior.riskIncAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.red, icon: '📈' },
                { l: isRTL ? 'שמירה על סיכון' : 'Risk Maintained', v: postLossBehavior.sameAfterLoss, pct: (postLossBehavior.sameAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.green, icon: '➡️' },
                { l: isRTL ? 'הקטנת סיכון' : 'Risk Decrease', v: postLossBehavior.riskDecAfterLoss, pct: (postLossBehavior.riskDecAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.blue, icon: '📉' },
                { l: isRTL ? 'עמידה בכללים' : 'Rules Followed', v: postLossBehavior.rulesAfterLoss, pct: (postLossBehavior.rulesAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.cyan, icon: '✅' },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, minWidth: 130, padding: 12, background: `${item.c}08`, border: `1px solid ${item.c}20`, borderRadius: 10, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', bottom: 0, insetInlineStart: 0, height: 2, width: `${item.pct}%`, background: item.c, transition: 'width 0.6s ease' }} />
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: item.c, fontFamily: "'JetBrains Mono', monospace" }}>{item.pct.toFixed(0)}%</div>
                  <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>{item.l} ({item.v})</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}

      {/* ═══ DISCIPLINE TIMELINE — Review/Research/Alpha ═══ */}
      {showDisciplineTL && disciplineTimeline.length > 0 && (
        <>
          <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'מגמות לאורך זמן' : 'TRENDS OVER TIME'} />
          <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'מגמת משמעת לאורך זמן' : 'Discipline Trend Over Time'} explanation={EXPLANATIONS.disciplineMetric} unit="%" style={{ marginBottom: 4 }}>
            <LazyChart height={180}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={disciplineTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                  <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 9 }} />
                  <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip contentStyle={tt} cursor={false} />
                  <Line type="monotone" dataKey="discipline" stroke={T.accent.green} strokeWidth={2} dot={{ fill: T.accent.green, r: 2 }} name={isRTL ? 'משמעת' : 'Discipline'} />
                  <Line type="monotone" dataKey="riskConsistency" stroke={T.accent.orange} strokeWidth={2} dot={{ fill: T.accent.orange, r: 2 }} name={isRTL ? 'עקביות סיכון' : 'Risk Consistency'} />
                </LineChart>
              </ResponsiveContainer>
            </LazyChart>
          </ChartWrapper>
        </>
      )}

      {/* ═══ LOSS PRESSURE TIMELINE — non-Beginner ═══ */}
      {showLossPressure && lossPressure.length > 0 && (
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'לחץ רצף הפסדים' : 'Loss Streak Pressure'} explanation={EXPLANATIONS.rDistribution} unit="%" style={{ marginBottom: 4 }}>
          <LazyChart height={160}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={lossPressure}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 9 }} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} domain={[0, 100]} />
                <Tooltip contentStyle={tt} cursor={false} />
                <Bar dataKey="pressure" radius={[3, 3, 0, 0]}>
                  {lossPressure.map((d, i) => <Cell key={i} fill={d.pressure >= 75 ? T.accent.red : d.pressure >= 50 ? T.accent.orange : d.pressure > 0 ? T.accent.orange : T.accent.green} fillOpacity={d.pressure >= 50 ? 0.9 : d.pressure > 0 ? 0.55 : 0.4} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      )}

      {/* ═══ DEVIATION CHART (ALPHA + Live/Review/Research) ═══ */}
      {showAlphaDeviation && (
        <>
          <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'ביצוע מתקדם (ALPHA)' : 'EXECUTION (ALPHA)'} />
          <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'סטייה לפי עסקה' : 'Deviation per Trade'} explanation={EXPLANATIONS.rDistribution} unit="R">
            <LazyChart height={160}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trades.map(tr => ({ id: `#${tr.id}`, dev: tr.deviation || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                  <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <Tooltip contentStyle={tt} cursor={false} formatter={(v: number) => `${v.toFixed(4)}R`} />
                  <Bar dataKey="dev" radius={[4, 4, 0, 0]}>
                    {trades.map((tr, i) => <Cell key={i} fill={tr.deviation > 0.1 ? T.accent.red : tr.deviation > 0 ? T.accent.orange : T.accent.green} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </LazyChart>
          </ChartWrapper>
        </>
      )}

      {diagnosisOpen && (
        <div onClick={() => setDiagnosisOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
          <div onClick={e => e.stopPropagation()} dir="rtl" style={{ width: 'min(760px, 100%)', maxHeight: '88vh', overflow: 'auto', borderRadius: 18, border: `1px solid ${healthColor}55`, background: `linear-gradient(145deg, ${T.bg.card}, ${T.bg.secondary} 48%, ${T.bg.tertiary})`, boxShadow: `0 30px 90px rgba(0,0,0,.62), 0 0 42px ${healthColor}22`, padding: 24, animation: 'scaleIn .22s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 10, color: healthColor, letterSpacing: '0.2em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>ORCA PSYCHOLOGICAL DIAGNOSTIC</div>
                <div style={{ fontSize: 28, color: T.text.primary, fontWeight: 900 }}>{diagnosis.archetype}</div>
                <div style={{ fontSize: 13, color: T.text.secondary, marginTop: 6 }}>אבחון מבוסס {trades.length} עסקאות, דפוסי סיכון, משמעת, רצפים והתנהגות לאחר הפסד.</div>
              </div>
              <button onClick={() => setDiagnosisOpen(false)} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border.medium}`, background: T.bg.tertiary, color: T.text.secondary, cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[['בריאות', behavioralHealth.toFixed(0), healthColor], ['הון מנטלי', mentalCapital.toFixed(0), mentalCapital >= 60 ? T.accent.green : T.accent.orange], ['Tilt', tiltLabel, tiltColor], ['משמעת', `${rulesPct.toFixed(0)}%`, rulesPct >= 80 ? T.accent.green : T.accent.red]].map(([l, v, c]) => (
                <div key={String(l)} style={{ padding: 14, borderRadius: 12, background: `${c}10`, border: `1px solid ${c}33` }}>
                  <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 5 }}>{l}</div>
                  <div style={{ fontSize: 24, color: String(c), fontWeight: 900, fontFamily: "'JetBrains Mono', monospace" }}>{v}</div>
                </div>
              ))}
            </div>
            {[
              ['חוזקות שאסור לאבד', diagnosis.strengths.length ? diagnosis.strengths : ['עדיין אין מספיק יתרון ברור — המשימה היא לצבור עוד דאטה נקי.'], T.accent.green],
              ['נקודות סיכון שמאטות אותך', diagnosis.risksList.length ? diagnosis.risksList : ['לא זוהתה בעיה קריטית כרגע — המיקוד הוא שיפור הדרגתי ולא תיקון חירום.'], T.accent.red],
              ['פרוטוקול פעולה אישי', diagnosis.plan, T.accent.cyan],
            ].map(([title, items, color]) => (
              <div key={String(title)} style={{ marginTop: 12, padding: 16, borderRadius: 14, background: T.bg.tertiary, borderInlineStart: `4px solid ${color}` }}>
                <div style={{ fontSize: 14, color: String(color), fontWeight: 900, marginBottom: 10 }}>{title}</div>
                {(items as string[]).map((x, i) => <div key={i} style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.8 }}>◆ {x}</div>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
