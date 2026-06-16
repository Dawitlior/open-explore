import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { getEffectiveR } from '@/lib/r-multiple';

interface Props { T: TradingTheme; isRTL: boolean; trades: Trade[]; }

/**
 * 24-bin hour-of-day heatstrip. Color = sign + magnitude of summed P&L (or R)
 * for trades closed in that hour (user local TZ). Identifies best/worst window.
 */
export const HourOfDayStrip = ({ T, isRTL, trades: all }: Props) => {
  const { visibleTrades, isMoney } = useVisibleTrades(all);

  const { bins, best, worst, lastHour, lastInBest } = useMemo(() => {
    const bins = Array.from({ length: 24 }, (_, h) => ({ hour: h, value: 0, count: 0 }));
    for (const t of visibleTrades) {
      const d = new Date((t.date || '').replace(' ', 'T'));
      if (isNaN(d.getTime())) continue;
      const h = d.getHours();
      const v = isMoney ? (t.pnl || 0) : getEffectiveR(t);
      if (!Number.isFinite(v)) continue;
      bins[h].value += v;
      bins[h].count += 1;
    }
    // best/worst 3-hour rolling
    let bestStart = 0, bestVal = -Infinity, worstStart = 0, worstVal = Infinity;
    for (let h = 0; h <= 21; h++) {
      const s = bins[h].value + bins[h + 1].value + bins[h + 2].value;
      if (s > bestVal) { bestVal = s; bestStart = h; }
      if (s < worstVal) { worstVal = s; worstStart = h; }
    }
    const sortedByDate = [...visibleTrades].sort((a, b) =>
      (a.date || '').localeCompare(b.date || ''));
    const last = sortedByDate[sortedByDate.length - 1];
    const lastH = last ? new Date((last.date || '').replace(' ', 'T')).getHours() : null;
    const inBest = lastH != null && lastH >= bestStart && lastH < bestStart + 3;
    return { bins, best: { start: bestStart, value: bestVal }, worst: { start: worstStart, value: worstVal }, lastHour: lastH, lastInBest: inBest };
  }, [visibleTrades, isMoney]);

  const maxAbs = Math.max(1, ...bins.map(b => Math.abs(b.value)));
  const fmt = (v: number) => isMoney ? `${v >= 0 ? '+' : ''}$${v.toFixed(0)}` : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
  const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

  return (
    <div style={{
      background: T.bg.card,
      border: `1px solid ${T.border.subtle}`,
      borderRadius: 10,
      padding: 14,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
      }}>
        <div style={{
          fontSize: 10, color: T.text.muted, textTransform: 'uppercase',
          letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isRTL ? 'תוצאה לפי שעה (זמן מקומי)' : 'Performance by Hour (local TZ)'}
        </div>
        {lastHour != null && (
          <div style={{
            fontSize: 9, padding: '3px 8px', borderRadius: 4,
            background: lastInBest ? `${T.accent.green}20` : `${T.accent.orange}20`,
            color: lastInBest ? T.accent.green : T.accent.orange,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.08em',
          }}>
            {lastInBest
              ? (isRTL ? '✓ בחלון האסטרטגיה' : '✓ IN STRATEGY WINDOW')
              : (isRTL ? '! מחוץ לחלון המנצח' : '! OUTSIDE BEST WINDOW')}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)',
        gap: 2, alignItems: 'end', height: 90,
      }}>
        {bins.map(b => {
          const h = (Math.abs(b.value) / maxAbs) * 100;
          const color = b.value > 0 ? T.accent.green : b.value < 0 ? T.accent.red : T.border.medium;
          const fade = b.count === 0 ? 0.18 : Math.min(1, 0.35 + b.count * 0.12);
          return (
            <div key={b.hour} title={`${hh(b.hour)} · n=${b.count} · ${fmt(b.value)}`}
              style={{
                position: 'relative', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              }}>
              <div style={{
                height: `${Math.max(2, h)}%`,
                background: color,
                opacity: fade,
                borderRadius: 2,
                boxShadow: b.value !== 0 ? `0 0 4px ${color}40` : 'none',
              }} />
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 2,
        fontSize: 8, color: T.text.muted, marginTop: 4,
        fontFamily: "'JetBrains Mono', monospace", textAlign: 'center',
      }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h}>{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <Pill T={T} color={T.accent.green}
          label={isRTL ? 'חלון מנצח' : 'Best window'}
          value={`${hh(best.start)}–${hh(best.start + 3)}`}
          sub={fmt(best.value)} />
        <Pill T={T} color={T.accent.red}
          label={isRTL ? 'חלון מפסיד' : 'Worst window'}
          value={`${hh(worst.start)}–${hh(worst.start + 3)}`}
          sub={fmt(worst.value)} />
      </div>
    </div>
  );
};

const Pill = ({ T, color, label, value, sub }: { T: TradingTheme; color: string; label: string; value: string; sub: string }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: '8px 12px',
    background: `${color}10`,
    border: `1px solid ${color}30`,
    borderRadius: 8, flex: 1, minWidth: 160,
  }}>
    <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    <div style={{ fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace" }}>{sub}</div>
  </div>
);
