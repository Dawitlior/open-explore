import { supabase } from '@/integrations/supabase/client';

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
  morningImages: string[];
  eodImages: string[];
  btcThoughts: string;
  psychAnswers: PsychAnswers;
  disciplineCommitments: string[];
  disciplineConfirmed: boolean;
  sectionLocks: Record<string, boolean>;
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

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function readJournalState(): Promise<JournalState | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('journal_state')
    .select('state')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) { console.error('readJournalState', error); return null; }
  return (data?.state as unknown as JournalState | null) ?? null;
}

export async function writeJournalState(state: JournalState): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from('journal_state')
    .upsert({ user_id: uid, state: state as any }, { onConflict: 'user_id' });
  if (error) console.error('writeJournalState', error);
}
