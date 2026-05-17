/**
 * use-live-positions — Bybit V5 Private WebSocket bridge.
 *
 * - Pulls the user's first ACTIVE Bybit credential from Supabase
 *   and resolves the API secret via the security-definer RPC
 *   `read_exchange_secret` (kept in a *local* closure only).
 * - Opens wss://stream.bybit.com/v5/private, signs an HMAC-SHA256
 *   auth frame, then subscribes to the `position` topic.
 * - Every payload with `stopLoss > 0` is **silently upserted** into
 *   `public.live_risk_locks` so the original SL is preserved even
 *   after Bybit deletes it on trade closure.
 * - Auto-reconnects with exponential backoff (max 30 s) and emits
 *   a 20 s ping heartbeat.
 * - On unmount the socket is closed AND the in-memory secret is
 *   overwritten before being released.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type LivePosition = {
  symbol: string;
  side: 'Buy' | 'Sell' | string;
  size: number;
  entryPrice: number;
  markPrice: number;
  stopLoss: number;
  unrealizedPnl: number;
  leverage: number;
  positionIdx?: number;
  updatedAt: number;
};

export type LiveStatus =
  | 'idle'
  | 'loading_creds'
  | 'no_creds'
  | 'connecting'
  | 'authenticating'
  | 'subscribed'
  | 'reconnecting'
  | 'error'
  | 'closed';

const BYBIT_WS_URL = 'wss://stream.bybit.com/v5/private';
const PING_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function useLivePositions(enabled: boolean) {
  const [positions, setPositions] = useState<Record<string, LivePosition>>({});
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const aliveRef = useRef(true);
  // Secret kept *only* inside a closure on this ref — wiped on cleanup.
  const credRef = useRef<{ apiKey: string; apiSecret: string; userId: string } | null>(null);

  const upsertLock = useCallback(async (p: LivePosition) => {
    const cred = credRef.current;
    if (!cred || !p.stopLoss || p.stopLoss <= 0 || !p.size || p.size <= 0) return;
    try {
      await supabase.from('live_risk_locks').upsert({
        user_id: cred.userId,
        symbol: p.symbol,
        side: p.side,
        entry_price: p.entryPrice,
        stop_loss: p.stopLoss,
        size: p.size,
        exchange_order_id: `${p.symbol}:${p.positionIdx ?? 0}`,
        captured_at: new Date().toISOString(),
      }, { onConflict: 'user_id,symbol,exchange_order_id' });
    } catch (e) {
      // Silent — locking is best-effort and must never break the stream.
      console.warn('[live-positions] lock upsert failed', e);
    }
  }, []);

  const closeFlagOpen = useCallback(async (p: LivePosition) => {
    const cred = credRef.current;
    if (!cred || p.size > 0) return;
    try {
      await supabase.from('live_risk_locks')
        .update({ closed_at: new Date().toISOString() })
        .eq('user_id', cred.userId)
        .eq('symbol', p.symbol)
        .eq('exchange_order_id', `${p.symbol}:${p.positionIdx ?? 0}`)
        .is('closed_at', null);
    } catch (e) {
      console.warn('[live-positions] close-flag failed', e);
    }
  }, []);

  const handlePositionFrame = useCallback((rows: any[]) => {
    const now = Date.now();
    setLastFrameAt(now);
    setPositions(prev => {
      const next = { ...prev };
      for (const r of rows) {
        const p: LivePosition = {
          symbol: r.symbol,
          side: r.side,
          size: parseFloat(r.size) || 0,
          entryPrice: parseFloat(r.entryPrice ?? r.avgPrice) || 0,
          markPrice: parseFloat(r.markPrice) || 0,
          stopLoss: parseFloat(r.stopLoss) || 0,
          unrealizedPnl: parseFloat(r.unrealisedPnl ?? r.unrealizedPnl) || 0,
          leverage: parseFloat(r.leverage) || 0,
          positionIdx: r.positionIdx,
          updatedAt: now,
        };
        const key = `${p.symbol}:${p.positionIdx ?? 0}`;
        if (p.size > 0) {
          next[key] = p;
          void upsertLock(p);
        } else {
          delete next[key];
          void closeFlagOpen(p);
        }
      }
      return next;
    });
  }, [upsertLock, closeFlagOpen]);

  const teardown = useCallback(() => {
    if (pingRef.current) { window.clearInterval(pingRef.current); pingRef.current = null; }
    if (reconnectRef.current) { window.clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (wsRef.current) {
      try { wsRef.current.close(1000, 'client teardown'); } catch { /* noop */ }
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (!aliveRef.current) return;
    const cred = credRef.current;
    if (!cred) { setStatus('no_creds'); return; }

    setStatus('connecting');
    let ws: WebSocket;
    try { ws = new WebSocket(BYBIT_WS_URL); } catch (e: any) {
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
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.op === 'auth') {
        if (msg.success) {
          ws.send(JSON.stringify({ op: 'subscribe', args: ['position'] }));
        } else {
          setLastError(msg.ret_msg || 'auth_failed'); setStatus('error');
          try { ws.close(); } catch { /* noop */ }
        }
        return;
      }
      if (msg.op === 'subscribe' && msg.success) { setStatus('subscribed'); return; }
      if (msg.op === 'pong' || msg.ret_msg === 'pong') return;
      if (msg.topic === 'position' && Array.isArray(msg.data)) {
        handlePositionFrame(msg.data);
      }
    };

    ws.onerror = () => { setLastError('socket_error'); };

    ws.onclose = () => {
      if (!aliveRef.current) return;
      setStatus('reconnecting');
      scheduleReconnect();
    };

    if (pingRef.current) window.clearInterval(pingRef.current);
    pingRef.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ op: 'ping' })); } catch { /* noop */ }
      }
    }, PING_MS);
  }, [handlePositionFrame]);

  const scheduleReconnect = useCallback(() => {
    if (!aliveRef.current) return;
    const attempt = ++attemptRef.current;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, Math.min(attempt, 5)));
    reconnectRef.current = window.setTimeout(() => { void connect(); }, delay);
  }, [connect]);

  // Boot
  useEffect(() => {
    aliveRef.current = true;
    if (!enabled) { setStatus('idle'); return () => { aliveRef.current = false; }; }

    (async () => {
      setStatus('loading_creds');
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setStatus('no_creds'); return; }
      const { data: rows, error } = await supabase
        .from('exchange_credentials')
        .select('id, api_key')
        .eq('user_id', u.user.id)
        .eq('provider', 'bybit')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !rows || rows.length === 0) { setStatus('no_creds'); return; }
      const row = rows[0];
      const { data: secret, error: sErr } = await supabase
        .rpc('read_exchange_secret', { p_user_id: u.user.id, p_cred_id: row.id });
      if (sErr || !secret) { setLastError('secret_unavailable'); setStatus('no_creds'); return; }
      credRef.current = { apiKey: row.api_key, apiSecret: String(secret), userId: u.user.id };
      void connect();
    })();

    return () => {
      aliveRef.current = false;
      teardown();
      // Aggressive memory wipe — overwrite then null-out.
      if (credRef.current) {
        try {
          credRef.current.apiSecret = '0'.repeat(credRef.current.apiSecret.length);
          credRef.current.apiKey = '';
        } catch { /* noop */ }
        credRef.current = null;
      }
    };
  }, [enabled, connect, teardown]);

  const list = Object.values(positions).sort((a, b) => a.symbol.localeCompare(b.symbol));
  return { positions: list, status, lastError, lastFrameAt };
}
