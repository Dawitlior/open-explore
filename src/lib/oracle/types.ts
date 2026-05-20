/**
 * Oracle Core — Behavioral Diagnostic Engine
 * Type definitions for the recursive state machine.
 */

export type DimensionKey = string; // 128-D vector keys, e.g. 'impulsivity', 'loss_aversion'

export interface OptionWeights {
  /** Map of dimension → signed contribution (typically -1..+1). */
  [dim: string]: number;
}

export interface NodeOption {
  id: string;
  label_he: string;
  label_en: string;
  weights: OptionWeights;
}

/** A branch rule: either a static next-node code or a vector-based dynamic rule. */
export type BranchRule =
  | string                                                  // static: next node code
  | { if: { dim: DimensionKey; op: '>' | '<' | '>=' | '<='; value: number }; then: string; else?: string };

export interface OracleNode {
  code: string;
  category: string;
  tier: number;
  prompt_he: string;
  prompt_en: string;
  options: NodeOption[];
  /** Map of optionId → BranchRule. The "*" key is a fallback for any option. */
  branches: Record<string, BranchRule>;
  trap?: boolean;
  trap_pair?: string;
}

export interface VisitedStep {
  node: string;
  optionId: string | null; // null when skipped/deferred
  t_ms: number;            // latency in ms
  skipped: boolean;
  revisit: boolean;        // re-approach after a previous skip/contradiction
  hover_count?: number;
  changed_mind?: number;
}

export type DissonanceType = 'skip' | 'contradiction';

export interface DissonanceEntry {
  node: string;
  type: DissonanceType;
  resolved: boolean;
  /** When this dissonance must be re-approached (queued node code). */
  reapproach_node?: string;
}

export interface OracleSessionState {
  id: string;
  user_id: string;
  state: 'in_progress' | 'locked' | 'completed' | 'abandoned';
  current_node_code: string | null;
  visited_path: VisitedStep[];
  dissonance_log: DissonanceEntry[];
  depth_score: number;
}

export interface PartialVector {
  [dim: string]: number;
}

export interface TelemetryEvent {
  session_id: string;
  node_code: string;
  option_id: string | null;
  latency_ms: number | null;
  hover_count: number;
  changed_mind: number;
  skipped: boolean;
  scroll_jitter: number | null;
}

export interface OracleVector {
  user_id: string;
  version: number;
  vector: PartialVector;
  archetype: string | null;
  shadow_patterns: Array<{ name: string; weight: number; evidence: string[] }>;
  blueprint_md: string | null;
  coach_system_prompt: string | null;
}

/** Result of one engine tick. */
export interface NextNodeResult {
  /** The next node to present, or null when the session should lock. */
  nextNodeCode: string | null;
  /** Updated dissonance log (caller persists). */
  dissonance_log: DissonanceEntry[];
  /** Updated depth score. */
  depth_score: number;
  /** Reason for the routing decision (debug + telemetry). */
  reason:
    | 'pending_depth_probe'
    | 'trap_contradiction'
    | 'reapproach_skip'
    | 'dynamic_branch'
    | 'static_branch'
    | 'fallback'
    | 'session_locked'
    | 'hard_cap';
}

export const HARD_NODE_CAP = 60;
export const VECTOR_LOCK_CONFIDENCE = 0.92;
