// Edge function: verifies the email is registered before triggering a reset.
// Public (verify_jwt = false). Uses service role to look up the user, then
// invokes Supabase's /auth/v1/recover which dispatches the recovery email.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { email, redirectTo } = await req.json();
    const clean = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return json({ ok: false, error: 'invalid_email' }, 400);
    }

    const URL = Deno.env.get('SUPABASE_URL')!;
    const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Look up the user via admin API
    const lookup = await fetch(`${URL}/auth/v1/admin/users?email=${encodeURIComponent(clean)}`, {
      headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
    });
    if (!lookup.ok) {
      return json({ ok: false, error: 'lookup_failed' }, 500);
    }
    const data = await lookup.json();
    const users = Array.isArray(data?.users) ? data.users : [];
    const exists = users.some((u: { email?: string }) => (u.email || '').toLowerCase() === clean);

    if (!exists) {
      return json({ ok: false, error: 'not_registered' }, 404);
    }

    // Trigger the recovery email
    const recover = await fetch(`${URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        apikey: SRK,
        Authorization: `Bearer ${SRK}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: clean,
        ...(typeof redirectTo === 'string' ? { redirect_to: redirectTo } : {}),
      }),
    });

    if (!recover.ok) {
      const txt = await recover.text();
      return json({ ok: false, error: 'send_failed', detail: txt }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: 'unknown', detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
