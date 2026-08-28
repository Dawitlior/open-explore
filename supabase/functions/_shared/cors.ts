// Shared CORS origin policy (audit F-07).
//
// Edge functions historically answered with `Access-Control-Allow-Origin: *`.
// These are bearer-token APIs (no cookies), so `*` was not directly exploitable,
// but echoing only known app origins removes a whole class of drive-by
// cross-origin calls from attacker-controlled pages.
//
// Allowlist = Lovable preview/published domains + Netlify + localhost dev,
// plus anything listed in the optional ALLOWED_ORIGINS secret (comma separated)
// for custom domains.

const STATIC_PATTERNS: RegExp[] = [
  /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i,
  /^https:\/\/([a-z0-9-]+\.)*lovableproject\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*lovable\.dev$/i,
  /^https:\/\/([a-z0-9-]+\.)*netlify\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
  // Production custom domain (Netlify-hosted).
  /^https:\/\/([a-z0-9-]+\.)*orcainvestment\.co\.il$/i,

];

function extraOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (extraOrigins().includes(origin)) return true;
  return STATIC_PATTERNS.some((re) => re.test(origin));
}

/**
 * Wrap a Deno.serve handler so the response's Access-Control-Allow-Origin is
 * narrowed to the calling origin when it is allowlisted. Non-browser callers
 * (no Origin header — cron, curl, server-to-server) are untouched.
 */
export function withCors(
  handler: (req: Request) => Response | Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const origin = req.headers.get('origin');
    const res = await handler(req);
    if (!origin) return res;

    const headers = new Headers(res.headers);
    headers.set('Vary', 'Origin');
    if (isAllowedOrigin(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    } else {
      headers.delete('Access-Control-Allow-Origin');
    }
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  };
}
