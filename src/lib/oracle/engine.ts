/**
 * Oracle v2 — Recursive Diagnostic State Machine.
 *
 * Routing priority (first match wins):
 *  1. CLAIM-TEST OWED        — an S4 claim_token still has no S5/S6 counter answered
 *  2. PENDING DEPTH-PROBE    — queued by a previous dissonance entry
 *  3. CONTRADICTION PROBE    — last answer contradicts an earlier dimension
 *  4. INSTABILITY PROBE      — latency>4500ms OR flips≥2 OR skip
 *  5. CROSS-STRATUM BRIDGE   — life-habit signal (S1–S3) → S5/S6 mirror
 *  6. DYNAMIC / STATIC BRANCH
 *  7. STRATUM ROTATION       — avoid two consecutive same-stratum nodes
 *  8. CONFIDENCE LOCK        — ≥ MIN_NODES_BEFORE_LOCK AND vector_confidence ≥ threshold
 *  9. HARD CAP               — HARD_NODE_CAP
 */

import {
  HARD_NODE_CAP, MIN_NODES_BEFORE_LOCK, VECTOR_LOCK_CONFIDENCE,
  type BranchRule, type ClaimLedger, type DissonanceEntry, type NextNodeResult,
  type OracleNode, type OracleSessionState, type PartialVector, type Stratum, type VisitedStep,
} from './types';
import { vectorConfidence, scoreClaimTest } from './vectorize';

export interface NextNodeArgs {
  session: OracleSessionState;
  nodesByCode: Record<string, OracleNode>;
  vector: PartialVector;
  depthProbeForDimension?: (dim: string) => string | null;
}

function evaluateBranch(rule: BranchRule, v: PartialVector): string | null {
  if (typeof rule === 'string') return rule;
  const lhs = v[rule.if.dim] ?? 0;
  const truthy =
    rule.if.op === '>'  ? lhs >  rule.if.value :
    rule.if.op === '<'  ? lhs <  rule.if.value :
    rule.if.op === '>=' ? lhs >= rule.if.value :
                          lhs <= rule.if.value;
  return truthy ? rule.then : (rule.else ?? null);
}

/** List of claim_tokens the user emitted in S4 that still have no counter-answered. */
export function claimDebt(
  session: OracleSessionState,
  nodesByCode: Record<string, OracleNode>,
): string[] {
  const emitted = new Set<string>();
  const tested  = new Set<string>();
  for (const step of session.visited_path) {
    const node = nodesByCode[step.node];
    if (!node || step.skipped) continue;
    if (node.stratum === 'S4' && node.claim_token) emitted.add(node.claim_token);
    if (node.counter_for) tested.add(node.counter_for);
  }
  return [...emitted].filter((t) => !tested.has(t));
}

/** First S5/S6 node that tests the given claim and is not yet visited. */
function findCounterNode(
  claim: string,
  nodesByCode: Record<string, OracleNode>,
  visited: Set<string>,
): string | null {
  for (const n of Object.values(nodesByCode)) {
    if (n.counter_for === claim && !visited.has(n.code)) return n.code;
  }
  return null;
}

/**
 * If last step is an S1–S3 life-habit answer with a strong dimensional pull,
 * route to a matching S5/S6 mirror that probes the same dimension in trading.
 */
function crossStratumBridge(
  session: OracleSessionState,
  nodesByCode: Record<string, OracleNode>,
  vector: PartialVector,
): string | null {
  const last = session.visited_path[session.visited_path.length - 1];
  if (!last || last.skipped) return null;
  const lastNode = nodesByCode[last.node];
  if (!lastNode || !['S1', 'S2', 'S3'].includes(lastNode.stratum)) return null;
  // Find a strong dim pull
  const lastOpt = lastNode.options.find((o) => o.id === last.optionId);
  if (!lastOpt) return null;
  const strongDim = Object.entries(lastOpt.weights).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  if (!strongDim || Math.abs(strongDim[1]) < 0.7) return null;
  const visited = new Set(session.visited_path.map((s) => s.node));
  // Prefer S5/S6 nodes touching the same dim
  for (const n of Object.values(nodesByCode)) {
    if (!['S5', 'S6'].includes(n.stratum)) continue;
    if (visited.has(n.code)) continue;
    if (n.options.some((o) => Math.abs(o.weights[strongDim[0]] ?? 0) >= 0.5)) return n.code;
  }
  return null;
}

function detectTrapContradiction(
  path: VisitedStep[],
  nodesByCode: Record<string, OracleNode>,
): string | null {
  if (path.length === 0) return null;
  const last = path[path.length - 1];
  if (last.skipped || !last.optionId) return null;
  const lastNode = nodesByCode[last.node];
  if (!lastNode?.trap || !lastNode.trap_pair) return null;
  const pair = path.find((s) => s.node === lastNode.trap_pair && !s.skipped && s.optionId);
  if (!pair) return null;
  const pairNode = nodesByCode[pair.node];
  const pairOpt = pairNode?.options.find((o) => o.id === pair.optionId);
  const lastOpt = lastNode.options.find((o) => o.id === last.optionId);
  if (!pairOpt || !lastOpt) return null;
  for (const dim of Object.keys(lastOpt.weights)) {
    const a = pairOpt.weights[dim], b = lastOpt.weights[dim];
    if (a == null || b == null) continue;
    if (Math.sign(a) !== 0 && Math.sign(b) !== 0 && Math.sign(a) !== Math.sign(b)) return dim;
  }
  return null;
}

/**
 * Update the claim ledger if the last step counter-tested a claim emitted earlier.
 */
function updateClaimLedger(
  session: OracleSessionState,
  nodesByCode: Record<string, OracleNode>,
): ClaimLedger {
  const last = session.visited_path[session.visited_path.length - 1];
  if (!last || last.skipped) return session.claim_ledger;
  const node = nodesByCode[last.node];
  if (!node?.counter_for) return session.claim_ledger;
  const opt = node.options.find((o) => o.id === last.optionId);
  const delta = scoreClaimTest(node.counter_for, opt ?? null);
  if (delta === 0) return session.claim_ledger;
  const prev = session.claim_ledger[node.counter_for] ?? 0;
  return { ...session.claim_ledger, [node.counter_for]: Math.max(-1, Math.min(1, prev + delta * 0.7)) };
}

export function nextNode({
  session, nodesByCode, vector, depthProbeForDimension,
}: NextNodeArgs): NextNodeResult {
  const path = session.visited_path;
  let dissonance_log = session.dissonance_log;
  let depth_score = session.depth_score;
  const claim_ledger = updateClaimLedger(session, nodesByCode);
  const visited = new Set(path.map((s) => s.node));

  // 0) Hard cap
  if (path.length >= HARD_NODE_CAP) {
    return { nextNodeCode: null, dissonance_log, depth_score, claim_ledger, reason: 'hard_cap' };
  }

  // 1) CLAIM-TEST OWED
  const debts = claimDebt(session, nodesByCode);
  if (debts.length > 0) {
    for (const claim of debts) {
      const code = findCounterNode(claim, nodesByCode, visited);
      if (code) {
        return { nextNodeCode: code, dissonance_log, depth_score: depth_score + 1, claim_ledger, reason: 'claim_test_owed' };
      }
    }
  }

  // 2) Pending depth-probe
  const pending = dissonance_log.find(
    (d) => !d.resolved && d.reapproach_node && !visited.has(d.reapproach_node),
  );
  if (pending?.reapproach_node) {
    return { nextNodeCode: pending.reapproach_node, dissonance_log, depth_score: depth_score + 1, claim_ledger, reason: 'pending_depth_probe' };
  }

  // 3) Trap contradiction
  const contradictedDim = detectTrapContradiction(path, nodesByCode);
  if (contradictedDim) {
    const probe = depthProbeForDimension?.(contradictedDim);
    if (probe && nodesByCode[probe] && !visited.has(probe)) {
      dissonance_log = [
        ...dissonance_log,
        { node: path[path.length - 1].node, type: 'contradiction', resolved: false, reapproach_node: probe },
      ];
      return { nextNodeCode: probe, dissonance_log, depth_score: depth_score + 1, claim_ledger, reason: 'trap_contradiction' };
    }
  }

  // 4) Instability probe (telemetry-based)
  const last = path[path.length - 1];
  if (last && (last.t_ms > 4500 || (last.changed_mind ?? 0) >= 2 || last.skipped)) {
    const lastNode = nodesByCode[last.node];
    const lastOpt = lastNode?.options.find((o) => o.id === last.optionId);
    const strongDim = lastOpt
      ? Object.entries(lastOpt.weights).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0]?.[0]
      : null;
    const probe = strongDim ? depthProbeForDimension?.(strongDim) : null;
    if (probe && nodesByCode[probe] && !visited.has(probe)) {
      return { nextNodeCode: probe, dissonance_log, depth_score: depth_score + 1, claim_ledger, reason: 'instability_probe' };
    }
  }

  // 5) Cross-stratum bridge
  const bridge = crossStratumBridge(session, nodesByCode, vector);
  if (bridge && !visited.has(bridge)) {
    return { nextNodeCode: bridge, dissonance_log, depth_score, claim_ledger, reason: 'cross_stratum_bridge' };
  }

  // 6) Dynamic / static branch
  if (last && session.current_node_code) {
    const cur = nodesByCode[session.current_node_code];
    const rule = (last.optionId && cur?.branches[last.optionId]) ?? cur?.branches['*'];
    if (rule) {
      const target = evaluateBranch(rule, vector);
      if (target && nodesByCode[target] && !visited.has(target)) {
        return { nextNodeCode: target, dissonance_log, depth_score, claim_ledger,
                 reason: typeof rule === 'string' ? 'static_branch' : 'dynamic_branch' };
      }
    }
  }

  // 7) Confidence lock (only after minimum nodes & no owed claims)
  if (path.length >= MIN_NODES_BEFORE_LOCK
      && vectorConfidence(vector) >= VECTOR_LOCK_CONFIDENCE
      && debts.length === 0) {
    return { nextNodeCode: null, dissonance_log, depth_score, claim_ledger, reason: 'session_locked' };
  }

  // 8) Stratum rotation — pick lowest-tier unvisited from a different stratum
  const lastStratum = last ? nodesByCode[last.node]?.stratum : null;
  const candidates = Object.values(nodesByCode)
    .filter((n) => !visited.has(n.code) && !n.trap && n.category !== 'depth_probe')
    .sort((a, b) => {
      const aDiff = a.stratum !== lastStratum ? 0 : 1;
      const bDiff = b.stratum !== lastStratum ? 0 : 1;
      if (aDiff !== bDiff) return aDiff - bDiff;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.code.localeCompare(b.code);
    });
  const next = candidates[0];
  if (next) {
    return { nextNodeCode: next.code, dissonance_log, depth_score, claim_ledger,
             reason: next.stratum !== lastStratum ? 'stratum_rotation' : 'fallback' };
  }

  return { nextNodeCode: null, dissonance_log, depth_score, claim_ledger, reason: 'session_locked' };
}
