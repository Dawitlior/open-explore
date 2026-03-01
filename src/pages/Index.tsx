import { useState, useMemo } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { RAW_TRADES, type Trade } from "@/data/trades";
import { computeAnalytics, getCalDays } from "@/lib/trading-analytics";
import { i18n, FEATURES, type Lang } from "@/lib/trading-i18n";
import { T, ttStyle, modeColors } from "@/lib/trading-theme";
import { GlassCard, MetricCard, ScoreGauge, TradingBadge, Ico } from "@/components/trading/TradingUI";

const Index = () => {
  const [lang, setLang] = useState<Lang>('he');
  const [page, setPage] = useState('dashboard');
  const [sbOpen, setSbOpen] = useState(true);
  const [mode, setMode] = useState('review');
  const [calMonth, setCalMonth] = useState(1);
  const [calYear, setCalYear] = useState(2026);
  const [selTrade, setSelTrade] = useState<Trade | null>(null);
  const isRTL = lang === 'he';
  const t = i18n[lang];
  const trades = RAW_TRADES;
  const stats = useMemo(() => computeAnalytics(trades), [trades]);

  const calDayPnl = useMemo(() => {
    const m: Record<number, { pnl: number; trades: number; wins: number }> = {};
    trades.forEach(tr => { const d = new Date(tr.date); if (d.getMonth() === calMonth && d.getFullYear() === calYear) { const day = d.getDate(); if (!m[day]) m[day] = { pnl: 0, trades: 0, wins: 0 }; m[day].pnl += tr.pnl; m[day].trades++; if (tr.winLoss === 'Win') m[day].wins++; } });
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
    { m: isRTL ? 'סיכון' : 'Risk Mgmt', v: 85 },
    { m: isRTL ? 'עקביות' : 'Consistency', v: 60 },
  ];
  const dailyPnlToday = trades.filter(tr => new Date(tr.date).toDateString() === new Date('2026-02-28').toDateString()).reduce((s, tr) => s + tr.pnl, 0);
  const riskLevel = stats.maxConsecLosses >= 4 ? 'critical' : stats.maxConsecLosses >= 3 ? 'warning' : 'safe';
  const riskPct = Math.min(100, (stats.maxDrawdown / 10) * 100);

  const aiInsights = [
    { type: 'strength', icon: '💪', text: isRTL ? 'שורטים הם היתרון שלך — 66.7% ניצחונות, רוב הרווח מפוזיציות שורט' : 'Shorts are your edge — 66.7% win rate, majority of profits from short positions' },
    { type: 'strength', icon: '✅', text: isRTL ? 'משמעת גבוהה — 100% עמידה בכללים' : 'High discipline — 100% rule adherence across all trades' },
    { type: 'weakness', icon: '⚠️', text: isRTL ? 'ATOM מראה ביצועים מעורבים — 1 ניצחון מ-4 עסקאות' : 'ATOM shows mixed results — 1 win from 4 trades. Review approach' },
    { type: 'weakness', icon: '🔴', text: isRTL ? '3 הפסדים רצופים ב-18 פברואר — סימן למסחר יתר' : '3 consecutive losses on Feb 18 — possible overtrading signal' },
    { type: 'alert', icon: '📊', text: isRTL ? 'הסטייה עולה בהפסדים — ממוצע 0.11R בהפסדים לעומת 0R בניצחונות' : 'Deviation increases in losing trades — avg 0.11R in losses vs 0R in wins' },
    { type: 'recommendation', icon: '🎯', text: isRTL ? 'המלצה: הפחת מינוף ב-ALGO ו-OP. מינוף גבוה מגדיל סטייה' : 'Reduce leverage on ALGO and OP. High leverage amplifies deviation' },
  ];

  const nav = [
    { id: 'dashboard', icon: Ico.dash, label: t.dashboard },
    { id: 'journal', icon: Ico.book, label: t.journal },
    { id: 'calendar', icon: Ico.cal, label: t.calendar },
    { id: 'analytics', icon: Ico.bar, label: t.analytics },
    { id: 'risk', icon: Ico.shield, label: t.risk },
    { id: 'psychology', icon: Ico.brain, label: t.psychology },
    { id: 'ai', icon: Ico.star, label: t.ai },
    { id: 'features', icon: Ico.doc, label: t.features },
  ];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: T.bg.primary, color: T.text.primary, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: 14 }}>
      {/* SIDEBAR */}
      <aside style={{ width: sbOpen ? 216 : 62, minWidth: sbOpen ? 216 : 62, background: `linear-gradient(180deg, ${T.bg.secondary} 0%, ${T.bg.primary} 100%)`, borderInlineEnd: `1px solid ${T.border.subtle}`, display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease', overflow: 'hidden', zIndex: 10 }}>
        <div style={{ padding: '18px 14px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setSbOpen(!sbOpen)}>
          {Ico.orca}
          {sbOpen && <div><div style={{ fontSize: 16, fontWeight: 700, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace" }}>ORCA</div><div style={{ fontSize: 8, color: T.text.dim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Investment</div></div>}
        </div>
        {sbOpen && <div style={{ padding: '0 10px', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 3, background: T.bg.primary, borderRadius: T.radius.md, padding: 3 }}>
            {(['live','review','research'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '5px 2px', fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', border: 'none', borderRadius: T.radius.sm, cursor: 'pointer', background: mode === m ? `${modeColors[m]}20` : 'transparent', color: mode === m ? modeColors[m] : T.text.dim, transition: 'all 0.2s' }}>
                {m === 'live' ? (isRTL ? 'חי' : 'Live') : m === 'review' ? (isRTL ? 'סקירה' : 'Review') : isRTL ? 'מחקר' : 'Research'}
              </button>
            ))}
          </div>
        </div>}
        <nav style={{ flex: 1, padding: '0 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: sbOpen ? '9px 10px' : '9px 0', justifyContent: sbOpen ? 'flex-start' : 'center', background: page === item.id ? `${T.accent.cyan}10` : 'transparent', color: page === item.id ? T.accent.cyan : T.text.secondary, border: 'none', borderRadius: T.radius.md, cursor: 'pointer', fontSize: 13, fontWeight: page === item.id ? 600 : 400, transition: 'all 0.2s', width: '100%', textAlign: isRTL ? 'right' : 'left', borderInlineStart: page === item.id ? `2px solid ${T.accent.cyan}` : '2px solid transparent' }}>
              {item.icon}{sbOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: 10, borderTop: `1px solid ${T.border.subtle}` }}>
          <button onClick={() => setLang(lang === 'he' ? 'en' : 'he')} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', background: `${T.accent.blue}10`, border: `1px solid ${T.accent.blue}25`, borderRadius: T.radius.md, color: T.accent.blue, cursor: 'pointer', fontSize: 12, fontWeight: 600, justifyContent: sbOpen ? 'flex-start' : 'center' }}>
            {Ico.globe}{sbOpen && <span>{lang === 'he' ? 'English' : 'עברית'}</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <header style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${T.border.subtle}`, background: `${T.bg.secondary}cc`, backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <h1 style={{ fontSize: 17, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>{nav.find(n => n.id === page)?.label}</h1>
            <TradingBadge color={modeColors[mode]}>{mode === 'live' ? t.liveMode : mode === 'review' ? t.reviewMode : t.researchMode}</TradingBadge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: T.text.dim }}>{new Date().toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: T.bg.primary }}>O</div>
          </div>
        </header>

        <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

          {/* ══════ DASHBOARD ══════ */}
          {page === 'dashboard' && <>
            <h2 style={{ fontSize: 22, fontWeight: 300, color: T.text.secondary, margin: '0 0 20px', fontFamily: "'JetBrains Mono', monospace" }}>{t.goodMorning} 👋</h2>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              <MetricCard label={t.netPnl} value={stats.totalPnl} color={stats.totalPnl >= 0 ? T.accent.cyan : T.accent.red} />
              <MetricCard label={t.profitFactor} value={stats.profitFactor} suffix="x" color={T.accent.blue} />
              <MetricCard label={t.winRate} value={stats.winRate} suffix="%" color={T.accent.green} />
              <MetricCard label={t.expectancy} value={stats.expectancy} color={stats.expectancy >= 0 ? T.accent.cyan : T.accent.red} />
              <MetricCard label={t.totalTrades} value={String(stats.totalTrades)} color={T.text.primary} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              <ScoreGauge score={stats.orcaScore} label={t.orcaScore} color={T.accent.cyan} />
              <ScoreGauge score={stats.edgeHealth} label={t.edgeHealth} color={T.accent.blue} />
              <ScoreGauge score={stats.regimeFit} label={t.regimeFit} color={T.accent.purple} />
              <GlassCard style={{ flex: 2, minWidth: 260 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{t.orcaScore} — {isRTL ? 'פירוט' : 'Breakdown'}</div>
                <ResponsiveContainer width="100%" height={170}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="68%">
                    <PolarGrid stroke={T.border.medium} /><PolarAngleAxis dataKey="m" tick={{ fill: T.text.muted, fontSize: 9 }} /><PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
                    <Radar dataKey="v" stroke={T.accent.cyan} fill={T.accent.cyan} fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              <GlassCard style={{ flex: 2, minWidth: 380 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t.equityCurve}</div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={stats.equityCurve}>
                    <defs><linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.3}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="trade" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip contentStyle={ttStyle} /><Area type="monotone" dataKey="balance" stroke={T.accent.cyan} fill="url(#eqG)" strokeWidth={2.5} dot={{ fill: T.accent.cyan, r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t.pnlDistribution}</div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={trades.map(tr => ({ id: tr.id, pnl: tr.pnl }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
                    <Tooltip contentStyle={ttStyle} /><Bar dataKey="pnl" radius={[4,4,0,0]}>{trades.map((tr, i) => <Cell key={i} fill={tr.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <GlassCard style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t.coinPerformance}</div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={stats.coinPerf} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis type="number" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis dataKey="coin" type="category" tick={{ fill: T.text.secondary, fontSize: 11 }} width={45} />
                    <Tooltip contentStyle={ttStyle} /><Bar dataKey="pnl" radius={[0,4,4,0]}>{stats.coinPerf.map((c, i) => <Cell key={i} fill={c.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{isRTL ? 'סטטיסטיקות' : 'Quick Stats'}</div>
                {[
                  { l: t.avgWin, v: `$${stats.avgWin.toFixed(2)}`, c: T.accent.green },
                  { l: t.avgLoss, v: `-$${stats.avgLoss.toFixed(2)}`, c: T.accent.red },
                  { l: t.bestTrade, v: `$${stats.bestTrade.toFixed(2)}`, c: T.accent.cyan },
                  { l: t.worstTrade, v: `-$${Math.abs(stats.worstTrade).toFixed(2)}`, c: T.accent.red },
                  { l: t.currentStreak, v: `${stats.currentStreak} ${stats.streakType === 'Loss' ? '🔴' : '🟢'}`, c: T.text.primary },
                  { l: t.maxDrawdown, v: `${stats.maxDrawdown.toFixed(1)}%`, c: T.accent.orange },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 5 ? `1px solid ${T.border.subtle}` : 'none' }}>
                    <span style={{ color: T.text.muted, fontSize: 12 }}>{s.l}</span>
                    <span style={{ color: s.c, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s.v}</span>
                  </div>
                ))}
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t.directionAnalysis}</div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart><Pie data={stats.directionData} dataKey="trades" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={4} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}><Cell fill={T.accent.green} /><Cell fill={T.accent.red} /></Pie><Tooltip contentStyle={ttStyle} /></PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 2 }}>
                  {stats.directionData.map((d, i) => (<div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: T.text.dim }}>{d.name}</div><div style={{ fontSize: 13, fontWeight: 600, color: d.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>${d.pnl.toFixed(2)}</div><div style={{ fontSize: 9, color: T.text.dim }}>WR: {d.winRate.toFixed(0)}%</div></div>))}
                </div>
              </GlassCard>
            </div>
          </>}

          {/* ══════ JOURNAL ══════ */}
          {page === 'journal' && <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: T.text.muted }}>{stats.totalTrades} {isRTL ? 'עסקאות • פברואר 2026' : 'trades • February 2026'}</div>
              <button style={{ padding: '7px 18px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`, border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ {isRTL ? 'הוסף עסקה' : 'Add Trade'}</button>
            </div>
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: T.bg.tertiary }}>
                    {[t.tradeNo, t.date, t.coin, t.direction, t.entry, t.stopLoss, t.exit, t.pnl, t.result, t.riskR, t.comments].map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', textAlign: isRTL ? 'right' : 'left', color: T.text.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border.medium}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {trades.map((tr, idx) => (
                      <tr key={tr.id} onClick={() => setSelTrade(tr)} style={{ cursor: 'pointer', background: idx % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.dim }}>{tr.id}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, whiteSpace: 'nowrap', fontSize: 11 }}>{new Date(tr.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: T.accent.cyan }}>{tr.coin}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}` }}><TradingBadge color={tr.direction === 'Long' ? T.accent.green : T.accent.red}>{tr.direction === 'Long' ? '↑' : '↓'} {tr.direction === 'Long' ? t.long : t.short}</TradingBadge></td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.entry}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.accent.red }}>{tr.stopLoss}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.exit}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: tr.pnl >= 0 ? T.accent.green : T.accent.red }}>{tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}` }}><TradingBadge color={tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}>{tr.winLoss === 'Win' ? t.win : tr.winLoss === 'Loss' ? t.loss : t.breakEven}</TradingBadge></td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{tr.returnR.toFixed(2)}R</td>
                        <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.dim, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.comments || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                      { l: t.entry, v: selTrade.entry }, { l: t.stopLoss, v: selTrade.stopLoss, c: T.accent.red },
                      { l: t.exit, v: selTrade.exit }, { l: t.pnl, v: `${selTrade.pnl >= 0 ? '+' : ''}$${selTrade.pnl.toFixed(4)}`, c: selTrade.pnl >= 0 ? T.accent.green : T.accent.red },
                      { l: t.riskR, v: `${selTrade.returnR.toFixed(2)}R` }, { l: isRTL ? 'סטייה' : 'Deviation', v: selTrade.deviation ? selTrade.deviation.toFixed(4) + 'R' : '0', c: selTrade.deviation > 0 ? T.accent.orange : T.accent.green },
                      { l: isRTL ? 'מינוף' : 'Leverage', v: `${selTrade.leverage}x` }, { l: isRTL ? 'יתרה' : 'Balance', v: `$${selTrade.balance}` },
                    ].map((item, i) => (<div key={i}><div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.l}</div><div style={{ fontSize: 15, fontWeight: 600, color: item.c || T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{item.v}</div></div>))}
                  </div>
                  {selTrade.comments && <div style={{ marginTop: 16, padding: 12, background: T.bg.tertiary, borderRadius: T.radius.md, border: `1px solid ${T.border.subtle}` }}><div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', marginBottom: 4 }}>{t.comments}</div><div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>{selTrade.comments}</div></div>}
                </div>
              </div>
            )}
          </>}

          {/* ══════ CALENDAR ══════ */}
          {page === 'calendar' && <>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ flex: 3, minWidth: 460 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '5px 10px', color: T.text.secondary, cursor: 'pointer', fontSize: 16 }}>‹</button>
                  <div style={{ fontSize: 17, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{t.month[calMonth]} {calYear}</div>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: T.radius.md, padding: '5px 10px', color: T.text.secondary, cursor: 'pointer', fontSize: 16 }}>›</button>
                </div>
                <GlassCard style={{ padding: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
                    {dayNames.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 9, color: T.text.dim, fontWeight: 600, textTransform: 'uppercase', padding: '3px 0' }}>{d}</div>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {calDays.map((d, i) => {
                      const dd = d ? calDayPnl[d] : null;
                      return (
                        <div key={i} style={{ minHeight: 68, borderRadius: T.radius.md, border: `1px solid ${dd ? (dd.pnl > 0 ? `${T.accent.green}40` : dd.pnl < 0 ? `${T.accent.red}35` : `${T.accent.orange}25`) : T.border.subtle}`, background: dd ? (dd.pnl > 0 ? `${T.accent.green}18` : dd.pnl < 0 ? `${T.accent.red}15` : `${T.accent.orange}10`) : 'transparent', padding: '5px 6px' }}>
                          {d && <><div style={{ fontSize: 10, color: T.text.dim }}>{d}</div>{dd && <><div style={{ fontSize: 13, fontWeight: 700, color: dd.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>${Math.abs(dd.pnl).toFixed(0)}</div><div style={{ fontSize: 8, color: T.text.dim, marginTop: 1 }}>{dd.trades} {isRTL ? 'עס׳' : 'tr'} • {dd.wins}/{dd.trades}</div></>}</>}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </div>
              <div style={{ flex: 1, minWidth: 190 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'סיכום שבועי' : 'Weekly Summary'}</div>
                {weekStats.map((w, i) => (
                  <GlassCard key={i} style={{ marginBottom: 7, padding: 12 }}>
                    <div style={{ fontSize: 9, color: T.text.dim, marginBottom: 4 }}>{isRTL ? `שבוע ${w.week}` : `Week ${w.week}`}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: w.pnl >= 0 ? T.accent.green : w.pnl < 0 ? T.accent.red : T.text.dim, fontFamily: "'JetBrains Mono', monospace" }}>{w.pnl !== 0 ? `${w.pnl >= 0 ? '+' : ''}$${w.pnl.toFixed(2)}` : '$0.00'}</div>
                    <div style={{ fontSize: 9, color: T.text.dim, marginTop: 1 }}>{w.trades} {isRTL ? 'עסקאות' : 'trades'}</div>
                  </GlassCard>
                ))}
                <div style={{ marginTop: 14, fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{isRTL ? 'סיכום חודשי' : 'Monthly Total'}</div>
                <GlassCard glow={T.accent.cyanGlow}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stats.totalPnl >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>${stats.totalPnl.toFixed(2)}</div>
                  <div style={{ fontSize: 9, color: T.text.dim, marginTop: 3 }}>{stats.totalTrades} {isRTL ? 'עסקאות' : 'trades'} • {stats.winRate.toFixed(0)}% WR</div>
                </GlassCard>
              </div>
            </div>
          </>}

          {/* ══════ ANALYTICS ══════ */}
          {page === 'analytics' && <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <MetricCard label={t.profitFactor} value={stats.profitFactor} suffix="x" color={T.accent.blue} small />
              <MetricCard label={t.expectancy} value={stats.expectancy} color={T.accent.cyan} small />
              <MetricCard label={t.avgWin} value={stats.avgWin} color={T.accent.green} small />
              <MetricCard label={t.avgLoss} value={-stats.avgLoss} color={T.accent.red} small />
              <MetricCard label={t.maxDrawdown} value={`${stats.maxDrawdown.toFixed(1)}%`} color={T.accent.orange} small />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <GlassCard style={{ flex: 1, minWidth: 360 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'התפלגות R' : 'R-Multiple Distribution'}</div>
                <ResponsiveContainer width="100%" height={210}><BarChart data={stats.rDist}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="r" radius={[4,4,0,0]}>{stats.rDist.map((d, i) => <Cell key={i} fill={d.r >= 0 ? T.accent.cyan : T.accent.red} />)}</Bar></BarChart></ResponsiveContainer>
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'ביצועים לפי יום' : 'Performance by Day'}</div>
                <ResponsiveContainer width="100%" height={210}><BarChart data={stats.dayPerf}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="day" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="pnl" radius={[4,4,0,0]}>{stats.dayPerf.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar></BarChart></ResponsiveContainer>
              </GlassCard>
            </div>
            <GlassCard>
              <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'רווח/הפסד מצטבר' : 'Cumulative P&L'}</div>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={(() => { let c = 0; return trades.map(tr => ({ id: tr.id, cum: (c += tr.pnl), pnl: tr.pnl })); })()}>
                  <defs><linearGradient id="cG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.2}/><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} /><Tooltip contentStyle={ttStyle} />
                  <Area type="monotone" dataKey="cum" fill="url(#cG)" stroke={T.accent.cyan} strokeWidth={2} />
                  <Bar dataKey="pnl" barSize={18} radius={[3,3,0,0]}>{trades.map((tr, i) => <Cell key={i} fill={tr.pnl >= 0 ? `${T.accent.green}60` : `${T.accent.red}60`} />)}</Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </GlassCard>
          </>}

          {/* ══════ RISK ══════ */}
          {page === 'risk' && <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <GlassCard glow={riskLevel === 'warning' ? 'rgba(245,158,11,0.12)' : T.accent.greenGlow} style={{ flex: 1, minWidth: 260, textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{t.riskMeter}</div>
                <svg width="190" height="105" viewBox="0 0 200 110" style={{ margin: '0 auto', display: 'block' }}>
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke={T.border.subtle} strokeWidth="12" strokeLinecap="round"/>
                  <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#rG)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${riskPct * 2.51} 251`} style={{ transition: 'stroke-dasharray 1s ease' }}/>
                  <defs><linearGradient id="rG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={T.accent.green}/><stop offset="50%" stopColor={T.accent.orange}/><stop offset="100%" stopColor={T.accent.red}/></linearGradient></defs>
                  <text x="100" y="82" textAnchor="middle" fill={riskLevel === 'critical' ? T.accent.red : riskLevel === 'warning' ? T.accent.orange : T.accent.green} fontSize="26" fontWeight="700" fontFamily="'JetBrains Mono', monospace">{riskPct.toFixed(0)}%</text>
                  <text x="100" y="102" textAnchor="middle" fill={T.text.dim} fontSize="10">{riskLevel === 'critical' ? 'CRITICAL' : riskLevel === 'warning' ? (isRTL ? 'אזהרה' : 'WARNING') : (isRTL ? 'בטוח' : 'SAFE')}</text>
                </svg>
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{isRTL ? 'גבולות סיכון' : 'Risk Guardrails'}</div>
                {[
                  { l: t.dailyMaxLoss, val: '$8.00', cur: `$${Math.abs(dailyPnlToday).toFixed(2)}`, ok: Math.abs(dailyPnlToday) < 8 },
                  { l: t.maxDrawdown, val: '5%', cur: `${stats.maxDrawdown.toFixed(1)}%`, ok: stats.maxDrawdown < 5 },
                  { l: t.consecutiveLosses, val: '4', cur: String(stats.maxConsecLosses), ok: stats.maxConsecLosses < 4 },
                  { l: isRTL ? 'מינוף מקסימלי' : 'Max Leverage', val: '25x', cur: `${Math.max(...trades.map(tr => tr.leverage))}x`, ok: true },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 3 ? `1px solid ${T.border.subtle}` : 'none' }}>
                    <span style={{ color: T.text.muted, fontSize: 12 }}>{r.l}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: T.text.dim }}>{r.cur}/{r.val}</span>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.ok ? T.accent.green : T.accent.red }} />
                    </div>
                  </div>
                ))}
              </GlassCard>
              <GlassCard style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{t.coolOff}</div>
                <div style={{ padding: 14, borderRadius: T.radius.md, textAlign: 'center', background: stats.maxConsecLosses >= 3 ? `${T.accent.orange}10` : `${T.accent.green}10`, border: `1px solid ${stats.maxConsecLosses >= 3 ? T.accent.orange : T.accent.green}25` }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{stats.maxConsecLosses >= 3 ? '⚠️' : '✅'}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: stats.maxConsecLosses >= 3 ? T.accent.orange : T.accent.green }}>{stats.maxConsecLosses >= 3 ? (isRTL ? 'מומלץ: צינון' : 'Recommended: Cool Off') : (isRTL ? 'מותר לסחור' : 'Clear to Trade')}</div>
                  <div style={{ fontSize: 10, color: T.text.dim, marginTop: 6 }}>{stats.maxConsecLosses} {isRTL ? 'הפסדים רצופים מקס' : 'max consec. losses'}</div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', marginBottom: 6 }}>{t.recoveryMode}</div>
                  <div style={{ padding: 10, borderRadius: T.radius.md, textAlign: 'center', background: stats.maxDrawdown > 3 ? `${T.accent.red}08` : `${T.accent.green}08`, border: `1px solid ${stats.maxDrawdown > 3 ? T.accent.red : T.accent.green}15` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: stats.maxDrawdown > 3 ? T.accent.red : T.accent.green }}>{stats.maxDrawdown > 3 ? (isRTL ? '⚡ התאוששות פעיל' : '⚡ Recovery Active') : (isRTL ? '🟢 רגיל' : '🟢 Normal')}</div>
                    {stats.maxDrawdown > 3 && <div style={{ fontSize: 9, color: T.text.dim, marginTop: 3 }}>{isRTL ? 'הפחת פוזיציה 50%' : 'Reduce position 50%'}</div>}
                  </div>
                </div>
              </GlassCard>
            </div>
            <GlassCard>
              <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'ניתוח נסיגה' : 'Drawdown Analysis'}</div>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={(() => { let p = 200; return stats.equityCurve.map(e => { if (e.balance > p) p = e.balance; return { trade: e.trade, dd: -((p - e.balance) / p * 100) }; }); })()}>
                  <defs><linearGradient id="dG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.red} stopOpacity={0}/><stop offset="100%" stopColor={T.accent.red} stopOpacity={0.3}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="trade" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} domain={['dataMin', 0]} />
                  <Tooltip contentStyle={ttStyle} formatter={(v: number) => `${v.toFixed(2)}%`} /><Area type="monotone" dataKey="dd" stroke={T.accent.red} fill="url(#dG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </>}

          {/* ══════ PSYCHOLOGY ══════ */}
          {page === 'psychology' && <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <ScoreGauge score={stats.rulesFollowed} label={t.disciplineScore} color={T.accent.green} />
              <ScoreGauge score={stats.orcaScore} label={t.orcaScore} color={T.accent.cyan} />
              <GlassCard style={{ flex: 2, minWidth: 280 }}>
                <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{isRTL ? 'מדדים התנהגותיים' : 'Behavioral Indicators'}</div>
                {[
                  { l: t.overtrading, v: true as boolean | string, d: isRTL ? '3+ עסקאות ביום 18/02' : '3+ trades on Feb 18' },
                  { l: t.revengeTrading, v: false as boolean | string, d: isRTL ? 'לא זוהה' : 'Not detected' },
                  { l: t.fearGreed, v: 'neutral' as boolean | string, d: isRTL ? 'ניטרלי — 100% כללים' : 'Neutral — 100% rules' },
                  { l: isRTL ? 'סטייה מתוכנית' : 'Plan Deviation', v: true as boolean | string, d: isRTL ? `${trades.filter(tr => tr.deviation > 0.1).length} עסקאות > 0.1R` : `${trades.filter(tr => tr.deviation > 0.1).length} trades > 0.1R` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 3 ? `1px solid ${T.border.subtle}` : 'none' }}>
                    <div><div style={{ fontSize: 12, fontWeight: 500 }}>{item.l}</div><div style={{ fontSize: 9, color: T.text.dim, marginTop: 1 }}>{item.d}</div></div>
                    <TradingBadge color={item.v === true ? T.accent.red : item.v === false ? T.accent.green : T.accent.orange}>{item.v === true ? (isRTL ? 'זוהה' : 'Detected') : item.v === false ? (isRTL ? 'תקין' : 'Clear') : (isRTL ? 'ניטרלי' : 'Neutral')}</TradingBadge>
                  </div>
                ))}
              </GlassCard>
            </div>
            <GlassCard>
              <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'סטייה לפי עסקה' : 'Deviation per Trade'}</div>
              <ResponsiveContainer width="100%" height={190}><BarChart data={trades.map(tr => ({ id: `#${tr.id}`, dev: tr.deviation || 0 }))}><CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} /><XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} /><YAxis tick={{ fill: T.text.dim, fontSize: 10 }} /><Tooltip contentStyle={ttStyle} formatter={(v: number) => `${v.toFixed(4)}R`} /><Bar dataKey="dev" radius={[4,4,0,0]}>{trades.map((tr, i) => <Cell key={i} fill={tr.deviation > 0.1 ? T.accent.red : tr.deviation > 0 ? T.accent.orange : T.accent.green} />)}</Bar></BarChart></ResponsiveContainer>
            </GlassCard>
            <GlassCard style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'מעקב שכנוע ובטחון' : 'Conviction & Confidence Tracker'}</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {trades.map(tr => (
                  <div key={tr.id} style={{ width: 42, height: 42, borderRadius: T.radius.md, background: tr.winLoss === 'Win' ? `${T.accent.green}15` : tr.winLoss === 'Loss' ? `${T.accent.red}12` : `${T.accent.orange}10`, border: `1px solid ${tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: tr.winLoss === 'Win' ? T.accent.green : tr.winLoss === 'Loss' ? T.accent.red : T.accent.orange }}>
                    <div>#{tr.id}</div><div style={{ fontSize: 7 }}>{tr.rules ? '✓' : '✗'}</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </>}

          {/* ══════ AI INSIGHTS ══════ */}
          {page === 'ai' && <>
            <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16 }}>{isRTL ? 'ניתוח מבוסס ראיות של 16 עסקאות • פברואר 2026' : 'Evidence-based analysis of 16 trades • February 2026'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aiInsights.map((ins, i) => {
                const c = ins.type === 'strength' ? T.accent.green : ins.type === 'weakness' ? T.accent.red : ins.type === 'alert' ? T.accent.orange : T.accent.cyan;
                return (
                  <GlassCard key={i} glow={`${c}15`} style={{ borderInlineStart: `3px solid ${c}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ fontSize: 18, flexShrink: 0 }}>{ins.icon}</div>
                      <div>
                        <TradingBadge color={c}>{ins.type === 'strength' ? (isRTL ? 'חוזק' : 'Strength') : ins.type === 'weakness' ? (isRTL ? 'חולשה' : 'Weakness') : ins.type === 'alert' ? (isRTL ? 'התרעה' : 'Alert') : (isRTL ? 'המלצה' : 'Recommendation')}</TradingBadge>
                        <div style={{ fontSize: 13, color: T.text.primary, marginTop: 7, lineHeight: 1.6 }}>{ins.text}</div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
            <GlassCard style={{ marginTop: 16 }} glow={T.accent.cyanGlow}>
              <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{isRTL ? 'סיכום AI' : 'AI Executive Summary'}</div>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.8 }}>
                {isRTL
                  ? `הסוחר מראה משמעת גבוהה (100% עמידה בכללים) עם יתרון ברור בשורטים. פקטור רווח ${stats.profitFactor.toFixed(2)} מצביע על יתרון חיובי, אך ${stats.winRate.toFixed(0)}% הצלחה דורש ניהול סיכון קפדני. הסיכון העיקרי — מסחר יתר ב-18/02 (3 עסקאות, הפסד כולל). המלצה: הגבל ל-2 עסקאות/יום, הפחת מינוף ב-ALGO, שמור סטייה < 0.1R.`
                  : `High discipline (100% rule adherence) with a clear short-side edge. Profit factor ${stats.profitFactor.toFixed(2)} shows positive expectancy, but ${stats.winRate.toFixed(0)}% win rate requires strict risk management. Key risk: overtrading on Feb 18 (3 trades, net loss). Limit to 2 trades/day, reduce ALGO leverage, keep deviation < 0.1R.`}
              </div>
            </GlassCard>
          </>}

          {/* ══════ FEATURES MANIFEST ══════ */}
          {page === 'features' && <>
            <div style={{ fontSize: 12, color: T.text.secondary, marginBottom: 16 }}>{isRTL ? '130+ תכונות מיושמות ומתוכננות' : '130+ implemented and planned features'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {FEATURES.map((cat, ci) => (
                <GlassCard key={ci}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.accent.cyan, marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>{cat.cat} <span style={{ fontSize: 10, color: T.text.dim, fontWeight: 400 }}>({cat.items.length})</span></div>
                  {cat.items.map((item, ii) => {
                    const ph2 = item.includes('Phase 2');
                    return (<div key={ii} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', fontSize: 11 }}><div style={{ width: 5, height: 5, borderRadius: '50%', background: ph2 ? T.text.dim : T.accent.green, flexShrink: 0 }} /><span style={{ color: ph2 ? T.text.dim : T.text.secondary }}>{item}</span></div>);
                  })}
                </GlassCard>
              ))}
            </div>
            <div style={{ marginTop: 18, textAlign: 'center', color: T.text.dim, fontSize: 11 }}>
              {isRTL ? 'סה"כ' : 'Total'}: {FEATURES.reduce((s, c) => s + c.items.length, 0)} {isRTL ? 'תכונות' : 'features'} •{' '}
              {FEATURES.reduce((s, c) => s + c.items.filter(i => !i.includes('Phase 2')).length, 0)} {isRTL ? 'מיושמות' : 'implemented'} •{' '}
              {FEATURES.reduce((s, c) => s + c.items.filter(i => i.includes('Phase 2')).length, 0)} {isRTL ? 'מתוכננות' : 'Phase 2'}
            </div>
          </>}

        </div>
      </main>
    </div>
  );
};

export default Index;
