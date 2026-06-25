// Wave-2 Item 4 — pure customization helpers.
//
// Every helper returns a NEW schema; nothing mutates. All operations key
// on slug (never index in default sequence). Delete is soft (tombstone in
// meta.removedSeedIds), so the Item-3 merge respects user intent across
// future default-template upgrades.
//
// No DOM, no I/O. The renderer + WeeklyTab call these against an in-memory
// schema; persistence is the host's job (deferred until per-user template
// storage lands).

import type {
  WeeklyReviewSchema,
  Section,
  Block,
  ChecklistItem,
  Loc,
} from '../lib/wr-schema';

// ── Section/block reorder ──────────────────────────────────────────────────

export function reorderSection(tpl: WeeklyReviewSchema, sectionId: string, delta: -1 | 1): WeeklyReviewSchema {
  const sorted = [...tpl.sections].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex(s => s.id === sectionId);
  if (i < 0) return tpl;
  const j = i + delta;
  if (j < 0 || j >= sorted.length) return tpl;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  const rebased = sorted.map((s, idx) => ({ ...s, order: (idx + 1) * 10 }));
  return { ...tpl, sections: rebased };
}

export function reorderBlock(tpl: WeeklyReviewSchema, sectionId: string, blockId: string, delta: -1 | 1): WeeklyReviewSchema {
  return mapSection(tpl, sectionId, sec => {
    const sorted = [...sec.blocks].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex(b => b.id === blockId);
    if (i < 0) return sec;
    const j = i + delta;
    if (j < 0 || j >= sorted.length) return sec;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    const rebased = sorted.map((b, idx) => ({ ...b, order: (idx + 1) * 10 }));
    return { ...sec, blocks: rebased };
  });
}

// ── Demote a non-checklist block to a plain checkbox ───────────────────────
//
// "Demote" preserves the block id (slugs are immutable), changes type to
// `checklist` with a single neutral/done/missed item carrying the original
// label. The single-item id reuses the block id so historical analytics
// have a stable join key.

export function demoteToChecklist(tpl: WeeklyReviewSchema, sectionId: string, blockId: string): WeeklyReviewSchema {
  return mapBlock(tpl, sectionId, blockId, block => {
    if (block.type === 'checklist') return block;
    if (block.type.startsWith('system-')) return block; // locked
    const demotedItem: ChecklistItem = {
      id: block.id,
      label: block.label ?? ({ en: block.id } as Loc),
    };
    return {
      ...block,
      type: 'checklist',
      config: {
        ...(block.config || {}),
        cycle: ['neutral', 'done', 'missed'],
        goodIs: 'done',
        items: [demotedItem],
      },
    };
  });
}

// ── Soft delete (tombstone) ────────────────────────────────────────────────

export function softDeleteBlock(tpl: WeeklyReviewSchema, sectionId: string, blockId: string): WeeklyReviewSchema {
  const next = mapSection(tpl, sectionId, sec => ({
    ...sec,
    blocks: sec.blocks.filter(b => b.id !== blockId),
  }));
  return addTombstone(next, blockId);
}

export function softDeleteSection(tpl: WeeklyReviewSchema, sectionId: string): WeeklyReviewSchema {
  const next: WeeklyReviewSchema = {
    ...tpl,
    sections: tpl.sections.filter(s => s.id !== sectionId),
  };
  return addTombstone(next, sectionId);
}

export function softDeleteChecklistItem(tpl: WeeklyReviewSchema, sectionId: string, blockId: string, itemId: string): WeeklyReviewSchema {
  const next = mapBlock(tpl, sectionId, blockId, block => {
    if (!block.config?.items) return block;
    return {
      ...block,
      config: { ...block.config, items: block.config.items.filter(i => i.id !== itemId) },
    };
  });
  return addTombstone(next, itemId);
}

// ── Add custom checklist item ──────────────────────────────────────────────
//
// User-added items get the prefix `user_` to guarantee they can never
// collide with a future default-template slug (which uses no such prefix).
// Caller passes a unique suffix (e.g. nanoid / Date.now base36).

export function addChecklistItem(
  tpl: WeeklyReviewSchema,
  sectionId: string,
  blockId: string,
  label: Loc,
  suffix: string,
): WeeklyReviewSchema {
  return mapBlock(tpl, sectionId, blockId, block => {
    if (block.type !== 'checklist') return block;
    const items = block.config?.items ?? [];
    const newItem: ChecklistItem = { id: `user_${suffix}`, label };
    return { ...block, config: { ...(block.config || {}), items: [...items, newItem] } };
  });
}

// ── Internals ──────────────────────────────────────────────────────────────

function mapSection(
  tpl: WeeklyReviewSchema,
  sectionId: string,
  fn: (s: Section) => Section,
): WeeklyReviewSchema {
  return { ...tpl, sections: tpl.sections.map(s => (s.id === sectionId ? fn(s) : s)) };
}

function mapBlock(
  tpl: WeeklyReviewSchema,
  sectionId: string,
  blockId: string,
  fn: (b: Block) => Block,
): WeeklyReviewSchema {
  return mapSection(tpl, sectionId, sec => ({
    ...sec,
    blocks: sec.blocks.map(b => (b.id === blockId ? fn(b) : b)),
  }));
}

function addTombstone(tpl: WeeklyReviewSchema, slug: string): WeeklyReviewSchema {
  const existing = tpl.meta.removedSeedIds ?? [];
  if (existing.includes(slug)) return tpl;
  return { ...tpl, meta: { ...tpl.meta, removedSeedIds: [...existing, slug] } };
}
