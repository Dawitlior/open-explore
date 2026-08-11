import { describe, it, expect } from 'vitest';
import { themes } from '@/lib/trading-theme';

/**
 * Regression guard for the light ("platinum") scheme.
 * Any future palette edit that pushes secondary text back below WCAG AA
 * fails here instead of silently reintroducing ghost text.
 */

function srgbToLinear(c: number) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(fg: string, bg: string) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe('light scheme contrast (WCAG AA)', () => {
  const T = themes.platinum;
  const backgrounds = [T.bg.card, T.bg.tertiary, T.bg.primary];

  for (const tier of ['primary', 'secondary', 'muted', 'dim'] as const) {
    for (const bg of backgrounds) {
      it(`text.${tier} on ${bg} clears 4.5:1`, () => {
        expect(contrast(T.text[tier], bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('chart axis labels clear 4.5:1 on the card surface', () => {
    expect(contrast(T.chart.axis, T.bg.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('card borders stay visible but quiet (1.1:1 – 1.9:1)', () => {
    const c = contrast(T.border.subtle, T.bg.card);
    expect(c).toBeGreaterThan(1.1);
    expect(c).toBeLessThan(1.9);
  });
});
