// Edge function: triggers a password reset email.
// Public (verify_jwt = false).
//
// Security notes:
// - Never reveals whether the email is registered (returns ok:true regardless)
//   to prevent account enumeration.
// - The `redirectTo` is validated against an allowlist to prevent open
//   redirects that could be used to harvest reset tokens.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Allowed redirect origins for the password reset link. Add any additional
// production / preview domains here.
const ALLOWED_REDIRECT_HOSTS = new Set<string>([
  'orcainvestment.com',
  'www.orcainvestment.com',
  'localhost',
]);

function isAllowedRedirect(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.toLowerCase();
    const ok =
      ALLOWED_REDIRECT_HOSTS.has(host) ||
      host.endsWith('.lovable.app') ||
      host.endsWith('.lovableproject.com') ||
      host.endsWith('.orcainvestment.com');
    if (!ok) return null;
    // Force the path to /reset-password to remove any attacker-supplied path/query.
    return `${u.origin}/reset-password`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { email, redirectTo } = await req.json();
    const clean = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return json({ ok: false, error: 'invalid_email' });
    }

    const URL_ = Deno.env.get('SUPABASE_URL')!;
    const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const safeRedirect = isAllowedRedirect(redirectTo);

    // Look up the user via admin API — only used to decide whether to actually
    // dispatch the recovery email. We DO NOT signal the result to the caller.
    let exists = false;
    try {
      const lookup = await fetch(`${URL_}/auth/v1/admin/users?email=${encodeURIComponent(clean)}`, {
        headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
      });
      if (lookup.ok) {
        const data = await lookup.json();
        const users = Array.isArray(data?.users) ? data.users : [];
        exists = users.some((u: { email?: string }) => (u.email || '').toLowerCase() === clean);
      }
    } catch {
      // Treat lookup failure as "don't send" but still return ok:true.
    }

    if (exists) {
      // Fire and forget — don't leak send failures back to the client.
      try {
        await fetch(`${URL_}/auth/v1/recover`, {
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
      } catch {
        /* swallow */
      }
    }

    // Always return the same success response — prevents account enumeration.
    return json({ ok: true });
  } catch {
    // Generic response on error, no detail leakage.
    return json({ ok: true });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
