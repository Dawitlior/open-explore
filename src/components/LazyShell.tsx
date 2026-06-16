import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

/**
 * Premium full-bleed loading shell — used during route/dimension swaps
 * (Orca ↔ Journal ↔ Backtest). Uses the single canonical OrcaBootLoader.
 */
const Fallback = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ opacity: show ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      <OrcaBootLoader />
    </div>
  );
};

export const LazyShell = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<Fallback />}>{children}</Suspense>
);
