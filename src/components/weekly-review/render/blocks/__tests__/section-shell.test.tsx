// Phase 1 gate — fill-mode section shell uses MUI Card (data-reflection-section)
// and edit-mode keeps the legacy inline-styled <section>.

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReflectionThemeProvider } from '../../../theme/ReflectionThemeProvider';
import { WeeklyReviewRenderer } from '../../WeeklyReviewRenderer';
import type { WeeklyReviewSchema } from '../../../lib/wr-schema';

const schema: WeeklyReviewSchema = {
  schemaFormatVersion: 1,
  meta: { name: 'test', localeDefault: 'en', templateVersion: 1 },
  sections: [
    {
      id: 'prep',
      order: 1,
      title: { en: 'Preparation', he: 'הכנה' },
      icon: '🧭',
      blocks: [
        {
          id: 'rules',
          type: 'checklist',
          order: 1,
          label: { en: 'Rules', he: 'כללים' },
          config: { items: [{ id: 'rule_a', label: { en: 'A', he: 'א' } }] },
        },
      ],
    },
  ],
};

function renderAt(editMode: boolean, dir: 'ltr' | 'rtl' = 'ltr') {
  return render(
    <ReflectionThemeProvider direction={dir}>
      <WeeklyReviewRenderer
        schema={schema}
        values={{}}
        onChange={vi.fn()}
        T={{}}
        isRTL={dir === 'rtl'}
        locale={dir === 'rtl' ? 'he' : 'en'}
        systemSlots={{}}
        editMode={editMode}
        onTemplateChange={editMode ? vi.fn() : undefined}
      />
    </ReflectionThemeProvider>,
  );
}

describe('Section shell — fill vs edit mode', () => {
  it('fill mode wraps each section in the MUI BlockSection card', () => {
    const { container } = renderAt(false);
    expect(container.querySelector('[data-reflection-section]')).toBeTruthy();
    // Section heading is rendered as MUI Typography h2.
    expect(container.querySelector('h2')?.textContent).toContain('Preparation');
  });

  it('edit mode keeps the legacy inline section (no MUI Card)', () => {
    const { container } = renderAt(true);
    expect(container.querySelector('[data-reflection-section]')).toBeFalsy();
    expect(container.querySelector('section')).toBeTruthy();
  });

  it('fill mode works under RTL', () => {
    const { container } = renderAt(false, 'rtl');
    expect(container.querySelector('[data-reflection-section]')).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toContain('הכנה');
  });
});
