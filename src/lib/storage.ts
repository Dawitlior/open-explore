import type { Trade } from '@/data/trades';
import { supabase } from '@/integrations/supabase/client';

/**
 * Cloud-backed storage. Each user only ever reads/writes their own rows
 * thanks to RLS. The exported API mirrors the previous IndexedDB-based
 * module so callers don't need to change.
 */

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getAllTrades(): Promise<Trade[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from('trades')
    .select('trade_id, data')
    .eq('user_id', uid)
    .order('trade_id', { ascending: true });
  if (error) { console.error('getAllTrades', error); return []; }
  return (data ?? []).map(r => ({ ...(r.data as unknown as Trade), id: r.trade_id }));
}

export async function saveTrade(trade: Trade): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from('trades')
    .upsert({ user_id: uid, trade_id: trade.id, data: trade as any }, { onConflict: 'user_id,trade_id' });
  if (error) console.error('saveTrade', error);
}

export async function saveTrades(trades: Trade[]): Promise<void> {
  const uid = await currentUserId();
  if (!uid || trades.length === 0) return;
  const rows = trades.map(t => ({
    user_id: uid,
    trade_id: t.id,
    data: t as any,
  }));
  // Chunk to stay polite with payload size
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('trades')
      .upsert(slice, { onConflict: 'user_id,trade_id' });
    if (error) { console.error('saveTrades', error); return; }
  }
}

export async function deleteTrade(id: number): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('user_id', uid)
    .eq('trade_id', id);
  if (error) console.error('deleteTrade', error);
}

export async function deleteAllTrades(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from('trades').delete().eq('user_id', uid);
  if (error) console.error('deleteAllTrades', error);
}

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const uid = await currentUserId();
  if (!uid) return undefined;
  const { data, error } = await supabase
    .from('user_settings')
    .select('value')
    .eq('user_id', uid)
    .eq('key', key)
    .maybeSingle();
  if (error) { console.error('getSetting', error); return undefined; }
  return (data?.value as unknown as T | undefined);
}

export async function setSetting<T = unknown>(key: string, value: T): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: uid, key, value: value as any }, { onConflict: 'user_id,key' });
  if (error) console.error('setSetting', error);
}

export async function clearAllData(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  await Promise.all([
    supabase.from('trades').delete().eq('user_id', uid),
    supabase.from('user_settings').delete().eq('user_id', uid),
    supabase.from('journal_state').delete().eq('user_id', uid),
  ]);
}

export async function getTradeCount(): Promise<number> {
  const uid = await currentUserId();
  if (!uid) return 0;
  const { count, error } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', uid);
  if (error) { console.error('getTradeCount', error); return 0; }
  return count ?? 0;
}
