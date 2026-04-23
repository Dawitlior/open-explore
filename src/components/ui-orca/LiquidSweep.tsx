import { useEffect, useState, useRef } from 'react';

/**
 * LiquidSweep — fullscreen liquid-gradient curtain that animates when the
 * user changes theme, system depth, or operating mode. Pure CSS-driven via
 * a `data-active` flag; the keyframes live in index.css (.orca-liquid-sweep).
 *
 * Listens to the global `orca:mode-switch` event emitted by `useSettings`.
 */
export const LiquidSweep = () => {
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onSwitch = (e: Event) => {
      const ev = e as CustomEvent<{ kind: 'theme' | 'operating' | 'depth'; from: string; to: string }>;
      const detail = ev.detail;
      if (!detail) return;

      const labels: Record<string, string> = {
        midnight: 'MIDNIGHT', indigo: 'INDIGO  NOIR', crimson: 'CRIMSON  ONYX',
        standard: 'STANDARD', alpha: 'ALPHA  MODE',
        beginner: 'BEGINNER', live: 'LIVE  MODE', review: 'REVIEW', research: 'RESEARCH  LAB',
      };
      setLabel(labels[detail.to] || detail.to.toUpperCase());

      // Restart animation cleanly
      setActive(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));

      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setActive(false), 1200);
    };

    window.addEventListener('orca:mode-switch', onSwitch);
    return () => {
      window.removeEventListener('orca:mode-switch', onSwitch);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="orca-liquid-sweep" data-active={active ? 'true' : 'false'} aria-hidden>
      <div className="orca-liquid-label">{label}</div>
    </div>
  );
};

export default LiquidSweep;
