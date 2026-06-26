// Phase 1d — Responsive grid wrapper bound to REFLECTION_TOKENS.
//
// Thin shim around MUI v2 Grid. Container spacing = space.lg (16px). Items
// expose `xs={12}` always (single column on mobile/small tablet) and either
// `md={6}` (cell) or `md={12}` (full) on desktop.
//
// MUI Grid is direction-aware via the parent ThemeProvider (Phase 0 wires
// `direction: rtl` when isRTL), so HE flows right-to-left automatically.

import Grid from '@mui/material/Grid';
import type { ReactNode } from 'react';
import { REFLECTION_TOKENS as T } from '../../theme/tokens';
import type { LayoutSpan } from './layout-span';

interface ReflectionGridProps {
  children: ReactNode;
}

export function ReflectionGrid({ children }: ReflectionGridProps) {
  // spacing unit in MUI = 8px, so 2 = 16px = space.lg.
  const spacingUnits = T.spacing.lg / 8;
  return (
    <Grid container spacing={spacingUnits} data-reflection-grid>
      {children}
    </Grid>
  );
}

interface ReflectionGridItemProps {
  span: LayoutSpan;
  children: ReactNode;
}

export function ReflectionGridItem({ span, children }: ReflectionGridItemProps) {
  const mdCols = span === 'full' ? 12 : 6;
  return (
    <Grid
      size={{ xs: 12, md: mdCols }}
      data-layout-span={span}
      sx={{ display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </Grid>
  );
}

export default ReflectionGrid;
