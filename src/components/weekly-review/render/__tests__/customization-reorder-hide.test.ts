import { describe, it, expect } from 'vitest';
import {
  reorderSectionTo, reorderBlockTo,
  hideSection, showSection, hideBlock, showBlock,
} from '../customization';
import type { WeeklyReviewSchema, Section, Block } from '../../lib/wr-schema';

const sec = (id: string, blocks: Block[] = [], order = 10): Section => ({ id, order, blocks });
const text = (id: string, order = 10): Block => ({ id, type: 'text', order });
const tpl = (sections: Section[]): WeeklyReviewSchema => ({
  schemaFormatVersion: 1,
  meta: { name: 'T', localeDefault: 'en', templateVersion: 1, basedOn: 'orca_default_v1' },
  sections,
});

describe('reorderSectionTo (dnd-equivalent)', () => {
  it('moves a section to absolute index and rebases order', () => {
    const t = tpl([sec('a', [], 10), sec('b', [], 20), sec('c', [], 30)]);
    const r = reorderSectionTo(t, 'c', 0);
    expect(r.sections.map(s => s.id)).toEqual(['c', 'a', 'b']);
    expect(r.sections.map(s => s.order)).toEqual([10, 20, 30]);
  });
  it('clamps out-of-bounds targets', () => {
    const t = tpl([sec('a', [], 10), sec('b', [], 20)]);
    expect(reorderSectionTo(t, 'a', 999).sections.map(s => s.id)).toEqual(['b', 'a']);
    expect(reorderSectionTo(t, 'b', -5).sections.map(s => s.id)).toEqual(['b', 'a']);
  });
});

describe('reorderBlockTo', () => {
  it('moves a block within its section', () => {
    const t = tpl([sec('s', [text('a'), text('b'), text('c')])]);
    const r = reorderBlockTo(t, 's', 'c', 0);
    expect(r.sections[0].blocks.map(b => b.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('hide / show persistence', () => {
  it('hideSection sets hidden=true; show clears it', () => {
    const t = tpl([sec('a')]);
    const hidden = hideSection(t, 'a');
    expect(hidden.sections[0].hidden).toBe(true);
    const shown = showSection(hidden, 'a');
    expect(shown.sections[0].hidden).toBe(false);
  });
  it('hideBlock sets hidden=true; show clears it', () => {
    const t = tpl([sec('s', [text('a')])]);
    const h = hideBlock(t, 's', 'a');
    expect(h.sections[0].blocks[0].hidden).toBe(true);
    const s = showBlock(h, 's', 'a');
    expect(s.sections[0].blocks[0].hidden).toBe(false);
  });
});
