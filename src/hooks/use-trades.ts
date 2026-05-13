import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Trade } from '@/data/trades';
import { getAllTrades, saveTrades, deleteTrade as dbDelete, clearAllData } from '@/lib/storage';
import { computeAnalytics, type TradingStats } from '@/lib/trading-analytics';
import { sanitizeTrades } from '@/lib/trade-sanitizer';
import { checkRiskLimits, type RiskLimitStatus } from '@/lib/risk-limits';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [riskAlert, setRiskAlert] = useState<RiskLimitStatus | null>(null);
  const tradesRef = useRef<Trade[]>([]);
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  useEffect(() => {
    getAllTrades().then(t => {
      const sanitized = sanitizeTrades(t);
      const sorted = sanitized.sort((a, b) => a.id - b.id);
      tradesRef.current = sorted;
      setTrades(sorted);
      setLoading(false);
      setInitialized(true);
    }).catch((err) => {
      console.error('Failed to load trades:', err);
      setTrades([]);
      setLoading(false);
      setInitialized(true);
    });
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
    const startBalance = 0;
    let balance = startBalance;
    return tradeList.map(t => {
      balance += (typeof t.pnl === 'number' && isFinite(t.pnl) ? t.pnl : 0);
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
      const rebalanced = recalcBalances(sanitized.map((t, i) => ({ ...t, id: i + 1 })));
      const previous = tradesRef.current;
      const { deleteAllTrades } = await import('@/lib/storage');
      try {
        await deleteAllTrades();
        await saveTrades(rebalanced);
        tradesRef.current = rebalanced;
        setTrades(rebalanced);
      } catch (err) {
        console.error('importTrades failed, attempting rollback', err);
        // Best-effort rollback to the prior dataset
        try {
          await deleteAllTrades();
          if (previous.length > 0) await saveTrades(previous);
          tradesRef.current = previous;
          setTrades(previous);
        } catch (rollbackErr) {
          console.error('importTrades rollback also failed', rollbackErr);
        }
        throw err;
      }
    });
  }, [enqueueTradeMutation, recalcBalances]);

  const resetAll = useCallback(async () => {
    await clearAllData();
    tradesRef.current = [];
    setTrades([]);
  }, []);

  return { trades, stats, loading, initialized, addTrade, updateTrade, upsertJournalTrade, removeTrade, importTrades, resetAll, riskAlert, dismissRiskAlert };
}
