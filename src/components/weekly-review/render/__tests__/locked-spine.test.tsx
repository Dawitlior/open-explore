// Locked spine enforcement: trades_table / stat_chips / final_grade have no
// delete/hide/reorder controls; risk_gauges + ai_insights are hide-able but
// not deletable.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ORCA_DEFAULT_TEMPLATE } from '../../lib/wr-default-template';
import { WeeklyReviewRenderer } from '../WeeklyReviewRenderer';
import { readDraft } from '../legacy-adapter';
import { EMPTY_DRAFT } from '../../hooks/use-week-draft';

const T = {
  id: 'midnight',
  text: { primary: '#fff', muted: '#888' },
  bg: { surface: '#111' },
  border: { subtle: '#222' },
  accent: { cyan: '#0ff' },
  status: { success: '#0f0', danger: '#f00', warning: '#fb0' },
};

const SLOTS = {
  'system-trades-table': () => <div data-slot="trades" />,
  'system-stat-chips':   () => <div data-slot="chips" />,
  'system-risk-gauges':  () => <div data-slot="gauges" />,
  'system-grade':        () => <div data-slot="grade" />,
  'system-ai-insights':  () => <div data-slot="ai" />,
} as const;

function mount(editMode: boolean) {
  return render(
    <WeeklyReviewRenderer
      schema={ORCA_DEFAULT_TEMPLATE}
      values={readDraft(EMPTY_DRAFT)}
      onChange={() => {}}
      T={T}
      isRTL={false}
      locale="en"
      systemSlots={SLOTS}
      editMode={editMode}
      onTemplateChange={() => {}}
    />,
  );
}

function ariaLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('button'))
    .map(b => b.getAttribute('aria-label') || '')
    .filter(Boolean);
}

describe('locked-spine controls', () => {
  it('no delete/hide controls render for locked spine blocks', () => {
    const { container } = mount(true);
    const labels = ariaLabels(container);
    for (const slug of ['trades_table', 'stat_chips', 'final_grade']) {
      expect(labels).not.toContain(`delete ${slug}`);
      expect(labels).not.toContain(`hide ${slug}`);
      expect(labels).not.toContain(`move ${slug} up`);
      expect(labels).not.toContain(`move ${slug} down`);
    }
  });

  it('hide is available for risk_gauges and ai_insights', () => {
    const { container } = mount(true);
    const labels = ariaLabels(container);
    expect(labels).toContain('hide risk_gauges');
    expect(labels).toContain('hide ai_insights');
    // but not delete
    expect(labels).not.toContain('delete risk_gauges');
    expect(labels).not.toContain('delete ai_insights');
  });

  it('zero edit chrome in fill mode (no move/hide/delete buttons anywhere)', () => {
    const { container } = mount(false);
    const labels = ariaLabels(container);
    expect(labels.filter(l => l.startsWith('move ') || l.startsWith('hide ') || l.startsWith('delete ') || l.startsWith('demote '))).toEqual([]);
  });
});
