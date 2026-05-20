/**
 * Tiny pub/sub draft store for the in-flight TradingView capture.
 * Held in memory only — once committed it lands in the existing
 * `orca-bt-v13` scopedStorage rows via BacktestDimension.
 */
import { useEffect, useState } from 'react';
import type { DraftBacktestTrade } from './tv-mapping';

type Listener = (d: DraftBacktestTrade | null) => void;

let current: DraftBacktestTrade | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn(current));
}

export const backtestDraftStore = {
  get(): DraftBacktestTrade | null {
    return current;
  },
  /** Merge into existing draft when lineId matches, otherwise replace. */
  upsert(next: DraftBacktestTrade) {
    if (current && current.lineId !== next.lineId) {
      // Different drawing — silently discard prior in-flight draft.
    }
    current = next;
    emit();
  },
  /** Mark current draft as ready and open the commit modal. */
  markReady() {
    if (!current) return;
    current = { ...current, status: 'ready_to_commit' };
    emit();
  },
  clear() {
    current = null;
    emit();
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** React hook that re-renders on draft changes. */
export function useBacktestDraft(): DraftBacktestTrade | null {
  const [draft, setDraft] = useState<DraftBacktestTrade | null>(() => backtestDraftStore.get());
  useEffect(() => backtestDraftStore.subscribe(setDraft) as unknown as () => void, []);
  return draft;
}
