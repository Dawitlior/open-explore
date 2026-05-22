/**
 * Oracle Core — Live session hook (Phase 2).
 * Loads the node catalog, drives the recursive engine, and persists every
 * answer + telemetry tick to Lovable Cloud.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { nextNode } from '@/lib/oracle/engine';
import { applyStep, vectorConfidence } from '@/lib/oracle/vectorize';
import { depthProbeForDimension } from '@/lib/oracle/nodes.seed';
import type {
  DissonanceEntry, OracleNode, OracleSessionState, PartialVector, VisitedStep,
} from '@/lib/oracle/types';

interface UseOracleSession {
  loading: boolean;
  starting: boolean;
  session: OracleSessionState | null;
  currentNode: OracleNode | null;
  vector: PartialVector;
  confidence: number;
  totalAnswered: number;
  nodesByCode: Record<string, OracleNode>;
  start: () => Promise<void>;
  answer: (optionId: string, telemetry: { latency_ms: number; hover_count: number; changed_mind: number }) => Promise<void>;
  skip: (telemetry: { latency_ms: number; hover_count: number }) => Promise<void>;
  isLocked: boolean;
}

export function useOracleSession(): UseOracleSession {
  const { user } = useAuth();
  const [nodesByCode, setNodesByCode] = useState<Record<string, OracleNode>>({});
  const [session, setSession] = useState<OracleSessionState | null>(null);
  const [vector, setVector] = useState<PartialVector>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const writeLock = useRef(false);

  // Load node catalog
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from('oracle_nodes').select('*');
      if (!alive || !data) return;
      const map: Record<string, OracleNode> = {};
      for (const r of data as any[]) {
        map[r.code] = {
          code: r.code, category: r.category, tier: r.tier,
          stratum: (r.stratum ?? 'S5') as OracleNode['stratum'],
          claim_token: r.claim_token ?? undefined,
          counter_for: r.counter_for ?? undefined,
          prompt_he: r.prompt_he, prompt_en: r.prompt_en,
          options: r.options ?? [], branches: r.branches ?? {},
          trap: !!r.trap, trap_pair: r.trap_pair ?? undefined,
        };
      }
      setNodesByCode(map);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Resume existing in-progress session
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('oracle_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('state', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const s: OracleSessionState = {
          id: data.id, user_id: data.user_id, state: data.state as any,
          current_node_code: data.current_node_code,
          visited_path: (data.visited_path as any) ?? [],
          dissonance_log: (data.dissonance_log as any) ?? [],
          depth_score: data.depth_score ?? 0,
          claim_ledger: ((data as any).claim_ledger as any) ?? {},
          instability_index: Number((data as any).instability_index ?? 0),
        };
        setSession(s);
      }
    })();
  }, [user]);

  // Recompute vector when session/path changes
  useEffect(() => {
    if (!session) { setVector({}); return; }
    let v: PartialVector = {};
    for (const step of session.visited_path) {
      const node = nodesByCode[step.node];
      if (node) v = applyStep(v, step, node);
    }
    setVector(v);
  }, [session, nodesByCode]);

  const start = useCallback(async () => {
    if (!user || starting) return;
    setStarting(true);
    try {
      // First node deterministically: tier 1, code-sorted
      const first = Object.values(nodesByCode)
        .filter((n) => n.tier === 1 && !n.trap)
        .sort((a, b) => a.code.localeCompare(b.code))[0];
      const initial: OracleSessionState = {
        id: '', user_id: user.id, state: 'in_progress',
        current_node_code: first?.code ?? null,
        visited_path: [], dissonance_log: [], depth_score: 0,
        claim_ledger: {}, instability_index: 0,
      };
      const { data, error } = await supabase
        .from('oracle_sessions')
        .insert({
          user_id: user.id,
          state: 'in_progress',
          current_node_code: initial.current_node_code,
          visited_path: [],
          dissonance_log: [],
          depth_score: 0,
        })
        .select()
        .single();
      if (error) throw error;
      setSession({ ...initial, id: data.id });
    } finally {
      setStarting(false);
    }
  }, [user, nodesByCode, starting]);

  const persist = useCallback(async (
    nextPath: VisitedStep[],
    nextDiss: DissonanceEntry[],
    nextCode: string | null,
    nextDepth: number,
    locked: boolean,
  ) => {
    if (!session) return;
    await supabase
      .from('oracle_sessions')
      .update({
        current_node_code: nextCode,
        visited_path: nextPath as any,
        dissonance_log: nextDiss as any,
        depth_score: nextDepth,
        state: locked ? 'locked' : 'in_progress',
        completed_at: locked ? new Date().toISOString() : null,
      })
      .eq('id', session.id);
  }, [session]);

  const advance = useCallback(async (step: VisitedStep) => {
    if (!session || writeLock.current) return;
    writeLock.current = true;
    try {
      const nextPath = [...session.visited_path, step];
      // Recompute vector with this step included
      const node = nodesByCode[step.node];
      const nextVec = node ? applyStep(vector, step, node) : vector;

      // Mark dissonance resolved if revisiting that node
      let nextDiss = session.dissonance_log.map((d) =>
        d.reapproach_node === step.node ? { ...d, resolved: true } : d,
      );

      const res = nextNode({
        session: {
          ...session,
          visited_path: nextPath,
          dissonance_log: nextDiss,
        },
        nodesByCode,
        vector: nextVec,
        depthProbeForDimension,
      });
      nextDiss = res.dissonance_log;
      const locked = res.nextNodeCode === null || res.reason === 'session_locked' || res.reason === 'hard_cap';

      setSession({
        ...session,
        visited_path: nextPath,
        dissonance_log: nextDiss,
        depth_score: res.depth_score,
        current_node_code: res.nextNodeCode,
        state: locked ? 'locked' : 'in_progress',
      });

      // Persist telemetry + session in parallel
      await Promise.all([
        supabase.from('oracle_telemetry').insert({
          session_id: session.id,
          node_code: step.node,
          option_id: step.optionId,
          latency_ms: step.t_ms,
          hover_count: step.hover_count ?? 0,
          changed_mind: step.changed_mind ?? 0,
          skipped: step.skipped,
        }),
        persist(nextPath, nextDiss, res.nextNodeCode, res.depth_score, locked),
      ]);

      // If just locked, kick off synthesis (best-effort, non-blocking)
      if (locked) {
        supabase.functions.invoke('oracle-synthesize', { body: { session_id: session.id } })
          .catch(() => { /* noop */ });
      }
    } finally {
      writeLock.current = false;
    }
  }, [session, nodesByCode, vector, persist]);

  const answer = useCallback(async (
    optionId: string,
    telemetry: { latency_ms: number; hover_count: number; changed_mind: number },
  ) => {
    if (!session?.current_node_code) return;
    await advance({
      node: session.current_node_code,
      optionId,
      t_ms: telemetry.latency_ms,
      skipped: false,
      revisit: session.visited_path.some((s) => s.node === session.current_node_code),
      hover_count: telemetry.hover_count,
      changed_mind: telemetry.changed_mind,
    });
  }, [session, advance]);

  const skip = useCallback(async (
    telemetry: { latency_ms: number; hover_count: number },
  ) => {
    if (!session?.current_node_code) return;
    await advance({
      node: session.current_node_code,
      optionId: null,
      t_ms: telemetry.latency_ms,
      skipped: true,
      revisit: false,
      hover_count: telemetry.hover_count,
      changed_mind: 0,
    });
  }, [session, advance]);

  const currentNode = useMemo(
    () => (session?.current_node_code ? nodesByCode[session.current_node_code] ?? null : null),
    [session, nodesByCode],
  );
  const confidence = useMemo(() => vectorConfidence(vector), [vector]);
  const totalAnswered = session?.visited_path.filter((s) => !s.skipped).length ?? 0;
  const isLocked = session?.state === 'locked' || session?.state === 'completed';

  return {
    loading, starting, session, currentNode, vector, confidence,
    totalAnswered, nodesByCode, start, answer, skip, isLocked,
  };
}
