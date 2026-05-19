/**
 * BybitLiveProvider — Global Money-Mode WebSocket service.
 *
 * Mounted once inside RequireAuth. Connects to Bybit V5 private WS for every
 * authenticated user that has active credentials. All inbound `position`
 * frames are passed through `sanitizeLiveBybitData` BEFORE entering React
 * state, guaranteeing the UI never sees a stopLoss/R-related field.
 *
 * Side-channels (server-side state only, never exposed to UI):
 *   - `live_risk_locks` SL snapshot upsert (preserved from prior impl)
 *   - `execution` topic → debounced `triggerIncrementalSync(symbol)`
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeLiveBybitData, type LiveMoneyPosition } from '@/lib/bybit-sanitize';
import { triggerIncrementalSync } from '@/lib/incremental-sync';

export type LiveStatus =
  | 'idle'
  | 'loading_creds'
  | 'no_creds'
  | 'connecting'
  | 'authenticating'
  | 'subscribed'
  | 'reconnecting'
  | 'auth_invalid'
  | 'error'
  | 'closed';

interface Ctx {
  positions: LiveMoneyPosition[];
  status: LiveStatus;
  lastError: string | null;
  lastFrameAt: number | null;
  isStale: boolean;
  hasCreds: boolean;
}

const BybitLiveCtx = createContext<Ctx>({
  positions: [], status: 'idle', lastError: null,
  lastFrameAt: null, isStale: false, hasCreds: false,
});

const BYBIT_WS_URL = 'wss://stream.bybit.com/v5/private';
const PING_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;
const MAX_AUTH_FAILURES = 2;
const STALE_AFTER_MS = 60_000;

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function BybitLiveProvider({ children }: { children: ReactNode }) {
  const [positions, setPositions] = useState<Record<string, LiveMoneyPosition>>({});
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const staleRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const authFailRef = useRef(0);
  const aliveRef = useRef(true);
  const credRef = useRef<{ apiKey: string; apiSecret: string; userId: string } | null>(null);
  const syncDebounceRef = useRef<Record<string, number>>({});

  // ── SL snapshot (server-side risk lock, invisible to UI) ────────────────
  const upsertLock = useCallback(async (raw: any) => {
    const cred = credRef.current;
    const sl = parseFloat(raw?.stopLoss);
    const size = parseFloat(raw?.size);
    if (!cred || !(sl > 0) || !(size > 0)) return;
    try {
      await supabase.from('live_risk_locks').upsert({
        user_id: cred.userId,
        symbol: String(raw.symbol),
        side: String(raw.side),
        entry_price: parseFloat(raw.entryPrice ?? raw.avgPrice) || 0,
        stop_loss: sl,
        size,
        exchange_order_id: `${raw.symbol}:${raw.positionIdx ?? 0}`,
        captured_at: new Date().toISOString(),
      }, { onConflict: 'user_id,symbol,exchange_order_id' });
    } catch (e) { /* best-effort */ }
  }, []);

  const closeFlagOpen = useCallback(async (raw: any) => {
    const cred = credRef.current;
    if (!cred) return;
    try {
      await supabase.from('live_risk_locks')
        .update({ closed_at: new Date().toISOString() })
        .eq('user_id', cred.userId)
        .eq('symbol', String(raw.symbol))
        .eq('exchange_order_id', `${raw.symbol}:${raw.positionIdx ?? 0}`)
        .is('closed_at', null);
    } catch { /* noop */ }
  }, []);

  // ── Incremental sync trigger (debounced per symbol) ─────────────────────
  const scheduleSync = useCallback((symbol: string, sinceMs: number) => {
    const key = symbol;
    const prev = syncDebounceRef.current[key];
    if (prev) window.clearTimeout(prev);
    syncDebounceRef.current[key] = window.setTimeout(() => {
      delete syncDebounceRef.current[key];
      void triggerIncrementalSync(symbol, sinceMs);
    }, 3000);
  }, []);

  // ── Frame handlers ──────────────────────────────────────────────────────
  const handlePositionFrame = useCallback((rows: any[]) => {
    const now = Date.now();
    setLastFrameAt(now);
    setIsStale(false);
    setPositions(prev => {
      const next = { ...prev };
      for (const r of rows) {
        const key = `${r.symbol}:${r.positionIdx ?? 0}`;
        const sanitized = sanitizeLiveBybitData(r);
        if (!sanitized) continue;
        if (sanitized.size > 0) {
          next[key] = sanitized;
          void upsertLock(r);
        } else {
          delete next[key];
          void closeFlagOpen(r);
        }
      }
      return next;
    });
  }, [upsertLock, closeFlagOpen]);

  const handleExecutionFrame = useCallback((rows: any[]) => {
    for (const r of rows) {
      if (!r?.symbol) continue;
      // "Trade" execType + closedSize triggers an incremental fetch.
      const closedSize = parseFloat(r.closedSize ?? r.execQty ?? '0') || 0;
      if (r.execType === 'Trade' && closedSize > 0) {
        const execTime = parseFloat(r.execTime ?? `${Date.now()}`) || Date.now();
        scheduleSync(String(r.symbol), execTime - 5000);
      }
    }
  }, [scheduleSync]);

  // ── Connection lifecycle ────────────────────────────────────────────────
  const teardown = useCallback(() => {
    if (pingRef.current) { window.clearInterval(pingRef.current); pingRef.current = null; }
    if (reconnectRef.current) { window.clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (staleRef.current) { window.clearInterval(staleRef.current); staleRef.current = null; }
    if (wsRef.current) { try { wsRef.current.close(1000, 'client teardown'); } catch {/*noop*/} wsRef.current = null; }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!aliveRef.current) return;
    if (authFailRef.current >= MAX_AUTH_FAILURES) {
      setStatus('auth_invalid');
      setLastError('auth_invalid');
      return;
    }
    const attempt = ++attemptRef.current;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, Math.min(attempt, 5)));
    reconnectRef.current = window.setTimeout(() => { void connect(); }, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    if (!aliveRef.current) return;
    const cred = credRef.current;
    if (!cred) { setStatus('no_creds'); return; }

    setStatus('connecting');
    let ws: WebSocket;
    try { ws = new WebSocket(BYBIT_WS_URL); }
    catch (e: any) {
      setLastError(String(e?.message || e)); setStatus('error'); scheduleReconnect(); return;
    }
    wsRef.current = ws;

    ws.onopen = async () => {
      if (!aliveRef.current) return;
      setStatus('authenticating');
      attemptRef.current = 0;
      try {
        const expires = Date.now() + 10_000;
        const signature = await hmacSha256Hex(cred.apiSecret, `GET/realtime${expires}`);
        ws.send(JSON.stringify({ op: 'auth', args: [cred.apiKey, expires, signature] }));
      } catch (e: any) {
        setLastError(String(e?.message || e)); setStatus('error');
        try { ws.close(); } catch { /* noop */ }
      }
    };

    ws.onmessage = (ev) => {
      if (!aliveRef.current) return;
      let msg: any; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.op === 'auth') {
        if (msg.success) {
          authFailRef.current = 0;
          ws.send(JSON.stringify({ op: 'subscribe', args: ['position', 'execution'] }));
        } else {
          authFailRef.current++;
          setLastError(msg.ret_msg || 'auth_failed');
          setStatus(authFailRef.current >= MAX_AUTH_FAILURES ? 'auth_invalid' : 'error');
          try { ws.close(); } catch {/*noop*/}
        }
        return;
      }
      if (msg.op === 'subscribe' && msg.success) { setStatus('subscribed'); return; }
      if (msg.op === 'pong' || msg.ret_msg === 'pong') return;
      if (msg.topic === 'position' && Array.isArray(msg.data)) handlePositionFrame(msg.data);
      else if (msg.topic === 'execution' && Array.isArray(msg.data)) handleExecutionFrame(msg.data);
    };

    ws.onerror = () => { setLastError('socket_error'); };
    ws.onclose = () => {
      if (!aliveRef.current) return;
      if (authFailRef.current >= MAX_AUTH_FAILURES) { setStatus('auth_invalid'); return; }
      setStatus('reconnecting');
      scheduleReconnect();
    };

    if (pingRef.current) window.clearInterval(pingRef.current);
    pingRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ op: 'ping' })); } catch {/*noop*/}
      }
    }, PING_MS);

    if (staleRef.current) window.clearInterval(staleRef.current);
    staleRef.current = window.setInterval(() => {
      setLastFrameAt(prev => {
        if (prev && Date.now() - prev > STALE_AFTER_MS) setIsStale(true);
        return prev;
      });
    }, 10_000);
  }, [handlePositionFrame, handleExecutionFrame, scheduleReconnect]);

  const [credEpoch, setCredEpoch] = useState(0);

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    aliveRef.current = true;
    let cancelled = false;

    (async () => {
      setStatus('loading_creds');
      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!u.user) { setStatus('no_creds'); setHasCreds(false); return; }
      const { data: rows, error } = await supabase
        .from('exchange_credentials')
        .select('id, api_key')
        .eq('user_id', u.user.id)
        .eq('provider', 'bybit')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error || !rows || rows.length === 0) { setStatus('no_creds'); setHasCreds(false); return; }
      const row = rows[0];
      const { data: secret, error: sErr } = await supabase
        .rpc('read_exchange_secret', { p_user_id: u.user.id, p_cred_id: row.id });
      if (cancelled) return;
      if (sErr || !secret) { setLastError('secret_unavailable'); setStatus('no_creds'); setHasCreds(false); return; }
      credRef.current = { apiKey: row.api_key, apiSecret: String(secret), userId: u.user.id };
      setHasCreds(true);
      authFailRef.current = 0;
      attemptRef.current = 0;
      void connect();
    })();

    return () => {
      cancelled = true;
      aliveRef.current = false;
      teardown();
      if (credRef.current) {
        try {
          credRef.current.apiSecret = '0'.repeat(credRef.current.apiSecret.length);
          credRef.current.apiKey = '';
        } catch {/*noop*/}
        credRef.current = null;
      }
    };
  }, [connect, teardown, credEpoch]);

  // ── React to credential changes & auth changes ──────────────────────────
  useEffect(() => {
    const bump = () => setCredEpoch(e => e + 1);
    window.addEventListener('orca:exchange-credentials-changed', bump);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') bump();
    });
    return () => {
      window.removeEventListener('orca:exchange-credentials-changed', bump);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<Ctx>(() => ({
    positions: Object.values(positions).sort((a, b) => a.symbol.localeCompare(b.symbol)),
    status, lastError, lastFrameAt, isStale, hasCreds,
  }), [positions, status, lastError, lastFrameAt, isStale, hasCreds]);

  return <BybitLiveCtx.Provider value={value}>{children}</BybitLiveCtx.Provider>;
}

export function useBybitLive(): Ctx {
  return useContext(BybitLiveCtx);
}
