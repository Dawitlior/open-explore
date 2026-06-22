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

// ============== MEXC Futures (history_orders → round-trip by positionId) ==============
// MEXC does NOT expose per-key permission introspection. Read-only intent
// is enforced via the guided key flow + ORCA's structural no-write posture.
// MEXC keys without IP-binding expire after 90 days — Supabase Edge has no
// fixed egress IP, so we instruct users not to bind. Sync failures from
// expired keys should surface to the user via the "needs renewal" UX.

const MEXC_FUTURES_BASE = 'https://contract.mexc.com';
const MEXC_SPOT_BASE = 'https://api.mexc.com';

interface MexcFuturesOrder {
  orderId: string;
  symbol: string;
  positionId: number;
  side: number; // 1=open long, 2=close short, 3=open short, 4=close long
  dealAvgPrice: string | number;
  dealVol: string | number;
  profit?: string | number;
  takerFee?: string | number;
  makerFee?: string | number;
  leverage?: string | number;
  createTime: number;
  updateTime?: number;
}

async function mexcFuturesGet(
  apiKey: string, apiSecret: string, path: string, params: Record<string, string> = {},
): Promise<{ ok: true; body: { success?: boolean; data?: unknown; message?: string } } | BybitFetchError> {
  const ts = Date.now().toString();
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  const signature = await hmacSha256Hex(apiSecret, apiKey + ts + sorted);
  const url = sorted ? `${MEXC_FUTURES_BASE}${path}?${sorted}` : `${MEXC_FUTURES_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        'ApiKey': apiKey,
        'Request-Time': ts,
        'Signature': signature,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }
  if (res.status >= 500) return { ok: false, status: 503, error: 'exchange_unreachable', detail: `mexc_http_${res.status}` };
  let body: { success?: boolean; data?: unknown; message?: string } = {};
  try { body = await res.json(); } catch { /* keep {} */ }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, error: 'mexc_futures_rejected', detail: body?.message || `status ${res.status}` };
  }
  if (!res.ok || body.success === false) {
    return { ok: false, status: 422, error: 'mexc_futures_rejected', detail: body?.message || `status ${res.status}` };
  }
  return { ok: true, body };
}

async function fetchMexcFuturesOrders(
  apiKey: string, apiSecret: string,
): Promise<{ ok: true; list: MexcFuturesOrder[] } | BybitFetchError> {
  const all: MexcFuturesOrder[] = [];
  const MAX_PAGES = 50;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await mexcFuturesGet(apiKey, apiSecret, '/api/v1/private/order/list/history_orders', {
      page_num: String(page),
      page_size: '100',
      states: '3', // 3 = filled/completed (MEXC contract API)
    });
    if (!r.ok) return r;
    const data = Array.isArray(r.body.data) ? (r.body.data as MexcFuturesOrder[]) : [];
    all.push(...data);
    if (data.length < 100) break;
  }
  return { ok: true, list: all };
}

function weightedAvg(rows: MexcFuturesOrder[], priceKey: 'dealAvgPrice', volKey: 'dealVol'): number {
  const totalVol = rows.reduce((s, r) => s + Number(r[volKey] || 0), 0);
  if (totalVol === 0) return 0;
  return rows.reduce((s, r) => s + Number(r[priceKey] || 0) * Number(r[volKey] || 0), 0) / totalVol;
}

function mexcFuturesToTrades(orders: MexcFuturesOrder[], provider: string): BybitNormalized[] {
  const byPos = new Map<number, MexcFuturesOrder[]>();
  for (const o of orders) {
    if (o.positionId == null) continue;
    if (!byPos.has(o.positionId)) byPos.set(o.positionId, []);
    byPos.get(o.positionId)!.push(o);
  }
  const out: BybitNormalized[] = [];
  for (const [positionId, group] of byPos) {
    const opens = group.filter((o) => o.side === 1 || o.side === 3);
    const closes = group.filter((o) => o.side === 2 || o.side === 4);
    if (opens.length === 0 || closes.length === 0) continue; // not a completed round-trip

    const direction: 'Long' | 'Short' = opens[0].side === 1 ? 'Long' : 'Short';
    const symbol = group[0].symbol;
    const entry = weightedAvg(opens, 'dealAvgPrice', 'dealVol');
    const exit = weightedAvg(closes, 'dealAvgPrice', 'dealVol');
    const size = closes.reduce((s, o) => s + Number(o.dealVol || 0), 0);
    const pnl = closes.reduce((s, o) => s + Number(o.profit || 0), 0);
    const fees = group.reduce((s, o) => s + Number(o.takerFee || 0) + Number(o.makerFee || 0), 0);
    const lev = Number(opens[0].leverage) || 1;
    const openMs = Math.min(...opens.map((o) => Number(o.createTime) || Date.now()));
    const closeMs = Math.max(...closes.map((o) => Number(o.updateTime) || Number(o.createTime) || openMs));
    const d = new Date(closeMs);
    const iso = d.toISOString().slice(0, 19).replace('T', ' ');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const winLoss: 'Win' | 'Loss' | 'Break Even' = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Break Even';
    const externalId = `mexc:${symbol}:pos${positionId}`;
    out.push({
      legacy: {
        date: iso, day: dayName, coin: symbol, direction,
        orderType: 'Market',
        entry, stopLoss: 0, exit,
        returnR: 0, winLoss, risk: 0, expectedLoss: 0,
        pnl, deviation: 0,
        positionSize: size * entry,
        leverage: lev, riskPct: 0, rules: true,
        comments: `__CLOSED:${externalId}__ ${provider} fees:${fees.toFixed(6)} orders:${group.map((o) => o.orderId).join(',')}`,
        exchange_provider: provider,
        exchange_exec_id: externalId,
      },
      provenance: {
        broker_id: provider,
        source_type: 'api_sync',
        asset_class: 'crypto',
        external_id: externalId,
        opened_at: new Date(openMs).toISOString(),
        closed_at: new Date(closeMs).toISOString(),
      },
    });
  }
  return out;
}

// ============== MEXC Spot (myTrades per symbol → FIFO closed lots) ==============
interface MexcSpotFill {
  id: string | number;
  symbol: string;
  price: string | number;
  qty: string | number;
  commission?: string | number;
  time: number;
  isBuyer: boolean;
}

async function mexcSpotSignedGet(
  apiKey: string, apiSecret: string, path: string, params: Record<string, string> = {},
): Promise<{ ok: true; body: unknown } | BybitFetchError> {
  const qs = new URLSearchParams({ ...params, timestamp: Date.now().toString(), recvWindow: '5000' }).toString();
  const signature = await hmacSha256Hex(apiSecret, qs);
  let res: Response;
  try {
    res = await fetch(`${MEXC_SPOT_BASE}${path}?${qs}&signature=${signature}`, {
      method: 'GET',
      headers: { 'X-MEXC-APIKEY': apiKey },
    });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }
  if (res.status >= 500) return { ok: false, status: 503, error: 'exchange_unreachable', detail: `mexc_http_${res.status}` };
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, error: 'mexc_spot_rejected', detail: text.slice(0, 240) };
  }
  if (res.status >= 400) {
    return { ok: false, status: 422, error: 'mexc_spot_rejected', detail: text.slice(0, 240) };
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  return { ok: true, body };
}

async function discoverMexcSpotSymbols(
  apiKey: string, apiSecret: string,
): Promise<{ ok: true; symbols: string[] } | BybitFetchError> {
  const r = await mexcSpotSignedGet(apiKey, apiSecret, '/api/v3/account');
  if (!r.ok) return r;
  const balances = ((r.body as { balances?: Array<{ asset: string; free?: string; locked?: string }> })?.balances) ?? [];
  const set = new Set<string>();
  for (const b of balances) {
    const free = Number(b.free || 0), locked = Number(b.locked || 0);
    if ((free + locked) > 0 && b.asset && b.asset !== 'USDT') set.add(`${b.asset}USDT`);
  }
  return { ok: true, symbols: [...set] };
}

async function fetchMexcSpotFills(
  apiKey: string, apiSecret: string, symbol: string,
): Promise<{ ok: true; list: MexcSpotFill[] } | BybitFetchError> {
  const fills: MexcSpotFill[] = [];
  let fromId: string | undefined;
  const MAX_PAGES = 50;
  for (let i = 0; i < MAX_PAGES; i++) {
    const params: Record<string, string> = { symbol, limit: '1000' };
    if (fromId) params.fromId = fromId;
    const r = await mexcSpotSignedGet(apiKey, apiSecret, '/api/v3/myTrades', params);
    if (!r.ok) return r;
    const rows = Array.isArray(r.body) ? (r.body as MexcSpotFill[]) : [];
    if (rows.length === 0) break;
    fills.push(...rows);
    const lastId = Number(rows[rows.length - 1].id);
    if (!Number.isFinite(lastId)) break;
    fromId = String(lastId + 1);
    if (rows.length < 1000) break;
  }
  return { ok: true, list: fills };
}

function mexcSpotToTrades(symbol: string, fills: MexcSpotFill[], provider: string): BybitNormalized[] {
  const sorted = [...fills].sort((a, b) =>
    (Number(a.time) - Number(b.time)) || (Number(a.id) - Number(b.id)),
  );
  const buyQueue: { price: number; qty: number; fee: number; time: number }[] = [];
  const out: BybitNormalized[] = [];

  for (const f of sorted) {
    const price = Number(f.price) || 0;
    const qty = Number(f.qty) || 0;
    const fee = Number(f.commission || 0);
    if (f.isBuyer) {
      buyQueue.push({ price, qty, fee, time: Number(f.time) });
      continue;
    }
    let remaining = qty;
    let matchIndex = 0;
    while (remaining > 1e-12 && buyQueue.length > 0) {
      const lot = buyQueue[0];
      const matched = Math.min(remaining, lot.qty);
      // §3.1 fee-allocation fix: consume the lot's remaining fee proportionally
      // as we consume its qty, so a lot split across multiple sells does NOT
      // get its full fee charged twice.
      const portion = lot.qty > 0 ? matched / lot.qty : 0;
      const buyFeePortion = lot.fee * portion;
      lot.fee -= buyFeePortion;
      const sellFeePortion = qty > 0 ? fee * (matched / qty) : 0;
      const pnl = (price - lot.price) * matched - buyFeePortion - sellFeePortion;
      const externalId = `mexc:${symbol}:spot:${f.id}:${matchIndex}`;
      const closeMs = Number(f.time);
      const d = new Date(closeMs);
      const iso = d.toISOString().slice(0, 19).replace('T', ' ');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const winLoss: 'Win' | 'Loss' | 'Break Even' = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Break Even';
      out.push({
        legacy: {
          date: iso, day: dayName, coin: symbol, direction: 'Long',
          orderType: 'Market',
          entry: lot.price, stopLoss: 0, exit: price,
          returnR: 0, winLoss, risk: 0, expectedLoss: 0,
          pnl, deviation: 0,
          positionSize: matched * lot.price,
          leverage: 1, riskPct: 0, rules: true,
          comments: `__CLOSED:${externalId}__ ${provider} fees:${(buyFeePortion + sellFeePortion).toFixed(8)}`,
          exchange_provider: provider,
          exchange_exec_id: externalId,
        },
        provenance: {
          broker_id: provider,
          source_type: 'api_sync',
          asset_class: 'crypto',
          external_id: externalId,
          opened_at: new Date(lot.time).toISOString(),
          closed_at: new Date(closeMs).toISOString(),
        },
      });
      lot.qty -= matched;
      remaining -= matched;
      matchIndex++;
      if (lot.qty <= 1e-12) buyQueue.shift();
    }
    // remaining > 0 with empty queue → honest: skip (sell with no prior buy in window)
  }
  return out;
}

// ============== Shared SHA-512 / HMAC-SHA-512 (Gate + Kraken) ==============
async function sha512Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hmacSha512Hex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============== Gate.io USDT-M Futures (position_close → one row = one trade) ==============
const GATE_BASE = 'https://api.gateio.ws';
const GATE_PREFIX = '/api/v4';

interface GateClosedPosition {
  time?: number;
  contract?: string;
  side?: string;             // 'long' | 'short' (closed-position side)
  pnl?: string | number;
  pnl_fee?: string | number;
  pnl_pnl?: string | number;
  text?: string;
  accum_size?: string | number;
  long_price?: string | number;
  short_price?: string | number;
  entry_price?: string | number;
  exit_price?: string | number;
  first_open_time?: number;
}

async function gateSignedGet(
  apiKey: string, apiSecret: string, path: string, query: string,
): Promise<{ ok: true; body: unknown } | BybitFetchError> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const bodyHash = await sha512Hex('');
  const sigString = `GET\n${GATE_PREFIX}${path}\n${query}\n${bodyHash}\n${ts}`;
  const sign = await hmacSha512Hex(apiSecret, sigString);
  const url = query ? `${GATE_BASE}${GATE_PREFIX}${path}?${query}` : `${GATE_BASE}${GATE_PREFIX}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { KEY: apiKey, Timestamp: ts, SIGN: sign, Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }
  if (res.status >= 500) return { ok: false, status: 503, error: 'exchange_unreachable', detail: `gate_http_${res.status}` };
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, error: 'gate_futures_rejected', detail: text.slice(0, 240) };
  }
  if (res.status >= 400) {
    return { ok: false, status: 422, error: 'gate_futures_rejected', detail: text.slice(0, 240) };
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = []; }
  return { ok: true, body };
}

async function fetchGateFuturesClosed(
  apiKey: string, apiSecret: string,
): Promise<{ ok: true; list: GateClosedPosition[] } | BybitFetchError> {
  const all: GateClosedPosition[] = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const q = `limit=100&offset=${offset}`;
    const r = await gateSignedGet(apiKey, apiSecret, '/futures/usdt/position_close', q);
    if (!r.ok) return r;
    const rows = Array.isArray(r.body) ? (r.body as GateClosedPosition[]) : [];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return { ok: true, list: all };
}

function gateFuturesToTrades(rows: GateClosedPosition[], provider: string): BybitNormalized[] {
  const out: BybitNormalized[] = [];
  for (const r of rows) {
    const symbol = String(r.contract || '');
    if (!symbol) continue;
    const direction: 'Long' | 'Short' = String(r.side || '').toLowerCase() === 'short' ? 'Short' : 'Long';
    const entry = Number(r.long_price ?? r.entry_price ?? 0);
    const exit = Number(r.short_price ?? r.exit_price ?? 0);
    const size = Math.abs(Number(r.accum_size ?? 0));
    const pnl = Number(r.pnl ?? r.pnl_pnl ?? 0);
    const fees = Number(r.pnl_fee ?? 0);
    const closeMs = Number(r.time ?? 0) * 1000 || Date.now();
    const openMs = r.first_open_time ? Number(r.first_open_time) * 1000 : closeMs;
    const externalId = `gate_futures:${symbol}:${r.time ?? ''}`;
    const d = new Date(closeMs);
    const iso = d.toISOString().slice(0, 19).replace('T', ' ');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const winLoss: 'Win' | 'Loss' | 'Break Even' = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Break Even';
    out.push({
      legacy: {
        date: iso, day: dayName, coin: symbol, direction,
        orderType: 'Market',
        entry, stopLoss: 0, exit,
        returnR: 0, winLoss, risk: 0, expectedLoss: 0,
        pnl, deviation: 0,
        positionSize: size * (entry || exit || 0),
        leverage: 0, riskPct: 0, rules: true,
        comments: `__CLOSED:${externalId}__ ${provider} fees:${fees.toFixed(6)}`,
        exchange_provider: provider,
        exchange_exec_id: externalId,
      },
      provenance: {
        broker_id: provider,
        source_type: 'api_sync',
        asset_class: 'crypto',
        external_id: externalId,
        opened_at: new Date(openMs).toISOString(),
        closed_at: new Date(closeMs).toISOString(),
      },
    });
  }
  return out;
}

// ============== Kraken Futures (fills → generalised long+short FIFO) ==============
const KRAKEN_FX_BASE = 'https://futures.kraken.com';

interface KrakenFill {
  fill_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  size: number | string;
  price: number | string;
  fillTime: string;       // ISO string
  fillType?: string;
  fee?: number | string;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
async function krakenAuthent(apiSecret: string, postData: string, nonce: string, endpointPath: string): Promise<string> {
  let secretBytes: Uint8Array;
  try { secretBytes = b64ToBytes(apiSecret); }
  catch { secretBytes = new TextEncoder().encode(apiSecret); }
  const sha256 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(postData + nonce + endpointPath));
  const key = await crypto.subtle.importKey('raw', secretBytes,
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new Uint8Array(sha256));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function krakenSignedGet(
  apiKey: string, apiSecret: string, endpointPath: string, query = '',
): Promise<{ ok: true; body: { result?: string; fills?: KrakenFill[]; error?: string } } | BybitFetchError> {
  const nonce = Date.now().toString();
  const authent = await krakenAuthent(apiSecret, query, nonce, endpointPath);
  const url = query
    ? `${KRAKEN_FX_BASE}/derivatives${endpointPath}?${query}`
    : `${KRAKEN_FX_BASE}/derivatives${endpointPath}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { APIKey: apiKey, Authent: authent, Nonce: nonce, Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }
  if (res.status >= 500) return { ok: false, status: 503, error: 'exchange_unreachable', detail: `kraken_http_${res.status}` };
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, error: 'kraken_futures_rejected', detail: text.slice(0, 240) };
  }
  if (res.status >= 400) {
    return { ok: false, status: 422, error: 'kraken_futures_rejected', detail: text.slice(0, 240) };
  }
  let body: { result?: string; fills?: KrakenFill[]; error?: string };
  try { body = JSON.parse(text); } catch { body = {}; }
  if (body.result !== 'success') {
    return { ok: false, status: 422, error: 'kraken_futures_rejected', detail: body.error || 'kraken_unsuccess' };
  }
  return { ok: true, body };
}

async function fetchKrakenFills(
  apiKey: string, apiSecret: string,
): Promise<{ ok: true; list: KrakenFill[] } | BybitFetchError> {
  const r = await krakenSignedGet(apiKey, apiSecret, '/api/v3/fills');
  if (!r.ok) return r;
  return { ok: true, list: Array.isArray(r.body.fills) ? r.body.fills : [] };
}

/**
 * Generalised FIFO for fills with long + short support.
 * Per-symbol signed inventory: a BUY adds to longQueue, or closes shortQueue
 * first; a SELL adds to shortQueue, or closes longQueue first. Each closed
 * lot emits one trade. Fees consumed proportionally (same §3.1 rule).
 */
function krakenFillsToTrades(fills: KrakenFill[], provider: string): BybitNormalized[] {
  const out: BybitNormalized[] = [];
  const bySymbol = new Map<string, KrakenFill[]>();
  for (const f of fills) {
    if (!f?.symbol) continue;
    if (!bySymbol.has(f.symbol)) bySymbol.set(f.symbol, []);
    bySymbol.get(f.symbol)!.push(f);
  }
  for (const [symbol, list] of bySymbol) {
    const sorted = [...list].sort((a, b) => Date.parse(a.fillTime) - Date.parse(b.fillTime));
    const longQ: { price: number; qty: number; fee: number; time: number }[] = [];
    const shortQ: { price: number; qty: number; fee: number; time: number }[] = [];

    for (const f of sorted) {
      const price = Number(f.price) || 0;
      const qty = Math.abs(Number(f.size) || 0);
      const fee = Number(f.fee || 0);
      const tMs = Date.parse(f.fillTime);
      if (!qty) continue;

      const isBuy = f.side === 'buy';
      const closingQueue = isBuy ? shortQ : longQ;
      const openingQueue = isBuy ? longQ : shortQ;
      const openedDirection: 'Long' | 'Short' = isBuy ? 'Short' : 'Long';

      let remaining = qty;
      let remainingFee = fee;
      let matchIndex = 0;

      while (remaining > 1e-12 && closingQueue.length > 0) {
        const lot = closingQueue[0];
        const matched = Math.min(remaining, lot.qty);
        const portion = lot.qty > 0 ? matched / lot.qty : 0;
        const lotFeePortion = lot.fee * portion;
        lot.fee -= lotFeePortion;
        const fillFeePortion = qty > 0 ? remainingFee * (matched / remaining) : 0;
        remainingFee -= fillFeePortion;

        const entry = lot.price;
        const exit = price;
        const pnl = openedDirection === 'Long'
          ? (exit - entry) * matched - lotFeePortion - fillFeePortion
          : (entry - exit) * matched - lotFeePortion - fillFeePortion;
        const externalId = `kraken_futures:${symbol}:${f.fill_id}:${matchIndex}`;
        const d = new Date(tMs);
        const iso = d.toISOString().slice(0, 19).replace('T', ' ');
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        const winLoss: 'Win' | 'Loss' | 'Break Even' = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Break Even';
        out.push({
          legacy: {
            date: iso, day: dayName, coin: symbol, direction: openedDirection,
            orderType: 'Market',
            entry, stopLoss: 0, exit,
            returnR: 0, winLoss, risk: 0, expectedLoss: 0,
            pnl, deviation: 0,
            positionSize: matched * entry,
            leverage: 0, riskPct: 0, rules: true,
            comments: `__CLOSED:${externalId}__ ${provider} fees:${(lotFeePortion + fillFeePortion).toFixed(8)}`,
            exchange_provider: provider,
            exchange_exec_id: externalId,
          },
          provenance: {
            broker_id: provider,
            source_type: 'api_sync',
            asset_class: 'crypto',
            external_id: externalId,
            opened_at: new Date(lot.time).toISOString(),
            closed_at: new Date(tMs).toISOString(),
          },
        });
        lot.qty -= matched;
        remaining -= matched;
        matchIndex++;
        if (lot.qty <= 1e-12) closingQueue.shift();
      }
      if (remaining > 1e-12) {
        // Opens (or grows) a position on the opposite side.
        openingQueue.push({ price, qty: remaining, fee: remainingFee, time: tMs });
      }
    }
  }
  return out;
}

// ============== Generalised spot FIFO (Crypto.com + Coinbase) ==============
// Long-only spot FIFO with §3.1 proportional-fee fix. Same algorithm as
// MEXC spot, but parametrised so external_id and broker tag are per-provider
// and so we can plug in any spot exchange whose fills expose isBuyer/price/
// qty/commission/time/id. The pure-TS mirror lives in
// `src/lib/brokers/_recon/_spot_fifo.ts` and is covered by recon tests.
interface SpotFill {
  id: string | number;
  symbol: string;
  price: number | string;
  qty: number | string;
  commission?: number | string;
  time: number;
  isBuyer: boolean;
}

function spotFifoTrades(provider: string, symbol: string, fills: SpotFill[]): BybitNormalized[] {
  const sorted = [...fills].sort(
    (a, b) => (Number(a.time) - Number(b.time)) || (String(a.id) < String(b.id) ? -1 : 1),
  );
  const buyQueue: { price: number; qty: number; fee: number; time: number }[] = [];
  const out: BybitNormalized[] = [];

  for (const f of sorted) {
    const price = Number(f.price) || 0;
    const qty = Math.abs(Number(f.qty) || 0);
    const fee = Math.abs(Number(f.commission || 0));
    if (!qty) continue;

    if (f.isBuyer) {
      buyQueue.push({ price, qty, fee, time: Number(f.time) });
      continue;
    }
    const sellQty = qty;
    const sellFee = fee;
    let remaining = qty;
    let matchIndex = 0;
    while (remaining > 1e-12 && buyQueue.length > 0) {
      const lot = buyQueue[0];
      const matched = Math.min(remaining, lot.qty);
      const portion = lot.qty > 0 ? matched / lot.qty : 0;
      const buyFeePortion = lot.fee * portion;
      lot.fee -= buyFeePortion;
      const sellFeePortion = sellQty > 0 ? sellFee * (matched / sellQty) : 0;
      const pnl = (price - lot.price) * matched - buyFeePortion - sellFeePortion;
      const externalId = `${provider}:${symbol}:${f.id}:${matchIndex}`;
      const closeMs = Number(f.time);
      const d = new Date(closeMs);
      const iso = d.toISOString().slice(0, 19).replace('T', ' ');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const winLoss: 'Win' | 'Loss' | 'Break Even' = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Break Even';
      out.push({
        legacy: {
          date: iso, day: dayName, coin: symbol, direction: 'Long',
          orderType: 'Market',
          entry: lot.price, stopLoss: 0, exit: price,
          returnR: 0, winLoss, risk: 0, expectedLoss: 0,
          pnl, deviation: 0,
          positionSize: matched * lot.price,
          leverage: 1, riskPct: 0, rules: true,
          comments: `__CLOSED:${externalId}__ ${provider} fees:${(buyFeePortion + sellFeePortion).toFixed(8)}`,
          exchange_provider: provider,
          exchange_exec_id: externalId,
        },
        provenance: {
          broker_id: provider,
          source_type: 'api_sync',
          asset_class: 'crypto',
          external_id: externalId,
          opened_at: new Date(lot.time).toISOString(),
          closed_at: new Date(closeMs).toISOString(),
        },
      });
      lot.qty -= matched;
      remaining -= matched;
      matchIndex++;
      if (lot.qty <= 1e-12) buyQueue.shift();
    }
  }
  return out;
}

// ============== Crypto.com Exchange v1 (private/get-trades → spot FIFO) ==============
const CDC_BASE = 'https://api.crypto.com/exchange/v1';

function cdcParamString(params: Record<string, unknown>): string {
  return Object.keys(params).sort().map((k) => {
    const v = (params as Record<string, unknown>)[k];
    if (v === null || v === undefined) return k + 'null';
    if (Array.isArray(v)) return k + v.map((x) =>
      typeof x === 'object' && x !== null ? cdcParamString(x as Record<string, unknown>) : String(x)
    ).join('');
    if (typeof v === 'object') return k + cdcParamString(v as Record<string, unknown>);
    return k + String(v);
  }).join('');
}

interface CryptoComTrade {
  trade_id: string | number;
  instrument_name: string;
  side: string;
  traded_price: string | number;
  traded_quantity: string | number;
  fees?: string | number;
  create_time: number;
}

async function cdcSignedPost(
  apiKey: string, apiSecret: string, method: string, params: Record<string, unknown> = {},
): Promise<{ ok: true; body: { code?: number; result?: { data?: CryptoComTrade[] }; message?: string } } | BybitFetchError> {
  const id = Date.now();
  const nonce = Date.now();
  const sig = await hmacSha256Hex(apiSecret, method + id + apiKey + cdcParamString(params) + nonce);
  const body = JSON.stringify({ id, method, api_key: apiKey, params, nonce, sig });
  let res: Response;
  try {
    res = await fetch(`${CDC_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }
  if (res.status >= 500) return { ok: false, status: 503, error: 'exchange_unreachable', detail: `cdc_http_${res.status}` };
  const text = await res.text();
  let json: { code?: number; result?: { data?: CryptoComTrade[] }; message?: string };
  try { json = JSON.parse(text); } catch { json = {}; }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, error: 'crypto_com_rejected', detail: json?.message || `status ${res.status}` };
  }
  if (!res.ok || json?.code !== 0) {
    return { ok: false, status: 422, error: 'crypto_com_rejected', detail: json?.message || `code ${json?.code ?? res.status}` };
  }
  return { ok: true, body: json };
}

async function fetchCryptoComTrades(
  apiKey: string, apiSecret: string,
): Promise<{ ok: true; list: CryptoComTrade[] } | BybitFetchError> {
  const r = await cdcSignedPost(apiKey, apiSecret, 'private/get-trades', {});
  if (!r.ok) return r;
  const rows = Array.isArray(r.body?.result?.data) ? r.body.result!.data! : [];
  return { ok: true, list: rows };
}

function cryptoComToTrades(rows: CryptoComTrade[], provider: string): BybitNormalized[] {
  const bySymbol = new Map<string, CryptoComTrade[]>();
  for (const r of rows) {
    if (!r?.instrument_name) continue;
    if (!bySymbol.has(r.instrument_name)) bySymbol.set(r.instrument_name, []);
    bySymbol.get(r.instrument_name)!.push(r);
  }
  const out: BybitNormalized[] = [];
  for (const [symbol, list] of bySymbol) {
    const fills: SpotFill[] = list.map((t) => ({
      id: t.trade_id,
      symbol: t.instrument_name,
      price: Number(t.traded_price),
      qty: Number(t.traded_quantity),
      commission: Math.abs(Number(t.fees ?? 0)),
      time: Number(t.create_time),
      isBuyer: String(t.side).toUpperCase() === 'BUY',
    }));
    out.push(...spotFifoTrades(provider, symbol, fills));
  }
  return out;
}

// ============== Coinbase Advanced Trade (JWT + PEM, fills → spot FIFO) ==============
async function coinbaseJwt(keyName: string, pemSecret: string, method: string, path: string): Promise<string> {
  const jose = await import('https://esm.sh/jose@5');
  const isEd = /BEGIN PRIVATE KEY/.test(pemSecret) && !/BEGIN EC PRIVATE KEY/.test(pemSecret);
  const alg = isEd ? 'EdDSA' : 'ES256';
  const key = await jose.importPKCS8(pemSecret, alg);
  const uri = `${method} api.coinbase.com${path}`;
  return await new jose.SignJWT({ sub: keyName, uri })
    .setProtectedHeader({ alg, kid: keyName, nonce: crypto.randomUUID(), typ: 'JWT' })
    .setIssuedAt()
    .setNotBefore('0s')
    .setExpirationTime('120s')
    .setIssuer('cdp')
    .setAudience(['retail_rest_api_proxy'])
    .sign(key);
}

interface CoinbaseFill {
  trade_id: string | number;
  product_id: string;
  side: string;
  price: string | number;
  size: string | number;
  commission?: string | number;
  trade_time: string;
}

async function coinbaseGet(
  keyName: string, pemSecret: string, path: string, query = '',
): Promise<{ ok: true; body: { fills?: CoinbaseFill[]; cursor?: string; message?: string } } | BybitFetchError> {
  let jwt: string;
  try { jwt = await coinbaseJwt(keyName, pemSecret, 'GET', path); }
  catch (e) { return { ok: false, status: 422, error: 'coinbase_rejected', detail: `pem_import_failed: ${(e as Error).message}` }; }
  const url = query ? `https://api.coinbase.com${path}?${query}` : `https://api.coinbase.com${path}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, status: 503, error: 'exchange_unreachable', detail: (e as Error).message || 'fetch_failed' };
  }
  if (res.status >= 500) return { ok: false, status: 503, error: 'exchange_unreachable', detail: `coinbase_http_${res.status}` };
  const text = await res.text();
  let body: { fills?: CoinbaseFill[]; cursor?: string; message?: string };
  try { body = JSON.parse(text); } catch { body = {}; }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, error: 'coinbase_rejected', detail: body?.message || `status ${res.status}` };
  }
  if (res.status >= 400) {
    return { ok: false, status: 422, error: 'coinbase_rejected', detail: body?.message || `status ${res.status}` };
  }
  return { ok: true, body };
}

async function fetchCoinbaseFills(
  keyName: string, pemSecret: string,
): Promise<{ ok: true; list: CoinbaseFill[] } | BybitFetchError> {
  const all: CoinbaseFill[] = [];
  let cursor = '';
  const MAX_PAGES = 50;
  for (let i = 0; i < MAX_PAGES; i++) {
    const query = cursor ? `limit=100&cursor=${encodeURIComponent(cursor)}` : 'limit=100';
    const r = await coinbaseGet(keyName, pemSecret, '/api/v3/brokerage/orders/historical/fills', query);
    if (!r.ok) return r;
    const fills = Array.isArray(r.body.fills) ? r.body.fills : [];
    all.push(...fills);
    const nextCursor = (r.body.cursor || '').toString();
    if (!nextCursor || nextCursor === cursor || fills.length === 0) break;
    cursor = nextCursor;
  }
  return { ok: true, list: all };
}

function coinbaseToTrades(rows: CoinbaseFill[], provider: string): BybitNormalized[] {
  const bySymbol = new Map<string, CoinbaseFill[]>();
  for (const r of rows) {
    if (!r?.product_id) continue;
    if (!bySymbol.has(r.product_id)) bySymbol.set(r.product_id, []);
    bySymbol.get(r.product_id)!.push(r);
  }
  const out: BybitNormalized[] = [];
  for (const [symbol, list] of bySymbol) {
    const fills: SpotFill[] = list.map((f) => ({
      id: f.trade_id,
      symbol: f.product_id,
      price: Number(f.price),
      qty: Number(f.size),
      commission: Math.abs(Number(f.commission ?? 0)),
      time: new Date(f.trade_time).getTime(),
      isBuyer: String(f.side).toUpperCase() === 'BUY',
    }));
    out.push(...spotFifoTrades(provider, symbol, fills));
  }
  return out;
}

// Provider dispatch table — used by the handler's bulk path.
type ProviderId =
  | 'bybit' | 'binance'
  | 'mexc_futures' | 'mexc_spot'
  | 'gate_futures' | 'kraken_futures'
  | 'crypto_com' | 'coinbase';
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
  if (provider === 'mexc_futures') {
    const r = await fetchMexcFuturesOrders(apiKey, apiSecret);
    if (!r.ok) return r;
    return {
      ok: true,
      list: mexcFuturesToTrades(r.list, provider).map(n => ({ ...n, key: n.provenance.external_id })),
    };
  }
  if (provider === 'mexc_spot') {
    const sym = await discoverMexcSpotSymbols(apiKey, apiSecret);
    if (!sym.ok) return sym;
    const all: BybitNormalized[] = [];
    for (const s of sym.symbols) {
      const f = await fetchMexcSpotFills(apiKey, apiSecret, s);
      if (!f.ok) return f;
      all.push(...mexcSpotToTrades(s, f.list, provider));
    }
    return { ok: true, list: all.map(n => ({ ...n, key: n.provenance.external_id })) };
  }
  if (provider === 'gate_futures') {
    const r = await fetchGateFuturesClosed(apiKey, apiSecret);
    if (!r.ok) return r;
    return {
      ok: true,
      list: gateFuturesToTrades(r.list, provider).map(n => ({ ...n, key: n.provenance.external_id })),
    };
  }
  if (provider === 'kraken_futures') {
    const r = await fetchKrakenFills(apiKey, apiSecret);
    if (!r.ok) return r;
    return {
      ok: true,
      list: krakenFillsToTrades(r.list, provider).map(n => ({ ...n, key: n.provenance.external_id })),
    };
  }
  if (provider === 'crypto_com') {
    const r = await fetchCryptoComTrades(apiKey, apiSecret);
    if (!r.ok) return r;
    return {
      ok: true,
      list: cryptoComToTrades(r.list, provider).map(n => ({ ...n, key: n.provenance.external_id })),
    };
  }
  if (provider === 'coinbase') {
    const r = await fetchCoinbaseFills(apiKey, apiSecret);
    if (!r.ok) return r;
    return {
      ok: true,
      list: coinbaseToTrades(r.list, provider).map(n => ({ ...n, key: n.provenance.external_id })),
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
    const ALLOWED_PROVIDERS: ProviderId[] = ['bybit', 'binance', 'mexc_futures', 'mexc_spot', 'gate_futures', 'kraken_futures', 'crypto_com', 'coinbase'];
    if (!ALLOWED_PROVIDERS.includes(provider)) {
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
          opened_at: provenance.opened_at,
          closed_at: provenance.closed_at,
        });
        summary.push({ symbol: legacy.coin, pnl: legacy.pnl });
        nextId++;
      }
      if (rows.length > 0) {
        for (const ids of chunk(rows.map(r => r.external_id).filter(Boolean), 250)) {
          await admin.from('trades').delete().eq('user_id', userId).in('external_id', ids);
        }
        const { error: upErr } = await admin.from('trades')
          .insert(rows);
        if (upErr && !(upErr.code === '23505' || /duplicate key/i.test(upErr.message))) {
          return json({ ok: false, error: 'persist_failed', detail: upErr.message }, 422);
        }
      }
      return json({ ok: true, mode, added: rows.length, rows: summary });
    }


    // ---- Gap fix: kill-switch guard (MEXC providers at minimum) ----
    // If the user has engaged the live-risk kill switch, do NOT write any new
    // rows. Returns structured `sync_blocked_kill_switch` so the UI can show
    // the honest reason instead of a silent success.
    if (provider === 'mexc_futures' || provider === 'mexc_spot' || provider === 'gate_futures' || provider === 'kraken_futures' || provider === 'crypto_com' || provider === 'coinbase') {
      try {
        const { data: locks } = await admin
          .from('live_risk_locks')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        if (locks && locks.length > 0) {
          return json({ ok: false, error: 'sync_blocked_kill_switch', inserted: 0, wiped: 0 }, 423);
        }
      } catch (e) {
        // Non-fatal — if the lock table is unreachable, fall through rather than
        // block the user from syncing their own data.
        console.warn('[sync-futures-trades] kill-switch check failed', (e as Error).message);
      }
    }
    // Advisory lock: Supabase Edge → PostgREST has no persistent session, so
    // transaction-scoped pg_advisory_xact_lock cannot hold across the sync's
    // many HTTP calls. We rely on the per-user UI button being single-click
    // and the upsert layer being idempotent on external_id.

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
        .in('external_id', ids)
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
        opened_at: provenance.opened_at,
        closed_at: provenance.closed_at,
      });
      nextId++;
      inserted++;
    }


    if (rows.length > 0) {
      // Pre-dedupe the batch by the strictest unique key. Then try a bulk
      // insert; if it fails with 23505 (duplicate on EITHER unique index),
      // fall back to per-row inserts that swallow only dup-key errors so the
      // rest of the batch still lands.
      const seenKey = new Set<string>();
      const deduped = rows.filter(r => {
        const k = `${r.broker_id ?? ''}|${r.account_label ?? ''}|${r.external_id ?? ''}`;
        if (!r.external_id) return true;
        if (seenKey.has(k)) return false;
        seenKey.add(k);
        return true;
      });

      const bulk = await admin.from('trades').insert(deduped);
      if (bulk.error) {
        const isDup = bulk.error.code === '23505' || /duplicate key/i.test(bulk.error.message);
        if (!isDup) {
          return json({ ok: false, error: 'persist_failed', detail: bulk.error.message }, 422);
        }
        console.warn('[sync-futures-trades] bulk dup-key, per-row fallback:', bulk.error.message);
        let okCount = 0;
        let dupCount = 0;
        for (const r of deduped) {
          const one = await admin.from('trades').insert(r);
          if (!one.error) { okCount++; continue; }
          if (one.error.code === '23505' || /duplicate key/i.test(one.error.message)) {
            dupCount++; continue;
          }
          return json({ ok: false, error: 'persist_failed', detail: one.error.message }, 422);
        }
        inserted = okCount;
        skipped += dupCount;
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
