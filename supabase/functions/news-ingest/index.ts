import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * news-ingest — webhook endpoint for the Make.com news automation.
 *
 * POST  /functions/v1/news-ingest
 * Header: x-news-secret: <NEWS_INGEST_SECRET>
 * Body:   a single item or { items: [...] }
 *   {
 *     external_id?: string,
 *     headline: string,          // required
 *     summary?: string,
 *     source?: string,
 *     url?: string,
 *     category?: string,         // macro | crypto | equities | fx | general
 *     impact?: 'high'|'medium'|'low',
 *     symbols?: string[],
 *     published_at?: string      // ISO
 *   }
 *
 * Retention is enforced in the database: rows older than 3 days are removed
 * and only the 30 most recent reports are kept.
 */

const IMPACTS = new Set(['high', 'medium', 'low']);

function stripHtml(v: string): string {
  return v
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = stripHtml(v);
  if (!s) return null;
  return s.slice(0, max);
}

/** RSS feeds often send `source` as an object ({ name, url }) — extract text or drop. */
function cleanSource(v: unknown): string | null {
  if (typeof v === 'string') return clean(v, 80);
  if (v && typeof v === 'object') {
    const name = (v as Record<string, unknown>).name ?? (v as Record<string, unknown>).title;
    if (typeof name === 'string') return clean(name, 80);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const secret = Deno.env.get('NEWS_INGEST_SECRET');
  const provided = req.headers.get('x-news-secret') ?? '';
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const raw = Array.isArray(body)
    ? body
    : Array.isArray((body as { items?: unknown[] })?.items)
      ? (body as { items: unknown[] }).items
      : [body];

  const rows = [];
  for (const item of raw.slice(0, 30)) {
    const o = (item ?? {}) as Record<string, unknown>;
    const headline = clean(o.headline ?? o.title, 240);
    if (!headline) continue;

    const publishedRaw = clean(o.published_at ?? o.date, 64);
    const published = publishedRaw && !Number.isNaN(Date.parse(publishedRaw))
      ? new Date(publishedRaw).toISOString()
      : new Date().toISOString();

    const impact = clean(o.impact, 12)?.toLowerCase() ?? 'medium';
    const symbols = Array.isArray(o.symbols)
      ? o.symbols.filter((s) => typeof s === 'string').slice(0, 8).map((s) => (s as string).slice(0, 16))
      : [];

    rows.push({
      external_id: clean(o.external_id ?? o.id, 200),
      headline,
      summary: clean(o.summary ?? o.description, 1200),
      source: clean(o.source, 80),
      url: clean(o.url ?? o.link, 800),
      category: (clean(o.category, 40) ?? 'general').toLowerCase(),
      impact: IMPACTS.has(impact) ? impact : 'medium',
      symbols,
      published_at: published,
    });
  }

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid items (headline is required)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const withId = rows.filter((r) => r.external_id);
  const withoutId = rows.filter((r) => !r.external_id);
  let inserted = 0;

  if (withId.length) {
    const { data, error } = await admin
      .from('news_feed')
      .upsert(withId, { onConflict: 'external_id', ignoreDuplicates: true })
      .select('id');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    inserted += data?.length ?? 0;
  }

  if (withoutId.length) {
    const { data, error } = await admin.from('news_feed').insert(withoutId).select('id');
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    inserted += data?.length ?? 0;
  }

  return new Response(JSON.stringify({ ok: true, received: rows.length, inserted }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
