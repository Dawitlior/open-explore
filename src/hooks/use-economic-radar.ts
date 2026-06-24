import { useEffect, useRef, useState } from 'react';
import { useEconomicEvents } from './use-economic-events';
import type { EconomicEvent } from '@/lib/economic';

export type RadarPhase = 't-5min' | 't-1min' | 'live';

export interface RadarAlert {
  event: EconomicEvent;
  phase: RadarPhase;
  firedAt: number;
}

/**
 * Schedules countdown alerts for Tier-1 events at T-5min, T-1min, and release.
 * Uses setTimeout (not setInterval). Does not reschedule on tab focus, so it
 * cannot visually refresh the app when users return to a backgrounded tab.
 */
export function useEconomicRadar(enabled = true) {
  const { events } = useEconomicEvents({ hoursAhead: 6, impacts: ['t1'], enabled });
  const [active, setActive] = useState<RadarAlert | null>(null);
  const timers = useRef<number[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }

  function fire(event: EconomicEvent, phase: RadarPhase) {
    const key = `${event.id}:${phase}`;
    if (firedRef.current.has(key)) return;
    firedRef.current.add(key);
    setActive({ event, phase, firedAt: Date.now() });
  }

  function schedule() {
    clearTimers();
    if (!enabled) return;
    const now = Date.now();
    for (const ev of events) {
      const releaseMs = new Date(ev.release_at).getTime();
      const phases: Array<[RadarPhase, number]> = [
        ['t-5min', releaseMs - 5 * 60_000],
        ['t-1min', releaseMs - 60_000],
        ['live', releaseMs],
      ];
      for (const [phase, t] of phases) {
        const delay = t - now;
        if (delay > 0 && delay < 6 * 60 * 60_000) {
          const id = window.setTimeout(() => fire(ev, phase), delay);
          timers.current.push(id);
        } else if (delay <= 0 && delay > -90_000) {
          // Within the last 90s — fire immediately (e.g. on tab wake)
          fire(ev, phase);
        }
      }
    }
  }

  useEffect(() => {
    schedule();
    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.map((e) => e.id + e.release_at).join(','), enabled]);

  const dismiss = () => setActive(null);
  return { active, dismiss };
}
