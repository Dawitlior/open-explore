// Phase 1 gate — ScoreRing renders SVG with locked 80/50 thresholds.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReflectionThemeProvider } from '../../../theme/ReflectionThemeProvider';
import { BlockScoreRing } from '../BlockScoreRing';
import { REFLECTION_TOKENS as T } from '../../../theme/tokens';
import type { Block, ReviewValues, ChecklistState } from '../../../lib/wr-schema';

const block: Block = {
  id: 'execution_score',
  type: 'score',
  label: { en: 'Execution score', he: 'ציון ביצוע' },
  config: { source: 'rules', method: 'checklist_percent', scoreMax: 100 },
};

function values(done: number, total: number): ReviewValues {
  const items: Record<string, ChecklistState> = {};
  for (let i = 0; i < total; i++) items[`r${i}`] = i < done ? 'done' : 'missed';
  return { rules: items };
}

function renderRing(done: number, total: number, dir: 'ltr' | 'rtl' = 'ltr') {
  return render(
    <ReflectionThemeProvider direction={dir}>
      <BlockScoreRing
        block={block}
        values={values(done, total)}
        locale={dir === 'rtl' ? 'he' : 'en'}
        isRTL={dir === 'rtl'}
      />
    </ReflectionThemeProvider>,
  );
}

describe('BlockScoreRing — Phase 1 parity', () => {
  it('renders an SVG role=img with an aria-label carrying the score', () => {
    const { getByRole } = renderRing(8, 10);
    const svg = getByRole('img');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-label')).toMatch(/80/);
  });

  it('binds color to success at score >= 80 (locked threshold)', () => {
    const { container } = renderRing(8, 10);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke')).toBe(T.accent.success);
  });

  it('binds color to warning at 50 <= score < 80', () => {
    const { container } = renderRing(6, 10);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke')).toBe(T.accent.warning);
  });

  it('binds color to error at score < 50', () => {
    const { container } = renderRing(4, 10);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke')).toBe(T.accent.error);
  });

  it('threshold edges: 80 → success, 79 → warning, 50 → warning, 49 → error', () => {
    expect(renderRing(80, 100).container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe(T.accent.success);
    expect(renderRing(79, 100).container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe(T.accent.warning);
    expect(renderRing(50, 100).container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe(T.accent.warning);
    expect(renderRing(49, 100).container.querySelectorAll('circle')[1].getAttribute('stroke')).toBe(T.accent.error);
  });

  it('renders in RTL without throwing and keeps the SVG aria-label', () => {
    const { getByRole } = renderRing(8, 10, 'rtl');
    expect(getByRole('img').getAttribute('aria-label')).toMatch(/80/);
  });

  it('shows 0 when no checklist items recorded', () => {
    const { getByRole } = render(
      <ReflectionThemeProvider direction="ltr">
        <BlockScoreRing block={block} values={{}} locale="en" isRTL={false} />
      </ReflectionThemeProvider>,
    );
    expect(getByRole('img').getAttribute('aria-label')).toMatch(/0/);
  });
});
