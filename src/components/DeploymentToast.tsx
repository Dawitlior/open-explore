import { useEffect, useRef } from 'react';
import { useDeploymentWatcher } from '@/hooks/use-deployment-watcher';

/**
 * Silent auto-updater.
 *
 * Previously this rendered a floating "REFRESH" toast that pestered users to
 * click in order to load the new bundle. In practice many users ignored it,
 * leaving the tab stranded on a stale build and reporting "the platform
 * stopped updating". We now auto-reload as soon as a new deployment is
 * detected, with guards so we never interrupt active work:
 *
 *   - wait until the tab is visible
 *   - wait until no modal/sheet is open (body overflow:hidden)
 *   - wait until the user has been idle for ~6s
 *
 * Nothing is rendered to the DOM — the SW already handles cache busting.
 */
interface Props {
  isRTL?: boolean;
}

export const DeploymentToast = (_props: Props) => {
  const { hasNewDeployment, reload } = useDeploymentWatcher();
  const lastActivity = useRef<number>(Date.now());
  const triggered = useRef(false);

  // Track user activity so we don't reload mid-interaction.
  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    const evs: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'wheel'];
    evs.forEach(e => window.addEventListener(e, bump, { passive: true } as any));
    return () => { evs.forEach(e => window.removeEventListener(e, bump as any)); };
  }, []);

  useEffect(() => {
    if (!hasNewDeployment || triggered.current) return;

    const tryReload = () => {
      if (triggered.current) return;
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'visible') return;
      // Skip while a modal/dialog locks the page.
      if (document.body.style.overflow === 'hidden') return;
      // Skip while the user is actively interacting.
      if (Date.now() - lastActivity.current < 6000) return;
      triggered.current = true;
      reload();
    };

    const iv = window.setInterval(tryReload, 1500);
    const onVis = () => tryReload();
    document.addEventListener('visibilitychange', onVis);
    // First attempt shortly after detection.
    const initial = window.setTimeout(tryReload, 1500);

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(initial);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [hasNewDeployment, reload]);

  return null;
};
