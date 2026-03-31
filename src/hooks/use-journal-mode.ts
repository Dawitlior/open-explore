import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

export type Dimension = 'orca' | 'journal';

export interface MorningRitual {
  date: string;
  mood: number; // 1-5
  energy: number; // 1-10
  intention: string;
  marketSentiment: number; // 0-100 (fear to greed)
  completed: boolean;
  timestamp: number;
}

export interface EODReview {
  date: string;
  debrief: string;
  lessonsLearned: string;
  tiltLevel: number; // 1-5
  emotionalState: string;
  completed: boolean;
  timestamp: number;
}

export function useJournalMode() {
  const [dimension, setDimensionState] = useState<Dimension>('orca');
  const [transitioning, setTransitioning] = useState(false);
  const [morningRituals, setMorningRituals] = useState<MorningRitual[]>([]);
  const [eodReviews, setEODReviews] = useState<EODReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting<Dimension>('dimension'),
      getSetting<MorningRitual[]>('morningRituals'),
      getSetting<EODReview[]>('eodReviews'),
    ]).then(([d, mr, eod]) => {
      if (d) setDimensionState(d);
      if (mr) setMorningRituals(mr);
      if (eod) setEODReviews(eod);
      setLoaded(true);
    });
  }, []);

  const switchDimension = useCallback((target?: Dimension) => {
    const next = target || (dimension === 'orca' ? 'journal' : 'orca');
    setTransitioning(true);
    // The actual switch happens after the animation
    setTimeout(() => {
      setDimensionState(next);
      setSetting('dimension', next);
      setTimeout(() => setTransitioning(false), 800);
    }, 600);
  }, [dimension]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const todayMorning = morningRituals.find(r => r.date === todayKey);
  const todayEOD = eodReviews.find(r => r.date === todayKey);

  const saveMorningRitual = useCallback(async (ritual: Omit<MorningRitual, 'date' | 'timestamp' | 'completed'>) => {
    const full: MorningRitual = { ...ritual, date: todayKey, timestamp: Date.now(), completed: true };
    const updated = [...morningRituals.filter(r => r.date !== todayKey), full];
    setMorningRituals(updated);
    await setSetting('morningRituals', updated);
    return full;
  }, [morningRituals, todayKey]);

  const saveEODReview = useCallback(async (review: Omit<EODReview, 'date' | 'timestamp' | 'completed'>) => {
    const full: EODReview = { ...review, date: todayKey, timestamp: Date.now(), completed: true };
    const updated = [...eodReviews.filter(r => r.date !== todayKey), full];
    setEODReviews(updated);
    await setSetting('eodReviews', updated);
    return full;
  }, [eodReviews, todayKey]);

  // Time-based nudging
  const hour = new Date().getHours();
  const nudgeType: 'morning' | 'evening' | 'trading' | null = 
    (hour >= 7 && hour < 10 && !todayMorning) ? 'morning' :
    (hour >= 18 && hour < 21 && !todayEOD) ? 'evening' :
    null;

  return {
    dimension,
    isJournalMode: dimension === 'journal',
    transitioning,
    switchDimension,
    morningRituals,
    eodReviews,
    todayMorning,
    todayEOD,
    saveMorningRitual,
    saveEODReview,
    nudgeType,
    loaded,
  };
}
