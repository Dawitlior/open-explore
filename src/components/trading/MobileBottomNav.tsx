import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { haptics } from '@/lib/haptics';

/* ─────────────────────────────────────────────────────────────────────────
   MobileBottomNav v2 — floating capsule pill, native-grade polish.
   ─────────────────────────────────────────────────────────────────────────
   Design intent (Wave 6 — full mobile-nav redesign):
   • Floating "island" bar (not edge-to-edge); breathes inside safe area.
   • Vector icons (no emoji) — accent-tinted, theme-aware.
   • Sliding active pill — animates between slots with spring easing.
   • Center FAB raised above the bar; pulsing cyan ring on idle.
   • Press = scale(0.9) + haptic; long-press on FAB → optional callback.
   • Auto-hide when the on-screen keyboard opens (>150px viewport delta).
   • Honors iOS safe-area-inset-bottom + Android gesture-nav.
   ───────────────────────────────────────────────────────────────────── */

export interface MobileBottomNavProps {
  T: any;
  isRTL: boolean;
  page: string;
  onNavigate: (pageId: string) => void;
  onOpenRadar: () => void;
  onOpenMore: () => void;
  onAddTrade: () => void;
  onLongPressCenter?: () => void;
}

type IconKey = 'calendar' | 'journal' | 'radar' | 'more' | 'plus';

const Icon = ({ k, size = 22, color }: { k: IconKey; size?: number; color: string }) => {
  const s = { width: size, height: size, color, display: 'block' } as const;
  switch (k) {
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s} aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M3 10h18" />
          <path d="M8 3v4M16 3v4" />
          <circle cx="8" cy="15" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'journal':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s} aria-hidden>
          <path d="M5 4h11a3 3 0 0 1 3 3v13a1 1 0 0 1-1 1H7a3 3 0 0 1-2-5" />
          <path d="M5 4v13a2 2 0 0 0 2 2h12" />
          <path d="M9 8h7M9 12h5" />
        </svg>
      );
    case 'radar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <path d="M12 12 L19 6" />
        </svg>
      );
    case 'more':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" style={s} aria-hidden>
          <circle cx="6" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" style={s} aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
  }
};

interface Slot {
  id: string;
  label: string;
  icon: IconKey;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}

export const MobileBottomNav = ({
  T, isRTL, page, onNavigate, onOpenRadar, onOpenMore, onAddTrade, onLongPressCenter,
}: MobileBottomNavProps) => {
  const [pressed, setPressed] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [kbOffset, setKbOffset] = useState(0);

  const slots: Slot[] = useMemo(() => ([
    { id: 'calendar',        label: isRTL ? 'לוח'  : 'Calendar', icon: 'calendar', active: page === 'calendar', onClick: () => onNavigate('calendar') },
    { id: 'journal',         label: isRTL ? 'יומן' : 'Journal',  icon: 'journal',  active: page === 'journal',  onClick: () => onNavigate('journal')  },
    { id: 'add',             label: isRTL ? 'חדש'  : 'New',      icon: 'plus',     active: false,               onClick: onAddTrade, highlight: true   },
    { id: 'economic-radar',  label: isRTL ? 'מכ״ם' : 'Radar',    icon: 'radar',    active: false,               onClick: onOpenRadar                  },
    { id: 'more',            label: isRTL ? 'עוד'  : 'More',     icon: 'more',     active: false,               onClick: onOpenMore                   },
  ]), [isRTL, page, onNavigate, onAddTrade, onOpenRadar, onOpenMore]);

  const activeIdx = slots.findIndex(s => s.active);

  const handlePressStart = (id: string) => {
    setPressed(id);
    haptics.selection();
    if (id === 'add' && onLongPressCenter) {
      longPressTimer.current = window.setTimeout(() => {
        haptics.longPress();
        onLongPressCenter();
      }, 500);
    }
  };
  const handlePressEnd = () => {
    setPressed(null);
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  useEffect(() => {
    setMounted(true);
    const vv = window.visualViewport;
    if (!vv) return;
    const recompute = () => {
      const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbOffset(hidden > 150 ? hidden : 0);
    };
    recompute();
    vv.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);
    return () => {
      vv.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
    };
  }, []);

  if (!mounted) return null;

  const accent = T.accent.cyan;
  const accent2 = T.accent.teal || T.accent.cyan;
  // Active indicator position — slides along the bar with a spring easing.
  const slotPct = 100 / slots.length;

  const nav = (
    <>
      {/* Soft glow puddle under the bar — sells the "floating" feel. */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: 0, right: 0,
          bottom: 0,
          height: 'calc(110px + env(safe-area-inset-bottom, 0px))',
          background: `radial-gradient(120% 100% at 50% 100%, ${T.bg.primary}f0 35%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 89,
          opacity: kbOffset ? 0 : 1,
          transition: 'opacity 0.18s ease',
        }}
      />
      <nav
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-label={isRTL ? 'ניווט תחתון' : 'Bottom navigation'}
        data-mobile-bottom-nav
        style={{
          position: 'fixed',
          left: 'max(10px, env(safe-area-inset-left, 0px))',
          right: 'max(10px, env(safe-area-inset-right, 0px))',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
          zIndex: 90,
          height: 64,
          borderRadius: 22,
          background: `linear-gradient(180deg, ${T.bg.secondary}e8 0%, ${T.bg.primary}f2 100%)`,
          border: `1px solid ${T.border.subtle}`,
          boxShadow: `
            0 10px 28px -8px rgba(0,0,0,0.55),
            0 24px 60px -20px ${accent}22,
            inset 0 1px 0 rgba(255,255,255,0.05)
          `,
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'space-around',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          transform: kbOffset ? 'translate3d(0, calc(100% + 24px), 0)' : 'translateZ(0)',
          opacity: kbOffset ? 0 : 1,
          pointerEvents: kbOffset ? 'none' : 'auto',
          transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.18s ease',
          willChange: 'transform, opacity',
          contain: 'layout paint',
          touchAction: 'manipulation',
          overflow: 'hidden',
        }}
      >
        {/* Sliding active pill — sits under the active non-center slot. */}
        {activeIdx >= 0 && slots[activeIdx] && !slots[activeIdx].highlight && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 8,
              bottom: 8,
              width: `calc(${slotPct}% - 12px)`,
              [isRTL ? 'right' : 'left']: `calc(${activeIdx * slotPct}% + 6px)`,
              borderRadius: 16,
              background: `linear-gradient(180deg, ${accent}22, ${accent}10)`,
              border: `1px solid ${accent}38`,
              boxShadow: `0 0 24px -4px ${accent}55, inset 0 0 14px ${accent}18`,
              transition: 'left 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
              pointerEvents: 'none',
            } as any}
          />
        )}

        {slots.map((slot) => {
          const isActive = slot.active;
          const isCenter = slot.highlight;
          const isPressed = pressed === slot.id;
          const slotColor = isActive ? accent : T.text.muted;
          return (
            <button
              key={slot.id}
              onClick={slot.onClick}
              onPointerDown={() => handlePressStart(slot.id)}
              onPointerUp={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onPointerLeave={handlePressEnd}
              aria-label={slot.label}
              aria-current={isActive ? 'page' : undefined}
              style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                minWidth: 44,
                minHeight: 44,
                padding: isCenter ? '0' : '6px 4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: slotColor,
                transform: isPressed ? 'scale(0.9)' : 'scale(1)',
                transition: 'transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                zIndex: 1,
              }}
            >
              {isCenter ? (
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: `conic-gradient(from 220deg, ${accent}, ${accent2}, ${accent})`,
                    color: T.bg.primary,
                    boxShadow: `
                      0 6px 18px ${accent}66,
                      0 0 0 4px ${T.bg.primary},
                      0 0 0 5px ${accent}55,
                      inset 0 -2px 6px rgba(0,0,0,0.18)
                    `,
                    marginTop: -22,
                    transform: isPressed ? 'scale(0.92) rotate(45deg)' : 'scale(1) rotate(0deg)',
                    transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <Icon k="plus" size={26} color={T.bg.primary} />
                  {/* Pulse ring (idle) */}
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: '50%',
                      border: `1px solid ${accent}55`,
                      animation: 'mn-pulse 2.4s ease-out infinite',
                      pointerEvents: 'none',
                    }}
                  />
                </span>
              ) : (
                <>
                  <Icon
                    k={slot.icon}
                    size={isActive ? 23 : 21}
                    color={slotColor}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: '0.02em',
                      lineHeight: 1,
                      opacity: isActive ? 1 : 0.85,
                      transition: 'opacity 0.2s ease, font-weight 0.2s ease',
                    }}
                  >
                    {slot.label}
                  </span>
                </>
              )}
            </button>
          );
        })}

        <style>{`
          @keyframes mn-pulse {
            0%   { transform: scale(1);    opacity: 0.55; }
            70%  { transform: scale(1.35); opacity: 0;   }
            100% { transform: scale(1.35); opacity: 0;   }
          }
        `}</style>
      </nav>
    </>
  );

  return createPortal(nav, document.body);
};
