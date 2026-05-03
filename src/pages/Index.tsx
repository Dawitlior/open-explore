import { useState, useMemo, useCallback, useEffect } from 'react';
import { OnboardingWizard, shouldShowOnboarding } from '@/components/trading/OnboardingWizard';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter, ZAxis, ReferenceLine } from 'recharts';
import type { Trade } from '@/data/trades';
import { useIsMobile } from '@/hooks/use-mobile';

import { computeAnalytics, getCalDays } from '@/lib/trading-analytics';
import { i18n } from '@/lib/trading-i18n';
import { getTheme, ttStyle, modeColors, type TradingTheme } from '@/lib/trading-theme';
import { GlassCard, MetricCard, ScoreGauge, TradingBadge, Ico } from '@/components/trading/TradingUI';
import { ChartWrapper, EXPLANATIONS, type ChartExplanation } from '@/components/trading/ChartWrapper';
import { ChartExplanationModal } from '@/components/trading/ChartExplanationModal';
import { CalendarModal } from '@/components/trading/CalendarModal';
import { FeatureManifestModal } from '@/components/trading/FeatureManifestModal';
import { CommandPalette } from '@/components/trading/CommandPalette';
import { ModeSwitch } from '@/components/trading/ModeSwitch';
import { PrivacyMask, usePrivacyShortcut } from '@/components/trading/PrivacyMask';
import { TradeForm } from '@/components/trading/TradeForm';
import { ResetModal } from '@/components/trading/ResetModal';
import { SettingsHub } from '@/components/trading/SettingsHub';
import ImportLoadingOverlay from '@/components/trading/ImportLoadingOverlay';
import { EntryGate } from '@/components/trading/EntryGate';
import { RiskLimitAlert } from '@/components/trading/RiskLimitAlert';
import { RiskExplanationModal, type RiskExplanation } from '@/components/trading/RiskExplanationModal';
import { AdvancedRiskPage } from '@/components/trading/AdvancedRiskPage';
import { AdvancedAnalyticsPage } from '@/components/trading/AdvancedAnalyticsPage';
import { AdvancedPsychologyPage } from '@/components/trading/AdvancedPsychologyPage';
import { AIInsightsPage } from '@/components/trading/AIInsightsPage';
import { WeeklyReviewPage } from '@/components/trading/WeeklyReviewPage';
import { InstallPrompt } from '@/components/trading/InstallPrompt';
import { DimensionController, PortalButton, BacktestPortalButton } from '@/components/trading/DimensionController';
import { JournalDimension } from '@/components/trading/JournalDimension';
import { BacktestDimension } from '@/components/trading/BacktestDimension';
import { useTrades } from '@/hooks/use-trades';
import { useSettings, type ThemeId } from '@/hooks/use-settings';
import { assessRisk } from '@/lib/risk-engine';
import { generateInsights, generateSummary } from '@/lib/ai-engine';
import { exportToXlsx, importFromXlsx } from '@/lib/xlsx-engine';
import { getDayRiskColor, checkRiskLimits, DEFAULT_RISK_LIMITS } from '@/lib/risk-limits';
import { useRiskLimits } from '@/hooks/use-risk-limits';

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
  const settings = useSettings();
  const { trades, stats, loading, initialized, addTrade, updateTrade, removeTrade, resetAll, importTrades, riskAlert, dismissRiskAlert } = useTrades();
  const { limits: customRiskLimits } = useRiskLimits();
  const [entered, setEntered] = useState(() => sessionStorage.getItem('orca-entered') === '1');
  const [onboardingDone, setOnboardingDone] = useState(() => !shouldShowOnboarding());
  const [activeDimension, setActiveDimension] = useState<'orca' | 'journal' | 'backtest'>('orca');
  const T = getTheme(settings.theme);
  const t = i18n[settings.lang];
  const isRTL = settings.isRTL;
  const isAlpha = settings.isAlpha;
  const opMode = settings.operatingMode;

  const [page, setPage] = useState('dashboard');
  const [sbOpen, setSbOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selTrade, setSelTrade] = useState<Trade | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiInsights, setAiInsights] = useState<ReturnType<typeof generateInsights>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [calHoverDay, setCalHoverDay] = useState<number | null>(null);
  const [calModalDay, setCalModalDay] = useState<number | null>(null);
  const [showCmdPalette, setShowCmdPalette] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [hiddenCharts, setHiddenCharts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('orca-hidden-charts') || '[]'); } catch { return []; }
  });
  const [showImportWarning, setShowImportWarning] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importedCount, setImportedCount] = useState(0);
  const [importPhase, setImportPhase] = useState<'reading' | 'parsing' | 'validating' | 'saving' | 'done'>('reading');
  const [explainModal, setExplainModal] = useState<{ title: string; explanation: ChartExplanation; chartId?: string } | null>(null);
  const [riskExplanations, setRiskExplanations] = useState<RiskExplanation[]>(() => {
    try { return JSON.parse(localStorage.getItem('orca-risk-explanations') || '[]'); } catch { return []; }
  });
  const [showRiskExplanation, setShowRiskExplanation] = useState<{ tradeId: number; riskChange: string } | null>(null);


  const handleExplainClick = useCallback((title: string, explanation: ChartExplanation, chartId?: string) => {
    setExplainModal({ title, explanation, chartId });
  }, []);
  const handleHideChart = useCallback((chartId: string) => {
    setHiddenCharts(prev => {
      const next = [...prev, chartId];
      localStorage.setItem('orca-hidden-charts', JSON.stringify(next));
      return next;
    });
  }, []);
  const handleRestoreCharts = useCallback(() => {
    setHiddenCharts([]);
    localStorage.removeItem('orca-hidden-charts');
  }, []);
  const isChartVisible = useCallback((chartId: string) => !hiddenCharts.includes(chartId), [hiddenCharts]);

  const riskData = useMemo(() => assessRisk(trades), [trades]);
  const currentBalance = trades.length > 0 ? trades[trades.length - 1].balance : 0;

  // Privacy mode shortcut
  usePrivacyShortcut(() => settings.setPrivacyMode(!settings.privacyMode));

  // Command-K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCmdPalette(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
        m[day].pnl += tr.pnl;
        m[day].trades++;
        if (tr.winLoss === 'Win') m[day].wins++;
        m[day].details.push(tr);
      }
    });
    return m;
  }, [calMonth, calYear, trades]);
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
    const totalR = monthTrades.reduce((s, tr) => s + tr.returnR, 0);
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
    { m: isRTL ? 'רווח' : 'Profit', v: Math.min(100, stats.profitFactor * 40) },
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

  const handleDeleteTrade = useCallback(async (id: number) => { await removeTrade(id); setSelTrade(null); }, [removeTrade]);
  const handleReset = useCallback(async () => {
    console.log('[Reset] Starting full system wipe…');
    try {
      // 1. Clear Orca trades + settings via hook
      await resetAll();
      console.log('[Reset] Orca DB cleared');

      // 2. Wipe Journal IndexedDB (apex-journal-os)
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('apex-journal-os');
        req.onsuccess = () => { console.log('[Reset] Journal DB cleared'); resolve(); };
        req.onerror = () => { console.warn('[Reset] Journal DB delete error (continuing)'); resolve(); };
        req.onblocked = () => { console.warn('[Reset] Journal DB delete blocked (continuing)'); resolve(); };
        // Safety timeout — never hang
        setTimeout(() => resolve(), 1500);
      });

      // 3. Wipe relevant localStorage / sessionStorage keys
      try {
        const keysToWipe = [
          'orca-hidden-charts', 'orca-risk-explanations', 'orca-onboarding-done',
          'orca-onboarding-data', 'orca-user-name', 'orca-trader-level',
        ];
        keysToWipe.forEach(k => localStorage.removeItem(k));
        sessionStorage.removeItem('orca-entered');
      } catch { /* ignore */ }

      // 4. Reset local UI state
      setHiddenCharts([]);
      setRiskExplanations([]);
      sessionStorage.setItem('orca-seeded', '1');
      setPage('dashboard');
      console.log('[Reset] Complete');
    } catch (err) {
      console.error('[Reset] Failed:', err);
      throw err;
    }
  }, [resetAll]);
  const handleExport = useCallback(() => {
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
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
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
          setImportPhase('parsing');
          console.log('[XLSX Import] Starting import of file:', file.name, 'size:', file.size);
          const result = await importFromXlsx(file);
          console.log('[XLSX Import] Result:', { imported: result.imported, skipped: result.skipped, errors: result.errors });
          if (result.errors.length > 0) console.warn('Import warnings:', result.errors);
          setImportedCount(result.trades.length);
          setImportPhase('validating');
          await new Promise(r => setTimeout(r, 350));
          if (result.trades.length > 0) {
            setImportPhase('saving');
            await importTrades(result.trades);
            console.log('[XLSX Import] Successfully imported', result.trades.length, 'trades');
          } else {
            const errMsg = result.errors.length > 0 ? result.errors.join('; ') : 'No valid trades found in file';
            console.error('[XLSX Import] No trades imported:', errMsg);
            alert(isRTL ? `ייבוא נכשל: ${errMsg}` : `Import failed: ${errMsg}`);
          }
        }
        setImportPhase('done');
        await new Promise(r => setTimeout(r, 700));
        sessionStorage.setItem('orca-seeded', '1');
      } catch (err) {
        console.error('[XLSX Import] Error:', err);
        alert(isRTL ? `שגיאת ייבוא: ${err instanceof Error ? err.message : 'Unknown error'}` : `Import error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      finally { setImportLoading(false); }
    };
    input.click();
  }, [importTrades, isRTL]);
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
    ...(['dashboard', 'journal', 'analytics', 'risk', 'psychology', 'ai'] as const).map(p => ({
      id: `nav-${p}`, label: `Go to ${p.charAt(0).toUpperCase() + p.slice(1)}`, icon: '📄', category: isRTL ? 'ניווט' : 'Navigation', action: () => setPage(p)
    })),
    { id: 'feature-info', label: isRTL ? 'אודות המערכת' : 'About Orca System', icon: 'ℹ️', category: isRTL ? 'מערכת' : 'System', action: () => setShowFeatureModal(true) },
    { id: 'beginner', label: isRTL ? 'מצב מתחיל' : 'Switch to Beginner Mode', icon: '🎓', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('beginner') },
    { id: 'live', label: isRTL ? 'מצב חי' : 'Switch to Live Mode', icon: '🔴', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('live') },
    { id: 'review', label: isRTL ? 'מצב סקירה' : 'Switch to Review Mode', icon: '🔵', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('review') },
    { id: 'research', label: isRTL ? 'מצב מחקר' : 'Switch to Research Mode', icon: '🟣', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('research') },
    { id: 'alpha', label: isRTL ? 'הפעל Alpha' : 'Toggle Alpha Mode', icon: '⚡', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setSystemMode(isAlpha ? 'standard' : 'alpha') },
    { id: 'journal-sanctuary', label: isRTL ? 'יומן מסע לסוחר' : 'Trader Journey', icon: '🏛️', category: isRTL ? 'ממדים' : 'Dimensions', action: () => setActiveDimension('journal') },
    { id: 'backtest-journal', label: isRTL ? 'יומן באק-טסט' : 'Backtest Journal', icon: '📊', category: isRTL ? 'ממדים' : 'Dimensions', action: () => setActiveDimension('backtest') },
  ], [isRTL, handleExport, handleImport, handleGenerateInsights, isAlpha, settings]);

  // ─── Weekly Review reminder badge (Friday or 1st of month) ───
  const [reviewReminderTick, setReviewReminderTick] = useState(0);
  useEffect(() => {
    // Re-evaluate every 5 min so the badge appears/disappears on date roll-over
    const id = window.setInterval(() => setReviewReminderTick(t => t + 1), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const showWeeklyReminder = useMemo(() => {
    void reviewReminderTick;
    const now = new Date();
    const isFri = now.getDay() === 5;
    const isFirst = now.getDate() === 1;
    if (!isFri && !isFirst) return false;
    // Dismissal key: per-day so it re-appears each Friday / each 1st-of-month
    const key = `orca-weekly-reminder-dismissed-${now.toISOString().slice(0, 10)}`;
    try { if (localStorage.getItem(key) === '1') return false; } catch { /* noop */ }
    return true;
  }, [reviewReminderTick, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const dismissWeeklyReminder = useCallback(() => {
    const key = `orca-weekly-reminder-dismissed-${new Date().toISOString().slice(0, 10)}`;
    try { localStorage.setItem(key, '1'); } catch { /* noop */ }
    setReviewReminderTick(t => t + 1);
  }, []);

  const nav = [
    { id: 'dashboard', icon: Ico.dash, label: isRTL ? 'דשבורד' : 'Dashboard' },
    { id: 'journal', icon: Ico.book, label: t.journal },
    { id: 'analytics', icon: Ico.bar, label: isRTL ? 'אנליטיקה' : 'Analytics' },
    { id: 'risk', icon: Ico.shield, label: t.risk },
    { id: 'psychology', icon: Ico.brain, label: t.psychology },
    { id: 'ai', icon: Ico.star, label: t.ai },
    { id: 'weekly-review', icon: '📋', label: isRTL ? 'סקירה שבועית' : 'Weekly Review', color: '#FFD700' },
  ];

  // Entry gate check (after all hooks)
  if (!entered) {
    return <EntryGate onEnter={() => setEntered(true)} lang={settings.lang} />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg.primary, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", fontSize: 16 }}>
        {Ico.orca}<span style={{ marginInlineStart: 12 }}>Loading Orca...</span>
      </div>
    );
  }

  // Privacy wrapper
  const PV = ({ children, type = 'dollar' }: { children: React.ReactNode; type?: 'dollar' | 'percent' | 'number' }) => (
    <PrivacyMask enabled={settings.privacyMode} type={type}>{children}</PrivacyMask>
  );

  // ═══════════════════════════════════════════════════
  // RENDER PAGES WITH MODE AWARENESS
  // ═══════════════════════════════════════════════════

  const renderDashboard = () => {
    if (trades.length === 0) return null;

    // BEGINNER MODE: simplified, friendly
    if (opMode === 'beginner') return (
      <>
        <h2 style={{ fontSize: 22, fontWeight: 300, color: T.text.secondary, margin: '0 0 20px', fontFamily: "'JetBrains Mono', monospace" }}>
          {isRTL ? '🎓 מצב מתחיל — ברוך הבא!' : '🎓 Beginner Mode — Welcome!'}
        </h2>
        {/* Core metrics only */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <MetricCard T={T} label={t.netPnl} value={stats.totalPnl} color={stats.totalPnl >= 0 ? T.accent.cyan : T.accent.red} onInfoClick={() => handleExplainClick(t.netPnl, EXPLANATIONS.netPnl)} />
          <MetricCard T={T} label={t.winRate} value={stats.winRate} suffix="%" color={T.accent.green} onInfoClick={() => handleExplainClick(t.winRate, EXPLANATIONS.winRate)} />
          <MetricCard T={T} label={t.totalTrades} value={String(stats.totalTrades)} color={T.text.primary} />
          <MetricCard T={T} label={t.avgWin} value={stats.avgWin} suffix="$" color={T.accent.green} />
          <MetricCard T={T} label={t.avgLoss} value={stats.avgLoss} suffix="$" color={T.accent.red} />
          <MetricCard T={T} label={t.currentStreak} value={`${stats.currentStreak} ${stats.streakType === 'Win' ? '🟢' : stats.streakType === 'Loss' ? '🔴' : '⚪'}`} color={T.text.primary} />
        </div>
        {/* Simple Equity Curve */}
        <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.equityCurve} explanation={EXPLANATIONS.equityCurve} unit="$" style={{ marginBottom: 18 }}>
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
        <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit="$" style={{ marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trades.map(tr => ({ id: tr.id, pnl: tr.pnl }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={0} stroke={T.border.medium} strokeWidth={1} />
              <Bar dataKey="pnl" radius={[4,4,0,0]}>{trades.map((tr, i) => <Cell key={i} fill={tr.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
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
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <GlassCard T={T} glow={T.accent.cyanGlow} style={{ flex: 2, minWidth: 300 }}>
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
          {/* Risk Exposure Meter */}
          <GlassCard T={T} style={{ flex: 1, minWidth: 200, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'חשיפת סיכון' : 'Risk Exposure'}</div>
            <svg width="100" height="55" viewBox="0 0 200 110" style={{ margin: '0 auto', display: 'block' }}>
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={T.border.subtle} strokeWidth="12" strokeLinecap="round"/>
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#rGlive)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${riskPct * 2.51} 251`} style={{ transition: 'stroke-dasharray 1s ease' }}/>
              <defs><linearGradient id="rGlive" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={T.accent.green}/><stop offset="50%" stopColor={T.accent.orange}/><stop offset="100%" stopColor={T.accent.red}/></linearGradient></defs>
              <text x="100" y="82" textAnchor="middle" fill={riskLevel === 'critical' ? T.accent.red : riskLevel === 'warning' ? T.accent.orange : T.accent.green} fontSize="22" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{riskPct.toFixed(0)}%</text>
            </svg>
          </GlassCard>
        </div>
        {/* Streak Pressure + Emotional Deviation */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <GlassCard T={T} style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{isRTL ? 'לחץ רצף' : 'Streak Pressure'}</div>
            <div style={{ padding: 14, borderRadius: T.radius.md, textAlign: 'center', background: stats.maxConsecLosses >= 3 ? `${T.accent.red}10` : stats.currentStreak >= 3 && stats.streakType === 'Win' ? `${T.accent.green}10` : `${T.accent.blue}08`, border: `1px solid ${stats.maxConsecLosses >= 3 ? T.accent.red : T.accent.green}20` }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{stats.maxConsecLosses >= 3 ? '🔥' : stats.currentStreak >= 3 ? '🚀' : '⚖️'}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.text.primary }}>{stats.maxConsecLosses >= 3 ? (isRTL ? 'צינון מומלץ' : 'Cool-Off Recommended') : stats.currentStreak >= 3 ? (isRTL ? 'מומנטום חיובי' : 'Positive Momentum') : (isRTL ? 'ניטרלי' : 'Neutral')}</div>
            </div>
          </GlassCard>
          <GlassCard T={T} style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{isRTL ? 'סטייה רגשית' : 'Emotional Deviation'}</div>
            {trades.slice(-5).map(tr => (
              <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${T.border.subtle}`, fontSize: 11 }}>
                <span style={{ color: T.text.muted }}>{tr.coin}</span>
                <span style={{ color: tr.deviation > 0.1 ? T.accent.red : T.accent.green, fontFamily: "'JetBrains Mono', monospace" }}>{tr.deviation.toFixed(3)}R {tr.deviation > 0.1 ? '⚠️' : '✓'}</span>
              </div>
            ))}
          </GlassCard>
          <GlassCard T={T} style={{ flex: 1, minWidth: 200 }}>
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
        {/* Position vs Plan */}
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
        {isAlpha && <>
          <ScoreGauge T={T} score={stats.orcaScore} label={isRTL ? 'ציון משמעת חי' : 'Live Discipline Score'} color={T.accent.cyan} />
        </>}
      </>
    );

    // REVIEW MODE: statistical intelligence
    if (opMode === 'review') return (
      <>
        <h2 style={{ fontSize: 22, fontWeight: 300, color: T.text.secondary, margin: '0 0 20px', fontFamily: "'JetBrains Mono', monospace" }}>{t.goodMorning} 👋</h2>

        {/* ═══ LAYER 1 — CORE TRADING HEALTH ═══ */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: T.accent.cyan, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 1, background: T.accent.cyan, display: 'inline-block' }} />
            {isRTL ? 'בריאות מסחר' : 'TRADING HEALTH'}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <MetricCard T={T} label={t.netPnl} value={stats.totalPnl} color={stats.totalPnl >= 0 ? T.accent.cyan : T.accent.red} onInfoClick={() => handleExplainClick(t.netPnl, EXPLANATIONS.netPnl)} />
            <MetricCard T={T} label={t.winRate} value={stats.winRate} suffix="%" color={T.accent.green} onInfoClick={() => handleExplainClick(t.winRate, EXPLANATIONS.winRate)} />
            <GlassCard T={T} glow={T.accent.cyanGlow} style={{ flex: 1, minWidth: 170 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t.expectancy}</div>
                  <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: `${T.accent.purple}15`, color: T.accent.purple, fontWeight: 700 }}>R</span>
                </div>
                <button onClick={() => handleExplainClick(t.expectancy, EXPLANATIONS.expectancy)} style={{ width: 16, height: 16, borderRadius: '50%', border: `1px solid ${T.border.medium}`, background: 'transparent', color: T.text.muted, cursor: 'pointer', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}>i</button>
              </div>
              <PV><div style={{ fontSize: 26, fontWeight: 700, color: stats.expectancyR >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{stats.expectancyR >= 0 ? '+' : ''}{stats.expectancyR.toFixed(3)}R</div></PV>
              <div style={{ fontSize: 9, color: T.text.muted, marginTop: 4 }}>
                {isRTL ? 'תוחלת לעסקה ביחידות סיכון' : 'Expected return per trade in risk units'}
              </div>
            </GlassCard>
            <MetricCard T={T} label={t.maxDrawdown} value={`${stats.maxDrawdown.toFixed(1)}%`} color={T.accent.orange} onInfoClick={() => handleExplainClick(t.maxDrawdown, EXPLANATIONS.maxDrawdownMetric)} />
          </div>
        </div>

        {/* ═══ LAYER 2 — EDGE & SYSTEM HEALTH ═══ */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: T.accent.purple, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 1, background: T.accent.purple, display: 'inline-block' }} />
            {isRTL ? 'בריאות מערכת' : 'SYSTEM HEALTH'}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
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

        {/* ═══ LAYER 3 — ADVANCED ANALYSIS (COLLAPSIBLE) ═══ */}
        <div style={{ marginBottom: 18 }}>
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '10px 14px', background: `${T.bg.card}`, border: `1px solid ${T.border.medium}`,
              borderRadius: T.radius.md, cursor: 'pointer', color: T.text.secondary, fontSize: 11,
              fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: 12, transition: 'transform 0.3s', transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▸</span>
            <span>{isRTL ? 'ניתוח מתקדם — גרפים, חלוקה והתפלגות' : 'Advanced Analysis — Charts, Breakdown & Distribution'}</span>
            <span style={{ marginInlineStart: 'auto', fontSize: 9, color: T.text.muted, fontWeight: 400 }}>
              {advancedOpen ? (isRTL ? 'הסתר' : 'Collapse') : (isRTL ? 'הרחב' : 'Expand')}
            </span>
          </button>
          {advancedOpen && (
            <div style={{ marginTop: 14, animation: 'fadeIn 0.3s ease' }}>
              {/* Equity + P&L */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                {isChartVisible('equityCurve') && <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.equityCurve} explanation={EXPLANATIONS.equityCurve} unit="$" chartId="equityCurve" onRemove={handleHideChart} style={{ flex: 2, minWidth: 380 }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={stats.equityCurve}>
                      <defs><linearGradient id="eqGAdv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.6}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.25}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="trade" tick={{ fill: T.text.muted, fontSize: 10 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 10 }} domain={[(d: number) => Math.floor(d * 0.98), (d: number) => Math.ceil(d * 1.02)]} />
                      <Tooltip contentStyle={tt} /><ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" /><Area type="monotone" dataKey="balance" stroke={T.accent.cyan} fill="url(#eqGAdv)" strokeWidth={2.5} dot={trades.length <= 50 ? { fill: T.accent.cyan, r: 3 } : false} activeDot={{ r: 5, fill: T.accent.cyan }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartWrapper>}
                {isChartVisible('pnlDistribution') && <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit="$" chartId="pnlDistribution" onRemove={handleHideChart} style={{ flex: 1, minWidth: 260 }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={trades.map(tr => ({ id: tr.id, pnl: tr.pnl }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                      <Tooltip contentStyle={tt} /><Bar dataKey="pnl" radius={[4,4,0,0]}>{trades.map((tr, i) => <Cell key={i} fill={tr.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>}
              </div>
              {/* Radar + Direction + Quick Stats */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                {isChartVisible('radarScore') && <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ציון Orca — פירוט' : 'Orca Score — Breakdown'} explanation={EXPLANATIONS.radarScore} chartId="radarScore" onRemove={handleHideChart} style={{ flex: 1, minWidth: 260 }}>
                  <ResponsiveContainer width="100%" height={170}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
                      <PolarGrid stroke={T.border.medium} /><PolarAngleAxis dataKey="m" tick={{ fill: T.text.muted, fontSize: 9 }} /><PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
                      <Radar dataKey="v" stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.55} strokeWidth={2.5} dot={{ r: 4, fill: T.accent.cyan, stroke: T.bg.card, strokeWidth: 1 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartWrapper>}
                {isChartVisible('coinPerformance') && <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.coinPerformance} explanation={EXPLANATIONS.coinPerformance} unit="$" chartId="coinPerformance" onRemove={handleHideChart} style={{ flex: 1, minWidth: 280 }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={stats.coinPerf} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis type="number" tick={{ fill: T.text.muted, fontSize: 10 }} /><YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 11 }} width={45} />
                      <Tooltip contentStyle={tt} /><Bar dataKey="pnl" radius={[0,4,4,0]}>{stats.coinPerf.map((c, i) => <Cell key={i} fill={c.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>}
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.directionAnalysis} explanation={EXPLANATIONS.directionAnalysis} style={{ flex: 1, minWidth: 240 }}>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart><Pie data={stats.directionData} dataKey="trades" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={4} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}><Cell fill={T.accent.green} /><Cell fill={T.accent.red} /></Pie><Tooltip contentStyle={tt} /></PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 2 }}>
                    {stats.directionData.map((d, i) => (<div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: T.text.muted }}>{d.name}</div><PV><div style={{ fontSize: 11, fontWeight: 600, color: d.expectancyR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{d.expectancyR.toFixed(2)}R</div></PV><div style={{ fontSize: 9, color: T.text.muted }}>WR: {d.winRate.toFixed(0)}%</div></div>))}
                  </div>
                </ChartWrapper>
              </div>
              {/* Quick Stats */}
              <GlassCard T={T} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{isRTL ? 'סטטיסטיקות מהירות' : 'Quick Stats'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0 }}>
                  {[
                    { l: `${t.avgWin} (R)`, v: `+${stats.avgWinR.toFixed(2)}R`, c: T.accent.green },
                    { l: `${t.avgLoss} (R)`, v: `-${stats.avgLossR.toFixed(2)}R`, c: T.accent.red },
                    { l: t.bestTrade, v: `+${stats.bestTradeR.toFixed(2)}R`, c: T.accent.cyan },
                    { l: t.worstTrade, v: `${stats.worstTradeR.toFixed(2)}R`, c: T.accent.red },
                    { l: t.profitFactor, v: `${stats.profitFactor.toFixed(2)}x`, c: T.accent.blue },
                    { l: t.currentStreak, v: `${stats.currentStreak} ${stats.streakType === 'Loss' ? '🔴' : '🟢'}`, c: T.text.primary },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: `1px solid ${T.border.subtle}` }}>
                      <span style={{ color: T.text.muted, fontSize: 12 }}>{s.l}</span>
                      <PV><span style={{ color: s.c, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s.v}</span></PV>
                    </div>
                  ))}
                </div>
              </GlassCard>
              {/* Alpha additions */}
              {isAlpha && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.riskEvolution} explanation={EXPLANATIONS.riskAllocation} unit="%" style={{ flex: 1, minWidth: 300 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={riskData.riskGrowthEvolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="tradeId" tick={{ fill: T.text.muted, fontSize: 10 }} /><YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                      <Tooltip contentStyle={tt} /><Line type="monotone" dataKey="pctOfAccount" stroke={T.accent.orange} strokeWidth={2} dot={{ fill: T.accent.orange, r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrapper>
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביצועים חודשיים (R)' : 'Monthly Performance (R)'} explanation={EXPLANATIONS.monthlyPerformance} unit="R" style={{ flex: 1, minWidth: 250 }}>
                  {stats.monthlyPerf.map((mp, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border.subtle}` }}>
                      <span style={{ fontSize: 12, color: T.text.secondary }}>{mp.month}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <PV><span style={{ fontSize: 11, color: mp.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{mp.pnl >= 0 ? '+' : ''}${mp.pnl.toFixed(2)}</span></PV>
                        <span style={{ fontSize: 11, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace" }}>{mp.expectancyR >= 0 ? '+' : ''}{mp.expectancyR.toFixed(2)}R</span>
                      </div>
                    </div>
                  ))}
                </ChartWrapper>
              </div>}
            </div>
          )}
        </div>
      </>
    );

    // RESEARCH MODE: quant lab
    return (
      <>
        <div style={{ padding: '6px 12px', background: `${T.accent.purple}10`, border: `1px solid ${T.accent.purple}25`, borderRadius: T.radius.md, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>🔬</span>
          <span style={{ fontSize: 12, color: T.accent.purple, fontWeight: 600 }}>{isRTL ? 'מעבדת מחקר מתקדמת' : 'Advanced Research Lab'}</span>
          <span style={{ fontSize: 10, color: T.text.muted, marginInlineStart: 'auto' }}>{stats.totalTrades} {isRTL ? 'עסקאות' : 'trades'} | {isRTL ? 'עומק אלפא' : 'Alpha Depth'}: {isAlpha ? 'ON' : 'OFF'}</span>
        </div>

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
            <GlassCard T={T} key={i} style={{ flex: 1, minWidth: 130, padding: 12 }}>
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
              <AreaChart data={(() => { let p = 200; return stats.equityCurve.map(e => { if (e.balance > p) p = e.balance; return { trade: e.trade, dd: -((p - e.balance) / p * 100) }; }); })()}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
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
                <Tooltip contentStyle={tt} cursor={{ strokeDasharray: '3 3' }} /><ReferenceLine y={0} stroke={T.border.medium} strokeDasharray="2 2" /><Scatter data={trades.map(tr => ({ deviation: tr.deviation, returnR: tr.returnR, risk: tr.risk, coin: tr.coin }))} fill={T.accent.cyan} fillOpacity={0.85} stroke={T.bg.card} strokeWidth={1} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartWrapper>

          {/* ═══ ALPHA QUANT LAB — slim-line advanced visualisations ═══ */}
          <div style={{ fontSize: 9, color: T.accent.purple, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700, margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 1, background: T.accent.purple, display: 'inline-block' }} />
            {isRTL ? 'מעבדת קוונט · גרפים דקיקים מתקדמים' : 'QUANT LAB · slim advanced visualisations'}
          </div>
          {(() => {
            // Rolling Sortino — downside-only volatility ratio (window 20)
            const W = 20;
            const sortino = trades.map((_, i) => {
              const slice = trades.slice(Math.max(0, i - W + 1), i + 1).map(x => x.returnR);
              const mean = slice.reduce((s, x) => s + x, 0) / slice.length;
              const downs = slice.filter(x => x < 0);
              const dd = Math.sqrt(downs.reduce((s, x) => s + x * x, 0) / Math.max(downs.length, 1));
              return { i: i + 1, sortino: dd > 0 ? +(mean / dd).toFixed(3) : 0 };
            });
            // R-return histogram (bins of 0.5R)
            const minR = Math.floor(Math.min(...trades.map(t => t.returnR), 0) * 2) / 2;
            const maxR = Math.ceil(Math.max(...trades.map(t => t.returnR), 0) * 2) / 2;
            const bins: { bin: string; n: number; mid: number }[] = [];
            for (let b = minR; b <= maxR; b += 0.5) {
              const n = trades.filter(t => t.returnR >= b && t.returnR < b + 0.5).length;
              bins.push({ bin: `${b.toFixed(1)}`, mid: b + 0.25, n });
            }
            // Lag-1 autocorrelation point cloud (R[i] vs R[i-1])
            const acData = trades.slice(1).map((t, i) => ({ prev: trades[i].returnR, cur: t.returnR }));
            // MAR ratio evolution: cumulative R / max DD R so far
            let cumR = 0, peakR = 0, mddR = 0;
            const mar = trades.map((t, i) => {
              cumR += t.returnR;
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
                        setupMap[s].totalR += tr.returnR;
                        setupMap[s].best = Math.max(setupMap[s].best, tr.returnR);
                        setupMap[s].worst = Math.min(setupMap[s].worst, tr.returnR);
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
                        dayMap[day].totalR += tr.returnR;
                        dayMap[day].totalPnl += tr.pnl;
                      });
                      return [1, 2, 3, 4, 5].filter(d => dayMap[d]).map(d => (
                        <tr key={d} style={{ borderBottom: `1px solid ${T.border.subtle}` }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: T.text.primary }}>{dayNames[d]}</td>
                          <td style={{ padding: '8px 12px', color: T.text.secondary }}>{dayMap[d].trades}</td>
                          <td style={{ padding: '8px 12px', color: (dayMap[d].wins / dayMap[d].trades * 100) >= 50 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{(dayMap[d].wins / dayMap[d].trades * 100).toFixed(0)}%</td>
                          <td style={{ padding: '8px 12px', color: (dayMap[d].totalR / dayMap[d].trades) >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{(dayMap[d].totalR / dayMap[d].trades).toFixed(2)}R</td>
                          <td style={{ padding: '8px 12px', color: dayMap[d].totalPnl >= 0 ? T.accent.green : T.accent.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}><PV>${dayMap[d].totalPnl.toFixed(2)}</PV></td>
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
    );
  };

  const renderJournal = () => {
    if (trades.length === 0) return null;
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 13, color: T.text.muted }}>{stats.totalTrades} {isRTL ? 'עסקאות' : 'trades'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isMobile && <button onClick={handleImport} style={{ padding: '7px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, fontSize: 11, cursor: 'pointer' }}>📥 {t.importData}</button>}
            {!isMobile && <button onClick={handleExport} style={{ padding: '7px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, fontSize: 11, cursor: 'pointer' }}>📊 XLSX</button>}
            {!isMobile && <button onClick={handleExportJson} style={{ padding: '7px 14px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, fontSize: 11, cursor: 'pointer' }}>📤 JSON</button>}
            <button onClick={() => { setEditingTrade(null); setShowTradeForm(true); }} style={{ padding: '7px 18px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ {t.addTrade}</button>
          </div>
        </div>
        {/* Mode-specific journal header */}
        {opMode === 'live' && <div style={{ padding: '8px 12px', background: `${modeColors.live}08`, border: `1px solid ${modeColors.live}20`, borderRadius: T.radius.md, marginBottom: 12, fontSize: 11, color: modeColors.live }}>🔴 {isRTL ? 'תצוגה חיה — עסקאות אחרונות בלבד' : 'Live View — Recent trades only'}</div>}
        <GlassCard T={T} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: T.bg.tertiary }}>
                {[t.tradeNo, t.date, t.coin, t.direction, t.entry, t.stopLoss, t.exit, t.pnl, ...(opMode !== 'live' ? [t.result] : []), t.riskR, ...(isAlpha ? [t.deviation, t.leverage] : []), t.comments].map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', textAlign: isRTL ? 'right' : 'left', color: T.text.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border.medium}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(opMode === 'live' ? trades.slice(-8) : trades).map((tr, idx) => (
                  <tr key={tr.id} onClick={() => setSelTrade(tr)} style={{ cursor: 'pointer', background: idx % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.muted }}>{tr.id}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, whiteSpace: 'nowrap', fontSize: 11 }}>{new Date(tr.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: T.accent.cyan }}>{tr.coin}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}` }}><TradingBadge color={tr.direction === 'Long' ? T.accent.green : T.accent.red}>{tr.direction === 'Long' ? '↑' : '↓'} {tr.direction}</TradingBadge></td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.entry}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.accent.red }}>{tr.stopLoss}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.exit}</td>
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: tr.pnl >= 0 ? T.accent.green : T.accent.red }}><PV>{tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(2)}</PV></td>
                    {opMode !== 'live' && <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}` }}><TradingBadge color={tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}>{tr.winLoss}</TradingBadge></td>}
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.returnR.toFixed(2)}R</td>
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
        {/* Trade detail modal */}
        {selTrade && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setSelTrade(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl, padding: 28, maxWidth: 500, width: '90%', boxShadow: T.shadow.elevated }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{selTrade.coin} <TradingBadge color={selTrade.direction === 'Long' ? T.accent.green : T.accent.red}>{selTrade.direction}</TradingBadge></div>
                  <div style={{ fontSize: 11, color: T.text.muted, marginTop: 3 }}>{isRTL ? 'עסקה' : 'Trade'} #{selTrade.id} • {new Date(selTrade.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <button onClick={() => setSelTrade(null)} style={{ background: 'none', border: 'none', color: T.text.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                {[
                  { l: t.entry, v: selTrade.entry }, { l: t.stopLoss, v: selTrade.stopLoss, c: T.accent.red },
                  { l: t.exit, v: selTrade.exit }, { l: `${t.pnl} ($)`, v: `${selTrade.pnl >= 0 ? '+' : ''}$${selTrade.pnl.toFixed(4)}`, c: selTrade.pnl >= 0 ? T.accent.green : T.accent.red },
                  { l: `${t.riskR} (R)`, v: `${selTrade.returnR.toFixed(2)}R` }, { l: t.deviation, v: selTrade.deviation ? selTrade.deviation.toFixed(4) + 'R' : '0', c: selTrade.deviation > 0 ? T.accent.orange : T.accent.green },
                  { l: t.leverage, v: `${selTrade.leverage}x` }, { l: `${t.balance} ($)`, v: `$${selTrade.balance.toFixed(2)}` },
                ].map((item, i) => (<div key={i}><div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.l}</div><PV><div style={{ fontSize: 15, fontWeight: 600, color: item.c || T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{item.v}</div></PV></div>))}
              </div>
              {selTrade.comments && <div style={{ marginTop: 16, padding: 12, background: T.bg.tertiary, borderRadius: T.radius.md, border: `1px solid ${T.border.subtle}` }}><div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', marginBottom: 4 }}>{t.comments}</div><div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>{selTrade.comments}</div></div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
                <button onClick={() => handleDeleteTrade(selTrade.id)} style={{ padding: '7px 16px', background: `${T.accent.red}15`, border: `1px solid ${T.accent.red}30`, borderRadius: T.radius.md, color: T.accent.red, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t.deleteTrade}</button>
                <button onClick={() => { setEditingTrade(selTrade); setSelTrade(null); setShowTradeForm(true); }} style={{ padding: '7px 16px', background: `${T.accent.blue}15`, border: `1px solid ${T.accent.blue}30`, borderRadius: T.radius.md, color: T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{t.editTrade}</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderCalendar = () => {
    if (trades.length === 0) return null;
    const calRiskStatus = checkRiskLimits(trades);
    return (
      <>
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
                  const intensity = dd ? Math.min(1, Math.abs(dd.pnl) / 10) : 0;
                  const riskColor = d ? getDayRiskColor(trades, d, calMonth, calYear) : 'neutral';
                  const isDarkRed = riskColor === 'darkred';
                  return (
                    <div key={i}
                      onMouseEnter={() => d && setCalHoverDay(d)}
                      onMouseLeave={() => setCalHoverDay(null)}
                      onClick={() => dd && d && setCalModalDay(d)}
                      style={{ minHeight: isMobile ? 48 : (isHovered && dd ? 95 : 68), borderRadius: T.radius.md, border: `1px solid ${isDarkRed ? `${T.accent.red}60` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(40 + intensity * 40).toString(16)}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(35 + intensity * 40).toString(16)}` : `${T.accent.orange}25`) : T.border.subtle}`, background: isDarkRed ? `${T.accent.red}20` : dd ? (dd.pnl > 0 ? `${T.accent.green}${Math.round(10 + intensity * 20).toString(16).padStart(2, '0')}` : dd.pnl < 0 ? `${T.accent.red}${Math.round(10 + intensity * 15).toString(16).padStart(2, '0')}` : `${T.accent.orange}10`) : 'transparent', padding: isMobile ? '3px 3px' : '5px 6px', transition: 'all 0.2s ease', cursor: dd ? 'pointer' : 'default', position: 'relative' }}>
                      {d && <><div style={{ fontSize: 10, color: T.text.muted, display: 'flex', alignItems: 'center', gap: 3 }}>{d}{isDarkRed && <span title="Risk limit exceeded">⚠️</span>}</div>{dd && <><PV><div style={{ fontSize: 13, fontWeight: 700, color: isDarkRed ? T.accent.red : dd.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>${Math.abs(dd.pnl).toFixed(0)}</div></PV><div style={{ fontSize: 8, color: T.text.muted, marginTop: 1 }}>{dd.trades} {isRTL ? 'עס׳' : 'tr'} • {dd.wins}/{dd.trades}</div>
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
                <PV><div style={{ fontSize: 16, fontWeight: 700, color: w.pnl >= 0 ? T.accent.green : w.pnl < 0 ? T.accent.red : T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)}` : '$0.00'}</div></PV>
                <div style={{ fontSize: 9, color: T.text.muted, marginTop: 1 }}>{w.trades} {isRTL ? 'עסקאות' : 'trades'}</div>
              </GlassCard>
            ))}
            <div style={{ marginTop: 14, fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t.monthlyTotal} <span style={{ color: T.text.dim, fontWeight: 500 }}>· {t.month[calMonth]} {calYear}</span>
            </div>
            <GlassCard T={T} glow={T.accent.cyanGlow}>
              <PV><div style={{ fontSize: 22, fontWeight: 700, color: monthStats.totalPnl >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>${monthStats.totalPnl.toFixed(2)}</div></PV>
              <div style={{ fontSize: 9, color: T.text.muted, marginTop: 3 }}>{monthStats.count} {isRTL ? 'עסקאות' : 'trades'} • {monthStats.winRate.toFixed(0)}% WR</div>
            </GlassCard>
          </div>
        </div>
        {/* Calendar Day Modal */}
        {calModalDay && (
          <CalendarModal T={T} t={t} isRTL={isRTL} day={calModalDay} month={calMonth} year={calYear} trades={trades} onClose={() => setCalModalDay(null)} onGenerateInsight={handleGenerateInsights} />
        )}
      </>
    );
  };

  const renderAnalytics = () => {
    if (trades.length === 0) return null;
    return (
      <AdvancedAnalyticsPage
        T={T}
        isRTL={isRTL}
        isAlpha={isAlpha}
        operatingMode={opMode}
        trades={trades}
        stats={stats}
        privacyMode={settings.privacyMode}
        onExplainClick={handleExplainClick}
      />
    );
  };

  const handleSaveRiskExplanation = (explanation: RiskExplanation) => {
    const updated = [...riskExplanations, explanation];
    setRiskExplanations(updated);
    localStorage.setItem('orca-risk-explanations', JSON.stringify(updated));
    setShowRiskExplanation(null);
  };

  const renderRisk = () => {
    if (trades.length === 0) return null;
    return (
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
      />
    );
  };

  const renderPsychology = () => {
    if (trades.length === 0) return null;
    return (
      <AdvancedPsychologyPage
        T={T}
        isRTL={isRTL}
        isAlpha={isAlpha}
        operatingMode={opMode}
        trades={trades}
        stats={stats}
        onExplainClick={handleExplainClick}
      />
    );
  };

  const renderAI = () => <AIInsightsPage T={T} trades={trades} />;


  // Portal pulse animation
  const portalCSS = `@keyframes portalPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }`;

  if (activeDimension === 'journal') {
    return (
      <DimensionController
        activeDimension="journal"
        orcaUI={<div />}
        journalUI={<JournalDimension onReturn={() => setActiveDimension('orca')} isRTL={isRTL} orcaTrades={trades} onAddOrcaTrade={addTrade} onUpdateOrcaTrade={updateTrade} />}
      />
    );
  }

  if (activeDimension === 'backtest') {
    return (
      <DimensionController
        activeDimension="backtest"
        orcaUI={<div />}
        journalUI={<div />}
        backtestUI={<BacktestDimension onReturn={() => setActiveDimension('orca')} />}
      />
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: T.bg.primary, color: T.text.primary, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 14, transition: 'background 0.5s ease, color 0.5s ease, filter 0.5s ease, opacity 0.5s ease', opacity: exiting ? 0 : 1, filter: exiting ? 'blur(8px)' : 'none' }}>
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
      {/* MOBILE MENU POPUP */}
      {isMobile && sbOpen && (
        <div onClick={() => setSbOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 'max(20px, env(safe-area-inset-top, 20px))' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'min(400px, 92vw)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
            border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
            boxShadow: T.shadow.elevated, animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 6px 12px', borderBottom: `1px solid ${T.border.subtle}`, marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {Ico.orca}
                <div><div style={{ fontSize: 15, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>ORCA</div><div style={{ fontSize: 8, color: T.text.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Investment</div></div>
              </div>
              <button onClick={() => setSbOpen(false)} style={{ background: 'none', border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, color: T.text.muted, cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>✕</button>
            </div>
            <ModeSwitch T={T} isRTL={isRTL} operatingMode={settings.operatingMode} systemMode={settings.systemMode} onOperatingModeChange={settings.setOperatingMode} onSystemModeChange={settings.setSystemMode} />
            {/* Nav items */}
            {nav.map(item => {
              const isWeekly = item.id === 'weekly-review';
              const activeColor = isWeekly ? '#FFD700' : T.accent.cyan;
              const showBadge = isWeekly && showWeeklyReminder;
              return (
                <button key={item.id} onClick={() => { setPage(item.id); setSbOpen(false); if (isWeekly) dismissWeeklyReminder(); }} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: page === item.id ? `${activeColor}10` : 'transparent', color: page === item.id ? activeColor : (isWeekly ? '#FFD700' : T.text.secondary), border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: page === item.id ? 600 : 400, width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: page === item.id ? `2px solid ${activeColor}` : '2px solid transparent' }}>
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    {typeof item.icon === 'string' ? <span style={{ fontSize: 18 }}>{item.icon}</span> : item.icon}
                    {showBadge && <ReminderBadge />}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
            {/* Dimensions */}
            <div style={{ padding: '4px 0', borderTop: `1px solid ${T.border.subtle}`, marginTop: 4 }}>
              <PortalButton onClick={() => { setSbOpen(false); setActiveDimension('journal'); }} isRTL={isRTL} expanded={true} />
              <BacktestPortalButton onClick={() => { setSbOpen(false); setActiveDimension('backtest'); }} isRTL={isRTL} expanded={true} />
            </div>
            {/* Bottom actions */}
            <div style={{ padding: '4px 0', borderTop: `1px solid ${T.border.subtle}`, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => { setSbOpen(false); setShowFeatureModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', color: T.text.muted, border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span>{isRTL ? 'אודות המערכת' : 'About System'}</span>
              </button>
              <a href="https://discord.gg/VA9X5tGR" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', color: '#5865F2', borderRadius: T.radius.md, fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                <span>{isRTL ? 'קהילת Discord' : 'Discord Community'}</span>
              </a>
              <button onClick={() => settings.setLang(settings.lang === 'he' ? 'en' : 'he')} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: `${T.accent.blue}10`, border: `1px solid ${T.accent.blue}25`, borderRadius: T.radius.md, color: T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {Ico.globe}<span>{settings.lang === 'he' ? 'English' : 'עברית'}</span>
              </button>
              <button onClick={() => { setSbOpen(false); settings.setPrivacyMode(!settings.privacyMode); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: settings.privacyMode ? `${T.accent.orange}15` : `${T.accent.blue}08`, border: `1px solid ${settings.privacyMode ? T.accent.orange : T.accent.blue}25`, borderRadius: T.radius.md, color: settings.privacyMode ? T.accent.orange : T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {settings.privacyMode ? '🔒' : '👁️'}<span>{settings.privacyMode ? (isRTL ? 'מוסתר' : 'Hidden') : (isRTL ? 'גלוי' : 'Visible')}</span>
              </button>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowThemeMenu(!showThemeMenu)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: `${T.accent.purple}10`, border: `1px solid ${T.accent.purple}25`, borderRadius: T.radius.md, color: T.accent.purple, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {Ico.settings}<span>{t.theme}</span>
                </button>
                {showThemeMenu && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, padding: 6, marginBottom: 4, zIndex: 20, boxShadow: T.shadow.elevated }}>
                    {(['midnight','indigo','platinum'] as ThemeId[]).map(th => (
                      <button key={th} onClick={() => { settings.setTheme(th); setShowThemeMenu(false); }} style={{ display: 'block', width: '100%', padding: '6px 10px', fontSize: 11, fontWeight: settings.theme === th ? 700 : 400, color: settings.theme === th ? T.accent.cyan : T.text.secondary, background: settings.theme === th ? `${T.accent.cyan}10` : 'transparent', border: 'none', borderRadius: T.radius.sm, cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' }}>
                        {th === 'midnight' ? (isRTL ? '🌙 חצות' : '🌙 Midnight') : th === 'indigo' ? (isRTL ? '🌌 אינדיגו ליל' : '🌌 Indigo Noir') : (isRTL ? '🤍 לבן יוקרתי' : '🤍 Platinum White')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setSbOpen(false); setShowReset(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: `${T.accent.red}08`, border: `1px solid ${T.accent.red}20`, borderRadius: T.radius.md, color: T.accent.red, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                {Ico.reset}<span>{t.resetAll}</span>
              </button>
              <button onClick={() => { setSbOpen(false); handleLogout(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: `${T.accent.orange}08`, border: `1px solid ${T.accent.orange}20`, borderRadius: T.radius.md, color: T.accent.orange, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
                <span>🚪</span><span>{isRTL ? 'יציאה' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
      <aside style={{
        width: sbOpen ? 216 : 62,
        minWidth: sbOpen ? 216 : 62,
        background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
        borderInlineEnd: `1px solid ${T.border.subtle}`,
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.3s ease', overflow: 'hidden', zIndex: 50,
      }}>
        <div style={{ padding: '18px 14px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => setShowFeatureModal(true)}>
            {Ico.orca}
            {sbOpen && <div><div style={{ fontSize: 16, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>ORCA</div><div style={{ fontSize: 8, color: T.text.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Investment</div></div>}
          </div>
          {sbOpen && <button onClick={() => setSbOpen(false)} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: T.text.muted, cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1, transition: 'color 0.2s' }}>‹</button>}
        </div>
        {!sbOpen && <button onClick={() => setSbOpen(true)} style={{ background: 'none', border: 'none', color: T.text.muted, cursor: 'pointer', fontSize: 14, padding: '6px 0', lineHeight: 1, transition: 'color 0.2s' }}>›</button>}
        {sbOpen && <ModeSwitch T={T} isRTL={isRTL} operatingMode={settings.operatingMode} systemMode={settings.systemMode} onOperatingModeChange={settings.setOperatingMode} onSystemModeChange={settings.setSystemMode} />}
        <nav style={{ flex: 1, padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {nav.map(item => {
            const isWeekly = item.id === 'weekly-review';
            const activeColor = isWeekly ? '#FFD700' : T.accent.cyan;
            const showBadge = isWeekly && showWeeklyReminder;
            return (
            <button key={item.id} onClick={() => { setPage(item.id); if (isWeekly) dismissWeeklyReminder(); }} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: sbOpen ? '9px 10px' : '9px 0', justifyContent: sbOpen ? 'flex-start' : 'center', background: page === item.id ? `${activeColor}10` : 'transparent', color: page === item.id ? activeColor : (isWeekly ? '#FFD700' : T.text.secondary), border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: page === item.id ? 600 : (isWeekly ? 600 : 400), transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: page === item.id ? `2px solid ${activeColor}` : '2px solid transparent' }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                {typeof item.icon === 'string' ? <span style={{ fontSize: 18 }}>{item.icon}</span> : item.icon}
                {showBadge && <ReminderBadge />}
              </span>
              {sbOpen && <span>{item.label}</span>}
            </button>
            );
          })}
          <button onClick={() => setShowFeatureModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sbOpen ? '9px 10px' : '9px 0', justifyContent: sbOpen ? 'flex-start' : 'center', background: 'transparent', color: T.text.muted, border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: 400, transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: '2px solid transparent', marginTop: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            {sbOpen && <span>{isRTL ? 'אודות המערכת' : 'About System'}</span>}
          </button>
          <a href="https://discord.gg/VA9X5tGR" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sbOpen ? '9px 10px' : '9px 0', justifyContent: sbOpen ? 'flex-start' : 'center', background: 'transparent', color: '#5865F2', border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: '2px solid transparent', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5865F215'; e.currentTarget.style.boxShadow = '0 0 12px #5865F220'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            {sbOpen && <span>{isRTL ? 'קהילת Discord' : 'Discord Community'}</span>}
          </a>
        </nav>
        {/* Dimension Portal Buttons */}
        {sbOpen && <div style={{ padding: '4px 6px' }}><PortalButton onClick={() => setActiveDimension('journal')} isRTL={isRTL} expanded={true} /></div>}
        {sbOpen && <div style={{ padding: '4px 6px' }}><BacktestPortalButton onClick={() => setActiveDimension('backtest')} isRTL={isRTL} expanded={true} /></div>}
        {sbOpen && <div style={{ padding: '4px 6px' }}><InstallPrompt T={T} isRTL={isRTL} compact /></div>}
        <div style={{ padding: 10, borderTop: `1px solid ${T.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sbOpen && <div style={{ position: 'relative' }}>
            <button onClick={() => setShowThemeMenu(!showThemeMenu)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.purple}10`, border: `1px solid ${T.accent.purple}25`, borderRadius: T.radius.md, color: T.accent.purple, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {Ico.settings}<span>{t.theme}</span>
            </button>
            {showThemeMenu && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, padding: 6, marginBottom: 4, zIndex: 20, boxShadow: T.shadow.elevated }}>
                {(['midnight','indigo','platinum'] as ThemeId[]).map(th => (
                  <button key={th} onClick={() => { settings.setTheme(th); setShowThemeMenu(false); }} style={{ display: 'block', width: '100%', padding: '6px 10px', fontSize: 11, fontWeight: settings.theme === th ? 700 : 400, color: settings.theme === th ? T.accent.cyan : T.text.secondary, background: settings.theme === th ? `${T.accent.cyan}10` : 'transparent', border: 'none', borderRadius: T.radius.sm, cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' }}>
                    {th === 'midnight' ? (isRTL ? '🌙 חצות' : '🌙 Midnight') : th === 'indigo' ? (isRTL ? '🌌 אינדיגו ליל' : '🌌 Indigo Noir') : (isRTL ? '🤍 לבן יוקרתי' : '🤍 Platinum White')}
                  </button>
                ))}
              </div>
            )}
          </div>}
          {sbOpen && <button onClick={() => settings.setPrivacyMode(!settings.privacyMode)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: settings.privacyMode ? `${T.accent.orange}15` : `${T.accent.blue}08`, border: `1px solid ${settings.privacyMode ? T.accent.orange : T.accent.blue}25`, borderRadius: T.radius.md, color: settings.privacyMode ? T.accent.orange : T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {settings.privacyMode ? '🔒' : '👁️'}<span>{settings.privacyMode ? (isRTL ? 'מוסתר' : 'Hidden') : (isRTL ? 'גלוי' : 'Visible')}</span>
          </button>}
          <button onClick={() => settings.setLang(settings.lang === 'he' ? 'en' : 'he')} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.blue}10`, border: `1px solid ${T.accent.blue}25`, borderRadius: T.radius.md, color: T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600, justifyContent: sbOpen ? 'flex-start' : 'center' }}>
            {Ico.globe}{sbOpen && <span>{settings.lang === 'he' ? 'English' : 'עברית'}</span>}
          </button>
          {sbOpen && <button onClick={() => setShowSettings(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.cyan}08`, border: `1px solid ${T.accent.cyan}20`, borderRadius: T.radius.md, color: T.accent.cyan, cursor: 'pointer', fontSize: 11, fontWeight: 500, marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>⚙️</span><span>{isRTL ? 'הגדרות' : 'Settings'}</span>
          </button>}
          {sbOpen && <button onClick={() => setShowReset(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.red}08`, border: `1px solid ${T.accent.red}20`, borderRadius: T.radius.md, color: T.accent.red, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
            {Ico.reset}<span>{t.resetAll}</span>
          </button>}
          {sbOpen && <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.orange}08`, border: `1px solid ${T.accent.orange}20`, borderRadius: T.radius.md, color: T.accent.orange, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
            <span>🚪</span><span>{isRTL ? 'יציאה' : 'Logout'}</span>
          </button>}
        </div>
      </aside>
      )}

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', transition: 'background 0.4s ease' }}>
        <header style={{ padding: isMobile ? '10px 12px' : '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border.subtle}`, background: `${T.bg.secondary}cc`, backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 5, gap: 8, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14 }}>
            {/* Mobile hamburger */}
            {isMobile && (
              <button onClick={() => setSbOpen(true)} style={{ background: 'none', border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.sm, color: T.text.secondary, cursor: 'pointer', padding: '5px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            )}
            <h1 style={{ fontSize: isMobile ? 14 : 17, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>{nav.find(n => n.id === page)?.label}</h1>
            {!isMobile && <TradingBadge color={modeColors[opMode]}>{opMode === 'beginner' ? (isRTL ? '🎓 מתחיל' : '🎓 BEGINNER') : opMode === 'live' ? (isRTL ? '🔴 חי' : '🔴 LIVE') : opMode === 'review' ? (isRTL ? '🔵 סקירה' : '🔵 REVIEW') : (isRTL ? '🟣 מחקר' : '🟣 RESEARCH')}</TradingBadge>}
            {!isMobile && isAlpha && <TradingBadge color={T.accent.purple}>⚡ ALPHA</TradingBadge>}
            {!isMobile && settings.privacyMode && <TradingBadge color={T.accent.orange}>🔒</TradingBadge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            {/* Prominent Add Trade button */}
            <button onClick={() => { setEditingTrade(null); setShowTradeForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '5px 10px' : '6px 16px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 700, cursor: 'pointer', fontSize: isMobile ? 11 : 12, transition: 'all 0.2s', boxShadow: `0 0 12px ${T.accent.cyan}30` }}>
              + {isMobile ? '' : t.addTrade}
            </button>
            {!isMobile && hiddenCharts.length > 0 && (
              <button onClick={handleRestoreCharts} style={{ padding: '4px 10px', background: `${T.accent.orange}15`, border: `1px solid ${T.accent.orange}30`, borderRadius: T.radius.sm, color: T.accent.orange, cursor: 'pointer', fontSize: 10, fontWeight: 600, transition: 'all 0.2s' }}>
                ↩ {isRTL ? 'שחזר גרפים' : 'Restore Charts'} ({hiddenCharts.length})
              </button>
            )}
            {!isMobile && (
              <button
                onClick={() => setShowCmdPalette(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 14px',
                  background: `linear-gradient(135deg, ${T.bg.tertiary}, ${T.bg.card})`,
                  border: `1px solid ${T.border.medium}`,
                  borderRadius: T.radius.md,
                  color: T.text.secondary,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: T.shadow.card,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = T.accent.cyan + '50';
                  e.currentTarget.style.background = `linear-gradient(135deg, ${T.accent.cyan}08, ${T.bg.card})`;
                  e.currentTarget.style.color = T.text.primary;
                  e.currentTarget.style.boxShadow = `${T.shadow.card}, 0 0 12px ${T.accent.cyan}15`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = T.border.medium;
                  e.currentTarget.style.background = `linear-gradient(135deg, ${T.bg.tertiary}, ${T.bg.card})`;
                  e.currentTarget.style.color = T.text.secondary;
                  e.currentTarget.style.boxShadow = T.shadow.card;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <span style={{ fontFamily: "'Inter', sans-serif" }}>
                  {isRTL ? 'פעולות מהירות' : 'Quick Actions'}
                </span>
                <span style={{
                  fontSize: 9, padding: '2px 5px',
                  background: `${T.accent.cyan}12`, border: `1px solid ${T.accent.cyan}20`,
                  borderRadius: 4, color: T.accent.cyan,
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700
                }}>⌘K</span>
              </button>
            )}
            {!isMobile && <div style={{ fontSize: 11, color: T.text.muted }}>{new Date().toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>}
            <PV><div style={{ fontSize: 11, color: T.accent.cyan, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>${currentBalance.toFixed(2)}</div></PV>
            {!isMobile && <span onClick={() => setShowFeatureModal(true)} style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', transition: 'opacity 0.2s' }}>Orca<span style={{ fontWeight: 300, color: T.text.muted, marginLeft: 4 }}>Investment</span></span>}
          </div>
        </header>

        <div style={{ padding: isMobile ? '12px 10px' : '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
          {trades.length === 0 && (
            <div style={{ textAlign: 'center', padding: isMobile ? 30 : 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🐋</div>
              <div style={{ fontSize: 16, color: T.text.secondary, marginBottom: 20 }}>{t.noTrades}</div>
              <button onClick={() => setShowTradeForm(true)} style={{ padding: '10px 24px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>+ {t.addTrade}</button>
            </div>
          )}
          {page === 'dashboard' && (<>{renderDashboard()}{renderCalendar()}</>)}
          {page === 'journal' && renderJournal()}
          {page === 'analytics' && renderAnalytics()}
          {page === 'risk' && renderRisk()}
          {page === 'psychology' && renderPsychology()}
          {page === 'ai' && renderAI()}
          {page === 'weekly-review' && (
            <WeeklyReviewPage T={T} isRTL={isRTL} trades={trades} themeId={settings.theme} stats={stats} riskData={riskData} />
          )}
        </div>
      </main>

      {/* OVERLAYS */}
      {showTradeForm && <TradeForm T={T} t={t} isRTL={isRTL} trade={editingTrade} currentBalance={currentBalance} onSave={handleSaveTrade} onClose={() => { setShowTradeForm(false); setEditingTrade(null); }} />}
      {showReset && <ResetModal T={T} t={t} isRTL={isRTL} onConfirm={handleReset} onClose={() => setShowReset(false)} />}
      {showSettings && <SettingsHub T={T} isRTL={isRTL} open={showSettings} onClose={() => setShowSettings(false)} theme={settings.theme} setTheme={settings.setTheme} stats={stats} />}
      {riskAlert && <RiskLimitAlert T={T} isRTL={isRTL} status={riskAlert} onClose={dismissRiskAlert} />}
      {showRiskExplanation && <RiskExplanationModal T={T} isRTL={isRTL} tradeId={showRiskExplanation.tradeId} riskChange={showRiskExplanation.riskChange} onSave={handleSaveRiskExplanation} onClose={() => setShowRiskExplanation(null)} />}
      {showFeatureModal && <FeatureManifestModal T={T} isRTL={isRTL} onClose={() => setShowFeatureModal(false)} />}
      <CommandPalette T={T} commands={commands} isOpen={showCmdPalette} onClose={() => setShowCmdPalette(false)} />
      {/* Import Warning Modal — with format guide + template link */}
      {showImportWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }} onClick={() => setShowImportWarning(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
            border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
            padding: 26, maxWidth: 520, width: '92%',
            boxShadow: T.shadow.elevated, animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: '90vh', overflowY: 'auto', direction: isRTL ? 'rtl' : 'ltr',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>📥</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, textAlign: 'center', marginBottom: 4, letterSpacing: '0.3px' }}>
              {isRTL ? 'ייבוא נתוני מסחר' : 'Import Trading Data'}
            </div>
            <div style={{ fontSize: 11, color: T.text.muted, textAlign: 'center', marginBottom: 18, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isRTL ? 'XLSX · XLS · JSON' : 'XLSX · XLS · JSON'}
            </div>

            {/* Template link banner */}
            <a href="https://docs.google.com/spreadsheets/d/1zI12IMRFsBRaZaxS-51CIYsg9vezB1K7U2enIzAaops/copy"
               target="_blank" rel="noopener noreferrer"
               style={{
                 display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                 background: `linear-gradient(135deg, ${T.accent.cyan}18, ${T.accent.teal}10)`,
                 border: `1px solid ${T.accent.cyan}40`,
                 borderRadius: T.radius.md, marginBottom: 16, textDecoration: 'none',
                 transition: 'transform .15s, box-shadow .15s',
               }}
               onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${T.accent.cyan}30`; }}
               onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.accent.cyan, marginBottom: 2 }}>
                  {isRTL ? 'הורד תבנית רשמית' : 'Get the Official Template'}
                </div>
                <div style={{ fontSize: 10, color: T.text.secondary, lineHeight: 1.4 }}>
                  {isRTL ? 'פתח עותק ב-Google Sheets · מלא עסקאות · ייצא ל-XLSX' : 'Open in Google Sheets · fill trades · export as XLSX'}
                </div>
              </div>
              <span style={{ fontSize: 16, color: T.accent.cyan }}>↗</span>
            </a>

            {/* Format guide */}
            <div style={{ background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {isRTL ? '📐 פורמט תאריך נדרש' : '📐 Required Date Format'}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: T.accent.cyan, fontWeight: 700, padding: '6px 10px', background: T.bg.primary, borderRadius: 6, display: 'inline-block', marginBottom: 8 }}>
                DD/MM/YYYY HH:mm
              </div>
              <div style={{ fontSize: 11, color: T.text.secondary, lineHeight: 1.5 }}>
                {isRTL ? 'דוגמה: ' : 'Example: '}
                <code style={{ color: T.accent.green, fontFamily: "'IBM Plex Mono', monospace" }}>27/02/2026 13:34</code>
                {isRTL ? ' (יום/חודש/שנה שעה:דקה — בפורמט ישראלי)' : ' (day/month/year hour:min — Israeli format)'}
              </div>
            </div>

            {/* Required columns */}
            <div style={{ background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {isRTL ? '📑 עמודות נדרשות (אנגלית או עברית)' : '📑 Required Columns (English or Hebrew)'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontSize: 11, color: T.text.secondary }}>
                {[
                  ['Entry Date', 'תאריך כניסה'],
                  ['Coin / Symbol', 'מטבע'],
                  ['Direction', 'כיוון'],
                  ['Entry / SL / Exit', 'כניסה / סטופ / יציאה'],
                  ['R+/-', 'תוצאה ב-R'],
                  ['P&L', 'רווח/הפסד'],
                ].map(([en, he], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: T.accent.cyan, fontSize: 9 }}>●</span>
                    <span>{isRTL ? he : en}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 10, color: T.text.muted, lineHeight: 1.6, marginBottom: 18, textAlign: 'center' }}>
              {isRTL
                ? 'המערכת מזהה אוטומטית את עמודות הקובץ. אם משהו חסר — היא תשלים בערכי ברירת מחדל.'
                : 'Auto-detects all columns. Missing values fall back to safe defaults.'}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowImportWarning(false)} style={{ padding: '9px 18px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {isRTL ? 'ביטול' : 'Cancel'}
              </button>
              <button onClick={handleImportConfirmed} style={{ padding: '9px 22px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 800, cursor: 'pointer', fontSize: 12, letterSpacing: '0.3px', boxShadow: `0 4px 14px ${T.accent.cyan}40` }}>
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
    </div>
  );
};

export default Index;
