/**
 * Time-Series Performance Distribution Matrix
 * ────────────────────────────────────────────
 * Rows = the last 12 calendar months of trading.
 * Columns = outcome buckets (R-multiple or $ depending on display mode).
 * Cells render trade count, tinted by the cell's average outcome.
 *
 * Advanced-tier only. Adapts automatically to MONEY vs R_MULTIPLE.
 */
import { useMemo } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';
import { useLang } from '@/hooks/use-lang';
import { useDisplayMode } from '@/lib/display-mode';
import { getEffectiveR } from '@/lib/r-multiple';

interface Props {
  T: TradingTheme;
  trades: Trade[];
}

export function TimeSeriesPerfMatrix({ T, trades }: Props) {
  const { t, lang } = useLang();
  const isRTL = lang === 'he';
  const { displayMode } = useDisplayMode();
  const isMoney = displayMode === 'MONEY';

  const { rows, buckets, maxAbs } = useMemo(() => {
    // Bucket definitions are unit-aware. In $ mode we bucket by P&L thresholds
    // that scale with the user's average risk; in R mode we use fixed R bands.
    const avgRisk = (() => {
      const arr = trades.map(tr => tr.risk).filter(r => r > 0);
      if (!arr.length) return 100;
      return arr.reduce((s, r) => s + r, 0) / arr.length;
    })();

    const moneyBuckets = [
      { id: 'lt-2', label: `< -2× ${t('סיכון','risk')}`, min: -Infinity, max: -2 * avgRisk },
      { id: '-2-1', label: `-2× … -1×`,                    min: -2 * avgRisk, max: -avgRisk },
      { id: '-1-0', label: `-1× … 0`,                      min: -avgRisk, max: 0 },
      { id: '0-1',  label: `0 … 1×`,                       min: 0, max: avgRisk },
      { id: '1-2',  label: `1× … 2×`,                      min: avgRisk, max: 2 * avgRisk },
      { id: 'gt2',  label: `> 2× ${t('סיכון','risk')}`,    min: 2 * avgRisk, max: Infinity },
    ];
    const rBuckets = [
      { id: 'lt-2', label: '< -2R', min: -Infinity, max: -2 },
      { id: '-2-1', label: '-2R…-1R', min: -2, max: -1 },
      { id: '-1-0', label: '-1R…0',  min: -1, max: 0 },
      { id: '0-1',  label: '0…1R',   min: 0,  max: 1 },
      { id: '1-2',  label: '1R…2R',  min: 1,  max: 2 },
      { id: 'gt2',  label: '> 2R',   min: 2,  max: Infinity },
    ];
    const buckets = isMoney ? moneyBuckets : rBuckets;

    // Aggregate per (month, bucket).
    const months = new Map<string, Map<string, { n: number; sum: number }>>();
    for (const tr of trades) {
      const v = isMoney ? tr.pnl : getEffectiveR(tr);
      if (!isFinite(v)) continue;
      let key = '—';
      try {
        const d = new Date((tr.date || '').replace(' ', 'T'));
        if (!isNaN(d.getTime())) key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } catch { /* skip */ }
      const b = buckets.find(b => v >= b.min && v < b.max) || buckets[buckets.length - 1];
      const monthMap = months.get(key) || new Map();
      const slot = monthMap.get(b.id) || { n: 0, sum: 0 };
      slot.n += 1;
      slot.sum += v;
      monthMap.set(b.id, slot);
      months.set(key, monthMap);
    }
    const orderedKeys = Array.from(months.keys()).sort().slice(-12);
    const rows = orderedKeys.map(k => ({
      month: k,
      cells: buckets.map(b => {
        const s = months.get(k)?.get(b.id);
        return { bucket: b.id, n: s?.n ?? 0, avg: s && s.n ? s.sum / s.n : 0 };
      }),
    }));
    const maxAbs = Math.max(1, ...rows.flatMap(r => r.cells.map(c => Math.abs(c.avg))));
    return { rows, buckets, maxAbs };
  }, [trades, isMoney, t]);

  const cellColor = (avg: number, count: number) => {
    if (!count) return T.bg.tertiary;
    const norm = Math.max(-1, Math.min(1, avg / maxAbs));
    if (norm >= 0) return `rgba(16,185,129,${0.18 + norm * 0.55})`;
    return `rgba(255,30,30,${0.18 + -norm * 0.55})`;
  };

  const hasMoneyData = trades.some(tr => Number.isFinite(tr.pnl) && tr.pnl !== 0);
  const moneyBlocked = isMoney && !hasMoneyData;

  if (moneyBlocked) {
    return (
      <GlassCard T={T} style={{ marginBottom: 16, textAlign: 'center', padding: 30 }}>
        <div style={{ fontSize: 12, color: T.text.muted }}>
          {t('אין נתוני $ — מצב R-only. עבור למצב R לראות את המטריצה.', 'No $ data — R-only portfolio. Switch to R mode to view the matrix.')}
        </div>
      </GlassCard>
    );
  }

  if (rows.length === 0) {
    return (
      <GlassCard T={T} style={{ marginBottom: 16, textAlign: 'center', padding: 30 }}>
        <div style={{ fontSize: 12, color: T.text.muted }}>
          {t('אין מספיק נתונים להצגת המטריצה.', 'Not enough data to render the matrix.')}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard T={T} style={{ marginBottom: 16 }} glow={`${T.accent.purple}22`}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: T.accent.purple, textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700 }}>● ADVANCED</div>
        <div style={{ fontSize: 12, color: T.text.primary, fontWeight: 700 }}>
          {t('מטריצת התפלגות ביצועים רב-ממדית', 'Time-Series Performance Distribution Matrix')}
        </div>
        <div style={{ fontSize: 10, color: T.text.muted, marginInlineStart: 'auto' }}>
          {isMoney ? t('יחידות: $','units: $') : t('יחידות: R','units: R')}
        </div>
      </div>
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 360, borderCollapse: 'separate', borderSpacing: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr>
              <th style={{ fontSize: 9, color: T.text.muted, textAlign: isRTL ? 'right' : 'left', padding: '4px 6px' }}>
                {t('חודש','Month')}
              </th>
              {buckets.map(b => (
                <th key={b.id} style={{ fontSize: 9, color: T.text.muted, fontWeight: 500, padding: '4px 4px', textAlign: 'center' }}>{b.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.month}>
                <td style={{ fontSize: 10, color: T.text.secondary, padding: '4px 6px', whiteSpace: 'nowrap' }}>{r.month}</td>
                {r.cells.map(c => (
                  <td
                    key={c.bucket}
                    title={c.n
                      ? `${r.month} · ${c.n} ${t('עסקאות','trades')} · ${t('ממוצע','avg')} ${isMoney ? `$${c.avg.toFixed(2)}` : `${c.avg.toFixed(2)}R`}`
                      : '—'}
                    style={{
                      background: cellColor(c.avg, c.n),
                      borderRadius: 6,
                      border: c.n ? `1px solid ${T.border.subtle}` : `1px dashed ${T.border.subtle}`,
                      padding: '6px 4px',
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: T.text.primary,
                      minWidth: 36,
                    }}
                  >
                    {c.n || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 9, color: T.text.muted, lineHeight: 1.5 }}>
        {t(
          'התא מציג מספר עסקאות; הצבע משקף את התוצאה הממוצעת שלהן ביחס לחציון השוק שלך.',
          'Each cell shows trade count; color reflects the average outcome relative to your distribution.',
        )}
      </div>
    </GlassCard>
  );
}
