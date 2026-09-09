import { describe, expect, it } from 'vitest';
import { themes, themeFromCustom, tintTheme, type CustomTheme } from '@/lib/trading-theme';

describe('live palette updates', () => {
  it('updates card and chart borders when a derived palette changes', () => {
    const first = tintTheme(themes.midnight, '#2563eb');
    const second = tintTheme(themes.midnight, '#f59e0b');

    expect(second.border.subtle).not.toBe(first.border.subtle);
    expect(second.chart.grid).not.toBe(first.chart.grid);
    expect(second.chart.tooltipBorder).not.toBe(first.chart.tooltipBorder);
    expect(second.surface.raised).not.toBe(first.surface.raised);
  });

  it('updates inline and SVG tokens for advanced custom themes', () => {
    const makeTheme = (accentPrimary: string): CustomTheme => ({
      baseMood: 'cool', bgHueShift: 0, surfaceElevation: 50,
      accentPrimary, accentSecondary: '#14b8a6', borderIntensity: 35,
      glowIntensity: 60, mode: 'dark',
    });
    const first = themeFromCustom(themes.midnight, makeTheme('#2563eb'));
    const second = themeFromCustom(themes.midnight, makeTheme('#f59e0b'));

    expect(second.border.subtle).not.toBe(first.border.subtle);
    expect(second.chart.grid).not.toBe(first.chart.grid);
    expect(second.accent.cyan).toBe('#f59e0b');
  });
});