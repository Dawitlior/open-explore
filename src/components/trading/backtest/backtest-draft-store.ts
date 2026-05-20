/**
 * Tiny pub/sub draft store for the in-flight TradingView capture.
 * Held in memory only — once committed it lands in the existing
 * `orca-bt-v13` scopedStorage rows via BacktestDimension.
 *
 * Also tracks UI-only state (sheet open/closed, locked symbol) so the
 * mobile capture flow can be triggered from anywhere via keyboard or
 * imperative API without prop-drilling.
 */
import { useEffect, useState } from 'react';
import type { DraftBacktestTrade } from './tv-mapping';

interface State {
  draft: DraftBacktestTrade | null;
  sheetOpen: boolean;
  symbol: string;
}

type Listener = (s: State) => void;

const state: State = {
  draft: null,
  sheetOpen: false,
  symbol: 'BINANCE:BTCUSDT',
};
const listeners = new Set<Listener>();

function emit() {
  const snap = { ...state };
  listeners.forEach((fn) => fn(snap));
}

export const backtestDraftStore = {
  get(): State {
    return { ...state };
  },
  /** Merge into existing draft when lineId matches, otherwise replace. */
  upsert(next: DraftBacktestTrade) {
    state.draft = next;
    emit();
  },
  /** Mark current draft as ready and open the commit modal. */
  markReady() {
    if (!state.draft) return;
    state.draft = { ...state.draft, status: 'ready_to_commit' };
    emit();
  },
  clear() {
    state.draft = null;
    emit();
  },
  openSheet() {
    state.sheetOpen = true;
    emit();
  },
  closeSheet() {
    state.sheetOpen = false;
    emit();
  },
  setSymbol(s: string) {
    if (!s || s === state.symbol) return;
    state.symbol = s;
    emit();
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** React hook — re-renders on any store change. */
export function useBacktestStore(): State {
  const [s, setS] = useState<State>(() => backtestDraftStore.get());
  useEffect(() => backtestDraftStore.subscribe(setS) as unknown as () => void, []);
  return s;
}

/** Back-compat: legacy hook used by CommitBacktestModal. */
export function useBacktestDraft(): DraftBacktestTrade | null {
  return useBacktestStore().draft;
}
