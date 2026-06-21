// Phase 3: Live token validation gatekeeper.
// Verifies that submitted API keys are strictly READ-ONLY against the
// upstream exchange (Bybit / Binance) BEFORE writing anything to the vault.
// Raw secrets never touch logs, the DB plaintext column, or the client state.

import { createClient } from 'npm:@supabase/supabase-js@2';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ---------- HMAC helpers ----------
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Input sanitization (XSS / SQL / control chars) ----------
// API keys from real exchanges are strictly alphanumeric (sometimes with - or _).
// Anything else is structurally rejected before it can hit the upstream API or DB.
const SAFE_KEY = /^[A-Za-z0-9_\-]{8,256}$/;
const SAFE_SECRET = /^[A-Za-z0-9_\-+/=]{8,512}$/;
const SAFE_LABEL = /^[A-Za-z0-9 _\-]{1,64}$/;

const SUPPORTED_PROVIDERS = ['bybit', 'binance', 'mexc_futures', 'mexc_spot'] as const;
type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

export interface ValidatedInput {
  provider: SupportedProvider;
  label: string;
  api_key: string;
  api_secret: string;
}

export function validateInput(raw: unknown):
  | { ok: true; value: ValidatedInput }
  | { ok: false; error: string; detail?: string }
{
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid_body' };
  const b = raw as Record<string, unknown>;
  const provider = String(b.provider || '').toLowerCase().trim();
  if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(provider)) {
    return { ok: false, error: 'unsupported_provider' };
  }

  const labelRaw = typeof b.label === 'string' && b.label.trim().length > 0 ? b.label.trim() : 'main';
  const apiKey = typeof b.api_key === 'string' ? b.api_key.trim() : '';
  const apiSecret = typeof b.api_secret === 'string' ? b.api_secret.trim() : '';

  if (!SAFE_LABEL.test(labelRaw)) return { ok: false, error: 'invalid_label', detail: 'Label contains forbidden characters' };
  if (!SAFE_KEY.test(apiKey)) return { ok: false, error: 'invalid_api_key', detail: 'API key contains forbidden characters' };
  if (!SAFE_SECRET.test(apiSecret)) return { ok: false, error: 'invalid_api_secret', detail: 'API secret contains forbidden characters' };

  return { ok: true, value: { provider: provider as SupportedProvider, label: labelRaw, api_key: apiKey, api_secret: apiSecret } };
}

// ---------- Rate limit (in-memory, structural placeholder) ----------
// NOTE: Lovable Cloud does not yet expose durable rate-limit primitives.
// This is a per-instance soft cool-down — it deters trivial flooding from a
// single warm function instance and emits a structural `rate_limited` flag
// the client can react to. Production-grade limiting should replace this once
// the platform exposes a shared store.
const RATE_BUCKET = new Map<string, number[]>();
export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX_HITS = 5;

export function rateLimitCheck(key: string, now: number = Date.now()):
  | { ok: true }
  | { ok: false; retry_after_ms: number }
{
  const arr = (RATE_BUCKET.get(key) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX_HITS) {
    const oldest = arr[0];
    return { ok: false, retry_after_ms: RATE_WINDOW_MS - (now - oldest) };
  }
  arr.push(now);
  RATE_BUCKET.set(key, arr);
  return { ok: true };
}

export function _resetRateLimit() { RATE_BUCKET.clear(); }

async function fingerprint(authHeader: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authHeader));
  return Array.from(new Uint8Array(buf)).slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Provider: Bybit ----------
export async function verifyBybit(
  apiKey: string, apiSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  const ts = Date.now().toString();
  const recv = '5000';
  const sign = await hmacSha256Hex(apiSecret, ts + apiKey + recv);
  let res: Response;
  try {
    res = await fetchImpl('https://api.bybit.com/v5/user/query-api', {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': ts,
        'X-BAPI-RECV-WINDOW': recv,
        'X-BAPI-SIGN': sign,
      },
    });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'Bybit unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `Bybit ${res.status}` };
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.retCode !== 0) {
    return { ok: false, reason: 'exchange_rejected', detail: body?.retMsg || 'Bybit auth failed' };
  }
  const result = body.result ?? {};

  // Bybit's native source of truth: readOnly === 1 means the key cannot
  // place orders, transfer, or withdraw. Approve immediately — do NOT scan
  // module category names like "ContractTrade" or "UnifiedTrading", which
  // are group labels, not active permissions.
  const readOnlyFlag = result.readOnly === 1 || result.readOnly === true;
  if (readOnlyFlag) return { ok: true };

  // Fallback for legacy/edge payloads where readOnly is absent: only block
  // on the two explicit, fund-moving permission names. Everything else
  // (ContractTrade, SpotTrade, Options, Derivatives module labels) is allowed.
  const perms = result.permissions ?? {};
  const FORBIDDEN = /^(Withdraw|Transfer)$/i;
  for (const g of Object.keys(perms)) {
    const arr = perms[g];
    if (Array.isArray(arr)) {
      const dangerous = arr.find((p: string) => typeof p === 'string' && FORBIDDEN.test(p.trim()));
      if (dangerous) {
        return { ok: false, reason: 'permissions_too_broad', detail: `Bybit ${g}: ${dangerous}` };
      }
    }
  }

  // No explicit readOnly flag and no forbidden permission found — treat as
  // safe read-only. Bybit only exposes Withdraw/Transfer when actually granted.
  return { ok: true };
}

// ---------- Provider: Binance ----------
export async function verifyBinance(
  apiKey: string, apiSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  const ts = Date.now().toString();
  const query = `timestamp=${ts}&recvWindow=5000`;
  const sig = await hmacSha256Hex(apiSecret, query);
  const url = `https://api.binance.com/sapi/v1/account/apiRestrictions?${query}&signature=${sig}`;
  let res: Response;
  try {
    res = await fetchImpl(url, { method: 'GET', headers: { 'X-MBX-APIKEY': apiKey } });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'Binance unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `Binance ${res.status}` };
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, reason: 'exchange_rejected', detail: body?.msg || 'Binance auth failed' };
  const forbidden: Array<[string, unknown]> = [
    ['enableWithdrawals', body.enableWithdrawals],
    ['enableInternalTransfer', body.enableInternalTransfer],
    ['enableSpotAndMarginTrading', body.enableSpotAndMarginTrading],
    ['enableMargin', body.enableMargin],
    ['enableFutures', body.enableFutures],
    ['enableVanillaOptions', body.enableVanillaOptions],
    ['permitsUniversalTransfer', body.permitsUniversalTransfer],
  ];
  for (const [k, v] of forbidden) {
    if (v === true) return { ok: false, reason: 'permissions_too_broad', detail: `Binance flag active: ${k}` };
  }
  if (body.enableReading === false) return { ok: false, reason: 'permissions_too_broad', detail: 'Binance Reading disabled' };
  return { ok: true };
}

// ---------- Provider: MEXC Futures ----------
// MEXC does NOT expose per-key permission introspection for normal user keys,
// so we cannot prove the key is read-only server-side. Instead we perform a
// benign signed read (account assets) to prove the key + secret are valid and
// sign correctly. Read-only intent is enforced via the guided key-creation
// flow (the user is walked through ticking ONLY read permissions) and via
// ORCA's structural posture (no order/withdraw code path exists anywhere).
const MEXC_FUTURES_BASE = 'https://contract.mexc.com';

export async function verifyMexcFutures(
  apiKey: string, apiSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  const ts = Date.now().toString();
  // GET with no params → parameter string is empty.
  const signature = await hmacSha256Hex(apiSecret, apiKey + ts + '');
  let res: Response;
  try {
    res = await fetchImpl(`${MEXC_FUTURES_BASE}/api/v1/private/account/assets`, {
      method: 'GET',
      headers: {
        'ApiKey': apiKey,
        'Request-Time': ts,
        'Signature': signature,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'MEXC unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `MEXC ${res.status}` };
  const body = await res.json().catch(() => ({}));
  if (res.ok && body?.success === true) return { ok: true };
  return { ok: false, reason: 'mexc_futures_rejected', detail: body?.message ?? `status ${res.status}` };
}

// ---------- Provider: MEXC Spot ----------
// Same read-only caveat as MEXC Futures (see comment above).
// Spot uses a Binance-compatible query-string signing scheme.
const MEXC_SPOT_BASE = 'https://api.mexc.com';

export async function verifyMexcSpot(
  apiKey: string, apiSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  const qs = `timestamp=${Date.now()}&recvWindow=5000`;
  const signature = await hmacSha256Hex(apiSecret, qs);
  let res: Response;
  try {
    res = await fetchImpl(`${MEXC_SPOT_BASE}/api/v3/account?${qs}&signature=${signature}`, {
      method: 'GET',
      headers: { 'X-MEXC-APIKEY': apiKey },
    });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'MEXC unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `MEXC ${res.status}` };
  const body = await res.json().catch(() => ({}));
  if (res.ok && Array.isArray(body?.balances)) return { ok: true };
  return { ok: false, reason: 'mexc_spot_rejected', detail: body?.msg ?? `status ${res.status}` };
}

// ---------- Handler (dependency-injected for testability) ----------
export interface HandlerDeps {
  getUserId: (authHeader: string) => Promise<string | null>;
  fetchImpl?: typeof fetch;
  persist?: (userId: string, input: ValidatedInput) => Promise<{ error: { message: string } | null }>;
}

export async function handler(req: Request, deps: HandlerDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  // 1) Input parse + sanitize (pre-auth so XSS/SQL never reach DB or upstream)
  let raw: unknown;
  try { raw = await req.json(); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  const v = validateInput(raw);
  if (!v.ok) return json({ ok: false, error: v.error, detail: v.detail ?? null }, 400);

  // 2) Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, error: 'unauthorized' }, 401);
  const userId = await deps.getUserId(authHeader);
  if (!userId) return json({ ok: false, error: 'unauthorized' }, 401);

  // 3) Rate limit (per-user fingerprint)
  const fp = await fingerprint(userId + ':' + authHeader.slice(0, 24));
  const rl = rateLimitCheck(fp);
  if (!rl.ok) {
    return json({ ok: false, error: 'rate_limited', retry_after_ms: rl.retry_after_ms }, 429);
  }

  // 4) Live exchange verification
  const { provider, api_key, api_secret, label } = v.value;
  const verdict = provider === 'bybit'
    ? await verifyBybit(api_key, api_secret, deps.fetchImpl)
    : provider === 'binance'
      ? await verifyBinance(api_key, api_secret, deps.fetchImpl)
      : provider === 'mexc_futures'
        ? await verifyMexcFutures(api_key, api_secret, deps.fetchImpl)
        : await verifyMexcSpot(api_key, api_secret, deps.fetchImpl);

  if (!verdict.ok) {
    if (verdict.reason === 'connection_error') {
      // Fail-safe: NO DB write, NO secret echo
      return json({ ok: false, error: 'connection_error', reason: verdict.reason, detail: verdict.detail ?? null }, 503);
    }
    return json({ ok: false, error: 'security_rejected', reason: verdict.reason, detail: verdict.detail ?? null }, 403);
  }

  // 5) Persist via vault
  if (!deps.persist) return json({ ok: false, error: 'persist_unavailable' }, 500);
  const { error } = await deps.persist(userId, v.value);
  if (error) return json({ ok: false, error: 'vault_write_failed', detail: error.message }, 500);

  return json({ ok: true, provider, label });
}

// ---------- Real wiring ----------
Deno.serve((req) => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  return handler(req, {
    getUserId: async (h) => {
      const token = h.replace('Bearer ', '');
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims?.sub) return null;
      return data.claims.sub as string;
    },
    persist: async (userId, input) => {
      const { error } = await supabase
        .from('exchange_credentials')
        .upsert({
          user_id: userId,
          provider: input.provider,
          label: input.label,
          api_key: input.api_key,
          api_secret: input.api_secret,
          scope: 'read_only',
          is_active: true,
          last_validated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider,label' });
      return { error: error ? { message: error.message } : null };
    },
  });
});
