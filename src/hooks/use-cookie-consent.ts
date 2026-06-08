/**
 * use-cookie-consent — global hook for GDPR/CCPA cookie consent.
 * Persists to user_preferences.consent (cloud) + localStorage cache for instant load.
 * Writes a row to consent_log for each change (audit trail).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const CONSENT_VERSION = '1.0.0';
const CACHE_KEY = 'orca:consent-cache';

export type ConsentChoices = {
  essential: true;          // always on
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
};

export type ConsentState = ConsentChoices & {
  version: string;
  accepted_at: string;       // ISO
};

export const DEFAULT_CHOICES: ConsentChoices = {
  essential: true,
  analytics: false,
  functional: false,
  marketing: false,
};

export const ACCEPT_ALL: ConsentChoices = {
  essential: true,
  analytics: true,
  functional: true,
  marketing: true,
};

function readCache(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ConsentState;
    if (v?.version === CONSENT_VERSION) return v;
    return null;
  } catch { return null; }
}

function writeCache(s: ConsentState) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<ConsentState | null>(() => readCache());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoaded(true); return; }
      const { data } = await supabase
        .from('user_preferences')
        .select('consent')
        .eq('user_id', u.user.id)
        .maybeSingle();
      if (!alive) return;
      const cloud = (data?.consent ?? null) as ConsentState | null;
      if (cloud?.version === CONSENT_VERSION) {
        setConsent(cloud);
        writeCache(cloud);
      }
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  const save = useCallback(async (choices: ConsentChoices) => {
    const next: ConsentState = {
      ...choices,
      essential: true,
      version: CONSENT_VERSION,
      accepted_at: new Date().toISOString(),
    };
    setConsent(next);
    writeCache(next);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from('user_preferences')
      .upsert({ user_id: u.user.id, consent: next as any }, { onConflict: 'user_id' });
    await supabase.from('consent_log').insert({
      user_id: u.user.id,
      version: CONSENT_VERSION,
      choices: next as any,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });
  }, []);

  return {
    consent,
    loaded,
    hasDecided: !!consent,
    save,
    acceptAll: () => save(ACCEPT_ALL),
    rejectAll: () => save(DEFAULT_CHOICES),
  };
}
