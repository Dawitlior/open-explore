import { describe, expect, it } from 'vitest';
import { applyDerivedPalette, themes, themeFromCustom, tintTheme, type CustomTheme } from '@/lib/trading-theme';

describe('live palette updates', () => {
  it('updates card and chart borders when a derived palette changes', () => {
    const first = tintTheme(themes.midnight, '#2563eb');
    const second = tintTheme(themes.midnight, '#f59e0b');

    expect(second.border.subtle).not.toBe(first.border.subtle);
    expect(second.chart.grid).not.toBe(first.chart.grid);
    expect(second.chart.tooltipBorder).not.toBe(first.chart.tooltipBorder);
    expect(second.surface.raised).not.toBe(first.surface.raised);
  });

  it('repaints semantic DOM tokens without a page reload', () => {
    document.documentElement.setAttribute('data-theme', 'midnight');
    applyDerivedPalette('#2563eb');
    const firstBorder = document.documentElement.style.getPropertyValue('--orca-border-subtle');
    const firstGrid = document.documentElement.style.getPropertyValue('--orca-chart-grid');

    applyDerivedPalette('#f59e0b');

    expect(document.documentElement.style.getPropertyValue('--orca-border-subtle')).not.toBe(firstBorder);
    expect(document.documentElement.style.getPropertyValue('--orca-chart-grid')).not.toBe(firstGrid);
    expect(document.documentElement.style.getPropertyValue('--orca-tooltip-border')).toContain('hsl(');
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