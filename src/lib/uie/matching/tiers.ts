// UIE v1.2 — Phase 1 · 4-tier matching engine
//   P1 exact (score 1.0)
//   P2 containment   (alias ⊆ header OR header ⊆ alias, coverage ≥ 0.5)
//   P3 token-subset  (intersection / smaller-set ≥ 0.5)
//   P4 fuzzy (Damerau) threshold 60
// Returns the highest-tier hit. Pending-content defs degrade to
// status: 'pending-content' so Phase 2 can lock the final field.

import { CANONICAL_DICT, EXACT_INDEX, type CanonicalDef } from '../dictionary/canonical-fields';
import { normalizeHeader, tokenize } from './normalize';
import { similarityPct } from './fuzzy';
import type { MatchResult, MatchTier } from '../canonical-trade';

const P4_THRESHOLD = 60;

function buildResult(def: CanonicalDef, tier: MatchTier, score: number, layer: string): MatchResult {
  return {
    field: def.field,
    score,
    tier,
    evidenceLayers: [layer],
    status: def.pendingContent ? 'pending-content' : 'mapped',
  };
}

export function mapHeaderToField(rawHeader: string): MatchResult {
  const nh = normalizeHeader(rawHeader);
  if (!nh.primary) {
    return { field: null, score: 0, tier: null, evidenceLayers: [], status: 'unmapped' };
  }

  const forms = [nh.primary, ...nh.variants];

  // ── P1 exact ─────────────────────────────────────────────
  for (const form of forms) {
    const hit = EXACT_INDEX.get(form);
    if (hit) return buildResult(hit, 'P1', 1, `P1:exact "${form}"`);
  }

  // ── P2 containment ───────────────────────────────────────
  let best: { def: CanonicalDef; score: number; layer: string; tier: MatchTier } | null = null;
  for (const def of CANONICAL_DICT) {
    for (const alias of def.aliases) {
      const a = alias.toLowerCase().trim();
      for (const form of forms) {
        if (a === form) continue; // handled by P1
        if (form.includes(a) || a.includes(form)) {
          const coverage = Math.min(a.length, form.length) / Math.max(a.length, form.length);
          if (coverage >= 0.5) {
            const score = 0.6 + coverage * 0.3; // 0.75..0.9
            if (!best || score > best.score) best = { def, score, layer: `P2:contain "${alias}"~"${form}"`, tier: 'P2' };
          }
        }
      }
    }
  }
  if (best && best.tier === 'P2') return buildResult(best.def, 'P2', best.score, best.layer);

  // ── P3 token-subset ──────────────────────────────────────
  const headerTokens = new Set(nh.tokens);
  for (const def of CANONICAL_DICT) {
    for (const alias of def.aliases) {
      const aliasTokens = new Set(tokenize(alias.toLowerCase()));
      if (!aliasTokens.size || !headerTokens.size) continue;
      let inter = 0;
      for (const t of aliasTokens) if (headerTokens.has(t)) inter++;
      const smaller = Math.min(aliasTokens.size, headerTokens.size);
      const coverage = inter / smaller;
      if (coverage >= 0.5) {
        const score = 0.45 + coverage * 0.25; // 0.575..0.7
        if (!best || score > best.score) best = { def, score, layer: `P3:tokens ${inter}/${smaller}`, tier: 'P3' };
      }
    }
  }
  if (best && best.tier === 'P3') return buildResult(best.def, 'P3', best.score, best.layer);

  // ── P4 fuzzy (Damerau) ───────────────────────────────────
  for (const def of CANONICAL_DICT) {
    for (const alias of def.aliases) {
      const a = alias.toLowerCase().trim();
      for (const form of forms) {
        const sim = similarityPct(form, a);
        if (sim >= P4_THRESHOLD) {
          const score = sim / 100 * 0.55; // ≤ 0.55 cap so manual review surfaces
          if (!best || score > best.score) best = { def, score, layer: `P4:fuzzy ${sim}% "${alias}"`, tier: 'P4' };
        }
      }
    }
  }
  if (best && best.tier === 'P4') return buildResult(best.def, 'P4', best.score, best.layer);

  return { field: null, score: 0, tier: null, evidenceLayers: [], status: 'unmapped' };
}
