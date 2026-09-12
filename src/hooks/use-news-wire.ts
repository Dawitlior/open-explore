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

/**
 * Live news wire — reads `news_feed` (max 30 rows, auto-pruned after 3 days
 * in the database) and keeps it fresh with Realtime + a 60s safety poll.
 */
export function useNewsWire(limit = 30) {
  const [items, setItems] = useState<NewsWireItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('news_feed')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (!mounted.current) return;
    if (!error && data) setItems(data as NewsWireItem[]);
    setLoading(false);
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

    const poll = window.setInterval(() => void load(), 60_000);

    return () => {
      mounted.current = false;
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { items, loading, refresh: load };
}
