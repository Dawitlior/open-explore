/**
 * ReadingGuide — thin horizontal bar that follows the pointer/touch.
 * Activated when prefs.guide is true (data-a11y-guide="true" on <html>).
 * CSS in a11y-engine.css handles the show/hide rule.
 */
import { useEffect, useRef } from 'react';
import { useA11yPrefs } from '@/hooks/use-a11y-prefs';

export function ReadingGuide() {
  const { prefs } = useA11yPrefs();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefs.guide) return;
    const onMove = (y: number) => {
      const el = ref.current;
      if (!el) return;
      el.style.top = `${y}px`;
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientY);
    };
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [prefs.guide]);

  return <div id="a11y-reading-guide" ref={ref} aria-hidden="true" />;
}
