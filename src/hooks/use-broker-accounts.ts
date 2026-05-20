/**
 * useBrokerAccounts — distinct (broker_id, account_label) combinations the
 * current user has data for. Powers the Accounts summary strip in the
 * Exchanges panel and (soon) per-account filters across the app.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface BrokerAccount {
  broker_id: string;
  account_label: string | null;
  trade_count: number;
}

export function useBrokerAccounts(): {
  accounts: BrokerAccount[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BrokerAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Pull only the three discriminating columns; cap at 5k rows (we just need
    // the distinct combos, not every trade).
    const { data, error } = await supabase
      .from("trades")
      .select("broker_id, account_label")
      .eq("user_id", user.id)
      .limit(5000);
    if (error) {
      console.error("useBrokerAccounts", error);
      setAccounts([]);
      setLoading(false);
      return;
    }
    const counts = new Map<string, BrokerAccount>();
    for (const r of data ?? []) {
      const brokerId = (r.broker_id as string | null) ?? "manual";
      const label = (r.account_label as string | null) ?? null;
      const key = `${brokerId}::${label ?? ""}`;
      const prev = counts.get(key);
      if (prev) prev.trade_count += 1;
      else counts.set(key, { broker_id: brokerId, account_label: label, trade_count: 1 });
    }
    setAccounts(
      [...counts.values()].sort(
        (a, b) =>
          a.broker_id.localeCompare(b.broker_id) ||
          (a.account_label ?? "").localeCompare(b.account_label ?? ""),
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener("orca:trades-synced", handler);
    return () => window.removeEventListener("orca:trades-synced", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { accounts, loading, refresh };
}
