/**
 * LiveStateBar — the shared "Layer 0" of the merged Control Room.
 *
 * Fuses the risk-side live state (consecutive losses, daily/weekly limit
 * consumption) with the mind-side discipline/tilt signal into a single
 * always-visible status strip that sits above the RISK / MIND tabs.
 *
 * Pure presentation + local derivation — no new data sources.
 */
import { memo, useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import { checkRiskLimits, DEFAULT_RISK_LIMITS, type RiskLimits } from '@/lib/risk-limits';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
  stats: TradingStats;
  limits?: RiskLimits;
  compact?: boolean;
}

const LiveStateBarImpl = ({ T, isRTL, trades, stats, limits, compact = false }: Props) => {
  const L = limits ?? DEFAULT_RISK_LIMITS;

  const model = useMemo(() => {
    const parseTs = (s: string) => {
      const d = new Date((s || '').replace(' ', 'T'));
      return isNaN(d.getTime()) ? null : d.getTime();
    };
    const sorted = [...trades]
      .map(tr => ({ tr, ts: parseTs(tr.date) }))
      .filter(x => x.ts !== null)
      .sort((a, b) => (b.ts as number) - (a.ts as number));

    let consecLosses = 0;
    for (const x of sorted.slice(0, 10)) {
      if (x.tr.winLoss === 'Loss') consecLosses++;
      else break;
    }

    const status = checkRiskLimits(trades, new Date(), L);
    const dailyPct = Math.min(100, (Math.abs(status.dailyNegR) / Math.abs(L.day || -1)) * 100);
    const weeklyPct = Math.min(100, (Math.abs(status.weeklyNegR) / Math.abs(L.week || -1)) * 100);

    // Mind side — discipline + impulsivity proxy (same inputs the psychology page uses).
    const discipline = Math.max(0, Math.min(100, stats.rulesFollowed ?? 0));
    const recentLosses = trades.slice(-5).filter(t => t.winLoss === 'Loss').length;
    const tilt = Math.min(100, recentLosses * 14 + consecLosses * 12 + Math.max(0, 60 - discipline) * 0.6);

    let severity = 0;
    if (consecLosses >= 3) severity += 45;
    else if (consecLosses === 2) severity += 20;
    if (dailyPct >= 80) severity += 35;
    else if (dailyPct >= 50) severity += 15;
    if (weeklyPct >= 75) severity += 20;
    if (tilt >= 60) severity += 20;
    severity = Math.min(100, severity);

    const state: 'cool-off' | 'caution' | 'clear' =
      severity >= 60 ? 'cool-off' : severity >= 30 ? 'caution' : 'clear';

    return { consecLosses, status, dailyPct, weeklyPct, discipline, tilt, severity, state };
  }, [trades, stats, L]);

  const color =
    model.state === 'cool-off' ? T.accent.red : model.state === 'caution' ? T.accent.orange : T.accent.green;
  const icon = model.state === 'cool-off' ? '🛑' : model.state === 'caution' ? '⚠️' : '🟢';
  const label =
    model.state === 'cool-off'
      ? (isRTL ? 'צינון מומלץ' : 'Cool Off')
      : model.state === 'caution'
        ? (isRTL ? 'זהירות' : 'Caution')
        : (isRTL ? 'מותר לסחור' : 'Clear to Trade');

  const chips: Array<{ k: string; v: string; c: string }> = [
    {
      k: isRTL ? 'יומי' : 'Daily',
      v: `${model.status.dailyNegR.toFixed(2)}R / ${L.day}R`,
      c: model.dailyPct >= 80 ? T.accent.red : model.dailyPct >= 50 ? T.accent.orange : T.text.secondary,
    },
    {
      k: isRTL ? 'שבועי' : 'Weekly',
      v: `${model.status.weeklyNegR.toFixed(2)}R / ${L.week}R`,
      c: model.weeklyPct >= 75 ? T.accent.orange : T.text.secondary,
    },
    {
      k: isRTL ? 'משמעת' : 'Discipline',
      v: `${model.discipline.toFixed(0)}%`,
      c: model.discipline >= 75 ? T.accent.green : model.discipline >= 50 ? T.accent.orange : T.accent.red,
    },
    {
      k: isRTL ? 'טילט' : 'Tilt',
      v: `${model.tilt.toFixed(0)}/100`,
      c: model.tilt >= 60 ? T.accent.red : model.tilt >= 30 ? T.accent.orange : T.accent.green,
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 8 : 14,
        flexWrap: 'wrap',
        padding: compact ? '10px 12px' : '12px 16px',
        borderRadius: 14,
        background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${color}12, ${T.bg.card})`,
        border: `1px solid ${T.border.medium}`,
        borderInlineStart: `3px solid ${color}`,
        marginBottom: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
        <span style={{ fontSize: compact ? 16 : 18 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 8.5, color: T.text.muted, letterSpacing: '0.18em', fontFamily: "'JetBrains Mono', monospace" }}>
            {isRTL ? 'מצב חי' : 'LIVE STATE'}
          </div>
          <div style={{ fontSize: compact ? 12 : 13.5, fontWeight: 700, color }}>{label}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: compact ? 6 : 10, flexWrap: 'wrap', flex: 1 }}>
        {chips.map(c => (
          <div
            key={c.k}
            style={{
              padding: compact ? '4px 8px' : '6px 10px',
              borderRadius: 8,
              background: T.bg.tertiary,
              border: `1px solid ${T.border.subtle}`,
              minWidth: compact ? 78 : 96,
            }}
          >
            <div style={{ fontSize: 8.5, color: T.text.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.k}</div>
            <div style={{ fontSize: compact ? 11 : 12.5, fontWeight: 700, color: c.c, fontFamily: "'JetBrains Mono', monospace" }}>{c.v}</div>
          </div>
        ))}
      </div>

      <div style={{ minWidth: compact ? '100%' : 120 }}>
        <div style={{ position: 'relative', height: 5, background: T.bg.tertiary, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border.subtle}` }}>
          <div
            style={{
              position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0,
              width: `${model.severity}%`,
              background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${T.accent.green}, ${T.accent.orange}, ${T.accent.red})`,
              transition: 'width .6s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        </div>
        <div style={{ fontSize: 8.5, color: T.text.muted, marginTop: 3, fontFamily: "'JetBrains Mono', monospace", textAlign: isRTL ? 'left' : 'right' }}>
          {isRTL ? `חומרה ${model.severity.toFixed(0)}/100` : `Severity ${model.severity.toFixed(0)}/100`}
        </div>
      </div>
    </div>
  );
};

export const LiveStateBar = memo(LiveStateBarImpl);

export default LiveStateBar;
