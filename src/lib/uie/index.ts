// UIE v1.2 — public entrypoints (Phase 1 + Phase 2).
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

export type { MatchResult, CanonicalField, MatchTier, MatchStatus, CanonicalTrade } from './canonical-trade';
