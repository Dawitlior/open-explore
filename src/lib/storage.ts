import type { Trade } from '@/data/trades';
import { supabase } from '@/integrations/supabase/client';
import {
  getActivePortfolioIdGlobal,
  isPortfolioLockedGlobal,
} from '@/lib/active-portfolio-store';

/**
 * Stage 5 — read-only lock enforcement.
 * Locked portfolios (downgrade overflow) reject all write attempts at the
 * storage layer. UI also disables the affected buttons, but enforcing here
 * means programmatic / bridge / import paths can't bypass it either.
 */
export class PortfolioLockedError extends Error {
  code = 'PORTFOLIO_LOCKED' as const;
  constructor(public portfolioId: string) {
    super(`Portfolio ${portfolioId} is locked (read-only — upgrade plan to unlock).`);
  }
}

function assertWritable(portfolioId: string) {
  if (isPortfolioLockedGlobal(portfolioId)) {
    const err = new PortfolioLockedError(portfolioId);
    reportStorageError('portfolio-locked', err);
    throw err;
  }
}

/**
 * Cloud-backed storage. Each user only ever reads/writes their own rows
 * thanks to RLS. The exported API mirrors the previous IndexedDB-based
 * module so callers don't need to change.
 *
 * Stage 4 (Multi-Portfolio):
 *  - getAllTrades() filters by the active portfolio id when one is set.
 *  - saveTrade(s) tag every row with the active portfolio id (or a per-trade
 *    override via `__portfolio_id`).
 *  - getMaxTradeId() returns the global max trade_id across the user's
 *    portfolios — preserves the project-wide decision that trade_id stays
 *    globally unique per user.
 */

function reportStorageError(op: string, error: unknown) {
  console.error(op, error);
  if (typeof window === 'undefined') return;
  const message = (error as { message?: string })?.message || String(error);
  window.dispatchEvent(new CustomEvent('orca:storage-error', { detail: { op, message } }));
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Stage 4: when `portfolioId` is given (or an active portfolio is set globally),
 * only rows belonging to that portfolio are returned. When neither is available,
 * we deliberately return an empty array rather than leaking trades from every
 * portfolio.
 */
export async function getAllTrades(portfolioId?: string | null): Promise<Trade[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const pid = portfolioId ?? getActivePortfolioIdGlobal();
  if (!pid) {
    // No active portfolio yet — caller is mid-bootstrap. Return empty to avoid
    // briefly painting another portfolio's data into the dashboard.
    return [];
  }
  // Supabase caps each response at 1000 rows. Page through the entire set
  // so users with large histories don't silently lose trades.
  const PAGE = 1000;
  const out: Trade[] = [];
  let from = 0;
  // Hard upper bound to avoid runaway loops if something goes wrong
  for (let i = 0; i < 100; i++) {
    const { data, error } = await supabase
      .from('trades')
      .select('trade_id, data, manual_r_multiple, external_id, portfolio_id')
      .eq('user_id', uid)
      .eq('portfolio_id', pid)
      .order('trade_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) { console.error('getAllTrades', error); return out; }
    const rows = data ?? [];
    for (const r of rows) {
      const base = (r.data as unknown as Trade) || ({} as Trade);
      // Merge the column-level manual override into the trade object so the
      // centralized R engine (getR / getEffectiveR) sees Tier-1 immediately.
      const manual = r.manual_r_multiple as number | null | undefined;
      const ext = (r as { external_id?: string | null }).external_id ?? null;
      const portfolio = (r as { portfolio_id?: string | null }).portfolio_id ?? null;
      out.push({
        ...base,
        id: r.trade_id,
        ...(manual !== null && manual !== undefined ? { manual_r_multiple: manual, manualR: manual } : {}),
        ...(ext ? { __external_id: ext } : {}),
        ...(portfolio ? { __portfolio_id: portfolio } : {}),
      } as Trade);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

/**
 * Returns the highest trade_id for this user across ALL portfolios.
 * Used when generating new ids — trade_id is globally unique per user
 * (decided in master plan §9), so a freshly added trade in portfolio A
 * must not collide with an existing id in portfolio B.
 */
export async function getMaxTradeId(): Promise<number> {
  const uid = await currentUserId();
  if (!uid) return 0;
  const { data, error } = await supabase
    .from('trades')
    .select('trade_id')
    .eq('user_id', uid)
    .order('trade_id', { ascending: false })
    .limit(1);
  if (error) { console.error('getMaxTradeId', error); return 0; }
  const top = data?.[0]?.trade_id;
  return typeof top === 'number' ? top : 0;
}

/**
 * Lift `__provenance` (attached by file-import bridge / future adapters)
 * onto the row payload so Phase 2 first-class columns are populated, and
 * strip it from the `data` jsonb so the blob stays clean. Also tags the
 * row with portfolio_id (per-trade override → global active → throw).
 */
function buildRow(uid: string, t: Trade) {
  const withMeta = t as Trade & {
    __provenance?: {
      broker_id: string;
      account_label: string | null;
      source_type: 'api_sync' | 'csv_import' | 'manual';
      asset_class: string;
      external_id: string;
      opened_at: string | null;
      closed_at: string | null;
    };
    __portfolio_id?: string | null;
  };
  const prov = withMeta.__provenance;
  const portfolioId = withMeta.__portfolio_id ?? getActivePortfolioIdGlobal();
  if (!portfolioId) {
    throw new Error('[storage] cannot save trade: no active portfolio');
  }
  assertWritable(portfolioId);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __provenance, __portfolio_id, ...clean } = withMeta as Trade & Record<string, unknown>;
  const row: Record<string, unknown> = {
    user_id: uid,
    trade_id: t.id,
    portfolio_id: portfolioId,
    data: clean,
  };
  if (prov) {
    row.broker_id = prov.broker_id;
    row.account_label = prov.account_label;
    row.source_type = prov.source_type;
    row.asset_class = prov.asset_class;
    row.external_id = prov.external_id;
    row.opened_at = prov.opened_at;
    row.closed_at = prov.closed_at;
  }
  return row;
}

export async function saveTrade(trade: Trade): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from('trades')
    .upsert(buildRow(uid, trade) as never, { onConflict: 'user_id,trade_id' });
  if (error) reportStorageError('saveTrade', error);
}

export async function saveTrades(trades: Trade[]): Promise<void> {
  const uid = await currentUserId();
  if (!uid || trades.length === 0) return;
  const rows = trades.map(t => buildRow(uid, t));
  // Chunk to stay polite with payload size
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('trades')
      .upsert(slice as never, { onConflict: 'user_id,trade_id' });
    if (error) { reportStorageError('saveTrades', error); throw error; }
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
  if (error) reportStorageError('deleteTrade', error);
}

/**
 * Deletes trades from the currently active portfolio only. Other portfolios'
 * trades are preserved. The legacy callers expected a "wipe everything" but
 * post-multi-portfolio that's almost never the intent — a portfolio-scoped
 * wipe is the safe default. To delete all trades across all portfolios, use
 * `clearAllData`.
 */
export async function deleteAllTrades(): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const pid = getActivePortfolioIdGlobal();
  let q = supabase.from('trades').delete().eq('user_id', uid);
  if (pid) q = q.eq('portfolio_id', pid);
  const { error } = await q;
  if (error) reportStorageError('deleteAllTrades', error);
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
  if (error) reportStorageError('setSetting', error);
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
  const pid = getActivePortfolioIdGlobal();
  let q = supabase.from('trades').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  if (pid) q = q.eq('portfolio_id', pid);
  const { count, error } = await q;
  if (error) { console.error('getTradeCount', error); return 0; }
  return count ?? 0;
}
