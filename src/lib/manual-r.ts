import { supabase } from '@/integrations/supabase/client';

/**
 * Manual R-Multiple override.
 *
 * Writes a user-supplied R value directly to the `manual_r_multiple` column
 * on the `trades` row (separate from the JSONB `data` blob). When set, this
 * value becomes Tier-1 in the R hierarchy and bypasses all math/proxy logic
 * inside `getR` / `getEffectiveR`.
 *
 * Passing `null` clears the override and lets the engine fall back to the
 * computed value again.
 */
export async function setManualRMultiple(tradeId: number, value: number | null): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('not authenticated');
  const { error } = await supabase
    .from('trades')
    .update({ manual_r_multiple: value })
    .eq('user_id', u.user.id)
    .eq('trade_id', tradeId);
  if (error) throw error;
}
