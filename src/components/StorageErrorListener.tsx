import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Surfaces background storage failures (Supabase write errors) as toasts
 * so users know when a save didn't reach the cloud instead of failing silently.
 */
export function StorageErrorListener() {
  useEffect(() => {
    let lastShown = 0;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { op: string; message: string };
      // Throttle to one toast per 4s to avoid spamming on bulk failures
      const now = Date.now();
      if (now - lastShown < 4000) return;
      lastShown = now;
      toast.error('שמירה נכשלה', {
        description: `הפעולה ${detail.op} נכשלה. בדוק את החיבור ונסה שוב.`,
      });
    };
    window.addEventListener('orca:storage-error', handler as EventListener);
    return () => window.removeEventListener('orca:storage-error', handler as EventListener);
  }, []);
  return null;
}
