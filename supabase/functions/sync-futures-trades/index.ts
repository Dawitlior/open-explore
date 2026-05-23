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

const chunk = <T,>(items: T[], size = 250): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Bybit closed-pnl history (consolidated trades) ----------
interface BybitClosedPnl {
  orderId: string;
  symbol: string;
  // For closed-pnl, `side` is the CLOSING side. The position side is the opposite.
  side: 'Buy' | 'Sell';
  qty: string;
  closedSize: string;
  avgEntryPrice: string;
  avgExitPrice: string;
  closedPnl: string;
  openFee?: string;
  closeFee?: string;
  leverage?: string;
  createdTime: string; // ms
  updatedTime: string; // ms
  execType?: string;
}

interface BybitFetchResult {
  ok: true;
  list: BybitClosedPnl[];
}
interface BybitFetchError {
  ok: false;
  status: number;
  error: string;
  detail: string;
}

interface BybitPosition {
  symbol: string;
  side: string;
  size: string;
  avgPrice?: string;
  entryPrice?: string;
  unrealisedPnl?: string;
  unrealizedPnl?: string;
}

async function bybitSignedGet(
  apiKey: string,
  apiSecret: string,
  path: string,
  query: string,
): Promise<{ ok: true; body: { retCode?: number; retMsg?: string; result?: { list?: unknown; nextPageCursor?: string } } } | BybitFetchError> {
  const ts = Date.now().toString();
  const recv = '5000';
  const sign = await hmacSha256Hex(apiSecret, ts + apiKey + recv + query);
  let res: Response;
  try {
    res = await fetch(`https://api.bybit.com${path}?${query}`, {
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
  if (res.status >= 500) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: `bybit_http_${res.status}` };
  }
  let body: { retCode?: number; retMsg?: string; result?: { list?: unknown; nextPageCursor?: string } } = {};
  try { body = await res.json(); } catch { /* keep {} */ }
  if (typeof body.retCode !== 'number' || body.retCode !== 0) {
    return {
      ok: false,
      status: 422,
      error: 'bybit_rejected',
      detail: `retCode=${body.retCode ?? 'unknown'} ${body.retMsg ?? ''}`.trim(),
    };
  }
  return { ok: true, body };
}

// Fetch up to 180 days of consolidated CLOSED PNL history.
// /v5/position/closed-pnl returns one row per fully-closed position session
// with avgEntryPrice, avgExitPrice and closedPnl already aggregated by Bybit.
async function fetchBybitClosedPnl(
  apiKey: string,
  apiSecret: string,
): Promise<BybitFetchResult | BybitFetchError> {
  const DAY_MS = 86_400_000;
  const endTime = Date.now();
  const startTime = endTime - 180 * DAY_MS;
  // Bybit closed-pnl supports max 7-day windows; iterate in 7-day chunks.
  const WINDOW_MS = 7 * DAY_MS;
  const all: BybitClosedPnl[] = [];
  const MAX_PAGES = 400;

  for (let wEnd = endTime; wEnd > startTime; wEnd -= WINDOW_MS) {
    const wStart = Math.max(startTime, wEnd - WINDOW_MS);
    let cursor: string | undefined;
    let pages = 0;
    do {
      const params = new URLSearchParams({
        category: 'linear',
        limit: '100',
        startTime: String(wStart),
        endTime: String(wEnd),
      });
      if (cursor) params.set('cursor', cursor);
      const r = await bybitSignedGet(apiKey, apiSecret, '/v5/position/closed-pnl', params.toString());
      if (!r.ok) return r;
      const list = r.body.result?.list;
      if (Array.isArray(list)) all.push(...(list as BybitClosedPnl[]));
      cursor = r.body.result?.nextPageCursor || undefined;
      pages++;
      if (pages > MAX_PAGES) break;
    } while (cursor);
  }
  return { ok: true, list: all };
}

async function fetchBybitOpenPositions(
  apiKey: string,
  apiSecret: string,
): Promise<{ ok: true; list: BybitPosition[] } | BybitFetchError> {
  const r = await bybitSignedGet(apiKey, apiSecret, '/v5/position/list', 'category=linear&settleCoin=USDT');
  if (!r.ok) return r;
  const list = r.body.result?.list;
  if (!Array.isArray(list)) return { ok: true, list: [] };
  return { ok: true, list: list as BybitPosition[] };
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

interface BybitNormalized {
  legacy: Omit<Trade, 'id' | 'balance'>;
  provenance: {
    broker_id: string;
    source_type: 'api_sync';
    asset_class: 'crypto';
    external_id: string;
    opened_at: string; // ISO
    closed_at: string; // ISO
  };
}

function bybitToTrade(e: BybitClosedPnl, provider: string): BybitNormalized {
  const entryPx = Number(e.avgEntryPrice) || 0;
  const exitPx = Number(e.avgExitPrice) || 0;
  const qty = Number(e.closedSize) || Number(e.qty) || 0;
  const openFee = Number(e.openFee) || 0;
  const closeFee = Number(e.closeFee) || 0;
  const realizedPnl = parseFloat(e.closedPnl ?? '0') || 0;
  // Bybit closed-pnl `closedPnl` is ALREADY net of fees, so we don't subtract again.
  const netPnl = realizedPnl;
  const openMs = Number(e.createdTime) || Number(e.updatedTime) || Date.now();
  const closeMs = Number(e.updatedTime) || Number(e.createdTime) || openMs;
  const d = new Date(closeMs);
  const iso = d.toISOString().slice(0, 19).replace('T', ' ');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  // `side` on closed-pnl is the CLOSING side. Position direction is the opposite.
  const direction: 'Long' | 'Short' = e.side === 'Sell' ? 'Long' : 'Short';
  const winLoss: 'Win' | 'Loss' | 'Break Even' =
    netPnl > 0 ? 'Win' : netPnl < 0 ? 'Loss' : 'Break Even';
  const lev = Number(e.leverage) || 1;
  return {
    legacy: {
      date: iso,
      day: dayName,
      coin: e.symbol,
      direction,
      orderType: e.execType || 'Market',
      entry: entryPx,
      stopLoss: 0,
      exit: exitPx,
      returnR: 0,
      winLoss,
      risk: 0,
      expectedLoss: 0,
      pnl: netPnl,
      deviation: 0,
      positionSize: qty * entryPx,
      leverage: lev,
      riskPct: 0,
      rules: true,
      comments: `__CLOSED:${e.orderId}__ ${provider} fees:${(openFee + closeFee).toFixed(4)}`,
      exchange_provider: provider,
      exchange_exec_id: e.orderId,
    },
    provenance: {
      broker_id: provider,
      source_type: 'api_sync',
      asset_class: 'crypto',
      external_id: e.orderId,
      opened_at: new Date(openMs).toISOString(),
      closed_at: new Date(closeMs).toISOString(),
    },
  };
}

// ============== Binance USDT-M Futures (income-based) ==============
// Binance has no "closed-pnl" endpoint. We use /fapi/v1/income filtered by
// incomeType=REALIZED_PNL — each row is one fully-realised PnL event with
// symbol + signed income amount + tranId. Entry/exit prices are not exposed
// here (enrichment via /fapi/v1/userTrades is a Phase 4.5 follow-up); we
// persist pnl-only rows so the journal stays in sync with the exchange.

interface BinanceIncome {
  symbol: string;
  incomeType: string;
  income: string;      // signed, USDT
  asset: string;
  time: number;        // ms
  info?: string;
  tranId: string | number;
  tradeId?: string;
}

interface BinanceFetchResult {
  ok: true;
  list: BinanceIncome[];
}

async function binanceSignedGet(
  apiKey: string,
  apiSecret: string,
  path: string,
  params: URLSearchParams,
): Promise<{ ok: true; body: unknown } | BybitFetchError> {
  params.set('timestamp', Date.now().toString());
  params.set('recvWindow', '5000');
  const query = params.toString();
  const sig = await hmacSha256Hex(apiSecret, query);
  let res: Response;
  try {
    res = await fetch(`https://fapi.binance.com${path}?${query}&signature=${sig}`, {
      method: 'GET',
      headers: { 'X-MBX-APIKEY': apiKey },
    });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, error: 'binance_rejected', detail: text.slice(0, 240) };
  }
  if (res.status >= 500) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: `binance_http_${res.status}` };
  }
  if (res.status >= 400) {
    return { ok: false, status: 422, error: 'binance_rejected', detail: text.slice(0, 240) };
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = []; }
  return { ok: true, body };
}

async function fetchBinanceRealizedPnl(
  apiKey: string,
  apiSecret: string,
): Promise<BinanceFetchResult | BybitFetchError> {
  const DAY_MS = 86_400_000;
  const WINDOW_MS = 7 * DAY_MS;
  const endTime = Date.now();
  const startTime = endTime - 180 * DAY_MS;
  const all: BinanceIncome[] = [];
  const MAX_PAGES = 400;

  for (let wEnd = endTime; wEnd > startTime; wEnd -= WINDOW_MS) {
    const wStart = Math.max(startTime, wEnd - WINDOW_MS);
    let cursorTime = wStart;
    let pages = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const params = new URLSearchParams({
        incomeType: 'REALIZED_PNL',
        startTime: String(cursorTime),
        endTime: String(wEnd),
        limit: '1000',
      });
      const r = await binanceSignedGet(apiKey, apiSecret, '/fapi/v1/income', params);
      if (!r.ok) return r;
      const list = Array.isArray(r.body) ? (r.body as BinanceIncome[]) : [];
      if (list.length === 0) break;
      all.push(...list);
      pages++;
      if (list.length < 1000 || pages > MAX_PAGES) break;
      // Advance past the last event to avoid re-fetching the same page.
      const lastTime = list[list.length - 1].time;
      if (lastTime <= cursorTime) break;
      cursorTime = lastTime + 1;
    }
  }
  return { ok: true, list: all };
}

function binanceToTrade(e: BinanceIncome, provider: string): BybitNormalized {
  const pnl = Number(e.income) || 0;
  const closeMs = Number(e.time) || Date.now();
  const d = new Date(closeMs);
  const iso = d.toISOString().slice(0, 19).replace('T', ' ');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const direction: 'Long' | 'Short' = pnl >= 0 ? 'Long' : 'Short'; // unknown — placeholder
  const winLoss: 'Win' | 'Loss' | 'Break Even' =
    pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Break Even';
  const externalId = `binance:${e.symbol}:${e.tranId}`;
  return {
    legacy: {
      date: iso,
      day: dayName,
      coin: e.symbol,
      direction,
      orderType: 'Market',
      entry: 0,
      stopLoss: 0,
      exit: 0,
      returnR: 0,
      winLoss,
      risk: 0,
      expectedLoss: 0,
      pnl,
      deviation: 0,
      positionSize: 0,
      leverage: 1,
      riskPct: 0,
      rules: true,
      comments: `__CLOSED:${externalId}__ ${provider} income`,
      exchange_provider: provider,
      exchange_exec_id: externalId,
    },
    provenance: {
      broker_id: provider,
      source_type: 'api_sync',
      asset_class: 'crypto',
      external_id: externalId,
      opened_at: new Date(closeMs).toISOString(),
      closed_at: new Date(closeMs).toISOString(),
    },
  };
}

// Provider dispatch table — used by the handler's bulk path.
type ProviderId = 'bybit' | 'binance';
async function fetchProviderClosedTrades(
  provider: ProviderId,
  apiKey: string,
  apiSecret: string,
): Promise<
  | { ok: true; list: Array<{ legacy: BybitNormalized['legacy']; provenance: BybitNormalized['provenance']; key: string }> }
  | BybitFetchError
> {
  if (provider === 'bybit') {
    const r = await fetchBybitClosedPnl(apiKey, apiSecret);
    if (!r.ok) return r;
    return {
      ok: true,
      list: r.list
        .filter(e => !!e?.orderId)
        .map(e => {
          const n = bybitToTrade(e, provider);
          return { ...n, key: e.orderId };
        }),
    };
  }
  if (provider === 'binance') {
    const r = await fetchBinanceRealizedPnl(apiKey, apiSecret);
    if (!r.ok) return r;
    return {
      ok: true,
      list: r.list.map(e => {
        const n = binanceToTrade(e, provider);
        return { ...n, key: n.provenance.external_id };
      }),
    };
  }
  return { ok: false, status: 400, error: 'unsupported_provider', detail: provider };
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
    const { data: userData, error: authError } = await userClient.auth.getUser(token);
    const userId = userData?.user?.id;
    if (authError || !userId) {
      return json({ ok: false, error: 'unauthorized', detail: authError?.message ?? 'no_user' }, 401);
    }

    // ---- Parse body ----
    let body: { provider?: string; label?: string; mode?: 'bulk' | 'incremental'; symbol?: string; since?: number };
    try { body = await req.json(); }
    catch { return json({ ok: false, error: 'invalid_body', detail: 'json_parse_failed' }, 400); }

    const provider = String(body.provider || '').toLowerCase().trim() as ProviderId;
    if (provider !== 'bybit' && provider !== 'binance') {
      return json({ ok: false, error: 'unsupported_provider', detail: `Provider '${provider}' is not supported yet` }, 400);
    }
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const mode: 'bulk' | 'incremental' = body.mode === 'incremental' ? 'incremental' : 'bulk';
    const incSymbol = typeof body.symbol === 'string' ? body.symbol.trim() : '';
    const incSince = typeof body.since === 'number' && body.since > 0 ? body.since : 0;

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

    // ---- Decrypt secret via SECURITY DEFINER RPC ----
    // vault schema isn't reachable through PostgREST, so we proxy through a
    // service_role-only function that performs the ownership check + lookup.
    const { data: secretPlain, error: secErr } = await admin.rpc('read_exchange_secret', {
      p_user_id: userId,
      p_cred_id: cred.id,
    });
    const apiSecret = typeof secretPlain === 'string' ? secretPlain : null;
    if (secErr || !apiSecret) {
      return json({ ok: false, error: 'vault_read_failed', detail: secErr?.message ?? 'no_secret' }, 500);
    }

    // ───────── INCREMENTAL MODE (Bybit-only) ─────────
    // Append-only path triggered by the live WS when a position closes.
    // Fetches a single narrow window for one symbol and upserts — never wipes.
    if (mode === 'incremental') {
      if (provider !== 'bybit') {
        return json({ ok: false, error: 'unsupported_mode', detail: 'incremental sync is only available for Bybit' }, 400);
      }
      if (!incSymbol) return json({ ok: false, error: 'invalid_body', detail: 'symbol required' }, 400);
      const startTime = incSince > 0 ? incSince : Date.now() - 60 * 60 * 1000;
      const endTime = Date.now();
      const params = new URLSearchParams({
        category: 'linear', symbol: incSymbol, limit: '50',
        startTime: String(startTime), endTime: String(endTime),
      });
      const r = await bybitSignedGet(cred.api_key, apiSecret, '/v5/position/closed-pnl', params.toString());
      if (!r.ok) return json({ ok: false, error: r.error, detail: r.detail }, r.status);
      const list = (r.body.result?.list as BybitClosedPnl[] | undefined) ?? [];
      if (list.length === 0) return json({ ok: true, mode, added: 0, rows: [] });

      const { data: maxRow } = await admin.from('trades')
        .select('trade_id').eq('user_id', userId)
        .order('trade_id', { ascending: false }).limit(1).maybeSingle();
      let nextId = ((maxRow?.trade_id as number | undefined) ?? 0) + 1;

      const sorted = [...list].sort((a, b) =>
        (Number(a.updatedTime) || 0) - (Number(b.updatedTime) || 0));
      const rows: Array<Record<string, unknown>> = [];
      const summary: Array<{ symbol: string; pnl: number }> = [];
      const seen = new Set<string>();
      for (const e of sorted) {
        if (!e?.orderId || seen.has(e.orderId)) continue;
        seen.add(e.orderId);
        const { legacy, provenance } = bybitToTrade(e, provider);
        const full: Trade = { ...legacy, id: nextId, balance: 0 };
        rows.push({
          user_id: userId,
          trade_id: nextId,
          data: full,
          // Phase 1 dual-write: provenance columns alongside legacy `data` blob.
          broker_id: provenance.broker_id,
          account_label: label || null,
          source_type: provenance.source_type,
          asset_class: provenance.asset_class,
          external_id: provenance.external_id,
          exchange_exec_id: provenance.external_id,
          opened_at: provenance.opened_at,
          closed_at: provenance.closed_at,
        });
        summary.push({ symbol: legacy.coin, pnl: legacy.pnl });
        nextId++;
      }
      if (rows.length > 0) {
        const { error: upErr } = await admin.from('trades')
          .upsert(rows, { onConflict: 'user_id,exchange_exec_id', ignoreDuplicates: true });
        if (upErr && !(upErr.code === '23505' || /duplicate key/i.test(upErr.message))) {
          return json({ ok: false, error: 'persist_failed', detail: upErr.message }, 422);
        }
      }
      return json({ ok: true, mode, added: rows.length, rows: summary });
    }


    // ---- Fetch consolidated closed trades via the provider dispatcher ----
    const fetchResult = await fetchProviderClosedTrades(provider, cred.api_key, apiSecret);
    if (!fetchResult.ok) {
      return json({ ok: false, error: fetchResult.error, detail: fetchResult.detail }, fetchResult.status);
    }
    const closedEntries = fetchResult.list;

    // ---- WIPE prior api_sync rows for this user/provider ----
    // Closed-pnl is itself idempotent + bounded by the 180-day window, so we
    // re-derive from scratch on every bulk sync.
    // We wipe by EITHER legacy JSON marker (`data->>exchange_provider`) OR the
    // new provenance column (`broker_id`) so neither old nor new rows leak
    // into the next upsert and trip `trades_user_external_uidx`.
    let wiped = 0;
    for (const ids of chunk(closedEntries.map(e => e.provenance.external_id).filter(Boolean), 250)) {
      const { data: wipedRows, error: wipeErr } = await admin
        .from('trades')
        .delete()
        .eq('user_id', userId)
        .or(`external_id.in.(${ids.map(id => `"${String(id).replace(/"/g, '\\"')}"`).join(',')}),exchange_exec_id.in.(${ids.map(id => `"${String(id).replace(/"/g, '\\"')}"`).join(',')})`)
        .select('trade_id');
      if (wipeErr) {
        return json({ ok: false, error: 'wipe_failed', detail: wipeErr.message }, 500);
      }
      wiped += wipedRows?.length ?? 0;
    }
    {
      const { data: wipedRows, error: wipeErr } = await admin
        .from('trades')
        .delete()
        .eq('user_id', userId)
        .eq('broker_id', provider)
        .select('trade_id');
      if (wipeErr) {
        return json({ ok: false, error: 'wipe_failed', detail: wipeErr.message }, 500);
      }
      wiped += wipedRows?.length ?? 0;
    }

    // Zero-trade fast path — legitimate (new account / no 180d activity)
    if (closedEntries.length === 0) {
      return json({ ok: true, fetched: 0, inserted: 0, skipped: 0, wiped, syncedCount: 0 });
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

    // ---- Build rows, deduped by adapter key ----
    const localSeen = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];
    let inserted = 0;
    let skipped = 0;
    let runningBalance = 0;
    const sorted = [...closedEntries].sort((a, b) =>
      Date.parse(a.provenance.closed_at) - Date.parse(b.provenance.closed_at),
    );
    for (const entry of sorted) {
      if (!entry.key) { skipped++; continue; }
      if (localSeen.has(entry.key)) { skipped++; continue; }
      localSeen.add(entry.key);
      const { legacy, provenance } = entry;
      runningBalance += legacy.pnl;
      const full: Trade = { ...legacy, id: nextId, balance: Math.round(runningBalance * 10000) / 10000 };
      rows.push({
        user_id: userId,
        trade_id: nextId,
        data: full,
        broker_id: provenance.broker_id,
        account_label: label || null,
        source_type: provenance.source_type,
        asset_class: provenance.asset_class,
        external_id: provenance.external_id,
        exchange_exec_id: provenance.external_id,
        opened_at: provenance.opened_at,
        closed_at: provenance.closed_at,
      });
      nextId++;
      inserted++;
    }


    if (rows.length > 0) {
      // Two unique constraints can fire here:
      //   1. trades_user_exchange_exec_unique   (user_id, exchange_exec_id)
      //   2. trades_user_external_uidx          (user_id, broker_id, account_label, external_id) partial
      // We can only declare ONE onConflict per upsert. Pre-dedupe the batch by
      // the strictest key (constraint #2), then upsert with ignoreDuplicates
      // against the legacy index. Any residual collision is swallowed.
      const seenKey = new Set<string>();
      const deduped = rows.filter(r => {
        const k = `${r.broker_id ?? ''}|${r.account_label ?? ''}|${r.external_id ?? ''}`;
        if (!r.external_id) return true;
        if (seenKey.has(k)) return false;
        seenKey.add(k);
        return true;
      });
      const { error: upErr } = await admin
        .from('trades')
        .upsert(deduped, { onConflict: 'user_id,exchange_exec_id', ignoreDuplicates: true });
      if (upErr) {
        // Pg duplicate-key (23505) on the OTHER unique index — treat as benign
        // idempotent collision rather than a hard failure.
        if (upErr.code === '23505' || /duplicate key/i.test(upErr.message)) {
          console.warn('[sync-futures-trades] swallowed dup-key:', upErr.message);
        } else {
          return json({ ok: false, error: 'persist_failed', detail: upErr.message }, 422);
        }
      }
    }

    // ---- Sync live open positions (Bybit-only for now) ----
    let positionsSynced = 0;
    if (provider === 'bybit') {
      try {
        const posResult = await fetchBybitOpenPositions(cred.api_key, apiSecret);
        if (posResult.ok) {
          const active = posResult.list.filter(p => Number(p.size) > 0);
          const activeSymbols = new Set(active.map(p => p.symbol));

          if (active.length > 0) {
            const posRows = active.map(p => ({
              user_id: userId,
              provider,
              account_label: label || null,
              symbol: p.symbol,
              side: p.side,
              size: Number(p.size) || 0,
              entry_price: Number(p.avgPrice ?? p.entryPrice ?? 0) || 0,
              unrealized_pnl: Number(p.unrealisedPnl ?? p.unrealizedPnl ?? 0) || 0,
              updated_at: new Date().toISOString(),
            }));
            const { error: posUpErr } = await admin
              .from('open_positions')
              .upsert(posRows, { onConflict: 'user_id,provider,symbol' });
            if (posUpErr) console.error('[sync-futures-trades] open_positions upsert', posUpErr.message);
            else positionsSynced = posRows.length;
          }

          // Remove stale rows for this user/provider not in the current active set
          const { data: existingPos } = await admin
            .from('open_positions')
            .select('id, symbol')
            .eq('user_id', userId)
            .eq('provider', provider);
          const staleIds = (existingPos ?? [])
            .filter(r => !activeSymbols.has(r.symbol as string))
            .map(r => r.id);
          if (staleIds.length > 0) {
            await admin.from('open_positions').delete().in('id', staleIds);
          }
        } else {
          console.error('[sync-futures-trades] positions fetch failed', posResult.detail);
        }
      } catch (e) {
        console.error('[sync-futures-trades] positions sync threw', (e as Error).message);
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
      fetched: closedEntries.length,
      inserted,
      skipped,
      wiped,
      syncedCount: inserted,
      positionsSynced,
    });
  } catch (e) {
    // Final safety net — never leak a raw 500
    const msg = (e instanceof Error ? e.message : String(e)) || 'unhandled_exception';
    console.error('[sync-futures-trades] unhandled', msg);
    return json({ ok: false, error: 'unhandled_exception', detail: msg }, 422);
  }
});
