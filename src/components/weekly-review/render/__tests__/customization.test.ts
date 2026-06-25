// Wave-2 Item 4 — customization helpers tests + Item-3 cross-test.

import { describe, expect, it } from 'vitest';
import {
  reorderSection, reorderBlock,
  demoteToChecklist, softDeleteBlock, softDeleteSection,
  softDeleteChecklistItem, addChecklistItem,
} from '../customization';
import { mergeTemplate } from '../../lib/wr-merge';
import type { WeeklyReviewSchema, Section, Block } from '../../lib/wr-schema';

const sec = (id: string, blocks: Block[] = [], order = 10): Section => ({ id, order, blocks });
const text = (id: string, order = 10): Block => ({ id, type: 'text', order });
const num = (id: string, order = 10): Block => ({ id, type: 'number', order });
const chk = (id: string, items: string[], order = 10): Block => ({
  id, type: 'checklist', order,
  config: { cycle: ['neutral', 'done', 'missed'], goodIs: 'done',
    items: items.map(i => ({ id: i, label: { en: i } })) },
});
const tpl = (sections: Section[]): WeeklyReviewSchema => ({
  schemaFormatVersion: 1,
  meta: { name: 'T', localeDefault: 'en', templateVersion: 2, basedOn: 'orca_default_v2' },
  sections,
});

describe('reorderSection / reorderBlock', () => {
  it('swaps adjacent sections and rebases order', () => {
    const t = tpl([sec('a', [], 10), sec('b', [], 20), sec('c', [], 30)]);
    const r = reorderSection(t, 'b', -1);
    expect(r.sections.map(s => s.id)).toEqual(['b', 'a', 'c']);
    expect(r.sections.map(s => s.order)).toEqual([10, 20, 30]);
  });

  it('no-op at the boundary', () => {
    const t = tpl([sec('a', [], 10), sec('b', [], 20)]);
    expect(reorderSection(t, 'a', -1)).toBe(t);
    expect(reorderSection(t, 'b', 1)).toBe(t);
  });

  it('reorders blocks within a section', () => {
    const t = tpl([sec('prep', [text('x', 10), text('y', 20)])]);
    const r = reorderBlock(t, 'prep', 'y', -1);
    expect(r.sections[0].blocks.map(b => b.id)).toEqual(['y', 'x']);
  });
});

describe('demoteToChecklist', () => {
  it('converts a number block to a single-item checklist preserving slug', () => {
    const t = tpl([sec('s', [{ ...num('focus'), label: { en: 'Focus' } }])]);
    const r = demoteToChecklist(t, 's', 'focus');
    const b = r.sections[0].blocks[0];
    expect(b.id).toBe('focus');
    expect(b.type).toBe('checklist');
    expect(b.config?.items).toEqual([{ id: 'focus', label: { en: 'Focus' } }]);
  });

  it('is idempotent on an already-checklist block', () => {
    const t = tpl([sec('s', [chk('c', ['i1'])])]);
    const r = demoteToChecklist(t, 's', 'c');
    expect(r.sections[0].blocks[0]).toEqual(t.sections[0].blocks[0]);
  });

  it('refuses to demote a system block', () => {
    const sys: Block = { id: 'sys', type: 'system-grade', order: 10 };
    const t = tpl([sec('s', [sys])]);
    const r = demoteToChecklist(t, 's', 'sys');
    expect(r.sections[0].blocks[0]).toBe(sys);
  });
});

describe('soft delete tombstones', () => {
  it('softDeleteBlock removes block and records tombstone', () => {
    const t = tpl([sec('s', [text('a'), text('b')])]);
    const r = softDeleteBlock(t, 's', 'a');
    expect(r.sections[0].blocks.map(b => b.id)).toEqual(['b']);
    expect(r.meta.removedSeedIds).toEqual(['a']);
  });

  it('softDeleteSection removes section and records tombstone', () => {
    const t = tpl([sec('a'), sec('b')]);
    const r = softDeleteSection(t, 'a');
    expect(r.sections.map(s => s.id)).toEqual(['b']);
    expect(r.meta.removedSeedIds).toEqual(['a']);
  });

  it('softDeleteChecklistItem removes item and records tombstone', () => {
    const t = tpl([sec('s', [chk('c', ['i1', 'i2'])])]);
    const r = softDeleteChecklistItem(t, 's', 'c', 'i1');
    expect(r.sections[0].blocks[0].config!.items!.map(i => i.id)).toEqual(['i2']);
    expect(r.meta.removedSeedIds).toEqual(['i1']);
  });

  it('tombstones are unique (no duplicates on re-delete)', () => {
    const t = tpl([sec('s', [text('a'), text('b')])]);
    let r = softDeleteBlock(t, 's', 'a');
    r = { ...r, meta: { ...r.meta, removedSeedIds: r.meta.removedSeedIds } };
    // Re-applying a tombstone manually shouldn't duplicate
    const r2 = softDeleteBlock(r, 's', 'a'); // already removed → still single tombstone
    expect(r2.meta.removedSeedIds).toEqual(['a']);
  });
});

describe('addChecklistItem', () => {
  it('appends a user_-prefixed item to a checklist', () => {
    const t = tpl([sec('s', [chk('c', ['i1'])])]);
    const r = addChecklistItem(t, 's', 'c', { en: 'Custom' }, 'x9');
    const items = r.sections[0].blocks[0].config!.items!;
    expect(items.map(i => i.id)).toEqual(['i1', 'user_x9']);
    expect(items[1].label).toEqual({ en: 'Custom' });
  });

  it('refuses on non-checklist blocks', () => {
    const t = tpl([sec('s', [text('a')])]);
    const r = addChecklistItem(t, 's', 'a', { en: 'X' }, 'x');
    expect(r).toEqual(t);
  });
});

// ── Item-3 ↔ Item-4 cross-test: customizations survive default upgrades ───

describe('customizations survive mergeTemplate (Item 3 ↔ Item 4)', () => {
  it('reorder + delete + add survive a v+1 default upgrade', () => {
    // v2 user starts from a default-shape
    let user = tpl([sec('prep', [chk('p', ['coffee', 'open_stat']), text('notes')])]);

    // User: reorder blocks, delete one prep item, add a custom one
    user = reorderBlock(user, 'prep', 'notes', -1);
    user = softDeleteChecklistItem(user, 'prep', 'p', 'open_stat');
    user = addChecklistItem(user, 'prep', 'p', { en: 'My ritual' }, 'r1');

    // v3 default: adds a new prep item, adds a new section, tries to re-add the deleted slug
    const v3default = tpl([
      sec('prep', [chk('p', ['coffee', 'open_stat', 'open_cal']), text('notes')]),
      sec('new_section', [text('x')], 20),
    ]);
    v3default.meta.templateVersion = 3;

    const r = mergeTemplate(user, v3default).schema;
    const prep = r.sections.find(s => s.id === 'prep')!;

    // User's block reorder is preserved (notes first)
    expect(prep.blocks.map(b => b.id)).toEqual(['notes', 'p']);

    // Tombstoned item NOT reintroduced; new default item 'open_cal' added; user's custom kept
    const items = prep.blocks.find(b => b.id === 'p')!.config!.items!.map(i => i.id);
    expect(items).toEqual(['coffee', 'user_r1', 'open_cal']);

    // New default section appended
    expect(r.sections.map(s => s.id)).toEqual(['prep', 'new_section']);

    // Version adopted from default
    expect(r.meta.templateVersion).toBe(3);
  });
});
