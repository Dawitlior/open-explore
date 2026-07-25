/**
 * Live neon accent palette.
 *
 * The Journal / Orca dimensions were authored with hardcoded neon hexes that
 * are unreadable on a white canvas. Rather than branching every one of the
 * ~400 call sites on `T.isLight`, we expose a single mutable palette object
 * that `applyThemeToDOM` keeps in sync with the active scheme.
 *
 * Because `applyThemeToDOM` runs synchronously before React re-renders (and
 * before the next canvas rAF tick), reading `JC.green` at render time always
 * yields the correct value for the current scheme.
 */

export interface NeonPalette {
  /** Primary positive / profit accent */
  green: string;
  /** Deep positive, used for gradient stops and solid fills */
  greenDeep: string;
  /** Primary negative / loss accent */
  red: string;
  /** Soft negative, used for secondary loss states */
  redSoft: string;
  /** Hard negative, used for critical / breach states */
  redHard: string;
  /** Informational / neutral data accent */
  blue: string;
  /** Warning / attention accent */
  amber: string;
  /** Premium / metallic accent */
  gold: string;
  /** Tertiary categorical accent */
  purple: string;
  /** Lime categorical accent */
  lime: string;
  /** Orange categorical accent */
  orange: string;
  /** Secondary green, used as the far stop of green gradients */
  greenAlt: string;
  /** Secondary amber, used as the far stop of amber gradients */
  amberDeep: string;
  /** Secondary purple, used as the far stop of purple gradients */
  purpleDeep: string;
  /**
   * Foreground for text/icons sitting ON a filled accent chip.
   * Near-black on dark (accents are neon), white on light (accents are deep).
   */
  onAccent: string;
}

const DARK: NeonPalette = {
  green: '#00FFA3',
  greenDeep: '#00CC82',
  red: '#FF4D4D',
  redSoft: '#FF6B6B',
  redHard: '#FF0040',
  blue: '#5AA9FF',
  amber: '#FFC857',
  gold: '#D4AF37',
  purple: '#b794f6',
  lime: '#84cc16',
  orange: '#f97316',
  greenAlt: '#06d6a0',
  amberDeep: '#f5a020',
  purpleDeep: '#7c3aed',
  onAccent: '#0a0e1a',
};

const LIGHT: NeonPalette = {
  green: '#0F9D6B',
  greenDeep: '#0A7C55',
  red: '#DC2626',
  redSoft: '#E11D48',
  redHard: '#BE123C',
  blue: '#2563EB',
  amber: '#B45309',
  gold: '#A16207',
  purple: '#7C3AED',
  lime: '#4D7C0F',
  orange: '#C2410C',
  greenAlt: '#0A7C55',
  amberDeep: '#92400E',
  purpleDeep: '#5B21B6',
  onAccent: '#FFFFFF',
};

/** Mutable live palette — read at render time, never destructured at module scope. */
export const JC: NeonPalette = { ...DARK };

/* ════════════════════════════════════════════════
   SURFACE PALETTE
   Same trick as `JC`, but for the *chrome* (panels, modals, gates,
   toasts, floating utility panels) that was authored with hardcoded
   dark navy hexes. Read `SURF.card` at render time instead of '#0a1628'
   and the component follows the active scheme automatically.
   ════════════════════════════════════════════════ */
export interface SurfacePalette {
  /** Deepest app canvas */
  bg0: string;
  /** Panel / sheet background */
  bg1: string;
  /** Raised card background */
  card: string;
  /** Card background, one step higher (inputs, nested rows) */
  card2: string;
  /** Hairline border */
  border: string;
  /** Stronger border (focus, active) */
  borderStrong: string;
  /** Primary text on the surfaces above */
  text1: string;
  /** Secondary / muted text */
  text2: string;
  /** Tertiary / hint text */
  text3: string;
  /** Full-screen modal scrim */
  scrim: string;
  /** Elevation shadow for floating panels */
  shadow: string;
  /** Panel gradient (top → bottom) */
  panelGradient: string;
}

const SURF_DARK: SurfacePalette = {
  bg0: '#04101c',
  bg1: '#061326',
  card: '#0a1628',
  card2: '#101c30',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.20)',
  text1: '#e9eef7',
  text2: 'rgba(233,238,247,0.70)',
  text3: 'rgba(233,238,247,0.45)',
  scrim: 'rgba(0,0,0,0.78)',
  shadow: '0 24px 70px rgba(0,0,0,0.60)',
  panelGradient: 'linear-gradient(160deg, #0a1628 0%, #061326 100%)',
};

const SURF_LIGHT: SurfacePalette = {
  bg0: '#F4F6FB',
  bg1: '#FFFFFF',
  card: '#FFFFFF',
  card2: '#F7F9FC',
  border: 'rgba(15,23,42,0.10)',
  borderStrong: 'rgba(15,23,42,0.22)',
  text1: '#0F172A',
  text2: 'rgba(15,23,42,0.68)',
  text3: 'rgba(15,23,42,0.45)',
  scrim: 'rgba(15,23,42,0.32)',
  shadow: '0 18px 45px rgba(15,23,42,0.14)',
  panelGradient: 'linear-gradient(160deg, #FFFFFF 0%, #F4F6FB 100%)',
};

/** Mutable live surface palette — read at render time. */
export const SURF: SurfacePalette = { ...SURF_DARK };

/** Called by `applyThemeToDOM` whenever the active scheme changes. */
export function syncNeonPalette(isLight: boolean): void {
  Object.assign(JC, isLight ? LIGHT : DARK);
  Object.assign(SURF, isLight ? SURF_LIGHT : SURF_DARK);
}

/** Immutable snapshot for the given scheme, for code that needs both at once. */
export function neonPalette(isLight: boolean): NeonPalette {
  return isLight ? { ...LIGHT } : { ...DARK };
}

/** Immutable surface snapshot for the given scheme. */
export function surfacePalette(isLight: boolean): SurfacePalette {
  return isLight ? { ...SURF_LIGHT } : { ...SURF_DARK };
}

/** True when the document is currently rendering the light scheme. */
export function isLightScheme(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-scheme') === 'light';
}

