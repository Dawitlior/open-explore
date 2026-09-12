// Registers the current browser as a device/session and keeps a heartbeat.
// If the device was revoked from another device, we sign out immediately.
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { getDeviceId } from '@/lib/security/device-fingerprint';

const HEARTBEAT_MS = 2 * 60 * 1000;

export function useDeviceSession() {
  const { session, signOut } = useAuth();

  useEffect(() => {
    if (!session) return;
    let alive = true;
    const deviceId = getDeviceId();

    const ping = async () => {
      try {
        // Always send the *live* access token. Relying on the client's implicit
        // header can fall back to the publishable key when the session is still
        // hydrating (preview iframe), which the function rejects with 401.
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) return;
        const { data, error } = await supabase.functions.invoke('security-devices', {
          body: { action: 'register', deviceId },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!alive || error) return;
        if ((data as { revoked?: boolean } | null)?.revoked) {
          await signOut();
        }
      } catch {
        /* offline — retry on next beat */
      }
    };

    void ping();
    const id = window.setInterval(ping, HEARTBEAT_MS);
    const onFocus = () => { void ping(); };
    window.addEventListener('focus', onFocus);

    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [session, signOut]);
}
