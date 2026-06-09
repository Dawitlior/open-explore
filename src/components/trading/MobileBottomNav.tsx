import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { haptics } from '@/lib/haptics';


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

interface Slot {
  id: string;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}

/**
 * MobileBottomNav — thumb-reachable, persistent bottom navigation for mobile.
 * 5 slots: Calendar · Journal · [+] Add · Radar · More
 * Respects safe-area-inset-bottom (iOS home indicator).
 */
export const MobileBottomNav = ({
  T, isRTL, page, onNavigate, onOpenRadar, onOpenMore, onAddTrade, onLongPressCenter,
}: MobileBottomNavProps) => {
  const [pressed, setPressed] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const slots: Slot[] = [
    { id: 'calendar', label: isRTL ? 'לוח' : 'Calendar', icon: '📅', active: page === 'calendar', onClick: () => onNavigate('calendar') },
    { id: 'journal', label: isRTL ? 'יומן' : 'Journal', icon: '📓', active: page === 'journal', onClick: () => onNavigate('journal') },
    { id: 'add', label: isRTL ? 'חדש' : 'New', icon: '＋', active: false, onClick: onAddTrade, highlight: true },
    { id: 'economic-radar', label: isRTL ? 'מכ״ם' : 'Radar', icon: '📡', active: false, onClick: onOpenRadar },
    { id: 'more', label: isRTL ? 'עוד' : 'More', icon: '☰', active: false, onClick: onOpenMore },
  ];

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
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Mount only on client so createPortal has a target.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const nav = (
    <nav
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={isRTL ? 'ניווט תחתון' : 'Bottom navigation'}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        background: `linear-gradient(180deg, ${T.bg.secondary}f5 0%, ${T.bg.primary}fa 100%)`,
        borderTop: `1px solid ${T.border.subtle}`,
        backdropFilter: 'blur(18px) saturate(180%)',
        WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        boxShadow: `0 -8px 32px rgba(0,0,0,0.45)`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingInline: 'max(6px, env(safe-area-inset-left, 0px)) max(6px, env(safe-area-inset-right, 0px))',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >

      {slots.map(slot => {
        const isActive = slot.active;
        const isCenter = slot.highlight;
        const isPressed = pressed === slot.id;
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
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              minWidth: 44,
              minHeight: 44,
              padding: '6px 4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? T.accent.cyan : T.text.muted,
              transform: isPressed ? 'scale(0.92)' : 'scale(1)',
              transition: 'transform 0.12s ease, color 0.2s ease',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 28,
                height: 2,
                background: T.accent.cyan,
                borderRadius: '0 0 3px 3px',
                boxShadow: `0 0 10px ${T.accent.cyan}`,
              }} />
            )}
            {isCenter ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
                color: T.bg.primary,
                fontSize: 24,
                fontWeight: 800,
                lineHeight: 1,
                boxShadow: `0 4px 14px ${T.accent.cyan}55, 0 0 0 1px ${T.accent.cyan}30`,
                marginTop: -10,
              }}>
                {slot.icon}
              </span>
            ) : (
              <span style={{
                fontSize: 20,
                lineHeight: 1,
                filter: isActive ? `drop-shadow(0 0 6px ${T.accent.cyan}80)` : 'none',
              }}>
                {slot.icon}
              </span>
            )}
            {!isCenter && (
              <span style={{
                fontSize: 9.5,
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
              }}>
                {slot.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
