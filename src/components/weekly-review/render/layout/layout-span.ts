// Phase 1d (revised) — Layout span resolution for the packing card grid.
//
// New direction: every section is a compact card that participates in a
// 3-up packing grid on wide desktop. Only TWO things span the full row:
//   • the trades table (system-trades-table)
//   • the free-reflection textarea (any block with type 'textarea')
//
// Everything else (score ring, grade, stat chips, risk gauges, market
// context, emotion/mistake/decision pills, focus scale, tags, checklists,
// AI insights) is a single-cell card. The section's own layoutSpan is
// derived: if any visible block is `full`, the whole section spans the
// row so the wide content doesn't get squeezed into a half-width card.

import type { Block, BlockType, Section } from '../../lib/wr-schema';

export type LayoutSpan = 'full' | 'cell';

/** Per-block-type defaults. */
export const BLOCK_SPAN_DEFAULTS: Partial<Record<BlockType, LayoutSpan>> = {
  // Only these two span the row.
  'system-trades-table': 'full',
  textarea: 'full',

  // Compact cards.
  'system-stat-chips': 'cell',
  'system-risk-gauges': 'cell',
  'system-grade': 'cell',
  'system-ai-insights': 'cell',
  checklist: 'cell',
  score: 'cell',
  binary: 'cell',
  number: 'cell',
  text: 'cell',
  select: 'cell',
  multiselect: 'cell',
  scale: 'cell',
};

/** Block-level resolver. Explicit overrides win over defaults. */
export function resolveLayoutSpan(block: Block): LayoutSpan {
  const explicit = (block as Block & { layoutSpan?: LayoutSpan }).layoutSpan;
  if (explicit === 'full' || explicit === 'cell') return explicit;
  const fromMap = BLOCK_SPAN_DEFAULTS[block.type];
  if (fromMap) return fromMap;
  return 'cell';
}

/**
 * Section-level resolver. A section spans the full row when:
 *   1. Explicit `layoutSpan: 'full'` on the descriptor, OR
 *   2. Any visible block inside resolves to `full`.
 * Otherwise the section is a single-cell card in the packing grid.
 */
export function resolveSectionLayoutSpan(section: Section): LayoutSpan {
  const explicit = (section as Section & { layoutSpan?: LayoutSpan }).layoutSpan;
  if (explicit === 'full' || explicit === 'cell') return explicit;

  const visibleBlocks = section.blocks.filter(b => !b.hidden);
  if (visibleBlocks.length === 0) return 'cell';
  const hasFull = visibleBlocks.some(b => resolveLayoutSpan(b) === 'full');
  return hasFull ? 'full' : 'cell';
}
