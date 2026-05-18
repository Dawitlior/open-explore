/**
 * Adaptive KPI cards — automatically switch between R-Multiple and Fiat
 * presentations based on the active displayMode. Used in the Standard
 * dashboard hero so the headline metric matches whatever the user is
 * currently viewing. Safe against /0 and NaN.
 */
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import { GlassCard } from './TradingUI';
import { useVisibleTrades } from '@/lib/display-mode-format';

interface ExpectancyProps {
  T: TradingTheme;
  trades: Trade[];
  stats: TradingStats;
  isRTL: boolean;
  isMobile: boolean;
  privacyMode?: boolean;
  onInfoClick: () => void;
  labels: { expectancy: string; avgPnl: string; tooltipR: string; tooltipMoney: string };
}

export const AdaptiveExpectancyCard = ({
  T, trades, stats, isRTL, isMobile, privacyMode, onInfoClick, labels,
}: ExpectancyProps) => {
  const { isMoney, formatValue: fmtVal } = useVisibleTrades(trades);

  const avgPnl = useMemo(() => {
    if (!trades.length) return 0;
    const sum = trades.reduce((s, t) => s + (isFinite(t.pnl) ? t.pnl : 0), 0);
    return sum / trades.length;
  }, [trades]);

  const valueColor = isMoney
    ? (avgPnl >= 0 ? T.accent.green : T.accent.red)
    : (stats.expectancyR >= 0 ? T.accent.cyan : T.accent.red);

  const valueStr = isMoney
    ? fmtVal(avgPnl)
    : `${stats.expectancyR >= 0 ? '+' : ''}${stats.expectancyR.toFixed(3)}R`;

  const label = isMoney ? labels.avgPnl : labels.expectancy;
  const tag = isMoney ? '$' : 'R';
  const tagColor = isMoney ? T.accent.green : T.accent.purple;
  const sub = isMoney ? labels.tooltipMoney : labels.tooltipR;

  const PV = ({ children }: { children: React.ReactNode }) => (
    <span style={privacyMode ? { filter: 'blur(8px)', userSelect: 'none' } : {}}>{children}</span>
  );

  return (
    <GlassCard T={T} glow={T.accent.cyanGlow} style={{ flex: 1, minWidth: isMobile ? 0 : 170, width: isMobile ? '100%' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          <span style={{ fontSize: 7, padding: '1px 4px', borderRadius: 3, background: `${tagColor}15`, color: tagColor, fontWeight: 700 }}>{tag}</span>
        </div>
        <button onClick={onInfoClick} style={{ width: 16, height: 16, borderRadius: '50%', border: `1px solid ${T.border.medium}`, background: 'transparent', color: T.text.muted, cursor: 'pointer', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, lineHeight: 1 }}>i</button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={isMoney ? 'm' : 'r'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
        >
          <PV>
            <div style={{ fontSize: 26, fontWeight: 700, color: valueColor, fontFamily: "'JetBrains Mono', monospace" }}>
              {valueStr}
            </div>
          </PV>
          <div style={{ fontSize: 9, color: T.text.muted, marginTop: 4 }}>{sub}</div>
        </motion.div>
      </AnimatePresence>
    </GlassCard>
  );
};

/* ─────────────────────────────────────────────────────────── */

interface QuickStatsProps {
  T: TradingTheme;
  trades: Trade[];
  stats: TradingStats;
  isRTL: boolean;
  privacyMode?: boolean;
  labels: {
    title: string;
    avgWin: string; avgLoss: string;
    bestTrade: string; worstTrade: string;
    profitFactor: string; currentStreak: string;
  };
  streakDisplay: string;
  streakColor: string;
}

/** Quick Stats card — swaps row contents between R-Multiple and fiat. */
export const AdaptiveQuickStats = ({
  T, trades, stats, isRTL, privacyMode, labels, streakDisplay, streakColor,
}: QuickStatsProps) => {
  const { isMoney, formatValue: fmtVal } = useVisibleTrades(trades);

  const money = useMemo(() => {
    const wins = trades.filter(t => t.winLoss === 'Win');
    const losses = trades.filter(t => t.winLoss === 'Loss');
    const w = wins.map(t => t.pnl).filter(isFinite);
    const l = losses.map(t => Math.abs(t.pnl)).filter(isFinite);
    const allPnl = trades.map(t => t.pnl).filter(isFinite);
    const avgWin = w.length ? w.reduce((s, v) => s + v, 0) / w.length : 0;
    const avgLoss = l.length ? l.reduce((s, v) => s + v, 0) / l.length : 0;
    const best = allPnl.length ? Math.max(...allPnl) : 0;
    const worst = allPnl.length ? Math.min(...allPnl) : 0;
    return { avgWin, avgLoss, best, worst };
  }, [trades]);

  const rows = isMoney ? [
    { l: `${labels.avgWin} ($)`, v: fmtVal(money.avgWin), c: T.accent.green },
    { l: `${labels.avgLoss} ($)`, v: fmtVal(-money.avgLoss), c: T.accent.red },
    { l: labels.bestTrade, v: fmtVal(money.best), c: T.accent.cyan },
    { l: labels.worstTrade, v: fmtVal(money.worst), c: T.accent.red },
    { l: labels.profitFactor, v: isFinite(stats.profitFactor) ? `${stats.profitFactor.toFixed(2)}x` : '∞', c: T.accent.blue },
    { l: labels.currentStreak, v: streakDisplay, c: streakColor },
  ] : [
    { l: `${labels.avgWin} (R)`, v: `+${stats.avgWinR.toFixed(2)}R`, c: T.accent.green },
    { l: `${labels.avgLoss} (R)`, v: `-${stats.avgLossR.toFixed(2)}R`, c: T.accent.red },
    { l: labels.bestTrade, v: `+${stats.bestTradeR.toFixed(2)}R`, c: T.accent.cyan },
    { l: labels.worstTrade, v: `${stats.worstTradeR.toFixed(2)}R`, c: T.accent.red },
    { l: labels.profitFactor, v: isFinite(stats.profitFactor) ? `${stats.profitFactor.toFixed(2)}x` : '∞', c: T.accent.blue },
    { l: labels.currentStreak, v: streakDisplay, c: streakColor },
  ];

  const PV = ({ children }: { children: React.ReactNode }) => (
    <span style={privacyMode ? { filter: 'blur(8px)', userSelect: 'none' } : {}}>{children}</span>
  );

  return (
    <GlassCard T={T} style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{labels.title}</div>
      <AnimatePresence mode="wait">
        <motion.div
          key={isMoney ? 'm' : 'r'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0 }}
        >
          {rows.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: `1px solid ${T.border.subtle}` }}>
              <span style={{ color: T.text.muted, fontSize: 12 }}>{s.l}</span>
              <PV><span style={{ color: s.c, fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s.v}</span></PV>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </GlassCard>
  );
};
