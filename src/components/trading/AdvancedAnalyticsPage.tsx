import { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart } from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import { GlassCard, MetricCard, TradingBadge } from './TradingUI';
import { ChartWrapper, EXPLANATIONS } from './ChartWrapper';
import { LazyChart } from './LazyChart';
import type { ChartExplanation } from './ChartWrapper';

interface AdvancedAnalyticsPageProps {
  T: TradingTheme;
  isRTL: boolean;
  isAlpha: boolean;
  trades: Trade[];
  stats: TradingStats;
  privacyMode: boolean;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
}

export const AdvancedAnalyticsPage = ({ T, isRTL, isAlpha, trades, stats, privacyMode, onExplainClick }: AdvancedAnalyticsPageProps) => {
  const tt = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.primary, fontSize: 12, boxShadow: T.shadow.elevated, padding: '8px 12px' };

  // Streak analysis
  const streaks = useMemo(() => {
    const result: Array<{ type: 'Win' | 'Loss'; length: number; totalR: number; totalPnl: number; startId: number; endId: number }> = [];
    let current: typeof result[0] | null = null;
    trades.forEach(t => {
      const type = t.winLoss === 'Win' ? 'Win' : 'Loss';
      if (t.winLoss === 'Break Even') return;
      if (current && current.type === type) {
        current.length++;
        current.totalR += t.returnR;
        current.totalPnl += t.pnl;
        current.endId = t.id;
      } else {
        if (current) result.push(current);
        current = { type, length: 1, totalR: t.returnR, totalPnl: t.pnl, startId: t.id, endId: t.id };
      }
    });
    if (current) result.push(current);
    return result;
  }, [trades]);

  // R-multiple distribution buckets
  const rBuckets = useMemo(() => {
    const buckets: Record<string, number> = { '<-2R': 0, '-2 to -1R': 0, '-1 to 0R': 0, '0 to 1R': 0, '1 to 2R': 0, '2 to 3R': 0, '3R+': 0 };
    trades.forEach(t => {
      const r = t.returnR;
      if (r < -2) buckets['<-2R']++;
      else if (r < -1) buckets['-2 to -1R']++;
      else if (r < 0) buckets['-1 to 0R']++;
      else if (r < 1) buckets['0 to 1R']++;
      else if (r < 2) buckets['1 to 2R']++;
      else if (r < 3) buckets['2 to 3R']++;
      else buckets['3R+']++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count, pct: trades.length > 0 ? (count / trades.length) * 100 : 0 }));
  }, [trades]);

  // Setup performance table
  const setupPerf = useMemo(() => {
    const map: Record<string, { coin: string; trades: number; wins: number; totalPnl: number; totalR: number; avgRisk: number }> = {};
    trades.forEach(t => {
      if (!map[t.coin]) map[t.coin] = { coin: t.coin, trades: 0, wins: 0, totalPnl: 0, totalR: 0, avgRisk: 0 };
      map[t.coin].trades++;
      map[t.coin].totalPnl += t.pnl;
      map[t.coin].totalR += t.returnR;
      map[t.coin].avgRisk += t.risk;
      if (t.winLoss === 'Win') map[t.coin].wins++;
    });
    return Object.values(map).map(s => ({
      ...s,
      winRate: (s.wins / s.trades) * 100,
      avgR: s.totalR / s.trades,
      avgRisk: s.avgRisk / s.trades,
      expectancyR: (() => {
        const coinTrades = trades.filter(tr => tr.coin === s.coin);
        const w = coinTrades.filter(tr => tr.winLoss === 'Win');
        const l = coinTrades.filter(tr => tr.winLoss === 'Loss');
        const wr = w.length / coinTrades.length;
        const lr = l.length / coinTrades.length;
        const awr = w.length > 0 ? w.reduce((sum, tr) => sum + Math.abs(tr.returnR), 0) / w.length : 0;
        const alr = l.length > 0 ? l.reduce((sum, tr) => sum + Math.abs(tr.returnR), 0) / l.length : 0;
        return (wr * awr) - (lr * alr);
      })(),
    })).sort((a, b) => b.trades - a.trades);
  }, [trades]);

  // Time-based performance (hour of day)
  const hourPerf = useMemo(() => {
    const map: Record<number, { hour: number; trades: number; wins: number; totalR: number }> = {};
    trades.forEach(t => {
      try {
        const h = new Date(t.date.replace(' ', 'T')).getHours();
        if (!map[h]) map[h] = { hour: h, trades: 0, wins: 0, totalR: 0 };
        map[h].trades++;
        map[h].totalR += t.returnR;
        if (t.winLoss === 'Win') map[h].wins++;
      } catch { /* skip */ }
    });
    return Object.values(map).sort((a, b) => a.hour - b.hour).map(h => ({
      ...h,
      label: `${h.hour.toString().padStart(2, '0')}:00`,
      winRate: (h.wins / h.trades) * 100,
      avgR: h.totalR / h.trades,
    }));
  }, [trades]);

  // Key statistics
  const keyStats = useMemo(() => {
    const wins = trades.filter(t => t.winLoss === 'Win');
    const losses = trades.filter(t => t.winLoss === 'Loss');
    const payoffRatio = losses.length > 0 && wins.length > 0
      ? (wins.reduce((s, t) => s + Math.abs(t.returnR), 0) / wins.length) / (losses.reduce((s, t) => s + Math.abs(t.returnR), 0) / losses.length)
      : 0;
    const avgHoldingTrades = trades.length;
    return { payoffRatio, totalWins: wins.length, totalLosses: losses.length, breakEvens: trades.filter(t => t.winLoss === 'Break Even').length, avgHoldingTrades };
  }, [trades]);

  const PV = ({ children }: { children: React.ReactNode }) => (
    <span style={privacyMode ? { filter: 'blur(8px)', userSelect: 'none' } : {}}>{children}</span>
  );

  return (
    <>
      {/* ═══ KEY METRICS ROW ═══ */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <GlassCard T={T} style={{ flex: 1, minWidth: 120, padding: 12 }}>
          <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', marginBottom: 4 }}>{isRTL ? 'תוחלת' : 'Expectancy'} <span style={{ fontSize: 7, padding: '1px 3px', borderRadius: 3, background: `${T.accent.purple}15`, color: T.accent.purple, fontWeight: 700 }}>R</span></div>
          <PV><div style={{ fontSize: 20, fontWeight: 700, color: stats.expectancyR >= 0 ? T.accent.cyan : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{stats.expectancyR >= 0 ? '+' : ''}{stats.expectancyR.toFixed(3)}R</div></PV>
        </GlassCard>
        <MetricCard T={T} label={isRTL ? 'פקטור רווח' : 'Profit Factor'} value={stats.profitFactor} suffix="x" color={T.accent.blue} small />
        <MetricCard T={T} label={`${isRTL ? 'ממוצע רווח' : 'Avg Win'} (R)`} value={`+${stats.avgWinR.toFixed(2)}R`} color={T.accent.green} small />
        <MetricCard T={T} label={`${isRTL ? 'ממוצע הפסד' : 'Avg Loss'} (R)`} value={`-${stats.avgLossR.toFixed(2)}R`} color={T.accent.red} small />
        <MetricCard T={T} label={isRTL ? 'נסיגה מקס' : 'Max DD'} value={`${stats.maxDrawdown.toFixed(1)}%`} color={T.accent.orange} small />
      </div>

      {/* ═══ DETAILED STATISTICS TABLE ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isRTL ? 'סטטיסטיקות מפורטות' : 'Detailed Statistics'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, padding: '0 1px 1px' }}>
          {[
            { l: isRTL ? 'סה"כ עסקאות' : 'Total Trades', v: String(stats.totalTrades), c: T.text.primary },
            { l: isRTL ? 'רווחים' : 'Wins', v: String(keyStats.totalWins), c: T.accent.green },
            { l: isRTL ? 'הפסדים' : 'Losses', v: String(keyStats.totalLosses), c: T.accent.red },
            { l: isRTL ? 'ניטרלי' : 'Break Even', v: String(keyStats.breakEvens), c: T.accent.orange },
            { l: isRTL ? 'אחוז הצלחה' : 'Win Rate', v: `${stats.winRate.toFixed(1)}%`, c: T.accent.green },
            { l: isRTL ? 'יחס תשלום' : 'Payoff Ratio', v: `${keyStats.payoffRatio.toFixed(2)}`, c: T.accent.blue },
            { l: isRTL ? 'עסקה הכי טובה' : 'Best Trade', v: `+${stats.bestTradeR.toFixed(2)}R`, c: T.accent.green },
            { l: isRTL ? 'עסקה הכי גרועה' : 'Worst Trade', v: `${stats.worstTradeR.toFixed(2)}R`, c: T.accent.red },
            { l: isRTL ? 'הפסדים רצופים מקס' : 'Max Consec Losses', v: String(stats.maxConsecLosses), c: stats.maxConsecLosses >= 4 ? T.accent.red : T.text.primary },
            { l: isRTL ? 'רצף נוכחי' : 'Current Streak', v: `${stats.currentStreak} ${stats.streakType}`, c: stats.streakType === 'Win' ? T.accent.green : T.accent.red },
            { l: isRTL ? 'שארפ' : 'Sharpe-like', v: stats.volatilityAdjustedExpectancy.toFixed(2), c: T.accent.purple },
            { l: isRTL ? 'קלי אופטימלי' : 'Kelly Optimal', v: `${stats.kellyOptimal.toFixed(1)}%`, c: T.accent.cyan },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 14px', background: T.bg.tertiary, borderBottom: `1px solid ${T.border.subtle}` }}>
              <div style={{ fontSize: 9, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.c, fontFamily: "'JetBrains Mono', monospace" }}>{s.v}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ═══ CHARTS ROW 1: R Distribution + Day Performance ═══ */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'התפלגות R' : 'R-Multiple Distribution'} explanation={EXPLANATIONS.rDistribution} unit="R" style={{ flex: 1, minWidth: 320 }}>
          <LazyChart height={210}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stats.rDist}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>{stats.rDist.map((d, i) => <Cell key={i} fill={d.r >= 0 ? T.accent.cyan : T.accent.red} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'ביצועים לפי יום' : 'Performance by Day'} explanation={EXPLANATIONS.coinPerformance} unit="$" style={{ flex: 1, minWidth: 260 }}>
          <LazyChart height={210}>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={stats.dayPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="day" tick={{ fill: T.text.dim, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{stats.dayPerf.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      </div>

      {/* ═══ CUMULATIVE P&L ═══ */}
      <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'רווח/הפסד מצטבר' : 'Cumulative P&L'} explanation={EXPLANATIONS.equityCurve} unit="$" style={{ marginBottom: 16 }}>
        <LazyChart height={210}>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={(() => { let c = 0; return trades.map(tr => ({ id: tr.id, cum: (c += tr.pnl), pnl: tr.pnl })); })()}>
              <defs><linearGradient id="cGa" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.55} /><stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.05} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="id" tick={{ fill: T.text.dim, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <Area type="monotone" dataKey="cum" fill="url(#cGa)" stroke={T.accent.cyan} strokeWidth={2} />
              <Bar dataKey="pnl" barSize={18} radius={[3, 3, 0, 0]}>{trades.map((tr, i) => <Cell key={i} fill={tr.pnl >= 0 ? `${T.accent.green}60` : `${T.accent.red}60`} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </LazyChart>
      </ChartWrapper>

      {/* ═══ R-MULTIPLE DISTRIBUTION BUCKETS ═══ */}
      <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'התפלגות R לפי טווחים' : 'R-Multiple Distribution Buckets'} explanation={EXPLANATIONS.rDistribution} unit="%" style={{ marginBottom: 16 }}>
        <LazyChart height={180}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
              <XAxis dataKey="bucket" tick={{ fill: T.text.dim, fontSize: 9 }} />
              <YAxis tick={{ fill: T.text.dim, fontSize: 9 }} />
              <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(0)} trades`} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {rBuckets.map((b, i) => <Cell key={i} fill={b.bucket.startsWith('-') || b.bucket.startsWith('<') ? T.accent.red : T.accent.cyan} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </LazyChart>
      </ChartWrapper>

      {/* ═══ SETUP PERFORMANCE TABLE ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px', fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isRTL ? 'ביצועים לפי סטאפ' : 'Setup Performance Analysis'}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: T.bg.tertiary }}>
                {[isRTL ? 'סטאפ' : 'Setup', isRTL ? 'עסקאות' : 'Trades', isRTL ? 'הצלחה' : 'Win %', isRTL ? 'P&L' : 'P&L', isRTL ? 'תוחלת R' : 'EV (R)', isRTL ? 'ממוצע R' : 'Avg R', isRTL ? 'סיכון ממוצע' : 'Avg Risk'].map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', textAlign: isRTL ? 'right' : 'left', color: T.text.muted, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', borderBottom: `1px solid ${T.border.medium}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setupPerf.map((s, idx) => (
                <tr key={s.coin} style={{ background: idx % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: T.accent.cyan }}>{s.coin}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}>{s.trades}</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontWeight: 600, color: s.winRate >= 50 ? T.accent.green : T.accent.red }}>{s.winRate.toFixed(0)}%</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.totalPnl >= 0 ? T.accent.green : T.accent.red }}>
                    <PV>{s.totalPnl >= 0 ? '+' : ''}${s.totalPnl.toFixed(2)}</PV>
                  </td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: s.expectancyR >= 0 ? T.accent.cyan : T.accent.red }}>{s.expectancyR >= 0 ? '+' : ''}{s.expectancyR.toFixed(3)}R</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace", color: s.avgR >= 0 ? T.accent.green : T.accent.red }}>{s.avgR >= 0 ? '+' : ''}{s.avgR.toFixed(2)}R</td>
                  <td style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border.subtle}`, fontFamily: "'JetBrains Mono', monospace" }}><PV>${s.avgRisk.toFixed(2)}</PV></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ═══ TIME-BASED ANALYSIS ═══ */}
      {hourPerf.length > 0 && (
        <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'ביצועים לפי שעה' : 'Performance by Hour'} explanation={EXPLANATIONS.coinPerformance} unit="R" style={{ marginBottom: 16 }}>
          <LazyChart height={180}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                <XAxis dataKey="label" tick={{ fill: T.text.dim, fontSize: 9 }} />
                <YAxis tick={{ fill: T.text.dim, fontSize: 9 }} />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="avgR" radius={[4, 4, 0, 0]}>{hourPerf.map((h, i) => <Cell key={i} fill={h.avgR >= 0 ? T.accent.green : T.accent.red} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </LazyChart>
        </ChartWrapper>
      )}

      {/* ═══ STREAK ANALYSIS ═══ */}
      <GlassCard T={T} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {isRTL ? 'ניתוח רצפים' : 'Streak Analysis'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {streaks.map((s, i) => (
            <div key={i} style={{ padding: '8px 12px', background: s.type === 'Win' ? `${T.accent.green}10` : `${T.accent.red}10`, border: `1px solid ${s.type === 'Win' ? T.accent.green : T.accent.red}20`, borderRadius: 8, minWidth: 80, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.type === 'Win' ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{s.length}</div>
              <div style={{ fontSize: 9, color: T.text.dim }}>{s.type === 'Win' ? '🟢' : '🔴'} #{s.startId}→{s.endId}</div>
              <div style={{ fontSize: 10, color: T.text.secondary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{s.totalR >= 0 ? '+' : ''}{s.totalR.toFixed(2)}R</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ═══ MONTHLY PERFORMANCE ═══ */}
      <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'ביצועים חודשיים' : 'Monthly Performance'} explanation={EXPLANATIONS.monthlyPerformance} unit="R" style={{ marginBottom: 16 }}>
        {stats.monthlyPerf.map((mp, i) => (
          <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: mp.pnl >= 0 ? `${T.accent.green}08` : `${T.accent.red}08`, border: `1px solid ${mp.pnl >= 0 ? T.accent.green : T.accent.red}15`, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: T.text.secondary }}>{mp.month}</span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <PV><span style={{ fontSize: 13, fontWeight: 700, color: mp.pnl >= 0 ? T.accent.green : T.accent.red, fontFamily: "'JetBrains Mono', monospace" }}>{mp.pnl >= 0 ? '+' : ''}${mp.pnl.toFixed(2)}</span></PV>
                <span style={{ fontSize: 11, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>EV: {mp.expectancyR >= 0 ? '+' : ''}{mp.expectancyR.toFixed(2)}R</span>
              </div>
            </div>
            <div style={{ fontSize: 9, color: T.text.dim, marginTop: 2 }}>{mp.trades} trades • WR: {mp.winRate.toFixed(0)}% • PF: {mp.profitFactor.toFixed(2)}x</div>
          </div>
        ))}
      </ChartWrapper>

      {/* ═══ ALPHA: Advanced Charts ═══ */}
      {isAlpha && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'מפת נסיגה' : 'Drawdown Depth Map'} explanation={EXPLANATIONS.drawdown} unit="%" style={{ flex: 1, minWidth: 280 }}>
            <LazyChart height={180}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={(() => { let p = 0; return stats.equityCurve.map(e => { if (e.balance > p) p = e.balance; return { trade: e.trade, dd: p > 0 ? -((p - e.balance) / p * 100) : 0 }; }); })()}>
                  <defs><linearGradient id="ddGAn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.red} stopOpacity={0.05} /><stop offset="100%" stopColor={T.accent.red} stopOpacity={0.6} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                  <XAxis dataKey="trade" tick={{ fill: T.text.dim, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} domain={['dataMin', 0]} />
                  <Tooltip contentStyle={tt} formatter={(v: number) => `${v.toFixed(2)}%`} />
                  <Area type="monotone" dataKey="dd" stroke={T.accent.red} fill="url(#ddGAn)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </LazyChart>
          </ChartWrapper>
          <ChartWrapper T={T} onExplainClick={onExplainClick} title={isRTL ? 'תוחלת מתגלגלת (R)' : 'Rolling Expectancy (R)'} explanation={EXPLANATIONS.expectancy} unit="R" style={{ flex: 1, minWidth: 280 }}>
            <LazyChart height={180}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={stats.rollingExpectancyR}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border.subtle} />
                  <XAxis dataKey="tradeId" tick={{ fill: T.text.dim, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.dim, fontSize: 10 }} />
                  <Tooltip contentStyle={tt} />
                  <Line type="monotone" dataKey="expectancyR" stroke={T.accent.cyan} strokeWidth={2} dot={{ fill: T.accent.cyan, r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </LazyChart>
          </ChartWrapper>
        </div>
      )}
    </>
  );
};
