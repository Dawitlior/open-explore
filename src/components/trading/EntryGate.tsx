import { useEffect } from 'react';

/* ============================================================================
   EntryGate — intentionally a no-op. No entry animation: the app enters straight
   away. (Kept as a component so RootEntry's contract is unchanged.)
   ========================================================================== */

interface EntryGateProps {
  onEnter: () => void;
  lang?: 'he' | 'en';
  ready?: boolean;
}

export const EntryGate = ({ onEnter }: EntryGateProps) => {
  useEffect(() => {
    try { sessionStorage.setItem('orca-entered', '1'); } catch { /* noop */ }
    onEnter();
  }, [onEnter]);
  return null;
};

export default EntryGate;
