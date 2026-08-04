import { memo } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import type { Trade } from '@/data/trades';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  trades: Trade[];
  isAlpha: boolean;
  getEffectiveR: (t: Trade) => number;
  tradeHeadline: (t: Trade) => { v: number; unit: string };
  fmtHeadline: (v: number, unit: string) => string;
  PV: ComponentType<{ children: ReactNode }>;
  onOpen: (t: Trade) => void;
  onEdit: (t: Trade) => void;
  onDelete: (id: number) => void;
}

/**
 * ORCA Journal — GALLERY layout.
 * Each trade becomes a tile: direction rail, symbol block, an R-strength meter
 * and the headline P&L. Same data, same actions as the table view.
 */
export const JournalGallery = memo(function JournalGallery({
  T, isRTL, trades, isAlpha, getEffectiveR, tradeHeadline, fmtHeadline, PV, onOpen, onEdit, onDelete,
}: Props) {
  const mono = "'JetBrains Mono', monospace";

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(268px, 1fr))',
        gap: 12,
      }}
    >
      {trades.map(tr => {
        const h = tradeHeadline(tr);
        const r = getEffectiveR(tr);
        const win = h.v > 0;
        const flat = h.v === 0;
        const tone = flat ? T.accent.orange : win ? T.accent.green : T.accent.red;
        const meter = Math.min(100, (Math.abs(r) / 3) * 100);

        return (
          <div
            key={tr.id}
            onClick={() => onOpen(tr)}
            className="orca-glass orca-glass-hover"
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: T.radius.lg ?? T.radius.md,
              border: `1px solid ${T.border.subtle}`,
              background: `linear-gradient(155deg, ${tone}0D, transparent 60%)`,
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* direction rail */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                insetInlineStart: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: tr.direction === 'Long' ? T.accent.green : T.accent.red,
                opacity: 0.85,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.accent.cyan, letterSpacing: 0.2 }}>{tr.coin}</div>
                <div style={{ fontSize: 10, color: T.text.muted, fontFamily: mono, marginTop: 2 }}>
                  {new Date(tr.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span
                style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 999,
                  color: tr.direction === 'Long' ? T.accent.green : T.accent.red,
                  background: `${tr.direction === 'Long' ? T.accent.green : T.accent.red}14`,
                  border: `1px solid ${tr.direction === 'Long' ? T.accent.green : T.accent.red}3A`,
                  whiteSpace: 'nowrap',
                }}
              >
                {tr.direction === 'Long' ? '↑' : '↓'} {tr.direction}
              </span>
            </div>

            {/* headline */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <PV>
                <span style={{ fontSize: 22, fontWeight: 800, fontFamily: mono, color: tone, lineHeight: 1 }}>
                  {fmtHeadline(h.v, h.unit)}
                </span>
              </PV>
              <span style={{ fontSize: 11, fontFamily: mono, color: T.text.muted }}>{r.toFixed(2)}R</span>
            </div>

            {/* R meter */}
            <div style={{ height: 4, borderRadius: 999, background: T.bg.tertiary, overflow: 'hidden' }}>
              <div style={{ width: `${meter}%`, height: '100%', background: tone, opacity: 0.9, transition: 'width .4s ease' }} />
            </div>

            {/* price rail */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[
                { k: isRTL ? 'כניסה' : 'Entry', v: String(tr.entry), c: T.text.secondary },
                { k: isRTL ? 'סטופ' : 'Stop', v: tr.stopLoss == null ? '—' : String(tr.stopLoss), c: T.accent.red },
                { k: isRTL ? 'יציאה' : 'Exit', v: String(tr.exit), c: T.text.secondary },
              ].map(cell => (
                <div key={cell.k} style={{ background: `${T.bg.tertiary}80`, borderRadius: T.radius.sm, padding: '5px 7px', minWidth: 0 }}>
                  <div style={{ fontSize: 8, color: T.text.dim, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cell.k}</div>
                  <div style={{ fontSize: 11, fontFamily: mono, color: cell.c, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell.v}</div>
                </div>
              ))}
            </div>

            {isAlpha && (
              <div style={{ fontSize: 9, fontFamily: mono, color: T.text.muted }}>
                dev {tr.deviation.toFixed(3)}R · {tr.leverage}x
              </div>
            )}

            {tr.comments && (
              <div style={{ fontSize: 10, color: T.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tr.comments}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
              <button
                onClick={e => { e.stopPropagation(); onEdit(tr); }}
                style={{ flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700, borderRadius: T.radius.sm, border: `1px solid ${T.border.subtle}`, background: T.bg.tertiary, color: T.text.secondary, cursor: 'pointer' }}
              >
                {isRTL ? 'עריכה' : 'Edit'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(tr.id); }}
                aria-label={isRTL ? 'מחיקה' : 'Delete'}
                style={{ width: 34, padding: '5px 0', fontSize: 11, borderRadius: T.radius.sm, border: `1px solid ${T.accent.red}33`, background: `${T.accent.red}12`, color: T.accent.red, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
});
