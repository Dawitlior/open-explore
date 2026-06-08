/**
 * CookieConsentRoot — mounts the banner + listens for "open prefs"
 * events from anywhere (e.g. SettingsHub button) and pops the modal.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { CookieConsentBanner } from './CookieConsentBanner';

const CookiePreferencesModal = lazy(() => import('./CookiePreferencesModal'));

export function CookieConsentRoot() {
  const [openPrefs, setOpenPrefs] = useState(false);
  useEffect(() => {
    const h = () => setOpenPrefs(true);
    window.addEventListener('orca:open-cookie-prefs', h);
    return () => window.removeEventListener('orca:open-cookie-prefs', h);
  }, []);
  return (
    <>
      <CookieConsentBanner />
      {openPrefs && (
        <Suspense fallback={null}>
          <CookiePreferencesModal open={openPrefs} onClose={() => setOpenPrefs(false)} />
        </Suspense>
      )}
    </>
  );
}

export default CookieConsentRoot;
