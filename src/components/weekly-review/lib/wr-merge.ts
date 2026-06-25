// Template merge — additive-only upgrade from a newer default template into a
// user-customized template. The gating primitive for Wave 2.
//
// CONTRACT (non-negotiable):
//   1. Slug is identity. Merge keys on `id`, never on label or index.
//   2. Additive only. May ADD sections / blocks / checklist items.
//      Never RENAME a slug. Never DELETE a user block. Never reorder
//      user-customized sequences.
//   3. User edits win for overlapping nodes — user copy is kept verbatim
//      EXCEPT for purely additive metadata (e.g. `action` on a checklist
//      item that has no action yet, `helpText` when user has none).
//   4. Tombstones (meta.removedSeedIds) are honored — a deleted slug is
//      never re-introduced.
//   5. Rename collision (same id, different type) throws — that's a
//      contract violation in the new default template.
//
// Pure function — no I/O. Caller decides when/where to persist.

import type {
  WeeklyReviewSchema,
  Section,
  Block,
  ChecklistItem,
} from './wr-schema';

export interface MergeResult {
  schema: WeeklyReviewSchema;
  /** Slugs added during this merge — useful for "what's new" surfacing. */
  added: { sections: string[]; blocks: string[]; items: string[] };
}

export function mergeTemplate(
  userTpl: WeeklyReviewSchema,
  defaultTpl: WeeklyReviewSchema,
): MergeResult {
  const tombstones = new Set(userTpl.meta.removedSeedIds ?? []);
  const added: MergeResult['added'] = { sections: [], blocks: [], items: [] };

  // Index user sections by id for O(1) lookup; preserve user's order.
  const userSectionById = new Map(userTpl.sections.map(s => [s.id, s]));

  // 1) Walk user's sections first (preserves user ordering for overlaps).
  const mergedSections: Section[] = userTpl.sections.map(userSec => {
    const defSec = defaultTpl.sections.find(s => s.id === userSec.id);
    if (!defSec) return userSec; // user-only section — untouched
    return mergeSection(userSec, defSec, tombstones, added);
  });

  // 2) Append default sections that the user doesn't have AND aren't tombstoned.
  for (const defSec of defaultTpl.sections) {
    if (userSectionById.has(defSec.id)) continue;
    if (tombstones.has(defSec.id)) continue;
    mergedSections.push(defSec);
    added.sections.push(defSec.id);
  }

  return {
    schema: {
      ...userTpl,
      meta: {
        ...userTpl.meta,
        // Adopt provenance + version from default — user is now on this baseline.
        basedOn: defaultTpl.meta.basedOn ?? userTpl.meta.basedOn,
        templateVersion: defaultTpl.meta.templateVersion,
      },
      sections: mergedSections,
    },
    added,
  };
}

// ----------------------------------------------------------------------------

function mergeSection(
  userSec: Section,
  defSec: Section,
  tombstones: Set<string>,
  added: MergeResult['added'],
): Section {
  const userBlockById = new Map(userSec.blocks.map(b => [b.id, b]));

  // Preserve user's block order for overlaps.
  const mergedBlocks: Block[] = userSec.blocks.map(userBlock => {
    const defBlock = defSec.blocks.find(b => b.id === userBlock.id);
    if (!defBlock) return userBlock;
    if (defBlock.type !== userBlock.type) {
      throw new Error(
        `wr-merge: rename collision on block "${userBlock.id}" — ` +
        `user type "${userBlock.type}" vs default type "${defBlock.type}". ` +
        `Slugs are immutable; the new default template is invalid.`,
      );
    }
    return layerBlock(userBlock, defBlock, tombstones, added);
  });

  // Append default-only blocks (respect tombstones).
  for (const defBlock of defSec.blocks) {
    if (userBlockById.has(defBlock.id)) continue;
    if (tombstones.has(defBlock.id)) continue;
    mergedBlocks.push(defBlock);
    added.blocks.push(defBlock.id);
  }

  return { ...userSec, blocks: mergedBlocks };
}

// ----------------------------------------------------------------------------

function layerBlock(
  userBlock: Block,
  defBlock: Block,
  tombstones: Set<string>,
  added: MergeResult['added'],
): Block {
  // Additive metadata that does NOT change visible label or behavior:
  //   • helpText — only when user lacks it
  //   • config.items[].action — only when user item lacks an action
  //   • new checklist items in default — appended (respect tombstones)
  const next: Block = { ...userBlock };

  if (!userBlock.helpText && defBlock.helpText) {
    next.helpText = defBlock.helpText;
  }

  const userItems = userBlock.config?.items;
  const defItems = defBlock.config?.items;
  if (userItems && defItems) {
    const userItemById = new Map(userItems.map(i => [i.id, i]));
    const mergedItems: ChecklistItem[] = userItems.map(userItem => {
      const defItem = defItems.find(i => i.id === userItem.id);
      if (!defItem) return userItem;
      // Layer additive `action` if user item has none.
      if (!userItem.action && defItem.action) {
        return { ...userItem, action: defItem.action };
      }
      return userItem;
    });
    // Append new default items (respect tombstones).
    for (const defItem of defItems) {
      if (userItemById.has(defItem.id)) continue;
      if (tombstones.has(defItem.id)) continue;
      mergedItems.push(defItem);
      added.items.push(defItem.id);
    }
    next.config = { ...userBlock.config, items: mergedItems };
  }

  return next;
}
