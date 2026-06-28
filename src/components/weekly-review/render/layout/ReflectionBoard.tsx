// Top-level layout for the Weekly Review surface.
//
// Three bands, fixed order:
//   1. Risk band   — full-width row, equal cards (currently the single
//                    chromeless `risk` section which already lays out
//                    Daily/Weekly/Monthly gauges internally).
//   2. Main grid   — auto-fill, minmax(320px, 1fr), grid-auto-flow: dense.
//                    `full`-span items span every column.
//   3. Footer band — vertical stack: Decision → Grade → AI Insights.
//
// RTL is handled natively by CSS Grid via `direction: rtl` on the wrapper.
// Mobile (<680px) collapses every band to a single column.

import type { ReactNode } from 'react';
import { REFLECTION_TOKENS as T } from '../../theme/tokens';
import type { LayoutSpan } from './layout-span';

interface Props {
  isRTL: boolean;
  risk: Array<{ id: string; span: LayoutSpan; node: ReactNode }>;
  main: Array<{ id: string; span: LayoutSpan; node: ReactNode }>;
  footer: Array<{ id: string; span: LayoutSpan; node: ReactNode }>;
}

export function ReflectionBoard({ isRTL, risk, main, footer }: Props) {
  const dir = isRTL ? 'rtl' : 'ltr';
  return (
    <div
      data-reflection-board
      dir={dir}
      style={{ display: 'grid', gap: T.spacing.xl, paddingBottom: T.spacing.xxxl, width: '100%' }}
    >
      {risk.length > 0 && (
        <Band kind="risk" items={risk} />
      )}
      {main.length > 0 && (
        <Band kind="main" items={main} />
      )}
      {footer.length > 0 && (
        <Band kind="footer" items={footer} />
      )}
    </div>
  );
}

interface BandProps {
  kind: 'risk' | 'main' | 'footer';
  items: Array<{ id: string; span: LayoutSpan; node: ReactNode }>;
}

function Band({ kind, items }: BandProps) {
  // All bands use the same auto-fill packing grid so a single full-width
  // card (risk gauges, trades table, reflection textarea) and a row of
  // compact cards both render with consistent gutters.
  const style: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gridAutoFlow: 'dense',
    gridAutoRows: 'min-content',
    alignItems: 'stretch',
    gap: T.spacing.lg,
    width: '100%',
  };
  // Footer band stacks vertically (close-out summary feel).
  if (kind === 'footer') {
    style.gridTemplateColumns = '1fr';
    style.gridAutoFlow = 'row';
  }
  return (
    <div data-reflection-band={kind} data-reflection-grid={kind} style={style}>
      {items.map(it => (
        <div
          key={it.id}
          data-layout-span={it.span}
          data-section-id={it.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            ...(it.span === 'full' ? { gridColumn: '1 / -1' } : null),
          }}
        >
          {it.node}
        </div>
      ))}
    </div>
  );
}

export default ReflectionBoard;
