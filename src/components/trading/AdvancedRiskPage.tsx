import { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { RiskAssessment } from '@/lib/risk-engine';
import type { TradingStats } from '@/lib/trading-analytics';
import { GlassCard, MetricCard, ScoreGauge, TradingBadge } from './TradingUI';
import { ChartWrapper, EXPLANATIONS } from './ChartWrapper';
import { LazyChart } from './LazyChart';
import type { ChartExplanation } from './ChartWrapper';

interface AdvancedRiskPageProps {
  T: TradingTheme;
  isRTL: boolean;
  isAlpha: boolean;
  trades: Trade[];
  stats: TradingStats;
  riskData: RiskAssessment;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
  riskExplanations: Array<{ tradeId: number; reason: string; customNote?: string; timestamp: string }>;
}

export const AdvancedRiskPage = ({ T, isRTL, isAlpha, trades, stats, riskData, onExplainClick, riskExplanations }: AdvancedRiskPageProps) => {
  const tt = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.primary, fontSize: 12, boxShadow: T.shadow.elevated, padding: '8px 12px' };

  // Risk behavior over time
  const riskTimeline = useMemo(() => {
    if (trades.length < 2) return [];
    return trades.map((t, i) => {
      const prevRisk = i > 0 ? trades[i - 1].risk : t.risk;
      const change = prevRisk > 0 ? ((t.risk - prevRisk) / prevRisk) * 100 : 0;
      return { id: t.id, risk: t.risk, riskPct: t.riskPct, change, coin: t.coin, wasLoss: i > 0 && trades[i - 1].winLoss === 'Loss' };
    });
  }, [trades]);

  // Detect risk anomalies
  const anomalies = useMemo(() => {
    const results: Array<{ type: string; severity: 'warning' | 'danger'; title: string; detail: string; icon: string; tradeIds: number[] }> = [];

    // 1. Sudden risk doubles
    const doubles: number[] = [];
    for (let i = 1; i < trades.length; i++) {
      if (trades[i].risk > trades[i - 1].risk * 1.8) doubles.push(trades[i].id);
    }
    if (doubles.length > 0) {
      results.push({
        type: 'risk-spike', severity: 'danger', icon: '🚨',
        title: isRTL ? 'קפיצת סיכון פתאומית' : 'Sudden Risk Spike',
        detail: isRTL
          ? `${doubles.length} עסקאות בהן הסיכון כפול או יותר מהעסקה הקודמת. זה מעיד על קבלת החלטות רגשית.`
          : `${doubles.length} trades where risk was nearly doubled vs previous. This signals emotional sizing.`,
        tradeIds: doubles,
      });
    }

    // 2. Risk increase after loss
    const postLossIncrease: number[] = [];
    for (let i = 1; i < trades.length; i++) {
      if (trades[i - 1].winLoss === 'Loss' && trades[i].risk > trades[i - 1].risk * 1.2) {
        postLossIncrease.push(trades[i].id);
      }
    }
    if (postLossIncrease.length > 0) {
      results.push({
        type: 'post-loss-escalation', severity: 'danger', icon: '🔥',
        title: isRTL ? 'הסלמה לאחר הפסד' : 'Post-Loss Risk Escalation',
        detail: isRTL
          ? `${postLossIncrease.length} עסקאות בהן הגדלת סיכון לאחר הפסד. זהו סימן קלאסי למסחר נקמה.`
          : `${postLossIncrease.length} trades with increased risk after a loss. Classic revenge trading signal.`,
        tradeIds: postLossIncrease,
      });
    }

    // 3. Setup-specific risk differences
    const setupRisks: Record<string, number[]> = {};
    trades.forEach(t => {
      if (!setupRisks[t.coin]) setupRisks[t.coin] = [];
      setupRisks[t.coin].push(t.riskPct);
    });
    const setupDiffs = Object.entries(setupRisks).filter(([, risks]) => {
      if (risks.length < 2) return false;
      const avg = risks.reduce((a, b) => a + b, 0) / risks.length;
      const std = Math.sqrt(risks.reduce((s, r) => s + (r - avg) ** 2, 0) / risks.length);
      return avg > 0 && (std / avg) > 0.5;
    });
    if (setupDiffs.length > 0) {
      results.push({
        type: 'setup-inconsistency', severity: 'warning', icon: '📊',
        title: isRTL ? 'חוסר עקביות בסיכון בין סטאפים' : 'Risk Inconsistency Across Setups',
        detail: isRTL
          ? `${setupDiffs.length} סטאפים עם שונות גבוהה באחוז הסיכון: ${setupDiffs.map(([c]) => c).join(', ')}`
          : `${setupDiffs.length} setups with high risk variance: ${setupDiffs.map(([c]) => c).join(', ')}`,
        tradeIds: [],
      });
    }

    // 4. Position sizing drift
    if (trades.length >= 6) {
      const first3 = trades.slice(0, 3).map(t => t.riskPct);
      const last3 = trades.slice(-3).map(t => t.riskPct);
      const avgFirst = first3.reduce((a, b) => a + b, 0) / 3;
      const avgLast = last3.reduce((a, b) => a + b, 0) / 3;
      if (avgFirst > 0 && Math.abs(avgLast - avgFirst) / avgFirst > 0.4) {
        results.push({
          type: 'sizing-drift', severity: 'warning', icon: '📐',
          title: isRTL ? 'נדידת גודל פוזיציה' : 'Position Sizing Drift',
          detail: isRTL
            ? `אחוז הסיכון שלך השתנה מממוצע ${avgFirst.toFixed(1)}% ל-${avgLast.toFixed(1)}%. בדוק אם זה מכוון.`
            : `Your risk % shifted from avg ${avgFirst.toFixed(1)}% to ${avgLast.toFixed(1)}%. Verify this is intentional.`,
          tradeIds: [],
        });
      }
    }

    return results;
  }, [trades, isRTL]);

  // Risk per setup comparison
  const setupComparison = useMemo(() => {
    const map: Record<string, { coin: string; trades: number; avgRisk: number; avgRiskPct: number; wins: number; totalR: number }> = {};
    trades.forEach(t => {
      if (!map[t.coin]) map[t.coin] = { coin: t.coin, trades: 0, avgRisk: 0, avgRiskPct: 0, wins: 0, totalR: 0 };
      map[t.coin].trades++;
      map[t.coin].avgRisk += t.risk;
      map[t.coin].avgRiskPct += t.riskPct;
      map[t.coin].totalR += t.returnR;
      if (t.winLoss === 'Win') map[t.coin].wins++;
    });
    return Object.values(map).map(s => ({
      ...s,
      avgRisk: s.avgRisk / s.trades,
      avgRiskPct: s.avgRiskPct / s.trades,
      winRate: (s.wins / s.trades) * 100,
      avgR: s.totalR / s.trades,
    })).sort((a, b) => b.trades - a.trades);
  }, [trades]);

  const dailyPnlToday = trades.filter(tr => {
    const d = new Date(tr.date.replace(' ', 'T'));
    return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }).reduce((s, tr) => s + tr.pnl, 0);

  const riskLevel = stats.maxConsecLosses >= 4 ? 'critical' : stats.maxConsecLosses >= 3 ? 'warning' : 'safe';
  const riskPct = Math.min(100, (stats.maxDrawdown / 10) * 100);

  return (
    <>
      {/* ═══ TOP ROW — Risk Gauges ═══ */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <GlassCard T={T} glow={riskLevel === 'warning' ? 'rgba(245,158,11,0.12)' : T.accent.greenGlow} style={{ flex: 1, minWidth: 220, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{isRTL ? 'מד סיכון' : 'Risk Meter'}</div>
          <svg width="190" height="105" viewBox="0 0 200 110" style={{ margin: '0 auto', display: 'block' }}>
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={T.border.subtle} strokeWidth="12" strokeLinecap="round" />
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#rGadv)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${riskPct * 2.51} 251`} style={{ transition: 'stroke-dasharray 1s ease' }} />
            <defs><linearGradient id="rGadv" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={T.accent.green} /><stop offset="50%" stopColor={T.accent.orange} /><stop offset="100%" stopColor={T.accent.red} /></linearGradient></defs>
            <text x="100" y="82" textAnchor="middle" fill={riskLevel === 'critical' ? T.accent.red : riskLevel === 'warning' ? T.accent.orange : T.accent.green} fontSize="26" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{riskPct.toFixed(0)}%</text>
            <text x="100" y="102" textAnchor="middle" fill={T.text.dim} fontSize="10">{riskLevel === 'critical' ? 'CRITICAL' : riskLevel === 'warning' ? 'WARNING' : 'SAFE'}</text>
          </svg>
        </GlassCard>
        <ScoreGauge T={T} score={riskData.riskConsistencyScore} label={isRTL ? 'עקביות סיכון' : 'Risk Consistency'} color={T.accent.orange} description={isRTL ? 'עד כמה הסיכון שלך עקבי בין עסקאות' : 'How consistent your risk is across trades'} />
        <GlassCard T={T} style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{isRTL ? 'גבולות סיכון' : 'Risk Guardrails'}</div>
          {[
            { l: isRTL ? 'הפסד יומי מקס' : 'Daily Max Loss', val: '$8.00', cur: `$${Math.abs(dailyPnlToday).toFixed(2)}`, ok: Math.abs(dailyPnlToday) < 8 },
            { l: isRTL ? 'נסיגה מקסימלית' : 'Max Drawdown', val: '5%', cur: `${stats.maxDrawdown.toFixed(1)}%`, ok: stats.maxDrawdown < 5 },
            { l: isRTL ? 'הפסדים רצופים' : 'Consec. Losses', val: '4', cur: String(stats.maxConsecLosses), ok: stats.maxConsecLosses < 4 },
            { l: isRTL ? 'עקביות סיכון' : 'Risk Consistency', val: '70+', cur: `${riskData.riskConsistencyScore.toFixed(0)}`, ok: riskData.riskConsistencyScore >= 70 },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 3 ? `1px solid ${T.border.subtle}` : 'none' }}>
              <span style={{ color: T.text.muted, fontSize: 11 }}>{r.l}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: T.text.dim, fontFamily: "'JetBrains Mono', monospace" }}>{r.cur}/{r.val}</span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.ok ? T.accent.green : T.accent.red }} />
              </div>
            </div>
          ))}
        </GlassCard>
      </div>

      {/* ═══ RISK ANOMALIES ═══ */}
      {anomalies.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: T.accent.red, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 1, background: T.accent.red, display: 'inline-block' }} />
            {isRTL ? 'חריגות סיכון שזוהו' : 'RISK ANOMALIES DETECTED'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {anomalies.map((a, i) => (
              <GlassCard T={T} key={i} style={{ borderInlineStart: `3px solid ${a.severity === 'danger' ? T.accent.red : T.accent.orange}`, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: a.severity === 'danger' ? T.accent.red : T.accent.orange }}>{a.title}</span>
                  <TradingBadge color={a.severity === 'danger' ? T.accent.red : T.accent.orange}>
                    {a.severity === 'danger' ? (isRTL ? 'קריטי' : 'Critical') : (isRTL ? 'אזהרה' : 'Warning')}
                  </TradingBadge>
                </div>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.7 }}>{a.detail}</div>
                {a.tradeIds.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {a.tradeIds.slice(0, 8).map(id => (
                      <span key={id} style={{ fontSize: 9, padding: '2px 6px', background: `${T.accent.red}12`, border: `1px solid ${T.accent.red}25`, borderRadius: 4, color: T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>#{id}</span>
                    ))}
                    {a.tradeIds.length > 8 && <span style={{ fontSize: 9, color: T.text.dim }}>+{a.tradeIds.length - 8} more</span>}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* ═══ RISK BEHAVIOR TIMELINE ═══ */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'התפתחות סיכון לאורך זמן' : 'Risk Evolution Over Time'} explanation={EXPLANATIONS.riskAllocation} unit="$" style={{ flex: 2, minWidth: 340 }}>
          <LazyChart height={200}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={riskTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 9 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 9 }} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="risk" radius={[3, 3, 0, 0]}>
                  {riskTimeline.map((d, i) => (
                    <Cell key={i} fill={d.wasLoss ? `${T.accent.red}80` : d.change > 50 ? T.accent.orange : `${T.accent.blue}60`} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="riskPct" stroke={T.accent.cyan} strokeWidth={2} dot={{ fill: T.accent.cyan, r: 2 }} yAxisId={0} />
              </ComposedChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>

        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'שינוי סיכון (%)' : 'Risk Change %'} explanation={EXPLANATIONS.riskAllocation} unit="%" style={{ flex: 1, minWidth: 260 }}>
          <LazyChart height={200}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskTimeline.slice(1)}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 9 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 9 }} />
                <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="change" radius={[3, 3, 0, 0]}>
                  {riskTimeline.slice(1).map((d, i) => (
                    <Cell key={i} fill={Math.abs(d.change) > 50 ? T.accent.red : Math.abs(d.change) > 20 ? T.accent.orange : T.accent.green} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      </div>

      {/* ═══ SETUP RISK COMPARISON TABLE ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isRTL ? 'השוואת סיכון בין סטאפים' : 'Risk Comparison by Setup'}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.bg.tertiary }}>
                {[isRTL ? 'סטאפ' : 'Setup', isRTL ? 'עסקאות' : 'Trades', isRTL ? 'סיכון ממוצע $' : 'Avg Risk $', isRTL ? 'סיכון ממוצע %' : 'Avg Risk %', isRTL ? 'הצלחה' : 'Win Rate', isRTL ? 'ממוצע R' : 'Avg R'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: isRTL ? 'right' : 'left', color: T.text.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${T.border.medium}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setupComparison.map((s, idx) => (
                <tr key={s.coin} style={{ background: idx % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: T.accent.cyan }}>{s.coin}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>{s.trades}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>${s.avgRisk.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>{s.avgRiskPct.toFixed(2)}%</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: s.winRate >= 50 ? T.accent.green : T.accent.red }}>{s.winRate.toFixed(0)}%</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", color: s.avgR >= 0 ? T.accent.green : T.accent.red }}>{s.avgR >= 0 ? '+' : ''}{s.avgR.toFixed(2)}R</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ═══ RISK ALLOCATION + DRAWDOWN ═══ */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'הקצאת סיכון' : 'Risk Allocation'} explanation={EXPLANATIONS.riskAllocation} unit="%" style={{ flex: 1, minWidth: 280 }}>
          <LazyChart height={190}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={riskData.riskAllocation} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis type="number" tick={{ fill: T.text.dim, fontSize: 10 }} />
                <YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 11 }} width={45} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]} fill={T.accent.blue} />
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'ניתוח נסיגה' : 'Drawdown Analysis'} explanation={EXPLANATIONS.drawdown} unit="%" style={{ flex: 1, minWidth: 280 }}>
          <LazyChart height={190}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={(() => { let p = 0; return stats.equityCurve.map(e => { if (e.balance > p) p = e.balance; return { trade: e.trade, dd: p > 0 ? -((p - e.balance) / p * 100) : 0 }; }); })()}>
                <defs><linearGradient id="dGadv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.red} stopOpacity={0} /><stop offset="100%" stopColor={T.accent.red} stopOpacity={0.3} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="trade" tick={{ fill: T.text.dim, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} domain={['dataMin', 0]} />
                <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Area type="monotone" dataKey="dd" stroke={T.accent.red} fill="url(#dGadv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      </div>

      {/* ═══ RISK EVOLUTION CHART ═══ */}
      {isAlpha && (
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'אבולוציית סיכון מלאה' : 'Full Risk Evolution'} explanation={EXPLANATIONS.riskAllocation} unit="%" style={{ marginBottom: 16 }}>
          <LazyChart height={180}>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={riskData.riskGrowthEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="tradeId" tick={{ fill: T.text.dim, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="risk" fill={`${T.accent.blue}40`} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="pctOfAccount" stroke={T.accent.orange} strokeWidth={2} dot={{ fill: T.accent.orange, r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      )}

      {/* ═══ COOL OFF + WARNINGS ═══ */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <GlassCard T={T} style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{isRTL ? 'מצב צינון' : 'Cool-Off Status'}</div>
          <div style={{ padding: 14, borderRadius: 10, textAlign: 'center', background: stats.maxConsecLosses >= 3 ? `${T.accent.orange}10` : `${T.accent.green}10`, border: `1px solid ${stats.maxConsecLosses >= 3 ? T.accent.orange : T.accent.green}25` }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{stats.maxConsecLosses >= 3 ? '⚠️' : '✅'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: stats.maxConsecLosses >= 3 ? T.accent.orange : T.accent.green }}>
              {stats.maxConsecLosses >= 3 ? (isRTL ? 'מומלץ: צינון' : 'Recommended: Cool Off') : (isRTL ? 'מותר לסחור' : 'Clear to Trade')}
            </div>
          </div>
        </GlassCard>
        {riskData.warnings.length > 0 && (
          <GlassCard T={T} style={{ flex: 2, minWidth: 300, borderInlineStart: `3px solid ${T.accent.orange}` }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'אזהרות סיכון' : 'Risk Warnings'}</div>
            {riskData.warnings.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < riskData.warnings.length - 1 ? `1px solid ${T.border.subtle}` : 'none' }}>
                <span style={{ color: T.accent.orange }}>⚠️</span>
                <span style={{ fontSize: 12, color: T.text.secondary }}>{w}</span>
              </div>
            ))}
          </GlassCard>
        )}
      </div>

      {/* ═══ RISK EXPLANATIONS LOG ═══ */}
      {riskExplanations.length > 0 && (
        <GlassCard T={T} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            {isRTL ? 'יומן הסברי סיכון' : 'Risk Explanation Log'}
          </div>
          {riskExplanations.slice(-10).reverse().map((exp, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border.subtle}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, padding: '2px 6px', background: `${T.accent.cyan}12`, borderRadius: 4, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>#{exp.tradeId}</span>
                <span style={{ fontSize: 12, color: T.text.secondary }}>{exp.reason}</span>
              </div>
              {exp.customNote && <span style={{ fontSize: 10, color: T.text.dim, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.customNote}</span>}
            </div>
          ))}
        </GlassCard>
      )}
    </>
  );
};
