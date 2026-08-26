import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { withCors } from '../_shared/cors.ts';

const INTERVALS = new Set(['1m', '5m', '15m', '1h', '4h', '1d']);
const HOSTS = [
  'https://api.binance.com/api/v3/klines',
  'https://data-api.binance.vision/api/v3/klines',
];

Deno.serve(withCors(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const symbol = (url.searchParams.get('symbol') ?? '').toUpperCase();
    const interval = url.searchParams.get('interval') ?? '15m';
    const startTime = Number(url.searchParams.get('startTime') ?? 0);
    const endTime = Number(url.searchParams.get('endTime') ?? 0);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 300), 10), 1000);

    if (!/^[A-Z0-9]{4,20}$/.test(symbol)) {
      return json({ error: 'invalid symbol' }, 400);
    }
    if (!INTERVALS.has(interval)) {
      return json({ error: 'invalid interval' }, 400);
    }

    const qs = new URLSearchParams({ symbol, interval, limit: String(limit) });
    if (startTime > 0) qs.set('startTime', String(Math.floor(startTime)));
    if (endTime > 0) qs.set('endTime', String(Math.floor(endTime)));

    let lastErr = 'upstream unavailable';
    for (const host of HOSTS) {
      try {
        const res = await fetch(`${host}?${qs}`, { headers: { accept: 'application/json' } });
        if (!res.ok) { lastErr = `upstream ${res.status}`; continue; }
        const rows = await res.json();
        if (!Array.isArray(rows)) { lastErr = 'bad upstream payload'; continue; }
        const candles = rows.map((r: unknown[]) => ({
          time: Math.floor(Number(r[0]) / 1000),
          open: Number(r[1]),
          high: Number(r[2]),
          low: Number(r[3]),
          close: Number(r[4]),
          volume: Number(r[5]),
        }));
        return json({ symbol, interval, candles }, 200, 'public, max-age=120');
      } catch (e) {
        lastErr = e instanceof Error ? e.message : 'fetch failed';
      }
    }
    return json({ error: lastErr, candles: [] }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown error' }, 500);
  }
}));

function json(body: unknown, status = 200, cache?: string) {
  const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'application/json' };
  if (cache) headers['Cache-Control'] = cache;
  return new Response(JSON.stringify(body), { status, headers });
}
