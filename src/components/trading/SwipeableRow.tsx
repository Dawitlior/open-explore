import { useState, useRef, ReactNode } from 'react';

export interface SwipeAction {
  label: string;
  icon: string;
  color: string;
  bg: string;
  onAction: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  leftActions?: SwipeAction[];   // revealed by swipe-right (in LTR)
  rightActions?: SwipeAction[];  // revealed by swipe-left (in LTR)
  isRTL?: boolean;
  threshold?: number;
}

/**
 * SwipeableRow — iOS-style swipe-to-reveal actions.
 * Pure pointer-event implementation, no extra deps.
 */
export const SwipeableRow = ({
  children, leftActions = [], rightActions = [], isRTL = false, threshold = 64,
}: SwipeableRowProps) => {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const dragging = useRef(false);

  // In RTL, the gesture directions are mirrored.
  const flip = isRTL ? -1 : 1;
  const maxLeft = leftActions.length * 88 * flip;     // positive when in LTR
  const maxRight = -rightActions.length * 88 * flip;  // negative when in LTR

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startOffset.current = offset;
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || startX.current === null) return;
    const dx = e.clientX - startX.current;
    let next = startOffset.current + dx;
    // Clamp
    const upper = Math.max(maxLeft, 0);
    const lower = Math.min(maxRight, 0);
    if (next > upper) next = upper + (next - upper) * 0.25;
    if (next < lower) next = lower + (next - lower) * 0.25;
    setOffset(next);
  };

  const settle = () => {
    dragging.current = false;
    startX.current = null;
    if (Math.abs(offset) < threshold) {
      setOffset(0);
    } else if (offset > 0) {
      setOffset(maxLeft);
    } else {
      setOffset(maxRight);
    }
  };

  const close = () => setOffset(0);

  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => (
    <div style={{
      position: 'absolute', top: 0, bottom: 0,
      [side]: 0,
      display: 'flex',
      alignItems: 'stretch',
    } as any}>
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => { a.onAction(); close(); }}
          style={{
            width: 88,
            border: 'none',
            background: a.bg,
            color: a.color,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: 20 }}>{a.icon}</span>
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }}>
      {leftActions.length > 0 && renderActions(leftActions, 'left')}
      {rightActions.length > 0 && renderActions(rightActions, 'right')}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
          background: 'inherit',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
};
