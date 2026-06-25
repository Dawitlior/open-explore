// P0 regression guard.
//
// Background: the shipped path passed `systemSlots={{}}` for two waves, so
// every `system-*` block (trades_table, stat_chips, risk_gauges, final_grade,
// ai_insights) rendered as `null` in production. The pre-existing parity gate
// injected a synthetic SLOTS object and so reported green. That can never
// recur — these tests assert against the ACTUAL wiring path:
//
//   1. Source-text guard — `WeeklyTab.tsx` must wire `systemSlots={systemSlots}`
//      and must NOT ship `systemSlots={{}}`. A future regression to `{}` fails
//      this check immediately, before any runtime test.
//
//   2. Builder contract — `buildWeeklySystemSlots(...)` (the function the
//      shipped path uses) returns a renderable React node for every
//      `SystemSlotId`. Empty/sparse outputs fail the test.
//
//   3. Integration — mounting WeeklyReviewRenderer with the real seed schema
//      and the real slot builder produces DOM for every system block.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildWeeklySystemSlots } from '../build-system-slots';
import { WeeklyReviewRenderer, type SystemSlotId } from '../WeeklyReviewRenderer';
import { ORCA_DEFAULT_TEMPLATE } from '../../lib/wr-default-template';
import { readDraft } from '../legacy-adapter';
import { EMPTY_DRAFT } from '../../hooks/use-week-draft';

const SYSTEM_IDS: SystemSlotId[] = [
  'system-trades-table',
  'system-stat-chips',
  'system-risk-gauges',
  'system-grade',
  'system-ai-insights',
];

const T_MIDNIGHT = {
  id: 'midnight',
  text: { primary: '#fff', muted: '#888' },
  bg: { surface: '#111', primary: '#061326' },
  border: { subtle: '#222' },
  accent: { cyan: '#0ff' },
  status: { success: '#0f0', danger: '#f00', warning: '#fb0' },
};

function makeDeps() {
  return {
    T: T_MIDNIGHT,
    isRTL: false,
    L: {
      noTrades: 'No trades this week — press "Add trade" to begin',
      rr: 'R:R', winR: 'WIN R', avgR: 'AVG R', winRate: 'WIN RATE', tradesK: 'TRADES', netR: 'NET R',
      daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
      noInsights: 'Not enough data for insights — keep journaling',
    } as Record<string, string>,
    tradesArr: [],
    hasMoney: false,
    wk: {
      weekKey: '2026-W26',
      netR: 0, netUSD: 0, avgR: 0, avgUSD: 0, avgWinUSD: 0,
      wins: 0, losses: 0, winRate: 0,
    },
    rr: { rr: 0, avgWin: 0, avgLoss: 0 },
    n: 0,
    showUSD: false,
    risk: { dailyUSD: 200, weeklyUSD: 500, monthlyUSD: 1000 },
    isUSD: false,
    execScore: 0,
    computedGrade: 'C' as const,
    gradeColor: '#888',
    fg: '#fff', muted: '#888', border: '#222',
    cyan: '#0ff', win: '#0f0', loss: '#f00', warn: '#fb0',
    card: {}, cardSubtle: {}, statLabel: {}, statValue: {},
  };
}

describe('P0 — WeeklyTab wires real systemSlots into the schema renderer', () => {
  it('source: WeeklyTab.tsx does NOT ship `systemSlots={{}}`', () => {
    const src = readFileSync(
      resolve(__dirname, '../../tabs/WeeklyTab.tsx'),
      'utf8',
    );
    // Hard fail if the literal empty-slots wiring is ever reintroduced. The
    // earlier wave shipped this for weeks and tests stayed green.
    expect(src.includes('systemSlots={{}}'))
      .toBe(false);
    // Positive: the real wiring must be present.
    expect(src.includes('systemSlots={systemSlots}'))
      .toBe(true);
    // And the builder must be invoked in the shipped path.
    expect(src.includes('buildWeeklySystemSlots('))
      .toBe(true);
  });

  it('builder returns a renderable node for every SystemSlotId', () => {
    const slots = buildWeeklySystemSlots(makeDeps());
    for (const id of SYSTEM_IDS) {
      const fn = slots[id];
      expect(fn, `slot missing: ${id}`).toBeTypeOf('function');
      // The renderer calls `slot(block)`; output must be non-null.
      const node = fn!({ id: id, type: id, order: 0 });
      expect(node, `slot returned null/undefined: ${id}`).toBeTruthy();
    }
  });

  it('integration: rendering the seed schema produces DOM for every system block', () => {
    const deps = makeDeps();
    const slots = buildWeeklySystemSlots(deps);
    const { container } = render(
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={readDraft(EMPTY_DRAFT)}
        onChange={() => {}}
        T={T_MIDNIGHT}
        isRTL={false}
        locale="en"
        systemSlots={slots}
      />,
    );
    // Every system slot tags its root with a data-system-slot marker so we
    // can prove presence + ordering without depending on labels.
    const markers = Array.from(container.querySelectorAll('[data-system-slot]'))
      .map(n => n.getAttribute('data-system-slot'));
    expect(markers).toEqual([
      'trades-table',
      'stat-chips',
      'risk-gauges',
      'final-grade',
      'ai-insights',
    ]);
  });

  it('integration: editMode does NOT suppress system-block output', () => {
    const deps = makeDeps();
    const slots = buildWeeklySystemSlots(deps);
    const { container } = render(
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={readDraft(EMPTY_DRAFT)}
        onChange={() => {}}
        T={T_MIDNIGHT}
        isRTL={false}
        locale="en"
        systemSlots={slots}
        editMode
        onTemplateChange={() => {}}
      />,
    );
    const markers = Array.from(container.querySelectorAll('[data-system-slot]'))
      .map(n => n.getAttribute('data-system-slot'));
    expect(markers.sort()).toEqual([
      'ai-insights', 'final-grade', 'risk-gauges', 'stat-chips', 'trades-table',
    ]);
  });

  it('integration (parity-gap proof): editMode still renders prep + exec checklist items', () => {
    // The recording suggested prep + execution checklists looked "empty" in
    // customize mode while strategy rendered. This asserts both render in
    // edit mode — proving the empty appearance was caused by the surrounding
    // null system blocks (the P0 fix above), not by ChecklistBlock dropping
    // content in editMode.
    const deps = makeDeps();
    const slots = buildWeeklySystemSlots(deps);
    const { container } = render(
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={readDraft(EMPTY_DRAFT)}
        onChange={() => {}}
        T={T_MIDNIGHT}
        isRTL={false}
        locale="en"
        systemSlots={slots}
        editMode
        onTemplateChange={() => {}}
      />,
    );
    const text = container.textContent || '';
    // Prep checklist items (4)
    expect(text).toContain('Coffee ready');
    expect(text).toContain('Open Statistical Trade Log');
    expect(text).toContain('Open Weekly Calendar');
    expect(text).toContain('Open Market Journal');
    // Execution checklist items (5)
    expect(text).toContain('Entry followed the plan');
    expect(text).toContain('Stop Loss respected');
    expect(text).toContain('Did not chase price');
    expect(text).toContain('Correct position size');
    expect(text).toContain('No revenge trade');
    // Strategy checklist (control — known good)
    expect(text).toContain('Did the Primary Setup behave as expected?');
  });
});
