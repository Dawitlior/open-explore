/**
 * 👑 ULTIMATE DECK CHARTS — Phase 4 (Ultimate-tier visualizations)
 * ────────────────────────────────────────────────────────────────
 * Six Ultimate-tier (alpha) charts, split by canonical page:
 *
 *   ANALYTICS (UltimateAnalyticsDeck):
 *     1. lag1Autocorr         — R[i] vs R[i-1] scatter + ρ pill
 *     2. interTradeInterval   — histogram of hours between trades
 *
 *   RISK (UltimateRiskDeck):
 *     3. kellyOptimal         — full-Kelly % + half-Kelly reference
 *     4. capitalEfficiency    — rolling mean(R)/σ(R) line
 *     5. cumulativeMAR        — cumulative R / max-DD trajectory
 *     6. drawdownStructure    — every DD event (depth × recovery)
 *
 * All cards wrapped in <TierGate required="ultimate">. While
 * ENFORCE_TIER_GATES=false they render with a lock badge (soft mode).
 */
import { useMemo } from 'react';
import {
  ScatterChart, Scatter, BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, Legend,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { TierGate } from '@/components/billing/TierGate';
import { ChartWrapper, EXPLANATIONS, type ChartExplanation } from './ChartWrapper';
import { useLang } from '@/hooks/use-lang';
import { getEffectiveR } from '@/lib/r-multiple';

interface AnalyticsProps {
  T: TradingTheme;
  trades: Trade[];
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
  registryAllows: (id: string) => boolean;
}

interface RiskProps extends AnalyticsProps {
  privacyMode: boolean;
}

/* ───────────────────────── helpers ───────────────────────── */

/**
 * Return a unit-agnostic "value" for every trade so the Risk deck keeps
 * working when the journal lacks stop-loss data (R-multiple is 0).
 *   1) Prefer the effective R-multiple when non-zero.
 *   2) Otherwise derive R from pnl / risk (pnl-based pseudo R).
 *   3) Last resort — sign of pnl scaled to ±1 so streak / DD logic still runs.
 */
const tradeValue = (t: Trade): number => {
  const r = getEffectiveR(t);
  if (Number.isFinite(r) && r !== 0) return r;
  const pnl = Number(t.pnl) || 0;
  const risk = Number(t.risk) || 0;
  if (risk > 0 && pnl !== 0) return +(pnl / risk).toFixed(4);
  if (pnl !== 0) return pnl > 0 ? 1 : -1;
  return 0;
};

const tradeTime = (t: Trade): number | null => {
  try {
    const d = new Date((t.date || '').replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch { return null; }
};

const EmptyNote = ({ T, children }: { T: TradingTheme; children: React.ReactNode }) => (
  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 11, color: T.text.muted, padding: 16 }}>
    {children}
  </div>
);

/* ═══════════════ ANALYTICS DECK ═══════════════ */
export function UltimateAnalyticsDeck({ T, trades, onExplainClick, registryAllows }: AnalyticsProps) {
  const { t, lang } = useLang();
  const isRTL = lang === 'he';
  const tt = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.primary, fontSize: 12, boxShadow: T.shadow.elevated, padding: '8px 12px' };

  // ── 1. Lag-1 Autocorrelation ────────────────────────────────
  const lag = useMemo(() => {
    const rs = trades.map(tr => getEffectiveR(tr));
    const pairs: Array<{ prev: number; cur: number; idx: number }> = [];
    for (let i = 1; i < rs.length; i++) pairs.push({ prev: +rs[i - 1].toFixed(3), cur: +rs[i].toFixed(3), idx: i });
    if (pairs.length < 5) return { pairs, rho: 0 };
    const mPrev = pairs.reduce((s, p) => s + p.prev, 0) / pairs.length;
    const mCur  = pairs.reduce((s, p) => s + p.cur, 0) / pairs.length;
    let num = 0, dP = 0, dC = 0;
    for (const p of pairs) {
      num += (p.prev - mPrev) * (p.cur - mCur);
      dP  += (p.prev - mPrev) ** 2;
      dC  += (p.cur  - mCur)  ** 2;
    }
    const rho = (dP > 0 && dC > 0) ? num / Math.sqrt(dP * dC) : 0;
    return { pairs, rho: +rho.toFixed(3) };
  }, [trades]);

  const rhoColor = Math.abs(lag.rho) > 0.3 ? T.accent.red : Math.abs(lag.rho) > 0.15 ? T.accent.orange : T.accent.green;

  // ── 2. Inter-trade Interval (histogram, hours) ──────────────
  const intervals = useMemo(() => {
    const times = trades.map(tradeTime).filter((x): x is number => x != null).sort((a, b) => a - b);
    const gapsH: number[] = [];
    for (let i = 1; i < times.length; i++) gapsH.push((times[i] - times[i - 1]) / 3_600_000);
    if (gapsH.length === 0) return { bins: [], median: 0 };
    const bucketOf = (h: number) =>
      h < 0.25 ? '<15m' :
      h < 1    ? '15–60m' :
      h < 4    ? '1–4h' :
      h < 12   ? '4–12h' :
      h < 24   ? '12–24h' :
      h < 72   ? '1–3d' : '>3d';
    const order = ['<15m', '15–60m', '1–4h', '4–12h', '12–24h', '1–3d', '>3d'];
    const counts = new Map<string, number>();
    for (const g of gapsH) counts.set(bucketOf(g), (counts.get(bucketOf(g)) || 0) + 1);
    const bins = order.map(b => ({ bucket: b, n: counts.get(b) || 0 }));
    const sorted = [...gapsH].sort((a, b) => a - b);
    const median = +sorted[Math.floor(sorted.length / 2)].toFixed(2);
    return { bins, median };
  }, [trades]);

  const medianColor = intervals.median < 1 ? T.accent.red : intervals.median < 4 ? T.accent.orange : T.accent.green;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginTop: 16 }}>
      {registryAllows('lag1Autocorr') && (
        <TierGate required="ultimate" label={t('אוטוקורלציה Lag-1', 'Lag-1 Autocorrelation')}>
          <ChartWrapper T={T} title={t('אוטוקורלציה Lag-1', 'Lag-1 Autocorrelation')} explanation={EXPLANATIONS.lag1Autocorr} unit="ρ" chartId="lag1Autocorr" onExplainClick={onExplainClick}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: `${rhoColor}18`, color: rhoColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                ρ = {lag.rho.toFixed(3)}
              </span>
            </div>
            {lag.pairs.length >= 5 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="prev" name="R[i-1]" tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `${v}R`} />
                  <YAxis type="number" dataKey="cur" name="R[i]" tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `${v}R`} />
                  <ZAxis range={[50, 120]} />
                  <ReferenceLine x={0} stroke={T.text.muted} />
                  <ReferenceLine y={0} stroke={T.text.muted} />
                  <Tooltip contentStyle={tt} cursor={{ stroke: T.border.medium }} formatter={(v: number) => `${v}R`} />
                  <Scatter data={lag.pairs}>
                    {lag.pairs.map((p, i) => (
                      <Cell key={i} fill={p.cur >= 0 ? T.accent.green : T.accent.red} fillOpacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : <EmptyNote T={T}>{t('צריך לפחות 6 עסקאות.', 'Need at least 6 trades.')}</EmptyNote>}
          </ChartWrapper>
        </TierGate>
      )}

      {registryAllows('interTradeInterval') && (
        <TierGate required="ultimate" label={t('מרווחים בין עסקאות', 'Inter-trade Interval')}>
          <ChartWrapper T={T} title={t('מרווחים בין עסקאות', 'Inter-trade Interval (hrs)')} explanation={EXPLANATIONS.interTradeInterval} unit="h" chartId="interTradeInterval" onExplainClick={onExplainClick}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: `${medianColor}18`, color: medianColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                {t('חציון', 'median')}: {intervals.median}h
              </span>
            </div>
            {intervals.bins.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={intervals.bins}>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <Tooltip contentStyle={tt} />
                  <Bar dataKey="n" radius={[6, 6, 0, 0]} fill={T.accent.purple} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyNote T={T}>{t('אין מספיק נתוני זמן.', 'Not enough timestamped trades.')}</EmptyNote>}
          </ChartWrapper>
        </TierGate>
      )}
    </div>
  );
}

/* ═══════════════ RISK DECK ═══════════════ */
export function UltimateRiskDeck({ T, trades, privacyMode, onExplainClick, registryAllows }: RiskProps) {
  const { t, lang } = useLang();
  const isRTL = lang === 'he';
  const tt = { background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: 10, color: T.text.primary, fontSize: 12, boxShadow: T.shadow.elevated, padding: '8px 12px' };

  const PV = ({ children }: { children: React.ReactNode }) => (
    <span style={privacyMode ? { filter: 'blur(8px)', userSelect: 'none' } : {}}>{children}</span>
  );

  // ── 3. Kelly Optimal ──────────────────────────────────────
  const kelly = useMemo(() => {
    const wins = trades.filter(tr => tr.winLoss === 'Win');
    const losses = trades.filter(tr => tr.winLoss === 'Loss');
    const n = wins.length + losses.length;
    if (n === 0) return { full: 0, half: 0, p: 0, b: 0 };
    const p = wins.length / n;
    const avgWin  = wins.length   ? wins.reduce((s, tr) => s + Math.max(0, getEffectiveR(tr)), 0) / wins.length     : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, tr) => s + Math.min(0, getEffectiveR(tr)), 0) / losses.length) : 0;
    const b = avgLoss > 0 ? avgWin / avgLoss : 0;
    const full = b > 0 ? Math.max(-100, Math.min(100, (p - (1 - p) / b) * 100)) : 0;
    return { full: +full.toFixed(2), half: +(full / 2).toFixed(2), p: +(p * 100).toFixed(1), b: +b.toFixed(2) };
  }, [trades]);

  const kellyColor = kelly.full < 0 ? T.accent.red : kelly.full < 2 ? T.accent.orange : T.accent.green;

  // ── 4. Capital Efficiency (rolling mean R / σ R, w=20) ────
  const capEff = useMemo(() => {
    const rs = trades.map(tr => getEffectiveR(tr));
    const W = 20;
    return rs.map((_, i) => {
      const start = Math.max(0, i - W + 1);
      const slice = rs.slice(start, i + 1);
      if (slice.length < 5) return { i: i + 1, eff: 0 };
      const m = slice.reduce((s, v) => s + v, 0) / slice.length;
      const v = slice.reduce((s, x) => s + (x - m) ** 2, 0) / slice.length;
      const sd = Math.sqrt(v);
      return { i: i + 1, eff: sd > 0 ? +(m / sd).toFixed(3) : 0 };
    });
  }, [trades]);

  // ── 5. Cumulative MAR (cum R / running max DD) ────────────
  const marSeries = useMemo(() => {
    let cum = 0, peak = 0, mdd = 0;
    return trades.map((tr, i) => {
      cum += getEffectiveR(tr);
      if (cum > peak) peak = cum;
      const dd = peak - cum;
      if (dd > mdd) mdd = dd;
      return { i: i + 1, mar: mdd > 0 ? +(cum / mdd).toFixed(3) : 0, cum: +cum.toFixed(3) };
    });
  }, [trades]);

  // ── 6. Drawdown Structure (each DD event) ─────────────────
  const ddEvents = useMemo(() => {
    let cum = 0, peak = 0, inDD = false, depth = 0, durationN = 0, startIdx = 0;
    const events: Array<{ id: number; depth: number; duration: number; recovered: boolean }> = [];
    trades.forEach((tr, i) => {
      cum += getEffectiveR(tr);
      if (cum >= peak) {
        if (inDD) {
          events.push({ id: events.length + 1, depth: +depth.toFixed(2), duration: durationN, recovered: true });
          inDD = false; depth = 0; durationN = 0;
        }
        peak = cum;
      } else {
        if (!inDD) { inDD = true; startIdx = i; }
        durationN = i - startIdx + 1;
        depth = peak - cum;
      }
    });
    if (inDD) events.push({ id: events.length + 1, depth: +depth.toFixed(2), duration: durationN, recovered: false });
    return events.sort((a, b) => b.depth - a.depth).slice(0, 12);
  }, [trades]);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginTop: 16 }}>
      {/* 3 — Kelly */}
      {registryAllows('kellyOptimal') && (
        <TierGate required="ultimate" label={t('אופטימום קלי', 'Kelly Optimal')}>
          <ChartWrapper T={T} title={t('אופטימום קלי', 'Kelly Optimal Sizing')} explanation={EXPLANATIONS.kellyOptimal} unit="%" chartId="kellyOptimal" onExplainClick={onExplainClick}>
            {trades.length >= 5 ? (
              <div style={{ padding: '12px 4px' }}>
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: T.text.muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{t('סיכון אופטימלי לעסקה', 'Optimal risk per trade')}</div>
                  <div style={{ fontSize: 42, fontWeight: 700, color: kellyColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, textShadow: `0 0 24px ${kellyColor}55`, marginTop: 4 }}>
                    <PV>{kelly.full.toFixed(2)}%</PV>
                  </div>
                  <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4 }}>
                    {t('חצי-קלי המומלץ', 'Recommended half-Kelly')}:{' '}
                    <span style={{ color: T.accent.cyan, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}><PV>{kelly.half.toFixed(2)}%</PV></span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10, color: T.text.muted }}>
                  <div style={{ padding: 8, background: T.bg.tertiary, borderRadius: 6 }}>
                    <div style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('הצלחה (p)', 'Win rate (p)')}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{kelly.p.toFixed(1)}%</div>
                  </div>
                  <div style={{ padding: 8, background: T.bg.tertiary, borderRadius: 6 }}>
                    <div style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t('יחס רווח (b)', 'Payoff (b)')}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{kelly.b.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : <EmptyNote T={T}>{t('צריך לפחות 5 עסקאות סגורות.', 'Need at least 5 closed trades.')}</EmptyNote>}
          </ChartWrapper>
        </TierGate>
      )}

      {/* 4 — Capital Efficiency */}
      {registryAllows('capitalEfficiency') && (
        <TierGate required="ultimate" label={t('יעילות הון', 'Capital Efficiency')}>
          <ChartWrapper T={T} title={t('יעילות הון (חלון 20)', 'Capital Efficiency (window 20)')} explanation={EXPLANATIONS.capitalEfficiency} unit="R/σ" chartId="capitalEfficiency" onExplainClick={onExplainClick}>
            {capEff.length >= 5 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={capEff}>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <ReferenceLine y={0} stroke={T.text.muted} />
                  <ReferenceLine y={0.5} stroke={T.accent.green} strokeDasharray="4 4" label={{ value: t('יעיל', 'efficient'), fontSize: 9, fill: T.accent.green, position: 'insideBottomRight' }} />
                  <Tooltip contentStyle={tt} />
                  <Line type="monotone" dataKey="eff" stroke={T.accent.cyan} strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyNote T={T}>{t('צריך לפחות 5 עסקאות.', 'Need at least 5 trades.')}</EmptyNote>}
          </ChartWrapper>
        </TierGate>
      )}

      {/* 5 — Cumulative MAR */}
      {registryAllows('cumulativeMAR') && (
        <TierGate required="ultimate" label={t('MAR מצטבר', 'Cumulative MAR')}>
          <ChartWrapper T={T} title={t('MAR מצטבר', 'Cumulative MAR (return/DD)')} explanation={EXPLANATIONS.cumulativeMAR} unit="x" chartId="cumulativeMAR" onExplainClick={onExplainClick}>
            {marSeries.length >= 3 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={marSeries}>
                  <defs>
                    <linearGradient id="marFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.accent.green} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={T.accent.green} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis dataKey="i" tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <ReferenceLine y={1} stroke={T.accent.orange} strokeDasharray="4 4" label={{ value: 'MAR=1', fontSize: 9, fill: T.accent.orange, position: 'insideTopRight' }} />
                  <Tooltip contentStyle={tt} formatter={(v: number) => `${v}x`} />
                  <Area type="monotone" dataKey="mar" stroke={T.accent.green} fill="url(#marFill)" strokeWidth={2.2} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <EmptyNote T={T}>{t('צריך לפחות 3 עסקאות.', 'Need at least 3 trades.')}</EmptyNote>}
          </ChartWrapper>
        </TierGate>
      )}

      {/* 6 — Drawdown Structure */}
      {registryAllows('drawdownStructure') && (
        <TierGate required="ultimate" label={t('מבנה נסיגות', 'Drawdown Structure')}>
          <ChartWrapper T={T} title={t('מבנה נסיגות (Top 12)', 'Drawdown Structure (Top 12)')} explanation={EXPLANATIONS.drawdownStructure} unit="R" chartId="drawdownStructure" onExplainClick={onExplainClick}>
            {ddEvents.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ddEvents}>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis dataKey="id" tick={{ fill: T.text.muted, fontSize: 10 }} label={{ value: t('אירוע', 'event'), position: 'insideBottom', offset: -2, fill: T.text.muted, fontSize: 9 }} />
                  <YAxis yAxisId="left" tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `${v}R`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: T.text.muted, fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tt}
                    formatter={(v: number, n: string) => n === 'depth' ? [`${v}R`, t('עומק', 'Depth')] : [`${v}`, t('משך (עסקאות)', 'Duration')]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="left" name={t('עומק', 'Depth')} dataKey="depth" radius={[4, 4, 0, 0]}>
                    {ddEvents.map((d, i) => (
                      <Cell key={i} fill={d.recovered ? T.accent.orange : T.accent.red} />
                    ))}
                  </Bar>
                  <Bar yAxisId="right" name={t('משך', 'Duration')} dataKey="duration" radius={[4, 4, 0, 0]} fill={`${T.accent.cyan}80`} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyNote T={T}>{t('אין נסיגות לחישוב.', 'No drawdown events.')}</EmptyNote>}
          </ChartWrapper>
        </TierGate>
      )}
    </div>
  );
}
