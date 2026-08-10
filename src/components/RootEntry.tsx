import { Suspense, lazy, useCallback, useState } from 'react';
import { EntryGate } from '@/components/trading/EntryGate';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

const Index = lazy(() => import('@/pages/Index'));

function cachedLang(): 'he' | 'en' {
  try { return localStorage.getItem('orca:lang-cache') === 'en' ? 'en' : 'he'; } catch { return 'he'; }
}

/**
 * RootEntry — renders the entry gate instantly (eagerly bundled, tiny) while
 * the heavy Index chunk downloads in the background. Previously the gate lived
 * inside Index, so users stared at a blank loader for seconds before the
 * animation could even appear.
 */
export default function RootEntry() {
  const [entered, setEntered] = useState(() => {
    try { return sessionStorage.getItem('orca-entered') === '1'; } catch { return false; }
  });
  const handleEnter = useCallback(() => {
    setEntered(true);
  }, []);

  return (
    <>
      <Suspense fallback={<OrcaBootLoader />}>
        <Index />
      </Suspense>
      {!entered && <EntryGate onEnter={handleEnter} lang={cachedLang()} />}
    </>
  );
}
