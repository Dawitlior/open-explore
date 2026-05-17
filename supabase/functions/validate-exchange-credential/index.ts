// Phase 3: Live token validation gatekeeper.
// Verifies that submitted API keys are strictly READ-ONLY against the
// upstream exchange (Bybit / Binance) BEFORE writing anything to the vault.
// Raw secrets never touch logs, the DB plaintext column, or the client state.

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

// ---------- Provider: Bybit ----------
// Docs: GET /v5/user/query-api → result.permissions, result.readOnly (0|1)
async function verifyBybit(apiKey: string, apiSecret: string): Promise<
  { ok: true } | { ok: false; reason: string; detail?: string }
> {
  const ts = Date.now().toString();
  const recv = '5000';
  // Signature payload for GET = timestamp + apiKey + recvWindow + queryString
  const payload = ts + apiKey + recv;
  const sign = await hmacSha256Hex(apiSecret, payload);

  const res = await fetch('https://api.bybit.com/v5/user/query-api', {
    method: 'GET',
    headers: {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': ts,
      'X-BAPI-RECV-WINDOW': recv,
      'X-BAPI-SIGN': sign,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.retCode !== 0) {
    return { ok: false, reason: 'exchange_rejected', detail: body?.retMsg || 'Bybit auth failed' };
  }
  const result = body.result ?? {};
  // readOnly: 1 = read-only, 0 = read-write
  if (result.readOnly !== 1) {
    return { ok: false, reason: 'permissions_too_broad', detail: 'Bybit key is not Read-Only' };
  }
  // Withdraw / Transfer should be empty
  const perms = result.permissions ?? {};
  const forbiddenGroups = ['ContractTrade', 'Spot', 'Wallet', 'Options', 'Derivatives', 'CopyTrading', 'BlockTrade', 'Exchange', 'NFT', 'Affiliate'];
  for (const g of forbiddenGroups) {
    const arr = perms[g];
    if (Array.isArray(arr) && arr.length > 0) {
      // Bybit may return ["AccountTransfer"] under Wallet on read-only keys; reject anything that includes Trade/Withdraw/Transfer mutations
      const dangerous = arr.find((p: string) => /Trade|Withdraw|Transfer|Order|Position/i.test(p));
      if (dangerous) {
        return { ok: false, reason: 'permissions_too_broad', detail: `Bybit ${g}: ${dangerous}` };
      }
    }
  }
  return { ok: true };
}

// ---------- Provider: Binance ----------
// Docs: GET /sapi/v1/account/apiRestrictions (signed)
async function verifyBinance(apiKey: string, apiSecret: string): Promise<
  { ok: true } | { ok: false; reason: string; detail?: string }
> {
  const ts = Date.now().toString();
  const query = `timestamp=${ts}&recvWindow=5000`;
  const sig = await hmacSha256Hex(apiSecret, query);
  const url = `https://api.binance.com/sapi/v1/account/apiRestrictions?${query}&signature=${sig}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, reason: 'exchange_rejected', detail: body?.msg || 'Binance auth failed' };
  }
  // Any trading or withdrawal flag must be false.
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
    if (v === true) {
      return { ok: false, reason: 'permissions_too_broad', detail: `Binance flag active: ${k}` };
    }
  }
  // Reading must be allowed for the key to be useful
  if (body.enableReading === false) {
    return { ok: false, reason: 'permissions_too_broad', detail: 'Binance Reading is disabled' };
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  // ---- Auth ----
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, error: 'unauthorized' }, 401);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimErr } = await userClient.auth.getClaims(token);
  if (claimErr || !claims?.claims?.sub) return json({ ok: false, error: 'unauthorized' }, 401);
  const userId = claims.claims.sub as string;

  // ---- Input ----
  let body: { provider?: string; label?: string; api_key?: string; api_secret?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }

  const provider = (body.provider || '').toLowerCase();
  const label = (body.label || 'main').trim().slice(0, 64);
  const apiKey = (body.api_key || '').trim();
  const apiSecret = (body.api_secret || '').trim();

  if (!['bybit', 'binance'].includes(provider)) return json({ ok: false, error: 'unsupported_provider' }, 400);
  if (apiKey.length < 8 || apiKey.length > 256) return json({ ok: false, error: 'invalid_api_key' }, 400);
  if (apiSecret.length < 8 || apiSecret.length > 512) return json({ ok: false, error: 'invalid_api_secret' }, 400);

  // ---- Live verification (gatekeeper) ----
  let verdict: { ok: true } | { ok: false; reason: string; detail?: string };
  try {
    verdict = provider === 'bybit'
      ? await verifyBybit(apiKey, apiSecret)
      : await verifyBinance(apiKey, apiSecret);
  } catch (_e) {
    // Do not echo secret material in error logs
    return json({ ok: false, error: 'verification_failed', reason: 'network' }, 502);
  }

  if (!verdict.ok) {
    // Distinct, high-severity rejection — NOTHING is written to DB.
    return json({
      ok: false,
      error: 'security_rejected',
      reason: verdict.reason,
      detail: verdict.detail ?? null,
    }, 403);
  }

  // ---- Persist via Vault (user-scoped client → RLS + trigger handles encryption) ----
  const { error: upsertErr } = await userClient
    .from('exchange_credentials')
    .upsert({
      user_id: userId,
      provider,
      label,
      api_key: apiKey,
      api_secret: apiSecret, // trigger moves to vault & nulls this column
      scope: 'read_only',
      is_active: true,
      last_validated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider,label' });

  if (upsertErr) {
    return json({ ok: false, error: 'vault_write_failed', detail: upsertErr.message }, 500);
  }

  return json({ ok: true, provider, label });
});
