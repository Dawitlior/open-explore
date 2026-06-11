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
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip,
  XAxis, YAxis, ZAxis, ReferenceLine,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';
import { getEffectiveR, sumDailyR } from '@/lib/r-multiple';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { RProxyBanner } from './RProxyBanner';
import { useLang } from '@/hooks/use-lang';

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
  const { lang } = useLang();
  const isRTL = lang === 'he';
  const t = (he: string, en: string) => (isRTL ? he : en);
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

  /* ── 9. Position size vs P&L (carries both $ and R) ── */
  const sizePnl = useMemo(() =>
    trades.map(t => ({ size: t.positionSize || 0, pnl: t.pnl, r: getEffectiveR(t), win: t.winLoss === 'Win' })),
  [trades]);



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

  // R-mode guard: if no R-eligible trades exist, the entire chart grid is suppressed
  // (charts driven by R-series would render as flat/empty). Banner explains, no empty gaps.
  const rModeBlocked = !isMoney && rEligibleCount === 0;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ marginTop: 20 }}>
      {!isMoney && <RProxyBanner T={T} isRTL={isRTL} compact rEligibleCount={rEligibleCount} totalCount={totalCount} />}
      {rModeBlocked ? (
        <GlassCard T={T} style={{ padding: 24, textAlign: 'center', marginTop: 12 }}>
          <div style={{ fontSize: 13, color: T.text.primary, fontWeight: 700, marginBottom: 6 }}>
            {t('אין נתוני R זמינים — כל הוויג׳טים מוסתרים', 'No R data available — all widgets hidden')}
          </div>
          <div style={{ fontSize: 11, color: T.text.muted, lineHeight: 1.55 }}>
            {t('אף עסקה לא כוללת Stop Loss תקף. עבור למצב MONEY (כפתור $) כדי לראות את כל הוויג׳טים מבוססי P&L.', 'No trade includes a valid Stop Loss. Switch to MONEY mode ($ button) to view all P&L-based widgets.')}
          </div>
        </GlassCard>
      ) : (
        <>
      <div style={sectionStyle}>{t('◆ QUANT LAB · מעבדת מחקר מתקדמת', '◆ QUANT LAB · Advanced Research Lab')}</div>

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

      {/* Row: Cumulative R + Rolling Calmar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12, marginBottom: 12 }}>
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

      {/* Row: Avg W vs L + Streak distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12, marginBottom: 12 }}>
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

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>התפלגות אורך רצפים</div>
          <ResponsiveContainer width="100%" height={240}>
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

      {/* Row: Position size vs P&L + Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>גודל פוזיציה מול P&L</div>
          <ResponsiveContainer width="100%" height={240}>
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
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>פיצול לפי סשן (אסיה / לונדון / ניו-יורק)</div>
          <ResponsiveContainer width="100%" height={240}>
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
      </div>

      {/* Row: Daily step equity (full-width) */}
      <GlassCard T={T} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>הון יומי מצטבר (מדרגות)</div>
        <ResponsiveContainer width="100%" height={240}>
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
        </>
      )}
    </div>
  );
};




export const AnalyticsQuantLab = memo(AnalyticsQuantLab_Impl);
export default AnalyticsQuantLab;
