import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { getEffectiveR } from '@/lib/r-multiple';

interface Props {
  T: TradingTheme;
  t: any;
  trade: Trade;
  isRTL: boolean;
  isMobile: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  tradeHeadline: (tr: Trade) => { v: number; unit: 'R' | '$' };
  fmtHeadline: (v: number, unit: 'R' | '$', signed?: boolean) => string;
}

const MONO = "'JetBrains Mono', monospace";

/**
 * TradeDetailModal — premium "trade dossier" card.
 * Aurora header, hero outcome slab with an R-strength meter,
 * a live price-ladder (stop → entry → exit) and stat tiles.
 */
export function TradeDetailModal({ T, t, trade, isRTL, isMobile, onClose, onEdit, onDelete, tradeHeadline, fmtHeadline }: Props) {
  const headline = tradeHeadline(trade);
  const r = getEffectiveR(trade);
  const isLong = trade.direction === 'Long';
  const sideColor = isLong ? T.accent.green : T.accent.red;
  const outcomeColor = headline.v > 0 ? T.accent.green : headline.v < 0 ? T.accent.red : T.accent.orange;
  const resultColor = trade.winLoss === 'Win' ? T.accent.green : trade.winLoss === 'Loss' ? T.accent.red : T.accent.orange;
  const dir = isRTL ? 'rtl' : 'ltr';

  const dateLabel = new Date(trade.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── price ladder positions (0..100) ────────────────────────────────────────
  const pts = [trade.entry, trade.exit, trade.stopLoss ?? trade.entry].filter(n => Number.isFinite(n)) as number[];
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const span = hi - lo || 1;
  const pos = (n: number) => ((n - lo) / span) * 100;

  const meter = Math.min(100, (Math.abs(r) / 3) * 100);

  const Tile = ({ label, value, color = T.text.primary, accentBar }: { label: string; value: React.ReactNode; color?: string; accentBar?: string }) => (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
      padding: isMobile ? '11px 12px' : '13px 14px',
      borderRadius: T.radius.md,
      border: `1px solid ${T.border.subtle}`,
      background: `linear-gradient(160deg, ${T.bg.tertiary}, transparent)`,
    }}>
      {accentBar && <span aria-hidden style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 2, background: accentBar, opacity: 0.75 }} />}
      <div style={{ fontSize: 9.5, letterSpacing: 0.7, textTransform: 'uppercase', color: T.text.muted, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color, fontFamily: MONO, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${trade.coin} ${trade.direction}`}
        dir={dir}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(2,6,16,0.62)',
          display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
          padding: isMobile ? '12px 10px 0' : 24,
          backdropFilter: 'blur(14px)',
        }}
      >
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: isMobile ? 40 : 18, scale: isMobile ? 1 : 0.975 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          style={{
            position: 'relative',
            width: '100%', maxWidth: isMobile ? '100%' : 880,
            maxHeight: isMobile ? '90dvh' : '88vh', overflow: 'auto',
            borderRadius: isMobile ? '24px 24px 0 0' : 26,
            border: `1px solid ${T.border.medium}`,
            background: `linear-gradient(150deg, ${T.bg.card}, ${T.bg.secondary} 62%)`,
            boxShadow: isMobile ? '0 -30px 80px rgba(0,0,0,0.55)' : T.shadow.elevated,
          }}
        >
          {/* ── aurora header ─────────────────────────────────────────────── */}
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            padding: isMobile ? '18px 18px 16px' : '26px 30px 22px',
            borderBottom: `1px solid ${T.border.subtle}`,
            background: `radial-gradient(120% 160% at ${isRTL ? '100%' : '0%'} 0%, ${sideColor}22, transparent 55%), radial-gradient(90% 140% at ${isRTL ? '0%' : '100%'} 0%, ${outcomeColor}14, transparent 60%)`,
          }}>
            <span aria-hidden style={{
              position: 'absolute', top: 0, insetInline: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${sideColor}, ${outcomeColor}, transparent)`,
              opacity: 0.85,
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 999,
                    fontSize: 10, fontWeight: 900, letterSpacing: 1.1, textTransform: 'uppercase',
                    color: sideColor, background: `${sideColor}16`, border: `1px solid ${sideColor}44`,
                  }}>
                    {isLong ? '▲' : '▼'} {trade.direction}
                  </span>
                  <span style={{
                    fontSize: isMobile ? 32 : 42, lineHeight: 1, fontWeight: 900,
                    fontFamily: MONO, color: T.text.primary,
                  }}>{trade.coin}</span>
                </div>
                <div style={{ marginTop: 9, color: T.text.muted, fontSize: isMobile ? 11.5 : 13, fontFamily: MONO }}>
                  {isRTL ? 'עסקה' : 'Trade'} #{trade.id} • {dateLabel}
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={isRTL ? 'סגור' : 'Close'}
                className="orca-focus"
                style={{
                  flexShrink: 0,
                  width: isMobile ? 34 : 38, height: isMobile ? 34 : 38,
                  borderRadius: 12,
                  border: `1px solid ${T.border.subtle}`,
                  background: T.bg.tertiary, color: T.text.muted,
                  cursor: 'pointer', fontSize: 20, lineHeight: 1,
                  transition: 'all .18s ease',
                }}
              >×</button>
            </div>
          </div>

          {/* ── body ──────────────────────────────────────────────────────── */}
          <div style={{
            padding: isMobile ? '16px 16px calc(18px + env(safe-area-inset-bottom))' : '24px 30px 28px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.25fr 1fr',
            gap: isMobile ? 14 : 22,
            alignItems: 'start',
          }}>
            {/* left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
              {/* price ladder */}
              <div style={{
                padding: isMobile ? '16px 14px 12px' : '18px 18px 14px',
                borderRadius: T.radius.lg,
                border: `1px solid ${T.border.subtle}`,
                background: T.bg.tertiary,
              }}>
                <div style={{ fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color: T.text.muted, marginBottom: 18 }}>
                  {isRTL ? 'מסלול המחיר' : 'Price path'}
                </div>
                <div style={{ position: 'relative', height: 46 }}>
                  <div style={{ position: 'absolute', insetInline: 0, top: 20, height: 3, borderRadius: 999, background: `linear-gradient(90deg, ${T.accent.red}55, ${T.border.medium}, ${outcomeColor}88)` }} />
                  {[
                    { p: trade.stopLoss, label: isRTL ? 'סטופ' : 'Stop', c: T.accent.red },
                    { p: trade.entry, label: isRTL ? 'כניסה' : 'Entry', c: T.accent.cyan },
                    { p: trade.exit, label: isRTL ? 'יציאה' : 'Exit', c: outcomeColor },
                  ].map((m, i) => m.p == null ? null : (
                    <div key={i} style={{
                      position: 'absolute', top: 0,
                      left: `${pos(m.p)}%`, transform: 'translateX(-50%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ fontSize: 10.5, fontFamily: MONO, fontWeight: 800, color: m.c }}>{m.p}</span>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: m.c, boxShadow: `0 0 0 3px ${m.c}22` }} />
                      <span style={{ fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase', color: T.text.muted }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* stat tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
                <Tile label={t.entry} value={trade.entry} accentBar={T.accent.cyan} />
                <Tile label={t.stopLoss} value={trade.stopLoss == null ? '—' : trade.stopLoss} color={T.accent.red} accentBar={T.accent.red} />
                <Tile label={t.exit} value={trade.exit} accentBar={outcomeColor} />
                <Tile label={`${t.riskR} (R)`} value={`${r.toFixed(2)}R`} color={outcomeColor} />
                <Tile label={t.deviation} value={trade.deviation ? `${trade.deviation.toFixed(4)}R` : '0'} color={trade.deviation > 0 ? T.accent.orange : T.accent.green} />
                <Tile label={t.leverage} value={`${trade.leverage}x`} />
                <Tile label={`${t.balance} ($)`} value={`$${trade.balance.toFixed(2)}`} />
                <Tile label={isRTL ? 'סטטוס' : 'Result'} value={trade.winLoss} color={resultColor} accentBar={resultColor} />
              </div>
            </div>

            {/* right column — hero outcome */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                padding: isMobile ? '18px 16px' : '22px 20px',
                borderRadius: T.radius.lg,
                border: `1px solid ${outcomeColor}3D`,
                background: `radial-gradient(120% 120% at 50% 0%, ${outcomeColor}1F, transparent 70%), ${T.bg.tertiary}`,
                boxShadow: `inset 0 1px 0 ${outcomeColor}22`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 9.5, letterSpacing: 0.9, textTransform: 'uppercase', color: T.text.muted }}>{isRTL ? 'תוצאה' : 'Outcome'}</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 9.5, fontWeight: 900,
                    letterSpacing: 1, textTransform: 'uppercase',
                    color: resultColor, background: `${resultColor}18`, border: `1px solid ${resultColor}44`,
                  }}>{trade.winLoss}</span>
                </div>
                <div style={{
                  marginTop: 14, fontSize: isMobile ? 38 : 46, lineHeight: 1,
                  fontWeight: 900, fontFamily: MONO, color: outcomeColor,
                  textShadow: `0 0 34px ${outcomeColor}40`,
                }}>
                  {fmtHeadline(headline.v, headline.unit)}
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: T.text.muted, marginBottom: 6, letterSpacing: 0.5 }}>
                    <span>{isRTL ? 'עוצמת R' : 'R strength'}</span>
                    <span style={{ fontFamily: MONO }}>{r.toFixed(2)}R</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: `${T.border.medium}`, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${meter}%` }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: '100%', background: `linear-gradient(90deg, ${outcomeColor}77, ${outcomeColor})` }}
                    />
                  </div>
                </div>
              </div>

              {trade.comments && (
                <div style={{ padding: 15, background: T.bg.tertiary, borderRadius: T.radius.md, border: `1px solid ${T.border.subtle}` }}>
                  <div style={{ fontSize: 9.5, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 }}>{t.comments}</div>
                  <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.6 }}>{trade.comments}</div>
                </div>
              )}

              {/* actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 2, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                <button onClick={onDelete} className="orca-focus" style={{
                  flex: 1, padding: isMobile ? '13px 16px' : '11px 16px',
                  background: `${T.accent.red}14`, border: `1px solid ${T.accent.red}3D`, borderRadius: T.radius.md,
                  color: T.accent.red, cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
                  transition: 'all .18s ease',
                }}>{t.deleteTrade}</button>
                <button onClick={onEdit} className="orca-focus" style={{
                  flex: 1.4, padding: isMobile ? '14px 16px' : '11px 18px',
                  background: `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.cyan})`, border: 'none', borderRadius: T.radius.md,
                  color: T.bg.primary, cursor: 'pointer', fontSize: 12.5, fontWeight: 900,
                  boxShadow: `0 8px 22px -10px ${T.accent.cyan}`,
                  transition: 'all .18s ease',
                }}>{t.editTrade}</button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TradeDetailModal;
