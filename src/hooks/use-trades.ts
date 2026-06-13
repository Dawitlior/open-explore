import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Trade } from '@/data/trades';
import { getAllTrades, saveTrades, deleteTrade as dbDelete, clearAllData } from '@/lib/storage';
import { computeAnalytics, type TradingStats } from '@/lib/trading-analytics';
import { sanitizeTrades } from '@/lib/trade-sanitizer';
import { checkRiskLimits, type RiskLimitStatus } from '@/lib/risk-limits';
import { useUserPreferences } from '@/hooks/use-user-preferences';
import { setManualRMultiple } from '@/lib/manual-r';

export function useTrades() {
  const { prefs } = useUserPreferences();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [riskAlert, setRiskAlert] = useState<RiskLimitStatus | null>(null);
  const tradesRef = useRef<Trade[]>([]);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    tradesRef.current = trades;
  }, [trades, prefs.daily_risk_limit]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getAllTrades().then(t => {
        if (cancelled) return;
        const sanitized = sanitizeTrades(t);
        // Dedupe by unique id before committing to state — guarantees the UI
        // never shows duplicate rows even if a sync event races a local mutation.
        const seenIds = new Set<number>();
        const unique = sanitized.filter(tr => {
          if (!tr || typeof tr.id !== 'number' || seenIds.has(tr.id)) return false;
          seenIds.add(tr.id);
          return true;
        });
        const sorted = unique.sort((a, b) => a.id - b.id);
        tradesRef.current = sorted;
        setTrades(sorted);
        setLoading(false);
        setInitialized(true);
      }).catch((err) => {
        if (cancelled) return;
        console.error('Failed to load trades:', err);
        setTrades([]);
        setLoading(false);
        setInitialized(true);
      });
    };
    load();
    const onSync = () => load();
    window.addEventListener('orca:trades-synced', onSync);
    return () => { cancelled = true; window.removeEventListener('orca:trades-synced', onSync); };
  }, []);

  const stats = useMemo<TradingStats>(() => {
    try {
      if (!trades || trades.length === 0) return computeAnalytics([]);
      const filtered = trades.filter(t => t && typeof t === 'object' && typeof t.id === 'number' && (t.winLoss === 'Win' || t.winLoss === 'Loss' || t.winLoss === 'Break Even'));
      return computeAnalytics(filtered);
    } catch (err) {
      console.error('Stats computation error:', err);
      return computeAnalytics([]);
    }
  }, [trades]);

  const nextId = useCallback(() => {
    if (trades.length === 0) return 1;
    let maxId = 0;
    for (const t of trades) if (t.id > maxId) maxId = t.id;
    return maxId + 1;
  }, [trades]);

  const recalcBalances = useCallback((tradeList: Trade[]): Trade[] => {
    const hasImportedBalance = tradeList.some(t => typeof t.balance === 'number' && isFinite(t.balance) && t.balance !== 0);
    let balance = hasImportedBalance
      ? tradeList.find(t => typeof t.balance === 'number' && isFinite(t.balance) && t.balance !== 0)?.balance ?? 0
      : 0;

    return tradeList.map((t, index) => {
      const fileBalance = typeof t.balance === 'number' && isFinite(t.balance) && t.balance !== 0 ? t.balance : null;
      if (fileBalance !== null) {
        balance = fileBalance;
        return { ...t, balance: Math.round(balance * 10000) / 10000 };
      }

      if (index > 0 || !hasImportedBalance) balance += (typeof t.pnl === 'number' && isFinite(t.pnl) ? t.pnl : 0);
      return { ...t, balance: Math.round(balance * 10000) / 10000 };
    });
  }, []);

  const checkAndAlertRisk = useCallback((updatedTrades: Trade[]) => {
    try {
      const status = checkRiskLimits(updatedTrades);
      if (status.breachedLevel !== 'none') {
        setRiskAlert(status);
      }
    } catch { /* ignore */ }
  }, []);

  const dismissRiskAlert = useCallback(() => setRiskAlert(null), []);

  const enqueueTradeMutation = useCallback(<T,>(mutation: () => Promise<T>): Promise<T> => {
    const run = mutationQueueRef.current.then(mutation, mutation);
    mutationQueueRef.current = run.then(() => undefined, () => undefined);
    return run;
  }, []);

  const addTrade = useCallback(async (trade: Omit<Trade, 'id' | 'balance'>) => {
    return enqueueTradeMutation(async () => {
      const currentTrades = tradesRef.current;
      const id = currentTrades.length === 0 ? 1 : Math.max(...currentTrades.map(t => t.id || 0)) + 1;
      const newTrade: Trade = { ...trade, id, balance: 0 } as Trade;
      const updated = recalcBalances([...currentTrades, newTrade]);
      await saveTrades(updated);
      tradesRef.current = updated;
      setTrades(updated);
      checkAndAlertRisk(updated);
      return updated[updated.length - 1];
    });
  }, [enqueueTradeMutation, recalcBalances, checkAndAlertRisk]);

  const upsertJournalTrade = useCallback(async (journalTradeId: number | string, trade: Omit<Trade, 'id' | 'balance'>) => {
    return enqueueTradeMutation(async () => {
      const tag = `__JID:${journalTradeId}__`;
      const currentTrades = tradesRef.current;
      const existingIdx = currentTrades.findIndex(t => typeof t.comments === 'string' && t.comments.includes(tag));
      const cleanComments = typeof trade.comments === 'string' && trade.comments.includes(tag)
        ? trade.comments
        : `${tag} ${trade.comments || ''}`.trim();

      const updated = [...currentTrades];
      let saved: Trade;
      if (existingIdx >= 0) {
        saved = { ...updated[existingIdx], ...trade, id: updated[existingIdx].id, comments: cleanComments } as Trade;
        updated[existingIdx] = saved;
      } else {
        const id = currentTrades.length === 0 ? 1 : Math.max(...currentTrades.map(t => t.id || 0)) + 1;
        saved = { ...trade, id, balance: 0, comments: cleanComments } as Trade;
        updated.push(saved);
      }

      const rebalanced = recalcBalances(updated);
      await saveTrades(rebalanced);
      tradesRef.current = rebalanced;
      setTrades(rebalanced);
      checkAndAlertRisk(rebalanced);
      return rebalanced.find(t => t.id === saved.id) || saved;
    });
  }, [enqueueTradeMutation, recalcBalances, checkAndAlertRisk]);

  const updateTrade = useCallback(async (trade: Trade) => {
    return enqueueTradeMutation(async () => {
      const currentTrades = tradesRef.current;
      const idx = currentTrades.findIndex(t => t.id === trade.id);
      if (idx === -1) return;
      const updated = [...currentTrades];
      updated[idx] = trade;
      const rebalanced = recalcBalances(updated);
      await saveTrades(rebalanced);
      tradesRef.current = rebalanced;
      setTrades(rebalanced);
      checkAndAlertRisk(rebalanced);
    });
  }, [enqueueTradeMutation, recalcBalances, checkAndAlertRisk]);

  const removeTrade = useCallback(async (id: number) => {
    return enqueueTradeMutation(async () => {
      const currentTrades = tradesRef.current;
      // Delete only the targeted trade — preserve all other trade_ids
      // so that __JID:xxx__ links from the Journal remain intact.
      await dbDelete(id);
      const remaining = currentTrades.filter(t => t.id !== id);
      // Recalc balances but DO NOT renumber ids
      const rebalanced = recalcBalances(remaining);
      // Persist updated balances for the surviving trades
      if (rebalanced.length > 0) {
        try { await saveTrades(rebalanced); } catch (e) { console.error('removeTrade saveTrades', e); }
      }
      tradesRef.current = rebalanced;
      setTrades(rebalanced);
    });
  }, [enqueueTradeMutation, recalcBalances]);

  const importTrades = useCallback(async (newTrades: Trade[]) => {
    return enqueueTradeMutation(async () => {
      const sanitized = sanitizeTrades(newTrades);
      const existing = tradesRef.current;

      // Build a fingerprint of existing trades so we can dedupe safely:
      // an imported row that matches an existing one (date+coin+entry+exit+pnl)
      // is skipped instead of duplicated.
      const fp = (t: Trade) =>
        [String(t.date || ''), String(t.coin || '').toUpperCase(), String(t.entry ?? ''), String(t.exit ?? ''), String(t.pnl ?? '')].join('|');
      const seen = new Set(existing.map(fp));

      let nextId = existing.length === 0 ? 1 : Math.max(...existing.map(t => t.id || 0)) + 1;
      const additions: Trade[] = [];
      for (const raw of sanitized) {
        const key = fp(raw as Trade);
        if (seen.has(key)) continue;
        seen.add(key);
        additions.push({ ...(raw as Trade), id: nextId++ });
      }

      if (additions.length === 0) {
        // Nothing new to merge — keep dataset as-is.
        return;
      }

      // Sort the combined set chronologically by date (oldest → newest),
      // then renumber ids so the trade list reflects true chronology
      // instead of pushing imports to the top.
      const combined = [...existing, ...additions].sort((a, b) => {
        const da = new Date(String(a.date || '').replace(' ', 'T')).getTime() || 0;
        const db = new Date(String(b.date || '').replace(' ', 'T')).getTime() || 0;
        return da - db;
      }).map((t, i) => ({ ...t, id: i + 1 }));

      const rebalanced = recalcBalances(combined);
      try {
        await saveTrades(rebalanced);
        tradesRef.current = rebalanced;
        setTrades(rebalanced);
        checkAndAlertRisk(rebalanced);
      } catch (err) {
        console.error('importTrades failed (merge mode)', err);
        throw err;
      }
    });
  }, [enqueueTradeMutation, recalcBalances, checkAndAlertRisk]);

  const resetAll = useCallback(async () => {
    await clearAllData();
    tradesRef.current = [];
    setTrades([]);
  }, []);

  /**
   * Persist a Tier-1 manual R-Multiple override on the trades row column.
   * Mirrors it into local state instantly so every memoized chart that reads
   * `getEffectiveR(trade)` recomputes in the same React commit — no reload.
   * Pass `null` to clear the override.
   */
  const setManualR = useCallback(async (tradeId: number, value: number | null) => {
    return enqueueTradeMutation(async () => {
      const current = tradesRef.current;
      const idx = current.findIndex(t => t.id === tradeId);
      if (idx === -1) return;
      const next = [...current];
      next[idx] = {
        ...current[idx],
        manual_r_multiple: value,
        manualR: value,
      } as Trade;
      tradesRef.current = next;
      setTrades(next);
      try {
        await setManualRMultiple(tradeId, value);
      } catch (err) {
        console.error('setManualR', err);
        // roll back on failure
        tradesRef.current = current;
        setTrades(current);
        throw err;
      }
    });
  }, [enqueueTradeMutation]);

  return { trades, stats, loading, initialized, addTrade, updateTrade, upsertJournalTrade, removeTrade, importTrades, resetAll, riskAlert, dismissRiskAlert, setManualR };
}
