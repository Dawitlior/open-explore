/**
 * Oracle Core — Vectorization layer.
 * Converts a session's visited path + telemetry into a partial DNA vector.
 *
 * Hesitation amplifies the signal — the "Telemetry of Silence" doctrine:
 * a slow, deliberated answer is louder than a snap one.
 */

import type { OracleNode, PartialVector, VisitedStep } from './types';

const LATENCY_BASELINE_MS = 900;     // Considered "quick instinct" below this.
const LATENCY_CEILING_MS = 4500;     // Above this, we cap the amplifier.

/**
 * 0..1 score: how much this answer was hesitated over.
 * Saturates above LATENCY_CEILING_MS, returns 0 below baseline.
 */
export function hesitationIndex(latency_ms: number | null | undefined): number {
  if (!latency_ms || latency_ms < LATENCY_BASELINE_MS) return 0;
  const span = LATENCY_CEILING_MS - LATENCY_BASELINE_MS;
  const v = (latency_ms - LATENCY_BASELINE_MS) / span;
  return Math.max(0, Math.min(1, v));
}

/**
 * Amplifier applied to the raw dimensional weight of the chosen option.
 * 1.0 baseline; up to ~1.6 on heavy hesitation; +0.1 per changed mind, capped.
 */
export function signalAmplifier(step: VisitedStep): number {
  const hes = hesitationIndex(step.t_ms);
  const flip = Math.min(0.3, (step.changed_mind ?? 0) * 0.1);
  const hover = Math.min(0.2, Math.log1p(step.hover_count ?? 0) * 0.1);
  return 1 + hes * 0.6 + flip + hover;
}

/**
 * Apply a single answered step's contribution into the running vector.
 * Skipped steps are NOT zeros — they're handled by the engine as dissonance
 * triggers and do not update the vector here.
 */
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
    const prev = next[dim] ?? 0;
    // Exponential moving update: bias toward recent, but never erase prior signal.
    next[dim] = prev + w * amp;
  }
  return next;
}

/**
 * Build a vector from scratch given the full path and node catalog.
 * Pure, deterministic — safe for unit tests.
 */
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

/**
 * Confidence (0..1) the vector has stabilised across its touched dimensions.
 * Heuristic: how many dimensions have accumulated |value| ≥ 1.5.
 * Used by the engine to decide when to LOCK the session early.
 */
export function vectorConfidence(v: PartialVector, expectedDims = 24): number {
  const stable = Object.values(v).filter((x) => Math.abs(x) >= 1.5).length;
  return Math.min(1, stable / expectedDims);
}
