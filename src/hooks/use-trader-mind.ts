/**
 * useTraderMind — reads the latest Trader Mind diagnostic for the signed-in user.
 * Mirrors the previous useOracleVector contract so legacy call-sites can be ported.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TraderMindSession = {
  id: string;
  archetype: string | null;
  version: string;
  payload: Record<string, unknown>;
  completed_at: string;
};

export function useTraderMind() {
  const [session, setSession] = useState<TraderMindSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) { if (!cancelled) { setSession(null); setLoading(false); } return; }
        const { data } = await supabase
          .from('trader_mind_sessions')
          .select('id, archetype, version, payload, completed_at')
          .eq('user_id', u.user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) setSession((data as TraderMindSession | null) ?? null);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();

    const onComplete = () => void load();
    window.addEventListener('orca:trader-mind-complete', onComplete);
    return () => { cancelled = true; window.removeEventListener('orca:trader-mind-complete', onComplete); };
  }, []);

  const isCalibrated = !!session;
  const ageDays = session
    ? Math.floor((Date.now() - new Date(session.completed_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return { session, isCalibrated, ageDays, loading, archetype: session?.archetype ?? null };
}
