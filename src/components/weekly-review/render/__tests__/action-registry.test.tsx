// Wave-2 Item 5 — action deep-link registry & renderer affordance tests.

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { invokeAction, createDefaultActionRegistry, type ActionRegistry } from '../action-registry';
import { WeeklyReviewRenderer } from '../WeeklyReviewRenderer';
import type { WeeklyReviewSchema } from '../../lib/wr-schema';

// ── invokeAction contract ──────────────────────────────────────────────────

describe('invokeAction', () => {
  it('returns false and no-ops when registry is missing', () => {
    expect(invokeAction({ type: 'open_panel', target: 'x' }, undefined)).toBe(false);
  });

  it('returns false when target has no handler', () => {
    const reg: ActionRegistry = { other: vi.fn() };
    expect(invokeAction({ type: 'open_panel', target: 'x' }, reg)).toBe(false);
    expect(reg.other).not.toHaveBeenCalled();
  });

  it('invokes handler with the action when target matches', () => {
    const fn = vi.fn();
    const reg: ActionRegistry = { 'weekly-calendar': fn };
    const action = { type: 'open_panel' as const, target: 'weekly-calendar' };
    expect(invokeAction(action, reg)).toBe(true);
    expect(fn).toHaveBeenCalledWith(action);
  });

  it('createDefaultActionRegistry exposes the three deep-link targets', () => {
    const reg = createDefaultActionRegistry();
    expect(Object.keys(reg).sort()).toEqual(
      ['market-journal', 'statistical-trade-log', 'weekly-calendar'],
    );
  });

  it('default registry dispatches a CustomEvent on window', () => {
    const reg = createDefaultActionRegistry();
    const heard = vi.fn();
    window.addEventListener('orca:wr-action', heard as EventListener);
    reg['weekly-calendar']({ type: 'open_panel', target: 'weekly-calendar' });
    expect(heard).toHaveBeenCalled();
    window.removeEventListener('orca:wr-action', heard as EventListener);
  });
});

// ── Renderer affordance ────────────────────────────────────────────────────

const mkSchema = (action?: { type: 'open_panel'; target: string }): WeeklyReviewSchema => ({
  schemaFormatVersion: 1,
  meta: { name: 'T', localeDefault: 'en', templateVersion: 2 },
  sections: [
    {
      id: 'prep', order: 10, title: { en: 'Prep' },
      blocks: [
        {
          id: 'chk', type: 'checklist', order: 10,
          config: {
            cycle: ['neutral', 'done', 'missed'],
            goodIs: 'done',
            items: [
              { id: 'plain', label: { en: 'Plain item' } },
              { id: 'deep',  label: { en: 'Deep item' }, ...(action ? { action } : {}) },
            ],
          },
        },
      ],
    },
  ],
});

describe('WeeklyReviewRenderer — action affordance', () => {
  it('renders no affordance when item has no action', () => {
    render(
      <WeeklyReviewRenderer
        schema={mkSchema()} values={{}} onChange={() => {}}
        T={{}} isRTL={false} locale="en" systemSlots={{}}
      />,
    );
    expect(screen.queryByLabelText(/^open /)).toBeNull();
  });

  it('renders no affordance when registry lacks the target', () => {
    render(
      <WeeklyReviewRenderer
        schema={mkSchema({ type: 'open_panel', target: 'weekly-calendar' })}
        values={{}} onChange={() => {}}
        T={{}} isRTL={false} locale="en" systemSlots={{}}
        actionRegistry={{ other: () => {} }}
      />,
    );
    expect(screen.queryByLabelText(/^open /)).toBeNull();
  });

  it('renders affordance and invokes handler on click', () => {
    const fn = vi.fn();
    render(
      <WeeklyReviewRenderer
        schema={mkSchema({ type: 'open_panel', target: 'weekly-calendar' })}
        values={{}} onChange={() => {}}
        T={{}} isRTL={false} locale="en" systemSlots={{}}
        actionRegistry={{ 'weekly-calendar': fn }}
      />,
    );
    const btn = screen.getByLabelText('open weekly-calendar');
    fireEvent.click(btn);
    expect(fn).toHaveBeenCalledWith({ type: 'open_panel', target: 'weekly-calendar' });
  });
});
