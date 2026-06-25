// Wave-0 smoke test: renderer mounts every block type against the
// ORCA default template seed using a value snapshot from the legacy
// adapter, and round-trips a representative change back through writeBlock.
//
// This is a structural smoke — full DOM-snapshot parity vs. WeeklyTab.tsx
// lands in the side-by-side gate (next sub-step).

import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ORCA_DEFAULT_TEMPLATE } from '../../lib/wr-default-template';
import { WeeklyReviewRenderer } from '../WeeklyReviewRenderer';
import { readDraft, writeBlock } from '../legacy-adapter';
import { EMPTY_DRAFT } from '../../hooks/use-week-draft';

const T = {
  id: 'midnight',
  text: { primary: '#fff', muted: '#888' },
  bg: { surface: '#111' },
  border: { subtle: '#222' },
  accent: { cyan: '#0ff' },
  status: { success: '#0f0', danger: '#f00', warning: '#fb0' },
};

describe('WeeklyReviewRenderer (Wave 0 smoke)', () => {
  it('mounts every section of the default template without throwing', () => {
    const values = readDraft(EMPTY_DRAFT);
    const { container } = render(
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={values}
        onChange={() => {}}
        T={T}
        isRTL={false}
        locale="en"
        systemSlots={{
          'system-trades-table': () => <div data-slot="trades">trades</div>,
          'system-stat-chips':   () => <div data-slot="chips">chips</div>,
          'system-risk-gauges':  () => <div data-slot="gauges">gauges</div>,
          'system-grade':        () => <div data-slot="grade">grade</div>,
          'system-ai-insights':  () => <div data-slot="ai">ai</div>,
        }}
      />,
    );
    // Each system slot rendered exactly once
    expect(container.querySelectorAll('[data-slot]').length).toBe(5);
    // Section titles for visible non-chromeless sections
    expect(container.textContent).toContain('Preparation');
    expect(container.textContent).toContain('Execution quality');
    expect(container.textContent).toContain('Strategy adherence');
    expect(container.textContent).toContain('Market context');
    expect(container.textContent).toContain('Mindset & self-management');
    expect(container.textContent).toContain('Decision quality');
  });

  it('round-trips an emotion pill click through the legacy adapter', () => {
    const values = readDraft(EMPTY_DRAFT);
    let last: { id: string; value: unknown } | null = null;
    const { getByText } = render(
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={values}
        onChange={(id, value) => { last = { id, value }; }}
        T={T}
        isRTL={false}
        locale="en"
        systemSlots={{}}
      />,
    );
    fireEvent.click(getByText('Confident'));
    expect(last).toEqual({ id: 'emotion', value: 'confident' });
    // And the patch landing on the legacy draft uses the legacy label
    const patch = writeBlock(last!.id, last!.value, EMPTY_DRAFT);
    expect(patch).toEqual({ emotion: 'Confident', values: { emotion: 'confident' } });
  });

  it('round-trips a prep tri-state cycle through the legacy adapter', () => {
    let values = readDraft(EMPTY_DRAFT);
    let draft = { ...EMPTY_DRAFT };
    const { getByText, rerender } = render(
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={values}
        onChange={(id, value) => {
          const patch = writeBlock(id, value, draft);
          if (patch) draft = { ...draft, ...patch };
          values = readDraft(draft);
        }}
        T={T}
        isRTL={false}
        locale="en"
        systemSlots={{}}
      />,
    );
    fireEvent.click(getByText('Coffee ready ☕'));
    // After one click, prep cycle [neutral,done,missed] → 'done' → preps[0] === 1
    expect(draft.preps[0]).toBe(1);
    rerender(
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={values}
        onChange={() => {}}
        T={T}
        isRTL={false}
        locale="en"
        systemSlots={{}}
      />,
    );
  });
});
