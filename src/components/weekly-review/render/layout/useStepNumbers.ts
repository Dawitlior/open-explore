// Walks the visible section list in render order and returns a map
// {sectionId → step number}. Risk band and footer band are excluded so
// the numbers only mark "main" reflection prompts (matches Lior's spec).

import { useMemo } from 'react';
import type { Section } from '../../lib/wr-schema';
import { resolveBand } from './card-slots';

export function useStepNumbers(sections: Section[]): Record<string, number> {
  return useMemo(() => {
    const map: Record<string, number> = {};
    let n = 0;
    for (const s of sections) {
      if (s.hidden) continue;
      if (resolveBand(s) !== 'main') continue;
      n += 1;
      map[s.id] = n;
    }
    return map;
  }, [sections]);
}
