import './dashboard.css';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import type { CSSProperties } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';
import { MetricCard, ScoreGauge } from '@/components/trading/TradingUI';
import { AdaptiveExpectancyCard, AdaptiveQuickStats } from '@/components/trading/AdaptiveKpiCards';
import { ChartWrapper, EXPLANATIONS, type ChartExplanation } from '@/components/trading/ChartWrapper';
import { FeatureHint } from '@/components/trading/FeatureHint';
import DashboardAdvancedLab from './DashboardAdvancedLab';
import { TierGate } from '@/components/billing/TierGate';
import { BestWorstWindowChart } from './BestWorstWindowChart';
import { useDisplayMode } from '@/lib/display-mode';


interface ReviewDashboardProps {
  T: TradingTheme;
  t: any;
  isRTL: boolean;
  trades: Trade[];
  stats: any;
  riskData: any;
  radarData: any[];
  tt: CSSProperties;
  privacyMode: boolean;
  isAdvancedTier: boolean;
  isUltimateTier: boolean;
  isAlpha: boolean;
  advancedOpen: boolean;
  setAdvancedOpen: (open: boolean) => void;
  isChartVisible: (chartId: string) => boolean;
  handleHideChart: (chartId: string) => void;
  handleExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
}

const PV = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const ReviewDashboard = ({
  T, t, isRTL, trades, stats, riskData, radarData, tt, privacyMode,
  isAdvancedTier, isUltimateTier, isAlpha,
  advancedOpen, setAdvancedOpen, isChartVisible, handleHideChart, handleExplainClick,
}: ReviewDashboardProps) => {
  const { displayMode } = useDisplayMode();
  const isMoney = displayMode === 'MONEY';
  return (
    <div className="dash-root" dir={isRTL ? 'rtl' : 'ltr'}>

      <h2 className="dash-greeting">{t.goodMorning} 👋</h2>

      <FeatureHint
        T={T}
        id="dashboard-review-layers"
        text={isRTL
          ? 'הדאשבורד בנוי בשלוש שכבות: בריאות מסחר (KPI), בריאות מערכת (Orca Score, Regime Fit, משמעת) וניתוח מתקדם (פתח/סגור).'
          : 'The dashboard is built in 3 layers: Trading Health (KPIs), System Health (Orca Score, Regime Fit, Discipline), and Advanced Analysis (collapsible).'}
      />

      {/* ═══ LAYER 1 — CORE TRADING HEALTH ═══ */}
      <div className="dash-section">
        <div className="dash-section-label" style={{ color: T.accent.cyan }}>
          {isRTL ? 'בריאות מסחר' : 'TRADING HEALTH'}
        </div>
        <div className="dash-kpi-grid">
          <MetricCard T={T} label={t.netPnl} value={stats.totalPnl} color={stats.totalPnl >= 0 ? T.accent.cyan : T.accent.red} onInfoClick={() => handleExplainClick(t.netPnl, EXPLANATIONS.netPnl)} />
          <MetricCard T={T} label={t.winRate} value={stats.winRate} suffix="%" color={T.accent.green} onInfoClick={() => handleExplainClick(t.winRate, EXPLANATIONS.winRate)} />
          <AdaptiveExpectancyCard
            T={T}
            trades={trades}
            stats={stats}
            isRTL={isRTL}
            isMobile={false /* CSS handles responsive */}
            privacyMode={privacyMode}
            onInfoClick={() => handleExplainClick(t.expectancy, EXPLANATIONS.expectancy)}
            labels={{
              expectancy: t.expectancy,
              avgPnl: isRTL ? 'תוחלת ($)' : 'Avg P&L ($)',
              tooltipR: isRTL ? 'תוחלת לעסקה ביחידות סיכון' : 'Expected return per trade in risk units',
              tooltipMoney: isRTL ? 'רווח/הפסד ממוצע לעסקה' : 'Average profit/loss per trade',
            }}
          />
          <MetricCard T={T} label={t.maxDrawdown} value={`${stats.maxDrawdown.toFixed(1)}%`} color={T.accent.orange} onInfoClick={() => handleExplainClick(t.maxDrawdown, EXPLANATIONS.maxDrawdownMetric)} />
        </div>
      </div>

      {/* ═══ LAYER 2 — EDGE & SYSTEM HEALTH ═══ */}
      <div className="dash-section">
        <div className="dash-section-label" style={{ color: T.accent.purple }}>
          {isRTL ? 'בריאות מערכת' : 'SYSTEM HEALTH'}
        </div>
        <div className="dash-score-grid">
          <ScoreGauge T={T} score={stats.orcaScore} label={t.orcaScore} color={T.accent.cyan}
            description={isRTL ? 'ציון משולב של משמעת, סיכון ועקביות' : 'Combined discipline, risk & consistency score'}
            onInfoClick={() => handleExplainClick(t.orcaScore, EXPLANATIONS.orcaScore)} />
          <ScoreGauge T={T} score={stats.regimeFit} label={t.regimeFit} color={T.accent.purple}
            description={isRTL ? 'מודד התאמת האסטרטגיה לתנאי השוק' : 'Strategy fit to current market conditions'}
            onInfoClick={() => handleExplainClick(t.regimeFit, EXPLANATIONS.regimeFit)} />
          <ScoreGauge T={T} score={riskData.riskConsistencyScore} label={t.riskConsistency} color={T.accent.orange}
            description={isRTL ? 'מודד עקביות אחוז הסיכון בין עסקאות' : 'Measures consistent risk % across trades'}
            onInfoClick={() => handleExplainClick(t.riskConsistency, EXPLANATIONS.riskConsistencyMetric)} />
          <ScoreGauge T={T} score={stats.rulesFollowed} label={t.disciplineScore} color={T.accent.green}
            description={isRTL ? 'אחוז העסקאות שבוצעו לפי הכללים' : 'Percentage of trades following your rules'}
            onInfoClick={() => handleExplainClick(t.disciplineScore, EXPLANATIONS.disciplineMetric)} />
        </div>
      </div>

      {/* ═══ LAYER 3 — ADVANCED (COLLAPSIBLE) ═══ */}
      <div style={{ marginBottom: 18 }}>
        <button
          className="dash-advanced-toggle"
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          <span className="dash-advanced-chevron" data-open={advancedOpen}>▸</span>
          <span>{isRTL ? 'ניתוח מתקדם — גרפים, חלוקה והתפלגות' : 'Advanced Analysis — Charts, Breakdown & Distribution'}</span>
          <span className="dash-advanced-meta">
            {advancedOpen ? (isRTL ? 'הסתר' : 'Collapse') : (isRTL ? 'הרחב' : 'Expand')}
          </span>
        </button>

        {advancedOpen && (
          <div className="dash-advanced-body">
            {/* Equity + Distribution */}
            <div className="dash-charts-2">
              {isChartVisible('equityCurve') && (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.equityCurve} explanation={EXPLANATIONS.equityCurve} unit="$" chartId="equityCurve" onRemove={handleHideChart}>
                    <div className="dash-chart-h-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.equityCurve} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                          <defs><linearGradient id="eqGAdvNew" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.6}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.25}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                          <XAxis dataKey="trade" tick={{ fill: T.text.muted, fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
                          <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={40} domain={[(d: number) => Math.floor(d * 0.98), (d: number) => Math.ceil(d * 1.02)]} />
                          <Tooltip contentStyle={tt} />
                          <ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" />
                          <Area type="monotone" dataKey="balance" stroke={T.accent.cyan} fill="url(#eqGAdvNew)" strokeWidth={2.5} dot={trades.length <= 50 ? { fill: T.accent.cyan, r: 3 } : false} activeDot={{ r: 5, fill: T.accent.cyan }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper>
                </div>
              )}
              {isChartVisible('pnlDistribution') && (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit="$" chartId="pnlDistribution" onRemove={handleHideChart}>
                    <div className="dash-chart-h-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trades.map((tr: Trade) => ({ id: tr.id, pnl: tr.pnl }))} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                          <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                          <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={40} />
                          <Tooltip contentStyle={tt} />
                          <Bar dataKey="pnl" radius={[4,4,0,0]}>
                            {trades.map((tr: Trade, i: number) => <Cell key={i} fill={tr.pnl >= 0 ? T.accent.green : T.accent.red} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper>
                </div>
              )}
            </div>

            {/* Radar + Coin + Direction */}
            <div className="dash-charts-3">
              {isAdvancedTier && isChartVisible('radarScore') && (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ציון Orca — פירוט' : 'Orca Score — Breakdown'} explanation={EXPLANATIONS.radarScore} chartId="radarScore" onRemove={handleHideChart}>
                    <div className="dash-chart-h-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="58%" margin={{ top: 16, right: 28, bottom: 16, left: 28 }}>
                          <PolarGrid stroke={T.border.medium} />
                          <PolarAngleAxis dataKey="m" tick={{ fill: T.text.secondary, fontSize: 10 }} />
                          <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
                          <Radar dataKey="v" stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.55} strokeWidth={2.5} dot={{ r: 3, fill: T.accent.cyan, stroke: T.bg.card, strokeWidth: 1 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper>
                </div>
              )}
              {isAdvancedTier && isChartVisible('coinPerformance') && (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.coinPerformance} explanation={EXPLANATIONS.coinPerformance} unit="$" chartId="coinPerformance" onRemove={handleHideChart}>
                    <div className="dash-chart-h-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.coinPerf} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                          <XAxis type="number" tick={{ fill: T.text.muted, fontSize: 10 }} />
                          <YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 11 }} width={45} />
                          <Tooltip contentStyle={tt} />
                          <Bar dataKey="pnl" radius={[0,4,4,0]}>
                            {stats.coinPerf.map((c: any, i: number) => <Cell key={i} fill={c.pnl >= 0 ? T.accent.green : T.accent.red} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper>
                </div>
              )}
              {isUltimateTier && (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.directionAnalysis} explanation={EXPLANATIONS.directionAnalysis}>
                    <div style={{ height: 180, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Pie data={stats.directionData} dataKey="trades" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={4} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            <Cell fill={T.accent.green} /><Cell fill={T.accent.red} />
                          </Pie>
                          <Tooltip contentStyle={tt} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 2 }}>
                      {stats.directionData.map((d: any, i: number) => {
                        const displayVal = isMoney
                          ? `${d.pnl >= 0 ? '+' : '-'}$${Math.abs(d.pnl).toFixed(2)}`
                          : `${d.expectancyR >= 0 ? '+' : ''}${d.expectancyR.toFixed(2)}R`;
                        const tone = isMoney ? d.pnl : d.expectancyR;
                        return (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: T.text.muted }}>{d.name}</div>
                            <PV><div style={{ fontSize: 11, fontWeight: 600, color: tone >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{displayVal}</div></PV>
                            <div style={{ fontSize: 9, color: T.text.muted }}>WR: {d.winRate.toFixed(0)}%</div>
                          </div>
                        );
                      })}
                    </div>

                  </ChartWrapper>
                </div>
              )}
            </div>

            {/* Quick Stats — adaptive (R / $) */}
            <AdaptiveQuickStats
              T={T}
              trades={trades}
              stats={stats}
              isRTL={isRTL}
              privacyMode={privacyMode}
              streakDisplay={`${stats.currentStreak} ${stats.streakType === 'Loss' ? '🔴' : '🟢'}`}
              streakColor={T.text.primary}
              labels={{
                title: isRTL ? 'סטטיסטיקות מהירות' : 'Quick Stats',
                avgWin: t.avgWin,
                avgLoss: t.avgLoss,
                bestTrade: t.bestTrade,
                worstTrade: t.worstTrade,
                profitFactor: t.profitFactor,
                currentStreak: t.currentStreak,
              }}
            />

            {/* Alpha additions */}
            {isAlpha && (
              <div className="dash-charts-alpha">
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.riskEvolution} explanation={EXPLANATIONS.riskAllocation} unit="%">
                    <div className="dash-chart-h-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={riskData.riskGrowthEvolution} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                          <defs>
                            <linearGradient id="riskEvoGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={T.accent.orange} stopOpacity={0.5} />
                              <stop offset="100%" stopColor={T.accent.orange} stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                          <XAxis dataKey="tradeId" tick={{ fill: T.text.muted, fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
                          <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} width={32} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                          <Tooltip contentStyle={tt} formatter={(v: any) => [`${Number(v).toFixed(2)}%`, isRTL ? 'סיכון' : 'Risk']} />
                          <ReferenceLine y={2} stroke={T.accent.green} strokeDasharray="2 2" strokeOpacity={0.4} />
                          <Area type="monotone" dataKey="pctOfAccount" stroke={T.accent.orange} strokeWidth={2.2} fill="url(#riskEvoGrad)" dot={false} activeDot={{ r: 4, fill: T.accent.orange }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper>
                </div>
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביצועים חודשיים (R)' : 'Monthly Performance (R)'} explanation={EXPLANATIONS.monthlyPerformance} unit="R">
                    {stats.monthlyPerf.map((mp: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border.subtle}` }}>
                        <span style={{ fontSize: 12, color: T.text.secondary }}>{mp.month}</span>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <PV><span style={{ fontSize: 11, color: mp.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{mp.pnl >= 0 ? '+' : ''}${mp.pnl.toFixed(2)}</span></PV>
                          <span style={{ fontSize: 11, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace" }}>{mp.expectancyR >= 0 ? '+' : ''}{mp.expectancyR.toFixed(2)}R</span>
                        </div>
                      </div>
                    ))}
                  </ChartWrapper>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ ADVANCED ANALYTICS LAB — Ultimate-tier · follows global $/R mode ═══ */}
      <TierGate required="ultimate" label="Advanced Analytics Lab" silent>
        <DashboardAdvancedLab T={T} isRTL={isRTL} trades={trades} />
      </TierGate>
    </div>
  );
};
