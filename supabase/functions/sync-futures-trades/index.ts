// Phase 4: Futures sync engine.
// Pulls linear/perpetual futures execution history from the user's selected
// exchange, normalises each fill into the Orca Trade shape, and idempotently
// upserts rows into public.trades. The exchange's native execId / orderId
// is stored inside data.exchange_exec_id so re-syncs are no-ops.
//
// Secrets are read from Supabase Vault via the service-role client. The
// plaintext api_secret never leaves this function and is never logged.

import { createClient } from 'npm:@supabase/supabase-js@2';

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
  execTime: string;          // ms
  closedSize?: string;
  execType?: string;
}

async function fetchBybitLinear(apiKey: string, apiSecret: string): Promise<BybitExec[]> {
  const ts = Date.now().toString();
  const recv = '5000';
  const query = 'category=linear&limit=100';
  const sign = await hmacSha256Hex(apiSecret, ts + apiKey + recv + query);
  const res = await fetch(`https://api.bybit.com/v5/execution/list?${query}`, {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': ts,
      'X-BAPI-RECV-WINDOW': recv,
      'X-BAPI-SIGN': sign,
    },
  });
  if (!res.ok) throw new Error(`bybit_http_${res.status}`);
  const body = await res.json().catch(() => ({}));
  if (body?.retCode !== 0) throw new Error('bybit_rejected');
  const list = body?.result?.list;
  return Array.isArray(list) ? list as BybitExec[] : [];
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
  // sync metadata (lives in jsonb data)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  // ---- Auth ----
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ ok: false, error: 'unauthorized' }, 401);
  const token = authHeader.slice('Bearer '.length);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claimData, error: claimErr } = await userClient.auth.getClaims(token);
  const userId = claimData?.claims?.sub as string | undefined;
  if (claimErr || !userId) return json({ ok: false, error: 'unauthorized' }, 401);

  // ---- Parse body ----
  let body: { provider?: string; label?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  const provider = String(body.provider || '').toLowerCase().trim();
  if (provider !== 'bybit') {
    return json({ ok: false, error: 'unsupported_provider', detail: 'Only Bybit linear sync is enabled' }, 400);
  }
  const label = typeof body.label === 'string' ? body.label.trim() : '';

  // ---- Service-role client to read vault + write trades ----
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
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
  if (credErr) return json({ ok: false, error: 'credential_lookup_failed' }, 500);
  const cred = credRows?.[0];
  if (!cred) return json({ ok: false, error: 'no_credential' }, 404);

  // ---- Decrypt secret via vault ----
  const { data: secretRow, error: secErr } = await admin
    .schema('vault' as never)
    .from('decrypted_secrets' as never)
    .select('decrypted_secret')
    .eq('id', cred.secret_id)
    .maybeSingle();
  const apiSecret = (secretRow as { decrypted_secret?: string } | null)?.decrypted_secret;
  if (secErr || !apiSecret) return json({ ok: false, error: 'vault_read_failed' }, 500);

  // ---- Fetch executions ----
  let execs: BybitExec[];
  try {
    execs = await fetchBybitLinear(cred.api_key, apiSecret);
  } catch (e) {
    const msg = (e as Error).message || 'sync_failed';
    const status = msg.startsWith('bybit_http_5') ? 503 : 502;
    return json({ ok: false, error: 'exchange_error', detail: msg }, status);
  }

  if (execs.length === 0) {
    return json({ ok: true, fetched: 0, inserted: 0, skipped: 0 });
  }

  // ---- Idempotent insert: skip rows whose exchange_exec_id already exists ----
  const execIds = execs.map(e => e.execId);
  const { data: existing } = await admin
    .from('trades')
    .select('trade_id, data')
    .eq('user_id', userId)
    .in('data->>exchange_exec_id', execIds);
  const seen = new Set<string>();
  for (const r of (existing ?? []) as Array<{ data: { exchange_exec_id?: string } }>) {
    const id = r?.data?.exchange_exec_id;
    if (id) seen.add(id);
  }

  // Allocate trade_ids on top of the user's current max
  const { data: maxRow } = await admin
    .from('trades')
    .select('trade_id')
    .eq('user_id', userId)
    .order('trade_id', { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextId = ((maxRow?.trade_id as number | undefined) ?? 0) + 1;

  const rows: Array<{ user_id: string; trade_id: number; data: unknown }> = [];
  let inserted = 0;
  let skipped = 0;
  let runningBalance = 0;
  for (const e of execs) {
    if (seen.has(e.execId)) { skipped++; continue; }
    const t = bybitToTrade(e, provider);
    runningBalance += t.pnl;
    const full: Trade = { ...t, id: nextId, balance: Math.round(runningBalance * 10000) / 10000 };
    rows.push({ user_id: userId, trade_id: nextId, data: full });
    nextId++;
    inserted++;
  }

  if (rows.length > 0) {
    // onConflict DO NOTHING via ignoreDuplicates — guards against races
    const { error: upErr } = await admin
      .from('trades')
      .upsert(rows, { onConflict: 'user_id,trade_id', ignoreDuplicates: true });
    if (upErr) return json({ ok: false, error: 'persist_failed', detail: upErr.message }, 500);
  }

  // Stamp last_validated_at as a successful-sync marker
  await admin.from('exchange_credentials')
    .update({ last_validated_at: new Date().toISOString() })
    .eq('id', cred.id);

  return json({ ok: true, fetched: execs.length, inserted, skipped });
});
