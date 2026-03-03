import { useState, useEffect, useCallback, useMemo } from 'react';
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

  useEffect(() => {
    getAllTrades().then(t => {
      const sanitized = sanitizeTrades(t);
      const sorted = sanitized.sort((a, b) => a.id - b.id);
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
      const filtered = trades.filter(t => t && (t.winLoss === 'Win' || t.winLoss === 'Loss' || t.winLoss === 'Break Even'));
      return computeAnalytics(filtered);
    } catch (err) {
      console.error('Stats computation error:', err);
      return computeAnalytics([]);
    }
  }, [trades]);

  const nextId = useCallback(() => {
    return trades.length > 0 ? Math.max(...trades.map(t => t.id)) + 1 : 1;
  }, [trades]);

  const recalcBalances = useCallback((tradeList: Trade[]): Trade[] => {
    const startBalance = 200;
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

  const addTrade = useCallback(async (trade: Omit<Trade, 'id' | 'balance'>) => {
    const id = nextId();
    const newTrade: Trade = { ...trade, id, balance: 0 } as Trade;
    const updated = recalcBalances([...trades, newTrade]);
    await saveTrades(updated);
    setTrades(updated);
    checkAndAlertRisk(updated);
    return updated[updated.length - 1];
  }, [trades, nextId, recalcBalances, checkAndAlertRisk]);

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
    for (let i = rebalanced.length + 1; i <= trades.length; i++) {
      await dbDelete(i);
    }
    setTrades(rebalanced);
  }, [trades, recalcBalances]);

  const importTrades = useCallback(async (newTrades: Trade[]) => {
    const sanitized = sanitizeTrades(newTrades);
    const rebalanced = recalcBalances(sanitized.map((t, i) => ({ ...t, id: i + 1 })));
    await saveTrades(rebalanced);
    setTrades(rebalanced);
  }, [recalcBalances]);

  const resetAll = useCallback(async () => {
    await clearAllData();
    setTrades([]);
  }, []);

  return { trades, stats, loading, initialized, addTrade, updateTrade, removeTrade, importTrades, resetAll, riskAlert, dismissRiskAlert };
}
