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

export type TraderMatrixRow = {
  code: string;
  archetype: string;
  tier: string;
  discipline: number;
  retention_risk: number;
  behavioural_risk: number;
  value_potential: number;
  expectancy: number;
  win_rate?: number;
  sessions_wk: number;
  last_active_days: number;
  // Wave-3 deep fields
  asset_class?: string;
  source_type?: string;
  readiness?: number;
  sub_status?: string;
  breach_trade?: number;
  breach_daily?: number;
  breach_weekly?: number;
  breach_monthly?: number;
  exp_slope?: number;
  revenge_rate?: number;
  over_z?: number;
  exp_trend?: number[];
};

export type EngagementWeek = { week: string; active: number; signups: number; trades: number };
export type HeatmapCell = { dow: number; hour: number; n: number };
export type FunnelStage = { stage: string; n: number };

export type AdminLive = {
  loading: boolean;
  error: string | null;
  okCount: number;
  totalCount: number;
  lastUpdated: number;
  dataHash: string;
  // wave 1
  storage: LiveStorage | null;
  aiUsage: LiveAi | null;
  activeCount: number | null;
  subs: { tierMix: Array<{ tier: string; n: number }>; stateMix: Array<{ status: string; n: number }> } | null;
  // wave 2
  traderMatrix: TraderMatrixRow[] | null;
  traderMind: any | null;
  performance: any | null;
  riskEngine: any | null;
  benchmarks: any | null;
  engagementWeekly: EngagementWeek[] | null;
  activityHeatmap: HeatmapCell[] | null;
  retentionCohorts: any[] | null;
  activationFunnel: FunnelStage[] | null;
  dataQuality: any | null;
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
  // Honest trend: one real data point (current snapshot). No fabricated growth curve.
  const storageTrend = [{ w: 0, mb: dbSizeMb || storage.reduce((s, t) => s + t.mb, 0) }];
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

const INITIAL: AdminLive = {
  loading: true,
  error: null,
  okCount: 0,
  totalCount: 13,
  lastUpdated: 0,
  dataHash: "",
  storage: null,
  aiUsage: null,
  activeCount: null,
  subs: null,
  traderMatrix: null,
  traderMind: null,
  performance: null,
  riskEngine: null,
  benchmarks: null,
  engagementWeekly: null,
  activityHeatmap: null,
  retentionCohorts: null,
  activationFunnel: null,
  dataQuality: null,
};

export function useAdminLive(): AdminLive {
  const [state, setState] = useState<AdminLive>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const rpc = (name: string, args?: any) => (supabase as any).rpc(name, args);
    const fetchAll = async () => {
      try {
        // ALL-TIME default: large period so every historical trade populates
        // windowed RPCs. Diagnostics page can request narrower windows.
        const ALL_TIME = 3650;
        const calls = [
          rpc("admin_db_storage"),
          rpc("admin_ai_usage", { p_period: ALL_TIME, p_feature: null }),
          rpc("admin_active_count", { p_window: 7 }),
          rpc("admin_subscriptions"),
          rpc("admin_trader_matrix_full", { p_sort: "behavioural_risk", p_dir: "desc", p_limit: 500, p_tier: null, p_archetype: null }),
          rpc("admin_trader_mind"),
          rpc("admin_performance", { p_archetype: null, p_tier: null }),
          rpc("admin_risk_engine", { p_tier: null }),
          rpc("admin_benchmarks", { p_kmin: 25 }),
          rpc("admin_engagement_weekly", { p_period: ALL_TIME }),
          rpc("admin_activity_heatmap", { p_period: ALL_TIME }),
          rpc("admin_retention_cohorts", { p_cohorts: 8 }),
          rpc("admin_activation_funnel"),
          rpc("admin_data_quality"),
        ];
        const results = await Promise.all(calls);
        if (cancelled) return;
        const [
          storageRes, aiRes, activeRes, subsRes,
          matrixRes, mindRes, perfRes, riskRes, benchRes,
          engRes, heatRes, cohortRes, funnelRes, dqRes,
        ] = results;

        const liveStorage = storageRes.error ? null : shapeStorage((storageRes.data || []) as StorageRow[]);
        const liveAi = aiRes.error ? null : shapeAi((aiRes.data || []) as AiRow[]);
        const liveActive = activeRes.error ? null : Number(activeRes.data ?? 0);
        const liveSubs = subsRes.error ? null : (subsRes.data as AdminLive["subs"]);

        const firstError =
          storageRes.error?.message || aiRes.error?.message || activeRes.error?.message || subsRes.error?.message ||
          matrixRes.error?.message || mindRes.error?.message || perfRes.error?.message || riskRes.error?.message ||
          benchRes.error?.message || engRes.error?.message || heatRes.error?.message || cohortRes.error?.message ||
          funnelRes.error?.message || dqRes.error?.message || null;

        const okCount = results.filter((r: any) => !r.error).length;

        // Lightweight content hash — only changes when material counts change.
        // Avoids spurious pulses from object identity on each poll.
        const hashParts = [
          okCount,
          (matrixRes.data as any[] | null)?.length || 0,
          (engRes.data as any[] | null)?.length || 0,
          (heatRes.data as any[] | null)?.reduce?.((s: number, r: any) => s + Number(r.n || 0), 0) || 0,
          (funnelRes.data as any[] | null)?.reduce?.((s: number, r: any) => s + Number(r.n || 0), 0) || 0,
          liveActive ?? 0,
          liveStorage?.dbStats.sizeMb || 0,
        ];
        const dataHash = hashParts.join("|");

        setState({
          loading: false,
          error: firstError,
          okCount,
          totalCount: results.length,
          lastUpdated: Date.now(),
          dataHash,
          storage: liveStorage,
          aiUsage: liveAi && liveAi.length ? liveAi : null,
          activeCount: liveActive,
          subs: liveSubs,
          traderMatrix: matrixRes.error ? null : ((matrixRes.data || []) as TraderMatrixRow[]),
          traderMind: mindRes.error ? null : mindRes.data,
          performance: perfRes.error ? null : perfRes.data,
          riskEngine: riskRes.error ? null : riskRes.data,
          benchmarks: benchRes.error ? null : benchRes.data,
          engagementWeekly: engRes.error ? null : ((engRes.data || []) as EngagementWeek[]),
          activityHeatmap: heatRes.error ? null : ((heatRes.data || []) as HeatmapCell[]),
          retentionCohorts: cohortRes.error ? null : ((cohortRes.data || []) as any[]),
          activationFunnel: funnelRes.error ? null : ((funnelRes.data || []) as FunnelStage[]),
          dataQuality: dqRes.error ? null : dqRes.data,
        });
      } catch (e: any) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: e?.message || String(e) }));
      } finally {
        if (!cancelled) timer = setTimeout(fetchAll, 30000);
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return state;
}
