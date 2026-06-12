/**
 * CustomKPIPanel — renders user-defined KPI formulas as cards on the dashboard.
 *
 * KPIs are persisted per-user via setSetting('customKpis', ...) (scoped storage
 * tied to the authenticated user). Deleting from Settings removes them here too.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardConfig, evalCustomKPI } from '@/hooks/use-dashboard-config';
import type { TradingTheme } from '@/lib/trading-theme';

interface Stats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakEven?: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  expectancy?: number;
  expectancyR?: number;
  profitFactor: number;
  maxDrawdown: number;
  totalR?: number;
  avgR?: number;
  bestTrade?: number;
  worstTrade?: number;
}

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  stats: Stats;
}

const formatValue = (v: number, fmt: 'number' | 'currency' | 'percent' | 'r-multiple'): string => {
  if (!Number.isFinite(v)) return '—';
  switch (fmt) {
    case 'currency':   return (v >= 0 ? '$' : '-$') + Math.abs(v).toFixed(2);
    case 'percent':    return v.toFixed(1) + '%';
    case 'r-multiple': return (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
    default:           return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
};

export function CustomKPIPanel({ T, isRTL, stats }: Props) {
  const { kpis, loaded } = useDashboardConfig();
  if (!loaded || kpis.length === 0) return null;

  const ctx = {
    totalTrades:   stats.totalTrades,
    wins:          stats.wins,
    losses:        stats.losses,
    breakEven:     stats.breakEven ?? 0,
    winRate:       stats.winRate,
    totalPnl:      stats.totalPnl,
    avgWin:        stats.avgWin,
    avgLoss:       stats.avgLoss,
    expectancy:    stats.expectancy ?? 0,
    profitFactor:  stats.profitFactor,
    maxDrawdown:   stats.maxDrawdown,
    totalR:        stats.totalR ?? 0,
    avgR:          stats.avgR ?? 0,
    bestTrade:     stats.bestTrade ?? 0,
    worstTrade:    stats.worstTrade ?? 0,
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ marginBottom: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
        paddingBottom: 8, borderBottom: `1px solid ${T.border.subtle}`,
      }}>
        <span style={{ fontSize: 16 }}>📐</span>
        <h3 style={{
          margin: 0, fontSize: 13, fontWeight: 700,
          color: T.accent.cyan, letterSpacing: '0.15em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isRTL ? 'מדדים מותאמים אישית' : 'Custom Metrics'}
        </h3>
        <span style={{ fontSize: 10, color: T.text.muted, marginInlineStart: 'auto' }}>
          {kpis.length} {isRTL ? 'מדדים פעילים' : 'active'}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <AnimatePresence>
          {kpis.map((k, idx) => {
            const v = evalCustomKPI(k.formula, ctx);
            const color = k.color || T.accent.cyan;
            return (
              <motion.div
                key={k.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ delay: idx * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2 }}
                style={{
                  position: 'relative',
                  padding: 14,
                  borderRadius: T.radius.md,
                  background: `linear-gradient(145deg, ${color}10, ${T.bg.secondary})`,
                  border: `1px solid ${color}33`,
                  overflow: 'hidden',
                  transition: 'box-shadow .25s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 24px -6px ${color}aa, inset 0 0 0 1px ${color}55`; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  fontSize: 9, fontWeight: 700, color: T.text.muted,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  marginBottom: 6, lineHeight: 1.4,
                }}>
                  {k.label}
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 800, color,
                  fontFamily: "'JetBrains Mono', monospace",
                  textShadow: `0 0 12px ${color}66`,
                  lineHeight: 1.1,
                }}>
                  {v === null ? '⚠️' : formatValue(v, k.format)}
                </div>
                <div style={{
                  fontSize: 9, color: T.text.muted, marginTop: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  opacity: 0.55,
                }} title={k.formula}>
                  {k.formula}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
