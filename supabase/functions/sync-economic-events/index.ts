// Sync Economic Calendar events into public.economic_events.
// 100% free-tier: Finnhub primary, ForexFactory weekly JSON fallback.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const T1_KEYWORDS = [
  'cpi', 'core cpi', 'inflation rate',
  'non farm payrolls', 'nonfarm payrolls', 'nfp',
  'fomc', 'federal funds', 'fed interest rate', 'interest rate decision',
  'ecb', 'boe', 'boj', 'snb', 'gdp', 'unemployment rate', 'ppi',
];
const T2_KEYWORDS = [
  'pmi', 'retail sales', 'industrial production',
  'consumer confidence', 'jobless claims', 'trade balance',
  'housing starts', 'ism',
];

function classifyImpact(eventName: string, providerScore?: unknown): 't1' | 't2' | 't3' {
  const name = (eventName || '').toLowerCase();
  if (T1_KEYWORDS.some((k) => name.includes(k))) return 't1';
  if (providerScore != null) {
    const s = String(providerScore).toLowerCase();
    if (s === 'high' || s === '3') return 't1';
    if (s === 'medium' || s === '2') return 't2';
  }
  if (T2_KEYWORDS.some((k) => name.includes(k))) return 't2';
  return 't3';
}

interface UpsertRow {
  provider: string;
  external_id: string;
  release_at: string;
  currency: string | null;
  country: string | null;
  event_name: string;
  category: string | null;
  impact: 't1' | 't2' | 't3';
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  unit: string | null;
  description: string | null;
}

async function fetchFinnhub(token: string, from: string, to: string): Promise<UpsertRow[]> {
  const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const events: any[] = json?.economicCalendar ?? [];
  return events
    .filter((e) => e?.event && e?.time)
    .map((e) => {
      // Finnhub `time` is "YYYY-MM-DD HH:mm:ss" in UTC
      const release_at = new Date(String(e.time).replace(' ', 'T') + 'Z').toISOString();
      const eventName = String(e.event);
      const external_id = `${e.country ?? ''}-${eventName}-${release_at}`.slice(0, 200);
      return {
        provider: 'finnhub',
        external_id,
        release_at,
        currency: e.currency ?? null,
        country: e.country ?? null,
        event_name: eventName,
        category: null,
        impact: classifyImpact(eventName, e.impact),
        actual: e.actual != null ? String(e.actual) : null,
        forecast: e.estimate != null ? String(e.estimate) : null,
        previous: e.prev != null ? String(e.prev) : null,
        unit: e.unit ?? null,
        description: null,
      };
    });
}

async function fetchForexFactory(): Promise<UpsertRow[]> {
  // Free, no-key, updated weekly. Used as fallback / cross-check.
  const url = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ForexFactory ${res.status}`);
  const arr: any[] = await res.json();
  return arr
    .filter((e) => e?.date && e?.title)
    .map((e) => {
      const release_at = new Date(e.date).toISOString();
      const external_id = `${e.country ?? ''}-${e.title}-${release_at}`.slice(0, 200);
      return {
        provider: 'forexfactory',
        external_id,
        release_at,
        currency: e.country ?? null,
        country: e.country ?? null,
        event_name: String(e.title),
        category: null,
        impact: classifyImpact(e.title, e.impact),
        actual: e.actual || null,
        forecast: e.forecast || null,
        previous: e.previous || null,
        unit: null,
        description: null,
      };
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const to = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const rows: UpsertRow[] = [];
    const errors: string[] = [];

    const finnhubKey = Deno.env.get('FINNHUB_API_KEY');
    if (finnhubKey) {
      try {
        rows.push(...(await fetchFinnhub(finnhubKey, from, to)));
      } catch (e) {
        errors.push(`finnhub: ${(e as Error).message}`);
      }
    } else {
      errors.push('finnhub: FINNHUB_API_KEY missing');
    }

    try {
      rows.push(...(await fetchForexFactory()));
    } catch (e) {
      errors.push(`forexfactory: ${(e as Error).message}`);
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, inserted: 0, errors }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert in chunks to stay under payload limits
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error, count } = await supabase
        .from('economic_events')
        .upsert(chunk, { onConflict: 'provider,external_id', count: 'exact' });
      if (error) errors.push(`upsert: ${error.message}`);
      else inserted += count ?? chunk.length;
    }

    return new Response(JSON.stringify({ ok: true, inserted, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
