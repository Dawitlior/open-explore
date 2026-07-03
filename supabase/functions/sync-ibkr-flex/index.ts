// Phase 6: Interactive Brokers Flex Web Service sync engine.
//
// Two entry paths in ONE function:
//   1. User mode  — POST { provider:'ibkr_flex', label } with a JWT Bearer.
//   2. Cron mode  — POST { mode:'cron' } with header x-cron-secret matching
//                   env IBKR_SYNC_CRON_SECRET; iterates every active IBKR
//                   credential sequentially.
//
// Flow (per credential):
//   SendRequest → poll (1019 retries) → parse XML → FIFO reconstruct
//   → wipe+insert closed trades (idempotent on external_id)
//   → upsert open positions → prune closed → stamp credential status.
//
// Every failure path returns structured JSON — never a raw 500. The Flex
// token never appears in logs, responses, or error messages.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import {
  parseFlexXml,
  reconstructClosedTrades,
  crosscheckPnl,
  mapOpenPositions,
  type ClosedTrade,
  type FlexAccountStatement,
} from '../_shared/brokers/ibkr-flex.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

// ------------ Flex Web Service ------------
const FLEX_BASE = 'https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService';
const UA = 'ORCA-FlexSync/1.0';

interface FlexTicket {
  ok: true;
  referenceCode: string;
  url: string;
}
interface FlexFail {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
}

async function flexSendRequest(token: string, queryId: string): Promise<FlexTicket | FlexFail> {
  const url = `${FLEX_BASE}/SendRequest?t=${encodeURIComponent(token)}&q=${encodeURIComponent(queryId)}&v=3`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA, 'Accept': 'application/xml' } });
  } catch (e) {
    return { ok: false, code: 'network', message: `ibkr_unreachable: ${(e as Error).message}`, retryable: true };
  }
  const xml = await res.text();
  const parsed = parseFlexXml(xml);
  if (parsed.kind === 'error') {
    return { ok: false, code: parsed.code, message: parsed.message, retryable: false };
  }
  if (parsed.kind === 'in_progress') {
    // Shouldn't happen on SendRequest, but map defensively.
    return { ok: false, code: parsed.code, message: parsed.message, retryable: true };
  }
  // SendRequest returns FlexStatementResponse with ReferenceCode + Url on success.
  // parseFlexXml only surfaces failures for that envelope, so re-parse quickly.
  const ref = xml.match(/<ReferenceCode>(\d+)<\/ReferenceCode>/);
  const urlM = xml.match(/<Url>([^<]+)<\/Url>/);
  if (!ref || !urlM) {
    return { ok: false, code: 'unrecognized_send_response', message: 'SendRequest missing ReferenceCode/Url', retryable: false };
  }
  return { ok: true, referenceCode: ref[1], url: urlM[1].trim() };
}

async function flexGetStatement(
  baseUrl: string,
  token: string,
  ref: string,
): Promise<{ ok: true; xml: string } | FlexFail> {
  const url = `${baseUrl}?t=${encodeURIComponent(token)}&q=${encodeURIComponent(ref)}&v=3`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA, 'Accept': 'application/xml' } });
  } catch (e) {
    return { ok: false, code: 'network', message: `ibkr_unreachable: ${(e as Error).message}`, retryable: true };
  }
  const xml = await res.text();
  // Peek for failure envelope BEFORE full parse (cheaper and lets us
  // distinguish 1019 without paying the fast-xml-parser cost).
  const statusFail = /<FlexStatementResponse[^>]*>[\s\S]*?<Status>Fail<\/Status>/.test(xml);
  if (statusFail) {
    const code = (xml.match(/<ErrorCode>(\d+)<\/ErrorCode>/)?.[1]) ?? 'unknown';
    const message = (xml.match(/<ErrorMessage>([^<]+)<\/ErrorMessage>/)?.[1]) ?? 'Flex error';
    return { ok: false, code, message, retryable: code === '1019' || code === '1018' };
  }
  return { ok: true, xml };
}

/** Retryable 1019 poll: 3s, 5s, 8s, 13s, 21s. Returns xml or a fail. */
async function pollForStatement(
  url: string, token: string, ref: string,
): Promise<{ ok: true; xml: string } | FlexFail> {
  const waits = [3000, 5000, 8000, 13000, 21000];
  for (let i = 0; i < waits.length; i++) {
    await new Promise(r => setTimeout(r, waits[i]));
    const r = await flexGetStatement(url, token, ref);
    if (r.ok) return r;
    if (r.code === '1019') continue;
    if (r.code === '1018') {
      await new Promise(res => setTimeout(res, 30_000));
      const r2 = await flexGetStatement(url, token, ref);
      if (r2.ok) return r2;
      return { ok: false, code: r2.code, message: r2.message, retryable: true };
    }
    return r;
  }
  return { ok: false, code: '1019', message: 'Statement generation still in progress after budget', retryable: true };
}

// ------------ Error-code mapping ------------
function classifyFlexError(code: string, message: string): {
  status: 'expired' | 'error';
  machineCode: string;
  retryable: boolean;
  detail: string;
} {
  switch (code) {
    case '1012':
      return { status: 'expired', machineCode: 'token_expired', retryable: false, detail: message || 'Token has expired' };
    case '1015':
      return { status: 'error', machineCode: 'token_invalid', retryable: false, detail: message || 'Token is invalid' };
    case '1013':
      return { status: 'error', machineCode: 'ip_restricted', retryable: false, detail: 'Token has an IP restriction — ORCA has no fixed egress IP. Create a new token without IP binding.' };
    case '1014':
      return { status: 'error', machineCode: 'query_invalid', retryable: false, detail: message || 'Query ID is invalid' };
    case '1018':
      return { status: 'error', machineCode: 'rate_limited', retryable: true, detail: message || 'Too many requests' };
    case '1019':
      return { status: 'error', machineCode: 'report_not_ready', retryable: true, detail: 'Report not ready in time' };
    case 'parse_error':
      return { status: 'error', machineCode: 'parse_error', retryable: false, detail: message };
    case 'network':
      return { status: 'error', machineCode: 'unknown_provider_error', retryable: true, detail: message };
    default:
      return { status: 'error', machineCode: 'unknown_provider_error', retryable: false, detail: `${code}: ${message}` };
  }
}

// ------------ Legacy Trade shape (mirrors sync-futures-trades) ------------
interface LegacyTrade {
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

function mapClosedToLegacy(t: ClosedTrade): Omit<LegacyTrade, 'id' | 'balance'> {
  const d = new Date(t.closed_at);
  const iso = d.toISOString().slice(0, 19).replace('T', ' ');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const winLoss: 'Win' | 'Loss' | 'Break Even' =
    t.pnl > 0 ? 'Win' : t.pnl < 0 ? 'Loss' : 'Break Even';
  return {
    date: iso,
    day: dayName,
    coin: t.symbol,
    direction: t.direction,
    orderType: 'Market',
    entry: t.entry,
    stopLoss: 0,
    exit: t.exit,
    returnR: 0,
    winLoss,
    risk: 0,
    expectedLoss: 0,
    pnl: t.pnl,
    deviation: 0,
    positionSize: t.qty * t.entry * t.multiplier,
    leverage: 1,
    riskPct: 0,
    rules: true,
    comments: `__IBKR:${t.external_id}__ ${t.asset_category}/${t.currency} fees:${t.fees.toFixed(4)}`,
    exchange_provider: 'ibkr_flex',
    exchange_exec_id: t.external_id,
  };
}

function assetClassOf(cat: string): 'crypto' | 'equities' | 'futures' | 'options' | 'fx' | 'other' {
  switch (cat) {
    case 'STK': return 'equities';
    case 'FUT': return 'futures';
    case 'OPT':
    case 'FOP': return 'options';
    case 'CASH': return 'fx';
    case 'CRYPTO': return 'crypto';
    default: return 'other';
  }
}

// ------------ Per-credential pull ------------
interface CredRow {
  id: string;
  user_id: string;
  api_key: string;         // = Query ID (plaintext by design)
  portfolio_id: string;
  label: string | null;
}

interface SyncOutcome {
  ok: boolean;
  cred_id: string;
  inserted?: number;
  wiped?: number;
  positionsUpserted?: number;
  positionsRemoved?: number;
  pnlCrosscheck?: { ours: number; ibkr: number; delta: number; basis: string };
  warnings?: string[];
  error?: string;
  detail?: string;
  retryable?: boolean;
}

// deno-lint-ignore no-explicit-any
async function processCredential(admin: any, cred: CredRow): Promise<SyncOutcome> {
  const userId = cred.user_id;

  // 1) Decrypt token via SECURITY DEFINER RPC (same path as crypto).
  const { data: secretPlain, error: secErr } = await admin.rpc('read_exchange_secret', {
    p_user_id: userId,
    p_cred_id: cred.id,
  });
  const token = typeof secretPlain === 'string' ? secretPlain : null;
  if (secErr || !token) {
    return { ok: false, cred_id: cred.id, error: 'vault_read_failed', detail: secErr?.message ?? 'no_secret' };
  }
  const queryId = cred.api_key;
  if (!queryId) {
    return { ok: false, cred_id: cred.id, error: 'query_invalid', detail: 'Credential api_key (Query ID) is empty' };
  }

  // 2) SendRequest.
  const ticket = await flexSendRequest(token, queryId);
  if (!ticket.ok) {
    const c = classifyFlexError(ticket.code, ticket.message);
    await admin.from('exchange_credentials')
      .update({ status: c.status, last_error: c.detail })
      .eq('id', cred.id);
    return { ok: false, cred_id: cred.id, error: c.machineCode, detail: c.detail, retryable: c.retryable };
  }

  // 3) Poll for statement.
  const stmt = await pollForStatement(ticket.url, token, ticket.referenceCode);
  if (!stmt.ok) {
    const c = classifyFlexError(stmt.code, stmt.message);
    await admin.from('exchange_credentials')
      .update({ status: c.status, last_error: c.detail })
      .eq('id', cred.id);
    return { ok: false, cred_id: cred.id, error: c.machineCode, detail: c.detail, retryable: c.retryable };
  }

  // 4) Parse XML.
  const parsed = parseFlexXml(stmt.xml);
  if (parsed.kind !== 'report') {
    const c = classifyFlexError(parsed.code, parsed.message);
    await admin.from('exchange_credentials')
      .update({ status: c.status, last_error: c.detail })
      .eq('id', cred.id);
    return { ok: false, cred_id: cred.id, error: c.machineCode, detail: c.detail, retryable: c.retryable };
  }

  const warnings: string[] = [...parsed.warnings];
  const allClosed: ClosedTrade[] = [];
  const allOpenRows: ReturnType<typeof mapOpenPositions> = [];
  let ibTotal = 0, ourTotal = 0;

  for (const s of parsed.statements as FlexAccountStatement[]) {
    const recon = reconstructClosedTrades(s.trades);
    warnings.push(...recon.warnings);
    const xc = crosscheckPnl(recon.closedTrades, s.trades);
    ourTotal += xc.ours;
    ibTotal += xc.ibkr;
    allClosed.push(...recon.closedTrades);
    allOpenRows.push(...mapOpenPositions(s.openPositions, cred.label));
  }

  const delta = ourTotal - ibTotal;
  const tolerance = Math.max(1, Math.abs(ibTotal) * 0.005);
  if (Math.abs(delta) > tolerance) {
    warnings.push(`pnl_delta_exceeds_tolerance: ours=${ourTotal.toFixed(2)} ibkr=${ibTotal.toFixed(2)} delta=${delta.toFixed(2)}`);
  }

  // 5) Wipe + insert closed trades.
  let wiped = 0;
  const extIds = allClosed.map(t => t.external_id).filter(Boolean);
  for (const ids of chunk(extIds, 250)) {
    const { data: wipedRows, error: wipeErr } = await admin
      .from('trades')
      .delete()
      .eq('user_id', userId)
      .eq('broker_id', 'ibkr_flex')
      .in('external_id', ids)
      .select('trade_id');
    if (wipeErr) {
      return { ok: false, cred_id: cred.id, error: 'wipe_failed', detail: wipeErr.message };
    }
    wiped += wipedRows?.length ?? 0;
  }

  // Allocate trade_ids.
  const { data: maxRow, error: maxErr } = await admin
    .from('trades')
    .select('trade_id')
    .eq('user_id', userId)
    .order('trade_id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return { ok: false, cred_id: cred.id, error: 'max_id_lookup_failed', detail: maxErr.message };
  let nextId = ((maxRow?.trade_id as number | undefined) ?? 0) + 1;

  const sorted = [...allClosed].sort((a, b) => Date.parse(a.closed_at) - Date.parse(b.closed_at));
  const rows: Array<Record<string, unknown>> = [];
  let runningBalance = 0;
  for (const t of sorted) {
    const legacy = mapClosedToLegacy(t);
    runningBalance += legacy.pnl;
    const full: LegacyTrade = { ...legacy, id: nextId, balance: Math.round(runningBalance * 10000) / 10000 };
    rows.push({
      user_id: userId,
      portfolio_id: cred.portfolio_id,
      trade_id: nextId,
      data: full,
      broker_id: 'ibkr_flex',
      account_label: cred.label || null,
      source_type: 'api_sync',
      asset_class: assetClassOf(t.asset_category),
      external_id: t.external_id,
      opened_at: t.opened_at,
      closed_at: t.closed_at,
    });
    nextId++;
  }

  let inserted = rows.length;
  if (rows.length > 0) {
    const seen = new Set<string>();
    const deduped = rows.filter(r => {
      const k = `${r.broker_id ?? ''}|${r.account_label ?? ''}|${r.external_id ?? ''}`;
      if (!r.external_id) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const bulk = await admin.from('trades').insert(deduped);
    if (bulk.error) {
      const isDup = bulk.error.code === '23505' || /duplicate key/i.test(bulk.error.message);
      if (!isDup) {
        return { ok: false, cred_id: cred.id, error: 'persist_failed', detail: bulk.error.message };
      }
      let ok = 0;
      for (const r of deduped) {
        const one = await admin.from('trades').insert(r);
        if (!one.error) { ok++; continue; }
        if (one.error.code === '23505' || /duplicate key/i.test(one.error.message)) continue;
        return { ok: false, cred_id: cred.id, error: 'persist_failed', detail: one.error.message };
      }
      inserted = ok;
    }
  }

  // 6) Open positions upsert + prune.
  let positionsUpserted = 0, positionsRemoved = 0;
  const currentSymbols = new Set(allOpenRows.map(p => p.symbol).filter(Boolean));
  if (allOpenRows.length > 0) {
    const posRows = allOpenRows.map(p => ({
      user_id: userId,
      provider: 'ibkr_flex',
      account_label: p.account_label,
      symbol: p.symbol,
      side: p.side,
      size: p.size,
      entry_price: p.entry_price,
      unrealized_pnl: p.unrealized_pnl,
      updated_at: new Date().toISOString(),
    }));
    const { error: posErr } = await admin
      .from('open_positions')
      .upsert(posRows, { onConflict: 'user_id,provider,symbol' });
    if (posErr) warnings.push(`open_positions_upsert_failed: ${posErr.message}`);
    else positionsUpserted = posRows.length;
  }
  const { data: existingPos } = await admin
    .from('open_positions')
    .select('id, symbol')
    .eq('user_id', userId)
    .eq('provider', 'ibkr_flex');
  const staleIds = (existingPos ?? [])
    .filter((r: { symbol: string }) => !currentSymbols.has(r.symbol))
    .map((r: { id: string }) => r.id);
  if (staleIds.length > 0) {
    const { error } = await admin.from('open_positions').delete().in('id', staleIds);
    if (!error) positionsRemoved = staleIds.length;
  }

  // 7) Stamp success on the credential.
  await admin.from('exchange_credentials')
    .update({
      status: 'active',
      last_error: null,
      last_validated_at: new Date().toISOString(),
    })
    .eq('id', cred.id);

  return {
    ok: true,
    cred_id: cred.id,
    inserted,
    wiped,
    positionsUpserted,
    positionsRemoved,
    pnlCrosscheck: { ours: ourTotal, ibkr: ibTotal, delta, basis: 'gross' },
    warnings,
  };
}

// ------------ Constant-time compare ------------
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ------------ Handler ------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const CRON_SECRET = Deno.env.get('IBKR_SYNC_CRON_SECRET') ?? '';
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: 'server_misconfigured', detail: 'missing_env' }, 500);
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---- Cron mode (header takes precedence over JWT) ----
    const cronHdr = req.headers.get('x-cron-secret');
    let body: { provider?: string; label?: string; mode?: string } = {};
    try { body = await req.json(); } catch { /* empty body ok for cron */ }

    if (cronHdr) {
      if (!CRON_SECRET || !timingSafeEqual(cronHdr, CRON_SECRET)) {
        return json({ ok: false, error: 'unauthorized', detail: 'bad_cron_secret' }, 401);
      }
      // Iterate every active IBKR credential.
      const { data: creds, error } = await admin
        .from('exchange_credentials')
        .select('id, user_id, api_key, portfolio_id, label')
        .eq('provider', 'ibkr_flex')
        .eq('is_active', true)
        .eq('status', 'active');
      if (error) return json({ ok: false, error: 'credential_lookup_failed', detail: error.message }, 500);

      const outcomes: SyncOutcome[] = [];
      for (const c of (creds ?? []) as CredRow[]) {
        try {
          const out = await processCredential(admin, c);
          outcomes.push(out);
        } catch (e) {
          outcomes.push({ ok: false, cred_id: c.id, error: 'unhandled_exception', detail: (e as Error).message });
        }
        // Polite pacing between credentials (each has its own token/limits).
        await new Promise(r => setTimeout(r, 1200));
      }
      return json({
        ok: true,
        mode: 'cron',
        processed: outcomes.length,
        succeeded: outcomes.filter(o => o.ok).length,
        failed: outcomes.filter(o => !o.ok).map(o => ({ cred_id: o.cred_id, error: o.error, detail: o.detail })),
      });
    }

    // ---- User mode (JWT) ----
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ ok: false, error: 'unauthorized', detail: 'missing_bearer' }, 401);
    }
    const token = authHeader.slice('Bearer '.length);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authError } = await userClient.auth.getUser(token);
    const userId = userData?.user?.id;
    if (authError || !userId) {
      return json({ ok: false, error: 'unauthorized', detail: authError?.message ?? 'no_user' }, 401);
    }

    const provider = String(body.provider || '').toLowerCase().trim();
    if (provider !== 'ibkr_flex') {
      return json({ ok: false, error: 'unsupported_provider', detail: `Expected 'ibkr_flex', got '${provider}'` }, 400);
    }
    const label = typeof body.label === 'string' ? body.label.trim() : '';

    // Kill-switch guard (mirrors sync-futures-trades).
    try {
      const { data: locks } = await admin
        .from('live_risk_locks')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if (locks && locks.length > 0) {
        return json({ ok: false, error: 'sync_blocked_kill_switch', inserted: 0, wiped: 0 }, 423);
      }
    } catch { /* non-fatal */ }

    // Resolve credential row.
    let credQ = admin.from('exchange_credentials')
      .select('id, user_id, api_key, portfolio_id, label, is_active')
      .eq('user_id', userId)
      .eq('provider', 'ibkr_flex')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (label) credQ = credQ.eq('label', label);
    const { data: credRows, error: credErr } = await credQ;
    if (credErr) return json({ ok: false, error: 'credential_lookup_failed', detail: credErr.message }, 500);
    const cred = (credRows?.[0]) as CredRow | undefined;
    if (!cred) return json({ ok: false, error: 'no_credential', detail: 'No active IBKR credential' }, 404);

    const outcome = await processCredential(admin, cred);
    if (!outcome.ok) {
      const status = outcome.error === 'no_credential' ? 404
        : outcome.error === 'report_not_ready' ? 202
        : outcome.error === 'unauthorized' ? 401
        : outcome.retryable ? 503 : 422;
      return json({
        ok: false,
        error: outcome.error,
        detail: outcome.detail,
        retryable: !!outcome.retryable,
      }, status);
    }
    return json({
      ok: true,
      inserted: outcome.inserted ?? 0,
      wiped: outcome.wiped ?? 0,
      positionsUpserted: outcome.positionsUpserted ?? 0,
      positionsRemoved: outcome.positionsRemoved ?? 0,
      pnlCrosscheck: outcome.pnlCrosscheck,
      warnings: outcome.warnings ?? [],
    });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)) || 'unhandled_exception';
    console.error('[sync-ibkr-flex] unhandled', msg);
    return json({ ok: false, error: 'unhandled_exception', detail: msg }, 422);
  }
});
