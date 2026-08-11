/**
 * Desktop chart color-discipline regression tests.
 *
 * These guard the two rules the platform relies on:
 *  1. Categorical chart series are a single-hue, reduced-saturation ladder —
 *     no rainbow, no green/red smuggled into a non-P&L series.
 *  2. Non-P&L indicators (direction split, session markers, score chips)
 *     never reach for the profit/loss palette.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { themes } from '@/lib/trading-theme';
import { SESSIONS } from '@/lib/market-sessions';

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  return { h: hue * 60, s, l };
}

/** Circular hue distance in degrees. */
function hueDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('chart series ramp', () => {
  for (const [id, T] of Object.entries(themes)) {
    it(`${id}: series is a single-hue ladder`, () => {
      const chromatic = T.chart.series
        .map(hexToHsl)
        .filter(c => c.s > 0.08); // pure grays carry no hue to compare
      if (chromatic.length > 1) {
        const base = chromatic[0].h;
        for (const c of chromatic) {
          expect(hueDelta(base, c.h)).toBeLessThanOrEqual(60);
        }
      }
    });

    it(`${id}: series saturation stays professional (no neon)`, () => {
      for (const c of T.chart.series.map(hexToHsl)) {
        expect(c.s).toBeLessThanOrEqual(0.72);
      }
    });

    it(`${id}: series never reuses the P&L profit/loss hues`, () => {
      const pnl = [T.chart.profit, T.chart.loss].map(hexToHsl);
      for (const c of T.chart.series.map(hexToHsl)) {
        if (c.s < 0.12) continue; // neutrals are always allowed
        for (const p of pnl) {
          expect(hueDelta(c.h, p.h)).toBeGreaterThan(20);
        }
      }
    });

    it(`${id}: series steps are distinguishable by lightness`, () => {
      const ls = T.chart.series.map(c => hexToHsl(c).l);
      expect(Math.max(...ls) - Math.min(...ls)).toBeGreaterThan(0.15);
    });

    it(`${id}: axis and grid stay consistent with the scheme`, () => {
      expect(T.chart.grid).toBeTruthy();
      expect(T.chart.axis).toBeTruthy();
      expect(T.chart.axisLine).toBeTruthy();
      expect(T.chart.grid).not.toBe(T.chart.axis);
    });
  }
});

describe('non-P&L widgets avoid the P&L palette', () => {
  it('session markers are neutral (identity, not status)', () => {
    for (const s of SESSIONS) {
      const { s: sat } = hexToHsl(s.color);
      expect(sat).toBeLessThanOrEqual(0.25);
    }
    // Sessions separate by weight, not hue.
    const weights = SESSIONS.map(s => s.weight);
    expect(new Set(weights).size).toBe(SESSIONS.length);
  });

  it('direction split (Long/Short) uses the neutral ramp', () => {
    const src = read('src/components/trading/AdvancedAnalyticsPage.tsx');
    const dirBlock = src.slice(src.indexOf('const dirSplit'), src.indexOf('const dirSplit') + 900);
    expect(dirBlock).not.toMatch(/T\.accent\.(green|red)/);
    expect(dirBlock).toMatch(/neutralRamp/);
  });

  it('session UI does not hardcode profit/loss colors', () => {
    const src = read('src/components/calendar/SessionUI.tsx');
    expect(src).not.toMatch(/T\.(accent|state)\.(green|red|profit|loss)/);
  });
});
