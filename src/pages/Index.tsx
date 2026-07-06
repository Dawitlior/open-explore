import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { OnboardingWizard, shouldShowOnboarding } from '@/components/trading/OnboardingWizard';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter, ZAxis, ReferenceLine } from 'recharts';
import type { Trade } from '@/data/trades';
import { useIsMobile } from '@/hooks/use-mobile';

import { computeAnalytics, getCalDays } from '@/lib/trading-analytics';
import { i18n } from '@/lib/trading-i18n';
import { getTheme, tintTheme, ttStyle, modeColors, type TradingTheme } from '@/lib/trading-theme';
import { GlassCard, MetricCard, ScoreGauge, TradingBadge, Ico } from '@/components/trading/TradingUI';
import { AdaptiveExpectancyCard, AdaptiveQuickStats } from '@/components/trading/AdaptiveKpiCards';
import { ChartWrapper, EXPLANATIONS, type ChartExplanation } from '@/components/trading/ChartWrapper';
import { ChartExplanationModal } from '@/components/trading/ChartExplanationModal';
import { CalendarModal } from '@/components/trading/CalendarModal';
import { FeatureManifestModal } from '@/components/trading/FeatureManifestModal';
import { CommandPalette } from '@/components/trading/CommandPalette';
import { TraderMindSession } from '@/components/trader-mind/TraderMindSession';
import { useTraderMind } from '@/hooks/use-trader-mind';
import { ModeSwitch } from '@/components/trading/ModeSwitch';
import { useUIPrefs } from '@/hooks/use-ui-prefs';
import { PrivacyMask, usePrivacyShortcut } from '@/components/trading/PrivacyMask';
import { TradeForm } from '@/components/trading/TradeForm';
import { ResetModal } from '@/components/trading/ResetModal';
import { SettingsHub } from '@/components/trading/SettingsHub';

import { DesktopOnlyGate } from '@/components/trading/DesktopOnlyGate';
import { NavAvatar } from '@/components/trading/NavAvatar';
import { PortfolioSwitcher } from '@/components/trading/PortfolioSwitcher';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';
import { DeploymentToast } from '@/components/DeploymentToast';

import { RiskOnboardingWizard, shouldShowRiskOnboarding } from '@/components/trading/RiskOnboardingWizard';
import ImportLoadingOverlay from '@/components/trading/ImportLoadingOverlay';
import { FeatureHint } from '@/components/trading/FeatureHint';
import { EntryGate } from '@/components/trading/EntryGate';
import { RiskLimitAlert } from '@/components/trading/RiskLimitAlert';
import { MobileBottomNav } from '@/components/trading/MobileBottomNav';
import { MainPullToRefresh } from '@/components/trading/MainPullToRefresh';
const ReviewDashboard = lazy(() => import('@/components/dashboard/ReviewDashboard').then(m => ({ default: m.ReviewDashboard })));
import { MobileTradeCard } from '@/components/trading/MobileTradeCard';
import { RiskExplanationModal, type RiskExplanation } from '@/components/trading/RiskExplanationModal';
import { toast } from 'sonner';
import { LazyShell } from '@/components/LazyShell';
import { isoWeekKey } from '@/components/weekly-review/lib/week-key';
import { useNavigate } from 'react-router-dom';
import { useArena } from '@/features/bug-arena';
const AdvancedRiskPage = lazy(() => import('@/components/trading/AdvancedRiskPage').then(m => ({ default: m.AdvancedRiskPage })));
const AdvancedAnalyticsPage = lazy(() => import('@/components/trading/AdvancedAnalyticsPage').then(m => ({ default: m.AdvancedAnalyticsPage })));
const AdvancedPsychologyPage = lazy(() => import('@/components/trading/AdvancedPsychologyPage').then(m => ({ default: m.AdvancedPsychologyPage })));
const AIInsightsPage = lazy(() => import('@/components/trading/AIInsightsPage').then(m => ({ default: m.AIInsightsPage })));
const WeeklyReviewPage = lazy(() => import('@/components/trading/WeeklyReviewPage').then(m => ({ default: m.WeeklyReviewPage })));
const CalendarHubPage = lazy(() => import('@/components/trading/CalendarHubPage').then(m => ({ default: m.CalendarHubPage })));
const EconomicCalendarPage = lazy(() => import('@/components/economic/EconomicCalendarPage').then(m => ({ default: m.EconomicCalendarPage })));
import { InstallPrompt } from '@/components/trading/InstallPrompt';
import { DimensionController, PortalButton, BacktestPortalButton } from '@/components/trading/DimensionController';
import { CustomKPIPanel } from '@/components/trading/CustomKPIPanel';
const JournalDimension = lazy(() => import('@/components/trading/JournalDimension').then(m => ({ default: m.JournalDimension })));
const BacktestDimension = lazy(() => import('@/components/trading/BacktestDimension').then(m => ({ default: m.BacktestDimension })));
import { useTrades } from '@/hooks/use-trades';
import { DisplayModeProvider, hasStrictR, useEffectiveDisplayMode } from '@/lib/display-mode';
import { DisplayModeToggle } from '@/components/trading/DisplayModeToggle';
import { HeaderBar } from '@/components/trading/HeaderBar';
import { useSettings, type ThemeId } from '@/hooks/use-settings';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { assessRisk } from '@/lib/risk-engine';
import { generateInsights, generateSummary } from '@/lib/ai-engine';
// xlsx-engine is ~300 KB — load it on demand from the export handler only.
import { runImportWithPreflight } from '@/lib/uie/run-import-with-preflight';
import { getDayRiskColor, checkRiskLimits, DEFAULT_RISK_LIMITS } from '@/lib/risk-limits';
import { useRiskLimits } from '@/hooks/use-risk-limits';
import { scopedStorage } from '@/lib/scoped-storage';
import { useAuth } from '@/hooks/use-auth';
import { getEffectiveR, sumDailyR } from '@/lib/r-multiple';
import { useRegistryCharts } from '@/hooks/use-registry-charts';
import { useExpectancyMode } from '@/lib/dashboard-engine';
import { useEntitlement } from '@/hooks/use-entitlement';
import { EmptyStateImportCTA } from '@/components/trading/EmptyStateImportCTA';
import { TradeDetailModal } from '@/components/trading/TradeDetailModal';

// ─── Facebook-style red notification badge with "1" ───
const ReminderBadge = () => (
  <span
    aria-label="reminder"
    style={{
      position: 'absolute',
      top: -4,
      insetInlineEnd: -6,
      minWidth: 14,
      height: 14,
      padding: '0 3px',
      borderRadius: 999,
      background: 'linear-gradient(180deg, #ff4d4f 0%, #d6202a 100%)',
      color: '#fff',
      fontSize: 9,
      fontWeight: 800,
      lineHeight: '14px',
      textAlign: 'center',
      boxShadow: '0 0 0 1.5px #061326, 0 0 8px rgba(255,77,79,0.7), 0 0 14px rgba(255,77,79,0.4)',
      fontFamily: "'Poppins', sans-serif",
      pointerEvents: 'none',
      animation: 'orcaBadgePulse 2s ease-in-out infinite',
      zIndex: 2,
    }}
  >
    1
  </span>
);

const Index = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const arena = useArena();
  const openBugReport = () => { try { arena.capture.beginCapture(); } catch {} };
  const goBugBoard = () => navigate('/bugs');
  const settings = useSettings();
  const { prefs: userPrefs, loaded: userPrefsLoaded } = useUserPreferences(); // warm cache for centralized R-multiple Tier-3 proxy
  const { trades, stats, loading, initialized, addTrade, updateTrade, upsertJournalTrade, removeTrade, resetAll, importTrades, riskAlert, dismissRiskAlert, setManualR } = useTrades();
  const { activePortfolio, activePortfolioId, isActivePortfolioLocked, loading: portfoliosLoading, portfolios } = useActivePortfolio();
  // Active display mode (R-Multiple or MONEY) — used to switch KPI cards,
  // calendar heatmap, weekly strip, journal P&L column and the Monthly Stats
  // card between $ and R so R-only portfolios stop showing fake $0.00.
  const dm = useEffectiveDisplayMode(trades);
  const isR = dm.isR;
  // Per-trade headline number: R when in R mode (and the trade is R-eligible), $ otherwise.
  const tradeHeadline = (tr: Trade): { v: number; unit: 'R' | '$' } => {
    if (isR && hasStrictR(tr)) return { v: getEffectiveR(tr), unit: 'R' };
    return { v: tr.pnl, unit: '$' };
  };
  const fmtHeadline = (v: number, unit: 'R' | '$', signed = true): string => {
    const sign = signed && v > 0 ? '+' : '';
    return unit === 'R' ? `${sign}${v.toFixed(2)}R` : `${sign}$${Math.abs(v).toFixed(2)}${v < 0 ? '' : ''}`.replace('$-', '-$');
  };
  // Bucket aggregator (calendar/weekly/day-of-week) — sums R or $ per bucket.
  const bucketValue = (tr: Trade): number => {
    if (isR && hasStrictR(tr)) return getEffectiveR(tr);
    return Number.isFinite(tr.pnl) ? tr.pnl : 0;
  };
  const { limits: customRiskLimits } = useRiskLimits();
  const [entered, setEntered] = useState(() => sessionStorage.getItem('orca-entered') === '1');
  const [onboardingDone, setOnboardingDone] = useState(() => !shouldShowOnboarding());
  const [activeDimension, setActiveDimension] = useState<'orca' | 'journal' | 'backtest'>('orca');
  // economic-radar is now a regular page (page === 'economic-radar'); no overlay state needed
  const baseTheme = getTheme(settings.theme);
  const t = i18n[settings.lang];
  const isRTL = settings.isRTL;
  const { tier: appTier, allows: tierAllows } = useEntitlement();
  const isAdvancedTier = tierAllows('advanced');
  const isUltimateTier = tierAllows('ultimate');
  const isAlpha = isUltimateTier;
  const opMode = 'review' as 'live' | 'review' | 'research' | 'beginner';
  // Phase 2 — registry-driven chart lists per page (tier-filtered).
  const analyticsCharts = useRegistryCharts('analytics');
  const riskCharts = useRegistryCharts('risk');
  const psychologyCharts = useRegistryCharts('psychology');
  // All three registry chart lists are now consumed by their respective pages.
  const { prefs: uiPrefs } = useUIPrefs();
  const T = useMemo(
    () => (uiPrefs.customAccentEnabled ? tintTheme(baseTheme, uiPrefs.customAccent) : baseTheme),
    [baseTheme, uiPrefs.customAccentEnabled, uiPrefs.customAccent],
  );
  const rEligibleTrades = useMemo(
    () => trades.filter(hasStrictR),
    [trades],
  );
  // Phase 4 — single source of truth for R vs $ surface mode.
  const expectancyState = useExpectancyMode(trades);
  const hasStrictRData = expectancyState.mode === 'R' || rEligibleTrades.length > 0;


  const [page, setPage] = useState('dashboard');
  // Sidebar starts collapsed on every load (both mobile and desktop) — user
  // explicitly requested no auto-open on refresh.
  const [sbOpen, setSbOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selTrade, setSelTrade] = useState<Trade | null>(null);
  const [journalPage, setJournalPage] = useState(0);
  const JOURNAL_PAGE_SIZE = 50;
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTraderMind, setShowTraderMind] = useState(false);
  const { isCalibrated: tmCalibrated, archetype: tmArchetype } = useTraderMind();
  useEffect(() => {
    const onOpen = () => setShowTraderMind(true);
    window.addEventListener('orca:open-trader-mind', onOpen);
    return () => window.removeEventListener('orca:open-trader-mind', onOpen);
  }, []);
  useEffect(() => {
    void (async () => {
      const { scopedStorage } = await import('@/lib/scoped-storage');
      const pending = await scopedStorage.getItem('orca-trader-mind-prompt-pending');
      if (pending === '1' && !tmCalibrated) {
        setTimeout(() => setShowTraderMind(true), 1200);
        void scopedStorage.removeItem('orca-trader-mind-prompt-pending');
      }
    })();
  }, [tmCalibrated]);
  const [aiInsights, setAiInsights] = useState<ReturnType<typeof generateInsights>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [calHoverDay, setCalHoverDay] = useState<number | null>(null);
  const [calModalDay, setCalModalDay] = useState<number | null>(null);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [hiddenCharts, setHiddenCharts] = useState<string[]>([]);
  const [showImportWarning, setShowImportWarning] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importedCount, setImportedCount] = useState(0);
  const [importPhase, setImportPhase] = useState<'reading' | 'parsing' | 'validating' | 'saving' | 'done'>('reading');
  const [explainModal, setExplainModal] = useState<{ title: string; explanation: ChartExplanation; chartId?: string } | null>(null);
  const [riskExplanations, setRiskExplanations] = useState<RiskExplanation[]>([]);
  const [showRiskExplanation, setShowRiskExplanation] = useState<{ tradeId: number; riskChange: string } | null>(null);
  const [showRiskOnboarding, setShowRiskOnboarding] = useState(false);
  const [firstPaintReady, setFirstPaintReady] = useState(false);

  useEffect(() => {
    if (shouldShowRiskOnboarding(userPrefs, userPrefsLoaded)) setShowRiskOnboarding(true);
  }, [userPrefs, userPrefsLoaded]);

  // Hydrate per-user UI prefs from scoped storage once we know who is logged in.
  const { user: authUser } = useAuth();
  useEffect(() => {
    if (!authUser?.id) return;
    (async () => {
      try {
        const [hc, re] = await Promise.all([
          scopedStorage.getItem('orca-hidden-charts'),
          scopedStorage.getItem('orca-risk-explanations'),
        ]);
        if (hc) { try { setHiddenCharts(JSON.parse(hc)); } catch { /* noop */ } }
        if (re) { try { setRiskExplanations(JSON.parse(re)); } catch { /* noop */ } }
      } catch { /* noop */ }
    })();
  }, [authUser?.id]);

  const handleExplainClick = useCallback((title: string, explanation: ChartExplanation, chartId?: string) => {
    setExplainModal({ title, explanation, chartId });
  }, []);
  const handleHideChart = useCallback((chartId: string) => {
    setHiddenCharts(prev => {
      const next = [...prev, chartId];
      void scopedStorage.setItem('orca-hidden-charts', JSON.stringify(next));
      return next;
    });
  }, []);
  const handleRestoreCharts = useCallback(() => {
    setHiddenCharts([]);
    void scopedStorage.removeItem('orca-hidden-charts');
  }, []);
  const isChartVisible = useCallback((chartId: string) => !hiddenCharts.includes(chartId), [hiddenCharts]);

  const riskData = useMemo(() => assessRisk(trades), [trades]);
  const currentBalance = trades.length > 0 ? trades[trades.length - 1].balance : 0;

  // Privacy mode shortcut
  usePrivacyShortcut(() => settings.setPrivacyMode(!settings.privacyMode));

  // Command-K shortcut + `orca:open-command-palette` event
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCmdPalette(p => !p); }
    };
    const openEvt = () => setShowCmdPalette(true);
    window.addEventListener('keydown', handler);
    window.addEventListener('orca:open-command-palette', openEvt);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('orca:open-command-palette', openEvt);
    };
  }, []);

  // No demo seed — dashboard starts empty, user adds their own trades

  // Calendar data
  const calDayPnl = useMemo(() => {
    const m: Record<number, { pnl: number; trades: number; wins: number; details: Trade[] }> = {};
    trades.forEach(tr => {
      if (!tr.date) return;
      // Parse date string safely — handle "YYYY-MM-DD HH:mm" format
      const dateStr = tr.date.replace(' ', 'T');
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        const day = d.getDate();
        if (!m[day]) m[day] = { pnl: 0, trades: 0, wins: 0, details: [] };
        m[day].pnl += bucketValue(tr);
        m[day].trades++;
        if (tr.winLoss === 'Win') m[day].wins++;
        m[day].details.push(tr);
      }
    });
    return m;
  }, [calMonth, calYear, trades, isR]);
  const calDays = useMemo(() => getCalDays(calYear, calMonth), [calYear, calMonth]);
  const weekStats = useMemo(() => {
    const w: { week: number; pnl: number; trades: number; days: number }[] = [];
    let wp = 0, wt = 0, wd = 0, wn = 1;
    calDays.forEach((d, i) => { if (d && calDayPnl[d]) { wp += calDayPnl[d].pnl; wt += calDayPnl[d].trades; wd++; } if ((i + 1) % 7 === 0 || i === calDays.length - 1) { w.push({ week: wn, pnl: wp, trades: wt, days: wd }); wp = 0; wt = 0; wd = 0; wn++; } });
    return w;
  }, [calDays, calDayPnl]);

  /* ── Per-displayed-month aggregates (follow calendar navigation) ── */
  const monthStats = useMemo(() => {
    const monthTrades = trades.filter(tr => {
      if (!tr.date) return false;
      const d = new Date(tr.date.replace(' ', 'T'));
      return !isNaN(d.getTime()) && d.getMonth() === calMonth && d.getFullYear() === calYear;
    });
    const wins = monthTrades.filter(tr => tr.winLoss === 'Win').length;
    const losses = monthTrades.filter(tr => tr.winLoss === 'Loss').length;
    const totalPnl = monthTrades.reduce((s, tr) => s + tr.pnl, 0);
    const totalR = monthTrades.reduce((s, tr) => s + getEffectiveR(tr), 0);
    const winRate = monthTrades.length ? (wins / monthTrades.length) * 100 : 0;
    const expectancyR = monthTrades.length ? totalR / monthTrades.length : 0;
    // Streak within this month
    let streak = 0; let streakType: 'Win' | 'Loss' | null = null;
    for (let i = monthTrades.length - 1; i >= 0; i--) {
      const t = monthTrades[i];
      if (t.winLoss === 'Break Even') continue;
      if (streakType === null) { streakType = t.winLoss; streak = 1; }
      else if (t.winLoss === streakType) streak++;
      else break;
    }
    return { count: monthTrades.length, wins, losses, totalPnl, totalR, winRate, expectancyR, streak, streakType };
  }, [trades, calMonth, calYear]);

  const dayNames = [t.sun, t.mon, t.tue, t.wed, t.thu, t.fri, t.sat];
  const radarData = [
    { m: isRTL ? 'הצלחה' : 'Win %', v: stats.winRate },
    { m: isRTL ? 'רווח' : 'Profit', v: Math.min(100, (isR ? stats.profitFactorR : stats.profitFactor) * 40) },
    { m: isRTL ? 'משמעת' : 'Discipline', v: stats.rulesFollowed },
    { m: isRTL ? 'סיכון' : 'Risk Mgmt', v: riskData.riskConsistencyScore },
    { m: isRTL ? 'עקביות' : 'Consistency', v: Math.min(100, 100 - riskData.riskDrift * 10) },
  ];

  const dailyPnlToday = trades.filter(tr => {
    if (!tr.date) return false;
    const d = new Date(tr.date.replace(' ', 'T'));
    return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
  }).reduce((s, tr) => s + tr.pnl, 0);
  const riskLevel = stats.maxConsecLosses >= 4 ? 'critical' : stats.maxConsecLosses >= 3 ? 'warning' : 'safe';
  const riskPct = Math.min(100, (stats.maxDrawdown / 10) * 100);

  const handleGenerateInsights = useCallback(() => {
    setAiLoading(true);
    setTimeout(() => { setAiInsights(generateInsights(stats, trades, riskData, isRTL)); setAiLoading(false); }, 800);
  }, [stats, trades, riskData, isRTL]);

  const handleSaveTrade = useCallback(async (trade: Omit<Trade, 'id' | 'balance'>) => {
    if (editingTrade) { await updateTrade({ ...editingTrade, ...trade, id: editingTrade.id }); }
    else {
      const result = await addTrade(trade);
      // Check for significant risk change
      if (trades.length > 0 && result) {
        const lastRisk = trades[trades.length - 1].risk;
        if (lastRisk > 0 && trade.risk > lastRisk * 1.5) {
          const changePct = ((trade.risk - lastRisk) / lastRisk * 100).toFixed(0);
          setShowRiskExplanation({ tradeId: result.id, riskChange: `$${lastRisk.toFixed(2)} → $${trade.risk.toFixed(2)} (+${changePct}%)` });
        }
      }
    }
    setShowTradeForm(false);
    setEditingTrade(null);
  }, [editingTrade, addTrade, updateTrade, trades]);

  const handleDeleteTrade = useCallback(async (id: number) => {
    const { orcaConfirm } = await import('@/lib/orca-confirm');
    const tr = trades.find(t => t.id === id);
    const ok = await orcaConfirm({
      isRTL,
      tone: 'danger',
      title: isRTL ? 'למחוק עסקה?' : 'Delete trade?',
      description: isRTL
        ? `העסקה ${tr ? `${tr.coin} ${tr.direction} ` : ''}תימחק לצמיתות מהיומן ומכל הסטטיסטיקות. אי אפשר לבטל פעולה זו.`
        : `This trade${tr ? ` (${tr.coin} ${tr.direction})` : ''} will be permanently removed from your journal and all stats. This cannot be undone.`,
      confirmLabel: isRTL ? 'מחק עסקה' : 'Delete trade',
    });
    if (!ok) return;
    await removeTrade(id);
    setSelTrade(null);
  }, [removeTrade, trades, isRTL]);
  const handleReset = useCallback(async () => {
    console.log('[Reset] Starting per-user wipe…');
    try {
      // 1. Clear THIS user's cloud data only (RLS-scoped). Other users' data is untouched.
      await resetAll();
      console.log('[Reset] Cloud rows cleared for current user only');

      // 2. Wipe browser storage that belongs to the CURRENT user only.
      //    All localStorage in Orca is namespaced as orca:<uid>:*, so other
      //    accounts on the same device keep their data intact.
      try {
        const { scopedStorage } = await import('@/lib/scoped-storage');
        const wiped = await scopedStorage.wipeCurrentUser();
        console.log(`[Reset] Wiped ${wiped} per-user localStorage keys`);
      } catch (e) { console.warn('[Reset] scoped wipe failed', e); }

      // 3. Reset transient session flags for this tab.
      try { sessionStorage.removeItem('orca-entered'); } catch { /* ignore */ }

      // 4. Reset local UI state
      setHiddenCharts([]);
      setRiskExplanations([]);
      sessionStorage.setItem('orca-seeded', '1');
      setPage('dashboard');
      console.log('[Reset] Complete (current user only)');
    } catch (err) {
      console.error('[Reset] Failed:', err);
      throw err;
    }
  }, [resetAll]);
  const handleExport = useCallback(async () => {
    const { exportToXlsx } = await import('@/lib/xlsx-engine');
    exportToXlsx(trades);
  }, [trades]);
  const handleExportJson = useCallback(() => {
    const data = JSON.stringify({ version: 2, trades, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `orca-trades-${new Date().toISOString().slice(0,10)}.json`; a.click();
  }, [trades]);
  const handleImport = useCallback(() => {
    setShowImportWarning(true);
  }, []);
  const handleImportConfirmed = useCallback(() => {
    setShowImportWarning(false);
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.csv,.txt,.tsv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      // Stage 6 (Multi-Portfolio): hard-stop if active portfolio is locked or missing.
      if (!activePortfolio) {
        toast.error(isRTL ? 'אין תיק פעיל' : 'No active portfolio', { description: isRTL ? 'בחר תיק לפני ייבוא נתונים.' : 'Pick a portfolio before importing data.' });
        return;
      }
      if (isActivePortfolioLocked) {
        toast.error(isRTL ? 'התיק נעול לקריאה־בלבד' : 'Portfolio is read-only', { description: isRTL ? 'שדרג את המסלול או החלף לתיק פעיל אחר.' : 'Upgrade your plan or switch to an unlocked portfolio.' });
        return;
      }
      setImportFileName(file.name);
      setImportedCount(0);
      setImportPhase('reading');
      setImportLoading(true);
      try {
        // Small artificial pacing so the user actually sees the cinematic phases
        await new Promise(r => setTimeout(r, 450));
        if (file.name.endsWith('.json')) {
          setImportPhase('parsing');
          const text = await file.text(); const data = JSON.parse(text);
          const importedTrades = data.trades || data;
          if (!Array.isArray(importedTrades)) throw new Error('Invalid format');
          setImportedCount(importedTrades.length);
          setImportPhase('validating');
          await new Promise(r => setTimeout(r, 350));
          setImportPhase('saving');
          await importTrades(importedTrades);
        } else {
          // ── UIE: the SOLE file-import path (legacy fallback removed) ────────
          setImportPhase('parsing');
          console.log('[UIE Import] Starting:', file.name, 'size:', file.size);
          // Keep the (now soft-blur) loading overlay visible through the
          // file-read + engine phase so the user doesn't see a black flash
          // before the Preflight UI mounts. We auto-dismiss the overlay the
          // moment the engine fires `orca:uie:preflight-will-open` (right
          // before the modal renders), then re-open it after the modal closes
          // for the save phase below.
          const dismissForModal = () => setImportLoading(false);
          window.addEventListener('orca:uie:preflight-will-open', dismissForModal, { once: true });
          const outcome = await runImportWithPreflight(file, {
            brokerId: 'orca',
            targetPortfolio: activePortfolio
              ? { id: activePortfolio.id, name: activePortfolio.name, color: activePortfolio.color, currency: activePortfolio.currency }
              : null,
          });
          window.removeEventListener('orca:uie:preflight-will-open', dismissForModal);
          if (!outcome.ok) {
            if (outcome.reason === 'user_cancelled') {
              return;
            }
            if (outcome.reason === 'portfolio_locked') {
              toast.error(
                isRTL ? 'התיק נעול לקריאה־בלבד' : 'Portfolio is read-only',
                { description: isRTL ? 'שדרג את המסלול או החלף לתיק פעיל אחר.' : 'Upgrade your plan or switch to an unlocked portfolio.' },
              );
              return;
            }
            if (outcome.reason === 'no_active_portfolio') {
              toast.error(
                isRTL ? 'אין תיק פעיל' : 'No active portfolio',
                { description: isRTL ? 'בחר תיק לפני ייבוא נתונים.' : 'Pick a portfolio before importing data.' },
              );
              return;
            }
            toast.error(isRTL ? 'ייבוא נכשל' : 'Import failed', { description: outcome.reason || 'unknown' });
            return;
          }
          // Re-open overlay for the save phase.
          setImportLoading(true);
          setImportedCount(outcome.drafts.length);
          setImportPhase('validating');
          await new Promise(r => setTimeout(r, 250));
          setImportPhase('saving');
          // useTrades.importTrades runs sanitizeTrades, which fills the legacy fields
          // (day, winLoss, returnR, …) from the LegacyTradeDraft we hand it.
          await importTrades(outcome.drafts as unknown as Parameters<typeof importTrades>[0]);
          console.log('[UIE Import] Saved', outcome.drafts.length, 'trades; equity points added:', outcome.equityPointsAdded);
        }
        setImportPhase('done');
        await new Promise(r => setTimeout(r, 700));
        sessionStorage.setItem('orca-seeded', '1');
      } catch (err) {
        console.error('[XLSX Import] Error:', err);
        toast.error(isRTL ? 'שגיאת ייבוא' : 'Import error', { description: err instanceof Error ? err.message : 'Unknown error' });
      }
      finally { setImportLoading(false); }
    };
    input.click();
  }, [importTrades, isRTL, activePortfolio, isActivePortfolioLocked]);
  const [exiting, setExiting] = useState(false);
  const handleLogout = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      sessionStorage.removeItem('orca-entered');
      setExiting(false);
      setEntered(false);
    }, 1000);
  }, []);

  const tt = ttStyle(T);
  const ttItem = { color: T.text.secondary, fontSize: 11 };
  const ttLabel = { color: T.text.muted, fontSize: 10 };

  // Command palette commands
  const commands = useMemo(() => [
    { id: 'add-trade', label: isRTL ? 'הוסף עסקה' : 'Add New Trade', icon: '➕', category: isRTL ? 'עסקאות' : 'Trades', shortcut: '', action: () => { setEditingTrade(null); setShowTradeForm(true); } },
    { id: 'export-xlsx', label: isRTL ? 'ייצוא XLSX' : 'Export XLSX', icon: '📊', category: isRTL ? 'נתונים' : 'Data', action: handleExport },
    { id: 'export-json', label: isRTL ? 'ייצוא JSON' : 'Export JSON', icon: '📤', category: isRTL ? 'נתונים' : 'Data', action: handleExportJson },
    { id: 'import', label: isRTL ? 'ייבוא נתונים' : 'Import Data (XLSX/JSON)', icon: '📥', category: isRTL ? 'נתונים' : 'Data', action: handleImport },
    { id: 'reset', label: isRTL ? 'איפוס הכל' : 'Reset All Data', icon: '🗑️', category: isRTL ? 'נתונים' : 'Data', action: () => setShowReset(true) },
    { id: 'settings', label: isRTL ? 'הגדרות' : 'Settings', icon: '⚙️', category: isRTL ? 'מערכת' : 'System', shortcut: '⌘,', action: () => setShowSettings(true) },
    { id: 'privacy', label: isRTL ? 'מצב פרטיות' : 'Toggle Privacy Mode', icon: '🔒', category: isRTL ? 'מערכת' : 'System', shortcut: '⌘⇧P', action: () => settings.setPrivacyMode(!settings.privacyMode) },
    { id: 'ai', label: isRTL ? 'צור תובנות AI' : 'Generate AI Insights', icon: '🧠', category: 'AI', action: () => { setPage('ai'); handleGenerateInsights(); } },
    ...(['dashboard', 'calendar', 'journal', 'analytics', 'risk', 'psychology', 'ai'] as const).map(p => ({
      id: `nav-${p}`, label: `Go to ${p.charAt(0).toUpperCase() + p.slice(1)}`, icon: '📄', category: isRTL ? 'ניווט' : 'Navigation', action: () => setPage(p)
    })),
    { id: 'feature-info', label: isRTL ? 'אודות המערכת' : 'About Orca System', icon: 'ℹ️', category: isRTL ? 'מערכת' : 'System', action: () => setShowFeatureModal(true) },
    { id: 'journal-sanctuary', label: isRTL ? 'יומן מסע לסוחר' : 'Trader Journey', icon: '🏛️', category: isRTL ? 'ממדים' : 'Dimensions', action: () => setActiveDimension('journal') },
    { id: 'backtest-journal', label: isRTL ? 'יומן באק-טסט' : 'Backtest Journal', icon: '📊', category: isRTL ? 'ממדים' : 'Dimensions', action: () => setActiveDimension('backtest') },
    { id: 'economic-radar', label: isRTL ? 'מכ״ם כלכלי' : 'Economic Radar', icon: '📡', category: isRTL ? 'כלים' : 'Tools', action: () => setPage('economic-radar') },
  ], [isRTL, handleExport, handleImport, handleGenerateInsights, settings]);

  // ─── Weekly Review reminder badge ───
  // Shows whenever the CURRENT week / month has not yet been archived (closed).
  // Stays visible — does NOT dismiss on click — until the user actually closes the period.
  const [reviewReminderTick, setReviewReminderTick] = useState(0);
  const [reviewArchive, setReviewArchive] = useState<Array<{ weekKey?: string; closedAt?: string }>>([]);
  const [reviewRecaps, setReviewRecaps] = useState<Record<string, unknown>>({});
  useEffect(() => {
    const id = window.setInterval(() => setReviewReminderTick(t => t + 1), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getSetting } = await import('@/lib/storage');
        const [a, r] = await Promise.all([
          getSetting<Array<{ weekKey?: string; closedAt?: string }>>('weekly_review.archive'),
          getSetting<Record<string, unknown>>('weekly_review.recaps'),
        ]);
        if (cancelled) return;
        setReviewArchive(Array.isArray(a) ? a : []);
        setReviewRecaps((r && typeof r === 'object') ? r : {});
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [page]); // intentionally NOT depending on reviewReminderTick — the tick only re-evaluates `showWeeklyReminder` via local date math; refetching weekly_review.archive/recaps every 5 minutes is wasteful network noise.
  const showWeeklyReminder = useMemo(() => {
    void reviewReminderTick;
    const now = new Date();
    // WE-1: single source of truth — was a duplicated ISO algorithm here,
    // now delegated to the canonical week-key resolver. Behavior is
    // byte-identical; the badge and the archive can no longer disagree.
    const wkKey = isoWeekKey(now);
    const weekClosed = reviewArchive.some(w => w?.weekKey === wkKey);
    const mKey = `${now.getFullYear()}-${now.getMonth() + 1 < 10 ? '0' : ''}${now.getMonth() + 1}`;
    const monthRecapped = !!reviewRecaps[mKey];
    // Badge persists whenever the current period isn't archived/recapped.
    return !weekClosed || !monthRecapped;
  }, [reviewReminderTick, reviewArchive, reviewRecaps]);
  const dismissWeeklyReminder = useCallback(() => { /* no-op: badge persists until close-week */ }, []);


  const nav: Array<{ id: string; icon: any; label: string; color?: string; action?: () => void }> = [
    { id: 'dashboard', icon: Ico.dash, label: isRTL ? 'דשבורד' : 'Dashboard' },
    { id: 'calendar', icon: '📅', label: isRTL ? 'לוח שנה' : 'Calendar' },
    { id: 'journal', icon: Ico.book, label: t.journal },
    { id: 'analytics', icon: Ico.bar, label: isRTL ? 'אנליטיקה' : 'Analytics' },
    { id: 'risk', icon: Ico.shield, label: t.risk },
    { id: 'psychology', icon: Ico.brain, label: t.psychology },
    { id: 'ai', icon: Ico.star, label: t.ai },
    { id: 'economic-radar', icon: '📡', label: isRTL ? 'מכ״ם כלכלי' : 'Economic Radar' },
    { id: 'weekly-review', icon: '📋', label: isRTL ? 'סקירה שבועית' : 'Weekly Review', color: '#FFD700' },
  ];

  // Keep the loader visible until BOTH the trade list and the portfolio
  // resolution have finished.
  const dataReady = !loading && initialized && !portfoliosLoading && !(!activePortfolioId && portfolios.length > 0);
  // After dataReady flips true, wait one paint frame so React has actually
  // rendered the dashboard before we hide the loader — eliminates the empty
  // flash users were seeing. (state declared above with other hooks)
  useEffect(() => {
    if (!dataReady) { setFirstPaintReady(false); return; }
    let raf2: number | undefined;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFirstPaintReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
    };
  }, [dataReady]);

  // Entry gate check (after all hooks — must stay below every hook to avoid React #310)
  if (!entered) {
    return <EntryGate onEnter={() => setEntered(true)} lang={settings.lang} />;
  }

  const stillBootstrapping = !dataReady || !firstPaintReady;
  if (stillBootstrapping) {
    return <OrcaBootLoader />;
  }

  // Privacy wrapper
  const PV = ({ children, type = 'dollar' }: { children: React.ReactNode; type?: 'dollar' | 'percent' | 'number' }) => (
    <PrivacyMask enabled={settings.privacyMode} type={type}>{children}</PrivacyMask>
  );

  const dashboardMobileChartHeight = isMobile ? 250 : undefined;
  const dashboardCompactChartHeight = isMobile ? 220 : undefined;

  // ═══════════════════════════════════════════════════
  // RENDER PAGES WITH MODE AWARENESS
  // ═══════════════════════════════════════════════════

  const renderDashboard = () => {
    if (trades.length === 0) return null;

    // BEGINNER MODE: simplified, friendly
    if (opMode === 'beginner') return (
      <>
        <FeatureHint
          T={T}
          id="dashboard-beginner-intro"
          text={isRTL
            ? 'מצב מתחיל מציג רק את המדדים הקריטיים: רווח, אחוז הצלחה ומשמעת. ככל שתתקדם — תוכל לעבור למצב Standard או Alpha בהגדרות.'
            : 'Beginner Mode shows only the essentials: P&L, win rate, and discipline. As you progress, switch to Standard or Alpha mode in Settings.'}
        />
        <h2 style={{ fontSize: 22, fontWeight: 300, color: T.text.secondary, margin: '0 0 20px', fontFamily: "'JetBrains Mono', monospace" }}>
          {isRTL ? '🎓 מצב מתחיל — ברוך הבא!' : '🎓 Beginner Mode — Welcome!'}
        </h2>
        {/* Core metrics only */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <MetricCard T={T} label={isR ? (isRTL ? 'תוחלת נטו (R)' : 'Net R') : t.netPnl} value={isR ? `${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(2)}R` : stats.totalPnl} color={(isR ? stats.totalR : stats.totalPnl) >= 0 ? T.accent.cyan : T.accent.red} onInfoClick={() => handleExplainClick(t.netPnl, EXPLANATIONS.netPnl)} />
          <MetricCard T={T} label={t.winRate} value={stats.winRate} suffix="%" color={T.accent.green} onInfoClick={() => handleExplainClick(t.winRate, EXPLANATIONS.winRate)} />
          <MetricCard T={T} label={t.totalTrades} value={String(stats.totalTrades)} color={T.text.primary} />
          <MetricCard T={T} label={t.avgWin} value={isR ? `+${stats.avgWinR.toFixed(2)}R` : stats.avgWin} suffix={isR ? undefined : '$'} color={T.accent.green} />
          <MetricCard T={T} label={t.avgLoss} value={isR ? `-${stats.avgLossR.toFixed(2)}R` : stats.avgLoss} suffix={isR ? undefined : '$'} color={T.accent.red} />
          <MetricCard T={T} label={t.currentStreak} value={`${stats.currentStreak} ${stats.streakType === 'Win' ? '🟢' : stats.streakType === 'Loss' ? '🔴' : '⚪'}`} color={T.text.primary} />
        </div>
        {/* Simple Equity Curve */}
        <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.equityCurve} explanation={EXPLANATIONS.equityCurve} unit={isR ? 'R' : '$'} style={{ marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.equityCurve}>
              <defs><linearGradient id="eqBeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.6}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.25}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="trade" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} domain={[(dataMin: number) => Math.floor(dataMin * 0.98), (dataMax: number) => Math.ceil(dataMax * 1.02)]} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" />
              <Area type="monotone" dataKey="balance" stroke={T.accent.cyan} fill="url(#eqBeg)" strokeWidth={2.5} dot={trades.length <= 50 ? { fill: T.accent.cyan, r: 3 } : false} activeDot={{ r: 5, fill: T.accent.cyan }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
        {/* Simple P&L bars */}
        <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit={isR ? 'R' : '$'} style={{ marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trades.map(tr => ({ id: tr.id, v: bucketValue(tr) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} formatter={(v: any) => isR ? `${Number(v).toFixed(2)}R` : `$${Number(v).toFixed(2)}`} />
              <ReferenceLine y={0} stroke={T.border.medium} strokeWidth={1} />
              <Bar dataKey="v" radius={[4,4,0,0]}>{trades.map((tr, i) => <Cell key={i} fill={bucketValue(tr) >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
        {/* Discipline indicator */}
        <GlassCard T={T} style={{ marginBottom: 18, textAlign: 'center', padding: 24 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{t.disciplineScore}</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: stats.rulesFollowed >= 80 ? T.accent.green : stats.rulesFollowed >= 50 ? T.accent.orange : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>
            {stats.rulesFollowed.toFixed(0)}%
          </div>
          <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 8 }}>
            {stats.rulesFollowed >= 80 ? (isRTL ? 'משמעת מצוינת! 👏' : 'Excellent discipline! 👏') :
             stats.rulesFollowed >= 50 ? (isRTL ? 'יש מקום לשיפור' : 'Room for improvement') :
             (isRTL ? 'צריך לעבוד על משמעת' : 'Work on discipline')}
          </div>
        </GlassCard>
        {/* Tip card */}
        <GlassCard T={T} glow={`${T.accent.blue}12`}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 24 }}>💡</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.accent.blue, marginBottom: 4 }}>{isRTL ? 'טיפ למתחיל' : 'Beginner Tip'}</div>
              <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6 }}>
                {isRTL
                  ? 'התמקד באחוז ההצלחה ובמשמעת. עקוב אחרי הכללים שלך, ושמור על סיכון קבוע לעסקה. השאר הוא רעש.'
                  : 'Focus on win rate and discipline. Follow your rules, keep consistent risk per trade. Everything else is noise.'}
              </div>
            </div>
          </div>
        </GlassCard>
      </>
    );

    // LIVE MODE: execution-focused, minimal, real-time
    if (opMode === 'live') return (
      <>
        {/* Session Focus Panel */}
        <div className={isMobile ? 'orca-snap-h' : ''} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
          <GlassCard T={T} glow={T.accent.cyanGlow} style={{ flex: 2, minWidth: isMobile ? 0 : 300, width: isMobile ? '100%' : undefined }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{isRTL ? '🔴 מצב חי — פוקוס ביצוע' : '🔴 LIVE — Execution Focus'}</div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 9, color: T.text.muted }}>Session P&L</div>
                <PV><div style={{ fontSize: 28, fontWeight: 700, color: dailyPnlToday >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{dailyPnlToday >= 0 ? '+' : ''}${dailyPnlToday.toFixed(2)}</div></PV>
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.text.muted }}>{isRTL ? 'רצף' : 'Streak'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: stats.streakType === 'Win' ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{stats.currentStreak} {stats.streakType === 'Win' ? '🟢' : '🔴'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.text.muted }}>{isRTL ? 'משמעת חיה' : 'Live Discipline'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: stats.rulesFollowed > 80 ? T.accent.green : T.accent.orange, fontFamily: "'JetBrains Mono', monospace" }}>{stats.rulesFollowed.toFixed(0)}%</div>
              </div>
            </div>
          </GlassCard>
          {/* Risk Exposure Meter — matrix: live_risk_meter */}
          {true && (
          <GlassCard T={T} style={{ flex: 1, minWidth: isMobile ? 0 : 200, width: isMobile ? '100%' : undefined, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'חשיפת סיכון' : 'Risk Exposure'}</div>
            <svg width="100" height="55" viewBox="0 0 200 110" style={{ margin: '0 auto', display: 'block' }}>
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={T.border.subtle} strokeWidth="12" strokeLinecap="round"/>
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#rGlive)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${riskPct * 2.51} 251`} style={{ transition: 'stroke-dasharray 1s ease' }}/>
              <defs><linearGradient id="rGlive" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={T.accent.green}/><stop offset="50%" stopColor={T.accent.orange}/><stop offset="100%" stopColor={T.accent.red}/></linearGradient></defs>
              <text x="100" y="82" textAnchor="middle" fill={riskLevel === 'critical' ? T.accent.red : riskLevel === 'warning' ? T.accent.orange : T.accent.green} fontSize="22" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{riskPct.toFixed(0)}%</text>
            </svg>
          </GlassCard>
          )}
        </div>
        {/* Streak Pressure + Emotional Deviation */}
        <div className={isMobile ? 'orca-snap-h' : ''} style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
          {true && (
          <GlassCard T={T} style={{ flex: 1, minWidth: isMobile ? 0 : 200, width: isMobile ? '100%' : undefined }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{isRTL ? 'לחץ רצף' : 'Streak Pressure'}</div>
            <div style={{ padding: 14, borderRadius: T.radius.md, textAlign: 'center', background: stats.maxConsecLosses >= 3 ? `${T.accent.red}10` : stats.currentStreak >= 3 && stats.streakType === 'Win' ? `${T.accent.green}10` : `${T.accent.blue}08`, border: `1px solid ${stats.maxConsecLosses >= 3 ? T.accent.red : T.accent.green}20` }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{stats.maxConsecLosses >= 3 ? '🔥' : stats.currentStreak >= 3 ? '🚀' : '⚖️'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text.primary }}>{stats.maxConsecLosses >= 3 ? (isRTL ? 'צינון מומלץ' : 'Cool-Off Recommended') : stats.currentStreak >= 3 ? (isRTL ? 'מומנטום חיובי' : 'Positive Momentum') : (isRTL ? 'ניטרלי' : 'Neutral')}</div>
            </div>
          </GlassCard>
          )}
          <GlassCard T={T} style={{ flex: 1, minWidth: isMobile ? 0 : 200, width: isMobile ? '100%' : undefined }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{isRTL ? 'סטייה רגשית' : 'Emotional Deviation'}</div>
            {trades.slice(-5).map(tr => (
              <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${T.border.subtle}`, fontSize: 11 }}>
                <span style={{ color: T.text.muted }}>{tr.coin}</span>
                <span style={{ color: tr.deviation > 0.1 ? T.accent.red : T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>{tr.deviation.toFixed(3)}R {tr.deviation > 0.1 ? '⚠️' : '✓'}</span>
              </div>
            ))}
          </GlassCard>
          <GlassCard T={T} style={{ flex: 1, minWidth: isMobile ? 0 : 200, width: isMobile ? '100%' : undefined }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{isRTL ? 'מד מסחר יתר' : 'Overtrading Monitor'}</div>
            <div style={{ textAlign: 'center', padding: 10 }}>
              {(() => {
                const todayTrades = trades.filter(tr => new Date(tr.date).toDateString() === new Date().toDateString());
                const isOvertrading = todayTrades.length >= 3;
                return <>
                  <div style={{ fontSize: 32, marginBottom: 4 }}>{isOvertrading ? '🚨' : todayTrades.length >= 2 ? '⚡' : '✅'}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: isOvertrading ? T.accent.red : T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>{todayTrades.length}</div>
                  <div style={{ fontSize: 9, color: T.text.muted }}>{isRTL ? 'עסקאות היום' : 'trades today'}</div>
                </>;
              })()}
            </div>
          </GlassCard>
        </div>
        {/* Position vs Plan — matrix: live_open_positions */}
        {isAdvancedTier && (
        <GlassCard T={T} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'סיכון מול תוכנית' : 'Position Risk vs Plan'}</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {trades.slice(-6).map(tr => (
              <div key={tr.id} style={{ flex: '0 0 auto', padding: 10, background: T.bg.tertiary, borderRadius: T.radius.md, minWidth: 100, textAlign: 'center', border: `1px solid ${Math.abs(tr.riskPct - 1) > 0.5 ? T.accent.red : T.accent.green}20` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.accent.cyan }}>{tr.coin}</div>
                <div style={{ fontSize: 9, color: T.text.muted, marginTop: 2 }}>Plan: {tr.riskPct}% • Actual: {((tr.risk / (tr.balance - tr.pnl)) * 100).toFixed(1)}%</div>
                <div style={{ height: 3, background: T.bg.surface, borderRadius: 2, marginTop: 4 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (tr.risk / (tr.balance - tr.pnl)) * 100 * 50)}%`, background: Math.abs(tr.riskPct - 1) > 0.5 ? T.accent.red : T.accent.green, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
        )}
        {isUltimateTier && <>
          <ScoreGauge T={T} score={stats.orcaScore} label={isRTL ? 'ציון משמעת חי' : 'Live Discipline Score'} color={T.accent.cyan} />
        </>}
      </>
    );

    // REVIEW MODE: extracted to mobile-first ReviewDashboard module
    if (opMode === 'review') return (
      <LazyShell>
        <ReviewDashboard
          T={T}
          t={t}
          isRTL={isRTL}
          trades={trades}
          stats={stats}
          riskData={riskData}
          radarData={radarData}
          tt={tt}
          privacyMode={settings.privacyMode}
          isAdvancedTier={isAdvancedTier}
          isUltimateTier={isUltimateTier}
          isAlpha={isAlpha}
          advancedOpen={advancedOpen}
          setAdvancedOpen={setAdvancedOpen}
          isChartVisible={isChartVisible}
          handleHideChart={handleHideChart}
          handleExplainClick={handleExplainClick}
          onAddTrade={addTrade}
        />
      </LazyShell>
    );


    // RESEARCH MODE: quant lab
    return (
      <>
        <div style={{ padding: '6px 12px', background: `${T.accent.purple}10`, border: `1px solid ${T.accent.purple}25`, borderRadius: T.radius.md, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔬</span>
          <span style={{ fontSize: 12, color: T.accent.purple, fontWeight: 600 }}>{isRTL ? 'מעבדת מחקר מתקדמת' : 'Advanced Research Lab'}</span>
          <span style={{ fontSize: 10, color: T.text.muted, marginInlineStart: 'auto' }}>{stats.totalTrades} {isRTL ? 'עסקאות' : 'trades'} | {isRTL ? 'עומק אלפא' : 'Alpha Depth'}: {isAlpha ? 'ON' : 'OFF'}</span>
        </div>

        {hasStrictRData && (
        <>
        {/* Key R-metrics row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { l: 'Expectancy (R)', v: `${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(3)}R`, c: stats.expectancyR >= 0 ? T.accent.cyan : T.accent.red, u: 'R' },
            { l: 'Vol-Adj Expectancy', v: stats.volatilityAdjustedExpectancy.toFixed(3), c: T.accent.blue, u: 'R/σ' },
            { l: 'Kelly Optimal', v: `${stats.kellyOptimal.toFixed(1)}%`, c: stats.kellyOptimal > 0 ? T.accent.green : T.accent.red, u: '%' },
            { l: 'Risk of Ruin', v: `${Math.min(99.9, stats.riskOfRuin).toFixed(1)}%`, c: stats.riskOfRuin < 10 ? T.accent.green : T.accent.red, u: '%' },
            { l: 'Avg Win R', v: `+${stats.avgWinR.toFixed(2)}R`, c: T.accent.green, u: 'R' },
            { l: 'Avg Loss R', v: `-${stats.avgLossR.toFixed(2)}R`, c: T.accent.red, u: 'R' },
          ].map((m, i) => (
            <GlassCard T={T} key={i} className="orca-dashboard-stat-card" style={{ flex: isMobile ? '1 1 calc(50% - 5px)' : 1, minWidth: isMobile ? 0 : 130, width: isMobile ? 'auto' : undefined, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.l}</div>
                <span style={{ fontSize: 7, padding: '1px 3px', borderRadius: 3, background: `${T.accent.purple}12`, color: T.accent.purple, fontWeight: 700 }}>{m.u}</span>
              </div>
              <PV><div style={{ fontSize: 18, fontWeight: 700, color: m.c, fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div></PV>
            </GlassCard>
          ))}
        </div>

          {/* Research charts grid — slim quant style on desktop, denser packing in alpha */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : (isAlpha ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'), gap: 10, marginBottom: 14 }}>
            <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'התפלגות R-Multiple' : 'R-Multiple Distribution'} explanation={EXPLANATIONS.rDistribution} unit="R">
              <ResponsiveContainer width="100%" height={isAlpha ? 120 : 200}>
                <BarChart data={stats.rDist}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Bar dataKey="r" radius={[3,3,0,0]}>{stats.rDist.map((d, i) => <Cell key={i} fill={d.r >= 0 ? T.accent.cyan : T.accent.red} />)}</Bar></BarChart>
              </ResponsiveContainer>
            </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'שארפ מתגלגל' : 'Rolling Sharpe Ratio'} explanation={EXPLANATIONS.rollingSharpe} unit="R/σ">
            <ResponsiveContainer width="100%" height={isAlpha?120:200}>
              <LineChart data={stats.rollingSharpe}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="tradeId" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Line type="monotone" dataKey="sharpe" stroke={T.accent.blue} strokeWidth={2} dot={{ fill: T.accent.blue, r: 2 }} /><Line type="monotone" dataKey="sharpe" stroke="transparent" />{/* zero line */}</LineChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'דעיכת יתרון' : 'Edge Decay Timeline'} explanation={EXPLANATIONS.edgeDecay} unit="R">
            <ResponsiveContainer width="100%" height={isAlpha?120:200}>
              <BarChart data={stats.edgeDecay}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="period" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Bar dataKey="expectancyR" radius={[4,4,0,0]}>{stats.edgeDecay.map((d, i) => <Cell key={i} fill={d.expectancyR >= 0 ? T.accent.cyan : T.accent.red} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'אחוז הצלחה vs R:R' : 'Win Rate vs R:R Bucket'} explanation={EXPLANATIONS.winRateVsRR} unit="%">
            <ResponsiveContainer width="100%" height={isAlpha?120:200}>
              <BarChart data={stats.winRateVsRR}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="rr" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 9 }} domain={[0, 100]} /><Tooltip contentStyle={tt} /><Bar dataKey="winRate" fill={T.accent.blue} radius={[4,4,0,0]} /><Bar dataKey="count" fill={`${T.accent.cyan}40`} radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'תוחלת מתגלגלת (R)' : 'Rolling Expectancy (R)'} explanation={EXPLANATIONS.expectancy} unit="R">
            <ResponsiveContainer width="100%" height={isAlpha?120:200}>
              <AreaChart data={stats.rollingExpectancyR}>
                <defs><linearGradient id="reGRes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.55}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.25}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="tradeId" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                <Tooltip contentStyle={tt} /><Area type="monotone" dataKey="expectancyR" stroke={T.accent.cyan} fill="url(#reGRes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'תוחלת לפי מטבע (R)' : 'Strategy Expectancy (R)'} explanation={EXPLANATIONS.coinPerformance} unit="R">
            <ResponsiveContainer width="100%" height={isAlpha?120:200}>
              <BarChart data={stats.strategyExpectancyR} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis type="number" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 10 }} width={40} /><Tooltip contentStyle={tt} /><Bar dataKey="expectancyR" radius={[0,4,4,0]}>{stats.strategyExpectancyR.map((d, i) => <Cell key={i} fill={d.expectancyR >= 0 ? T.accent.green : T.accent.red} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'מפת נסיגה' : 'Drawdown Depth Map'} explanation={EXPLANATIONS.drawdown} unit="%">
            <ResponsiveContainer width="100%" height={isAlpha?120:200}>
              <AreaChart data={(() => { let p = 0; return stats.equityCurve.map(e => { if (e.balance > p) p = e.balance; return { trade: e.trade, dd: p > 0 ? -((p - e.balance) / Math.max(Math.abs(p), 1) * 100) : 0 }; }); })()}>
                <defs><linearGradient id="ddGRRes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.red} stopOpacity={0.25}/><stop offset="100%" stopColor={T.accent.red} stopOpacity={0.6}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="trade" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 9 }} domain={['dataMin', 0]} />
                <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(2)}%`} /><Area type="monotone" dataKey="dd" stroke={T.accent.red} fill="url(#ddGRRes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביצועים לפי יום (R)' : 'Performance by Day (R)'} explanation={EXPLANATIONS.coinPerformance} unit="R">
            <ResponsiveContainer width="100%" height={isAlpha?120:200}>
              <BarChart data={stats.dayPerf}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="day" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Bar dataKey="avgR" radius={[4,4,0,0]}>{stats.dayPerf.map((d, i) => <Cell key={i} fill={d.avgR >= 0 ? T.accent.green : T.accent.red} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
          </div>

          {/* Alpha: additional research panels */}
          {isAlpha && <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'סיכון/רוויה' : 'Risk of Ruin Curve'} explanation={EXPLANATIONS.riskOfRuin} unit="%">
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: stats.riskOfRuin < 10 ? T.accent.green : stats.riskOfRuin < 30 ? T.accent.orange : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{Math.min(99.9, stats.riskOfRuin).toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: T.text.muted, marginTop: 4 }}>{stats.riskOfRuin < 10 ? '🟢 Low Risk' : stats.riskOfRuin < 30 ? '🟡 Moderate' : '🔴 High Risk'}</div>
              </div>
            </ChartWrapper>
            <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'אופטימום קלי' : 'Kelly Optimal Sizing'} explanation={EXPLANATIONS.kellyOptimal} unit="%">
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: stats.kellyOptimal > 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{stats.kellyOptimal.toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: T.text.muted, marginTop: 4 }}>Half-Kelly: {(stats.kellyOptimal / 2).toFixed(1)}%</div>
              </div>
            </ChartWrapper>
            <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'יעילות הון' : 'Capital Efficiency'} explanation={EXPLANATIONS.volatilityAdjusted} unit="R/σ">
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: stats.volatilityAdjustedExpectancy > 0.5 ? T.accent.cyan : T.accent.orange, fontFamily: "'JetBrains Mono', monospace" }}>{stats.volatilityAdjustedExpectancy.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: T.text.muted, marginTop: 4 }}>{stats.volatilityAdjustedExpectancy > 0.5 ? '🟢 Efficient' : '🟡 Suboptimal'}</div>
              </div>
            </ChartWrapper>
          </div>

          {/* Drawdown structure table */}
          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'מבנה נסיגות' : 'Drawdown Structure Map'} explanation={EXPLANATIONS.drawdownStructure} unit="%">
            {stats.drawdownStructure.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: T.text.muted, fontSize: 12 }}>{isRTL ? 'אין נסיגות משמעותיות' : 'No significant drawdowns'}</div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {stats.drawdownStructure.map((dd, i) => (
                  <div key={i} style={{ flex: '0 0 auto', padding: 10, background: `${T.accent.red}08`, border: `1px solid ${T.accent.red}20`, borderRadius: T.radius.md, minWidth: 120, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>-{dd.depth.toFixed(1)}%</div>
                    <div style={{ fontSize: 9, color: T.text.muted, marginTop: 3 }}>Trades {dd.start}→{dd.end} • {dd.recovery} to recover</div>
                  </div>
                ))}
              </div>
            )}
          </ChartWrapper>

          {/* Confidence vs Outcome scatter */}
          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביטחון מול תוצאה' : 'Confidence vs Outcome Scatter'} explanation={EXPLANATIONS.rDistribution} unit="R" style={{ marginTop: 12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="deviation" name="Deviation" tick={{ fill: T.text.muted, fontSize: 9 }} /><YAxis dataKey="returnR" name="R-Multiple" tick={{ fill: T.text.muted, fontSize: 9 }} /><ZAxis dataKey="risk" range={[40, 90]} />
                <Tooltip contentStyle={tt} cursor={{ strokeDasharray: '3 3' }} /><ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" /><Scatter data={trades.map(tr => ({ deviation: tr.deviation, returnR: getEffectiveR(tr), risk: tr.risk, coin: tr.coin }))} fill={T.accent.cyan} fillOpacity={0.85} stroke={T.bg.card} strokeWidth={1} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* ═══ ALPHA QUANT LAB — slim-line advanced visualisations ═══ */}
          <div style={{ fontSize: 9, color: T.accent.purple, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 1, background: T.accent.purple, display: 'inline-block' }} />
            {isRTL ? 'מעבדת קוונט · גרפים דקיקים מתקדמים' : 'QUANT LAB · slim advanced visualisations'}
          </div>
          {(() => {
            const effectiveRs = trades.map(tr => getEffectiveR(tr));
            const dailyRSeries = (() => {
              const byDay = new Map<string, Trade[]>();
              trades.forEach(tr => {
                const key = (tr.date || '').slice(0, 10);
                if (!key) return;
                const arr = byDay.get(key) || [];
                arr.push(tr);
                byDay.set(key, arr);
              });
              let c = 0;
              return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, dayTrades], i) => {
                const { total } = sumDailyR(dayTrades);
                c += total;
                return { i: i + 1, day, total, cum: c };
              });
            })();
            // Rolling Sortino — downside-only volatility ratio (window 20)
            const W = 20;
            const sortino = trades.map((_, i) => {
              const slice = effectiveRs.slice(Math.max(0, i - W + 1), i + 1);
              const mean = slice.reduce((s, x) => s + x, 0) / slice.length;
              const downs = slice.filter(x => x < 0);
              const dd = Math.sqrt(downs.reduce((s, x) => s + x * x, 0) / Math.max(downs.length, 1));
              return { i: i + 1, sortino: dd > 0 ? +(mean / dd).toFixed(3) : 0 };
            });
            // R-return histogram (bins of 0.5R)
            const minR = Math.floor(Math.min(...effectiveRs, 0) * 2) / 2;
            const maxR = Math.ceil(Math.max(...effectiveRs, 0) * 2) / 2;
            const bins: { bin: string; n: number; mid: number }[] = [];
            for (let b = minR; b <= maxR; b += 0.5) {
              const n = effectiveRs.filter(r => r >= b && r < b + 0.5).length;
              bins.push({ bin: `${b.toFixed(1)}`, mid: b + 0.25, n });
            }
            // Lag-1 autocorrelation point cloud (R[i] vs R[i-1])
            const acData = effectiveRs.slice(1).map((r, i) => ({ prev: effectiveRs[i], cur: r }));
            // MAR ratio evolution: cumulative R / max DD R so far
            let peakR = 0, mddR = 0;
            const mar = dailyRSeries.map((d, i) => {
              const cumR = d.cum;
              if (cumR > peakR) peakR = cumR;
              const dd = peakR - cumR;
              if (dd > mddR) mddR = dd;
              return { i: i + 1, mar: mddR > 0 ? +(cumR / mddR).toFixed(3) : cumR };
            });
            // Inter-trade interval (hours between trades)
            const interHrs = trades.slice(1).map((t, i) => {
              try {
                const a = new Date(trades[i].date.replace(' ', 'T')).getTime();
                const b = new Date(t.date.replace(' ', 'T')).getTime();
                return { i: i + 1, hrs: Math.max(0, +((b - a) / 3600000).toFixed(2)) };
              } catch { return { i: i + 1, hrs: 0 }; }
            });
            return (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'Sortino מתגלגל' : 'Rolling Sortino'} explanation={EXPLANATIONS.rollingSharpe} unit="R/σ⁻">
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={sortino}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                      <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 9 }} hide />
                      <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <Tooltip contentStyle={tt} />
                      <ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" />
                      <Line type="monotone" dataKey="sortino" stroke={T.accent.purple} strokeWidth={1.4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'MAR מצטבר (תשואה/נסיגה)' : 'Cumulative MAR (return/DD)'} explanation={EXPLANATIONS.kellyOptimal} unit="x">
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={mar}>
                      <defs>
                        <linearGradient id="marG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                      <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 9 }} hide />
                      <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <Tooltip contentStyle={tt} />
                      <Area type="monotone" dataKey="mar" stroke={T.accent.cyan} fill="url(#marG)" strokeWidth={1.4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartWrapper>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'התפלגות R (היסטוגרמה)' : 'R Histogram'} explanation={EXPLANATIONS.rDistribution} unit="R">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={bins}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                      <XAxis dataKey="bin" tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <Tooltip contentStyle={tt} />
                      <Bar dataKey="n" radius={[2, 2, 0, 0]}>
                        {bins.map((b, i) => <Cell key={i} fill={b.mid >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'אוטוקורלציה Lag-1 (R[t] מול R[t-1])' : 'Lag-1 Autocorrelation'} explanation={EXPLANATIONS.rDistribution} unit="R">
                  <ResponsiveContainer width="100%" height={120}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                      <XAxis type="number" dataKey="prev" name="R(t-1)" tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <YAxis type="number" dataKey="cur" name="R(t)" tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <Tooltip contentStyle={tt} cursor={{ strokeDasharray: '3 3' }} />
                      <ReferenceLine x={0} stroke={T.border.medium} strokeDasharray="2 2" />
                      <ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" />
                      <Scatter data={acData} fill={T.accent.purple} fillOpacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartWrapper>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'מרווחים בין עסקאות (שעות)' : 'Inter-trade Interval (hrs)'} explanation={EXPLANATIONS.rDistribution} unit="h">
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={interHrs}>
                      <defs>
                        <linearGradient id="ihG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={T.accent.orange} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={T.accent.orange} stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                      <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 9 }} hide />
                      <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <Tooltip contentStyle={tt} />
                      <Area type="monotone" dataKey="hrs" stroke={T.accent.orange} fill="url(#ihG)" strokeWidth={1.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartWrapper>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'יחס Win/Loss מצטבר' : 'Cumulative Win/Loss Ratio'} explanation={EXPLANATIONS.winRate} unit="x">
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={(() => {
                      let w = 0, l = 0;
                      return trades.map((t, i) => {
                        if (t.winLoss === 'Win') w++;
                        else if (t.winLoss === 'Loss') l++;
                        return { i: i + 1, ratio: l > 0 ? +(w / l).toFixed(3) : w };
                      });
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                      <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 9 }} hide />
                      <YAxis tick={{ fill: T.text.muted, fontSize: 9 }} />
                      <Tooltip contentStyle={tt} />
                      <ReferenceLine y={1} stroke={T.border.medium} strokeDasharray="2 2" />
                      <Line type="monotone" dataKey="ratio" stroke={T.accent.green} strokeWidth={1.4} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
              </div>
            );
          })()}
        </>}

        {/* ═══ ALPHA+REVIEW: Structured Performance Tables ═══ */}
        {isAlpha && (
          <div style={{ marginTop: 18, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: 9, color: T.accent.orange, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 18, height: 1, background: T.accent.orange, display: 'inline-block' }} />
              {isRTL ? 'ניתוח מעמיק' : 'DEEP ANALYTICS'}
            </div>

            {/* Setup Performance Table */}
            <GlassCard T={T} style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border.subtle}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text.primary }}>{isRTL ? 'ביצועים לפי סטאפ' : 'Performance by Setup'}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: T.bg.tertiary }}>
                    {['Setup', 'Trades', 'Win %', 'Avg R', 'Total R', 'Best', 'Worst'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.text.muted, fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border.subtle}` }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(() => {
                      const setupMap: Record<string, { trades: number; wins: number; totalR: number; best: number; worst: number }> = {};
                      trades.forEach(tr => {
                        const s = tr.coin;
                        if (!setupMap[s]) setupMap[s] = { trades: 0, wins: 0, totalR: 0, best: -Infinity, worst: Infinity };
                        setupMap[s].trades++;
                        if (tr.winLoss === 'Win') setupMap[s].wins++;
                        const r = getEffectiveR(tr);
                        setupMap[s].totalR += r;
                        setupMap[s].best = Math.max(setupMap[s].best, r);
                        setupMap[s].worst = Math.min(setupMap[s].worst, r);
                      });
                      return Object.entries(setupMap).sort((a, b) => b[1].totalR - a[1].totalR).slice(0, 8).map(([name, d]) => (
                        <tr key={name} style={{ borderBottom: `1px solid ${T.border.subtle}` }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: T.accent.cyan }}>{name}</td>
                          <td style={{ padding: '8px 12px', color: T.text.secondary }}>{d.trades}</td>
                          <td style={{ padding: '8px 12px', color: (d.wins / d.trades * 100) >= 50 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{(d.wins / d.trades * 100).toFixed(0)}%</td>
                          <td style={{ padding: '8px 12px', color: (d.totalR / d.trades) >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{(d.totalR / d.trades).toFixed(2)}R</td>
                          <td style={{ padding: '8px 12px', color: d.totalR >= 0 ? T.accent.green : T.accent.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{d.totalR.toFixed(1)}R</td>
                          <td style={{ padding: '8px 12px', color: T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>{d.best.toFixed(2)}R</td>
                          <td style={{ padding: '8px 12px', color: T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{d.worst.toFixed(2)}R</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Day-of-Week Performance */}
            <GlassCard T={T} style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border.subtle}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text.primary }}>{isRTL ? 'ביצועים לפי יום בשבוע' : 'Performance by Day of Week'}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: T.bg.tertiary }}>
                    {['Day', 'Trades', 'Win %', 'Avg R', 'Total P&L'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.text.muted, fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border.subtle}` }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {(() => {
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      const dayMap: Record<number, { trades: number; wins: number; totalR: number; totalPnl: number }> = {};
                      trades.forEach(tr => {
                        const d = new Date(tr.date.replace(' ', 'T'));
                        if (isNaN(d.getTime())) return;
                        const day = d.getDay();
                        if (!dayMap[day]) dayMap[day] = { trades: 0, wins: 0, totalR: 0, totalPnl: 0 };
                        dayMap[day].trades++;
                        if (tr.winLoss === 'Win') dayMap[day].wins++;
                        dayMap[day].totalR += getEffectiveR(tr);
                        dayMap[day].totalPnl += bucketValue(tr);
                      });
                      return [1, 2, 3, 4, 5].filter(d => dayMap[d]).map(d => (
                        <tr key={d} style={{ borderBottom: `1px solid ${T.border.subtle}` }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: T.text.primary }}>{dayNames[d]}</td>
                          <td style={{ padding: '8px 12px', color: T.text.secondary }}>{dayMap[d].trades}</td>
                          <td style={{ padding: '8px 12px', color: (dayMap[d].wins / dayMap[d].trades * 100) >= 50 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{(dayMap[d].wins / dayMap[d].trades * 100).toFixed(0)}%</td>
                          <td style={{ padding: '8px 12px', color: (dayMap[d].totalR / dayMap[d].trades) >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{(dayMap[d].totalR / dayMap[d].trades).toFixed(2)}R</td>
                          <td style={{ padding: '8px 12px', color: dayMap[d].totalPnl >= 0 ? T.accent.green : T.accent.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}><PV>{isR ? `${dayMap[d].totalPnl >= 0 ? '+' : ''}${dayMap[d].totalPnl.toFixed(2)}R` : `$${dayMap[d].totalPnl.toFixed(2)}`}</PV></td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Risk Consistency Matrix */}
            <GlassCard T={T} style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border.subtle}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text.primary }}>{isRTL ? 'מטריצת עקביות סיכון' : 'Risk Consistency Matrix'}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead><tr style={{ background: T.bg.tertiary }}>
                    {['Metric', 'Value', 'Target', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: T.text.muted, fontWeight: 600, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border.subtle}` }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {[
                      { metric: 'Risk Consistency', value: `${riskData.riskConsistencyScore.toFixed(0)}%`, target: '≥ 80%', ok: riskData.riskConsistencyScore >= 80 },
                      { metric: 'Avg Risk/Trade', value: `$${(trades.reduce((s, t) => s + t.risk, 0) / Math.max(1, trades.length)).toFixed(2)}`, target: '≤ 2% balance', ok: true },
                      { metric: 'Risk Drift', value: `${riskData.riskDrift.toFixed(2)}σ`, target: '< 1.0σ', ok: riskData.riskDrift < 1 },
                      { metric: 'Max Consec Losses', value: String(stats.maxConsecLosses), target: '< 5', ok: stats.maxConsecLosses < 5 },
                      { metric: 'Rules Adherence', value: `${stats.rulesFollowed.toFixed(0)}%`, target: '≥ 75%', ok: stats.rulesFollowed >= 75 },
                      { metric: 'Avg Deviation', value: `${(trades.reduce((s, t) => s + t.deviation, 0) / Math.max(1, trades.length)).toFixed(3)}R`, target: '< 0.1R', ok: (trades.reduce((s, t) => s + t.deviation, 0) / Math.max(1, trades.length)) < 0.1 },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border.subtle}` }}>
                        <td style={{ padding: '8px 12px', color: T.text.secondary }}>{row.metric}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: T.text.primary }}>{row.value}</td>
                        <td style={{ padding: '8px 12px', color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{row.target}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: row.ok ? `${T.accent.green}15` : `${T.accent.red}15`, color: row.ok ? T.accent.green : T.accent.red }}>
                            {row.ok ? '✓ On Track' : '⚠ Off Target'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}
        </>
        )}
      </>
    );
  };

  const renderJournal = () => {
    if (trades.length === 0) return null;
    const sortedDesc = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const isLive = opMode === 'live';
    const totalPages = isLive ? 1 : Math.max(1, Math.ceil(sortedDesc.length / JOURNAL_PAGE_SIZE));
    const safePage = Math.min(journalPage, totalPages - 1);
    const start = safePage * JOURNAL_PAGE_SIZE;
    const pageRows = isLive ? trades.slice(-8) : sortedDesc.slice(start, start + JOURNAL_PAGE_SIZE);
    const from = isLive ? Math.max(1, trades.length - pageRows.length + 1) : start + 1;
    const to = isLive ? trades.length : Math.min(start + JOURNAL_PAGE_SIZE, sortedDesc.length);

    const navBtn = (label: string, onClick: () => void, disabled: boolean) => (
      <button onClick={onClick} disabled={disabled} style={{
        padding: '6px 12px', minWidth: 38, fontSize: 11, fontWeight: 700,
        background: disabled ? T.bg.tertiary : `${T.accent.cyan}14`,
        border: `1px solid ${disabled ? T.border.subtle : T.accent.cyan}55`,
        borderRadius: T.radius.md, color: disabled ? T.text.dim : T.accent.cyan,
        cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: "'JetBrains Mono', monospace",
        transition: 'all .15s',
      }}>{label}</button>
    );

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 13, color: T.text.muted }}>
            {stats.totalTrades} {isRTL ? 'עסקאות' : 'trades'}
            {!isLive && stats.totalTrades > JOURNAL_PAGE_SIZE && (
              <span style={{ marginInlineStart: 8, fontSize: 10, color: T.text.dim, fontFamily: "'JetBrains Mono', monospace" }}>
                · {isRTL ? `${from}–${to} מתוך ${sortedDesc.length}` : `${from}–${to} of ${sortedDesc.length}`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isMobile && <button onClick={handleImport} style={{ padding: '7px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, fontSize: 11, cursor: 'pointer' }}>📥 {t.importData}</button>}
            {!isMobile && <button onClick={handleExport} style={{ padding: '7px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, fontSize: 11, cursor: 'pointer' }}>📊 XLSX</button>}
            {!isMobile && <button onClick={handleExportJson} style={{ padding: '7px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, fontSize: 11, cursor: 'pointer' }}>📤 JSON</button>}
            <button onClick={() => { setEditingTrade(null); setShowTradeForm(true); }} style={{ padding: '7px 18px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ {t.addTrade}</button>
          </div>
        </div>
        {/* Mode-specific journal header */}
        {isLive && <div style={{ padding: '8px 12px', background: `${modeColors.live}08`, border: `1px solid ${modeColors.live}20`, borderRadius: T.radius.md, marginBottom: 12, fontSize: 11, color: modeColors.live }}>🔴 {isRTL ? 'תצוגה חיה — עסקאות אחרונות בלבד' : 'Live View — Recent trades only'}</div>}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pageRows.map(tr => (
              <MobileTradeCard
                key={tr.id}
                T={T}
                isRTL={isRTL}
                trade={tr}
                effectiveR={getEffectiveR(tr)}
                privacyMode={settings.privacyMode}
                onOpen={() => setSelTrade(tr)}
                onEdit={() => { setEditingTrade(tr); setShowTradeForm(true); }}
                onDelete={() => handleDeleteTrade(tr.id)}
              />
            ))}
          </div>
        ) : (
        <GlassCard T={T} style={{ padding: 0, overflow: 'hidden' }} className="orca-no-hover">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: T.bg.tertiary }}>
                {[t.tradeNo, t.date, t.coin, t.direction, t.entry, t.stopLoss, t.exit, t.pnl, ...(opMode !== 'live' ? [t.result] : []), t.riskR, ...(isAlpha ? [t.deviation, t.leverage] : []), t.comments].map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', textAlign: isRTL ? 'right' : 'left', color: T.text.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border.medium}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {pageRows.map((tr, idx) => (
                  <tr key={tr.id} onClick={() => setSelTrade(tr)} style={{ cursor: 'pointer', background: idx % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{isLive ? (trades.length - idx) : (sortedDesc.length - (start + idx))}</td>

                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, whiteSpace: 'nowrap', fontSize: 11 }}>{new Date(tr.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: T.accent.cyan }}>{tr.coin}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}` }}><TradingBadge color={tr.direction === 'Long' ? T.accent.green : T.accent.red}>{tr.direction === 'Long' ? '↑' : '↓'} {tr.direction}</TradingBadge></td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.entry}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.accent.red }}>{tr.stopLoss == null ? '—' : tr.stopLoss}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.exit}</td>
                    {(() => { const h = tradeHeadline(tr); return (
                      <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: h.v >= 0 ? T.accent.green : T.accent.red }}><PV>{fmtHeadline(h.v, h.unit)}</PV></td>
                    ); })()}
                    {opMode !== 'live' && <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}` }}><TradingBadge color={tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}>{tr.winLoss}</TradingBadge></td>}
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{getEffectiveR(tr).toFixed(2)}R</td>
                    {isAlpha && <>
                      <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: tr.deviation > 0.1 ? T.accent.red : T.accent.green }}>{tr.deviation.toFixed(3)}R</td>
                      <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.leverage}x</td>
                    </>}
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.muted, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.comments || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
        )}
        {!isLive && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {navBtn('«', () => setJournalPage(0), safePage === 0)}
            {navBtn(isRTL ? '‹ קודם' : '‹ Prev', () => setJournalPage(p => Math.max(0, p - 1)), safePage === 0)}
            <span style={{ fontSize: 11, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace", padding: '0 10px' }}>
              {isRTL ? `עמוד ${safePage + 1} / ${totalPages}` : `Page ${safePage + 1} / ${totalPages}`}
            </span>
            {navBtn(isRTL ? 'הבא ›' : 'Next ›', () => setJournalPage(p => Math.min(totalPages - 1, p + 1)), safePage >= totalPages - 1)}
            {navBtn('»', () => setJournalPage(totalPages - 1), safePage >= totalPages - 1)}
          </div>
        )}
        {/* Trade detail modal */}
        {selTrade && (
          <TradeDetailModal
            T={T}
            t={t}
            trade={selTrade}
            isRTL={isRTL}
            isMobile={isMobile}
            onClose={() => setSelTrade(null)}
            onDelete={() => handleDeleteTrade(selTrade.id)}
            onEdit={() => { setEditingTrade(selTrade); setSelTrade(null); setShowTradeForm(true); }}
            tradeHeadline={tradeHeadline}
            fmtHeadline={fmtHeadline}
          />
        )}
      </>
    );
  };

  const renderCalendar = () => {
    if (trades.length === 0) return null;
    const calRiskStatus = checkRiskLimits(trades);
    return (
      <>
        <FeatureHint
          T={T}
          id="dashboard-calendar-hub"
          text={isRTL
            ? 'הלוח שנה הוא לב הדאשבורד — כל יום מציג רווח/הפסד, מספר עסקאות ומצב סיכון. לחיצה על יום פותחת ניתוח עסקאות מלא.'
            : 'The calendar is the heart of your dashboard — each day shows P&L, trade count, and risk status. Click a day to open the full trade breakdown.'}
        />
        {/* Monthly risk warning banner */}
        {calRiskStatus.monthlyBreached && (
          <div style={{ padding: '10px 16px', background: `${T.accent.red}15`, border: `2px solid ${T.accent.red}40`, borderRadius: T.radius.md, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.accent.red }}>{isRTL ? 'מגבלת הפסד חודשית הושגה' : 'Monthly Loss Limit Reached'}</div>
              <div style={{ fontSize: 10, color: T.text.muted }}>{isRTL ? `הפסד חודשי: ${calRiskStatus.monthlyNegR.toFixed(1)}R (מגבלה: ${DEFAULT_RISK_LIMITS.month}R)` : `Monthly loss: ${calRiskStatus.monthlyNegR.toFixed(1)}R (limit: ${DEFAULT_RISK_LIMITS.month}R)`}</div>
            </div>
          </div>
        )}
        {calRiskStatus.weeklyBreached && !calRiskStatus.monthlyBreached && (
          <div style={{ padding: '8px 14px', background: `${T.accent.orange}12`, border: `1px solid ${T.accent.orange}30`, borderRadius: T.radius.md, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div style={{ fontSize: 11, color: T.accent.orange }}>{isRTL ? `מגבלת הפסד שבועית הושגה: ${calRiskStatus.weeklyNegR.toFixed(1)}R` : `Weekly loss limit reached: ${calRiskStatus.weeklyNegR.toFixed(1)}R`}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: isMobile ? 12 : 18, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ flex: 3, minWidth: isMobile ? 0 : 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '5px 10px', color: T.text.secondary, cursor: 'pointer', fontSize: 16 }}>‹</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <select value={calYear} onChange={e => setCalYear(+e.target.value)} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, padding: '4px 8px', color: T.text.primary, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div style={{ fontSize: 17, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{t.month[calMonth]}</div>
              </div>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '5px 10px', color: T.text.secondary, cursor: 'pointer', fontSize: 16 }}>›</button>
            </div>
            <GlassCard T={T} style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 2 : 3, marginBottom: 6 }}>
                {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: isMobile ? 8 : 9, color: T.text.muted, fontWeight: 600, textTransform: 'uppercase', padding: '3px 0' }}>{d}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: isMobile ? 2 : 3 }}>
                {calDays.map((d, i) => {
                  const dd = d ? calDayPnl[d] : null;
                  const isHovered = d === calHoverDay;
                  const intensity = dd ? Math.min(1, Math.abs(dd.pnl) / (isR ? 5 : 10)) : 0;
                  const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
                  const isDarkRed = riskColor === 'darkred';
                  return (
                    <div key={i}
                      onMouseEnter={() => d && setCalHoverDay(d)}
                      onMouseLeave={() => setCalHoverDay(null)}
                      onClick={() => dd && d && setCalModalDay(d)}
                      style={{ minHeight: isMobile ? 48 : (isHovered && dd ? 95 : 68), borderRadius: T.radius.md, border: `1px solid ${isDarkRed ? `${T.accent.red}60` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(40 + intensity * 40).toString(16)}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(35 + intensity * 40).toString(16)}` : `${T.accent.orange}25`) : T.border.subtle}`, background: isDarkRed ? `${T.accent.red}20` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(10 + intensity * 20).toString(16).padStart(2, '0')}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(10 + intensity * 15).toString(16).padStart(2, '0')}` : `${T.accent.orange}10`) : 'transparent', padding: isMobile ? '3px 3px' : '5px 6px', transition: 'all 0.2s ease', cursor: dd ? 'pointer' : 'default', position: 'relative' }}>
                      {d && <><div style={{ fontSize: 10, color: T.text.muted, display: 'flex', alignItems: 'center', gap: 3 }}>{d}{isDarkRed && <span title="Risk limit exceeded">⚠️</span>}</div>{dd && <><PV><div style={{ fontSize: 13, fontWeight: 700, color: isDarkRed ? T.accent.red : dd.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>{isR ? `${dd.pnl >= 0 ? '+' : ''}${dd.pnl.toFixed(1)}R` : `$${Math.abs(dd.pnl).toFixed(0)}`}</div></PV><div style={{ fontSize: 8, color: T.text.muted, marginTop: 1 }}>{dd.trades} {isRTL ? 'עס׳' : 'tr'} • {dd.wins}/{dd.trades}</div>
                        {isHovered && <div style={{ fontSize: 8, color: T.text.muted, marginTop: 2 }}>{dd.details.map(det => det.coin).join(', ')}</div>}
                      </>}</>}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
            {/* Monthly EV Badge — follows the displayed month */}
            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <GlassCard T={T} style={{ flex: 1, padding: 12, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{t.monthlyEV}</div>
                  <span style={{ fontSize: 7, padding: '1px 3px', borderRadius: 3, background: `${T.accent.purple}15`, color: T.accent.purple, fontWeight: 700 }}>R</span>
                </div>
                <PV><div style={{ fontSize: 18, fontWeight: 700, color: monthStats.expectancyR >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{monthStats.expectancyR >= 0 ? '+' : ''}{monthStats.expectancyR.toFixed(3)}R</div></PV>
                <div style={{ fontSize: 8, color: T.text.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.month[calMonth]} {calYear}</div>
              </GlassCard>
              <GlassCard T={T} style={{ flex: 1, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase' }}>{t.streak}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: monthStats.streakType === 'Win' ? T.accent.green : monthStats.streakType === 'Loss' ? T.accent.red : T.text.muted, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{monthStats.streak} {monthStats.streakType === 'Win' ? '🟢' : monthStats.streakType === 'Loss' ? '🔴' : '—'}</div>
                <div style={{ fontSize: 8, color: T.text.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isRTL ? 'בחודש המוצג' : 'in displayed month'}</div>
              </GlassCard>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 190 }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              {t.weeklySummary} <span style={{ color: T.text.dim, fontWeight: 500 }}>· {t.month[calMonth]} {calYear}</span>
            </div>
            {weekStats.map((w, i) => (
              <GlassCard T={T} key={i} style={{ marginBottom: 7, padding: 12 }}>
                <div style={{ fontSize: 9, color: T.text.muted, marginBottom: 4 }}>{isRTL ? `שבוע ${w.week}` : `Week ${w.week}`}</div>
                <PV><div style={{ fontSize: 16, fontWeight: 700, color: w.pnl >= 0 ? T.accent.green : w.pnl < 0 ? T.accent.red : T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{w.pnl !== 0 ? (isR ? `${w.pnl >= 0 ? '+' : ''}${w.pnl.toFixed(2)}R` : `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)}`) : (isR ? '0.00R' : '$0.00')}</div></PV>
                <div style={{ fontSize: 9, color: T.text.muted, marginTop: 1 }}>{w.trades} {isRTL ? 'עסקאות' : 'trades'}</div>
              </GlassCard>
            ))}
            <div style={{ marginTop: 14, fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t.monthlyTotal} <span style={{ color: T.text.dim, fontWeight: 500 }}>· {t.month[calMonth]} {calYear}</span>
            </div>
            <GlassCard T={T} glow={T.accent.cyanGlow}>
              <PV><div style={{ fontSize: 22, fontWeight: 700, color: (isR ? monthStats.totalR : monthStats.totalPnl) >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{isR ? `${monthStats.totalR >= 0 ? '+' : ''}${monthStats.totalR.toFixed(2)}R` : `$${monthStats.totalPnl.toFixed(2)}`}</div></PV>
              <div style={{ fontSize: 9, color: T.text.muted, marginTop: 3 }}>{monthStats.count} {isRTL ? 'עסקאות' : 'trades'} • {monthStats.winRate.toFixed(0)}% WR</div>
            </GlassCard>
          </div>
        </div>
        {/* Calendar Day Modal */}
        {calModalDay && (
          <CalendarModal T={T} t={t} isRTL={isRTL} day={calModalDay} month={calMonth} year={calYear} trades={trades} onClose={() => setCalModalDay(null)} onGenerateInsight={handleGenerateInsights} onSetManualR={setManualR} />
        )}
      </>
    );
  };

  // Beginner upsell card — shown when a deep-analytics surface is locked.
  const BeginnerUpsell = ({ surface }: { surface: 'analytics' | 'risk' | 'psychology' }) => {
    const labels = {
      analytics: { he: 'אנליטיקה מתקדמת', en: 'Advanced Analytics' },
      risk: { he: 'פאנל סיכון מתקדם', en: 'Advanced Risk Panel' },
      psychology: { he: 'מעבדת פסיכולוגיה', en: 'Psychology Lab' },
    }[surface];
    return (
      <div style={{ maxWidth: 520, margin: '64px auto', padding: 28, borderRadius: T.radius.lg, background: `linear-gradient(135deg, ${T.bg.secondary}, ${T.bg.tertiary})`, border: `1px solid ${T.border.medium}`, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{isRTL ? labels.he : labels.en}</h3>
        <p style={{ fontSize: 12, color: T.text.muted, lineHeight: 1.6, marginBottom: 16 }}>
          {isRTL
            ? 'מצב מתחיל מציג רק את העיקר. עבור ל-Standard או Alpha כדי לפתוח ניתוחים מתקדמים.'
            : 'Beginner mode keeps it minimal. Switch to Standard or Alpha to unlock advanced analytics.'}
        </p>
        <div style={{ fontSize: 11, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>{isRTL ? 'הגדרות → מצב הפעלה' : 'Settings → Operating Mode'}</div>
      </div>
    );
  };

  const renderAnalytics = () => {
    if (trades.length === 0) return null;
    if (opMode === 'beginner') return <BeginnerUpsell surface="analytics" />;
    return (
      <LazyShell>
        <AdvancedAnalyticsPage
          T={T}
          isRTL={isRTL}
          isAlpha={isAlpha}
          operatingMode={opMode}
          trades={trades}
          stats={stats}
          privacyMode={settings.privacyMode}
          onExplainClick={handleExplainClick}
          registryCharts={analyticsCharts}
        />
      </LazyShell>
    );
  };


  const handleSaveRiskExplanation = (explanation: RiskExplanation) => {
    const updated = [...riskExplanations, explanation];
    setRiskExplanations(updated);
    void scopedStorage.setItem('orca-risk-explanations', JSON.stringify(updated));
    setShowRiskExplanation(null);
  };

  const renderRisk = () => {
    if (trades.length === 0) return null;
    if (opMode === 'beginner') return <BeginnerUpsell surface="risk" />;
    return (
      <LazyShell>
        <AdvancedRiskPage
          T={T}
          isRTL={isRTL}
          isAlpha={isAlpha}
          operatingMode={opMode}
          customLimits={customRiskLimits}
          trades={trades}
          stats={stats}
          riskData={riskData}
          onExplainClick={handleExplainClick}
          riskExplanations={riskExplanations}
          registryCharts={riskCharts}
        />
      </LazyShell>
    );
  };

  const renderPsychology = () => {
    if (trades.length === 0) return null;
    if (opMode === 'beginner') return <BeginnerUpsell surface="psychology" />;
    return (
      <LazyShell>
        <AdvancedPsychologyPage
          T={T}
          isRTL={isRTL}
          isAlpha={isAlpha}
          operatingMode={opMode}
          trades={trades}
          stats={stats}
          onExplainClick={handleExplainClick}
          registryCharts={psychologyCharts}
        />
      </LazyShell>
    );
  };

  const renderAI = () => <LazyShell><AIInsightsPage T={T} trades={trades} /></LazyShell>;


  // Portal pulse animation
  const portalCSS = `@keyframes portalPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } } @keyframes portalShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;

  if (activeDimension === 'journal') {
    return (
      <DimensionController
        activeDimension="journal"
        orcaUI={<div />}
        journalUI={<LazyShell><JournalDimension onReturn={() => setActiveDimension('orca')} isRTL={isRTL} orcaTrades={trades} onAddOrcaTrade={addTrade} onUpdateOrcaTrade={updateTrade} onUpsertJournalTrade={upsertJournalTrade} onRemoveOrcaTrade={removeTrade} /></LazyShell>}
      />
    );
  }

  if (activeDimension === 'backtest') {
    return (
      <DesktopOnlyGate
        onReturn={() => setActiveDimension('orca')}
        minWidth={1024}
        featureLabel={{ he: 'בקטסטינג', en: 'Backtesting' }}
      >
        <DimensionController
          activeDimension="backtest"
          orcaUI={<div />}
          journalUI={<div />}
          backtestUI={<LazyShell><BacktestDimension onReturn={() => setActiveDimension('orca')} /></LazyShell>}
        />
      </DesktopOnlyGate>
    );
  }

  return (
    <DisplayModeProvider trades={trades}>
    <div dir={isRTL ? 'rtl' : 'ltr'} className="orca-app-shell" style={{ display: 'flex', height: '100dvh', width: '100%', minWidth: 0, overflow: 'hidden', background: T.bg.primary, color: T.text.primary, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 14, transition: 'background 0.5s ease, color 0.5s ease, filter 0.5s ease, opacity 0.5s ease', opacity: exiting ? 0 : 1, filter: exiting ? 'blur(8px)' : 'none' }}>

      <style>{portalCSS}</style>
      {/* Exit animation overlay */}
      {exiting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(3,5,8,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#06d6a0', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.02em', opacity: 0.6 }}>ORCA</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 6, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{isRTL ? 'מתנתק...' : 'Disconnecting...'}</div>
          </div>
        </div>
      )}
      {/* ═══ MOBILE MENU — Wave 7 native-grade bottom sheet ═══
          Slides up from the bottom like iOS / Material You. Drag-handle,
          identity header, contextual controls, sectioned nav rows with
          leading icon + active pill + trailing chevron. Tapping a row
          navigates + closes; safe-area aware; backdrop blur + dismiss. */}
      {isMobile && sbOpen && (
        <div
          onClick={() => setSbOpen(false)}
          data-mobile-menu-overlay
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(2,6,15,0.62)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'mm-fade 0.22s ease-out',
          }}
        >
          <style>{`
            @keyframes mm-fade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes mm-rise {
              from { transform: translateY(100%); opacity: 0.4; }
              to   { transform: translateY(0);   opacity: 1;   }
            }
            .mm-row {
              position: relative; display: flex; align-items: center;
              gap: 14px; width: 100%; padding: 14px 16px;
              background: transparent; border: none; cursor: pointer;
              border-radius: 16px; text-align: ${isRTL ? 'right' : 'left'};
              transition: background 0.18s ease, transform 0.12s ease;
              -webkit-tap-highlight-color: transparent;
              min-height: 56px;
            }
            .mm-row:active { transform: scale(0.985); background: ${T.bg.tertiary || T.bg.secondary}; }
            .mm-row[data-active="true"] {
              background: linear-gradient(${isRTL ? '270deg' : '90deg'}, ${T.accent.cyan}1c, ${T.accent.cyan}08 80%, transparent);
              box-shadow: inset 0 0 0 1px ${T.accent.cyan}30;
            }
            .mm-icon {
              width: 36px; height: 36px; border-radius: 10px;
              display: inline-flex; align-items: center; justify-content: center;
              background: ${T.bg.tertiary || T.bg.secondary};
              border: 1px solid ${T.border.subtle};
              flex-shrink: 0; font-size: 18px;
              color: ${T.text.secondary};
            }
            .mm-row[data-active="true"] .mm-icon {
              background: linear-gradient(135deg, ${T.accent.cyan}28, ${T.accent.cyan}10);
              border-color: ${T.accent.cyan}55;
              color: ${T.accent.cyan};
              box-shadow: 0 0 16px -4px ${T.accent.cyan}66;
            }
            .mm-label { flex: 1; font-size: 15px; font-weight: 500; color: ${T.text.primary}; letter-spacing: 0.01em; min-width: 0; }
            .mm-row[data-active="true"] .mm-label { color: ${T.accent.cyan}; font-weight: 700; }
            .mm-chev { color: ${T.text.muted}; opacity: 0.55; flex-shrink: 0; transform: ${isRTL ? 'scaleX(-1)' : 'none'}; }
            .mm-section-label {
              font-size: 10px; font-weight: 700; letter-spacing: 0.18em;
              text-transform: uppercase; color: ${T.text.muted};
              padding: 18px 18px 8px;
            }
          `}</style>
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isRTL ? 'תפריט ראשי' : 'Main menu'}
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 20px)',
              background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
              borderTop: `1px solid ${T.border.medium}`,
              borderInline: `1px solid ${T.border.subtle}`,
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -24px 60px -10px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.04) inset',
              animation: 'mm-rise 0.36s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 44, height: 5, borderRadius: 999, background: T.border.medium, opacity: 0.7 }} />
            </div>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px 14px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent.cyan}22, ${T.accent.teal || T.accent.cyan}10)`, border: `1px solid ${T.accent.cyan}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px -4px ${T.accent.cyan}55` }}>
                  {Ico.orca}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>ORCA</div>
                  <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3 }}>Investment</div>
                </div>
              </div>
              <button
                onClick={() => setSbOpen(false)}
                aria-label={isRTL ? 'סגור תפריט' : 'Close menu'}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: T.bg.tertiary || T.bg.secondary,
                  border: `1px solid ${T.border.subtle}`,
                  color: T.text.secondary, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, lineHeight: 1,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ✕
              </button>
            </div>

            {/* Scroll area */}
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 12px 8px', overscrollBehavior: 'contain' }} data-modal-body>
              {/* Note: Active Portfolio, Expectancy Display and Operating Mode moved
                  to Settings → "Mobile Controls" (they rendered cramped here). */}


              {/* Nav */}
              <div className="mm-section-label">{isRTL ? 'ניווט' : 'Navigation'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {nav.map(item => {
                  const isWeekly = item.id === 'weekly-review';
                  const isActive = page === item.id;
                  const showBadge = isWeekly && showWeeklyReminder;
                  return (
                    <button
                      key={item.id}
                      className="mm-row"
                      data-active={isActive ? 'true' : 'false'}
                      onClick={() => { setPage(item.id); setSbOpen(false); if (isWeekly) dismissWeeklyReminder(); }}
                    >
                      <span className="mm-icon" style={isWeekly ? { color: '#FFD700', borderColor: '#FFD70044', background: 'rgba(255,215,0,0.08)' } : undefined}>
                        {typeof item.icon === 'string' ? <span>{item.icon}</span> : item.icon}
                        {showBadge && <ReminderBadge />}
                      </span>
                      <span className="mm-label" style={isWeekly && !isActive ? { color: '#FFD700' } : undefined}>{item.label}</span>
                      <svg className="mm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  );
                })}
              </div>

              {/* Dimensions */}
              <div className="mm-section-label">{isRTL ? 'מרחבים' : 'Dimensions'}</div>
              <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PortalButton onClick={() => { setSbOpen(false); setActiveDimension('journal'); }} isRTL={isRTL} expanded={true} />
                <BacktestPortalButton onClick={() => { setSbOpen(false); setActiveDimension('backtest'); }} isRTL={isRTL} expanded={true} />
              </div>

              {/* Package switcher — kept directly in the mobile menu so changing plan is not buried behind Settings. */}
              <div className="mm-section-label">{isRTL ? 'חבילה' : 'Package'}</div>
              <div style={{ padding: '0 4px 8px' }}>
                <ModeSwitch T={T} isRTL={isRTL} />
              </div>

              {/* Quick actions */}
              <div className="mm-section-label">{isRTL ? 'פעולות' : 'Actions'}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className="mm-row" onClick={() => { setSbOpen(false); setShowFeatureModal(true); }}>
                  <span className="mm-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  </span>
                  <span className="mm-label">{isRTL ? 'אודות המערכת' : 'About System'}</span>
                  <svg className="mm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button className="mm-row" onClick={() => { setSbOpen(false); goBugBoard(); }}>
                  <span className="mm-icon">📋</span>
                  <span className="mm-label">{isRTL ? 'לוח באגים' : 'Bug Board'}</span>
                  <svg className="mm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <button className="mm-row" onClick={() => { setSbOpen(false); openBugReport(); }}>
                  <span className="mm-icon" style={{ color: '#f5c542', borderColor: '#f5c54244', background: 'rgba(245,197,66,0.08)' }}>🐛</span>
                  <span className="mm-label" style={{ color: '#f5c542' }}>{isRTL ? 'דווח על באג' : 'Report Bug'}</span>
                  <svg className="mm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Settings — primary CTA */}
              <div style={{ padding: '16px 4px 8px' }}>
                <button
                  onClick={() => { setSbOpen(false); setShowSettings(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    padding: '14px 16px', minHeight: 56,
                    background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${T.accent.cyan}22, ${T.accent.cyan}0a)`,
                    border: `1px solid ${T.accent.cyan}55`,
                    borderRadius: 16,
                    color: T.accent.cyan, cursor: 'pointer',
                    fontSize: 15, fontWeight: 700,
                    boxShadow: `0 6px 22px -8px ${T.accent.cyan}66, inset 0 1px 0 rgba(255,255,255,0.04)`,
                    textAlign: isRTL ? 'right' : 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span className="mm-icon" style={{ color: T.accent.cyan, borderColor: `${T.accent.cyan}55`, background: `${T.accent.cyan}18` }}>⚙</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', lineHeight: 1.2 }}>{isRTL ? 'הגדרות' : 'Settings'}</span>
                    <span style={{ display: 'block', fontSize: 10, color: T.text.muted, fontWeight: 400, marginTop: 3, letterSpacing: '0.04em' }}>
                      {isRTL ? 'נושא · שפה · פרטיות · יציאה' : 'Theme · Lang · Privacy · Logout'}
                    </span>
                  </span>
                  <svg className="mm-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* DESKTOP SIDEBAR — fixed overlay; in-flow spacer keeps main content stable */}
      {!isMobile && <div aria-hidden style={{ width: 62, flexShrink: 0 }} />}
      {!isMobile && sbOpen && (
        <div
          onClick={() => setSbOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,15,0.45)', backdropFilter: 'blur(2px)', zIndex: 49, animation: 'fadeIn 0.18s ease-out' }}
        />
      )}
      {!isMobile && (
      <aside data-app-sidebar style={{
        position: 'fixed', top: 0, bottom: 0, insetInlineStart: 0,
        width: sbOpen ? 216 : 62,
        background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
        borderInlineEnd: `1px solid ${T.border.subtle}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.18s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', zIndex: 50,
        willChange: 'width',
      }}>
        <div style={{ padding: '18px 14px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => setShowFeatureModal(true)}>
            {Ico.orca}
            {sbOpen && <div><div style={{ fontSize: 16, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>ORCA</div><div style={{ fontSize: 8, color: T.text.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Investment</div></div>}
          </div>
          {sbOpen && <button onClick={() => setSbOpen(false)} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: T.text.muted, cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1, transition: 'color 0.2s' }}>‹</button>}
        </div>
        {!sbOpen && <button onClick={() => setSbOpen(true)} style={{ background: 'none', border: 'none', color: T.text.muted, cursor: 'pointer', fontSize: 14, padding: '6px 0', lineHeight: 1, transition: 'color 0.2s' }}>›</button>}
        
        <nav style={{ flex: 1, padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {nav.map(item => {
            const isWeekly = item.id === 'weekly-review';
            const activeColor = isWeekly ? '#FFD700' : T.accent.cyan;
            const showBadge = isWeekly && showWeeklyReminder;
            return (
            <button key={item.id} onClick={() => { if (item.action) { item.action(); return; } setPage(item.id); if (isWeekly) dismissWeeklyReminder(); }}
              onMouseEnter={e => {
                if (page === item.id) return;
                e.currentTarget.style.background = `linear-gradient(110deg, transparent 0%, ${activeColor}18 50%, transparent 100%)`;
                e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${activeColor}30, 0 0 22px -6px ${activeColor}55`;
                e.currentTarget.style.color = activeColor;
              }}
              onMouseLeave={e => {
                if (page === item.id) return;
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.color = isWeekly ? '#FFD700' : T.text.secondary;
              }}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: sbOpen ? '9px 10px' : '9px 0', justifyContent: sbOpen ? 'flex-start' : 'center', background: page === item.id ? `linear-gradient(110deg, transparent 0%, ${activeColor}22 50%, transparent 100%)` : 'transparent', color: page === item.id ? activeColor : (isWeekly ? '#FFD700' : T.text.secondary), border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: page === item.id ? 600 : (isWeekly ? 600 : 400), transition: 'background 0.25s ease, box-shadow 0.25s ease, color 0.2s ease', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: page === item.id ? `2px solid ${activeColor}` : '2px solid transparent', boxShadow: page === item.id ? `inset 0 0 0 1px ${activeColor}25, 0 0 18px -8px ${activeColor}66` : 'none' }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                {typeof item.icon === 'string' ? <span style={{ fontSize: 18 }}>{item.icon}</span> : item.icon}
                {showBadge && <ReminderBadge />}
              </span>
              {sbOpen && <span>{item.label}</span>}
            </button>
            );
          })}
          <button onClick={goBugBoard} title={isRTL ? 'לוח באגים' : 'Bug Board'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sbOpen ? '9px 10px' : '9px 0', justifyContent: sbOpen ? 'flex-start' : 'center', background: 'transparent', color: T.text.muted, border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: 400, transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: '2px solid transparent' }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>📋</span>
            {sbOpen && <span>{isRTL ? 'לוח באגים' : 'Bug Board'}</span>}
          </button>
          <button onClick={openBugReport} title={isRTL ? 'דווח על באג' : 'Report Bug'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sbOpen ? '9px 10px' : '9px 0', justifyContent: sbOpen ? 'flex-start' : 'center', background: 'transparent', color: '#f5c542', border: `1px solid #f5c54226`, borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left' }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>🐛</span>
            {sbOpen && <span>{isRTL ? 'דווח על באג' : 'Report Bug'}</span>}
          </button>
        </nav>
        {/* Dimension Portal Buttons — visible in both expanded and collapsed sidebar */}
        <div style={{ padding: '4px 6px' }}><PortalButton onClick={() => setActiveDimension('journal')} isRTL={isRTL} expanded={sbOpen} /></div>
        <div style={{ padding: '4px 6px' }}><BacktestPortalButton onClick={() => setActiveDimension('backtest')} isRTL={isRTL} expanded={sbOpen} /></div>
        {/* Trader Mind — behavioral diagnostic (replaces legacy Oracle slot) */}
        {sbOpen && (
          <div style={{ padding: '4px 6px' }}>
            <button
              onClick={() => setShowTraderMind(true)}
              title={isRTL ? 'תודעת הסוחר — אבחון התנהגותי' : 'Trader Mind — behavioral diagnostic'}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 0 26px -6px ${T.accent.purple ?? T.accent.cyan}cc, inset 0 0 0 1px ${T.accent.purple ?? T.accent.cyan}66`;
                e.currentTarget.style.background = `linear-gradient(135deg, ${T.accent.purple ?? T.accent.cyan}22, ${T.accent.cyan}18)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = `linear-gradient(135deg, ${T.accent.purple ?? T.accent.cyan}15, transparent)`;
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', background: `linear-gradient(135deg, ${T.accent.purple ?? T.accent.cyan}15, transparent)`, border: `1px solid ${T.accent.purple ?? T.accent.cyan}40`, borderRadius: T.radius.md, color: T.accent.purple ?? T.accent.cyan, cursor: 'pointer', fontSize: 12, fontWeight: 700, letterSpacing: 0.3, transition: 'all 0.25s ease' }}
            >
              <span style={{ fontSize: 15, filter: `drop-shadow(0 0 6px ${T.accent.purple ?? T.accent.cyan}aa)` }}>◈</span>
              <span>{isRTL ? 'תודעת הסוחר' : 'Trader Mind'}</span>
              {tmCalibrated ? (
                <span style={{ marginInlineStart: 'auto', fontSize: 8, color: T.accent.cyan, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {tmArchetype?.slice(0, 18) ?? (isRTL ? 'הושלם' : 'Complete')}
                </span>
              ) : (
                <span style={{ marginInlineStart: 'auto', fontSize: 8, color: '#fbbf24', fontWeight: 700, letterSpacing: 0.5 }}>
                  ⚠ {isRTL ? 'לא הושלם' : 'Pending'}
                </span>
              )}
            </button>
          </div>
        )}
        {!sbOpen && (
          <div style={{ padding: '4px 6px', display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <button
              onClick={() => setShowTraderMind(true)}
              title="Trader Mind"
              style={{ background: 'transparent', border: 'none', color: T.accent.purple ?? T.accent.cyan, cursor: 'pointer', fontSize: 16, position: 'relative' }}
            >
              ◈
              {!tmCalibrated && (
                <span style={{ position: 'absolute', top: -2, right: -4, width: 6, height: 6, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24aa' }} />
              )}
            </button>
          </div>
        )}
        {/* InstallPrompt removed from sidebar — install lives in Settings now */}
        <div style={{ padding: 10, borderTop: `1px solid ${T.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sbOpen && <button onClick={() => setShowSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', background: `${T.accent.cyan}10`, border: `1px solid ${T.accent.cyan}30`, borderRadius: T.radius.md, color: T.accent.cyan, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <span style={{ fontSize: 14 }}>⚙️</span>
            <span>{isRTL ? 'הגדרות' : 'Settings'}</span>
            <span style={{ marginInlineStart: 'auto', fontSize: 8, color: T.text.muted, fontWeight: 400, opacity: 0.75 }}>
              {isRTL ? 'נושא · שפה · פרטיות' : 'Theme · Lang · Privacy'}
            </span>
          </button>}
          {!sbOpen && <button onClick={() => setShowSettings(true)} title={isRTL ? 'הגדרות' : 'Settings'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '9px 0', background: 'transparent', border: 'none', borderRadius: T.radius.md, color: T.accent.cyan, cursor: 'pointer', fontSize: 18 }}>
            ⚙️
          </button>}
        </div>
      </aside>
      )}

      {/* MAIN */}
      <MainPullToRefresh isMobile={isMobile} accent={T.accent.cyan}>
        {/* Mobile: bottom-nav handles everything, so the top header is hidden entirely. */}
        {!isMobile && (
          <HeaderBar
            T={T}
            isRTL={isRTL}
            pageLabel={nav.find(n => n.id === page)?.label ?? ''}
            startSlot={
              <>
                <PortfolioSwitcher isRTL={isRTL} compact />
                {settings.privacyMode && <TradingBadge color={T.accent.orange}>🔒</TradingBadge>}
              </>
            }
            onImport={() => {
              const cmd = commands.find(c => c.id === 'import');
              if (cmd) cmd.action();
              else setShowCmdPalette(true);
            }}
            showAddTrade={!uiPrefs.hideAddTradeButton}
            addTradeLabel={t.addTrade}
            onAddTrade={() => { setEditingTrade(null); setShowTradeForm(true); }}
            showQuickActions={!uiPrefs.hideQuickActions}
            onOpenPalette={() => setShowCmdPalette(true)}
            hiddenChartsCount={hiddenCharts.length}
            onRestoreCharts={handleRestoreCharts}
          />
        )}

        <div className={isMobile ? 'orca-mobile-pad-bottom' : ''} style={{ padding: isMobile ? '12px 10px' : '20px 24px', maxWidth: 1400, width: '100%', minWidth: 0, boxSizing: 'border-box', overflowX: 'hidden', margin: '0 auto' }}>
          {trades.length === 0 && page !== 'weekly-review' && (
            <EmptyStateImportCTA
              T={T}
              isRTL={isRTL}
              onImportFile={handleImport}
              onConnectAPI={() => {
                setShowSettings(true);
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('orca:settings:open-tab', { detail: 'exchanges' }));
                }, 30);
              }}
              onManualTrade={() => { setEditingTrade(null); setShowTradeForm(true); }}
            />
          )}
          {page === 'dashboard' && <div data-orca-dashboard="true">{trades.length > 0 && <CustomKPIPanel T={T} isRTL={isRTL} stats={stats as any} />}{renderDashboard()}</div>}
          {page === 'calendar' && (
            <LazyShell><CalendarHubPage T={T} isRTL={isRTL} t={t} trades={trades} isMobile={isMobile} onGenerateInsight={handleGenerateInsights} onSetManualR={setManualR} /></LazyShell>
          )}
          {page === 'journal' && renderJournal()}
          {page === 'analytics' && renderAnalytics()}
          {page === 'risk' && renderRisk()}
          {page === 'psychology' && renderPsychology()}
          {page === 'ai' && renderAI()}
          {page === 'economic-radar' && (
            <Suspense fallback={null}>
              <EconomicCalendarPage onClose={() => setPage('dashboard')} T={T} />
            </Suspense>
          )}
          {page === 'weekly-review' && (
            <LazyShell><WeeklyReviewPage T={T} isRTL={isRTL} trades={trades} themeId={settings.theme} stats={stats} riskData={riskData} /></LazyShell>
          )}
        </div>
      </MainPullToRefresh>

      {/* OVERLAYS */}
      {showTradeForm && <TradeForm T={T} t={t} isRTL={isRTL} trade={editingTrade} currentBalance={currentBalance} trades={trades} onSave={handleSaveTrade} onClose={() => { setShowTradeForm(false); setEditingTrade(null); }} />}
      {showReset && <ResetModal T={T} t={t} isRTL={isRTL} onConfirm={handleReset} onClose={() => setShowReset(false)} />}
      {showSettings && <SettingsHub T={T} isRTL={isRTL} open={showSettings} onClose={() => setShowSettings(false)} theme={settings.theme} setTheme={settings.setTheme} stats={stats} lang={settings.lang} setLang={settings.setLang} privacyMode={settings.privacyMode} setPrivacyMode={settings.setPrivacyMode} trades={trades} />}
      <TraderMindSession open={showTraderMind} onClose={() => setShowTraderMind(false)} lang={settings.lang} />
      
      
      {/* Screen Lock removed in Phase 1 architectural cleanup */}
      {riskAlert && <RiskLimitAlert T={T} isRTL={isRTL} status={riskAlert} onClose={dismissRiskAlert} />}
      {showRiskExplanation && <RiskExplanationModal T={T} isRTL={isRTL} tradeId={showRiskExplanation.tradeId} riskChange={showRiskExplanation.riskChange} onSave={handleSaveRiskExplanation} onClose={() => setShowRiskExplanation(null)} />}
      {showFeatureModal && <FeatureManifestModal T={T} isRTL={isRTL} onClose={() => setShowFeatureModal(false)} />}
      {/* Economic Calendar is rendered inline as a normal page (see page === 'economic-radar' above) */}
      <CommandPalette T={T} commands={commands} isOpen={showCmdPalette} onClose={() => setShowCmdPalette(false)} />
      {/* Import Warning Modal — with format guide + template link */}
      {showImportWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }} onClick={() => setShowImportWarning(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
            border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
            padding: 28, maxWidth: 460, width: '92%',
            boxShadow: T.shadow.elevated, animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: '90vh', overflowY: 'auto', direction: isRTL ? 'rtl' : 'ltr',
          }}>
            {/* Hero badge */}
            <div style={{
              width: 64, height: 64, margin: '0 auto 14px',
              borderRadius: 20, display: 'grid', placeItems: 'center',
              background: `linear-gradient(135deg, ${T.accent.cyan}22, ${T.accent.teal}12)`,
              border: `1px solid ${T.accent.cyan}55`,
              fontSize: 30,
            }}>🧠</div>

            <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, textAlign: 'center', marginBottom: 6, letterSpacing: '0.2px' }}>
              {isRTL ? 'ייבוא חכם — מנוע אוניברסלי' : 'Smart Import — Universal Engine'}
            </div>
            <div style={{ fontSize: 12, color: T.text.secondary, textAlign: 'center', marginBottom: 20, lineHeight: 1.55 }}>
              {isRTL
                ? 'העלה כל קובץ מסחר — XLSX · XLS · CSV · JSON. המנוע מזהה עמודות, פורמט תאריך ושפה אוטומטית. אין צורך בתבנית קבועה.'
                : 'Drop any trading file — XLSX · XLS · CSV · JSON. The engine auto-detects columns, date format and language. No fixed template needed.'}
            </div>

            {/* Feature chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {[
                { icon: '🎯', label: isRTL ? 'זיהוי עמודות אוטומטי' : 'Auto column mapping' },
                { icon: '📅', label: isRTL ? 'כל פורמט תאריך' : 'Any date format' },
                { icon: '🌐', label: isRTL ? 'עברית + אנגלית' : 'Hebrew + English' },
                { icon: '🛡️', label: isRTL ? 'ולידציה חכמה' : 'Smart validation' },
              ].map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 11px',
                  background: T.bg.tertiary,
                  border: `1px solid ${T.border.subtle}`,
                  borderRadius: T.radius.md,
                  fontSize: 11.5, color: T.text.secondary, fontWeight: 500,
                }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>

            {/* Optional template link — subtle, secondary */}
            <a href="https://docs.google.com/spreadsheets/d/1zI12IMRFsBRaZaxS-51CIYsg9vezB1K7U2enIzAaops/copy"
               target="_blank" rel="noopener noreferrer"
               style={{
                 display: 'block', textAlign: 'center', padding: '8px 12px',
                 marginBottom: 18, fontSize: 11, color: T.text.muted,
                 textDecoration: 'none', borderRadius: T.radius.md,
                 border: `1px dashed ${T.border.subtle}`,
               }}>
              {isRTL ? 'אין לך קובץ מוכן? הורד תבנית לדוגמה ↗' : 'No file ready? Grab a sample template ↗'}
            </a>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowImportWarning(false)} style={{ padding: '10px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {isRTL ? 'ביטול' : 'Cancel'}
              </button>
              <button onClick={handleImportConfirmed} style={{ padding: '10px 24px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 800, cursor: 'pointer', fontSize: 12, letterSpacing: '0.3px', boxShadow: `0 4px 14px ${T.accent.cyan}40` }}>
                {isRTL ? '📂 בחר קובץ' : '📂 Choose File'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Loading Overlay — cinematic trading-floor animation */}
      {importLoading && (
        <ImportLoadingOverlay
          isRTL={isRTL}
          fileName={importFileName}
          imported={importedCount}
          phase={importPhase}
        />
      )}
      {/* Chart Explanation Modal */}
      {explainModal && (
        <ChartExplanationModal
          T={T}
          isRTL={isRTL}
          title={explainModal.title}
          explanation={explainModal.explanation}
          chartId={explainModal.chartId}
          onRemove={handleHideChart}
          onClose={() => setExplainModal(null)}
        />
      )}
      {/* Floating system update notification (bottom-right) */}
      <DeploymentToast isRTL={isRTL} />
      {showRiskOnboarding && (
        <RiskOnboardingWizard isRTL={isRTL} onDismiss={() => setShowRiskOnboarding(false)} />
      )}
      {/* MOBILE BOTTOM NAVIGATION — thumb-reachable, persistent */}
      {isMobile && activeDimension === 'orca' && (
        <MobileBottomNav
          T={T}
          isRTL={isRTL}
          page={page}
          onNavigate={(id) => { setPage(id); }}
          onOpenRadar={() => setPage('economic-radar')}
          onOpenMore={() => setSbOpen(true)}
          onAddTrade={() => { setEditingTrade(null); setShowTradeForm(true); }}
          onLongPressCenter={() => setShowCmdPalette(true)}
        />
      )}
      
    </div>
    </DisplayModeProvider>
  );
};

export default Index;
