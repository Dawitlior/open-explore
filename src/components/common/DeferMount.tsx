/**
 * DeferMount — renders children only once the placeholder scrolls near the
 * viewport. Used to keep heavy, below-the-fold chart decks out of the initial
 * render/commit pass without changing any of their behaviour.
 *
 * Once mounted it stays mounted (no unmount thrash while scrolling).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Reserved height while the section is still idle — prevents layout shift. */
  minHeight?: number;
  /** How early to mount, in px of scroll distance. */
  rootMargin?: string;
  placeholder?: ReactNode;
}

export function DeferMount({ children, minHeight = 320, rootMargin = '600px', placeholder }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} style={shown ? undefined : { minHeight }}>
      {shown ? children : placeholder ?? null}
    </div>
  );
}

export default DeferMount;
