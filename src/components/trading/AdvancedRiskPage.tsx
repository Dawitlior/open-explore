import { useMemo, memo } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { RiskAssessment } from '@/lib/risk-engine';
import type { TradingStats } from '@/lib/trading-analytics';
import { GlassCard, ScoreGauge, TradingBadge } from './TradingUI';
import { ChartWrapper, EXPLANATIONS } from './ChartWrapper';
import { LazyChart } from './LazyChart';
import type { ChartExplanation } from './ChartWrapper';
import { checkRiskLimits, DEFAULT_RISK_LIMITS, type RiskLimits } from '@/lib/risk-limits';
import { getEffectiveR, sumDailyR } from '@/lib/r-multiple';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { RProxyBanner } from './RProxyBanner';
import { useChartGuard } from '@/lib/dashboard-engine';
import { UltimateRiskDeck } from './UltimateDeckCharts';
import { useEntitlement } from '@/hooks/use-entitlement';
import { KillSwitchPanel } from './risk/KillSwitchPanel';
import { NetExposurePanel } from './risk/NetExposurePanel';
import { CorrelationMatrix } from './risk/CorrelationMatrix';
import { QualityOfReturnsStrip } from './risk/QualityOfReturnsStrip';
import { HourOfDayStrip } from './risk/HourOfDayStrip';


type OperatingMode = 'live' | 'review' | 'research' | 'beginner';

interface AdvancedRiskPageProps {
  T: TradingTheme;
  isRTL: boolean;
  isAlpha: boolean;
  operatingMode?: OperatingMode;
  customLimits?: RiskLimits;
  trades: Trade[];
  stats: TradingStats;
  riskData: RiskAssessment;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
  riskExplanations: Array<{ tradeId: number; reason: string; customNote?: string; timestamp: string }>;
  /** Phase 2 — registry allowlist for `risk` surface. Optional. */
  registryCharts?: import('@/lib/chart-registry').ChartSpec[];
}

// ─── Section header (clear, plain-language with subtitle) ──────────
const SectionHeader = ({ T, label, accent, isRTL, subtitle }: { T: TradingTheme; label: string; accent?: string; isRTL: boolean; subtitle?: string }) => {
  const color = accent || T.accent.cyan;
  return (
    <div style={{ margin: '24px 0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color, boxShadow: `0 0 10px ${color}` }} />
        <span style={{
          fontSize: 14, fontWeight: 700, color: T.text.primary,
          letterSpacing: '-0.01em',
        }}>{label}</span>
        <span style={{ flex: 1, height: 1, background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${color}40, transparent)` }} />
      </div>
      {subtitle && (
        <div style={{
          fontSize: 12, color: T.text.muted, marginTop: 4,
          marginInlineStart: 18, lineHeight: 1.5,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};


// ─── Risk limit progress bar ────────────────────────────────────────
const LimitBar = ({ T, label, current, limit, isRTL }: { T: TradingTheme; label: string; current: number; limit: number; isRTL: boolean }) => {
  // current is negative (e.g. -1.5R), limit is negative (e.g. -2R)
  const pct = Math.min(100, Math.max(0, (Math.abs(current) / Math.abs(limit)) * 100));
  const color = pct >= 100 ? T.accent.red : pct >= 75 ? T.accent.orange : pct >= 50 ? T.accent.orange : T.accent.green;
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10 }}>
        <span style={{ color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          {current.toFixed(2)}R / {limit}R
        </span>
      </div>
      <div style={{ position: 'relative', height: 8, background: `${T.bg.tertiary}`, borderRadius: 4, overflow: 'hidden', border: `1px solid ${T.border.subtle}` }}>
        <div style={{
          position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${color}90, ${color})`,
          boxShadow: pct >= 75 ? `0 0 12px ${color}80` : 'none',
          transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
        }} />
        {/* Tick marks at 50/75/100 */}
        {[50, 75].map(t => (
          <div key={t} style={{ position: 'absolute', insetInlineStart: `${t}%`, top: 0, bottom: 0, width: 1, background: `${T.text.muted}40` }} />
        ))}
      </div>
      <div style={{ fontSize: 9, color: T.text.muted, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
        {pct.toFixed(0)}% {isRTL ? 'מהמגבלה נצרך' : 'of limit consumed'}
      </div>
    </div>
  );
};

const AdvancedRiskPage_Impl = ({ T, isRTL, isAlpha, operatingMode = 'live', customLimits, trades: _allTrades, stats, riskData, onExplainClick, riskExplanations, registryCharts }: AdvancedRiskPageProps) => {
  useChartGuard('risk');
  const registryAllows = (id: string) => !registryCharts || registryCharts.some(c => c.id === id);
  const { visibleTrades: trades, isMoney, rEligibleCount, totalCount } = useVisibleTrades(_allTrades);
  const { tier: appTier, allows: tierAllows } = useEntitlement();
  const tt = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.primary, fontSize: 12, boxShadow: T.shadow.elevated, padding: '8px 12px' };
  const LIMITS_USED = customLimits || DEFAULT_RISK_LIMITS;

  // ─── Live risk-limit status ──────────────────────────────────────
  const limitStatus = useMemo(() => checkRiskLimits(trades, new Date(), LIMITS_USED), [trades, LIMITS_USED]);

  const rDrawdownCurve = useMemo(() => {
    const byDay = new Map<string, Trade[]>();
    for (const t of trades) {
      const key = (t.date || '').slice(0, 10);
      if (!key) continue;
      const arr = byDay.get(key) || [];
      arr.push(t);
      byDay.set(key, arr);
    }
    let cum = 0, peak = 0;
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, dayTrades], i) => {
      const { total } = sumDailyR(dayTrades);
      cum += total;
      if (cum > peak) peak = cum;
      const dd = peak > 0 ? -((peak - cum) / Math.max(Math.abs(peak), 1) * 100) : 0;
      return { trade: i + 1, day: day.slice(5), dd: +dd.toFixed(2), cumR: +cum.toFixed(3) };
    });
  }, [trades]);

  // SaaS tier composition: Standard / Advanced / Ultimate.
  const isAdvancedPlan = tierAllows('advanced');
  const isUltimatePlan = tierAllows('ultimate');
  const tierMeta = appTier === 'ultimate'
    ? { he: 'אולטימייט', en: 'Ultimate', sub: { he: 'מנוע סיכון כמותי מלא', en: 'Full quantitative risk engine' }, color: T.accent.purple }
    : appTier === 'advanced'
      ? { he: 'מתקדם', en: 'Advanced', sub: { he: 'דיאגנוסטיקה מקצועית ואנומליות סיכון', en: 'Professional diagnostics and risk anomalies' }, color: T.accent.cyan }
      : { he: 'סטנדרט', en: 'Standard', sub: { he: 'מגבלות סיכון, Drawdown והקצאה בסיסית', en: 'Risk limits, drawdown, and baseline allocation' }, color: T.accent.blue };

  // What each SaaS tier shows on the Risk page.
  // Standard ships a minimal deck: limit bars + KPI strip + drawdown card only.
  // Advanced adds gauges, anomalies, risk timeline, allocation chart, setup table.
  // Ultimate adds the deep research modules.
  const showLimitBars      = true;
  const showKpiStrip       = true;
  const showGaugesRow      = isAdvancedPlan;
  const showAnomalies      = isAdvancedPlan;
  const showRiskTimeline   = isAdvancedPlan;
  const showSetupTable     = isAdvancedPlan;
  const showAllocAndDD     = true; // DD card stays in all tiers
  const showAllocChart     = isAdvancedPlan;
  const showAlphaEvolution = isUltimatePlan;
  const showStatusWarnings = true;
  const showExplanationLog = isUltimatePlan;
  const showResearchDeepRisk = isUltimatePlan;


  // Risk behavior over time
  const riskTimeline = useMemo(() => {
    if (trades.length < 2) return [];
    return trades.map((t, i) => {
      const prevRisk = i > 0 ? trades[i - 1].risk : t.risk;
      const change = prevRisk > 0 ? ((t.risk - prevRisk) / prevRisk) * 100 : 0;
      return { id: t.id, risk: t.risk, riskPct: t.riskPct, change, coin: t.coin, wasLoss: i > 0 && trades[i - 1].winLoss === 'Loss' };
    });
  }, [trades]);

  // ─── Composite Risk Health Score (0-100) ────────────────────────
  const riskHealth = useMemo(() => {
    const consistency = riskData.riskConsistencyScore;
    const ddPenalty = Math.min(100, stats.maxDrawdown * 10); // 10% DD = 100 penalty
    const streakPenalty = Math.min(100, stats.maxConsecLosses * 20);
    const limitPenalty =
      (Math.abs(limitStatus.dailyNegR) / Math.abs(DEFAULT_RISK_LIMITS.day)) * 30 +
      (Math.abs(limitStatus.weeklyNegR) / Math.abs(DEFAULT_RISK_LIMITS.week)) * 30 +
      (Math.abs(limitStatus.monthlyNegR) / Math.abs(DEFAULT_RISK_LIMITS.month)) * 40;
    const raw = consistency * 0.4 + (100 - ddPenalty) * 0.25 + (100 - streakPenalty) * 0.15 + (100 - Math.min(100, limitPenalty)) * 0.2;
    return Math.max(0, Math.min(100, raw));
  }, [riskData, stats, limitStatus]);

  // Detect risk anomalies
  const anomalies = useMemo(() => {
    const results: Array<{ type: string; severity: 'warning' | 'danger'; title: string; detail: string; icon: string; tradeIds: number[] }> = [];

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
      map[t.coin].totalR += getEffectiveR(t);
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
  const healthColor = riskHealth >= 75 ? T.accent.green : riskHealth >= 50 ? T.accent.orange : T.accent.red;
  const healthLabel = riskHealth >= 75 ? (isRTL ? 'בריא' : 'HEALTHY') : riskHealth >= 50 ? (isRTL ? 'מתון' : 'MODERATE') : (isRTL ? 'קריטי' : 'CRITICAL');

  return (
    <>
      {!isMoney && <RProxyBanner T={T} isRTL={isRTL} rEligibleCount={rEligibleCount} totalCount={totalCount} />}
      {/* ═══════════════════════════════════════════════════════════
          HERO COMMAND HEADER — Risk Health + Live Limits
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
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: -40, [isRTL ? 'left' : 'right']: -40,
          width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${healthColor}25, transparent 70%)`,
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
          <div>
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
              {isRTL ? '◆ מרכז בקרת סיכון' : '◆ RISK COMMAND CENTER'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 200, color: T.text.primary, letterSpacing: '-0.02em' }}>
              {isRTL ? 'בריאות הסיכון שלך' : 'Your Risk Health'}
            </div>
          </div>
          <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: healthColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, textShadow: `0 0 30px ${healthColor}60` }}>
              {riskHealth.toFixed(0)}
            </div>
            <div style={{ fontSize: 10, color: healthColor, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em', marginTop: 2 }}>
              {healthLabel}
            </div>
          </div>
        </div>

        {/* Risk Limit Bars */}
        {showLimitBars && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', position: 'relative' }}>
            <LimitBar T={T} isRTL={isRTL} label={isRTL ? 'יומי' : 'Daily'} current={limitStatus.dailyNegR} limit={LIMITS_USED.day} />
            <LimitBar T={T} isRTL={isRTL} label={isRTL ? 'שבועי' : 'Weekly'} current={limitStatus.weeklyNegR} limit={LIMITS_USED.week} />
            <LimitBar T={T} isRTL={isRTL} label={isRTL ? 'חודשי' : 'Monthly'} current={limitStatus.monthlyNegR} limit={LIMITS_USED.month} />
          </div>
        )}
      </div>

      {/* ═══ TIER BANNER — shows current SaaS tier ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', marginTop: 8, marginBottom: 4,
        background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${tierMeta.color}14, transparent)`,
        border: `1px solid ${tierMeta.color}30`,
        borderInlineStart: `3px solid ${tierMeta.color}`,
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 9, padding: '3px 8px', background: `${tierMeta.color}25`, color: tierMeta.color, borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.16em', fontWeight: 700 }}>
          {(isRTL ? tierMeta.he : tierMeta.en).toUpperCase()}
        </div>
        <div style={{ fontSize: 11, color: T.text.secondary, flex: 1 }}>{isRTL ? tierMeta.sub.he : tierMeta.sub.en}</div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ZONE 1 EXTENSION — KILL SWITCH (live guardrail)
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader T={T} isRTL={isRTL} accent={T.accent.red} label={isRTL ? 'מתג ביטחון' : 'KILL SWITCH'} />
      <div style={{ marginBottom: 4 }}>
        <KillSwitchPanel T={T} isRTL={isRTL} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ZONE 2 — PORTFOLIO EXPOSURE (net/gross/leverage + correlation)
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'חשיפת תיק' : 'PORTFOLIO EXPOSURE'} />
      <div style={{ display: 'grid', gap: 8, marginBottom: 4 }}>
        <NetExposurePanel T={T} isRTL={isRTL} trades={trades} />
        <CorrelationMatrix T={T} isRTL={isRTL} trades={trades} />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ZONE 3 — QUALITY OF RETURNS (MAR · Sharpe · Sortino · Calmar)
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'איכות תשואות' : 'QUALITY OF RETURNS'} />
      <div style={{ marginBottom: 4 }}>
        <QualityOfReturnsStrip
          T={T}
          isRTL={isRTL}
          trades={trades}
          marRatio={stats.maxDrawdown > 0 ? (stats.totalR ?? 0) / stats.maxDrawdown : null}
        />
      </div>


      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'מדדי מפתח' : 'KEY METRICS'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 4 }}>
        {[
          { l: isRTL ? 'סיכון ממוצע' : 'Avg Risk', v: `${riskData.avgRiskPct.toFixed(2)}%`, c: T.accent.cyan, hint: `$${(riskData.riskGrowthEvolution.reduce((s,e)=>s+e.risk,0)/(riskData.riskGrowthEvolution.length||1)).toFixed(2)}` },
          { l: isRTL ? 'סחיפת סיכון' : 'Risk Drift', v: `${riskData.riskDrift.toFixed(2)}%`, c: riskData.riskDrift > 0.5 ? T.accent.orange : T.accent.green, hint: isRTL ? 'מהבסיס' : 'from baseline' },
          { l: isRTL ? 'נסיגה מקס' : 'Max DD', v: `${stats.maxDrawdown.toFixed(1)}%`, c: stats.maxDrawdown > 5 ? T.accent.red : T.accent.green, hint: '' },
          { l: isRTL ? 'הפסדים רצופים' : 'Consec. Loss', v: String(stats.maxConsecLosses), c: stats.maxConsecLosses >= 3 ? T.accent.red : T.accent.green, hint: '' },
          { l: isRTL ? 'מגמה $' : 'Dollar Trend', v: riskData.dollarRiskTrend === 'increasing' ? '↑' : riskData.dollarRiskTrend === 'decreasing' ? '↓' : '→', c: riskData.dollarRiskTrend === 'increasing' ? T.accent.orange : T.accent.green, hint: riskData.dollarRiskTrend },
          { l: isRTL ? 'P&L היום' : 'Today P&L', v: `$${dailyPnlToday.toFixed(2)}`, c: dailyPnlToday >= 0 ? T.accent.green : T.accent.red, hint: '' },
        ].map((m, i) => (
          <div key={i} style={{
            background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 10, padding: 12,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: 3, height: '100%', background: m.c }} />
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{m.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: m.c, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{m.v}</div>
            {m.hint && <div style={{ fontSize: 9, color: T.text.muted, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{m.hint}</div>}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          GAUGES & GUARDRAILS
          ═══════════════════════════════════════════════════════════ */}
      {showGaugesRow && (<>
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'מדים ומגבלות' : 'GAUGES & GUARDRAILS'} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <GlassCard T={T} glow={riskLevel === 'warning' ? 'rgba(245,158,11,0.12)' : T.accent.greenGlow} style={{ flex: 1, minWidth: 220, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{isRTL ? 'מד סיכון' : 'Risk Meter'}</div>
          <svg width="190" height="105" viewBox="0 0 200 110" style={{ margin: '0 auto', display: 'block' }}>
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={T.border.subtle} strokeWidth="12" strokeLinecap="round" />
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#rGadv)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${riskPct * 2.51} 251`} style={{ transition: 'stroke-dasharray 1s ease' }} />
            <defs><linearGradient id="rGadv" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={T.accent.green} /><stop offset="50%" stopColor={T.accent.orange} /><stop offset="100%" stopColor={T.accent.red} /></linearGradient></defs>
            <text x="100" y="82" textAnchor="middle" fill={riskLevel === 'critical' ? T.accent.red : riskLevel === 'warning' ? T.accent.orange : T.accent.green} fontSize="26" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{riskPct.toFixed(0)}%</text>
            <text x="100" y="102" textAnchor="middle" fill={T.text.muted} fontSize="10">{riskLevel === 'critical' ? 'CRITICAL' : riskLevel === 'warning' ? 'WARNING' : 'SAFE'}</text>
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
                <span style={{ fontSize: 11, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{r.cur}/{r.val}</span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.ok ? T.accent.green : T.accent.red, boxShadow: r.ok ? `0 0 6px ${T.accent.green}` : `0 0 6px ${T.accent.red}` }} />
              </div>
            </div>
          ))}
        </GlassCard>
      </div>
      </>)}

      {/* ═══ RISK ANOMALIES ═══ */}
      {showAnomalies && anomalies.length > 0 && (
        <>
          <SectionHeader T={T} isRTL={isRTL} accent={T.accent.red} label={isRTL ? 'חריגות סיכון שזוהו' : 'RISK ANOMALIES DETECTED'} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
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
                    {a.tradeIds.length > 8 && <span style={{ fontSize: 9, color: T.text.muted }}>+{a.tradeIds.length - 8} more</span>}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </>
      )}

      {/* ═══ RISK BEHAVIOR TIMELINE — Advanced+ ═══ */}
      {showRiskTimeline && (registryAllows('riskEvolution') || registryAllows('riskChangePct')) && (<>
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'התפתחות סיכון' : 'RISK EVOLUTION'} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        {registryAllows('riskEvolution') && <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'התפתחות סיכון לאורך זמן' : 'Risk Evolution Over Time'} explanation={EXPLANATIONS.riskAllocation} unit="$" style={{ flex: 2, minWidth: 340 }}>
          <LazyChart height={200}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={riskTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 9 }} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                <Tooltip contentStyle={tt} cursor={false} />
                <Bar dataKey="risk" radius={[3, 3, 0, 0]}>
                  {riskTimeline.map((d, i) => (
                    <Cell key={i} fill={d.wasLoss ? T.accent.red : d.change > 50 ? T.accent.orange : T.accent.blue} fillOpacity={d.wasLoss ? 0.85 : 0.7} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="riskPct" stroke={T.accent.cyan} strokeWidth={2.5} dot={{ fill: T.accent.cyan, r: 2 }} yAxisId={0} />
              </ComposedChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>}

        {registryAllows('riskChangePct') && <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'שינוי סיכון (%)' : 'Risk Change %'} explanation={EXPLANATIONS.riskAllocation} unit="%" style={{ flex: 1, minWidth: 260 }}>
          <LazyChart height={200}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskTimeline.slice(1).map((d, i) => ({ ...d, idx: i + 1 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="idx" tick={{ fill: T.text.muted, fontSize: 9 }} tickFormatter={(v: number) => `#${v}`} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                <Tooltip contentStyle={tt} cursor={false} formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="change" radius={[3, 3, 0, 0]}>
                  {riskTimeline.slice(1).map((d, i) => (
                    <Cell key={i} fill={Math.abs(d.change) > 50 ? T.accent.red : Math.abs(d.change) > 20 ? T.accent.orange : T.accent.green} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>}
      </div>
      </>)}

      {/* ═══ SETUP RISK COMPARISON TABLE ═══ */}
      {showSetupTable && (<>
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'השוואת סטאפים' : 'SETUP COMPARISON'} />
      <GlassCard T={T} style={{ marginBottom: 4, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.bg.tertiary }}>
                {[isRTL ? 'סטאפ' : 'Setup', isRTL ? 'עסקאות' : 'Trades', isRTL ? 'סיכון ממוצע $' : 'Avg Risk $', isRTL ? 'סיכון ממוצע %' : 'Avg Risk %', isRTL ? 'הצלחה' : 'Win Rate'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: isRTL ? 'right' : 'left', color: T.text.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: `1px solid ${T.border.medium}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setupComparison.map((s, idx) => (
                <tr key={s.coin} style={{ background: idx % 2 ? `${T.bg.tertiary}40` : 'transparent', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${T.accent.cyan}08`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 ? `${T.bg.tertiary}40` : 'transparent')}
                >
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: T.accent.cyan }}>{s.coin}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>{s.trades}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>${s.avgRisk.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>{s.avgRiskPct.toFixed(2)}%</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: s.winRate >= 50 ? T.accent.green : T.accent.red }}>{s.winRate.toFixed(0)}%</td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      </>)}

      {/* ═══════════════════════════════════════════════════════════
          ZONE 4 — TEMPORAL RISK CONTEXT (hour-of-day window)
          ═══════════════════════════════════════════════════════════ */}
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'הקשר זמן' : 'TEMPORAL CONTEXT'} />
      <div style={{ marginBottom: 4 }}>
        <HourOfDayStrip T={T} isRTL={isRTL} trades={trades} />
      </div>

      {/* ═══ RISK ALLOCATION + DRAWDOWN ═══ */}
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'הקצאה ונסיגה' : 'ALLOCATION & DRAWDOWN'} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        {showAllocChart && registryAllows('riskAllocation') && (
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'הקצאת סיכון' : 'Risk Allocation'} explanation={EXPLANATIONS.riskAllocation} unit="%" style={{ flex: 1, minWidth: 280 }}>
          <LazyChart height={190}>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={riskData.riskAllocation} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis type="number" tick={{ fill: T.text.muted, fontSize: 10 }} />
                <YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 11 }} width={45} />
                <Tooltip contentStyle={tt} cursor={false} />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]} fill={T.accent.blue} />
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
        )}
        {registryAllows('drawdownAnalysis') && <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'ניתוח נסיגה' : 'Drawdown Analysis'} explanation={EXPLANATIONS.drawdown} unit="%" style={{ flex: 1, minWidth: 280 }}>
          <LazyChart height={190}>
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={rDrawdownCurve}>
                <defs><linearGradient id="dGadv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.red} stopOpacity={0.25} /><stop offset="100%" stopColor={T.accent.red} stopOpacity={0.5} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="trade" tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `#${v}`} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} domain={[(dataMin: number) => Math.min(-1, Math.max(-100, dataMin)), 0]} tickFormatter={(v: number) => `${v.toFixed(0)}%`} allowDataOverflow={false} />
                <Tooltip contentStyle={tt} cursor={false} formatter={(v: number) => `${v.toFixed(2)}%`} labelFormatter={(l) => `Trade #${l}`} />
                <Area type="monotone" dataKey="dd" stroke={T.accent.red} fill="url(#dGadv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>}
      </div>

      {/* ═══ RISK EVOLUTION CHART (Ultimate) ═══ */}
      {showAlphaEvolution && registryAllows('capitalEfficiency') && (
        <>
          <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'אבולוציה (ULTIMATE)' : 'EVOLUTION (ULTIMATE)'} />
          <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'אבולוציית סיכון מלאה' : 'Full Risk Evolution'} explanation={EXPLANATIONS.riskAllocation} unit="%" style={{ marginBottom: 4 }}>
            <LazyChart height={180}>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={riskData.riskGrowthEvolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                  <XAxis dataKey="tradeId" tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <Tooltip contentStyle={tt} cursor={false} />
                  <Bar dataKey="risk" fill={T.accent.blue} fillOpacity={0.6} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="pctOfAccount" stroke={T.accent.orange} strokeWidth={2} dot={{ fill: T.accent.orange, r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </LazyChart>
          </ChartWrapper>
        </>
      )}

      {/* ═══ ULTIMATE-TIER RISK DECK (Phase 4) ═══ */}
      <UltimateRiskDeck
        T={T}
        trades={trades}
        privacyMode={false}
        onExplainClick={onExplainClick}
        registryAllows={registryAllows}
      />

      {/* ═══ COOL OFF + WARNINGS ═══ */}
      <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'מצב והתראות' : 'STATUS & WARNINGS'} />

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

      {/* ═══ RISK EXPLANATIONS LOG — Alpha + Review/Research ═══ */}
      {showExplanationLog && riskExplanations.length > 0 && (
        <>
          <SectionHeader T={T} isRTL={isRTL} label={isRTL ? 'יומן הסברי סיכון' : 'RISK EXPLANATION LOG'} />
          <GlassCard T={T} style={{ marginTop: 0 }}>
            {riskExplanations.slice(-10).reverse().map((exp, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border.subtle}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, padding: '2px 6px', background: `${T.accent.cyan}12`, borderRadius: 4, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>#{exp.tradeId}</span>
                  <span style={{ fontSize: 12, color: T.text.secondary }}>{exp.reason}</span>
                </div>
                {exp.customNote && <span style={{ fontSize: 10, color: T.text.muted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.customNote}</span>}
              </div>
            ))}
          </GlassCard>
        </>
      )}
    </>
  );
};

export const AdvancedRiskPage = memo(AdvancedRiskPage_Impl);
