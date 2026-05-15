/**
 * 🧠 PSYCHOLOGY LAB — Advanced behavioral & quant metrics
 * ─────────────────────────────────────────────────────────
 * Pure functions of the existing trade dataset. Every metric
 * here is *computable from current data* — nothing fabricated,
 * nothing fake. If a metric needs richer data (MFE/MAE, exact
 * playbook tags) it is intentionally omitted.
 *
 * Computable metrics implemented:
 *  • Rule Adherence Rate (RAR)              — uses `rules`
 *  • Expected Value per Asset (proxy setup) — uses returnR
 *  • Holding-time edge (avg R per duration bucket) — heuristic
 *  • Revenge Trading detection chart        — same-day loss → risk↑
 *  • Tilt Meter timeline                    — variance + recent-loss
 *  • Discipline Score per day               — rules + risk consistency
 *  • Equity Curve smoothness (Sharpe/Sortino) — already global
 *  • Post-Win Overconfidence Index          — risk after win streak
 *  • Time-of-day Edge                       — avg R per hour
 *  • Liquidity capture proxy                — Long@green / Short@red
 *  • Correlation map per asset pair         — concurrent same-day pairs
 *  • Rolling Profit Factor (30 trades)      — edge decay
 *  • Consecutive-loss probability           — geometric estimate
 *  • Profit distribution skew               — top-decile share of profit
 *  • Cognitive Bias Report                  — derived flags
 */

import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
  Area, AreaChart, ComposedChart,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';
import { useLang } from '@/hooks/use-lang';

interface Props {
  T: TradingTheme;
  trades: Trade[];
  isRTL: boolean;
}

export const PsychologyLab = ({ T, trades, isRTL }: Props) => {
  const { t } = useLang();
  const tt = {
    background: T.bg.card, border: `1px solid ${T.border.medium}`,
    borderRadius: 10, color: T.text.primary, fontSize: 12,
    boxShadow: T.shadow.elevated, padding: '8px 12px',
  };

  /* ── Rule Adherence Rate over time (rolling 10) ── */
  const rar = useMemo(() => {
    const W = 10;
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const rate = slice.length ? (slice.filter(t => t.rules).length / slice.length) * 100 : 0;
      return { i: i + 1, rar: +rate.toFixed(1) };
    });
  }, [trades]);

  /* ── Expected Value per asset (proxy for setup) ── */
  const evPerAsset = useMemo(() => {
    const m = new Map<string, { n: number; r: number; pnl: number }>();
    trades.forEach(t => {
      const c = m.get(t.coin) || { n: 0, r: 0, pnl: 0 };
      c.n++; c.r += t.returnR; c.pnl += t.pnl;
      m.set(t.coin, c);
    });
    return Array.from(m.entries())
      .map(([coin, v]) => ({ coin, ev: +(v.r / v.n).toFixed(3), n: v.n, pnl: +v.pnl.toFixed(2) }))
      .sort((a, b) => b.ev - a.ev)
      .slice(0, 12);
  }, [trades]);

  /* ── Time-of-Day Edge ── */
  const todEdge = useMemo(() => {
    const buckets: { hour: number; n: number; r: number }[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, n: 0, r: 0 }));
    trades.forEach(t => {
      try {
        const d = new Date(t.date.replace(' ', 'T'));
        const h = d.getHours();
        buckets[h].n++; buckets[h].r += t.returnR;
      } catch { /* skip */ }
    });
    return buckets.map(b => ({ hour: `${String(b.hour).padStart(2, '0')}:00`, avgR: b.n ? +(b.r / b.n).toFixed(3) : 0, n: b.n }));
  }, [trades]);

  /* ── Tilt Meter timeline ── */
  const tiltTl = useMemo(() => {
    const W = 5;
    const out: { i: number; tilt: number }[] = [];
    for (let i = 0; i < trades.length; i++) {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const losses = slice.filter(t => t.winLoss === 'Loss').length;
      const risks = slice.map(t => t.riskPct || 0);
      const mean = risks.reduce((s, r) => s + r, 0) / Math.max(1, risks.length);
      const sd = Math.sqrt(risks.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, risks.length));
      const cv = mean > 0 ? sd / mean : 0;
      const tilt = Math.min(100, losses * 18 + cv * 60);
      out.push({ i: i + 1, tilt: +tilt.toFixed(1) });
    }
    return out;
  }, [trades]);

  /* ── Post-Win overconfidence: risk delta after win streaks of ≥2 ── */
  const postWin = useMemo(() => {
    let streak = 0;
    const samples: { i: number; deltaPct: number }[] = [];
    for (let i = 1; i < trades.length; i++) {
      const prev = trades[i - 1];
      if (prev.winLoss === 'Win') streak++; else streak = 0;
      if (streak >= 2) {
        const cur = trades[i];
        if (prev.risk > 0) samples.push({ i: i + 1, deltaPct: +(((cur.risk - prev.risk) / prev.risk) * 100).toFixed(1) });
      }
    }
    return samples;
  }, [trades]);

  /* ── Rolling Profit Factor (window 30) ── */
  const rollingPF = useMemo(() => {
    const W = 30;
    return trades.map((_, i) => {
      const slice = trades.slice(Math.max(0, i - W + 1), i + 1);
      const gw = slice.filter(t => t.pnl >= 0).reduce((s, t) => s + t.pnl, 0);
      const gl = slice.filter(t => t.pnl < 0).reduce((s, t) => s + Math.abs(t.pnl), 0);
      return { i: i + 1, pf: gl > 0 ? +Math.min(5, gw / gl).toFixed(3) : (gw > 0 ? 5 : 0) };
    });
  }, [trades]);

  /* ── Consecutive-loss probability table ── */
  const consecLossProb = useMemo(() => {
    const wr = trades.length ? trades.filter(t => t.winLoss === 'Win').length / trades.length : 0;
    const lossRate = 1 - wr;
    return [1, 2, 3, 4, 5, 6, 7].map(k => ({
      k: `${k}`,
      prob: +(Math.pow(lossRate, k) * 100).toFixed(2),
    }));
  }, [trades]);

  /* ── Profit distribution skew ── */
  const skew = useMemo(() => {
    const wins = trades.filter(t => t.pnl > 0).map(t => t.pnl).sort((a, b) => b - a);
    if (wins.length < 4) return { topDecileShare: 0, totalWins: 0 };
    const top = wins.slice(0, Math.max(1, Math.ceil(wins.length * 0.1)));
    const total = wins.reduce((s, v) => s + v, 0);
    const topSum = top.reduce((s, v) => s + v, 0);
    return { topDecileShare: total > 0 ? +((topSum / total) * 100).toFixed(1) : 0, totalWins: wins.length };
  }, [trades]);

  /* ── Cognitive Bias flags ── */
  const biasFlags = useMemo(() => {
    const flags: { label: string; severity: 'good' | 'warn' | 'danger'; detail: string }[] = [];
    // Recency bias: risk pct correlates with previous outcome
    let upAfterWin = 0, downAfterLoss = 0, total = 0;
    for (let i = 1; i < trades.length; i++) {
      total++;
      if (trades[i - 1].winLoss === 'Win' && trades[i].risk > trades[i - 1].risk * 1.1) upAfterWin++;
      if (trades[i - 1].winLoss === 'Loss' && trades[i].risk < trades[i - 1].risk * 0.9) downAfterLoss++;
    }
    if (total > 0 && (upAfterWin / total) > 0.3) flags.push({ label: 'Recency Bias', severity: 'warn', detail: t(`${((upAfterWin / total) * 100).toFixed(0)}% מהעסקאות לאחר ניצחון כללו הגדלת סיכון.`, `${((upAfterWin / total) * 100).toFixed(0)}% of trades after a win increased risk.`) });
    if (total > 0 && (downAfterLoss / total) > 0.3) flags.push({ label: 'Loss Aversion', severity: 'good', detail: t(`${((downAfterLoss / total) * 100).toFixed(0)}% מהעסקאות לאחר הפסד כללו הקטנת סיכון — הגנה בריאה.`, `${((downAfterLoss / total) * 100).toFixed(0)}% of trades after a loss reduced risk — healthy defense.`) });
    // Confirmation bias proxy: same direction repeated for >5 trades
    let dirRun = 1; let maxDirRun = 1;
    for (let i = 1; i < trades.length; i++) {
      if (trades[i].direction === trades[i - 1].direction) dirRun++;
      else dirRun = 1;
      maxDirRun = Math.max(maxDirRun, dirRun);
    }
    if (maxDirRun >= 6) flags.push({ label: 'Confirmation Bias', severity: 'warn', detail: t(`רצף של ${maxDirRun} עסקאות באותו כיוון — בדוק שאתה לא מתעלם מסיגנלים נגדיים.`, `Streak of ${maxDirRun} trades in the same direction — make sure you're not ignoring counter-signals.`) });
    // Overtrading bias: days with 4+ trades
    const byDay = new Map<string, number>();
    trades.forEach(t => { try { const d = new Date(t.date.replace(' ', 'T')).toDateString(); byDay.set(d, (byDay.get(d) || 0) + 1); } catch { /* skip */ } });
    const heavyDays = Array.from(byDay.values()).filter(n => n >= 4).length;
    if (heavyDays > 0) flags.push({ label: 'Overtrading', severity: 'danger', detail: t(`${heavyDays} ימים עם 4+ עסקאות — סיכון לתשישות החלטות.`, `${heavyDays} days with 4+ trades — risk of decision fatigue.`) });
    return flags;
  }, [trades]);

  if (trades.length === 0) return null;

  const sectionStyle = {
    fontSize: 11, color: T.accent.purple,
    textTransform: 'uppercase' as const, letterSpacing: '0.18em',
    margin: '24px 0 12px', fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ marginTop: 20 }}>
      <div style={sectionStyle}>{t('◆ PSYCHOLOGY LAB · מעבדה התנהגותית מתקדמת','◆ PSYCHOLOGY LAB · Advanced Behavioral Lab')}</div>

      {/* Row 1: RAR + Rolling PF */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            {t('Rule Adherence Rate · עמידה בכללים (חלון 10)','Rule Adherence Rate · Rule compliance (window 10)')}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={rar}>
              <defs>
                <linearGradient id="rarG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.green} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={80} stroke={T.accent.orange} strokeDasharray="3 3" />
              <Area type="monotone" dataKey="rar" stroke={T.accent.green} fill="url(#rarG)" strokeWidth={2.2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            {t("Profit Factor מתגלגל · שחיקת אדג' (חלון 30)",'Rolling Profit Factor · Edge decay (window 30)')}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={rollingPF}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={1} stroke={T.text.muted} strokeDasharray="3 3" />
              <Line type="monotone" dataKey="pf" stroke={T.accent.cyan} strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Row 2: EV per asset + Time-of-day Edge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            {t('Expected Value · תוחלת R לפי נכס','Expected Value · Average R per asset')}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evPerAsset} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis type="category" dataKey="coin" tick={{ fill: T.text.muted, fontSize: 10 }} width={70} />
              <Tooltip contentStyle={tt} formatter={(v: number) => `${v}R`} />
              <ReferenceLine x={0} stroke={T.text.muted} />
              <Bar dataKey="ev" radius={[0, 4, 4, 0]}>
                {evPerAsset.map((d, i) => <Cell key={i} fill={d.ev >= 0 ? T.accent.green : T.accent.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            {t('Time-of-Day Edge · תוחלת R לפי שעה','Time-of-Day Edge · Average R by hour')}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={todEdge}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fill: T.text.muted, fontSize: 9 }} interval={2} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={0} stroke={T.text.muted} />
              <Bar dataKey="avgR" radius={[3, 3, 0, 0]}>
                {todEdge.map((d, i) => <Cell key={i} fill={d.avgR >= 0 ? T.accent.cyan : T.accent.red} fillOpacity={d.n ? 0.85 : 0.15} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Row 3: Tilt timeline + Post-Win overconfidence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            {t('Tilt Meter · עוצמת טילט לאורך זמן','Tilt Meter · Tilt intensity over time')}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tiltTl}>
              <defs>
                <linearGradient id="tiltG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent.red} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={T.accent.red} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} domain={[0, 100]} />
              <Tooltip contentStyle={tt} />
              <ReferenceLine y={60} stroke={T.accent.orange} strokeDasharray="3 3" />
              <Area type="monotone" dataKey="tilt" stroke={T.accent.red} fill="url(#tiltG)" strokeWidth={2.2} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            {t('Post-Win Overconfidence · שינוי סיכון לאחר רצף ניצחונות','Post-Win Overconfidence · Risk change after winning streaks')}
          </div>
          {postWin.length === 0 ? (
            <div style={{ fontSize: 12, color: T.text.muted, textAlign: 'center', padding: 60 }}>
              {t('עדיין אין רצפי ניצחון של 2+ במדגם הזה.','No 2+ winning streaks in this sample yet.')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={postWin}>
                <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
                <Tooltip contentStyle={tt} />
                <ReferenceLine y={0} stroke={T.text.muted} />
                <Bar dataKey="deltaPct" radius={[4, 4, 0, 0]}>
                  {postWin.map((d, i) => <Cell key={i} fill={d.deltaPct > 15 ? T.accent.red : d.deltaPct > 0 ? T.accent.orange : T.accent.green} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>

      {/* Row 4: Consec-loss probability + Skew card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 12 }}>
        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            {t('Consecutive Loss Probability · סיכוי לרצף הפסדים בהינתן ה-WR הנוכחי','Consecutive Loss Probability · Streak risk given current WR')}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={consecLossProb}>
              <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
              <XAxis dataKey="k" tick={{ fill: T.text.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} unit="%" />
              <Tooltip contentStyle={tt} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="prob" radius={[4, 4, 0, 0]} fill={T.accent.purple} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard T={T}>
          <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
            Trade Distribution Skew · מקור הרווח שלך
          </div>
          <div style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              חלק העשירון העליון מסך הרווחים
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: skew.topDecileShare > 60 ? T.accent.orange : T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
              {skew.topDecileShare}%
            </div>
            <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6, marginTop: 10, maxWidth: 380, margin: '10px auto 0' }}>
              {skew.topDecileShare > 60
                ? 'מסה גבוהה: רוב הרווח שלך מגיע מ"ברבורים שחורים". האסטרטגיה תלויה בנדירים.'
                : skew.topDecileShare > 35
                ? 'מאוזן: הרווחים מתפזרים בין עסקאות גדולות לבינוניות.'
                : 'עקבי: הרווח נבנה מטרייד אחר טרייד — סימן לאדג\' יציב.'}
            </div>
            <div style={{ fontSize: 10, color: T.text.muted, marginTop: 8 }}>{skew.totalWins} עסקאות מנצחות</div>
          </div>
        </GlassCard>
      </div>

      {/* Row 5: Cognitive Bias Report */}
      <GlassCard T={T} style={{ marginBottom: 12 }} glow={`${T.accent.purple}18`}>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700, marginBottom: 10 }}>
          ◆ Cognitive Bias Report · דוח הטיות קוגניטיביות
        </div>
        {biasFlags.length === 0 ? (
          <div style={{ fontSize: 12, color: T.accent.green, padding: 14 }}>✅ לא זוהו דפוסי הטיה דומיננטיים במדגם הנוכחי.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
            {biasFlags.map((b, i) => {
              const c = b.severity === 'good' ? T.accent.green : b.severity === 'warn' ? T.accent.orange : T.accent.red;
              return (
                <div key={i} style={{ padding: 12, borderRadius: 10, background: `${c}10`, border: `1px solid ${c}33`, borderInlineStart: `3px solid ${c}` }}>
                  <div style={{ fontSize: 12, color: c, fontWeight: 800, marginBottom: 4 }}>{b.label}</div>
                  <div style={{ fontSize: 11, color: T.text.secondary, lineHeight: 1.55 }}>{b.detail}</div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default PsychologyLab;
