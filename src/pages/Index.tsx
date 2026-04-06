import { useState, useMemo, useCallback, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ComposedChart, ScatterChart, Scatter, ZAxis } from 'recharts';
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
import { EntryGate } from '@/components/trading/EntryGate';
import { RiskLimitAlert } from '@/components/trading/RiskLimitAlert';
import { RiskExplanationModal, type RiskExplanation } from '@/components/trading/RiskExplanationModal';
import { AdvancedRiskPage } from '@/components/trading/AdvancedRiskPage';
import { AdvancedAnalyticsPage } from '@/components/trading/AdvancedAnalyticsPage';
import { AdvancedPsychologyPage } from '@/components/trading/AdvancedPsychologyPage';
import { WeeklyReviewPage } from '@/components/trading/WeeklyReviewPage';
import { InstallPrompt } from '@/components/trading/InstallPrompt';
import { DimensionController, PortalButton } from '@/components/trading/DimensionController';
import { JournalDimension } from '@/components/trading/JournalDimension';
import { useTrades } from '@/hooks/use-trades';
import { useSettings, type ThemeId } from '@/hooks/use-settings';
import { assessRisk } from '@/lib/risk-engine';
import { generateInsights, generateSummary } from '@/lib/ai-engine';
import { exportToXlsx, importFromXlsx } from '@/lib/xlsx-engine';
import { getDayRiskColor, checkRiskLimits, DEFAULT_RISK_LIMITS } from '@/lib/risk-limits';

const Index = () => {
  const isMobile = useIsMobile();
  const settings = useSettings();
  const { trades, stats, loading, initialized, addTrade, updateTrade, removeTrade, resetAll, importTrades, riskAlert, dismissRiskAlert } = useTrades();
  const [entered, setEntered] = useState(() => sessionStorage.getItem('orca-entered') === '1');
  const [activeDimension, setActiveDimension] = useState<'orca' | 'journal'>('orca');
  const T = getTheme(settings.theme);
  const t = i18n[settings.lang];
  const isRTL = settings.isRTL;
  const isAlpha = settings.isAlpha;
  const opMode = settings.operatingMode;

  const [page, setPage] = useState('calendar');
  const [sbOpen, setSbOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 768);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [selTrade, setSelTrade] = useState<Trade | null>(null);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [showReset, setShowReset] = useState(false);
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
  const handleReset = useCallback(async () => { await resetAll(); sessionStorage.setItem('orca-seeded', '1'); setShowReset(false); setPage('dashboard'); }, [resetAll]);
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
      setImportLoading(true);
      try {
        if (file.name.endsWith('.json')) {
          const text = await file.text(); const data = JSON.parse(text);
          const importedTrades = data.trades || data;
          if (!Array.isArray(importedTrades)) throw new Error('Invalid format');
          await importTrades(importedTrades);
        } else {
          const result = await importFromXlsx(file);
          if (result.errors.length > 0) console.warn('Import warnings:', result.errors);
          if (result.trades.length > 0) await importTrades(result.trades);
          else throw new Error('No valid trades found');
        }
        sessionStorage.setItem('orca-seeded', '1');
      } catch (err) { console.error('Import failed:', err); }
      finally { setImportLoading(false); }
    };
    input.click();
  }, [importTrades]);
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
    { id: 'privacy', label: isRTL ? 'מצב פרטיות' : 'Toggle Privacy Mode', icon: '🔒', category: isRTL ? 'מערכת' : 'System', shortcut: '⌘⇧P', action: () => settings.setPrivacyMode(!settings.privacyMode) },
    { id: 'ai', label: isRTL ? 'צור תובנות AI' : 'Generate AI Insights', icon: '🧠', category: 'AI', action: () => { setPage('ai'); handleGenerateInsights(); } },
    ...(['dashboard', 'journal', 'calendar', 'analytics', 'risk', 'psychology', 'ai'] as const).map(p => ({
      id: `nav-${p}`, label: `Go to ${p.charAt(0).toUpperCase() + p.slice(1)}`, icon: '📄', category: isRTL ? 'ניווט' : 'Navigation', action: () => setPage(p)
    })),
    { id: 'feature-info', label: isRTL ? 'אודות המערכת' : 'About Orca System', icon: 'ℹ️', category: isRTL ? 'מערכת' : 'System', action: () => setShowFeatureModal(true) },
    { id: 'beginner', label: isRTL ? 'מצב מתחיל' : 'Switch to Beginner Mode', icon: '🎓', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('beginner') },
    { id: 'live', label: isRTL ? 'מצב חי' : 'Switch to Live Mode', icon: '🔴', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('live') },
    { id: 'review', label: isRTL ? 'מצב סקירה' : 'Switch to Review Mode', icon: '🔵', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('review') },
    { id: 'research', label: isRTL ? 'מצב מחקר' : 'Switch to Research Mode', icon: '🟣', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setOperatingMode('research') },
    { id: 'alpha', label: isRTL ? 'הפעל Alpha' : 'Toggle Alpha Mode', icon: '⚡', category: isRTL ? 'מצבים' : 'Modes', action: () => settings.setSystemMode(isAlpha ? 'standard' : 'alpha') },
    { id: 'journal-sanctuary', label: isRTL ? 'כניסה למקדש' : 'Enter Journal Sanctuary', icon: '🏛️', category: isRTL ? 'ממדים' : 'Dimensions', action: () => setActiveDimension('journal') },
  ], [isRTL, handleExport, handleImport, handleGenerateInsights, isAlpha, settings]);

  const nav = [
    { id: 'dashboard', icon: Ico.dash, label: t.dashboard },
    { id: 'journal', icon: Ico.book, label: t.journal },
    { id: 'calendar', icon: Ico.cal, label: t.calendar },
    { id: 'analytics', icon: Ico.bar, label: t.analytics },
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
              <defs><linearGradient id="eqBeg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.3}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="trade" tick={{ fill: T.text.dim, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip contentStyle={tt} />
              <Area type="monotone" dataKey="balance" stroke={T.accent.cyan} fill="url(#eqBeg)" strokeWidth={2.5} dot={{ fill: T.accent.cyan, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
        {/* Simple P&L bars */}
        <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit="$" style={{ marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trades.map(tr => ({ id: tr.id, pnl: tr.pnl }))}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
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
                <div style={{ fontSize: 9, color: T.text.dim }}>Session P&L</div>
                <PV><div style={{ fontSize: 28, fontWeight: 700, color: dailyPnlToday >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{dailyPnlToday >= 0 ? '+' : ''}${dailyPnlToday.toFixed(2)}</div></PV>
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.text.dim }}>{isRTL ? 'רצף' : 'Streak'}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: stats.streakType === 'Win' ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{stats.currentStreak} {stats.streakType === 'Win' ? '🟢' : '🔴'}</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: T.text.dim }}>{isRTL ? 'משמעת חיה' : 'Live Discipline'}</div>
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
                  <div style={{ fontSize: 9, color: T.text.dim }}>{isRTL ? 'עסקאות היום' : 'trades today'}</div>
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
                <div style={{ fontSize: 9, color: T.text.dim, marginTop: 2 }}>Plan: {tr.riskPct}% • Actual: {((tr.risk / (tr.balance - tr.pnl)) * 100).toFixed(1)}%</div>
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
                <button onClick={() => handleExplainClick(t.expectancy, EXPLANATIONS.expectancy)} style={{ width: 16, height: 16, borderRadius: '50%', border: `1px solid ${T.border.medium}`, background: 'transparent', color: T.text.dim, cursor: 'pointer', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}>i</button>
              </div>
              <PV><div style={{ fontSize: 26, fontWeight: 700, color: stats.expectancyR >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{stats.expectancyR >= 0 ? '+' : ''}{stats.expectancyR.toFixed(3)}R</div></PV>
              <div style={{ fontSize: 9, color: T.text.dim, marginTop: 4 }}>
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
            <span style={{ marginInlineStart: 'auto', fontSize: 9, color: T.text.dim, fontWeight: 400 }}>
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
                      <defs><linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.3}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="trade" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip contentStyle={tt} /><Area type="monotone" dataKey="balance" stroke={T.accent.cyan} fill="url(#eqG)" strokeWidth={2.5} dot={{ fill: T.accent.cyan, r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartWrapper>}
                {isChartVisible('pnlDistribution') && <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.pnlDistribution} explanation={EXPLANATIONS.pnlDistribution} unit="$" chartId="pnlDistribution" onRemove={handleHideChart} style={{ flex: 1, minWidth: 260 }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={trades.map(tr => ({ id: tr.id, pnl: tr.pnl }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
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
                      <Radar dataKey="v" stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.15} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartWrapper>}
                {isChartVisible('coinPerformance') && <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.coinPerformance} explanation={EXPLANATIONS.coinPerformance} unit="$" chartId="coinPerformance" onRemove={handleHideChart} style={{ flex: 1, minWidth: 280 }}>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={stats.coinPerf} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis type="number" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 11 }} width={45} />
                      <Tooltip contentStyle={tt} /><Bar dataKey="pnl" radius={[0,4,4,0]}>{stats.coinPerf.map((c, i) => <Cell key={i} fill={c.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartWrapper>}
                <ChartWrapper T={T} onExplainClick={handleExplainClick} title={t.directionAnalysis} explanation={EXPLANATIONS.directionAnalysis} style={{ flex: 1, minWidth: 240 }}>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart><Pie data={stats.directionData} dataKey="trades" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={4}><Cell fill={T.accent.green} /><Cell fill={T.accent.red} /></Pie><Tooltip contentStyle={tt} /></PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 2 }}>
                    {stats.directionData.map((d, i) => (<div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: T.text.dim }}>{d.name}</div><PV><div style={{ fontSize: 11, fontWeight: 600, color: d.expectancyR >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{d.expectancyR.toFixed(2)}R</div></PV><div style={{ fontSize: 9, color: T.text.dim }}>WR: {d.winRate.toFixed(0)}%</div></div>))}
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
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="tradeId" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
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
          <span style={{ fontSize: 10, color: T.text.dim, marginInlineStart: 'auto' }}>{stats.totalTrades} {isRTL ? 'עסקאות' : 'trades'} | {isRTL ? 'עומק אלפא' : 'Alpha Depth'}: {isAlpha ? 'ON' : 'OFF'}</span>
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
                <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.l}</div>
                <span style={{ fontSize: 7, padding: '1px 3px', borderRadius: 3, background: `${T.accent.purple}12`, color: T.accent.purple, fontWeight: 700 }}>{m.u}</span>
              </div>
              <PV><div style={{ fontSize: 18, fontWeight: 700, color: m.c, fontFamily: "'JetBrains Mono', monospace" }}>{m.v}</div></PV>
            </GlassCard>
          ))}
        </div>

        {/* Research charts grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'התפלגות R-Multiple' : 'R-Multiple Distribution'} explanation={EXPLANATIONS.rDistribution} unit="R">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.rDist}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Bar dataKey="r" radius={[3,3,0,0]}>{stats.rDist.map((d, i) => <Cell key={i} fill={d.r >= 0 ? T.accent.cyan : T.accent.red} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'שארפ מתגלגל' : 'Rolling Sharpe Ratio'} explanation={EXPLANATIONS.rollingSharpe} unit="R/σ">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.rollingSharpe}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="tradeId" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Line type="monotone" dataKey="sharpe" stroke={T.accent.blue} strokeWidth={2} dot={{ fill: T.accent.blue, r: 2 }} /><Line type="monotone" dataKey="sharpe" stroke="transparent" />{/* zero line */}</LineChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'דעיכת יתרון' : 'Edge Decay Timeline'} explanation={EXPLANATIONS.edgeDecay} unit="R">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.edgeDecay}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="period" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Bar dataKey="expectancyR" radius={[4,4,0,0]}>{stats.edgeDecay.map((d, i) => <Cell key={i} fill={d.expectancyR >= 0 ? T.accent.cyan : T.accent.red} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'אחוז הצלחה vs R:R' : 'Win Rate vs R:R Bucket'} explanation={EXPLANATIONS.winRateVsRR} unit="%">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.winRateVsRR}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="rr" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 9 }} domain={[0, 100]} /><Tooltip contentStyle={tt} /><Bar dataKey="winRate" fill={T.accent.blue} radius={[4,4,0,0]} /><Bar dataKey="count" fill={`${T.accent.cyan}40`} radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'תוחלת מתגלגלת (R)' : 'Rolling Expectancy (R)'} explanation={EXPLANATIONS.expectancy} unit="R">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.rollingExpectancyR}>
                <defs><linearGradient id="reG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.2}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="tradeId" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 9 }} />
                <Tooltip contentStyle={tt} /><Area type="monotone" dataKey="expectancyR" stroke={T.accent.cyan} fill="url(#reG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'תוחלת לפי מטבע (R)' : 'Strategy Expectancy (R)'} explanation={EXPLANATIONS.coinPerformance} unit="R">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.strategyExpectancyR} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis type="number" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 10 }} width={40} /><Tooltip contentStyle={tt} /><Bar dataKey="expectancyR" radius={[0,4,4,0]}>{stats.strategyExpectancyR.map((d, i) => <Cell key={i} fill={d.expectancyR >= 0 ? T.accent.green : T.accent.red} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'מפת נסיגה' : 'Drawdown Depth Map'} explanation={EXPLANATIONS.drawdown} unit="%">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={(() => { let p = 200; return stats.equityCurve.map(e => { if (e.balance > p) p = e.balance; return { trade: e.trade, dd: -((p - e.balance) / p * 100) }; }); })()}>
                <defs><linearGradient id="ddGR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.red} stopOpacity={0}/><stop offset="100%" stopColor={T.accent.red} stopOpacity={0.4}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="trade" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 9 }} domain={['dataMin', 0]} />
                <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(2)}%`} /><Area type="monotone" dataKey="dd" stroke={T.accent.red} fill="url(#ddGR)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartWrapper>

          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביצועים לפי יום (R)' : 'Performance by Day (R)'} explanation={EXPLANATIONS.coinPerformance} unit="R">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.dayPerf}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="day" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 9 }} /><Tooltip contentStyle={tt} /><Bar dataKey="avgR" radius={[4,4,0,0]}>{stats.dayPerf.map((d, i) => <Cell key={i} fill={d.avgR >= 0 ? T.accent.green : T.accent.red} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </div>

        {/* Alpha: additional research panels */}
        {isAlpha && <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'סיכון/רוויה' : 'Risk of Ruin Curve'} explanation={EXPLANATIONS.riskOfRuin} unit="%">
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: stats.riskOfRuin < 10 ? T.accent.green : stats.riskOfRuin < 30 ? T.accent.orange : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{Math.min(99.9, stats.riskOfRuin).toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: T.text.dim, marginTop: 4 }}>{stats.riskOfRuin < 10 ? '🟢 Low Risk' : stats.riskOfRuin < 30 ? '🟡 Moderate' : '🔴 High Risk'}</div>
              </div>
            </ChartWrapper>
            <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'אופטימום קלי' : 'Kelly Optimal Sizing'} explanation={EXPLANATIONS.kellyOptimal} unit="%">
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: stats.kellyOptimal > 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{stats.kellyOptimal.toFixed(1)}%</div>
                <div style={{ fontSize: 10, color: T.text.dim, marginTop: 4 }}>Half-Kelly: {(stats.kellyOptimal / 2).toFixed(1)}%</div>
              </div>
            </ChartWrapper>
            <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'יעילות הון' : 'Capital Efficiency'} explanation={EXPLANATIONS.volatilityAdjusted} unit="R/σ">
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: stats.volatilityAdjustedExpectancy > 0.5 ? T.accent.cyan : T.accent.orange, fontFamily: "'JetBrains Mono', monospace" }}>{stats.volatilityAdjustedExpectancy.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: T.text.dim, marginTop: 4 }}>{stats.volatilityAdjustedExpectancy > 0.5 ? '🟢 Efficient' : '🟡 Suboptimal'}</div>
              </div>
            </ChartWrapper>
          </div>

          {/* Drawdown structure table */}
          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'מבנה נסיגות' : 'Drawdown Structure Map'} explanation={EXPLANATIONS.drawdownStructure} unit="%">
            {stats.drawdownStructure.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: T.text.dim, fontSize: 12 }}>{isRTL ? 'אין נסיגות משמעותיות' : 'No significant drawdowns'}</div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {stats.drawdownStructure.map((dd, i) => (
                  <div key={i} style={{ flex: '0 0 auto', padding: 10, background: `${T.accent.red}08`, border: `1px solid ${T.accent.red}20`, borderRadius: T.radius.md, minWidth: 120, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>-{dd.depth.toFixed(1)}%</div>
                    <div style={{ fontSize: 9, color: T.text.dim, marginTop: 3 }}>Trades {dd.start}→{dd.end} • {dd.recovery} to recover</div>
                  </div>
                ))}
              </div>
            )}
          </ChartWrapper>

          {/* Confidence vs Outcome scatter */}
          <ChartWrapper T={T} onExplainClick={handleExplainClick} title={isRTL ? 'ביטחון מול תוצאה' : 'Confidence vs Outcome Scatter'} explanation={EXPLANATIONS.rDistribution} unit="R" style={{ marginTop: 12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="deviation" name="Deviation" tick={{ fill: T.text.dim, fontSize: 9 }} /><YAxis dataKey="returnR" name="R-Multiple" tick={{ fill: T.text.dim, fontSize: 9 }} /><ZAxis dataKey="risk" range={[20, 60]} />
                <Tooltip contentStyle={tt} /><Scatter data={trades.map(tr => ({ deviation: tr.deviation, returnR: tr.returnR, risk: tr.risk, coin: tr.coin }))} fill={T.accent.cyan} fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartWrapper>
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
                        <td style={{ padding: '8px 12px', color: T.text.dim, fontFamily: "'JetBrains Mono', monospace" }}>{row.target}</td>
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
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.dim }}>{tr.id}</td>
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
                    <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.dim, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.comments || '—'}</td>
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
                ].map((item, i) => (<div key={i}><div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.l}</div><PV><div style={{ fontSize: 15, fontWeight: 600, color: item.c || T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{item.v}</div></PV></div>))}
              </div>
              {selTrade.comments && <div style={{ marginTop: 16, padding: 12, background: T.bg.tertiary, borderRadius: T.radius.md, border: `1px solid ${T.border.subtle}` }}><div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', marginBottom: 4 }}>{t.comments}</div><div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>{selTrade.comments}</div></div>}
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
                {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: isMobile ? 8 : 9, color: T.text.dim, fontWeight: 600, textTransform: 'uppercase', padding: '3px 0' }}>{d}</div>)}
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
                      {d && <><div style={{ fontSize: 10, color: T.text.dim, display: 'flex', alignItems: 'center', gap: 3 }}>{d}{isDarkRed && <span title="Risk limit exceeded">⚠️</span>}</div>{dd && <><PV><div style={{ fontSize: 13, fontWeight: 700, color: isDarkRed ? T.accent.red : dd.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>${Math.abs(dd.pnl).toFixed(0)}</div></PV><div style={{ fontSize: 8, color: T.text.dim, marginTop: 1 }}>{dd.trades} {isRTL ? 'עס׳' : 'tr'} • {dd.wins}/{dd.trades}</div>
                        {isHovered && <div style={{ fontSize: 8, color: T.text.muted, marginTop: 2 }}>{dd.details.map(det => det.coin).join(', ')}</div>}
                      </>}</>}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
            {/* Monthly EV Badge */}
            <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
              <GlassCard T={T} style={{ flex: 1, padding: 12, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase' }}>{t.monthlyEV}</div>
                  <span style={{ fontSize: 7, padding: '1px 3px', borderRadius: 3, background: `${T.accent.purple}15`, color: T.accent.purple, fontWeight: 700 }}>R</span>
                </div>
                <PV><div style={{ fontSize: 18, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{stats.expectancyR >= 0 ? '+' : ''}{stats.expectancyR.toFixed(3)}R</div></PV>
              </GlassCard>
              <GlassCard T={T} style={{ flex: 1, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase' }}>{t.streak}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: stats.streakType === 'Win' ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{stats.currentStreak} {stats.streakType === 'Win' ? '🟢' : '🔴'}</div>
              </GlassCard>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 190 }}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t.weeklySummary}</div>
            {weekStats.map((w, i) => (
              <GlassCard T={T} key={i} style={{ marginBottom: 7, padding: 12 }}>
                <div style={{ fontSize: 9, color: T.text.dim, marginBottom: 4 }}>{isRTL ? `שבוע ${w.week}` : `Week ${w.week}`}</div>
                <PV><div style={{ fontSize: 16, fontWeight: 700, color: w.pnl >= 0 ? T.accent.green : w.pnl < 0 ? T.accent.red : T.text.dim, fontFamily: "'JetBrains Mono', monospace" }}>{w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)}` : '$0.00'}</div></PV>
                <div style={{ fontSize: 9, color: T.text.dim, marginTop: 1 }}>{w.trades} {isRTL ? 'עסקאות' : 'trades'}</div>
              </GlassCard>
            ))}
            <div style={{ marginTop: 14, fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t.monthlyTotal}</div>
            <GlassCard T={T} glow={T.accent.cyanGlow}>
              <PV><div style={{ fontSize: 22, fontWeight: 700, color: stats.totalPnl >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>${stats.totalPnl.toFixed(2)}</div></PV>
              <div style={{ fontSize: 9, color: T.text.dim, marginTop: 3 }}>{stats.totalTrades} {isRTL ? 'עסקאות' : 'trades'} • {stats.winRate.toFixed(0)}% WR</div>
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
        trades={trades}
        stats={stats}
        onExplainClick={handleExplainClick}
      />
    );
  };

  const renderAI = () => {
    if (trades.length === 0) return null;
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.text.secondary }}>{isRTL ? `ניתוח מבוסס ראיות של ${trades.length} עסקאות` : `Evidence-based analysis of ${trades.length} trades`}</div>
          <button onClick={handleGenerateInsights} disabled={aiLoading} style={{ padding: '8px 20px', background: aiLoading ? T.bg.tertiary : `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: aiLoading ? T.text.dim : T.bg.primary, fontWeight: 700, cursor: aiLoading ? 'default' : 'pointer', fontSize: 12, transition: 'all 0.3s ease' }}>
            {aiLoading ? (isRTL ? 'מחשב...' : 'Computing...') : t.generateInsights}
          </button>
        </div>
        {aiInsights.length === 0 && !aiLoading && (
          <GlassCard T={T} style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧠</div>
            <div style={{ fontSize: 14, color: T.text.secondary }}>{isRTL ? 'לחץ "צור תובנות" לקבלת ניתוח חכם' : 'Click "Generate Insights" for AI-powered analysis'}</div>
          </GlassCard>
        )}
        {aiLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3].map(i => (<GlassCard T={T} key={i} style={{ opacity: 0.5 }}><div style={{ height: 16, width: '30%', background: T.bg.surface, borderRadius: 4, marginBottom: 8 }} /><div style={{ height: 12, width: '80%', background: T.bg.surface, borderRadius: 4 }} /></GlassCard>))}</div>}
        {aiInsights.length > 0 && !aiLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiInsights.map((ins, i) => {
              const c = ins.type === 'strength' ? T.accent.green : ins.type === 'weakness' ? T.accent.red : ins.type === 'alert' ? T.accent.orange : ins.type === 'momentum' ? T.accent.purple : T.accent.cyan;
              return (
                <GlassCard T={T} key={i} glow={`${c}15`} style={{ borderInlineStart: `3px solid ${c}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ fontSize: 18, flexShrink: 0 }}>{ins.icon}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TradingBadge color={c}>{ins.title}</TradingBadge>
                        {ins.severity === 'high' && <span style={{ fontSize: 8, color: T.accent.red, fontWeight: 700, textTransform: 'uppercase' }}>HIGH</span>}
                      </div>
                      <div style={{ fontSize: 13, color: T.text.primary, marginTop: 7, lineHeight: 1.6 }}>{ins.text}</div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
        {aiInsights.length > 0 && !aiLoading && (
          <GlassCard T={T} style={{ marginTop: 16 }} glow={T.accent.cyanGlow}>
            <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{t.aiSummary}</div>
            <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.8 }}>{generateSummary(stats, trades, isRTL)}</div>
          </GlassCard>
        )}
      </>
    );
  };


  // Portal pulse animation
  const portalCSS = `@keyframes portalPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }`;

  if (activeDimension === 'journal') {
    return (
      <DimensionController
        activeDimension="journal"
        orcaUI={<div />}
        journalUI={<JournalDimension onReturn={() => setActiveDimension('orca')} isRTL={isRTL} orcaTrades={trades} />}
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
      {/* MOBILE SIDEBAR OVERLAY */}
      {isMobile && sbOpen && (
        <div onClick={() => setSbOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, backdropFilter: 'blur(2px)' }} />
      )}
      {/* SIDEBAR */}
      <aside style={{
        width: isMobile ? 260 : (sbOpen ? 216 : 62),
        minWidth: isMobile ? 260 : (sbOpen ? 216 : 62),
        background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`,
        borderInlineEnd: `1px solid ${T.border.subtle}`,
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.3s ease', overflow: 'hidden', zIndex: 50,
        ...(isMobile ? {
          position: 'fixed' as const, top: 0, bottom: 0,
          [isRTL ? 'right' : 'left']: sbOpen ? 0 : -270,
          boxShadow: sbOpen ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
        } : {})
      }}>
        <div style={{ padding: '18px 14px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => setShowFeatureModal(true)}>
            {Ico.orca}
            {(sbOpen || isMobile) && <div><div style={{ fontSize: 16, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>ORCA</div><div style={{ fontSize: 8, color: T.text.dim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Investment</div></div>}
          </div>
          {(sbOpen || isMobile) && <button onClick={() => setSbOpen(false)} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: T.text.dim, cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1, transition: 'color 0.2s' }}>‹</button>}
        </div>
        {!sbOpen && !isMobile && <button onClick={() => setSbOpen(true)} style={{ background: 'none', border: 'none', color: T.text.dim, cursor: 'pointer', fontSize: 14, padding: '6px 0', lineHeight: 1, transition: 'color 0.2s' }}>›</button>}
        {(sbOpen || isMobile) && <ModeSwitch T={T} isRTL={isRTL} operatingMode={settings.operatingMode} systemMode={settings.systemMode} onOperatingModeChange={settings.setOperatingMode} onSystemModeChange={settings.setSystemMode} />}
        <nav style={{ flex: 1, padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(item => {
            const isWeekly = item.id === 'weekly-review';
            const activeColor = isWeekly ? '#FFD700' : T.accent.cyan;
            return (
            <button key={item.id} onClick={() => { setPage(item.id); if (isMobile) setSbOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: (sbOpen || isMobile) ? '9px 10px' : '9px 0', justifyContent: (sbOpen || isMobile) ? 'flex-start' : 'center', background: page === item.id ? `${activeColor}10` : 'transparent', color: page === item.id ? activeColor : (isWeekly ? '#FFD700' : T.text.secondary), border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: page === item.id ? 600 : (isWeekly ? 600 : 400), transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: page === item.id ? `2px solid ${activeColor}` : '2px solid transparent' }}>
              {typeof item.icon === 'string' ? <span style={{ fontSize: 18 }}>{item.icon}</span> : item.icon}{(sbOpen || isMobile) && <span>{item.label}</span>}
            </button>
            );
          })}
          {/* Info / About button */}
          <button onClick={() => setShowFeatureModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: (sbOpen || isMobile) ? '9px 10px' : '9px 0', justifyContent: (sbOpen || isMobile) ? 'flex-start' : 'center', background: 'transparent', color: T.text.dim, border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: 400, transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: '2px solid transparent', marginTop: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            {(sbOpen || isMobile) && <span>{isRTL ? 'אודות המערכת' : 'About System'}</span>}
          </button>
          {/* Discord Community */}
          <a href="https://discord.gg/VA9X5tGR" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: (sbOpen || isMobile) ? '9px 10px' : '9px 0', justifyContent: (sbOpen || isMobile) ? 'flex-start' : 'center', background: 'transparent', color: '#5865F2', border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: '2px solid transparent', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5865F215'; e.currentTarget.style.boxShadow = '0 0 12px #5865F220'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            {(sbOpen || isMobile) && <span>{isRTL ? 'קהילת Discord' : 'Discord Community'}</span>}
          </a>
        </nav>
        {/* Journal Portal Button */}
        {(sbOpen || isMobile) && <div style={{ padding: '4px 6px' }}><PortalButton onClick={() => setActiveDimension('journal')} isRTL={isRTL} expanded={true} /></div>}
        {/* Install to Desktop */}
        {(sbOpen || isMobile) && <div style={{ padding: '4px 6px' }}><InstallPrompt T={T} isRTL={isRTL} compact /></div>}
        <div style={{ padding: 10, borderTop: `1px solid ${T.border.subtle}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(sbOpen || isMobile) && <div style={{ position: 'relative' }}>
            <button onClick={() => setShowThemeMenu(!showThemeMenu)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.purple}10`, border: `1px solid ${T.accent.purple}25`, borderRadius: T.radius.md, color: T.accent.purple, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {Ico.settings}<span>{t.theme}</span>
            </button>
            {showThemeMenu && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, padding: 6, marginBottom: 4, zIndex: 20, boxShadow: T.shadow.elevated }}>
                {(['midnight','arctic','ember'] as ThemeId[]).map(th => (
                  <button key={th} onClick={() => { settings.setTheme(th); setShowThemeMenu(false); }} style={{ display: 'block', width: '100%', padding: '6px 10px', fontSize: 11, fontWeight: settings.theme === th ? 700 : 400, color: settings.theme === th ? T.accent.cyan : T.text.secondary, background: settings.theme === th ? `${T.accent.cyan}10` : 'transparent', border: 'none', borderRadius: T.radius.sm, cursor: 'pointer', textAlign: isRTL ? 'right' : 'left' }}>
                    {th === 'midnight' ? t.midnight : th === 'arctic' ? t.arctic : t.ember}
                  </button>
                ))}
              </div>
            )}
          </div>}
          {(sbOpen || isMobile) && <button onClick={() => settings.setPrivacyMode(!settings.privacyMode)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: settings.privacyMode ? `${T.accent.orange}15` : `${T.accent.blue}08`, border: `1px solid ${settings.privacyMode ? T.accent.orange : T.accent.blue}25`, borderRadius: T.radius.md, color: settings.privacyMode ? T.accent.orange : T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {settings.privacyMode ? '🔒' : '👁️'}<span>{settings.privacyMode ? (isRTL ? 'מוסתר' : 'Hidden') : (isRTL ? 'גלוי' : 'Visible')}</span>
          </button>}
          <button onClick={() => settings.setLang(settings.lang === 'he' ? 'en' : 'he')} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.blue}10`, border: `1px solid ${T.accent.blue}25`, borderRadius: T.radius.md, color: T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600, justifyContent: (sbOpen || isMobile) ? 'flex-start' : 'center' }}>
            {Ico.globe}{(sbOpen || isMobile) && <span>{settings.lang === 'he' ? 'English' : 'עברית'}</span>}
          </button>
          {(sbOpen || isMobile) && <button onClick={() => setShowReset(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.red}08`, border: `1px solid ${T.accent.red}20`, borderRadius: T.radius.md, color: T.accent.red, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
            {Ico.reset}<span>{t.resetAll}</span>
          </button>}
          {(sbOpen || isMobile) && <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.orange}08`, border: `1px solid ${T.accent.orange}20`, borderRadius: T.radius.md, color: T.accent.orange, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>
            <span>🚪</span><span>{isRTL ? 'יציאה' : 'Logout'}</span>
          </button>}
        </div>
      </aside>

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
            {!isMobile && <div style={{ fontSize: 11, color: T.text.dim }}>{new Date().toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>}
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
          {page === 'dashboard' && renderDashboard()}
          {page === 'journal' && renderJournal()}
          {page === 'calendar' && renderCalendar()}
          {page === 'analytics' && renderAnalytics()}
          {page === 'risk' && renderRisk()}
          {page === 'psychology' && renderPsychology()}
          {page === 'ai' && renderAI()}
          {page === 'weekly-review' && (
            <WeeklyReviewPage T={T} isRTL={isRTL} trades={trades} stats={stats} riskData={riskData} />
          )}
        </div>
      </main>

      {/* OVERLAYS */}
      {showTradeForm && <TradeForm T={T} t={t} isRTL={isRTL} trade={editingTrade} currentBalance={currentBalance} onSave={handleSaveTrade} onClose={() => { setShowTradeForm(false); setEditingTrade(null); }} />}
      {showReset && <ResetModal T={T} t={t} isRTL={isRTL} onConfirm={handleReset} onClose={() => setShowReset(false)} />}
      {riskAlert && <RiskLimitAlert T={T} isRTL={isRTL} status={riskAlert} onClose={dismissRiskAlert} />}
      {showRiskExplanation && <RiskExplanationModal T={T} isRTL={isRTL} tradeId={showRiskExplanation.tradeId} riskChange={showRiskExplanation.riskChange} onSave={handleSaveRiskExplanation} onClose={() => setShowRiskExplanation(null)} />}
      {showFeatureModal && <FeatureManifestModal T={T} isRTL={isRTL} onClose={() => setShowFeatureModal(false)} />}
      <CommandPalette T={T} commands={commands} isOpen={showCmdPalette} onClose={() => setShowCmdPalette(false)} />
      {/* Import Warning Modal */}
      {showImportWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease' }} onClick={() => setShowImportWarning(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: `linear-gradient(165deg, ${T.bg.card} 0%, ${T.bg.secondary} 100%)`,
            border: `1px solid ${T.border.medium}`, borderRadius: T.radius.xl,
            padding: 28, maxWidth: 460, width: '90%',
            boxShadow: T.shadow.elevated, animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 12 }}>📥</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary, textAlign: 'center', marginBottom: 12 }}>
              {isRTL ? 'ייבוא נתונים' : 'Import Trading Data'}
            </div>
            <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.7, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>
              {isRTL
                ? 'ייבוא נתוני מסחר חיצוניים עלול לגרום לאי-עקביות זמנית בתצוגה בזמן שהמערכת מעבדת את הקובץ.'
                : 'Importing external trading data may occasionally cause temporary display inconsistencies while the system processes the file.'}
            </div>
            <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.7, marginBottom: 8, textAlign: isRTL ? 'right' : 'left' }}>
              {isRTL
                ? 'במקרים מסוימים, גרפים או נתונים סטטיסטיים עשויים להתעדכן תוך מספר שניות.'
                : 'In some cases, charts or statistics may take a few seconds to update.'}
            </div>
            <div style={{ fontSize: 11, color: T.text.muted, lineHeight: 1.6, marginBottom: 20, textAlign: isRTL ? 'right' : 'left' }}>
              {isRTL
                ? 'אנו מתנצלים על כל אי-נוחות זמנית. אנא המתן לסיום הסנכרון.'
                : 'We apologize for any temporary inconvenience. Please wait for synchronization to complete.'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowImportWarning(false)} style={{ padding: '8px 20px', background: T.bg.tertiary, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md, color: T.text.secondary, cursor: 'pointer', fontSize: 12 }}>
                {isRTL ? 'ביטול' : 'Cancel'}
              </button>
              <button onClick={handleImportConfirmed} style={{ padding: '8px 20px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                {isRTL ? 'המשך בייבוא' : 'Continue Import'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Loading Overlay */}
      {importLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 8 }}>{isRTL ? 'מעבד נתונים...' : 'Processing data...'}</div>
            <div style={{ fontSize: 12, color: T.text.muted }}>{isRTL ? 'אנא המתן, המערכת מייבאת את העסקאות שלך' : 'Please wait while the system imports your trades'}</div>
          </div>
        </div>
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
