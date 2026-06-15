import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Trade } from '@/data/trades';
import { getAllTrades, saveTrades, deleteTrade as dbDelete, clearAllData, getMaxTradeId } from '@/lib/storage';
import { getActivePortfolioIdGlobal } from '@/lib/active-portfolio-store';
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
      setLoading(true);
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
    const onPortfolioChanged = () => load();
    window.addEventListener('orca:trades-synced', onSync);
    window.addEventListener('orca:active-portfolio-changed', onPortfolioChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('orca:trades-synced', onSync);
      window.removeEventListener('orca:active-portfolio-changed', onPortfolioChanged);
    };
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

  /**
   * Compute the next global trade_id. trade_id is unique per (user_id, trade_id)
   * across ALL portfolios, so when running in a multi-portfolio session we
   * must include trades that live outside the current view. Falls back to the
   * local max if the DB query fails.
   */
  const nextGlobalId = useCallback(async (): Promise<number> => {
    const localMax = tradesRef.current.reduce((m, t) => (t.id > m ? t.id : m), 0);
    try {
      const globalMax = await getMaxTradeId();
      return Math.max(localMax, globalMax) + 1;
    } catch {
      return localMax + 1;
    }
  }, []);

  const addTrade = useCallback(async (trade: Omit<Trade, 'id' | 'balance'>) => {
    return enqueueTradeMutation(async () => {
      const currentTrades = tradesRef.current;
      const id = await nextGlobalId();
      const pid = getActivePortfolioIdGlobal();
      const newTrade: Trade = { ...trade, id, balance: 0, ...(pid ? { __portfolio_id: pid } : {}) } as Trade;
      const updated = recalcBalances([...currentTrades, newTrade]);
      await saveTrades(updated);
      tradesRef.current = updated;
      setTrades(updated);
      checkAndAlertRisk(updated);
      return updated[updated.length - 1];
    });
  }, [enqueueTradeMutation, recalcBalances, checkAndAlertRisk, nextGlobalId]);

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
        const id = await nextGlobalId();
        const pid = getActivePortfolioIdGlobal();
        saved = { ...trade, id, balance: 0, comments: cleanComments, ...(pid ? { __portfolio_id: pid } : {}) } as Trade;
        updated.push(saved);
      }

      const rebalanced = recalcBalances(updated);
      await saveTrades(rebalanced);
      tradesRef.current = rebalanced;
      setTrades(rebalanced);
      checkAndAlertRisk(rebalanced);
      return rebalanced.find(t => t.id === saved.id) || saved;
    });
  }, [enqueueTradeMutation, recalcBalances, checkAndAlertRisk, nextGlobalId]);

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

      // Idempotency layer 1 (strong): per-broker external_id.
      // If a new trade carries `__provenance.external_id` AND that id already
      // exists in the journal, it's the SAME trade re-imported — skip it,
      // never duplicate. This works even when the user edited the cell values
      // (date format / pnl rounding) between imports.
      const existingExtIds = new Set(
        existing
          .map((t) => (t as Trade & { __external_id?: string | null }).__external_id)
          .filter((x): x is string => !!x),
      );

      // Idempotency layer 2 (legacy fallback): fingerprint by date+coin+entry+exit+pnl.
      // Used only when the incoming row has no external_id (e.g. manual rows).
      const fp = (t: Trade) =>
        [String(t.date || ''), String(t.coin || '').toUpperCase(), String(t.entry ?? ''), String(t.exit ?? ''), String(t.pnl ?? '')].join('|');
      const seenFp = new Set(existing.map(fp));
      const seenExt = new Set<string>();

      let nextId = existing.length === 0 ? 1 : Math.max(...existing.map(t => t.id || 0)) + 1;
      const additions: Trade[] = [];
      for (const raw of sanitized) {
        const incoming = raw as Trade & { __provenance?: { external_id?: string } };
        const ext = incoming.__provenance?.external_id;
        if (ext) {
          if (existingExtIds.has(ext) || seenExt.has(ext)) continue;
          seenExt.add(ext);
        } else {
          const key = fp(incoming);
          if (seenFp.has(key)) continue;
          seenFp.add(key);
        }
        additions.push({ ...(incoming as Trade), id: nextId++, balance: 0 });
      }

      if (additions.length === 0) {
        // Nothing new to merge — keep dataset as-is.
        return;
      }

      // Sort the combined set chronologically by date (oldest → newest).
      // CRITICAL: do NOT renumber existing trades — their `id` is referenced by
      // Journal entries via `__JID:<id>__` tags, by manual-R overrides, and by
      // dashboard memo keys. Existing ids stay frozen; new imports keep the
      // fresh ids assigned at line 194 (max(existing)+1, ++). Array order
      // reflects chronology, but `id` is no longer == index+1.
      const combined = [...existing, ...additions].sort((a, b) => {
        const da = new Date(String(a.date || '').replace(' ', 'T')).getTime() || 0;
        const db = new Date(String(b.date || '').replace(' ', 'T')).getTime() || 0;
        return da - db;
      });

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
