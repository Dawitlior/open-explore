import { Suspense, lazy, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import { getEffectiveR } from '@/lib/r-multiple';
import { useVisualPrefs, glowAlpha } from '@/lib/visual-prefs';

const TradeChartPanel = lazy(() => import('./chart/TradeChartPanel'));
const TradeMiniChart = lazy(() => import('./chart/TradeMiniChart'));


type DossierTab = 'overview' | 'chart' | 'notes';


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
  /** Move to the neighbouring trade without closing the dossier. */
  onNavigate?: (dir: -1 | 1) => void;
  /** 1-based position in the visible list, for the "3 / 24" pill. */
  position?: { index: number; total: number };
  canPrev?: boolean;
  canNext?: boolean;

  /** Fast, notes-only save. When omitted the Notes tab stays read-only. */
  onSaveNotes?: (tradeId: number, notes: string) => void | Promise<void>;
}


const MONO = "'JetBrains Mono', monospace";

/**
 * TradeDetailModal — premium "trade dossier" card.
 * Aurora header (theme + contrast aware), hero outcome slab with an
 * R-strength meter, a price ladder (stop → entry → exit) and stat tiles.
 * Supports prev/next navigation via buttons or ← / → keys.
 */
export function TradeDetailModal({
  T, t, trade, isRTL, isMobile, onClose, onEdit, onDelete, tradeHeadline, fmtHeadline,
  onNavigate, position, canPrev = false, canNext = false, onSaveNotes,
}: Props) {
  const { glow, highContrast, reducedMotion } = useVisualPrefs();
  const [tab, setTab] = useState<DossierTab>('overview');
  const [noteDraft, setNoteDraft] = useState(trade.comments || '');
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  // reset the notes editor whenever the dossier moves to another trade
  useEffect(() => { setNoteEditing(false); setNoteDraft(trade.comments || ''); }, [trade.id, trade.comments]);

  const headline = tradeHeadline(trade);
  const r = getEffectiveR(trade);
  const isLong = trade.direction === 'Long';
  const sideColor = isLong ? T.accent.green : T.accent.red;
  const outcomeColor = headline.v > 0 ? T.accent.green : headline.v < 0 ? T.accent.red : T.accent.orange;
  const resultColor = trade.winLoss === 'Win' ? T.accent.green : trade.winLoss === 'Loss' ? T.accent.red : T.accent.orange;
  const dir = isRTL ? 'rtl' : 'ltr';

  const g = (hex: string, a: number) => glowAlpha(hex, a, glow);
  const auroraHeader = highContrast
    ? T.bg.secondary
    : `radial-gradient(120% 160% at ${isRTL ? '100%' : '0%'} 0%, ${g(sideColor, 0.14)}, transparent 55%), radial-gradient(90% 140% at ${isRTL ? '0%' : '100%'} 0%, ${g(outcomeColor, 0.09)}, transparent 60%)`;

  const dateLabel = new Date(trade.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.tagName === 'INPUT'
        || (e.target as HTMLElement | null)?.tagName === 'TEXTAREA';
      if (e.key === 'Escape') { onClose(); return; }
      if (typing) return;
      if (e.key === '1') { setTab('overview'); return; }
      if (e.key === '2') { setTab('chart'); return; }
      if (e.key === '3') { setTab('notes'); return; }
      if (!onNavigate) return;
      const back = isRTL ? 'ArrowRight' : 'ArrowLeft';
      const fwd = isRTL ? 'ArrowLeft' : 'ArrowRight';
      if (e.key === back && canPrev) { e.preventDefault(); onNavigate(-1); }
      if (e.key === fwd && canNext) { e.preventDefault(); onNavigate(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate, canPrev, canNext, isRTL]);


  // ── price ladder positions (0..100) ────────────────────────────────────────
  const pts = [trade.entry, trade.exit, trade.stopLoss ?? trade.entry].filter(n => Number.isFinite(n)) as number[];
  const lo = Math.min(...pts), hi = Math.max(...pts);
  const span = hi - lo || 1;
  const rawPos = (n: number) => ((n - lo) / span) * 100;

  /** Markers with collision-aware lanes so labels never overlap. */
  const markers = (() => {
    const base = [
      { p: trade.stopLoss, label: isRTL ? 'סטופ' : 'Stop', c: T.accent.red },
      { p: trade.entry, label: isRTL ? 'כניסה' : 'Entry', c: T.accent.cyan },
      { p: trade.exit, label: isRTL ? 'יציאה' : 'Exit', c: outcomeColor },
    ].filter(m => m.p != null && Number.isFinite(m.p as number)) as Array<{ p: number; label: string; c: string }>;

    const withPos = base
      .map(m => ({ ...m, x: Math.max(7, Math.min(93, rawPos(m.p))) }))
      .sort((a, b) => a.x - b.x);

    // Assign alternating lanes when two markers sit closer than the label width.
    const MIN_GAP = 22; // % of track
    let lane = 0;
    return withPos.map((m, i) => {
      if (i > 0 && m.x - withPos[i - 1].x < MIN_GAP) lane = lane === 0 ? 1 : 0;
      else lane = 0;
      return { ...m, lane };
    });
  })();

  // ── bipolar R scale: -2R ⟵ 0 ⟶ +5R, with outlier clamping ────────────────
  const R_MIN = -2, R_MAX = 5;
  const zeroPct = (0 - R_MIN) / (R_MAX - R_MIN) * 100; // ≈28.6%
  const clampedR = Math.max(R_MIN, Math.min(R_MAX, r));
  const rPct = (clampedR - R_MIN) / (R_MAX - R_MIN) * 100;
  const isOutlier = r > R_MAX || r < R_MIN;
  const barLeft = Math.min(zeroPct, rPct);
  const barWidth = Math.abs(rPct - zeroPct);

  const NavBtn = ({ d, disabled }: { d: -1 | 1; disabled: boolean }) => {
    const forward = d === 1;
    const glyph = (isRTL ? !forward : forward) ? '›' : '‹';
    return (
      <button
        onClick={() => onNavigate?.(d)}
        disabled={disabled}
        className="orca-focus"
        aria-label={forward ? (isRTL ? 'העסקה הבאה' : 'Next trade') : (isRTL ? 'העסקה הקודמת' : 'Previous trade')}
        style={{
          width: isMobile ? 34 : 36, height: isMobile ? 34 : 36,
          borderRadius: 11,
          border: `1px solid ${T.border.subtle}`,
          background: T.bg.tertiary,
          color: disabled ? T.text.muted : T.text.secondary,
          opacity: disabled ? 0.35 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 19, lineHeight: 1, fontWeight: 700,
          transition: reducedMotion ? 'none' : 'all .18s ease',
        }}
      >{glyph}</button>
    );
  };

  const Tile = ({ label, value, color = T.text.primary, accentBar }: { label: string; value: React.ReactNode; color?: string; accentBar?: string }) => (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
      padding: isMobile ? '12px 13px' : '14px 16px',
      borderRadius: T.radius.md,
      border: `1px solid ${T.border.subtle}`,
      background: highContrast ? T.bg.tertiary : `linear-gradient(160deg, ${T.bg.tertiary}, transparent)`,
    }}>
      {accentBar && <span aria-hidden style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 2, background: accentBar, opacity: highContrast ? 1 : 0.75 }} />}
      <div style={{ fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color: T.text.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color, fontFamily: MONO, lineHeight: 1.1, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  );

  const spring = reducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.9 };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${trade.coin} ${trade.direction}`}
        dir={dir}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(2,6,16,0.62)',
          display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
          padding: isMobile ? '12px 10px 0' : 28,
          backdropFilter: highContrast ? 'none' : 'blur(16px) saturate(120%)',
        }}
      >
        <motion.div
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: isMobile ? 44 : 22, scale: isMobile ? 1 : 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.985 }}
          transition={spring}
          style={{
            position: 'relative',
            width: '100%', maxWidth: isMobile ? '100%' : (tab === 'overview' ? 900 : 1120),
            maxHeight: isMobile ? '90dvh' : '88vh', overflow: 'auto',
            borderRadius: isMobile ? '26px 26px 0 0' : 28,
            border: `1px solid ${T.border.medium}`,
            background: highContrast ? T.bg.card : `linear-gradient(150deg, ${T.bg.card}, ${T.bg.secondary} 62%)`,
            boxShadow: isMobile ? '0 -30px 80px rgba(0,0,0,0.45)' : T.shadow.elevated,
          }}
        >
          {/* ── aurora header ─────────────────────────────────────────────── */}
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            padding: isMobile ? '18px 18px 16px' : '28px 32px 24px',
            borderBottom: `1px solid ${T.border.subtle}`,
            background: auroraHeader,
          }}>
            <span aria-hidden style={{
              position: 'absolute', top: 0, insetInline: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${sideColor}, ${outcomeColor}, transparent)`,
              opacity: highContrast ? 1 : 0.85,
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 999,
                    fontSize: 10, fontWeight: 900, letterSpacing: 1.1, textTransform: 'uppercase',
                    color: sideColor, background: g(sideColor, 0.12), border: `1px solid ${sideColor}55`,
                  }}>
                    {isLong ? '▲' : '▼'} {trade.direction}
                  </span>
                  <span style={{
                    fontSize: isMobile ? 32 : 44, lineHeight: 1, fontWeight: 900,
                    fontFamily: MONO, color: T.text.primary, letterSpacing: '-0.02em',
                  }}>{trade.coin}</span>
                </div>
                <div style={{ marginTop: 10, color: T.text.muted, fontSize: isMobile ? 11.5 : 12.5, fontFamily: MONO }}>
                  {isRTL ? 'עסקה' : 'Trade'} #{position?.index ?? trade.id} • {dateLabel}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {onNavigate && (
                  <>
                    <NavBtn d={-1} disabled={!canPrev} />
                    {position && (
                      <span style={{
                        fontSize: 10.5, fontFamily: MONO, color: T.text.muted,
                        padding: '5px 9px', borderRadius: 999,
                        border: `1px solid ${T.border.subtle}`, background: T.bg.tertiary,
                        whiteSpace: 'nowrap',
                      }}>{position.index} / {position.total}</span>
                    )}
                    <NavBtn d={1} disabled={!canNext} />
                  </>
                )}
                <button
                  onClick={onClose}
                  aria-label={isRTL ? 'סגור' : 'Close'}
                  className="orca-focus"
                  style={{
                    width: isMobile ? 34 : 38, height: isMobile ? 34 : 38,
                    borderRadius: 12,
                    border: `1px solid ${T.border.subtle}`,
                    background: T.bg.tertiary, color: T.text.muted,
                    cursor: 'pointer', fontSize: 20, lineHeight: 1,
                    transition: reducedMotion ? 'none' : 'all .18s ease',
                  }}
                >×</button>
              </div>
            </div>
          </div>

          {/* ── tabs ──────────────────────────────────────────────────────── */}
          <div role="tablist" aria-label={isRTL ? 'תצוגות עסקה' : 'Trade views'} style={{
            display: 'flex', gap: 6,
            padding: isMobile ? '10px 14px 0' : '14px 32px 0',
            borderBottom: `1px solid ${T.border.subtle}`,
          }}>
            {([
              ['overview', isRTL ? 'סקירה' : 'Overview'],
              ['chart', isRTL ? 'גרף' : 'Chart'],
              ['notes', isRTL ? 'הערות' : 'Notes'],
            ] as Array<[DossierTab, string]>).map(([id, label]) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className="orca-focus"
                  style={{
                    position: 'relative',
                    padding: isMobile ? '9px 12px' : '10px 16px',
                    border: 'none', background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    color: active ? T.text.primary : T.text.muted,
                    transition: reducedMotion ? 'none' : 'color .18s ease',
                  }}
                >
                  {label}
                  {active && (
                    <motion.span
                      layoutId="orca-dossier-tab"
                      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                      style={{
                        position: 'absolute', insetInline: 8, bottom: -1, height: 2, borderRadius: 999,
                        background: `linear-gradient(90deg, ${T.accent.blue}, ${T.accent.cyan})`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── body ──────────────────────────────────────────────────────── */}
          <motion.div
            key={trade.id}
            initial={reducedMotion ? false : { opacity: 0, x: isRTL ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              padding: isMobile ? '18px 16px calc(20px + env(safe-area-inset-bottom))' : '26px 32px 30px',
              display: 'grid',
              gridTemplateColumns: isMobile || tab !== 'overview' ? '1fr' : '1.25fr 1fr',
              gap: isMobile ? 16 : 24,
              alignItems: 'start',
            }}>
            {tab === 'overview' && (
              <>
            {/* left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

              {/* price ladder — vertical rows, ordered high → low (never overlaps) */}
              <div style={{
                padding: isMobile ? '16px 14px 14px' : '20px 20px 18px',
                borderRadius: T.radius.lg,
                border: `1px solid ${T.border.subtle}`,
                background: T.bg.tertiary,
              }}>
                <div style={{ fontSize: 9.5, letterSpacing: 0.9, textTransform: 'uppercase', color: T.text.muted, marginBottom: 14 }}>
                  {isRTL ? 'מסלול המחיר' : 'Price path'}
                </div>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span aria-hidden style={{
                    position: 'absolute', insetInlineStart: 5, top: 10, bottom: 10, width: 2, borderRadius: 999,
                    background: `linear-gradient(180deg, ${g(T.accent.cyan, 0.5)}, ${T.border.medium})`,
                  }} />
                  {[...markers].sort((a, b) => b.p - a.p).map((m, i) => {
                    const distR = trade.stopLoss != null && trade.stopLoss !== trade.entry
                      ? Math.abs(m.p - trade.entry) / Math.abs(trade.entry - trade.stopLoss)
                      : null;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', minWidth: 0 }}>
                        <span style={{
                          width: 12, height: 12, borderRadius: 999, flexShrink: 0,
                          background: m.c, boxShadow: `0 0 0 3px ${g(m.c, 0.16)}`,
                        }} />
                        <span style={{
                          fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase',
                          color: T.text.muted, minWidth: 52,
                        }}>{m.label}</span>
                        <span aria-hidden style={{ flex: 1, height: 1, background: T.border.subtle, minWidth: 8 }} />
                        {distR != null && (
                          <span style={{ fontSize: 9, fontFamily: MONO, color: T.text.muted, whiteSpace: 'nowrap' }}>
                            {distR === 0 ? '0R' : `${distR.toFixed(2)}R`}
                          </span>
                        )}
                        <span style={{
                          fontSize: 12.5, fontFamily: MONO, fontWeight: 800, color: m.c,
                          padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap',
                          background: T.bg.card, border: `1px solid ${g(m.c, 0.3)}`,
                        }}>{m.p}</span>
                      </div>
                    );
                  })}
                </div>
              </div>


              {/* stat tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 11 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
              <div style={{
                position: 'relative', overflow: 'hidden',
                padding: isMobile ? '18px 16px' : '24px 22px',
                borderRadius: T.radius.lg,
                border: `1px solid ${highContrast ? outcomeColor : `${outcomeColor}3D`}`,
                background: highContrast
                  ? T.bg.tertiary
                  : `radial-gradient(120% 120% at 50% 0%, ${g(outcomeColor, 0.13)}, transparent 70%), ${T.bg.tertiary}`,
                boxShadow: highContrast ? 'none' : `inset 0 1px 0 ${g(outcomeColor, 0.14)}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: T.text.muted }}>{isRTL ? 'תוצאה' : 'Outcome'}</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 9.5, fontWeight: 900,
                    letterSpacing: 1, textTransform: 'uppercase',
                    color: resultColor, background: g(resultColor, 0.14), border: `1px solid ${resultColor}55`,
                  }}>{trade.winLoss}</span>
                </div>
                <div style={{
                  marginTop: 16, fontSize: isMobile ? 38 : 48, lineHeight: 1,
                  fontWeight: 900, fontFamily: MONO, color: outcomeColor,
                  letterSpacing: '-0.02em',
                  textShadow: highContrast ? 'none' : `0 0 34px ${g(outcomeColor, 0.25)}`,
                }}>
                  {fmtHeadline(headline.v, headline.unit)}
                </div>
                <div style={{ marginTop: 18, direction: 'ltr' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: T.text.muted, marginBottom: 7, letterSpacing: 0.6 }}>
                    <span>{isRTL ? 'עוצמת R' : 'R strength'}</span>
                    <span style={{ fontFamily: MONO, color: outcomeColor, fontWeight: 800 }}>
                      {r.toFixed(2)}R{isOutlier ? (r > 0 ? ' ↗' : ' ↘') : ''}
                    </span>
                  </div>
                  {/* bipolar track: -2R … 0 … +5R */}
                  <div style={{ position: 'relative', height: 8, borderRadius: 999, background: T.border.medium, overflow: 'hidden' }}>
                    <span aria-hidden style={{ position: 'absolute', left: `${zeroPct}%`, top: 0, bottom: 0, width: 1, background: T.text.muted, opacity: 0.55 }} />
                    <motion.div
                      initial={{ width: reducedMotion ? `${barWidth}%` : 0, left: `${barLeft}%` }}
                      animate={{ width: `${barWidth}%`, left: `${barLeft}%` }}
                      transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        position: 'absolute', top: 0, bottom: 0,
                        borderRadius: 999,
                        background: highContrast ? outcomeColor : `linear-gradient(90deg, ${g(outcomeColor, 0.5)}, ${outcomeColor})`,
                      }}
                    />
                    {isOutlier && (
                      <span aria-hidden style={{
                        position: 'absolute', top: 0, bottom: 0, width: 6,
                        [r > 0 ? 'right' : 'left']: 0,
                        background: `repeating-linear-gradient(45deg, ${outcomeColor}, ${outcomeColor} 2px, transparent 2px, transparent 4px)`,
                      } as React.CSSProperties} />
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, fontFamily: MONO, color: T.text.muted, marginTop: 5 }}>
                    <span>-2R</span><span style={{ marginInlineStart: `${zeroPct - 12}%` }}>0</span><span>+5R</span>
                  </div>
                </div>

              </div>

                  {/* mini price preview → jumps to the Chart tab */}
                  <Suspense fallback={
                    <div style={{
                      height: 150, borderRadius: T.radius.lg, border: `1px solid ${T.border.subtle}`,
                      background: T.bg.tertiary, display: 'grid', placeItems: 'center',
                      color: T.text.muted, fontSize: 11,
                    }}>{isRTL ? 'טוען תצוגה…' : 'Loading preview…'}</div>
                  }>
                    <TradeMiniChart T={T} trade={trade} isRTL={isRTL} onOpen={() => setTab('chart')} />
                  </Suspense>

                  {trade.comments && (
                    <div style={{ padding: 16, background: T.bg.tertiary, borderRadius: T.radius.md, border: `1px solid ${T.border.subtle}` }}>
                      <div style={{ fontSize: 9.5, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 }}>{t.comments}</div>
                      <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.65 }}>{trade.comments}</div>
                    </div>
                  )}

                </div>
              </>
            )}

            {tab === 'chart' && (
              <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                <Suspense fallback={
                  <div style={{
                    height: isMobile ? 300 : 420, borderRadius: T.radius.md,
                    border: `1px solid ${T.border.subtle}`, background: T.bg.tertiary,
                    display: 'grid', placeItems: 'center', color: T.text.muted, fontSize: 12,
                  }}>{isRTL ? 'טוען גרף…' : 'Loading chart…'}</div>
                }>
                  <TradeChartPanel T={T} trade={trade} isRTL={isRTL} isMobile={isMobile} reducedMotion={reducedMotion} />
                </Suspense>
              </div>
            )}

            {tab === 'notes' && (
              <div style={{
                gridColumn: '1 / -1', minWidth: 0,
                padding: isMobile ? 16 : 20, background: T.bg.tertiary,
                borderRadius: T.radius.lg, border: `1px solid ${T.border.subtle}`,
                minHeight: 180,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 9.5, color: T.text.muted, textTransform: 'uppercase', letterSpacing: 0.9 }}>{t.comments}</span>
                  <span style={{ flex: 1 }} />
                  {onSaveNotes && !noteEditing && (
                    <button
                      onClick={() => { setNoteDraft(trade.comments || ''); setNoteEditing(true); }}
                      className="orca-focus"
                      style={{
                        padding: '5px 12px', borderRadius: 999, fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
                        border: `1px solid ${g(T.accent.cyan, 0.4)}`, background: g(T.accent.cyan, 0.12), color: T.accent.cyan,
                      }}
                    >{isRTL ? 'ערוך הערות' : 'Edit notes'}</button>
                  )}
                </div>

                {noteEditing ? (
                  <>
                    <textarea
                      value={noteDraft}
                      onChange={e => setNoteDraft(e.target.value)}
                      rows={7}
                      autoFocus
                      placeholder={isRTL ? 'מה עבד, מה לא, ומה תעשה אחרת…' : 'What worked, what didn’t, what you’d do differently…'}
                      style={{
                        width: '100%', resize: 'vertical', padding: 12, borderRadius: T.radius.md,
                        border: `1px solid ${T.border.medium}`, background: T.bg.card, color: T.text.primary,
                        fontSize: 13.5, lineHeight: 1.7, fontFamily: 'inherit',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: T.text.muted }}>
                        {isRTL ? 'השמירה מעדכנת רק את ההערות — שאר נתוני העסקה לא משתנים.'
                               : 'Saving updates only the notes — no other trade data is touched.'}
                      </span>
                      <span style={{ flex: 1 }} />
                      <button
                        onClick={() => setNoteEditing(false)}
                        className="orca-focus"
                        style={{
                          padding: '8px 14px', borderRadius: T.radius.md, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                          border: `1px solid ${T.border.subtle}`, background: T.bg.card, color: T.text.secondary,
                        }}
                      >{isRTL ? 'ביטול' : 'Cancel'}</button>
                      <button
                        onClick={async () => {
                          if (!onSaveNotes) return;
                          setNoteSaving(true);
                          try { await onSaveNotes(trade.id, noteDraft); setNoteEditing(false); }
                          finally { setNoteSaving(false); }
                        }}
                        disabled={noteSaving}
                        className="orca-focus"
                        style={{
                          padding: '8px 16px', borderRadius: T.radius.md, fontSize: 11.5, fontWeight: 800,
                          cursor: noteSaving ? 'wait' : 'pointer', opacity: noteSaving ? 0.7 : 1,
                          border: `1px solid ${g(T.accent.cyan, 0.5)}`, background: g(T.accent.cyan, 0.18), color: T.accent.cyan,
                        }}
                      >{noteSaving ? (isRTL ? 'שומר…' : 'Saving…') : (isRTL ? 'שמור הערות' : 'Save notes')}</button>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 14, color: T.text.secondary, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                    {trade.comments || (isRTL ? 'אין הערות לעסקה הזו.' : 'No notes for this trade yet.')}
                  </div>
                )}
              </div>
            )}

            {/* actions */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, marginTop: 2, flexDirection: isMobile ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>
              <button onClick={onDelete} className="orca-focus" style={{
                flex: isMobile ? 1 : 0.25, padding: isMobile ? '13px 16px' : '12px 16px',
                background: g(T.accent.red, 0.1), border: `1px solid ${T.accent.red}3D`, borderRadius: T.radius.md,
                color: T.accent.red, cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
                transition: reducedMotion ? 'none' : 'all .18s ease',
              }}>{t.deleteTrade}</button>
              <button onClick={onEdit} className="orca-focus" style={{
                flex: isMobile ? 1.4 : 0.35, padding: isMobile ? '14px 16px' : '12px 18px',
                background: `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.cyan})`, border: 'none', borderRadius: T.radius.md,
                color: T.bg.primary, cursor: 'pointer', fontSize: 12.5, fontWeight: 900,
                boxShadow: highContrast ? 'none' : `0 8px 22px -10px ${g(T.accent.cyan, 0.9)}`,
                transition: reducedMotion ? 'none' : 'all .18s ease',
              }}>{t.editTrade}</button>
            </div>

          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TradeDetailModal;
