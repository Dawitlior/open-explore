// Phase 4: Futures sync engine — defensively hardened.
// Pulls linear/perpetual futures execution history from the user's selected
// exchange, normalises each fill into the Orca Trade shape, and idempotently
// upserts rows into public.trades. The exchange's native execId is stored
// inside data.exchange_exec_id so re-syncs are no-ops.
//
// Every failure path returns a STRUCTURED JSON response (never a raw 500),
// so the client can surface the exact reason in console + UI.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Bybit linear execution history ----------
interface BybitExec {
  execId: string;
  orderId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  execPrice: string;
  execQty: string;
  execFee: string;
  execTime: string; // ms
  closedSize?: string;
  execType?: string;
}

interface BybitFetchResult {
  ok: true;
  list: BybitExec[];
}
interface BybitFetchError {
  ok: false;
  status: number;       // HTTP status to return to client
  error: string;        // short code
  detail: string;       // human-readable
}

async function fetchBybitLinear(
  apiKey: string,
  apiSecret: string,
): Promise<BybitFetchResult | BybitFetchError> {
  const ts = Date.now().toString();
  const recv = '5000';
  const query = 'category=linear&limit=100';
  const sign = await hmacSha256Hex(apiSecret, ts + apiKey + recv + query);

  let res: Response;
  try {
    res = await fetch(`https://api.bybit.com/v5/execution/list?${query}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': ts,
        'X-BAPI-RECV-WINDOW': recv,
        'X-BAPI-SIGN': sign,
      },
    });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }

  // Network-level failure on Bybit
  if (res.status >= 500) {
    await res.text().catch(() => '');
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: `bybit_http_${res.status}` };
  }

  let body: { retCode?: number; retMsg?: string; result?: { list?: unknown } } = {};
  try { body = await res.json(); } catch { /* keep {} */ }

  // Bybit reports errors with retCode !== 0 (HTTP can still be 200)
  if (typeof body.retCode !== 'number' || body.retCode !== 0) {
    return {
      ok: false,
      status: 422,
      error: 'bybit_rejected',
      detail: `retCode=${body.retCode ?? 'unknown'} ${body.retMsg ?? ''}`.trim(),
    };
  }

  // Result list may be missing or empty — both are legitimate zero-trade cases
  const list = body.result?.list;
  if (!Array.isArray(list)) {
    return { ok: true, list: [] };
  }
  return { ok: true, list: list as BybitExec[] };
}

// ---------- Normalise into Trade shape ----------
interface Trade {
  id: number;
  date: string;
  day: string;
  coin: string;
  direction: 'Long' | 'Short';
  orderType: string;
  entry: number;
  stopLoss: number;
  exit: number;
  returnR: number;
  winLoss: 'Win' | 'Loss' | 'Break Even';
  risk: number;
  expectedLoss: number;
  pnl: number;
  deviation: number;
  positionSize: number;
  leverage: number;
  balance: number;
  riskPct: number;
  rules: boolean;
  comments: string;
  exchange_provider?: string;
  exchange_exec_id?: string;
}

function bybitToTrade(e: BybitExec, provider: string): Omit<Trade, 'id' | 'balance'> {
  const px = Number(e.execPrice) || 0;
  const qty = Number(e.execQty) || 0;
  const fee = Number(e.execFee) || 0;
  const tsMs = Number(e.execTime) || Date.now();
  const d = new Date(tsMs);
  const iso = d.toISOString().slice(0, 19).replace('T', ' ');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const direction: 'Long' | 'Short' = e.side === 'Buy' ? 'Long' : 'Short';
  return {
    date: iso,
    day: dayName,
    coin: e.symbol,
    direction,
    orderType: e.execType || 'Market',
    entry: px,
    stopLoss: 0,
    exit: px,
    returnR: 0,
    winLoss: 'Break Even',
    risk: 0,
    expectedLoss: 0,
    pnl: -fee,
    deviation: 0,
    positionSize: qty * px,
    leverage: 1,
    riskPct: 0,
    rules: true,
    comments: `__EXEC:${e.execId}__ ${provider}/${e.orderId}`,
    exchange_provider: provider,
    exchange_exec_id: e.execId,
  };
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  // TOP-LEVEL boundary: any uncaught throw lands here as structured JSON.
  try {
    // ---- Env validation (BEFORE any risky init) ----
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[sync-futures-trades] missing env', {
        hasUrl: !!SUPABASE_URL,
        hasAnon: !!SUPABASE_ANON_KEY,
        hasService: !!SUPABASE_SERVICE_ROLE_KEY,
      });
      return json({ ok: false, error: 'server_misconfigured', detail: 'missing_env' }, 500);
    }

    // ---- Auth ----
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ ok: false, error: 'unauthorized', detail: 'missing_bearer' }, 401);
    }
    const token = authHeader.slice('Bearer '.length);

    const userClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimData, error: claimErr } = await userClient.auth.getClaims(token);
    const userId = claimData?.claims?.sub as string | undefined;
    if (claimErr || !userId) {
      return json({ ok: false, error: 'unauthorized', detail: claimErr?.message ?? 'no_sub' }, 401);
    }

    // ---- Parse body ----
    let body: { provider?: string; label?: string };
    try { body = await req.json(); }
    catch { return json({ ok: false, error: 'invalid_body', detail: 'json_parse_failed' }, 400); }

    const provider = String(body.provider || '').toLowerCase().trim();
    if (provider !== 'bybit') {
      return json({ ok: false, error: 'unsupported_provider', detail: 'Only Bybit linear sync is enabled' }, 400);
    }
    const label = typeof body.label === 'string' ? body.label.trim() : '';

    // ---- Service-role client ----
    const admin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
    );

    // ---- Resolve credential row ----
    let credQ = admin.from('exchange_credentials')
      .select('id, api_key, secret_id, label, is_active')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (label) credQ = credQ.eq('label', label);
    const { data: credRows, error: credErr } = await credQ;
    if (credErr) {
      return json({ ok: false, error: 'credential_lookup_failed', detail: credErr.message }, 500);
    }
    const cred = credRows?.[0];
    if (!cred) return json({ ok: false, error: 'no_credential', detail: 'No active credential found for this user/provider' }, 404);

    // ---- Decrypt secret via vault ----
    const { data: secretRow, error: secErr } = await admin
      .schema('vault' as never)
      .from('decrypted_secrets' as never)
      .select('decrypted_secret')
      .eq('id', cred.secret_id)
      .maybeSingle();
    const apiSecret = (secretRow as { decrypted_secret?: string } | null)?.decrypted_secret;
    if (secErr || !apiSecret) {
      return json({ ok: false, error: 'vault_read_failed', detail: secErr?.message ?? 'no_secret' }, 500);
    }

    // ---- Fetch executions (defensively validated) ----
    const fetchResult = await fetchBybitLinear(cred.api_key, apiSecret);
    if (!fetchResult.ok) {
      return json({ ok: false, error: fetchResult.error, detail: fetchResult.detail }, fetchResult.status);
    }
    const execs = fetchResult.list;

    // Zero-trade fast path — perfectly legitimate (new account / no 30d activity)
    if (execs.length === 0) {
      return json({ ok: true, fetched: 0, inserted: 0, skipped: 0, syncedCount: 0 });
    }

    // ---- Idempotency: load existing exec ids for this user ----
    // We fetch via a bounded select and filter in JS — this avoids fragile
    // PostgREST `->>` jsonb operator behaviour and tolerates schema variance.
    const execIds = execs.map(e => e.execId).filter(Boolean);
    const seen = new Set<string>();
    try {
      const { data: existing, error: exErr } = await admin
        .from('trades')
        .select('data')
        .eq('user_id', userId);
      if (exErr) throw new Error(exErr.message);
      for (const r of (existing ?? []) as Array<{ data: { exchange_exec_id?: string } | null }>) {
        const id = r?.data?.exchange_exec_id;
        if (id && execIds.includes(id)) seen.add(id);
      }
    } catch (e) {
      return json({ ok: false, error: 'idempotency_scan_failed', detail: (e as Error).message }, 500);
    }

    // ---- Allocate trade_ids on top of the user's current max ----
    const { data: maxRow, error: maxErr } = await admin
      .from('trades')
      .select('trade_id')
      .eq('user_id', userId)
      .order('trade_id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) return json({ ok: false, error: 'max_id_lookup_failed', detail: maxErr.message }, 500);
    let nextId = ((maxRow?.trade_id as number | undefined) ?? 0) + 1;

    // ---- Build rows aligned with public.trades schema (user_id, trade_id, data) ----
    const rows: Array<{ user_id: string; trade_id: number; data: unknown }> = [];
    let inserted = 0;
    let skipped = 0;
    let runningBalance = 0;
    for (const e of execs) {
      if (!e?.execId) { skipped++; continue; }
      if (seen.has(e.execId)) { skipped++; continue; }
      const t = bybitToTrade(e, provider);
      runningBalance += t.pnl;
      const full: Trade = { ...t, id: nextId, balance: Math.round(runningBalance * 10000) / 10000 };
      rows.push({ user_id: userId, trade_id: nextId, data: full });
      nextId++;
      inserted++;
    }

    if (rows.length > 0) {
      const { error: upErr } = await admin
        .from('trades')
        .upsert(rows, { onConflict: 'user_id,trade_id', ignoreDuplicates: true });
      if (upErr) {
        return json({ ok: false, error: 'persist_failed', detail: upErr.message }, 422);
      }
    }

    // Stamp last_validated_at as a successful-sync marker (non-fatal)
    try {
      await admin.from('exchange_credentials')
        .update({ last_validated_at: new Date().toISOString() })
        .eq('id', cred.id);
    } catch { /* non-fatal */ }

    return json({
      ok: true,
      fetched: execs.length,
      inserted,
      skipped,
      syncedCount: inserted,
    });
  } catch (e) {
    // Final safety net — never leak a raw 500
    const msg = (e instanceof Error ? e.message : String(e)) || 'unhandled_exception';
    console.error('[sync-futures-trades] unhandled', msg);
    return json({ ok: false, error: 'unhandled_exception', detail: msg }, 422);
  }
});
