import { useEffect, useRef } from 'react';

/**
 * setInterval that only runs while the tab is actually visible.
 *
 * Background tabs previously kept every countdown, poll and "time remaining"
 * ticker running, which burns CPU and battery for zero user-visible benefit.
 * The callback also fires once immediately on re-focus so the UI catches up
 * with whatever changed while the tab was hidden.
 *
 * @param callback  invoked on each tick (always the latest closure)
 * @param delayMs   interval in ms, or `null` to disable entirely
 * @param fireOnResume  run the callback once when the tab becomes visible again
 */
export function useVisibleInterval(
  callback: () => void,
  delayMs: number | null,
  fireOnResume = true,
) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (delayMs === null) return;
    if (typeof document === 'undefined') return;

    let id: number | undefined;

    const stop = () => {
      if (id !== undefined) {
        window.clearInterval(id);
        id = undefined;
      }
    };

    const start = () => {
      if (id !== undefined) return;
      id = window.setInterval(() => savedCallback.current(), delayMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (fireOnResume) savedCallback.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [delayMs, fireOnResume]);
}
