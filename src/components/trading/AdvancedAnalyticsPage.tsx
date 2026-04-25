import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ZAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, Legend,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import { GlassCard } from './TradingUI';
import { LazyChart } from './LazyChart';
import type { ChartExplanation } from './ChartWrapper';
import { generateDeepInsights, buildInsightVisuals, type DeepInsight, type InsightSeverity } from '@/lib/ai-insights-deep';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  isAlpha: boolean;
  trades: Trade[];
  stats: TradingStats;
  privacyMode: boolean;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
}

// Hebrew-only severity styling
const sevStyle = (s: InsightSeverity, T: TradingTheme) => {
  switch (s) {
    case 'critical': return { color: T.accent.red, bg: `${T.accent.red}10`, border: `${T.accent.red}40`, icon: '⚠️', label: 'דחוף' };
    case 'warning':  return { color: T.accent.orange, bg: `${T.accent.orange}10`, border: `${T.accent.orange}40`, icon: '⚡', label: 'אזהרה' };
    case 'positive': return { color: T.accent.green, bg: `${T.accent.green}10`, border: `${T.accent.green}40`, icon: '✓', label: 'חוזק' };
    case 'neutral':  return { color: T.accent.cyan, bg: `${T.accent.cyan}10`, border: `${T.accent.cyan}40`, icon: 'ℹ', label: 'תובנה' };
  }
};
const catLabel = (c: string) => ({
  behavior: 'התנהגות', edge: 'אדג\'', risk: 'סיכון', timing: 'תזמון', discipline: 'משמעת', pattern: 'דפוס',
} as Record<string, string>)[c] || c;

export const AdvancedAnalyticsPage = ({ T, isAlpha, trades, stats, privacyMode, onExplainClick }: Props) => {
  void isAlpha; void onExplainClick;
  const tt = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.primary, fontSize: 12, boxShadow: T.shadow.elevated, padding: '8px 12px' };

  const insights = useMemo(() => generateDeepInsights(trades), [trades]);
  const viz = useMemo(() => buildInsightVisuals(trades), [trades]);

  const PV = ({ children }: { children: React.ReactNode }) => (
    <span style={privacyMode ? { filter: 'blur(8px)', userSelect: 'none' } : {}}>{children}</span>
  );

  // Empty state
  if (trades.length < 5) {
    return (
      <GlassCard T={T} style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, marginBottom: 8 }}>מנוע התובנות מתחמם</div>
        <div style={{ fontSize: 13, color: T.text.muted }}>נדרשות לפחות 5 עסקאות כדי להתחיל לחשוף דפוסים. כרגע יש {trades.length}.</div>
      </GlassCard>
    );
  }

  const scores = [
    { name: 'אדג\'', value: viz.edgeScore, color: T.accent.cyan },
    { name: 'משמעת', value: viz.disciplineScore, color: T.accent.green },
    { name: 'עקביות', value: viz.consistencyScore, color: T.accent.purple },
    { name: 'התנהגות', value: viz.behaviorScore, color: T.accent.blue },
  ];
  const overallScore = Math.round((viz.edgeScore + viz.disciplineScore + viz.consistencyScore + viz.behaviorScore) / 4);
  const overallLabel = overallScore >= 80 ? 'מצוין' : overallScore >= 65 ? 'טוב' : overallScore >= 50 ? 'בינוני' : overallScore >= 35 ? 'דורש שיפור' : 'קריטי';
  const overallColor = overallScore >= 65 ? T.accent.green : overallScore >= 50 ? T.accent.cyan : overallScore >= 35 ? T.accent.orange : T.accent.red;

  const radarData = scores.map(s => ({ subject: s.name, A: s.value, fullMark: 100 }));

  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;
  const positiveCount = insights.filter(i => i.severity === 'positive').length;

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', 'Assistant', sans-serif" }}>
      {/* ═══ HEADER: AI Insights Hero ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 0, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.accent.purple}15 0%, ${T.accent.cyan}10 50%, ${T.accent.blue}15 100%)`,
          padding: '22px 24px',
          borderBottom: `1px solid ${T.border.subtle}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>🧠</span>
                <span style={{ fontSize: 11, color: T.accent.purple, fontWeight: 700, letterSpacing: '0.15em' }}>מנוע תובנות AI</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text.primary, marginBottom: 4 }}>הניתוח העמוק שלך</div>
              <div style={{ fontSize: 12, color: T.text.muted, maxWidth: 500 }}>
                {insights.length} תובנות נחשפו מתוך {trades.length} עסקאות. אלו דפוסים סמויים שלא תזהה במבט רגיל.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: overallColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{overallScore}</div>
                <div style={{ fontSize: 10, color: T.text.muted, marginTop: 4 }}>ציון כולל</div>
                <div style={{ fontSize: 11, color: overallColor, fontWeight: 700, marginTop: 2 }}>{overallLabel}</div>
              </div>
              <div style={{ width: 1, height: 60, background: T.border.medium }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ textAlign: 'center', minWidth: 50 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{criticalCount}</div>
                  <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>דחופים</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 50 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.accent.orange, fontFamily: "'JetBrains Mono', monospace" }}>{warningCount}</div>
                  <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>אזהרות</div>
                </div>
                <div style={{ textAlign: 'center', minWidth: 50 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>{positiveCount}</div>
                  <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>חוזקות</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ═══ TRADER DNA: Radar + Score Bars ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 16 }}>
        <GlassCard T={T} style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>DNA של הסוחר</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 12 }}>פרופיל המיומנות שלך</div>
          <LazyChart height={240}>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={T.border.medium} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: T.text.secondary, fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fill: T.text.muted, fontSize: 9 }} />
                <Radar name="ציון" dataKey="A" stroke={T.accent.purple} fill={T.accent.purple} fillOpacity={0.35} strokeWidth={2} />
                <Tooltip contentStyle={tt} />
              </RadarChart>
            </ResponsiveContainer>
          </LazyChart>
        </GlassCard>

        <GlassCard T={T} style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>פירוק הציון</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 16 }}>חוזקות וחולשות</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {scores.map(s => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: T.text.secondary, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: 13, color: s.color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}/100</span>
                </div>
                <div style={{ height: 8, background: T.bg.tertiary, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${s.value}%`,
                    background: `linear-gradient(90deg, ${s.color}80, ${s.color})`,
                    borderRadius: 4, transition: 'width 0.8s ease',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: T.text.muted, marginTop: 4 }}>
                  {s.value >= 75 ? 'מצוין - שמור על זה' : s.value >= 55 ? 'יציב - יש מקום לשיפור' : s.value >= 35 ? 'דורש תשומת לב' : 'נקודת חולשה קריטית'}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ═══ DEEP INSIGHTS LIST ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em' }}>תגליות AI</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text.primary }}>תובנות עמוקות מהדאטה שלך</div>
          </div>
          <div style={{ fontSize: 11, color: T.text.muted }}>{insights.length} תובנות פעילות</div>
        </div>
        {insights.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.text.muted, fontSize: 13 }}>
            לא זוהו דפוסים מובהקים עדיין. המשך לסחור - ככל שיש יותר דאטה, התובנות מעמיקות.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((ins) => {
              const st = sevStyle(ins.severity, T);
              return (
                <div key={ins.id} style={{
                  background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, padding: 14,
                  borderInlineStart: `4px solid ${st.color}`, position: 'relative',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14 }}>{st.icon}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: st.color, padding: '2px 8px', background: `${st.color}20`, borderRadius: 4, letterSpacing: '0.08em' }}>{st.label}</span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: T.text.muted, padding: '2px 8px', background: T.bg.tertiary, borderRadius: 4 }}>{catLabel(ins.category)}</span>
                        <span style={{ fontSize: 9, color: T.text.muted }}>ביטחון: {ins.confidence}%</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary, marginBottom: 8 }}>{ins.title}</div>
                    </div>
                    {ins.metric && (
                      <div style={{ textAlign: 'center', minWidth: 100, padding: '8px 12px', background: T.bg.tertiary, borderRadius: 8, border: `1px solid ${T.border.subtle}` }}>
                        <div style={{ fontSize: 9, color: T.text.muted, marginBottom: 2 }}>{ins.metric.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: st.color, fontFamily: "'JetBrains Mono', monospace" }}><PV>{ins.metric.value}</PV></div>
                        {ins.metric.delta && <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>{ins.metric.delta}</div>}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.6, marginBottom: 8 }}>{ins.finding}</div>
                  <div style={{ fontSize: 11, color: T.text.muted, lineHeight: 1.6, marginBottom: 10, padding: '6px 10px', background: T.bg.tertiary, borderRadius: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                    📊 {ins.evidence}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', background: `${st.color}08`, borderRadius: 6, border: `1px dashed ${st.color}30` }}>
                    <span style={{ fontSize: 14 }}>💡</span>
                    <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 500, lineHeight: 1.5 }}>{ins.recommendation}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* ═══ HEATMAP: Day × Hour Performance ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>מפת ביצועים</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 12 }}>תוחלת R לפי יום בשבוע</div>
        <LazyChart height={220}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={viz.performanceByDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dayGradPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.green} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="dayGradNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.red} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={T.accent.red} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="day" tick={{ fill: T.text.secondary, fontSize: 12, fontWeight: 600 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} formatter={(v: number, n) => [`${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}${n === 'exp' ? 'R' : ''}`, n === 'exp' ? 'תוחלת' : n]} />
              <Bar dataKey="exp" radius={[8, 8, 0, 0]}>
                {viz.performanceByDay.map((d, i) => <Cell key={i} fill={d.exp >= 0 ? 'url(#dayGradPos)' : 'url(#dayGradNeg)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </LazyChart>
      </GlassCard>

      {/* ═══ HOURLY PERFORMANCE ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>חלון תזמון</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 12 }}>תוחלת לפי שעה ביום</div>
        <LazyChart height={200}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={viz.performanceByHour}>
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="hour" tick={{ fill: T.text.muted, fontSize: 9 }} interval={1} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} formatter={(v: number) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}R`} />
              <Area type="monotone" dataKey="exp" stroke={T.accent.cyan} strokeWidth={2.5} fill="url(#hrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </LazyChart>
      </GlassCard>

      {/* ═══ RISK vs RETURN SCATTER ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>קורלציה</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 4 }}>סיכון מול תשואה</div>
        <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 12 }}>כל נקודה היא עסקה. גבוה = רווח, נמוך = הפסד. צד ימין = סיכון גבוה.</div>
        <LazyChart height={260}>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis type="number" dataKey="risk" name="סיכון %" tick={{ fill: T.text.muted, fontSize: 10 }} label={{ value: 'סיכון %', position: 'insideBottom', offset: -5, fill: T.text.muted, fontSize: 10 }} />
              <YAxis type="number" dataKey="r" name="תשואה R" tick={{ fill: T.text.muted, fontSize: 10 }} label={{ value: 'תשואה R', angle: -90, position: 'insideLeft', fill: T.text.muted, fontSize: 10 }} />
              <ZAxis type="number" dataKey="size" range={[40, 120]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tt} formatter={(v: number, n: string) => [Number(v).toFixed(2), n]} />
              <Scatter data={viz.riskVsReturn.filter(d => d.result === 'Win')} fill={T.accent.green} fillOpacity={0.7} name="ניצחון" />
              <Scatter data={viz.riskVsReturn.filter(d => d.result === 'Loss')} fill={T.accent.red} fillOpacity={0.7} name="הפסד" />
              <Scatter data={viz.riskVsReturn.filter(d => d.result === 'BE')} fill={T.accent.orange} fillOpacity={0.7} name="ניטרלי" />
              <Legend wrapperStyle={{ fontSize: 11, color: T.text.secondary }} />
            </ScatterChart>
          </ResponsiveContainer>
        </LazyChart>
      </GlassCard>

      {/* ═══ MONTHLY EVOLUTION ═══ */}
      {viz.monthlyEvolution.length >= 2 && (
        <GlassCard T={T} style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>אבולוציה</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 12 }}>התפתחות התוחלת לאורך זמן</div>
          <LazyChart height={220}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={viz.monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="month" tick={{ fill: T.text.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                <Tooltip contentStyle={tt} formatter={(v: number) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}R`} />
                <Line type="monotone" dataKey="exp" stroke={T.accent.purple} strokeWidth={3} dot={{ fill: T.accent.purple, r: 5 }} activeDot={{ r: 7 }} name="תוחלת R" />
              </LineChart>
            </ResponsiveContainer>
          </LazyChart>
        </GlassCard>
      )}

      {/* ═══ SETUP RANKING ═══ */}
      {viz.setupRanking.length > 0 && (
        <GlassCard T={T} style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>דירוג סטאפים</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 12 }}>איזה סטאפ עובד הכי טוב?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {viz.setupRanking.slice(0, 8).map((s, i) => {
              const max = Math.max(...viz.setupRanking.map(x => Math.abs(x.exp)), 0.1);
              const pct = Math.abs(s.exp) / max * 100;
              const positive = s.exp >= 0;
              return (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? T.accent.green : T.bg.tertiary, color: i === 0 ? '#fff' : T.text.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i+1}</div>
                  <div style={{ minWidth: 80, fontSize: 12, fontWeight: 600, color: T.accent.cyan }}>{s.name}</div>
                  <div style={{ flex: 1, height: 22, background: T.bg.tertiary, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: positive
                        ? `linear-gradient(90deg, ${T.accent.green}90, ${T.accent.green})`
                        : `linear-gradient(90deg, ${T.accent.red}90, ${T.accent.red})`,
                      transition: 'width 0.6s ease',
                    }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 11, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
                      {s.exp >= 0 ? '+' : ''}{s.exp.toFixed(2)}R · {s.n} עסקאות
                    </div>
                  </div>
                  <div style={{ minWidth: 80, textAlign: 'left', fontSize: 12, fontWeight: 700, color: s.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
                    <PV>{s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(0)}</PV>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ═══ KEY STATS BAR (compact) ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', fontSize: 11, color: T.text.muted, fontWeight: 700, letterSpacing: '0.08em' }}>נתוני בסיס</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1, padding: '0 1px 1px' }}>
          {[
            { l: 'תוחלת', v: `${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(2)}R`, c: stats.expectancyR >= 0 ? T.accent.cyan : T.accent.red },
            { l: 'פקטור רווח', v: `${stats.profitFactor.toFixed(2)}x`, c: T.accent.blue },
            { l: 'אחוז הצלחה', v: `${stats.winRate.toFixed(1)}%`, c: T.accent.green },
            { l: 'ממוצע רווח', v: `+${stats.avgWinR.toFixed(2)}R`, c: T.accent.green },
            { l: 'ממוצע הפסד', v: `-${stats.avgLossR.toFixed(2)}R`, c: T.accent.red },
            { l: 'נסיגה מקס', v: `${stats.maxDrawdown.toFixed(1)}%`, c: T.accent.orange },
            { l: 'קלי אופטימלי', v: `${stats.kellyOptimal.toFixed(1)}%`, c: T.accent.cyan },
            { l: 'סה"כ עסקאות', v: String(stats.totalTrades), c: T.text.primary },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 14px', background: T.bg.tertiary, borderBottom: `1px solid ${T.border.subtle}` }}>
              <div style={{ fontSize: 10, color: T.text.muted, marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.c, fontFamily: "'JetBrains Mono', monospace" }}><PV>{s.v}</PV></div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};
