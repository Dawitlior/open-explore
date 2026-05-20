import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EconomicEvent, EconomicImpact } from '@/lib/economic';

interface Options {
  year: number;
  /** 0-indexed month, JS-style */
  month: number;
  impacts?: EconomicImpact[];
  enabled?: boolean;
}

/**
 * Fetches all economic events for a calendar month, grouped by day-of-month.
 * One query per month-change. RLS = authenticated only.
 */
export function useMonthEconomicEvents({ year, month, impacts = ['t1', 't2'], enabled = true }: Options) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) { setEvents([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);

    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();

    (async () => {
      let q = supabase
        .from('economic_events')
        .select('*')
        .gte('release_at', from)
        .lt('release_at', to)
        .order('release_at', { ascending: true })
        .limit(1000);
      if (impacts.length) q = q.in('impact', impacts);
      const { data, error } = await q;
      if (cancelled) return;
      if (!error && data) setEvents(data as EconomicEvent[]);
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
