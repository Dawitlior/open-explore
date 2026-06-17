import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EconomicEvent, EconomicImpact } from '@/lib/economic';
import { getCached, setCached, dedupe } from '@/lib/economic/cache';

interface Options {
  year: number;
  /** 0-indexed month, JS-style */
  month: number;
  impacts?: EconomicImpact[];
  enabled?: boolean;
}

/**
 * Fetches all economic events for a calendar month, grouped by day-of-month.
 * One query per month-change, shared across mounts via a 5-min TTL cache.
 */
export function useMonthEconomicEvents({ year, month, impacts = ['t1', 't2'], enabled = true }: Options) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) { setEvents([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    const impactsKey = impacts.length ? [...impacts].sort().join(',') : 'all';
    const cacheKey = `month:${year}-${month}:${impactsKey}`;

    const cached = getCached<EconomicEvent[]>(cacheKey);
    if (cached) {
      setEvents(cached);
      setLoading(false);
      return () => { cancelled = true; };
    }

    (async () => {
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 1).toISOString();

      const list = await dedupe(cacheKey, async () => {
        let q = supabase
          .from('economic_events')
          .select('*')
          .gte('release_at', from)
          .lt('release_at', to)
          .order('release_at', { ascending: true })
          .limit(1000);
        if (impacts.length) q = q.in('impact', impacts);
        const { data, error } = await q;
        if (error || !data) return [] as EconomicEvent[];
        const out = data as EconomicEvent[];
        setCached(cacheKey, out, 5 * 60_000);
        return out;
      });

      if (cancelled) return;
      setEvents(list);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [year, month, enabled, impacts.join(',')]);

  /** Map: day-of-month (1..31) → events */
  const byDay = useMemo(() => {
    const m = new Map<number, EconomicEvent[]>();
    for (const e of events) {
      const d = new Date(e.release_at);
      // Use local date matching the calendar's local year/month
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const day = d.getDate();
      const arr = m.get(day) ?? [];
      arr.push(e);
      m.set(day, arr);
    }
    return m;
  }, [events, year, month]);

  return { events, byDay, loading };
}
