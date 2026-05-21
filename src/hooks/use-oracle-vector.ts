/**
 * Subscribes to the current user's Oracle DNA vector + blueprint.
 * Returns archetype, summary, shadow patterns, and the locked coach prompt.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OracleBlueprint {
  user_id: string;
  version: number;
  vector: Record<string, number>;
  archetype: string | null;
  shadow_patterns: Array<{ name: string; weight: number; evidence?: string }>;
  blueprint_md: string | null;
  coach_system_prompt: string | null;
  computed_at: string;
  updated_at: string;
}

export function useOracleVector() {
  const [blueprint, setBlueprint] = useState<OracleBlueprint | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBlueprint(null); setLoading(false); return; }
    const { data } = await supabase
      .from('oracle_vectors')
      .select('*')
      .eq('user_id', u.user.id)
      .maybeSingle();
    setBlueprint((data as unknown as OracleBlueprint) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Listen for synthesis completion broadcast
  useEffect(() => {
    const onUpd = () => void refresh();
    window.addEventListener('orca:oracle-updated', onUpd);
    return () => window.removeEventListener('orca:oracle-updated', onUpd);
  }, [refresh]);

  const isCalibrated = !!blueprint?.archetype;
  const ageDays = blueprint
    ? Math.floor((Date.now() - new Date(blueprint.computed_at).getTime()) / 86400000)
    : null;

  return { blueprint, loading, isCalibrated, ageDays, refresh };
}
