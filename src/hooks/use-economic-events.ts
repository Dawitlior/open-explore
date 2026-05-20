import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EconomicEvent } from '@/lib/economic';

interface Options {
  /** Look-ahead window in hours. Default 48h. */
  hoursAhead?: number;
  /** Filter by impact tiers. Default: all. */
  impacts?: Array<'t1' | 't2' | 't3'>;
  /** Disable the hook (returns []). */
  enabled?: boolean;
}

/**
 * Subscribes to `economic_events` with a rolling window and live Realtime updates.
 * One channel per mount, cleaned up on unmount.
 */
export function useEconomicEvents(opts: Options = {}) {
  const { hoursAhead = 48, impacts, enabled = true } = opts;
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) { setEvents([]); setLoading(false); return; }
    let cancelled = false;

    async function load() {
      const from = new Date(Date.now() - 60 * 60_000).toISOString(); // 1h back
      const to = new Date(Date.now() + hoursAhead * 60 * 60_000).toISOString();
      let q = supabase
        .from('economic_events')
        .select('*')
        .gte('release_at', from)
        .lte('release_at', to)
        .order('release_at', { ascending: true })
        .limit(500);
      if (impacts?.length) q = q.in('impact', impacts);
      const { data, error } = await q;
      if (!cancelled && !error && data) {
        setEvents(data as EconomicEvent[]);
      }
      if (!cancelled) setLoading(false);
    }
    load();

    const channelName = `economic_events_live_${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'economic_events' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [hoursAhead, enabled, impacts?.join(',')]);

  return { events, loading };
}
