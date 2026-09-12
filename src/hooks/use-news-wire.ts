import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewsWireItem {
  id: string;
  headline: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  category: string;
  impact: string;
  symbols: string[];
  published_at: string;
  created_at: string;
}

/** Full refresh from the database — deliberately rare (network cost). */
const REFRESH_MS = 3 * 60 * 60 * 1000; // 3 hours
/** How often a queued (already-downloaded) report is released to the feed. */
const DRIP_MS = 90 * 1000; // 1.5 minutes

/**
 * Live news wire.
 *
 * The database is only polled every few hours; everything fetched is held in
 * memory and released into the visible feed a report at a time, so the rail
 * keeps feeling live without hammering the backend.
 */
export function useNewsWire(limit = 30) {
  const [items, setItems] = useState<NewsWireItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const seen = useRef<Set<string>>(new Set());
  const queue = useRef<NewsWireItem[]>([]);
  const primed = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('news_feed')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (!mounted.current) return;
    setLoading(false);
    if (error || !data) return;

    const rows = data as NewsWireItem[];

    // First fill: show everything at once, no artificial delay.
    if (!primed.current) {
      primed.current = true;
      rows.forEach((r) => seen.current.add(r.id));
      setItems(rows);
      return;
    }

    // Later fills: stage anything new, oldest first, for the drip release.
    const fresh = rows.filter((r) => !seen.current.has(r.id));
    if (fresh.length === 0) return;
    fresh.forEach((r) => seen.current.add(r.id));
    queue.current = [...queue.current, ...fresh].sort(
      (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime(),
    );
  }, [limit]);

  useEffect(() => {
    mounted.current = true;
    void load();

    const channel = supabase
      .channel('news_feed_wire')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_feed' }, () => {
        void load();
      })
      .subscribe();

    const refresh = window.setInterval(() => void load(), REFRESH_MS);

    const drip = window.setInterval(() => {
      if (!mounted.current || queue.current.length === 0) return;
      const next = queue.current.shift()!;
      setItems((prev) =>
        [next, ...prev]
          .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
          .slice(0, limit),
      );
    }, DRIP_MS);

    return () => {
      mounted.current = false;
      window.clearInterval(refresh);
      window.clearInterval(drip);
      supabase.removeChannel(channel);
    };
  }, [load, limit]);

  return { items, loading, refresh: load };
}
