import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

/**
 * Premium loading shell — used during channel/dimension swaps
 * (Orca ↔ Journal ↔ Backtest). Uses the single canonical OrcaBootLoader.
 *
 * The loader is rendered inside a locally-positioned, viewport-tall flex box:
 * the channel surface sits inside animated (transformed) containers, which
 * turn `position: fixed` into "relative to that container" — that's why the
 * loader used to stick to the top edge and get clipped. `absolute` framing
 * inside this own relative box keeps it centered in the content area.
 */
const Fallback = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'min(70vh, 620px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      <OrcaBootLoader frame="absolute" />
    </div>
  );
};

export const LazyShell = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<Fallback />}>{children}</Suspense>
);
