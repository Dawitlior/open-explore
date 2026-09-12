/**
 * Channel prefetch — warms the lazy chunks behind every dashboard channel
 * during browser idle time, so switching channels feels instant instead of
 * hitting a cold dynamic import each time.
 *
 * Vite dedupes by module specifier, so these imports resolve to exactly the
 * same chunks the `lazy()` calls in Index.tsx use.
 */

let started = false;

const loaders: Array<() => Promise<unknown>> = [
  () => import('@/components/dashboard/ReviewDashboard'),
  () => import('@/components/trading/CalendarHubPage'),
  () => import('@/components/trading/AdvancedAnalyticsPage'),
  () => import('@/components/trading/AdvancedRiskPage'),
  () => import('@/components/trading/ControlRoomPage'),
  () => import('@/components/trading/AdvancedPsychologyPage'),
  () => import('@/components/trading/AIInsightsPage'),
  () => import('@/components/coach/OrcaCoachPage'),
  () => import('@/components/economic/EconomicCalendarPage'),
  () => import('@/components/trading/JournalDimension'),
  () => import('@/components/trading/BacktestDimension'),
];

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

function whenIdle(cb: () => void, timeout = 1200) {
  const w = window as IdleWindow;
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout });
  else setTimeout(cb, timeout);
}

/** Sequentially warm every channel chunk, one per idle slot. */
export function warmChannelChunks() {
  if (started || typeof window === 'undefined') return;
  started = true;
  let i = 0;
  const step = () => {
    const next = loaders[i++];
    if (!next) return;
    next().catch(() => { /* offline / chunk error — harmless */ }).then(() => whenIdle(step, 400));
  };
  whenIdle(step);
}
