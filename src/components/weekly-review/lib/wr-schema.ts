// Customizable Weekly Review — schema contract (Wave 0).
// SINGLE SOURCE OF TRUTH for the template shape. Additive only — never rename
// or remove existing fields (Risk C). All IDs are immutable slugs.
//
// Wave 0 is zero-UX-change: nothing here is wired into UI yet beyond a
// flagged-off renderer. The contract is finalized first so subsequent waves
// build against a stable surface.

// ---------- Localized string ----------
// Renderer resolves by app locale with fallback to the other locale,
// then to '' (never crashes on missing strings).
export type Loc = { he?: string; en?: string };

// ---------- Block types ----------
export type BlockType =
  | 'checklist'
  | 'binary'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'scale'
  | 'text'
  | 'textarea'
  | 'score'
  // ---- system (locked / restricted) ----
  | 'system-trades-table'
  | 'system-stat-chips'
  | 'system-risk-gauges'
  | 'system-grade'
  | 'system-ai-insights';

export interface Option {
  /** Immutable slug. NEVER rename — historical data is keyed by this. */
  id: string;
  label: Loc;
  /** Decision-Quality-style sub-label rendered under the main label. */
  sublabel?: Loc;
  emoji?: string;
  color?: string;
  /** Optional numeric weight for analytics / scoring. */
  value?: number;
}

export interface ChecklistItem {
  /** Immutable slug. NEVER rename. */
  id: string;
  label: Loc;
  emoji?: string;
  /** Counts toward a linked score block (default true). */
  scorable?: boolean;
  /** Small pill text (e.g. "P" on strategy edges) rendered by TriState. */
  tag?: string;
  /** Per-item polarity override — wins over block-level goodIs. */
  goodIs?: ChecklistState;
  /** Optional deep-link action — wave-3 prep "open X" items use this. */
  action?: { type: 'navigate' | 'open_panel'; target: string };
}

/**
 * Tri-state checklist state IDs. The order in `cycle` is the click rotation.
 * `done`/`missed` map onto TriState's existing visual states; `neutral` is
 * the unset state. We use string IDs (not numeric indices) so a template
 * may reorder the cycle without rewriting historical values.
 */
export type ChecklistState = 'neutral' | 'done' | 'missed';

export interface Block {
  /** Immutable slug. */
  id: string;
  type: BlockType;
  label?: Loc;
  helpText?: Loc;
  /** Stable analytics key — see wr-metrics.ts. */
  metricKey?: string;
  /** false on the trade spine. Default true. */
  removable?: boolean;
  /** false on system blocks. Default true. */
  editable?: boolean;
  /** Hard lock — Builder may not delete or retype. */
  locked?: boolean;
  /** Wave-2 hide toggle — kept in schema, not rendered. */
  hidden?: boolean;
  /** Phase 1d — fill-mode responsive grid hint. 'full' spans the row,
   *  'cell' takes a single grid cell (half-width on md+). Optional;
   *  per-type defaults live in render/layout/layout-span.ts. */
  layoutSpan?: 'full' | 'cell';
  order: number;

  config?: {
    // ---- checklist / binary ----
    cycle?: ChecklistState[];
    goodIs?: ChecklistState;
    stateLabels?: Partial<Record<ChecklistState, Loc>>;
    items?: ChecklistItem[];

    // ---- binary (explicit value → label map; replaces ambiguous true/false) ----
    valueMap?: { yes?: Loc; no?: Loc; neutral?: Loc };
    /** Which value tints "positive" / "good". */
    goodValue?: 'yes' | 'no';
    allowNeutral?: boolean;

    // ---- number ----
    min?: number;
    max?: number;
    step?: number;
    unit?: Loc;
    placeholder?: Loc;

    // ---- select / multiselect ----
    options?: Option[];
    variant?: 'dropdown' | 'pills';

    // ---- scale ----
    scaleMin?: number;
    scaleMax?: number;
    minLabel?: Loc;
    maxLabel?: Loc;

    // ---- score (computed display) ----
    /** Block id of the checklist this score is derived from. */
    source?: string;
    method?: 'checklist_percent' | 'checklist_count' | 'weighted_sum';
    scoreMax?: number;

    // ---- text / textarea ----
    multiline?: boolean;
    maxLength?: number;
  };
}

export interface Section {
  /** Immutable slug. */
  id: string;
  icon?: string;
  title?: Loc;
  helpText?: Loc;
  /** Chromeless sections (e.g. risk gauges) skip the SectionTitle render. */
  chromeless?: boolean;
  removable?: boolean;
  /** True for the trade-spine section. */
  system?: boolean;
  hidden?: boolean;
  collapsed?: boolean;
  /** Phase 1d — fill-mode responsive grid hint. Falls back to span derived
   *  from contained blocks (see render/layout/layout-span.ts). */
  layoutSpan?: 'full' | 'cell';
  order: number;
  blocks: Block[];
}

export interface WeeklyReviewSchema {
  schemaFormatVersion: 1;
  meta: {
    name: string;
    localeDefault: 'he' | 'en';
    /** Provenance tag, e.g. 'orca_default_v1'. Bumps on each seed revision. */
    basedOn?: string;
    /** Bumped on every user publish (Wave 2). */
    templateVersion: number;
    /** Tombstones for seed items the user explicitly deleted — merge respects these (Wave 2). */
    removedSeedIds?: string[];
  };
  sections: Section[];
}

// ----------------------------------------------------------------------------
// Values & derived metrics — what the renderer reads/writes per week.
// ----------------------------------------------------------------------------

/** Per-block answer, keyed by Block.id. */
export type ReviewValues = {
  [blockId: string]:
    | string                                 // select / text / textarea / binary
    | number                                 // number / scale
    | string[]                               // multiselect (option ids)
    | { [itemId: string]: ChecklistState }   // checklist
    | null;
};

/** Snapshotted derived metrics, keyed by metricKey (NOT block id). */
export type ReviewComputed = { [metricKey: string]: number | string | null };

// ----------------------------------------------------------------------------
// Loc helpers — kept here so every consumer uses the same fallback rule.
// ----------------------------------------------------------------------------

export function resolveLoc(loc: Loc | undefined, locale: 'he' | 'en'): string {
  if (!loc) return '';
  const primary = loc[locale];
  if (primary != null && primary !== '') return primary;
  const other = locale === 'he' ? loc.en : loc.he;
  return other ?? '';
}
