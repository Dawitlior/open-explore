/**
 * 🔬 ANALYTICS QUANT LAB
 * ─────────────────────────────────────────
 * Advanced statistical visualizations rendered
 * below the main Analytics deck. Pure functions
 * of the existing trade dataset — no extra fields
 * required, no fabricated numbers.
 *
 * Charts (10+):
 *  1. R-Multiple histogram + bell curve overlay
 *  2. Avg Win vs Avg Loss (with payoff line)
 *  3. Cumulative R curve
 *  4. Rolling Calmar (window 20)
 *  5. Recovery factor card
 *  6. Risk-bucket performance bars
 *  7. Win/Loss streak distribution (frequency)
 *  8. Top winners / Top losers tables
 *  9. Position-size vs P&L scatter
 * 10. Monte-Carlo equity envelope (shuffled paths)
 * 11. Session split (Asia / London / NY)
 * 12. Day-by-day step equity
 */

import { useMemo, memo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip,
  XAxis, YAxis, ZAxis, ReferenceLine,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';
import { getEffectiveR, sumDailyR } from '@/lib/r-multiple';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { RProxyBanner } from './RProxyBanner';

type DayRPoint = { i: number; day: string; total: number; cum: number; trades: Trade[] };

interface Props {
  T: TradingTheme;
  trades: Trade[];
  privacyMode: boolean;
}

const sessionOf = (h: number): 'Asia' | 'London' | 'NY' | 'Off' => {
  if (h >= 0 && h < 8) return 'Asia';
  if (h >= 8 && h < 13) return 'London';
  if (h >= 13 && h < 21) return 'NY';
  return 'Off';
};

const AnalyticsQuantLab_Impl = ({ T, trades: _allTrades, privacyMode }: Props) => {
  // 🔀 Dual-Currency Engine: filtered dataset + adaptive helpers
  const { visibleTrades: trades, isMoney, formatValue: fmtVal, formatAxis: fmtAxis, rEligibleCount, totalCount } = useVisibleTrades(_allTrades);
  const tt = {
    background: T.bg.card,
    border: `1px solid ${T.border.medium}`,
    borderRadius: 10,
    color: T.text.primary,
    fontSize: 12,
    boxShadow: T.shadow.elevated,
    padding: '8px 12px',
  };

  const PV = ({ children }: { children: React.ReactNode }) => (
    <span style={privacyMode ? { filter: 'blur(8px)', userSelect: 'none' } : {}}>{children}</span>
  );

  const dailyRSeries = useMemo<DayRPoint[]>(() => {
    const byDay = new Map<string, Trade[]>();
    for (const t of trades) {
      const key = (t.date || '').slice(0, 10);
      if (!key) continue;
      const arr = byDay.get(key) || [];
      arr.push(t);
      byDay.set(key, arr);
    }
    let cum = 0;
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, dayTrades], i) => {
      const { total } = sumDailyR(dayTrades);
      cum += total;
      return { i: i + 1, day: day.slice(5), total, cum: +cum.toFixed(3), trades: dayTrades };
    });
  }, [trades]);


  /* ── 1. R-Multiple histogram + bell curve overlay ── */
  const rHisto = useMemo(() => {
    if (trades.length === 0) return [] as { bin: string; mid: number; count: number; bell: number }[];
    const rs = trades.map(t => getEffectiveR(t));
    const min = Math.floor(Math.min(...rs) * 2) / 2;
    const max = Math.ceil(Math.max(...rs) * 2) / 2;
    const step = 0.5;
    const bins: { bin: string; mid: number; count: number; bell: number }[] = [];
    for (let v = min; v <= max; v += step) {
      bins.push({ bin: `${v.toFixed(1)}`, mid: v + step / 2, count: 0, bell: 0 });
    }
    rs.forEach(r => {
      const idx = Math.min(bins.length - 1, Math.max(0, Math.floor((r - min) / step)));
      bins[idx].count++;
    });
    const mean = rs.reduce((s, r) => s + r, 0) / rs.length;
    const variance = rs.reduce((s, r) => s + (r - mean) ** 2, 0) / rs.length;
    const sd = Math.sqrt(variance) || 0.001;
    const peak = Math.max(...bins.map(b => b.count));
    bins.forEach(b => {
      const z = (b.mid - mean) / sd;
      b.bell = peak * Math.exp(-0.5 * z * z);
    });
    return bins;
  }, [trades]);

  /* ── 2. Avg Win vs Avg Loss (carries BOTH $ and R) ── */
  const avgWL = useMemo(() => {
    const w = trades.filter(t => t.winLoss === 'Win');
    const l = trades.filter(t => t.winLoss === 'Loss');
    const aw$ = w.length ? w.reduce((s, t) => s + t.pnl, 0) / w.length : 0;
    const al$ = l.length ? l.reduce((s, t) => s + t.pnl, 0) / l.length : 0;
    const awR = w.length ? w.reduce((s, t) => s + getEffectiveR(t), 0) / w.length : 0;
    const alR = l.length ? l.reduce((s, t) => s + getEffectiveR(t), 0) / l.length : 0;
    return [
      { name: 'ניצחון ממוצע', money: aw$, r: awR, color: T.accent.green },
      { name: 'הפסד ממוצע', money: al$, r: alR, color: T.accent.red },
    ];
  }, [trades, T]);

  /* ── 3. Cumulative R (and cumulative $ for MONEY mode) ── */
  const cumR = useMemo(() => {
    let cumMoney = 0;
    return dailyRSeries.map(({ i, day, cum, trades: dayTrades }) => {
      cumMoney += dayTrades.reduce((s, t) => s + t.pnl, 0);
      return { i, day, r: cum, money: +cumMoney.toFixed(2) };
    });
  }, [dailyRSeries]);


  /* ── 4. Rolling Calmar (mean R / max DD in window) ── */
  const rollingCalmar = useMemo(() => {
    const W = 20;
    const out: { i: number; calmar: number }[] = [];
    for (let i = 0; i < dailyRSeries.length; i++) {
      const start = Math.max(0, i - W + 1);
      const slice = dailyRSeries.slice(start, i + 1);
      if (slice.length < 5) { out.push({ i: i + 1, calmar: 0 }); continue; }
      const mean = slice.reduce((s, d) => s + d.total, 0) / slice.length;
      let cum = 0, peak = 0, dd = 0;
      slice.forEach(d => { cum += d.total; if (cum > peak) peak = cum; dd = Math.max(dd, peak - cum); });
      out.push({ i: i + 1, calmar: dd > 0 ? +(mean / dd).toFixed(3) : 0 });
    }
    return out;
  }, [dailyRSeries]);

  /* ── 5. Recovery factor (gross profit / max DD $) ── */
  const recovery = useMemo(() => {
    const gp = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    let cum = 0, peak = 0, mdd = 0;
    trades.forEach(t => { cum += t.pnl; if (cum > peak) peak = cum; mdd = Math.max(mdd, peak - cum); });
    return mdd > 0 ? gp / mdd : gp > 0 ? Infinity : 0;
  }, [trades]);

  /* ── 6. Risk-bucket performance ── */
  const riskBuckets = useMemo(() => {
    const buckets = [
      { label: '<0.5%', min: 0, max: 0.5 },
      { label: '0.5-1%', min: 0.5, max: 1 },
      { label: '1-2%', min: 1, max: 2 },
      { label: '2-3%', min: 2, max: 3 },
      { label: '>3%', min: 3, max: Infinity },
    ];
    return buckets.map(b => {
      const slice = trades.filter(t => t.riskPct >= b.min && t.riskPct < b.max);
      const wins = slice.filter(t => t.winLoss === 'Win').length;
      return {
        label: b.label,
        n: slice.length,
        wr: slice.length ? +((wins / slice.length) * 100).toFixed(1) : 0,
        avgR: slice.length ? +(slice.reduce((s, t) => s + getEffectiveR(t), 0) / slice.length).toFixed(2) : 0,
      };
    });
  }, [trades]);

  /* ── 7. Streak distribution ── */
  const streakDist = useMemo(() => {
    const wMap: Record<number, number> = {};
    const lMap: Record<number, number> = {};
    let cur: { type: 'W' | 'L'; len: number } | null = null;
    trades.forEach(t => {
      if (t.winLoss === 'Break Even') return;
      const ty: 'W' | 'L' = t.winLoss === 'Win' ? 'W' : 'L';
      if (cur && cur.type === ty) cur.len++;
      else {
        if (cur) (cur.type === 'W' ? wMap : lMap)[cur.len] = ((cur.type === 'W' ? wMap : lMap)[cur.len] || 0) + 1;
        cur = { type: ty, len: 1 };
      }
    });
    if (cur) (cur.type === 'W' ? wMap : lMap)[cur.len] = ((cur.type === 'W' ? wMap : lMap)[cur.len] || 0) + 1;
    const maxLen = Math.max(0, ...Object.keys(wMap).map(Number), ...Object.keys(lMap).map(Number));
    const out: { len: string; wins: number; losses: number }[] = [];
    for (let i = 1; i <= maxLen; i++) out.push({ len: String(i), wins: wMap[i] || 0, losses: lMap[i] || 0 });
    return out;
  }, [trades]);

  /* ── 8. Top winners / losers ── */
  const topW = useMemo(() => [...trades].sort((a, b) => getEffectiveR(b) - getEffectiveR(a)).slice(0, 5), [trades]);
  const topL = useMemo(() => [...trades].sort((a, b) => getEffectiveR(a) - getEffectiveR(b)).slice(0, 5), [trades]);

  /* ── 9. Position size vs P&L (carries both $ and R) ── */
  const sizePnl = useMemo(() =>
    trades.map(t => ({ size: t.positionSize || 0, pnl: t.pnl, r: getEffectiveR(t), win: t.winLoss === 'Win' })),
  [trades]);

  /* ── 10. Monte-Carlo envelope (shuffled equity paths) ── */
  const mcEnvelope = useMemo(() => {
    if (trades.length < 5) return [] as { i: number; p10: number; p50: number; p90: number }[];
    const N = 60;
    const rs = trades.map(t => getEffectiveR(t));
    const paths: number[][] = [];
    const rand = (seed: number) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
    for (let p = 0; p < N; p++) {
      const r = rand(p + 1);
      const shuffled = [...rs].sort(() => r() - 0.5);
      let c = 0; const path: number[] = [];
      shuffled.forEach(v => { c += v; path.push(c); });
      paths.push(path);
    }
    const out: { i: number; p10: number; p50: number; p90: number }[] = [];
    for (let i = 0; i < trades.length; i++) {
      const vals = paths.map(p => p[i]).sort((a, b) => a - b);
      out.push({
        i: i + 1,
        p10: +vals[Math.floor(N * 0.1)].toFixed(2),
        p50: +vals[Math.floor(N * 0.5)].toFixed(2),
        p90: +vals[Math.floor(N * 0.9)].toFixed(2),
      });
    }
    return out;
  }, [trades]);

  /* ── 11. Session split ── */
  const sessions = useMemo(() => {
    const m: Record<string, { n: number; pnl: number; r: number; wins: number }> = {
      Asia: { n: 0, pnl: 0, r: 0, wins: 0 }, London: { n: 0, pnl: 0, r: 0, wins: 0 },
      NY: { n: 0, pnl: 0, r: 0, wins: 0 }, Off: { n: 0, pnl: 0, r: 0, wins: 0 },
    };
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const s = sessionOf(d.getHours());
        m[s].n++; m[s].pnl += t.pnl; m[s].r += getEffectiveR(t);
        if (t.winLoss === 'Win') m[s].wins++;
      } catch { /* skip */ }
    });
    return Object.entries(m).map(([k, v]) => ({
      session: k, n: v.n, pnl: +v.pnl.toFixed(2), r: +v.r.toFixed(3),
      wr: v.n ? +((v.wins / v.n) * 100).toFixed(1) : 0,
    }));
  }, [trades]);

  /* ── 12. Day-by-day equity step (carries both $ and R) ── */
  const dailyEq = useMemo(() => {
    const m = new Map<string, { p: number; r: number }>();
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const k = d.toISOString().slice(0, 10);
        const cur = m.get(k) || { p: 0, r: 0 };
        cur.p += t.pnl; cur.r += getEffectiveR(t);
        m.set(k, cur);
      } catch { /* skip */ }
    });
    const arr = Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
    let cum = 0, cumR = 0;
    return arr.map(([day, v]) => {
      cum += v.p; cumR += v.r;
      return { day: day.slice(5), cum: +cum.toFixed(2), cumR: +cumR.toFixed(3), daily: +v.p.toFixed(2), dailyR: +v.r.toFixed(3) };
    });
  }, [trades]);

  if (trades.length === 0) return null;

  const sectionStyle = {
    fontSize: 11, color: T.accent.purple,
    textTransform: 'uppercase' as const, letterSpacing: '0.18em',
    margin: '24px 0 12px', fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  };

  return (
    <div dir="rtl" style={{ marginTop: 20 }}>
      {!isMoney && <RProxyBanner T={T} isRTL compact rEligibleCount={rEligibleCount} totalCount={totalCount} />}
      <div style={sectionStyle}>◆ QUANT LAB · מעבדת מחקר מתקדמת</div>

      {/* Recovery factor + simple cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
        <GlassCard T={T} style={{ padding: 12 }}>
          <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Recovery Factor</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
            {isFinite(recovery) ? recovery.toFixed(2) : '∞'}
          </div>
          <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>רווח ברוטו / נסיגה מקס</div>
        </GlassCard>
        <GlassCard T={T} style={{ padding: 12 }}>
          <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Best Session</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.accent.green, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
            {sessions.filter(s => s.n).sort((a, b) => (isMoney ? b.pnl - a.pnl : b.r - a.r))[0]?.session || '—'}
          </div>
          <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>סשן הכי רווחי</div>
        </GlassCard>
        <GlassCard T={T} style={{ padding: 12 }}>
          <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Trades / Day</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.accent.blue, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
            {dailyEq.length ? (trades.length / dailyEq.length).toFixed(1) : '0'}
          </div>
          <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>תדירות יומית</div>
        </GlassCard>
        <GlassCard T={T} style={{ padding: 12 }}>
          <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Active Days</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.accent.purple, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
            {dailyEq.length}
          </div>
          <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>ימי מסחר פעילים</div>
        </GlassCard>
      </div>

      {/* Row: R-Histogram + Avg W vs L */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            התפלגות R + עקומת פעמון
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={rHisto}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="bin" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {rHisto.map((b, i) => (
                  <Cell key={i} fill={b.mid >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.75} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="bell" stroke={T.accent.cyan} strokeWidth={2} dot={false} />
              <ReferenceLine x="0.0" stroke={T.text.muted} strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            ניצחון ממוצע מול הפסד ממוצע
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={avgWL}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: T.text.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => fmtAxis(v)} />
              <Tooltip contentStyle={tt} formatter={(v: number) => <PV>{fmtVal(v)}</PV>} />
              <ReferenceLine y={0} stroke={T.text.muted} />
              <Bar dataKey={isMoney ? 'money' : 'r'} radius={[6, 6, 0, 0]}>
                {avgWL.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Row: Cumulative R + Rolling Calmar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>{isMoney ? 'עקומת הון מצטבר ($)' : 'עקומת R מצטברת'}</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumR}>
              <defs>
                <linearGradient id="cumR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => fmtAxis(v)} />
              <Tooltip contentStyle={tt} formatter={(v: number) => fmtVal(v)} />
              <ReferenceLine y={0} stroke={T.text.muted} />
              <Area type="monotone" dataKey={isMoney ? 'money' : 'r'} stroke={T.accent.cyan} fill="url(#cumR)" strokeWidth={2.4} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>Calmar מתגלגל (חלון 20)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rollingCalmar}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={0} stroke={T.text.muted} />
              <Line type="monotone" dataKey="calmar" stroke={T.accent.orange} strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Row: Risk buckets + Streak distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>ביצועים לפי דלי סיכון</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskBuckets}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis yAxisId="L" tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
              <YAxis yAxisId="R" orientation="right" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <Bar yAxisId="L" dataKey="wr" radius={[4, 4, 0, 0]} fill={T.accent.green} />
              <Bar yAxisId="R" dataKey="avgR" radius={[4, 4, 0, 0]} fill={T.accent.purple} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>התפלגות אורך רצפים</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={streakDist}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="len" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <Bar dataKey="wins" stackId="a" fill={T.accent.green} radius={[0, 0, 0, 0]} />
              <Bar dataKey="losses" stackId="a" fill={T.accent.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Row: Position size vs P&L + Monte Carlo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>גודל פוזיציה מול P&L</div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="size" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis type="number" dataKey={isMoney ? 'pnl' : 'r'} tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => fmtAxis(v)} />
              <ZAxis range={[40, 140]} />
              <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} formatter={(v: number) => fmtVal(v)} />
              <ReferenceLine y={0} stroke={T.text.muted} />
              <Scatter data={sizePnl}>
                {sizePnl.map((d, i) => (
                  <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>Monte-Carlo · מעטפת תרחישים (60 מסלולים)</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={mcEnvelope}>
              <defs>
                <linearGradient id="mcBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.cyan} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={T.accent.cyan} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <Area type="monotone" dataKey="p90" stroke="none" fill="url(#mcBand)" />
              <Area type="monotone" dataKey="p10" stroke="none" fill={T.bg.primary} />
              <Line type="monotone" dataKey="p50" stroke={T.accent.cyan} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Row: Sessions + Daily step equity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>פיצול לפי סשן (אסיה / לונדון / ניו-יורק)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sessions}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="session" tick={{ fill: T.text.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => fmtAxis(v)} />
              <Tooltip contentStyle={tt} formatter={(v: number, n: string) => (n === 'pnl' || n === 'r') ? <PV>{fmtVal(v)}</PV> : `${v}${n === 'wr' ? '%' : ''}`} />
              <ReferenceLine y={0} stroke={T.text.muted} />
              <Bar dataKey={isMoney ? 'pnl' : 'r'} radius={[4, 4, 0, 0]}>
                {sessions.map((s, i) => <Cell key={i} fill={(isMoney ? s.pnl : s.r) >= 0 ? T.accent.green : T.accent.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>הון יומי מצטבר (מדרגות)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyEq}>
              <defs>
                <linearGradient id="dEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.green} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: T.text.muted, fontSize: 9 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => fmtAxis(v)} />
              <Tooltip contentStyle={tt} formatter={(v: number) => <PV>{fmtVal(v)}</PV>} />
              <Area type="stepAfter" dataKey={isMoney ? 'cum' : 'cumR'} stroke={T.accent.green} fill="url(#dEq)" strokeWidth={2.2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Top winners / losers tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 12 }}>
        {[
          { title: '🏆 חמשת הניצחונות הגדולים', data: topW, accent: T.accent.green },
          { title: '🩸 חמשת ההפסדים הגדולים', data: topL, accent: T.accent.red },
        ].map((box, bi) => (
          <GlassCard key={bi} T={T} style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: box.accent }}>{box.title}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: T.bg.tertiary }}>
                  {['#', 'נכס', 'תאריך', 'R', 'P&L'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'right', color: T.text.muted, fontSize: 10, fontWeight: 600, borderBottom: `1px solid ${T.border.medium}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {box.data.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{t.id}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: T.accent.cyan, fontWeight: 700 }}>{t.coin}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.muted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{(t.date || '').slice(0, 10)}</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: getEffectiveR(t) >= 0 ? T.accent.green : T.accent.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{getEffectiveR(t) >= 0 ? '+' : ''}{getEffectiveR(t).toFixed(2)}R</td>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: t.pnl >= 0 ? T.accent.green : T.accent.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}><PV>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</PV></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};


export const AnalyticsQuantLab = memo(AnalyticsQuantLab_Impl);
export default AnalyticsQuantLab;
