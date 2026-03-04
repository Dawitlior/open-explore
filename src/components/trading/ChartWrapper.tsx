import { useState, ReactNode } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';

interface ChartExplanation {
  what: string;
  why: string;
  interpret: string;
  good: string;
  action: string;
}

interface ChartWrapperProps {
  T: TradingTheme;
  title: string;
  explanation: ChartExplanation;
  children: ReactNode;
  style?: React.CSSProperties;
  unit?: string;
  chartId?: string;
  onRemove?: (chartId: string) => void;
}

export const ChartWrapper = ({ T, title, explanation, children, style, unit, chartId, onRemove }: ChartWrapperProps) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <GlassCard T={T} style={{ position: 'relative', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => setShowInfo(!showInfo)}>
          <div style={{ fontSize: 10, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>
          {unit && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: `${T.accent.purple}15`, color: T.accent.purple, fontWeight: 600 }}>{unit}</span>}
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            width: 18, height: 18, borderRadius: '50%', border: `1px solid ${T.border.medium}`,
            background: showInfo ? `${T.accent.blue}20` : 'transparent', color: showInfo ? T.accent.blue : T.text.dim,
            cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          i
        </button>
      </div>
      {showInfo && (
        <div style={{
          position: 'absolute', top: 36, right: 10, left: 10, zIndex: 20,
          background: T.bg.card, border: `1px solid ${T.border.medium}`, borderRadius: T.radius.md,
          padding: 16, boxShadow: T.shadow.elevated, animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent.blue, marginBottom: 8 }}>📊 {title}</div>
          {[
            { label: 'What it measures', text: explanation.what },
            { label: 'Why it matters', text: explanation.why },
            { label: 'How to interpret', text: explanation.interpret },
            { label: 'Good vs Bad', text: explanation.good },
            { label: 'Action to take', text: explanation.action },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 8, color: T.accent.cyan, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: T.text.secondary, lineHeight: 1.5 }}>{item.text}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onClick={() => setShowInfo(false)} style={{
              padding: '4px 12px', fontSize: 10, background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
              borderRadius: T.radius.sm, color: T.text.muted, cursor: 'pointer'
            }}>Close</button>
            {chartId && onRemove && (
              <button onClick={() => { onRemove(chartId); setShowInfo(false); }} style={{
                padding: '4px 12px', fontSize: 10, background: `${T.accent.red}10`, border: `1px solid ${T.accent.red}25`,
                borderRadius: T.radius.sm, color: T.accent.red, cursor: 'pointer', fontWeight: 600
              }}>Remove from Dashboard</button>
            )}
          </div>
        </div>
      )}
      {children}
    </GlassCard>
  );
};

// Pre-built explanation library
export const EXPLANATIONS: Record<string, ChartExplanation> = {
  equityCurve: {
    what: 'Tracks your account balance after each trade, showing the growth trajectory.',
    why: 'Reveals whether your edge produces consistent growth or erratic swings.',
    interpret: 'A steadily rising curve indicates a robust edge. Flat periods signal regime mismatch.',
    good: 'Good: smooth upward slope. Bad: steep drops, long flat periods, or accelerating losses.',
    action: 'If the curve flattens, reduce size and review your setups. If dropping, stop and analyze.'
  },
  pnlDistribution: {
    what: 'Shows the dollar P&L of each individual trade as a bar.',
    why: 'Helps identify outlier trades and overall distribution shape.',
    interpret: 'Ideally, wins should be larger than losses. Look for consistency in loss size.',
    good: 'Good: small consistent losses, larger wins. Bad: large random losses, tiny wins.',
    action: 'If losses are inconsistent, tighten your stop loss execution.'
  },
  rDistribution: {
    what: 'Shows each trade\'s return expressed in R-multiples (risk units).',
    why: 'R-multiples normalize performance regardless of dollar risk — the true measure of edge quality.',
    interpret: 'Each bar shows how many risk units you gained or lost. A 2R win means you made 2x your risk.',
    good: 'Good: most wins above 1.5R, losses near -1R. Bad: wins below 1R, losses exceeding -1.5R.',
    action: 'Focus on setups that consistently deliver 2R+ wins. Cut setups with avg R < 1.'
  },
  expectancy: {
    what: 'Expected return per trade in R-multiples: (Win% × Avg Win R) − (Loss% × Avg Loss R).',
    why: 'Expectancy in R is the only true measure of edge quality. Dollar expectancy is distorted by position sizing.',
    interpret: 'Positive expectancy means your system makes money over time. Higher = stronger edge.',
    good: 'Good: > 0.3R. Excellent: > 0.5R. Bad: negative or near zero.',
    action: 'If expectancy is declining, check your recent trade quality and regime fit.'
  },
  drawdown: {
    what: 'Shows the percentage decline from the equity peak at each point in time.',
    why: 'Reveals the pain your system inflicts — critical for risk management and psychology.',
    interpret: 'Deeper drawdowns take exponentially more effort to recover from. 10% DD needs 11.1% gain.',
    good: 'Good: shallow, short drawdowns (<5%). Bad: deep (>10%), prolonged drawdowns.',
    action: 'If drawdown exceeds your threshold, reduce position size by 50% and review setup quality.'
  },
  riskAllocation: {
    what: 'Shows how your total risk capital is distributed across different assets.',
    why: 'Concentration risk can destroy accounts. Diversification smooths the equity curve.',
    interpret: 'Ideally, no single asset should represent more than 30% of total risk.',
    good: 'Good: balanced allocation. Bad: 50%+ concentrated in one asset.',
    action: 'If over-concentrated, set a per-asset risk cap and enforce it.'
  },
  coinPerformance: {
    what: 'P&L breakdown by asset/coin showing which instruments contribute most.',
    why: 'Not all assets suit your strategy equally. Focus on your edge assets.',
    interpret: 'Compare win rate AND average R per asset. High WR with low R can be worse than low WR with high R.',
    good: 'Good: clear positive contributors. Bad: consistent losers you keep trading.',
    action: 'Remove or reduce size on consistently negative assets. Double down on edge assets.'
  },
  radarScore: {
    what: 'Multi-dimensional performance assessment across 5 key trading metrics.',
    why: 'Highlights your strengths and weaknesses in a single visual.',
    interpret: 'Larger area = better overall. Look for collapsed dimensions to identify weak spots.',
    good: 'Good: balanced, large shape. Bad: collapsed in any dimension.',
    action: 'Focus improvement efforts on your weakest dimension.'
  },
  rollingSharpe: {
    what: 'Sharpe ratio calculated over a rolling window of recent trades.',
    why: 'Shows whether your risk-adjusted returns are improving or deteriorating.',
    interpret: 'Higher values indicate better return per unit of risk. Declining values signal edge erosion.',
    good: 'Good: >1.0 consistently. Warning: <0.5. Bad: negative.',
    action: 'If Sharpe is declining, you may be in a regime mismatch. Reduce exposure.'
  },
  kellyOptimal: {
    what: 'The optimal percentage of capital to risk per trade based on your win rate and payoff ratio.',
    why: 'Betting too much or too little reduces long-term growth. Kelly finds the mathematical optimum.',
    interpret: 'This is the theoretical maximum. Most traders use half-Kelly for safety.',
    good: 'Good: > 5% (you have edge). Bad: negative (you have negative expectancy).',
    action: 'Use half-Kelly as your maximum risk per trade. Never exceed full Kelly.'
  },
  riskOfRuin: {
    what: 'The probability of losing your entire account given current performance statistics.',
    why: 'Even with positive expectancy, high variance can lead to ruin. This quantifies that risk.',
    interpret: 'Lower is better. This assumes fixed fractional betting.',
    good: 'Good: <5%. Warning: 5-20%. Critical: >20%.',
    action: 'If risk of ruin is high, reduce position size immediately and improve win rate.'
  },
  edgeDecay: {
    what: 'Tracks how your expectancy (in R) evolves over time periods.',
    why: 'Edges decay as markets adapt. Early detection prevents capital destruction.',
    interpret: 'Declining periods indicate your strategy may be losing effectiveness.',
    good: 'Good: stable or rising. Warning: declining over 2+ periods.',
    action: 'If decaying, research new setups or adapt your entry/exit criteria.'
  },
  winRateVsRR: {
    what: 'Shows win rate grouped by the R-multiple size of the trade.',
    why: 'Reveals whether you maintain your edge across different trade sizes.',
    interpret: 'Ideally win rate stays consistent or improves for larger R targets.',
    good: 'Good: consistent WR across buckets. Bad: WR collapses at higher R targets.',
    action: 'If WR drops for larger targets, your targets may be unrealistic — adjust.'
  },
  monthlyPerformance: {
    what: 'Monthly P&L breakdown with expectancy in R-multiples.',
    why: 'Monthly view reveals seasonality, regime changes, and overall trajectory.',
    interpret: 'Look for consistency month over month. One great month shouldn\'t mask poor months.',
    good: 'Good: consistent positive months. Bad: one outlier masking negative months.',
    action: 'If months are inconsistent, reduce risk during historically weak periods.'
  },
  directionAnalysis: {
    what: 'Compares your performance between Long and Short trades.',
    why: 'Most traders have a directional bias. Knowing yours helps optimize allocation.',
    interpret: 'Compare expectancy in R, not just P&L, to see true edge by direction.',
    good: 'Good: edge in both directions. Acceptable: clear edge in one. Bad: losing in both.',
    action: 'If one direction consistently loses, reduce or eliminate those trades.'
  },
  volatilityAdjusted: {
    what: 'Your expectancy divided by the standard deviation of R-returns.',
    why: 'Adjusts for the consistency of returns. High expectancy with high volatility is less reliable.',
    interpret: 'Higher = more consistent edge. This is essentially a Sharpe ratio in R-terms.',
    good: 'Good: >0.5. Excellent: >1.0. Bad: <0.2.',
    action: 'If low, focus on reducing return variance by tightening stops and targets.'
  },
  drawdownStructure: {
    what: 'Maps each drawdown event showing depth and recovery time.',
    why: 'Understanding drawdown patterns helps set realistic recovery expectations.',
    interpret: 'Deeper drawdowns take longer to recover. Multiple shallow DDs are healthier than one deep one.',
    good: 'Good: quick shallow DDs. Bad: prolonged deep DDs.',
    action: 'After a deep DD, reduce size and focus on high-conviction setups only.'
  },
};
