/**
 * Floating Orca Coach launcher (Pro only).
 *
 * A circular launcher pinned to the bottom corner of every authenticated
 * product screen. It opens the same coach surface in a compact panel, so a
 * trader can ask a question without leaving the channel they are reading.
 *
 * The panel renders `OrcaCoachPage` in `panel` variant, which shares the same
 * saved conversations, portfolio selection, usage meter and edge function as
 * the full Coach channel — only one of the two is ever mounted, so the active
 * thread is always restored from the shared store.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor } from '@/lib/semantic-color';
import { useIsMobile } from '@/hooks/use-mobile';

const OrcaCoachPage = lazy(() => import('@/components/coach/OrcaCoachPage'));

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  /** Pro entitlement — the launcher is hidden for free accounts. */
  enabled: boolean;
  /** True while the full Coach channel is on screen; the launcher hides. */
  hidden: boolean;
}

export default function CoachLauncher({ T, isRTL, enabled, hidden }: Props) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const accent = infoColor(T);

  // Close on Escape, and never leave the panel open when it gets hidden.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);

  if (!enabled || hidden || typeof document === 'undefined') return null;

  const panelW = isMobile ? 'calc(100vw - 20px)' : 'min(460px, calc(100vw - 40px))';
  const panelH = isMobile ? 'min(76vh, 620px)' : 'min(72vh, 660px)';

  return createPortal(
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Orca Coach"
          style={{
            position: 'fixed', insetInlineEnd: isMobile ? 10 : 22, bottom: isMobile ? 84 : 92,
            width: panelW, height: panelH, zIndex: 1300,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            direction: isRTL ? 'rtl' : 'ltr',
            background: T.bg.card, border: `1px solid ${T.border.medium}`,
            borderRadius: T.radius.xl, boxShadow: '0 40px 90px -40px rgba(0,0,0,0.85)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0,
            padding: '11px 13px', borderBottom: `1px solid ${T.border.subtle}`,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center',
              background: `${accent}1C`, border: `1px solid ${accent}40`, color: accent, fontSize: 10,
            }}>◈</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: T.text.primary }}>Orca Coach</span>
            <button
              onClick={() => setOpen(false)}
              aria-label={isRTL ? 'סגירה' : 'Close'}
              style={{
                marginInlineStart: 'auto', background: 'transparent', border: 'none',
                color: T.text.muted, cursor: 'pointer', padding: 4, borderRadius: 8,
              }}
            ><X size={15} /></button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 12px 12px' }}>
            <Suspense fallback={
              <div style={{ padding: 18, fontSize: 12, color: T.text.muted }}>
                {isRTL ? 'טוען את המאמן…' : 'Loading the coach…'}
              </div>
            }>
              <OrcaCoachPage T={T} isRTL={isRTL} variant="panel" />
            </Suspense>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label={isRTL ? 'Orca Coach — עוזר AI' : 'Orca Coach — AI assistant'}
        aria-expanded={open}
        style={{
          position: 'fixed', insetInlineEnd: isMobile ? 14 : 24, bottom: isMobile ? 18 : 24,
          width: 56, height: 56, borderRadius: 999, zIndex: 1301, cursor: 'pointer',
          display: 'grid', placeItems: 'center', color: T.text.primary,
          background: `radial-gradient(circle at 50% 45%, ${accent}2E, ${T.bg.card} 72%)`,
          border: `1px solid ${accent}66`,
          // Soft breathing halo around the brand mark.
          boxShadow: `0 0 0 1px ${accent}22, 0 0 22px -2px ${accent}AA, 0 18px 44px -18px ${accent}`,
          animation: 'orca-coach-halo 3.2s ease-in-out infinite',
          transition: 'transform 160ms ease',
        }}
      >{open
        ? <X size={19} />
        : <img
            src="/orcaIcon.ico"
            alt=""
            aria-hidden
            width={34}
            height={34}
            style={{ width: 34, height: 34, objectFit: 'contain', filter: `drop-shadow(0 0 6px ${accent}AA)` }}
          />}</button>
    </>,
    document.body,
  );
}
