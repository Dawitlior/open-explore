// Wave-2 Item 3 — mergeTemplate contract tests.
// Locks the additive-only, slug-keyed merge against regression.

import { describe, expect, it } from 'vitest';
import { mergeTemplate } from '../wr-merge';
import type { WeeklyReviewSchema, Section, Block } from '../wr-schema';

// ---- builders -------------------------------------------------------------

const baseTpl = (sections: Section[], extra: Partial<WeeklyReviewSchema['meta']> = {}): WeeklyReviewSchema => ({
  schemaFormatVersion: 1,
  meta: {
    name: 'T',
    localeDefault: 'he',
    basedOn: 'orca_default_v1',
    templateVersion: 1,
    ...extra,
  },
  sections,
});

const sec = (id: string, blocks: Block[] = [], order = 10): Section => ({
  id, order, blocks,
});

const checklist = (id: string, items: { id: string; action?: any }[]): Block => ({
  id, type: 'checklist', order: 10,
  config: { cycle: ['neutral', 'done', 'missed'], goodIs: 'done',
    items: items.map(i => ({ id: i.id, label: { en: i.id }, ...(i.action ? { action: i.action } : {}) })),
  },
});

const text = (id: string): Block => ({ id, type: 'text', order: 10 });

// ---- tests ----------------------------------------------------------------

describe('mergeTemplate — additive contract', () => {
  it('adds a new section from default', () => {
    const user = baseTpl([sec('prep', [text('a')])]);
    const def = baseTpl([sec('prep', [text('a')]), sec('new_section', [text('b')], 20)],
      { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections.map(s => s.id)).toEqual(['prep', 'new_section']);
    expect(r.added.sections).toEqual(['new_section']);
    expect(r.schema.meta.templateVersion).toBe(2);
  });

  it('adds a new block to an existing section', () => {
    const user = baseTpl([sec('prep', [text('a')])]);
    const def = baseTpl([sec('prep', [text('a'), text('b')])], { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections[0].blocks.map(b => b.id)).toEqual(['a', 'b']);
    expect(r.added.blocks).toEqual(['b']);
  });

  it('appends new checklist items in default', () => {
    const user = baseTpl([sec('prep', [checklist('chk', [{ id: 'i1' }])])]);
    const def = baseTpl([sec('prep', [checklist('chk', [{ id: 'i1' }, { id: 'i2' }])])],
      { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    const items = r.schema.sections[0].blocks[0].config!.items!;
    expect(items.map(i => i.id)).toEqual(['i1', 'i2']);
    expect(r.added.items).toEqual(['i2']);
  });

  it('layers default action onto untouched user item', () => {
    const user = baseTpl([sec('prep', [checklist('chk', [{ id: 'i1' }])])]);
    const def = baseTpl([sec('prep', [
      checklist('chk', [{ id: 'i1', action: { type: 'navigate', target: '/log' } }]),
    ])], { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections[0].blocks[0].config!.items![0].action)
      .toEqual({ type: 'navigate', target: '/log' });
  });

  it('does NOT overwrite a user-customized action', () => {
    const user = baseTpl([sec('prep', [checklist('chk', [
      { id: 'i1', action: { type: 'open_panel', target: 'user-choice' } },
    ])])]);
    const def = baseTpl([sec('prep', [checklist('chk', [
      { id: 'i1', action: { type: 'navigate', target: '/log' } },
    ])])], { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections[0].blocks[0].config!.items![0].action)
      .toEqual({ type: 'open_panel', target: 'user-choice' });
  });

  it('preserves user section order; new sections append', () => {
    const user = baseTpl([sec('b', [], 20), sec('a', [], 10)]); // user reordered
    const def = baseTpl([sec('a', [], 10), sec('b', [], 20), sec('c', [], 30)],
      { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections.map(s => s.id)).toEqual(['b', 'a', 'c']);
  });

  it('preserves user block order within a section', () => {
    const user = baseTpl([sec('prep', [text('b'), text('a')])]); // user reordered
    const def = baseTpl([sec('prep', [text('a'), text('b'), text('c')])],
      { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections[0].blocks.map(b => b.id)).toEqual(['b', 'a', 'c']);
  });

  it('respects tombstoned section (removedSeedIds) — not reintroduced', () => {
    const user = baseTpl([sec('prep', [])],
      { removedSeedIds: ['dead_section'] });
    const def = baseTpl([sec('prep', []), sec('dead_section', [text('x')])],
      { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections.map(s => s.id)).toEqual(['prep']);
    expect(r.added.sections).toEqual([]);
  });

  it('respects tombstoned block — not reintroduced into existing section', () => {
    const user = baseTpl([sec('prep', [text('a')])],
      { removedSeedIds: ['dead_block'] });
    const def = baseTpl([sec('prep', [text('a'), text('dead_block')])],
      { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections[0].blocks.map(b => b.id)).toEqual(['a']);
  });

  it('respects tombstoned checklist item — not reintroduced', () => {
    const user = baseTpl([sec('prep', [checklist('chk', [{ id: 'i1' }])])],
      { removedSeedIds: ['dead_item'] });
    const def = baseTpl([sec('prep', [checklist('chk',
      [{ id: 'i1' }, { id: 'dead_item' }])])], { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    const items = r.schema.sections[0].blocks[0].config!.items!;
    expect(items.map(i => i.id)).toEqual(['i1']);
  });

  it('layers default helpText only when user lacks it', () => {
    const user1 = baseTpl([sec('prep', [{ ...text('a'), helpText: { en: 'mine' } }])]);
    const user2 = baseTpl([sec('prep', [text('a')])]);
    const def = baseTpl([sec('prep', [{ ...text('a'), helpText: { en: 'default' } }])],
      { templateVersion: 2 });
    expect(mergeTemplate(user1, def).schema.sections[0].blocks[0].helpText)
      .toEqual({ en: 'mine' });
    expect(mergeTemplate(user2, def).schema.sections[0].blocks[0].helpText)
      .toEqual({ en: 'default' });
  });

  it('throws on rename collision (same id, different type)', () => {
    const user = baseTpl([sec('prep', [text('a')])]);
    const def = baseTpl([sec('prep', [{ ...checklist('a', []) }])],
      { templateVersion: 2 });
    expect(() => mergeTemplate(user, def)).toThrow(/rename collision/);
  });

  it('idempotent — re-merging identical default is a no-op', () => {
    const user = baseTpl([sec('prep', [text('a')])]);
    const def = baseTpl([sec('prep', [text('a')])], { templateVersion: 2 });
    const r1 = mergeTemplate(user, def);
    const r2 = mergeTemplate(r1.schema, def);
    expect(r2.schema).toEqual(r1.schema);
    expect(r2.added).toEqual({ sections: [], blocks: [], items: [] });
  });

  it('user-only section is preserved untouched', () => {
    const user = baseTpl([sec('prep', []), sec('user_custom', [text('x')])]);
    const def = baseTpl([sec('prep', [])], { templateVersion: 2 });
    const r = mergeTemplate(user, def);
    expect(r.schema.sections.map(s => s.id)).toEqual(['prep', 'user_custom']);
  });

  it('integration — v1 user with answers gets v2 action + new item without touching answers', () => {
    const userV1 = baseTpl([sec('prep', [checklist('chk', [{ id: 'i1' }, { id: 'i2' }])])]);
    const defV2 = baseTpl([sec('prep', [checklist('chk', [
      { id: 'i1', action: { type: 'navigate', target: '/log' } },
      { id: 'i2' },
      { id: 'i3' },
    ])])], { templateVersion: 2 });
    const r = mergeTemplate(userV1, defV2);
    const items = r.schema.sections[0].blocks[0].config!.items!;
    expect(items.map(i => i.id)).toEqual(['i1', 'i2', 'i3']);
    expect(items[0].action).toEqual({ type: 'navigate', target: '/log' });
    expect(r.schema.meta.templateVersion).toBe(2);
    expect(r.added.items).toEqual(['i3']);
  });
});
