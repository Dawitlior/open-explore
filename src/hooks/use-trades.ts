import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Trade } from '@/data/trades';
import { getAllTrades, saveTrade, saveTrades, deleteTrade as dbDelete, clearAllData } from '@/lib/storage';
import { computeAnalytics, type TradingStats } from '@/lib/trading-analytics';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getAllTrades().then(t => {
      const sorted = t.sort((a, b) => a.id - b.id);
      setTrades(sorted);
      setLoading(false);
      setInitialized(true);
    }).catch(() => { setLoading(false); setInitialized(true); });
  }, []);

  const stats = useMemo<TradingStats>(() => {
    const filtered = trades.filter(t => t.winLoss === 'Win' || t.winLoss === 'Loss' || t.winLoss === 'Break Even');
    return computeAnalytics(filtered);
  }, [trades]);

  const nextId = useCallback(() => {
    return trades.length > 0 ? Math.max(...trades.map(t => t.id)) + 1 : 1;
  }, [trades]);

  const recalcBalances = useCallback((tradeList: Trade[]): Trade[] => {
    const startBalance = 200;
    let balance = startBalance;
    return tradeList.map(t => {
      balance += t.pnl;
      return { ...t, balance: Math.round(balance * 10000) / 10000 };
    });
  }, []);

  const addTrade = useCallback(async (trade: Omit<Trade, 'id' | 'balance'>) => {
    const id = nextId();
    const newTrade: Trade = { ...trade, id, balance: 0 } as Trade;
    const updated = recalcBalances([...trades, newTrade]);
    await saveTrades(updated);
    setTrades(updated);
    return updated[updated.length - 1];
  }, [trades, nextId, recalcBalances]);

  const updateTrade = useCallback(async (trade: Trade) => {
    const idx = trades.findIndex(t => t.id === trade.id);
    if (idx === -1) return;
    const updated = [...trades];
    updated[idx] = trade;
    const rebalanced = recalcBalances(updated);
    await saveTrades(rebalanced);
    setTrades(rebalanced);
  }, [trades, recalcBalances]);

  const removeTrade = useCallback(async (id: number) => {
    await dbDelete(id);
    const remaining = trades.filter(t => t.id !== id);
    const rebalanced = recalcBalances(remaining.map((t, i) => ({ ...t, id: i + 1 })));
    await saveTrades(rebalanced);
    // Clear old IDs beyond new length
    for (let i = rebalanced.length + 1; i <= trades.length; i++) {
      await dbDelete(i);
    }
    setTrades(rebalanced);
  }, [trades, recalcBalances]);

  const importTrades = useCallback(async (newTrades: Trade[]) => {
    const rebalanced = recalcBalances(newTrades.map((t, i) => ({ ...t, id: i + 1 })));
    await saveTrades(rebalanced);
    setTrades(rebalanced);
  }, [recalcBalances]);

  const resetAll = useCallback(async () => {
    await clearAllData();
    setTrades([]);
  }, []);

  return { trades, stats, loading, initialized, addTrade, updateTrade, removeTrade, importTrades, resetAll };
}
