// One-time backup codes for two-factor authentication.
//
// Actions:
//   generate – (after a TOTP factor is verified) issue 10 fresh codes.
//              Plain text is returned exactly once; only hashes are stored.
//   recover  – burn a valid backup code and remove the TOTP factors, so a user
//              who lost the authenticator device regains access and can re-enrol.
//   status   – how many unused codes remain.
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

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const raw = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

async function hash(userId: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`orca:mfa:${userId}:${code.toUpperCase().replace(/\s/g, '')}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
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

    if (action === 'status') {
      const { count } = await admin.from('mfa_backup_codes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).is('used_at', null);
      return json({ ok: true, remaining: count ?? 0 });
    }

    if (action === 'generate') {
      const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
      const verified = (factors?.factors ?? []).filter((f) => f.status === 'verified');
      if (verified.length === 0) return json({ error: 'no verified factor' }, 400);

      await admin.from('mfa_backup_codes').delete().eq('user_id', user.id);
      const codes = Array.from({ length: 10 }, () => newCode());
      const rows = await Promise.all(codes.map(async (c) => ({
        user_id: user.id, code_hash: await hash(user.id, c),
      })));
      const { error } = await admin.from('mfa_backup_codes').insert(rows);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, codes });
    }

    if (action === 'recover') {
      const code = String(body?.code ?? '').toUpperCase().replace(/\s/g, '');
      if (!/^[A-Z0-9-]{6,16}$/.test(code)) return json({ error: 'invalid code' }, 400);

      const h = await hash(user.id, code);
      const { data: row } = await admin.from('mfa_backup_codes')
        .select('id').eq('user_id', user.id).eq('code_hash', h).is('used_at', null).maybeSingle();
      if (!row) return json({ error: 'invalid code' }, 401);

      await admin.from('mfa_backup_codes').update({ used_at: new Date().toISOString() }).eq('id', row.id);

      const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
      for (const f of factors?.factors ?? []) {
        try { await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id }); } catch { /* ignore */ }
      }
      await admin.from('mfa_backup_codes').delete().eq('user_id', user.id);
      return json({ ok: true, disabled: true });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
}));
