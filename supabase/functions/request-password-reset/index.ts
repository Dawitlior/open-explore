// Edge function: triggers a password-recovery email if the address is registered.
// Public (verify_jwt = false). Uses service role to look up the user, then
// invokes Supabase's /auth/v1/recover which dispatches the recovery email.
//
// Security posture (audit F-01 / F-06):
//  - UNIFORM RESPONSE: the caller can never tell whether an email is registered
//    (no account enumeration). Every well-formed request returns { ok: true }.
//  - RATE LIMITED: per-email and per-IP hourly caps via public.rate_limit_events.
//  - redirect_to is validated (https only, no embedded credentials) before being
//    forwarded; Supabase Auth additionally enforces its own redirect allowlist.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from '../_shared/cors.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL_CAP_PER_HOUR = 5;
const IP_CAP_PER_HOUR = 20;

function sanitizeRedirect(input: unknown): string | undefined {
  if (typeof input !== 'string' || input.length === 0 || input.length > 2048) return undefined;
  try {
    const u = new URL(input);
    const isHttps = u.protocol === 'https:';
    const isLocal = u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
    if (!isHttps && !isLocal) return undefined;
    if (u.username || u.password) return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { email, redirectTo } = await req.json();
    const clean = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return json({ ok: false, error: 'invalid_email' });
    }

    const URL = Deno.env.get('SUPABASE_URL')!;
    const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(URL, SRK);

    // ── Rate limiting (per email + per IP) ──────────────────────────────
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [{ count: emailHits }, { count: ipHits }] = await Promise.all([
      admin.from('rate_limit_events').select('id', { count: 'exact', head: true })
        .eq('bucket', 'pwd-reset').eq('subject', `e:${clean}`).gte('created_at', since),
      admin.from('rate_limit_events').select('id', { count: 'exact', head: true })
        .eq('bucket', 'pwd-reset').eq('subject', `i:${ip}`).gte('created_at', since),
    ]);

    if ((emailHits ?? 0) >= EMAIL_CAP_PER_HOUR || (ipHits ?? 0) >= IP_CAP_PER_HOUR) {
      return json({ ok: false, error: 'rate_limited' }, 429);
    }

    // Record the attempt (fire-and-forget — never block the response on this).
    void admin.from('rate_limit_events').insert([
      { bucket: 'pwd-reset', subject: `e:${clean}` },
      { bucket: 'pwd-reset', subject: `i:${ip}` },
    ]).then(() => undefined, () => undefined);

    // ── Look up the user via admin API ──────────────────────────────────
    const lookup = await fetch(`${URL}/auth/v1/admin/users?email=${encodeURIComponent(clean)}`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    });
    if (!lookup.ok) {
      return json({ ok: false, error: 'lookup_failed' }, 500);
    }
    const data = await lookup.json();
    const users = Array.isArray(data?.users) ? data.users : [];
    const exists = users.some((u: { email?: string }) => (u.email || '').toLowerCase() === clean);

    // Uniform response: unknown addresses get the same { ok: true } as real ones.
    if (!exists) {
      return json({ ok: true });
    }

    // ── Trigger the recovery email ──────────────────────────────────────
    const safeRedirect = sanitizeRedirect(redirectTo);
    const recover = await fetch(`${URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        apikey: SRK,
        Authorization: `Bearer ${SRK}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: clean,
        ...(safeRedirect ? { redirect_to: safeRedirect } : {}),
      }),
    });

    if (!recover.ok) {
      return json({ ok: false, error: 'send_failed' }, 500);
    }
    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'unknown' }, 500);
  }
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
