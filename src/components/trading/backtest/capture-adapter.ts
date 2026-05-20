/**
 * Capture Adapter Layer
 *
 * Defines the contract between the workspace UI and any "trade capture
 * source" (manual paste/typing today, TradingView Charting Library tomorrow,
 * a paid Trading Platform later, etc.).
 *
 * To swap in a new source you only implement `CaptureAdapter` and register
 * it via `setCaptureAdapter()` — no UI changes needed.
 */

import type { DraftBacktestTrade } from './tv-mapping';

export interface CaptureAdapter {
  /** Friendly id — surfaced for diagnostics only. */
  readonly id: string;

  /**
   * Whether this adapter can auto-extract drawings from the chart.
   * Manual = false. TV Library = true. The UI uses this to decide whether
   * to show the manual paste sheet or rely on chart-driven events.
   */
  readonly autoCapture: boolean;

  /** Called once when the workspace mounts. Returns an unsubscribe fn. */
  attach(onDraft: (d: DraftBacktestTrade) => void): () => void;

  /** Imperative trigger (keyboard `c`, FAB tap, etc.). */
  requestCapture(): void;

  /** Tell the adapter which symbol the user is focused on. */
  setSymbol(symbol: string): void;
}

let active: CaptureAdapter | null = null;

export function setCaptureAdapter(adapter: CaptureAdapter) {
  active = adapter;
}
export function getCaptureAdapter(): CaptureAdapter | null {
  return active;
}

/* ────────────────────────────────────────────────────────────────────────── *
 *  Manual adapter — opens the mobile capture sheet via the draft store.
 *  When we license the TradingView Charting Library, drop in a sibling
 *  `tv-library-adapter.ts` that subscribes to `drawing_event` and emits
 *  `lineToolToDraft(...)` results to `onDraft`. That's the whole upgrade.
 * ────────────────────────────────────────────────────────────────────────── */

import { backtestDraftStore } from './backtest-draft-store';

export const manualCaptureAdapter: CaptureAdapter = {
  id: 'manual-paste',
  autoCapture: false,
  attach() {
    // Manual adapter is fully UI-driven, no chart events to wire.
    return () => {};
  },
  requestCapture() {
    backtestDraftStore.openSheet();
  },
  setSymbol(symbol: string) {
    backtestDraftStore.setSymbol(symbol);
  },
};
