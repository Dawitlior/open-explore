import { useEffect, useState } from 'react';

export interface VisualPrefs {
  /** Light colour scheme active. */
  isLight: boolean;
  /** A11y high-contrast mode active (any non-normal contrast). */
  highContrast: boolean;
  /** User asked for reduced motion (a11y panel or OS setting). */
  reducedMotion: boolean;
  /** 0..1 multiplier for decorative glow / aurora intensity. */
  glow: number;
}

export function readVisualPrefs(): VisualPrefs {
  if (typeof document === 'undefined') {
    return { isLight: false, highContrast: false, reducedMotion: false, glow: 1 };
  }
  const html = document.documentElement;
  const isLight = html.getAttribute('data-scheme') === 'light';
  const highContrast = !!html.getAttribute('data-a11y-contrast');
  const reducedMotion =
    document.body?.getAttribute('data-reduce-motion') === '1' ||
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) === true;
  const glow = highContrast ? 0 : isLight ? 0.45 : 1;
  return { isLight, highContrast, reducedMotion, glow };
}

/** Live visual preferences — re-reads on scheme / a11y / motion changes. */
export function useVisualPrefs(): VisualPrefs {
  const [prefs, setPrefs] = useState<VisualPrefs>(readVisualPrefs);

  useEffect(() => {
    const sync = () => setPrefs(readVisualPrefs());
    sync();

    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme', 'data-a11y-contrast'] });
    if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ['data-reduce-motion'] });

    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    mq?.addEventListener?.('change', sync);

    return () => {
      obs.disconnect();
      mq?.removeEventListener?.('change', sync);
    };
  }, []);

  return prefs;
}

/** Hex/rgb colour + alpha token helper that respects the glow budget. */
export function glowAlpha(hex: string, alpha: number, glow: number): string {
  const a = Math.max(0, Math.min(1, alpha * glow));
  const hh = Math.round(a * 255).toString(16).padStart(2, '0');
  return `${hex}${hh}`;
}
