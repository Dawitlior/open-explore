import { describe, it, expect } from 'vitest';
import { mergeTemplate, mergeTemplateWith } from '../wr-merge';
import type { WeeklyReviewSchema, Section, Block } from '../wr-schema';

const sec = (id: string, blocks: Block[] = [], order = 10): Section => ({ id, order, blocks });
const text = (id: string): Block => ({ id, type: 'text', order: 10 });
const tpl = (sections: Section[], extra: Partial<WeeklyReviewSchema['meta']> = {}): WeeklyReviewSchema => ({
  schemaFormatVersion: 1,
  meta: { name: 'T', localeDefault: 'en', templateVersion: 1, basedOn: 'orca_default_v1', ...extra },
  sections,
});

describe('mergeTemplateWith — selective accept + dismiss-as-tombstone', () => {
  it('accepts only selected slugs; dismissed slugs persist as tombstones', () => {
    const user = tpl([sec('prep', [text('a')])]);
    const def = tpl([sec('prep', [text('a'), text('b'), text('c')])], { templateVersion: 2 });

    const r = mergeTemplateWith(user, def, { acceptedSlugs: ['b'], dismissedSlugs: ['c'] });
    expect(r.schema.sections[0].blocks.map(b => b.id)).toEqual(['a', 'b']);
    expect(r.schema.meta.removedSeedIds).toContain('c');
  });

  it('dismissed slug never re-prompts on next default bump', () => {
    const user = tpl([sec('prep', [text('a')])]);
    const v2 = tpl([sec('prep', [text('a'), text('b')])], { templateVersion: 2 });
    const r1 = mergeTemplateWith(user, v2, { acceptedSlugs: [], dismissedSlugs: ['b'] });
    expect(r1.schema.sections[0].blocks.map(b => b.id)).toEqual(['a']);

    const v3 = tpl([sec('prep', [text('a'), text('b'), text('c')])], { templateVersion: 3 });
    const r2 = mergeTemplate(r1.schema, v3);
    // 'b' tombstoned → stays out; 'c' is new → appended.
    expect(r2.schema.sections[0].blocks.map(b => b.id)).toEqual(['a', 'c']);
  });
});

describe('removedSeedIds tombstone suppression', () => {
  it('a tombstoned item never reappears across consecutive merges', () => {
    const user = tpl([sec('prep', [text('a')])], { removedSeedIds: ['dead'] });
    const v2 = tpl([sec('prep', [text('a'), text('dead')])], { templateVersion: 2 });
    const r1 = mergeTemplate(user, v2);
    expect(r1.schema.sections[0].blocks.map(b => b.id)).toEqual(['a']);
    const v3 = tpl([sec('prep', [text('a'), text('dead')])], { templateVersion: 3 });
    const r2 = mergeTemplate(r1.schema, v3);
    expect(r2.schema.sections[0].blocks.map(b => b.id)).toEqual(['a']);
  });
});
