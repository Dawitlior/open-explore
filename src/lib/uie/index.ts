// UIE v1.2 — public entrypoints (Phase 1 + 2 + 3).
export { mapHeaderToField as uieMapHeader } from './matching/tiers';
export { normalizeHeader as uieNormalizeHeader } from './matching/normalize';
export { detectDateFormat as uieDetectDateFormat } from './matching/date-detect';

// Phase 2
export { profileColumn, confirmsPendingField } from './content/profile';
export type { ContentProfile, ContentType } from './content/profile';
export {
  normalizeNumber, normalizePercent, normalizeRMultiple,
  normalizeDirection, normalizeDate, normalizeDateColumn, isNull,
} from './content/normalize-values';
export { archetypeA } from './archetypes/archetype-a';
export type { ArchetypeAResult, ColumnPlan } from './archetypes/archetype-a';
export { archetypeB, looksLikeArchetypeB } from './archetypes/archetype-b';
export type { ArchetypeBResult } from './archetypes/archetype-b';
export { detectArchetype, runUIE } from './archetypes/detect';
export type { ArchetypeKind, DetectResult, RunResult } from './archetypes/detect';

// Phase 3
export { archetypeC } from './archetypes/archetype-c';
export type { ArchetypeCResult } from './archetypes/archetype-c';
export { classifyFills } from './archetypes/fill-classify';
export type { FillClassifyResult } from './archetypes/fill-classify';
export { linkFiles } from './link-files/link';
export type { FileInput, LinkResult } from './link-files/link';
export { deriveFields, deriveAll } from './link-files/derive';

export type { MatchResult, CanonicalField, MatchTier, MatchStatus, CanonicalTrade } from './canonical-trade';

// Phase 4
export { archetypeD, looksLikeArchetypeD } from './archetypes/archetype-d';
export type { ArchetypeDResult, EquityEvent, EquityEventKind } from './archetypes/archetype-d';
export { buildLedger, summarizeByKind } from './equity-events';
export type { EquityLedgerEntry } from './equity-events';
export { canonicalToNormalized, canonicalBatchToNormalized } from './adapter';
export type { AdapterOptions } from './adapter';

// Phase 4.5 — Delivery
export { analyzeGaps } from './delivery/gap-analysis';
export type { GapReport, RowGap, GapSeverity } from './delivery/gap-analysis';
export { suggestFixes } from './delivery/fix-actions';
export type { FixAction, FixActionKind } from './delivery/fix-actions';
export { dedupTrades } from './delivery/dedup';
export type { DedupResult } from './delivery/dedup';
export { foldOverflowIntoComments, foldOverflowBatch } from './delivery/notes-overflow';
export type { OverflowOptions } from './delivery/notes-overflow';
