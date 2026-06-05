// Theme-aware subtle background helpers for the weekly-review tabs.
// Returns light- or dark-mode appropriate fills so text stays readable
// in Orca's platinum (light) and midnight/indigo (dark) themes.

function isLightBg(bg: string | undefined): boolean {
  if (!bg) return false;
  const s = bg.toLowerCase().trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const v = h.length === 3
      ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    if (v.some(Number.isNaN)) return false;
    return (v[0] * 0.299 + v[1] * 0.587 + v[2] * 0.114) > 170;
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map(x => parseFloat(x));
    return (r * 0.299 + g * 0.587 + b * 0.114) > 170;
  }
  const hsl = s.match(/hsla?\(\s*\d+[, ]\s*\d+%?[, ]\s*(\d+)%/);
  if (hsl) return parseInt(hsl[1], 10) > 60;
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function themeBgs(T: any) {
  const light = isLightBg(T?.bg?.primary);
  return {
    isLight: light,
    subtle: light ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.18)',
    header: light ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.22)',
    overlay: light ? 'rgba(0,0,0,0.025)' : 'rgba(255,255,255,0.025)',
  };
}
