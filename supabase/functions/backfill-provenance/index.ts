// Phase 1 — Trade Provenance Backfill
// One-shot edge function that loops `backfill_trade_provenance(500)` until it
// returns 0, sleeping briefly between calls to stay under any DB/HTTP burst limit.
//
// Auth: requires a logged-in user. We don't scope to that user — backfill runs
// table-wide via SECURITY DEFINER — but we DO require a session so casual
// strangers can't trigger it. Safe to call repeatedly; idempotent by design.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: 'server_misconfigured' }, 500);
    }
    if (!ADMIN_SECRET) {
      // Refuse to run a table-wide UPDATE unless an admin secret is configured.
      return json({ ok: false, error: 'admin_secret_not_configured' }, 503);
    }

    // Require a logged-in user AND the shared admin secret. The function does
    // a SECURITY DEFINER UPDATE across every user's trades, so a stale session
    // must not be enough on its own.
    const authHeader = req.headers.get('Authorization') ?? '';
    const adminHeader = req.headers.get('x-admin-secret') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ ok: false, error: 'unauthorized' }, 401);
    }
    if (adminHeader !== ADMIN_SECRET) {
      return json({ ok: false, error: 'forbidden' }, 403);
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user?.id) return json({ ok: false, error: 'unauthorized' }, 401);

    let body: { batch?: number; maxIterations?: number; pauseMs?: number } = {};
    try { body = await req.json(); } catch { /* defaults */ }
    const batch = Math.min(Math.max(body.batch ?? 500, 50), 2000);
    const maxIterations = Math.min(Math.max(body.maxIterations ?? 500, 1), 5000);
    const pauseMs = Math.min(Math.max(body.pauseMs ?? 100, 0), 2000);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let totalUpdated = 0;
    let iterations = 0;
    const started = Date.now();
    // Hard wall-clock guard so we always return inside the function timeout.
    const DEADLINE_MS = 50_000;

    for (; iterations < maxIterations; iterations++) {
      const { data, error } = await admin.rpc('backfill_trade_provenance', { p_batch: batch });
      if (error) {
        return json({ ok: false, error: 'rpc_failed', detail: error.message, totalUpdated, iterations }, 500);
      }
      const updated = Number(data) || 0;
      totalUpdated += updated;
      if (updated === 0) break;
      if (Date.now() - started > DEADLINE_MS) break;
      if (pauseMs) await sleep(pauseMs);
    }

    return json({
      ok: true,
      totalUpdated,
      iterations,
      done: iterations < maxIterations,
      durationMs: Date.now() - started,
      hint: iterations >= maxIterations ? 'Reached iteration cap — re-invoke to continue.' : undefined,
    });
  } catch (e) {
    return json({ ok: false, error: 'unhandled_exception', detail: (e as Error).message }, 422);
  }
});
