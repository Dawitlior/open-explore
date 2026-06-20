import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type StorageRow = {
  table_name: string;
  size_bytes: number;
  row_estimate: number;
  db_size_bytes: number;
  connections: number;
  cache_hit_ratio: number | null;
};
type AiRow = {
  week: string;
  feature: string;
  tokens: number;
  calls: number;
  cost_usd: number;
  avg_latency_ms: number;
};

export type LiveStorage = {
  storage: Array<{ id: string; mb: number; rows: number }>;
  storageTrend: Array<{ w: number; mb: number }>;
  dbStats: { sizeMb: number; rows: number; connections: number; cacheHit: number };
};
export type LiveAi = Array<{
  w: number;
  coach: number;
  review: number;
  insights: number;
  tokens: number;
  calls: number;
  cost: number;
  latency: number;
  errors: number;
}>;

export type AdminLive = {
  loading: boolean;
  error: string | null;
  storage: LiveStorage | null;
  aiUsage: LiveAi | null;
  activeCount: number | null;
  subs: { tierMix: Array<{ tier: string; n: number }>; stateMix: Array<{ status: string; n: number }> } | null;
};

const FEATURE_BUCKETS: Record<string, "coach" | "review" | "insights"> = {
  "orca-coach": "coach",
  "weekly-review": "review",
  "ai-insights": "insights",
};

function shapeStorage(rows: StorageRow[]): LiveStorage {
  if (!rows.length) {
    return { storage: [], storageTrend: [], dbStats: { sizeMb: 0, rows: 0, connections: 0, cacheHit: 0 } };
  }
  const head = rows[0];
  const storage = rows.map((r) => ({
    id: r.table_name,
    mb: Math.max(0, Math.round((r.size_bytes || 0) / (1024 * 1024))),
    rows: Number(r.row_estimate || 0),
  }));
  const dbSizeMb = Math.round((head.db_size_bytes || 0) / (1024 * 1024));
  const totalRows = storage.reduce((s, t) => s + t.rows, 0);
  // No historical storage series available yet — render a flat single point so the area chart doesn't break.
  const storageTrend = Array.from({ length: 16 }, (_, w) => ({ w, mb: dbSizeMb }));
  return {
    storage,
    storageTrend,
    dbStats: {
      sizeMb: dbSizeMb || storage.reduce((s, t) => s + t.mb, 0),
      rows: totalRows,
      connections: Number(head.connections || 0),
      cacheHit: Number(head.cache_hit_ratio || 0),
    },
  };
}

function shapeAi(rows: AiRow[]): LiveAi {
  // Group by week, pivot features into coach/review/insights buckets.
  const byWeek = new Map<string, { coach: number; review: number; insights: number; tokens: number; calls: number; cost: number; latency: number; latencyN: number }>();
  for (const r of rows) {
    const wk = String(r.week);
    if (!byWeek.has(wk)) byWeek.set(wk, { coach: 0, review: 0, insights: 0, tokens: 0, calls: 0, cost: 0, latency: 0, latencyN: 0 });
    const bucket = byWeek.get(wk)!;
    const slot = FEATURE_BUCKETS[r.feature] ?? "insights";
    bucket[slot] += Number(r.tokens || 0);
    bucket.tokens += Number(r.tokens || 0);
    bucket.calls += Number(r.calls || 0);
    bucket.cost += Number(r.cost_usd || 0);
    bucket.latency += Number(r.avg_latency_ms || 0) * Number(r.calls || 1);
    bucket.latencyN += Number(r.calls || 1);
  }
  const ordered = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return ordered.map(([, v], i) => ({
    w: i,
    coach: v.coach,
    review: v.review,
    insights: v.insights,
    tokens: v.tokens,
    calls: v.calls,
    cost: Math.round(v.cost * 100) / 100,
    latency: v.latencyN ? Math.round(v.latency / v.latencyN) : 0,
    errors: 0,
  }));
}

export function useAdminLive(): AdminLive {
  const [state, setState] = useState<AdminLive>({
    loading: true,
    error: null,
    storage: null,
    aiUsage: null,
    activeCount: null,
    subs: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storageRes, aiRes, activeRes, subsRes] = await Promise.all([
          (supabase as any).rpc("admin_db_storage"),
          (supabase as any).rpc("admin_ai_usage", { p_period: 120, p_feature: null }),
          (supabase as any).rpc("admin_active_count", { p_window: 7 }),
          (supabase as any).rpc("admin_subscriptions"),
        ]);
        if (cancelled) return;
        const liveStorage = storageRes.error ? null : shapeStorage((storageRes.data || []) as StorageRow[]);
        const liveAi = aiRes.error ? null : shapeAi((aiRes.data || []) as AiRow[]);
        const liveActive = activeRes.error ? null : Number(activeRes.data ?? 0);
        const liveSubs = subsRes.error ? null : (subsRes.data as AdminLive["subs"]);
        const firstError = storageRes.error?.message || aiRes.error?.message || activeRes.error?.message || subsRes.error?.message || null;
        setState({
          loading: false,
          error: firstError,
          storage: liveStorage,
          aiUsage: liveAi && liveAi.length ? liveAi : null,
          activeCount: liveActive,
          subs: liveSubs,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: e?.message || String(e) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
