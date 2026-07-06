import './dashboard.css';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { lazy, Suspense, useMemo, useState, type CSSProperties } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';
import { MetricCard, ScoreGauge } from '@/components/trading/TradingUI';
import { AdaptiveExpectancyCard, AdaptiveQuickStats } from '@/components/trading/AdaptiveKpiCards';
import { ChartWrapper, EXPLANATIONS, type ChartExplanation } from '@/components/trading/ChartWrapper';
import { FeatureHint } from '@/components/trading/FeatureHint';
import DashboardCalendarStrip from './DashboardCalendarStrip';

// Lazy-load heavy chart bundles. These charts sit inside the collapsible
// Advanced Analysis section AND behind tier gates (Advanced/Alpha), so most
// users never see them. Downloading + parsing recharts sub-trees on mount
// was pure waste — now they are code-split and only fetched when the gate
// actually opens.
const PnLDistributionHistogram = lazy(() => import('./PnLDistributionHistogram').then(m => ({ default: m.PnLDistributionHistogram })));
const BestWorstWindowChart = lazy(() => import('./BestWorstWindowChart').then(m => ({ default: m.BestWorstWindowChart })));
const WinsByMonthChart = lazy(() => import('./SimpleExtraCharts').then(m => ({ default: m.WinsByMonthChart })));
const WinsByQuarterChart = lazy(() => import('./SimpleExtraCharts').then(m => ({ default: m.WinsByQuarterChart })));
const ReturnPerTimeChart = lazy(() => import('./SimpleExtraCharts').then(m => ({ default: m.ReturnPerTimeChart })));
const QuarterlyWinsLossesYoYChart = lazy(() => import('./SimpleExtraCharts').then(m => ({ default: m.QuarterlyWinsLossesYoYChart })));
const QuarterlyYearMatrixChart = lazy(() => import('./SimpleExtraCharts').then(m => ({ default: m.QuarterlyYearMatrixChart })));
const QuarterlyPerformanceCard = lazy(() => import('@/components/trading/QuarterlyPerformanceCard').then(m => ({ default: m.QuarterlyPerformanceCard })));

import { OpenPositionsPanel } from './OpenPositionsPanel';
import { useDisplayMode, hasStrictR } from '@/lib/display-mode';
import { getEffectiveR } from '@/lib/r-multiple';
import { ShareStatsModal } from '@/components/trading/ShareStatsModal';
import { Share2 } from 'lucide-react';

// Thin wrapper so lazy children get a graceful fallback while their chunk loads.
const LazyChart = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div style={{ height: 220 }} aria-hidden />}>{children}</Suspense>
);




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
  onAddTrade?: (trade: Omit<Trade, 'id' | 'balance'>) => Promise<any> | any;
}

const PV = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const parseDateMs = (raw: string) => new Date(String(raw || '').replace(' ', 'T')).getTime() || 0;
const fmtDashValue = (v: number, isMoney: boolean) => {
  if (!Number.isFinite(v)) return '—';
  if (!isMoney) return `${v >= 0 ? '+' : ''}${v.toFixed(Math.abs(v) >= 10 ? 1 : 2)}R`;
  const sign = v >= 0 ? '+' : '-';
  const abs = Math.abs(v);
  return abs >= 1000 ? `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : `${sign}$${abs.toFixed(abs >= 100 ? 0 : 2)}`;
};

/**
 * Time-of-day greeting (user-local clock). Windows:
 *   04:00–11:59  → Good morning      / בוקר טוב
 *   12:00–16:29  → Good afternoon    / צהריים טובים
 *   16:30–17:59  → Good late afternoon / אחר הצהריים טובים
 *   18:00–21:59  → Good evening      / ערב טוב
 *   22:00–03:59  → Good night        / לילה טוב
 */
function getTimeOfDayGreeting(isRTL: boolean): string {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  // 4:00 = 240, 12:00 = 720, 16:30 = 990, 18:00 = 1080, 22:00 = 1320
  let he: string, en: string;
  if (mins >= 240 && mins < 720)        { he = 'בוקר טוב, סוחר';            en = 'Good morning, Trader'; }
  else if (mins >= 720 && mins < 990)   { he = 'צהריים טובים, סוחר';        en = 'Good afternoon, Trader'; }
  else if (mins >= 990 && mins < 1080)  { he = 'אחר הצהריים טובים, סוחר';   en = 'Good late afternoon, Trader'; }
  else if (mins >= 1080 && mins < 1320) { he = 'ערב טוב, סוחר';             en = 'Good evening, Trader'; }
  else                                  { he = 'לילה טוב, סוחר';            en = 'Good night, Trader'; }
  return isRTL ? he : en;
}


export const ReviewDashboard = ({
  T, t, isRTL, trades, stats, riskData, radarData, tt, privacyMode,
  isAdvancedTier, isUltimateTier, isAlpha,
  advancedOpen, setAdvancedOpen, isChartVisible, handleHideChart, handleExplainClick,
  onAddTrade,
}: ReviewDashboardProps) => {
  const { displayMode } = useDisplayMode();
  const isMoney = displayMode === 'MONEY';
  const [shareOpen, setShareOpen] = useState(false);
  const equityAdvanced = useMemo(() => {
    const sorted = [...trades].sort((a, b) => parseDateMs(a.date) - parseDateMs(b.date));
    let equity = 0;
    let peak = 0;
    const points = [{ trade: 0, equity: 0, delta: 0, drawdown: 0, peak: 0, ma: 0 }];
    sorted.forEach((tr, i) => {
      const delta = isMoney ? (Number(tr.pnl) || 0) : getEffectiveR(tr);
      equity += delta;
      peak = Math.max(peak, equity);
      const recent = sorted.slice(Math.max(0, i - 4), i + 1).reduce((s, item) => s + (isMoney ? (Number(item.pnl) || 0) : getEffectiveR(item)), 0) / Math.min(5, i + 1);
      const drawdown = peak > 0 ? -((peak - equity) / Math.max(Math.abs(peak), 1)) * 100 : 0;
      points.push({ trade: i + 1, equity: +equity.toFixed(3), delta: +delta.toFixed(3), drawdown: +drawdown.toFixed(2), peak: +peak.toFixed(3), ma: +recent.toFixed(3) });
    });
    const last = points[points.length - 1]?.equity || 0;
    const best = Math.max(...points.map(p => p.equity));
    const worstDd = Math.min(...points.map(p => p.drawdown));
    return { points, last, best, worstDd };
  }, [trades, isMoney]);
  return (
    <div className="dash-root" dir={isRTL ? 'rtl' : 'ltr'}>

      <div className="dash-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 className="dash-greeting" style={{ margin: 0 }}>{getTimeOfDayGreeting(isRTL)} 👋</h2>
        <button
          className="dash-share-stats-btn"
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label={isRTL ? 'שתף תעודת ביצועים' : 'Share performance card'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', borderRadius: 999,
            background: 'rgba(245,197,66,0.08)',
            border: '1px solid rgba(245,197,66,0.45)',
            color: '#f5c542', fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'Poppins, system-ui, sans-serif',
            marginInlineStart: 'auto', flexShrink: 0,
          }}
        >
          <Share2 size={14} /> {isRTL ? 'שתף סטטיסטיקות' : 'Share stats'}
        </button>
      </div>

      <ShareStatsModal open={shareOpen} onClose={() => setShareOpen(false)} stats={stats} isRTL={isRTL} isMoney={isMoney} trades={trades} />


      <FeatureHint
        T={T}
        id="dashboard-review-layers"
        text={isRTL
          ? 'הדאשבורד בנוי בשלוש שכבות: בריאות מסחר (KPI), בריאות מערכת (Orca Score, Regime Fit, משמעת) וניתוח מתקדם (פתח/סגור).'
          : 'The dashboard is built in 3 layers: Trading Health (KPIs), System Health (Orca Score, Regime Fit, Discipline), and Advanced Analysis (collapsible).'}
      />

      {/* ═══ LIVE — OPEN POSITIONS (above Trading Health) ═══ */}
      {onAddTrade && (
        <OpenPositionsPanel T={T} isRTL={isRTL} onAddTrade={onAddTrade} refreshKey={trades.length} />
      )}

      {/* ═══ LAYER 1 — CORE TRADING HEALTH ═══ */}
      <div className="dash-section">
        <div className="dash-section-label" style={{ color: T.accent.cyan }}>

          {isRTL ? 'בריאות מסחר' : 'TRADING HEALTH'}
        </div>
        <div className="dash-kpi-grid">
          <MetricCard T={T} label={isMoney ? t.netPnl : (isRTL ? 'תוחלת נטו (R)' : 'Net R')} value={isMoney ? stats.totalPnl : `${stats.totalR >= 0 ? '+' : ''}${(stats.totalR ?? 0).toFixed(2)}R`} color={(isMoney ? stats.totalPnl : (stats.totalR ?? 0)) >= 0 ? T.accent.cyan : T.accent.red} onInfoClick={() => handleExplainClick(t.netPnl, EXPLANATIONS.netPnl)} description={isRTL ? 'סך רווח והפסד מצטבר' : 'Cumulative net profit/loss'} />
          <MetricCard T={T} label={t.winRate} value={stats.winRate} suffix="%" color={T.accent.green} onInfoClick={() => handleExplainClick(t.winRate, EXPLANATIONS.winRate)} description={isRTL ? 'אחוז עסקאות מנצחות' : 'Percent of winning trades'} />
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
          <MetricCard T={T} label={t.maxDrawdown} value={`${stats.maxDrawdown.toFixed(1)}%`} color={T.accent.orange} onInfoClick={() => handleExplainClick(t.maxDrawdown, EXPLANATIONS.maxDrawdownMetric)} description={isRTL ? 'ירידה מקסימלית מהשיא' : 'Maximum drop from peak'} />

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

      {/* ═══ LAYER 2.5 — CALENDAR + LONG/SHORT BREAKDOWN ═══ */}
      <DashboardCalendarStrip T={T} t={t} isRTL={isRTL} trades={trades} />

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
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.equityCurve} explanation={EXPLANATIONS.equityCurve} unit={isMoney ? '$' : 'R'} chartId="equityCurve" onRemove={handleHideChart}>
                    <div className="dash-chart-h-md">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={equityAdvanced.points} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                          <defs>
                            <linearGradient id="eqGAdvNew" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.52}/><stop offset="70%" stopColor={T.accent.cyan} stopOpacity={0.16}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.04}/></linearGradient>
                            <linearGradient id="eqBarsWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.green} stopOpacity={0.78}/><stop offset="100%" stopColor={T.accent.green} stopOpacity={0.22}/></linearGradient>
                            <linearGradient id="eqBarsLoss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.red} stopOpacity={0.24}/><stop offset="100%" stopColor={T.accent.red} stopOpacity={0.7}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} vertical={false} />
                          <XAxis dataKey="trade" tick={{ fill: T.text.muted, fontSize: 10 }} interval="preserveStartEnd" minTickGap={28} />
                          <YAxis yAxisId="equity" tick={{ fill: T.text.muted, fontSize: 10 }} width={52} tickFormatter={(v: number) => fmtDashValue(v, isMoney)} domain={['auto', 'auto']} />
                          <YAxis yAxisId="dd" orientation="right" tick={{ fill: T.text.muted, fontSize: 10 }} width={40} tickFormatter={(v: number) => `${v.toFixed(0)}%`} domain={[-100, 0]} />
                          <Tooltip contentStyle={tt} formatter={(v: any, n: string) => n === 'drawdown' ? [`${Number(v).toFixed(2)}%`, 'DD'] : [fmtDashValue(Number(v), isMoney), n === 'delta' ? (isRTL ? 'עסקה' : 'Trade') : n === 'ma' ? 'MA(5)' : (isRTL ? 'הון' : 'Equity')]} />
                          <ReferenceLine yAxisId="equity" y={0} stroke={T.border.medium} strokeDasharray="2 2" />
                          <Bar yAxisId="equity" dataKey="delta" barSize={4} radius={[3, 3, 0, 0]} opacity={0.55}>{equityAdvanced.points.map((p: any, i: number) => <Cell key={i} fill={p.delta >= 0 ? 'url(#eqBarsWin)' : 'url(#eqBarsLoss)'} />)}</Bar>
                          <Area yAxisId="equity" type="monotone" dataKey="equity" stroke={T.accent.cyan} fill="url(#eqGAdvNew)" strokeWidth={3} dot={trades.length <= 30 ? { fill: T.accent.cyan, r: 2.8 } : false} activeDot={{ r: 6, fill: T.accent.cyan, stroke: T.bg.card, strokeWidth: 2 }} />
                          <Line yAxisId="equity" type="monotone" dataKey="ma" stroke={T.accent.orange} strokeWidth={1.8} dot={false} strokeDasharray="5 4" />
                          <Line yAxisId="dd" type="monotone" dataKey="drawdown" stroke={T.accent.red} strokeWidth={1.4} dot={false} opacity={0.72} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
                      {[
                        { l: isRTL ? 'נוכחי' : 'Current', v: equityAdvanced.last, c: equityAdvanced.last >= 0 ? T.accent.green : T.accent.red },
                        { l: isRTL ? 'שיא' : 'Peak', v: equityAdvanced.best, c: T.accent.cyan },
                        { l: isRTL ? 'DD גרוע' : 'Worst DD', v: equityAdvanced.worstDd, c: T.accent.red, pct: true },
                      ].map((m, i) => <div key={i} style={{ padding: '7px 9px', borderRadius: 8, background: T.bg.tertiary, border: `1px solid ${T.border.subtle}` }}><div style={{ fontSize: 9, color: T.text.muted }}>{m.l}</div><div style={{ fontSize: 12, fontWeight: 800, color: m.c, fontFamily: "'JetBrains Mono', monospace" }}>{m.pct ? `${m.v.toFixed(1)}%` : fmtDashValue(m.v, isMoney)}</div></div>)}
                    </div>
                  </ChartWrapper>
                </div>
              )}
              {isChartVisible('pnlDistribution') && (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit={isMoney ? '$' : 'R'} chartId="pnlDistribution" onRemove={handleHideChart}>
                    <div className="dash-chart-h-sm" style={{ width: '100%' }}>
                      <LazyChart><PnLDistributionHistogram T={T} trades={trades} isMoney={isMoney} isRTL={isRTL} tt={tt} /></LazyChart>
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
                    <div className="dash-chart-h-sm dash-chart-fill">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="82%" margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                          <PolarGrid stroke={T.border.medium} />
                          <PolarAngleAxis dataKey="m" tick={{ fill: T.text.secondary, fontSize: 11 }} />
                          <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
                          <Radar dataKey="v" stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.55} strokeWidth={2.5} dot={{ r: 3, fill: T.accent.cyan, stroke: T.bg.card, strokeWidth: 1 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartWrapper>
                </div>
              )}
              {isAdvancedTier && isChartVisible('coinPerformance') && (() => {
                const coinKey = (c: any) => (isMoney ? c.pnl : (typeof c.totalR === 'number' ? c.totalR : (Number(c.avgR) || 0) * (Number(c.trades) || 0)));
                const sorted = [...(stats.coinPerf || [])].sort((a:any,b:any)=> coinKey(b) - coinKey(a));
                const winnerLabel = isRTL ? 'מנצח גדול' : 'Top Winner';
                const loserLabel = isRTL ? 'מפסיד גדול' : 'Top Loser';
                const singleLabel = isRTL ? 'הנכס היחיד שנסחר' : 'Only asset traded';
                const noData = isRTL ? 'אין מספיק נתונים' : 'Not enough data';
                const title = isRTL ? 'מנצח גדול מול מפסיד גדול' : 'Top Winner vs Top Loser';
                // Build data with graceful fallback for single-asset users:
                // - 0 coins → empty state
                // - 1 coin → show that coin alone, colored by sign of result
                // - 2+ coins → original best vs worst comparison
                let data: any[] = [];
                if (sorted.length >= 2) {
                  const winner = sorted[0];
                  const loser = sorted[sorted.length - 1];
                  data = [
                    { label: winnerLabel, coin: winner.coin, v: coinKey(winner), fill: T.accent.green },
                    { label: loserLabel, coin: loser.coin, v: coinKey(loser), fill: T.accent.red },
                  ];
                } else if (sorted.length === 1) {
                  const only = sorted[0];
                  const v = coinKey(only);
                  data = [{ label: singleLabel, coin: only.coin, v, fill: v >= 0 ? T.accent.green : T.accent.red }];
                }
                const hasData = data.length > 0;
                return (
                  <div className="dash-chart-card">
                    <ChartWrapper T={T} onExplainClick={handleExplainClick} title={title} explanation={EXPLANATIONS.coinPerformance} unit={isMoney ? '$' : 'R'} chartId="coinPerformance" onRemove={handleHideChart}>
                      <div className="dash-chart-h-sm">
                        {hasData ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                              <XAxis type="number" tick={{ fill: T.text.muted, fontSize: 10 }} />
                              <YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 11, fontWeight: 600 }} width={86} tickMargin={6} interval={0} />
                              <Tooltip contentStyle={tt} formatter={(v:any, _n:any, p:any)=>[isMoney ? `$${Number(v).toFixed(2)}` : `${Number(v).toFixed(2)}R`, p?.payload?.label]} />
                              <ReferenceLine x={0} stroke={T.border.subtle} />
                              <Bar dataKey="v" radius={[0,6,6,0]} barSize={36}>
                                {data.map((c:any, i:number) => <Cell key={i} fill={c.fill} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color: T.text.muted, fontSize: 12 }}>{noData}</div>
                        )}
                      </div>
                    </ChartWrapper>
                  </div>
                );
              })()}
              {isUltimateTier && (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.directionAnalysis} explanation={EXPLANATIONS.directionAnalysis}>
                    <div className="dash-chart-h-sm dash-chart-fill">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                          <Pie data={stats.directionData} dataKey="trades" nameKey="name" cx="50%" cy="50%" innerRadius="46%" outerRadius="80%" paddingAngle={4} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
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

            {isAdvancedTier && (
              <div className="dash-charts-alpha">
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'רבעונים — ניצחונות / הפסדים מול שנים' : 'Quarterly Performance — Wins/Losses YoY'} explanation={EXPLANATIONS.monthlyPerformance} unit={isMoney ? '$' : 'R'}>
                    <LazyChart><QuarterlyWinsLossesYoYChart T={T} trades={trades} isRTL={isRTL} tt={tt} /></LazyChart>
                  </ChartWrapper>
                </div>
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'מטריצת רבעונים — השוואת שנים' : 'Quarterly Year Matrix — Multi-View'} explanation={EXPLANATIONS.monthlyPerformance} unit={isMoney ? '$' : 'R'}>
                    <LazyChart><QuarterlyYearMatrixChart T={T} trades={trades} isRTL={isRTL} tt={tt} /></LazyChart>
                  </ChartWrapper>
                </div>
              </div>
            )}

            {/* Alpha additions */}
            {isAlpha && (
              <div className="dash-charts-alpha">
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'חלונות הזדמנות — יום ושעה' : 'Opportunity Windows — Day & Hour'} explanation={EXPLANATIONS.riskAllocation}>
                    <LazyChart><BestWorstWindowChart T={T} trades={trades} isRTL={isRTL} tt={tt} /></LazyChart>
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביצועים רבעוניים — Multi-View' : 'Quarterly Performance — Multi-View'} explanation={EXPLANATIONS.monthlyPerformance} unit="R">
                    <LazyChart><QuarterlyPerformanceCard T={T} trades={trades} isRTL={isRTL} /></LazyChart>
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ניצחונות לפי חודש — לונג / שורט' : 'Wins by Month — Long / Short'} explanation={EXPLANATIONS.monthlyPerformance}>
                    <LazyChart><WinsByMonthChart T={T} trades={trades} isRTL={isRTL} tt={tt} /></LazyChart>
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ניצחונות לפי רבעון — לונג / שורט' : 'Wins by Quarter — Long / Short'} explanation={EXPLANATIONS.monthlyPerformance}>
                    <LazyChart><WinsByQuarterChart T={T} trades={trades} isRTL={isRTL} tt={tt} /></LazyChart>
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'תשואה ממוצעת לשעת החזקה' : 'Return / Time Held — avg'} explanation={EXPLANATIONS.expectancy}>
                    <LazyChart><ReturnPerTimeChart T={T} trades={trades} isRTL={isRTL} tt={tt} /></LazyChart>
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביצועים חודשיים (R)' : 'Monthly Performance (R)'} explanation={EXPLANATIONS.monthlyPerformance} unit="R">
                    {/* Compact chip grid — 2 cols mobile, 3-4 desktop, no vertical scroll.
                        Prevents "cannot scroll when many months exist" issue and gives
                        a much denser at-a-glance snapshot. */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 130px), 1fr))',
                        gap: 6,
                        maxHeight: stats.monthlyPerf.length > 18 ? 300 : 'none',
                        overflowY: stats.monthlyPerf.length > 18 ? 'auto' : 'visible',
                        paddingInlineEnd: stats.monthlyPerf.length > 18 ? 4 : 0,
                      }}
                      className={stats.monthlyPerf.length > 18 ? 'orca-thin-scroll' : ''}
                    >
                      {stats.monthlyPerf.map((mp: any, i: number) => {
                        const totalR = (Number(mp.avgR) || 0) * (Number(mp.trades) || 0);
                        const val = isMoney ? mp.pnl : totalR;
                        const positive = val >= 0;
                        const accent = positive ? T.accent.green : T.accent.red;
                        return (
                          <div
                            key={i}
                            title={`${mp.month} · ${mp.trades ?? 0} trades`}
                            style={{
                              display: 'flex', flexDirection: 'column', gap: 2,
                              padding: '7px 9px', borderRadius: 8,
                              background: `${T.bg.tertiary}66`,
                              border: `1px solid ${T.border.subtle}`,
                              borderInlineStart: `2px solid ${accent}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                              <span style={{ fontSize: 10.5, color: T.text.secondary, fontWeight: 600 }}>{mp.month}</span>
                              <span style={{ fontSize: 9, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{mp.trades ?? 0}</span>
                            </div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: accent, fontFamily: "'JetBrains Mono', monospace" }}>
                              {isMoney
                                ? `${positive ? '+' : ''}$${Math.abs(mp.pnl).toFixed(mp.pnl >= 100 || mp.pnl <= -100 ? 0 : 2)}`
                                : `${positive ? '+' : ''}${totalR.toFixed(2)}R`}
                            </span>
                            <span style={{ fontSize: 9.5, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace" }}>
                              {mp.expectancyR >= 0 ? '+' : ''}{mp.expectancyR.toFixed(2)}R/tr
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ChartWrapper>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Analytics Lab + Risk-Adjusted Ratios moved to /analytics (Ultimate-tier only) */}
    </div>
  );
};
