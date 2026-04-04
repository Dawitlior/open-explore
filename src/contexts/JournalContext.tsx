import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// ─── Types ───
export interface AssetBias {
  asset: string;
  bias: string;
}

export interface PsychVitals {
  sleep: boolean;
  pressure: boolean;
  excitement: boolean;
  recovery: boolean;
}

export interface MorningData {
  chartImage: string | null;
  assetMatrix: AssetBias[];
  freeWriting: string;
  bitcoinThoughts: string;
  emotion: string[];
  vitals: PsychVitals;
  fearGreed: number;
  checklist: boolean[];
  locked: boolean;
  timestamp: string;
}

export interface EveningData {
  finalChartImage: string | null;
  forensicLessons: string;
  biasAccuracy: string;
  rulesFollowed: boolean;
  executionTags: Record<number, { execution: string; exit: string; deviation: string }>;
  completed: boolean;
  timestamp: string;
}

export interface TradingDay {
  date: string; // YYYY-MM-DD
  morning: MorningData | null;
  evening: EveningData | null;
}

interface JournalContextType {
  currentDay: TradingDay;
  allDays: TradingDay[];
  saveMorning: (data: MorningData) => Promise<void>;
  saveEvening: (data: EveningData) => Promise<void>;
  loadDay: (date: string) => Promise<TradingDay>;
  isMorningLocked: boolean;
  isEveningComplete: boolean;
}

const JournalContext = createContext<JournalContextType | null>(null);

// ─── IndexedDB for Journal ───
const DB_NAME = 'orca-trading-os';
const DB_VERSION = 3;
const STORE = 'journal';

function openJournalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('trades')) db.createObjectStore('trades', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'date' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getDay(date: string): Promise<TradingDay | null> {
  const db = await openJournalDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(date);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function putDay(day: TradingDay): Promise<void> {
  const db = await openJournalDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(day);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllDays(): Promise<TradingDay[]> {
  const db = await openJournalDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDay(date: string): TradingDay {
  return { date, morning: null, evening: null };
}

// ─── Provider ───
export function JournalProvider({ children }: { children: ReactNode }) {
  const [currentDay, setCurrentDay] = useState<TradingDay>(emptyDay(todayKey()));
  const [allDays, setAllDays] = useState<TradingDay[]>([]);

  useEffect(() => {
    (async () => {
      const today = todayKey();
      const [day, days] = await Promise.all([getDay(today), getAllDays()]);
      setCurrentDay(day || emptyDay(today));
      setAllDays(days.sort((a, b) => b.date.localeCompare(a.date)));
    })();
  }, []);

  const saveMorning = useCallback(async (data: MorningData) => {
    const updated = { ...currentDay, morning: data };
    await putDay(updated);
    setCurrentDay(updated);
    setAllDays(prev => {
      const idx = prev.findIndex(d => d.date === updated.date);
      if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
      return [updated, ...prev];
    });
  }, [currentDay]);

  const saveEvening = useCallback(async (data: EveningData) => {
    const updated = { ...currentDay, evening: data };
    await putDay(updated);
    setCurrentDay(updated);
    setAllDays(prev => {
      const idx = prev.findIndex(d => d.date === updated.date);
      if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
      return [updated, ...prev];
    });
  }, [currentDay]);

  const loadDay = useCallback(async (date: string): Promise<TradingDay> => {
    const day = await getDay(date);
    return day || emptyDay(date);
  }, []);

  const isMorningLocked = currentDay.morning?.locked ?? false;
  const isEveningComplete = currentDay.evening?.completed ?? false;

  return (
    <JournalContext.Provider value={{ currentDay, allDays, saveMorning, saveEvening, loadDay, isMorningLocked, isEveningComplete }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error('useJournal must be used within JournalProvider');
  return ctx;
}
