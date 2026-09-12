// Device / session registry for the Security settings channel.
//
// Actions:
//   register    – upsert the calling device (IP + geo taken from request headers),
//                 refresh last_seen_at and report whether it was revoked.
//   revoke_all  – mark every device revoked and invalidate all refresh tokens.
//
// Requires Authorization: Bearer <user_jwt>.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { withCors } from '../_shared/cors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function parseUA(ua: string) {
  const l = ua.toLowerCase();
  let browser = 'Unknown';
  if (l.includes('edg/')) browser = 'Edge';
  else if (l.includes('opr/') || l.includes('opera')) browser = 'Opera';
  else if (l.includes('chrome') && !l.includes('chromium')) browser = 'Chrome';
  else if (l.includes('firefox')) browser = 'Firefox';
  else if (l.includes('safari')) browser = 'Safari';

  let os = 'Unknown';
  if (l.includes('windows')) os = 'Windows';
  else if (l.includes('android')) os = 'Android';
  else if (l.includes('iphone') || l.includes('ipad') || l.includes('ios')) os = 'iOS';
  else if (l.includes('mac os') || l.includes('macintosh')) os = 'macOS';
  else if (l.includes('linux')) os = 'Linux';

  const deviceType = /iphone|android.*mobile|windows phone/.test(l)
    ? 'mobile'
    : /ipad|tablet|android/.test(l)
      ? 'tablet'
      : 'desktop';

  return { browser, os, deviceType };
}

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? '');
    const admin = createClient(supabaseUrl, serviceKey);

    if (action === 'revoke_all') {
      await admin.from('user_devices')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('revoked_at', null);
      try { await admin.auth.admin.signOut(authHeader.replace(/^Bearer\s+/i, ''), 'global'); } catch { /* ignore */ }
      return json({ ok: true });
    }

    if (action !== 'register') return json({ error: 'unknown action' }, 400);

    const deviceId = String(body?.deviceId ?? '').slice(0, 64);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(deviceId)) return json({ error: 'invalid deviceId' }, 400);

    const ua = (req.headers.get('user-agent') ?? '').slice(0, 400);
    const { browser, os, deviceType } = parseUA(ua);
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
    const city = req.headers.get('x-vercel-ip-city') ?? req.headers.get('cf-ipcity') ?? null;
    const country = req.headers.get('x-country') ?? req.headers.get('cf-ipcountry') ?? null;
    const now = new Date().toISOString();

    const { data: existing } = await admin.from('user_devices')
      .select('id, revoked_at')
      .eq('user_id', user.id).eq('device_id', deviceId).maybeSingle();

    if (existing) {
      if (existing.revoked_at) return json({ ok: true, revoked: true });
      await admin.from('user_devices')
        .update({ last_seen_at: now, ip, city, country, user_agent: ua, browser, os, device_type: deviceType })
        .eq('id', existing.id);
      return json({ ok: true, revoked: false });
    }

    await admin.from('user_devices').insert({
      user_id: user.id, device_id: deviceId, user_agent: ua,
      browser, os, device_type: deviceType, ip, city, country,
      first_seen_at: now, last_seen_at: now,
    });
    return json({ ok: true, revoked: false, created: true });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
}));
