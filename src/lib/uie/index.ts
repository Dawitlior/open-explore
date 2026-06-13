// UIE v1.2 — public entrypoints for Phase 1.
export { mapHeaderToField as uieMapHeader } from './matching/tiers';
export { normalizeHeader as uieNormalizeHeader } from './matching/normalize';
export { detectDateFormat as uieDetectDateFormat } from './matching/date-detect';
export type { MatchResult, CanonicalField, MatchTier, MatchStatus } from './canonical-trade';
