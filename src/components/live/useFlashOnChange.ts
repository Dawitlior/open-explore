import { useEffect, useRef, useState } from 'react';

/**
 * useFlashOnChange — returns a transient 'up' | 'down' | null direction whenever
 * the supplied numeric value changes. Used to drive a 600ms PnL flash overlay.
 */
export function useFlashOnChange(value: number, ttlMs = 600): 'up' | 'down' | null {
  const prevRef = useRef<number>(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    // Two-decimal precision avoids sub-cent jitter.
    const a = Math.round(prev * 100);
    const b = Math.round(value * 100);
    if (a !== b) {
      setFlash(b > a ? 'up' : 'down');
      const t = window.setTimeout(() => setFlash(null), ttlMs);
      prevRef.current = value;
      return () => window.clearTimeout(t);
    }
    prevRef.current = value;
  }, [value, ttlMs]);

  return flash;
}
