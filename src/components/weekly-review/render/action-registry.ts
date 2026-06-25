// Wave-2 Item 5 — action deep-link registry.
//
// Mirrors the `systemSlots` pattern: the renderer stays host-agnostic and
// only knows that a checklist item may carry an `action`. The host
// (WeeklyTab) supplies a registry mapping action targets to handlers.
//
// Contract:
//   • A missing registry entry degrades gracefully — the affordance is
//     hidden and the checklist row behaves as a plain checkbox.
//   • Handlers are pure side-effects (navigation, panel open). The
//     renderer never inspects their return value.

import type { ChecklistItem } from '../lib/wr-schema';

export type ActionRef = NonNullable<ChecklistItem['action']>;

/** Registry of target → handler. Keyed by `action.target`. */
export type ActionRegistry = Record<string, (action: ActionRef) => void>;

/** Safe invoker — no-ops on missing registry / missing entry. */
export function invokeAction(action: ActionRef | undefined, registry: ActionRegistry | undefined): boolean {
  if (!action || !registry) return false;
  const handler = registry[action.target];
  if (!handler) return false;
  handler(action);
  return true;
}

/**
 * Default registry shim — dispatches a `CustomEvent('orca:wr-action', { detail })`
 * on window so host pages can listen without renderer/WeeklyTab knowing
 * route specifics. Safe fallback: if no listener attaches, nothing breaks.
 */
export function createDefaultActionRegistry(): ActionRegistry {
  const dispatch = (action: ActionRef) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('orca:wr-action', { detail: action }));
  };
  return {
    'statistical-trade-log': dispatch,
    'weekly-calendar': dispatch,
    'market-journal': dispatch,
  };
}
