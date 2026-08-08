import { memo } from 'react';
import { motion } from 'framer-motion';
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
  /** Maps a row index to the journal's display number (matches the table view). */
  numberFor?: (idx: number) => number;
  onOpen: (t: Trade) => void;
  onEdit: (t: Trade) => void;
  onDelete: (id: number) => void;
}

const MONO = "'JetBrains Mono', monospace";

/**
 * ORCA Journal — GALLERY layout (premium tiles).
 * Each trade = a dossier tile: aurora wash keyed to the result, direction rail,
 * headline P&L, R-strength meter, price ladder and hover-revealed actions.
 */
export const JournalGallery = memo(function JournalGallery({
  T, isRTL, trades, isAlpha, getEffectiveR, tradeHeadline, fmtHeadline, PV, numberFor, onOpen, onEdit, onDelete,
}: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
      {trades.map((tr, i) => {
        const h = tradeHeadline(tr);
        const r = getEffectiveR(tr);
        const tone = h.v > 0 ? T.accent.green : h.v < 0 ? T.accent.red : T.accent.orange;
        const side = tr.direction === 'Long' ? T.accent.green : T.accent.red;
        const meter = Math.min(100, (Math.abs(r) / 3) * 100);

        return (
          <motion.div
            key={tr.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(tr)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(tr); } }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.24), ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            className="orca-focus orca-gallery-tile"
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: T.radius.lg,
              border: `1px solid ${T.border.subtle}`,
              background: `radial-gradient(120% 100% at ${isRTL ? '100%' : '0%'} 0%, ${tone}0A, transparent 60%), linear-gradient(160deg, ${T.bg.card}, ${T.bg.secondary})`,
              boxShadow: T.shadow.card,
              padding: '14px 16px 13px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* top hairline + direction rail */}
            <span aria-hidden style={{ position: 'absolute', top: 0, insetInline: 0, height: 2, background: `linear-gradient(90deg, transparent, ${tone}, transparent)`, opacity: 0.35 }} />
            <span aria-hidden style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 2, background: side, opacity: 0.45 }} />

            {/* head */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, fontFamily: MONO, color: T.text.primary, letterSpacing: 0.3 }}>{tr.coin}</div>
                <div style={{ fontSize: 9.5, color: T.text.muted, fontFamily: MONO, marginTop: 3 }}>
                  #{numberFor ? numberFor(i) : tr.id} • {new Date(tr.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 900, letterSpacing: 0.9, textTransform: 'uppercase',
                padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                color: T.text.secondary, background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
              }}>
                <span style={{ color: side }}>{tr.direction === 'Long' ? '▲' : '▼'}</span> {tr.direction}
              </span>
            </div>

            {/* headline */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <PV>
                <span style={{ fontSize: 26, fontWeight: 900, fontFamily: MONO, color: tone, lineHeight: 1 }}>
                  {fmtHeadline(h.v, h.unit)}
                </span>
              </PV>
              <span style={{
                fontSize: 10, fontFamily: MONO, fontWeight: 800, color: T.text.muted,
                padding: '2px 7px', borderRadius: 999, background: T.bg.tertiary, border: `1px solid ${T.border.subtle}`,
              }}>{r.toFixed(2)}R</span>
            </div>

            {/* R meter */}
            <div style={{ height: 5, borderRadius: 999, background: T.border.medium, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${meter}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: '100%', background: `linear-gradient(90deg, ${tone}55, ${tone}CC)` }}
              />
            </div>

            {/* price ladder */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {[
                { k: isRTL ? 'כניסה' : 'Entry', v: String(tr.entry), c: T.text.muted },
                { k: isRTL ? 'סטופ' : 'Stop', v: tr.stopLoss == null ? '—' : String(tr.stopLoss), c: T.text.muted },
                { k: isRTL ? 'יציאה' : 'Exit', v: String(tr.exit), c: tone },
              ].map(cell => (
                <div key={cell.k} style={{
                  position: 'relative', overflow: 'hidden', minWidth: 0,
                  background: T.bg.tertiary, borderRadius: T.radius.sm,
                  border: `1px solid ${T.border.subtle}`, padding: '6px 8px',
                }}>
                  <span aria-hidden style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 2, background: cell.c, opacity: 0.35 }} />
                  <div style={{ fontSize: 8, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{cell.k}</div>
                  <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 700, color: T.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell.v}</div>
                </div>
              ))}
            </div>

            {(isAlpha || tr.comments) && (
              <div style={{ fontSize: 9.5, fontFamily: MONO, color: T.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isAlpha ? `dev ${tr.deviation.toFixed(3)}R · ${tr.leverage}x${tr.comments ? ' · ' : ''}` : ''}
                {tr.comments}
              </div>
            )}

            {/* actions */}
            <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
              <button
                onClick={e => { e.stopPropagation(); onEdit(tr); }}
                className="orca-focus"
                style={{
                  flex: 1, padding: '6px 0', fontSize: 10.5, fontWeight: 800,
                  borderRadius: T.radius.sm, border: `1px solid ${T.border.subtle}`,
                  background: T.bg.tertiary, color: T.text.secondary, cursor: 'pointer',
                  transition: 'all .18s ease',
                }}
              >
                {isRTL ? 'עריכה' : 'Edit'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(tr.id); }}
                aria-label={isRTL ? 'מחיקה' : 'Delete'}
                className="orca-focus"
                style={{
                  width: 36, padding: '6px 0', fontSize: 11,
                  borderRadius: T.radius.sm, border: `1px solid ${T.accent.red}30`,
                  background: `${T.accent.red}10`, color: T.accent.red, cursor: 'pointer',
                  transition: 'all .18s ease',
                }}
              >
                ✕
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
});
