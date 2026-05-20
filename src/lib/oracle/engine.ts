/**
 * Oracle Core — Recursive State Machine.
 *
 * Pure function: given a session snapshot + node catalog + partial vector,
 * decides the next node. No React, no I/O — fully unit-testable.
 *
 * Routing priority:
 *  1. Pending depth-probe queued by a dissonance entry.
 *  2. Trap contradiction → emit depth-probe.
 *  3. Unresolved skip older than 2 nodes → re-approach harder.
 *  4. Evaluate current node's branches against last option.
 *  5. Vector confidence ≥ threshold → LOCK.
 *  6. Hard cap at HARD_NODE_CAP nodes.
 */

import {
  HARD_NODE_CAP,
  VECTOR_LOCK_CONFIDENCE,
  type BranchRule,
  type DissonanceEntry,
  type NextNodeResult,
  type OracleNode,
  type OracleSessionState,
  type PartialVector,
  type VisitedStep,
} from './types';
import { vectorConfidence } from './vectorize';

export interface NextNodeArgs {
  session: OracleSessionState;
  nodesByCode: Record<string, OracleNode>;
  vector: PartialVector;
  /** Optional helper for depth-probe code lookup, e.g. ("loss_aversion") → "PROBE_LOSS_AVERSION_QUANT". */
  depthProbeForDimension?: (dim: string) => string | null;
}

/**
 * Resolve a BranchRule against the current partial vector.
 */
function evaluateBranch(rule: BranchRule, vector: PartialVector): string | null {
  if (typeof rule === 'string') return rule;
  const lhs = vector[rule.if.dim] ?? 0;
  const { op, value } = rule.if;
  const truthy =
    op === '>' ? lhs > value :
    op === '<' ? lhs < value :
    op === '>=' ? lhs >= value :
    /* '<=' */    lhs <= value;
  if (truthy) return rule.then;
  return rule.else ?? null;
}

/**
 * Detect whether the most recent answered step contradicts a previously
 * answered trap-pair node. Returns the dimension that contradicts.
 */
function detectTrapContradiction(
  path: VisitedStep[],
  nodesByCode: Record<string, OracleNode>,
): string | null {
  if (path.length === 0) return null;
  const last = path[path.length - 1];
  if (last.skipped || !last.optionId) return null;
  const lastNode = nodesByCode[last.node];
  if (!lastNode?.trap || !lastNode.trap_pair) return null;

  // Find the original (non-trap) answer to the paired node.
  const pair = path.find((s) => s.node === lastNode.trap_pair && !s.skipped && s.optionId);
  if (!pair) return null;

  const pairNode = nodesByCode[pair.node];
  if (!pairNode) return null;

  const pairOpt = pairNode.options.find((o) => o.id === pair.optionId);
  const lastOpt = lastNode.options.find((o) => o.id === last.optionId);
  if (!pairOpt || !lastOpt) return null;

  // Find any dimension where the signs disagree strongly.
  for (const dim of Object.keys(lastOpt.weights)) {
    const a = pairOpt.weights[dim];
    const b = lastOpt.weights[dim];
    if (a == null || b == null) continue;
    if (Math.sign(a) !== 0 && Math.sign(b) !== 0 && Math.sign(a) !== Math.sign(b)) {
      return dim;
    }
  }
  return null;
}

export function nextNode({
  session,
  nodesByCode,
  vector,
  depthProbeForDimension,
}: NextNodeArgs): NextNodeResult {
  const path = session.visited_path;
  let dissonance_log = session.dissonance_log;
  let depth_score = session.depth_score;

  // Hard cap
  if (path.length >= HARD_NODE_CAP) {
    return {
      nextNodeCode: null,
      dissonance_log,
      depth_score,
      reason: 'hard_cap',
    };
  }

  // 1) Pending depth-probe from a queued dissonance
  const pendingProbe = dissonance_log.find(
    (d) => !d.resolved && d.reapproach_node && !path.some((s) => s.node === d.reapproach_node),
  );
  if (pendingProbe?.reapproach_node) {
    return {
      nextNodeCode: pendingProbe.reapproach_node,
      dissonance_log,
      depth_score: depth_score + 1,
      reason: 'pending_depth_probe',
    };
  }

  // 2) Trap contradiction on the most recent answer
  const contradictedDim = detectTrapContradiction(path, nodesByCode);
  if (contradictedDim) {
    const probeCode = depthProbeForDimension?.(contradictedDim) ?? null;
    if (probeCode && nodesByCode[probeCode]) {
      dissonance_log = [
        ...dissonance_log,
        {
          node: path[path.length - 1].node,
          type: 'contradiction',
          resolved: false,
          reapproach_node: probeCode,
        },
      ];
      return {
        nextNodeCode: probeCode,
        dissonance_log,
        depth_score: depth_score + 1,
        reason: 'trap_contradiction',
      };
    }
  }

  // 3) Re-approach an unresolved skip older than 2 nodes
  const staleSkipIndex = path.findIndex(
    (s, i) =>
      s.skipped &&
      path.length - i >= 2 &&
      !dissonance_log.find((d) => d.node === s.node && d.resolved),
  );
  if (staleSkipIndex >= 0) {
    const skippedNode = nodesByCode[path[staleSkipIndex].node];
    // Re-approach: prefer the trap pair if defined, else the first weighted dim's probe.
    const reCode =
      (skippedNode?.trap_pair && nodesByCode[skippedNode.trap_pair]?.code) ||
      (skippedNode?.options[0]?.weights &&
        depthProbeForDimension?.(Object.keys(skippedNode.options[0].weights)[0])) ||
      null;
    if (reCode && nodesByCode[reCode] && !path.some((s) => s.node === reCode)) {
      const already = dissonance_log.find((d) => d.node === path[staleSkipIndex].node && d.type === 'skip');
      if (!already) {
        dissonance_log = [
          ...dissonance_log,
          { node: path[staleSkipIndex].node, type: 'skip', resolved: false, reapproach_node: reCode },
        ];
      }
      return {
        nextNodeCode: reCode,
        dissonance_log,
        depth_score: depth_score + 1,
        reason: 'reapproach_skip',
      };
    }
  }

  // 4) Evaluate current node's branches against the last option
  const last = path[path.length - 1];
  if (last && session.current_node_code) {
    const currentNode = nodesByCode[session.current_node_code];
    if (currentNode) {
      const rule =
        (last.optionId && currentNode.branches[last.optionId]) ??
        currentNode.branches['*'];
      if (rule) {
        const target = evaluateBranch(rule, vector);
        if (target && nodesByCode[target]) {
          return {
            nextNodeCode: target,
            dissonance_log,
            depth_score,
            reason: typeof rule === 'string' ? 'static_branch' : 'dynamic_branch',
          };
        }
      }
    }
  }

  // 5) Vector confident enough → LOCK
  if (path.length >= 8 && vectorConfidence(vector) >= VECTOR_LOCK_CONFIDENCE) {
    return { nextNodeCode: null, dissonance_log, depth_score, reason: 'session_locked' };
  }

  // 6) Fallback: pick the next unvisited node by lexical code order (deterministic).
  const visited = new Set(path.map((s) => s.node));
  const fallback = Object.values(nodesByCode)
    .filter((n) => !visited.has(n.code) && !n.trap)
    .sort((a, b) => a.tier - b.tier || a.code.localeCompare(b.code))[0];

  return {
    nextNodeCode: fallback?.code ?? null,
    dissonance_log,
    depth_score,
    reason: fallback ? 'fallback' : 'session_locked',
  };
}
