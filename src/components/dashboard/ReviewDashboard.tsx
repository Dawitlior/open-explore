import './dashboard.css';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import type { CSSProperties } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';
import { MetricCard, ScoreGauge } from '@/components/trading/TradingUI';
import { AdaptiveExpectancyCard, AdaptiveQuickStats } from '@/components/trading/AdaptiveKpiCards';
import { ChartWrapper, EXPLANATIONS, type ChartExplanation } from '@/components/trading/ChartWrapper';
import { FeatureHint } from '@/components/trading/FeatureHint';
import DashboardCalendarStrip from './DashboardCalendarStrip';

import { BestWorstWindowChart } from './BestWorstWindowChart';
import { WinsByMonthChart, WinsByQuarterChart, ReturnPerTimeChart } from './SimpleExtraCharts';
import { OpenPositionsPanel } from './OpenPositionsPanel';
import { useDisplayMode, hasStrictR } from '@/lib/display-mode';
import { getEffectiveR } from '@/lib/r-multiple';


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
  return (
    <div className="dash-root" dir={isRTL ? 'rtl' : 'ltr'}>

      <h2 className="dash-greeting">{getTimeOfDayGreeting(isRTL)} 👋</h2>

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
              {isChartVisible('pnlDistribution') && (() => {
                // Collect per-trade outcome values in current mode ($ or R)
                const values = trades
                  .map((tr: Trade) => isMoney
                    ? (Number.isFinite(tr.pnl) ? Number(tr.pnl) : null)
                    : (hasStrictR(tr) ? getEffectiveR(tr) : null))
                  .filter((v): v is number => v !== null && Number.isFinite(v as number));

                // Compute bins. Use fixed R width (1R) when in R mode;
                // dynamic $ width based on data spread when in money mode.
                let binWidth = 1;
                if (values.length > 0) {
                  if (isMoney) {
                    const absMax = Math.max(...values.map(v => Math.abs(v)));
                    // Aim for ~10 buckets on each side of zero
                    const raw = absMax / 8 || 1;
                    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
                    const norm = raw / pow;
                    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
                    binWidth = nice * pow;
                  } else {
                    binWidth = 1; // 1R buckets
                  }
                }

                const bins = new Map<number, { idx: number; count: number; low: number; high: number }>();
                for (const v of values) {
                  const idx = Math.floor(v / binWidth);
                  const low = idx * binWidth;
                  const high = low + binWidth;
                  const cur = bins.get(idx);
                  if (cur) cur.count += 1;
                  else bins.set(idx, { idx, count: 1, low, high });
                }
                const sorted = Array.from(bins.values()).sort((a, b) => a.idx - b.idx);
                // Ensure contiguous range (fill empty bins between min/max)
                const distData = (() => {
                  if (sorted.length === 0) return [] as { label: string; count: number; mid: number; low: number; high: number }[];
                  const minIdx = sorted[0].idx;
                  const maxIdx = sorted[sorted.length - 1].idx;
                  const out: { label: string; count: number; mid: number; low: number; high: number }[] = [];
                  const fmt = (x: number) => isMoney
                    ? `$${Math.round(x)}`
                    : `${x >= 0 ? '+' : ''}${x.toFixed(binWidth < 1 ? 1 : 0)}R`;
                  for (let i = minIdx; i <= maxIdx; i++) {
                    const low = i * binWidth;
                    const high = low + binWidth;
                    const found = bins.get(i);
                    out.push({
                      label: `${fmt(low)} → ${fmt(high)}`,
                      count: found?.count || 0,
                      mid: (low + high) / 2,
                      low,
                      high,
                    });
                  }
                  return out;
                })();

                return (
                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit={isMoney ? '$' : 'R'} chartId="pnlDistribution" onRemove={handleHideChart}>
                    <div className="dash-chart-h-sm" style={{ width: '100%' }}>
                      {distData.length === 0 ? (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color: T.text.muted, fontSize: 12 }}>
                          {isRTL ? 'אין נתונים במצב הנבחר' : 'No data in selected mode'}
                        </div>
                      ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distData} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} barCategoryGap={1}>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} vertical={false} />
                          <XAxis
                            dataKey="mid"
                            type="number"
                            domain={[distData[0].low, distData[distData.length - 1].high]}
                            tick={{ fill: T.text.muted, fontSize: 10 }}
                            tickFormatter={(v: number) => isMoney ? `$${Math.round(v)}` : `${v >= 0 ? '+' : ''}${v.toFixed(0)}R`}
                            axisLine={{ stroke: T.border.subtle }}
                            tickLine={false}
                            minTickGap={24}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fill: T.text.muted, fontSize: 10 }}
                            width={36}
                            tickFormatter={(v: number) => `${v}`}
                          />
                          <Tooltip
                            contentStyle={tt}
                            formatter={(v: any) => [`${v} ${Number(v) === 1 ? (isRTL ? 'עסקה' : 'trade') : (isRTL ? 'עסקאות' : 'trades')}`, isRTL ? 'תדירות' : 'Frequency']}
                            labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.label ?? ''}
                          />
                          <ReferenceLine x={0} stroke={T.border.medium} strokeDasharray="2 2" />
                          <Bar dataKey="count" radius={[4,4,0,0]}>
                            {distData.map((d, i: number) => (
                              <Cell key={i} fill={d.mid >= 0 ? T.accent.green : T.accent.red} fillOpacity={d.count === 0 ? 0.15 : 0.85} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      )}
                    </div>
                  </ChartWrapper>
                </div>
                );
              })()}

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
              {isAdvancedTier && isChartVisible('coinPerformance') && (() => {
                const coinKey = (c: any) => (isMoney ? c.pnl : (typeof c.totalR === 'number' ? c.totalR : (Number(c.avgR) || 0) * (Number(c.trades) || 0)));
                const sorted = [...(stats.coinPerf || [])].sort((a:any,b:any)=> coinKey(b) - coinKey(a));
                const winner = sorted[0];
                const loser = sorted[sorted.length - 1];
                const hasData = winner && loser && winner.coin !== loser.coin;
                const winnerLabel = isRTL ? 'מנצח גדול' : 'Top Winner';
                const loserLabel = isRTL ? 'מפסיד גדול' : 'Top Loser';
                const noData = isRTL ? 'אין מספיק נתונים' : 'Not enough data';
                const title = isRTL ? 'מנצח גדול מול מפסיד גדול' : 'Top Winner vs Top Loser';
                const data = hasData ? [
                  { label: winnerLabel, coin: winner.coin, v: coinKey(winner), fill: T.accent.green },
                  { label: loserLabel, coin: loser.coin, v: coinKey(loser), fill: T.accent.red },
                ] : [];
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
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'חלונות הזדמנות — יום ושעה' : 'Opportunity Windows — Day & Hour'} explanation={EXPLANATIONS.riskAllocation}>
                    <BestWorstWindowChart T={T} trades={trades} isRTL={isRTL} tt={tt} />
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביצועים חודשיים (R)' : 'Monthly Performance (R)'} explanation={EXPLANATIONS.monthlyPerformance} unit="R">
                    <div
                      className="orca-thin-scroll"
                      style={{
                        maxHeight: stats.monthlyPerf.length > 7 ? 260 : 'none',
                        overflowY: stats.monthlyPerf.length > 7 ? 'auto' : 'visible',
                        paddingInlineEnd: stats.monthlyPerf.length > 7 ? 6 : 0,
                      }}
                    >
                      {stats.monthlyPerf.map((mp: any, i: number) => {
                        const totalR = (Number(mp.avgR) || 0) * (Number(mp.trades) || 0);
                        return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border.subtle}` }}>
                          <span style={{ fontSize: 12, color: T.text.secondary }}>{mp.month}</span>
                          <div style={{ display: 'flex', gap: 12 }}>
                            {isMoney
                              ? <PV><span style={{ fontSize: 11, color: mp.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{mp.pnl >= 0 ? '+' : ''}${mp.pnl.toFixed(2)}</span></PV>
                              : <span style={{ fontSize: 11, color: totalR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{totalR >= 0 ? '+' : ''}{totalR.toFixed(2)}R</span>}
                            <span style={{ fontSize: 11, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace" }}>{mp.expectancyR >= 0 ? '+' : ''}{mp.expectancyR.toFixed(2)}R/tr</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ניצחונות לפי חודש — לונג / שורט' : 'Wins by Month — Long / Short'} explanation={EXPLANATIONS.monthlyPerformance}>
                    <WinsByMonthChart T={T} trades={trades} isRTL={isRTL} tt={tt} />
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ניצחונות לפי רבעון — לונג / שורט' : 'Wins by Quarter — Long / Short'} explanation={EXPLANATIONS.monthlyPerformance}>
                    <WinsByQuarterChart T={T} trades={trades} isRTL={isRTL} tt={tt} />
                  </ChartWrapper>
                </div>

                <div className="dash-chart-card">
                  <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'תשואה ממוצעת לשעת החזקה' : 'Return / Time Held — avg'} explanation={EXPLANATIONS.expectancy}>
                    <ReturnPerTimeChart T={T} trades={trades} isRTL={isRTL} tt={tt} />
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
