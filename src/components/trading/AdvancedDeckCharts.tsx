/**
 * 📊 ADVANCED DECK CHARTS — Phase 3 (Advanced-tier visualizations)
 * ────────────────────────────────────────────────────────────────
 * Four new Advanced-tier charts, each wrapped in <TierGate required="advanced">
 * so Standard users see them with a lock badge (soft mode) and Advanced /
 * trial / grandfathered users see them live:
 *
 *   1. sessionPerformanceHeatmap — performance split by trading session
 *   2. streakDistribution        — distribution of win/loss streak lengths
 *   3. tradeDurationVsR          — holding-time vs R outcome scatter
 *   4. feeDragImpact             — estimated fee erosion of gross P&L
 *
 * Rendering is gated by the registry allowlist (`registryAllows`) exactly
 * like the rest of AdvancedAnalyticsPage, so hiding a chart from the
 * registry hides it here too.
 */
import { useMemo } from 'react';
import {
  BarChart, Bar, ScatterChart, Scatter, ComposedChart, Line,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';
import { TierGate } from '@/components/billing/TierGate';
import { ChartWrapper, EXPLANATIONS, type ChartExplanation } from './ChartWrapper';
import { DualModeChip } from './DualModeChip';
import { useDualSeries } from '@/lib/use-dual-series';
import { useLang } from '@/hooks/use-lang';
import { getEffectiveR } from '@/lib/r-multiple';

interface Props {
  T: TradingTheme;
  /** Already display-mode-filtered trades from the parent page. */
  trades: Trade[];
  privacyMode: boolean;
  onExplainClick: (title: string, explanation: ChartExplanation, chartId?: string) => void;
  /** Registry allowlist guard from the parent page. */
  registryAllows: (id: string) => boolean;
}

/** Parse hour-of-day from a sanitized "YYYY-MM-DD HH:mm" date string. */
function tradeHour(t: Trade): number | null {
  try {
    const d = new Date((t.date || '').replace(' ', 'T'));
    if (isNaN(d.getTime())) return null;
    return d.getHours();
  } catch {
    return null;
  }
}

/** Best-effort holding time (hours). Returns null when not available. */
function durationHours(t: Trade): number | null {
  const raw = t as unknown as Record<string, unknown>;
  const open = raw.opened_at ?? raw.openTime ?? (raw.data as Record<string, unknown> | undefined)?.opened_at;
  const close = raw.closed_at ?? raw.closeTime ?? (raw.data as Record<string, unknown> | undefined)?.closed_at;
  if (!open || !close) return null;
  const o = new Date(String(open)).getTime();
  const c = new Date(String(close)).getTime();
  if (!isFinite(o) || !isFinite(c) || c <= o) return null;
  return (c - o) / 3_600_000;
}

const ROUND_TRIP_FEE_RATE = 0.0011; // ~0.055% taker per side, round-trip estimate

export function AdvancedDeckCharts({ T, trades, privacyMode, onExplainClick, registryAllows }: Props) {
  const { t, lang } = useLang();
  const isRTL = lang === 'he';

  // Per-chart R/$ override for the session chart (Advanced dual-mode).
  const sessionDual = useDualSeries(trades);

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

  /* ── 1. SESSION PERFORMANCE ────────────────────────────────── */
  const SESSIONS = useMemo(
    () => [
      { key: 'asia', label: t('אסיה', 'Asia'), lo: 0, hi: 8 },
      { key: 'london', label: t('לונדון', 'London'), lo: 8, hi: 13 },
      { key: 'ny', label: t('ניו-יורק', 'New York'), lo: 13, hi: 21 },
      { key: 'off', label: t('שעות שקטות', 'Off-hours'), lo: 21, hi: 24 },
    ],
    [t],
  );

  const sessionData = useMemo(() => {
    const acc = SESSIONS.map(s => ({ ...s, pnl: 0, r: 0, n: 0, wins: 0 }));
    for (const tr of trades) {
      const h = tradeHour(tr);
      if (h == null) continue;
      const slot = acc.find(s => h >= s.lo && h < s.hi);
      if (!slot) continue;
      slot.pnl += tr.pnl;
      slot.r += getEffectiveR(tr);
      slot.n += 1;
      if (tr.winLoss === 'Win') slot.wins += 1;
    }
    return acc.map(s => ({
      label: s.label,
      pnl: +s.pnl.toFixed(2),
      r: +s.r.toFixed(3),
      n: s.n,
      wr: s.n ? +((s.wins / s.n) * 100).toFixed(1) : 0,
    }));
  }, [trades, SESSIONS]);

  const sessionField = sessionDual.mode === 'MONEY' ? 'pnl' : 'r';
  const sessionHasData = sessionData.some(s => s.n > 0);

  /* ── 2. STREAK DISTRIBUTION ────────────────────────────────── */
  const streakDist = useMemo(() => {
    const lengths = new Map<number, { win: number; loss: number }>();
    let cur: { type: 'W' | 'L'; len: number } | null = null;
    const push = () => {
      if (!cur) return;
      const slot = lengths.get(cur.len) || { win: 0, loss: 0 };
      if (cur.type === 'W') slot.win += 1; else slot.loss += 1;
      lengths.set(cur.len, slot);
    };
    for (const tr of trades) {
      if (tr.winLoss === 'Break Even') continue;
      const ty: 'W' | 'L' = tr.winLoss === 'Win' ? 'W' : 'L';
      if (cur && cur.type === ty) cur.len += 1;
      else { push(); cur = { type: ty, len: 1 }; }
    }
    push();
    return Array.from(lengths.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([len, v]) => ({ len: `${len}`, win: v.win, loss: v.loss }));
  }, [trades]);

  /* ── 3. TRADE DURATION vs R ────────────────────────────────── */
  const durationData = useMemo(
    () =>
      trades
        .map(tr => {
          const h = durationHours(tr);
          if (h == null) return null;
          return { h: +h.toFixed(2), r: +getEffectiveR(tr).toFixed(3), win: tr.winLoss === 'Win', coin: tr.coin };
        })
        .filter((x): x is { h: number; r: number; win: boolean; coin: string } => x != null),
    [trades],
  );

  /* ── 4. FEE DRAG (estimate) ────────────────────────────────── */
  const feeData = useMemo(() => {
    const byMonth = new Map<string, { gross: number; fees: number }>();
    let totalGross = 0, totalFees = 0;
    for (const tr of trades) {
      const notional = (tr.entry > 0 && tr.positionSize > 0)
        ? tr.entry * tr.positionSize
        : Math.abs(tr.positionSize) || Math.abs(tr.pnl) * 10;
      const fee = Math.abs(notional) * ROUND_TRIP_FEE_RATE;
      const grossPnl = tr.pnl + fee; // approx pre-fee result
      let key = '—';
      try {
        const d = new Date((tr.date || '').replace(' ', 'T'));
        if (!isNaN(d.getTime())) key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } catch { /* skip */ }
      const slot = byMonth.get(key) || { gross: 0, fees: 0 };
      slot.gross += grossPnl;
      slot.fees += fee;
      byMonth.set(key, slot);
      totalGross += grossPnl;
      totalFees += fee;
    }
    const rows = Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({ month, gross: +v.gross.toFixed(2), fees: +v.fees.toFixed(2) }));
    const dragPct = totalGross > 0 ? (totalFees / totalGross) * 100 : 0;
    return { rows, totalFees, totalGross, dragPct };
  }, [trades]);

  const dir = isRTL ? 'rtl' : 'ltr';

  const EmptyNote = ({ children }: { children: React.ReactNode }) => (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 11, color: T.text.muted, padding: 16 }}>
      {children}
    </div>
  );

  return (
    <div dir={dir} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12, marginBottom: 16 }}>
      {/* 1 — SESSION PERFORMANCE */}
      {registryAllows('sessionPerformanceHeatmap') && (
        <TierGate required="advanced" label={t('ביצועים לפי סשן', 'Session Performance')}>
          <ChartWrapper
            T={T}
            title={t('ביצועים לפי סשן', 'Session Performance')}
            explanation={EXPLANATIONS.sessionPerformance}
            unit={sessionDual.unit}
            chartId="sessionPerformanceHeatmap"
            onExplainClick={onExplainClick}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <DualModeChip state={sessionDual} />
            </div>
            {sessionHasData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sessionData}>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => sessionDual.formatAxis(v)} />
                  <Tooltip
                    contentStyle={tt}
                    formatter={(v: number, n: string, p: { payload?: { n?: number; wr?: number } }) =>
                      n === sessionField
                        ? [sessionDual.formatValue(v), `${sessionDual.unit} · ${p?.payload?.n ?? 0} ${t('עסקאות', 'trades')} · ${p?.payload?.wr ?? 0}%`]
                        : v}
                  />
                  <Bar dataKey={sessionField} radius={[6, 6, 0, 0]}>
                    {sessionData.map((s, i) => (
                      <Cell key={i} fill={(sessionField === 'pnl' ? s.pnl : s.r) >= 0 ? T.accent.green : T.accent.red} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyNote>{t('אין מספיק נתוני זמן כדי לפלח לפי סשן.', 'Not enough timestamped trades to split by session.')}</EmptyNote>
            )}
          </ChartWrapper>
        </TierGate>
      )}

      {/* 2 — STREAK DISTRIBUTION */}
      {registryAllows('streakDistribution') && (
        <TierGate required="advanced" label={t('התפלגות רצפים', 'Streak Distribution')}>
          <ChartWrapper
            T={T}
            title={t('התפלגות רצפים', 'Streak Distribution')}
            explanation={EXPLANATIONS.streakDistribution}
            unit="x"
            chartId="streakDistribution"
            onExplainClick={onExplainClick}
          >
            {streakDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={streakDist} barGap={2}>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis dataKey="len" tick={{ fill: T.text.muted, fontSize: 10 }} label={{ value: t('אורך רצף', 'streak length'), position: 'insideBottom', offset: -2, fill: T.text.muted, fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fill: T.text.muted, fontSize: 10 }} />
                  <Tooltip contentStyle={tt} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar name={t('רצפי ניצחון', 'Win streaks')} dataKey="win" fill={T.accent.green} radius={[4, 4, 0, 0]} />
                  <Bar name={t('רצפי הפסד', 'Loss streaks')} dataKey="loss" fill={T.accent.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyNote>{t('אין מספיק עסקאות לחישוב רצפים.', 'Not enough trades to compute streaks.')}</EmptyNote>
            )}
          </ChartWrapper>
        </TierGate>
      )}

      {/* 3 — TRADE DURATION vs R */}
      {registryAllows('tradeDurationVsR') && (
        <TierGate required="advanced" label={t('משך עסקה מול R', 'Trade Duration vs R')}>
          <ChartWrapper
            T={T}
            title={t('משך עסקה מול R', 'Trade Duration vs R')}
            explanation={EXPLANATIONS.tradeDuration}
            unit="R"
            chartId="tradeDurationVsR"
            onExplainClick={onExplainClick}
          >
            {durationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="h" name={t('שעות', 'hours')} tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `${v}h`} />
                  <YAxis type="number" dataKey="r" name="R" tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `${v}R`} />
                  <ZAxis range={[50, 130]} />
                  <Tooltip
                    contentStyle={tt}
                    cursor={{ stroke: T.border.medium }}
                    formatter={(v: number, n: string) => [n === 'h' ? `${v}h` : `${v}R`, n === 'h' ? t('משך', 'Duration') : 'R']}
                  />
                  <Scatter data={durationData}>
                    {durationData.map((d, i) => (
                      <Cell key={i} fill={d.win ? T.accent.green : T.accent.red} fillOpacity={0.7} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <EmptyNote>
                {t(
                  'נתוני משך החזקה אינם זמינים לעסקאות המיובאות. צרף שעת פתיחה וסגירה כדי להפעיל גרף זה.',
                  'Holding-time data is not available for imported trades. Include open/close timestamps to enable this chart.',
                )}
              </EmptyNote>
            )}
          </ChartWrapper>
        </TierGate>
      )}

      {/* 4 — FEE DRAG IMPACT */}
      {registryAllows('feeDragImpact') && (
        <TierGate required="advanced" label={t('שחיקת עמלות (אומדן)', 'Fee Drag Impact (est.)')}>
          <ChartWrapper
            T={T}
            title={t('שחיקת עמלות (אומדן)', 'Fee Drag Impact (est.)')}
            explanation={EXPLANATIONS.feeDrag}
            unit="$"
            chartId="feeDragImpact"
            onExplainClick={onExplainClick}
          >
            {feeData.rows.length > 0 ? (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 10, color: T.text.muted }}>
                    {t('עמלות מוערכות', 'Est. fees')}:{' '}
                    <span style={{ color: T.accent.orange, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      <PV>${feeData.totalFees.toFixed(2)}</PV>
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: T.text.muted }}>
                    {t('שחיקה מהרווח הגולמי', 'Drag of gross')}:{' '}
                    <span style={{ color: feeData.dragPct > 30 ? T.accent.red : feeData.dragPct > 10 ? T.accent.orange : T.accent.green, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      {feeData.dragPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <ComposedChart data={feeData.rows}>
                    <CartesianGrid stroke={T.border.subtle} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fill: T.text.muted, fontSize: 9 }} />
                    <YAxis tick={{ fill: T.text.muted, fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip contentStyle={tt} formatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar name={t('רווח גולמי (לפני עמלות)', 'Gross (pre-fee)')} dataKey="gross" fill={T.accent.cyan} radius={[4, 4, 0, 0]} />
                    <Line name={t('עמלות מוערכות', 'Est. fees')} type="monotone" dataKey="fees" stroke={T.accent.orange} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 9, color: T.text.muted, marginTop: 6, opacity: 0.8 }}>
                  {t('* אומדן לפי גודל פוזיציה ושיעור עמלה ממוצע — לא נתוני עמלה בפועל.', '* Estimated from position size and an average fee rate — not actual fee data.')}
                </div>
              </>
            ) : (
              <EmptyNote>{t('אין מספיק נתונים לחישוב שחיקת עמלות.', 'Not enough data to estimate fee drag.')}</EmptyNote>
            )}
          </ChartWrapper>
        </TierGate>
      )}
    </div>
  );
}
