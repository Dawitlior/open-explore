// Phase 1d (revised) — Packing card grid for the fill-mode section board.
//
// Plain CSS Grid (no MUI Grid) so we get true `auto-fill` packing with
// `grid-auto-flow: dense`. Cards fill rows from start to end; full-width
// items (`span='full'`) span every column. RTL is handled by setting
// `direction: rtl` on the container — CSS Grid honours it natively so
// the first card lands at the top-right in Hebrew.
//
// Breakpoint behaviour falls out of `repeat(auto-fill, minmax(320px, 1fr))`:
//   • viewport < ~680px  → 1 column
//   • ~680–1020px        → 2 columns
//   • ≥ 1020px           → 3 columns (wide desktop target)
//
// No nested grid is used at the block level — blocks stack vertically
// inside their section card. That removes the previous width-collapse
// bug where a `full` checklist placed inside a half-width grid cell
// rendered as an empty card.

import type { ReactNode } from 'react';
import { REFLECTION_TOKENS as T } from '../../theme/tokens';
import type { LayoutSpan } from './layout-span';

interface ReflectionGridProps {
  children: ReactNode;
  /** Optional dir override. Defaults to inheriting from the document. */
  dir?: 'ltr' | 'rtl';
}

/**
 * Section-level packing grid. Renders a CSS Grid with auto-fill columns
 * so cards pack tightly and no orphaned holes appear next to a lone card.
 */
export function ReflectionGrid({ children, dir }: ReflectionGridProps) {
  return (
    <div
      data-reflection-grid
      dir={dir}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gridAutoFlow: 'dense',
        gridAutoRows: 'min-content',
        alignItems: 'start',
        gap: T.spacing.lg,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

interface ReflectionGridItemProps {
  span: LayoutSpan;
  children: ReactNode;
}

/**
 * Individual grid cell. `full` items span every column via
 * `grid-column: 1 / -1`; `cell` items occupy a single auto-fill track.
 */
export function ReflectionGridItem({ span, children }: ReflectionGridItemProps) {
  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  };
  if (span === 'full') {
    style.gridColumn = '1 / -1';
  }
  return (
    <div data-layout-span={span} style={style}>
      {children}
    </div>
  );
}

export default ReflectionGrid;
