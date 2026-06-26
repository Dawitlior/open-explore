// Phase 0 gate: token sheet + threshold contract snapshot.
// If anyone tweaks a token value or threshold, this test forces a conscious change.

import { describe, it, expect } from 'vitest';
import { REFLECTION_TOKENS as T } from '../tokens';
import { createReflectionTheme } from '../reflection-theme';

describe('Reflection theme — token contract', () => {
  it('locks the dark palette hexes', () => {
    expect(T.bg).toEqual({
      app: '#0E1116',
      surface1: '#161A21',
      surface2: '#1C2129',
      surface3: '#232932',
    });
    expect(T.text.primary).toBe('#ECEFF4');
    expect(T.text.secondary).toBe('#A8B0BD');
    expect(T.accent.success).toBe('#34D399');
    expect(T.accent.warning).toBe('#F6C453');
    expect(T.accent.error).toBe('#F2545B');
  });

  it('locks the ScoreRing thresholds at 80 / 50 (legacy parity)', () => {
    expect(T.thresholds.score).toEqual({ success: 80, warning: 50 });
  });

  it('binds grade letters to semantic colors', () => {
    expect(T.thresholds.grade.success).toContain('A');
    expect(T.thresholds.grade.success).toContain('A+');
    expect(T.thresholds.grade.warning).toContain('B');
    expect(T.thresholds.grade.warning).toContain('C');
    expect(T.thresholds.grade.error).toContain('D');
    expect(T.thresholds.grade.error).toContain('F');
  });

  it('builds an always-dark MUI theme that mirrors the tokens', () => {
    const ltr = createReflectionTheme('ltr');
    const rtl = createReflectionTheme('rtl');
    expect(ltr.palette.mode).toBe('dark');
    expect(rtl.palette.mode).toBe('dark');
    expect(ltr.direction).toBe('ltr');
    expect(rtl.direction).toBe('rtl');
    expect(ltr.palette.background.default).toBe(T.bg.app);
    expect(ltr.palette.background.paper).toBe(T.bg.surface1);
    expect(ltr.palette.success.main).toBe(T.accent.success);
    expect(ltr.palette.warning.main).toBe(T.accent.warning);
    expect(ltr.palette.error.main).toBe(T.accent.error);
    expect(ltr.shape.borderRadius).toBe(T.radius.md);
  });
});
