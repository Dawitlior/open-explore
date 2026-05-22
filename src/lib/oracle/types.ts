/**
 * Oracle Core v2 — Behavioral OS Diagnostic Kernel.
 * Strata-aware, claim-tested, telemetry-rich type definitions.
 */

export type DimensionKey = string;

/** 7-stratum taxonomy (see Master Plan §A.1). */
export type Stratum = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7';

export const STRATA: Stratum[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

export const STRATUM_LABEL: Record<Stratum, { he: string; en: string; glyph: string }> = {
  S1: { he: 'כרונו',        en: 'Chrono',       glyph: '◷' },
  S2: { he: 'סביבה',        en: 'Environment',  glyph: '◫' },
  S3: { he: 'מידע',         en: 'Information',  glyph: '⌬' },
  S4: { he: 'זהות',         en: 'Identity',     glyph: '◆' },
  S5: { he: 'תרחיש',        en: 'Scenario',     glyph: '◈' },
  S6: { he: 'צל',           en: 'Shadow',       glyph: '◉' },
  S7: { he: 'התאוששות',     en: 'Recovery',     glyph: '◐' },
};

export interface OptionWeights {
  [dim: string]: number;
}

export interface NodeOption {
  id: string;
  label_he: string;
  label_en: string;
  weights: OptionWeights;
}

export type BranchRule =
  | string
  | { if: { dim: DimensionKey; op: '>' | '<' | '>=' | '<='; value: number }; then: string; else?: string };

export interface OracleNode {
  code: string;
  category: string;
  tier: number;
  /** Strata partition — v2 addition. */
  stratum: Stratum;
  /** S4 only — emits a claim token. */
  claim_token?: string;
  /** S5/S6 only — declares this node as the stress-test for a claim. */
  counter_for?: string;
  prompt_he: string;
  prompt_en: string;
  options: NodeOption[];
  branches: Record<string, BranchRule>;
  trap?: boolean;
  trap_pair?: string;
}

export interface VisitedStep {
  node: string;
  optionId: string | null;
  t_ms: number;
  skipped: boolean;
  revisit: boolean;
  hover_count?: number;
  changed_mind?: number;
  /** v2 telemetry */
  idle_pause_ms?: number;
  re_read_count?: number;
  abandon_flag?: boolean;
}

export type DissonanceType = 'skip' | 'contradiction' | 'claim_failed';

export interface DissonanceEntry {
  node: string;
  type: DissonanceType;
  resolved: boolean;
  reapproach_node?: string;
  /** when type=claim_failed, which claim_token failed */
  claim_token?: string;
}

/** Map of claim_token → integrity score in [-1, +1]. */
export type ClaimLedger = Record<string, number>;

export interface OracleSessionState {
  id: string;
  user_id: string;
  state: 'in_progress' | 'locked' | 'completed' | 'abandoned';
  current_node_code: string | null;
  visited_path: VisitedStep[];
  dissonance_log: DissonanceEntry[];
  depth_score: number;
  /** v2 additions */
  claim_ledger: ClaimLedger;
  instability_index: number;
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
  idle_pause_ms: number | null;
  re_read_count: number;
  abandon_flag: boolean;
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

export interface NextNodeResult {
  nextNodeCode: string | null;
  dissonance_log: DissonanceEntry[];
  depth_score: number;
  claim_ledger: ClaimLedger;
  reason:
    | 'claim_test_owed'
    | 'pending_depth_probe'
    | 'trap_contradiction'
    | 'instability_probe'
    | 'cross_stratum_bridge'
    | 'reapproach_skip'
    | 'depth_escalation'
    | 'dynamic_branch'
    | 'static_branch'
    | 'stratum_rotation'
    | 'fallback'
    | 'session_locked'
    | 'hard_cap';
}

export const HARD_NODE_CAP = 48;
export const VECTOR_LOCK_CONFIDENCE = 0.92;
export const MIN_NODES_BEFORE_LOCK = 30;
