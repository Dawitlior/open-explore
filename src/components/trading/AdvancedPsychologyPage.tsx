import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import { GlassCard, ScoreGauge, TradingBadge } from './TradingUI';
import { ChartWrapper, EXPLANATIONS } from './ChartWrapper';
import { LazyChart } from './LazyChart';
import type { ChartExplanation } from './ChartWrapper';

interface AdvancedPsychologyPageProps {
  T: TradingTheme;
  isRTL: boolean;
  isAlpha: boolean;
  trades: Trade[];
  stats: TradingStats;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
}

export const AdvancedPsychologyPage = ({ T, isRTL, isAlpha, trades, stats, onExplainClick }: AdvancedPsychologyPageProps) => {
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
  const avgRisk = risks.reduce((a, b) => a + b, 0) / risks.length;
  const riskStd = Math.sqrt(risks.reduce((s, r) => s + (r - avgRisk) ** 2, 0) / risks.length);
  const riskCV = avgRisk > 0 ? (riskStd / avgRisk) * 100 : 0;

  // Rule compliance
  const rulesPct = (trades.filter(tr => tr.rules).length / trades.length) * 100;
  const rulesBreached = trades.filter(tr => !tr.rules);

  // Loss streaks
  let maxStreak = 0, curStreak = 0;
  trades.forEach(tr => { if (tr.winLoss === 'Loss') { curStreak++; maxStreak = Math.max(maxStreak, curStreak); } else curStreak = 0; });

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
    let riskIncAfterLoss = 0;
    let riskDecAfterLoss = 0;
    let sameAfterLoss = 0;
    let rulesAfterLoss = 0;
    let totalAfterLoss = 0;

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

  type Signal = { icon: string; title: string; detail: string; severity: 'good' | 'warning' | 'danger' };
  const signals: Signal[] = [];

  // Overtrading signal
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

  // Post-loss pattern signal
  if (postLossBehavior.totalAfterLoss > 0) {
    const incPct = (postLossBehavior.riskIncAfterLoss / postLossBehavior.totalAfterLoss) * 100;
    if (incPct > 30) {
      signals.push({
        icon: '💢', severity: 'danger',
        title: isRTL ? 'דפוס הסלמה לאחר הפסד' : 'Post-Loss Escalation Pattern',
        detail: isRTL
          ? `${incPct.toFixed(0)}% מהעסקאות לאחר הפסד כללו הגדלת סיכון. זהו דפוס רגשי מסוכן.`
          : `${incPct.toFixed(0)}% of post-loss trades had increased risk. This is a dangerous emotional pattern.`,
      });
    }
  }

  const severityColor = (s: Signal['severity']) => s === 'good' ? T.accent.green : s === 'warning' ? T.accent.orange : T.accent.red;

  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 300, color: T.text.secondary, margin: '0 0 6px', fontFamily: "'JetBrains Mono', monospace" }}>
        {isRTL ? '🧠 אבחון פסיכולוגי מתקדם' : '🧠 Advanced Psychology Diagnosis'}
      </h2>
      <div style={{ fontSize: 11, color: T.text.dim, marginBottom: 20 }}>
        {isRTL ? `ניתוח ${trades.length} עסקאות לזיהוי דפוסים התנהגותיים` : `Analyzing ${trades.length} trades for behavioral patterns`}
      </div>

      {/* Score gauges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <ScoreGauge T={T} score={stats.rulesFollowed} label={isRTL ? 'משמעת' : 'Discipline'} color={T.accent.green} description={isRTL ? 'אחוז עמידה בכללים' : 'Rule compliance %'} />
        <ScoreGauge T={T} score={Math.max(0, 100 - riskCV)} label={isRTL ? 'עקביות סיכון' : 'Risk Consistency'} color={T.accent.orange} description={isRTL ? 'אחידות גודל סיכון' : 'How uniform risk sizing is'} />
        <ScoreGauge T={T} score={stats.orcaScore} label={isRTL ? 'ציון Orca' : 'Orca Score'} color={T.accent.cyan} description={isRTL ? 'ציון משולב' : 'Combined score'} />
        <ScoreGauge T={T} score={Math.max(0, 100 - (revengeTrades / Math.max(1, trades.length)) * 500)} label={isRTL ? 'שליטה רגשית' : 'Emotional Control'} color={T.accent.purple} description={isRTL ? 'היעדר מסחר נקמה ואימפולסיביות' : 'Absence of revenge & impulsive trading'} />
      </div>

      {/* Behavioral signals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {signals.map((sig, i) => (
          <GlassCard T={T} key={i} style={{ borderInlineStart: `3px solid ${severityColor(sig.severity)}`, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>{sig.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: severityColor(sig.severity) }}>{sig.title}</span>
              <TradingBadge color={severityColor(sig.severity)}>
                {sig.severity === 'good' ? (isRTL ? 'תקין' : 'OK') : sig.severity === 'warning' ? (isRTL ? 'אזהרה' : 'Warning') : (isRTL ? 'קריטי' : 'Critical')}
              </TradingBadge>
            </div>
            <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.7 }}>{sig.detail}</div>
          </GlassCard>
        ))}
      </div>

      {/* ═══ POST-LOSS BEHAVIOR BREAKDOWN ═══ */}
      {postLossBehavior.totalAfterLoss > 0 && (
        <GlassCard T={T} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            {isRTL ? 'התנהגות לאחר הפסד' : 'Post-Loss Behavior Breakdown'}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { l: isRTL ? 'הגדלת סיכון' : 'Risk Increase', v: postLossBehavior.riskIncAfterLoss, pct: (postLossBehavior.riskIncAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.red, icon: '📈' },
              { l: isRTL ? 'שמירה על סיכון' : 'Risk Maintained', v: postLossBehavior.sameAfterLoss, pct: (postLossBehavior.sameAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.green, icon: '➡️' },
              { l: isRTL ? 'הקטנת סיכון' : 'Risk Decrease', v: postLossBehavior.riskDecAfterLoss, pct: (postLossBehavior.riskDecAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.blue, icon: '📉' },
              { l: isRTL ? 'עמידה בכללים' : 'Rules Followed', v: postLossBehavior.rulesAfterLoss, pct: (postLossBehavior.rulesAfterLoss / postLossBehavior.totalAfterLoss * 100), c: T.accent.cyan, icon: '✅' },
            ].map((item, i) => (
              <div key={i} style={{ flex: 1, minWidth: 130, padding: 12, background: `${item.c}08`, border: `1px solid ${item.c}20`, borderRadius: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: item.c, fontFamily: "'JetBrains Mono', monospace" }}>{item.pct.toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: T.text.dim, marginTop: 2 }}>{item.l} ({item.v})</div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ═══ DISCIPLINE TIMELINE ═══ */}
      {disciplineTimeline.length > 0 && (
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'מגמת משמעת לאורך זמן' : 'Discipline Trend Over Time'} explanation={EXPLANATIONS.disciplineMetric} unit="%" style={{ marginBottom: 16 }}>
          <LazyChart height={180}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={disciplineTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 9 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 9 }} domain={[0, 100]} />
                <Tooltip contentStyle={tt} />
                <Line type="monotone" dataKey="discipline" stroke={T.accent.green} strokeWidth={2} dot={{ fill: T.accent.green, r: 2 }} name={isRTL ? 'משמעת' : 'Discipline'} />
                <Line type="monotone" dataKey="riskConsistency" stroke={T.accent.orange} strokeWidth={2} dot={{ fill: T.accent.orange, r: 2 }} name={isRTL ? 'עקביות סיכון' : 'Risk Consistency'} />
              </LineChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      )}

      {/* ═══ LOSS PRESSURE TIMELINE ═══ */}
      {lossPressure.length > 0 && (
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'לחץ רצף הפסדים' : 'Loss Streak Pressure'} explanation={EXPLANATIONS.rDistribution} unit="%" style={{ marginBottom: 16 }}>
          <LazyChart height={160}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={lossPressure}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 9 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 9 }} domain={[0, 100]} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="pressure" radius={[3, 3, 0, 0]}>
                  {lossPressure.map((d, i) => <Cell key={i} fill={d.pressure >= 75 ? T.accent.red : d.pressure >= 50 ? T.accent.orange : d.pressure > 0 ? `${T.accent.orange}60` : `${T.accent.green}30`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      )}

      {/* ═══ DEVIATION CHART (ALPHA) ═══ */}
      {isAlpha && (
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'סטייה לפי עסקה' : 'Deviation per Trade'} explanation={EXPLANATIONS.rDistribution} unit="R">
          <LazyChart height={160}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trades.map(tr => ({ id: `#${tr.id}`, dev: tr.deviation || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
                <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(4)}R`} />
                <Bar dataKey="dev" radius={[4, 4, 0, 0]}>
                  {trades.map((tr, i) => <Cell key={i} fill={tr.deviation > 0.1 ? T.accent.red : tr.deviation > 0 ? T.accent.orange : T.accent.green} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      )}
    </>
  );
};
