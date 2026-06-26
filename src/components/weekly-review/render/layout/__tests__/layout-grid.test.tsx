// Phase 1d (revised) — Packing card grid regression guard.
//
// Asserts:
//   1. Per-block layoutSpan defaults: ONLY trades-table + textarea are full.
//      Every other block — including checklist + ai-insights — is `cell`.
//   2. Explicit per-block `layoutSpan` overrides win over defaults.
//   3. Per-section layoutSpan derives `full` from any contained full block;
//      a section explicit override wins.
//   4. Fill-mode renders a [data-reflection-grid] container with
//      [data-layout-span] items, both 'cell' and 'full' types appear.
//   5. EMPTY-CARDS REGRESSION: prep_checklist + exec_checklist render every
//      one of their items in fill mode, in BOTH dir=ltr and dir=rtl. Must
//      fail if either checklist goes empty again.
//   6. Customize mode does NOT mount the layout grid (Phase 3 owns it).

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WeeklyReviewRenderer } from '../../WeeklyReviewRenderer';
import { buildWeeklySystemSlots } from '../../build-system-slots';
import { resolveLayoutSpan, resolveSectionLayoutSpan, BLOCK_SPAN_DEFAULTS } from '../layout-span';
import { ORCA_DEFAULT_TEMPLATE } from '../../../lib/wr-default-template';
import { readDraft } from '../../legacy-adapter';
import { EMPTY_DRAFT } from '../../../hooks/use-week-draft';
import { ReflectionThemeProvider } from '../../../theme/ReflectionThemeProvider';
import type { Block, Section } from '../../../lib/wr-schema';

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
    T: T_MIDNIGHT, isRTL: false,
    L: { noTrades: '', rr: '', winR: '', avgR: '', winRate: '', tradesK: '', netR: '',
         daily: '', weekly: '', monthly: '', noInsights: '' } as Record<string, string>,
    tradesArr: [], hasMoney: false,
    wk: { weekKey: '2026-W26', netR: 0, netUSD: 0, avgR: 0, avgUSD: 0, avgWinUSD: 0, wins: 0, losses: 0, winRate: 0 },
    rr: { rr: 0, avgWin: 0, avgLoss: 0 },
    n: 0, showUSD: false,
    risk: { dailyUSD: 200, weeklyUSD: 500, monthlyUSD: 1000 },
    isUSD: false, execScore: 0, computedGrade: 'C' as const, gradeColor: '#888',
    fg: '#fff', muted: '#888', border: '#222',
    cyan: '#0ff', win: '#0f0', loss: '#f00', warn: '#fb0',
    card: {}, cardSubtle: {}, statLabel: {}, statValue: {},
  };
}

const block = (id: string, type: Block['type'], extra: Partial<Block> = {}): Block =>
  ({ id, type, order: 0, ...extra });

function renderFill(direction: 'ltr' | 'rtl' = 'ltr') {
  const deps = makeDeps();
  const slots = buildWeeklySystemSlots(deps);
  return render(
    <ReflectionThemeProvider direction={direction}>
      <WeeklyReviewRenderer
        schema={ORCA_DEFAULT_TEMPLATE}
        values={readDraft(EMPTY_DRAFT)}
        onChange={() => {}}
        T={T_MIDNIGHT}
        isRTL={direction === 'rtl'}
        locale={direction === 'rtl' ? 'he' : 'en'}
        systemSlots={slots}
      />
    </ReflectionThemeProvider>,
  );
}

describe('Phase 1d revised — layoutSpan defaults', () => {
  it('only trades-table and textarea are full; everything else is cell', () => {
    expect(BLOCK_SPAN_DEFAULTS['system-trades-table']).toBe('full');
    expect(BLOCK_SPAN_DEFAULTS['textarea']).toBe('full');

    // All other block types: cell.
    expect(BLOCK_SPAN_DEFAULTS['checklist']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['system-ai-insights']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['system-stat-chips']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['system-risk-gauges']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['system-grade']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['score']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['binary']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['number']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['text']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['select']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['multiselect']).toBe('cell');
    expect(BLOCK_SPAN_DEFAULTS['scale']).toBe('cell');
  });

  it('explicit block layoutSpan overrides default', () => {
    expect(resolveLayoutSpan(block('a', 'checklist', { layoutSpan: 'full' } as Partial<Block>))).toBe('full');
    expect(resolveLayoutSpan(block('b', 'textarea',  { layoutSpan: 'cell' } as Partial<Block>))).toBe('cell');
  });

  it('section span is full when any visible block is full (textarea/trades-table)', () => {
    const sMindset: Section = {
      id: 'mindset', order: 0,
      blocks: [block('emotion', 'select'), block('reflection', 'textarea')],
    };
    expect(resolveSectionLayoutSpan(sMindset)).toBe('full');

    const sTrades: Section = {
      id: 'trades', order: 0,
      blocks: [block('tt', 'system-trades-table'), block('chips', 'system-stat-chips')],
    };
    expect(resolveSectionLayoutSpan(sTrades)).toBe('full');
  });

  it('section span is cell when no blocks are full (prep, execution, strategy)', () => {
    const sPrep: Section = {
      id: 'prep', order: 0,
      blocks: [block('p', 'checklist')],
    };
    const sExec: Section = {
      id: 'execution', order: 0,
      blocks: [block('s', 'score'), block('c', 'checklist')],
    };
    expect(resolveSectionLayoutSpan(sPrep)).toBe('cell');
    expect(resolveSectionLayoutSpan(sExec)).toBe('cell');
  });

  it('explicit section layoutSpan overrides derivation', () => {
    const s = {
      id: 'x', order: 0, layoutSpan: 'cell',
      blocks: [block('t', 'system-trades-table')],
    } as Section;
    expect(resolveSectionLayoutSpan(s)).toBe('cell');
  });

  it('hidden blocks are ignored when deriving section span', () => {
    const s: Section = {
      id: 's', order: 0,
      blocks: [
        block('t', 'system-trades-table', { hidden: true }),
        block('s', 'score'),
      ],
    };
    expect(resolveSectionLayoutSpan(s)).toBe('cell');
  });
});

describe('Phase 1d revised — renderer wires the packing grid in fill mode', () => {
  it('renders a [data-reflection-grid] container with both cell + full items', () => {
    const { container } = renderFill('ltr');
    const grids = container.querySelectorAll('[data-reflection-grid]');
    expect(grids.length).toBeGreaterThan(0);
    const items = Array.from(container.querySelectorAll('[data-layout-span]'));
    expect(items.length).toBeGreaterThan(0);
    const spans = new Set(items.map(i => i.getAttribute('data-layout-span')));
    expect(spans.has('full')).toBe(true);
    expect(spans.has('cell')).toBe(true);
  });

  it('full items get grid-column: 1 / -1 (span every track)', () => {
    const { container } = renderFill('ltr');
    const fullItems = container.querySelectorAll<HTMLElement>('[data-layout-span="full"]');
    expect(fullItems.length).toBeGreaterThan(0);
    fullItems.forEach(el => {
      expect(el.style.gridColumn).toBe('1 / -1');
    });
  });

  it('grid uses repeat(auto-fill, minmax(...)) so cards pack without holes', () => {
    const { container } = renderFill('ltr');
    const grid = container.querySelector<HTMLElement>('[data-reflection-grid]')!;
    expect(grid.style.display).toBe('grid');
    expect(grid.style.gridTemplateColumns).toMatch(/repeat\(auto-fill,\s*minmax\(/);
    // grid-auto-flow may be serialised as `dense` or `row dense`.
    expect(grid.style.gridAutoFlow).toMatch(/dense/);
  });

  it('customize mode (editMode=true) does NOT mount the packing grid', () => {
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
    expect(container.querySelector('[data-reflection-grid]')).toBeNull();
    expect(container.querySelector('[data-layout-span]')).toBeNull();
  });
});

describe('Phase 1d revised — empty-cards regression (prep + execution)', () => {
  // The bug: prep_checklist + exec_checklist used to render an empty card
  // because they were classified `full` inside a nested half-width grid
  // cell, collapsing to 0px. Now the section is the only grid participant
  // and blocks stack vertically inside it; every checklist item MUST
  // render its label.

  const PREP_ITEMS = [
    /Coffee ready/i,
    /Open Statistical Trade Log/i,
    /Open Weekly Calendar/i,
    /Open Market Journal/i,
  ];
  const EXEC_ITEMS = [
    /Entry followed the plan/i,
    /Stop Loss respected/i,
    /Did not chase price/i,
    /Correct position size/i,
    /No revenge trade/i,
  ];

  it('renders every prep + execution checklist item in dir=ltr', () => {
    const { container } = renderFill('ltr');
    const text = container.textContent || '';
    PREP_ITEMS.forEach(re => expect(text).toMatch(re));
    EXEC_ITEMS.forEach(re => expect(text).toMatch(re));
  });

  const PREP_ITEMS_HE = [
    /הכנת קפה/,
    /לוג סטטיסטי/,
    /יומן קלנדרי/,
    /Market Journal/,
  ];
  const EXEC_ITEMS_HE = [
    /עקבה אחרי התוכנית/,
    /Stop Loss נשמר/,
    /לא רדפתי אחרי מחיר/,
    /גודל פוזיציה נכון/,
    /ללא מסחר נקמה/,
  ];

  it('renders every prep + execution checklist item in dir=rtl (Hebrew)', () => {
    const { container } = renderFill('rtl');
    const text = container.textContent || '';
    PREP_ITEMS_HE.forEach(re => expect(text).toMatch(re));
    EXEC_ITEMS_HE.forEach(re => expect(text).toMatch(re));
  });
});
