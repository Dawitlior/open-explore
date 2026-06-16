import { useEffect, useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { useAuth } from '@/hooks/use-auth';
import { useVisibleTrades } from '@/lib/display-mode-format';
import { fetchOpenPositions, summarizeExposure, type OpenPositionRow } from '@/lib/risk/exposure';
import { getEffectiveR } from '@/lib/r-multiple';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
}

export const NetExposurePanel = ({ T, isRTL, trades: all }: Props) => {
  const { user } = useAuth();
  const { isMoney } = useVisibleTrades(all);
  const [rows, setRows] = useState<OpenPositionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetchOpenPositions(user.id).then(r => {
      if (alive) { setRows(r); setLoading(false); }
    });
    return () => { alive = false; };
  }, [user?.id]);

  // Equity = latest known account balance from trades stream.
  const equity = useMemo(() => {
    if (!all.length) return 0;
    const last = [...all].sort((a, b) => (a.date || '').localeCompare(b.date || '')).at(-1);
    return Number(last?.balance) || 0;
  }, [all]);

  // R-mode aggregate: sum of |effective R| across the most recent N open trades
  // — proxy for "open risk exposure" when we don't have live broker positions.
  const openRiskR = useMemo(() => {
    return all.reduce((s, t) => {
      const r = getEffectiveR(t);
      return s + (Number.isFinite(r) ? Math.abs(r) : 0);
    }, 0);
  }, [all]);

  const summary = useMemo(() => summarizeExposure(rows, equity), [rows, equity]);
  const fmt$ = (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const tiles = isMoney
    ? [
        { l: isRTL ? 'חשיפה ברוטו' : 'Gross Exposure', v: fmt$(summary.grossNotional), c: T.accent.cyan, sub: isRTL ? 'סך פוזיציות פתוחות' : 'sum of |positions|' },
        { l: isRTL ? 'חשיפה נטו' : 'Net Exposure', v: fmt$(summary.netNotional), c: summary.netNotional >= 0 ? T.accent.green : T.accent.red, sub: isRTL ? 'לונג − שורט' : 'long − short' },
        { l: isRTL ? 'מינוף' : 'Leverage', v: `${summary.leverage.toFixed(2)}×`, c: summary.leverage > 5 ? T.accent.red : summary.leverage > 2 ? T.accent.orange : T.accent.green, sub: isRTL ? 'ברוטו ÷ הון' : 'gross ÷ equity' },
        { l: isRTL ? 'P&L לא ממומש' : 'Unrealized P&L', v: fmt$(summary.unrealized), c: summary.unrealized >= 0 ? T.accent.green : T.accent.red, sub: isRTL ? 'מעודכן' : 'live' },
      ]
    : [
        { l: isRTL ? 'סיכון פתוח (R)' : 'Open Risk (R)', v: `${openRiskR.toFixed(2)}R`, c: openRiskR > 3 ? T.accent.red : openRiskR > 1.5 ? T.accent.orange : T.accent.green, sub: isRTL ? 'סכום |R| בעסקאות' : 'sum of |R| across trades' },
        { l: isRTL ? 'פוזיציות פתוחות' : 'Open Positions', v: String(rows.length), c: T.accent.cyan, sub: isRTL ? 'מבורסה' : 'from broker' },
        { l: isRTL ? 'מינוף' : 'Leverage', v: equity > 0 ? `${summary.leverage.toFixed(2)}×` : 'N/A', c: summary.leverage > 5 ? T.accent.red : summary.leverage > 2 ? T.accent.orange : T.accent.green, sub: isRTL ? 'ברוטו ÷ הון' : 'gross ÷ equity' },
        { l: isRTL ? 'ריכוז עליון' : 'Top Concentration', v: summary.topSymbol ? `${(summary.topConcentration * 100).toFixed(0)}%` : '—', c: summary.topConcentration > 0.5 ? T.accent.red : summary.topConcentration > 0.3 ? T.accent.orange : T.accent.green, sub: summary.topSymbol || (isRTL ? 'אין נתון' : 'no data') },
      ];

  return (
    <div>
      <div style={{
        display: 'grid', gap: 8,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        marginBottom: rows.length ? 12 : 0,
      }}>
        {tiles.map((m, i) => (
          <div key={i} style={{
            background: T.bg.card, border: `1px solid ${T.border.subtle}`, borderRadius: 10, padding: 12,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, width: 3, height: '100%', background: m.c }} />
            <div style={{ fontSize: 9, color: T.text.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{m.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: m.c, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{m.v}</div>
            <div style={{ fontSize: 9, color: T.text.muted, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {!loading && rows.length === 0 && (
        <div style={{
          fontSize: 11, color: T.text.muted, padding: '8px 0',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {isRTL
            ? 'אין פוזיציות חיות מהבורסה. חבר API לראייה מלאה של חשיפה.'
            : 'No live broker positions. Connect an API for full live exposure.'}
        </div>
      )}
    </div>
  );
};
