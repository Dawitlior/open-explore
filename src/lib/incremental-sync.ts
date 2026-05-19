/**
 * incremental-sync — Invisible pipeline that appends a single closed Bybit
 * trade to the journal as soon as the WS reports a position close.
 * Never wipes existing data — relies on the (user_id, exchange_exec_id)
 * unique index for idempotency.
 */

import { supabase } from '@/integrations/supabase/client';
import { showSyncToast } from '@/components/live/PremiumSyncToast';

export interface IncrementalSyncResult {
  ok: boolean;
  added?: number;
  rows?: Array<{ symbol: string; pnl: number }>;
  error?: string;
}

export async function triggerIncrementalSync(
  symbol: string,
  sinceMs: number,
): Promise<IncrementalSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-futures-trades', {
      body: { mode: 'incremental', provider: 'bybit', symbol, since: sinceMs },
    });
    if (error) return { ok: false, error: error.message };
    const result = (data ?? {}) as IncrementalSyncResult;
    if (result.ok && (result.added ?? 0) > 0) {
      window.dispatchEvent(new CustomEvent('orca:trades-synced', { detail: result }));
      const first = result.rows?.[0];
      showSyncToast({
        symbol: first?.symbol ?? symbol,
        pnl: first?.pnl ?? 0,
        added: result.added ?? 0,
      });
    }
    return result;
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'invoke_failed' };
  }
}
