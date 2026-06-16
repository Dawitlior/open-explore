/**
 * useKillSwitch — manual "lock new entries" toggle.
 *
 * Backed by per-user scoped IndexedDB via getSetting/setSetting (same pattern as
 * useRiskLimits). State: { until: ISO string | null }.
 * - TradeForm reads `isLocked` to block submit.
 * - Risk page exposes engage/release controls (release requires typed UNLOCK).
 * - Re-checks every 30s to auto-release when `until` passes.
 */
import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

const KEY = 'killSwitch';

export interface KillSwitchState {
  until: string | null; // ISO timestamp or null
  engagedAt: string | null;
}

const EMPTY: KillSwitchState = { until: null, engagedAt: null };

export function useKillSwitch() {
  const [state, setState] = useState<KillSwitchState>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    let alive = true;
    getSetting<KillSwitchState>(KEY).then(s => {
      if (!alive) return;
      setState(s && typeof s === 'object' ? { until: s.until ?? null, engagedAt: s.engagedAt ?? null } : EMPTY);
      setLoaded(true);
    });
    // Periodic re-render so "time remaining" countdown + auto-release work.
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const now = Date.now();
  const untilMs = state.until ? Date.parse(state.until) : 0;
  const isLocked = !!state.until && untilMs > now;
  const msRemaining = isLocked ? untilMs - now : 0;

  const engage = useCallback((hours: number) => {
    const until = new Date(Date.now() + Math.max(0.25, hours) * 3_600_000).toISOString();
    const next: KillSwitchState = { until, engagedAt: new Date().toISOString() };
    setState(next);
    void setSetting(KEY, next);
  }, []);

  const release = useCallback(() => {
    setState(EMPTY);
    void setSetting(KEY, EMPTY);
  }, []);

  return { state, isLocked, msRemaining, engage, release, loaded };
}

export function formatKillRemaining(ms: number, isRTL: boolean): string {
  if (ms <= 0) return isRTL ? '—' : '—';
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return isRTL ? `${totalMin} דק׳` : `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return isRTL ? `${h}ש׳ ${m}ד׳` : `${h}h ${m}m`;
}
