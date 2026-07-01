/**
 * ReadingGuide — thin horizontal bar that follows the pointer/touch.
 * Activated when prefs.guide is true (data-a11y-guide="true" on <html>).
 * Listener is attached to `window` (the bar itself has pointer-events:none
 * so it cannot receive events). Position is updated via `transform` for
 * cheap compositor-only updates.
 */
import { useEffect, useRef } from 'react';
import { useA11yPrefs } from '@/hooks/use-a11y-prefs';

export function ReadingGuide() {
  const { prefs } = useA11yPrefs();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefs.guide) return;
    const el = ref.current;
    if (!el) return;

    const setY = (y: number) => {
      el.style.transform = `translate3d(0, ${y}px, 0)`;
    };
    const onPointer = (e: PointerEvent) => setY(e.clientY);
    const onMouse = (e: MouseEvent) => setY(e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setY(t.clientY);
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [prefs.guide]);

  return <div id="a11y-reading-guide" ref={ref} aria-hidden="true" />;
}
