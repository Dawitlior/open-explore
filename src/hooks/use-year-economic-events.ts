import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EconomicEvent, EconomicImpact } from '@/lib/economic';
import { getCached, setCached, dedupe } from '@/lib/economic/cache';

interface Options {
  year: number;
  impacts?: EconomicImpact[];
  currencies?: string[]; // uppercase filter (e.g. ['USD','CNY'])
  enabled?: boolean;
}

/**
 * Fetches all economic events for a full calendar year in one query.
 * Returns a Map keyed by `${monthIdx}-${dayOfMonth}` for O(1) YearView lookup.
 */
export function useYearEconomicEvents({
  year, impacts = ['t1'], currencies, enabled = true,
}: Options) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  useEffect(() => {
    if (!enabled) { setEvents([]); return; }
    let cancelled = false;
    const impactsKey = impacts.length ? [...impacts].sort().join(',') : 'all';
    const cacheKey = `year:${year}:${impactsKey}`;

    const cached = getCached<EconomicEvent[]>(cacheKey);
    if (cached) { setEvents(cached); return () => { cancelled = true; }; }

    (async () => {
      const from = new Date(year, 0, 1).toISOString();
      const to = new Date(year + 1, 0, 1).toISOString();
      const list = await dedupe(cacheKey, async () => {
        let q = supabase.from('economic_events').select('*')
          .gte('release_at', from).lt('release_at', to)
          .order('release_at', { ascending: true }).limit(4000);
        if (impacts.length) q = q.in('impact', impacts);
        const { data } = await q;
        const out = (data ?? []) as EconomicEvent[];
        setCached(cacheKey, out, 5 * 60_000);
        return out;
      });
      if (!cancelled) setEvents(list);
    })();
    return () => { cancelled = true; };
  }, [year, enabled, impacts.join(',')]);

  const byDay = useMemo(() => {
    const m = new Map<string, EconomicEvent[]>();
    const ccSet = currencies?.length ? new Set(currencies.map(c => c.toUpperCase())) : null;
    for (const e of events) {
      if (ccSet && !ccSet.has((e.currency || '').toUpperCase())) continue;
      const d = new Date(e.release_at);
      if (d.getFullYear() !== year) continue;
      const k = `${d.getMonth()}-${d.getDate()}`;
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    return m;
  }, [events, year, currencies?.join(',')]);

  return { events, byDay };
}
