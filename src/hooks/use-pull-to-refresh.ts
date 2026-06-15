import { useEffect, useRef, useState } from 'react';
import { haptics } from '@/lib/haptics';

interface Opts {
  onRefresh: () => void | Promise<void>;
  threshold?: number;   // px to trigger
  max?: number;         // max visual pull
  enabled?: boolean;
}

/**
 * usePullToRefresh — iOS-style pull-down at scrollTop=0.
 * Returns ref to attach to the scroll container + current pull metrics.
 */
export const usePullToRefresh = ({ onRefresh, threshold = 64, max = 110, enabled = true }: Opts) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const armed = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if ((el.scrollTop || 0) > 2) return;
      // Skip when a modal/dialog/sheet is open above the page — touches there
      // should never trigger a page refresh. CalendarModal & co. set body
      // overflow:hidden while open; also bail if the touch originated inside
      // a dialog/portal that has its own scroll container.
      if (typeof document !== 'undefined') {
        if (document.body.style.overflow === 'hidden') return;
        const tgt = e.target as Element | null;
        if (tgt && tgt.closest?.('[role="dialog"], [data-no-ptr], [data-radix-portal]')) return;
      }
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      armed.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPull(0); return; }
      // Rubber-band: slow it down as it goes
      const damped = Math.min(max, Math.pow(dy, 0.85));
      setPull(damped);
      if (damped > threshold && !armed.current) {
        armed.current = true;
        haptics.medium();
      } else if (damped <= threshold && armed.current) {
        armed.current = false;
      }
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const wasArmed = armed.current;
      armed.current = false;
      startY.current = null;
      if (wasArmed) {
        setRefreshing(true);
        setPull(threshold);
        try { await onRefresh(); } finally {
          setRefreshing(false);
          setPull(0);
          haptics.success();
        }
      } else {
        setPull(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [onRefresh, threshold, max, enabled, refreshing]);

  return { ref, pull, refreshing, progress: Math.min(1, pull / threshold) };
};
