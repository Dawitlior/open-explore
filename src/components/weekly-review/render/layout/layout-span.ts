// Phase 1d — Layout span resolution for fill-mode responsive grid.
//
// Each block/section declares whether it should occupy a single grid cell
// (half-width on md+) or span the full row. Resolution order:
//   1. Explicit `layoutSpan` on the descriptor.
//   2. Per-block-type default map below.
//   3. Fallback rule for unknown types: anything text-heavy / long → full.
//
// Fill-mode only. Customize mode (editMode === true) ignores spans and
// renders the legacy vertical stack so drag-reorder stays simple.

import type { Block, BlockType, Section } from '../../lib/wr-schema';

export type LayoutSpan = 'full' | 'cell';

/** Per-block-type defaults. */
export const BLOCK_SPAN_DEFAULTS: Partial<Record<BlockType, LayoutSpan>> = {
  // Wide — need the full row.
  'system-trades-table': 'full',
  'system-ai-insights': 'full',
  checklist: 'full',
  textarea: 'full',
  // Compact — side-by-side on md+.
  'system-stat-chips': 'cell',
  'system-risk-gauges': 'cell',
  'system-grade': 'cell',
  score: 'cell',
  binary: 'cell',
  number: 'cell',
  text: 'cell',
  select: 'cell',
  multiselect: 'cell',
  scale: 'cell',
};

/** Block-level resolver. */
export function resolveLayoutSpan(block: Block): LayoutSpan {
  // 1. Explicit override on the descriptor (additive field — Block may carry it).
  const explicit = (block as Block & { layoutSpan?: LayoutSpan }).layoutSpan;
  if (explicit === 'full' || explicit === 'cell') return explicit;

  // 2. Per-type default.
  const fromMap = BLOCK_SPAN_DEFAULTS[block.type];
  if (fromMap) return fromMap;

  // 3. Fallback — long-list / textarea-ish → full; otherwise cell.
  if (block.type === 'textarea' || block.type === 'checklist') return 'full';
  return 'cell';
}

/**
 * Section-level resolver. A section spans full if it explicitly says so OR if
 * any of its visible blocks is full-width (so the wide block isn't squeezed
 * into a half-row card).
 */
export function resolveSectionLayoutSpan(section: Section): LayoutSpan {
  const explicit = (section as Section & { layoutSpan?: LayoutSpan }).layoutSpan;
  if (explicit === 'full' || explicit === 'cell') return explicit;

  const visibleBlocks = section.blocks.filter(b => !b.hidden);
  if (visibleBlocks.length === 0) return 'cell';
  const hasFull = visibleBlocks.some(b => resolveLayoutSpan(b) === 'full');
  return hasFull ? 'full' : 'cell';
}
