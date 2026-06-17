import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EconomicEvent } from '@/lib/economic';
import { getCached, setCached, dedupe, invalidateEconomicCache } from '@/lib/economic/cache';

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
 *
 * Load coalescing: identical windows share a single network round-trip via a
 * TTL cache (see `lib/economic/cache.ts`). Realtime updates are throttled to
 * one refetch per 30s to prevent thundering-herd refetches at scale.
 */
export function useEconomicEvents(opts: Options = {}) {
  const { hoursAhead = 48, impacts, enabled = true } = opts;
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const lastRefetchRef = useRef(0);

  useEffect(() => {
    if (!enabled) { setEvents([]); setLoading(false); return; }
    let cancelled = false;

    async function load() {
      // Bucket window to the nearest 5 minutes so adjacent mounts share a cache key.
      const bucket = Math.floor(Date.now() / (5 * 60_000));
      const impactsKey = impacts?.length ? [...impacts].sort().join(',') : 'all';
      const cacheKey = `events:${hoursAhead}:${impactsKey}:${bucket}`;

      const cached = getCached<EconomicEvent[]>(cacheKey);
      if (cached) {
        if (!cancelled) { setEvents(cached); setLoading(false); }
        return;
      }

      const data = await dedupe(cacheKey, async () => {
        const from = new Date(Date.now() - 60 * 60_000).toISOString();
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
        if (error || !data) return [] as EconomicEvent[];
        const list = data as EconomicEvent[];
        setCached(cacheKey, list);
        return list;
      });

      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    }
    load();

    const channelName = `economic_events_live_${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'economic_events' },
        () => {
          // Throttle realtime-triggered reloads to once per 30s per mount.
          const now = Date.now();
          if (now - lastRefetchRef.current < 30_000) return;
          lastRefetchRef.current = now;
          invalidateEconomicCache();
          load();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [hoursAhead, enabled, impacts?.join(',')]);

  return { events, loading };
}
