// Journal dimension storage — isolated from Orca trades
const DB_NAME = 'apex-journal-os';
const DB_VERSION = 1;
const STORE = 'journal';

function openJournalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface PsychAnswers {
  sleepWell: boolean | null;
  feelingPressure: boolean | null;
  seekingExcitement: boolean | null;
  recoveringLosses: boolean | null;
}

export interface JournalDay {
  id: string;
  date: string;
  dayNum: string;
  weekNum: string;
  lang: string;
  morningSaved: boolean;
  mood: string;
  plan: string;
  tasks: { label: string; done: boolean }[];
  goals: { label: string; done: boolean }[];
  bias: string;
  mktStruct: string;
  mentalTags: string[];
  btcNote: string;
  t3Note: string;
  domNote: string;
  macroNote: string;
  levels: string;
  setups: string;
  emotionScore: number;
  fearGreed: string;
  eodSaved: boolean;
  hasOpen: boolean | null;
  posNote: string;
  trades: JournalTrade[];
  actualMove: string;
  dayScore: number;
  wins: string;
  lessons: string;
  mistakes: string;
  solutions: string;
  closing: string;
  // New fields
  morningImages: string[];
  eodImages: string[];
  btcThoughts: string;
  psychAnswers: PsychAnswers;
  disciplineCommitments: string[];
  disciplineConfirmed: boolean;
  sectionLocks: Record<string, boolean>;
  // Auto-sync metadata: true if this day was created automatically from
  // an Orca trade import rather than by the user filling morning/EOD.
  // When true, user can click "Unlock" to retroactively edit it.
  autoSynced?: boolean;
}

export interface JournalTrade {
  id: number;
  pair: string;
  side: string;
  entry: string;
  exit: string;
  size: string;
  pnl: string;
  rr: string;
  notes: string;
}

export interface JournalState {
  days: JournalDay[];
  activeDayId: string | null;
  lang: string;
}

export async function readJournalState(): Promise<JournalState | null> {
  try {
    const db = await openJournalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.get('state');
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

export async function writeJournalState(state: JournalState): Promise<void> {
  try {
    const db = await openJournalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.put({ key: 'state', value: state });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}
