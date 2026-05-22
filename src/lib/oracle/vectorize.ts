/**
 * Oracle v2 — Vectorization with per-metric amplifier caps.
 * No single telemetry signal can dominate the vector.
 */

import type { OracleNode, PartialVector, VisitedStep } from './types';

const LATENCY_BASELINE_MS = 900;
const LATENCY_CEILING_MS  = 4500;

const CAP_HESITATION = 0.45;  // ≤45% boost from latency
const CAP_FLIP       = 0.25;  // ≤25% boost from changed_mind
const CAP_HOVER      = 0.15;  // ≤15% boost from hover_count
const CAP_REREAD     = 0.15;  // ≤15% boost from re_read_count
const CAP_IDLE       = 0.25;  // ≤25% boost from idle pauses

export function hesitationIndex(latency_ms: number | null | undefined): number {
  if (!latency_ms || latency_ms < LATENCY_BASELINE_MS) return 0;
  const span = LATENCY_CEILING_MS - LATENCY_BASELINE_MS;
  return Math.max(0, Math.min(1, (latency_ms - LATENCY_BASELINE_MS) / span));
}

export function signalAmplifier(step: VisitedStep): number {
  const hes    = Math.min(CAP_HESITATION, hesitationIndex(step.t_ms) * CAP_HESITATION);
  const flip   = Math.min(CAP_FLIP,   (step.changed_mind ?? 0) * 0.1);
  const hover  = Math.min(CAP_HOVER,  Math.log1p(step.hover_count ?? 0) * 0.08);
  const reread = Math.min(CAP_REREAD, (step.re_read_count ?? 0) * 0.05);
  const idle   = Math.min(CAP_IDLE,   ((step.idle_pause_ms ?? 0) > 2500 ? 0.25 : (step.idle_pause_ms ?? 0) / 10000));
  return 1 + hes + flip + hover + reread + idle;
}

/**
 * Instability index ∈ [0, 1] — derived from telemetry, surfaced to coach.
 * High = elevated hesitation / mind-changing / abandonment.
 */
export function computeInstabilityIndex(path: VisitedStep[]): number {
  if (path.length === 0) return 0;
  let sum = 0;
  for (const s of path) {
    const h = hesitationIndex(s.t_ms);
    const f = Math.min(1, (s.changed_mind ?? 0) / 3);
    const sk = s.skipped ? 0.6 : 0;
    const ab = s.abandon_flag ? 1 : 0;
    sum += Math.min(1, 0.4 * h + 0.25 * f + sk + ab);
  }
  return Math.min(1, sum / path.length);
}

export function applyStep(
  vector: PartialVector,
  step: VisitedStep,
  node: OracleNode,
): PartialVector {
  if (step.skipped || !step.optionId) return vector;
  const opt = node.options.find((o) => o.id === step.optionId);
  if (!opt) return vector;
  const amp = signalAmplifier(step);
  const next = { ...vector };
  for (const [dim, w] of Object.entries(opt.weights)) {
    next[dim] = (next[dim] ?? 0) + w * amp;
  }
  return next;
}

export function vectorizePath(
  path: VisitedStep[],
  nodesByCode: Record<string, OracleNode>,
): PartialVector {
  let v: PartialVector = {};
  for (const step of path) {
    const node = nodesByCode[step.node];
    if (!node) continue;
    v = applyStep(v, step, node);
  }
  return v;
}

export function vectorConfidence(v: PartialVector, expectedDims = 28): number {
  const stable = Object.values(v).filter((x) => Math.abs(x) >= 1.5).length;
  return Math.min(1, stable / expectedDims);
}

/**
 * Score a claim against a counter-scenario answer.
 * Returns delta ∈ [-1, +1] to apply to claim_ledger[token].
 */
export function scoreClaimTest(
  claimToken: string,
  counterOption: { weights: Record<string, number> } | null,
): number {
  if (!counterOption) return 0;
  // Heuristic: claim:patient → impulsivity should be negative; positive impulsivity = failed claim
  const map: Record<string, { dim: string; bad_sign: 1 | -1 }> = {
    'claim:patient':      { dim: 'impulsivity',     bad_sign: 1 },
    'claim:disciplined':  { dim: 'rule_adherence',  bad_sign: -1 },
    'claim:contrarian':   { dim: 'story_dependency', bad_sign: 1 },
    'claim:risk_aware':   { dim: 'leverage_hubris', bad_sign: 1 },
    'claim:objective':    { dim: 'loss_attribution_external', bad_sign: 1 },
  };
  const cfg = map[claimToken];
  if (!cfg) return 0;
  const w = counterOption.weights[cfg.dim] ?? 0;
  // If "bad" direction is positive, then positive w = claim failed (-1 integrity).
  const failed = (cfg.bad_sign === 1 && w > 0.3) || (cfg.bad_sign === -1 && w < -0.3);
  const upheld = (cfg.bad_sign === 1 && w < -0.3) || (cfg.bad_sign === -1 && w > 0.3);
  if (failed) return -Math.min(1, Math.abs(w));
  if (upheld) return  Math.min(1, Math.abs(w));
  return 0;
}
