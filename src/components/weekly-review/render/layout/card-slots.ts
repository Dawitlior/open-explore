// Phase "Plan 1" — Card slot map.
//
// Single source of truth for which "band" a section renders into on the
// Reflection Board (risk / main / footer), plus optional priority for
// stable ordering inside its band. Span is still derived from
// `layout-span.ts` so block-level overrides keep working.
//
// Sections not listed here default to `main`.

import type { Section } from '../../lib/wr-schema';

export type ReflectionBand = 'risk' | 'main' | 'footer';

export interface CardSlot {
  band: ReflectionBand;
  /** Lower number = earlier within its band. Falls back to section.order. */
  priority?: number;
}

/** Stable per-section-ID assignments. */
export const CARD_SLOTS: Record<string, CardSlot> = {
  // ── Risk band ──────────────────────────────────────────────────────
  risk: { band: 'risk', priority: 10 },

  // ── Footer band (close-out, system) ────────────────────────────────
  decision: { band: 'footer', priority: 10 },
  grade:    { band: 'footer', priority: 20 },
  insights: { band: 'footer', priority: 30 },
};

export function resolveBand(section: Section): ReflectionBand {
  return CARD_SLOTS[section.id]?.band ?? 'main';
}

export function resolveBandPriority(section: Section): number {
  return CARD_SLOTS[section.id]?.priority ?? section.order;
}

export function groupSectionsByBand(sections: Section[]): Record<ReflectionBand, Section[]> {
  const out: Record<ReflectionBand, Section[]> = { risk: [], main: [], footer: [] };
  for (const s of sections) out[resolveBand(s)].push(s);
  for (const b of Object.keys(out) as ReflectionBand[]) {
    out[b].sort((a, b2) => resolveBandPriority(a) - resolveBandPriority(b2));
  }
  return out;
}
