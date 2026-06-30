/**
 * use-a11y-prefs — Phase 1 of the ORCA Accessibility Engine.
 *
 * Stores the user's accessibility preferences in localStorage (no cloud
 * round-trip — the panel must respond instantly on every device, even
 * pre-auth). Applies them by writing data-attributes and CSS variables
 * onto <html>, which `a11y-engine.css` reacts to.
 *
 * Layer B (semantic foundation / form labels / chart alt-text) is a
 * separate workstream; this hook never touches business code.
 */
import { useCallback, useEffect, useState } from 'react';

export type A11yContrast = 'normal' | 'high' | 'inverted';

export interface A11yPrefs {
  scale: number;             // 1.0 .. 2.0
  contrast: A11yContrast;
  grayscale: boolean;
  links: boolean;
  readable: boolean;
  spacing: boolean;
  cursor: boolean;
  focus: boolean;
  motion: boolean;           // true = reduced
  guide: boolean;            // reading guide bar
}

export const A11Y_DEFAULTS: A11yPrefs = {
  scale: 1,
  contrast: 'normal',
  grayscale: false,
  links: false,
  readable: false,
  spacing: false,
  cursor: false,
  focus: false,
  motion: false,
  guide: false,
};

const KEY = 'orca:a11y-prefs';
const SCALE_MIN = 1;
const SCALE_MAX = 2;
const SCALE_STEP = 0.1;

function readCache(): A11yPrefs {
  if (typeof window === 'undefined') return A11Y_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return A11Y_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<A11yPrefs>;
    return { ...A11Y_DEFAULTS, ...parsed };
  } catch { return A11Y_DEFAULTS; }
}

function persist(p: A11yPrefs) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* noop */ }
}

function applyToDOM(p: A11yPrefs) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const scaleActive = Math.abs(p.scale - 1) > 0.001;
  html.style.setProperty('--a11y-scale', String(p.scale));
  if (scaleActive) html.setAttribute('data-a11y-scale-active', 'true');
  else html.removeAttribute('data-a11y-scale-active');

  if (p.contrast === 'normal') html.removeAttribute('data-a11y-contrast');
  else html.setAttribute('data-a11y-contrast', p.contrast);

  const toggle = (attr: string, on: boolean, val = 'true') => {
    if (on) html.setAttribute(attr, val);
    else html.removeAttribute(attr);
  };
  toggle('data-a11y-grayscale', p.grayscale);
  toggle('data-a11y-links', p.links);
  toggle('data-a11y-readable', p.readable);
  toggle('data-a11y-spacing', p.spacing);
  toggle('data-a11y-cursor', p.cursor);
  toggle('data-a11y-focus', p.focus);
  toggle('data-a11y-motion', p.motion, 'reduced');
  toggle('data-a11y-guide', p.guide);
}

// Apply cached prefs immediately at module load so first paint already
// honours the user's settings (no flash of un-styled accessibility).
if (typeof document !== 'undefined') applyToDOM(readCache());

export function useA11yPrefs() {
  const [prefs, setPrefs] = useState<A11yPrefs>(() => readCache());

  useEffect(() => { applyToDOM(prefs); persist(prefs); }, [prefs]);

  const update = useCallback((patch: Partial<A11yPrefs>) => {
    setPrefs(prev => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setPrefs(A11Y_DEFAULTS), []);

  const incScale = useCallback(() => {
    setPrefs(prev => ({
      ...prev,
      scale: Math.min(SCALE_MAX, Math.round((prev.scale + SCALE_STEP) * 10) / 10),
    }));
  }, []);
  const decScale = useCallback(() => {
    setPrefs(prev => ({
      ...prev,
      scale: Math.max(SCALE_MIN, Math.round((prev.scale - SCALE_STEP) * 10) / 10),
    }));
  }, []);

  return { prefs, update, reset, incScale, decScale, SCALE_MIN, SCALE_MAX };
}
