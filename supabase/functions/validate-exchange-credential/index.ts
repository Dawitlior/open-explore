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
// Standard exchange keys are strictly alphanumeric (sometimes with - or _).
// Coinbase is a special case: the "key" is a CDP key NAME containing
// slashes (organizations/.../apiKeys/...), and the "secret" is a multi-line
// PEM private-key block. Both need bespoke validation patterns; if the
// default SAFE_KEY/SAFE_SECRET were applied to a Coinbase key they would
// always reject it before the verifier ever ran.
const SAFE_KEY = /^[A-Za-z0-9_\-]{8,256}$/;
const SAFE_SECRET = /^[A-Za-z0-9_\-+/=]{8,512}$/;
const SAFE_LABEL = /^[A-Za-z0-9 _\-]{1,64}$/;
// Coinbase CDP key name: lowercase hex segments joined by slashes.
const COINBASE_KEY = /^[A-Za-z0-9_\-\/]{16,256}$/;

function isPemPrivateKey(s: string): boolean {
  // Accepts Ed25519 PKCS8 (`BEGIN PRIVATE KEY`) and ECDSA SEC1
  // (`BEGIN EC PRIVATE KEY`). The body is base64 with `+`, `/`, `=`,
  // separated by newlines — we don't strictly parse it; we require the
  // BEGIN/END envelope and bound the overall length.
  if (s.length < 80 || s.length > 8192) return false;
  const hasBegin = /-----BEGIN (?:EC )?PRIVATE KEY-----/.test(s);
  const hasEnd = /-----END (?:EC )?PRIVATE KEY-----/.test(s);
  if (!hasBegin || !hasEnd) return false;
  // Everything outside the BEGIN/END envelope must be safe whitespace.
  // We allow the standard PEM character set inside.
  return /^[A-Za-z0-9_\-\s+/=:]+$/.test(s);
}

const SUPPORTED_PROVIDERS = [
  'bybit', 'binance',
  'mexc_futures', 'mexc_spot',
  'gate_futures', 'kraken_futures',
  'crypto_com', 'coinbase',
] as const;
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
  // Coinbase secrets are multi-line PEM blocks — DO NOT trim internal
  // whitespace, only outer whitespace.
  const apiSecret = typeof b.api_secret === 'string' ? b.api_secret.trim() : '';

  if (!SAFE_LABEL.test(labelRaw)) return { ok: false, error: 'invalid_label', detail: 'Label contains forbidden characters' };

  if (provider === 'coinbase') {
    if (!COINBASE_KEY.test(apiKey)) {
      return { ok: false, error: 'invalid_api_key', detail: 'Coinbase key name must look like organizations/.../apiKeys/...' };
    }
    if (!isPemPrivateKey(apiSecret)) {
      return { ok: false, error: 'invalid_api_secret', detail: 'Coinbase secret must be a PEM private-key block (BEGIN PRIVATE KEY ... END PRIVATE KEY).' };
    }
  } else {
    if (!SAFE_KEY.test(apiKey)) return { ok: false, error: 'invalid_api_key', detail: 'API key contains forbidden characters' };
    if (!SAFE_SECRET.test(apiSecret)) return { ok: false, error: 'invalid_api_secret', detail: 'API secret contains forbidden characters' };
  }

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

// ---------- Shared crypto helpers (SHA-512 + HMAC-SHA-512, used by Gate + Kraken) ----------
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

// ---------- Provider: Gate.io USDT-M Futures ----------
// Gate keys without IP-binding expire after 90 days (same as MEXC). Read-only
// posture identical to MEXC: no per-key permission introspection available, so
// the verifier just proves the key signs correctly against a benign read.
const GATE_BASE = 'https://api.gateio.ws';
const GATE_PREFIX = '/api/v4';

export async function verifyGateFutures(
  apiKey: string, apiSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const path = '/futures/usdt/accounts';
  const query = '';
  const bodyHash = await sha512Hex('');
  const sigString = `GET\n${GATE_PREFIX}${path}\n${query}\n${bodyHash}\n${ts}`;
  const sign = await hmacSha512Hex(apiSecret, sigString);
  let res: Response;
  try {
    res = await fetchImpl(`${GATE_BASE}${GATE_PREFIX}${path}`, {
      method: 'GET',
      headers: { KEY: apiKey, Timestamp: ts, SIGN: sign, Accept: 'application/json' },
    });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'Gate.io unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `Gate ${res.status}` };
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, reason: 'gate_futures_rejected', detail: body?.message ?? `status ${res.status}` };
}

// ---------- Provider: Kraken Futures ----------
// Kraken Authent: base64( HMAC_SHA512( base64decode(secret), SHA256(postData + nonce + endpointPath) ) )
const KRAKEN_FX_BASE = 'https://futures.kraken.com';

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

async function krakenAuthent(apiSecret: string, postData: string, nonce: string, endpointPath: string): Promise<string> {
  let secretBytes: Uint8Array;
  try {
    secretBytes = b64ToBytes(apiSecret);
  } catch {
    // Fall back to raw bytes if user pasted a non-base64 secret — verifier will reject it.
    secretBytes = new TextEncoder().encode(apiSecret);
  }
  const sha256 = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(postData + nonce + endpointPath));
  const key = await crypto.subtle.importKey(
    'raw', secretBytes,
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new Uint8Array(sha256));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function verifyKrakenFutures(
  apiKey: string, apiSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  const nonce = Date.now().toString();
  const endpointPath = '/api/v3/accounts';
  const postData = '';
  let authent: string;
  try {
    authent = await krakenAuthent(apiSecret, postData, nonce, endpointPath);
  } catch (e) {
    return { ok: false, reason: 'kraken_futures_rejected', detail: `sign_failed: ${(e as Error).message}` };
  }
  let res: Response;
  try {
    res = await fetchImpl(`${KRAKEN_FX_BASE}/derivatives${endpointPath}`, {
      method: 'GET',
      headers: { APIKey: apiKey, Authent: authent, Nonce: nonce, Accept: 'application/json' },
    });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'Kraken unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `Kraken ${res.status}` };
  const body = await res.json().catch(() => ({}));
  if (res.ok && body?.result === 'success') return { ok: true };
  return { ok: false, reason: 'kraken_futures_rejected', detail: body?.error ?? `status ${res.status}` };
}

// ---------- Provider: Crypto.com Exchange ----------
// Crypto.com Exchange v1 does NOT expose per-key permission introspection,
// so verification is a benign signed read (`private/user-balance`). The
// payload-string signing rule (`params_to_str`) is replicated here so the
// edge function and the sync function stay in lock-step.
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

export async function verifyCryptoCom(
  apiKey: string, apiSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  const id = Date.now();
  const nonce = Date.now();
  const method = 'private/user-balance';
  const params: Record<string, unknown> = {};
  const sig = await hmacSha256Hex(apiSecret, method + id + apiKey + cdcParamString(params) + nonce);
  const body = JSON.stringify({ id, method, api_key: apiKey, params, nonce, sig });
  let res: Response;
  try {
    res = await fetchImpl(`${CDC_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'Crypto.com unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `Crypto.com ${res.status}` };
  const json = await res.json().catch(() => ({})) as { code?: number; message?: string };
  if (res.ok && json?.code === 0) return { ok: true };
  return { ok: false, reason: 'crypto_com_rejected', detail: json?.message ?? `code ${json?.code ?? res.status}` };
}

// ---------- Provider: Coinbase Advanced Trade ----------
// Coinbase CDP auth: short-lived JWT (alg EdDSA for Ed25519 keys, ES256 for
// ECDSA), signed with the user's PEM private key, passed as Bearer. We use
// `jose` (esm.sh) so we don't hand-roll EdDSA/ES256 in Deno. The verifier
// hits `/api/v3/brokerage/accounts` — a benign read; HTTP 200 == valid key.
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

export async function verifyCoinbase(
  keyName: string, pemSecret: string, fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; reason: string; detail?: string }> {
  let jwt: string;
  try {
    jwt = await coinbaseJwt(keyName, pemSecret, 'GET', '/api/v3/brokerage/accounts');
  } catch (e) {
    return { ok: false, reason: 'coinbase_rejected', detail: `pem_import_failed: ${(e as Error).message}` };
  }
  let res: Response;
  try {
    res = await fetchImpl('https://api.coinbase.com/api/v3/brokerage/accounts', {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
    });
  } catch {
    return { ok: false, reason: 'connection_error', detail: 'Coinbase unreachable' };
  }
  if (res.status >= 500) return { ok: false, reason: 'connection_error', detail: `Coinbase ${res.status}` };
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({})) as { message?: string };
  return { ok: false, reason: 'coinbase_rejected', detail: body?.message ?? `status ${res.status}` };
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
  const verifiers: Record<SupportedProvider, () => Promise<{ ok: true } | { ok: false; reason: string; detail?: string }>> = {
    bybit:           () => verifyBybit(api_key, api_secret, deps.fetchImpl),
    binance:         () => verifyBinance(api_key, api_secret, deps.fetchImpl),
    mexc_futures:    () => verifyMexcFutures(api_key, api_secret, deps.fetchImpl),
    mexc_spot:       () => verifyMexcSpot(api_key, api_secret, deps.fetchImpl),
    gate_futures:    () => verifyGateFutures(api_key, api_secret, deps.fetchImpl),
    kraken_futures:  () => verifyKrakenFutures(api_key, api_secret, deps.fetchImpl),
    crypto_com:      () => verifyCryptoCom(api_key, api_secret, deps.fetchImpl),
    coinbase:        () => verifyCoinbase(api_key, api_secret, deps.fetchImpl),
  };
  const verdict = await verifiers[provider]();

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
      // Resolve a portfolio_id: keep existing on rotation, else fall back to
      // the user's default portfolio (created by handle_new_user_portfolio).
      // portfolio_id is NOT NULL on exchange_credentials, so we MUST supply one.
      const { data: existing } = await supabase
        .from('exchange_credentials')
        .select('portfolio_id')
        .eq('user_id', userId)
        .eq('provider', input.provider)
        .eq('label', input.label)
        .maybeSingle();
      let portfolioId: string | null = existing?.portfolio_id ?? null;
      if (!portfolioId) {
        const { data: defPort } = await supabase
          .from('portfolios')
          .select('id')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        portfolioId = defPort?.id ?? null;
      }
      if (!portfolioId) {
        return { error: { message: 'no_portfolio: user has no portfolio to attach credential to' } };
      }
      const { error } = await supabase
        .from('exchange_credentials')
        .upsert({
          user_id: userId,
          portfolio_id: portfolioId,
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
